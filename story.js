(() => {
  'use strict';

  const EB = window.EB = window.EB || {};

  EB.HISTORICAL_NOTICE = [
    'Ecos do Brasil é uma obra de ficção histórica inspirada na resistência de Aimberê e na Confederação dos Tamoios.',
    'A narrativa combina acontecimentos, personagens documentados e elementos dramatizados para construir uma aventura jogável.',
    'Os povos indígenas não formavam um grupo único. Existiam diferentes povos, línguas, alianças, rivalidades e formas de organização.',
    'As pinturas, falas e cenas do jogo são interpretações artísticas e não substituem o estudo de fontes históricas ou o contato com povos indígenas atuais.'
  ];

  EB.CINEMATICS = {
    opening: {
      id: 'opening',
      title: 'Antes dos mapas',
      theme: 'village',
      skippableAfter: 4,
      shots: [
        {
          type: 'aerialForest',
          duration: 7.5,
          camera: { fromX: 0, toX: 620, fromY: -160, toY: 120, zoomFrom: 0.86, zoomTo: 1.08 },
          birds: 23,
          narration: [
            'Antes dos mapas estrangeiros, estas águas já possuíam caminhos.',
            'Antes das coroas, o rio já conhecia seu povo.'
          ]
        },
        {
          type: 'riverDescent',
          duration: 6.8,
          camera: { fromX: 480, toX: 960, fromY: -60, toY: 210, zoomFrom: 1.02, zoomTo: 1.18 },
          birds: 14,
          narration: [
            'A mata não era vazia.',
            'Era casa, alimento, memória e futuro.'
          ]
        },
        {
          type: 'villageLife',
          duration: 8.5,
          image: 'villageCinematic',
          camera: { fromX: 0, toX: 120, fromY: 0, toY: 30, zoomFrom: 1.02, zoomTo: 1.1 },
          narration: [
            'Na costa, aldeias cultivavam, pescavam, negociavam e guerreavam muito antes da chegada europeia.',
            'Aimberê cresceu entre vozes, remos e histórias transmitidas ao redor do fogo.'
          ]
        },
        {
          type: 'heroReveal',
          duration: 7.2,
          camera: { fromX: 0, toX: 0, fromY: 0, toY: 0, zoomFrom: 1, zoomTo: 1 },
          narration: [
            'Ele ainda não era uma lenda.',
            'Era apenas um homem que conhecia cada curva do rio e cada silêncio da mata.'
          ]
        },
        {
          type: 'horizon',
          duration: 8.2,
          camera: { fromX: 0, toX: 0, fromY: 0, toY: 0, zoomFrom: 1, zoomTo: 1 },
          birds: 31,
          narration: [
            'Naquela manhã, as aves abandonaram o litoral antes que qualquer pessoa visse as velas.',
            'O horizonte havia mudado.'
          ]
        }
      ]
    },

    invasion: {
      id: 'invasion',
      title: 'Velas no horizonte',
      theme: 'danger',
      skippableAfter: 3,
      shots: [
        {
          type: 'ships',
          duration: 7,
          narration: [
            'Primeiro vieram objetos, promessas e perguntas.',
            'Depois vieram exigências, cercas e armas.'
          ]
        },
        {
          type: 'forestAlarm',
          duration: 6.5,
          narration: [
            'Os caminhos foram vigiados.',
            'Pessoas foram capturadas para servir de guias e trabalhadores.'
          ]
        },
        {
          type: 'villageFire',
          duration: 8.4,
          narration: [
            'Quando a aldeia se recusou a abandonar sua terra, o fogo respondeu pelos invasores.',
            'Potira foi levada para a praia junto dos prisioneiros.'
          ]
        },
        {
          type: 'oath',
          duration: 6.6,
          narration: [
            'Aimberê não prometeu vingança.',
            'Prometeu que seu povo não desapareceria em silêncio.'
          ]
        }
      ]
    },

    waters: {
      id: 'waters',
      title: 'Águas da resistência',
      theme: 'water',
      skippableAfter: 2,
      shots: [
        {
          type: 'mangrove',
          duration: 6.5,
          narration: [
            'Os invasores dominavam estradas e praias.',
            'Mas desconheciam os caminhos ocultos entre mangues, ilhas e correntezas.'
          ]
        },
        {
          type: 'canoes',
          duration: 6.8,
          narration: [
            'Canoas atravessaram a noite sem tochas.',
            'Mensagens seguiram pela água, unindo aldeias ameaçadas pela mesma violência.'
          ]
        },
        {
          type: 'dive',
          duration: 5.8,
          narration: [
            'Para alcançar o acampamento, Aimberê teria de passar por baixo das patrulhas.',
            'O rio seria abrigo e campo de batalha.'
          ]
        }
      ]
    },

    confederation: {
      id: 'confederation',
      title: 'Muitos fogos, uma resistência',
      theme: 'council',
      skippableAfter: 3,
      shots: [
        {
          type: 'council',
          duration: 8.5,
          narration: [
            'A resistência não nasceu de uma única aldeia nem de um único líder.',
            'Era feita de alianças frágeis, antigas diferenças e uma ameaça comum.'
          ]
        },
        {
          type: 'signals',
          duration: 6.5,
          narration: [
            'Fogos no alto dos morros chamavam guerreiros de diferentes lugares.',
            'Cada chama dizia: ainda estamos aqui.'
          ]
        },
        {
          type: 'march',
          duration: 7,
          narration: [
            'Aimberê passou a carregar mais do que a própria dor.',
            'Carregava mensagens, decisões e a esperança daqueles que não podiam lutar.'
          ]
        }
      ]
    },

    urucumirim: {
      id: 'urucumirim',
      title: 'Uruçumirim',
      theme: 'fortress',
      skippableAfter: 3,
      shots: [
        {
          type: 'fortress',
          duration: 7.6,
          narration: [
            'Paliçadas, pólvora e canhões transformaram o litoral.',
            'Onde havia caminhos abertos, surgiam postos de vigilância.'
          ]
        },
        {
          type: 'prisoners',
          duration: 6.8,
          narration: [
            'Potira e outros prisioneiros foram levados para Uruçumirim.',
            'A fortificação parecia impossível de atravessar.'
          ]
        },
        {
          type: 'siege',
          duration: 6.9,
          narration: [
            'Aimberê não entraria sozinho.',
            'Enquanto os aliados atacavam os portões, ele seguiria pelas passagens de água.'
          ]
        }
      ]
    },

    final: {
      id: 'final',
      title: 'O eco permanece',
      theme: 'ending',
      skippableAfter: 5,
      shots: [
        {
          type: 'burningShips',
          duration: 8.8,
          narration: [
            'As chamas alcançaram cordas, velas e barris de pólvora.',
            'A noite tornou-se clara como o dia.'
          ]
        },
        {
          type: 'potiraEscape',
          duration: 6.8,
          narration: [
            'Potira conduziu os sobreviventes de volta às canoas.',
            'Aimberê permaneceu para impedir que o capitão alcançasse o pavio.'
          ]
        },
        {
          type: 'lastStand',
          duration: 8.5,
          narration: [
            'Ele sabia que outros navios viriam.',
            'Nenhuma batalha poderia apagar séculos de violência que ainda começavam.'
          ]
        },
        {
          type: 'quote',
          duration: 9.5,
          quote: 'O rio conhece meu nome. A mata conhece minha dor.',
          narration: [
            'A história não terminou ali.',
            'Resistências indígenas continuaram — e continuam — assumindo muitas formas.'
          ]
        }
      ]
    }
  };

  EB.DIALOGUES = {
    potiraOpening: [
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Você demorou. As crianças apostaram que o rio tinha decidido ficar com você.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'O rio tentou. Mas ele fala demais. Preferi voltar antes que contasse todos os segredos da aldeia.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Então escute um segredo meu: três jovens seguiram suas pegadas até a mata. Agora querem aprender a usar o arco como você.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Primeiro eles aprendem a voltar para casa. Depois aprendem a atirar.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'O ancião pediu ervas para os remédios. Traga três no caminho. E não espante todas as aves outra vez.'
      }
    ],

    potiraAfterTraining: [
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Você acertou o alvo, mas quase derrubou o telhado de Arani.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'O telhado estava no caminho da flecha.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Um grande guerreiro derrotado por um telhado. Essa história eu gostaria de ouvir.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Eu contaria, mas as aves ficaram silenciosas.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Também percebi. Vá até o mirante. Eu aviso os outros.'
      }
    ],

    elderOpening: [
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'A mata muda de voz antes de qualquer perigo. Quem aprende a escutá-la nunca é surpreendido por completo.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Ela está inquieta desde o amanhecer.'
      },
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'Os pescadores viram grandes velas ao sul. Não sabemos quantos homens carregam, nem o que desejam desta vez.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Se desejarem falar, falaremos. Se desejarem tomar, encontrarão resistência.'
      },
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'Coragem sem atenção é apenas pressa para morrer. Observe primeiro. Proteja o povo antes de buscar o inimigo.'
      }
    ],

    invasionStart: [
      {
        speaker: 'Sobrevivente',
        portrait: 'Cunhambebe',
        text: 'Eles vieram pela praia e pelo caminho do norte. Usaram o fogo para nos separar.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Onde está Potira?'
      },
      {
        speaker: 'Sobrevivente',
        portrait: 'Cunhambebe',
        text: 'Ela abriu passagem para as crianças. Depois foi cercada. Levaram-na com outros três para a costa.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Apaguem o que puderem. Reúnam-se perto do rio. Eu vou trazer todos de volta.'
      }
    ],

    rescuedOne: [
      {
        speaker: 'Prisioneiro',
        portrait: 'Cunhambebe',
        text: 'Potira lutou até quebrarem seu arco. O capitão mandou levá-la para o barco maior.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Siga pela mata e não use a trilha. Há sobreviventes junto ao rio.'
      }
    ],

    rescuedTwo: [
      {
        speaker: 'Prisioneira',
        portrait: 'Potira',
        text: 'Eles procuram os caminhos para outras aldeias. Querem que alguém os guie pelo interior.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Nenhum caminho será entregue. Vá para o ponto de encontro.'
      }
    ],

    rescuedThree: [
      {
        speaker: 'Jovem guerreiro',
        portrait: 'Aimberê',
        text: 'Ouvi o capitão dizer que partirão ao cair da noite. Potira está no navio da frente.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Então a noite será longa para eles.'
      }
    ],

    landingBossIntro: [
      {
        speaker: 'Capitão do Desembarque',
        portrait: 'Cunhambebe',
        text: 'Afaste-se. Esta costa pertence à Coroa agora.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Uma palavra dita do outro lado do mar não muda a terra sob seus pés.'
      },
      {
        speaker: 'Capitão do Desembarque',
        portrait: 'Cunhambebe',
        text: 'A pólvora costuma tornar minhas palavras mais claras.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Então fale. A mata inteira vai escutar sua derrota.'
      }
    ],

    watersEntry: [
      {
        speaker: 'Potira — memória',
        portrait: 'Potira',
        text: 'Quando éramos crianças, você dizia que podia respirar embaixo d’água.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Eu dizia muitas coisas para impressionar você.'
      },
      {
        speaker: 'Potira — memória',
        portrait: 'Potira',
        text: 'Então espero que tenha aprendido. Um dia essa mentira ainda pode salvar sua vida.'
      }
    ],

    waterRescue: [
      {
        speaker: 'Remador ferido',
        portrait: 'Cunhambebe',
        text: 'O bergantim bloqueia a passagem. Ele dispara contra qualquer canoa que deixa o mangue.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Solte as amarras das canoas. Quando o navio olhar para mim, conduza todos pela margem oposta.'
      }
    ],

    shipBossIntro: [
      {
        speaker: 'Comandante do Bergantim',
        portrait: 'Cunhambebe',
        text: 'Atirem na água! Ele precisa subir para respirar.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'O rio conhece cada sombra deste casco. Vocês são os únicos perdidos aqui.'
      }
    ],

    councilOpening: [
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'Uma aldeia sozinha pode ser cercada. Muitas aldeias podem fechar o próprio cerco.'
      },
      {
        speaker: 'Líder aliado',
        portrait: 'Cunhambebe',
        text: 'Nossos povos já lutaram entre si. Alguns ainda não confiam nesta aliança.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Não precisamos esquecer nossas diferenças. Precisamos sobreviver para continuar discutindo sobre elas.'
      },
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'Acenda os três fogos. Cada sinal chamará um grupo diferente. Depois marcharemos até Uruçumirim.'
      }
    ],

    signalOne: [
      {
        speaker: 'Mensageiro',
        portrait: 'Aimberê',
        text: 'O primeiro fogo está aceso. Os remadores da baía já viram o sinal.'
      }
    ],

    signalTwo: [
      {
        speaker: 'Mensageira',
        portrait: 'Potira',
        text: 'O segundo fogo chamou os guerreiros do interior. Eles chegarão pelas trilhas altas.'
      }
    ],

    signalThree: [
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'O terceiro fogo responde aos outros. A aliança está em movimento.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Então Uruçumirim verá o amanhecer de muitos lados.'
      }
    ],

    fortressEntry: [
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'Os portões vão prender a atenção deles. Você entra pelo canal e destrói os depósitos de pólvora.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'E Potira?'
      },
      {
        speaker: 'Cunhambebe',
        portrait: 'Cunhambebe',
        text: 'Os vigias dizem que ela está na torre próxima ao cais. Não permita que a pressa a transforme em armadilha.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Ela não é a armadilha. É a razão pela qual eles ainda não conhecem nossos caminhos.'
      }
    ],

    potiraRescue: [
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Você demorou.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'O rio tentou ficar comigo.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Desta vez eu acredito. Eles queriam as rotas das aldeias. Dei a eles caminhos que terminam em pântanos.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Consegue correr?'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Consigo lutar. Correr será a parte fácil.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Leve os prisioneiros para o canal. Eu termino com a pólvora.'
      }
    ],

    fortressBossIntro: [
      {
        speaker: 'Capitão Duarte',
        portrait: 'Cunhambebe',
        text: 'Tantos homens perdidos por uma aldeia que o tempo apagará.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Você ainda acredita que apagar casas apaga um povo.'
      },
      {
        speaker: 'Capitão Duarte',
        portrait: 'Cunhambebe',
        text: 'Povos acabam. Fortes permanecem.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Pedras não lembram nomes. Pessoas lembram. E nós vamos lembrar de sua queda.'
      }
    ],

    shipFinalEntry: [
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'O navio maior prepara os canhões. Se alcançar a baía, vai destruir as canoas dos sobreviventes.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Há pólvora suficiente no porão para impedir que qualquer navio parta.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Nós entramos juntos. Nós saímos juntos.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Você conduz nosso povo. Eu apenas abro o caminho.'
      },
      {
        speaker: 'Potira',
        portrait: 'Potira',
        text: 'Não transforme despedida em ordem.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Não é despedida enquanto a mata souber onde me encontrar.'
      }
    ],

    finalBossIntro: [
      {
        speaker: 'Capitão-Mor',
        portrait: 'Cunhambebe',
        text: 'Você queimou depósitos, libertou prisioneiros e afundou um barco. Acredita que isso muda alguma coisa?'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Mudou cada pessoa que conseguiu voltar para casa.'
      },
      {
        speaker: 'Capitão-Mor',
        portrait: 'Cunhambebe',
        text: 'Outras frotas virão.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'Então encontrarão outras resistências.'
      }
    ],

    finalFuse: [
      {
        speaker: 'Capitão-Mor',
        portrait: 'Cunhambebe',
        text: 'Você morrerá junto com este navio.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'O rio conhece meu nome. A mata conhece minha dor.'
      },
      {
        speaker: 'Aimberê',
        portrait: 'Aimberê',
        text: 'E meu povo conhecerá o caminho de volta.'
      }
    ]
  };


  EB.DIALOGUES.ambientChild = [
    { speaker: 'Arani', portrait: 'Potira', text: 'Quando eu crescer, vou remar mais rápido que você.' },
    { speaker: 'Aimberê', portrait: 'Aimberê', text: 'Comece aprendendo a ouvir a correnteza. O rio sempre avisa antes de mudar.' }
  ];

  EB.DIALOGUES.ambientFisher = [
    { speaker: 'Pescador', portrait: 'Cunhambebe', text: 'Os peixes desceram para águas mais fundas. Até eles sentiram alguma coisa no mar.' },
    { speaker: 'Aimberê', portrait: 'Aimberê', text: 'Avise quem estiver nas canoas. Ninguém se afasta sozinho hoje.' }
  ];

  EB.DIALOGUES.ambientCraft = [
    { speaker: 'Artesã', portrait: 'Potira', text: 'Estas cordas estavam prontas para novas redes. Talvez precisemos delas para outras coisas.' },
    { speaker: 'Aimberê', portrait: 'Aimberê', text: 'Guarde o que puder carregar. Se houver perigo, as crianças partem primeiro.' }
  ];

  EB.CODEX = [
    {
      id: 'land-before-colony',
      title: 'A terra antes da colônia',
      period: 'Antes do século XVI',
      text: 'O território que mais tarde seria chamado Brasil já era habitado por numerosos povos, com diferentes línguas, organizações políticas, técnicas agrícolas, redes de troca e relações de guerra e aliança.'
    },
    {
      id: 'tupi-coast',
      title: 'Povos de línguas tupi na costa',
      period: 'Século XVI',
      text: 'Diversos povos de línguas do tronco tupi ocupavam extensas áreas do litoral. O jogo simplifica línguas e relações para fins narrativos, mas não os apresenta como um povo único.'
    },
    {
      id: 'aimbere',
      title: 'Aimberê',
      period: 'Século XVI',
      text: 'Aimberê é lembrado em narrativas históricas como uma liderança associada à resistência tamoia. Os registros coloniais são incompletos e frequentemente escritos por adversários dos povos indígenas.'
    },
    {
      id: 'confederation',
      title: 'Confederação dos Tamoios',
      period: 'Décadas de 1550 e 1560',
      text: 'A expressão descreve alianças entre grupos indígenas que resistiram ao avanço português em partes do litoral sudeste. Essas alianças foram complexas e envolveram interesses distintos.'
    },
    {
      id: 'enslavement',
      title: 'Cativeiro e trabalho forçado',
      period: 'Século XVI',
      text: 'A captura e exploração de indígenas foram componentes importantes da colonização. Fugas, guerras, negociações e deslocamentos foram algumas das respostas à violência.'
    },
    {
      id: 'alliances',
      title: 'Alianças europeias e indígenas',
      period: 'Século XVI',
      text: 'Portugueses e franceses buscaram alianças com diferentes povos indígenas. Essas relações não eram simples submissões: envolviam decisões políticas, comércio, rivalidades e estratégias locais.'
    },
    {
      id: 'canoes',
      title: 'Canoas e caminhos de água',
      period: 'Longa duração',
      text: 'Rios, baías e o mar eram vias de transporte, alimentação, comunicação e guerra. O conhecimento das correntes e dos mangues oferecia vantagens decisivas.'
    },
    {
      id: 'forest-knowledge',
      title: 'Conhecimento da mata',
      period: 'Longa duração',
      text: 'Plantas medicinais, ciclos de animais, solos e trajetos eram conhecimentos acumulados e transmitidos por gerações. O jogo representa esse saber por ervas, trilhas e pontos de observação.'
    },
    {
      id: 'body-paint',
      title: 'Pinturas corporais',
      period: 'Diversos contextos',
      text: 'Pinturas corporais possuem sentidos específicos entre diferentes povos e situações. Os grafismos do jogo são uma criação artística e não reproduzem fielmente um sistema ritual real.'
    },
    {
      id: 'firearms',
      title: 'Arcabuzes e pólvora',
      period: 'Século XVI',
      text: 'Armas de fogo eram lentas, sujeitas à umidade e dependiam de recarga. Ainda assim, seu ruído, alcance e capacidade de perfurar proteção alteravam confrontos.'
    },
    {
      id: 'urucumirim',
      title: 'Uruçumirim',
      period: '1567',
      text: 'Uruçumirim aparece em relatos sobre os confrontos que consolidaram o domínio português na região da Guanabara. A disposição da fortificação no jogo é fictícia.'
    },
    {
      id: 'guanabara',
      title: 'Baía de Guanabara',
      period: 'Século XVI',
      text: 'A baía possuía importância estratégica por suas águas protegidas, ilhas, recursos e acesso a rotas do litoral. Foi palco de disputas envolvendo povos indígenas, franceses e portugueses.'
    },
    {
      id: 'oral-memory',
      title: 'Memória oral',
      period: 'Longa duração',
      text: 'Muitas histórias são preservadas por narrativas, cantos, nomes e práticas, não apenas por documentos escritos. A ausência em arquivos coloniais não significa ausência de história.'
    },
    {
      id: 'resistance-today',
      title: 'Resistências que continuam',
      period: 'Presente',
      text: 'Povos indígenas continuam defendendo territórios, línguas, conhecimentos e direitos. O passado colonial não é um capítulo completamente encerrado.'
    },
    {
      id: 'potira-fiction',
      title: 'Potira — personagem ficcional',
      period: 'Dramatização',
      text: 'Potira é uma personagem criada para o jogo. Ela não representa uma pessoa histórica documentada e possui papel ativo na resistência, na fuga dos prisioneiros e na preservação das rotas.'
    },
    {
      id: 'final-fiction',
      title: 'Os navios em chamas',
      period: 'Dramatização',
      text: 'O confronto final e a explosão dos navios são ficcionais. A cena simboliza as muitas ações de resistência que documentos coloniais registraram de forma parcial ou hostil.'
    }
  ];

  EB.ENDING_TEXT = [
    'Aimberê tornou-se memória antes de tornar-se estátua, nome de rua ou personagem de livro.',
    'Sua história chegou ao presente misturada a documentos coloniais, tradições, interpretações e silêncios.',
    'Nenhuma obra consegue reconstruir por completo as vozes apagadas pelos vencedores.',
    'Ecos do Brasil não termina com uma conquista definitiva.',
    'Termina com sobreviventes seguindo pelo rio — porque a história do Brasil não é apenas a história de quem tentou dominar a terra, mas também de quem permaneceu, resistiu e continua falando.'
  ];

  EB.CREDITS = [
    'Direção e conceito: projeto Ecos do Brasil',
    'Roteiro: ficção histórica inspirada na resistência de Aimberê',
    'Programação: HTML5 Canvas e Web Audio API',
    'Arte: composição procedural e assets originais do projeto',
    'Trilha: síntese procedural original',
    'Agradecimento: povos indígenas que mantêm vivas suas histórias, línguas e territórios'
  ];
})();
