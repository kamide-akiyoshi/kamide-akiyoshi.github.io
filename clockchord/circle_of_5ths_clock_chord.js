
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
      const rootPitchNumber = Music.togglePitchNumberAndMajorHour(majorRootHour);
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
      console.warn("Warning: Not in secure context - MIDI IN/OUT not allowed");
    }
    // MIDI channel selecter
    const DRUM_MIDI_CH = 9;
    const omniCheckbox = document.getElementById('omni');
    const chSelect = document.getElementById('midi_channel');
    const isActiveChannel = (channel) => channel != DRUM_MIDI_CH && (omniCheckbox.checked || channel == parseInt(chSelect.value));
    for( let ch = 0; ch < 16; ++ch ) {
      const option = document.createElement("option");
      option.value = ch;
      const drumText = ch == DRUM_MIDI_CH ? " (Drum)" : "";
      option.appendChild(document.createTextNode(`${ch + 1}${drumText}`));
      chSelect.appendChild(option);
    }
    // MIDI message receiver
    const {
      toneIndicatorCanvas,
      chord,
      noteOn,
      noteOff,
    } = this;
    const handleMidiMessage = (msg) => {
      const [statusWithCh, ...data] = msg;
      const channel = statusWithCh & 0xF;
      if( !isActiveChannel(channel) ) {
        return;
      }
      const status = statusWithCh & 0xF0;
      switch(status) {
        case 0x90: // Note On
          if( data[1] ) { // velocity
            noteOn(data[0]);
            toneIndicatorCanvas.noteOn(data[0]);
            chord.clear();
            break;
          }
          // fallthrough: velocity === 0 means Note Off
        case 0x80: // Note Off
          noteOff(data[0]);
          toneIndicatorCanvas.noteOff(data[0]);
          break;
        case 0xB0: // Control Change
          if( data[0] == 0x78 ) { // All Sound Off
            chord.stop();
            toneIndicatorCanvas.allSoundOff();
          }
          break;
      }
    };
    this.handleMidiMessage = handleMidiMessage;
    // Listen WebMidiLink
    window.addEventListener('message', event => {
      const msg = event.data.split(",");
      const msgType = msg.shift();
      switch(msgType) {
        case 'midi':
          handleMidiMessage(msg.map(hexStr => parseInt(hexStr, 16)));
          break;
      }
    });
    // MIDI message sender
    const selectedOutputs = this.selectedMidiOutputPorts = [];
    selectedOutputs.addPort = port => selectedOutputs.push(port);
    selectedOutputs.removePort = port => {
      const i = selectedOutputs.findIndex(p => p.id === port.id);
      i < 0 || selectedOutputs.splice(i, 1);
    };
    const velocitySlider = setupSlider('velocity', 64, 0, 127, 1);
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
    // MIDI port selecter
    const midiMessageListener = msg => handleMidiMessage(msg.data);
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
              selectedOutputs[`${checkboxes.eventToAddOrRemove(event)}Port`](port);
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
    const { dial, width, height, keySignature } = this.toneIndicatorCanvas = canvas;
    const { center, borderRadius, themeColors } = dial;
    const toneIndicating = Array.from({ length: 12 }, () => 0);
    const bassToneIndicating = [...toneIndicating];
    const getColorOf = (hour, flatThreshold) => {
      const { indicator } = themeColors[dial.theme];
      let offset = hour - keySignature?.value + 1; // min:-6, max:19 (when hour:0...11, keySignature:-7...7)
      if( offset < 0 ) offset += 12; else if ( offset >= 12 ) offset -= 12;
      return indicator[offset < 7 ? 1 : offset < flatThreshold ? 2 : 0];
    };
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
    const drawRadial = (direction, startRadius, endRadius) => {
      context.beginPath();
      context.moveTo(
        center.x + startRadius * direction.dx,
        center.y + startRadius * direction.dy
      );
      context.lineTo(
        center.x + endRadius * direction.dx,
        center.y + endRadius * direction.dy
      );
      context.stroke();
    };
    const drawArc = (radius, startDirection, endDirection) => {
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        radius * width,
        startDirection.arc.angle,
        endDirection.arc.angle
      );
      context.stroke();
    };
    const draw5th = (hour, radiusIndex) => {
      const startRadius = borderRadius[radiusIndex];
      drawRadial(
        majorDirections[hour],
        startRadius,
        startRadius + (borderRadius[radiusIndex + 1] - startRadius) / 4
      );
    };
    const drawSus4 = (hour, fifthHour, rootColor, sus4Color, fifthColor) => {
      const dir = majorDirections[hour];
      const fifthDir = majorDirections[fifthHour];
      const inner = borderRadius[2];
      const outer = borderRadius[3] - 0.005;
      context.strokeStyle = rootColor;
      drawRadial(dir, inner, outer);
      context.strokeStyle = fifthColor;
      drawRadial(fifthDir, inner, outer);
      context.strokeStyle = sus4Color;
      drawArc(inner, dir, fifthDir);
      drawArc(outer, dir, fifthDir);
    };
    const drawTritone = (hour) => {
      const minorCenter = (borderRadius[1] + borderRadius[0]) / 2;
      const direction = majorDirections[hour].center;
      context.beginPath();
      context.arc(
        center.x + minorCenter * direction.dx,
        center.y + minorCenter * direction.dy,
        0.03 * width,
        0, 2 * Math.PI
      );
      context.stroke();
    };
    const drawAug = (startHour, endHour) => {
      const inner = borderRadius[2];
      const outer = borderRadius[3];
      const startDir = majorDirections[startHour];
      const endDir = majorDirections[endHour];
      drawRadial(
        startDir.center,
        inner,
        outer
      );
      drawArc(
        (inner + outer) / 2,
        startDir,
        endDir
      );
    };
    const draw = (hour) => {
      const hour1ccw = hour ? hour - 1 : 11;
      const hour2ccw = hour + (hour < 2 ? 10 : -2);
      const hour3ccw = hour + (hour < 3 ? 9 : -3);
      const hour3 = hour + (hour < 9 ? 3 : -9);
      const hour1 = hour < 11 ? hour + 1 : 0;
      context.lineWidth = 3;
      context.strokeStyle = getColorOf(hour, 8); drawRadial(
        majorDirections[hour],
        borderRadius[1],
        borderRadius[2]
      );
      context.strokeStyle = getColorOf(hour, 11); drawRadial(
        majorDirections[hour3ccw],
        borderRadius[0],
        borderRadius[1]
      );
      context.strokeStyle = getColorOf(hour1, 8); draw5th(hour1, 1);
      context.strokeStyle = getColorOf(hour1, 11); draw5th(hour2ccw, 0);
      const hour4 = hour + (hour < 8 ? 4 : -8);
      if( toneIndicating[hour4] ) { // root:hour + major3rd:hour4
        const directions = [
          majorDirections[hour],
          majorDirections[hour1],
        ];
        if( toneIndicating[hour3] ) { // root:hour3 + minor3rd:hour + 5th:hour4
          context.strokeStyle = getColorOf(hour, 8);
          drawArc(borderRadius[0], ...directions);
          drawArc(borderRadius[1], ...directions);
        } else {
          context.strokeStyle = getColorOf(hour4, 11);
          drawArc(borderRadius[1], ...directions);
          if( toneIndicating[hour1] ) { // + 5th:hour1
            drawArc(borderRadius[2], ...directions);
          }
        }
      }
      const hour4ccw = hour + (hour < 4 ? 8 : -4);
      if( toneIndicating[hour4ccw] ) { // root:hour4ccw + major3rd:hour
        const directions = [
          majorDirections[hour4ccw],
          majorDirections[hour3ccw],
        ];
        if( toneIndicating[hour1ccw] ) { // root:hour1ccw + minor3rd:hour4ccw + 5th:hour
          context.strokeStyle = getColorOf(hour4ccw, 8);
          drawArc(borderRadius[0], ...directions);
          drawArc(borderRadius[1], ...directions);
        } else {
          context.strokeStyle = getColorOf(hour, 11);
          drawArc(borderRadius[1], ...directions);
          if( toneIndicating[hour3ccw] ) { // + 5th:hour3ccw
            drawArc(borderRadius[2], ...directions);
          }
        }
        if( toneIndicating[hour4] ) { // Augumented
          // root:hour4ccw + major3rd:hour + aug5th:hour4
          context.strokeStyle = getColorOf(hour4, 12);
          drawAug(hour4ccw, hour3ccw);
          // root:hour + major3rd:hour4 + aug5th:hour4ccw
          context.strokeStyle = getColorOf(hour4ccw, 12);
          drawAug(hour, hour1);
          // root:hour4 + major3rd:hour4ccw + aug5th:hour
          context.strokeStyle = getColorOf(hour, 12);
          drawAug(hour4, hour + (hour < 7 ? 5 : -7));
        }
      }
      if( toneIndicating[hour1] ) { // root:hour + 5th:hour1
        if( toneIndicating[hour3ccw] ) { // + minor3rd:hour3ccw
          context.strokeStyle = getColorOf(hour3ccw, 8);
          drawArc(
            borderRadius[0],
            majorDirections[hour3ccw],
            majorDirections[hour2ccw]
          );
        }
        if( toneIndicating[hour1ccw] ) { // + sus4:hour1ccw
          drawSus4(
            hour,
            hour1,
            getColorOf(hour, 8),
            getColorOf(hour1ccw, 7),
            getColorOf(hour1, 8)
          );
        }
        const hour2 = hour + (hour < 10 ? 2 : -10);
        if( toneIndicating[hour2] ) { // root:hour1 + sus4:hour + 5th:hour2
          drawSus4(
            hour1,
            hour2,
            getColorOf(hour1, 8),
            getColorOf(hour, 7),
            getColorOf(hour2, 8)
          );
        }
      }
      if( toneIndicating[hour1ccw] ) { // root:hour1ccw + 5th:hour
        if( toneIndicating[hour3] ) { // + major3rd:hour3
          context.strokeStyle = getColorOf(hour3, 11);
          drawArc(
            borderRadius[2],
            majorDirections[hour1ccw],
            majorDirections[hour]
          );
        }
        if( toneIndicating[hour2ccw] ) { // root:hour1ccw + sus4:hour2ccw + 5th:hour
          drawSus4(
            hour1ccw,
            hour,
            getColorOf(hour1ccw, 8),
            getColorOf(hour2ccw, 7),
            getColorOf(hour, 8)
          );
        }
      }
      const hour6 = hour + (hour < 6 ? 6 : -6);
      if( toneIndicating[hour6] ) { // Tritone
        context.strokeStyle = getColorOf(hour6, 7);
        drawTritone(hour3ccw);
        context.strokeStyle = getColorOf(hour, 7);
        drawTritone(hour3);
      }
    };
    const drawBassArc = (radiusIndex, direction) => {
      const inner = borderRadius[radiusIndex];
      const outer = borderRadius[radiusIndex + 1];
      const radius = inner + (outer - inner) / 5;
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        radius * width,
        direction.arc.bassAngle,
        direction.arc.bassEndAngle
      );
      context.stroke();
    };
    const drawBass = (hour) => {
      const hour3ccw = hour + (hour < 3 ? 9 : -3);
      context.lineWidth = 5;
      context.strokeStyle = getColorOf(hour, 8); drawBassArc(1, majorDirections[hour]);
      context.strokeStyle = getColorOf(hour, 11); drawBassArc(0, majorDirections[hour3ccw]);
    };
    const redrawAll = () => {
      context.clearRect(0, 0, width, height);
      toneIndicating.forEach((weight, hour) => weight && draw(hour));
      bassToneIndicating.forEach((weight, hour) => weight && drawBass(hour));
    }
    canvas.noteOn = (noteNumber) => {
      const bass = noteNumber <= BASS_MAX_NOTE_NUMBER;
      const majorHour = Music.togglePitchNumberAndMajorHour(noteNumber) % 12;
      if( toneIndicating[majorHour]++ === 0 ) {
        draw(majorHour);
      }
      if( bass && bassToneIndicating[majorHour]++ === 0 ) {
        drawBass(majorHour);
      }
    };
    canvas.noteOff = (noteNumber) => {
      const bass = noteNumber <= BASS_MAX_NOTE_NUMBER;
      const hour = Music.togglePitchNumberAndMajorHour(noteNumber) % 12;
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
    canvas.allSoundOff = () => {
      toneIndicating.fill(0);
      bassToneIndicating.fill(0);
      redrawAll();
    };
  };
  setupMidiSequencer = () => {
    const {
      handleMidiMessage,
      chord,
      toneIndicatorCanvas,
    } = this;
    const textDecoders = {};
    const decoderOf = (encoding) => textDecoders[encoding] ??= new TextDecoder(encoding);
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
      return text;
    };
    const parseSignedByte = (b) => (b & 0x80) ? b - 0x100 : b;
    const parseBigEndian = (byteArray) => byteArray.reduce((out, n) => (out << 8) + n);
    const parseVariableLengthValue = (byteArray, offset=0) => {
      const maxOffset = offset + 4;
      let currentOffset = offset;
      let value = 0;
      while(currentOffset < maxOffset) {
        const b = byteArray[currentOffset++];
        value <<= 7;
        value += (b & 0x7F);
        if( (b & 0x80) == 0 ) break;
      }
      return { value, length: currentOffset - offset };
    };
    const parseMidiEvent = (byteArray, tick, runningStatus) => {
      const {
        value: deltaTime,
        length: top,
      } = parseVariableLengthValue(byteArray);
      const event = {
        tick: tick + deltaTime,
      };
      const topByte = byteArray[top];
      const statusOmitted = !(topByte & 0x80);
      const status = statusOmitted ? runningStatus : topByte;
      const eventStart = statusOmitted ? top : top + 1;
      let eventEnd = eventStart;
      switch(status & 0xF0) {
        case 0xF0:
          switch(status) {
            case 0xFF: { // Meta event
              const metaType = event.metaType = byteArray[eventStart];
              if( metaType == 0x2F ) {
                event.eot = true; // End Of Track
                return event;
              }
              const lengthStart = eventStart + 1;
              const {
                value: length,
                length: lengthLength,
              } = parseVariableLengthValue(byteArray, lengthStart);
              const dataStart = lengthStart + lengthLength;
              const dataEnd = dataStart + length;
              if( dataEnd >= byteArray.length ) { // No more data
                event.eot = true; // End Of Track
                return event;
              }
              const data = byteArray.subarray(dataStart, dataEnd);
              event.nextByteArray = byteArray.subarray(dataEnd, byteArray.length);
              switch(metaType) {
                case 0x51:
                  event.tempo = {
                    microsecondsPerQuarter: parseBigEndian(data),
                  };
                  event.tempo.bpm = 60000000 / event.tempo.microsecondsPerQuarter;
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
                  event.minor = data[1] == 1;
                  break;
                case 0x20: event.channelPrefix = data[0]; break;
                case 0x21: event.portPrefix = data[0]; break;
                default:
                  event.metaData = data;
                  if( metaType > 0 && metaType < 0x10 ) {
                    event.text = parseText(data);
                  }
                  break;
              }
              return event;
            }
            case 0xF0: { // System Exclusive
              const {
                value: length,
                length: lengthLength,
              } = parseVariableLengthValue(byteArray, eventStart);
              const sysExDataStart = eventStart + lengthLength;
              eventEnd = sysExDataStart + length;
              event.systemExclusive = byteArray.subarray(sysExDataStart, eventEnd);
              if( eventEnd < byteArray.length ) {
                event.nextByteArray = byteArray.subarray(eventEnd, byteArray.length);
              }
              return event;
            }
            case 0xF2: // Song Position
              eventEnd++;
              // fallthrough
            case 0xF1: // Quarter Frame
            case 0xF3: // Song Select
              eventEnd++;
              break;
            case 0xF6: // Tune Request
            default: // Undefined
              break;
          }
          break;
        case 0xC0: // Program Change
        case 0xD0: // Channel Pressure
          eventEnd++;
          break;
        default: // Other Channel Message
          eventEnd += 2;
          break;
      }
      event.data = statusOmitted
        ? [status, ...byteArray.subarray(eventStart, eventEnd)]
        : byteArray.subarray(eventStart - 1, eventEnd)
      ;
      if( eventEnd < byteArray.length ) {
        event.nextByteArray = byteArray.subarray(eventEnd, byteArray.length);
      }
      return event;
    };
    const parseMidiSequence = (sequenceArray) => {
      const headerChunk = parseText(sequenceArray.subarray(0, 4));
      if( headerChunk != "MThd" ) {
        alert(`Invalid MIDI file format`);
        return undefined;
      }
      const sequence = {
        tickLength: 0,
        tracks: [],
        keySignatures: [],
        tempos: [],
        timeSignatures: [],
      };
      const headerLength = parseBigEndian(sequenceArray.subarray(4, 8));
      sequence.midiFormat = parseBigEndian(sequenceArray.subarray(8, 10));
      const numberOfTracks = parseBigEndian(sequenceArray.subarray(10, 12));
      if( sequenceArray[12] & 0x80 ) {
        alert(`Warning: SMTPE resolution not supported`);
      }
      sequence.ticksPerQuarter = parseBigEndian(sequenceArray.subarray(12, 14));
      const tracksArray = sequenceArray.subarray(8 + headerLength, sequenceArray.length);
      Array.from({ length: numberOfTracks }).reduce(
        (tracksArray, _, index) => {
          if( !tracksArray ) { // No more track
            return undefined;
          }
          const trackChunk = parseText(tracksArray.subarray(0, 4))
          if( trackChunk != "MTrk" ) {
            console.error(`Track ${index}/${numberOfTracks}: Invalid MIDI track chunk '${trackChunk}' - Not 'MTrk'`);
          }
          const trackLength = parseBigEndian(tracksArray.subarray(4, 8));
          const nextTrackTop = 8 + trackLength;
          let byteArray = tracksArray.subarray(8, nextTrackTop);
          const events = [];
          let tick = 0;
          let runningStatus;
          while(byteArray) {
            const {
              nextByteArray,
              ...event
            } = parseMidiEvent(byteArray, tick, runningStatus);
            events.push(event);
            if( event.metaType === 3 ) { // Sequence/Track name
              const name = event.text;
              if( name?.length ) {
                events.title = name;
              }
            } else if( "keySignature" in event ) {
              sequence.keySignatures.push(event);
            } else if( "tempo" in event ) {
              sequence.tempos.push(event);
            } else if( "timeSignature" in event ) {
              sequence.timeSignatures.push(event);
            }
            byteArray = nextByteArray;
            tick = event.tick;
            runningStatus = event.data?.[0];
          }
          sequence.tracks.push(events);
          if( tick > sequence.tickLength ) {
            sequence.tickLength = tick;
          }
          if( nextTrackTop >= tracksArray.length ) { // No more track
            return undefined;
          }
          return tracksArray.subarray(nextTrackTop, tracksArray.length);
        },
        tracksArray
      );
      const ascendingByTick = (e1, e2) => e1.tick < e2.tick ? -1 : e1.tick > e2.tick ? 1 : 0;
      sequence.keySignatures.sort(ascendingByTick);
      sequence.tempos.sort(ascendingByTick);
      sequence.timeSignatures.sort(ascendingByTick);
      const title = sequence.tracks.find((track) => track.title?.length)?.title
      if( title ) sequence.title = title;
      return sequence;
    };
    let lastTimeSignatureEvent;
    const doEvent = (event) => {
      if( "metaType" in event ) { // Meta event
        if ( "tempo" in event ) {
          changeTempo(event.tempo);
          tempoElement.classList.remove("grayout");
        }
        if( "keySignature" in event ) {
          const hour = event.keySignature;
          toneIndicatorCanvas.keySignature.value = hour;
          keyElement.textContent = `Key:${Music.keyTextOf(hour, event.minor)}`;
          keyElement.classList.remove("grayout");
          chord.clear();
        }
        if( "timeSignature" in event ) {
          const { numerator, denominator } = event.timeSignature;
          timeSignatureElement.textContent = `${numerator}/${denominator}`;
          timeSignatureElement.classList.remove("grayout");
          lastTimeSignatureEvent = event;
        }
        if( "text" in event ) {
          const { text } = event;
          if( midiSequence.title != text ) {
            textElement.textContent = text;
          }
        }
        // Meta event must not be sent to MIDI port
      } else {
        if( event.data ) {
          handleMidiMessage(event.data);
        }
      }
    }
    const midiFileInput = document.getElementById("midi_file");
    const midiFileDropZone = document.getElementById("midi_sequencer");
    const midiFileSelectButton = document.getElementById("midi_file_select_button");
    const midiFileNameElement = document.getElementById("midi_file_name");
    const midiSequenceElement = document.getElementById("midi_sequence");
    const midiSequencerElement = midiSequenceElement.parentElement;
    const topButton = document.getElementById("top");
    const playPauseButton = document.getElementById("play_pause");
    const playPauseIcon = document.getElementById("play_pause_icon");
    const tickPositionSlider = setupSlider("time_position", 0, 0, 1, 1);
    const timeSignatureElement = document.getElementById("time_signature");
    const beatCanvas = document.getElementById("circleOfFifthsClockBeatCanvas");
    const keyElement = document.getElementById("key");
    const tempoElement = document.getElementById("tempo");
    const bpmElement = document.getElementById("bpm");
    const titleElement = document.getElementById("song_title");
    const textElement = document.getElementById("song_text");
    const darkModeSelect = document.getElementById("dark_mode_select");
    midiSequencerElement.removeChild(midiSequenceElement);
    let midiSequence;
    const setMidiSequence = (seq) => {
      midiSequence = seq;
      textElement.textContent = "";
      titleElement.textContent = midiSequence.title ?? "";
      changeTempo();
      [
        tempoElement,
        keyElement,
        timeSignatureElement,
      ].forEach((element) => element.classList.add("grayout"));
      keyElement.textContent = `Key:${Music.keyTextOf(0)}`;
      timeSignatureElement.textContent = "4/4";
      tickPositionSlider && (tickPositionSlider.max = midiSequence.tickLength);
      if( darkModeSelect.value == "light" ) {
        darkModeSelect.value = "dark";
        darkModeSelect.dispatchEvent(new Event("change"));
      }
      setTickPosition(0);
      midiSequencerElement.prepend(midiSequenceElement);
    }
    const loadMidiFile = (file) => {
      if( !file ) {
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        const arrayBuffer = event.target.result;
        const seq = parseMidiSequence(new Uint8Array(arrayBuffer));
        if( !seq ) {
          return;
        }
        midiFileNameElement.textContent = (seq.file = file).name;
        setMidiSequence(seq);
      });
      reader.readAsArrayBuffer(file);
    };
    midiFileSelectButton.addEventListener("click", () => {
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
      tickPosition = tick;
      tickPositionSlider && (tickPositionSlider.value = tick);
      setBeatAt(tick);
      if( !midiSequence ) {
        return;
      }
      const doLastEvent = (array) => {
        const lastEvent = array.findLast((event) => event.tick <= tick);
        lastEvent && doEvent(lastEvent);
      }
      doLastEvent(midiSequence.timeSignatures);
      doLastEvent(midiSequence.keySignatures);
      doLastEvent(midiSequence.tempos);
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
    let beat = 0;
    const setBeatAt = (tick) => {
      if( !lastTimeSignatureEvent ) return;
      const {
        tick: lastTick,
        timeSignature: {
          numerator,
          denominator,
        },
      } = lastTimeSignatureEvent ?? {
        tick: 0,
        timeSignature: {
          numerator: 4,
          denominator: 4,
        }
      };
      const { ticksPerQuarter } = midiSequence;
      const ticksPerBeat = ticksPerQuarter * (4 / denominator);
      const newBeat = Math.floor((tick - lastTick) / ticksPerBeat) % numerator;
      if( beat != newBeat ) {
        beat = newBeat;
        if( beatCanvas ) {
          const context = beatCanvas.getContext("2d");
          const { width, height, dial } = toneIndicatorCanvas;
          const center = dial.center;
          const n = (numerator - 1) || 1;
          const startAngle = - Math.PI / 2;
          const endAngle = startAngle - 2 * Math.PI * (n - beat) / n;
          context.clearRect(0, 0, width, height);
          context.fillStyle = "#808080";
          context.beginPath();
          context.arc(
            center.x,
            center.y,
            dial.borderRadius[0] * width * 3 / 4,
            startAngle,
            endAngle,
            true
          );
          context.arc(
            center.x,
            center.y,
            dial.borderRadius[0] * width / 2,
            endAngle,
            startAngle,
          );
          context.fill();
        }
      }
    };
    const INTERVAL_MILLI_SEC = 10;
    let ticksPerInterval;
    const changeTempo = (tempo) => {
      const { microsecondsPerQuarter, bpm } = tempo ?? {
        microsecondsPerQuarter: 500000,
        bpm: 120,
      };
      bpmElement.textContent = Math.floor(bpm);
      const ticksPerMicroseconds = midiSequence.ticksPerQuarter / microsecondsPerQuarter;
      ticksPerInterval = ticksPerMicroseconds * 1000 * INTERVAL_MILLI_SEC;
    };
    let intervalId;
    const pause = () => {
      clearInterval(intervalId);
      intervalId = undefined;
      for( let status = 0xB0; status < 0xC0; status++ ) {
        // Send All Sound Off to all MIDI channel
        handleMidiMessage([status, 0x78]);
      }
      if( playPauseIcon ) {
        playPauseIcon.src = "image/play-button-svgrepo-com.svg";
        playPauseIcon.alt = "Play";
      }
    };
    const play = () => {
      if( !midiSequence || intervalId ) return;
      const { tickLength, tracks } = midiSequence;
      intervalId = setInterval(
        () => {
          if( tickPositionSlider ) {
            tickPositionSlider.value = tickPosition;
          }
          tracks.forEach((events) => {
            while(true) {
              const event = events[events.currentEventIndex];
              if( !event || event.tick > tickPosition ) {
                break;
              }
              doEvent(event);
              events.currentEventIndex++;
            }
          });
          setBeatAt(tickPosition);
          if( (tickPosition += ticksPerInterval) > tickLength ) {
            pause();
          }
        },
        INTERVAL_MILLI_SEC
      );
      if( playPauseIcon ) {
        playPauseIcon.src = "image/pause-button-svgrepo-com.svg";
        playPauseIcon.alt = "Pause";
      }
    };
    topButton?.addEventListener('click', () => setTickPosition(0));
    playPauseButton?.addEventListener('click', () => intervalId ? pause() : play());
    tickPositionSlider?.addEventListener("change", (event) => {
      !intervalId && setTickPosition(parseInt(event.target.value));
    });
  };
  constructor(toneIndicatorCanvas) {
    this.synth = new SimpleSynthesizer();
    const {
      chord,
      leftEnd,
      setupMidi,
      setupMidiSequencer,
      setupToneIndicatorCanvas,
    } = this;
    setupToneIndicatorCanvas(toneIndicatorCanvas);
    setupMidi();
    setupMidiSequencer();
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
        element.addEventListener(pointerenter, e => {
          if( e.buttons & 1 ) {
            noteOn(noteNumber);
          }
        });
        const handleOff = e => {
          noteOff(noteNumber);
        };
        element.addEventListener(pointerup, handleOff);
        element.addEventListener(pointerleave, handleOff);
        // Disable context menu by clicking mouse right button
        element.addEventListener('contextmenu', e => e.preventDefault());
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
  static togglePitchNumberAndMajorHour = (n, offset=60) => ((n & 1) ? n + 6 : n) + offset;
  static enharmonicallyEquals = (hour1, hour2) => (hour1 - hour2 + 36) % 12 == 0;
  static normalizeHourAsKey = hour => {
    while( Math.abs(hour) > 7 ) hour -= 12 * Math.sign(hour);
    return hour;
  };
  static keySignatureTextAt = hour => {
    if( ! hour ) return '';
    const n = Math.abs(hour);
    const fs = hour < 0 ? Music.FLAT : Music.SHARP;
    if( n == 1 ) return fs;
    return `${n > 2 ? n : fs}${fs}`;
  };
  static keyTextOf = (hour, minor) => {
    return minor ? `${Music.majorPitchNameAt(hour + 3).join('')}m` : Music.majorPitchNameAt(hour).join('');
  };
}

const CircleOfFifthsClock = class {
  dial = {
    theme: "light",
    backgroundMode: "donut",
    themeColors: {
      light: {
        foreground: 'black',
        grayoutForeground: 'gray',
        background: {
          donut: ['#99CCFF', '#FB99CC', '#FFFF99'],
          pie: ['#FB99CC', '#FFFF66', '#CCFFCC', '#99CCFF'],
        },
        hourBorder: {
          fine: 'rgb(0, 0, 0, 0.2)',
          coarse: 'rgb(0, 0, 0, 0.6)',
        },
        hand: {
          hour: 'rgba(0, 0, 0, 0.5)',
          minute: 'rgba(0, 0, 0, 0.5)',
          second: '#ff4000',
        },
        indicator: ['blue', 'firebrick', 'darkorange'],
      },
      dark: {
        foreground: '#808080',
        grayoutForeground: '#404040',
        background: {
          donut: ['#102030', '#301020', '#302000'],
          pie: ['#301020', '#302000', '#103010', '#102030'],
        },
        hourBorder: {
          fine: 'rgb(255, 255, 255, 0.2)',
          coarse: 'rgb(255, 255, 255, 0.6)',
        },
        hand: {
          hour: 'rgba(255, 255, 255, 0.25)',
          minute: 'rgba(255, 255, 255, 0.25)',
          second: '#ff4000',
        },
        indicator: ['cyan', 'lightpink', 'yellow'],
      },
    },
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
      const {
        canvas,
        center,
        themeColors,
        theme,
        backgroundMode,
        chord,
      } = dial;
      const changeDarkClass = (classList, classPrefix) => {
        if( !classList ) return;
        const newClassName = `${classPrefix}${theme}`;
        if( !classList.contains(newClassName) ) {
          const oldClassName = `${classPrefix}${theme === 'dark' ? 'light' : 'dark'}`;
          classList.remove(oldClassName);
          classList.add(newClassName);
        }
      };
      changeDarkClass(canvas.parentElement?.classList, 'clock_');
      changeDarkClass(chord?.dialCenterLabel.label?.classList, 'center_chord_');
      const { width, height } = canvas;
      const context = canvas.getContext("2d");
      const themeColor = themeColors[theme];
      const selectedHour = keySignature.value;
      // Background
      const arcRadius = dial.borderRadius.map(r => r * width);
      const addCirclePath = (r, ccw) => context.arc(center.x, center.y, r, 0, 2 * Math.PI, ccw);
      if( backgroundMode === 'pie' ) {
        themeColor.background.pie.map(
          (color, index) => {
            const relativeHour = 3 * index;
            const startAngle = (selectedHour + relativeHour - 4.5) * Math.PI / 6;
            return {startAngle, color};
          }
        ).forEach(
          ({startAngle, color}, index, array) => {
            const endAngle = (array[index + 1] ?? array[0]).startAngle;
            context.fillStyle = color;
            context.beginPath();
            context.arc(center.x, center.y, arcRadius[0], startAngle, endAngle);
            context.arc(center.x, center.y, arcRadius[3], endAngle, startAngle, true);
            context.fill();
          }
        );
      } else {
         themeColor.background.donut.forEach((color, i) => {
          context.fillStyle = color;
          context.beginPath();
          addCirclePath(arcRadius[i]);
          addCirclePath(arcRadius[i + 1], true);
          context.fill();
        });
      }
      // Donut border
      context.strokeStyle = themeColor.hourBorder.fine;
      arcRadius.forEach(r => {
        context.beginPath();
        addCirclePath(r);
        context.stroke();
      });
      // Foreground
      const textColorAt = h => themeColor[h < -5 || h > 6 ? 'grayoutForeground' : 'foreground'];
      const sizeToFont = (sz, weight) => (weight||'normal')+' '+(sz * Math.min(width, height)/400)+'px san-serif';
      const fontWeightAt = h => h === 0 ?'bold':'normal';
      const majorTextAt = h => Music.keyTextOf(h, false);
      const minorTextAt = h => Music.keyTextOf(h, true);
      context.textAlign = "center";
      context.textBaseline = "middle";
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
        context.strokeStyle = themeColor.hourBorder[(relativeHour + 24) % 3 == 1 ? 'coarse' : 'fine'];
        context.beginPath();
        context.moveTo( center.x + r0*xx, center.y + r0*yy );
        context.lineTo( center.x + r1*xx, center.y + r1*yy );
        context.stroke();
        // Dot
        context.fillStyle = themeColor.grayoutForeground;
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
        length: 0.25, width: 9, colorKey: "hour",
      },
      minute: {
        getValueAt: time => time.getMinutes(), valuePerTurn: 60,
        length: 0.4, width: 7, colorKey: "minute",
      },
      second: {
        getValueAt: time => time.getSeconds(), valuePerTurn: 60,
        length: 0.45, width: 1, colorKey: "second",
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
    draw: () => {
      const { hands, dial } = this;
      const { center } = hands;
      const drawHand = (context, hand) => {
        const color = dial.themeColors[dial.theme].hand[hand.colorKey];
        context.beginPath();
        context.moveTo( center.x, center.y );
        context.lineWidth = hand.width;
        context.lineCap = 'round';
        context.lineTo( center.x + hand.x, center.y + hand.y );
        context.strokeStyle = color;
        context.stroke();
        hand.tail && drawHand(context, hand.tail);
        if( hand.center ) {
          context.beginPath();
          context.arc(center.x, center.y, hand.center.radius, 0, 2 * Math.PI);
          context.fillStyle = color;
          context.fill();
        }
        return context;
      };
      const { hour, minute, second } = hands.parameter;
      [hour, minute, second].reduce(drawHand, hands.clear());
    },
    set time(time) {
      const {
        center,
        parameter: { hour, minute, second },
        draw,
      } = this;
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
      draw();
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
      const darkModeSelect = document.getElementById('dark_mode_select');
      if( darkModeSelect ) {
        darkModeSelect.addEventListener('change', e => {
          dial.theme = e.target.value;
          dial.draw();
          hands.draw();
        });
      }
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const loadSystemTheme = () => {
        dial.theme = darkModeMediaQuery.matches ? 'dark' : 'light';
        darkModeSelect && (darkModeSelect.value = dial.theme);
        dial.draw();
        hands.draw();
      };
      darkModeMediaQuery.addEventListener('change', loadSystemTheme);
      const backgroundModeSelect = document.getElementById('background_mode_select');
      if( backgroundModeSelect ) {
        backgroundModeSelect.addEventListener('change', e => {
          dial.backgroundMode = e.target.value;
          dial.draw();
        });
        dial.backgroundMode = backgroundModeSelect.value;
      }
      loadSystemTheme();
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
    toneIndicatorCanvas.keySignature = keySignature;
    const { chord } = this.pianokeyboard = new PianoKeyboard(toneIndicatorCanvas);
    canvas.focus();
    chord.keySignature = keySignature;
    chord.buttonCanvas = canvas;
    chord.dial = dial;
    dial.chord = chord;
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

