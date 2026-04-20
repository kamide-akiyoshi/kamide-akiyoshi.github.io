
const createMidiSequenceParser = () => {
  const textDecoders = {};
  const decoderOf = (encoding) => textDecoders[encoding] ??= new TextDecoder(encoding);
  const hasValidChunkId = (byteArray, validChunk) => {
    const chunk = decoderOf("UTF-8").decode(byteArray.subarray(0, validChunk.length));
    if( chunk != validChunk ) {
      console.error(`Invalid chunk '${chunk}' - Valid chunk is: '${validChunk}'`);
      return false;
    }
    return true;
  };
  const parseText = (byteArray) => {
    let text;
    let encoding;
    try {
      encoding = Encoding.detect(byteArray) || "sjis";
      text = decoderOf(encoding).decode(byteArray);
    } catch(error) {
      const defaultEncoding = "sjis";
      text = decoderOf(defaultEncoding).decode(byteArray);
      console.warn(
        `Failed to decode as "${encoding}", so force "${defaultEncoding}", and decoded to "${text}" from the source data:`,
        byteArray, error);
    }
    return text.replace(/\0/g, '');
  };
  const parseSignedByte = (b) => (b & 0x80) ? b - 0x100 : b;
  const parseBigEndian = (byteArray) => byteArray.reduce((out, n) => (out << 8) + n);
  const parseVariableLengthValue = (byteArray) => {
    let value = 0, valueLength = 0;
    while(valueLength < 4) {
      const b = byteArray[valueLength++];
      value <<= 7; value += (b & 0x7F);
      if( (b & 0x80) == 0 ) break; // MSB=0 (0...0x7F) indicates final byte of the value
    }
    return [value, byteArray.subarray(valueLength)];
  };
  const parseVariableLengthData = (byteArray) => {
    const [length, rest] = parseVariableLengthValue(byteArray);
    const out = [rest.subarray(0, length)];
    length < rest.length && out.push(rest.subarray(length));
    return out;
  };
  const parseMetaEvent = (byteArray, event) => {
    if( (event.metaType = byteArray[0]) == 0x2F ) {
      return undefined; // End Of Track
    }
    const [data, rest] = parseVariableLengthData(byteArray.subarray(1));
    switch(event.metaType) {
      case 0x51:
        event.tempo = { microsecondsPerQuarter: parseBigEndian(data) };
        break;
      case 0x58:
        event.timeSignature = {
          numerator: data[0],
          denominator: 1 << data[1],
          clocksPerTick: data[2],
          noteted32ndsPerQuarter: data[3],
        };
        break;
      case 0x59:
        event.keySignature = parseSignedByte(data[0]);
        if( data[1] == 1 ) event.minor = true;
        break;
      default:
        if( event.metaType > 0 && event.metaType < 0x10 ) {
          event.text = parseText(data);
          break;
        }
        event.metaData = data;
        break;
    }
    return rest;
  };
  const parseSystemExclusive = (byteArray, event) => {
    const [data, rest] = parseVariableLengthData(byteArray);
    event.systemExclusive = data;
    return rest;
  };
  const parseFixedLengthEvent = (byteArray, event, length) => {
    event.data = byteArray.subarray(0, length);
    return length < byteArray.length ? byteArray.subarray(length) : undefined;
  };
  const parseMidiEvent = (byteArray, event, runningStatus) => {
    const topByte = byteArray[0];
    const statusOmitted = !(topByte & 0x80);
    const status = statusOmitted ? runningStatus : topByte;
    let dataLength;
    switch(status & 0xF0) {
      case 0xF0:
        switch(status) {
          //
          // Meta Event: Only for sequencer, Not for MIDI port
          case 0xFF: return parseMetaEvent(byteArray.subarray(1), event);
          //
          // System Common Message
          case 0xF7: // System Exclusive (splited)
          case 0xF0: // System Exclusive
            return parseSystemExclusive(byteArray.subarray(1), event);
          case 0xF2: // Song Position (0xF2, LSB, MSB)
            dataLength = 3;
            break;
          case 0xF1: // Quarter Frame (0xF1, timecode)
          case 0xF3: // Song Select (0xF3, song#)
            dataLength = 2;
            break;
          default: // Status byte only
            // 0xF6: Tune Request
            // 0xF4: Undefined
            // 0xF5: Undefined
            //
            // System Realtime Message
            // 0xF8...0xFE (0xFF: Reset - Not for MIDI file)
            //
            dataLength = 1;
            break;
        }
        return parseFixedLengthEvent(byteArray, event, dataLength);
      case 0xC0: // Program Change (0xC0, Program#)
      case 0xD0: // Channel Pressure (0xD0, PressureValue)
        dataLength = 2;
        break;
      // case 0xE0: // Pitch Bend Change (7-bit Little Endian: -8192 ... +8191)
      // case 0x80: // Note Off (NoteNumber, Velocity)
      // case 0x90: // Note On (NoteNumber, Velocity)
      // case 0xA0: // Polyphonic Key Pressure (NoteNumber, PressureValue)
      // case 0xB0: // Control Change (Control#, Value)
      default:
        dataLength = 3;
        break;
    }
    if( statusOmitted ) {
      const rest = parseFixedLengthEvent(byteArray, event, dataLength - 1);
      event.data = [runningStatus, ...event.data];
      return rest;
    }
    return parseFixedLengthEvent(byteArray, event, dataLength);
  };
  const insertEvent = (events, event) => {
    const { tick } = event;
    const index = events.findLastIndex((e) => e.tick <= tick);
    events.splice((index < 0 ? 0 : index) + 1, 0, event);
  };
  const parseMidiSequence = (sequenceByteArray) => {
    if( !hasValidChunkId(sequenceByteArray, "MThd") ) {
      throw new Error(`Invalid MIDI file format`);
    }
    const headerChunkSize = parseBigEndian(sequenceByteArray.subarray(4, 8));
    const sequence = {
      formatType: parseBigEndian(sequenceByteArray.subarray(8, 10)),
      tickLength: 0,
      tracks: [],
      keySignatures: [],
      tempos: [],
      timeSignatures: [],
      lyrics: [],
      markers: [],
    };
    const numberOfTrack = parseBigEndian(sequenceByteArray.subarray(10, 12));
    const timeDivisionArray = sequenceByteArray.subarray(12, 14);
    if( timeDivisionArray[0] & 0x80 ) {
      alert(`Warning: SMPTE resolution not supported`);
      sequence.framesPerSec = timeDivisionArray[0] & 0x7F;
      sequence.ticksPerFrame = timeDivisionArray[1];
    } else {
      sequence.ticksPerQuarter = parseBigEndian(timeDivisionArray);
    }
    const tracksByteArray = sequenceByteArray.subarray(8 + headerChunkSize);
    let karaokeLyricsMetaType;
    Array.from({ length: numberOfTrack }).reduce(
      (tracksByteArray) => {
        if( !tracksByteArray ) { // No more track
          return undefined;
        }
        if( !hasValidChunkId(tracksByteArray, "MTrk") ) {
          console.warn(`Invalid MIDI track chunk`);
        }
        const trackChunkSize = parseBigEndian(tracksByteArray.subarray(4, 8));
        const nextTrackTop = 8 + trackChunkSize;
        let trackByteArray = tracksByteArray.subarray(8, nextTrackTop);
        const events = [];
        let tick = 0;
        let runningStatus;
        const mergedLyrics = {
          lastFragmentTick: 0,
          createEvent: (event) => {
            karaokeLyricsMetaType = event.metaType;
            const lastTick = events.findLast((e) => e.metaType === karaokeLyricsMetaType)?.tick ?? 0;
            mergedLyrics.lastFragmentTick = tick;
            const createdEvent = mergedLyrics.event = {
              ...event,
              tick: tick - Math.min(sequence.ticksPerQuarter * 2, tick - lastTick),
              metaType: 5,
            };
            insertEvent(sequence.lyrics, createdEvent);
            insertEvent(events, createdEvent);
            event.lyricsNextPosition = event.text.length;
          },
          appendTextOf: (event) => {
            mergedLyrics.lastFragmentTick = tick;
            const mergedEvent = mergedLyrics.event;
            event.lyricsNextPosition = (mergedEvent.text = mergedEvent.text.concat(event.text)).length;
          },
        };
        while(true) {
          const [deltaTime, eventByteArray] = parseVariableLengthValue(trackByteArray);
          tick += deltaTime;
          const event = { tick };
          trackByteArray = parseMidiEvent(eventByteArray, event, runningStatus);
          if( "metaType" in event ) {
            switch(event.metaType) {
              case 1: // Text
                if( event.text.charAt(0) === '\\' ) {
                  event.text = event.text.slice(1);
                  mergedLyrics.createEvent(event);
                } else if( mergedLyrics.event ) {
                  if( event.text.charAt(0) === '/' ) event.text = event.text.replace('/', '\n');
                  mergedLyrics.appendTextOf(event);
                }
                break;
              case 3: // Sequence/Track name
                if( event.text ) events.title = event.text;
                break;
              case 5: // Lyrics
                if( karaokeLyricsMetaType === 1 ) {
                  break;
                }
                if ( event.text.charAt(0) === '\n' ) {
                  event.text = event.text.slice(1);
                  mergedLyrics.createEvent(event);
                  break;
                }
                if ( mergedLyrics.event?.text.length > 127 ) {
                  if( tick - mergedLyrics.lastFragmentTick > sequence.ticksPerQuarter * 2 ) {
                    mergedLyrics.createEvent(event);
                    break;
                  }
                }
                if( karaokeLyricsMetaType === 5 && mergedLyrics.event ) {
                  mergedLyrics.appendTextOf(event);
                  break;
                }
                if( karaokeLyricsMetaType === undefined ) {
                  const length = event.text.trim().length;
                  if( 0 < length && length < 4 ) {
                    mergedLyrics.createEvent(event);
                    break;
                  }
                }
                sequence.lyrics.push(event);
                break;
              case 6: sequence.markers.push(event); break;
              case 0x51: sequence.tempos.push(event); break;
              case 0x58: sequence.timeSignatures.push(event); break;
              case 0x59: sequence.keySignatures.push(event); break;
            }
          }
          if( !(karaokeLyricsMetaType === 1 && event.metaType === 5) ) {
            events.push(event);
          }
          if( !trackByteArray ) break;
          runningStatus = event.data?.[0];
        }
        sequence.tracks.push(events);
        if( tick > sequence.tickLength ) sequence.tickLength = tick;
        return nextTrackTop < tracksByteArray.length ? tracksByteArray.subarray(nextTrackTop) : undefined;
      },
      tracksByteArray
    );
    const ascendingByTick = (e1, e2) => e1.tick < e2.tick ? -1 : e1.tick > e2.tick ? 1 : 0;
    [
      "keySignatures",
      "tempos",
      "timeSignatures",
      "lyrics",
      "markers",
    ].forEach((key) => sequence[key].sort(ascendingByTick))
    const title = sequence.tracks.find((track) => track.title)?.title
    if( title ) sequence.title = title;
    return sequence;
  };
  return parseMidiSequence;
};

