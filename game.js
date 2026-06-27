
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;
  const SAVE_KEY = 'ecos-do-brasil-save-v1';
  const CONTENT = window.GAME_CONTENT;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b + 1));
  const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function text(str, x, y, size = 8, color = '#fff', align = 'left', shadow = true) {
    ctx.font = `700 ${size}px ui-monospace, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,.85)';
      ctx.fillText(str, Math.round(x + 1), Math.round(y + 1));
    }
    ctx.fillStyle = color;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }

  function wrapText(str, maxChars = 54) {
    const words = str.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > maxChars) {
        if (line) lines.push(line);
        line = word;
      } else line = (line + ' ' + word).trim();
    }
    if (line) lines.push(line);
    return lines;
  }

  function panel(x, y, w, h, alpha = .88) {
    ctx.fillStyle = `rgba(3,12,10,${alpha})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(227,199,148,.48)';
    ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.fillRect(x + 3, y + 3, w - 6, 2);
  }

  class Input {
    constructor() {
      this.down = new Set();
      this.pressed = new Set();
      this.released = new Set();
      const block = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
      addEventListener('keydown', e => {
        if (block.has(e.code)) e.preventDefault();
        if (!this.down.has(e.code)) this.pressed.add(e.code);
        this.down.add(e.code);
      }, { passive:false });
      addEventListener('keyup', e => {
        this.down.delete(e.code);
        this.released.add(e.code);
      });
      addEventListener('blur', () => this.down.clear());
      document.querySelectorAll('#touch-controls button').forEach(btn => {
        const code = btn.dataset.key;
        const on = e => {
          e.preventDefault();
          if (!this.down.has(code)) this.pressed.add(code);
          this.down.add(code);
          btn.classList.add('is-down');
          canvas.focus();
        };
        const off = e => {
          e.preventDefault();
          this.down.delete(code);
          this.released.add(code);
          btn.classList.remove('is-down');
        };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
      });
    }
    held(...codes) { return codes.some(c => this.down.has(c)); }
    hit(...codes) { return codes.some(c => this.pressed.has(c)); }
    endFrame() { this.pressed.clear(); this.released.clear(); }
  }

  class Particle {
    constructor(x, y, color, opts = {}) {
      this.x = x; this.y = y;
      this.vx = opts.vx ?? rnd(-40, 40);
      this.vy = opts.vy ?? rnd(-70, -10);
      this.life = opts.life ?? rnd(.25, .65);
      this.maxLife = this.life;
      this.size = opts.size ?? irnd(1, 3);
      this.color = color;
      this.gravity = opts.gravity ?? 150;
      this.kind = opts.kind || 'square';
    }
    update(dt) {
      this.life -= dt;
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    draw(camX) {
      const a = clamp(this.life / this.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      const x = Math.round(this.x - camX), y = Math.round(this.y);
      if (this.kind === 'spark') ctx.fillRect(x, y, this.size + 2, 1);
      else ctx.fillRect(x, y, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }

  class Projectile {
    constructor(x, y, vx, vy, type, owner, damage = 10) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.type = type; this.owner = owner; this.damage = damage;
      this.w = type === 'cannon' ? 8 : 5;
      this.h = type === 'cannon' ? 8 : 2;
      this.life = type === 'cannon' ? 5 : 3;
      this.dead = false;
      this.gravity = type === 'cannon' ? 260 : (type === 'bullet' ? 0 : 32);
    }
    update(dt, game) {
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const box = {x:this.x-this.w/2,y:this.y-this.h/2,w:this.w,h:this.h};
      for (const p of game.stage.platforms) {
        if (overlap(box,p)) {
          this.dead = true;
          game.burst(this.x, this.y, this.type === 'cannon' ? '#db6b3d' : '#d9c29a', this.type === 'cannon' ? 14 : 4);
          if (this.type === 'cannon') game.audio.sfx('cannon');
          break;
        }
      }
      if (this.dead) return;
      if (this.owner === 'player') {
        for (const e of game.enemies) {
          if (!e.dead && overlap(box, e.box())) {
            e.hit(this.damage, Math.sign(this.vx) || 1, game, false);
            this.dead = true;
            break;
          }
        }
      } else if (overlap(box, game.player.box())) {
        game.player.hit(this.damage, Math.sign(this.vx) || 1, game);
        this.dead = true;
      }
    }
    draw(camX) {
      const x = Math.round(this.x - camX), y = Math.round(this.y);
      if (this.type === 'arrow') {
        ctx.fillStyle = '#e8d2a7'; ctx.fillRect(x-4,y,8,1);
        ctx.fillStyle = '#b94635'; ctx.fillRect(x+(this.vx>0?-5:4),y-1,2,3);
      } else if (this.type === 'cannon') {
        ctx.fillStyle = '#151719'; ctx.fillRect(x-4,y-4,8,8);
        ctx.fillStyle = '#654234'; ctx.fillRect(x-2,y-3,3,2);
      } else {
        ctx.fillStyle = '#f4d8a2'; ctx.fillRect(x-2,y-1,5,2);
        ctx.fillStyle = '#fff3cc'; ctx.fillRect(x-3,y,1,1);
      }
    }
  }

  class Player {
    constructor(x, y, stats = {}) {
      this.x=x; this.y=y; this.w=13; this.h=26;
      this.vx=0; this.vy=0; this.facing=1;
      this.grounded=false; this.coyote=0; this.jumpBuffer=0;
      this.maxHealth=stats.maxHealth ?? 100;
      this.health=this.maxHealth;
      this.meleeDamage=stats.meleeDamage ?? 18;
      this.arrowDamage=stats.arrowDamage ?? 14;
      this.arrows=stats.arrows ?? 12;
      this.maxArrows=20;
      this.healPower=stats.healPower ?? 35;
      this.maxBreath=stats.maxBreath ?? 10;
      this.breath=this.maxBreath;
      this.dashCooldownMax=stats.dashCooldownMax ?? .72;
      this.dashCooldown=0; this.dashTime=0;
      this.attackTime=0; this.attackId=0; this.combo=0; this.comboWindow=0;
      this.invuln=0; this.hurtTime=0; this.dead=false;
      this.animTime=0; this.state='idle'; this.inWater=false;
      this.memory=stats.memory ?? 0;
    }
    box() { return {x:this.x,y:this.y,w:this.w,h:this.h}; }
    syncStats() {
      return {
        maxHealth:this.maxHealth, meleeDamage:this.meleeDamage, arrowDamage:this.arrowDamage,
        arrows:this.arrows, healPower:this.healPower, maxBreath:this.maxBreath,
        dashCooldownMax:this.dashCooldownMax, memory:this.memory
      };
    }
    hit(dmg, dir, game) {
      if (this.invuln > 0 || this.dashTime > 0 || this.dead) return;
      this.health -= dmg;
      this.invuln = .85; this.hurtTime = .25;
      this.vx = dir * 145; this.vy = -120;
      game.audio.sfx('hurt'); game.shake = Math.max(game.shake, 6);
      game.burst(this.x+this.w/2,this.y+10,'#a9312e',12);
      if (this.health <= 0) { this.health=0; this.dead=true; }
    }
    heal(amount, game) {
      const old=this.health;
      this.health=clamp(this.health+amount,0,this.maxHealth);
      if(this.health>old){ game.audio.sfx('heal'); game.floatText(`+${this.health-old}`,this.x,this.y-10,'#79d48a'); }
    }
    attackBox() {
      if (this.attackTime <= 0 || this.attackTime > .20) return null;
      const range = this.combo === 2 ? 25 : 21;
      return { x: this.facing>0 ? this.x+this.w-1 : this.x-range, y:this.y+3, w:range, h:19, id:this.attackId };
    }
    update(dt, game) {
      this.animTime += dt;
      this.invuln=Math.max(0,this.invuln-dt); this.hurtTime=Math.max(0,this.hurtTime-dt);
      this.dashCooldown=Math.max(0,this.dashCooldown-dt); this.comboWindow=Math.max(0,this.comboWindow-dt);
      this.attackTime=Math.max(0,this.attackTime-dt); this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
      if(this.grounded) this.coyote=.10; else this.coyote=Math.max(0,this.coyote-dt);

      const i=game.input;
      const waterY=game.stage.waterY;
      const wasWater=this.inWater;
      this.inWater=waterY!=null && this.y+this.h*.55>waterY;
      if(this.inWater&&!wasWater){game.audio.sfx('water');game.burst(this.x+7,waterY,'#9bd5d1',10);}

      if(this.dead){ this.vx*=.93; this.vy+=500*dt; this.moveAndCollide(dt,game); return; }
      if(this.hurtTime>0){ this.vy += (this.inWater?80:620)*dt; this.moveAndCollide(dt,game); return; }

      const left=i.held('KeyA','ArrowLeft');
      const right=i.held('KeyD','ArrowRight');
      const axis=(right?1:0)-(left?1:0);
      if(axis) this.facing=axis;

      if(i.hit('Space','KeyW','ArrowUp')) this.jumpBuffer=.12;
      if(i.hit('KeyL','ShiftLeft','ShiftRight') && this.dashCooldown<=0){
        this.dashTime=.15; this.dashCooldown=this.dashCooldownMax; this.invuln=.18;
        this.vx=this.facing*350; this.vy=0; game.audio.sfx('dash');
        for(let n=0;n<7;n++) game.particles.push(new Particle(this.x+6,this.y+15,'#d9c49a',{vx:-this.facing*rnd(30,120),vy:rnd(-20,20),gravity:0,life:.25,size:irnd(1,3)}));
      }
      if(i.hit('KeyJ','KeyX')){
        if(this.attackTime<=0){
          this.combo=this.comboWindow>0?(this.combo+1)%3:0;
          this.attackTime=this.combo===2?.34:.28; this.comboWindow=.42; this.attackId++;
          game.audio.sfx('slash');
        }
      }
      if(i.hit('KeyK','KeyC')&&this.arrows>0&&this.attackTime<=0){
        this.arrows--; this.attackTime=.20; game.audio.sfx('arrow');
        game.projectiles.push(new Projectile(this.x+7+this.facing*8,this.y+9,this.facing*300,this.inWater?-5:0,'arrow','player',this.arrowDamage));
      }

      if(this.dashTime>0){
        this.dashTime-=dt; this.vx=this.facing*350;
      } else if(this.inWater){
        const up=i.held('KeyW','ArrowUp','Space'); const down=i.held('KeyS','ArrowDown');
        this.vx=approach(this.vx,axis*105,420*dt);
        const ay=(down?1:0)-(up?1:0);
        this.vy=approach(this.vy,ay*92,360*dt);
        this.vy+=18*dt;
        if(this.y+this.h*.35>waterY){
          this.breath=Math.max(0,this.breath-dt);
          if(this.breath<=0) this.hit(8,0,game);
        } else this.breath=Math.min(this.maxBreath,this.breath+dt*2.5);
      } else {
        const max=this.attackTime>0?86:132;
        this.vx=approach(this.vx,axis*max,(this.grounded?850:460)*dt);
        if(!axis&&this.grounded) this.vx=approach(this.vx,0,1000*dt);
        if(this.jumpBuffer>0&&this.coyote>0){
          this.vy=-270; this.grounded=false; this.coyote=0; this.jumpBuffer=0; game.audio.sfx('jump');
        }
        if(!i.held('Space','KeyW','ArrowUp')&&this.vy<0) this.vy+=540*dt;
        this.vy+=720*dt;
      }
      this.moveAndCollide(dt,game);
      if(this.y>H+80) { this.health=0; this.dead=true; }
      this.state=this.inWater?'swim':(!this.grounded?(this.vy<0?'jump':'fall'):(Math.abs(this.vx)>18?'run':'idle'));
    }
    moveAndCollide(dt,game){
      this.x+=this.vx*dt;
      this.x=clamp(this.x,0,game.stage.worldWidth-this.w);
      let b=this.box();
      for(const p of game.stage.platforms){
        if(overlap(b,p)){
          if(this.vx>0) this.x=p.x-this.w; else if(this.vx<0) this.x=p.x+p.w;
          this.vx=0; b=this.box();
        }
      }
      this.y+=this.vy*dt; this.grounded=false; b=this.box();
      for(const p of game.stage.platforms){
        if(overlap(b,p)){
          if(this.vy>0){this.y=p.y-this.h;this.vy=0;this.grounded=true;}
          else if(this.vy<0){this.y=p.y+p.h;this.vy=0;}
          b=this.box();
        }
      }
    }
    draw(camX){
      const flash=this.invuln>0&&Math.floor(this.invuln*18)%2===0;
      if(flash)return;
      const x=Math.round(this.x-camX+this.w/2), y=Math.round(this.y+this.h);
      ctx.save();ctx.translate(x,y);ctx.scale(this.facing,1);
      const run=this.state==='run'?Math.sin(this.animTime*18):0;
      const bob=this.state==='idle'?Math.sin(this.animTime*3)*.7:(this.state==='run'?Math.abs(Math.sin(this.animTime*18))*1.4:0);
      const swim=this.state==='swim';
      if(swim)ctx.rotate(-.18+Math.sin(this.animTime*7)*.06);
      else if(this.dead)ctx.rotate(1.2);
      ctx.translate(0,-bob);
      // back hair and feathers
      ctx.fillStyle='#16120f';ctx.fillRect(-5,-25,10,8);ctx.fillRect(-7,-21,5,7);ctx.fillRect(3,-22,5,6);
      ctx.fillStyle='#d94f37';ctx.fillRect(-2,-30,2,7);ctx.fillStyle='#e7d49d';ctx.fillRect(1,-29,2,6);ctx.fillStyle='#245b50';ctx.fillRect(4,-28,2,7);
      // legs
      ctx.fillStyle='#7c3d29';
      const legA=swim?Math.sin(this.animTime*9)*3:run*3;
      ctx.fillRect(-5+legA,-8,4,8);ctx.fillRect(1-legA,-8,4,8);
      ctx.fillStyle='#dfd0a5';ctx.fillRect(-6+legA,-3,5,2);ctx.fillRect(1-legA,-3,5,2);
      // cloth
      ctx.fillStyle='#c34b34';ctx.fillRect(-7,-12,14,6);ctx.fillStyle='#e2bd68';ctx.fillRect(-6,-11,3,5);ctx.fillRect(3,-11,2,5);
      ctx.fillStyle='#1d574e';ctx.fillRect(-8,-10,3,7);ctx.fillRect(5,-10,3,7);
      // torso
      ctx.fillStyle='#9a5437';ctx.fillRect(-5,-22,10,11);ctx.fillStyle='#b66a48';ctx.fillRect(-4,-21,8,8);
      // body paint
      ctx.fillStyle='#f2e4bf';ctx.fillRect(-4,-19,8,2);ctx.fillRect(-2,-22,2,11);ctx.fillRect(2,-16,2,5);
      // arms
      const swing=this.attackTime>0?(-1.5+this.attackTime*9):run*.6;
      ctx.save();ctx.translate(4,-19);ctx.rotate(swing);ctx.fillStyle='#a65d3d';ctx.fillRect(0,0,4,11);ctx.fillStyle='#f1dfb5';ctx.fillRect(0,5,4,2);
      // weapon
      ctx.fillStyle='#5a3525';ctx.fillRect(2,7,2,14);ctx.fillStyle='#1a1b18';ctx.fillRect(0,17,7,5);ctx.fillStyle='#d35338';ctx.fillRect(1,16,2,2);ctx.restore();
      ctx.save();ctx.translate(-5,-19);ctx.rotate(-run*.35);ctx.fillStyle='#a65d3d';ctx.fillRect(-3,0,4,10);ctx.fillStyle='#f1dfb5';ctx.fillRect(-3,5,4,2);ctx.restore();
      // head face
      ctx.fillStyle='#ad6242';ctx.fillRect(-4,-27,8,7);ctx.fillStyle='#f0e0ba';ctx.fillRect(-4,-25,8,2);ctx.fillRect(1,-23,3,1);
      ctx.fillStyle='#0a0b0a';ctx.fillRect(2,-25,1,1);
      // necklace
      ctx.fillStyle='#e3c36f';ctx.fillRect(-3,-21,1,1);ctx.fillRect(-1,-20,1,1);ctx.fillRect(1,-20,1,1);ctx.fillRect(3,-21,1,1);
      ctx.restore();
    }
  }

  class Enemy {
    constructor(def) {
      Object.assign(this, def);
      this.w=14;this.h=25;this.vx=0;this.vy=0;this.facing=-1;this.grounded=false;
      this.dead=false;this.hurtTime=0;this.invuln=0;this.attackCd=rnd(.2,.8);this.anim=0;this.lastAttack=-1;
      const stats={
        sailor:[38,10],musketeer:[30,12],shield:[58,13],dog:[25,9],swimmer:[28,9],
        captain:[110,15],boatBoss:[190,17],finalBoss:[250,20]
      }[this.type]||[35,10];
      this.maxHealth=stats[0];this.health=this.maxHealth;this.damage=stats[1];
      if(this.type==='dog'){this.w=18;this.h=12;}
      if(this.type==='boatBoss'){this.w=76;this.h=42;}
      if(this.type==='finalBoss'){this.w=19;this.h=31;}
      if(this.boss) this.health=this.maxHealth;
      this.homeX=this.x;
    }
    box(){return{x:this.x,y:this.y,w:this.w,h:this.h};}
    hit(dmg,dir,game,melee=true){
      if(this.invuln>0||this.dead)return;
      if(this.type==='shield'&&melee&&dir===this.facing){dmg=Math.ceil(dmg*.25);game.floatText('BLOQUEIO',this.x,this.y-8,'#d7c698');}
      this.health-=dmg;this.invuln=.13;this.hurtTime=.16;this.vx=dir*95;this.vy=-70;
      game.audio.sfx('hit');game.burst(this.x+this.w/2,this.y+8,'#a72d2d',7);
      game.floatText(`-${dmg}`,this.x,this.y-5,'#f0c6a2');
      if(this.health<=0){this.dead=true;this.vy=-130;this.vx=dir*110;game.onEnemyKilled(this);}
    }
    update(dt,game){
      this.anim+=dt;this.invuln=Math.max(0,this.invuln-dt);this.hurtTime=Math.max(0,this.hurtTime-dt);this.attackCd=Math.max(0,this.attackCd-dt);
      if(this.dead){this.vy+=600*dt;this.x+=this.vx*dt;this.y+=this.vy*dt;return;}
      const p=game.player;const dx=(p.x+p.w/2)-(this.x+this.w/2);const dist=Math.abs(dx);this.facing=dx>=0?1:-1;
      if(this.type==='boatBoss'){this.updateBoat(dt,game,dist,dx);return;}
      if(this.hurtTime<=0){
        if(this.type==='musketeer'){
          if(dist<300&&Math.abs(p.y-this.y)<80){
            this.vx=approach(this.vx,0,350*dt);
            if(this.attackCd<=0){this.attackCd=1.55+rnd(0,.5);game.audio.sfx('shot');game.projectiles.push(new Projectile(this.x+7+this.facing*8,this.y+8,this.facing*245,0,'bullet','enemy',this.damage));}
          }else this.vx=approach(this.vx,this.facing*34,180*dt);
        }else if(this.type==='swimmer'){
          this.vx=approach(this.vx,this.facing*70,220*dt);this.vy+=Math.sin(this.anim*4)*3*dt;
          if(dist<22&&this.attackCd<=0){this.attackCd=.9;p.hit(this.damage,this.facing,game);}
        }else{
          const speed=this.type==='dog'?115:(this.boss?72:55);
          if(dist>20)this.vx=approach(this.vx,this.facing*speed,300*dt);else this.vx=approach(this.vx,0,500*dt);
          if(dist<(this.type==='dog'?28:24)&&Math.abs(p.y-this.y)<30&&this.attackCd<=0){
            this.attackCd=this.boss?.72:1.0;
            p.hit(this.damage,this.facing,game);
            if(this.boss&&Math.random()<.34){this.vx=this.facing*190;game.shake=4;}
          }
          if(this.type==='finalBoss'&&dist<260&&dist>70&&this.attackCd<=.15&&Math.floor(this.anim*2)%2===0){
            this.attackCd=1.15;game.audio.sfx('shot');
            game.projectiles.push(new Projectile(this.x+9+this.facing*8,this.y+9,this.facing*285,-10,'bullet','enemy',16));
          }
        }
      }
      if(this.type!=='swimmer')this.vy+=680*dt;
      this.move(dt,game);
    }
    updateBoat(dt,game,dist,dx){
      this.x=this.homeX+Math.sin(this.anim*.7)*34;
      this.y=157+Math.sin(this.anim*1.4)*3;
      if(this.attackCd<=0&&dist<520){
        this.attackCd=this.health<this.maxHealth*.5?1.05:1.55;
        game.audio.sfx('cannon');
        const dir=dx>=0?1:-1;
        game.projectiles.push(new Projectile(this.x+this.w/2+dir*28,this.y+9,dir*rnd(120,165),-rnd(105,160),'cannon','enemy',this.damage));
        game.shake=5;
      }
    }
    move(dt,game){
      this.x+=this.vx*dt;let b=this.box();
      for(const p of game.stage.platforms){if(overlap(b,p)){if(this.vx>0)this.x=p.x-this.w;else if(this.vx<0)this.x=p.x+p.w;this.vx*=-.15;b=this.box();}}
      this.y+=this.vy*dt;this.grounded=false;b=this.box();
      for(const p of game.stage.platforms){if(overlap(b,p)){if(this.vy>0){this.y=p.y-this.h;this.vy=0;this.grounded=true;}else if(this.vy<0){this.y=p.y+p.h;this.vy=0;}b=this.box();}}
      if(this.y>H+100)this.dead=true;
    }
    draw(camX){
      if(this.dead&&this.y>H+50)return;
      const flash=this.invuln>0&&Math.floor(this.invuln*30)%2===0;if(flash)return;
      const x=Math.round(this.x-camX+this.w/2),y=Math.round(this.y+this.h);
      ctx.save();ctx.translate(x,y);ctx.scale(this.facing,1);
      if(this.dead)ctx.rotate(1.2);
      if(this.type==='boatBoss'){this.drawBoat();ctx.restore();return;}
      if(this.type==='dog'){this.drawDog();ctx.restore();return;}
      if(this.type==='swimmer')ctx.rotate(-.15+Math.sin(this.anim*5)*.08);
      const bob=this.grounded?Math.abs(Math.sin(this.anim*8))*1:0;ctx.translate(0,-bob);
      // legs / boots
      ctx.fillStyle='#2b241f';ctx.fillRect(-5,-8,4,8);ctx.fillRect(1,-8,4,8);ctx.fillStyle='#171719';ctx.fillRect(-6,-2,5,2);ctx.fillRect(1,-2,5,2);
      // coat
      const coat=this.type==='captain'||this.type==='finalBoss'?'#642f34':'#b5a187';
      ctx.fillStyle=coat;ctx.fillRect(-6,-22,12,14);ctx.fillStyle='#eee0bf';ctx.fillRect(-2,-21,4,9);ctx.fillStyle='#9b3a33';ctx.fillRect(-6,-13,12,3);
      // arm and weapon
      ctx.fillStyle='#d0a27c';ctx.fillRect(4,-20,4,10);
      if(this.type==='musketeer'||this.type==='finalBoss'){
        ctx.fillStyle='#563622';ctx.fillRect(6,-17,14,2);ctx.fillStyle='#242526';ctx.fillRect(17,-18,4,3);
      }else if(this.type==='shield'){
        ctx.fillStyle='#704c35';ctx.fillRect(5,-22,6,15);ctx.strokeStyle='#d0b16c';ctx.strokeRect(5.5,-21.5,5,14);
      }else{
        ctx.fillStyle='#c7c5b3';ctx.fillRect(6,-17,2,13);ctx.fillStyle='#6d472d';ctx.fillRect(4,-6,6,2);
      }
      // head / helmet
      ctx.fillStyle='#c89570';ctx.fillRect(-4,-28,8,7);ctx.fillStyle=this.type==='captain'||this.type==='finalBoss'?'#31323a':'#6f6d64';ctx.fillRect(-5,-30,10,4);ctx.fillRect(-7,-27,13,2);
      ctx.fillStyle='#151414';ctx.fillRect(2,-26,1,1);
      if(this.type==='captain'||this.type==='finalBoss'){ctx.fillStyle='#e2b95e';ctx.fillRect(-1,-29,2,2);}
      ctx.restore();
    }
    drawDog(){
      const step=Math.sin(this.anim*15)*2;
      ctx.fillStyle='#5c4534';ctx.fillRect(-8,-10,15,7);ctx.fillRect(5,-13,6,6);ctx.fillStyle='#2a211b';ctx.fillRect(8,-12,2,2);
      ctx.fillStyle='#4a372b';ctx.fillRect(-6+step,-3,3,4);ctx.fillRect(3-step,-3,3,4);ctx.fillRect(-10,-9,4,2);
    }
    drawBoat(){
      ctx.translate(0,-2);
      ctx.fillStyle='#3c271d';ctx.fillRect(-38,-14,76,18);ctx.fillStyle='#70462d';ctx.fillRect(-32,4,64,5);ctx.fillStyle='#bb9b6a';ctx.fillRect(-30,-13,60,3);
      ctx.fillStyle='#2b2d31';ctx.fillRect(-26,-20,14,9);ctx.fillRect(12,-20,14,9);ctx.fillStyle='#171717';ctx.fillRect(-29,-17,5,4);ctx.fillRect(24,-17,5,4);
      ctx.fillStyle='#5d3b26';ctx.fillRect(-1,-48,3,35);ctx.fillStyle='#d9c8a4';ctx.beginPath();ctx.moveTo(2,-46);ctx.lineTo(28,-29);ctx.lineTo(2,-29);ctx.fill();
      ctx.fillStyle='#9d3b33';ctx.fillRect(2,-42,18,4);
      for(let i=0;i<3;i++){ctx.fillStyle='#c3ad8c';ctx.fillRect(-16+i*14,-25,8,11);ctx.fillStyle='#6b6a61';ctx.fillRect(-17+i*14,-29,10,4);}
    }
  }

  class Game {
    constructor() {
      this.input = new Input();
      this.audio = new AudioEngine();
      this.state = 'menu';
      this.menuIndex = 0;
      this.stageIndex = 0;
      this.stage = null;
      this.player = null;
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.pickups = [];
      this.cages = [];
      this.powder = [];
      this.objective = {};
      this.cameraX = 0;
      this.shake = 0;
      this.time = 0;
      this.last = performance.now();
      this.cutscene = [];
      this.cutIndex = 0;
      this.cutCallback = null;
      this.dialogue = null;
      this.dialogueIndex = 0;
      this.popup = null;
      this.popupTimer = 0;
      this.floaters = [];
      this.upgradeChoices = [];
      this.runStats = null;
      this.continueAvailable = !!localStorage.getItem(SAVE_KEY);
      this.creditsScroll = 0;
      this.transitionAlpha = 0;
      this.titleBirds = Array.from({length:8},(_,i)=>({x:rnd(0,W),y:rnd(25,105),s:rnd(.5,1.3),phase:rnd(0,6)}));
      this.bindCanvas();
      this.audio.setTheme('title');
      requestAnimationFrame(t => this.loop(t));
    }

    bindCanvas() {
      canvas.addEventListener('pointerdown', () => {
        canvas.focus();
        this.audio.start();
        if (this.state === 'menu') this.input.pressed.add('Enter');
      });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      addEventListener('keydown', () => this.audio.start());
    }

    defaultStats() {
      return {
        maxHealth:100, meleeDamage:18, arrowDamage:14, arrows:12,
        healPower:35, maxBreath:10, dashCooldownMax:.72, memory:0
      };
    }

    save() {
      if (!this.player && !this.runStats) return;
      const stats = this.player ? this.player.syncStats() : this.runStats;
      const data = { stageIndex:this.stageIndex, stats, timestamp:Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.continueAvailable = true;
    }

    loadSave() {
      try {
        const data = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (!data || !Number.isInteger(data.stageIndex)) throw new Error('invalid save');
        this.stageIndex = clamp(data.stageIndex, 0, CONTENT.stages.length - 1);
        this.runStats = { ...this.defaultStats(), ...(data.stats || {}) };
        this.loadStage(this.stageIndex);
      } catch {
        localStorage.removeItem(SAVE_KEY);
        this.continueAvailable = false;
        this.startNew();
      }
    }

    startNew() {
      this.stageIndex = 0;
      this.runStats = this.defaultStats();
      localStorage.removeItem(SAVE_KEY);
      this.playCutscene(CONTENT.intro, () => this.loadStage(0));
    }

    playCutscene(slides, callback) {
      this.state = 'cutscene';
      this.cutscene = slides;
      this.cutIndex = 0;
      this.cutCallback = callback;
      this.audio.setTheme(slides === CONTENT.ending ? 'ending' : 'memory');
    }

    loadStage(index) {
      this.stageIndex = index;
      this.stage = CONTENT.stages[index];
      this.player = new Player(this.stage.spawn.x, this.stage.spawn.y, this.runStats || this.defaultStats());
      this.enemies = this.stage.enemies.map(e => new Enemy({...e}));
      this.projectiles = [];
      this.particles = [];
      this.pickups = this.stage.pickups.map((p,i)=>({...p,id:`p${i}`,taken:false,w:10,h:10,bob:rnd(0,6)}));
      this.cages = (this.stage.cages || []).map(c=>({...c,rescued:false,w:30,h:32}));
      this.powder = (this.stage.powder || []).map(p=>({...p,sabotaged:false,w:18,h:20}));
      this.potiraFreed = false;
      this.objective = { herbs:0, rescued:0, powder:0, bossDefeated:false, talkedPotira:false };
      this.cameraX = 0;
      this.state = 'play';
      this.dialogue = null;
      this.popup = { title:this.stage.title, lines:[this.stage.subtitle, this.stage.year], kind:'stage' };
      this.popupTimer = 4.2;
      this.audio.setTheme(this.stage.theme);
      this.save();
    }

    loop(now) {
      const dt = Math.min(.033, Math.max(.001, (now - this.last) / 1000));
      this.last = now;
      this.time += dt;
      this.update(dt);
      this.draw();
      this.input.endFrame();
      requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
      if (this.input.hit('KeyM')) {
        this.audio.start();
        const muted = this.audio.toggleMute();
        this.popup = { title: muted ? 'ÁUDIO DESLIGADO' : 'ÁUDIO LIGADO', lines:['Tecla M alterna o som.'], kind:'small' };
        this.popupTimer = 1.6;
      }
      if (this.popupTimer > 0) this.popupTimer -= dt;
      this.floaters.forEach(f => { f.y -= 22*dt; f.life -= dt; });
      this.floaters = this.floaters.filter(f => f.life > 0);
      this.particles.forEach(p=>p.update(dt));
      this.particles=this.particles.filter(p=>p.life>0);
      this.shake=Math.max(0,this.shake-20*dt);

      switch (this.state) {
        case 'menu': this.updateMenu(dt); break;
        case 'controls': this.updateInfoScreen(); break;
        case 'credits': this.updateCredits(dt); break;
        case 'cutscene': this.updateCutscene(); break;
        case 'play': this.updatePlay(dt); break;
        case 'dialogue': this.updateDialogue(); break;
        case 'memory': this.updateMemory(); break;
        case 'upgrade': this.updateUpgrade(); break;
        case 'death': this.updateDeath(); break;
        case 'pause': this.updatePause(); break;
        case 'endingDone': this.updateEndingDone(); break;
      }
    }

    menuOptions() {
      const opts = [{label:'NOVO JOGO',action:()=>this.startNew()}];
      if (this.continueAvailable) opts.push({label:'CONTINUAR',action:()=>this.loadSave()});
      opts.push({label:'CONTROLES',action:()=>{this.state='controls';this.audio.sfx('confirm');}});
      opts.push({label:'CRÉDITOS E CONTEXTO',action:()=>{this.state='credits';this.creditsScroll=0;this.audio.sfx('confirm');}});
      return opts;
    }

    updateMenu() {
      const opts=this.menuOptions();
      if(this.input.hit('ArrowUp','KeyW')){this.menuIndex=(this.menuIndex-1+opts.length)%opts.length;this.audio.sfx('menu');}
      if(this.input.hit('ArrowDown','KeyS')){this.menuIndex=(this.menuIndex+1)%opts.length;this.audio.sfx('menu');}
      if(this.input.hit('Enter','Space','KeyE','KeyJ')){this.audio.sfx('confirm');opts[this.menuIndex]?.action();}
    }

    updateInfoScreen() {
      if(this.input.hit('Escape','Backspace','Enter','Space')){this.state='menu';this.audio.setTheme('title');}
    }

    updateCredits(dt) {
      this.creditsScroll += dt * 8;
      if(this.input.hit('Escape','Backspace','Enter','Space')){this.state='menu';this.audio.setTheme('title');}
    }

    updateCutscene() {
      if(this.input.hit('Enter','Space','KeyE','KeyJ')){
        this.audio.sfx('confirm');
        this.cutIndex++;
        if(this.cutIndex>=this.cutscene.length){
          const cb=this.cutCallback;this.cutCallback=null;
          if(cb)cb(); else this.state='menu';
        }
      }
      if(this.input.hit('Escape')){
        const cb=this.cutCallback;this.cutCallback=null;
        if(cb)cb(); else this.state='menu';
      }
    }

    updateDialogue() {
      if(this.input.hit('Enter','Space','KeyE','KeyJ')){
        this.dialogueIndex++;
        if(this.dialogueIndex>=this.dialogue.lines.length){
          if(this.dialogue.id==='potira')this.objective.talkedPotira=true;
          this.dialogue=null;this.state='play';
        } else this.audio.sfx('menu');
      }
    }

    updateMemory() {
      if(this.input.hit('Enter','Space','KeyE','KeyJ','Escape')){this.state='play';this.audio.setTheme(this.stage.theme);}
    }

    updateDeath() {
      if(this.input.hit('Enter','Space','KeyE','KeyJ')){
        this.audio.sfx('confirm');
        this.loadStage(this.stageIndex);
      }
      if(this.input.hit('Escape')){this.state='menu';this.audio.setTheme('title');}
    }

    updatePause() {
      if(this.input.hit('Escape','KeyP','Enter')){this.state='play';this.audio.setTheme(this.stage.theme);}
      if(this.input.hit('KeyR'))this.loadStage(this.stageIndex);
      if(this.input.hit('KeyQ')){this.state='menu';this.audio.setTheme('title');}
    }

    updateEndingDone() {
      if(this.input.hit('Enter','Space','Escape')){
        localStorage.removeItem(SAVE_KEY);this.continueAvailable=false;this.state='menu';this.audio.setTheme('title');
      }
    }

    updateUpgrade() {
      if(this.input.hit('ArrowLeft','KeyA')){this.menuIndex=(this.menuIndex+2)%3;this.audio.sfx('menu');}
      if(this.input.hit('ArrowRight','KeyD')){this.menuIndex=(this.menuIndex+1)%3;this.audio.sfx('menu');}
      if(this.input.hit('Enter','Space','KeyE','KeyJ')){
        const up=this.upgradeChoices[this.menuIndex];
        if(up){up.apply(this.player);this.runStats=this.player.syncStats();this.audio.sfx('confirm');}
        const transition=CONTENT.transitions[this.stage.transition] || [];
        const next=this.stageIndex+1;
        this.playCutscene(transition,()=>this.loadStage(next));
      }
    }

    updatePlay(dt) {
      if(this.input.hit('Escape','KeyP')){this.state='pause';this.audio.setTheme('memory');return;}
      this.player.update(dt,this);
      this.enemies.forEach(e=>e.update(dt,this));
      this.projectiles.forEach(p=>p.update(dt,this));
      this.projectiles=this.projectiles.filter(p=>!p.dead);
      this.handlePlayerAttack();
      this.handlePickups();
      this.handleInteractions();
      this.updateEnvironment(dt);
      this.cameraX=lerp(this.cameraX,clamp(this.player.x-W*.42,0,this.stage.worldWidth-W),1-Math.pow(.001,dt));
      if(this.player.dead){
        if(!this.deathTimer)this.deathTimer=1.35;
        this.deathTimer-=dt;
        if(this.deathTimer<=0){this.deathTimer=0;this.state='death';this.audio.setTheme('memory');}
      }
      if(this.stage.waterY!=null&&this.player.inWater&&Math.random()<dt*8){
        this.particles.push(new Particle(this.player.x+rnd(2,10),this.player.y+rnd(3,20),'#b3e1dc',{vx:rnd(-8,8),vy:rnd(-24,-8),gravity:-3,life:rnd(.3,.7),size:1}));
      }
    }

    handlePlayerAttack() {
      const hb=this.player.attackBox();
      if(!hb)return;
      for(const e of this.enemies){
        if(e.dead||e.lastAttack===hb.id)continue;
        if(overlap(hb,e.box())){
          e.lastAttack=hb.id;
          e.hit(this.player.meleeDamage+(this.player.combo===2?8:0),this.player.facing,this,true);
          this.shake=Math.max(this.shake,2.5);
        }
      }
    }

    handlePickups() {
      for(const p of this.pickups){
        if(p.taken)continue;
        const b={x:p.x-5,y:p.y-5,w:10,h:10};
        if(!overlap(this.player.box(),b))continue;
        p.taken=true;this.audio.sfx('pickup');this.burst(p.x,p.y,this.pickupColor(p.type),8);
        if(p.type==='herb'){this.objective.herbs++;this.player.heal(8,this);this.floatText('ERVA',p.x,p.y-8,'#82cc75');}
        if(p.type==='arrows'){this.player.arrows=clamp(this.player.arrows+6,0,this.player.maxArrows);this.floatText('+6 FLECHAS',p.x,p.y-8,'#e5c783');}
        if(p.type==='heal'){this.player.heal(this.player.healPower,this);}
        if(p.type==='breath'){this.player.breath=this.player.maxBreath;this.floatText('FÔLEGO',p.x,p.y-8,'#7ed2cf');}
        if(p.type==='memory'){
          this.player.memory++;this.runStats=this.player.syncStats();
          this.state='memory';this.audio.setTheme('memory');
        }
      }
    }

    pickupColor(type) {
      return ({herb:'#76c56b',arrows:'#d8b46e',heal:'#a6e18d',breath:'#79d3d0',memory:'#f1d27a'})[type]||'#fff';
    }

    handleInteractions() {
      if(!this.input.hit('KeyE','Enter'))return;
      const px=this.player.x+this.player.w/2;
      for(const n of this.stage.npcs||[]){
        if(Math.abs(px-n.x)<34){this.dialogue=n;this.dialogueIndex=0;this.state='dialogue';this.audio.sfx('confirm');return;}
      }
      for(const c of this.cages){
        if(!c.rescued&&Math.abs(px-(c.x+c.w/2))<40){
          c.rescued=true;this.objective.rescued++;this.audio.sfx('confirm');this.burst(c.x+15,c.y+10,'#e2bd6b',14);this.floatText('LIBERTO',c.x,c.y-10,'#f2df9f');return;
        }
      }
      for(const p of this.powder){
        if(!p.sabotaged&&Math.abs(px-(p.x+p.w/2))<36){
          p.sabotaged=true;this.objective.powder++;this.audio.sfx('fire');this.burst(p.x+9,p.y+8,'#e86735',16);this.floatText('SABOTADO',p.x,p.y-10,'#ef8b4e');return;
        }
      }
      if(this.stage.cagePotira&&!this.potiraFreed&&Math.abs(px-this.stage.cagePotira.x)<45){
        if(this.objective.powder>=3){
          this.potiraFreed=true;this.audio.sfx('confirm');this.popup={title:'POTIRA ESTÁ LIVRE',lines:['Agora alcancem os navios.'],kind:'small'};this.popupTimer=2.5;
        }else{this.popup={title:'GRADES REFORÇADAS',lines:['Sabote os depósitos antes de libertá-la.'],kind:'small'};this.popupTimer=2;}
        return;
      }
      if(Math.abs(px-this.stage.exit.x)<50){
        if(this.canFinishStage())this.finishStage();
        else{this.popup={title:'OBJETIVO INCOMPLETO',lines:[this.objectiveStatus()],kind:'small'};this.popupTimer=2.4;}
      }
    }

    canFinishStage() {
      const type=this.stage.objective.type;
      if(type==='collect')return this.objective.herbs>=3&&this.objective.talkedPotira;
      if(type==='rescue')return this.objective.rescued>=3&&this.objective.bossDefeated;
      if(type==='boss')return this.objective.bossDefeated;
      if(type==='sabotage')return this.objective.powder>=3&&this.potiraFreed&&this.objective.bossDefeated;
      if(type==='final')return this.objective.bossDefeated;
      return true;
    }

    finishStage() {
      if(this.stageIndex===CONTENT.stages.length-1){
        this.audio.sfx('fire');
        this.playCutscene(CONTENT.ending,()=>{
          this.state='endingDone';this.audio.setTheme('ending');localStorage.removeItem(SAVE_KEY);this.continueAvailable=false;
        });
        return;
      }
      this.runStats=this.player.syncStats();
      this.upgradeChoices=[...CONTENT.upgrades].sort(()=>Math.random()-.5).slice(0,3);
      this.menuIndex=0;this.state='upgrade';this.audio.setTheme('memory');
    }

    onEnemyKilled(enemy) {
      if(enemy.boss){this.objective.bossDefeated=true;this.popup={title:`${enemy.name||'CHEFE'} DERROTADO`,lines:['A passagem está aberta.'],kind:'small'};this.popupTimer=3;this.audio.setTheme(this.stage.theme);this.shake=9;}
      if(Math.random()<.28&&!enemy.boss){
        this.pickups.push({id:`drop${Math.random()}`,type:Math.random()<.55?'arrows':'heal',x:enemy.x+enemy.w/2,y:enemy.y+5,taken:false,w:10,h:10,bob:rnd(0,6)});
      }
    }

    updateEnvironment(dt) {
      if((this.stage.fires||[]).length&&Math.random()<dt*18){
        const f=this.stage.fires[irnd(0,this.stage.fires.length-1)];
        this.particles.push(new Particle(f.x+rnd(-3,3),f.y-5,'#ed7134',{vx:rnd(-8,8),vy:rnd(-40,-15),gravity:-12,life:rnd(.3,.7),size:irnd(1,3)}));
      }
      if(this.stage.biome==='burning'&&Math.random()<dt*16){
        this.particles.push(new Particle(this.cameraX+rnd(0,W),rnd(20,210),'#d66b35',{vx:rnd(-12,12),vy:rnd(-10,10),gravity:-3,life:rnd(.5,1.4),size:1,kind:'spark'}));
      }
    }

    objectiveStatus() {
      const type=this.stage.objective.type;
      if(type==='collect')return `Ervas ${this.objective.herbs}/3 • Potira ${this.objective.talkedPotira?'encontrada':'não encontrada'}`;
      if(type==='rescue')return `Prisioneiros ${this.objective.rescued}/3 • Capitão ${this.objective.bossDefeated?'derrotado':'vivo'}`;
      if(type==='boss')return this.objective.bossDefeated?'Bergantim destruído':'Destrua o bergantim';
      if(type==='sabotage')return `Pólvora ${this.objective.powder}/3 • Potira ${this.potiraFreed?'livre':'presa'} • Oficial ${this.objective.bossDefeated?'derrotado':'vivo'}`;
      if(type==='final')return this.objective.bossDefeated?'Acenda o pavio':'Derrote o capitão';
      return this.stage.objective.text;
    }

    burst(x,y,color,count=8){
      for(let i=0;i<count;i++)this.particles.push(new Particle(x,y,color,{vx:rnd(-90,90),vy:rnd(-110,25),gravity:220,life:rnd(.22,.7),size:irnd(1,3),kind:Math.random()<.25?'spark':'square'}));
    }
    floatText(value,x,y,color='#fff'){this.floaters.push({value,x,y,color,life:.8});}

    draw() {
      ctx.save();
      const sx=this.shake?rnd(-this.shake,this.shake):0, sy=this.shake?rnd(-this.shake*.5,this.shake*.5):0;
      ctx.translate(Math.round(sx),Math.round(sy));
      switch(this.state){
        case 'menu':this.drawMenu();break;
        case 'controls':this.drawControls();break;
        case 'credits':this.drawCredits();break;
        case 'cutscene':this.drawCutscene();break;
        case 'play':case 'dialogue':case 'memory':case 'pause':case 'death':case 'upgrade':
          this.drawWorld();
          if(this.state==='dialogue')this.drawDialogue();
          if(this.state==='memory')this.drawMemory();
          if(this.state==='pause')this.drawPause();
          if(this.state==='death')this.drawDeath();
          if(this.state==='upgrade')this.drawUpgrade();
          break;
        case 'endingDone':this.drawEndingDone();break;
      }
      ctx.restore();
    }

    drawMenu() {
      this.drawCinematicBackground('birds');
      const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(3,15,12,.05)');g.addColorStop(1,'rgba(1,5,4,.9)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      text('ECOS DO BRASIL',W/2,34,22,'#f0d69a','center');
      text('TERRA INVADIDA',W/2,61,11,'#e46b38','center');
      text('O PASSADO NUNCA ESQUECE',W/2,80,7,'#b9cbb9','center');
      ctx.fillStyle='rgba(236,207,149,.25)';ctx.fillRect(W/2-92,94,184,1);
      const opts=this.menuOptions();
      opts.forEach((o,i)=>{
        const y=118+i*24;
        if(i===this.menuIndex){ctx.fillStyle='rgba(214,95,45,.36)';ctx.fillRect(W/2-82,y-4,164,18);text('◆',W/2-70,y,8,'#ef9b55','left');}
        text(o.label,W/2,y,9,i===this.menuIndex?'#fff2cc':'#b8c4b7','center');
      });
      text('ENTER: selecionar  •  M: áudio',W/2,H-24,7,'#839b8c','center');
      text('“O rio conhece meu nome. A mata conhece minha dor.”',W/2,H-12,6,'#d7c79e','center');
    }

    drawControls() {
      this.drawCinematicBackground('village');
      ctx.fillStyle='rgba(1,7,5,.82)';ctx.fillRect(0,0,W,H);
      panel(58,25,364,220,.92);
      text('CONTROLES',W/2,39,15,'#f0d69a','center');
      const rows=[
        ['A / D ou ← / →','Mover'],['W / ↑ / ESPAÇO','Saltar e nadar para cima'],['S / ↓','Nadar para baixo'],
        ['J ou X','Golpe de tacape'],['K ou C','Disparar flecha'],['L ou SHIFT','Esquiva invulnerável'],
        ['E ou ENTER','Interagir, libertar e sabotar'],['P ou ESC','Pausar'],['M','Ligar ou desligar áudio']
      ];
      rows.forEach((r,i)=>{const y=70+i*16;text(r[0],82,y,7,'#efb56e');text(r[1],220,y,7,'#d4ded5');});
      text('O jogo também possui botões de toque em celulares.',W/2,220,7,'#a9bbae','center');
      text('ENTER ou ESC: voltar',W/2,238,7,'#e2cf9e','center');
    }

    drawCredits() {
      this.drawCinematicBackground('memory');
      ctx.fillStyle='rgba(2,8,7,.86)';ctx.fillRect(0,0,W,H);
      text('CRÉDITOS E CONTEXTO',W/2,18,14,'#f0d69a','center');
      const lines=[
        'ECOS DO BRASIL: TERRA INVADIDA',
        '',
        'Jogo independente em HTML5 Canvas.',
        'Arte, animações, partículas e áudio são gerados por código.',
        '',
        'FICÇÃO HISTÓRICA',
        'Inspirada em Aimberê e na Confederação dos Tamoios.',
        'Não é uma reconstrução literal dos acontecimentos.',
        'Potira e o incêndio final dos navios pertencem à ficção.',
        '',
        'A Confederação reuniu diferentes grupos indígenas em resistência',
        'no litoral do atual Sudeste durante o século XVI.',
        'Aimberê morreu na batalha de Uruçumirim em 1567.',
        '',
        'DIREÇÃO SONORA',
        'Trilha original procedural com percussão, timbres de sopro,',
        'sons de mata, água e combate. Não representa música ritual real.',
        '',
        'Frase-tema:',
        '“O rio conhece meu nome. A mata conhece minha dor.”',
        '',
        'ENTER ou ESC: voltar'
      ];
      const startY=48-Math.min(this.creditsScroll,70);
      lines.forEach((l,i)=>text(l,W/2,startY+i*11,l===l.toUpperCase()&&l?8:7,l===l.toUpperCase()&&l?'#e9bd71':'#c7d2c8','center'));
    }

    drawCutscene() {
      const slide=this.cutscene[this.cutIndex];
      if(!slide)return;
      this.drawCinematicBackground(slide.scene);
      const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(0,0,0,.05)');shade.addColorStop(.55,'rgba(0,0,0,.15)');shade.addColorStop(1,'rgba(0,0,0,.92)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
      text(slide.title||'',W/2,28,15,'#f1d69a','center');
      if(slide.subtitle)text(slide.subtitle,W/2,48,9,'#e66c3b','center');
      const lines=(slide.lines||[]).flatMap(l=>wrapText(l,70));
      lines.forEach((l,i)=>text(l,W/2,196+i*12,8,'#eef2e8','center'));
      text(`${this.cutIndex+1}/${this.cutscene.length}  •  ENTER para continuar  •  ESC para pular`,W/2,H-12,6,'#98aa9b','center');
    }

    drawCinematicBackground(scene) {
      ctx.fillStyle='#6d9e8d';ctx.fillRect(0,0,W,H);
      const t=this.time;
      if(['birds','village','aimbere','warning','memory'].includes(scene)){
        ctx.fillStyle='#7ca99b';ctx.fillRect(0,0,W,145);
        ctx.fillStyle='#507962';ctx.beginPath();ctx.moveTo(0,128);for(let x=0;x<=W;x+=40)ctx.lineTo(x,90+Math.sin(x*.03)*18);ctx.lineTo(W,170);ctx.lineTo(0,170);ctx.fill();
        ctx.fillStyle='#244a39';for(let x=0;x<W;x+=36){ctx.fillRect(x,90+(x%70),7,100);ctx.beginPath();ctx.arc(x+4,90+(x%70),22,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#2e6d6b';ctx.fillRect(0,168,W,35);for(let x=0;x<W;x+=16){ctx.fillStyle=x%32?'#4f9890':'#75b2a9';ctx.fillRect(x,168+Math.sin(t*2+x)*2,13,2);}
        ctx.fillStyle='#4c3526';ctx.fillRect(0,203,W,67);
      }
      if(['ships','shore','capture','lastnight','duel','fuse','explosion'].includes(scene)){
        ctx.fillStyle=scene==='explosion'?'#873f31':'#5e6f78';ctx.fillRect(0,0,W,150);
        ctx.fillStyle='#223e4c';ctx.fillRect(0,150,W,120);
        for(let y=154;y<H;y+=10){ctx.fillStyle=y%20?'#2d5663':'#3c6b75';ctx.fillRect(0,y,W,2);}
        this.drawBigShip(305,130,scene==='explosion');
        this.drawBigShip(105,150,false,.72);
      }
      if(['fire','rescue'].includes(scene)){
        ctx.fillStyle='#5f3f3d';ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#1d211d';for(let x=0;x<W;x+=40){ctx.fillRect(x,80,9,160);ctx.beginPath();ctx.arc(x+5,80,24,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#4a3025';ctx.fillRect(0,214,W,56);
        for(let x=20;x<W;x+=70)this.drawFlame(x,215,1.6);
      }
      if(scene==='water'){
        ctx.fillStyle='#6c9693';ctx.fillRect(0,0,W,128);ctx.fillStyle='#376f76';ctx.fillRect(0,128,W,142);
        for(let y=132;y<H;y+=13){ctx.fillStyle=y%26?'#4f9092':'#70b3ad';ctx.fillRect(0,y,W,2);}
        for(let x=25;x<W;x+=95)this.drawCanoe(x,166,1.1);
      }
      if(scene==='aimbere'||scene==='memory'||scene==='warning')this.drawLargeAimbere(130,218,scene==='memory'?1.5:1.8);
      if(scene==='village'){
        this.drawHut(250,198,1.4,false);this.drawHut(370,205,1.1,false);this.drawLargeAimbere(116,218,1.4);
      }
      if(scene==='capture'){
        this.drawLargeAimbere(100,220,1.25);this.drawColonistLarge(340,218,1.35);this.drawPotiraLarge(290,218,1.2);
      }
      if(scene==='rescue'){
        this.drawLargeAimbere(140,220,1.25);this.drawPotiraLarge(260,220,1.2);
      }
      if(scene==='duel'){
        this.drawLargeAimbere(145,220,1.4);this.drawColonistLarge(325,220,1.45);
      }
      if(scene==='fuse'){
        this.drawLargeAimbere(190,220,1.4);ctx.fillStyle='#d66b35';ctx.fillRect(285,190,5,4);for(let i=0;i<30;i++){ctx.fillStyle=i%2?'#f0aa4f':'#d5522f';ctx.fillRect(286+i*3,192+Math.sin(i+t*8)*3,3,2);}
      }
      if(scene==='explosion'){
        const r=58+Math.sin(t*8)*8;ctx.fillStyle='rgba(255,213,98,.9)';ctx.beginPath();ctx.arc(320,135,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(235,88,42,.8)';ctx.beginPath();ctx.arc(320,135,r*.65,0,Math.PI*2);ctx.fill();
      }
      if(scene==='birds'||scene==='ships')this.drawBirdFlock();
    }

    drawBigShip(x,y,burning=false,scale=1) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
      ctx.fillStyle='#4b2f23';ctx.beginPath();ctx.moveTo(-70,12);ctx.lineTo(72,12);ctx.lineTo(50,40);ctx.lineTo(-54,40);ctx.fill();
      ctx.fillStyle='#8a5b38';ctx.fillRect(-58,7,112,8);ctx.fillStyle='#3d2b22';ctx.fillRect(-2,-74,6,82);
      ctx.fillStyle='#ddd0ae';ctx.beginPath();ctx.moveTo(5,-70);ctx.lineTo(58,-28);ctx.lineTo(5,-28);ctx.fill();ctx.strokeStyle='#7e5f45';ctx.stroke();
      ctx.fillStyle='#9e3d35';ctx.fillRect(6,-62,38,7);
      if(burning){this.drawFlame(-30,5,2);this.drawFlame(30,7,2.5);}
      ctx.restore();
    }

    drawBirdFlock() {
      ctx.strokeStyle='#18231f';ctx.lineWidth=1;
      for(const b of this.titleBirds){
        b.x-=b.s*.15;if(b.x<-10)b.x=W+10;
        const y=b.y+Math.sin(this.time*3+b.phase)*3;
        ctx.beginPath();ctx.moveTo(b.x-4*b.s,y);ctx.quadraticCurveTo(b.x-1*b.s,y-3*b.s,b.x,y);ctx.quadraticCurveTo(b.x+1*b.s,y-3*b.s,b.x+4*b.s,y);ctx.stroke();
      }
    }

    drawWorld() {
      this.drawStageBackground();
      this.drawStagePropsBack();
      this.drawPlatforms();
      this.drawStagePropsFront();
      this.pickups.forEach(p=>{if(!p.taken)this.drawPickup(p);});
      this.cages.forEach(c=>this.drawCage(c));
      this.powder.forEach(p=>this.drawPowder(p));
      if(this.stage.cagePotira)this.drawPotiraCage();
      this.enemies.forEach(e=>e.draw(this.cameraX));
      this.projectiles.forEach(p=>p.draw(this.cameraX));
      this.player.draw(this.cameraX);
      this.particles.forEach(p=>p.draw(this.cameraX));
      this.floaters.forEach(f=>{ctx.globalAlpha=clamp(f.life*2,0,1);text(f.value,f.x-this.cameraX,f.y,6,f.color,'center');ctx.globalAlpha=1;});
      this.drawExit();
      this.drawHUD();
      if(this.popupTimer>0&&this.popup)this.drawPopup(this.popup);
      this.drawInteractionHint();
    }

    drawStageBackground() {
      const s=this.stage, cam=this.cameraX;
      ctx.fillStyle=s.palette.sky;ctx.fillRect(0,0,W,H);
      if(s.biome==='ship'){
        ctx.fillStyle='#1f3542';ctx.fillRect(0,145,W,125);
        for(let y=150;y<H;y+=12){ctx.fillStyle=y%24?'#284b59':'#386879';ctx.fillRect(0,y,W,2);}
        ctx.fillStyle=s.palette.far;for(let x=-100-(cam*.1%180);x<W+180;x+=180)this.drawBigShip(x,145,false,.45);
      }else{
        this.drawHillLayer(s.palette.far, .12, 98, 32);
        this.drawHillLayer(s.palette.mid, .25, 132, 25);
        this.drawForestLayer(s.palette.near, .42, 165);
      }
      if(s.biome==='water'){
        ctx.fillStyle='rgba(36,93,100,.88)';ctx.fillRect(0,s.waterY,W,H-s.waterY);
        for(let y=s.waterY+5;y<H;y+=12){ctx.fillStyle=y%24?'rgba(116,190,184,.25)':'rgba(183,224,215,.18)';ctx.fillRect(0,y,W,1);}
        for(let x=-20;x<W+20;x+=24){ctx.fillStyle='#9bd2cb';ctx.fillRect(x+Math.sin(this.time*2+x)*4,s.waterY+Math.sin(this.time*3+x)*2,14,1);}
      }
      if(s.biome==='burning'||s.biome==='camp'){
        ctx.fillStyle='rgba(51,30,24,.22)';for(let i=0;i<7;i++){const x=(i*83-(cam*.08)%83);ctx.beginPath();ctx.arc(x,55+i%3*24,32+i*4,0,Math.PI*2);ctx.fill();}
      }
    }

    drawHillLayer(color,factor,base,amp) {
      const off=-(this.cameraX*factor)%120;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-120,H);ctx.lineTo(-120,base);
      for(let x=-120;x<=W+120;x+=40)ctx.lineTo(x,base+Math.sin((x+off)*.025)*amp+Math.sin((x+off)*.011)*amp*.5);
      ctx.lineTo(W+120,H);ctx.fill();
    }

    drawForestLayer(color,factor,base) {
      const off=-(this.cameraX*factor)%54;ctx.fillStyle=color;
      for(let x=off-60;x<W+60;x+=54){const h=62+(Math.abs((x|0)%75));ctx.fillRect(x,base-h*.35,8,h);ctx.beginPath();ctx.arc(x+4,base-h*.35,22,0,Math.PI*2);ctx.arc(x-8,base-h*.2,18,0,Math.PI*2);ctx.arc(x+18,base-h*.18,17,0,Math.PI*2);ctx.fill();}
    }

    drawStagePropsBack() {
      const cam=this.cameraX;
      for(const h of this.stage.huts||[])this.drawHut(h.x-cam,219,1,h.burn);
      for(const t of this.stage.tents||[])this.drawTent(t.x-cam,219);
      for(const m of this.stage.masts||[]){const x=m.x-cam;ctx.fillStyle='#5b3825';ctx.fillRect(x,62,5,156);ctx.strokeStyle='#b59d75';ctx.beginPath();ctx.moveTo(x+2,65);ctx.lineTo(x-45,218);ctx.moveTo(x+3,65);ctx.lineTo(x+53,218);ctx.stroke();}
      for(const b of this.stage.boats||[])this.drawCanoe(b.x-cam,b.y,1);
    }

    drawStagePropsFront() {
      const cam=this.cameraX;
      for(const f of this.stage.fires||[])this.drawFlame(f.x-cam,f.y,f.calm?.65:1);
      for(const c of this.stage.cannons||[])this.drawCannon(c.x-cam,208);
      for(const n of this.stage.npcs||[])this.drawNPC(n);
    }

    drawPlatforms() {
      const cam=this.cameraX;
      for(const p of this.stage.platforms){
        const x=Math.round(p.x-cam);if(x+p.w<0||x>W)continue;
        const type=p.type||'earth';
        if(['wood','burnt','watch','deck','canoe'].includes(type)){
          ctx.fillStyle=type==='burnt'?'#3a2a25':(type==='deck'?'#65422e':'#755137');ctx.fillRect(x,p.y,p.w,p.h);
          ctx.fillStyle=type==='burnt'?'#735044':'#a77a4d';ctx.fillRect(x,p.y,p.w,2);
          for(let q=8;q<p.w;q+=16){ctx.fillStyle='rgba(35,19,12,.45)';ctx.fillRect(x+q,p.y+2,1,p.h-2);}
        }else if(type==='stone'||type==='rock'){
          ctx.fillStyle='#555b55';ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle='#858a78';ctx.fillRect(x,p.y,p.w,3);
          for(let q=5;q<p.w;q+=13){ctx.fillStyle='#343c38';ctx.fillRect(x+q,p.y+4,6,2);}
        }else if(type==='riverbed'){
          ctx.fillStyle='#273f3c';ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle='#4b7169';ctx.fillRect(x,p.y,p.w,2);
        }else{
          const sand=type==='sand';ctx.fillStyle=sand?'#806d49':this.stage.palette.ground;ctx.fillRect(x,p.y,p.w,p.h);
          ctx.fillStyle=sand?'#c0a86c':'#75924d';ctx.fillRect(x,p.y,p.w,3);
          ctx.fillStyle=sand?'#6f654e':'#30251d';for(let q=4;q<p.w;q+=18)ctx.fillRect(x+q,p.y+8+(q%17),irnd(3,8),2);
        }
      }
    }

    drawHut(x,y,scale=1,burn=false) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#604530';ctx.fillRect(-22,-30,44,30);ctx.fillStyle='#c49a55';ctx.beginPath();ctx.moveTo(-30,-28);ctx.lineTo(0,-55);ctx.lineTo(30,-28);ctx.fill();ctx.fillStyle='#2a211a';ctx.fillRect(-6,-17,12,17);ctx.fillStyle='#8d653c';for(let i=-24;i<26;i+=7)ctx.fillRect(i,-33,2,31);if(burn){this.drawFlame(-13,-34,.8);this.drawFlame(14,-31,1.1);}ctx.restore();
    }
    drawTent(x,y){ctx.fillStyle='#79634c';ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x,y-36);ctx.lineTo(x+25,y);ctx.fill();ctx.fillStyle='#3b3027';ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y-25);ctx.lineTo(x+8,y);ctx.fill();ctx.strokeStyle='#c5ad78';ctx.beginPath();ctx.moveTo(x,y-37);ctx.lineTo(x,y+2);ctx.stroke();}
    drawCanoe(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#4c301f';ctx.beginPath();ctx.moveTo(-32,0);ctx.lineTo(33,0);ctx.lineTo(22,10);ctx.lineTo(-23,10);ctx.fill();ctx.fillStyle='#9b7044';ctx.fillRect(-25,1,49,2);ctx.restore();}
    drawCannon(x,y){ctx.fillStyle='#222528';ctx.fillRect(x-11,y-13,25,7);ctx.fillStyle='#5f3b27';ctx.fillRect(x-6,y-6,17,4);ctx.fillStyle='#27211c';ctx.fillRect(x-7,y-3,5,5);ctx.fillRect(x+7,y-3,5,5);}

    drawFlame(x,y,scale=1) {
      const wob=Math.sin(this.time*12+x)*2*scale;
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
      ctx.fillStyle='#d94d2b';ctx.beginPath();ctx.moveTo(-5,0);ctx.quadraticCurveTo(-9,-10,0+wob,-20);ctx.quadraticCurveTo(9,-10,5,0);ctx.fill();
      ctx.fillStyle='#f0a13d';ctx.beginPath();ctx.moveTo(-3,0);ctx.quadraticCurveTo(-4,-8,1-wob*.3,-14);ctx.quadraticCurveTo(6,-7,3,0);ctx.fill();
      ctx.fillStyle='#ffd36b';ctx.fillRect(-1,-7,3,7);ctx.restore();
    }

    drawPickup(p) {
      const x=Math.round(p.x-this.cameraX),y=Math.round(p.y+Math.sin(this.time*4+p.bob)*2);
      const c=this.pickupColor(p.type);ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x-6,y-6,12,12);ctx.fillStyle=c;
      if(p.type==='herb'){ctx.fillRect(x-1,y-5,2,10);ctx.fillRect(x-5,y-3,5,3);ctx.fillRect(x+1,y-1,5,3);}
      else if(p.type==='arrows'){for(let i=-3;i<=3;i+=3)ctx.fillRect(x+i,y-6,1,12);ctx.fillStyle='#b84b34';ctx.fillRect(x-5,y-7,11,2);}
      else if(p.type==='heal'){ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle='#e8dfb5';ctx.fillRect(x-1,y-5,2,10);ctx.fillRect(x-5,y-1,10,2);}
      else if(p.type==='breath'){ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dff7f1';ctx.fillRect(x-1,y-3,2,2);}
      else {ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3:7;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.fill();}
    }

    drawNPC(n) {
      const x=Math.round(n.x-this.cameraX),y=n.y+25;ctx.save();ctx.translate(x,y);
      ctx.fillStyle='#7b3e2c';ctx.fillRect(-4,-8,3,8);ctx.fillRect(1,-8,3,8);ctx.fillStyle=n.color||'#b55d42';ctx.fillRect(-6,-21,12,13);ctx.fillStyle='#ead9aa';ctx.fillRect(-5,-18,10,2);ctx.fillStyle='#1a1512';ctx.fillRect(-5,-27,10,7);ctx.fillStyle='#a85d3f';ctx.fillRect(-4,-25,8,6);ctx.fillStyle='#f0e0b9';ctx.fillRect(-4,-23,8,2);ctx.restore();
      if(Math.abs((this.player?.x||0)-n.x)<50)text(n.name,x,n.y-13,6,'#f0d899','center');
    }

    drawCage(c) {
      const x=Math.round(c.x-this.cameraX),y=c.y;if(c.rescued){ctx.strokeStyle='#66503a';ctx.beginPath();ctx.moveTo(x,y+30);ctx.lineTo(x+25,y+5);ctx.stroke();return;}
      ctx.strokeStyle='#70604a';ctx.lineWidth=2;ctx.strokeRect(x,y,c.w,c.h);for(let i=5;i<c.w;i+=6){ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i,y+c.h);ctx.stroke();}
      ctx.fillStyle='#aa5c3f';ctx.fillRect(x+11,y+13,8,12);ctx.fillStyle='#171412';ctx.fillRect(x+10,y+8,10,6);
    }

    drawPowder(p) {
      const x=Math.round(p.x-this.cameraX),y=p.y;ctx.fillStyle=p.sabotaged?'#3b2922':'#744832';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle=p.sabotaged?'#c85031':'#b99961';ctx.fillRect(x,y+4,p.w,3);ctx.fillRect(x,y+14,p.w,3);if(p.sabotaged)this.drawFlame(x+9,y+3,.45);
    }

    drawPotiraCage() {
      const c=this.stage.cagePotira,x=Math.round(c.x-this.cameraX),y=c.y;
      if(this.potiraFreed){this.drawPotiraSprite(x,y+25);return;}
      ctx.strokeStyle='#7c6648';ctx.lineWidth=2;ctx.strokeRect(x-12,y-6,34,38);for(let i=-7;i<20;i+=7){ctx.beginPath();ctx.moveTo(x+i,y-6);ctx.lineTo(x+i,y+32);ctx.stroke();}this.drawPotiraSprite(x+5,y+28);
    }

    drawPotiraSprite(x,y) {
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#7f422e';ctx.fillRect(-4,-8,3,8);ctx.fillRect(1,-8,3,8);ctx.fillStyle='#b85f45';ctx.fillRect(-6,-20,12,12);ctx.fillStyle='#e6d1a0';ctx.fillRect(-5,-16,10,2);ctx.fillStyle='#17120f';ctx.fillRect(-6,-27,12,9);ctx.fillStyle='#ad6043';ctx.fillRect(-4,-25,8,6);ctx.fillStyle='#efe0b9';ctx.fillRect(-4,-23,8,2);ctx.fillStyle='#d85237';ctx.fillRect(-1,-30,2,5);ctx.restore();
    }

    drawExit() {
      const x=Math.round(this.stage.exit.x-this.cameraX);if(x<-30||x>W+30)return;
      ctx.fillStyle='rgba(231,203,139,.18)';ctx.fillRect(x-10,155,20,65);ctx.fillStyle=this.canFinishStage()?'#edd58f':'#9d7758';ctx.fillRect(x-1,164,2,53);ctx.beginPath();ctx.moveTo(x+1,165);ctx.lineTo(x+18,171);ctx.lineTo(x+1,179);ctx.fill();
      text(this.stage.exit.label,x,144,6,this.canFinishStage()?'#f2dda3':'#a99983','center');
    }

    drawInteractionHint() {
      if(!this.player||this.state!=='play')return;const px=this.player.x+this.player.w/2;let hint='';
      for(const n of this.stage.npcs||[])if(Math.abs(px-n.x)<34)hint=`E — falar com ${n.name}`;
      for(const c of this.cages)if(!c.rescued&&Math.abs(px-(c.x+15))<40)hint='E — libertar prisioneiro';
      for(const p of this.powder)if(!p.sabotaged&&Math.abs(px-(p.x+9))<36)hint='E — sabotar pólvora';
      if(this.stage.cagePotira&&!this.potiraFreed&&Math.abs(px-this.stage.cagePotira.x)<45)hint='E — libertar Potira';
      if(Math.abs(px-this.stage.exit.x)<50)hint=this.canFinishStage()?'E — avançar':'Objetivo ainda incompleto';
      if(hint){panel(W/2-90,H-38,180,20,.72);text(hint,W/2,H-32,7,'#f1dda6','center');}
    }

    drawHUD() {
      panel(7,7,158,35,.72);
      text('AIMBERÊ',13,12,7,'#f0d79a');
      ctx.fillStyle='#331c1d';ctx.fillRect(13,23,112,7);ctx.fillStyle='#b63d35';ctx.fillRect(13,23,112*(this.player.health/this.player.maxHealth),7);ctx.strokeStyle='#dac292';ctx.strokeRect(12.5,22.5,113,8);
      text(`${Math.ceil(this.player.health)}/${this.player.maxHealth}`,131,22,6,'#eee2c3');
      text(`FLECHAS ${this.player.arrows}`,13,33,6,'#d9c282');text(`MEMÓRIAS ${this.player.memory}`,84,33,6,'#d9c282');
      if(this.player.inWater){ctx.fillStyle='#173d48';ctx.fillRect(174,10,75,7);ctx.fillStyle='#69bfc1';ctx.fillRect(174,10,75*(this.player.breath/this.player.maxBreath),7);ctx.strokeStyle='#b8e0da';ctx.strokeRect(173.5,9.5,76,8);text('FÔLEGO',212,20,6,'#bfe4df','center');}
      panel(W-198,7,191,36,.72);text(this.stage.objective.text,W-103,12,6,'#ead299','center');text(this.objectiveStatus(),W-103,25,6,'#c7d2c8','center');
      const boss=this.enemies.find(e=>e.boss&&!e.dead);if(boss){panel(105,H-24,270,17,.82);ctx.fillStyle='#3c1c20';ctx.fillRect(112,H-18,256,5);ctx.fillStyle='#c24b3a';ctx.fillRect(112,H-18,256*(boss.health/boss.maxHealth),5);text(boss.name||'CHEFE',W/2,H-22,6,'#f0d598','center');}
    }

    drawPopup(p) {
      const w=p.kind==='small'?270:360,h=p.kind==='small'?48:64,x=(W-w)/2,y=p.kind==='small'?62:74;panel(x,y,w,h,.9);text(p.title,W/2,y+10,p.kind==='small'?9:11,'#f0d496','center');(p.lines||[]).forEach((l,i)=>text(l,W/2,y+29+i*11,7,'#d4dfd5','center'));
    }

    drawDialogue() {
      const d=this.dialogue,line=d.lines[this.dialogueIndex];panel(25,H-80,W-50,58,.94);text(d.name,40,H-70,8,'#eabf70');wrapText(line,72).forEach((l,i)=>text(l,40,H-54+i*11,8,'#eef3e9'));text('ENTER',W-45,H-32,6,'#b5c3b8','right');
    }

    drawMemory() {
      ctx.fillStyle='rgba(1,7,6,.78)';ctx.fillRect(0,0,W,H);panel(48,44,W-96,180,.96);text('MEMÓRIA HISTÓRICA',W/2,61,13,'#f0d493','center');text(this.stage.year,W/2,82,7,'#d56b3b','center');const lines=wrapText(this.stage.memoryText,66);lines.forEach((l,i)=>text(l,W/2,111+i*13,8,'#e3eae2','center'));text('Esta informação contextualiza uma narrativa ficcional.',W/2,187,7,'#9fb1a3','center');text('ENTER para voltar',W/2,205,7,'#dec995','center');
    }

    drawPause() {
      ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(0,0,W,H);panel(130,62,220,145,.95);text('PAUSA',W/2,79,15,'#efd496','center');text('P / ESC / ENTER — continuar',W/2,116,8,'#dce5dc','center');text('R — reiniciar a fase',W/2,137,8,'#dce5dc','center');text('Q — voltar ao menu',W/2,158,8,'#dce5dc','center');text('M — alternar áudio',W/2,179,8,'#dce5dc','center');
    }

    drawDeath() {
      ctx.fillStyle='rgba(28,4,8,.68)';ctx.fillRect(0,0,W,H);panel(85,72,310,128,.95);text('A TERRA SE LEMBRA',W/2,91,14,'#e5c47e','center');text('Aimberê caiu, mas a memória permanece.',W/2,123,8,'#e2e8df','center');text('ENTER — retornar ao início desta fase',W/2,151,7,'#f0d49a','center');text('ESC — menu principal',W/2,170,7,'#abb9ae','center');
    }

    drawUpgrade() {
      ctx.fillStyle='rgba(0,0,0,.74)';ctx.fillRect(0,0,W,H);text('A FLORESTA GUARDA UMA FORÇA',W/2,35,13,'#efd496','center');text('Escolha uma memória para levar adiante',W/2,56,7,'#b9c7bc','center');
      this.upgradeChoices.forEach((u,i)=>{const x=42+i*146,y=82,w=124,h=118;panel(x,y,w,h,i===this.menuIndex?.98:.83);if(i===this.menuIndex){ctx.strokeStyle='#ef8848';ctx.strokeRect(x-2,y-2,w+4,h+4);}ctx.fillStyle=i===0?'#9e4937':i===1?'#2e7667':'#c1924c';ctx.beginPath();ctx.arc(x+w/2,y+30,17,0,Math.PI*2);ctx.fill();text(u.name,x+w/2,y+57,8,'#f1d99e','center');wrapText(u.description,20).forEach((l,j)=>text(l,x+w/2,y+78+j*10,7,'#dce5dc','center'));});
      text('← / → escolher  •  ENTER confirmar',W/2,220,7,'#d7c595','center');
    }

    drawEndingDone() {
      this.drawCinematicBackground('birds');ctx.fillStyle='rgba(0,8,6,.66)';ctx.fillRect(0,0,W,H);text('ECOS DO BRASIL',W/2,63,21,'#f0d69a','center');text('TERRA INVADIDA CONCLUÍDA',W/2,92,10,'#e36b39','center');text('O rio conhece meu nome.',W/2,129,9,'#e6eee6','center');text('A mata conhece minha dor.',W/2,144,9,'#e6eee6','center');text('ENTER para voltar ao menu',W/2,202,7,'#d7c596','center');
    }

    drawLargeAimbere(x,y,scale=1) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#7c3e2a';ctx.fillRect(-8,-16,6,16);ctx.fillRect(2,-16,6,16);ctx.fillStyle='#cc4c34';ctx.fillRect(-12,-23,24,9);ctx.fillStyle='#235a4e';ctx.fillRect(-14,-19,6,13);ctx.fillRect(8,-19,6,13);ctx.fillStyle='#a95c3d';ctx.fillRect(-9,-42,18,20);ctx.fillStyle='#efe0b7';ctx.fillRect(-8,-37,16,3);ctx.fillRect(-3,-42,3,20);ctx.fillStyle='#18130f';ctx.fillRect(-10,-54,20,14);ctx.fillRect(-14,-48,8,11);ctx.fillStyle='#ad6242';ctx.fillRect(-7,-50,14,11);ctx.fillStyle='#efe0b9';ctx.fillRect(-7,-47,14,3);ctx.fillStyle='#151513';ctx.fillRect(4,-47,2,2);ctx.fillStyle='#d34f36';ctx.fillRect(-3,-63,3,11);ctx.fillStyle='#e8d49e';ctx.fillRect(2,-61,3,10);ctx.fillStyle='#4d2f21';ctx.fillRect(11,-40,4,34);ctx.fillStyle='#161918';ctx.fillRect(8,-10,11,8);ctx.restore();
    }
    drawPotiraLarge(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#85452f';ctx.fillRect(-7,-15,5,15);ctx.fillRect(2,-15,5,15);ctx.fillStyle='#bd5f43';ctx.fillRect(-10,-35,20,20);ctx.fillStyle='#ead7aa';ctx.fillRect(-9,-29,18,3);ctx.fillStyle='#17120f';ctx.fillRect(-11,-53,22,20);ctx.fillStyle='#b96a49';ctx.fillRect(-7,-49,14,12);ctx.fillStyle='#efe0b9';ctx.fillRect(-7,-46,14,3);ctx.fillStyle='#d84f35';ctx.fillRect(-2,-60,3,9);ctx.restore();}
    drawColonistLarge(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#25211e';ctx.fillRect(-8,-15,6,15);ctx.fillRect(2,-15,6,15);ctx.fillStyle='#8e6f56';ctx.fillRect(-11,-39,22,24);ctx.fillStyle='#eee0bd';ctx.fillRect(-3,-37,6,16);ctx.fillStyle='#a43f36';ctx.fillRect(-11,-23,22,4);ctx.fillStyle='#c5926d';ctx.fillRect(-7,-53,14,12);ctx.fillStyle='#44454b';ctx.fillRect(-10,-58,20,8);ctx.fillRect(-15,-53,29,3);ctx.fillStyle='#d0c8ae';ctx.fillRect(10,-35,3,30);ctx.restore();}
  }

  window.__ECOS_GAME__ = new Game();
})();
