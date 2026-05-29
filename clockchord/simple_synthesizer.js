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
  static CENTER_PAN_VALUE = 0x40;
  static DEFAULT_CHANNEL_GAIN = { volume: 100, expression: 0x7F };
  static DEFAULT_PITCH_BEND = { pitchBendCent: 0, pitchBendValue: 0, pitchBendSensitivity: 2 };
  /**
   * @param {number} value
   * @param {number} sensitivity
   */
  static pitchBendValueToCent = (value, sensitivity) => 100 * sensitivity * value / (1 << 13);
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
      DEFAULT_CHANNEL_GAIN,
      CENTER_PAN_VALUE,
      DEFAULT_PITCH_BEND,
      audioContext,
      pitchBendValueToCent,
    } = SimpleSynthesizer;
    if( !audioContext ) return;
    /** @type {ReturnType<typeof createMixer> | undefined} */
    let mixer;
    const createMixer = () => {
      const volumeSlider =
        /** @type {HTMLInputElement | { value: string, addEventListener?: undefined }} */
        (document.getElementById('volume')) ?? { value: "0.5" };
      const mixer = audioContext.createGain();
      const changeVolume = () => {
        mixer.gain.value = parseFloat(volumeSlider.value) ** 2;
      };
      volumeSlider.addEventListener?.('input', changeVolume);
      changeVolume();
      mixer.connect(audioContext.destination);
      return mixer;
    }
    const createStereoAmplifier = () => {
      let { volume, expression } = DEFAULT_CHANNEL_GAIN;
      const amplifier = audioContext.createGain();
      const updateGain = () => {
        amplifier.gain.value = (volume / 0x7F) * (expression / 0x7F);
      };
      updateGain();
      const panner = audioContext.createStereoPanner();
      amplifier.connect(panner);
      panner.connect(mixer ??= createMixer());
      const setPan = (value = CENTER_PAN_VALUE) => {
        // MIDI Control# 0x0A's value: 0(L) ... 0x7F(R)
        // Web Audio API's panner value: -1(L) ... 1(R)
        panner.pan.setValueAtTime(
          (value - CENTER_PAN_VALUE) / CENTER_PAN_VALUE,
          audioContext.currentTime
        );
      };
      return {
        get audioInput() { return amplifier; },
        /** @param {typeof volume} value */
        set volume(value) { volume = value; updateGain(); },
        /** @param {typeof expression} value */
        set expression(value) { expression = value; updateGain(); },
        /** @param {number} value */
        set pan(value) { setPan(value); },
        reset: () => {
          ({ volume, expression } = DEFAULT_CHANNEL_GAIN);
          updateGain();
          setPan();
        },
      };
    };
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
      return {
        stop() { oscillator.stop(); },
        /** @param {number} value */
        set gainValue(value) { amplifier.gain.value = value; },
      };
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
     * @param {number} [modulationGainValue]
     */
    const createVoice = (destination, instrument, frequency, modulationGainValue) => {
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
          envelopeAmp.gain.cancelScheduledValues(audioContext.currentTime);
          const maxLevel = 1;
          const [attackTime, decayTime, sustainLevel] = envelope;
          const t1 = audioContext.currentTime + attackTime;
          if( attackTime ) {
            envelopeAmp.gain.linearRampToValueAtTime(maxLevel, t1);
          } else {
            envelopeAmp.gain.value = maxLevel;
          }
          if( sustainLevel < maxLevel ) {
            envelopeAmp.gain.setTargetAtTime(sustainLevel, t1, decayTime);
          }
          velocityAmp.gain.value = velocity / 0x7F;
        },
        release: (onStop, immediately = false) => {
          if( timeoutIdToStop && !immediately ) {
            // Wait until timeout to stop
            return;
          }
          isPressing = false;
          const stop = () => {
            clearTimeout(timeoutIdToStop);
            timeoutIdToStop = undefined;
            envelopeAmp.gain.cancelScheduledValues(audioContext.currentTime);
            envelopeAmp.gain.value = 0;
            source.stop();
            modulator?.stop();
            onStop?.();
          };
          if( immediately ) { stop(); return; }
          const [, , , releaseTime] = envelope;
          if( !releaseTime ) { stop(); return; }
          const minLevelToStop = 0.01;
          if( envelopeAmp.gain.value <= minLevelToStop ) { stop(); return; }
          const delay = releaseTime * Math.log(envelopeAmp.gain.value / minLevelToStop);
          if( delay <= 0 ) { stop(); return; }
          envelopeAmp.gain.cancelScheduledValues(audioContext.currentTime);
          envelopeAmp.gain.setTargetAtTime(0, audioContext.currentTime, releaseTime);
          timeoutIdToStop = setTimeout(stop, delay * 1000);
        },
      };
      if( source instanceof OscillatorNode ) {
        voice.detune = (cent) => { source.detune.value = cent; };
        voice.changeModulation = (gainValue) => {
          (modulator ??= createModulator(source.frequency)).gainValue = gainValue;
        };
        if( modulationGainValue ) voice.changeModulation(modulationGainValue);
      }
      return voice;
    };
    const midiChannels = Array.from(
      {length: NUMBER_OF_CHANNELS},
      /** @param {undefined} _ */
      (_, channelNumber) => {
        /** @type {ReturnType<typeof createStereoAmplifier> | undefined} */
        let stereoAmplifier;
        const getStereoAmp = () => stereoAmplifier ??= createStereoAmplifier();
        let programNumber = 0;
        let instrument = channelNumber == PERCUSSION_CHANNEL ? GENERIC_PERCUSSION : INSTRUMENTS[programNumber];
        /** @type {{ isRegistered: boolean, MSB?: number, LSB?: number} | undefined} */
        let parameterNumber;
        let { pitchBendCent, pitchBendValue, pitchBendSensitivity } = DEFAULT_PITCH_BEND;
        let modulationGainValue = 0;
        /** @type {Map<number, Voice>} */ 
        const voices = new Map();
        /** @param {boolean} [immediately] */
        const releaseAllVoices = (immediately) => {
          voices.forEach((voice) => voice.release(undefined, immediately));
        }
        const resetPitchBend = () => {
          ({ pitchBendCent, pitchBendValue, pitchBendSensitivity } = DEFAULT_PITCH_BEND);
          voices.forEach((voice) => voice.detune?.(pitchBendCent));
        };
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
              pitchBendCent = pitchBendValueToCent(
                pitchBendValue,
                pitchBendSensitivity = value
              );
            }
          },
          /** @param {number} value */
          set pitchBendValue(value) {
            pitchBendCent = pitchBendValueToCent(
              pitchBendValue = value,
              pitchBendSensitivity
            );
            voices.forEach((voice) => voice.detune?.(pitchBendCent));
          },
          /** @param {number} value */
          set modulationDepth(value) {
            modulationGainValue = value / 32;
            voices.forEach((voice) => voice.changeModulation?.(modulationGainValue));
          },
          /** @param {number} value */
          set volume(value) { getStereoAmp().volume = value; },
          /** @param {number} value */
          set expression(value) { getStereoAmp().expression = value; },
          /** @param {number} value */
          set pan(value) { getStereoAmp().pan = value; },
          /** @param {number} value */
          set program(value) {
            if( channelNumber == PERCUSSION_CHANNEL ) return;
            instrument = INSTRUMENTS[programNumber = value];
          },
          get program() { return programNumber; },
          get instrument() { return instrument; },
          resetAllControllers() {
            parameterNumber = undefined;
            resetPitchBend();
            getStereoAmp().reset();
          },
          allSoundOff() { releaseAllVoices(true); },
          allNotesOff() { releaseAllVoices(); },
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
                getStereoAmp().audioInput,
                instrument,
                FREQUENCIES[noteNumber],
                modulationGainValue
              );
              voice.detune?.(pitchBendCent);
              voices.set(noteNumber, voice);
            }
            voice.attack(velocity);
            return isNewVoice;
          },
        };
        return channel;
      }
    );
    this.midiChannels = midiChannels;
  };
};
