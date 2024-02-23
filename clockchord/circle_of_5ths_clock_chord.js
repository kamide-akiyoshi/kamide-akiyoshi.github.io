
const setupSlider = (id, value, min, max, step) => {
  const slider = document.getElementById(id);
  if( ! slider ) {
    console.warn(`No slider found: ID=${id}`);
    return { value };
  }
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  return slider;
};

const SimpleSynthesizer = class {
  static get audioContext() {
    if( ! SimpleSynthesizer._audioContext ) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        SimpleSynthesizer._audioContext = new AudioContext();
      }
      catch(e) {
        alert('Web Audio API is not supported in this browser');
      }
    }
    return SimpleSynthesizer._audioContext;
  };
  constructor() {
    const sliders = {
      volume:       setupSlider('volume' , 0.2, 0, 1, 0.01),
      attackTime:   setupSlider('attack' , 0.01, 0, 0.3, 0.001),
      decayTime:    setupSlider('decay'  , 0.5, 0, 1, 0.01),
      sustainLevel: setupSlider('sustain', 0.3, 0, 1, 0.01),
      releaseTime:  setupSlider('release', 0.3, 0, 1, 0.01),      
    };
    const waves = {
      ...(["sawtooth", "square", "triangle", "sine"].reduce(
        (basicWaves, key) => {
          basicWaves[key] = {iconFile: `image/${key}.svg`};
          return basicWaves;
        },{}
      )),
      custom_test: {
        iconFile: "image/wave.svg",
        real: [0, 0, 0, 0, 0, 0, 0, 0],
        imag: [0, 1, 1, 1, 0, 1, 1, 0],
      },
    };
    const waveselect = document.getElementById('waveselect');
    if( waveselect ) {
      Object.keys(waves).forEach(key => {
        const option = document.createElement("option");
        option.appendChild(document.createTextNode(key));
        waveselect.appendChild(option);
      });
      waveselect.value = "sawtooth";
      const img = document.getElementById('wave');
      if( img ) {
        const setIcon = waveName => {
          img.src = waves[waveName].iconFile;
        };
        waveselect.addEventListener('change', event => setIcon(event.target.value));
        setIcon(waveselect.value);
      }
    }
    const createAmplifier = context => {
      const amp = context.createGain();
      const { gain } = amp;
      const { volume } = sliders;
      const changeVolume = () => gain.value = volume.value ** 2;
      volume.addEventListener && volume.addEventListener('input', changeVolume);
      changeVolume();
      amp.connect(context.destination);
      return amp;
    };
    this.createVoice = frequency => {
      const context = SimpleSynthesizer.audioContext;
      const amp = this.amplifier ??= createAmplifier(context);
      const envelope = context.createGain();
      envelope.gain.value = 0;
      envelope.connect(amp);
      const osc = context.createOscillator();
      osc.frequency.value = frequency;
      osc.connect(envelope);
      osc.start();
      let timeoutIdToStop;
      return {
        attack: () => {
          clearTimeout(timeoutIdToStop);
          timeoutIdToStop = undefined;
          const { gain } = envelope;
          gain.cancelScheduledValues(context.currentTime);
          const sustainLevel = sliders.sustainLevel.value;
          const attackTime = sliders.attackTime.value - 0;
          const t1 = context.currentTime + attackTime;
          const waveKey = waveselect?.value ?? "sawtooth";
          const { real, imag } = waves[waveKey];
          if( real ) {
            const periodicWave = context.createPeriodicWave(real, imag);
            osc.setPeriodicWave(periodicWave);
          } else {
            osc.type = waveKey;
          }
          gain.linearRampToValueAtTime(1, t1);
          sustainLevel < 1 && gain.setTargetAtTime(sustainLevel, t1, sliders.decayTime.value);
        },
        release: stopped => {
          if( timeoutIdToStop ) return;
          const { gain } = envelope;
          const gainValueToStop = 0.001;
          const stop = () => {
            timeoutIdToStop = undefined;
            gain.cancelScheduledValues(context.currentTime);
            gain.value = 0;
            osc.stop();
            stopped && stopped();
          };
          if( gain.value <= gainValueToStop ) { stop(); return; }
          const releaseTime = sliders.releaseTime.value;
          const delay = Math.log(gain.value / gainValueToStop) * releaseTime * 1000;
          gain.cancelScheduledValues(context.currentTime);
          gain.setTargetAtTime(0, context.currentTime, releaseTime);
          timeoutIdToStop = setTimeout(stop, delay);
        }
      };
    };
  }
};

