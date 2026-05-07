
const PianoKeyboard = class {
  static initialDocumentTitle = document.title;
  /** @param {string} songTitle */
  static setSongTitleToDocument = (songTitle) => {
    document.title = songTitle ? `${songTitle} - ClockChord` : this.initialDocumentTitle;
  };
  synth = new SimpleSynthesizer();
  noteOn = (channel, noteNumber, velocity) => {
    const isNewVoice = this.synth.midiChannels[channel].noteOn(noteNumber, velocity);
    if( channel != SimpleSynthesizer.PERCUSSION_CHANNEL && isNewVoice ) {
      this.toneIndicatorCanvas.noteOn(noteNumber);
    }
  };
  noteOff = (channel, noteNumber) => {
    this.synth.midiChannels[channel].noteOff(noteNumber);
    if( channel != SimpleSynthesizer.PERCUSSION_CHANNEL ) {
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
  createMidiChannelSelector = () => {
    const selector = document.getElementById('midi_channel');
    Array.from(
      {length: SimpleSynthesizer.NUMBER_OF_CHANNELS},
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
    setup(keySignatureSelector) {
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
      chord.keySignatureSelector = keySignatureSelector;
      chord.label = createDetachableElementEntry('chord');
      chord.dialCenterLabel = createDetachableElementEntry('center_chord');
      chord.chordTextInput = document.getElementById('chord_text');
      chord.keySignatureSetButton = document.getElementById('setkey');
      chord.keySignatureSetButton.addEventListener('click', () => keySignatureSelector.parse(chord));
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
      // -5/b5, +5/#5
      if( eat("-5") || eat("b5") ) chord.offset5th = -1;
      else if( eat("+5") || eat("#5") ) chord.offset5th = 1;
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
        keySignatureSelector,
        keySignatureSetButton: { style },
      } = chord;
      style.visibility = (
        chord.hasValue &&
        ! (
          chord.isMinor === keySignatureSelector.minor &&
          Music.enharmonicallyEquals(chord.hour, keySignatureSelector.numberOfSharps)
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
    const pianoKeyElements = this.pianoKeyElements = SimpleSynthesizer.FREQUENCIES.map((frequency, noteNumber) => {
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
  constructor(toneIndicatorCanvas, onChangeKey, onChangeBeat, onReady, searchParams) {
    this.toneIndicatorCanvas = toneIndicatorCanvas;
    const createVelocitySlider = () => {
      const velocitySlider = document.getElementById('velocity') ?? { value: 64 };
      const velocityValue = document.getElementById('velocityValue');
      if( velocityValue ) {
        const handleInput = () => velocityValue.textContent = velocitySlider.value;
        handleInput();
        velocitySlider.addEventListener?.("input", handleInput);
      }
      return velocitySlider;
    };
    this.velocitySlider = createVelocitySlider();
    this.midiChannelSelector = this.createMidiChannelSelector();
    const { handleMidiMessage } = this;
    const sendWebMidiLinkMessage = this.sendWebMidiLinkMessage = setupWebMidiLink(handleMidiMessage);
    this.selectedMidiOutputPorts = setupMidiPorts(
      (msg) => {
        const { data } = msg;
        handleMidiMessage(data);
        sendWebMidiLinkMessage?.(data);
      }
    );
    setupMidiSequencer(
      createMidiSequenceParser(),
      (midiMessage) => {
        handleMidiMessage(midiMessage);
        sendWebMidiLinkMessage?.(midiMessage);
        try {
          this.selectedMidiOutputPorts?.send(midiMessage);
        } catch(e) {
          console.error(midiMessage, e);
        }
      },
      onChangeKey,
      onChangeBeat,
      onReady
    );
    setupSongle(
      this.chord,
      onChangeKey,
      onChangeBeat,
      onReady,
      searchParams
    );
    this.setupPianoKeyboard();
  }
}
