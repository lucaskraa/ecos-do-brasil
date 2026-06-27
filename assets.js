(() => {
  'use strict';

  const EB = window.EB = window.EB || {};

  EB.ASSET_PATHS = Object.freeze({
    titleBackground: 'assets/title_background_v3.png',
    villageCinematic: 'assets/village_cinematic.png',
    introForest: 'assets/intro_forest.png',
    foregroundCanopy: 'assets/foreground_canopy.png',
    macawAtlas: 'assets/macaw_atlas.png',
    bgVillage: 'assets/bg_village.png',
    bgFire: 'assets/bg_fire.png',
    bgWater: 'assets/bg_water.png',
    bgStorm: 'assets/bg_storm.png',
    bgFortress: 'assets/bg_fortress.png',
    bgShip: 'assets/bg_ship.png',
    aimbereAtlas: 'assets/aimbere_atlas.png',
    portraitAimbere: 'assets/portrait_aimbere.jpg',
    portraitPotira: 'assets/portrait_potira.jpg',
    portraitElder: 'assets/portrait_elder.jpg'
  });

  EB.AIMBERE_FRAMES = Object.freeze([
    { index: 0, x: 53, y: 11, w: 113, h: 215, anchorX: 110, anchorY: 226 },
    { index: 1, x: 273, y: 12, w: 113, h: 214, anchorX: 110, anchorY: 226 },
    { index: 2, x: 493, y: 11, w: 113, h: 215, anchorX: 110, anchorY: 226 },
    { index: 3, x: 713, y: 12, w: 113, h: 214, anchorX: 110, anchorY: 226 },
    { index: 4, x: 890, y: 43, w: 199, h: 183, anchorX: 110, anchorY: 226 },
    { index: 5, x: 1110, y: 45, w: 199, h: 181, anchorX: 110, anchorY: 226 },
    { index: 6, x: 18, y: 273, w: 183, h: 183, anchorX: 110, anchorY: 226 },
    { index: 7, x: 236, y: 276, w: 188, h: 180, anchorX: 110, anchorY: 226 },
    { index: 8, x: 461, y: 268, w: 178, h: 188, anchorX: 110, anchorY: 226 },
    { index: 9, x: 684, y: 263, w: 172, h: 193, anchorX: 110, anchorY: 226 },
    { index: 10, x: 936, y: 244, w: 108, h: 212, anchorX: 110, anchorY: 226 },
    { index: 11, x: 1156, y: 245, w: 108, h: 211, anchorX: 110, anchorY: 226 },
    { index: 12, x: 56, y: 475, w: 108, h: 211, anchorX: 110, anchorY: 226 },
    { index: 13, x: 275, y: 475, w: 109, h: 211, anchorX: 110, anchorY: 226 },
    { index: 14, x: 453, y: 503, w: 194, h: 183, anchorX: 110, anchorY: 226 },
    { index: 15, x: 679, y: 508, w: 182, h: 178, anchorX: 110, anchorY: 226 },
    { index: 16, x: 897, y: 507, w: 185, h: 179, anchorX: 110, anchorY: 226 },
    { index: 17, x: 1114, y: 507, w: 191, h: 179, anchorX: 110, anchorY: 226 },
    { index: 18, x: 19, y: 731, w: 181, h: 185, anchorX: 110, anchorY: 226 },
    { index: 19, x: 240, y: 741, w: 180, h: 175, anchorX: 110, anchorY: 226 },
    { index: 20, x: 492, y: 711, w: 116, h: 205, anchorX: 110, anchorY: 226 },
    { index: 21, x: 712, y: 711, w: 115, h: 205, anchorX: 110, anchorY: 226 },
  ]);

  EB.ANIMATIONS = Object.freeze({
    idle: { frames: [0, 1, 2, 3], fps: 5, loop: true },
    run: { frames: [4, 5, 6, 7, 8, 9], fps: 12, loop: true },
    walk: { frames: [10, 11, 12, 13], fps: 8, loop: true },
    sprint: { frames: [14, 15, 16, 17, 18, 19], fps: 14, loop: true },
    back: { frames: [20, 21], fps: 4, loop: true },
    jump: { frames: [6, 7, 8], fps: 8, loop: false },
    fall: { frames: [8, 9], fps: 6, loop: true },
    swim: { frames: [14, 15, 16, 17, 18, 19], fps: 10, loop: true },
    hurt: { frames: [20], fps: 1, loop: false },
    death: { frames: [20, 21], fps: 3, loop: false }
  });

  class AssetManager {
    constructor() {
      this.images = new Map();
      this.ready = false;
      this.failed = [];
      this.progress = 0;
      this.onProgress = null;
    }

    image(key) {
      return this.images.get(key) || null;
    }

    has(key) {
      return this.images.has(key);
    }

    async loadAll() {
      const entries = Object.entries(EB.ASSET_PATHS);
      const total = entries.length;
      let completed = 0;

      for (const [key, source] of entries) {
        try {
          const image = await this.loadImage(source);
          this.images.set(key, image);
        } catch (error) {
          console.warn(`Falha ao carregar ${source}`, error);
          this.failed.push({ key, source, error });
          this.images.set(key, this.createFallbackImage(key));
        }
        completed += 1;
        this.progress = completed / total;
        if (typeof this.onProgress === 'function') {
          this.onProgress(this.progress, key);
        }
      }

      this.ready = true;
      return this;
    }

    loadImage(source) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Não foi possível carregar ${source}`));
        image.src = source;
      });
    }

    createFallbackImage(key) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#102d20');
      gradient.addColorStop(1, '#06110d');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 512);
      context.strokeStyle = '#d9b66f';
      context.lineWidth = 4;
      context.strokeRect(18, 18, 476, 476);
      context.fillStyle = '#ecd6a3';
      context.font = 'bold 28px serif';
      context.textAlign = 'center';
      context.fillText('ECOS DO BRASIL', 256, 230);
      context.fillStyle = '#d55832';
      context.font = '18px monospace';
      context.fillText(key, 256, 275);
      const image = new Image();
      image.src = canvas.toDataURL('image/png');
      return image;
    }
  }

  class SpriteAnimator {
    constructor() {
      this.animation = 'idle';
      this.time = 0;
      this.framePosition = 0;
      this.finished = false;
      this.speed = 1;
    }

    play(name, restart = false) {
      if (!EB.ANIMATIONS[name]) {
        name = 'idle';
      }
      if (this.animation !== name || restart) {
        this.animation = name;
        this.time = 0;
        this.framePosition = 0;
        this.finished = false;
      }
    }

    update(deltaTime) {
      const definition = EB.ANIMATIONS[this.animation] || EB.ANIMATIONS.idle;
      if (definition.frames.length <= 1) {
        return;
      }
      this.time += deltaTime * this.speed;
      const rawFrame = this.time * definition.fps;
      if (definition.loop) {
        this.framePosition = Math.floor(rawFrame) % definition.frames.length;
      } else {
        this.framePosition = Math.min(definition.frames.length - 1, Math.floor(rawFrame));
        this.finished = this.framePosition >= definition.frames.length - 1;
      }
    }

    currentFrameIndex() {
      const definition = EB.ANIMATIONS[this.animation] || EB.ANIMATIONS.idle;
      return definition.frames[this.framePosition] ?? definition.frames[0] ?? 0;
    }
  }

  class PortraitCache {
    constructor(assets) {
      this.assets = assets;
      this.map = new Map();
    }

    get(name) {
      if (this.map.has(name)) {
        return this.map.get(name);
      }
      const key = {
        'Aimberê': 'portraitAimbere',
        'Potira': 'portraitPotira',
        'Cunhambebe': 'portraitElder',
        'Ancião': 'portraitElder',
        'Narrador': 'portraitElder'
      }[name] || 'portraitElder';
      const image = this.assets.image(key);
      this.map.set(name, image);
      return image;
    }
  }

  EB.AssetManager = AssetManager;
  EB.SpriteAnimator = SpriteAnimator;
  EB.PortraitCache = PortraitCache;
})();
