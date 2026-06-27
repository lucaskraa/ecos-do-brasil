(() => {
  'use strict';

  const EB = window.EB = window.EB || {};

  EB.VERSION = '3.0.0';
  EB.TITLE = 'Ecos do Brasil: Terra Invadida';
  EB.CANVAS_WIDTH = 1600;
  EB.CANVAS_HEIGHT = 900;
  EB.GRAVITY = 2350;
  EB.TERMINAL_VELOCITY = 1250;
  EB.SAVE_KEY = 'ecos-do-brasil-terra-invadida-v2';
  EB.DEBUG = false;

  EB.KEYS = Object.freeze({
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW', 'Space'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'ArrowUp', 'KeyW'],
    attack: ['KeyJ', 'KeyX'],
    bow: ['KeyK', 'KeyC'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyL'],
    interact: ['KeyE', 'Enter'],
    pause: ['Escape', 'KeyP'],
    heal: ['KeyH', 'KeyQ'],
    map: ['Tab'],
    sound: ['KeyM'],
    fullscreen: ['KeyF'],
    skip: ['Escape']
  });

  EB.PALETTES = Object.freeze({
    dawn: {
      skyTop: '#274f5f',
      skyBottom: '#e2a55f',
      sun: '#ffe5a3',
      mountainFar: '#3d5e59',
      mountainMid: '#2d4d3d',
      mountainNear: '#193d2d',
      foliageDark: '#071c14',
      foliageMid: '#174b31',
      foliageLight: '#3e7746',
      ground: '#271b14',
      moss: '#315d35',
      waterTop: '#2f8392',
      waterBottom: '#103f4e',
      fog: 'rgba(215,232,206,0.16)',
      accent: '#e7b65e',
      danger: '#c5432f'
    },
    village: {
      skyTop: '#315d70',
      skyBottom: '#e9b36d',
      sun: '#ffe9a9',
      mountainFar: '#57716a',
      mountainMid: '#365748',
      mountainNear: '#1c4532',
      foliageDark: '#071d14',
      foliageMid: '#19523a',
      foliageLight: '#3f834b',
      ground: '#2c2117',
      moss: '#3b6f3b',
      waterTop: '#328899',
      waterBottom: '#104c5a',
      fog: 'rgba(234,225,188,0.12)',
      accent: '#f2c774',
      danger: '#bd3f2d'
    },
    fire: {
      skyTop: '#1b1b28',
      skyBottom: '#8d3629',
      sun: '#ffb34f',
      mountainFar: '#4c3337',
      mountainMid: '#39262b',
      mountainNear: '#1c241e',
      foliageDark: '#070d0a',
      foliageMid: '#1c3525',
      foliageLight: '#4d5b2c',
      ground: '#24130f',
      moss: '#4d4a23',
      waterTop: '#305663',
      waterBottom: '#0c2c35',
      fog: 'rgba(94,63,46,0.32)',
      accent: '#f4b150',
      danger: '#ef4b2e'
    },
    water: {
      skyTop: '#244e62',
      skyBottom: '#9bc8bd',
      sun: '#eaf9cc',
      mountainFar: '#416f6d',
      mountainMid: '#295754',
      mountainNear: '#163d3b',
      foliageDark: '#061b17',
      foliageMid: '#0f4c3d',
      foliageLight: '#2c7960',
      ground: '#132925',
      moss: '#2e6f55',
      waterTop: '#2e8aa0',
      waterBottom: '#07384a',
      fog: 'rgba(172,225,217,0.18)',
      accent: '#9fd7bd',
      danger: '#d35d3d'
    },
    storm: {
      skyTop: '#121b2a',
      skyBottom: '#3c4e59',
      sun: '#d0d3be',
      mountainFar: '#3a4652',
      mountainMid: '#293841',
      mountainNear: '#152b2c',
      foliageDark: '#061313',
      foliageMid: '#153633',
      foliageLight: '#2e5e50',
      ground: '#1b1a18',
      moss: '#304c3b',
      waterTop: '#315c6f',
      waterBottom: '#0c2f40',
      fog: 'rgba(189,207,203,0.15)',
      accent: '#c0b58c',
      danger: '#c64736'
    },
    fortress: {
      skyTop: '#242b36',
      skyBottom: '#7b5b48',
      sun: '#e8c78c',
      mountainFar: '#4b4f52',
      mountainMid: '#3a3f3e',
      mountainNear: '#242e28',
      foliageDark: '#07130f',
      foliageMid: '#1c382c',
      foliageLight: '#465839',
      ground: '#2b211b',
      moss: '#455a32',
      waterTop: '#466b70',
      waterBottom: '#1a3940',
      fog: 'rgba(179,164,141,0.16)',
      accent: '#d8b273',
      danger: '#ca432f'
    },
    ship: {
      skyTop: '#111824',
      skyBottom: '#8a472f',
      sun: '#ffbe63',
      mountainFar: '#434552',
      mountainMid: '#313641',
      mountainNear: '#1e2b2c',
      foliageDark: '#050a08',
      foliageMid: '#11251c',
      foliageLight: '#32422c',
      ground: '#332016',
      moss: '#4d4930',
      waterTop: '#2c5e70',
      waterBottom: '#0a2939',
      fog: 'rgba(86,70,65,0.2)',
      accent: '#e5b761',
      danger: '#f1532d'
    },
    night: {
      skyTop: '#07101e',
      skyBottom: '#172d3a',
      sun: '#d9e9e4',
      mountainFar: '#172937',
      mountainMid: '#11242d',
      mountainNear: '#0a1b1d',
      foliageDark: '#020908',
      foliageMid: '#0b251d',
      foliageLight: '#1b4938',
      ground: '#15120f',
      moss: '#24472f',
      waterTop: '#183f55',
      waterBottom: '#061d2d',
      fog: 'rgba(151,186,191,0.1)',
      accent: '#9ec9bd',
      danger: '#cf3f35'
    }
  });

  EB.COLORS = Object.freeze({
    white: '#fff6d7',
    paper: '#ecd6a3',
    gold: '#e6b968',
    darkGold: '#7a5224',
    red: '#b5322d',
    orange: '#dd6535',
    green: '#2e7c4c',
    darkGreen: '#0d2b20',
    teal: '#2d7f8c',
    blue: '#3e7ca1',
    black: '#050807',
    shadow: 'rgba(0,0,0,0.72)',
    panel: 'rgba(6,16,13,0.88)',
    panelLight: 'rgba(20,49,36,0.85)',
    health: '#bb342d',
    stamina: '#e4b64f',
    breath: '#4ba9b6',
    memory: '#72ba7b'
  });

  EB.PLAYER_DEFAULTS = Object.freeze({
    maxHealth: 130,
    health: 130,
    maxStamina: 100,
    stamina: 100,
    maxBreath: 12,
    breath: 12,
    moveSpeed: 390,
    airSpeed: 340,
    swimSpeed: 260,
    jumpSpeed: 840,
    wallJumpX: 520,
    wallJumpY: 760,
    dashSpeed: 980,
    dashDuration: 0.19,
    dashCooldown: 0.58,
    meleeDamage: 24,
    heavyDamage: 42,
    arrowDamage: 29,
    maxArrows: 12,
    arrows: 12,
    maxHerbs: 3,
    herbs: 2,
    healAmount: 48,
    invulnerability: 0.72,
    coyoteTime: 0.13,
    jumpBuffer: 0.14,
    comboWindow: 0.46
  });

  EB.ENEMY_ARCHETYPES = Object.freeze({
    sailor: {
      health: 72,
      speed: 155,
      damage: 17,
      range: 66,
      vision: 460,
      color: '#6f5341',
      armor: '#a8a09a',
      weapon: 'saber',
      score: 50
    },
    arquebusier: {
      health: 58,
      speed: 115,
      damage: 21,
      range: 560,
      vision: 700,
      color: '#655443',
      armor: '#7e7770',
      weapon: 'arquebus',
      score: 70
    },
    shield: {
      health: 112,
      speed: 105,
      damage: 20,
      range: 74,
      vision: 470,
      color: '#735741',
      armor: '#aaa39a',
      weapon: 'shield',
      score: 90
    },
    officer: {
      health: 150,
      speed: 172,
      damage: 24,
      range: 82,
      vision: 620,
      color: '#793a2d',
      armor: '#c2b09a',
      weapon: 'rapier',
      score: 150
    },
    hound: {
      health: 44,
      speed: 245,
      damage: 14,
      range: 52,
      vision: 520,
      color: '#513f32',
      armor: '#513f32',
      weapon: 'bite',
      score: 45
    },
    canoe: {
      health: 95,
      speed: 90,
      damage: 18,
      range: 630,
      vision: 850,
      color: '#4c3424',
      armor: '#706052',
      weapon: 'canoe',
      score: 110
    },
    elite: {
      health: 185,
      speed: 190,
      damage: 28,
      range: 88,
      vision: 680,
      color: '#4f3230',
      armor: '#b7aea2',
      weapon: 'halberd',
      score: 210
    }
  });

  EB.BOSS_ARCHETYPES = Object.freeze({
    landingCaptain: {
      name: 'Capitão do Desembarque',
      health: 650,
      speed: 215,
      damage: 27,
      phases: 3,
      color: '#833a2a',
      armor: '#c5b19b'
    },
    patrolShip: {
      name: 'Bergantim de Patrulha',
      health: 820,
      speed: 125,
      damage: 31,
      phases: 3,
      color: '#4e3528',
      armor: '#8c7c6b'
    },
    fortressCaptain: {
      name: 'Capitão Duarte de Valença',
      health: 980,
      speed: 235,
      damage: 33,
      phases: 4,
      color: '#6e2d29',
      armor: '#c7bda9'
    },
    armadaCaptain: {
      name: 'Capitão-Mor da Armada',
      health: 1280,
      speed: 250,
      damage: 36,
      phases: 4,
      color: '#4a2527',
      armor: '#d1c4af'
    }
  });

  EB.clamp = function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  };

  EB.lerp = function lerp(start, end, amount) {
    return start + (end - start) * amount;
  };

  EB.inverseLerp = function inverseLerp(start, end, value) {
    if (start === end) {
      return 0;
    }
    return EB.clamp((value - start) / (end - start), 0, 1);
  };

  EB.smoothstep = function smoothstep(minimum, maximum, value) {
    const t = EB.inverseLerp(minimum, maximum, value);
    return t * t * (3 - 2 * t);
  };

  EB.remap = function remap(inMin, inMax, outMin, outMax, value) {
    return EB.lerp(outMin, outMax, EB.inverseLerp(inMin, inMax, value));
  };

  EB.approach = function approach(value, target, delta) {
    if (value < target) {
      return Math.min(value + delta, target);
    }
    return Math.max(value - delta, target);
  };

  EB.sign = function sign(value, fallback = 1) {
    if (value === 0) {
      return fallback;
    }
    return value < 0 ? -1 : 1;
  };

  EB.random = function random(minimum = 0, maximum = 1) {
    return minimum + Math.random() * (maximum - minimum);
  };

  EB.randomInt = function randomInt(minimum, maximum) {
    return Math.floor(EB.random(minimum, maximum + 1));
  };

  EB.choose = function choose(array) {
    return array[Math.floor(Math.random() * array.length)];
  };

  EB.shuffle = function shuffle(array) {
    const copy = array.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const value = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = value;
    }
    return copy;
  };

  EB.distance = function distance(aX, aY, bX, bY) {
    return Math.hypot(bX - aX, bY - aY);
  };

  EB.distanceSquared = function distanceSquared(aX, aY, bX, bY) {
    const dx = bX - aX;
    const dy = bY - aY;
    return dx * dx + dy * dy;
  };

  EB.angle = function angle(aX, aY, bX, bY) {
    return Math.atan2(bY - aY, bX - aX);
  };

  EB.overlap = function overlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  };

  EB.containsPoint = function containsPoint(rectangle, x, y) {
    return (
      x >= rectangle.x &&
      x <= rectangle.x + rectangle.w &&
      y >= rectangle.y &&
      y <= rectangle.y + rectangle.h
    );
  };

  EB.expandRect = function expandRect(rectangle, amount) {
    return {
      x: rectangle.x - amount,
      y: rectangle.y - amount,
      w: rectangle.w + amount * 2,
      h: rectangle.h + amount * 2
    };
  };

  EB.wrapText = function wrapText(context, text, maxWidth) {
    const paragraphs = String(text).split('\n');
    const lines = [];
    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push('');
        continue;
      }
      const words = paragraph.split(/\s+/);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (context.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        lines.push(line);
      }
    }
    return lines;
  };

  EB.drawRoundedRect = function drawRoundedRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width * 0.5, height * 0.5);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
  };

  EB.hash = function hash(value) {
    let number = value | 0;
    number = Math.imul(number ^ (number >>> 16), 0x45d9f3b);
    number = Math.imul(number ^ (number >>> 16), 0x45d9f3b);
    number = number ^ (number >>> 16);
    return number >>> 0;
  };

  EB.seededRandom = function seededRandom(seed) {
    let state = EB.hash(seed || 1);
    return function next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };

  EB.formatTime = function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  EB.deepClone = function deepClone(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  };

  EB.safeStorageGet = function safeStorageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Não foi possível ler o salvamento.', error);
      return fallback;
    }
  };

  EB.safeStorageSet = function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Não foi possível gravar o salvamento.', error);
      return false;
    }
  };

  EB.createDefaultSave = function createDefaultSave() {
    return {
      version: EB.VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chapter: 0,
      checkpoint: null,
      completed: false,
      settings: {
        masterVolume: 0.72,
        musicVolume: 0.66,
        effectsVolume: 0.82,
        ambienceVolume: 0.72,
        screenShake: 0.8,
        reducedFlash: false,
        subtitles: true
      },
      player: {
        maxHealth: EB.PLAYER_DEFAULTS.maxHealth,
        meleeDamage: EB.PLAYER_DEFAULTS.meleeDamage,
        heavyDamage: EB.PLAYER_DEFAULTS.heavyDamage,
        arrowDamage: EB.PLAYER_DEFAULTS.arrowDamage,
        maxArrows: EB.PLAYER_DEFAULTS.maxArrows,
        maxHerbs: EB.PLAYER_DEFAULTS.maxHerbs,
        healAmount: EB.PLAYER_DEFAULTS.healAmount,
        maxBreath: EB.PLAYER_DEFAULTS.maxBreath,
        dashCooldown: EB.PLAYER_DEFAULTS.dashCooldown,
        memories: 0,
        upgrades: []
      },
      codex: [],
      achievements: [],
      bestTimes: {},
      stats: {
        deaths: 0,
        enemiesDefeated: 0,
        arrowsFired: 0,
        perfectDodges: 0,
        survivorsRescued: 0,
        secretsFound: 0,
        totalPlayTime: 0
      }
    };
  };

  EB.loadSave = function loadSave() {
    const fallback = EB.createDefaultSave();
    const loaded = EB.safeStorageGet(EB.SAVE_KEY, fallback);
    if (!loaded || typeof loaded !== 'object') {
      return fallback;
    }
    return {
      ...fallback,
      ...loaded,
      settings: {
        ...fallback.settings,
        ...(loaded.settings || {})
      },
      player: {
        ...fallback.player,
        ...(loaded.player || {})
      },
      stats: {
        ...fallback.stats,
        ...(loaded.stats || {})
      },
      codex: Array.isArray(loaded.codex) ? loaded.codex : [],
      achievements: Array.isArray(loaded.achievements) ? loaded.achievements : []
    };
  };

  EB.writeSave = function writeSave(save) {
    save.updatedAt = Date.now();
    return EB.safeStorageSet(EB.SAVE_KEY, save);
  };
})();
