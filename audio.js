(() => {
  'use strict';

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.started = false;
      this.muted = false;
      this.theme = 'title';
      this.step = 0;
      this.timer = null;
      this.nextBird = 0;
      this.noiseBuffer = null;
      this.themes = {
        title:  { bpm: 76, root: 50, scale: [0, 3, 5, 7, 10], pulse: [0, 2, 4, 1, 3, 2, 4, 1] },
        village:{ bpm: 88, root: 55, scale: [0, 2, 5, 7, 9],  pulse: [0, 2, 1, 4, 2, 1, 3, 4] },
        fire:   { bpm: 122,root: 48, scale: [0, 3, 5, 7, 10], pulse: [0, 0, 3, 2, 0, 4, 3, 1] },
        water:  { bpm: 94, root: 52, scale: [0, 2, 4, 7, 9],  pulse: [0, 2, 4, 3, 1, 3, 4, 2] },
        camp:   { bpm: 108,root: 47, scale: [0, 2, 5, 7, 10], pulse: [0, 3, 1, 4, 2, 3, 0, 4] },
        boss:   { bpm: 142,root: 45, scale: [0, 3, 5, 6, 10], pulse: [0, 3, 0, 4, 1, 3, 2, 4] },
        memory: { bpm: 66, root: 57, scale: [0, 2, 5, 7, 10], pulse: [0, 4, 2, 3, 1, 2, 4, 3] },
        ending: { bpm: 70, root: 52, scale: [0, 2, 5, 7, 9],  pulse: [0, 2, 4, 1, 3, 4, 2, 1] }
      };
    }

    start() {
      if (this.started) {
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.master.gain.value = 0.72;
      this.musicGain.gain.value = 0.34;
      this.sfxGain.gain.value = 0.72;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer();
      this.started = true;
      this.timer = setInterval(() => this.musicStep(), 95);
    }

    makeNoiseBuffer() {
      const len = Math.floor(this.ctx.sampleRate * 1.5);
      const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.97 + white * 0.03;
        d[i] = last * 2.3;
      }
      return b;
    }

    setTheme(name) {
      if (!this.themes[name]) return;
      this.theme = name;
      this.step = 0;
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
      return this.muted;
    }

    setMusicVolume(v) {
      if (this.musicGain) this.musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.03);
    }

    setSfxVolume(v) {
      if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.03);
    }

    freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

    tone(freq, duration = 0.12, type = 'sine', volume = 0.08, when = 0, detune = 0, target = 'music') {
      if (!this.started || this.muted) return;
      const now = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      f.type = 'lowpass';
      f.frequency.value = type === 'square' ? 1700 : 2800;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      o.connect(f); f.connect(g); g.connect(target === 'sfx' ? this.sfxGain : this.musicGain);
      o.start(now); o.stop(now + duration + 0.03);
    }

    noise(duration = 0.12, volume = 0.08, filter = 1200, when = 0, target = 'sfx') {
      if (!this.started || this.muted || !this.noiseBuffer) return;
      const now = this.ctx.currentTime + when;
      const s = this.ctx.createBufferSource();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      s.buffer = this.noiseBuffer;
      f.type = 'bandpass'; f.frequency.value = filter; f.Q.value = 0.7;
      g.gain.setValueAtTime(volume, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      s.connect(f); f.connect(g); g.connect(target === 'sfx' ? this.sfxGain : this.musicGain);
      s.start(now, Math.random() * 0.5, duration + 0.02);
    }

    drum(kind = 'low', volume = 0.12, when = 0) {
      if (!this.started || this.muted) return;
      const now = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      const start = kind === 'low' ? 125 : 220;
      const end = kind === 'low' ? 48 : 95;
      o.frequency.setValueAtTime(start, now);
      o.frequency.exponentialRampToValueAtTime(end, now + 0.13);
      g.gain.setValueAtTime(volume, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      o.connect(g); g.connect(this.musicGain);
      o.start(now); o.stop(now + 0.18);
      if (kind === 'high') this.noise(0.05, volume * 0.38, 2200, when, 'music');
    }

    flute(midi, duration = 0.34, volume = 0.055, when = 0) {
      const f = this.freq(midi);
      this.tone(f, duration, 'sine', volume, when, -5, 'music');
      this.tone(f * 2.005, duration * 0.82, 'sine', volume * 0.19, when + 0.006, 4, 'music');
      if (this.started && !this.muted) this.noise(duration * 0.7, volume * 0.08, 4200, when, 'music');
    }

    musicStep() {
      if (!this.started || this.muted || document.hidden) return;
      const t = this.themes[this.theme] || this.themes.title;
      const sixteenth = 60 / t.bpm / 4;
      // The timer is deliberately simple; notes are scheduled in small batches.
      const idx = this.step % 16;
      if (idx % 4 === 0) this.drum(idx % 8 === 0 ? 'low' : 'high', this.theme === 'boss' ? 0.17 : 0.10);
      if ((this.theme === 'fire' || this.theme === 'boss' || this.theme === 'camp') && idx % 2 === 1) {
        this.noise(0.035, 0.018, 3600, 0, 'music');
      }
      if (idx % 2 === 0) {
        const p = t.pulse[(this.step / 2) % t.pulse.length | 0];
        const octave = (idx === 12 || idx === 14) ? 12 : 0;
        this.tone(this.freq(t.root + t.scale[p] + octave), sixteenth * 1.8, this.theme === 'boss' ? 'square' : 'triangle', this.theme === 'boss' ? 0.045 : 0.032, 0, 0, 'music');
      }
      if (idx === 0 || idx === 8) {
        const p = t.pulse[(this.step / 8) % t.pulse.length | 0];
        this.flute(t.root + 12 + t.scale[p], sixteenth * (this.theme === 'memory' ? 7 : 5), this.theme === 'ending' ? 0.07 : 0.052);
      }
      if ((this.theme === 'village' || this.theme === 'title') && performance.now() > this.nextBird) {
        this.nextBird = performance.now() + 2200 + Math.random() * 4200;
        const base = 1200 + Math.random() * 800;
        this.tone(base, 0.06, 'sine', 0.025, 0, 0, 'music');
        this.tone(base * 1.2, 0.08, 'sine', 0.018, 0.085, 0, 'music');
      }
      this.step++;
    }

    sfx(name) {
      if (!this.started || this.muted) return;
      switch (name) {
        case 'jump':
          this.tone(240, .08, 'square', .08, 0, 0, 'sfx');
          this.tone(390, .07, 'square', .05, .04, 0, 'sfx');
          break;
        case 'dash':
          this.noise(.13, .15, 900, 0, 'sfx');
          this.tone(170, .12, 'sawtooth', .05, 0, -500, 'sfx');
          break;
        case 'slash':
          this.noise(.11, .16, 1500, 0, 'sfx');
          this.tone(220, .08, 'triangle', .06, 0, 0, 'sfx');
          break;
        case 'arrow':
          this.noise(.07, .08, 2600, 0, 'sfx');
          this.tone(520, .08, 'triangle', .04, 0, -700, 'sfx');
          break;
        case 'hit':
          this.noise(.09, .18, 700, 0, 'sfx');
          this.tone(105, .1, 'square', .06, 0, 0, 'sfx');
          break;
        case 'hurt':
          this.noise(.16, .2, 520, 0, 'sfx');
          this.tone(82, .2, 'sawtooth', .08, 0, -200, 'sfx');
          break;
        case 'shot':
          this.noise(.24, .28, 980, 0, 'sfx');
          this.tone(68, .25, 'square', .09, 0, 0, 'sfx');
          break;
        case 'cannon':
          this.noise(.55, .36, 310, 0, 'sfx');
          this.tone(43, .5, 'sine', .16, 0, 0, 'sfx');
          break;
        case 'water':
          this.noise(.18, .10, 1300, 0, 'sfx');
          break;
        case 'pickup':
          this.tone(660, .08, 'sine', .07, 0, 0, 'sfx');
          this.tone(880, .12, 'sine', .06, .07, 0, 'sfx');
          break;
        case 'heal':
          this.tone(420, .18, 'sine', .07, 0, 0, 'sfx');
          this.tone(630, .22, 'sine', .06, .12, 0, 'sfx');
          break;
        case 'menu':
          this.tone(330, .055, 'square', .04, 0, 0, 'sfx');
          break;
        case 'confirm':
          this.tone(390, .08, 'triangle', .06, 0, 0, 'sfx');
          this.tone(585, .12, 'triangle', .05, .06, 0, 'sfx');
          break;
        case 'fire':
          this.noise(.3, .08, 1800, 0, 'sfx');
          break;
        case 'explosion':
          this.noise(1.1, .42, 240, 0, 'sfx');
          this.tone(35, .9, 'sine', .2, 0, 0, 'sfx');
          break;
      }
    }
  }

  window.AudioEngine = AudioEngine;
})();
