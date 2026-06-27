(() => {
  'use strict';

  const EB = window.EB = window.EB || {};

  /* -------------------------------------------------------------------------- */
  /* Input                                                                       */
  /* -------------------------------------------------------------------------- */

  class InputController {
    constructor(canvas) {
      this.canvas = canvas;
      this.down = new Set();
      this.pressed = new Set();
      this.released = new Set();
      this.pointer = { x: 0, y: 0, down: false, pressed: false, released: false };
      this.locked = false;
      this.bind();
    }

    bind() {
      window.addEventListener('keydown', event => {
        const code = event.code;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'].includes(code)) {
          event.preventDefault();
        }
        if (!this.down.has(code)) this.pressed.add(code);
        this.down.add(code);
      }, { passive: false });

      window.addEventListener('keyup', event => {
        this.down.delete(event.code);
        this.released.add(event.code);
      });

      const mapPointer = event => {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = (event.clientX - rect.left) * EB.CANVAS_WIDTH / rect.width;
        this.pointer.y = (event.clientY - rect.top) * EB.CANVAS_HEIGHT / rect.height;
      };

      this.canvas.addEventListener('pointerdown', event => {
        mapPointer(event);
        this.pointer.down = true;
        this.pointer.pressed = true;
        this.canvas.focus();
      });
      this.canvas.addEventListener('pointermove', mapPointer);
      window.addEventListener('pointerup', event => {
        mapPointer(event);
        this.pointer.down = false;
        this.pointer.released = true;
      });

      document.querySelectorAll('[data-key]').forEach(button => {
        const code = button.dataset.key;
        const press = event => {
          event.preventDefault();
          if (!this.down.has(code)) this.pressed.add(code);
          this.down.add(code);
          button.classList.add('is-down');
        };
        const release = event => {
          event.preventDefault();
          this.down.delete(code);
          this.released.add(code);
          button.classList.remove('is-down');
        };
        button.addEventListener('pointerdown', press, { passive: false });
        button.addEventListener('pointerup', release, { passive: false });
        button.addEventListener('pointercancel', release, { passive: false });
        button.addEventListener('pointerleave', event => {
          if (event.buttons === 0) release(event);
        }, { passive: false });
      });
    }

    actionDown(action) {
      const keys = EB.KEYS[action] || [];
      return keys.some(code => this.down.has(code));
    }

    actionPressed(action) {
      const keys = EB.KEYS[action] || [];
      return keys.some(code => this.pressed.has(code));
    }

    actionReleased(action) {
      const keys = EB.KEYS[action] || [];
      return keys.some(code => this.released.has(code));
    }

    flush() {
      this.pressed.clear();
      this.released.clear();
      this.pointer.pressed = false;
      this.pointer.released = false;
    }

    clearAll() {
      this.down.clear();
      this.flush();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Camera                                                                      */
  /* -------------------------------------------------------------------------- */

  class Camera {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.shakeTime = 0;
      this.shakePower = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.lookAhead = 0;
    }

    snapTo(target, level) {
      this.x = EB.clamp(target.x + target.w * 0.5 - EB.CANVAS_WIDTH * 0.45, 0, Math.max(0, level.width - EB.CANVAS_WIDTH));
      this.y = 0;
      this.targetX = this.x;
      this.targetY = this.y;
    }

    update(dt, target, level) {
      const facingLead = target.facing * Math.min(190, Math.abs(target.vx) * 0.32);
      this.lookAhead = EB.lerp(this.lookAhead, facingLead, 1 - Math.pow(0.0008, dt));
      this.targetX = target.x + target.w * 0.5 - EB.CANVAS_WIDTH * 0.43 + this.lookAhead;
      this.targetY = target.y + target.h * 0.5 - EB.CANVAS_HEIGHT * 0.55;
      this.targetX = EB.clamp(this.targetX, 0, Math.max(0, level.width - EB.CANVAS_WIDTH));
      this.targetY = EB.clamp(this.targetY, 0, Math.max(0, level.height - EB.CANVAS_HEIGHT));
      this.x = EB.lerp(this.x, this.targetX, 1 - Math.pow(0.00002, dt));
      this.y = EB.lerp(this.y, this.targetY, 1 - Math.pow(0.00002, dt));
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        const falloff = EB.clamp(this.shakeTime / 0.35, 0, 1);
        this.offsetX = EB.random(-this.shakePower, this.shakePower) * falloff;
        this.offsetY = EB.random(-this.shakePower, this.shakePower) * falloff;
      } else {
        this.offsetX = 0;
        this.offsetY = 0;
      }
    }

    shake(power = 12, duration = 0.25) {
      this.shakePower = Math.max(this.shakePower, power);
      this.shakeTime = Math.max(this.shakeTime, duration);
    }

    worldToScreen(x, y) {
      return { x: x - this.x + this.offsetX, y: y - this.y + this.offsetY };
    }

    begin(ctx) {
      ctx.save();
      ctx.translate(-Math.round(this.x) + this.offsetX, -Math.round(this.y) + this.offsetY);
    }

    end(ctx) {
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Particles                                                                   */
  /* -------------------------------------------------------------------------- */

  class Particle {
    constructor(options) {
      Object.assign(this, {
        x: 0, y: 0, vx: 0, vy: 0,
        life: 1, maxLife: 1,
        size: 4, endSize: 0,
        color: '#fff', alpha: 1,
        gravity: 0, drag: 0,
        rotation: 0, spin: 0,
        shape: 'square', glow: 0
      }, options);
      this.maxLife = this.life;
    }

    update(dt) {
      this.life -= dt;
      this.vy += this.gravity * dt;
      const drag = Math.max(0, 1 - this.drag * dt);
      this.vx *= drag;
      this.vy *= drag;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rotation += this.spin * dt;
      return this.life > 0;
    }

    draw(ctx) {
      const t = 1 - this.life / this.maxLife;
      const size = EB.lerp(this.size, this.endSize, t);
      const alpha = this.alpha * Math.pow(1 - t, 0.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      if (this.glow > 0) {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.glow;
      }
      ctx.fillStyle = this.color;
      if (this.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.shape === 'leaf') {
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.shape === 'line') {
        ctx.fillRect(-size * 0.5, -1, size, 2);
      } else {
        ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
      }
      ctx.restore();
    }
  }

  class ParticleSystem {
    constructor() {
      this.items = [];
    }

    add(options) {
      this.items.push(new Particle(options));
    }

    burst(x, y, count, factory) {
      for (let i = 0; i < count; i += 1) this.add(factory(i, x, y));
    }

    hit(x, y, direction = 1, color = '#f1d5a0') {
      this.burst(x, y, 18, () => ({
        x, y,
        vx: EB.random(80, 420) * direction + EB.random(-120, 120),
        vy: EB.random(-360, 220),
        life: EB.random(0.18, 0.52),
        size: EB.random(2, 7),
        endSize: 0,
        color: Math.random() < 0.4 ? '#fff1ba' : color,
        gravity: 680,
        glow: 6
      }));
    }

    blood(x, y, direction = 1) {
      this.burst(x, y, 14, () => ({
        x, y,
        vx: EB.random(60, 300) * direction + EB.random(-100, 100),
        vy: EB.random(-320, 80),
        life: EB.random(0.3, 0.8),
        size: EB.random(2, 7),
        endSize: 1,
        color: EB.choose(['#a52d28', '#c13f2e', '#7c1e23']),
        gravity: 760
      }));
    }

    dust(x, y, direction = 0) {
      this.burst(x, y, 8, () => ({
        x: x + EB.random(-20, 20), y: y + EB.random(-3, 4),
        vx: EB.random(-75, 75) - direction * 40,
        vy: EB.random(-100, -20),
        life: EB.random(0.25, 0.55),
        size: EB.random(5, 13), endSize: EB.random(12, 22),
        color: EB.choose(['#6a5a3d', '#81704b', '#4f4b34']),
        alpha: 0.55, drag: 2, shape: 'circle'
      }));
    }

    splash(x, y) {
      this.burst(x, y, 20, () => ({
        x: x + EB.random(-25, 25), y,
        vx: EB.random(-220, 220), vy: EB.random(-470, -100),
        life: EB.random(0.35, 0.8), size: EB.random(2, 7), endSize: 0,
        color: EB.choose(['#a9e2dd', '#5ab6c1', '#d2f0e7']),
        alpha: 0.8, gravity: 720, shape: Math.random() < 0.45 ? 'line' : 'circle'
      }));
    }

    fire(x, y, amount = 1) {
      for (let i = 0; i < amount; i += 1) {
        this.add({
          x: x + EB.random(-18, 18), y: y + EB.random(-8, 8),
          vx: EB.random(-25, 25), vy: EB.random(-120, -35),
          life: EB.random(0.25, 0.7), size: EB.random(5, 14), endSize: 1,
          color: EB.choose(['#ffcf63', '#f27a32', '#c83a28']),
          alpha: 0.85, drag: 1, shape: 'circle', glow: 10
        });
      }
    }

    leaves(x, y, amount = 1) {
      for (let i = 0; i < amount; i += 1) {
        this.add({
          x: x + EB.random(-40, 40), y: y + EB.random(-20, 20),
          vx: EB.random(-20, 60), vy: EB.random(-50, 30),
          life: EB.random(1.5, 3.5), size: EB.random(3, 8), endSize: EB.random(2, 6),
          color: EB.choose(['#397447', '#6b8849', '#a07432']),
          alpha: 0.65, gravity: 25, drag: 0.15, spin: EB.random(-4, 4), shape: 'leaf'
        });
      }
    }

    update(dt) {
      this.items = this.items.filter(p => p.update(dt));
      if (this.items.length > 1500) this.items.splice(0, this.items.length - 1500);
    }

    draw(ctx) {
      for (const p of this.items) p.draw(ctx);
    }
  }

  class FloatingText {
    constructor(x, y, text, color = '#fff1c4', size = 22) {
      this.x = x; this.y = y; this.text = text; this.color = color; this.size = size;
      this.life = 1; this.maxLife = 1;
    }
    update(dt) { this.life -= dt; this.y -= 55 * dt; return this.life > 0; }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = EB.clamp(this.life / this.maxLife, 0, 1);
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#130d09';
      ctx.lineWidth = 5;
      ctx.font = `900 ${this.size}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.strokeText(this.text, this.x, this.y);
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Core entities                                                               */
  /* -------------------------------------------------------------------------- */

  class BaseEntity {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.vx = 0; this.vy = 0;
      this.active = true; this.visible = true;
      this.facing = 1;
      this.onGround = false;
      this.inWater = false;
      this.previousX = x; this.previousY = y;
    }
    rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    centerX() { return this.x + this.w * 0.5; }
    centerY() { return this.y + this.h * 0.5; }
  }

  class Projectile extends BaseEntity {
    constructor(options) {
      super(options.x, options.y, options.w || 24, options.h || 8);
      this.vx = options.vx || 0;
      this.vy = options.vy || 0;
      this.owner = options.owner || 'player';
      this.damage = options.damage || 10;
      this.life = options.life || 3;
      this.gravity = options.gravity || 0;
      this.kind = options.kind || 'arrow';
      this.pierce = options.pierce || 0;
      this.color = options.color || '#e7c37b';
      this.rotation = Math.atan2(this.vy, this.vx);
      this.hitIds = new Set();
    }

    update(dt, scene) {
      this.life -= dt;
      if (this.life <= 0) { this.active = false; return; }
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rotation = Math.atan2(this.vy, this.vx);
      const r = this.rect();
      for (const platform of scene.solidRects()) {
        if (EB.overlap(r, platform)) {
          this.active = false;
          scene.particles.hit(this.centerX(), this.centerY(), EB.sign(this.vx), '#aa8e63');
          return;
        }
      }
      if (this.owner === 'player') {
        const targets = [...scene.enemies, ...scene.bosses, ...scene.targets, ...scene.powderCaches];
        for (const target of targets) {
          if (!target.active || this.hitIds.has(target.id)) continue;
          if (EB.overlap(r, target.rect())) {
            this.hitIds.add(target.id);
            target.takeDamage(this.damage, EB.sign(this.vx), scene, this.kind);
            if (this.pierce <= 0) { this.active = false; break; }
            this.pierce -= 1;
          }
        }
      } else if (scene.player && EB.overlap(r, scene.player.rect())) {
        scene.player.takeDamage(this.damage, EB.sign(this.vx), scene, this.kind);
        this.active = false;
      }
      if (this.y > scene.level.height + 400 || this.x < -400 || this.x > scene.level.width + 400) this.active = false;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.centerX(), this.centerY());
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.kind === 'bullet' ? 10 : 3;
      if (this.kind === 'bullet') {
        ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = '#fff4bd';
        ctx.fillRect(4, -2, 8, 4);
      } else if (this.kind === 'bomb') {
        ctx.fillStyle = '#211a16';
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ed8b3f'; ctx.fillRect(-2, -17, 4, 8);
      } else {
        ctx.fillRect(-18, -2, 34, 4);
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(8, -7); ctx.lineTo(8, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a73b2a';
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-28, -6); ctx.lineTo(-24, 0); ctx.lineTo(-28, 6); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  class Player extends BaseEntity {
    constructor(x, y, save) {
      super(x, y, 62, 118);
      const base = EB.PLAYER_DEFAULTS;
      const persistent = save.player || {};
      this.maxHealth = persistent.maxHealth || base.maxHealth;
      this.health = this.maxHealth;
      this.maxStamina = base.maxStamina;
      this.stamina = this.maxStamina;
      this.maxBreath = persistent.maxBreath || base.maxBreath;
      this.breath = this.maxBreath;
      this.moveSpeed = base.moveSpeed;
      this.airSpeed = base.airSpeed;
      this.swimSpeed = base.swimSpeed;
      this.jumpSpeed = base.jumpSpeed;
      this.dashSpeed = base.dashSpeed;
      this.dashDuration = base.dashDuration;
      this.dashCooldownMax = persistent.dashCooldown || base.dashCooldown;
      this.meleeDamage = persistent.meleeDamage || base.meleeDamage;
      this.arrowDamage = persistent.arrowDamage || base.arrowDamage;
      this.maxArrows = persistent.maxArrows || base.maxArrows;
      this.arrows = this.maxArrows;
      this.maxHerbs = persistent.maxHerbs || base.maxHerbs;
      this.herbs = Math.min(this.maxHerbs, 2);
      this.healAmount = persistent.healAmount || base.healAmount;
      this.state = 'idle';
      this.animator = new EB.SpriteAnimator();
      this.attackTime = 0;
      this.attackCooldown = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.invulnerable = 0;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.hitStop = 0;
      this.dead = false;
      this.deathTimer = 0;
      this.interactCooldown = 0;
      this.wallSide = 0;
      this.justLanded = false;
      this.attackHit = new Set();
      this.trail = [];
      this.wasInWater = false;
      this.waterSurface = null;
    }

    update(dt, scene) {
      if (this.dead) {
        this.deathTimer += dt;
        this.vy += EB.GRAVITY * dt;
        scene.moveEntity(this, dt);
        this.animator.play('death');
        this.animator.update(dt);
        if (this.deathTimer > 2.2 && !scene.deathHandled) scene.handleDeath();
        return;
      }

      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.interactCooldown = Math.max(0, this.interactCooldown - dt);
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      this.coyote = this.onGround ? EB.PLAYER_DEFAULTS.coyoteTime : Math.max(0, this.coyote - dt);
      this.stamina = Math.min(this.maxStamina, this.stamina + 34 * dt);

      if (scene.dialogue.active || scene.blockPlayer) {
        this.vx = EB.approach(this.vx, 0, 1700 * dt);
        this.vy += this.inWater ? 0 : EB.GRAVITY * dt;
        scene.moveEntity(this, dt);
        this.selectAnimation();
        this.animator.update(dt);
        return;
      }

      const input = scene.input;
      if (input.actionPressed('jump')) this.jumpBuffer = EB.PLAYER_DEFAULTS.jumpBuffer;
      if (input.actionPressed('pause')) { scene.manager.pushPause(); return; }
      if (input.actionPressed('heal')) this.heal(scene);
      if (input.actionPressed('attack')) this.beginAttack(scene);
      if (input.actionPressed('bow')) this.fireArrow(scene);
      if (input.actionPressed('dash')) this.beginDash(scene);
      if (input.actionPressed('interact') && this.interactCooldown <= 0) scene.tryInteract();

      if (this.dashTime > 0) {
        this.dashTime -= dt;
        this.vx = this.facing * this.dashSpeed;
        this.vy *= 0.4;
        this.invulnerable = Math.max(this.invulnerable, 0.08);
        this.trail.push({ x: this.x, y: this.y, frame: this.animator.currentFrameIndex(), life: 0.18 });
      } else if (this.attackTime > 0) {
        this.attackTime -= dt;
        const move = (input.actionDown('right') ? 1 : 0) - (input.actionDown('left') ? 1 : 0);
        this.vx = EB.approach(this.vx, move * this.moveSpeed * 0.35, 1600 * dt);
        this.performAttackHit(scene);
      } else if (this.inWater) {
        this.updateSwimming(dt, scene);
      } else {
        this.updateGroundMovement(dt, scene);
      }

      this.wasInWater = this.inWater;
      scene.moveEntity(this, dt);

      if (!this.inWater && this.previousY + this.h <= this.y + this.h && this.onGround && Math.abs(this.vy) > 600) {
        scene.particles.dust(this.centerX(), this.y + this.h, this.facing);
      }
      if (this.y > scene.level.height + 300) this.takeDamage(this.maxHealth, 0, scene, 'fall');

      for (const trail of this.trail) trail.life -= dt;
      this.trail = this.trail.filter(t => t.life > 0);
      this.selectAnimation();
      this.animator.update(dt);
    }

    updateGroundMovement(dt, scene) {
      const input = scene.input;
      const axis = (input.actionDown('right') ? 1 : 0) - (input.actionDown('left') ? 1 : 0);
      if (axis !== 0) this.facing = axis;
      const target = axis * (this.onGround ? this.moveSpeed : this.airSpeed);
      const acceleration = this.onGround ? 2900 : 1450;
      const deceleration = this.onGround ? 3400 : 700;
      this.vx = EB.approach(this.vx, target, (axis !== 0 ? acceleration : deceleration) * dt);
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.onGround = false;
        this.vy = -this.jumpSpeed;
        scene.audio.sfx('jump');
        scene.particles.dust(this.centerX(), this.y + this.h, this.facing);
      }
      if (input.actionReleased('jump') && this.vy < -280) this.vy *= 0.48;
      this.vy = Math.min(EB.TERMINAL_VELOCITY, this.vy + EB.GRAVITY * dt);
    }

    updateSwimming(dt, scene) {
      const input = scene.input;
      const horizontal = (input.actionDown('right') ? 1 : 0) - (input.actionDown('left') ? 1 : 0);
      const vertical = (input.actionDown('down') ? 1 : 0) - (input.actionDown('up') ? 1 : 0);
      if (horizontal !== 0) this.facing = horizontal;
      this.vx = EB.approach(this.vx, horizontal * this.swimSpeed, 1050 * dt);
      this.vy = EB.approach(this.vy, vertical * this.swimSpeed, 1050 * dt);
      if (vertical === 0) this.vy = EB.approach(this.vy, -24, 190 * dt);
      if (this.waterSurface !== null && this.y + 20 > this.waterSurface + 28) {
        this.breath -= dt;
      } else {
        this.breath = Math.min(this.maxBreath, this.breath + dt * 3.3);
      }
      if (this.breath <= 0) {
        this.breath = 0;
        this.takeDamage(9, 0, scene, 'drowning');
        this.invulnerable = 1.1;
      }
      if (input.actionPressed('jump') && this.waterSurface !== null && this.y < this.waterSurface + 65) {
        this.vy = -560;
        this.inWater = false;
        scene.particles.splash(this.centerX(), this.waterSurface);
      }
    }

    beginAttack(scene) {
      if (this.attackCooldown > 0 || this.dashTime > 0) return;
      this.combo = this.comboTimer > 0 ? (this.combo % 3) + 1 : 1;
      this.comboTimer = 0.52;
      this.attackTime = this.combo === 3 ? 0.38 : 0.29;
      this.attackCooldown = this.combo === 3 ? 0.44 : 0.29;
      this.attackHit.clear();
      this.vx += this.facing * (this.combo === 3 ? 170 : 95);
      scene.audio.sfx('swing');
    }

    performAttackHit(scene) {
      const progress = 1 - this.attackTime / (this.combo === 3 ? 0.38 : 0.29);
      if (progress < 0.22 || progress > 0.78) return;
      const reach = this.combo === 3 ? 118 : 96;
      const hitbox = {
        x: this.facing > 0 ? this.x + this.w - 6 : this.x - reach + 6,
        y: this.y + 18,
        w: reach,
        h: this.h - 30
      };
      const targets = [...scene.enemies, ...scene.bosses, ...scene.targets, ...scene.powderCaches];
      for (const target of targets) {
        if (!target.active || this.attackHit.has(target.id)) continue;
        if (EB.overlap(hitbox, target.rect())) {
          this.attackHit.add(target.id);
          const damage = Math.round(this.meleeDamage * (this.combo === 3 ? 1.55 : this.combo === 2 ? 1.18 : 1));
          target.takeDamage(damage, this.facing, scene, 'melee');
          this.vx -= this.facing * 35;
          scene.hitStop = Math.max(scene.hitStop, this.combo === 3 ? 0.075 : 0.045);
        }
      }
    }

    fireArrow(scene) {
      if (this.arrows <= 0 || this.attackCooldown > 0 || this.dashTime > 0) {
        if (this.arrows <= 0) scene.addFloat(this.centerX(), this.y, 'SEM FLECHAS', '#d99262', 16);
        return;
      }
      this.arrows -= 1;
      this.attackCooldown = 0.36;
      scene.projectiles.push(new Projectile({
        x: this.facing > 0 ? this.x + this.w : this.x - 28,
        y: this.y + 38,
        vx: this.facing * 960,
        vy: -18,
        owner: 'player', damage: this.arrowDamage, kind: 'arrow', gravity: 105, pierce: 0
      }));
      scene.save.stats.arrowsFired += 1;
      scene.audio.sfx('arrow');
    }

    beginDash(scene) {
      if (this.dashCooldown > 0 || this.stamina < 26 || this.attackTime > 0) return;
      const inputAxis = (scene.input.actionDown('right') ? 1 : 0) - (scene.input.actionDown('left') ? 1 : 0);
      if (inputAxis !== 0) this.facing = inputAxis;
      this.stamina -= 26;
      this.dashTime = this.dashDuration;
      this.dashCooldown = this.dashCooldownMax;
      this.invulnerable = Math.max(this.invulnerable, this.dashDuration + 0.08);
      scene.audio.sfx('dash');
      scene.particles.dust(this.centerX(), this.y + this.h, this.facing);
    }

    heal(scene) {
      if (this.herbs <= 0 || this.health >= this.maxHealth || this.attackTime > 0) return;
      this.herbs -= 1;
      const old = this.health;
      this.health = Math.min(this.maxHealth, this.health + this.healAmount);
      scene.addFloat(this.centerX(), this.y - 10, `+${this.health - old}`, '#82d283', 24);
      scene.particles.burst(this.centerX(), this.centerY(), 22, () => ({
        x: this.centerX() + EB.random(-25, 25), y: this.centerY() + EB.random(-20, 30),
        vx: EB.random(-50, 50), vy: EB.random(-150, -40), life: EB.random(0.5, 1),
        size: EB.random(3, 8), endSize: 0, color: '#76c77d', glow: 8, shape: 'leaf'
      }));
      scene.audio.sfx('heal');
    }

    takeDamage(amount, direction, scene, source = 'hit') {
      if (this.invulnerable > 0 || this.dead) return false;
      this.health -= amount;
      this.invulnerable = EB.PLAYER_DEFAULTS.invulnerability;
      this.vx = direction * 420;
      this.vy = -330;
      scene.particles.blood(this.centerX(), this.y + 46, direction || 1);
      scene.particles.hit(this.centerX(), this.y + 46, direction || 1, '#f0d29c');
      scene.camera.shake(16, 0.3);
      scene.audio.sfx(source === 'bullet' ? 'hurt' : 'hurt');
      scene.addFloat(this.centerX(), this.y, `-${amount}`, '#ef6b50', 24);
      if (this.health <= 0) {
        this.health = 0;
        this.dead = true;
        this.vx = direction * 330;
        this.vy = -450;
        scene.audio.sfx('death');
      }
      return true;
    }

    selectAnimation() {
      if (this.dead) this.animator.play('death');
      else if (this.inWater) this.animator.play('swim');
      else if (!this.onGround && this.vy < 0) this.animator.play('jump');
      else if (!this.onGround) this.animator.play('fall');
      else if (Math.abs(this.vx) > 290) this.animator.play('sprint');
      else if (Math.abs(this.vx) > 35) this.animator.play('run');
      else this.animator.play('idle');
    }

    draw(ctx, assets) {
      const atlas = assets.image('aimbereAtlas');
      for (const trail of this.trail) {
        this.drawFrame(ctx, atlas, trail.frame, trail.x, trail.y, 0.25 * trail.life / 0.18, true);
      }
      const blink = this.invulnerable > 0 && Math.floor(this.invulnerable * 22) % 2 === 0;
      if (!blink) this.drawFrame(ctx, atlas, this.animator.currentFrameIndex(), this.x, this.y, 1, false);
      if (this.attackTime > 0) this.drawAttackArc(ctx);
    }

    drawFrame(ctx, atlas, frameIndex, x, y, alpha, ghost) {
      const frame = EB.AIMBERE_FRAMES[frameIndex] || EB.AIMBERE_FRAMES[0];
      const targetH = 142;
      const scale = targetH / frame.h;
      const targetW = frame.w * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + this.w * 0.5, y + this.h);
      ctx.scale(this.facing, 1);
      if (ghost) { ctx.globalCompositeOperation = 'screen'; ctx.filter = 'hue-rotate(130deg) saturate(1.6)'; }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -targetW * 0.5, -targetH, targetW, targetH);
      ctx.restore();
    }

    drawAttackArc(ctx) {
      const total = this.combo === 3 ? 0.38 : 0.29;
      const p = 1 - this.attackTime / total;
      ctx.save();
      ctx.translate(this.centerX(), this.y + 54);
      ctx.scale(this.facing, 1);
      ctx.strokeStyle = this.combo === 3 ? 'rgba(255,201,95,0.85)' : 'rgba(242,224,173,0.62)';
      ctx.lineWidth = this.combo === 3 ? 9 : 6;
      ctx.shadowColor = '#ffd76e'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, this.combo === 3 ? 104 : 82, -1.35 + p * 1.8, -0.25 + p * 1.8);
      ctx.stroke();
      ctx.restore();
    }
  }

  class Enemy extends BaseEntity {
    constructor(data) {
      const archetype = EB.ENEMY_ARCHETYPES[data.type] || EB.ENEMY_ARCHETYPES.sailor;
      const isHound = data.type === 'hound';
      super(data.x, data.y - (isHound ? 58 : 105), isHound ? 82 : 62, isHound ? 58 : 105);
      this.id = data.id;
      this.type = data.type;
      this.archetype = archetype;
      this.health = archetype.health * (data.elite ? 1.25 : 1);
      this.maxHealth = this.health;
      this.speed = archetype.speed;
      this.damage = archetype.damage;
      this.range = archetype.range;
      this.vision = archetype.vision;
      this.color = archetype.color;
      this.armor = archetype.armor;
      this.weapon = archetype.weapon;
      this.elite = Boolean(data.elite);
      this.originX = data.x;
      this.patrol = data.patrol || 150;
      this.state = 'patrol';
      this.stateTime = EB.random(0, 1);
      this.attackCooldown = EB.random(0.2, 1.2);
      this.hurtTime = 0;
      this.deadTime = 0;
      this.deathAwarded = false;
      this.notice = 0;
      this.onGround = false;
      this.phase = EB.random(0, 10);
    }

    update(dt, scene) {
      if (!this.active) return;
      if (this.health <= 0) {
        this.deadTime += dt;
        this.vy += EB.GRAVITY * dt;
        this.vx *= Math.pow(0.03, dt);
        scene.moveEntity(this, dt);
        if (this.deadTime > 1.2) this.active = false;
        return;
      }
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.hurtTime = Math.max(0, this.hurtTime - dt);
      this.stateTime += dt;
      const player = scene.player;
      const dx = player.centerX() - this.centerX();
      const dy = player.centerY() - this.centerY();
      const distance = Math.hypot(dx, dy);
      const canSee = distance < this.vision && Math.abs(dy) < 260 && !player.dead;
      if (canSee) { this.state = 'chase'; this.notice = Math.min(1, this.notice + dt * 4); }
      else this.notice = Math.max(0, this.notice - dt * 1.5);

      if (this.hurtTime <= 0) {
        if (this.type === 'arquebusier' || this.type === 'canoe') this.updateRanged(dt, scene, dx, dy, distance);
        else this.updateMelee(dt, scene, dx, dy, distance);
      }
      if (this.type !== 'canoe') {
        this.vy = Math.min(EB.TERMINAL_VELOCITY, this.vy + EB.GRAVITY * dt);
        scene.moveEntity(this, dt);
      } else {
        this.x += this.vx * dt;
        this.y += Math.sin(scene.time * 2 + this.phase) * 8 * dt;
      }
    }

    updateMelee(dt, scene, dx, dy, distance) {
      if (this.state === 'chase') {
        this.facing = dx >= 0 ? 1 : -1;
        if (distance > this.range) this.vx = EB.approach(this.vx, this.facing * this.speed, 1200 * dt);
        else {
          this.vx = EB.approach(this.vx, 0, 1900 * dt);
          if (this.attackCooldown <= 0) this.attack(scene);
        }
      } else {
        const left = this.originX - this.patrol;
        const right = this.originX + this.patrol;
        if (this.x < left) this.facing = 1;
        if (this.x > right) this.facing = -1;
        this.vx = EB.approach(this.vx, this.facing * this.speed * 0.42, 550 * dt);
      }
    }

    updateRanged(dt, scene, dx, dy, distance) {
      this.facing = dx >= 0 ? 1 : -1;
      if (this.state === 'chase') {
        if (distance < 250) this.vx = EB.approach(this.vx, -this.facing * this.speed, 700 * dt);
        else if (distance > this.range * 0.78) this.vx = EB.approach(this.vx, this.facing * this.speed * 0.55, 500 * dt);
        else this.vx = EB.approach(this.vx, 0, 800 * dt);
        if (distance < this.range && this.attackCooldown <= 0 && Math.abs(dy) < 170) this.shoot(scene, dx, dy);
      } else {
        this.vx = Math.sin(this.stateTime * 0.65) * 35;
      }
    }

    attack(scene) {
      this.attackCooldown = this.type === 'hound' ? 1.1 : this.type === 'elite' ? 0.8 : 1.35;
      const lunge = this.type === 'hound' ? 520 : 290;
      this.vx = this.facing * lunge;
      const delay = this.type === 'hound' ? 0.16 : 0.25;
      scene.delayed.push({ time: delay, fn: () => {
        if (!this.active || this.health <= 0) return;
        const hitbox = { x: this.facing > 0 ? this.x + this.w - 8 : this.x - this.range + 8, y: this.y + 12, w: this.range, h: this.h - 14 };
        if (EB.overlap(hitbox, scene.player.rect())) scene.player.takeDamage(this.damage, this.facing, scene, 'melee');
      }});
      scene.audio.sfx('swing');
    }

    shoot(scene, dx, dy) {
      this.attackCooldown = this.type === 'canoe' ? 1.7 : 2.15;
      const speed = this.type === 'canoe' ? 620 : 760;
      const angle = Math.atan2(dy, dx);
      scene.projectiles.push(new Projectile({
        x: this.centerX(), y: this.y + 34,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        owner: 'enemy', damage: this.damage, kind: 'bullet', life: 2.2, color: '#ffc870'
      }));
      scene.audio.sfx('gun');
      scene.camera.shake(3, 0.08);
    }

    takeDamage(amount, direction, scene, source) {
      if (this.health <= 0) return;
      this.health -= amount;
      this.hurtTime = 0.18;
      this.state = 'chase';
      this.vx = direction * (source === 'arrow' ? 220 : 330);
      this.vy = -190;
      scene.particles.hit(this.centerX(), this.centerY(), direction, '#d2c09b');
      scene.particles.blood(this.centerX(), this.centerY(), direction);
      scene.audio.sfx('hit');
      scene.addFloat(this.centerX(), this.y, String(amount), '#ffe0a0', 20);
      if (this.health <= 0) this.die(scene, direction);
    }

    die(scene, direction) {
      this.health = 0;
      this.vx = direction * 430;
      this.vy = -390;
      if (!this.deathAwarded) {
        this.deathAwarded = true;
        scene.counters.enemiesDefeated = (scene.counters.enemiesDefeated || 0) + 1;
        scene.save.stats.enemiesDefeated += 1;
        scene.particles.burst(this.centerX(), this.centerY(), 14, () => ({
          x: this.centerX(), y: this.centerY(), vx: EB.random(-240, 240), vy: EB.random(-330, 80),
          life: EB.random(0.35, 0.8), size: EB.random(2, 8), endSize: 0,
          color: this.elite ? '#f1b34f' : '#8c7659', gravity: 600
        }));
      }
    }

    draw(ctx) {
      const dead = this.health <= 0;
      ctx.save();
      ctx.translate(this.centerX(), this.y + this.h);
      ctx.scale(this.facing, 1);
      if (dead) { ctx.rotate(Math.min(1.3, this.deadTime * 2.4) * -this.facing); ctx.globalAlpha = Math.max(0, 1 - this.deadTime / 1.2); }
      if (this.hurtTime > 0) ctx.filter = 'brightness(2.1) saturate(0.2)';
      this.drawBody(ctx);
      ctx.restore();
      if (!dead && this.health < this.maxHealth) this.drawHealth(ctx);
      if (this.notice > 0.2 && this.state === 'chase') {
        ctx.save(); ctx.globalAlpha = this.notice; ctx.fillStyle = '#f4c86d'; ctx.font = '900 26px monospace'; ctx.textAlign = 'center'; ctx.fillText('!', this.centerX(), this.y - 18); ctx.restore();
      }
    }

    drawBody(ctx) {
      const hound = this.type === 'hound';
      if (hound) {
        ctx.fillStyle = '#2b2018'; ctx.strokeStyle = '#0a0806'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(0, -28, 38, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30,-38); ctx.lineTo(54,-52); ctx.lineTo(45,-22); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#d4a358'; ctx.fillRect(44,-44,5,4);
        ctx.strokeStyle='#3a2a1b'; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(-25,-15); ctx.lineTo(-36,0); ctx.moveTo(18,-15); ctx.lineTo(30,0); ctx.stroke();
        return;
      }
      const canoe = this.type === 'canoe';
      if (canoe) {
        ctx.fillStyle='#4e2f1c'; ctx.strokeStyle='#160f0b'; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(-60,-8); ctx.quadraticCurveTo(0,24,70,-8); ctx.lineTo(55,12); ctx.quadraticCurveTo(0,40,-52,10); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const bodyY = canoe ? -62 : -78;
      ctx.fillStyle = this.color; ctx.strokeStyle = '#0b0a08'; ctx.lineWidth = 5;
      ctx.fillRect(-20, bodyY, 40, 58); ctx.strokeRect(-20, bodyY, 40, 58);
      ctx.fillStyle = '#b98661'; ctx.fillRect(-15, bodyY - 30, 30, 30); ctx.strokeRect(-15, bodyY - 30, 30, 30);
      ctx.fillStyle = this.armor; ctx.fillRect(-24, bodyY + 6, 48, 16);
      ctx.fillStyle = '#442d22'; ctx.fillRect(-19, bodyY + 58, 16, 32); ctx.fillRect(3, bodyY + 58, 16, 32);
      ctx.strokeStyle = '#17100c'; ctx.lineWidth = 6;
      ctx.beginPath();
      if (this.weapon === 'arquebus') { ctx.moveTo(12, bodyY + 18); ctx.lineTo(60, bodyY - 2); }
      else { ctx.moveTo(15, bodyY + 15); ctx.lineTo(55, bodyY - 20); }
      ctx.stroke();
      if (this.type === 'shield') {
        ctx.fillStyle='#6a4b32'; ctx.strokeStyle='#c0aa7a'; ctx.lineWidth=4; ctx.beginPath(); ctx.roundRect(-52,bodyY+4,34,52,8); ctx.fill(); ctx.stroke();
      }
      if (this.elite || this.type === 'officer') {
        ctx.fillStyle='#b3312b'; ctx.fillRect(-18,bodyY-37,36,8); ctx.fillStyle='#d5b56e'; ctx.fillRect(13,bodyY-46,6,17);
      }
    }

    drawHealth(ctx) {
      const w = 62; const p = EB.clamp(this.health / this.maxHealth, 0, 1);
      ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(this.centerX()-w/2,this.y-13,w,7);
      ctx.fillStyle=this.elite?'#e6ae48':'#b83b32'; ctx.fillRect(this.centerX()-w/2+1,this.y-12,(w-2)*p,5);
    }
  }

  class Boss extends Enemy {
    constructor(type, id, x, y) {
      const definition = EB.BOSS_ARCHETYPES[type] || EB.BOSS_ARCHETYPES.landingCaptain;
      super({ id, type: 'officer', x, y, patrol: 300, elite: true });
      this.bossType = type;
      this.definition = definition;
      this.maxHealth = definition.health;
      this.health = this.maxHealth;
      this.damage = definition.damage;
      this.speed = definition.speed;
      this.name = definition.name;
      this.w = type === 'patrolShip' ? 300 : 88;
      this.h = type === 'patrolShip' ? 125 : 142;
      this.y = y - this.h;
      this.phaseIndex = 0;
      this.specialCooldown = 1.4;
      this.patternTimer = 0;
      this.intro = 0.9;
      this.enraged = false;
    }

    update(dt, scene) {
      if (this.health <= 0) { super.update(dt, scene); return; }
      this.intro = Math.max(0, this.intro - dt);
      this.specialCooldown -= dt;
      this.patternTimer += dt;
      const ratio = this.health / this.maxHealth;
      this.phaseIndex = ratio < 0.33 ? 2 : ratio < 0.67 ? 1 : 0;
      this.enraged = this.phaseIndex >= 2;
      if (this.intro > 0) { this.vx = 0; return; }
      if (this.bossType === 'patrolShip') this.updateShip(dt, scene);
      else this.updateCaptain(dt, scene);
      if (this.bossType !== 'patrolShip') {
        this.vy = Math.min(EB.TERMINAL_VELOCITY, this.vy + EB.GRAVITY * dt);
        scene.moveEntity(this, dt);
      }
    }

    updateCaptain(dt, scene) {
      const p = scene.player;
      const dx = p.centerX() - this.centerX();
      const dist = Math.abs(dx);
      this.facing = dx >= 0 ? 1 : -1;
      if (this.specialCooldown <= 0) {
        const choice = this.phaseIndex === 0 ? EB.choose(['dash','shot']) : this.phaseIndex === 1 ? EB.choose(['dash','shot','bomb']) : EB.choose(['dash','shot','bomb','volley']);
        if (choice === 'dash') {
          this.vx = this.facing * (660 + this.phaseIndex * 90);
          this.specialCooldown = 1.35 - this.phaseIndex * 0.15;
          scene.delayed.push({ time: 0.18, fn: () => {
            if (this.health > 0 && EB.overlap({x:this.x-15,y:this.y,w:this.w+30,h:this.h}, p.rect())) p.takeDamage(this.damage+5,this.facing,scene,'melee');
          }});
          scene.audio.sfx('swing');
        } else if (choice === 'shot') {
          this.shootBoss(scene, 1);
          this.specialCooldown = 1.45;
        } else if (choice === 'bomb') {
          this.throwBomb(scene);
          this.specialCooldown = 1.8;
        } else {
          this.shootBoss(scene, 3);
          this.specialCooldown = 2.0;
        }
      } else {
        if (dist > 155) this.vx = EB.approach(this.vx, this.facing * this.speed, 1250 * dt);
        else this.vx = EB.approach(this.vx, 0, 1800 * dt);
      }
    }

    shootBoss(scene, count) {
      for (let i=0;i<count;i+=1) {
        const angle = Math.atan2(scene.player.centerY()-this.centerY(),scene.player.centerX()-this.centerX()) + (i-(count-1)/2)*0.12;
        scene.delayed.push({time:i*0.12,fn:()=>{
          if(this.health<=0)return;
          scene.projectiles.push(new Projectile({x:this.centerX(),y:this.y+45,vx:Math.cos(angle)*880,vy:Math.sin(angle)*880,owner:'enemy',damage:this.damage,kind:'bullet',life:2}));
          scene.audio.sfx('gun'); scene.camera.shake(5,0.1);
        }});
      }
    }

    throwBomb(scene) {
      const dx=scene.player.centerX()-this.centerX();
      scene.projectiles.push(new Projectile({x:this.centerX(),y:this.y+25,vx:EB.clamp(dx*0.8,-520,520),vy:-570,owner:'enemy',damage:this.damage+9,kind:'bomb',gravity:900,life:1.45,color:'#e46d35'}));
      scene.audio.sfx('swing');
    }

    updateShip(dt, scene) {
      const center = 8600;
      this.x = center + Math.sin(scene.time*0.7)*230;
      this.y = 495 + Math.sin(scene.time*1.4)*18;
      this.facing = scene.player.centerX() >= this.centerX() ? 1 : -1;
      if(this.specialCooldown<=0){
        const volleys=this.phaseIndex+2;
        for(let i=0;i<volleys;i+=1){
          scene.delayed.push({time:i*0.18,fn:()=>{
            if(this.health<=0)return;
            const angle=Math.atan2(scene.player.centerY()-this.centerY(),scene.player.centerX()-this.centerX())+EB.random(-0.08,0.08);
            scene.projectiles.push(new Projectile({x:this.centerX(),y:this.centerY(),vx:Math.cos(angle)*690,vy:Math.sin(angle)*690,owner:'enemy',damage:this.damage,kind:'bullet',life:2.4}));
            scene.audio.sfx('gun');
          }});
        }
        this.specialCooldown=2.4-this.phaseIndex*0.35;
      }
    }

    takeDamage(amount, direction, scene, source) {
      super.takeDamage(amount, direction, scene, source);
      if (this.health > 0 && this.health / this.maxHealth < 0.34 && !this.phaseWarned) {
        this.phaseWarned = true;
        scene.camera.shake(20,0.5);
        scene.addFloat(this.centerX(),this.y-30,'ÚLTIMA FASE','#f35d35',30);
      }
    }

    die(scene,direction){
      super.die(scene,direction);
      const flag=this.id.replace(/^boss_/,'boss_')+'_dead';
      scene.flags[flag]=true;
      scene.flags[`${this.id}_dead`]=true;
      scene.audio.sfx('explosion');
      scene.audio.playTheme(scene.level.theme);
      scene.camera.shake(30,0.8);
      scene.particles.burst(this.centerX(),this.centerY(),70,()=>({x:this.centerX(),y:this.centerY(),vx:EB.random(-500,500),vy:EB.random(-600,180),life:EB.random(.6,1.5),size:EB.random(3,14),endSize:0,color:EB.choose(['#ffcf63','#e35b32','#d8c28d']),gravity:650,glow:8}));
    }

    draw(ctx) {
      if(this.bossType==='patrolShip'){
        ctx.save();ctx.translate(this.centerX(),this.y+this.h);
        ctx.fillStyle='#382117';ctx.strokeStyle='#100b08';ctx.lineWidth=8;
        ctx.beginPath();ctx.moveTo(-150,-55);ctx.lineTo(140,-55);ctx.lineTo(105,0);ctx.lineTo(-115,0);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='#5e3920';ctx.fillRect(-95,-105,170,50);ctx.strokeRect(-95,-105,170,50);
        ctx.strokeStyle='#2b1b12';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,-105);ctx.lineTo(0,-230);ctx.stroke();
        ctx.fillStyle='#d7c7a2';ctx.beginPath();ctx.moveTo(7,-220);ctx.lineTo(105,-110);ctx.lineTo(7,-110);ctx.closePath();ctx.fill();
        ctx.fillStyle='#b73c2d';ctx.fillRect(-62,-90,22,12);ctx.fillRect(22,-90,22,12);
        ctx.restore();
        if(this.health>0)this.drawHealth(ctx);
      } else super.draw(ctx);
    }
  }

  class NPC extends BaseEntity {
    constructor(data) {
      super(data.x, data.y - 108, 58, 108);
      this.id=data.id; this.name=data.name; this.dialogueId=data.dialogue; this.kind=data.kind||'villager'; this.interact=data.interact!==false;
      this.phase=EB.random(0,10); this.talked=false;
    }
    update(dt){this.phase+=dt;}
    tryInteract(scene){
      if(!this.interact)return false;
      const opened=scene.dialogue.openById(this.dialogueId,()=>{
        this.talked=true;
        scene.flags[`talked_${this.id}`]=true;
        if(this.id==='potira')scene.flags.talked_potira=true;
        if(this.id==='elder')scene.flags.talked_elder=true;
        if(this.id.startsWith('messenger_'))scene.flags[`talked_${this.id}`]=true;
        scene.input.clearAll();
        scene.player.interactCooldown=.4;
      });
      return opened;
    }
    draw(ctx,near){
      ctx.save();ctx.translate(this.centerX(),this.y+this.h+Math.sin(this.phase*2)*2);
      const potira=this.kind==='potira'; const elder=this.kind==='elder';
      ctx.fillStyle=potira?'#7f392c':elder?'#5f5035':'#6d4630';ctx.strokeStyle='#130e0a';ctx.lineWidth=5;
      ctx.fillRect(-18,-72,36,58);ctx.strokeRect(-18,-72,36,58);
      ctx.fillStyle=potira?'#9b5f43':'#9b6a48';ctx.fillRect(-14,-102,28,30);ctx.strokeRect(-14,-102,28,30);
      ctx.fillStyle=potira?'#d9b058':elder?'#bdcc9a':'#d4c27e';ctx.fillRect(-23,-61,46,10);
      if(potira){ctx.fillStyle='#17100d';ctx.fillRect(-17,-108,34,12);ctx.fillRect(-22,-99,8,30);}
      if(elder){ctx.strokeStyle='#baa777';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(15,-65);ctx.lineTo(32,0);ctx.stroke();}
      ctx.fillStyle='#3d2b1b';ctx.fillRect(-17,-14,13,20);ctx.fillRect(4,-14,13,20);
      ctx.restore();
      if(near&&this.interact){
        ctx.save();ctx.fillStyle='rgba(6,17,13,.9)';ctx.strokeStyle='#e4bc69';ctx.lineWidth=2;EB.drawRoundedRect(ctx,this.centerX()-86,this.y-48,172,34,8);ctx.fill();ctx.stroke();ctx.fillStyle='#f4dfad';ctx.font='800 16px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(`E  •  ${this.name}`,this.centerX(),this.y-25);ctx.restore();
      }
    }
  }

  class TrainingTarget extends BaseEntity {
    constructor(data){super(data.x,data.y-110,60,110);this.id=data.id;this.hits=0;this.required=data.hitsRequired||1;this.wobble=0;}
    update(dt){this.wobble=EB.approach(this.wobble,0,4*dt);}
    takeDamage(amount,direction,scene){this.hits+=1;this.wobble=direction*.32;scene.counters.targetHits=(scene.counters.targetHits||0)+1;scene.particles.hit(this.centerX(),this.centerY(),direction,'#d0a75e');scene.audio.sfx('hit');}
    draw(ctx){ctx.save();ctx.translate(this.centerX(),this.y+this.h);ctx.rotate(this.wobble);ctx.strokeStyle='#3b2616';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-80);ctx.stroke();ctx.fillStyle='#af7741';ctx.strokeStyle='#21140e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-85,28,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#e0c16e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-85,17,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }

  class Collectible extends BaseEntity {
    constructor(data){super(data.x,data.y-34,34,34);this.id=data.id;this.type=data.type;this.amount=data.amount||1;this.phase=EB.random(0,10);this.collected=false;}
    update(dt,scene){this.phase+=dt;if(!this.collected&&EB.distance(this.centerX(),this.centerY(),scene.player.centerX(),scene.player.centerY())<60)this.collect(scene);}
    collect(scene){this.collected=true;this.active=false;if(this.type==='herb'){scene.player.herbs=Math.min(scene.player.maxHerbs,scene.player.herbs+this.amount);scene.counters.herbs=(scene.counters.herbs||0)+this.amount;}else if(this.type==='arrows'){scene.player.arrows=Math.min(scene.player.maxArrows,scene.player.arrows+this.amount);}else if(this.type==='memory'){scene.save.player.memories=(scene.save.player.memories||0)+1;scene.counters.memories=(scene.counters.memories||0)+1;}scene.audio.sfx('pickup');scene.addFloat(this.centerX(),this.y,this.type==='memory'?'MEMÓRIA':this.type==='herb'?`ERVA +${this.amount}`:`FLECHAS +${this.amount}`,'#e7c86f',18);scene.particles.burst(this.centerX(),this.centerY(),18,()=>({x:this.centerX(),y:this.centerY(),vx:EB.random(-120,120),vy:EB.random(-200,30),life:EB.random(.4,.8),size:EB.random(2,7),endSize:0,color:this.type==='memory'?'#74c5a3':'#d9bd68',glow:8}));}
    draw(ctx){const y=this.y+Math.sin(this.phase*3)*7;ctx.save();ctx.translate(this.centerX(),y+17);ctx.shadowBlur=14;ctx.shadowColor=this.type==='memory'?'#67c4ae':'#e2bd63';ctx.fillStyle=this.type==='memory'?'#75d0b6':this.type==='herb'?'#5baa61':'#d4ad58';if(this.type==='herb'){ctx.beginPath();ctx.ellipse(-6,0,9,18,-.5,0,Math.PI*2);ctx.ellipse(7,-3,8,16,.6,0,Math.PI*2);ctx.fill();}else if(this.type==='arrows'){ctx.fillRect(-14,-13,5,27);ctx.fillRect(-3,-15,5,30);ctx.fillRect(8,-12,5,25);}else{ctx.rotate(Math.PI/4);ctx.fillRect(-10,-10,20,20);}ctx.restore();}
  }

  class Cage extends BaseEntity {
    constructor(data){super(data.x,data.y-112,90,112);this.id=data.id;this.dialogue=data.dialogue;this.special=data.special||null;this.open=false;}
    tryInteract(scene){if(this.open)return false;this.open=true;scene.counters.rescued=(scene.counters.rescued||0)+1;scene.save.stats.survivorsRescued+=1;if(this.special==='potira')scene.flags.rescued_potira=true;scene.audio.sfx('objective');scene.particles.hit(this.centerX(),this.centerY(),1,'#d6b56a');scene.dialogue.openById(this.dialogue);return true;}
    draw(ctx,near){ctx.save();ctx.translate(this.x,this.y);ctx.strokeStyle=this.open?'#5f5036':'#9d8056';ctx.lineWidth=7;for(let i=0;i<5;i++){const xx=10+i*17;ctx.beginPath();ctx.moveTo(xx,10);ctx.lineTo(xx,100);ctx.stroke();}ctx.beginPath();ctx.rect(4,5,82,102);ctx.stroke();if(this.open){ctx.translate(75,0);ctx.rotate(.9);}ctx.restore();if(near&&!this.open){ctx.fillStyle='#f5dfaa';ctx.font='800 16px monospace';ctx.textAlign='center';ctx.fillText('E  •  LIBERTAR',this.centerX(),this.y-18);}}
  }

  class PowderCache extends BaseEntity {
    constructor(data){super(data.x,data.y-80,90,80);this.id=data.id;this.health=data.health||120;this.maxHealth=this.health;this.destroyed=false;}
    update(dt,scene){if(this.destroyed&&Math.random()<dt*8)scene.particles.fire(this.centerX(),this.y+30,2);}
    takeDamage(amount,direction,scene){if(this.destroyed)return;this.health-=amount;scene.particles.hit(this.centerX(),this.centerY(),direction,'#9f7449');scene.audio.sfx('hit');if(this.health<=0){this.destroyed=true;scene.counters.caches=(scene.counters.caches||0)+1;scene.audio.sfx('explosion');scene.camera.shake(20,.5);scene.particles.burst(this.centerX(),this.centerY(),45,()=>({x:this.centerX(),y:this.centerY(),vx:EB.random(-420,420),vy:EB.random(-500,120),life:EB.random(.45,1.2),size:EB.random(3,12),endSize:0,color:EB.choose(['#ffc459','#e95a2f','#6b4329']),gravity:700,glow:8}));}}
    draw(ctx){ctx.save();ctx.translate(this.x,this.y);ctx.globalAlpha=this.destroyed?.45:1;ctx.fillStyle='#614027';ctx.strokeStyle='#1d120b';ctx.lineWidth=6;ctx.fillRect(0,20,90,60);ctx.strokeRect(0,20,90,60);ctx.strokeStyle='#a38354';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,36);ctx.lineTo(90,36);ctx.moveTo(0,64);ctx.lineTo(90,64);ctx.stroke();ctx.fillStyle='#d1b066';ctx.font='900 24px monospace';ctx.textAlign='center';ctx.fillText('✦',45,58);ctx.restore();}
  }

  class SignalFire extends BaseEntity {
    constructor(data){super(data.x,data.y-70,70,70);this.id=data.id;this.lit=false;}
    tryInteract(scene){if(this.lit)return false;this.lit=true;scene.counters.signals=(scene.counters.signals||0)+1;scene.audio.sfx('objective');scene.camera.shake(6,.2);return true;}
    update(dt,scene){if(this.lit)scene.particles.fire(this.centerX(),this.y+15,Math.random()<.6?2:1);}
    draw(ctx,near){ctx.strokeStyle='#4b2c1b';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(this.x+12,this.y+65);ctx.lineTo(this.x+58,this.y+15);ctx.moveTo(this.x+58,this.y+65);ctx.lineTo(this.x+12,this.y+15);ctx.stroke();if(near&&!this.lit){ctx.fillStyle='#f5dfaa';ctx.font='800 16px monospace';ctx.textAlign='center';ctx.fillText('E  •  ACENDER',this.centerX(),this.y-12);}}
  }

  class Gate extends BaseEntity {
    constructor(data){super(data.x,data.y,data.w,data.h);this.id=data.id;this.openFlag=data.openFlag;this.open=data.initiallyOpen||false;}
    update(dt,scene){if(scene.flags[this.openFlag])this.open=true;}
    draw(ctx){if(this.open)return;ctx.save();ctx.fillStyle='#38281c';ctx.strokeStyle='#a48250';ctx.lineWidth=5;ctx.fillRect(this.x,this.y,this.w,this.h);for(let y=this.y+12;y<this.y+this.h;y+=34)ctx.strokeRect(this.x+4,y,this.w-8,22);ctx.restore();}
  }

  /* -------------------------------------------------------------------------- */
  /* Dialogue and objectives                                                     */
  /* -------------------------------------------------------------------------- */

  class DialogueSystem {
    constructor(scene){this.scene=scene;this.active=false;this.lines=[];this.index=0;this.onClose=null;this.reveal=0;this.cooldown=0;this.id=null;}
    openById(id,onClose=null){const lines=EB.DIALOGUES[id];if(!Array.isArray(lines)||lines.length===0)return false;return this.open(lines,onClose,id);}
    open(lines,onClose=null,id=null){if(this.active)return false;this.active=true;this.lines=lines;this.index=0;this.onClose=onClose;this.reveal=0;this.cooldown=.18;this.id=id;this.scene.blockPlayer=true;this.scene.input.clearAll();this.scene.audio.sfx('dialogue');return true;}
    update(dt){if(!this.active)return;this.cooldown=Math.max(0,this.cooldown-dt);const line=this.lines[this.index];this.reveal=Math.min(line.text.length,this.reveal+dt*58);if(this.cooldown<=0&&(this.scene.input.actionPressed('interact')||this.scene.input.actionPressed('jump')||this.scene.input.pointer.pressed)){
        if(this.reveal<line.text.length){this.reveal=line.text.length;this.cooldown=.08;}else this.next();
      }}
    next(){this.index+=1;this.reveal=0;this.cooldown=.12;this.scene.audio.sfx('dialogue');if(this.index>=this.lines.length)this.close();}
    close(){const cb=this.onClose;this.active=false;this.lines=[];this.index=0;this.onClose=null;this.scene.blockPlayer=false;this.scene.input.clearAll();this.scene.player.interactCooldown=.35;if(typeof cb==='function')cb();}
    draw(ctx,portraits){if(!this.active)return;const line=this.lines[this.index];const panelY=650;ctx.save();ctx.fillStyle='rgba(3,10,8,.94)';ctx.strokeStyle='#d5ae62';ctx.lineWidth=3;EB.drawRoundedRect(ctx,120,panelY,1360,195,12);ctx.fill();ctx.stroke();const portrait=portraits.get(line.portrait||line.speaker);if(portrait){ctx.save();ctx.beginPath();ctx.rect(142,panelY+20,150,150);ctx.clip();ctx.drawImage(portrait,142,panelY+20,150,150);ctx.restore();ctx.strokeStyle='#8e6a35';ctx.strokeRect(142,panelY+20,150,150);}ctx.fillStyle='#e8bc67';ctx.font='900 25px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText(line.speaker||'',320,panelY+42);ctx.fillStyle='#f2dfb4';ctx.font='23px Georgia,serif';const shown=line.text.slice(0,Math.floor(this.reveal));const rows=EB.wrapText(ctx,shown,1080);rows.slice(0,4).forEach((row,i)=>ctx.fillText(row,320,panelY+80+i*31));ctx.fillStyle='rgba(235,200,125,.75)';ctx.font='700 14px ui-monospace,monospace';ctx.textAlign='right';ctx.fillText('E / ENTER PARA CONTINUAR',1450,panelY+172);ctx.restore();}
  }

  class ObjectiveManager {
    constructor(scene,objectives=[]){this.scene=scene;this.objectives=objectives;this.index=0;this.completed=new Set();this.bannerTime=3.5;this.lastText='';}
    current(){return this.objectives[this.index]||null;}
    update(dt){this.bannerTime=Math.max(0,this.bannerTime-dt);const objective=this.current();if(!objective||this.completed.has(objective.id))return;if(this.check(objective.condition)){this.complete(objective);}}
    check(c){if(!c)return false;if(c.type==='flag')return Boolean(this.scene.flags[c.key]);if(c.type==='counter')return (this.scene.counters[c.key]||0)>=c.value;if(c.type==='reach')return EB.overlap(this.scene.player.rect(),c);return false;}
    complete(objective){this.completed.add(objective.id);this.scene.audio.sfx('objective');this.scene.addFloat(this.scene.player.centerX(),this.scene.player.y-50,'OBJETIVO CONCLUÍDO','#e8c66f',23);this.executeActions(objective.onComplete||[]);}
    executeActions(actions){for(const action of actions){if(action.type==='unlockObjective'){this.index=Math.min(this.objectives.length,this.index+1);this.bannerTime=3.5;}else if(action.type==='dialogue'){this.scene.dialogue.openById(action.id);}else if(action.type==='setFlag'){this.scene.flags[action.key]=true;}else if(action.type==='playTheme'){this.scene.audio.playTheme(action.name);}else if(action.type==='cinematic'){this.scene.pendingCinematic=action.id;}else if(action.type==='completeLevel'){this.scene.pendingLevelComplete=true;}else if(action.type==='finishGame'){this.scene.pendingFinish=true;}}}
    draw(ctx){const o=this.current();if(!o)return;ctx.save();ctx.fillStyle='rgba(4,15,11,.84)';ctx.strokeStyle='rgba(220,180,99,.58)';ctx.lineWidth=2;EB.drawRoundedRect(ctx,1010,28,550,96,8);ctx.fill();ctx.stroke();ctx.fillStyle='#d6ad60';ctx.font='900 15px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('OBJETIVO',1034,54);ctx.fillStyle='#f0deb0';ctx.font='18px Georgia,serif';const rows=EB.wrapText(ctx,o.text,490);rows.slice(0,2).forEach((r,i)=>ctx.fillText(r,1034,82+i*24));ctx.restore();}
  }

  /* -------------------------------------------------------------------------- */
  /* Background                                                                  */
  /* -------------------------------------------------------------------------- */

  class BackgroundRenderer {
    constructor(){this.birds=[];for(let i=0;i<18;i++)this.birds.push({x:EB.random(0,1600),y:EB.random(80,380),speed:EB.random(18,55),phase:EB.random(0,10),scale:EB.random(.5,1.2)});}
    update(dt){for(const b of this.birds){b.x+=b.speed*dt;if(b.x>1660)b.x=-60;b.phase+=dt*5;}}
    draw(ctx,scene){const p=EB.PALETTES[scene.level.palette]||EB.PALETTES.village;const cam=scene.camera;const grad=ctx.createLinearGradient(0,0,0,900);grad.addColorStop(0,p.skyTop);grad.addColorStop(.65,p.skyBottom);grad.addColorStop(1,p.foliageDark);ctx.fillStyle=grad;ctx.fillRect(0,0,1600,900);this.drawSun(ctx,p,scene);this.drawMountains(ctx,p,cam.x*.08,410,.5,p.mountainFar);this.drawMountains(ctx,p,cam.x*.14,520,.72,p.mountainMid);this.drawMountains(ctx,p,cam.x*.24,625,1,p.mountainNear);this.drawForestSilhouette(ctx,p,cam.x*.32,620,p.foliageDark,.55);this.drawForestSilhouette(ctx,p,cam.x*.5,690,p.foliageMid,.78);this.drawBirds(ctx,p);if(scene.level.palette==='fire'||scene.level.palette==='ship'){ctx.fillStyle='rgba(137,45,26,.16)';ctx.fillRect(0,0,1600,900);}const fog=ctx.createLinearGradient(0,380,0,850);fog.addColorStop(0,'rgba(255,255,255,0)');fog.addColorStop(.5,p.fog);fog.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=fog;ctx.fillRect(0,300,1600,550);}
    drawSun(ctx,p,scene){const x=scene.level.palette==='fire'||scene.level.palette==='ship'?1280:1220;const y=scene.level.palette==='night'?150:220;ctx.save();ctx.shadowColor=p.sun;ctx.shadowBlur=45;ctx.fillStyle=p.sun;ctx.globalAlpha=scene.level.palette==='night'?.65:.9;ctx.beginPath();ctx.arc(x,y,scene.level.palette==='night'?34:58,0,Math.PI*2);ctx.fill();ctx.restore();}
    drawMountains(ctx,p,offset,base,scale,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,900);for(let x=-200-(offset%420);x<1900;x+=280){const peak=base-EB.hash(Math.floor((x+offset)/280))*220*scale;ctx.lineTo(x+140,peak);ctx.lineTo(x+300,base+EB.random(-30,30));}ctx.lineTo(1800,900);ctx.closePath();ctx.fill();}
    drawForestSilhouette(ctx,p,offset,base,color,scale){ctx.fillStyle=color;for(let x=-100-(offset%180);x<1750;x+=EB.random(90,150)){const h=EB.random(150,310)*scale;const w=EB.random(80,145)*scale;ctx.fillRect(x+w*.43,base-h*.62,w*.14,h*.62);ctx.beginPath();ctx.arc(x+w*.5,base-h*.72,w*.52,0,Math.PI*2);ctx.arc(x+w*.22,base-h*.53,w*.38,0,Math.PI*2);ctx.arc(x+w*.78,base-h*.5,w*.42,0,Math.PI*2);ctx.fill();}}
    drawBirds(ctx){ctx.strokeStyle='rgba(20,24,20,.72)';ctx.lineWidth=3;for(const b of this.birds){ctx.save();ctx.translate(b.x,b.y+Math.sin(b.phase)*7);ctx.scale(b.scale,b.scale);ctx.beginPath();ctx.moveTo(-13,0);ctx.quadraticCurveTo(-6,-8,0,0);ctx.quadraticCurveTo(6,-8,13,0);ctx.stroke();ctx.restore();}}
  }

  /* -------------------------------------------------------------------------- */
  /* Scene base and utility                                                      */
  /* -------------------------------------------------------------------------- */

  class BaseScene {
    constructor(manager){this.manager=manager;this.ctx=manager.ctx;this.input=manager.input;this.assets=manager.assets;this.audio=manager.audio;this.save=manager.save;this.time=0;}
    enter(){}
    exit(){}
    update(dt){this.time+=dt;}
    draw(){}
  }

  class MenuScene extends BaseScene {
    constructor(manager){super(manager);this.index=0;this.options=['INICIAR','CONTINUAR','CAPÍTULOS','MEMÓRIAS','OPÇÕES'];this.fade=0;this.birds=[];for(let i=0;i<20;i++)this.birds.push({x:EB.random(0,1600),y:EB.random(60,500),speed:EB.random(10,45),phase:EB.random(0,10),scale:EB.random(.5,1.4)});}
    enter(){this.audio.playTheme('menu');this.fade=0;}
    update(dt){super.update(dt);this.fade=Math.min(1,this.fade+dt*.8);for(const b of this.birds){b.x+=b.speed*dt;b.phase+=dt*3;if(b.x>1660)b.x=-60;}const accept=this.input.actionPressed('interact')||this.input.pressed.has('Space');if(accept)this.choose();else{if(this.input.pressed.has('ArrowUp')||this.input.pressed.has('KeyW'))this.index=(this.index+this.options.length-1)%this.options.length;if(this.input.pressed.has('ArrowDown')||this.input.pressed.has('KeyS'))this.index=(this.index+1)%this.options.length;}if(this.input.pointer.pressed){const px=this.input.pointer.x,py=this.input.pointer.y;for(let i=0;i<this.options.length;i++){const y=510+i*62;if(px>650&&px<1030&&py>y-42&&py<y+10){this.index=i;this.choose();break;}}}}
    choose(){this.audio.start();this.audio.sfx('menuSelect');const option=this.options[this.index];if(option==='INICIAR')this.manager.startNewGame();else if(option==='CONTINUAR')this.manager.continueGame();else if(option==='CAPÍTULOS')this.manager.setScene(new ChapterScene(this.manager));else if(option==='MEMÓRIAS')this.manager.setScene(new CodexScene(this.manager));else this.manager.setScene(new OptionsScene(this.manager));}
    draw(){const c=this.ctx;const img=this.assets.image('titleBackground');c.save();c.globalAlpha=this.fade;if(img)c.drawImage(img,0,0,1600,900);else{c.fillStyle='#0c2a1d';c.fillRect(0,0,1600,900);}const vignette=c.createRadialGradient(800,390,200,800,450,900);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.66)');c.fillStyle=vignette;c.fillRect(0,0,1600,900);for(const b of this.birds){c.strokeStyle='rgba(15,22,17,.8)';c.lineWidth=3*b.scale;c.beginPath();c.moveTo(b.x-10*b.scale,b.y);c.quadraticCurveTo(b.x-5*b.scale,b.y-7*b.scale,b.x,b.y);c.quadraticCurveTo(b.x+5*b.scale,b.y-7*b.scale,b.x+10*b.scale,b.y);c.stroke();}
      c.textAlign='center';
      const menuShade=c.createLinearGradient(610,0,1080,0);menuShade.addColorStop(0,'rgba(2,9,7,.25)');menuShade.addColorStop(.18,'rgba(2,9,7,.92)');menuShade.addColorStop(.82,'rgba(2,9,7,.92)');menuShade.addColorStop(1,'rgba(2,9,7,.25)');c.fillStyle=menuShade;c.fillRect(590,430,500,390);
      c.font='italic 23px Georgia,serif';c.fillStyle='rgba(247,224,171,.92)';c.fillText('“O rio conhece meu nome. A mata conhece minha dor.”',840,405);
      for(let i=0;i<this.options.length;i++){const y=510+i*62;const selected=i===this.index;c.fillStyle=selected?'rgba(166,103,34,.88)':'rgba(3,13,10,.78)';c.strokeStyle=selected?'#f0c86f':'rgba(210,176,99,.48)';c.lineWidth=selected?3:2;EB.drawRoundedRect(c,650,y-42,380,52,5);c.fill();c.stroke();if(selected){c.fillStyle='#f6d985';c.font='900 24px monospace';c.fillText('◆',625,y-9);c.fillText('◆',1055,y-9);}c.fillStyle=selected?'#fff1c4':'#d8c394';c.font='900 23px ui-monospace,monospace';c.fillText(this.options[i],840,y-8);}
      c.textAlign='left';c.fillStyle='rgba(244,222,170,.72)';c.font='15px ui-monospace,monospace';c.fillText('WASD / SETAS • J ATACAR • K ARCO • SHIFT ESQUIVAR • E INTERAGIR',35,870);c.textAlign='right';c.fillText(`VERSÃO ${EB.VERSION}`,1565,870);c.restore();}
  }

  class ChapterScene extends BaseScene {
    constructor(manager){super(manager);this.ids=Object.keys(EB.LEVELS);this.index=Math.min(manager.save.chapter||0,this.ids.length-1);}
    update(dt){super.update(dt);if(this.input.actionPressed('left'))this.index=(this.index+this.ids.length-1)%this.ids.length;if(this.input.actionPressed('right'))this.index=(this.index+1)%this.ids.length;if(this.input.actionPressed('pause'))this.manager.setScene(new MenuScene(this.manager));if(this.input.actionPressed('interact')){if(this.index<=this.save.chapter)this.manager.startLevel(this.ids[this.index],false);}}
    draw(){const c=this.ctx;c.fillStyle='#06130f';c.fillRect(0,0,1600,900);c.fillStyle='#efd69a';c.font='900 56px Georgia,serif';c.textAlign='center';c.fillText('CAPÍTULOS',800,110);this.ids.forEach((id,i)=>{const l=EB.LEVELS[id];const unlocked=i<=this.save.chapter;const x=150+i*220;const y=315;c.fillStyle=i===this.index?'#8c5f2e':'#10281e';c.strokeStyle=unlocked?'#d8b164':'#4a4a43';c.lineWidth=i===this.index?5:2;EB.drawRoundedRect(c,x,y,190,290,8);c.fill();c.stroke();c.fillStyle=unlocked?'#f2dca8':'#6c6c65';c.font='900 20px monospace';c.fillText(String(i+1).padStart(2,'0'),x+95,y+50);c.font='900 19px Georgia,serif';const rows=EB.wrapText(c,l.name,160);rows.forEach((r,n)=>c.fillText(r,x+95,y+105+n*25));c.font='15px Georgia,serif';c.fillStyle=unlocked?'#cdbb91':'#5f5f58';const s=EB.wrapText(c,l.subtitle,150);s.forEach((r,n)=>c.fillText(r,x+95,y+185+n*22));c.font='900 36px monospace';c.fillText(unlocked?'◆':'✕',x+95,y+250);});c.fillStyle='#cdbb91';c.font='17px monospace';c.fillText('← → escolher   •   ENTER jogar   •   ESC voltar',800,820);}
  }

  class CodexScene extends BaseScene {
    constructor(manager){super(manager);this.entries=Array.isArray(EB.CODEX)?EB.CODEX:Object.values(EB.CODEX||{});this.index=0;}
    update(dt){super.update(dt);if(this.input.actionPressed('up'))this.index=(this.index+this.entries.length-1)%this.entries.length;if(this.input.actionPressed('down'))this.index=(this.index+1)%this.entries.length;if(this.input.actionPressed('pause'))this.manager.setScene(new MenuScene(this.manager));}
    draw(){const c=this.ctx;c.fillStyle='#071510';c.fillRect(0,0,1600,900);c.fillStyle='#efd69a';c.font='900 52px Georgia,serif';c.textAlign='center';c.fillText('MEMÓRIAS E CONTEXTO',800,90);c.textAlign='left';for(let i=0;i<this.entries.length;i++){const entry=this.entries[i],key=entry.id||String(i),unlocked=this.save.codex.includes(key)||this.save.completed;c.fillStyle=i===this.index?'#a36d31':'#132a20';c.strokeStyle='#806a3d';EB.drawRoundedRect(c,80,140+i*56,400,44,5);c.fill();c.stroke();c.fillStyle=unlocked?'#f0d9a0':'#68665e';c.font='800 17px monospace';c.fillText(unlocked?entry.title:'MEMÓRIA BLOQUEADA',98,169+i*56);}const entry=this.entries[this.index]||{id:'',title:'',text:''},key=entry.id||String(this.index),unlocked=this.save.codex.includes(key)||this.save.completed;c.fillStyle='rgba(15,38,28,.85)';c.strokeStyle='#b99252';c.lineWidth=2;EB.drawRoundedRect(c,540,140,970,620,8);c.fill();c.stroke();c.fillStyle='#e6ba65';c.font='900 34px Georgia,serif';c.fillText(unlocked?entry.title:'Conteúdo não encontrado',580,205);c.fillStyle='#f0dfb4';c.font='22px Georgia,serif';const text=unlocked?(entry.text||entry.description||''): 'Explore as fases para recuperar esta memória.';const rows=EB.wrapText(c,text,850);rows.slice(0,15).forEach((r,i)=>c.fillText(r,580,260+i*32));c.fillStyle='#b7a77f';c.font='15px monospace';c.fillText('↑ ↓ navegar  •  ESC voltar',580,730);}
  }

  class OptionsScene extends BaseScene {
    constructor(manager){super(manager);this.index=0;this.items=['Volume geral','Volume da música','Volume dos efeitos','Tremor de tela','Voltar'];}
    update(dt){super.update(dt);if(this.input.actionPressed('up'))this.index=(this.index+this.items.length-1)%this.items.length;if(this.input.actionPressed('down'))this.index=(this.index+1)%this.items.length;const delta=(this.input.actionPressed('right')?0.1:0)-(this.input.actionPressed('left')?0.1:0);if(delta!==0&&this.index<4){const s=this.save.settings;if(this.index===0)s.masterVolume=EB.clamp(s.masterVolume+delta,0,1);if(this.index===1)s.musicVolume=EB.clamp(s.musicVolume+delta,0,1);if(this.index===2)s.effectsVolume=EB.clamp(s.effectsVolume+delta,0,1);if(this.index===3)s.screenShake=EB.clamp(s.screenShake+delta,0,1);this.audio.setVolumes(s);EB.writeSave(this.save);}if(this.input.actionPressed('interact')&&this.index===4||this.input.actionPressed('pause'))this.manager.setScene(new MenuScene(this.manager));}
    draw(){const c=this.ctx;c.fillStyle='#06130f';c.fillRect(0,0,1600,900);c.fillStyle='#efd69a';c.font='900 58px Georgia,serif';c.textAlign='center';c.fillText('OPÇÕES',800,130);this.items.forEach((item,i)=>{const y=270+i*90;c.fillStyle=i===this.index?'#8d5d29':'#10271d';c.strokeStyle='#b68d4a';EB.drawRoundedRect(c,420,y,760,62,6);c.fill();c.stroke();c.fillStyle='#eed7a2';c.font='800 22px monospace';c.textAlign='left';c.fillText(item,450,y+39);if(i<4){const value=i===0?this.save.settings.masterVolume:i===1?this.save.settings.musicVolume:i===2?this.save.settings.effectsVolume:this.save.settings.screenShake;c.fillStyle='#2b4b39';c.fillRect(850,y+23,280,18);c.fillStyle='#d6ae5d';c.fillRect(850,y+23,280*value,18);}});}
  }

  class PauseScene extends BaseScene {
    constructor(manager,under){super(manager);this.under=under;this.index=0;this.items=['CONTINUAR','REINICIAR DO PONTO','OPÇÕES','MENU PRINCIPAL'];}
    update(dt){if(this.input.actionPressed('up'))this.index=(this.index+this.items.length-1)%this.items.length;if(this.input.actionPressed('down'))this.index=(this.index+1)%this.items.length;if(this.input.actionPressed('pause'))this.manager.setScene(this.under);if(this.input.actionPressed('interact')){const v=this.items[this.index];if(v==='CONTINUAR')this.manager.setScene(this.under);else if(v==='REINICIAR DO PONTO')this.manager.startLevel(this.under.level.id,false);else if(v==='OPÇÕES')this.manager.setScene(new OptionsScene(this.manager));else this.manager.setScene(new MenuScene(this.manager));}}
    draw(){this.under.draw();const c=this.ctx;c.fillStyle='rgba(1,6,5,.72)';c.fillRect(0,0,1600,900);c.fillStyle='#efd69a';c.font='900 60px Georgia,serif';c.textAlign='center';c.fillText('PAUSADO',800,190);this.items.forEach((v,i)=>{const y=310+i*75;c.fillStyle=i===this.index?'#8f602c':'#0e251b';c.strokeStyle='#c89e55';EB.drawRoundedRect(c,580,y,440,54,6);c.fill();c.stroke();c.fillStyle='#f0d8a3';c.font='800 20px monospace';c.fillText(v,800,y+35);});}
  }

  class CinematicScene extends BaseScene {
    constructor(manager,id,onComplete=null){super(manager);this.data=EB.CINEMATICS[id];this.id=id;this.shotIndex=0;this.shotTime=0;this.totalTime=0;this.onComplete=onComplete;this.fade=0;this.birds=[];this.skipped=false;this.heroAnim=new EB.SpriteAnimator();}
    enter(){if(!this.data){this.complete();return;}this.audio.playTheme(this.data.theme||'menu');this.createBirds();}
    createBirds(){const shot=this.data.shots[this.shotIndex];const count=shot.birds||12;this.birds=Array.from({length:count},()=>({x:EB.random(-200,800),y:EB.random(70,520),z:EB.random(.45,1.6),speed:EB.random(110,260),phase:EB.random(0,10)}));}
    update(dt){super.update(dt);if(!this.data)return;this.shotTime+=dt;this.totalTime+=dt;this.fade=Math.min(1,this.fade+dt*1.8);for(const b of this.birds){b.x+=b.speed*b.z*dt;b.phase+=dt*7;if(b.x>1800)b.x=-200;}this.heroAnim.play('idle');this.heroAnim.update(dt);if((this.input.actionPressed('interact')||this.input.actionPressed('jump'))&&this.shotTime>1)this.nextShot();if(this.input.actionPressed('skip')&&this.totalTime>(this.data.skippableAfter||3))this.complete();if(this.shotTime>=this.data.shots[this.shotIndex].duration)this.nextShot();}
    nextShot(){this.shotIndex+=1;this.shotTime=0;this.fade=0;if(this.shotIndex>=this.data.shots.length){this.complete();return;}this.createBirds();}
    complete(){if(this.completed)return;this.completed=true;if(typeof this.onComplete==='function')this.onComplete();else this.manager.startLevel('terra_viva',false);}
    draw(){const c=this.ctx;if(!this.data)return;const shot=this.data.shots[this.shotIndex];this.drawShot(c,shot);const top=c.createLinearGradient(0,0,0,160);top.addColorStop(0,'rgba(0,0,0,.85)');top.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=top;c.fillRect(0,0,1600,180);const bottom=c.createLinearGradient(0,650,0,900);bottom.addColorStop(0,'rgba(0,0,0,0)');bottom.addColorStop(1,'rgba(0,0,0,.9)');c.fillStyle=bottom;c.fillRect(0,620,1600,280);c.fillStyle='#e4bc69';c.font='900 20px monospace';c.textAlign='center';c.fillText(this.data.title.toUpperCase(),800,72);const narration=shot.narration||[];c.fillStyle='#f3e0b4';c.font='27px Georgia,serif';narration.forEach((line,i)=>c.fillText(line,800,760+i*38));c.fillStyle='rgba(235,213,162,.68)';c.font='14px monospace';c.fillText('ENTER avançar  •  ESC pular',800,865);c.fillStyle=`rgba(0,0,0,${1-this.fade})`;c.fillRect(0,0,1600,900);}
    drawShot(c,shot){const type=shot.type;const village=this.assets.image('villageCinematic');const title=this.assets.image('titleBackground');if(type==='villageLife'&&village){const z=1.04+this.shotTime*.006;c.drawImage(village,(1600-1600*z)/2,(900-900*z)/2,1600*z,900*z);return;}if(['heroReveal','oath','lastStand','potiraEscape'].includes(type)&&title){c.drawImage(title,0,0,1600,900);c.fillStyle='rgba(0,0,0,.22)';c.fillRect(0,0,1600,900);this.drawHero(c,420,735,1.8);return;}const palette=type.includes('Fire')||type==='burningShips'||type==='villageFire'?EB.PALETTES.fire:type==='mangrove'||type==='canoes'||type==='dive'?EB.PALETTES.water:EB.PALETTES.dawn;const g=c.createLinearGradient(0,0,0,900);g.addColorStop(0,palette.skyTop);g.addColorStop(1,palette.skyBottom);c.fillStyle=g;c.fillRect(0,0,1600,900);if(type==='aerialForest'||type==='riverDescent'){this.drawAerialForest(c,palette,type==='riverDescent');}else if(type==='horizon'||type==='ships'){this.drawHorizon(c,palette,type==='ships');}else if(type==='villageFire'||type==='forestAlarm'){this.drawBurningVillage(c,palette);}else if(type==='mangrove'||type==='canoes'||type==='dive'){this.drawMangrove(c,palette,type);}else if(type==='council'||type==='signals'||type==='march'){this.drawCouncil(c,palette,type);}else if(type==='fortress'||type==='prisoners'||type==='siege'){this.drawFortress(c,palette,type);}else if(type==='burningShips'){this.drawBurningShips(c,palette);}else{this.drawAerialForest(c,palette,false);}for(const b of this.birds)this.drawBird(c,b);}
    drawAerialForest(c,p,river){c.fillStyle=p.foliageDark;c.fillRect(0,0,1600,900);for(let row=0;row<10;row++)for(let col=0;col<22;col++){const x=col*80+(row%2)*40+(this.shotTime*12)%80;const y=row*90-80;const r=EB.hash(row*50+col)*32+36;c.fillStyle=EB.choose([p.foliageMid,p.foliageLight,p.mountainNear]);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}if(river){c.strokeStyle=p.waterTop;c.lineWidth=170;c.beginPath();c.moveTo(200,-100);c.bezierCurveTo(650,180,350,480,980,980);c.stroke();c.strokeStyle='rgba(210,244,230,.35)';c.lineWidth=12;c.stroke();}}
    drawHorizon(c,p,ships){c.fillStyle=p.waterTop;c.fillRect(0,500,1600,400);c.fillStyle=p.mountainNear;c.beginPath();c.moveTo(0,560);c.lineTo(250,350);c.lineTo(520,550);c.lineTo(750,410);c.lineTo(960,550);c.lineTo(1240,380);c.lineTo(1600,540);c.lineTo(1600,900);c.lineTo(0,900);c.fill();if(ships){for(let i=0;i<4;i++){const x=950+i*150;c.fillStyle='#2c2018';c.fillRect(x,520,90,25);c.strokeStyle='#2c2018';c.lineWidth=5;c.beginPath();c.moveTo(x+45,520);c.lineTo(x+45,390);c.stroke();c.fillStyle='#dbcba5';c.beginPath();c.moveTo(x+48,400);c.lineTo(x+110,490);c.lineTo(x+48,490);c.closePath();c.fill();}}}
    drawBurningVillage(c,p){c.fillStyle=p.foliageDark;c.fillRect(0,430,1600,470);for(let i=0;i<7;i++){const x=100+i*230;c.fillStyle='#5c3822';c.fillRect(x,580,130,160);c.fillStyle='#a1773d';c.beginPath();c.moveTo(x-20,580);c.lineTo(x+65,500);c.lineTo(x+150,580);c.closePath();c.fill();for(let j=0;j<8;j++){c.fillStyle=EB.choose(['#ffbf4d','#ef5d2e','#b82e25']);c.beginPath();c.arc(x+EB.random(10,120),570-EB.random(0,90),EB.random(10,35),0,Math.PI*2);c.fill();}}c.fillStyle='rgba(20,10,8,.35)';c.fillRect(0,0,1600,900);}
    drawMangrove(c,p,type){c.fillStyle=p.waterTop;c.fillRect(0,430,1600,470);c.fillStyle=p.foliageDark;for(let i=0;i<15;i++){const x=i*125;c.fillRect(x,250,25,350);c.beginPath();c.arc(x+12,240,90,0,Math.PI*2);c.fill();c.strokeStyle='#3e2f23';c.lineWidth=8;c.beginPath();c.moveTo(x,530);c.lineTo(x-60,720);c.moveTo(x+24,530);c.lineTo(x+80,720);c.stroke();}if(type==='canoes'){for(let i=0;i<4;i++){const x=300+i*320;c.fillStyle='#5b331c';c.beginPath();c.ellipse(x,610,110,25,0,0,Math.PI*2);c.fill();}}if(type==='dive')this.drawHero(c,720,590,1.3);}
    drawCouncil(c,p,type){c.fillStyle=p.foliageDark;c.fillRect(0,520,1600,380);c.fillStyle='#7a4a27';for(let i=0;i<7;i++){const x=190+i*200;c.beginPath();c.arc(x,580,38,0,Math.PI*2);c.fill();c.fillRect(x-22,610,44,130);}if(type==='signals'){for(let i=0;i<3;i++){const x=350+i*450;c.fillStyle='#f1a13c';c.shadowColor='#f45b2c';c.shadowBlur=30;c.beginPath();c.arc(x,510,45,0,Math.PI*2);c.fill();c.shadowBlur=0;}}}
    drawFortress(c,p,type){c.fillStyle=p.mountainNear;c.fillRect(0,560,1600,340);c.fillStyle='#5a4938';c.fillRect(170,300,1260,390);for(let x=200;x<1430;x+=85){c.fillStyle='#2d2118';c.fillRect(x,260,45,430);}c.fillStyle='#8c744e';c.fillRect(650,380,300,310);if(type==='siege'){c.fillStyle='#d75932';for(let i=0;i<10;i++)c.fillRect(EB.random(200,1400),EB.random(300,650),EB.random(10,30),EB.random(20,80));}}
    drawBurningShips(c,p){c.fillStyle=p.waterTop;c.fillRect(0,540,1600,360);for(let i=0;i<4;i++){const x=120+i*390;c.fillStyle='#3c2518';c.fillRect(x,520,300,80);c.strokeStyle='#29170f';c.lineWidth=10;c.beginPath();c.moveTo(x+140,520);c.lineTo(x+140,230);c.stroke();for(let j=0;j<12;j++){c.fillStyle=EB.choose(['#ffc34f','#ee6431','#b92d24']);c.beginPath();c.arc(x+EB.random(30,270),500-EB.random(0,180),EB.random(12,42),0,Math.PI*2);c.fill();}}}
    drawBird(c,b){c.save();c.translate(b.x,b.y+Math.sin(b.phase)*9);c.scale(b.z,b.z);c.strokeStyle='rgba(9,16,12,.9)';c.lineWidth=3;c.beginPath();c.moveTo(-16,0);c.quadraticCurveTo(-8,-12,0,0);c.quadraticCurveTo(8,-12,16,0);c.stroke();c.restore();}
    drawHero(c,x,y,scale){const atlas=this.assets.image('aimbereAtlas');const frame=EB.AIMBERE_FRAMES[this.heroAnim.currentFrameIndex()]||EB.AIMBERE_FRAMES[0];const h=240*scale;const w=frame.w/frame.h*h;c.drawImage(atlas,frame.x,frame.y,frame.w,frame.h,x-w/2,y-h,w,h);}
  }

  class EndingScene extends BaseScene {
    constructor(manager){super(manager);this.scroll=0;this.stage=0;}
    enter(){this.audio.playTheme('ending');this.save.completed=true;this.save.chapter=Object.keys(EB.LEVELS).length-1;EB.writeSave(this.save);}
    update(dt){super.update(dt);this.scroll+=dt*30;if(this.input.actionPressed('interact')&&this.time>3)this.manager.setScene(new MenuScene(this.manager));}
    draw(){const c=this.ctx;const img=this.assets.image('titleBackground');if(img)c.drawImage(img,0,0,1600,900);c.fillStyle='rgba(1,6,5,.76)';c.fillRect(0,0,1600,900);c.textAlign='center';c.fillStyle='#edcc83';c.font='italic 39px Georgia,serif';c.fillText('“O rio conhece meu nome.',800,230);c.fillText('A mata conhece minha dor.”',800,282);c.fillStyle='#f4dfad';c.font='24px Georgia,serif';const ending=Array.isArray(EB.ENDING_TEXT)?EB.ENDING_TEXT:[];ending.forEach((line,i)=>c.fillText(typeof line==='string'?line:line.text||'',800,390+i*38-this.scroll*.15));c.fillStyle='rgba(235,207,151,.8)';c.font='16px monospace';c.fillText('Esta obra é uma ficção histórica. Consulte o códice para contexto e fontes sugeridas.',800,785);c.fillText('ENTER para voltar ao menu',800,840);}
  }

  /* -------------------------------------------------------------------------- */
  /* Gameplay scene                                                              */
  /* -------------------------------------------------------------------------- */

  class GameScene extends BaseScene {
    constructor(manager,levelId){super(manager);this.level=EB.deepClone(EB.LEVELS[levelId]);this.levelId=levelId;this.camera=new Camera();this.background=new BackgroundRenderer();this.particles=new ParticleSystem();this.player=new Player(this.level.spawn.x,this.level.spawn.y,this.save);this.enemies=[];this.bosses=[];this.npcs=[];this.targets=[];this.items=[];this.cages=[];this.powderCaches=[];this.signals=[];this.gates=[];this.projectiles=[];this.floats=[];this.delayed=[];this.flags={};this.counters={herbs:0,targetHits:0,rescued:0,enemiesDefeated:0,caches:0,signals:0,memories:0};this.triggers=(this.level.triggers||[]).map(t=>({...t,used:false}));this.checkpoints=(this.level.checkpoints||[]).map(c=>({...c,used:false}));this.dialogue=new DialogueSystem(this);this.objectives=new ObjectiveManager(this,this.level.objectives||[]);this.portraits=new EB.PortraitCache(this.assets);this.blockPlayer=false;this.hitStop=0;this.deathHandled=false;this.pendingCinematic=null;this.pendingLevelComplete=false;this.pendingFinish=false;this.levelStartTime=performance.now();this.ambientTimer=0;this.titleTime=3.8;this.build();}
    build(){for(const e of this.level.enemies||[])this.enemies.push(new Enemy(e));for(const n of this.level.npcs||[])this.npcs.push(new NPC(n));for(const t of this.level.targets||[])this.targets.push(new TrainingTarget(t));for(const i of this.level.items||[])this.items.push(new Collectible(i));for(const c of this.level.cages||[])this.cages.push(new Cage(c));for(const p of this.level.powderCaches||[])this.powderCaches.push(new PowderCache(p));for(const s of this.level.signals||[])this.signals.push(new SignalFire(s));for(const g of this.level.gates||[])this.gates.push(new Gate(g));this.camera.snapTo(this.player,this.level);}
    enter(){this.audio.playTheme(this.level.theme||'village');if(this.level.introDialogue)this.dialogue.openById(this.level.introDialogue);}
    update(dt){super.update(dt);if(this.hitStop>0){this.hitStop-=dt;this.dialogue.update(dt);return;}this.titleTime=Math.max(0,this.titleTime-dt);this.background.update(dt);this.processDelayed(dt);this.detectWater(this.player);this.player.update(dt,this);for(const e of this.enemies)this.detectWater(e),e.update(dt,this);for(const b of this.bosses)b.update(dt,this);for(const n of this.npcs)n.update(dt,this);for(const t of this.targets)t.update(dt,this);for(const i of this.items)i.update(dt,this);for(const p of this.powderCaches)p.update(dt,this);for(const s of this.signals)s.update(dt,this);for(const g of this.gates)g.update(dt,this);for(const p of this.projectiles)p.update(dt,this);for(const f of this.floats)f.update(dt);this.particles.update(dt);this.projectiles=this.projectiles.filter(p=>p.active);this.enemies=this.enemies.filter(e=>e.active);this.bosses=this.bosses.filter(b=>b.active||b.deadTime<1.2);this.items=this.items.filter(i=>i.active);this.floats=this.floats.filter(f=>f.life>0);this.processTriggers();this.processCheckpoints();this.dialogue.update(dt);this.objectives.update(dt);this.camera.update(dt,this.player,this.level);this.ambient(dt);this.processPending();}
    processDelayed(dt){for(const d of this.delayed)d.time-=dt;const ready=this.delayed.filter(d=>d.time<=0);this.delayed=this.delayed.filter(d=>d.time>0);for(const d of ready){try{d.fn();}catch(error){console.error(error);}}}
    ambient(dt){this.ambientTimer-=dt;if(this.ambientTimer<=0){this.ambientTimer=EB.random(.08,.25);if(this.level.palette==='fire'||this.level.palette==='ship')this.particles.fire(this.camera.x+EB.random(0,1600),EB.random(540,820),1);else if(Math.random()<.4)this.particles.leaves(this.camera.x+EB.random(0,1600),EB.random(180,680),1);}}
    detectWater(entity){entity.inWater=false;entity.waterSurface=null;for(const z of this.level.waterZones||[]){const cx=entity.centerX(),cy=entity.centerY();if(cx>=z.x&&cx<=z.x+z.w&&cy>=z.y&&cy<=z.y+z.h){entity.inWater=true;entity.waterSurface=z.y;if(!entity.wasInWater&&entity===this.player)this.particles.splash(entity.centerX(),z.y);break;}}}
    solidRects(){const arr=[];for(const p of this.level.platforms||[])if(!p.oneWay)arr.push(p);for(const g of this.gates)if(!g.open)arr.push(g.rect());return arr;}
    moveEntity(entity,dt){entity.previousX=entity.x;entity.previousY=entity.y;entity.onGround=false;entity.x+=entity.vx*dt;for(const p of this.solidRects()){if(EB.overlap(entity.rect(),p)){if(entity.vx>0)entity.x=p.x-entity.w;else if(entity.vx<0)entity.x=p.x+p.w;entity.vx=0;}}entity.y+=entity.vy*dt;for(const p of this.level.platforms||[]){const r=entity.rect();const previousBottom=entity.previousY+entity.h;if(p.oneWay){if(entity.vy>=0&&previousBottom<=p.y+12&&r.x+r.w>p.x&&r.x<p.x+p.w&&r.y+r.h>=p.y&&r.y+r.h<=p.y+Math.max(42,entity.vy*dt+16)){entity.y=p.y-entity.h;entity.vy=0;entity.onGround=true;}}else if(EB.overlap(r,p)){if(entity.vy>0&&previousBottom<=p.y+18){entity.y=p.y-entity.h;entity.vy=0;entity.onGround=true;}else if(entity.vy<0&&entity.previousY>=p.y+p.h-12){entity.y=p.y+p.h;entity.vy=0;}}}for(const g of this.gates){if(g.open)continue;const p=g.rect(),r=entity.rect();if(EB.overlap(r,p)){if(entity.vy>0&&entity.previousY+entity.h<=p.y+15){entity.y=p.y-entity.h;entity.vy=0;entity.onGround=true;}else if(entity.vx>0)entity.x=p.x-entity.w;else if(entity.vx<0)entity.x=p.x+p.w;}}entity.x=EB.clamp(entity.x,-50,this.level.width-entity.w+50);}
    tryInteract(){if(this.dialogue.active)return;const candidates=[];for(const n of this.npcs)if(n.interact)candidates.push({entity:n,d:EB.distance(this.player.centerX(),this.player.centerY(),n.centerX(),n.centerY())});for(const c of this.cages)if(!c.open)candidates.push({entity:c,d:EB.distance(this.player.centerX(),this.player.centerY(),c.centerX(),c.centerY())});for(const s of this.signals)if(!s.lit)candidates.push({entity:s,d:EB.distance(this.player.centerX(),this.player.centerY(),s.centerX(),s.centerY())});candidates.sort((a,b)=>a.d-b.d);if(candidates[0]&&candidates[0].d<155){candidates[0].entity.tryInteract(this);this.player.interactCooldown=.35;}}
    processTriggers(){for(const t of this.triggers){if(t.used&&t.once)continue;if(EB.overlap(this.player.rect(),t)){t.used=true;const a=t.action;if(a.type==='setFlag')this.flags[a.key]=true;else if(a.type==='startBoss')this.startBoss(a.boss,a.id,t);else if(a.type==='finalFuse'){if(this.flags.boss_armada_dead){this.flags.final_fuse_lit=true;this.audio.sfx('objective');}}}}}
    startBoss(type,id,trigger){if(this.flags[`${id}_started`])return;this.flags[`${id}_started`]=true;const x=trigger.x+trigger.w*.67;const y=type==='patrolShip'?600:760;this.bosses.push(new Boss(type,id,x,y));this.audio.playTheme('boss');this.camera.shake(18,.5);}
    processCheckpoints(){for(const c of this.checkpoints){if(c.used)continue;if(EB.distance(this.player.centerX(),this.player.centerY(),c.x,c.y)<120){c.used=true;this.save.checkpoint={level:this.level.id,x:c.x,y:c.y};EB.writeSave(this.save);this.audio.sfx('checkpoint');this.addFloat(c.x,c.y-80,'PONTO DE MEMÓRIA','#82c7a0',20);}}}
    processPending(){if(this.dialogue.active)return;if(this.pendingCinematic){const id=this.pendingCinematic;this.pendingCinematic=null;this.manager.setScene(new CinematicScene(this.manager,id,()=>{this.manager.setScene(this);if(this.pendingLevelComplete)this.completeLevel();else if(this.pendingFinish)this.finishGame();}));return;}if(this.pendingLevelComplete){this.pendingLevelComplete=false;this.completeLevel();return;}if(this.pendingFinish){this.pendingFinish=false;this.finishGame();}}
    completeLevel(){const ids=Object.keys(EB.LEVELS);const idx=ids.indexOf(this.level.id);this.save.chapter=Math.max(this.save.chapter,Math.min(ids.length-1,idx+1));for(const key of this.level.codexUnlocks||[])if(!this.save.codex.includes(key))this.save.codex.push(key);this.save.bestTimes[this.level.id]=Math.min(this.save.bestTimes[this.level.id]||Infinity,(performance.now()-this.levelStartTime)/1000);EB.writeSave(this.save);if(this.level.nextLevel)this.manager.setScene(new IntermissionScene(this.manager,this.level.nextLevel));else this.finishGame();}
    finishGame(){this.manager.setScene(new EndingScene(this.manager));}
    handleDeath(){if(this.deathHandled)return;this.deathHandled=true;this.save.stats.deaths+=1;EB.writeSave(this.save);this.manager.transition(()=>this.manager.startLevel(this.level.id,false),1.2);}
    addFloat(x,y,text,color,size){this.floats.push(new FloatingText(x,y,text,color,size));}
    draw(){const c=this.ctx;c.clearRect(0,0,1600,900);this.background.draw(c,this);this.camera.begin(c);this.drawWorld(c);this.particles.draw(c);for(const f of this.floats)f.draw(c);this.camera.end(c);this.drawLighting(c);this.drawHUD(c);this.objectives.draw(c);this.dialogue.draw(c,this.portraits);if(this.titleTime>0)this.drawLevelTitle(c);}
    drawWorld(c){for(const d of this.level.decor||[])this.drawDecor(c,d);for(const z of this.level.waterZones||[])this.drawWater(c,z);for(const p of this.level.platforms||[])this.drawPlatform(c,p);for(const g of this.gates)g.draw(c);for(const i of this.items)i.draw(c);for(const t of this.targets)t.draw(c);for(const p of this.powderCaches)p.draw(c);for(const s of this.signals)s.draw(c,this.isNear(s));for(const cage of this.cages)cage.draw(c,this.isNear(cage));for(const n of this.npcs)n.draw(c,this.isNear(n));for(const e of this.enemies)e.draw(c);for(const b of this.bosses)b.draw(c);for(const p of this.projectiles)p.draw(c);this.player.draw(c,this.assets);}
    isNear(entity){return EB.distance(this.player.centerX(),this.player.centerY(),entity.centerX(),entity.centerY())<155;}
    drawPlatform(c,p){const pal=EB.PALETTES[this.level.palette];const colors={earth:['#302219','#493322'],wood:['#5e3b22','#876039'],stone:['#4c5149','#777d70'],root:['#3e2b1c','#6b4d2b'],ship:['#4b2c1b','#7d5430']};const pair=colors[p.material]||colors.earth;c.fillStyle=pair[0];c.fillRect(p.x,p.y,p.w,p.h);c.fillStyle=pair[1];c.fillRect(p.x,p.y,p.w,Math.min(16,p.h));if(p.material==='earth'){c.fillStyle=pal.moss;c.fillRect(p.x,p.y,p.w,8);}c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=3;for(let x=p.x+25;x<p.x+p.w;x+=70)c.beginPath(),c.moveTo(x,p.y+18),c.lineTo(x-12,p.y+Math.min(p.h,55)),c.stroke();}
    drawWater(c,z){const pal=EB.PALETTES[this.level.palette];const g=c.createLinearGradient(0,z.y,0,z.y+z.h);g.addColorStop(0,pal.waterTop);g.addColorStop(1,pal.waterBottom);c.fillStyle=g;c.globalAlpha=.82;c.fillRect(z.x,z.y,z.w,z.h);c.globalAlpha=1;c.strokeStyle='rgba(185,230,218,.55)';c.lineWidth=4;c.beginPath();for(let x=z.x;x<z.x+z.w;x+=35)c.lineTo(x,z.y+Math.sin((x+this.time*180)*.03)*5);c.stroke();}
    drawDecor(c,d){const x=d.x,y=d.y,s=d.scale||1;switch(d.type){case'tree':case'mangroveTree':c.fillStyle='#172d20';c.fillRect(x-18*s,y-210*s,36*s,210*s);c.fillStyle='#19482e';for(let i=0;i<5;i++){c.beginPath();c.arc(x+EB.hash(d.variant*11+i)*80*s-40*s,y-220*s-EB.hash(i*17+d.x)*80*s,70*s,0,Math.PI*2);c.fill();}break;case'hut':case'longhouse':c.fillStyle='#5b3d24';c.fillRect(x-80*s,y-120*s,160*s,120*s);c.fillStyle='#b08a49';c.beginPath();c.moveTo(x-105*s,y-120*s);c.lineTo(x,y-220*s);c.lineTo(x+105*s,y-120*s);c.closePath();c.fill();break;case'fire':case'bonfire':this.particles.fire(x,y-10,1);break;case'waterfall':c.fillStyle='rgba(130,210,213,.5)';c.fillRect(x-40*s,y-250*s,80*s,250*s);break;case'smokeColumn':c.fillStyle='rgba(40,35,31,.22)';for(let i=0;i<6;i++){c.beginPath();c.arc(x+Math.sin(this.time+i)*30,y-i*55,35+i*10,0,Math.PI*2);c.fill();}break;case'landingBoat':case'canoe':c.fillStyle='#4f2e1b';c.beginPath();c.ellipse(x,y-15,90*s,24*s,0,0,Math.PI*2);c.fill();break;case'watchtower':case'lookout':c.strokeStyle='#5d4227';c.lineWidth=12*s;c.strokeRect(x-50*s,y-190*s,100*s,190*s);break;case'palisade':c.fillStyle='#4b3828';for(let i=0;i<(d.width||400);i+=36)c.fillRect(x+i,y-180*s,22*s,180*s);break;case'shore':c.fillStyle='#886f45';c.fillRect(x,y-35,d.width||800,35);break;case'patrolShip':case'burningShipFar':c.fillStyle='#3c2518';c.fillRect(x-120*s,y-70*s,240*s,70*s);c.strokeStyle='#26170f';c.lineWidth=8*s;c.beginPath();c.moveTo(x,y-70*s);c.lineTo(x,y-260*s);c.stroke();break;case'powderHold':c.fillStyle='#50301d';c.fillRect(x-100*s,y-120*s,200*s,120*s);break;default:break;}}
    drawLighting(c){const p=EB.PALETTES[this.level.palette];const vignette=c.createRadialGradient(800,410,250,800,450,920);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=vignette;c.fillRect(0,0,1600,900);if(this.level.palette==='fire'||this.level.palette==='ship'){c.globalCompositeOperation='screen';const x=this.player.centerX()-this.camera.x,y=this.player.centerY();const g=c.createRadialGradient(x,y,0,x,y,300);g.addColorStop(0,'rgba(255,129,51,.12)');g.addColorStop(1,'rgba(255,80,20,0)');c.fillStyle=g;c.fillRect(x-300,y-300,600,600);c.globalCompositeOperation='source-over';}}
    drawHUD(c){c.save();c.fillStyle='rgba(3,12,9,.86)';c.strokeStyle='rgba(220,181,98,.58)';c.lineWidth=2;EB.drawRoundedRect(c,28,25,520,112,8);c.fill();c.stroke();c.fillStyle='#e7bd69';c.font='900 20px monospace';c.fillText('AIMBERÊ',50,53);this.drawBar(c,50,65,320,22,this.player.health/this.player.maxHealth,'#b93c32','#4a1d1a',`${Math.ceil(this.player.health)} / ${this.player.maxHealth}`);this.drawBar(c,50,96,250,12,this.player.stamina/this.player.maxStamina,'#d6ac4e','#4b3b1d','');c.fillStyle='#efd9a4';c.font='800 15px monospace';c.fillText(`FLECHAS ${this.player.arrows}/${this.player.maxArrows}`,390,83);c.fillText(`ERVAS ${this.player.herbs}/${this.player.maxHerbs}`,390,109);if(this.player.inWater){this.drawBar(c,610,35,380,18,this.player.breath/this.player.maxBreath,'#4aa5b4','#153b48','FÔLEGO');}const boss=this.bosses.find(b=>b.health>0);if(boss){c.fillStyle='rgba(3,9,8,.9)';c.strokeStyle='#c79b4e';EB.drawRoundedRect(c,380,780,840,66,7);c.fill();c.stroke();c.fillStyle='#f0d79b';c.font='900 20px monospace';c.textAlign='center';c.fillText(boss.name.toUpperCase(),800,805);this.drawBar(c,430,817,740,15,boss.health/boss.maxHealth,'#b3322d','#421716','');}c.restore();}
    drawBar(c,x,y,w,h,p,fg,bg,label){c.fillStyle=bg;c.fillRect(x,y,w,h);c.fillStyle=fg;c.fillRect(x+2,y+2,(w-4)*EB.clamp(p,0,1),h-4);c.strokeStyle='rgba(240,214,156,.45)';c.strokeRect(x,y,w,h);if(label){c.fillStyle='#fff0c5';c.font=`800 ${Math.max(12,h-7)}px monospace`;c.textAlign='center';c.fillText(label,x+w/2,y+h-5);c.textAlign='left';}}
    drawLevelTitle(c){const a=Math.min(1,this.titleTime)*Math.min(1,(3.8-this.titleTime)*2);c.save();c.globalAlpha=a;c.textAlign='center';c.fillStyle='#f0d79d';c.strokeStyle='#4b281a';c.lineWidth=6;c.font='900 58px Georgia,serif';c.strokeText(this.level.name,800,210);c.fillText(this.level.name,800,210);c.fillStyle='#e2b45c';c.font='italic 24px Georgia,serif';c.fillText(this.level.subtitle,800,250);c.restore();}
  }

  class IntermissionScene extends BaseScene {
    constructor(manager,nextId){super(manager);this.nextId=nextId;this.index=0;this.choices=[{name:'VIDA DA TERRA',desc:'+20 de vida máxima',apply:s=>s.player.maxHealth+=20},{name:'PONTA DE PEDRA',desc:'+5 de dano corpo a corpo',apply:s=>s.player.meleeDamage+=5},{name:'ARCO REFORÇADO',desc:'+5 de dano de flecha e +2 flechas',apply:s=>{s.player.arrowDamage+=5;s.player.maxArrows+=2;}}];}
    enter(){this.audio.playTheme('council');}
    update(dt){super.update(dt);if(this.input.actionPressed('left'))this.index=(this.index+2)%3;if(this.input.actionPressed('right'))this.index=(this.index+1)%3;if(this.input.actionPressed('interact')){const choice=this.choices[this.index];choice.apply(this.save);this.save.player.upgrades.push(choice.name);EB.writeSave(this.save);this.manager.startLevel(this.nextId,false);}}
    draw(){const c=this.ctx;c.fillStyle='#06130f';c.fillRect(0,0,1600,900);c.fillStyle='#efd59a';c.font='900 52px Georgia,serif';c.textAlign='center';c.fillText('A MEMÓRIA FORTALECE',800,120);c.fillStyle='#c7b489';c.font='21px Georgia,serif';c.fillText('Escolha uma melhoria permanente antes de continuar.',800,170);this.choices.forEach((v,i)=>{const x=220+i*410,y=280;c.fillStyle=i===this.index?'#815527':'#10271d';c.strokeStyle=i===this.index?'#efc56a':'#806b3f';c.lineWidth=i===this.index?5:2;EB.drawRoundedRect(c,x,y,340,340,9);c.fill();c.stroke();c.fillStyle='#e6b862';c.font='900 28px monospace';c.fillText(['♥','◆','➶'][i],x+170,y+95);c.fillStyle='#f1dbab';c.font='900 23px Georgia,serif';c.fillText(v.name,x+170,y+160);c.fillStyle='#cbb98e';c.font='19px Georgia,serif';c.fillText(v.desc,x+170,y+220);});c.fillStyle='#d2bd8e';c.font='16px monospace';c.fillText('← → escolher  •  ENTER confirmar',800,760);}
  }

  /* -------------------------------------------------------------------------- */
  /* Scene manager                                                               */
  /* -------------------------------------------------------------------------- */

  class SceneManager {
    constructor(canvas,ctx,input,assets,audio,save){this.canvas=canvas;this.ctx=ctx;this.input=input;this.assets=assets;this.audio=audio;this.save=save;this.scene=null;this.lastTime=performance.now();this.running=false;this.fade=0;this.fadeDirection=0;this.fadeCallback=null;}
    setScene(scene){if(this.scene&&this.scene.exit)this.scene.exit();this.scene=scene;if(this.scene&&this.scene.enter)this.scene.enter();this.input.clearAll();}
    start(){if(this.running)return;this.running=true;requestAnimationFrame(t=>this.frame(t));}
    frame(now){if(!this.running)return;let dt=Math.min(.033,Math.max(.001,(now-this.lastTime)/1000));this.lastTime=now;try{if(this.scene)this.scene.update(dt);if(this.scene)this.scene.draw();this.drawTransition(dt);}catch(error){this.running=false;window.dispatchEvent(new CustomEvent('eb-fatal',{detail:error}));return;}this.input.flush();requestAnimationFrame(t=>this.frame(t));}
    drawTransition(dt){if(this.fadeDirection!==0){this.fade=EB.clamp(this.fade+this.fadeDirection*dt*2.3,0,1);if(this.fadeDirection>0&&this.fade>=1){const cb=this.fadeCallback;this.fadeCallback=null;this.fadeDirection=-1;if(cb)cb();}else if(this.fadeDirection<0&&this.fade<=0)this.fadeDirection=0;}if(this.fade>0){this.ctx.fillStyle=`rgba(0,0,0,${this.fade})`;this.ctx.fillRect(0,0,1600,900);}}
    transition(callback){this.fadeDirection=1;this.fadeCallback=callback;}
    startNewGame(){this.save=EB.createDefaultSave();EB.writeSave(this.save);this.audio.setVolumes(this.save.settings);this.setScene(new CinematicScene(this,'opening',()=>this.startLevel('terra_viva',false)));}
    continueGame(){const ids=Object.keys(EB.LEVELS);const id=ids[EB.clamp(this.save.chapter||0,0,ids.length-1)]||'terra_viva';this.startLevel(id,false);}
    startLevel(id,playIntro=true){const level=EB.LEVELS[id];if(!level){this.setScene(new MenuScene(this));return;}if(playIntro&&level.introCinematic)this.setScene(new CinematicScene(this,level.introCinematic,()=>this.startLevel(id,false)));else this.setScene(new GameScene(this,id));}
    pushPause(){if(this.scene instanceof GameScene)this.setScene(new PauseScene(this,this.scene));}
  }

  EB.InputController=InputController;
  EB.Camera=Camera;
  EB.ParticleSystem=ParticleSystem;
  EB.Projectile=Projectile;
  EB.Player=Player;
  EB.Enemy=Enemy;
  EB.Boss=Boss;
  EB.DialogueSystem=DialogueSystem;
  EB.ObjectiveManager=ObjectiveManager;
  EB.MenuScene=MenuScene;
  EB.CinematicScene=CinematicScene;
  EB.GameScene=GameScene;
  EB.EndingScene=EndingScene;
  EB.SceneManager=SceneManager;
})();
