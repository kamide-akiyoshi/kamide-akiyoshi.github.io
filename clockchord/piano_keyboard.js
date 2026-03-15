
const INSTRUMENT_NAMES = [
"Acoustic Grand Piano",
"Bright Acoustic Piano",
"Electric Grand Piano",
"Honky-tonk Piano",
"Electric Piano 1",
"Electric Piano 2",
"Harpsichord",
"Clavi",
"Celesta",
"Glockenspiel",
"Music Box",
"Vibraphone",
"Marimba",
"Xylophone",
"Tubular Bells",
"Dulcimer",
"Drawbar Organ",
"Percussive Organ",
"Rock Organ",
"Church Organ",
"Reed Organ",
"Accordion",
"Harmonica",
"Tango Accordion",
"Acoustic Guitar (nylon)",
"Acoustic Guitar (steel)",
"Electric Guitar (jazz)",
"Electric Guitar (clean)",
"Electric Guitar (muted)",
"Overdriven Guitar",
"Distortion Guitar",
"Guitar harmonics",
"Acoustic Bass",
"Electric Bass (finger)",
"Electric Bass (pick)",
"Fretless Bass",
"Slap Bass 1",
"Slap Bass 2",
"Synth Bass 1",
"Synth Bass 2",
"Violin",
"Viola",
"Cello",
"Contrabass",
"Tremolo Strings",
"Pizzicato Strings",
"Orchestral Harp",
"Timpani",
"String Ensemble 1",
"String Ensemble 2",
"SynthStrings 1",
"SynthStrings 2",
"Choir Aahs",
"Voice Oohs",
"Synth Voice",
"Orchestra Hit",
"Trumpet",
"Trombone",
"Tuba",
"Muted Trumpet",
"French Horn",
"Brass Section",
"SynthBrass 1",
"SynthBrass 2",
"Soprano Sax",
"Alto Sax",
"Tenor Sax",
"Baritone Sax",
"Oboe",
"English Horn",
"Bassoon",
"Clarinet",
"Piccolo",
"Flute",
"Recorder",
"Pan Flute",
"Blown Bottle",
"Shakuhachi",
"Whistle",
"Ocarina",
"Lead 1 (square)",
"Lead 2 (sawtooth)",
"Lead 3 (calliope)",
"Lead 4 (chiff)",
"Lead 5 (charang)",
"Lead 6 (voice)",
"Lead 7 (fifths)",
"Lead 8 (bass + lead)",
"Pad 1 (new age)",
"Pad 2 (warm)",
"Pad 3 (polysynth)",
"Pad 4 (choir)",
"Pad 5 (bowed)",
"Pad 6 (metallic)",
"Pad 7 (halo)",
"Pad 8 (sweep)",
"FX 1 (rain)",
"FX 2 (soundtrack)",
"FX 3 (crystal)",
"FX 4 (atmosphere)",
"FX 5 (brightness)",
"FX 6 (goblins)",
"FX 7 (echoes)",
"FX 8 (sci-fi)",
"Sitar",
"Banjo",
"Shamisen",
"Koto",
"Kalimba",
"Bag pipe",
"Fiddle",
"Shanai",
"Tinkle Bell",
"Agogo",
"Steel Drums",
"Woodblock",
"Taiko Drum",
"Melodic Tom",
"Synth Drum",
"Reverse Cymbal",
"Guitar Fret Noise",
"Breath Noise",
"Seashore",
"Bird Tweet",
"Telephone Ring",
"Helicopter",
"Applause",
"Gunshot",
];