const PianoKeyboard = class {
  pianoKeys = Array.from(
    {length: 128},
    (_, midiNoteNumber) => {
      return {
        frequency: 440 * (2 ** ((midiNoteNumber - 69)/12))
      };
    }
  );
  pressedNoteNumbers = new Set();
  chordClassLists = [];
  noteOn = (noteNumber, orderInChord) => {
    if( ! orderInChord || orderInChord == 1 ) {
      while( this.chordClassLists.length ) {
        this.chordClassLists.pop().remove('chord', 'root');
      }
    }
    const key = this.pianoKeys[noteNumber];
    if( key ) {
      (key.voice ??= this.synth.createVoice(key.frequency)).attack();
      this.pressedNoteNumbers.add(noteNumber);
      const { element } = key;
      if( element ) {
        const cl = element.classList;
        cl.add('pressed');
        if( orderInChord ) {
          cl.add('chord');
          orderInChord == 1 && cl.add('root');
          this.chordClassLists.push(cl);
        }
      }
    }
    return key;
  };
  noteOff = noteNumber => {
    const key = this.pianoKeys[noteNumber];
    if( key ) {
      key.voice?.release(() => { delete key.voice; });
      key.element?.classList.remove('pressed');
      this.pressedNoteNumbers.delete(noteNumber);
    }
    return key;
  };
  leftEnd = {
    set note(n) {
      this._chordNote = n + 5;
      this._noteC = Math.ceil(n / 12) * 12;
    },
    reset() {
      const n = 4 * 12 + 5;
      this._initialWhiteKeyIndex = Math.ceil(7 * n / 12);
      this.note = n;
    },
    get initialWhiteKeyIndex() { return this._initialWhiteKeyIndex; },
    get chordNote() { return this._chordNote; },
    get noteC() { return this._noteC; },
  };
  chord = {
    setup() {
      const createLabelEntry = id => {
        const label = document.getElementById(id);
        if( !label ) return undefined;
        const parent = label.parentNode;
        return {
          label,
          attach: (text) => {
            text && (label.innerHTML = text);
            parent.contains(label) || parent.appendChild(label);
          },
          detach: () => {
            parent.contains(label) && parent.removeChild(label);
          },
        };
      };
      this.label = createLabelEntry('chord');
      this.dialCenterLabel = createLabelEntry('center_chord');
      this.keySignatureSetButton = document.getElementById('setkey');
    },
    clearButtonCanvas: () => {
      const { buttonCanvas } = this.chord;
      if( buttonCanvas ) {
        const context = buttonCanvas.getContext("2d");
        const { width, height } = buttonCanvas;
        context.clearRect(0, 0, width, height);
      }
    },
    clear() {
      const {
        label,
        dialCenterLabel,
        keySignatureSetButton,
      } = this;
      label?.detach();
      dialCenterLabel?.detach();
      delete this.hour;
      delete this.rootPitchName;
      delete this.rootPitchNumber;
      delete this.offset3rd;
      delete this.offset5th;
      delete this.offset7th;
      delete this.add9th;
      keySignatureSetButton.style.visibility = 'hidden';
      this.clearButtonCanvas();
    },
    stop: () => {
      this.pressedNoteNumbers.forEach(noteNumber => {
        this.selectedMidiOutputPorts.noteOff(noteNumber);
        this.noteOff(noteNumber);
        this.toneIndicatorCanvas.noteOff(noteNumber);
      });
    },
    selectButtonCanvas: () => {
      const { chord } = this;
      const { dial, buttonCanvas, hour } = chord;
      const centerXY = [
        dial.center.x,
        dial.center.y,
      ];
      const [innerRadius, outerRadius] = [1, 2].map(i => dial.borderRadius[chord.offset3rd + i] * buttonCanvas.width);
      const [startAngle, endAngle] = [3.5, 2.5].map(dh => (hour - dh) / 6 * Math.PI);
      const context = buttonCanvas.getContext("2d");
      context.beginPath();
      context.fillStyle = "#80808080";
      context.arc(...centerXY, innerRadius, startAngle, endAngle);
      context.arc(...centerXY, outerRadius, endAngle, startAngle, true);
      context.fill();
    },
    start: () => {
      const {
        leftEnd,
        chord,
        selectedMidiOutputPorts,
        toneIndicatorCanvas,
      } = this;
      const {
        hour,
        label,
        dialCenterLabel,
        button,
        keySignature,
        keySignatureSetButton,
        offset3rd,
        offset5th,
        offset7th,
        add9th,
        stop,
        clearButtonCanvas,
        selectButtonCanvas,
      } = chord;
      stop();
      clearButtonCanvas();
      if( !hour && hour !== 0 ) return;
      const majorRootHour = hour + (offset3rd < 0 ? 3 : 0);
      const rootPitchNumber = Music.togglePitchNumberAndHour(majorRootHour);
      let i = 0;
      const noteOn = n => {
        const noteNumber = n - Math.floor((n - leftEnd.chordNote) / 12) * 12;
        selectedMidiOutputPorts.noteOn(noteNumber);
        this.noteOn(noteNumber, ++i);
        toneIndicatorCanvas.noteOn(noteNumber);
      };
      noteOn(rootPitchNumber);
      noteOn(rootPitchNumber + 4 + offset3rd);
      noteOn(rootPitchNumber + 7 + offset5th);
      offset7th && noteOn(rootPitchNumber + 8 + offset7th);
      add9th && noteOn(rootPitchNumber + 14);
      const rootPitchName = Music.majorPitchNameAt(majorRootHour);
      if( ! rootPitchName ) return;
      if( label || dialCenterLabel ) {
        let sub = '', sup = '';
        if( offset3rd < 0 && offset5th < 0 && offset7th == 1 ) {
          sup += 'dim' + (add9th ? '9':'7');
        } else {
          offset3rd < 0 && (sub += 'm');
          offset5th > 0 && (sup += 'aug');
          sup += (add9th ? ['add9','69','9','M9'] : ['','6','7','M7'])[offset7th];
          offset5th < 0 && (sup += '-5');
          offset3rd > 0 && (sup += 'sus4');
        }
        let text = rootPitchName[0];
        const fs = rootPitchName[1];
        fs && (text += `<sup>${fs}</sup>`);
        sub && (text += `<sub>${sub}</sub>`);
        sup && (text += `<sup style="font-size: 70%;">${sup}</sup>`);
        label?.attach(text);
        dialCenterLabel?.attach(text);
      }
      keySignatureSetButton.style.visibility = Music.enharmonicallyEquals(hour, keySignature.value) ? 'hidden' : 'visible';
      keySignatureSetButton.textContent = Music.keySignatureTextAt(Music.normalizeHourAsKey(hour)) || Music.NATURAL;
      selectButtonCanvas();
    },
  };
  setupMidi = () => {
    const midiElement = document.getElementById('midi');
    if( ! midiElement ) return;
    if( ! window.isSecureContext ) {
      console.warn("MIDI access not available: Not in secure context");
      midiElement.remove();
      return;
    };
    const chSelect = document.getElementById('midi_channel');
    for( let ch = 0; ch < 16; ++ch ) {
      const option = document.createElement("option");
      option.value = ch;
      const drumText = ch == 9 ? " (Drum)" : "";
      option.appendChild(document.createTextNode(`${ch + 1}${drumText}`));
      chSelect.appendChild(option);
    }
    const omniCheckbox = document.getElementById('omni');
    const velocitySlider = setupSlider('velocity', 64, 0, 127, 1);
    const selectedOutputs = this.selectedMidiOutputPorts = [];
    selectedOutputs.addPort = port => selectedOutputs.push(port);
    selectedOutputs.removePort = port => {
      const i = selectedOutputs.findIndex(p => p.id === port.id);
      i < 0 || selectedOutputs.splice(i, 1);
    };
    selectedOutputs.noteOn = noteNumber => selectedOutputs.forEach(
      port => port.send([
        0x90 + parseInt(chSelect.value),
        noteNumber,
        velocitySlider.value
      ])
    );
    selectedOutputs.noteOff = noteNumber => selectedOutputs.forEach(
      port => port.send([
        0x90 + parseInt(chSelect.value),
        noteNumber,
        0
      ])
    );
    const { toneIndicatorCanvas, chord } = this;
    const DRUM_MIDI_CH = 9;
    const msgListener = msg => {
      const [statusWithCh, ...data] = msg.data;
      const status = statusWithCh & 0xF0;
      const channel = statusWithCh & 0xF;
      const isActiveChannel = channel != DRUM_MIDI_CH && (omniCheckbox.checked || channel == parseInt(chSelect.value));
      switch(status) {
      case 0x90: // Note On event
        if( data[1] ) { // velocity
          isActiveChannel && this.noteOn(data[0]);
          toneIndicatorCanvas.noteOn(data[0]);
          chord.clear();
          break;
        }
        // fallthrough: velocity === 0 means Note Off
      case 0x80: // Note Off event
        isActiveChannel && this.noteOff(data[0]);
        toneIndicatorCanvas.noteOff(data[0]);
        break;
      }
    };
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
              port[`${checkboxes.eventToAddOrRemove(event)}EventListener`]("midimessage", msgListener);
            });
            break;
          case "output":
            cb.addEventListener("change", event => {
              selectedOutputs[`${checkboxes.eventToAddOrRemove(event)}Port`](port);
            });
            break;
        };
      },
      remove: port => {
        switch(port.type) {
          case "input":
            port.removeEventListener("midimessage", msgListener);
            break;
          case "output":
            selectedOutputs.removePort(port);
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
  setupToneIndicatorCanvas = (canvas) => {
    const BASS_MAX_NOTE_NUMBER = 48;
    const { dial, width, height } = this.toneIndicatorCanvas = canvas;
    const { center, borderRadius } = dial;
    const toneIndicating = Array.from({ length: 12 }, () => 0);
    const bassToneIndicating = [...toneIndicating];
    const majorDirections = toneIndicating.map((_, hour) => {
      const diffToAngle = (diff = 0) => (hour + diff) * Math.PI / 6;
      const rootClockAngle = diffToAngle(-0.5);
      const centerClockAngle = diffToAngle();
      return {
        dx: center.dx(rootClockAngle),
        dy: center.dy(rootClockAngle),
        center: {
          dx: center.dx(centerClockAngle),
          dy: center.dy(centerClockAngle),
        },
        arc: {
          angle       : diffToAngle(-3.5),
          bassAngle   : diffToAngle(-3.2),
          bassEndAngle: diffToAngle(-2.8),
        },
      };
    });
    const context = canvas.getContext("2d");
    const drawRoot = (startHour, endHour, startRadiusIndex, endRadiusIndex) => {
      const dirStart = majorDirections[startHour];
      const dirEnd   = majorDirections[endHour];
      const startRadius = borderRadius[startRadiusIndex];
      const endRadius = borderRadius[endRadiusIndex];
      const shortEndRadius = startRadius + (endRadius - startRadius) / 4;
      context.moveTo(
        center.x + startRadius * dirStart.dx,
        center.y + startRadius * dirStart.dy
      );
      context.lineTo(
        center.x + endRadius * dirStart.dx,
        center.y + endRadius * dirStart.dy
      );
      context.moveTo(
        center.x + startRadius * dirEnd.dx,
        center.y + startRadius * dirEnd.dy
      );
      context.lineTo(
        center.x + shortEndRadius * dirEnd.dx,
        center.y + shortEndRadius * dirEnd.dy
      );
    };
    const drawArc = (radiusIndex, startHour, endHour) => {
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        borderRadius[radiusIndex] * width,
        majorDirections[startHour].arc.angle,
        majorDirections[endHour].arc.angle
      );
      context.stroke();
    };
    const drawBassArc = (radiusIndex, hour) => {
      const inner = borderRadius[radiusIndex];
      const outer = borderRadius[radiusIndex + 1];
      const radius = inner + (outer - inner) / 5;
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        radius * width,
        majorDirections[hour].arc.bassAngle,
        majorDirections[hour].arc.bassEndAngle
      );
      context.stroke();
    };
    const drawSus4 = (startHour, endHour) => {
      const startDir = majorDirections[startHour];
      const endDir   = majorDirections[endHour];
      const inner = borderRadius[2];
      const outer = borderRadius[3] - 0.005;
      context.beginPath();
      context.moveTo(
        center.x + outer * startDir.dx,
        center.y + outer * startDir.dy
      );
      context.lineTo(
        center.x + inner * startDir.dx,
        center.y + inner * startDir.dy
      );
      context.arc(
        center.x,
        center.y,
        inner * width,
        startDir.arc.angle,
        endDir.arc.angle
      );
      context.lineTo(
        center.x + outer * endDir.dx,
        center.y + outer * endDir.dy
      );
      context.arc(
        center.x,
        center.y,
        outer * width,
        endDir.arc.angle,
        startDir.arc.angle,
        true
      );
      context.stroke();
    };
    const drawCircleOnMinor = (hour) => {
      const minorCenter = (borderRadius[1] + borderRadius[0]) / 2;
      const direction = majorDirections[hour].center;
      context.beginPath();
      context.arc(
        center.x + minorCenter * direction.dx,
        center.y + minorCenter * direction.dy,
        0.04 * width,
        0, 2 * Math.PI
      );
      context.stroke();
    };
    const draw = (hour) => {
      const hour1 = (hour + 1) % 12;
      const hour2 = (hour + 2) % 12;
      const hour3 = (hour + 3) % 12;
      const hour4 = (hour + 4) % 12;
      const hour4ccw = (hour + 8) % 12;
      const hour3ccw = (hour + 9) % 12;
      const hour2ccw = (hour + 10) % 12;
      const hour1ccw = (hour + 11) % 12;
      context.lineWidth = 3;
      context.strokeStyle = 'black';
      // Root tone
      context.beginPath();
      drawRoot(hour, hour1, 1, 2); // Major
      drawRoot(hour3ccw, hour2ccw, 0, 1); // Minor
      context.stroke();
      // Major chord
      if( toneIndicating[hour4] ) {
        drawArc(1, hour, hour1);
        toneIndicating[hour1] && drawArc(2, hour, hour1);
      }
      if( toneIndicating[hour4ccw] ) {
        drawArc(1, hour4ccw, hour3ccw);
        toneIndicating[hour3ccw] && drawArc(2, hour4ccw, hour3ccw);
      }
      toneIndicating[hour1ccw] && toneIndicating[hour3] && drawArc(2, hour1ccw, hour);
      // Minor chord
      toneIndicating[hour1]    && toneIndicating[hour3ccw] && drawArc(0, hour3ccw, hour2ccw);
      toneIndicating[hour1ccw] && toneIndicating[hour4ccw] && drawArc(0, hour4ccw, hour3ccw);
      toneIndicating[hour3]    && toneIndicating[hour4]    && drawArc(0, hour, hour1);
      // Suspended 4th chord
      toneIndicating[hour1ccw] && toneIndicating[hour1]    && drawSus4(hour, hour1);
      toneIndicating[hour2ccw] && toneIndicating[hour1ccw] && drawSus4(hour1ccw, hour);
      toneIndicating[hour1]    && toneIndicating[hour2]    && drawSus4(hour1, hour2);
      // Tritone
      context.strokeStyle = '#404040';
      toneIndicating[(hour + 6) % 12] && [hour3ccw, hour3].forEach(drawCircleOnMinor);
    };
    const drawBass = (hour) => {
      const hour3ccw = (hour + 9) % 12;
      context.lineWidth = 5;
      context.strokeStyle = 'black';
      drawBassArc(1, hour); // Major
      drawBassArc(0, hour3ccw); // Minor
    };
    const redrawAll = () => {
      context.clearRect(0, 0, width, height);
      toneIndicating.forEach((weight, hour) => weight && draw(hour));
      bassToneIndicating.forEach((weight, hour) => weight && drawBass(hour));
    }
    canvas.noteOn = (noteNumber) => {
      const bass = noteNumber <= BASS_MAX_NOTE_NUMBER;
      const hour = Music.togglePitchNumberAndHour(noteNumber) % 12;
      if( toneIndicating[hour]++ === 0 ) {
        draw(hour);
      }
      if( bass && bassToneIndicating[hour]++ === 0 ) {
        drawBass(hour);
      }
    };
    canvas.noteOff = (noteNumber) => {
      const bass = noteNumber <= BASS_MAX_NOTE_NUMBER;
      const hour = Music.togglePitchNumberAndHour(noteNumber) % 12;
      let redrawRequired;
      if( --toneIndicating[hour] <= 0) {
        toneIndicating[hour] = 0;
        redrawRequired = true;
      }
      if( bass && --bassToneIndicating[hour] <= 0 ) {
        bassToneIndicating[hour] = 0;
        redrawRequired = true;
      }
      redrawRequired && redrawAll();
    };
  };
  constructor(toneIndicatorCanvas) {
    this.synth = new SimpleSynthesizer();
    const { chord, leftEnd, setupMidi, setupToneIndicatorCanvas } = this;
    setupToneIndicatorCanvas(toneIndicatorCanvas);
    setupMidi();
    leftEnd.reset();
    chord.setup();
    // Mouse/Touch event names
    let pointerdown = 'mousedown';
    let pointerup = 'mouseup';
    let pointerenter = 'mouseenter';
    let pointerleave = 'mouseleave';
    if( typeof window.ontouchstart !== 'undefined' ) {
      pointerdown = 'touchstart';
      pointerup = 'touchend';
    }
    // Setup piano keyboard
    const keyboard = document.getElementById('pianokeyboard');
    if( keyboard ) {
      const { pianoKeys } = this;
      const noteOn = noteNumber => {
        this.selectedMidiOutputPorts.noteOn(noteNumber);
        this.noteOn(noteNumber);
        toneIndicatorCanvas.noteOn(noteNumber);
      };
      const noteOff = noteNumber => {
        this.selectedMidiOutputPorts.noteOff(noteNumber);
        this.noteOff(noteNumber);
        toneIndicatorCanvas.noteOff(noteNumber);
      };
      const [
        whiteKeyElement,
        blackKeyElement,
        frequencyElement,
      ] = keyboard.getElementsByTagName('*');
      const [
        whiteKeyWidth,
        xOffsets
      ] = [
        whiteKeyElement,
        blackKeyElement
      ].map((element, noteNumber) => {
        pianoKeys[noteNumber].element = element;
        const w = element.clientWidth + 2 * element.clientLeft;
        return noteNumber ? Array.from({length: 5}, (_, hour) => hour<2 ? w - w/(4-hour) : w/hour) : w;
      });
      let [whiteKeyLeft, hour] = [0, 6];
      pianoKeys.forEach((pianoKey, noteNumber) => {
        if( hour >= 5 ) { // F(5) C(6) G(7) D(8) A(9) E(10) B(11)
          if( whiteKeyLeft ) {
            keyboard.appendChild(pianoKey.element = whiteKeyElement.cloneNode());
            pianoKey.element.style.left = `${whiteKeyLeft}px`;
          }
          if( hour == 9 ) {
            const newFrequencyElement = frequencyElement.cloneNode();
            newFrequencyElement.innerHTML = pianoKey.frequency;
            newFrequencyElement.style.left = pianoKey.element.style.left;
            keyboard.appendChild(newFrequencyElement);
          }
          whiteKeyLeft += whiteKeyWidth;
          hour -= 5;
        } else { // Gb(0) Db(1) Ab(2) Eb(3) Bb(4)
          if( ! pianoKey.element ) {
            keyboard.appendChild(pianoKey.element = blackKeyElement.cloneNode());
          }
          pianoKey.element.style.left = `${whiteKeyLeft - xOffsets[hour]}px`;
          hour += 7;
        }
        const { element } = pianoKey;
        element.addEventListener(pointerdown, e => {
          chord.clear();
          noteOn(noteNumber);
          keyboard.focus();
          e.preventDefault();
        });
        element.addEventListener(pointerup, e => {
          noteOff(noteNumber);
        });
        element.addEventListener(pointerenter, e => {
          if( e.buttons & 1 ) {
            noteOn(noteNumber);
          }
        });
        element.addEventListener(pointerleave, e => {
          if( e.buttons & 1 ) {
            noteOff(noteNumber);
          }
        });
      });
      keyboard.scrollLeft = whiteKeyWidth * leftEnd.initialWhiteKeyIndex;
      keyboard.addEventListener("scroll",
        event => {
          const { scrollLeft, scrollWidth } = event.target;
          leftEnd.note = Math.ceil(pianoKeys.length * scrollLeft / scrollWidth)
        }
      );
      ['dblclick','selectstart'].forEach(type => keyboard.addEventListener(type, e => e.preventDefault()));
      const pcKey = {
      	bindings: {
          KeyQ:0, Digit2:1,
          KeyW:2, Digit3:3,
          KeyE:4,
          KeyR:5, Digit5:6,
          KeyT:7, Digit6:8,
          KeyY:9, Digit7:10,
          KeyU:11,
          KeyI:12, Digit9:13,
          KeyO:14, Digit0:15,
          KeyP:16,
          BracketLeft:17, Equal:18,
          BracketRight:19,
      	},
      	activeNoteNumbers: [],
      };
      keyboard.addEventListener("keydown", e => {
        if( e.repeat ) return;
        const { activeNoteNumbers } = pcKey;
        if( activeNoteNumbers[e.code] ) return;
        const bindedValue = pcKey.bindings[e.code] ?? -1;
        if( bindedValue < 0 ) return;
        const noteNumber = bindedValue + leftEnd.noteC;
        noteOn(noteNumber);
        activeNoteNumbers[e.code] = noteNumber;
        chord.clear();
      });
      keyboard.addEventListener("keyup", e => {
        const { activeNoteNumbers } = pcKey;
        noteOff(activeNoteNumbers[e.code]);
        delete activeNoteNumbers[e.code];
      });
    }
  }
}

