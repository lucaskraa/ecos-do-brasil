(() => {
  'use strict';

  const EB = window.EB = window.EB || {};

  class AudioDirector {
    constructor(settings = {}) {
      this.context = null;
      this.master = null;
      this.musicBus = null;
      this.effectsBus = null;
      this.ambienceBus = null;
      this.started = false;
      this.muted = false;
      this.currentTheme = null;
      this.pendingTheme = null;
      this.themeGeneration = 0;
      this.musicTimer = null;
      this.ambienceTimer = null;
      this.activeNodes = new Set();
      this.masterVolume = settings.masterVolume ?? 0.72;
      this.musicVolume = settings.musicVolume ?? 0.66;
      this.effectsVolume = settings.effectsVolume ?? 0.82;
      this.ambienceVolume = settings.ambienceVolume ?? 0.72;
      this.lookAhead = 0.15;
      this.nextBeatTime = 0;
      this.beatIndex = 0;
      this.tempo = 84;
      this.noiseBuffer = null;
      this.impulseBuffer = null;
      this.lastBirdCall = 0;
      this.lastWaterDrop = 0;
      this.lastWindGust = 0;
      this.themeDefinitions = this.createThemeDefinitions();
    }

    createThemeDefinitions() {
      return {
        menu: {
          tempo: 68,
          root: 45,
          scale: [0, 3, 5, 7, 10, 12],
          melody: [0, null, 2, null, 4, 3, 2, null, 0, null, 3, 2, 1, null, 0, null],
          bass: [0, null, 0, null, 3, null, 2, null],
          drum: [1, 0, 0, 0, 1, 0, 0.4, 0],
          color: 'warm'
        },
        village: {
          tempo: 78,
          root: 48,
          scale: [0, 2, 5, 7, 9, 12],
          melody: [0, 2, 4, 3, 2, null, 1, null, 0, 2, 3, 4, 3, 2, 1, null],
          bass: [0, null, 0, 2, 3, null, 2, null],
          drum: [1, 0, 0.35, 0, 1, 0.25, 0.45, 0],
          color: 'forest'
        },
        danger: {
          tempo: 112,
          root: 43,
          scale: [0, 1, 3, 5, 7, 8, 10, 12],
          melody: [0, 2, 1, 3, 0, 4, 3, 2, 0, 2, 5, 4, 3, 2, 1, 0],
          bass: [0, 0, 3, 0, 4, 0, 3, 2],
          drum: [1, 0.3, 0.55, 0.3, 1, 0.4, 0.7, 0.45],
          color: 'fire'
        },
        water: {
          tempo: 72,
          root: 50,
          scale: [0, 2, 4, 7, 9, 12],
          melody: [0, null, 2, 4, 3, null, 1, null, 0, 1, 3, 4, 2, null, 1, null],
          bass: [0, null, 3, null, 2, null, 0, null],
          drum: [0.75, 0, 0.25, 0, 0.65, 0, 0.3, 0],
          color: 'water'
        },
        council: {
          tempo: 82,
          root: 46,
          scale: [0, 3, 5, 7, 10, 12],
          melody: [0, 2, 3, null, 4, 3, 2, null, 0, 1, 2, 4, 3, null, 2, 1],
          bass: [0, null, 0, 3, 4, null, 3, 2],
          drum: [0.9, 0, 0.4, 0.2, 1, 0.25, 0.55, 0.2],
          color: 'earth'
        },
        fortress: {
          tempo: 104,
          root: 42,
          scale: [0, 1, 3, 5, 6, 8, 10, 12],
          melody: [0, 3, 2, 1, 0, 4, 3, 2, 1, 5, 4, 3, 2, 1, 0, null],
          bass: [0, 0, 4, 0, 3, 0, 5, 4],
          drum: [1, 0.35, 0.7, 0.35, 1, 0.45, 0.8, 0.5],
          color: 'iron'
        },
        boss: {
          tempo: 128,
          root: 40,
          scale: [0, 1, 3, 5, 6, 7, 10, 12],
          melody: [0, 3, 2, 5, 4, 3, 1, 0, 0, 4, 3, 6, 5, 4, 2, 1],
          bass: [0, 0, 5, 0, 6, 0, 5, 3],
          drum: [1, 0.55, 0.85, 0.6, 1, 0.65, 0.95, 0.7],
          color: 'war'
        },
        ending: {
          tempo: 62,
          root: 45,
          scale: [0, 3, 5, 7, 10, 12],
          melody: [0, null, 2, null, 3, null, 4, 3, 2, null, 1, null, 0, null, null, null],
          bass: [0, null, null, null, 3, null, null, null],
          drum: [0.45, 0, 0, 0, 0.35, 0, 0, 0],
          color: 'memory'
        }
      };
    }

    async start() {
      if (this.started) {
        if (this.context && this.context.state === 'suspended') {
          await this.context.resume();
        }
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API não está disponível neste navegador.');
        return;
      }

      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.effectsBus = this.context.createGain();
      this.ambienceBus = this.context.createGain();
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.ambienceBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer(4);
      this.impulseBuffer = this.createImpulseBuffer(2.4, 2.2);
      this.applyVolumes();
      this.started = true;
      this.nextBeatTime = this.context.currentTime + 0.08;
      this.scheduleAmbience();
      if (this.pendingTheme) {
        const pending = this.pendingTheme;
        this.pendingTheme = null;
        this.playTheme(pending, true);
      }
    }

    applyVolumes() {
      if (!this.started) {
        return;
      }
      const time = this.context.currentTime;
      const masterTarget = this.muted ? 0.0001 : Math.max(0.0001, this.masterVolume);
      this.master.gain.setTargetAtTime(masterTarget, time, 0.025);
      this.musicBus.gain.setTargetAtTime(Math.max(0.0001, this.musicVolume), time, 0.05);
      this.effectsBus.gain.setTargetAtTime(Math.max(0.0001, this.effectsVolume), time, 0.03);
      this.ambienceBus.gain.setTargetAtTime(Math.max(0.0001, this.ambienceVolume), time, 0.06);
    }

    setVolumes(settings) {
      this.masterVolume = EB.clamp(settings.masterVolume ?? this.masterVolume, 0, 1);
      this.musicVolume = EB.clamp(settings.musicVolume ?? this.musicVolume, 0, 1);
      this.effectsVolume = EB.clamp(settings.effectsVolume ?? this.effectsVolume, 0, 1);
      this.ambienceVolume = EB.clamp(settings.ambienceVolume ?? this.ambienceVolume, 0, 1);
      this.applyVolumes();
    }

    toggleMute() {
      this.muted = !this.muted;
      this.applyVolumes();
      return this.muted;
    }

    createNoiseBuffer(seconds) {
      const length = Math.floor(this.context.sampleRate * seconds);
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < length; index += 1) {
        const white = Math.random() * 2 - 1;
        previous = previous * 0.985 + white * 0.015;
        data[index] = white * 0.55 + previous * 0.45;
      }
      return buffer;
    }

    createImpulseBuffer(seconds, decay) {
      const length = Math.floor(this.context.sampleRate * seconds);
      const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
      for (let channel = 0; channel < 2; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let index = 0; index < length; index += 1) {
          const amount = 1 - index / length;
          data[index] = (Math.random() * 2 - 1) * Math.pow(amount, decay);
        }
      }
      return buffer;
    }

    createReverb(amount = 0.2) {
      const convolver = this.context.createConvolver();
      const dry = this.context.createGain();
      const wet = this.context.createGain();
      const input = this.context.createGain();
      const output = this.context.createGain();
      convolver.buffer = this.impulseBuffer;
      dry.gain.value = 1 - amount * 0.35;
      wet.gain.value = amount;
      input.connect(dry);
      input.connect(convolver);
      convolver.connect(wet);
      dry.connect(output);
      wet.connect(output);
      return { input, output };
    }

    midiToFrequency(note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }

    stopAllNodes() {
      for (const node of this.activeNodes) {
        try {
          node.stop();
        } catch (error) {
          // Nó já encerrado.
        }
      }
      this.activeNodes.clear();
    }

    trackNode(node) {
      this.activeNodes.add(node);
      node.addEventListener('ended', () => {
        this.activeNodes.delete(node);
      }, { once: true });
      return node;
    }

    playOscillator(options = {}) {
      if (!this.started || this.muted) {
        return null;
      }
      const time = options.time ?? this.context.currentTime;
      const duration = Math.max(0.02, options.duration ?? 0.2);
      const oscillator = this.trackNode(this.context.createOscillator());
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      const destination = options.destination || this.effectsBus;
      oscillator.type = options.type || 'sine';
      oscillator.frequency.setValueAtTime(options.frequency || 220, time);
      if (options.frequencyEnd) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.frequencyEnd), time + duration);
      }
      if (options.detune) {
        oscillator.detune.setValueAtTime(options.detune, time);
      }
      filter.type = options.filterType || 'lowpass';
      filter.frequency.setValueAtTime(options.filterFrequency || 8000, time);
      filter.Q.value = options.filterQ || 0.3;
      const volume = Math.max(0.0001, options.volume ?? 0.2);
      const attack = Math.min(duration * 0.4, options.attack ?? 0.01);
      const releaseStart = Math.max(time + attack, time + duration - (options.release ?? duration * 0.55));
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + attack);
      gain.gain.setValueAtTime(volume, releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.03);
      return oscillator;
    }

    playNoise(options = {}) {
      if (!this.started || this.muted) {
        return null;
      }
      const time = options.time ?? this.context.currentTime;
      const duration = Math.max(0.02, options.duration ?? 0.2);
      const source = this.trackNode(this.context.createBufferSource());
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      const destination = options.destination || this.effectsBus;
      source.buffer = this.noiseBuffer;
      source.loop = Boolean(options.loop);
      source.playbackRate.value = options.playbackRate || 1;
      filter.type = options.filterType || 'bandpass';
      filter.frequency.value = options.filterFrequency || 1200;
      filter.Q.value = options.filterQ || 0.6;
      const volume = Math.max(0.0001, options.volume ?? 0.15);
      const attack = options.attack ?? 0.005;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start(time);
      source.stop(time + duration + 0.04);
      return source;
    }

    playTheme(name, immediate = false) {
      if (!this.started) {
        this.pendingTheme = name;
        return;
      }
      if (!this.themeDefinitions[name]) {
        name = 'village';
      }
      if (this.currentTheme === name && !immediate) {
        return;
      }
      this.currentTheme = name;
      this.themeGeneration += 1;
      const generation = this.themeGeneration;
      const theme = this.themeDefinitions[name];
      this.tempo = theme.tempo;
      this.beatIndex = 0;
      this.nextBeatTime = this.context.currentTime + (immediate ? 0.02 : 0.18);
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
      }
      this.musicTimer = setInterval(() => {
        if (generation !== this.themeGeneration || !this.started) {
          return;
        }
        this.scheduleMusic();
      }, 50);
      this.scheduleMusic();
    }

    stopTheme() {
      this.currentTheme = null;
      this.themeGeneration += 1;
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }

    scheduleMusic() {
      if (!this.started || !this.currentTheme || this.muted) {
        return;
      }
      const theme = this.themeDefinitions[this.currentTheme];
      const secondsPerBeat = 60 / theme.tempo;
      while (this.nextBeatTime < this.context.currentTime + this.lookAhead) {
        this.scheduleBeat(theme, this.beatIndex, this.nextBeatTime, secondsPerBeat);
        this.nextBeatTime += secondsPerBeat * 0.5;
        this.beatIndex += 1;
      }
    }

    scheduleBeat(theme, index, time, beatDuration) {
      const step = index % 16;
      const melodyDegree = theme.melody[step];
      const bassDegree = theme.bass[Math.floor(step / 2) % theme.bass.length];
      const drumStrength = theme.drum[step % theme.drum.length] || 0;

      if (melodyDegree !== null && melodyDegree !== undefined) {
        const note = theme.root + theme.scale[melodyDegree % theme.scale.length] + (melodyDegree >= theme.scale.length ? 12 : 0);
        this.playFluteNote(note, time, beatDuration * 0.82, theme.color);
      }

      if (step % 2 === 0 && bassDegree !== null && bassDegree !== undefined) {
        const note = theme.root - 12 + theme.scale[bassDegree % theme.scale.length];
        this.playBassNote(note, time, beatDuration * 1.4, theme.color);
      }

      if (drumStrength > 0) {
        if (step % 4 === 0) {
          this.playDrum(time, drumStrength, 'low');
        } else if (step % 4 === 2) {
          this.playDrum(time, drumStrength * 0.7, 'mid');
        } else if (drumStrength > 0.45) {
          this.playDrum(time, drumStrength * 0.45, 'high');
        }
      }

      if (step % 8 === 6 && (theme.color === 'water' || theme.color === 'memory')) {
        this.playShaker(time, 0.08);
      }
    }

    playFluteNote(note, time, duration, color) {
      const reverb = this.createReverb(color === 'memory' ? 0.42 : 0.25);
      reverb.output.connect(this.musicBus);
      const frequency = this.midiToFrequency(note);
      this.playOscillator({
        time,
        duration,
        frequency,
        frequencyEnd: frequency * 1.008,
        type: 'sine',
        volume: color === 'fire' || color === 'war' ? 0.065 : 0.09,
        attack: 0.055,
        release: duration * 0.65,
        filterFrequency: color === 'water' ? 2500 : 3400,
        destination: reverb.input
      });
      this.playOscillator({
        time: time + 0.004,
        duration: duration * 0.92,
        frequency: frequency * 2,
        type: 'triangle',
        volume: 0.018,
        attack: 0.04,
        release: duration * 0.72,
        filterFrequency: 2400,
        destination: reverb.input
      });
      this.playNoise({
        time,
        duration: duration * 0.82,
        volume: 0.009,
        filterType: 'bandpass',
        filterFrequency: frequency * 2.1,
        filterQ: 2.2,
        destination: reverb.input
      });
    }

    playBassNote(note, time, duration, color) {
      const frequency = this.midiToFrequency(note);
      this.playOscillator({
        time,
        duration,
        frequency,
        frequencyEnd: frequency * 0.995,
        type: color === 'war' || color === 'iron' ? 'sawtooth' : 'triangle',
        volume: color === 'war' ? 0.13 : 0.1,
        attack: 0.025,
        release: duration * 0.72,
        filterFrequency: color === 'war' ? 500 : 720,
        destination: this.musicBus
      });
    }

    playDrum(time, strength, kind) {
      const frequency = kind === 'low' ? 110 : kind === 'mid' ? 180 : 390;
      const duration = kind === 'low' ? 0.22 : 0.1;
      this.playOscillator({
        time,
        duration,
        frequency,
        frequencyEnd: frequency * 0.45,
        type: 'sine',
        volume: 0.13 * strength,
        attack: 0.002,
        release: duration * 0.9,
        filterFrequency: 1000,
        destination: this.musicBus
      });
      this.playNoise({
        time,
        duration: duration * 0.55,
        volume: 0.045 * strength,
        filterType: 'lowpass',
        filterFrequency: kind === 'high' ? 4200 : 1200,
        destination: this.musicBus
      });
    }

    playShaker(time, volume = 0.08) {
      for (let index = 0; index < 3; index += 1) {
        this.playNoise({
          time: time + index * 0.055,
          duration: 0.045,
          volume: volume * (1 - index * 0.18),
          filterType: 'highpass',
          filterFrequency: 3800,
          destination: this.musicBus
        });
      }
    }

    scheduleAmbience() {
      if (this.ambienceTimer) {
        clearInterval(this.ambienceTimer);
      }
      this.ambienceTimer = setInterval(() => {
        if (!this.started || this.muted) {
          return;
        }
        const now = this.context.currentTime;
        if (now - this.lastBirdCall > EB.random(3.5, 7.5)) {
          this.playBirdCall();
          this.lastBirdCall = now;
        }
        if (now - this.lastWindGust > EB.random(5, 10)) {
          this.playWindGust();
          this.lastWindGust = now;
        }
        if (this.currentTheme === 'water' && now - this.lastWaterDrop > EB.random(1.2, 2.8)) {
          this.playWaterDrop();
          this.lastWaterDrop = now;
        }
      }, 500);
    }

    playBirdCall() {
      if (!this.started || ['danger', 'fortress', 'boss'].includes(this.currentTheme)) {
        return;
      }
      const time = this.context.currentTime + EB.random(0, 0.3);
      const base = EB.random(1300, 2100);
      for (let index = 0; index < 3; index += 1) {
        this.playOscillator({
          time: time + index * 0.085,
          duration: 0.07,
          frequency: base * (1 + index * 0.12),
          frequencyEnd: base * (1.08 + index * 0.15),
          type: 'sine',
          volume: 0.026,
          attack: 0.006,
          release: 0.05,
          filterFrequency: 5000,
          destination: this.ambienceBus
        });
      }
    }

    playWindGust() {
      if (!this.started) {
        return;
      }
      this.playNoise({
        time: this.context.currentTime,
        duration: 1.6,
        volume: 0.018,
        attack: 0.28,
        filterType: 'bandpass',
        filterFrequency: 480,
        filterQ: 0.35,
        destination: this.ambienceBus
      });
    }

    playWaterDrop() {
      if (!this.started) {
        return;
      }
      const time = this.context.currentTime;
      const frequency = EB.random(540, 840);
      this.playOscillator({
        time,
        duration: 0.18,
        frequency,
        frequencyEnd: frequency * 0.72,
        type: 'sine',
        volume: 0.038,
        attack: 0.003,
        release: 0.15,
        filterFrequency: 2200,
        destination: this.ambienceBus
      });
    }

    sfx(name, options = {}) {
      if (!this.started || this.muted) {
        return;
      }
      const time = this.context.currentTime;
      const volume = options.volume ?? 1;

      switch (name) {
        case 'menuMove':
          this.playOscillator({ time, duration: 0.055, frequency: 420, frequencyEnd: 500, type: 'triangle', volume: 0.07 * volume });
          break;
        case 'menuSelect':
          this.playOscillator({ time, duration: 0.16, frequency: 280, frequencyEnd: 620, type: 'triangle', volume: 0.12 * volume });
          this.playOscillator({ time: time + 0.06, duration: 0.18, frequency: 420, frequencyEnd: 820, type: 'sine', volume: 0.06 * volume });
          break;
        case 'jump':
          this.playNoise({ time, duration: 0.075, volume: 0.05 * volume, filterType: 'highpass', filterFrequency: 900 });
          this.playOscillator({ time, duration: 0.11, frequency: 180, frequencyEnd: 310, type: 'triangle', volume: 0.055 * volume });
          break;
        case 'land':
          this.playNoise({ time, duration: 0.09, volume: 0.075 * volume, filterType: 'lowpass', filterFrequency: 650 });
          this.playOscillator({ time, duration: 0.08, frequency: 95, frequencyEnd: 58, type: 'sine', volume: 0.07 * volume });
          break;
        case 'dash':
          this.playNoise({ time, duration: 0.18, volume: 0.105 * volume, filterType: 'bandpass', filterFrequency: 1100, filterQ: 0.5 });
          this.playOscillator({ time, duration: 0.13, frequency: 220, frequencyEnd: 90, type: 'sawtooth', volume: 0.035 * volume, filterFrequency: 1300 });
          break;
        case 'swing':
          this.playNoise({ time, duration: 0.13, volume: 0.09 * volume, filterType: 'bandpass', filterFrequency: 1900, filterQ: 0.7 });
          this.playOscillator({ time, duration: 0.09, frequency: 220, frequencyEnd: 110, type: 'triangle', volume: 0.04 * volume });
          break;
        case 'heavySwing':
          this.playNoise({ time, duration: 0.24, volume: 0.14 * volume, filterType: 'bandpass', filterFrequency: 850, filterQ: 0.5 });
          this.playOscillator({ time, duration: 0.2, frequency: 150, frequencyEnd: 58, type: 'sawtooth', volume: 0.06 * volume, filterFrequency: 850 });
          break;
        case 'hit':
          this.playNoise({ time, duration: 0.08, volume: 0.13 * volume, filterType: 'bandpass', filterFrequency: 720, filterQ: 1.1 });
          this.playOscillator({ time, duration: 0.1, frequency: 125, frequencyEnd: 62, type: 'square', volume: 0.045 * volume, filterFrequency: 700 });
          break;
        case 'hurt':
          this.playNoise({ time, duration: 0.16, volume: 0.12 * volume, filterType: 'bandpass', filterFrequency: 380, filterQ: 0.55 });
          this.playOscillator({ time, duration: 0.2, frequency: 180, frequencyEnd: 72, type: 'sawtooth', volume: 0.045 * volume, filterFrequency: 900 });
          break;
        case 'arrow':
          this.playNoise({ time, duration: 0.08, volume: 0.055 * volume, filterType: 'highpass', filterFrequency: 2200 });
          this.playOscillator({ time, duration: 0.14, frequency: 520, frequencyEnd: 230, type: 'triangle', volume: 0.036 * volume });
          break;
        case 'arrowHit':
          this.playNoise({ time, duration: 0.06, volume: 0.09 * volume, filterType: 'bandpass', filterFrequency: 1500, filterQ: 1.5 });
          break;
        case 'gun':
          this.playNoise({ time, duration: 0.22, volume: 0.25 * volume, filterType: 'bandpass', filterFrequency: 830, filterQ: 0.5 });
          this.playOscillator({ time, duration: 0.18, frequency: 115, frequencyEnd: 45, type: 'square', volume: 0.08 * volume, filterFrequency: 720 });
          break;
        case 'cannon':
          this.playNoise({ time, duration: 0.65, volume: 0.34 * volume, filterType: 'lowpass', filterFrequency: 980 });
          this.playOscillator({ time, duration: 0.55, frequency: 78, frequencyEnd: 24, type: 'sine', volume: 0.19 * volume });
          break;
        case 'explosion':
          this.playNoise({ time, duration: 1.05, volume: 0.38 * volume, filterType: 'lowpass', filterFrequency: 1350 });
          this.playOscillator({ time, duration: 0.8, frequency: 72, frequencyEnd: 18, type: 'sine', volume: 0.22 * volume });
          break;
        case 'water':
          this.playNoise({ time, duration: 0.32, volume: 0.09 * volume, filterType: 'bandpass', filterFrequency: 930, filterQ: 0.45 });
          break;
        case 'pickup':
          this.playOscillator({ time, duration: 0.12, frequency: 540, frequencyEnd: 820, type: 'sine', volume: 0.07 * volume });
          this.playOscillator({ time: time + 0.07, duration: 0.14, frequency: 720, frequencyEnd: 1040, type: 'triangle', volume: 0.045 * volume });
          break;
        case 'heal':
          this.playOscillator({ time, duration: 0.44, frequency: 280, frequencyEnd: 610, type: 'sine', volume: 0.08 * volume });
          this.playOscillator({ time: time + 0.11, duration: 0.5, frequency: 420, frequencyEnd: 820, type: 'triangle', volume: 0.05 * volume });
          break;
        case 'dialogue':
          this.playOscillator({ time, duration: 0.045, frequency: 520 + EB.random(-35, 35), type: 'triangle', volume: 0.023 * volume });
          break;
        case 'objective':
          this.playOscillator({ time, duration: 0.28, frequency: 330, frequencyEnd: 660, type: 'triangle', volume: 0.08 * volume });
          this.playOscillator({ time: time + 0.12, duration: 0.35, frequency: 494, frequencyEnd: 880, type: 'sine', volume: 0.06 * volume });
          break;
        case 'checkpoint':
          this.playOscillator({ time, duration: 0.5, frequency: 220, frequencyEnd: 440, type: 'sine', volume: 0.075 * volume });
          this.playOscillator({ time: time + 0.14, duration: 0.5, frequency: 330, frequencyEnd: 660, type: 'triangle', volume: 0.055 * volume });
          this.playOscillator({ time: time + 0.28, duration: 0.6, frequency: 440, frequencyEnd: 880, type: 'sine', volume: 0.04 * volume });
          break;
        case 'death':
          this.playOscillator({ time, duration: 1.1, frequency: 190, frequencyEnd: 42, type: 'sawtooth', volume: 0.08 * volume, filterFrequency: 700 });
          this.playNoise({ time, duration: 0.9, volume: 0.08 * volume, filterType: 'lowpass', filterFrequency: 500 });
          break;
        case 'parry':
          this.playOscillator({ time, duration: 0.12, frequency: 1250, frequencyEnd: 1850, type: 'triangle', volume: 0.075 * volume });
          this.playNoise({ time, duration: 0.08, volume: 0.055 * volume, filterType: 'highpass', filterFrequency: 3300 });
          break;
        default:
          this.playOscillator({ time, duration: 0.08, frequency: 330, type: 'sine', volume: 0.035 * volume });
          break;
      }
    }
  }

  EB.AudioDirector = AudioDirector;
})();