const PianoKeyboard = class {
  static initialDocumentTitle = document.title;
  static setSongTitleToDocument = (songTitle) => {
    document.title = songTitle ? `${songTitle} - ClockChord` : this.initialDocumentTitle;
  };

  noteOn = (channel, noteNumber, velocity) => {
    const isNewVoice = this.synth.midiChannels[channel].noteOn(noteNumber, velocity);
    if( channel != MIDI.PERCUSSION_CHANNEL && isNewVoice ) {
      this.toneIndicatorCanvas.noteOn(noteNumber);
    }
  };
  noteOff = (channel, noteNumber) => {
    this.synth.midiChannels[channel].noteOff(noteNumber);
    if( channel != MIDI.PERCUSSION_CHANNEL ) {
      this.toneIndicatorCanvas.noteOff(noteNumber);
    }
  };
  allSoundOff = (channel) => {
    this.synth.midiChannels[channel].allSoundOff();
    this.toneIndicatorCanvas.allSoundOff();
  }
  allNotesOff = (channel) => {
    this.synth.midiChannels[channel].allNotesOff();
    this.toneIndicatorCanvas.allSoundOff();
  };
  programChange = (channel, programNumber) => {
    const c = this.synth.midiChannels[channel];
    c.program = programNumber;
    if( channel === this.midiChannelSelector.selectedChannel ) {
      const v = this.instrumentView;
      v.programNumber = c.program;
      v.model = c.instrument;
    };
  };
  handleMidiMessage = (msg) => {
    const [statusWithCh, ...data] = msg;
    const channel = statusWithCh & 0xF;
    const status = statusWithCh & 0xF0;
    switch(status) {
      case 0x90:
        if( data[1] ) { // velocity > 0
          this.noteOn(channel, data[0], data[1]);
          break;
        }
        // fallthrough: velocity === 0 means Note Off
      case 0x80:
        this.noteOff(channel, data[0]);
        break;
      case 0xE0: // Pitch Bend Change
        this.synth.midiChannels[channel].pitchBendValue = (data[1] * (1 << 7) + data[0]) - (1 << 13);
        break;
      case 0xB0: // Control Change
        switch(data[0]) {
          // MSB: 0x00 ... 0x1F
          case 0x01: // Modulation
            this.synth.midiChannels[channel].modulationDepth = data[1];
            break;
          case 0x06: // RPN/NRPN Data Entry
            this.synth.midiChannels[channel].parameterValue = data[1];
            break;
          case 0x07: // Channel Volume
            this.synth.midiChannels[channel].volume = data[1];
            break;
          case 0x0A: // Pan
            this.synth.midiChannels[channel].pan = data[1];
            break;
          case 0x0B: // Expression
            this.synth.midiChannels[channel].expression = data[1];
            break;
          // LSB: 0x20 ... 0x3F
          //  :
          //  :
          // RPN/NRPN
          // case 0x60: // Data Increment
          // case 0x61: // Data Decrement
          case 0x62:
          case 0x63:
          case 0x64:
          case 0x65:
            this.synth.midiChannels[channel].setParameterNumber(...data);
            break;
          case 0x78: // All Sound Off
            if( data[1] == 0 ) { // Must be 0
              this.allSoundOff(channel);
            }
            break;
          case 0x79: // Reset All Controllers
            this.synth.midiChannels[channel].resetAllControllers();
            break;
          case 0x7B: // All Notes Off
            if( data[1] == 0 ) { // Must be 0
              this.allNotesOff(channel);
            }
            break;
        }
        break;
      case 0xC0: // Program Change
        this.programChange(channel, data[0]);
        break;
    }
  };
  instrumentView = {
    createProgramView(manualProgramChangeListener) {
      const programSelector = document.getElementById('program_select');
      const instrumentNameElement = document.getElementById('instrument_name');
      if( programSelector ) {
        INSTRUMENT_NAMES.forEach((name, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.appendChild(document.createTextNode(name));
          programSelector.appendChild(option);
        });
        programSelector.addEventListener("change", manualProgramChangeListener);
      }
      return {
        set programNumber(pn) {
          programSelector && (programSelector.value = pn);
        },
        set instrumentName(name) {
          if( instrumentNameElement ) {
            instrumentNameElement.innerHTML = name === INSTRUMENT_NAMES[programSelector?.value] ? "" : `(${name})`;
          }
        },
      };
    },
    createWaveformView() {
      const waveIconPathOf = (key) => `image/${key}.svg`;
      const waveIconImg = document.getElementById('waveIcon');
      const waveElement = document.getElementById('wave');
      const termsElement = document.getElementById('periodicWaveTerms');
      const waveTypes = ["sawtooth", "square", "triangle", "sine"].reduce((types, key) => {
        types[key] = { icon: waveIconPathOf(key) };
        return types;
      }, {});
      waveTypes.custom = waveTypes.noise = { icon: waveIconPathOf("wave") };
      const showWaveType = (waveType) => {
        if( waveType === 'custom' ) {
          waveElement.appendChild(termsElement);
        } else {
          waveElement.contains(termsElement) && waveElement.removeChild(termsElement);
        }
        waveIconImg && (waveIconImg.src = waveTypes[waveType ?? "custom"].icon);
      };
      const waveSelector = document.getElementById('waveselect');
      waveSelector.addEventListener('change', (event) => showWaveType(this.model.wave = event.target.value));
      Object.keys(waveTypes).forEach(key => {
        const option = document.createElement("option");
        option.appendChild(document.createTextNode(key));
        waveSelector.appendChild(option);
      });
      const termsView = [];
      termsView.pushTermElement = (termElement) => {
        const sliderPair = termElement.querySelectorAll('input');
        const newTermIndex = termsView.push(sliderPair);
        sliderPair.forEach((slider, imag) => slider.addEventListener('input', (event) => {
          const { terms } = this.model;
          terms[imag][newTermIndex] = parseFloat(event.target.value);
          termsView.showFormula(newTermIndex, ...terms.map((a) => a[newTermIndex]));
        }));
        sliderPair.formulaElement = termElement.querySelector('span.periodicWaveFormula');
      };
      const firstTermElement = termsElement.querySelector('.periodicWaveTerm');
      termsView.pushTermElement(firstTermElement);
      const lastTermButtons = firstTermElement.querySelectorAll('button');
      lastTermButtons[0].addEventListener('click', (event) => {
        termsView.addVisibleTerms(1);
        const newTermIndex = termsElement.childElementCount - 1;
        termsView.setTermValuePair(newTermIndex, ...this.model.terms.map((a) => a[newTermIndex] ??= 0));
      });
      lastTermButtons[1].addEventListener('click', (event) => {
        const diff = termsView.addVisibleTerms(-1);
        diff < 0 && this.model.terms.forEach((a) => { a.splice(diff); });
      });
      termsView.addVisibleTerms = (diff) => {
        if( diff > 0 ) {
          let termElement;
          for( let i = diff; i > 0; i-- ) {
            const newTermIndex = termsElement.childElementCount; // === <datalist> + (visible term elements)
            termElement = termsView[newTermIndex - 1]?.[0].parentNode;
            if( !termElement ) {
              if( firstTermElement.contains(lastTermButtons[0]) ) {
                lastTermButtons.forEach((button) => { firstTermElement.removeChild(button); });
              }
              termsView.pushTermElement(termElement = firstTermElement.cloneNode(true));
            }
            termsElement.appendChild(termElement);
          }
          lastTermButtons.forEach((button) => { termElement.appendChild(button); });
          return diff;
        }
        if( diff < 0 ) {
          const limitedLength = Math.min(-diff, termsElement.childElementCount - 2);
          if( limitedLength ) {
            for( let i = limitedLength; i > 0; i-- ) {
              termsElement.lastElementChild.remove();
            }
            lastTermButtons.forEach((button) => {
              termsElement.lastElementChild.appendChild(button);
            });
          }
          return -limitedLength;
        }
        return 0;
      };
      termsView.showFormula = (termIndex, realValue, imagValue) => {
        const realText = !realValue && imagValue ? "" : `${realValue}`;
        const imagText = !imagValue ? "" : imagValue === 1 ? "i" : imagValue === -1 ? "-i" : `${imagValue}i`;
        const k = `${realText}${realText && imagValue > 0 ? "+" : ""}${imagText}`;
        const kParen = realText && imagText ? `(${k})` : k;
        const { formulaElement } = termsView[termIndex - 1];
        formulaElement.firstChild.nodeValue = `${kParen}e`; // Text node
        formulaElement.firstElementChild.textContent = `${termIndex === 1 ? "" : termIndex}i`; // <sup> element
      };
      termsView.setTermValuePair = (termIndex, ...valuePair) => {
        termsView[termIndex - 1].forEach((slider, imag) => { slider.value = valuePair[imag]; });
        termsView.showFormula(termIndex, ...valuePair);
      };
      return {
        set type(value) {
          showWaveType(waveSelector.value = value);
        },
        set terms(value) {
          const [realTerms, imagTerms] = value;
          termsView.addVisibleTerms(realTerms.length - termsElement.childElementCount);
          realTerms.forEach((realTerm, index) => {
            index && termsView.setTermValuePair(index, realTerm, imagTerms[index]);
          });
        },
      };
    },
    createEnvelopeView() {
      const views = [];
      const asSecond = (num) => `${num}s`;
      const asPercent = (num) => `${Math.round(num * 100)}%`;
      document.querySelectorAll("#envelope .envelope_param").forEach((param, index) => {
        const [label, slider] = param.querySelectorAll(".envelope_value,input");
        const asText = slider.id.includes("sustain") ? asPercent : asSecond;
        slider.addEventListener('input', event => {
          label.textContent = asText(this.model.envelope[index] = parseFloat(event.target.value));
        });
        views.push({
          set value(n) {
            label.textContent = asText(n);
            slider.value = n;
          }
        });
      });
      return {
        set envelope(model) {
          views.forEach((view, index) => { view.value = model[index]; });
        },
      };
    },
    setup(manualProgramChangeListener) {
      this.programView = this.createProgramView(manualProgramChangeListener);
      this.waveformView = this.createWaveformView();
      this.envelopeView = this.createEnvelopeView();
    },
    set programNumber(pn) { this.programView.programNumber = pn; },
    get model() { return this._model; },
    set model(m) {
      this._model = m;
      this.programView.instrumentName = m.name;
      const { waveformView } = this;
      waveformView.type = m.wave;
      waveformView.terms = m.terms ??= [[0, 0], [0, 0]];
      this.envelopeView.envelope = m.envelope;
    },
  };
  createVelocitySlider = () => {
    const velocitySlider = document.getElementById('velocity') ?? { value: 64 };
    const velocityValue = document.getElementById('velocityValue');
    if( velocityValue ) {
      const handleInput = () => velocityValue.textContent = velocitySlider.value;
      handleInput();
      velocitySlider.addEventListener?.("input", handleInput);
    }
    return velocitySlider;
  }
  createMidiChannelSelector = () => {
    const selector = document.getElementById('midi_channel');
    Array.from(
      {length: MIDI.NUMBER_OF_CHANNELS},
      (_, ch) => {
        const option = document.createElement("option");
        option.value = ch;
        option.appendChild(document.createTextNode(`${ch + 1}`));
        selector.appendChild(option);
      }
    );
    const { instrumentView } = this;
    instrumentView.setup((event) => {
      const programNumber = parseInt(event.target.value);
      const ch = this.midiChannelSelector.selectedChannel;
      this.sendWebMidiLinkMessage?.([0xC0 | ch, programNumber]);
      this.selectedMidiOutputPorts?.programChange(ch, programNumber);
      this.programChange(ch, programNumber);
    });
    const setInstrumentModelOf = (ch) => {
      const { program, instrument } = this.synth.midiChannels[ch];
      instrumentView.programNumber = program;
      instrumentView.model = instrument;
    };
    selector.addEventListener(
      'change',
      (event) => setInstrumentModelOf(parseInt(event.target.value))
    );
    setInstrumentModelOf(parseInt(selector.value));
    return {
      get selectedChannel() { return parseInt(selector.value); }
    };
  };
  pianoKeyPressedChannnel = new Map();
  manualNoteOn = (noteNumber, orderInChord) => {
    const ch = this.midiChannelSelector.selectedChannel;
    const velocity = this.velocitySlider.value - 0;
    this.sendWebMidiLinkMessage?.([0x90 | ch, noteNumber, velocity]);
    this.selectedMidiOutputPorts?.noteOn(ch, noteNumber, velocity);
    this.noteOn(ch, noteNumber, velocity);
    const { pianoKeyPressedChannnel } = this;
    if( pianoKeyPressedChannnel.has(noteNumber) ) {
      this.manualNoteOff(noteNumber);
    }
    pianoKeyPressedChannnel.set(noteNumber, ch);
    !orderInChord && this.chord.pianoKeyElementClassLists.clear();
    const element = this.pianoKeyElements[noteNumber];
    if( element ) {
      const cl = element.classList;
      cl.add('pressed');
      orderInChord && this.chord.pianoKeyElementClassLists.add(cl, orderInChord == 1);
    }
  };
  manualNoteOff = (noteNumber) => {
    const { pianoKeyPressedChannnel } = this;
    if( pianoKeyPressedChannnel.has(noteNumber) ) {
      const ch = pianoKeyPressedChannnel.get(noteNumber);
      this.sendWebMidiLinkMessage?.([0x90 | ch, noteNumber, 0]);
      this.selectedMidiOutputPorts?.noteOff(ch, noteNumber);
      this.noteOff(ch, noteNumber);
      pianoKeyPressedChannnel.delete(noteNumber);
    }
    this.pianoKeyElements[noteNumber]?.classList.remove('pressed');
  };
  manualAllNotesOff = () => {
    this.pianoKeyPressedChannnel.forEach((value, key) => this.manualNoteOff(key - 0));
  };
  leftEnd = {
    set note(n) {
      this._note = n;
      this._noteC = Math.ceil(n / 12) * 12;
    },
    get note() { return this._note; },
    get noteC() { return this._noteC; },
  };
  chord = {
    pianoKeyElementClassLists: [],
    setup() {
      const createDetachableElementEntry = id => {
        const element = document.getElementById(id);
        if( !element ) return undefined;
        const parent = element.parentNode;
        return {
          element,
          attach: (text) => {
            text && (element.innerHTML = text);
            parent.contains(element) || parent.appendChild(element);
          },
          detach: () => {
            parent.contains(element) && parent.removeChild(element);
          },
        };
      };
      const chord = this;
      chord.label = createDetachableElementEntry('chord');
      chord.dialCenterLabel = createDetachableElementEntry('center_chord');
      chord.chordTextInput = document.getElementById('chord_text');
      chord.keySignatureSetButton = document.getElementById('setkey');
      chord.keySignatureSetButton.addEventListener('click', event => chord.keySignature.parse(chord));
      const cls = chord.pianoKeyElementClassLists;
      cls.clear = () => {
        while( cls.length ) cls.pop().remove('chord', 'root');
      };
      cls.add = (cl, root) => {
        cl.add('chord');
        root && cl.add('root');
        cls.push(cl);
      }
    },
    clear() {
      const chord = this;
      const {
        label,
        dialCenterLabel,
        pianoKeyElementClassLists,
        keyOrChordChanged,
        buttonCanvas,
        chordTextInput,
      } = chord;
      label?.detach();
      dialCenterLabel?.detach();
      delete chord.majorBassHour;
      delete chord.hour;
      delete chord.rootPitchName;
      delete chord.rootPitchNumber;
      delete chord.offset3rd;
      delete chord.offset5th;
      delete chord.offset7th;
      delete chord.add9th;
      keyOrChordChanged();
      buttonCanvas.setChord();
      chordTextInput.value = "";
      pianoKeyElementClassLists.clear();
    },
    get hasValue() { return "hour" in this; },
    get hasBass() { return "majorBassHour" in this; },
    get isSus2() { return this.offset3rd === -2; },
    get isMinor() { return this.offset3rd === -1; },
    get isSus4() { return this.offset3rd === 1; },
    parseText(rawText) {
      const chord = this;
      chord.clear();
      const trimmedText = rawText?.trim();
      if( !trimmedText ) return;
      const [chordText, bassText] = trimmedText.split("/");
      const parsedRoot = Music.parsePitchName(chordText);
      if( !parsedRoot ) return;
      let suffix;
      [chord.hour, suffix] = parsedRoot;
      if( bassText ) {
        const parsedBass = Music.parsePitchName(bassText);
        if( parsedBass ) {
          const [majorBassHour] = parsedBass;
          if( ! Music.enharmonicallyEquals(majorBassHour, chord.hour) ) {
            chord.majorBassHour = majorBassHour;
          }
        }
      }
      suffix = suffix.replace(/\(|\)|\,/g, "");
      const eat = (str) => {
        const found = suffix.startsWith(str);
        if( found ) suffix = suffix.replace(str, "");
        return found;
      };
      // dim/aug/minor
      const setMinor = () => {
        chord.offset3rd = -1;
        chord.hour -= 3;
      };
      if( eat("dim9") ) {
        setMinor();
        chord.offset5th = -1;
        chord.offset7th = 1;
        chord.add9th = true;
      }
      else if( eat("dim7") ) {
        setMinor();
        chord.offset5th = -1;
        chord.offset7th = 1;
      }
      else if( eat("dim") ) {
        setMinor();
        chord.offset5th = -1;
      }
      else if( eat("aug") ) chord.offset5th = 1;
      else if( eat("m") ) setMinor();
      //
      // 6th/7th/9th
      if( eat("add9") ) chord.add9th = true;
      else if( eat("M9") ) {
        chord.offset7th = 3;
        chord.add9th = true;
      }
      else if( eat("M7") ) chord.offset7th = 3;
      else if( eat("9") ) {
        chord.offset7th = 2;
        chord.add9th = true;
      }
      else if( eat("7") ) chord.offset7th = 2;
      else if( eat("69") ) {
        chord.offset7th = 1;
        chord.add9th = true;
      }
      else if( eat("6") ) chord.offset7th = 1;
      //
      // sus4/sus2
      if( eat("sus4") ) chord.offset3rd = 1;
      else if( eat("sus2") ) {
        chord.offset3rd = -2;
        delete chord.add9th; // To avoid duplicated pitch number when chord inversion (2nd + octave === 9th)
      }
      // -5/b5
      if( eat("-5") || eat("b5") ) chord.offset5th = -1;
      return;
    },
    pitchNameToHtml: ([abc, fs]) => fs ? `${abc}<sup>${fs}</sup>` : abc,
    stop: () => {
      this.manualAllNotesOff();
      this.chord.buttonCanvas.disableStrum();
    },
    start: () => {
      const {
        leftEnd,
        chord,
      } = this;
      const {
        majorBassHour,
        hour,
        label,
        dialCenterLabel,
        chordTextInput,
        keySignatureSetButton,
        offset3rd,
        offset5th,
        offset7th,
        add9th,
        stop,
        buttonCanvas,
        pianoKeyElementClassLists,
        keyOrChordChanged,
        hasValue,
        pitchNameToHtml,
      } = chord;
      stop();
      if( ! hasValue ) return;
      const { hasBass, isSus2, isMinor, isSus4 } = chord;
      const majorRootHour = hour + (isMinor ? 3 : 0);
      const rootPitchNumber = Music.togglePitchNumberAndMajorHour(majorRootHour) + 24;
      const bassPitchNumber = hasBass
        ? Music.togglePitchNumberAndMajorHour(majorBassHour) + 24
        : rootPitchNumber;
      let i = 0;
      const noteOn = (n, bass) => {
        const noteNumber = n - Math.floor((n - (leftEnd.note + 5)) / 12) * 12;
        this.manualNoteOn(bass ? Math.max(noteNumber - 24 , 0) : noteNumber, ++i);
      };
      pianoKeyElementClassLists.clear();
      noteOn(rootPitchNumber);
      noteOn(rootPitchNumber + 4 + (offset3rd ?? 0));
      noteOn(rootPitchNumber + 7 + (offset5th ?? 0));
      offset7th && noteOn(rootPitchNumber + 8 + offset7th);
      add9th && noteOn(rootPitchNumber + 14);
      noteOn(bassPitchNumber, true);
      chord.notes = Array.from(this.pianoKeyPressedChannnel.keys());
      buttonCanvas.setChord(chord);
      buttonCanvas.enableStrum();
      const rootPitchName = Music.majorPitchNameAt(majorRootHour);
      if( ! rootPitchName ) return;
      if( label || dialCenterLabel || chordTextInput ) {
        let sub = '', sup = '';
        if( isMinor && offset5th < 0 && offset7th == 1 ) {
          sup += `dim${add9th ? 9 : 7}`;
        } else {
          isMinor && (sub += 'm');
          offset5th > 0 && (sup += 'aug');
          sup += (add9th ? ['add9','69','9','M9'] : ['','6','7','M7'])[offset7th ?? 0] ?? "";
          offset5th < 0 && (sup += '-5');
          if( isSus4 ) sup += 'sus4'; else if( isSus2 ) sup += 'sus2';
        }
        let htmlChordText = pitchNameToHtml(rootPitchName);
        sub && (htmlChordText += `<sub>${sub}</sub>`);
        sup && (htmlChordText += `<sup style="font-size: 70%;">${sup}</sup>`);
        let bass;
        if( hasBass ) {
          const bassPitchName = Music.majorPitchNameAt(majorBassHour);
          if( bassPitchName ) {
            bass = `/${bassPitchName.join("")}`;
            htmlChordText += `/${pitchNameToHtml(bassPitchName)}`;
          }
        }
        const plainChordText = `${rootPitchName.join("")}${sub ?? ""}${sup ?? ""}${bass ?? ""}`;
        chordTextInput.value = plainChordText;
        label?.attach(htmlChordText);
        dialCenterLabel?.attach(htmlChordText);
      }
      keySignatureSetButton.textContent = Music.keySignatureTextAt(Music.normalizeHourAsKey(hour)) || Music.NATURAL;
      keyOrChordChanged();
    },
    keyOrChordChanged: () => {
      const { chord } = this;
      const {
        keySignature,
        keySignatureSetButton: { style },
      } = chord;
      style.visibility = (
        chord.hasValue &&
        ! (
          chord.isMinor === keySignature.minor &&
          Music.enharmonicallyEquals(chord.hour, keySignature.numberOfSharps)
        )
      ) ? 'visible' : 'hidden';
    },
    strum: (direction) => {
      const {
        chord: { notes },
        manualNoteOff,
        manualNoteOn,
      } = this;
      let currentIndex = notes.currentIndex + direction;
      if( isNaN(currentIndex) ) {
        if( direction >= 0 ) currentIndex = 0;
        else if( direction < 0 ) currentIndex = notes.length - 1;
      } else {
        if ( currentIndex >= notes.length ) currentIndex = 0;
        else if ( currentIndex < 0 ) currentIndex = notes.length - 1;
      }
      const noteNumber = notes[notes.currentIndex = currentIndex];
      manualNoteOff(noteNumber);
      manualNoteOn(noteNumber, currentIndex + 1);
    },
  };
  createSelectedMidiOutputPorts = () => {
    const ports = [];
    ports.addPort = port => ports.push(port);
    ports.removePort = port => {
      const i = ports.findIndex(p => p.id === port.id);
      i < 0 || ports.splice(i, 1);
    };
    ports.send = (message) => ports.forEach(port => port.send(message));
    ports.noteOn = (channel, noteNumber, velocity = 64) => ports.send([0x90 + channel, noteNumber, velocity]);
    ports.noteOff = (channel, noteNumber) => ports.send([0x90 + channel, noteNumber, 0]);
    ports.programChange = (channel, programNumber) => ports.send([0xC0 + channel, programNumber]);
    return ports;
  };
  setupMidiPorts = () => {
    const midiElement = document.getElementById('midi');
    if( ! midiElement ) return;
    if( ! window.isSecureContext ) {
      console.warn("Warning: Not in secure context - MIDI IN/OUT not allowed");
    }
    // MIDI port selector
    const midiMessageListener = msg => this.handleMidiMessage(msg.data);
    const selectedMidiOutputPorts = this.selectedMidiOutputPorts = this.createSelectedMidiOutputPorts();
    const checkboxes = {
      eventToAddOrRemove: event => event.target.checked ? "add" : "remove",
      get: port => midiElement.querySelector(`input[value="${port.id}"]`),
      add: port => {
        if( checkboxes.get(port) ) return;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.name = `midi_${port.type}`;
        cb.value = port.id;
        const label = document.createElement("label");
        label.appendChild(cb);
        const manufacturerText = port.manufacturer ? ` (${port.manufacturer})` : "";
        label.appendChild(document.createTextNode(`${port.name}${manufacturerText}`));
        document.getElementById(cb.name).appendChild(label);
        switch(port.type) {
          case "input":
            cb.addEventListener("change", event => {
              port[`${checkboxes.eventToAddOrRemove(event)}EventListener`]("midimessage", midiMessageListener);
            });
            break;
          case "output":
            cb.addEventListener("change", event => {
              selectedMidiOutputPorts[`${checkboxes.eventToAddOrRemove(event)}Port`](port);
            });
            break;
        };
      },
      remove: port => {
        switch(port.type) {
          case "input":
            port.removeEventListener("midimessage", midiMessageListener);
            break;
          case "output":
            selectedMidiOutputPorts.removePort(port);
            break;
        };
        checkboxes.get(port)?.closest("label").remove();
      },
    };
    navigator.requestMIDIAccess({
      sysex: true,
      software: false,
    }).then(access => {
      access.inputs.forEach(checkboxes.add);
      access.outputs.forEach(checkboxes.add);
      access.addEventListener("statechange", ({ port }) => {
        switch(port.state) {
          case "connected": // USB MIDI plugged
            checkboxes.add(port);
            break;
          case "disconnected": // USB MIDI unplugged
            checkboxes.remove(port);
            break;
        }
      });
    }).catch(msg => {
      alert(msg);
    });
  };
  setupWebMidiLink = () => {
    window.addEventListener('message', event => {
      if( ! event.data.split ) {
        // Ignore the message from the other message source (Such as Songle)
        return;
      }
      const msg = event.data.split(",");
      const msgType = msg.shift();
      switch(msgType) {
        case 'midi':
          this.handleMidiMessage(msg.map(hexStr => parseInt(hexStr, 16)));
          break;
      }
    });
    const urlElement = document.getElementById('WebMidiLinkUrl');
    const loadButton = document.getElementById('LoadWebMidiLinkUrl');
    loadButton.disabled = true;
    urlElement.addEventListener("input", (event) => {
      loadButton.disabled = !event.target.value;
    });
    const iFrame = document.getElementById('WebMidiLinkSynth');
    if( urlElement && loadButton && iFrame ) {
      const parent = iFrame.parentNode;
      const attach = () => parent.contains(iFrame) || parent.appendChild(iFrame);
      const detach = () => parent.contains(iFrame) && parent.removeChild(iFrame);
      const send = (msg) => {
        const str = msg.reduce((str, num) => `${str},${(num).toString(16)}`, "midi");
        iFrame.contentWindow.postMessage(str, "*");
      };
      detach();
      loadButton.addEventListener('click', () => {
        const url = urlElement.value;
        if( url ) {
          attach();
          iFrame.onload = () => {
            this.sendWebMidiLinkMessage = send;
          };
          iFrame.src = url;
        } else {
          delete this.sendWebMidiLinkMessage;
          iFrame.onload = undefined;
          iFrame.src = undefined;
          detach();
        }
      });
    }
  };
  setupMidiSequencer = (beatCanvas, setDarkPlayMode) => {
    const {
      chord,
      selectedMidiOutputPorts,
    } = this;
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
      let value = 0;
      let valueLength = 0;
      while(valueLength < 4) {
        const b = byteArray[valueLength++];
        value <<= 7;
        value += (b & 0x7F);
        if( (b & 0x80) == 0 ) break;
      }
      return [value, byteArray.subarray(valueLength)];
    };
    const parseVariableLengthData = (byteArray) => {
      const [length, valuesByteArray] = parseVariableLengthValue(byteArray);
      const out = [valuesByteArray.subarray(0, length)];
      length < valuesByteArray.length && out.push(valuesByteArray.subarray(length));
      return out;
    };
    const parseMetaEvent = (byteArray, event) => {
      if( (event.metaType = byteArray[0]) == 0x2F ) {
        return undefined; // End Of Track
      }
      const [data, nextByteArray] = parseVariableLengthData(byteArray.subarray(1));
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
      return nextByteArray;
    };
    const parseSystemExclusive = (byteArray, event) => {
      const [data, nextByteArray] = parseVariableLengthData(byteArray);
      event.systemExclusive = data;
      return nextByteArray;
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
        const nextByteArray = parseFixedLengthEvent(byteArray, event, dataLength - 1);
        event.data = [runningStatus, ...event.data];
        return nextByteArray;
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
          {
            const { keySignature: hour, minor } = event;
            const { keySignature } = chord;
            keySignature.parse([hour, minor]);
            chord.clear(); // Unselect chord to hide key signature change button
          }
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
      setDarkPlayMode();
      setTickPosition(0);
      midiSequencerElement.prepend(midiSequenceElement);
    };
    const loadMidiUrl = (url) => {
      fetch(url).then((response) => {
        if( response.status && !response.ok ) {
          throw `HTTP error: status = ${response.status}`;
        }
        return response.arrayBuffer();
      }).then((ab) => {
        if( !ab.byteLength ) throw "Empty";
        const seq = parseMidiSequence(new Uint8Array(ab))
        midiFileNameElement.textContent = url.split("/").pop();
        setMidiSequence(seq);
        play();
      }).catch((error) => {
        console.error(`Could not load URL: ${url}:`, error);
        alert(error);
      });
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
      beatCanvas?.drawBeat(beat = newBeat, numerator);
    };
    const INTERVAL_MILLI_SEC = 10;
    let ticksPerInterval;
    const changeTempo = (uspq) => {
      tempoElement.textContent = Music.bpmTextOf(Math.floor(60000000 / uspq));
      ticksPerInterval = 1000 * INTERVAL_MILLI_SEC * (midiSequence.ticksPerQuarter / uspq);
    };
    const sendMidiMessage = (midiMessage) => {
      this.handleMidiMessage(midiMessage);
      this.sendWebMidiLinkMessage?.(midiMessage);
      try {
        selectedMidiOutputPorts?.send(midiMessage);
      } catch(e) {
        console.error(midiMessage, e);
      }
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
      this.synth.midiChannels.forEach((_, ch) => {
        sendMidiMessage([0xB0 + ch, 0x7B, 0]); // All Notes Off
        sendMidiMessage([0xE0 + ch, 0, 0x40]); // Reset Pitch Bend to center
      });
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
        this.synth.midiChannels.forEach((_, ch) => {
          const controlChangeStatus = 0xB0 + ch;
          sendMidiMessage([controlChangeStatus, 0x78, 0]); // All Sound Off
          sendMidiMessage([controlChangeStatus, 0x79, 0]); // Reset All Controllers
        });
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
  setupPianoKeyboard = () => {
    const { leftEnd, } = this;
    leftEnd.note = 4 * 12 + 5;
    const keyboard = document.getElementById('pianokeyboard');
    if( !keyboard ) {
      return;
    }
    let pointerdown = 'mousedown';
    let pointerup = 'mouseup';
    let pointerenter = 'mouseenter';
    let pointerleave = 'mouseleave';
    if( typeof window.ontouchstart !== 'undefined' ) {
      pointerdown = 'touchstart';
      pointerup = 'touchend';
    }
    const {
      manualNoteOn,
      manualNoteOff,
      chord,
    } = this;
    const [
      whiteKeyElement,
      blackKeyElement,
      frequencyElement,
    ] = keyboard.getElementsByTagName('*');
    const [
      whiteKeyWidth,
      blackKeyOffsets
    ] = [
      whiteKeyElement,
      blackKeyElement
    ].map((element, isBlackKey) => {
      const w = element.clientWidth + 2 * element.clientLeft;
      if( isBlackKey ) return Array.from({length: 5}, (_, hour) => hour<2 ? w - w/(4-hour) : w/hour);
      return w;
    });
    const originalFrequencyText = frequencyElement.querySelector("a").textContent;
    frequencyElement.remove();
    let [whiteKeyLeft, hour] = [0, 6];
    const pianoKeyElements = this.pianoKeyElements = MIDI.FREQUENCIES.map((frequency, noteNumber) => {
      let element;
      //  1 3    0 2 4
      // 6 8 10 5 7 9 11
      if( hour >= 5 ) {
        if( whiteKeyLeft ) {
          keyboard.appendChild(element = whiteKeyElement.cloneNode());
          element.style.left = `${whiteKeyLeft}px`;
        } else {
          element = whiteKeyElement;
        }
        if( hour == 9 ) {
          const text = `${frequency}Hz`;
          if( text === originalFrequencyText ) {
            frequencyElement.style.left = element.style.left;
            keyboard.appendChild(frequencyElement);
          } else {
            const newFrequencyElement = frequencyElement.cloneNode();
            newFrequencyElement.innerHTML = text;
            newFrequencyElement.style.left = element.style.left;
            keyboard.appendChild(newFrequencyElement);
          }
        }
        whiteKeyLeft += whiteKeyWidth;
        hour -= 5;
      } else {
        if( noteNumber > 1 ) {
          keyboard.appendChild(element = blackKeyElement.cloneNode());
        } else {
          element = blackKeyElement;
        }
        element.style.left = `${whiteKeyLeft - blackKeyOffsets[hour]}px`;
        hour += 7;
      }
      element.addEventListener(pointerdown, e => {
        chord.clear();
        manualNoteOn(noteNumber);
        keyboard.focus();
        e.preventDefault();
      });
      element.addEventListener(pointerenter, (event) => {
        (event.buttons & 1) && manualNoteOn(noteNumber);
      });
      const handlePointerUp = () => {
        manualNoteOff(noteNumber);
      };
      element.addEventListener(pointerup, handlePointerUp);
      element.addEventListener(pointerleave, (event) => {
        event.buttons && handlePointerUp();
      });
      element.addEventListener('contextmenu', e => e.preventDefault());
      return element;
    });
    ['dblclick','selectstart'].forEach(type => keyboard.addEventListener(type, e => e.preventDefault()));
    const pcKey = {
      keysArray: Array.from("Q2W3ER5T6Y7UI9O0P@^["),
      activeNoteNumbers: new Map(),
      showBindings(origin, show) {
        this.keysArray.forEach(
          (key, index) => pianoKeyElements[origin + index].textContent = show ? key : ""
        );
      },
      setup() {
        const toCode = {
          "@": "BracketLeft",
          "^": "Equal",
          "[": "BracketRight",
        };
        const codeToIndexMap = new Map(Array.from(
          this.keysArray,
          (key, index) => [
            toCode[key] ?? `${key < 10 ? "Digit" : "Key"}${key}`,
            index
          ]
        ));
        this.indexOfCode = (code) => codeToIndexMap.get(code) ?? -1;
      },
    };
    pcKey.setup();
    keyboard.addEventListener("keydown", e => {
      if( e.repeat ) return;
      const { activeNoteNumbers } = pcKey;
      if( activeNoteNumbers.has(e.code) ) return;
      const index = pcKey.indexOfCode(e.code);
      if( index < 0 ) return;
      const noteNumber = index + leftEnd.noteC;
      manualNoteOn(noteNumber);
      activeNoteNumbers.set(e.code, noteNumber);
      chord.clear();
    });
    keyboard.addEventListener("keyup", e => {
      const { activeNoteNumbers } = pcKey;
      manualNoteOff(activeNoteNumbers.get(e.code));
      activeNoteNumbers.delete(e.code);
    });
    keyboard.scrollLeft = whiteKeyWidth * Math.ceil(7 * leftEnd.note / 12);
    document.activeElement === keyboard && pcKey.showBindings(leftEnd.noteC, true);
    keyboard.addEventListener("scroll",
      event => {
        const { scrollLeft, scrollWidth } = event.target;
        const oldNoteC = leftEnd.noteC;
        leftEnd.note = Math.ceil(pianoKeyElements.length * scrollLeft / scrollWidth);
        const newNoteC = leftEnd.noteC;
        if( document.activeElement === keyboard && oldNoteC !== newNoteC ) {
          pcKey.showBindings(oldNoteC, false);
          pcKey.showBindings(newNoteC, true);
        }
      }
    );
    keyboard.addEventListener('focus', () => pcKey.showBindings(leftEnd.noteC, true));
    keyboard.addEventListener('blur', () => pcKey.showBindings(leftEnd.noteC, false));
  };
  setupSongle = (chord, beatCanvas, setDarkPlayMode, searchParams) => {
    const SONGLE_SONG_URL_PREFIX = "https://songle.jp/songs/";
    const HTTPS_URL_PREFIX = "https://";
    const urlInput = document.getElementById("SongleUrl");
    const songKeyInput = document.getElementById("SongleKeySig");
    const loadButton = document.getElementById("LoadSongleUrl");
    const widgetParent = document.getElementById("EmbeddedSongle");
    const errorMessageElement = document.getElementById("SongleErrorMessage");
    const keyTimelineElement = document.getElementById("SongleKeyTimeline");
    const positionCaptureButton = document.getElementById("songleCapturePosition");
    let currentPosition = 0;
    let duration = 0;
    positionCaptureButton.addEventListener("click", () => {
      navigator.clipboard.writeText(`${currentPosition}`);
    });
    const positionElement = document.getElementById("songlePosition");
    const tempoElement = document.getElementById("songleTempo");
    const chordElement = document.getElementById("songleChord");
    const autoChordPlayCheckbox = document.getElementById("autoChordPlay");
    autoChordPlayCheckbox.addEventListener("change", (event) => {
      event.target.checked ? chord.clear() : chord.stop();
    });
    const toSongKeyTimeline = (text) => {
      if( !text ) return;
      let t;
      const timeline = text.split(",").reduce((tl, token, index) => {
        if( index & 1 ) {
          tl.push(t = { position: parseInt(token) });
        } else {
          t.key = token;
        }
        return tl;
      }, [t = { position: 0 }]);
      let nextIndex = 1;
      let nextPosition = timeline[nextIndex]?.position;
      timeline.handleBeatPlay = (newPosition) => {
        if( nextPosition > newPosition ) return;
        const t = timeline[nextIndex];
        if( t ) chord.keySignature.parse(t.key);
        nextPosition = timeline[++nextIndex]?.position;
      };
      timeline.handleSeek = (newPosition) => {
        nextIndex = timeline.findIndex((t) => t.position > newPosition);
        if( nextIndex < 0 ) nextIndex = timeline.length;
        chord.keySignature.parse(timeline[nextIndex > 0 ? nextIndex - 1 : 0].key);
        nextPosition = timeline[nextIndex]?.position;
      };
      return timeline;
    };
    keyTimelineElement.setSongKeyTimeline = (songKeyTimeline, duration) => {
      while( keyTimelineElement.firstChild ) {
        keyTimelineElement.removeChild(keyTimelineElement.firstChild);
      }
      if( !songKeyTimeline ) {
        return;
      }
      songKeyTimeline.forEach((t, i) => {
        const { position, key } = t;
        const endPosition = songKeyTimeline[i + 1]?.position ?? duration;
        const element = document.createElement("div");
        element.textContent = i ? key : `🔑${key}`;
        element.classList.add("key");
        element.style.width = `${(endPosition - position) / duration * 100}%`;
        keyTimelineElement.appendChild(element);
      });
    };
    const formatTime = (t) => `${Math.floor(t.milliseconds)}`;
    const errorMessages = {
      100: "Could not embed: Song deleted",
      101: "Could not embed: Not permitted",
      200: "Music map loading aborted",
      201: "Music map loading failed",
      300: "Sound file (mp3) download failed",
    };
    let widgetElement, widget;
    const removeSongle = () => {
      positionCaptureButton.style.display = "none";
      delete window.onSongleWidgetReady;
      delete window.onSongleWidgetError;
      chord.stop();
      if( widgetElement ) {
        widgetElement.remove();
        widgetElement = undefined;
      }
      keyTimelineElement.setSongKeyTimeline();
      [
        tempoElement,
        positionElement,
        chordElement,
        errorMessageElement
      ].forEach((element) => element.textContent = "");
      PianoKeyboard.setSongTitleToDocument(undefined);
    };
    const loadSongle = (urlText, songKeyTimelineText) => {
      if( !widgetParent ) {
        alert("Parent element not found to embed the Songle Widget");
        return;
      }
      if( widget ) {
        const { remove } = widget;
        if( remove ) {
          remove();
        } else {
          console.warn("Function widget.remove() undefined, so skipped");
        }
        widget = undefined;
        removeSongle();
      }
      urlInput.value = urlText;
      songKeyInput.value = songKeyTimelineText;
      if( !urlText ) {
        return;
      }
      if( ! songKeyTimelineText && typeof SONG_KEYS !== "undefined" ) {
        songKeyInput.value = SONG_KEYS.get(urlText) ?? "";
      }
      const songKeyTimeline = toSongKeyTimeline(songKeyInput.value);
      widgetElement = SongleWidgetAPI.createSongleWidgetElement({
        api: "songle-link",
        url: urlText,
        songAutoPlay: true,
        videoPlayerSizeW: "auto",
        videoPlayerSizeH: "auto",
        songleWidgetSizeW: "auto",
      });
      widgetParent.insertBefore(widgetElement, keyTimelineElement);
      window.onSongleWidgetReady = (apiKey, songleWidget) => {
        const { song } = widget = songleWidget;
        PianoKeyboard.setSongTitleToDocument(`${song.title} by ${song.artist.name}`);
        keyTimelineElement.setSongKeyTimeline(songKeyTimeline, widget.duration.milliseconds);
        duration = formatTime(widget.duration);
        currentPosition = formatTime(widget.position);
        positionCaptureButton.style.display = "unset";
        positionElement.textContent = `${currentPosition}/${duration}[ms]`
        widget.on("chordPlay", (event) => {
          const chordSymbol = event.chord.name;
          chordElement.textContent = chordSymbol;
          if( autoChordPlayCheckbox.checked ) {
            chord.parseText(chordSymbol);
            chord.start();
          }
        });
        widget.on("beatPlay", (event) => {
          const numerator = event.bar.beats.length || 4;
          const position = event.beat.position;
          beatCanvas?.drawBeat(position - 1, numerator);
          if( autoChordPlayCheckbox.checked ) {
            chord.start();
          }
          currentPosition = formatTime(widget.position);
          positionCaptureButton.style.display = "unset";
          positionElement.textContent = `${currentPosition}/${duration}[ms]`
          tempoElement.textContent = Music.bpmTextOf(Math.round(event.beat.bpm));
          songKeyTimeline?.handleBeatPlay(widget.position.milliseconds);
        });
        const handleSeek = () => {
          songKeyTimeline && setTimeout(() => songKeyTimeline.handleSeek(widget.position.milliseconds), 0);
        };
        widget.on("seek", handleSeek);
        widget.on("play", handleSeek);
        widget.on("pause", () => { chord.stop(); });
        widget.on("finish", () => {
          chord.stop();
          chordElement.textContext = "";
        });
        setDarkPlayMode();
      };
      window.onSongleWidgetError = (apiKey, songleWidget) => {
        const { status } = widget = songleWidget;
        const formattedMessage = `Songle error ${status} : ${errorMessages[status] ?? "Unknown error"}`;
        if( errorMessageElement ) {
          errorMessageElement.textContent = formattedMessage;
        } else {
          alert(formattedMessage);
        }
      };
    };
    loadButton?.addEventListener("click", () => {
      let url = urlInput.value;
      try {
        // Decode if percent-encoded URL entered (such as the content URL copied from Songle URL)
        url = decodeURIComponent(url);
        if( url.startsWith(SONGLE_SONG_URL_PREFIX) ) {
          url = url.replace(SONGLE_SONG_URL_PREFIX, "");
        } else if( url.startsWith(HTTPS_URL_PREFIX) ) {
          url = url.replace(HTTPS_URL_PREFIX, "");
        }
      } catch(error) {
        console.error(error);
      }
      loadSongle(url, songKeyInput.value);
    });
    const initialUrlText = searchParams.get("songle") ?? searchParams.get("url");
    if( initialUrlText ) {
      loadSongle(initialUrlText, searchParams.get("keysig") ?? searchParams.get("key"));
    }
  };
  constructor(toneIndicatorCanvas, beatCanvas, setDarkPlayMode, searchParams) {
    this.toneIndicatorCanvas = toneIndicatorCanvas;
    this.synth = new SimpleSynthesizer();
    const {
      chord,
      createVelocitySlider,
      createMidiChannelSelector,
      setupMidiPorts,
      setupWebMidiLink,
      setupMidiSequencer,
      setupPianoKeyboard,
      setupSongle,
    } = this;
    chord.setup();
    this.velocitySlider = createVelocitySlider();
    this.midiChannelSelector = createMidiChannelSelector();
    setupMidiPorts();
    setupWebMidiLink();
    setupMidiSequencer(beatCanvas, setDarkPlayMode);
    setupPianoKeyboard();
    setupSongle(chord, beatCanvas, setDarkPlayMode, searchParams);
  }
}