const Music = class {
  static FLAT    = '\u{266D}';
  static NATURAL = '\u{266E}';
  static SHARP   = '\u{266F}';
  static DOUBLE_SHARP = '\u{1D12A}';
  static DOUBLE_FLAT  = '\u{1D12B}';
  static majorPitchNameAt = hour => [
    String.fromCharCode('A'.charCodeAt(0) + 4 * (hour + 18) % 7),
    [
      Music.DOUBLE_FLAT,
      Music.FLAT,
      '',
      Music.SHARP,
      Music.DOUBLE_SHARP
    ][Math.trunc((hour + 15) / 7)]
  ];
  static keySignatureTextAt = hour => {
    if( ! hour ) return '';
    const n = Math.abs(hour);
    const fs = hour < 0 ? Music.FLAT : Music.SHARP;
    return n == 1 ? fs : (n > 2 ? n : fs) + fs;
  };
  static togglePitchNumberAndHour = n => n + ((n & 1) ? 66 : 60);
  static normalizeHourAsKey = hour => {
    while( Math.abs(hour) > 7 ) hour -= 12 * Math.sign(hour);
    return hour;
  };
  static enharmonicallyEquals = (hour1, hour2) => (hour1 - hour2 + 36) % 12 == 0;
}

const CircleOfFifthsClock = class {
  dial = {
    background: ['#99CCFF', '#FB99CC', '#FFFF99'],
    borderRadius: [0.14, 0.29, 0.42, 0.5],
    has: r => 
      r <= this.dial.borderRadius[3] &&
      r >= this.dial.borderRadius[0],
    toOffset3rd: r =>
      r < this.dial.borderRadius[1] ? -1 : // minor
      r > this.dial.borderRadius[2] ?  1 : // sus4
      0, // Major
    keySignatureTextAt0: 'key',
    draw: () => {
      const { dial, keySignature } = this;
      const { canvas, center } = dial;
      const { width, height } = canvas;
      const context = canvas.getContext("2d");
      const addCirclePath = (width == height)?
        (r, i) => context.arc(center.x, center.y, r * width, 0, 2 * Math.PI, i):
        (r, i) => context.ellipse(center.x, center.y, r * width, r * height, 0, 0, 2 * Math.PI, i);
      dial.background.forEach((color, i) => {
        context.beginPath();
        const r = dial.borderRadius;
        addCirclePath(r[i  ]);
        addCirclePath(r[i+1], true);
        context.fillStyle = color;
        context.fill();
      });
      const textColorAt = h => (h < -5 || h > 6) ?'gray':'#000000';
      const sizeToFont = (sz, weight) => (weight||'normal')+' '+(sz * Math.min(width, height)/400)+'px san-serif';
      const fontWeightAt = h => h === 0 ?'bold':'normal';
      const majorTextAt = h => Music.majorPitchNameAt(h).join('');
      const minorTextAt = h => Music.majorPitchNameAt(h+3).join('')+'m';
      const hourBorderColor = "rgb(0, 0, 0, 0.2)";
      const hourBorderColor3 = "rgb(0, 0, 0, 0.6)";
      context.textAlign = "center";
      context.textBaseline = "middle";
      const selectedHour = keySignature.value;
      for( let hour = -5; hour <= 6; hour++ ) {
        const t = hour * Math.PI / 6;
        const x = center.dx(t);
        const y = center.dy(t);
        const relativeHour = hour - selectedHour;
        // Hour-border
        let tt = t + Math.PI / 12;
        let xx = center.dx(tt);
        let yy = center.dy(tt);
        let r0 = dial.borderRadius[0];
        let r1 = dial.borderRadius[3];
        context.strokeStyle = (relativeHour + 24) % 3 == 1 ? hourBorderColor3 : hourBorderColor ;
        context.beginPath();
        context.moveTo( center.x + r0*xx, center.y + r0*yy );
        context.lineTo( center.x + r1*xx, center.y + r1*yy );
        context.stroke();
        // Dot
        context.fillStyle = dial.background[1];
        r0 = dial.borderRadius[2];
        xx = x; yy = y; let rDot = 3;
        for( let i = 0; i < 5; i++ ) {
          if( i ) {
            tt = t + i * Math.PI / 30;
            xx = center.dx(tt);
            yy = center.dy(tt);
            rDot = 2;
          }
          context.beginPath();
          context.arc( center.x + r0*xx, center.y + r0*yy, rDot, 0, 2 * Math.PI );
          context.fill();
        }
        // Text
        const drawText = (text, r) => context.fillText(text, center.x + r*x, center.y + r*y);
        const keySignatureText = hour ? Music.keySignatureTextAt(hour) : dial.keySignatureTextAt0 ;
        const majorText = majorTextAt(hour);
        const minorText = minorTextAt(hour);
        context.fillStyle = textColorAt(relativeHour);
        const fontWeight = fontWeightAt(relativeHour);
        context.font = sizeToFont(11, fontWeight);
        if( Math.abs(hour) > 4 ) {
          drawText(keySignatureText, 0.48);
          context.font = sizeToFont(14, fontWeight);
          drawText(majorText, 0.38);
          drawText(minorText, 0.25);
          const enharmonicHour = hour - 12 * Math.sign(hour);
          const enharmonicRelativeHour = enharmonicHour - selectedHour;
          context.fillStyle = textColorAt(enharmonicRelativeHour);
          const enharmonicFontWeight = fontWeightAt(enharmonicRelativeHour);
          context.font = sizeToFont(11, enharmonicFontWeight);
          drawText(Music.keySignatureTextAt(enharmonicHour), 0.45);
          context.font = sizeToFont(14, enharmonicFontWeight);
          drawText(majorTextAt(enharmonicHour), 0.33);
          drawText(minorTextAt(enharmonicHour), 0.19);
        } else {
          drawText(keySignatureText, 0.465);
          if( Math.abs(relativeHour) > 4 ) {
            context.font = sizeToFont(14);
            drawText(majorText, 0.38);
            drawText(minorText, 0.25);
            const enharmonicHour = hour - 12 * Math.sign(relativeHour);
            const enharmonicRelativeHour = enharmonicHour - selectedHour;
            context.fillStyle = textColorAt(enharmonicRelativeHour);
            drawText(majorTextAt(enharmonicHour), 0.33);
            drawText(minorTextAt(enharmonicHour), 0.19);
          } else {
            context.font = sizeToFont(19, fontWeight);
            drawText(majorText, 0.36);
            drawText(minorText, 0.22);
          }
        }
      }
    }
  };
  hands = {
    parameter: {
      hour: {
        getValueAt: time => time.getHours(), valuePerTurn: 12,
        length: 0.25, width: 9, color: "rgba(0, 0, 0, 0.5)"
      },
      minute: {
        getValueAt: time => time.getMinutes(), valuePerTurn: 60,
        length: 0.4, width: 7
      },
      second: {
        getValueAt: time => time.getSeconds(), valuePerTurn: 60,
        length: 0.45, width: 1, color: "#ff4000",
        tail: {length: -0.12, width: 3}, center: {radius: 7}
      },
    },
    clear() {
      const { canvas, offscreenDialCanvas: dial } = this;
      const { width, height } = canvas;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      dial && context.drawImage(dial, 0, 0);
      return context;
    },
    set time(time) {
      const { center, parameter } = this;
      const { hour, minute, second } = parameter;
      this._time = time;
      [second, minute, hour].reduce((fraction, hand) => {
        const turn = (hand.getValueAt(time) + fraction) / hand.valuePerTurn;
        const t = 2 * Math.PI * turn;
        const x = center.dx(t);
        const y = center.dy(t);
        hand.x = hand.length * x;
        hand.y = hand.length * y;
        if( hand.tail ) {
          hand.tail.x = hand.tail.length * x;
          hand.tail.y = hand.tail.length * y;
        }
        return turn;
      }, 0);
      const draw = (context, hand) => {
        context.beginPath();
        context.moveTo( center.x, center.y );
        context.lineWidth = hand.width;
        context.lineCap = 'round';
        context.lineTo( center.x + hand.x, center.y + hand.y );
        hand.color && (context.strokeStyle = hand.color);
        context.stroke();
        hand.tail && draw(context, hand.tail);
        if( hand.center ) {
          context.beginPath();
          context.arc(center.x, center.y, hand.center.radius, 0, 2 * Math.PI);
          context.fillStyle = hand.color;
          context.fill();
        }
        return context;
      };
      [hour, minute, second].reduce(draw, this.clear());
    },
    get time() { return this._time; },
    set moving(flag) {
      if( ! flag ) {
        clearInterval(this.intervalId);
        this.intervalId = this._isMoving = undefined;
        return;
      }
      if( this._isMoving ) return;
      this._isMoving = true;
      this.time = new Date();
      setTimeout(
        () => {
          this.intervalId = setInterval( () => this.time = new Date(), 1000 );
          this.time = new Date();
        },
        1000 - (new Date()).getMilliseconds()
      );
    },
    get moving() { return this._isMoving; }
  };
  keySignature = {
    get value() { return this.element?.value - 0; },
    set value(hour) {
      const { element, dial, chord, enharmonicButton: ehb } = this;
      element.value = hour = Music.normalizeHourAsKey(hour);
      if( ehb ) {
        const { style } = ehb;
        if( Math.abs(hour) > 4 ) {
          ehb.textContent = Music.keySignatureTextAt(this.enharmonicHour = hour - 12 * Math.sign(hour));
          style.visibility = 'visible';
        } else {
          this.enharmonicHour = undefined;
          style.visibility = 'hidden';
        }
      }
      const ksb = chord?.keySignatureSetButton;
      if( ksb ) {
        ksb.style.visibility = Music.enharmonicallyEquals(hour, chord.hour) ? 'hidden' : 'visible';
      }
      dial.draw();
    },
    toggle() { this.value = this.enharmonicHour; }
  };
  constructor() {
    const loader = event => {
      const canvasId = 'circleOfFifthsClockCanvas';
      const canvas = document.getElementById(canvasId);
      if( ! canvas ) {
        console.error(`${canvasId}: No such element ID`);
        return;
      }
      const { hands, dial } = this;
      const { width, height } = hands.canvas = canvas;
      hands.center = dial.center = {
        x: width/2,
        y: height/2,
        dx: t =>  width  * Math.sin(t),
        dy: t => -height * Math.cos(t),
      };
      dial.canvas = document.getElementById('circleOfFifthsClockDialCanvas');
      if( ! dial.canvas ) {
        const osdc = hands.offscreenDialCanvas = dial.canvas = document.createElement('canvas');
        osdc.width = width;
        osdc.height = height;
      }
      const chordButtonCanvas = document.getElementById('circleOfFifthsClockChordButtonCanvas');
      chordButtonCanvas && this.listen({
        chordButtonCanvas,
        toneIndicatorCanvas: document.getElementById('circleOfFifthsClockToneIndicatorCanvas'),
      });
      dial.draw();
      hands.moving = true;
    }
    window.addEventListener("load", loader);
  };
  listen = ({chordButtonCanvas: canvas, toneIndicatorCanvas}) => {
    if( this.pianokeyboard ) {
      console.warn('CircleOfFifthsClock: listen(): Already listening');
      return;
    }
    const { keySignature, dial } = this;
    toneIndicatorCanvas.dial = dial;
    const { chord } = this.pianokeyboard = new PianoKeyboard(toneIndicatorCanvas);
    canvas.focus();
    chord.keySignature = keySignature;
    chord.buttonCanvas = canvas;
    chord.dial = dial;
    keySignature.chord = chord;
    keySignature.dial = dial;
    dial.keySignatureTextAt0 = 'key/sus4';
    const kse = keySignature.element = document.getElementById('keyselect') || {};
    if( kse.addEventListener ) {
      for( let hour = -7; hour <= 7; hour++ ) {
        const option = document.createElement('option');
        const value = document.createAttribute('value');
        option.setAttributeNode(value);
        (value.value = hour) === 0 && option.setAttributeNode(document.createAttribute('selected'));
        option.appendChild(document.createTextNode(Music.keySignatureTextAt(hour)||Music.NATURAL));
        kse.appendChild(option);
      }
      kse.addEventListener('change', event => keySignature.value = event.target.value);
      (keySignature.enharmonicButton = document.getElementById('enharmonic'))?.addEventListener(
        'click', event => keySignature.toggle()
      );
      chord.keySignatureSetButton?.addEventListener('click',
        event => ( chord.hour || chord.hour === 0 ) && ( keySignature.value = chord.hour )
      );
    }
    keySignature.value = 0;
    chord.clear();
    const keyToLeftRight = (key) => [`${key}Left`, `${key}Right`];
    const shiftLikeKeys = ['Shift', 'Alt', 'Control', 'Meta'].flatMap(keyToLeftRight);
    const createCharKeys = (arrayLike) => Array.from(arrayLike, c => `Key${c}`);
    const createDigitKeys = () => {
      const keys = Array.from({ length: 10 }, (_, index) => `Digit${index}`);
      const digit0 = keys.shift();
      keys.push(digit0);
      return keys;
    };
    const chordKeyBindings = Object.fromEntries(
      [
        [
          ...createDigitKeys(),
          'Minus',
          'Equal',
        ],[
          ...createCharKeys('QWERTYUIOP'),
          ...keyToLeftRight('Bracket'),
        ],[
          ...createCharKeys('ASDFGHJKL'),
          'Semicolon',
          'Quote',
          'Backslash',
        ],
      ].flatMap((keys, y) => keys.map((key, x) => {
        const hour = x - 5;
        const offset3rd = 1 - y;
        return [key, [hour, offset3rd]];
      }))
    );
    const handleEvent = (event, chord) => {
      switch( event.type ) {
        case 'keydown':
          {
            if( event.repeat || ! chord || shiftLikeKeys.includes(event.code) ) {
              event.preventDefault();
              return;
            }
            const chordKeyBinding = chordKeyBindings[event.code];
            if( chordKeyBinding ) {
              [chord.hour, chord.offset3rd] = chordKeyBinding;
              chord.hour += keySignature.value;
            } else {
              switch(event.code) {
                case 'Space':
                  event.preventDefault(); // To avoid unexpected page down
                  // fallthrough
                case 'Enter':
                  chord.start();
                  return;
                case 'Tab':
                  // Ignore to move focus
                  return;
                case 'ArrowLeft': keySignature.value-- ; event.preventDefault(); return;
                case 'ArrowRight': keySignature.value++ ; event.preventDefault(); return;
                case 'ArrowUp': keySignature.value -= 5 ; event.preventDefault(); return;
                case 'ArrowDown': keySignature.value += 5 ; event.preventDefault(); return;
                default:
                  event.preventDefault();
                  return;
              }
            }
          }
          break;
        case 'touchmove':
        case 'mousemove':
          event.preventDefault();
          return;
        default:
      	  {
            const touched = (typeof event.changedTouches !== 'undefined') ? event.changedTouches[0] : event;
            const canvas = touched.target;
            const rect = canvas.getBoundingClientRect();
            const x = ( touched.clientX - (rect.left + rect.right)/2 ) / canvas.width;
            const y = ( touched.clientY - (rect.top + rect.bottom)/2 ) / canvas.height;
            const r = Math.sqrt( x ** 2 + y ** 2 );
            if( ! dial.has(r) ) return;
            if( ! chord ) { event.preventDefault(); return; }
            canvas.focus();
            chord.offset3rd = dial.toOffset3rd(r);
            chord.hour = Math.round( Math.atan2(x, -y) * 6 / Math.PI );
          }
          break;
      }
      const relativeHour = chord.hour - keySignature.value;
      if( relativeHour < -5 ) chord.hour += 12; else if( relativeHour > 6 ) chord.hour -= 12;
      chord.offset5th = 0;
      const { shiftButtonStatus } = this;
      if( event.altKey || shiftButtonStatus?.button_flat5 ) {
        if( chord.offset3rd == 1 ) {
          chord.offset3rd = 0; chord.offset5th = 1; // replace sus4 to augumented
        } else {
          chord.offset5th = -1; // -5
        }
      }
      chord.offset7th = 0;
      if( shiftButtonStatus ) {
        chord.offset7th = 4;
        shiftButtonStatus.button_7th && (chord.offset7th -= 2);
        shiftButtonStatus.button_major7th && (chord.offset7th -= 1);
      } else if( event.type === 'keydown' ) {
        event.shiftKey && (chord.offset7th += 2);
        event.metaKey && (chord.offset7th += 1);
      } else {
        event.button == 2 && (chord.offset7th += 2);
        event.shiftKey && (chord.offset7th += 1);
      }
      chord.offset7th == 4 && (chord.offset7th = 0);
      chord.add9th = event.ctrlKey || shiftButtonStatus?.button_add9;
      chord.start();
    };
    const isSmartphone = typeof window.ontouchstart !== 'undefined';
    const eventTypes = {
      disable: [
        ...(
          isSmartphone ? ['touchmove'] : []
        ),
        'click',
        'dblclick',
        'mousemove',
        'contextmenu',
        'selectstart',
      ],
      start: ['pointerdown', 'keydown'],
      end: ['pointerup', 'keyup', 'mouseleave']
    };
    const buttonContainer = document.getElementById('button_container');
    if( isSmartphone ) {
      const status = this.shiftButtonStatus = {};
      [
        "button_7th",
        "button_major7th",
        "button_flat5",
        "button_add9"
      ].forEach(id => {
        const button = document.getElementById(id);
        if( ! button ) return;
        button.addEventListener('touchstart', event => {
          status[id] = true;
          event.changedTouches[0].target.classList.add('pressed');
        });
        button.addEventListener('touchend', event => {
          delete status[id];
          event.changedTouches[0].target.classList.remove('pressed');
        });
        eventTypes.disable.forEach(t => button.addEventListener(t, e => e.preventDefault()));
      });
      canvas.title = "Touch the chord symbol to sound";
    } else {
      buttonContainer?.remove();
      canvas.title = "Click the chord symbol to sound";
    }
    eventTypes.disable.forEach(t => canvas.addEventListener(t, handleEvent));
    eventTypes.start.forEach(t => canvas.addEventListener(t, e => handleEvent(e, chord)));
    eventTypes.end.forEach(t => canvas.addEventListener(t, chord.stop));
    if( chord.dialCenterLabel ) {
      const { label } = chord.dialCenterLabel;
      label.addEventListener('pointerdown', e => {
        chord.start();
      });
      label.addEventListener('pointerup', e => {
        canvas.focus();
        chord.stop();
      });
      label.addEventListener('mouseleave', e => {
        chord.stop();
      });
    }
  };
};

