
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
    clear() {
      const {
        label,
        dialCenterLabel,
        keySignatureSetButton,
      } = this;
      label?.detach();
      dialCenterLabel?.detach();
      this.hour =
      this.rootPitchName =
      this.rootPitchNumber =
      this.offset3rd =
      this.offset5th =
      this.offset7th =
      this.add9th = undefined;
      keySignatureSetButton.style.visibility = 'hidden';
    },
    stop: () => {
      this.pressedNoteNumbers.forEach(noteNumber => {
        this.selectedMidiOutputPorts.noteOff(noteNumber);
        this.noteOff(noteNumber);
      });
    },
    start: () => {
      const { leftEnd, chord } = this;
      const {
        hour,
        rootPitchName,
        rootPitchNumber,
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
      } = chord;
      stop();
      if( !rootPitchNumber && rootPitchNumber !== 0 ) return;
      let i = 0;
      const noteOn = n => {
        const noteNumber = n - Math.floor((n - leftEnd.chordNote) / 12) * 12;
        this.selectedMidiOutputPorts.noteOn(noteNumber);
        this.noteOn(noteNumber, ++i);
      };
      noteOn(rootPitchNumber);
      noteOn(rootPitchNumber + 4 + offset3rd);
      noteOn(rootPitchNumber + 7 + offset5th);
      offset7th && noteOn(rootPitchNumber + 8 + offset7th);
      add9th && noteOn(rootPitchNumber + 14);
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
    },
  };
  setupMidi = () => {
    const velocitySlider = setupSlider('velocity', 64, 0, 127, 1);
    const selectedOutputs = this.selectedMidiOutputPorts = [];
    selectedOutputs.addPort = port => selectedOutputs.push(port);
    selectedOutputs.removePort = port => {
      const i = selectedOutputs.findIndex(p => p.id === port.id);
      i < 0 || selectedOutputs.splice(i, 1);
    };
    selectedOutputs.noteOn = noteNumber => selectedOutputs.forEach(
      port => port.send([
        0x90 + parseInt(this.midiChannelSelect.value),
        noteNumber,
        velocitySlider.value
      ])
    );
    selectedOutputs.noteOff = noteNumber => selectedOutputs.forEach(
      port => port.send([
        0x90 + parseInt(this.midiChannelSelect.value),
        noteNumber,
        0
      ])
    );
    const midiElement = document.getElementById('midi');
    if( ! midiElement ) return;
    if( ! window.isSecureContext ) {
      console.warn("MIDI access not available: Not in secure context");
      midiElement.remove();
      return;
    };
    const msgListener = msg => {
      const [statusWithCh, ...data] = msg.data;
      const status = statusWithCh & 0xF0;
      const channel = statusWithCh & 0xF;
      switch(status) {
      case 0x90: // Note On event
        if( data[1] ) { // velocity
          (channel == parseInt(this.midiChannelSelect.value)) && this.noteOn(data[0]);
          break;
        }
        // fallthrough: velocity === 0 means Note Off
      case 0x80: // Note Off event
        (channel == parseInt(this.midiChannelSelect.value)) && this.noteOff(data[0]);
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
    const chSelect = this.midiChannelSelect = document.getElementById('midi_channel');
    for( let ch = 0; ch < 16; ++ch ) {
      const option = document.createElement("option");
      option.value = ch;
      const drumText = ch == 9 ? " (Drum)" : "";
      option.appendChild(document.createTextNode(`${ch + 1}${drumText}`));
      chSelect.appendChild(option);
    }
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
  constructor() {
    this.synth = new SimpleSynthesizer();
    const { chord, leftEnd, setupMidi } = this;
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
      };
      const noteOff = noteNumber => {
        this.selectedMidiOutputPorts.noteOff(noteNumber);
        this.noteOff(noteNumber);
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
  constructor(hasToStartListening) {
    const loader = event => {
      const canvasId = 'circleOfFifthsClockCanvas';
      const canvas = document.getElementById(canvasId);
      if( ! canvas ) {
        console.error(`No HTML element: ID='${canvasId}'`);
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
      const dialCanvasId = 'circleOfFifthsClockDialCanvas';
      dial.canvas = document.getElementById(dialCanvasId);
      if( ! dial.canvas ) {
        const osdc = hands.offscreenDialCanvas = dial.canvas = document.createElement('canvas');
        osdc.width = width;
        osdc.height = height;
      }
      hasToStartListening && this.listen(canvas);
      dial.draw();
      hands.moving = true;
    }
    window.addEventListener("load", loader);
  };
  listen = canvas => {
    if( this.pianokeyboard ) {
      console.warn('CircleOfFifthsClock: listen(): Already listening');
      return;
    }
    const { chord } = this.pianokeyboard = new PianoKeyboard();
    canvas.focus();
    const { keySignature, dial } = this;
    chord.keySignature = keySignature;
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
          event.preventDefault();
          break;
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
      chord.rootPitchName = Music.majorPitchNameAt(chord.rootPitchNumber = chord.hour + (chord.offset3rd < 0 ? 3 : 0));
      chord.rootPitchNumber += ((chord.rootPitchNumber & 1) ? 18 : 12);
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
      end: ['pointerup', 'keyup']
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
    }
  };
};