const setupMidiSequencer = (parseMidiSequence, sendMidiMessage, onChangeKey, onChangeBeat, onReady) => {
  let lastTimeSignatureEvent;
  const currentLyrics = {
    element: document.getElementById("lyrics"),
    pastElement: document.getElementById("past_lyrics"),
    clear: () => {
      delete currentLyrics.text;
      currentLyrics.element.innerText =
      currentLyrics.pastElement.innerText = "";
    },
    setText: (text) => {
      currentLyrics.text = text;
      currentLyrics.pastElement.innerText = "";
      currentLyrics.element.innerText = text;
    },
    proceedText: (nextPosition) => {
      const t = currentLyrics.text;
      currentLyrics.element.innerText = t.slice(nextPosition);
      currentLyrics.pastElement.innerText = t.slice(0, nextPosition);
    },
  };
  const doMetaEvent = (event) => {
    const { metaType } = event;
    switch(metaType) {
      case 5:
        if( "lyricsNextPosition" in event && currentLyrics.element.textContent ) {
          currentLyrics.proceedText(event.lyricsNextPosition);
        } else {
          currentLyrics.setText(event.text);
        }
        break;
      case 6:
        markerElement.textContent = event.text ? `Marker: ${event.text}` : "";
        break;
      case 0x51:
        changeTempo(event.tempo.microsecondsPerQuarter);
        tempoElement.classList.remove("grayout");
        break;
      case 0x58:
        {
          const { numerator, denominator } = event.timeSignature;
          timeSignatureElement.textContent = `${numerator}/${denominator}`;
          timeSignatureElement.classList.remove("grayout");
          (lastTimeSignatureEvent = event).ticksPerBeat = midiSequence.ticksPerQuarter * (4 / denominator);
        }
        break;
      case 0x59:
        onChangeKey?.([event.keySignature, event.minor]);
        break;
      default:
        if( "text" in event ) {
          const { text } = event;
          if( "lyricsNextPosition" in event && currentLyrics.element.textContent && metaType === 1 ) {
            currentLyrics.proceedText(event.lyricsNextPosition);
          } else if( midiSequence.title != text ) {
            textElement.textContent = text;
          }
        }
        break;
    }
  };
  const midiFileNameElement = document.getElementById("midi_file_name");
  const tickPositionSlider = document.getElementById("time_position") ?? {};
  const timeSignatureElement = document.getElementById("time_signature");
  const tempoElement = document.getElementById("tempo");
  const titleElement = document.getElementById("song_title");
  const setMidiSequenceTitle = (title) => {
    const trimmedTitle = title?.trim() ?? "";
    titleElement.textContent = trimmedTitle;
    PianoKeyboard.setSongTitleToDocument(trimmedTitle);
  };
  const markerElement = document.getElementById("song_marker");
  const textElement = document.getElementById("song_text");
  let midiSequence;
  const midiSequenceElement = document.getElementById("midi_sequence");
  document.getElementById("play_pause")?.addEventListener('click', () => intervalId ? pause() : play());
  const playPauseIcon = document.getElementById("play_pause_icon");
  tickPositionSlider.addEventListener?.("input", (event) => {
    !intervalId && setTickPosition(parseInt(event.target.value));
  });
  const keyTimelineElement = document.getElementById("midi_key_timeline");
  const midiSequencerElement = midiSequenceElement.parentElement;
  midiSequencerElement.removeChild(midiSequenceElement);
  const setSongKeyTimeline = (keySignatures, tickLength) => {
    while( keyTimelineElement.firstChild ) {
      keyTimelineElement.removeChild(keyTimelineElement.firstChild);
    }
    if( !keySignatures?.length ) {
      return;
    }
    keySignatures.forEach((event, i) => {
      const { tick, keySignature: hour, minor } = event;
      const endTick = keySignatures[i + 1]?.tick ?? tickLength;
      const key = Music.majorMinorTextOf(hour, minor);
      const element = document.createElement("div");
      element.textContent = i ? key : `🔑${key}`;
      element.classList.add("key");
      element.style.width = `${(endTick - tick) / tickLength * 100}%`;
      keyTimelineElement.appendChild(element);
    });
  };
  const setMidiSequence = (seq) => {
    midiSequence = seq;
    textElement.textContent = "";
    currentLyrics.clear();
    markerElement.textContent = "";
    setMidiSequenceTitle(midiSequence.title);
    lastTimeSignatureEvent = {
      tick: 0,
      timeSignature: {
        numerator: 4,
        denominator: 4,
      },
      ticksPerBeat: midiSequence.ticksPerQuarter,
    };
    changeTempo(500000);
    [
      tempoElement,
      timeSignatureElement,
    ].forEach((element) => element.classList.add("grayout"));
    timeSignatureElement.textContent = "4/4";
    tickPositionSlider.max = midiSequence.tickLength;
    setSongKeyTimeline(midiSequence.keySignatures, midiSequence.tickLength);
    setTickPosition(0);
    midiSequencerElement.prepend(midiSequenceElement);
    onReady?.();
  };
  const loadMidiFile = (file) => {
    if( !file ) return;
    file.arrayBuffer().then((ab) => {
      if( !ab.byteLength ) throw "Empty";
      const seq = parseMidiSequence(new Uint8Array(ab))
      midiFileNameElement.textContent = file.name;
      setMidiSequence(seq);
      play();
    }).catch((error) => {
      console.error(`Could not load MIDI file ${file.name}:`, error);
      alert(error);
    });
  };
  const midiFileInput = document.getElementById("midi_file");
  const midiFileDropZone = document.getElementsByTagName("body")[0];
  document.getElementById("midi_file_select_button")?.addEventListener("click", () => {
    midiFileInput.click();
  });
  midiFileInput.addEventListener("change", () => loadMidiFile(midiFileInput.files[0]));
  midiFileDropZone.addEventListener("dragenter", (event) => {
    event.stopPropagation();
    event.preventDefault();
  });
  midiFileDropZone.addEventListener("dragover", (event) => {
    event.stopPropagation();
    event.preventDefault();
  });
  midiFileDropZone.addEventListener("drop", (event) => {
    event.stopPropagation();
    event.preventDefault();
    loadMidiFile(event.dataTransfer.files[0]);
  });
  let tickPosition = 0;
  const setTickPosition = (tick) => {
    pause();
    tickPositionSlider.value = tickPosition = tick;
    setBeatAt(tick);
    if( !midiSequence ) {
      return;
    }
    const doLastMetaEvent = (array) => {
      const lastEvent = array.findLast((event) => event.tick <= tick);
      lastEvent && doMetaEvent(lastEvent);
    }
    doLastMetaEvent(midiSequence.timeSignatures);
    doLastMetaEvent(midiSequence.keySignatures);
    doLastMetaEvent(midiSequence.tempos);
    currentLyrics.clear();
    doLastMetaEvent(midiSequence.lyrics);
    markerElement.textContent = "";
    doLastMetaEvent(midiSequence.markers);
    midiSequence.tracks.forEach((track, index) => {
      if( tick === 0 ) {
        // Top
        track.currentEventIndex = 0;
        return;
      } else if( tick >= midiSequence.tickLength ) {
        // Bottom
        track.currentEventIndex = track.length - 1;
        return;
      }
      // Binary search
      let [low, mid, high] = [0, 0, track.length - 1];
      while( low <= high ) {
        mid = Math.floor((low + high) / 2);
        const eventTick = track[mid].tick;
        if( eventTick > tick ) {
          high = mid - 1;
        } else if( eventTick < tick - midiSequence.ticksPerQuarter ) {
          low = mid + 1;
        } else {
          break;
        }
      }
      track.currentEventIndex = mid;
    });
  };
  let beat;
  const setBeatAt = (tick) => {
    const {
      tick: startTick,
      timeSignature: { numerator },
      ticksPerBeat,
    } = lastTimeSignatureEvent;
    const newBeat = tick ? Math.floor((tick - startTick) / ticksPerBeat) % numerator : undefined;
    if( beat === newBeat ) return;
    onChangeBeat?.(beat = newBeat, numerator);
  };
  const INTERVAL_MILLI_SEC = 10;
  let ticksPerInterval;
  const changeTempo = (uspq) => {
    tempoElement.textContent = Music.bpmTextOf(Math.floor(60000000 / uspq));
    ticksPerInterval = 1000 * INTERVAL_MILLI_SEC * (midiSequence.ticksPerQuarter / uspq);
  };
  let intervalId, sentinel;
  const requestWakeLock = async () => { // To prevent screen lock while MIDI playing
    try {
      const { wakeLock } = navigator;
      if( !wakeLock ) throw "WakeLock not supported on this device";
      sentinel = await wakeLock.request("screen");
    } catch(error) {
      console.warn(error);
    }
  };
  document.addEventListener("visibilitychange", async () => {
    // After wake lock released automatically by hiding document,
    // Reacquire the wake lock when get visible
    if( sentinel && document.visibilityState === "visible" ) {
      await requestWakeLock();
    }
  });
  const pause = async () => {
    if( !intervalId ) return;
    clearInterval(intervalId);
    intervalId = undefined;
    for( let ch = 0; ch < SimpleSynthesizer.NUMBER_OF_CHANNELS; ch++ ) {
      sendMidiMessage([0xB0 + ch, 0x7B, 0]); // All Notes Off
      sendMidiMessage([0xE0 + ch, 0, 0x40]); // Reset Pitch Bend to center
    };
    await sentinel?.release(); // No try-catch required, because exception not thrown
    sentinel = undefined; // To prevent reacquiring wake lock when get visible
    if( playPauseIcon ) {
      playPauseIcon.src = "image/play-button-svgrepo-com.svg";
      playPauseIcon.alt = "Play";
    }
  };
  const play = async () => {
    if( !midiSequence || intervalId ) return;
    if( tickPosition === 0 ) {
      for( let ch = 0; ch < SimpleSynthesizer.NUMBER_OF_CHANNELS; ch++ ) {
        const controlChangeStatus = 0xB0 + ch;
        sendMidiMessage([controlChangeStatus, 0x78, 0]); // All Sound Off
        sendMidiMessage([controlChangeStatus, 0x79, 0]); // Reset All Controllers
      };
    }
    const { tickLength, tracks } = midiSequence;
    intervalId = setInterval(
      () => {
        tickPositionSlider.value = tickPosition;
        tracks.forEach((events) => {
          while(true) {
            const event = events[events.currentEventIndex];
            if( !event || event.tick > tickPosition ) {
              break;
            }
            if( "metaType" in event ) {
              doMetaEvent(event); // NOTE: Meta event must not be sent to MIDI port
            } else {
              const { data } = event;
              if( data ) sendMidiMessage(data);
            }
            events.currentEventIndex++;
          }
        });
        setBeatAt(tickPosition);
        if( (tickPosition += ticksPerInterval) > tickLength ) {
          // End of a song
          pause();
          setTickPosition(0);
        }
      },
      INTERVAL_MILLI_SEC
    );
    await requestWakeLock();
    if( playPauseIcon ) {
      playPauseIcon.src = "image/pause-button-svgrepo-com.svg";
      playPauseIcon.alt = "Pause";
    }
  };
};
