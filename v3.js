(() => {
  'use strict';

  const EB = window.EB;
  if (!EB) throw new Error('Ecos do Brasil V3 precisa ser carregado depois do motor principal.');

  const LegacyGameScene = EB.GameScene;
  const LegacyDialogueSystem = EB.DialogueSystem;

  const V3 = EB.V3 = {
    version: '3.0.0',
    designWidth: EB.CANVAS_WIDTH || 1600,
    designHeight: EB.CANVAS_HEIGHT || 900,
    palette: {
      gold: '#f1cf78',
      pale: '#fff0bf',
      dark: '#03100c',
      panel: 'rgba(2, 12, 9, .86)',
      orange: '#df5c2f',
      cyan: '#54bfcd',
      leaf: '#1d6b3d'
    }
  };

  function baseScene(manager) {
    return {
      manager,
      ctx: manager.ctx,
      input: manager.input,
      assets: manager.assets,
      audio: manager.audio,
      save: manager.save,
      time: 0
    };
  }

  function drawCover(ctx, image, x, y, w, h, offsetX = 0, offsetY = 0, scale = 1) {
    if (!image || !image.width || !image.height) return false;
    const ir = image.width / image.height;
    const tr = w / h;
    let sw;
    let sh;
    let sx;
    let sy;
    if (ir > tr) {
      sh = image.height;
      sw = sh * tr;
      sx = (image.width - sw) * 0.5;
      sy = 0;
    } else {
      sw = image.width;
      sh = sw / tr;
      sx = 0;
      sy = (image.height - sh) * 0.5;
    }
    const dw = w * scale;
    const dh = h * scale;
    ctx.drawImage(image, sx, sy, sw, sh, x + (w - dw) * 0.5 + offsetX, y + (h - dh) * 0.5 + offsetY, dw, dh);
    return true;
  }

  function roundedPanel(ctx, x, y, w, h, fill, stroke, line = 2, radius = 9) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    EB.drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPixelBird(ctx, x, y, scale, flap, color = '#111d18') {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.quadraticCurveTo(-8, -7 - flap * 5, 0, 0);
    ctx.quadraticCurveTo(8, -7 - flap * 5, 15, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawMacaw(ctx, atlas, frame, x, y, scale = 1, flip = false, alpha = 1) {
    if (!atlas) return;
    const fw = 128;
    const fh = 128;
    const safeFrame = ((frame % 12) + 12) % 12;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(flip ? -scale : scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, safeFrame * fw, 0, fw, fh, -fw * 0.5, -fh * 0.5, fw, fh);
    ctx.restore();
  }

  class V3MenuScene {
    constructor(manager) {
      Object.assign(this, baseScene(manager));
      this.index = 0;
      this.options = ['INICIAR', 'CONTINUAR', 'OPÇÕES'];
      this.fade = 0;
      this.menuPulse = 0;
      this.birds = Array.from({ length: 14 }, (_, index) => ({
        x: 770 + (index * 89) % 830,
        y: 110 + (index * 53) % 315,
        speed: 14 + (index % 6) * 7,
        phase: index * 0.71,
        scale: 0.55 + (index % 5) * 0.11
      }));
      this.buttonRects = [
        { x: 646, y: 525, w: 400, h: 63 },
        { x: 646, y: 610, w: 400, h: 63 },
        { x: 646, y: 695, w: 400, h: 63 }
      ];
    }

    enter() {
      this.audio.playTheme('menu');
      this.fade = 0;
      this.input.clearAll();
    }

    exit() {}

    choose() {
      this.audio.start();
      this.audio.sfx('menuSelect');
      if (this.index === 0) this.manager.startNewGame();
      else if (this.index === 1) this.manager.continueGame();
      else this.manager.setScene(new EB.OptionsScene(this.manager));
    }

    update(dt) {
      this.time += dt;
      this.fade = Math.min(1, this.fade + dt * 1.3);
      this.menuPulse += dt;
      for (const bird of this.birds) {
        bird.x += bird.speed * dt;
        bird.phase += dt * 4;
        if (bird.x > 1660) bird.x = 720;
      }
      if (this.input.pressed.has('ArrowUp') || this.input.pressed.has('KeyW')) {
        this.index = (this.index + this.options.length - 1) % this.options.length;
        this.audio.sfx('menuMove');
      }
      if (this.input.pressed.has('ArrowDown') || this.input.pressed.has('KeyS')) {
        this.index = (this.index + 1) % this.options.length;
        this.audio.sfx('menuMove');
      }
      if (this.input.actionPressed('interact') || this.input.pressed.has('Space')) this.choose();
      if (this.input.pointer.pressed) {
        const px = this.input.pointer.x;
        const py = this.input.pointer.y;
        for (let i = 0; i < this.buttonRects.length; i += 1) {
          const r = this.buttonRects[i];
          if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
            this.index = i;
            this.choose();
            break;
          }
        }
      }
    }

    draw() {
      const c = this.ctx;
      c.save();
      c.clearRect(0, 0, 1600, 900);
      c.globalAlpha = this.fade;
      const background = this.assets.image('titleBackground');
      if (!drawCover(c, background, 0, 0, 1600, 900)) {
        const g = c.createLinearGradient(0, 0, 0, 900);
        g.addColorStop(0, '#214e58');
        g.addColorStop(0.55, '#1e573d');
        g.addColorStop(1, '#04110d');
        c.fillStyle = g;
        c.fillRect(0, 0, 1600, 900);
      }

      for (const bird of this.birds) {
        drawPixelBird(c, bird.x, bird.y + Math.sin(bird.phase) * 4, bird.scale, Math.sin(bird.phase), 'rgba(10,20,16,.74)');
      }

      const vignette = c.createRadialGradient(900, 370, 210, 800, 450, 930);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.72, 'rgba(0,0,0,.08)');
      vignette.addColorStop(1, 'rgba(0,0,0,.64)');
      c.fillStyle = vignette;
      c.fillRect(0, 0, 1600, 900);

      // The generated title illustration already contains the main logo. V3 only paints a clean interactive menu.
      roundedPanel(c, 615, 487, 462, 310, 'rgba(1,12,9,.72)', 'rgba(228,188,102,.43)', 2, 18);
      c.textAlign = 'center';
      c.font = 'italic 20px Georgia, serif';
      c.fillStyle = 'rgba(255,239,190,.92)';
      c.fillText('“O rio conhece meu nome. A mata conhece minha dor.”', 846, 505);

      for (let i = 0; i < this.options.length; i += 1) {
        const r = this.buttonRects[i];
        const selected = i === this.index;
        const pulse = 0.5 + Math.sin(this.menuPulse * 4) * 0.5;
        roundedPanel(
          c,
          r.x,
          r.y,
          r.w,
          r.h,
          selected ? `rgba(164,100,31,${0.91 + pulse * 0.05})` : 'rgba(3,15,11,.91)',
          selected ? '#f4cf75' : 'rgba(209,172,94,.55)',
          selected ? 4 : 2,
          6
        );
        if (selected) {
          c.fillStyle = '#ffe4a0';
          c.font = '900 24px ui-monospace, monospace';
          c.fillText('◆', r.x - 25, r.y + 40);
          c.fillText('◆', r.x + r.w + 25, r.y + 40);
        }
        c.fillStyle = selected ? '#fff2c9' : '#e3cca0';
        c.font = '900 24px ui-monospace, monospace';
        c.fillText(this.options[i], r.x + r.w * 0.5, r.y + 41);
      }

      c.textAlign = 'left';
      c.fillStyle = 'rgba(248,227,177,.84)';
      c.font = '700 14px ui-monospace, monospace';
      c.fillText('WASD / SETAS  •  J ATACAR  •  K ARCO  •  SHIFT ESQUIVAR  •  E INTERAGIR', 30, 870);
      c.textAlign = 'right';
      c.fillText(`VERSÃO ${V3.version}`, 1570, 870);
      c.restore();
    }
  }

  class V3BackgroundRenderer {
    constructor(assets) {
      this.assets = assets;
      this.time = 0;
      this.fireflies = Array.from({ length: 42 }, (_, i) => ({
        x: (i * 151) % 1660,
        y: 120 + (i * 83) % 580,
        phase: i * 0.9,
        speed: 5 + (i % 5) * 2
      }));
      this.rain = Array.from({ length: 150 }, (_, i) => ({
        x: (i * 71) % 1700,
        y: (i * 113) % 980,
        speed: 620 + (i % 7) * 70,
        length: 10 + (i % 5) * 6
      }));
      this.embers = Array.from({ length: 65 }, (_, i) => ({
        x: (i * 107) % 1700,
        y: 350 + (i * 47) % 580,
        phase: i * 0.55,
        speed: 24 + (i % 9) * 5,
        size: 2 + (i % 4)
      }));
    }

    keyForPalette(palette) {
      return {
        village: 'bgVillage',
        fire: 'bgFire',
        water: 'bgWater',
        storm: 'bgStorm',
        fortress: 'bgFortress',
        ship: 'bgShip'
      }[palette] || 'bgVillage';
    }

    update(dt) {
      this.time += dt;
      for (const f of this.fireflies) {
        f.x += f.speed * dt;
        f.phase += dt * 2.2;
        if (f.x > 1650) f.x = -50;
      }
      for (const r of this.rain) {
        r.x -= r.speed * 0.22 * dt;
        r.y += r.speed * dt;
        if (r.y > 950) { r.y = -40; r.x = Math.random() * 1700; }
        if (r.x < -50) r.x = 1650;
      }
      for (const e of this.embers) {
        e.y -= e.speed * dt;
        e.x += Math.sin(this.time * 2 + e.phase) * 10 * dt;
        if (e.y < 80) { e.y = 920; e.x = Math.random() * 1600; }
      }
    }

    drawRepeated(ctx, image, offset, scale = 1.08, yOffset = 0) {
      if (!image) return;
      const tileW = 1600 * scale;
      const tileH = 900 * scale;
      const mod = ((offset % tileW) + tileW) % tileW;
      let x = -mod - tileW;
      let index = -1;
      while (x < 1600 + tileW) {
        ctx.save();
        if (index % 2 !== 0) {
          ctx.translate(x + tileW, yOffset + (900 - tileH) * 0.5);
          ctx.scale(-1, 1);
          ctx.drawImage(image, 0, 0, tileW, tileH);
        } else {
          ctx.drawImage(image, x, yOffset + (900 - tileH) * 0.5, tileW, tileH);
        }
        ctx.restore();
        x += tileW;
        index += 1;
      }
    }

    draw(ctx, scene) {
      const palette = scene.level.palette || 'village';
      const image = this.assets.image(this.keyForPalette(palette));
      const cameraX = scene.camera ? scene.camera.x : 0;
      const cameraY = scene.camera ? scene.camera.y : 0;
      ctx.save();
      ctx.fillStyle = '#061710';
      ctx.fillRect(0, 0, 1600, 900);
      this.drawRepeated(ctx, image, cameraX * 0.065, 1.12, -cameraY * 0.025);

      // Distant mist creates depth without expensive per-frame procedural forests.
      const mist = ctx.createLinearGradient(0, 180, 0, 850);
      mist.addColorStop(0, 'rgba(225,246,225,0)');
      mist.addColorStop(0.55, palette === 'water' ? 'rgba(108,190,197,.08)' : 'rgba(206,235,211,.055)');
      mist.addColorStop(1, 'rgba(0,0,0,.14)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 0, 1600, 900);

      if (palette === 'storm') {
        ctx.strokeStyle = 'rgba(185,217,223,.23)';
        ctx.lineWidth = 2;
        for (const drop of this.rain) {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 5, drop.y + drop.length);
          ctx.stroke();
        }
      } else if (palette === 'fire' || palette === 'ship') {
        ctx.globalCompositeOperation = 'screen';
        for (const ember of this.embers) {
          ctx.globalAlpha = 0.35 + Math.sin(ember.phase + this.time * 3) * 0.2;
          ctx.fillStyle = ember.size > 3 ? '#ffc15b' : '#e9562d';
          ctx.fillRect(Math.round(ember.x), Math.round(ember.y), ember.size, ember.size);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      } else {
        for (const fly of this.fireflies) {
          const alpha = 0.14 + (Math.sin(fly.phase) + 1) * 0.12;
          ctx.fillStyle = `rgba(183,231,115,${alpha})`;
          ctx.fillRect(Math.round(fly.x), Math.round(fly.y + Math.sin(fly.phase) * 12), 3, 3);
        }
      }

      const canopy = this.assets.image('foregroundCanopy');
      if (canopy) {
        const shift = -((cameraX * 0.13) % 90);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(canopy, shift - 35, -10 - cameraY * 0.02, 1670, 940);
        ctx.globalAlpha = 1;
      }

      const lowerShade = ctx.createLinearGradient(0, 540, 0, 900);
      lowerShade.addColorStop(0, 'rgba(0,0,0,0)');
      lowerShade.addColorStop(1, 'rgba(0,7,5,.48)');
      ctx.fillStyle = lowerShade;
      ctx.fillRect(0, 500, 1600, 400);
      ctx.restore();
    }
  }

  class V3CinematicScene {
    constructor(manager, id, onComplete = null) {
      Object.assign(this, baseScene(manager));
      this.id = id;
      this.data = EB.CINEMATICS[id] || null;
      this.onComplete = onComplete;
      this.finished = false;
      this.shotIndex = 0;
      this.shotTime = 0;
      this.totalTime = 0;
      this.fade = 0;
      this.transition = 0;
      this.heroAnim = new EB.SpriteAnimator();
      this.heroAnim.play('idle', true);
      this.background = new V3BackgroundRenderer(this.assets);
      this.macawFrame = 0;
      this.macawTime = 0;
      this.birds = Array.from({ length: 24 }, (_, i) => ({
        x: -80 + (i * 113) % 1650,
        y: 80 + (i * 47) % 350,
        scale: 0.45 + (i % 6) * 0.11,
        speed: 22 + (i % 8) * 11,
        phase: i * 0.6
      }));
      this.openingShots = [
        { type: 'macawRear', duration: 5.8, title: 'ANTES DOS MAPAS', text: ['Antes dos mapas estrangeiros, rios e trilhas já ligavam povos, aldeias e memórias.'] },
        { type: 'macawSide', duration: 5.6, title: '', text: ['A mata não era vazia. Era casa, alimento, conflito, encontro e futuro.'] },
        { type: 'villageDescent', duration: 6.4, title: 'TERRA VIVA', text: ['A arara seguia o curso da água até uma aldeia na costa, onde Aimberê conhecia cada silêncio da mata.'] },
        { type: 'heroReveal', duration: 6.1, title: 'AIMBERÊ', text: ['Antes de se tornar símbolo de resistência, ele era filho, companheiro, guerreiro e parte de seu povo.'] },
        { type: 'horizon', duration: 5.5, title: 'VELAS NO HORIZONTE', text: ['Naquela manhã, as aves mudaram de direção antes que os olhos encontrassem as velas.'] }
      ];
      this.genericShots = this.data && Array.isArray(this.data.shots) ? this.data.shots : [];
      this.shots = id === 'opening' ? this.openingShots : this.genericShots;
    }

    enter() {
      this.audio.playTheme(this.id === 'opening' ? 'village' : (this.data?.theme || 'village'));
      this.input.clearAll();
      this.fade = 0;
    }

    exit() {}

    currentShot() {
      return this.shots[this.shotIndex] || null;
    }

    nextShot() {
      if (this.finished) return;
      this.shotIndex += 1;
      this.shotTime = 0;
      this.transition = 0.42;
      if (this.shotIndex >= this.shots.length) this.complete();
    }

    complete() {
      if (this.finished) return;
      this.finished = true;
      const callback = this.onComplete;
      this.onComplete = null;
      this.manager.transition(() => {
        if (typeof callback === 'function') callback();
        else this.manager.setScene(new V3MenuScene(this.manager));
      });
    }

    update(dt) {
      if (this.finished) return;
      this.time += dt;
      this.totalTime += dt;
      this.shotTime += dt;
      this.fade = Math.min(1, this.fade + dt * 1.8);
      this.transition = Math.max(0, this.transition - dt);
      this.background.update(dt);
      this.macawTime += dt;
      this.macawFrame = Math.floor(this.macawTime * 10) % 6;
      this.heroAnim.play('idle');
      this.heroAnim.update(dt);
      for (const bird of this.birds) {
        bird.x += bird.speed * dt;
        bird.phase += dt * 4;
        if (bird.x > 1700) bird.x = -100;
      }

      const shot = this.currentShot();
      if (!shot) { this.complete(); return; }
      const duration = Math.max(1, Number(shot.duration) || 5);
      if (this.shotTime >= duration) this.nextShot();
      if (this.input.actionPressed('interact') || this.input.pressed.has('Space')) {
        if (this.shotTime > 0.35) this.nextShot();
      }
      if (this.input.actionPressed('skip') && this.totalTime > 1.2) this.complete();
    }

    drawNarration(ctx, shot) {
      const lines = Array.isArray(shot.text) ? shot.text : (Array.isArray(shot.narration) ? shot.narration : []);
      const alphaIn = Math.min(1, this.shotTime / 0.8);
      const duration = Math.max(1, Number(shot.duration) || 5);
      const alphaOut = Math.min(1, Math.max(0, duration - this.shotTime) / 0.6);
      const alpha = alphaIn * alphaOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      const gradient = ctx.createLinearGradient(0, 610, 0, 900);
      gradient.addColorStop(0, 'rgba(0,5,4,0)');
      gradient.addColorStop(0.34, 'rgba(0,5,4,.68)');
      gradient.addColorStop(1, 'rgba(0,5,4,.94)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 560, 1600, 340);
      if (shot.title) {
        ctx.fillStyle = '#f4c96e';
        ctx.font = '900 25px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(shot.title, 800, 650);
      }
      ctx.fillStyle = '#fff0c5';
      ctx.font = '27px Georgia, serif';
      ctx.textAlign = 'center';
      let y = shot.title ? 710 : 685;
      for (const original of lines) {
        const rows = EB.wrapText(ctx, original, 1120);
        for (const row of rows) {
          ctx.fillText(row, 800, y);
          y += 36;
        }
      }
      ctx.fillStyle = 'rgba(244,213,144,.7)';
      ctx.font = '700 14px ui-monospace, monospace';
      ctx.fillText('ENTER avançar   •   ESC pular', 800, 860);
      ctx.restore();
    }

    drawOpening(ctx, shot) {
      const forest = this.assets.image('introForest') || this.assets.image('bgVillage');
      const village = this.assets.image('villageCinematic');
      const canopy = this.assets.image('foregroundCanopy');
      const macaw = this.assets.image('macawAtlas');
      const t = this.shotTime;
      const duration = shot.duration || 5;
      const p = EB.clamp(t / duration, 0, 1);

      if (shot.type === 'macawRear') {
        drawCover(ctx, forest, 0, 0, 1600, 900, -60 * p, 0, 1.16 + p * 0.08);
        const mist = ctx.createLinearGradient(0, 0, 0, 900);
        mist.addColorStop(0, 'rgba(181,224,209,.12)');
        mist.addColorStop(1, 'rgba(2,17,11,.2)');
        ctx.fillStyle = mist;
        ctx.fillRect(0, 0, 1600, 900);
        drawMacaw(ctx, macaw, this.macawFrame, 800, 430 + Math.sin(t * 2) * 14, 2.65 + p * 0.25, false, 1);
        if (canopy) ctx.drawImage(canopy, -90 + p * 70, -25, 1780, 990);
      } else if (shot.type === 'macawSide') {
        drawCover(ctx, forest, 0, 0, 1600, 900, -150 + p * 120, -20, 1.22);
        const mx = 260 + p * 1040;
        const my = 330 + Math.sin(t * 2.2) * 28 - p * 60;
        drawMacaw(ctx, macaw, 6 + this.macawFrame, mx, my, 2.15, false, 1);
        if (canopy) {
          ctx.globalAlpha = 0.72;
          ctx.drawImage(canopy, -210 + p * 280, -35, 1900, 1010);
          ctx.globalAlpha = 1;
        }
      } else if (shot.type === 'villageDescent') {
        const useVillage = village || forest;
        drawCover(ctx, useVillage, 0, 0, 1600, 900, 0, 75 * (1 - p), 1.1 + p * 0.08);
        drawMacaw(ctx, macaw, 6 + this.macawFrame, 1250 - p * 600, 190 + p * 260, 1.4 - p * 0.35, true, 0.94);
        if (canopy) {
          ctx.globalAlpha = 0.55 * (1 - p * 0.6);
          ctx.drawImage(canopy, -120, -80 + p * 90, 1840, 1030);
          ctx.globalAlpha = 1;
        }
      } else if (shot.type === 'heroReveal') {
        drawCover(ctx, village || forest, 0, 0, 1600, 900, -50, 0, 1.12);
        ctx.fillStyle = 'rgba(0,14,10,.28)';
        ctx.fillRect(0, 0, 1600, 900);
        this.drawHero(ctx, 470, 785, 2.25);
        // Potira and village silhouettes give the hero context instead of presenting him in isolation.
        ctx.fillStyle = 'rgba(18,31,23,.85)';
        ctx.fillRect(1120, 610, 48, 145);
        ctx.beginPath();
        ctx.arc(1144, 590, 25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawCover(ctx, this.assets.image('bgWater') || forest, 0, 0, 1600, 900, 20 * p, 0, 1.08);
        // Distant ships slowly become visible while birds flee toward the viewer.
        ctx.save();
        ctx.translate(1210, 410);
        ctx.globalAlpha = 0.3 + p * 0.7;
        ctx.fillStyle = '#2d2018';
        ctx.fillRect(-120, 30, 240, 42);
        ctx.strokeStyle = '#241710';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(0, -160);
        ctx.stroke();
        ctx.fillStyle = 'rgba(224,211,168,.88)';
        ctx.beginPath();
        ctx.moveTo(8, -145);
        ctx.lineTo(112, -85);
        ctx.lineTo(8, -45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        for (let i = 0; i < this.birds.length; i += 1) {
          const b = this.birds[i];
          drawPixelBird(ctx, 1520 - p * 1150 + i * 18, 120 + (i % 7) * 34 + Math.sin(b.phase) * 6, 0.55 + i * 0.018, Math.sin(b.phase), '#111c18');
        }
      }
    }

    drawGeneric(ctx, shot) {
      const type = String(shot.type || 'aerialForest');
      const map = {
        ships: 'bgWater', forestAlarm: 'bgFire', villageFire: 'bgFire', oath: 'bgFire',
        mangrove: 'bgWater', canoes: 'bgWater', dive: 'bgWater',
        council: 'bgStorm', signals: 'bgStorm', march: 'bgStorm',
        fortress: 'bgFortress', prisoners: 'bgFortress', siege: 'bgFortress',
        burningShips: 'bgShip', lastStand: 'bgShip', potiraEscape: 'bgShip',
        horizon: 'bgWater', aerialForest: 'bgVillage', riverDescent: 'bgWater', villageLife: 'villageCinematic', heroReveal: 'bgVillage'
      };
      const key = map[type] || 'bgVillage';
      const image = this.assets.image(key) || this.assets.image('bgVillage');
      const duration = Number(shot.duration) || 5;
      const p = EB.clamp(this.shotTime / duration, 0, 1);
      const zoom = 1.06 + p * 0.08;
      const direction = this.shotIndex % 2 === 0 ? 1 : -1;
      drawCover(ctx, image, 0, 0, 1600, 900, direction * (-50 + p * 100), -10 + p * 18, zoom);
      const canopy = this.assets.image('foregroundCanopy');
      if (canopy) {
        ctx.globalAlpha = 0.58;
        ctx.drawImage(canopy, -80 + direction * p * 55, -20, 1760, 960);
        ctx.globalAlpha = 1;
      }
      if (['oath', 'lastStand', 'potiraEscape', 'heroReveal'].includes(type)) this.drawHero(ctx, 430, 790, 2.1);
      if (type === 'ships' || type === 'burningShips') {
        for (let i = 0; i < 4; i += 1) {
          const x = 950 + i * 150 - p * 80;
          const y = 480 + (i % 2) * 45;
          ctx.fillStyle = '#3d2418';
          ctx.fillRect(x - 65, y, 130, 28);
          ctx.strokeStyle = '#24140d';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 110);
          ctx.stroke();
        }
      }
    }

    drawHero(ctx, x, y, scale) {
      const atlas = this.assets.image('aimbereAtlas');
      if (!atlas) return;
      const frameIndex = this.heroAnim.currentFrameIndex();
      const frame = EB.AIMBERE_FRAMES[frameIndex] || EB.AIMBERE_FRAMES[0];
      const targetH = 220 * scale;
      const targetW = frame.w * targetH / frame.h;
      ctx.save();
      ctx.translate(x, y);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -targetW * 0.5, -targetH, targetW, targetH);
      ctx.restore();
    }

    draw() {
      const c = this.ctx;
      c.save();
      c.clearRect(0, 0, 1600, 900);
      c.fillStyle = '#03100c';
      c.fillRect(0, 0, 1600, 900);
      const shot = this.currentShot();
      if (!shot) { c.restore(); return; }
      if (this.id === 'opening') this.drawOpening(c, shot);
      else this.drawGeneric(c, shot);
      const vignette = c.createRadialGradient(800, 420, 280, 800, 450, 940);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,.56)');
      c.fillStyle = vignette;
      c.fillRect(0, 0, 1600, 900);
      this.drawNarration(c, shot);
      if (this.transition > 0) {
        c.fillStyle = `rgba(0,0,0,${this.transition / 0.42})`;
        c.fillRect(0, 0, 1600, 900);
      }
      c.restore();
    }
  }

  class V3GameScene extends LegacyGameScene {
    constructor(manager, levelId) {
      super(manager, levelId);
      this.background = new V3BackgroundRenderer(this.assets);
      this.v3Started = true;
      this.performanceAccumulator = 0;
      this.performanceFrames = 0;
      this.performanceFps = 60;
    }

    update(dt) {
      // The legacy engine already clamps the global delta. This additional guard prevents a hidden tab from producing physics jumps.
      const safe = Math.min(1 / 30, Math.max(1 / 240, dt));
      super.update(safe);
      this.performanceAccumulator += safe;
      this.performanceFrames += 1;
      if (this.performanceAccumulator >= 1) {
        this.performanceFps = this.performanceFrames / this.performanceAccumulator;
        this.performanceAccumulator = 0;
        this.performanceFrames = 0;
      }
    }

    processPending() {
      if (this.dialogue.active) return;
      if (this.pendingCinematic) {
        const id = this.pendingCinematic;
        this.pendingCinematic = null;
        this.manager.setScene(new V3CinematicScene(this.manager, id, () => {
          this.manager.setScene(this);
          if (this.pendingLevelComplete) this.completeLevel();
          else if (this.pendingFinish) this.finishGame();
        }));
        return;
      }
      if (this.pendingLevelComplete) {
        this.pendingLevelComplete = false;
        this.completeLevel();
        return;
      }
      if (this.pendingFinish) {
        this.pendingFinish = false;
        this.finishGame();
      }
    }

    tryInteract() {
      try {
        return super.tryInteract();
      } catch (error) {
        console.error('Falha recuperada durante interação:', error);
        this.blockPlayer = false;
        if (this.dialogue) {
          this.dialogue.active = false;
          this.dialogue.lines = [];
          this.dialogue.onClose = null;
        }
        this.input.clearAll();
        this.player.interactCooldown = 0.45;
        this.addFloat(this.player.centerX(), this.player.y - 30, 'INTERAÇÃO RECUPERADA', '#edc878', 16);
        return false;
      }
    }

    drawLighting(c) {
      super.drawLighting(c);
      // Subtle modern action-game grading: highlights near the hero and a clean cinematic letterbox only in boss entrances.
      const hero = this.camera.worldToScreen(this.player.centerX(), this.player.centerY());
      c.save();
      c.globalCompositeOperation = 'screen';
      const light = c.createRadialGradient(hero.x, hero.y, 0, hero.x, hero.y, 230);
      light.addColorStop(0, this.level.palette === 'water' ? 'rgba(73,183,202,.08)' : 'rgba(235,193,108,.055)');
      light.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = light;
      c.fillRect(hero.x - 240, hero.y - 240, 480, 480);
      c.restore();
    }

    drawHUD(c) {
      c.save();
      const compact = 480;
      roundedPanel(c, 24, 22, compact, 108, 'rgba(2,13,10,.84)', 'rgba(226,188,100,.54)', 2, 7);
      c.fillStyle = '#f0c66e';
      c.font = '900 18px ui-monospace, monospace';
      c.textAlign = 'left';
      c.fillText('AIMBERÊ', 45, 49);
      this.drawBar(c, 45, 62, 300, 21, this.player.health / this.player.maxHealth, '#b94235', '#431b17', `${Math.ceil(this.player.health)} / ${this.player.maxHealth}`);
      this.drawBar(c, 45, 94, 242, 11, this.player.stamina / this.player.maxStamina, '#d4ab4f', '#483919', '');
      c.fillStyle = '#eed9a8';
      c.font = '800 14px ui-monospace, monospace';
      c.fillText(`FLECHAS ${this.player.arrows}/${this.player.maxArrows}`, 314, 86);
      c.fillText(`ERVAS ${this.player.herbs}/${this.player.maxHerbs}`, 314, 109);
      if (this.player.inWater) this.drawBar(c, 615, 32, 370, 18, this.player.breath / this.player.maxBreath, '#48aaba', '#153c49', 'FÔLEGO');
      const boss = this.bosses.find(item => item.health > 0);
      if (boss) {
        roundedPanel(c, 370, 782, 860, 68, 'rgba(2,9,7,.91)', 'rgba(231,184,86,.76)', 3, 7);
        c.fillStyle = '#f3d696';
        c.font = '900 19px ui-monospace, monospace';
        c.textAlign = 'center';
        c.fillText(boss.name.toUpperCase(), 800, 807);
        this.drawBar(c, 430, 818, 740, 15, boss.health / boss.maxHealth, '#b63830', '#3e1615', '');
      }
      c.restore();
    }
  }

  class V3OptionsScene {
    constructor(manager) {
      Object.assign(this, baseScene(manager));
      this.index = 0;
      this.items = ['MÚSICA', 'EFEITOS', 'TELA CHEIA', 'VOLTAR'];
      this.background = new V3BackgroundRenderer(this.assets);
    }

    enter() {
      this.audio.playTheme('menu');
      this.input.clearAll();
    }

    exit() {}

    update(dt) {
      this.time += dt;
      this.background.update(dt);
      if (this.input.actionPressed('up')) this.index = (this.index + this.items.length - 1) % this.items.length;
      if (this.input.actionPressed('down')) this.index = (this.index + 1) % this.items.length;
      const changeLeft = this.input.actionPressed('left');
      const changeRight = this.input.actionPressed('right');
      if ((changeLeft || changeRight) && this.index < 2) {
        const field = this.index === 0 ? 'musicVolume' : 'sfxVolume';
        const delta = changeRight ? 0.1 : -0.1;
        this.save.settings[field] = EB.clamp((this.save.settings[field] ?? 0.7) + delta, 0, 1);
        this.audio.setVolumes(this.save.settings);
        EB.writeSave(this.save);
        this.audio.sfx('menuMove');
      }
      if (this.input.actionPressed('interact')) {
        if (this.index === 2) {
          const button = document.getElementById('fullscreen-button');
          if (button) button.click();
        } else if (this.index === 3) {
          this.manager.setScene(new V3MenuScene(this.manager));
        }
      }
      if (this.input.actionPressed('pause')) this.manager.setScene(new V3MenuScene(this.manager));
    }

    draw() {
      const c = this.ctx;
      this.background.draw(c, { level: { palette: 'village' }, camera: { x: this.time * 6, y: 0 } });
      c.fillStyle = 'rgba(0,8,6,.68)';
      c.fillRect(0, 0, 1600, 900);
      roundedPanel(c, 440, 120, 720, 650, 'rgba(2,14,10,.92)', 'rgba(232,192,103,.66)', 3, 14);
      c.textAlign = 'center';
      c.fillStyle = '#f3d38a';
      c.font = '900 50px Georgia, serif';
      c.fillText('OPÇÕES', 800, 205);
      for (let i = 0; i < this.items.length; i += 1) {
        const y = 300 + i * 105;
        const selected = i === this.index;
        roundedPanel(c, 535, y - 44, 530, 68, selected ? 'rgba(150,91,29,.88)' : 'rgba(3,18,13,.85)', selected ? '#f4cf77' : 'rgba(207,170,91,.45)', selected ? 4 : 2, 6);
        c.fillStyle = selected ? '#fff1c4' : '#dbc493';
        c.font = '900 22px ui-monospace, monospace';
        let label = this.items[i];
        if (i === 0) label += `   ${Math.round((this.save.settings.musicVolume ?? .7) * 100)}%`;
        if (i === 1) label += `   ${Math.round((this.save.settings.sfxVolume ?? .8) * 100)}%`;
        c.fillText(label, 800, y);
      }
      c.fillStyle = 'rgba(240,215,158,.78)';
      c.font = '700 15px ui-monospace, monospace';
      c.fillText('↑ ↓ escolher   •   ← → ajustar   •   ENTER confirmar   •   ESC voltar', 800, 720);
    }
  }

  class V3PauseScene {
    constructor(manager, gameScene) {
      Object.assign(this, baseScene(manager));
      this.gameScene = gameScene;
      this.index = 0;
      this.items = ['CONTINUAR', 'REINICIAR FASE', 'MENU PRINCIPAL'];
    }

    enter() { this.input.clearAll(); }
    exit() {}

    update(dt) {
      this.time += dt;
      if (this.input.actionPressed('up')) this.index = (this.index + this.items.length - 1) % this.items.length;
      if (this.input.actionPressed('down')) this.index = (this.index + 1) % this.items.length;
      if (this.input.actionPressed('pause') && this.time > .15) this.manager.setScene(this.gameScene);
      if (this.input.actionPressed('interact')) {
        if (this.index === 0) this.manager.setScene(this.gameScene);
        else if (this.index === 1) this.manager.startLevel(this.gameScene.levelId, false);
        else this.manager.setScene(new V3MenuScene(this.manager));
      }
    }

    draw() {
      const c = this.ctx;
      this.gameScene.draw();
      c.fillStyle = 'rgba(0,6,5,.70)';
      c.fillRect(0, 0, 1600, 900);
      roundedPanel(c, 520, 185, 560, 520, 'rgba(2,14,10,.94)', 'rgba(235,193,102,.72)', 3, 12);
      c.textAlign = 'center';
      c.fillStyle = '#f0d18a';
      c.font = '900 48px Georgia, serif';
      c.fillText('PAUSA', 800, 275);
      for (let i = 0; i < this.items.length; i += 1) {
        const y = 375 + i * 90;
        const selected = i === this.index;
        roundedPanel(c, 600, y - 42, 400, 62, selected ? 'rgba(157,96,31,.9)' : 'rgba(4,19,14,.86)', selected ? '#f4ce74' : 'rgba(211,174,92,.45)', selected ? 4 : 2, 6);
        c.fillStyle = selected ? '#fff0c2' : '#d9c393';
        c.font = '900 21px ui-monospace, monospace';
        c.fillText(this.items[i], 800, y - 1);
      }
    }
  }

  class V3EndingScene {
    constructor(manager) {
      Object.assign(this, baseScene(manager));
      this.scroll = 0;
      this.background = new V3BackgroundRenderer(this.assets);
      this.finishedSave = false;
    }

    enter() {
      this.audio.playTheme('ending');
      this.save.completed = true;
      this.save.chapter = Object.keys(EB.LEVELS).length - 1;
      EB.writeSave(this.save);
      this.input.clearAll();
    }

    exit() {}

    update(dt) {
      this.time += dt;
      this.scroll += dt * 16;
      this.background.update(dt);
      if (this.input.actionPressed('interact') && this.time > 2.5) this.manager.setScene(new V3MenuScene(this.manager));
    }

    draw() {
      const c = this.ctx;
      const bg = this.assets.image('bgShip') || this.assets.image('titleBackground');
      drawCover(c, bg, 0, 0, 1600, 900, 0, 0, 1.08);
      c.fillStyle = 'rgba(0,7,6,.72)';
      c.fillRect(0, 0, 1600, 900);
      const glow = c.createRadialGradient(800, 400, 20, 800, 400, 560);
      glow.addColorStop(0, 'rgba(223,92,42,.18)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, 1600, 900);
      c.textAlign = 'center';
      c.fillStyle = '#f0cf82';
      c.font = 'italic 42px Georgia, serif';
      c.fillText('“O rio conhece meu nome.', 800, 180);
      c.fillText('A mata conhece minha dor.”', 800, 230);
      const ending = Array.isArray(EB.ENDING_TEXT) ? EB.ENDING_TEXT : [];
      c.fillStyle = '#f7e3b5';
      c.font = '25px Georgia, serif';
      let y = 350;
      for (const entry of ending) {
        const text = typeof entry === 'string' ? entry : (entry.text || '');
        const rows = EB.wrapText(c, text, 1040);
        for (const row of rows) {
          c.fillText(row, 800, y - this.scroll * .08);
          y += 36;
        }
        y += 14;
      }
      c.fillStyle = 'rgba(241,214,154,.76)';
      c.font = '700 15px ui-monospace, monospace';
      c.fillText('Ficção histórica inspirada em Aimberê e na resistência indígena do século XVI.', 800, 805);
      c.fillText('ENTER para voltar ao menu', 800, 850);
    }
  }


  V3GameScene.prototype.drawPlatform = function drawPlatformV3(c, p) {
    const material = p.material || 'earth';
    const top = {
      earth: '#5e4a2c', wood: '#9a6940', stone: '#879082', root: '#6f4a29', ship: '#8b5a32'
    }[material] || '#5e4a2c';
    const body = {
      earth: '#34251a', wood: '#5b351f', stone: '#4a514b', root: '#3e291b', ship: '#47291a'
    }[material] || '#34251a';
    c.save();
    c.fillStyle = body;
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = top;
    c.fillRect(p.x, p.y, p.w, Math.min(18, p.h));
    if (material === 'earth') {
      c.fillStyle = this.level.palette === 'fire' ? '#5c5429' : '#3d7a3e';
      c.fillRect(p.x, p.y - 7, p.w, 9);
      for (let x = p.x + 10; x < p.x + p.w; x += 34) {
        const h = 4 + Math.floor(EB.hash(x * .013) * 8);
        c.fillStyle = EB.hash(x * .031) > .5 ? '#5f9848' : '#2e6034';
        c.fillRect(x, p.y - 7 - h, 4, h + 7);
      }
      c.strokeStyle = 'rgba(18,12,8,.55)';
      c.lineWidth = 3;
      for (let x = p.x + 30; x < p.x + p.w; x += 84) {
        c.beginPath();
        c.moveTo(x, p.y + 20);
        c.lineTo(x - 13, p.y + 48 + EB.hash(x) * 35);
        c.lineTo(x + 5, p.y + 76 + EB.hash(x + 9) * 42);
        c.stroke();
      }
      c.fillStyle = 'rgba(146,102,56,.22)';
      for (let x = p.x + 20; x < p.x + p.w; x += 58) {
        c.fillRect(x, p.y + 34 + (x % 5) * 9, 12 + (x % 3) * 6, 4);
      }
    } else if (material === 'stone') {
      c.strokeStyle = 'rgba(25,29,26,.58)';
      c.lineWidth = 3;
      const tileW = 58;
      const tileH = 30;
      for (let yy = p.y + 18; yy < p.y + p.h; yy += tileH) {
        const shift = ((yy - p.y) / tileH) % 2 ? tileW / 2 : 0;
        for (let xx = p.x - shift; xx < p.x + p.w; xx += tileW) {
          c.strokeRect(xx, yy, tileW, Math.min(tileH, p.y + p.h - yy));
        }
      }
      c.fillStyle = 'rgba(196,211,181,.15)';
      for (let xx = p.x + 12; xx < p.x + p.w; xx += 72) c.fillRect(xx, p.y + 5, 28, 4);
    } else if (material === 'wood' || material === 'ship') {
      c.strokeStyle = 'rgba(28,15,9,.62)';
      c.lineWidth = 3;
      for (let xx = p.x + 12; xx < p.x + p.w; xx += 62) {
        c.beginPath();
        c.moveTo(xx, p.y + 4);
        c.lineTo(xx + 7, p.y + p.h - 5);
        c.stroke();
        c.fillStyle = 'rgba(226,172,94,.24)';
        c.fillRect(xx + 10, p.y + 8, 25, 3);
      }
      c.fillStyle = '#2e1b12';
      for (let xx = p.x + 25; xx < p.x + p.w; xx += 95) c.fillRect(xx, p.y + 5, 7, 7);
    } else if (material === 'root') {
      c.strokeStyle = '#7c5630';
      c.lineWidth = 7;
      for (let xx = p.x + 10; xx < p.x + p.w; xx += 45) {
        c.beginPath();
        c.moveTo(xx, p.y + 3);
        c.bezierCurveTo(xx + 25, p.y + 25, xx - 18, p.y + p.h * .65, xx + 8, p.y + p.h);
        c.stroke();
      }
    }
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(p.x, p.y + p.h - Math.min(9, p.h), p.w, Math.min(9, p.h));
    c.restore();
  };

  V3GameScene.prototype.drawWater = function drawWaterV3(c, z) {
    const pal = EB.PALETTES[this.level.palette] || EB.PALETTES.water;
    c.save();
    const g = c.createLinearGradient(0, z.y, 0, z.y + z.h);
    g.addColorStop(0, pal.waterTop || '#2c8795');
    g.addColorStop(.35, 'rgba(22,101,116,.92)');
    g.addColorStop(1, pal.waterBottom || '#0b3846');
    c.fillStyle = g;
    c.globalAlpha = .88;
    c.fillRect(z.x, z.y, z.w, z.h);
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(203,240,224,.62)';
    c.lineWidth = 3;
    for (let row = 0; row < 3; row += 1) {
      c.beginPath();
      for (let x = z.x; x <= z.x + z.w; x += 20) {
        const y = z.y + row * 13 + Math.sin((x + this.time * (130 - row * 25)) * .025 + row) * (4 - row);
        if (x === z.x) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.globalAlpha = .64 - row * .15;
      c.stroke();
    }
    c.globalAlpha = .18;
    c.fillStyle = '#a8e7df';
    for (let x = z.x + 25; x < z.x + z.w; x += 90) {
      const y = z.y + 45 + (x % 7) * 28;
      c.fillRect(x + Math.sin(this.time + x) * 8, y, 34, 3);
    }
    c.restore();
  };

  V3GameScene.prototype.drawDecor = function drawDecorV3(c, d) {
    const x = d.x;
    const y = d.y;
    const s = d.scale || 1;
    const hash = EB.hash((d.x || 0) * .017 + (d.variant || 0) * 3.1);
    c.save();
    switch (d.type) {
      case 'tree':
      case 'mangroveTree': {
        const mangrove = d.type === 'mangroveTree';
        c.strokeStyle = mangrove ? '#352b1e' : '#332318';
        c.lineWidth = 24 * s;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y + 5);
        c.bezierCurveTo(x - 18 * s, y - 75 * s, x + 14 * s, y - 165 * s, x - 5 * s, y - 245 * s);
        c.stroke();
        c.strokeStyle = mangrove ? '#4e3c29' : '#50351f';
        c.lineWidth = 7 * s;
        for (let i = 0; i < 6; i += 1) {
          const angle = -2.65 + i * .75 + hash * .18;
          const bx = x - 5 * s;
          const by = y - (125 + i * 18) * s;
          c.beginPath();
          c.moveTo(bx, by);
          c.lineTo(bx + Math.cos(angle) * 75 * s, by + Math.sin(angle) * 55 * s);
          c.stroke();
        }
        if (mangrove) {
          c.lineWidth = 6 * s;
          for (const dx of [-28, -12, 14, 31]) {
            c.beginPath();
            c.moveTo(x + dx * s, y - 45 * s);
            c.lineTo(x + dx * 1.8 * s, y + 8);
            c.stroke();
          }
        }
        const leafColors = this.level.palette === 'fire' ? ['#364225','#53622c','#7a5c27'] : ['#0e4c2a','#17683a','#278249','#3f9954'];
        for (let i = 0; i < 15; i += 1) {
          const a = i * 2.399 + hash * 4;
          const radius = 35 + (i % 5) * 13;
          const lx = x + Math.cos(a) * radius * s;
          const ly = y - 220 * s + Math.sin(a) * radius * .58 * s;
          c.fillStyle = leafColors[i % leafColors.length];
          c.beginPath();
          c.ellipse(lx, ly, (28 + i % 3 * 7) * s, (15 + i % 4 * 4) * s, a, 0, Math.PI * 2);
          c.fill();
          if (i % 3 === 0) {
            c.fillStyle = 'rgba(133,202,93,.22)';
            c.fillRect(lx - 8 * s, ly - 3 * s, 16 * s, 3 * s);
          }
        }
        break;
      }
      case 'hut':
      case 'longhouse': {
        const long = d.type === 'longhouse';
        const w = (long ? 260 : 160) * s;
        const h = (long ? 135 : 112) * s;
        c.fillStyle = '#664326';
        c.strokeStyle = '#2b1a10';
        c.lineWidth = 5 * s;
        c.fillRect(x - w / 2, y - h, w, h);
        c.strokeRect(x - w / 2, y - h, w, h);
        for (let xx = x - w / 2 + 12; xx < x + w / 2; xx += 20 * s) {
          c.strokeStyle = 'rgba(39,23,13,.58)';
          c.lineWidth = 3 * s;
          c.beginPath();
          c.moveTo(xx, y - h + 5);
          c.lineTo(xx, y - 4);
          c.stroke();
        }
        c.fillStyle = '#b18a45';
        c.strokeStyle = '#52361e';
        c.lineWidth = 4 * s;
        c.beginPath();
        c.moveTo(x - w * .62, y - h);
        c.lineTo(x, y - h - 95 * s);
        c.lineTo(x + w * .62, y - h);
        c.closePath();
        c.fill();
        c.stroke();
        c.strokeStyle = 'rgba(90,57,25,.55)';
        c.lineWidth = 2 * s;
        for (let i = -5; i <= 5; i += 1) {
          c.beginPath();
          c.moveTo(x, y - h - 88 * s);
          c.lineTo(x + i * w * .11, y - h);
          c.stroke();
        }
        c.fillStyle = '#20150f';
        c.fillRect(x - 16 * s, y - 55 * s, 32 * s, 55 * s);
        c.fillStyle = 'rgba(255,151,55,.42)';
        c.fillRect(x - 10 * s, y - 46 * s, 20 * s, 36 * s);
        break;
      }
      case 'fire':
      case 'bonfire': {
        c.fillStyle = '#3c2415';
        c.fillRect(x - 35 * s, y - 7 * s, 70 * s, 12 * s);
        c.save();
        c.globalCompositeOperation = 'screen';
        const pulse = .85 + Math.sin(this.time * 9 + x) * .15;
        c.fillStyle = `rgba(255,90,28,${.72 * pulse})`;
        c.beginPath();
        c.moveTo(x - 28 * s, y);
        c.quadraticCurveTo(x - 20 * s, y - 65 * s, x, y - 32 * s);
        c.quadraticCurveTo(x + 12 * s, y - 88 * s, x + 31 * s, y);
        c.closePath();
        c.fill();
        c.fillStyle = '#ffd35b';
        c.beginPath();
        c.moveTo(x - 12 * s, y);
        c.quadraticCurveTo(x - 6 * s, y - 45 * s, x + 3 * s, y - 22 * s);
        c.quadraticCurveTo(x + 12 * s, y - 52 * s, x + 15 * s, y);
        c.closePath();
        c.fill();
        c.restore();
        break;
      }
      case 'waterfall': {
        const grad = c.createLinearGradient(x - 45 * s, 0, x + 45 * s, 0);
        grad.addColorStop(0, 'rgba(91,189,200,.14)');
        grad.addColorStop(.5, 'rgba(181,239,229,.62)');
        grad.addColorStop(1, 'rgba(55,142,166,.18)');
        c.fillStyle = grad;
        c.fillRect(x - 45 * s, y - 280 * s, 90 * s, 280 * s);
        c.strokeStyle = 'rgba(225,255,244,.52)';
        c.lineWidth = 3;
        for (let i = -3; i <= 3; i += 1) {
          const xx = x + i * 11 * s + Math.sin(this.time * 3 + i) * 4;
          c.beginPath();
          c.moveTo(xx, y - 275 * s);
          c.bezierCurveTo(xx + 8, y - 180 * s, xx - 6, y - 90 * s, xx + 3, y);
          c.stroke();
        }
        break;
      }
      case 'smokeColumn': {
        for (let i = 0; i < 9; i += 1) {
          const r = (24 + i * 8) * s;
          c.fillStyle = `rgba(31,29,28,${.24 - i * .018})`;
          c.beginPath();
          c.arc(x + Math.sin(this.time * .7 + i) * 28 * s, y - i * 52 * s, r, 0, Math.PI * 2);
          c.fill();
        }
        break;
      }
      case 'landingBoat':
      case 'canoe': {
        const w = d.type === 'landingBoat' ? 190 : 135;
        c.fillStyle = '#5b351f';
        c.strokeStyle = '#1e120c';
        c.lineWidth = 5 * s;
        c.beginPath();
        c.moveTo(x - w * .5 * s, y - 25 * s);
        c.quadraticCurveTo(x, y + 24 * s, x + w * .5 * s, y - 25 * s);
        c.lineTo(x + w * .4 * s, y - 5 * s);
        c.quadraticCurveTo(x, y + 34 * s, x - w * .4 * s, y - 5 * s);
        c.closePath();
        c.fill();
        c.stroke();
        c.strokeStyle = '#9a6b3b';
        c.lineWidth = 3 * s;
        for (let i = -2; i <= 2; i += 1) {
          c.beginPath();
          c.moveTo(x + i * 25 * s, y - 17 * s);
          c.lineTo(x + i * 20 * s, y + 7 * s);
          c.stroke();
        }
        break;
      }
      case 'watchtower':
      case 'lookout': {
        c.strokeStyle = '#543820';
        c.lineWidth = 13 * s;
        c.beginPath();
        c.moveTo(x - 45 * s, y);
        c.lineTo(x - 25 * s, y - 210 * s);
        c.moveTo(x + 45 * s, y);
        c.lineTo(x + 25 * s, y - 210 * s);
        c.stroke();
        c.fillStyle = '#6e4829';
        c.strokeStyle = '#26170f';
        c.lineWidth = 4 * s;
        c.fillRect(x - 70 * s, y - 230 * s, 140 * s, 42 * s);
        c.strokeRect(x - 70 * s, y - 230 * s, 140 * s, 42 * s);
        c.fillStyle = '#a1793d';
        c.beginPath();
        c.moveTo(x - 85 * s, y - 230 * s);
        c.lineTo(x, y - 290 * s);
        c.lineTo(x + 85 * s, y - 230 * s);
        c.closePath();
        c.fill();
        break;
      }
      case 'palisade': {
        const width = d.width || 400;
        for (let i = 0; i < width; i += 26 * s) {
          const height = (145 + EB.hash(i * .07 + x) * 50) * s;
          c.fillStyle = i % 2 ? '#5b3a22' : '#68452a';
          c.strokeStyle = '#2a190f';
          c.lineWidth = 3 * s;
          c.beginPath();
          c.moveTo(x + i, y);
          c.lineTo(x + i, y - height + 15 * s);
          c.lineTo(x + i + 10 * s, y - height);
          c.lineTo(x + i + 20 * s, y - height + 15 * s);
          c.lineTo(x + i + 20 * s, y);
          c.closePath();
          c.fill();
          c.stroke();
        }
        c.strokeStyle = '#8b6034';
        c.lineWidth = 9 * s;
        c.beginPath();
        c.moveTo(x, y - 72 * s);
        c.lineTo(x + width, y - 72 * s);
        c.stroke();
        break;
      }
      case 'shore': {
        const width = d.width || 800;
        c.fillStyle = '#856f46';
        c.fillRect(x, y - 38, width, 38);
        c.fillStyle = '#b59c61';
        c.fillRect(x, y - 38, width, 8);
        for (let i = 0; i < width; i += 43) {
          c.fillStyle = i % 2 ? '#65543a' : '#9b8353';
          c.fillRect(x + i, y - 25 + (i % 4) * 5, 9, 4);
        }
        break;
      }
      case 'patrolShip':
      case 'burningShipFar': {
        const burn = d.type === 'burningShipFar';
        c.fillStyle = '#3e2417';
        c.strokeStyle = '#160d09';
        c.lineWidth = 6 * s;
        c.beginPath();
        c.moveTo(x - 135 * s, y - 68 * s);
        c.lineTo(x + 135 * s, y - 68 * s);
        c.lineTo(x + 100 * s, y);
        c.lineTo(x - 105 * s, y);
        c.closePath();
        c.fill();
        c.stroke();
        c.strokeStyle = '#27160e';
        c.lineWidth = 9 * s;
        c.beginPath();
        c.moveTo(x, y - 68 * s);
        c.lineTo(x, y - 275 * s);
        c.stroke();
        c.fillStyle = 'rgba(202,184,139,.9)';
        c.beginPath();
        c.moveTo(x + 8 * s, y - 260 * s);
        c.lineTo(x + 120 * s, y - 170 * s);
        c.lineTo(x + 8 * s, y - 115 * s);
        c.closePath();
        c.fill();
        if (burn) {
          for (const dx of [-65, 15, 75]) {
            c.fillStyle = '#eb5b2d';
            c.beginPath();
            c.moveTo(x + dx * s - 15, y - 55 * s);
            c.quadraticCurveTo(x + dx * s, y - 120 * s, x + dx * s + 18, y - 50 * s);
            c.fill();
          }
        }
        break;
      }
      case 'powderHold': {
        c.fillStyle = '#50301d';
        c.strokeStyle = '#1f130c';
        c.lineWidth = 5 * s;
        c.fillRect(x - 110 * s, y - 125 * s, 220 * s, 125 * s);
        c.strokeRect(x - 110 * s, y - 125 * s, 220 * s, 125 * s);
        for (let xx = -95; xx < 100; xx += 35) {
          c.fillStyle = '#6d4427';
          c.fillRect(x + xx * s, y - 112 * s, 24 * s, 95 * s);
        }
        c.fillStyle = '#d4af58';
        c.font = `${Math.round(34 * s)}px ui-monospace, monospace`;
        c.textAlign = 'center';
        c.fillText('✦', x, y - 55 * s);
        break;
      }
      default:
        break;
    }
    c.restore();
  };

  // More readable enemy silhouettes and materials while keeping the lightweight vector engine.
  EB.Enemy.prototype.drawBody = function drawEnemyBodyV3(ctx) {
    const hound = this.type === 'hound';
    if (hound) {
      ctx.fillStyle = '#241a14';
      ctx.strokeStyle = '#070605';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(-2, -29, 39, 22, -.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, -41);
      ctx.lineTo(56, -55);
      ctx.lineTo(49, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d5a854';
      ctx.fillRect(47, -46, 5, 4);
      ctx.strokeStyle = '#392619';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-25, -17); ctx.lineTo(-38, 0);
      ctx.moveTo(19, -16); ctx.lineTo(31, 0);
      ctx.stroke();
      return;
    }
    const canoe = this.type === 'canoe';
    if (canoe) {
      ctx.fillStyle = '#51301d';
      ctx.strokeStyle = '#100a07';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-68, -9);
      ctx.quadraticCurveTo(0, 28, 76, -9);
      ctx.lineTo(58, 13);
      ctx.quadraticCurveTo(0, 42, -56, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    const bodyY = canoe ? -64 : -80;
    // legs and boots first
    ctx.fillStyle = '#2d211b';
    ctx.strokeStyle = '#0c0907';
    ctx.lineWidth = 4;
    ctx.fillRect(-20, bodyY + 55, 16, 37);
    ctx.fillRect(4, bodyY + 55, 16, 37);
    ctx.strokeRect(-20, bodyY + 55, 16, 37);
    ctx.strokeRect(4, bodyY + 55, 16, 37);
    ctx.fillStyle = '#16110e';
    ctx.fillRect(-24, bodyY + 84, 22, 10);
    ctx.fillRect(2, bodyY + 84, 24, 10);
    // coat
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#080706';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-23, bodyY);
    ctx.lineTo(23, bodyY);
    ctx.lineTo(29, bodyY + 58);
    ctx.lineTo(-29, bodyY + 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // coat lapels and belt
    ctx.fillStyle = 'rgba(238,215,170,.65)';
    ctx.beginPath();
    ctx.moveTo(-15, bodyY + 3);
    ctx.lineTo(0, bodyY + 29);
    ctx.lineTo(15, bodyY + 3);
    ctx.lineTo(7, bodyY + 3);
    ctx.lineTo(0, bodyY + 15);
    ctx.lineTo(-7, bodyY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = this.armor;
    ctx.fillRect(-28, bodyY + 33, 56, 13);
    ctx.fillStyle = '#d5b86f';
    ctx.fillRect(-3, bodyY + 34, 6, 11);
    // head with hair/helmet
    ctx.fillStyle = '#a97655';
    ctx.strokeStyle = '#090705';
    ctx.lineWidth = 4;
    ctx.fillRect(-16, bodyY - 32, 32, 32);
    ctx.strokeRect(-16, bodyY - 32, 32, 32);
    ctx.fillStyle = this.type === 'officer' || this.elite ? '#a42f28' : '#30251e';
    ctx.beginPath();
    ctx.moveTo(-20, bodyY - 32);
    ctx.lineTo(20, bodyY - 32);
    ctx.lineTo(13, bodyY - 46);
    ctx.lineTo(-11, bodyY - 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // face pixel
    ctx.fillStyle = '#21150f';
    ctx.fillRect(8, bodyY - 20, 5, 3);
    // arms
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-20, bodyY + 10); ctx.lineTo(-34, bodyY + 43);
    ctx.moveTo(20, bodyY + 10); ctx.lineTo(35, bodyY + 38);
    ctx.stroke();
    // weapon
    ctx.strokeStyle = '#19110c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    if (this.weapon === 'arquebus') {
      ctx.moveTo(16, bodyY + 24);
      ctx.lineTo(68, bodyY + 2);
    } else {
      ctx.moveTo(20, bodyY + 23);
      ctx.lineTo(61, bodyY - 19);
    }
    ctx.stroke();
    ctx.strokeStyle = '#9b7642';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, bodyY + 20);
    ctx.lineTo(61, bodyY - 15);
    ctx.stroke();
    if (this.type === 'shield') {
      ctx.fillStyle = '#704a2e';
      ctx.strokeStyle = '#d0b377';
      ctx.lineWidth = 4;
      EB.drawRoundedRect(ctx, -57, bodyY + 2, 38, 57, 8);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(231,204,143,.58)';
      ctx.beginPath();
      ctx.moveTo(-50, bodyY + 30);
      ctx.lineTo(-26, bodyY + 30);
      ctx.stroke();
    }
    if (this.elite || this.type === 'officer') {
      ctx.fillStyle = '#e1bc66';
      ctx.fillRect(13, bodyY - 55, 6, 18);
      ctx.fillStyle = '#b5382e';
      ctx.fillRect(-18, bodyY - 40, 36, 6);
    }
  };

  const legacyBossDraw = EB.Boss.prototype.draw;
  EB.Boss.prototype.draw = function drawBossV3(ctx) {
    if (this.bossType !== 'patrolShip') {
      legacyBossDraw.call(this, ctx);
      return;
    }
    ctx.save();
    ctx.translate(this.centerX(), this.y + this.h);
    if (this.health <= 0) ctx.globalAlpha = Math.max(0, 1 - this.deadTime / 1.2);
    ctx.fillStyle = '#392116';
    ctx.strokeStyle = '#0c0806';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-165, -62);
    ctx.lineTo(155, -62);
    ctx.lineTo(112, 0);
    ctx.lineTo(-125, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#684025';
    ctx.fillRect(-112, -118, 205, 56);
    ctx.strokeRect(-112, -118, 205, 56);
    for (let x = -96; x <= 72; x += 42) {
      ctx.fillStyle = '#1b110c';
      ctx.beginPath();
      ctx.arc(x, -87, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b58446';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.strokeStyle = '#24150e';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(0, -118);
    ctx.lineTo(0, -270);
    ctx.stroke();
    ctx.fillStyle = '#d4c49e';
    ctx.strokeStyle = '#6c5638';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(9, -256);
    ctx.lineTo(132, -150);
    ctx.lineTo(9, -128);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ae3328';
    ctx.beginPath();
    ctx.moveTo(-5, -260);
    ctx.lineTo(-83, -203);
    ctx.lineTo(-5, -155);
    ctx.closePath();
    ctx.fill();
    // visible crew and cannon flashes
    for (const x of [-72, -20, 34, 78]) {
      ctx.fillStyle = '#a97655';
      ctx.fillRect(x - 7, -138, 14, 16);
      ctx.fillStyle = '#8d2f28';
      ctx.fillRect(x - 9, -145, 18, 7);
    }
    if (this.specialCooldown > 1.9) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,192,71,.75)';
      ctx.beginPath();
      ctx.arc(this.facing > 0 ? 160 : -165, -84, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (this.health > 0) this.drawHealth(ctx);
  };

  V3GameScene.prototype.finishGame = function finishGameV3() {
    this.manager.setScene(new V3EndingScene(this.manager));
  };

  // Recover dialogue state even if an individual callback fails. This directly addresses the Potira lock reported in V2.
  LegacyDialogueSystem.prototype.close = function closeV3() {
    const callback = this.onClose;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.reveal = 0;
    this.cooldown = 0;
    this.onClose = null;
    if (this.scene) {
      this.scene.blockPlayer = false;
      if (this.scene.input) this.scene.input.clearAll();
      if (this.scene.player) this.scene.player.interactCooldown = 0.38;
    }
    if (typeof callback === 'function') {
      try { callback(); }
      catch (error) {
        console.error('Callback de diálogo recuperado sem travar a fase:', error);
        if (this.scene) this.scene.blockPlayer = false;
      }
    }
  };

  EB.MenuScene = V3MenuScene;
  EB.OptionsScene = V3OptionsScene;
  EB.PauseScene = V3PauseScene;
  EB.CinematicScene = V3CinematicScene;
  EB.GameScene = V3GameScene;
  EB.EndingScene = V3EndingScene;
  EB.V3BackgroundRenderer = V3BackgroundRenderer;

  const managerProto = EB.SceneManager.prototype;
  managerProto.startNewGame = function startNewGameV3() {
    this.save = EB.createDefaultSave();
    EB.writeSave(this.save);
    this.audio.setVolumes(this.save.settings);
    this.setScene(new V3CinematicScene(this, 'opening', () => this.startLevel('terra_viva', false)));
  };

  managerProto.continueGame = function continueGameV3() {
    const ids = Object.keys(EB.LEVELS);
    const id = ids[EB.clamp(this.save.chapter || 0, 0, ids.length - 1)] || 'terra_viva';
    this.startLevel(id, false);
  };

  managerProto.startLevel = function startLevelV3(id, playIntro = true) {
    const level = EB.LEVELS[id];
    if (!level) {
      this.setScene(new V3MenuScene(this));
      return;
    }
    if (playIntro && level.introCinematic && level.introCinematic !== 'opening') {
      this.setScene(new V3CinematicScene(this, level.introCinematic, () => this.startLevel(id, false)));
    } else {
      this.setScene(new V3GameScene(this, id));
    }
  };

  managerProto.pushPause = function pushPauseV3() {
    if (this.scene instanceof V3GameScene) this.setScene(new EB.PauseScene(this, this.scene));
  };

  // Expose a compact diagnostics function for local testing and school demonstrations.
  EB.runV3Diagnostics = manager => {
    const report = { version: V3.version, passed: true, checks: [] };
    const check = (name, value) => {
      report.checks.push({ name, value: Boolean(value) });
      if (!value) report.passed = false;
    };
    try {
      check('assets loaded', manager.assets.ready);
      check('title background', Boolean(manager.assets.image('titleBackground')));
      check('macaw atlas', Boolean(manager.assets.image('macawAtlas')));
      check('six levels', Object.keys(EB.LEVELS).length >= 6);
      manager.startLevel('terra_viva', false);
      check('V3 game scene', manager.scene instanceof V3GameScene);
      const scene = manager.scene;
      const potira = scene.npcs.find(npc => npc.id === 'potira');
      check('Potira exists', Boolean(potira));
      if (potira) {
        scene.player.x = potira.x - 30;
        scene.player.y = potira.y;
        scene.tryInteract();
        check('Potira dialogue opens', scene.dialogue.active);
        let guard = 0;
        while (scene.dialogue.active && guard < 40) {
          scene.dialogue.reveal = 100000;
          scene.dialogue.next();
          guard += 1;
        }
        check('Potira dialogue closes', !scene.dialogue.active);
        check('player unlocked', !scene.blockPlayer);
        check('Potira objective flag', scene.flags.talked_potira === true);
      }
    } catch (error) {
      report.passed = false;
      report.error = String(error.stack || error);
    }
    manager.setScene(new V3MenuScene(manager));
    return report;
  };
})();
