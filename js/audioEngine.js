/**
 * HarmoniQ Web Audio Engine
 * High-performance audio subsystem utilizing Web Audio API:
 * 1. Audio Graph: Source -> 5-Band BiquadFilter Equalizer -> AnalyserNode -> MasterGain -> Destination
 * 2. Real-time Frequency Spectrum extraction for Canvas Visualizer
 * 3. Procedural Synthesizer Fallback (Offline-proof music generation)
 * 4. Ambient Soundscape Mixer (Rain, Cafe, Vinyl static overlay)
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.sourceNode = null;
    this.masterGain = null;
    this.analyser = null;
    this.eqFilters = [];
    this.isInitialized = false;

    // Ambient mixer
    this.ambientSource = null;
    this.ambientGain = null;

    // Procedural Synth
    this.synthInterval = null;
    this.activeOscillators = [];
    this.isUsingProcedural = false;

    // State
    this.currentTrack = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 0.75;

    // Callbacks
    this.onTimeUpdateCallback = null;
    this.onEndedCallback = null;
    this.onStateChangeCallback = null;

    this.setupAudioElementListeners();
  }

  /**
   * Initializes the Web Audio API context upon user gesture
   */
  initContext() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Analyser for visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128; // 64 frequency bins for clean responsive UI
      this.analyser.smoothingTimeConstant = 0.82;

      // 5-Band Graphic Equalizer
      const eqFrequencies = [60, 250, 1000, 4000, 12000];
      const eqTypes = ["lowshelf", "peaking", "peaking", "peaking", "highshelf"];

      this.eqFilters = eqFrequencies.map((freq, idx) => {
        const filter = this.ctx.createBiquadFilter();
        filter.type = eqTypes[idx];
        filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
        filter.gain.setValueAtTime(0, this.ctx.currentTime);
        return filter;
      });

      // Chain EQ filters in series
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }

      // Connect last EQ filter -> Analyser -> Master Gain -> Destination
      this.eqFilters[this.eqFilters.length - 1].connect(this.analyser);
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Connect media element
      try {
        this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.eqFilters[0]);
      } catch (e) {
        console.warn("MediaElementAudioSourceNode fallback ready:", e);
      }

      this.isInitialized = true;
    } catch (e) {
      console.error("Web Audio initialization failed:", e);
    }
  }

  setupAudioElementListeners() {
    this.audioElement.addEventListener("timeupdate", () => {
      if (!this.isUsingProcedural) {
        this.currentTime = this.audioElement.currentTime;
        this.duration = this.audioElement.duration || this.currentTrack?.duration || 180;
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.currentTime, this.duration);
        }
      }
    });

    this.audioElement.addEventListener("ended", () => {
      this.isPlaying = false;
      if (this.onEndedCallback) this.onEndedCallback();
    });

    this.audioElement.addEventListener("error", () => {
      console.warn("Audio element URL error. Seamlessly activating procedural synthesizer fallback.");
      this.startProceduralFallback();
    });
  }

  /**
   * Loads a track and prepares playback
   */
  loadTrack(track, autoPlay = true) {
    this.initContext();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.stopProceduralFallback();
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration || 180;

    // Check if track has a direct audioUrl or uses procedural synth
    if (track.audioUrl && !track.useOnlySynth) {
      this.isUsingProcedural = false;
      this.audioElement.src = track.audioUrl;
      this.audioElement.load();
      if (autoPlay) {
        this.play();
      }
    } else {
      this.startProceduralFallback(autoPlay);
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ isPlaying: this.isPlaying, track: this.currentTrack });
    }
  }

  play() {
    this.initContext();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    if (this.isUsingProcedural) {
      this.isPlaying = true;
      if (!this.synthInterval) this.runProceduralLoop();
    } else {
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            if (this.onStateChangeCallback) {
              this.onStateChangeCallback({ isPlaying: true, track: this.currentTrack });
            }
          })
          .catch(err => {
            console.warn("Direct play blocked or failed; switching to procedural synth mode:", err);
            this.startProceduralFallback(true);
          });
      }
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.isUsingProcedural) {
      if (this.synthInterval) {
        clearInterval(this.synthInterval);
        this.synthInterval = null;
      }
      this.stopAllOscillators();
    } else {
      this.audioElement.pause();
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ isPlaying: false, track: this.currentTrack });
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(seconds) {
    if (this.isUsingProcedural) {
      this.currentTime = Math.max(0, Math.min(seconds, this.duration));
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.currentTime, this.duration);
      }
    } else if (this.audioElement.duration) {
      this.audioElement.currentTime = seconds;
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audioElement.volume = this.volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // --- EQUALIZER & SOUND PROFILES ---
  setEqualizerGains(gains) {
    if (!this.eqFilters.length || !this.ctx) return;
    gains.forEach((gain, idx) => {
      if (this.eqFilters[idx]) {
        this.eqFilters[idx].gain.setValueAtTime(gain, this.ctx.currentTime);
      }
    });
  }

  applyEqPreset(presetName) {
    const presets = {
      flat: [0, 0, 0, 0, 0],
      bass_boost: [7, 4, 0, -1, -2],
      vocal_boost: [-2, 1, 5, 3, 0],
      treble_boost: [-3, -1, 1, 4, 7],
      electronic: [6, 3, -1, 3, 5]
    };
    const gains = presets[presetName] || presets.flat;
    this.setEqualizerGains(gains);
    return gains;
  }

  // --- AMBIENT SOUND GENERATOR (Brown / Pink / White Noise) ---
  setAmbientSound(presetId, volume = 0.25) {
    this.initContext();
    if (!this.ctx) return;

    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch (e) {}
      this.ambientSource = null;
    }

    if (!presetId) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (presetId === "rain") {
      // Pink noise algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }
    } else if (presetId === "cafe") {
      // Brown noise algorithm
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 1.8;
      }
    } else {
      // Vinyl static
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.08;
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(volume, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(presetId === "rain" ? 1200 : (presetId === "cafe" ? 800 : 3500), this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    whiteNoise.start();
    this.ambientSource = whiteNoise;
  }

  setAmbientVolume(vol) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  // --- PROCEDURAL SYNTHESIZER FALLBACK ---
  startProceduralFallback(autoPlay = true) {
    this.isUsingProcedural = true;
    this.currentTime = 0;
    this.duration = this.currentTrack?.duration || 180;
    if (autoPlay) {
      this.isPlaying = true;
      this.runProceduralLoop();
    }
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ isPlaying: this.isPlaying, track: this.currentTrack });
    }
  }

  stopProceduralFallback() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.stopAllOscillators();
    this.isUsingProcedural = false;
  }

  runProceduralLoop() {
    if (this.synthInterval) clearInterval(this.synthInterval);

    // Chords progression based on genre (frequencies in Hz)
    const chordProgressions = {
      lofi_chill: [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23]  // G7
      ],
      synthwave_bass: [
        [110.00, 220.00, 277.18, 329.63], // A minor power
        [98.00, 196.00, 246.94, 293.66],  // G power
        [87.31, 174.61, 220.00, 261.63],  // F power
        [130.81, 261.63, 329.63, 392.00]  // C power
      ],
      piano_nocturne: [
        [146.83, 220.00, 293.66, 349.23], // Dm
        [174.61, 220.00, 261.63, 349.23], // F
        [130.81, 196.00, 261.63, 329.63], // C
        [110.00, 164.81, 220.00, 261.63]  // Am
      ],
      ambient_pad: [
        [130.81, 164.81, 196.00, 246.94],
        [146.83, 174.61, 220.00, 261.63]
      ]
    };

    const synthType = this.currentTrack?.synthType || "lofi_chill";
    const progression = chordProgressions[synthType] || chordProgressions.lofi_chill;
    let chordIdx = 0;

    const playStep = () => {
      if (!this.isPlaying || !this.ctx) return;
      const notes = progression[chordIdx % progression.length];
      chordIdx++;

      // Trigger chord notes with soft envelope
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = (synthType === "synthwave_bass" || synthType === "cyber_groove") ? "sawtooth" : "sine";
        osc.frequency.setValueAtTime(freq * (synthType === "synthwave_bass" && i === 0 ? 0.5 : 1), this.ctx.currentTime);

        const now = this.ctx.currentTime;
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.12 / notes.length, now + 0.2);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(noteGain);
        noteGain.connect(this.eqFilters[0] || this.masterGain);

        osc.start(now);
        osc.stop(now + 2.0);
        this.activeOscillators.push(osc);
      });

      // Advance simulated timer
      this.currentTime += 2.0;
      if (this.currentTime >= this.duration) {
        this.currentTime = 0;
        if (this.onEndedCallback) this.onEndedCallback();
      }
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.currentTime, this.duration);
      }
    };

    playStep();
    this.synthInterval = setInterval(playStep, 2000);
  }

  stopAllOscillators() {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    this.activeOscillators = [];
  }

  /**
   * Provides byte frequency data array for the visualizer
   */
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(64);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

const audio = new AudioEngine();
