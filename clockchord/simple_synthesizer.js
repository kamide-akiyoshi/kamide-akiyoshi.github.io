// @ts-check
/**
 * @typedef {{
 *  name: string;
 *  envelope: number[];
 * } & ({
 *  wave: Exclude<OscillatorType, 'custom'> | 'noise';
 * } | {
 *  wave: 'custom';
 *  terms: [number[], number[]];
 * })} Instrument
 */

/** @type {Instrument} */
const GENERIC_INSTRUMENT = ({
  name: "Generic tone instrument",
  wave: "sawtooth",
  envelope: [0.01, 0.5, 0.3, 0.25],
});

/** @type {Instrument} */
const GENERIC_STRING_INSTRUMENT = ({
  name: "Generic strings",
  wave: "sawtooth",
  envelope: [0.02, 0, 1, 0.3],
});

/** @type {Instrument} */
const GENERIC_PIPE_INSTRUMENT = ({
  name: "Generic pipe",
  wave: "sine",
  envelope: [0.03, 0, 1, 0.25],
});

/** @type {Instrument} */
const GENERIC_PERCUSSION = ({
  name: "Generic percussion",
  wave: "noise",
  envelope: [0, 0.1, 0, 0.1],
});

/** @type {Instrument[]} */
const INSTRUMENTS = [
  // Piano
  GENERIC_INSTRUMENT, // "Acoustic Grand Piano",
  {
    name: "Bright Acoustic Piano",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  {
    name: "Electric Grand Piano",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  {
    name: "Honky-tonk Piano",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  {
    name: "Electric Piano 1",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  {
    name: "Electric Piano 2",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  {
    name: "Harpsichord",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  {
    name: "Clavi",
    wave: "sawtooth",
    envelope: [0.01, 0.5, 0.3, 0.15],
  },
  // Chromatic Percussion
  {
    name: "Celesta",
    wave: "sawtooth",
    envelope: [0.01, 1, 0, 0.15],
  },
  GENERIC_INSTRUMENT, // "Glockenspiel",
  {
    name: "Music Box",
    wave: "square",
    envelope: [0, 0.3, 0, 0.1],
  },
  {
    name: "Vibraphone",
    wave: "sine",
    envelope: [0, 0.7, 0, 0.3],
  },
  {
    name: "Marimba",
    wave: "square",
    envelope: [0, 0.1, 0, 0.1],
  },
  {
    name: "Xylophone",
    wave: "sine",
    envelope: [0, 0.1, 0, 0.1],
  },
  {
    name: "Tubular Bells",
    wave: "custom",
    terms: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, -0.5, 1, 0, 1, 0, 1],
    ],
    envelope: [0, 0.75, 0, 0.5],
  },
  GENERIC_INSTRUMENT, // "Dulcimer",
  // Organ
  {
    name: "Drawbar Organ",
    wave: "custom",
    terms: [
      [0, 0, 0, 0, 0],
      [0, 1, 0.5, 0.5, 0.5],
    ],
    envelope: [0.03, 0, 1, 0.2],
  },
  {
    name: "Percussive Organ",
    wave: "custom",
    terms: [
      [0, 0, 0, 0, 0],
      [0, 1, 0.5, 0.5, 0.5],
    ],
    envelope: [0.03, 0, 1, 0.2],
  },
  {
    name: "Rock Organ",
    wave: "custom",
    terms: [
      [0, 0, 0, 0, 0],
      [0, 1, 0.5, 0.5, 0.5],
    ],
    envelope: [0.03, 0, 1, 0.2],
  },
  {
    name: "Church Organ",
    wave: "custom",
    terms: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0.5, 0, 0.5, 0, 0.5, 0, 0.5],
    ],
    envelope: [0.03, 0, 1, 0.25],
  },
  {
    name: "Reed Organ",
    wave: "custom",
    terms: [
      [0, 0, 0, 0, 0],
      [0, 1, 0.5, 0.5, 0.5],
    ],
    envelope: [0.05, 0, 1, 0.2],
  },
  {
    name: "Accordion",
    wave: "sawtooth",
    envelope: [0.1, 0, 1, 0.2],
  },
  {
    name: "Harmonica",
    wave: "sawtooth",
    envelope: [0.1, 0, 1, 0.2],
  },
  {
    name: "Tango Accordion",
    wave: "sawtooth",
    envelope: [0.1, 0, 1, 0.2],
  },
  // Guitar
  GENERIC_INSTRUMENT, // "Acoustic Guitar (nylon)",
  GENERIC_INSTRUMENT, // "Acoustic Guitar (steel)",
  GENERIC_INSTRUMENT, // "Electric Guitar (jazz)",
  GENERIC_INSTRUMENT, // "Electric Guitar (clean)",
  {
    name: "Electric Guitar (muted)",
    wave: "sawtooth",
    envelope: [0.005, 0.1, 0, 0.1],
  },
  {
    name: "Overdriven Guitar",
    wave: "sawtooth",
    envelope: [0.01, 0, 1, 0.25],
  },
  {
    name: "Distortion Guitar",
    wave: "sawtooth",
    envelope: [0.01, 0, 1, 0.25],
  },
  GENERIC_INSTRUMENT, // "Guitar harmonics",
  // Bass
  GENERIC_INSTRUMENT, // "Acoustic Bass",
  GENERIC_INSTRUMENT, // "Electric Bass (finger)",
  GENERIC_INSTRUMENT, // "Electric Bass (pick)",
  GENERIC_INSTRUMENT, // "Fretless Bass",
  GENERIC_INSTRUMENT, // "Slap Bass 1",
  GENERIC_INSTRUMENT, // "Slap Bass 2",
  GENERIC_INSTRUMENT, // "Synth Bass 1",
  GENERIC_INSTRUMENT, // "Synth Bass 2",
  // Strings
  GENERIC_STRING_INSTRUMENT, // "Violin",
  GENERIC_STRING_INSTRUMENT, // "Viola",
  GENERIC_STRING_INSTRUMENT, // "Cello",
  GENERIC_STRING_INSTRUMENT, // "Contrabass",
  GENERIC_STRING_INSTRUMENT, // "Tremolo Strings",
  {
    name: "Pizzicato Strings",
    wave: "sawtooth",
    envelope: [0, 0.1, 0, 0.1],
  },
  {
    name: "Orchestral Harp",
    wave: "square",
    envelope: [0, 0.3, 0, 0.25],
  },
  {
    name: "Timpani",
    wave: "sawtooth",
    envelope: [0, 0.5, 0, 0.1],
  },
  // Ensemble
  {
    name: "String Ensemble 1",
    wave: "custom",
    terms: [
      [0, 0, 0.5],
      [0, 1, 0],
    ],
    envelope: [0.02, 0, 1, 0.3],
  },
  {
    name: "String Ensemble 2",
    wave: "custom",
    terms: [
      [0, 0, 0.5],
      [0, 1, 0],
    ],
    envelope: [0.02, 0, 1, 0.3],
  },
  {
    name: "SynthStrings 1",
    wave: "custom",
    terms: [
      [0, 0, 0.5],
      [0, 1, 0],
    ],
    envelope: [0.02, 0, 1, 0.3],
  },
  {
    name: "SynthStrings 2",
    wave: "custom",
    terms: [
      [0, 0, 0.5],
      [0, 1, 0],
    ],
    envelope: [0.02, 0, 1, 0.3],
  },
  {
    name: "Choir Aahs",
    wave: "custom",
    terms: [
      [0, 0, 0, 0],
      [0, 1, 1, 0.5],
    ],
    envelope: [0.04, 0.6, 0.6, 0.25],
  },
  {
    name: "Voice Oohs",
    wave: "triangle",
    envelope: [0.04, 0.6, 0.6, 0.25],
  },
  {
    name: "Synth Voice",
    wave: "triangle",
    envelope: [0.04, 0.6, 0.6, 0.25],
  },
  {
    name: "Orchestra Hit",
    wave: "square",
    envelope: [0, 0.2, 0, 0.2],
  },
  // Brass
  GENERIC_STRING_INSTRUMENT, // "Trumpet",
  GENERIC_STRING_INSTRUMENT, // "Trombone",
  GENERIC_STRING_INSTRUMENT, // "Tuba",
  GENERIC_STRING_INSTRUMENT, // "Muted Trumpet",
  GENERIC_STRING_INSTRUMENT, // "French Horn",
  GENERIC_STRING_INSTRUMENT, // "Brass Section",
  GENERIC_STRING_INSTRUMENT, // "SynthBrass 1",
  GENERIC_STRING_INSTRUMENT, // "SynthBrass 2",
  // Reed
  GENERIC_STRING_INSTRUMENT, // "Soprano Sax",
  GENERIC_STRING_INSTRUMENT, // "Alto Sax",
  GENERIC_STRING_INSTRUMENT, // "Tenor Sax",
  GENERIC_STRING_INSTRUMENT, // "Baritone Sax",
  GENERIC_STRING_INSTRUMENT, // "Oboe",
  GENERIC_STRING_INSTRUMENT, // "English Horn",
  GENERIC_STRING_INSTRUMENT, // "Bassoon",
  GENERIC_PIPE_INSTRUMENT, // "Clarinet",
  // Pipe
  GENERIC_PIPE_INSTRUMENT, // "Piccolo",
  GENERIC_PIPE_INSTRUMENT, // "Flute",
  GENERIC_PIPE_INSTRUMENT, // "Recorder",
  GENERIC_PIPE_INSTRUMENT, // "Pan Flute",
  GENERIC_PIPE_INSTRUMENT, // "Blown Bottle",
  GENERIC_PIPE_INSTRUMENT, // "Shakuhachi",
  GENERIC_PIPE_INSTRUMENT, // "Whistle",
  GENERIC_PIPE_INSTRUMENT, // "Ocarina",
  // Synth Lead
  {
    name: "Lead 1 (square)",
    wave: "square",
    envelope: [0.04, 0.6, 0.6, 0.25],
  },
  {
    name: "Lead 2 (sawtooth)",
    wave: "sawtooth",
    envelope: [0.04, 0.6, 0.6, 0.25],
  },
  GENERIC_INSTRUMENT, // "Lead 3 (calliope)",
  GENERIC_INSTRUMENT, // "Lead 4 (chiff)",
  GENERIC_INSTRUMENT, // "Lead 5 (charang)",
  {
    name: "Lead 6 (voice)",
    wave: "triangle",
    envelope: [0.04, 0.6, 0.6, 0.25],
  },
  GENERIC_INSTRUMENT, // "Lead 7 (fifths)",
  GENERIC_INSTRUMENT, // "Lead 8 (bass + lead)",
  // Synth Pad
  GENERIC_INSTRUMENT, // "Pad 1 (new age)",
  GENERIC_INSTRUMENT, // "Pad 2 (warm)",
  GENERIC_INSTRUMENT, // "Pad 3 (polysynth)",
  GENERIC_INSTRUMENT, // "Pad 4 (choir)",
  GENERIC_INSTRUMENT, // "Pad 5 (bowed)",
  GENERIC_INSTRUMENT, // "Pad 6 (metallic)",
  GENERIC_INSTRUMENT, // "Pad 7 (halo)",
  GENERIC_INSTRUMENT, // "Pad 8 (sweep)",
  // Synth Effects
  GENERIC_INSTRUMENT, // "FX 1 (rain)",
  GENERIC_INSTRUMENT, // "FX 2 (soundtrack)",
  GENERIC_INSTRUMENT, // "FX 3 (crystal)",
  GENERIC_INSTRUMENT, // "FX 4 (atmosphere)",
  GENERIC_INSTRUMENT, // "FX 5 (brightness)",
  GENERIC_INSTRUMENT, // "FX 6 (goblins)",
  GENERIC_INSTRUMENT, // "FX 7 (echoes)",
  GENERIC_INSTRUMENT, // "FX 8 (sci-fi)",
  // Ethnic
  GENERIC_INSTRUMENT, // "Sitar",
  GENERIC_INSTRUMENT, // "Banjo",
  GENERIC_INSTRUMENT, // "Shamisen",
  GENERIC_INSTRUMENT, // "Koto",
  GENERIC_INSTRUMENT, // "Kalimba",
  {
    name: "Bag pipe",
    wave: "sawtooth",
    envelope: [0.05, 0, 1, 0.1],
  },
  GENERIC_INSTRUMENT, // "Fiddle",
  GENERIC_INSTRUMENT, // "Shanai",
  // Percussive
  GENERIC_INSTRUMENT, // "Tinkle Bell",
  GENERIC_INSTRUMENT, // "Agogo",
  GENERIC_INSTRUMENT, // "Steel Drums",
  {
    name: "Woodblock",
    wave: "sine",
    envelope: [0, 0.1, 0, 0.1],
  },
  GENERIC_PERCUSSION, // "Taiko Drum",
  GENERIC_PERCUSSION, // "Melodic Tom",
  GENERIC_PERCUSSION, // "Synth Drum",
  {
    name: "Reverse Cymbal",
    wave: "noise",
    envelope: [1.5, 0, 0, 0],
  },
  // Sound Effects
  GENERIC_PERCUSSION, // "Guitar Fret Noise",
  GENERIC_PERCUSSION, // "Breath Noise",
  GENERIC_PERCUSSION, // "Seashore",
  GENERIC_PERCUSSION, // "Bird Tweet",
  GENERIC_PERCUSSION, // "Telephone Ring",
  {
    name: "Helicopter",
    wave: "noise",
    envelope: [1.5, 0, 1, 0],
  },
  {
    name: "Applause",
    wave: "noise",
    envelope: [1.5, 0, 1, 0],
  },
  GENERIC_PERCUSSION, // "Gunshot",
];

const SimpleSynthesizer = class {
  static PERCUSSION_CHANNEL = 9;
  static FREQUENCIES = Array.from(
    {length: 128},
    (_, midiNoteNumber) => 440 * (2 ** ((midiNoteNumber - 69)/12))
  );
  static NUMBER_OF_CHANNELS = 16;
  static {
    try {
      /** @type {typeof window.AudioContext} */
      const AudioContext = window.AudioContext || (/** @type {any} */ (window)).webkitAudioContext;
      this.audioContext = new AudioContext();
      if( !this.audioContext ) throw new Error('AudioContext creation failed');
    }
    catch(e) {
      console.error(e);
      alert('Web Audio API is not supported in this browser');
    }
  };
  constructor() {
    const {
      PERCUSSION_CHANNEL,
      NUMBER_OF_CHANNELS,
      FREQUENCIES,
      audioContext,
    } = SimpleSynthesizer;
    if( !audioContext ) return;
    const minEnvelopeGainValue = 0.01;
    /** @type {ReturnType<typeof createMixer> | undefined} */
    let mixer;
    const createMixer = () => {
      const volumeSlider =
        /** @type {HTMLInputElement | { value: string, addEventListener?: undefined }} */
        (document.getElementById('volume')) ?? { value: "0.5" };
      const mixer = audioContext.createGain();
      const { gain } = mixer;
      const changeVolume = () => {
        gain.value = parseFloat(volumeSlider.value) ** 2;
      };
      volumeSlider.addEventListener?.('input', changeVolume);
      changeVolume();
      mixer.connect(audioContext.destination);
      return mixer;
    }
    /** @type {ReturnType<typeof createNoiseBuffer> | undefined} */
    let noiseBuffer;
    const createNoiseBuffer = () => {
      const { sampleRate } = audioContext;
      const [, , , releaseTime] = GENERIC_PERCUSSION.envelope;
      const length = sampleRate * releaseTime;
      const buffer = new AudioBuffer({ length, sampleRate });
      const data = buffer.getChannelData(0);
      for( let i = 0; i < length; i++ ) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    };
    /** @param {AudioParam} destinationFrequency */
    const createModulator = (destinationFrequency) => {
      const amplifier = audioContext.createGain();
      amplifier.gain.value = 0;
      amplifier.connect(destinationFrequency);
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.value = 6;
      oscillator.connect(amplifier);
      oscillator.start();
      return { oscillator, amplifier };
    };
    /**
     * @param {Instrument} instrument
     * @param {number} [frequency]
     */
    const createVoiceSource = (instrument, frequency) => {
      if( !frequency || instrument.wave === 'noise' ) {
        const source = audioContext.createBufferSource();
        source.buffer = noiseBuffer ??= createNoiseBuffer();
        source.loop = true;
        return source;
      }
      const source = audioContext.createOscillator();
      source.frequency.value = frequency;
      if( instrument.wave === 'custom' ) {
        const terms = instrument.terms ??= [[0, 0],[0, 0]];
        source.setPeriodicWave(audioContext.createPeriodicWave(...terms));
      } else {
        source.type = instrument.wave;
      }
      return source;
    };
    /**
     * @typedef {{
     *  readonly isPressing: boolean;
     *  attack: (velocity: number) => void;
     *  release: (onStop?: () => void, immediately?: boolean) => void;
     *  detune?: (cent: number) => void;
     *  changeModulation?: (value: number) => void;
     * }} Voice
     */
    /**
     * @param {AudioNode} destination
     * @param {Instrument} instrument
     * @param {number} [frequency]
     */
    const createVoice = (destination, instrument, frequency) => {
      let isPressing = false;
      const velocityAmp = audioContext.createGain();
      velocityAmp.gain.value = 0;
      velocityAmp.connect(destination);
      const envelopeAmp = audioContext.createGain();
      envelopeAmp.gain.value = 0;
      envelopeAmp.connect(velocityAmp);
      const source = createVoiceSource(instrument, frequency);
      source.connect(envelopeAmp);
      source.start();
      /** @type {ReturnType<typeof createModulator> | undefined} */
      let modulator;
      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let timeoutIdToStop;
      const { envelope } = instrument;
      /** @type {Voice} */
      const voice = {
        get isPressing() { return isPressing; },
        attack: (velocity) => {
          isPressing = true;
          clearTimeout(timeoutIdToStop);
          timeoutIdToStop = undefined;
          const { gain } = envelopeAmp;
          gain.cancelScheduledValues(audioContext.currentTime);
          const [attackTime, decayTime, sustainLevel] = envelope;
          velocityAmp.gain.value = velocity / 0x7F;
          const t1 = audioContext.currentTime + attackTime;
          if( attackTime ) {
            gain.linearRampToValueAtTime(1, t1);
          } else {
            gain.value = 1;
          }
          if( sustainLevel < 1 ) {
            gain.setTargetAtTime(sustainLevel, t1, decayTime);
          }
        },
        release: (onStop, immediately = false) => {
          if( timeoutIdToStop && !immediately ) return;
          isPressing = false;
          const { gain } = envelopeAmp;
          const stop = () => {
            clearTimeout(timeoutIdToStop);
            timeoutIdToStop = undefined;
            gain.cancelScheduledValues(audioContext.currentTime);
            gain.value = 0;
            source.stop();
            modulator?.oscillator.stop();
            onStop?.();
          };
          if( immediately || gain.value <= minEnvelopeGainValue ) { stop(); return; }
          const [, , , releaseTime] = envelope;
          if( !releaseTime ) { stop(); return; }
          const delay = releaseTime * Math.log(gain.value / minEnvelopeGainValue);
          if( delay <= 0 ) { stop(); return; }
          gain.cancelScheduledValues(audioContext.currentTime);
          gain.setTargetAtTime(0, audioContext.currentTime, releaseTime);
          timeoutIdToStop = setTimeout(stop, delay * 1000);
        },
      };
      if( source instanceof OscillatorNode ) {
        voice.detune = (cent) => { source.detune.value = cent; };
        voice.changeModulation = (value) => {
          (modulator ??= createModulator(source.frequency)).amplifier.gain.value = value;
        };
      }
      return voice;
    };
    /**
     * @param {number} value
     * @param {number} sensitivity
     */
    const pitchBendToCent = (value, sensitivity) => 100 * sensitivity * value / (1 << 13);
    this.midiChannels = Array.from(
      {length: NUMBER_OF_CHANNELS},
      (_, channelNumber) => {
        let pitchBendCent = 0;
         const voices = Object.assign(
          new Map(),
          {
            /**
             * @param {number} value
             * @param {number} sensitivity
             */
            applyPitchBend(value, sensitivity) {
              pitchBendCent = pitchBendToCent(value, sensitivity);
              voices.forEach((voice) => voice.detune?.(pitchBendCent));
            },
            /** @param {boolean} [immediately] */
            releaseAll(immediately) {
              voices.forEach(
                (voice, noteNumber) => voice.release(() => voices.delete(noteNumber), immediately)
              );
            }
          }
        );
        let volume = 100, expression = 0x7F;
        const createAmpan = () => {
          const amplifier = audioContext.createGain();
          const updateGain = () => { amplifier.gain.value = (volume / 0x7F) * (expression / 0x7F); }
          updateGain();
          const panner = audioContext.createStereoPanner();
          amplifier.connect(panner);
          panner.connect(mixer ??= createMixer());
          return { amplifier, panner, updateGain };
        };
        /** @type {ReturnType<typeof createAmpan> | undefined} */
        let ampan;
        const getAmpan = () => ampan ??= createAmpan();
        /** @param {number} value */
        const setPan = (value) => {
          // MIDI Control# 0x0A's value: 0(L) ... 0x7F(R)
          // Web Audio API's panner value: -1(L) ... 1(R)
          getAmpan().panner.pan.setValueAtTime((value - 0x40) / 0x40, audioContext.currentTime);
        };
        let programNumber = 0;
        /** @type {Instrument | undefined} */
        let instrument;
        /** @type {{ isRegistered: boolean, MSB?: number, LSB?: number} | undefined} */
        let parameterNumber;
        let pitchBendValue = 0, pitchBendSensitivity = 2;
        const channel = {
          /**
           * @param {number} control
           * @param {number} value
           */
          setParameterNumber(control, value) {
            // Control#
            //   NRPN (Non-Registered Parameter Number)
            //     0x62: LSB
            //     0x63: MSB
            //   RPN (Registered Parameter Number)
            //     0x64: LSB
            //     0x65: MSB
            parameterNumber ??= { isRegistered: false };
            parameterNumber.isRegistered = !!(control & 4);
            parameterNumber[control & 1 ? "MSB" : "LSB"] = value;
          },
          /** @param {number} value */
          set parameterValue(value) {
            if( !parameterNumber ) {
              console.warn(`Warning: MIDI CH.${channelNumber + 1}: No parameter number received yet, value ${value} ignored`);
              return;
            }
            const { MSB, LSB, isRegistered } = parameterNumber;
            if( isRegistered && MSB === 0 && LSB === 0 ) {
              pitchBendCent = pitchBendToCent(
                pitchBendValue,
                pitchBendSensitivity = value
              );
            }
          },
          /** @param {number} value */
          set pitchBendValue(value) {
            voices.applyPitchBend(
              pitchBendValue = value,
              pitchBendSensitivity
            );
          },
          /** @param {number} value */
          set modulationDepth(value) {
            const gainValue = value / 32;
            voices.forEach((voice) => voice.changeModulation?.(gainValue));
          },
          /** @param {number} value */
          set volume(value) { volume = value; getAmpan().updateGain(); },
          /** @param {number} value */
          set expression(value) { expression = value; getAmpan().updateGain(); },
          /** @param {number} value */
          set pan(value) { setPan(value); },
          /** @param {number} value */
          set program(value) {
            if( channelNumber == PERCUSSION_CHANNEL ) return;
            instrument = INSTRUMENTS[programNumber = value];
          },
          get program() { return programNumber; },
          get instrument() { return instrument ?? INSTRUMENTS[programNumber]; },
          resetAllControllers() {
            parameterNumber = undefined;
            voices.applyPitchBend(
              pitchBendValue = 0,
              pitchBendSensitivity = 2
            );
            volume = 100; expression = 0x7F; getAmpan().updateGain();
            setPan(0x40);
          },
          allSoundOff() { voices.releaseAll(true); },
          allNotesOff() { voices.releaseAll(); },
          /** @param {number} noteNumber */
          noteOff(noteNumber) {
            voices.get(noteNumber)?.release(() => voices.delete(noteNumber));
          },
          /**
           * @param {number} noteNumber
           * @param {number} velocity
          */
          noteOn(noteNumber, velocity) {
            let voice = voices.get(noteNumber);
            const isNewVoice = !voice?.isPressing;
            if( !voice ) {
              voice = createVoice(
                getAmpan().amplifier,
                this.instrument,
                FREQUENCIES[noteNumber]
              );
              voice.detune?.(pitchBendCent);
              voices.set(noteNumber, voice);
            }
            voice.attack(velocity);
            return isNewVoice;
          },
        };
        if( channelNumber == PERCUSSION_CHANNEL ) {
          instrument = GENERIC_PERCUSSION;
        } else {
          channel.program = 0;
        }
        return channel;
      } // Array.from
    ); // midiChannels
  }; // constuctor
};
