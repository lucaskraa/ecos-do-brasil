(() => {
  'use strict';

  const ground = (x, w, y = 226, h = 60, type = 'earth') => ({ x, y, w, h, type });
  const ledge = (x, y, w, type = 'wood') => ({ x, y, w, h: 12, type });
  const enemy = (type, x, y = 200, extra = {}) => ({ type, x, y, ...extra });
  const pickup = (type, x, y) => ({ type, x, y });

  const stages = [
    {
      id: 'terra-viva',
      title: 'PRÓLOGO — TERRA VIVA',
      subtitle: 'Antes da guerra, havia um mundo inteiro.',
      year: 'Litoral do atual Sudeste — século XVI',
      theme: 'village',
      biome: 'village',
      worldWidth: 2400,
      spawn: { x: 92, y: 188 },
      palette: { sky: '#89b8a7', far: '#4f7962', mid: '#28503c', near: '#132d24', ground: '#553b29', accent: '#e1b75c' },
      platforms: [
        ground(0, 680), ground(730, 670), ground(1450, 950),
        ledge(300, 184, 125, 'root'), ledge(520, 158, 92, 'stone'),
        ledge(810, 178, 130, 'root'), ledge(1060, 152, 105, 'stone'),
        ledge(1510, 181, 145, 'root'), ledge(1770, 156, 100, 'stone'),
        ledge(2050, 183, 120, 'root')
      ],
      huts: [{x:170},{x:1130},{x:1870}],
      fires: [{x:385,y:215,calm:true},{x:1300,y:215,calm:true}],
      npcs: [
        { id:'potira', name:'Potira', x: 560, y: 197, color:'#bd6f4f', dialogue:[
          'As aves mudaram o caminho do voo.',
          'O mar também parece observar a nossa aldeia.',
          'Volte antes que a luz desapareça, Aimberê.'
        ]},
        { id:'anciao', name:'Ancião', x: 1190, y: 197, color:'#c8a271', dialogue:[
          'A mata não é silêncio. Ela guarda vozes.',
          'Escute o rio. Ele conhece caminhos que os homens esquecem.'
        ]}
      ],
      pickups: [
        pickup('herb', 368, 164), pickup('herb', 1090, 133), pickup('herb', 1810, 137),
        pickup('memory', 1535, 160)
      ],
      enemies: [],
      exit: { x: 2260, y: 176, label: 'Mirante da costa' },
      objective: { type:'collect', key:'herbs', total:3, text:'Recolha 3 ervas e encontre Potira no caminho.' },
      tutorial: [
        { x: 130, text:'A/D ou ←/→: mover' },
        { x: 270, text:'ESPAÇO ou W/↑: saltar' },
        { x: 480, text:'E: conversar e interagir' },
        { x: 820, text:'J: tacape  •  K: arco  •  L: esquiva' }
      ],
      memoryText: 'A história desta terra não começa com a chegada europeia. Povos indígenas já possuíam territórios, alianças, línguas e formas próprias de organização.',
      transition: 'ships'
    },
    {
      id: 'aldeia-em-chamas',
      title: 'FASE I — ALDEIA EM CHAMAS',
      subtitle: 'O primeiro grito rompeu a madrugada.',
      year: 'A guerra alcança as aldeias',
      theme: 'fire',
      biome: 'burning',
      worldWidth: 3420,
      spawn: { x: 84, y: 188 },
      palette: { sky: '#6c4b45', far: '#533337', mid: '#352629', near: '#1d1b19', ground: '#493226', accent: '#ef6a32' },
      platforms: [
        ground(0, 610), ground(670, 580), ground(1310, 530), ground(1890, 610), ground(2550, 870),
        ledge(240, 174, 118, 'burnt'), ledge(750, 155, 115, 'wood'),
        ledge(1010, 184, 125, 'burnt'), ledge(1390, 160, 145, 'wood'),
        ledge(1700, 132, 100, 'wood'), ledge(2020, 178, 140, 'burnt'),
        ledge(2290, 149, 120, 'wood'), ledge(2700, 176, 150, 'burnt'),
        ledge(3050, 151, 115, 'wood')
      ],
      huts: [{x:160,burn:true},{x:910,burn:true},{x:1970,burn:true},{x:2800,burn:true}],
      fires: [
        {x:210,y:214},{x:510,y:217},{x:805,y:214},{x:1140,y:216},{x:1440,y:214},
        {x:1810,y:214},{x:2050,y:214},{x:2450,y:215},{x:2810,y:214},{x:3220,y:214}
      ],
      cages: [
        { id:'cage1', x: 870, y: 187 },
        { id:'cage2', x: 1740, y: 187 },
        { id:'cage3', x: 2600, y: 187 }
      ],
      pickups: [pickup('arrows', 470, 195), pickup('heal', 1465, 140), pickup('memory', 2320, 128), pickup('arrows', 2870, 195)],
      enemies: [
        enemy('sailor', 430), enemy('musketeer', 780), enemy('sailor', 1020),
        enemy('shield', 1210), enemy('sailor', 1460), enemy('musketeer', 1680, 104),
        enemy('dog', 1960), enemy('shield', 2150), enemy('musketeer', 2340, 120),
        enemy('sailor', 2500), enemy('dog', 2760), enemy('shield', 2940),
        enemy('musketeer', 3120, 122), enemy('captain', 3210, 188, { boss:true, name:'Capitão do Desembarque' })
      ],
      exit: { x: 3325, y: 176, label: 'Trilha até a baía' },
      objective: { type:'rescue', key:'rescued', total:3, text:'Liberte 3 prisioneiros e derrote o capitão.' },
      memoryText: 'A Confederação dos Tamoios reuniu diferentes grupos indígenas em resistência contra a colonização e a escravização no litoral do atual Sudeste.',
      transition: 'capture'
    },
    {
      id: 'aguas-da-resistencia',
      title: 'FASE II — ÁGUAS DA RESISTÊNCIA',
      subtitle: 'O rio conhece meu nome. A mata conhece minha dor.',
      year: 'Baía de Guanabara e caminhos d’água',
      theme: 'water',
      biome: 'water',
      worldWidth: 3640,
      spawn: { x: 80, y: 180 },
      waterY: 154,
      palette: { sky: '#678d8a', far: '#416d6c', mid: '#254c4d', near: '#173137', ground: '#4b4131', accent: '#76c3bd' },
      platforms: [
        ground(0, 430, 216, 70, 'sand'),
        ledge(490, 178, 150, 'canoe'), ledge(720, 145, 120, 'rock'),
        ledge(900, 188, 170, 'canoe'), ledge(1130, 158, 120, 'rock'),
        ledge(1340, 182, 150, 'canoe'), ledge(1580, 136, 130, 'rock'),
        ledge(1790, 180, 170, 'canoe'), ledge(2040, 152, 120, 'rock'),
        ledge(2250, 188, 150, 'canoe'), ledge(2470, 142, 125, 'rock'),
        ledge(2700, 177, 170, 'canoe'), ledge(2950, 151, 140, 'rock'),
        ground(3180, 460, 216, 70, 'sand'),
        ground(430, 2750, 254, 32, 'riverbed')
      ],
      boats: [{x:500,y:178},{x:910,y:188},{x:1350,y:182},{x:1800,y:180},{x:2260,y:188},{x:2710,y:177}],
      pickups: [
        pickup('arrows', 540, 156), pickup('breath', 1180, 213), pickup('memory', 1620, 115),
        pickup('heal', 2080, 130), pickup('arrows', 2740, 154)
      ],
      enemies: [
        enemy('musketeer', 560, 151), enemy('sailor', 960, 161), enemy('musketeer', 1170, 130),
        enemy('swimmer', 1450, 210), enemy('musketeer', 1630, 109), enemy('swimmer', 1900, 218),
        enemy('shield', 2310, 160), enemy('musketeer', 2520, 115), enemy('swimmer', 2810, 215),
        enemy('boatBoss', 3190, 160, { boss:true, name:'Bergantim de Patrulha' })
      ],
      exit: { x: 3500, y: 176, label: 'Margem ocupada' },
      objective: { type:'boss', key:'bossDefeated', total:1, text:'Atravesse as águas e destrua o bergantim.' },
      memoryText: 'A guerra envolveu aldeias, ilhas, praias e rotas marítimas. A geografia da Guanabara foi parte decisiva dos conflitos do século XVI.',
      transition: 'shore'
    },
    {
      id: 'urucumirim',
      title: 'FASE III — URUÇUMIRIM',
      subtitle: 'A terra tomada ainda guarda os passos de quem resistiu.',
      year: 'Reduto tamoio — 1567',
      theme: 'camp',
      biome: 'camp',
      worldWidth: 3660,
      spawn: { x: 75, y: 188 },
      palette: { sky: '#7a6659', far: '#5a5145', mid: '#3b3b31', near: '#22261f', ground: '#4a382a', accent: '#d9a35b' },
      platforms: [
        ground(0, 740), ground(800, 520), ground(1380, 600), ground(2040, 560), ground(2660, 1000),
        ledge(280, 171, 130, 'wood'), ledge(580, 142, 110, 'watch'),
        ledge(890, 181, 145, 'wood'), ledge(1150, 151, 120, 'watch'),
        ledge(1450, 174, 140, 'wood'), ledge(1740, 135, 115, 'watch'),
        ledge(2100, 178, 140, 'wood'), ledge(2380, 146, 120, 'watch'),
        ledge(2750, 176, 160, 'wood'), ledge(3060, 140, 120, 'watch'),
        ledge(3350, 177, 130, 'wood')
      ],
      tents: [{x:240},{x:950},{x:1510},{x:2200},{x:2800}],
      powder: [
        { id:'powder1', x: 620, y: 195 },
        { id:'powder2', x: 1760, y: 195 },
        { id:'powder3', x: 2780, y: 195 }
      ],
      cagePotira: { id:'potira-cage', x: 3320, y: 182 },
      fires: [{x:350,y:215,calm:true},{x:1070,y:215,calm:true},{x:2300,y:215,calm:true},{x:2950,y:215,calm:true}],
      pickups: [pickup('heal', 1020, 160), pickup('memory', 1480, 153), pickup('arrows', 2140, 158), pickup('heal', 3090, 119)],
      enemies: [
        enemy('sailor', 420), enemy('musketeer', 610, 115), enemy('shield', 930),
        enemy('dog', 1210), enemy('musketeer', 1510), enemy('shield', 1830),
        enemy('sailor', 2110), enemy('musketeer', 2410, 118), enemy('dog', 2680),
        enemy('shield', 2890), enemy('musketeer', 3090, 112),
        enemy('captain', 3380, 188, { boss:true, name:'Oficial de Uruçumirim' })
      ],
      exit: { x: 3500, y: 176, label: 'Caminho para os navios' },
      objective: { type:'sabotage', key:'powder', total:3, text:'Sabote 3 depósitos e liberte Potira.' },
      memoryText: 'Aimberê é lembrado como uma das lideranças da resistência tamoia. A batalha de Uruçumirim, em 1567, destruiu o reduto tamoio na região do atual Rio de Janeiro.',
      transition: 'lastnight'
    },
    {
      id: 'navios-em-chamas',
      title: 'FASE FINAL — NAVIOS EM CHAMAS',
      subtitle: 'Nenhuma corrente prende aquilo que a terra decidiu lembrar.',
      year: 'A última batalha de Terra Invadida',
      theme: 'boss',
      biome: 'ship',
      worldWidth: 2680,
      spawn: { x: 80, y: 178 },
      palette: { sky: '#382b34', far: '#2c2831', mid: '#20242c', near: '#14191d', ground: '#4a3125', accent: '#ef713d' },
      platforms: [
        ground(0, 2680, 218, 70, 'deck'),
        ledge(260, 176, 155, 'deck'), ledge(520, 147, 130, 'deck'),
        ledge(780, 182, 150, 'deck'), ledge(1050, 145, 125, 'deck'),
        ledge(1320, 178, 170, 'deck'), ledge(1610, 141, 130, 'deck'),
        ledge(1940, 178, 155, 'deck'), ledge(2200, 148, 130, 'deck')
      ],
      masts: [{x:380},{x:1210},{x:2080}],
      cannons: [{x:670},{x:1480},{x:2260}],
      fires: [{x:920,y:211},{x:1780,y:211}],
      pickups: [pickup('heal', 560, 126), pickup('arrows', 1080, 124), pickup('memory', 1640, 120), pickup('heal', 2180, 196)],
      enemies: [
        enemy('sailor', 380), enemy('musketeer', 610, 119), enemy('shield', 850),
        enemy('sailor', 1120), enemy('musketeer', 1380), enemy('shield', 1580),
        enemy('dog', 1740), enemy('musketeer', 1990, 150),
        enemy('finalBoss', 2140, 180, { boss:true, name:'Capitão da Armada' })
      ],
      fuse: { x: 2480, y: 190 },
      exit: { x: 2480, y: 176, label: 'Pavio da pólvora' },
      objective: { type:'final', key:'bossDefeated', total:1, text:'Derrote o capitão e alcance a pólvora.' },
      memoryText: 'Esta fase final é uma dramatização ficcional. O Aimberê histórico morreu na batalha de Uruçumirim, em 1567; o incêndio dos navios pertence à narrativa do jogo.',
      transition: 'ending'
    }
  ];

  const intro = [
    {
      scene:'birds', title:'ECOS DO BRASIL', subtitle:'TERRA INVADIDA',
      lines:['Antes dos mapas estrangeiros, a terra já possuía nomes.', 'Antes das coroas, o rio já conhecia seu povo.']
    },
    {
      scene:'village', title:'TERRA VIVA',
      lines:['Aimberê cresceu entre a mata, a baía e as vozes de sua aldeia.', 'Não era uma terra vazia. Era casa, memória e futuro.']
    },
    {
      scene:'aimbere', title:'AIMBERÊ',
      lines:['Guerreiro, líder e filho da terra.', '“O rio conhece meu nome. A mata conhece minha dor.”']
    },
    {
      scene:'ships', title:'VELAS NO HORIZONTE',
      lines:['Então o horizonte ganhou formas desconhecidas.', 'Com elas vieram alianças, cobiça, armas e escravização.']
    },
    {
      scene:'warning', title:'FICÇÃO HISTÓRICA',
      lines:['Esta obra é inspirada em Aimberê e na Confederação dos Tamoios.', 'Personagens, diálogos e acontecimentos foram dramatizados para o jogo.']
    }
  ];

  const transitions = {
    ships: [
      { scene:'ships', title:'O HORIZONTE ESCURECEU', lines:['As aves fugiram do litoral.', 'Navios entraram na baía. O tempo da paz chegava ao fim.'] },
      { scene:'fire', title:'A PRIMEIRA NOITE', lines:['O ataque veio antes do amanhecer.', 'Potira foi levada. Aimberê correu de volta para o fogo.'] }
    ],
    capture: [
      { scene:'capture', title:'LEVADA PELAS ÁGUAS', lines:['Os prisioneiros foram libertados, mas Potira já estava em outra embarcação.', 'Aimberê seguiu os remos, mesmo ferido.'] },
      { scene:'water', title:'ÁGUAS DA RESISTÊNCIA', lines:['A baía não era uma barreira.', 'Era caminho, abrigo e arma.'] }
    ],
    shore: [
      { scene:'shore', title:'A MARGEM OCUPADA', lines:['O bergantim afundou, mas a costa estava tomada por acampamentos.', 'Mapas e pólvora revelavam um ataque maior.'] },
      { scene:'aimbere', title:'NÃO ERA APENAS UM RESGATE', lines:['Salvar Potira significava também abrir caminho para os sobreviventes.', 'Cada depósito destruído atrasaria a ofensiva.'] }
    ],
    lastnight: [
      { scene:'rescue', title:'POTIRA', lines:['As grades caíram. Potira estava viva.', 'Juntos, eles correram em direção aos navios.'] },
      { scene:'lastnight', title:'A ÚLTIMA ESCOLHA', lines:['A armada preparava outro desembarque.', 'A pólvora poderia impedir o ataque — mas alguém teria de ficar.'] }
    ]
  };

  const ending = [
    { scene:'duel', title:'O ÚLTIMO COLONO', lines:['O capitão caiu sobre o convés.', 'Ao longe, Potira alcançou uma canoa.'] },
    { scene:'fuse', title:'FOGO', lines:['Aimberê acendeu o pavio.', 'As chamas correram pelas cordas como raízes de luz.'] },
    { scene:'explosion', title:'A TERRA SE LEMBRA', lines:['O céu abriu-se em fogo.', 'O mar levou os destroços. A mata guardou o nome.'] },
    { scene:'memory', title:'AIMBERÊ — 1567', lines:['O Aimberê histórico é lembrado como liderança da Confederação dos Tamoios.', 'Morreu na batalha de Uruçumirim, em 20 de janeiro de 1567.'] },
    { scene:'birds', title:'ECOS DO BRASIL', subtitle:'O PASSADO NUNCA ESQUECE', lines:['Fim de Terra Invadida.', 'Mas a história do Brasil ainda atravessará muitos séculos.'] }
  ];

  const upgrades = [
    { id:'health', name:'FORÇA DA TERRA', description:'+25 de vida máxima', apply:p => { p.maxHealth += 25; p.health = p.maxHealth; } },
    { id:'arrows', name:'TAQUARA AFIADA', description:'+5 de dano nas flechas', apply:p => { p.arrowDamage += 5; p.arrows = Math.max(p.arrows, 10); } },
    { id:'melee', name:'PESO DO TACAPE', description:'+4 de dano corpo a corpo', apply:p => { p.meleeDamage += 4; } },
    { id:'dash', name:'PASSO DA ONÇA', description:'esquiva recarrega mais rápido', apply:p => { p.dashCooldownMax = Math.max(.38, p.dashCooldownMax - .10); } },
    { id:'breath', name:'FÔLEGO DO RIO', description:'+4 segundos de fôlego', apply:p => { p.maxBreath += 4; p.breath = p.maxBreath; } },
    { id:'heal', name:'ERVAS DA MATA', description:'cura recebe +15 de efeito', apply:p => { p.healPower += 15; } }
  ];

  window.GAME_CONTENT = { stages, intro, transitions, ending, upgrades };
})();
