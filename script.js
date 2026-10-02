/**
 * ============================================================================
 * CHICKEN ROAD - JOGO DE NAVEGADOR COMPLETO
 * ============================================================================
 * Desenvolvido em HTML5 Canvas e JavaScript puro (Vanilla JS).
 * Ideal para projetos e apresentações escolares: código modular, comentado e didático.
 * 
 * Funcionalidades:
 * - 10 Fases com progressão inteligente de dificuldade
 * - Canvas 2D com gráficos estilizados (galinha, carros, caminhões, moedas, árvores)
 * - Sistema de física e colisões AABB (Bounding Box)
 * - Partículas de penas, confetes e brilho de moedas
 * - Sistema de Áudio Sintetizado (Web Audio API - 100% autônomo, sem arquivos externos)
 * - Sistema de Missões Diárias salvas em localStorage com renovação diária
 * - Seletor de fases desbloqueadas e gravação de melhores tempos
 * - Controles completos para Teclado (WASD / Setas) e Celular (D-Pad virtual)
 * ============================================================================
 */

/* ============================================================================
   1. CONSTANTES E ELEMENTOS DO DOM
   ============================================================================ */

// Canvas e Contexto 2D
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da Interface (HUD)
const hud = document.getElementById('game-hud');
const livesDisplay = document.getElementById('lives-display');
const coinsDisplay = document.getElementById('coins-display');
const levelDisplay = document.getElementById('level-display');
const timeDisplay = document.getElementById('time-display');
const btnPause = document.getElementById('btn-pause');
const damageOverlay = document.getElementById('damage-overlay');

// Barra de Progresso Vertical
const phaseProgressWrapper = document.getElementById('phase-progress-wrapper');
const phaseProgressBar = document.getElementById('phase-progress-bar');
const phaseChickenPin = document.getElementById('phase-chicken-pin');

// Telas e Modais
const menuScreen = document.getElementById('menu-screen');
const pauseScreen = document.getElementById('pause-screen');
const victoryScreen = document.getElementById('victory-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelSelectModal = document.getElementById('level-select-modal');
const missionsModal = document.getElementById('missions-modal');
const howToPlayModal = document.getElementById('how-to-play-modal');

// Botões do Menu e Telas
const btnPlay = document.getElementById('btn-play');
const btnSelectLevel = document.getElementById('btn-select-level');
const btnOpenMissions = document.getElementById('btn-open-missions');
const btnOpenHowToPlay = document.getElementById('btn-open-how-to-play');
const btnToggleSound = document.getElementById('btn-toggle-sound');
const soundIcon = document.getElementById('sound-icon');
const soundStatus = document.getElementById('sound-status');
const missionsBadge = document.getElementById('missions-badge');

// Estatísticas no Menu
const menuTotalCoins = document.getElementById('menu-total-coins');
const menuCurrentLevel = document.getElementById('menu-current-level');
const menuMissionsCount = document.getElementById('menu-missions-count');

// Botões de Pausa, Vitória e Game Over
const btnResume = document.getElementById('btn-resume');
const btnRestartLevel = document.getElementById('btn-restart-level');
const btnPauseMenu = document.getElementById('btn-pause-menu');
const btnNextLevel = document.getElementById('btn-next-level');
const btnVictoryMenu = document.getElementById('btn-victory-menu');
const btnRetryLevel = document.getElementById('btn-retry-level');
const btnGameOverMenu = document.getElementById('btn-game-over-menu');

// Elementos de texto de resumo
const vstatCoinsPicked = document.getElementById('vstat-coins-picked');
const vstatBonus = document.getElementById('vstat-bonus');
const vstatTime = document.getElementById('vstat-time');
const vstatTotalCoins = document.getElementById('vstat-total-coins');
const gstatCoins = document.getElementById('gstat-coins');
const gstatLevel = document.getElementById('gstat-level');

// Grade de Fases e Lista de Missões
const levelsGrid = document.getElementById('levels-grid');
const missionsList = document.getElementById('missions-list');
const missionRefreshTime = document.getElementById('mission-refresh-time');

// Controles Virtuais Mobile
const mobileControls = document.getElementById('mobile-controls');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

/* ============================================================================
   2. SISTEMA DE ÁUDIO SINTETIZADO (WEB AUDIO API)
   ============================================================================
   Gera efeitos sonoros em tempo real através de osciladores de áudio.
   Isso garante som de alta qualidade sem depender de arquivos .mp3 ou .wav externos!
*/
class AudioController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // Inicializa o contexto após o primeiro clique do usuário (requisito dos navegadores)
  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => { });
      }
    } catch (e) {
      console.warn('Web Audio indisponível:', e);
    }
  }

  // Som suave ao clicar em botões
  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) { }
  }

  // Som brilhante ao coletar moeda
  playCoin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      // Arpeggio rápido em duas notas: Mi -> Si
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(987.77, now + 0.08); // B5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.26);
    } catch (e) { }
  }

  // Som de impacto / colisão com carro
  playDamage() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      // Descida rápida de frequência para simular batida
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.26);
    } catch (e) { }
  }

  // Fanfarra alegre de fase concluída
  playWin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // Dó, Mi, Sol, Dó
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + idx * 0.09;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch (e) { }
  }

  // Som melancólico de Game Over
  playGameOver() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [440, 392, 349.23, 293.66]; // Lá, Sol, Fá, Ré
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + idx * 0.15;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch (e) { }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

const audio = new AudioController();

/* ============================================================================
   3. ESTADO GLOBAL DO JOGO E PROGRESSO (LOCALSTORAGE)
   ============================================================================ */

const TOTAL_FASES = 10;

// Estado da sessão de jogo
const estadoJogo = {
  emExecucao: false,
  pausado: false,
  faseAtual: 1,
  tempoInicialFase: 0,
  tempoDecorridoFase: 0,
  moedasColetadasNaFase: 0,
  vidas: 3,
  vidasPerdidasNestaFase: 0,
  animacaoDanoTimer: 0,
  shakeTimer: 0
};

// Dados persistentes salvos no navegador (Progresso)
let dadosJogador = {
  moedasTotais: 0,
  faseDesbloqueada: 1,
  melhoresTempos: {}, // { faseNumero: segundos }
  estatisticas: {
    ruasAtravessadas: 0,
    tempoTotalJogado: 0, // em segundos
    fasesSemDano: 0
  },
  missoesData: '', // Data 'YYYY-MM-DD' para controle diário
  missoes: []
};

// Definição das 5 Missões Diárias
function criarMissoesDiariasPadrao() {
  return [
    {
      id: 'ruas',
      titulo: 'Atravessador Experiente',
      descricao: 'Atravesse 15 faixas de rua movimentadas.',
      progresso: 0,
      meta: 15,
      recompensa: 20,
      concluida: false,
      resgatada: false
    },
    {
      id: 'moedas',
      titulo: 'Galinha de Ouro',
      descricao: 'Colete 10 moedas espalhadas pelo cenário.',
      progresso: 0,
      meta: 10,
      recompensa: 25,
      concluida: false,
      resgatada: false
    },
    {
      id: 'sem_dano',
      titulo: 'Pena Impecável',
      descricao: 'Conclua qualquer fase sem perder nenhuma vida.',
      progresso: 0,
      meta: 1,
      recompensa: 30,
      concluida: false,
      resgatada: false
    },
    {
      id: 'tempo_jogo',
      titulo: 'Maratona no Galinheiro',
      descricao: 'Jogue por pelo menos 3 minutos acumulados.',
      progresso: 0,
      meta: 180, // segundos
      recompensa: 25,
      concluida: false,
      resgatada: false
    },
    {
      id: 'velocidade',
      titulo: 'Galinha Supersônica',
      descricao: 'Termine uma fase em menos de 30 segundos.',
      progresso: 0,
      meta: 1,
      recompensa: 35,
      concluida: false,
      resgatada: false
    }
  ];
}

// Carrega os dados do localStorage
function carregarProgresso() {
  try {
    const dadosSalvos = localStorage.getItem('chicken_road_save_v1');
    if (dadosSalvos) {
      const parsed = JSON.parse(dadosSalvos);
      dadosJogador = { ...dadosJogador, ...parsed };
    }
  } catch (e) {
    console.warn('Não foi possível carregar o save do localStorage:', e);
  }

  // Verifica se as missões precisam ser renovadas para hoje
  verificarRenovacaoMissoes();
  atualizarInterfaceGeral();
}

// Salva o progresso atual no localStorage
function salvarProgresso() {
  try {
    localStorage.setItem('chicken_road_save_v1', JSON.stringify(dadosJogador));
  } catch (e) {
    console.warn('Não foi possível salvar no localStorage:', e);
  }
}

// Verifica data atual e reseta as missões se o dia mudou
function verificarRenovacaoMissoes() {
  const hoje = new Date().toISOString().split('T')[0];
  if (dadosJogador.missoesData !== hoje || !dadosJogador.missoes || dadosJogador.missoes.length === 0) {
    dadosJogador.missoesData = hoje;
    dadosJogador.missoes = criarMissoesDiariasPadrao();
    salvarProgresso();
  }
}

/* ============================================================================
   4. ATUALIZAÇÃO E CONTROLE DAS MISSÕES DIÁRIAS
   ============================================================================ */

function progredirMissao(idMissao, incremento = 1) {
  let alterou = false;
  dadosJogador.missoes.forEach(missao => {
    if (missao.id === idMissao && !missao.concluida) {
      missao.progresso = Math.min(missao.meta, missao.progresso + incremento);
      if (missao.progresso >= missao.meta) {
        missao.concluida = true;
      }
      alterou = true;
    }
  });

  if (alterou) {
    salvarProgresso();
    renderizarMissoes();
    atualizarBadgeMissoes();
  }
}

function resgatarRecompensaMissao(idMissao) {
  const missao = dadosJogador.missoes.find(m => m.id === idMissao);
  if (missao && missao.concluida && !missao.resgatada) {
    missao.resgatada = true;
    dadosJogador.moedasTotais += missao.recompensa;
    audio.playCoin();
    criarTextoFlutuante(`+${missao.recompensa} 🪙`, canvas.width / 2, canvas.height / 2, '#facc15');
    salvarProgresso();
    renderizarMissoes();
    atualizarInterfaceGeral();
  }
}

function atualizarBadgeMissoes() {
  const temParaResgatar = dadosJogador.missoes.some(m => m.concluida && !m.resgatada);
  if (temParaResgatar) {
    missionsBadge.classList.remove('hidden');
  } else {
    missionsBadge.classList.add('hidden');
  }

  const concluidas = dadosJogador.missoes.filter(m => m.concluida).length;
  menuMissionsCount.textContent = `${concluidas}/5`;
}

function renderizarMissoes() {
  missionsList.innerHTML = '';
  dadosJogador.missoes.forEach(missao => {
    const item = document.createElement('div');
    item.className = `mission-item ${missao.concluida ? 'completed' : ''}`;

    const porcentagem = Math.min(100, Math.floor((missao.progresso / missao.meta) * 100));

    let estadoBotaoHtml = '';
    if (missao.resgatada) {
      estadoBotaoHtml = '<span class="badge-done">✅ Resgatada</span>';
    } else if (missao.concluida) {
      estadoBotaoHtml = `<button class="btn-claim" onclick="resgatarRecompensaMissao('${missao.id}')">Resgatar</button>`;
    } else {
      estadoBotaoHtml = `<span>${missao.progresso}/${missao.meta}</span>`;
    }

    item.innerHTML = `
      <div class="mission-top">
        <span class="mission-title">${missao.titulo}</span>
        <span class="mission-reward">+${missao.recompensa} 🪙</span>
      </div>
      <div class="mission-desc">${missao.descricao}</div>
      <div class="mission-progress-bar-bg">
        <div class="mission-progress-fill" style="width: ${porcentagem}%"></div>
      </div>
      <div class="mission-bottom">
        <span>Progresso: ${porcentagem}%</span>
        ${estadoBotaoHtml}
      </div>
    `;
    missionsList.appendChild(item);
  });
}

// Expõe a função para o botão inline no HTML
window.resgatarRecompensaMissao = resgatarRecompensaMissao;

/* ============================================================================
   5. ENTIDADES DO JOGO (GALINHA, CARROS, MOEDAS, DECORAÇÕES)
   ============================================================================ */

// Galinha (Jogador)
const galinha = {
  x: 285,
  y: 735,
  largura: 30,
  altura: 30,
  velocidade: 4.5,
  direcao: 'up', // 'up', 'down', 'left', 'right'
  animPasso: 0,
  estaAndando: false,
  ultimaFaixaY: 735
};

// Coleções do Cenário
let faixasDeTransito = []; // Ruas e faixas
let areasSeguras = [];     // Gramados seguros
let carros = [];           // Lista de veículos ativos
let moedas = [];           // Moedas coletáveis
let arvores = [];          // Decorações de grama
let particulas = [];       // Efeitos visuais (penas e faíscas)
let textosFlutuantes = [];   // "+1", "+10"

// Controles de entrada (Teclas pressionadas)
const teclas = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false
};

/* ============================================================================
   6. CONFIGURAÇÃO DE FASES E DIFICULDADE (configurarFase)
   ============================================================================
   Gera cenários completos do nível 1 ao 10 com distâncias, larguras de ruas,
   densidade de carros, tipos de veículos e velocidades progressivas.
*/
function configurarFase(numeroFase) {
  // Limpa arrays anteriores
  faixasDeTransito = [];
  areasSeguras = [];
  carros = [];
  moedas = [];
  arvores = [];
  particulas = [];
  textosFlutuantes = [];

  // Posição inicial da Galinha
  galinha.x = canvas.width / 2 - galinha.largura / 2;
  galinha.y = 740;
  galinha.direcao = 'up';
  galinha.ultimaFaixaY = 740;

  // 1. ÁREA DE CHEGADA NO TOPO (META / CELEIRO)
  const alturaChegada = 70;
  areasSeguras.push({
    y: 0,
    altura: alturaChegada,
    tipo: 'meta'
  });

  // 2. ÁREA DE PARTIDA NA BASE (GRAMADO INICIAL)
  const alturaPartida = 80;
  areasSeguras.push({
    y: canvas.height - alturaPartida,
    altura: alturaPartida,
    tipo: 'partida'
  });

  // 3. ESTRUTURAÇÃO DAS RUAS E ÁREAS SEGURAS INTERMEDIÁRIAS
  // À medida que a fase avança, aumentamos a quantidade de pistas e a velocidade
  let configuracaoPistas = [];

  if (numeroFase === 1) {
    // Fase 1: 4 pistas, 1 área segura intermediária larga, tráfego leve e lento
    configuracaoPistas = [
      { y: 520, altura: 140, numFaixas: 3, velMin: 1.8, velMax: 2.4, freq: 190 },
      { y: 390, altura: 50, tipo: 'calcada' },
      { y: 150, altura: 180, numFaixas: 3, velMin: 2.0, velMax: 2.8, freq: 170 }
    ];
  } else if (numeroFase === 2) {
    // Fase 2: 6 pistas com tráfego moderado
    configuracaoPistas = [
      { y: 500, altura: 160, numFaixas: 3, velMin: 2.2, velMax: 2.8, freq: 160 },
      { y: 410, altura: 45, tipo: 'calcada' },
      { y: 140, altura: 210, numFaixas: 4, velMin: 2.3, velMax: 3.2, freq: 150 }
    ];
  } else if (numeroFase === 3) {
    // Fase 3: Introdução de caminhões compridos e 7 pistas
    configuracaoPistas = [
      { y: 480, altura: 180, numFaixas: 4, velMin: 2.5, velMax: 3.4, freq: 140 },
      { y: 400, altura: 40, tipo: 'calcada' },
      { y: 120, altura: 220, numFaixas: 4, velMin: 2.6, velMax: 3.6, freq: 130 }
    ];
  } else if (numeroFase === 4) {
    // Fase 4: Carros esportivos velozes e pistas mais desafiadoras
    configuracaoPistas = [
      { y: 470, altura: 190, numFaixas: 4, velMin: 2.8, velMax: 3.8, freq: 125 },
      { y: 390, altura: 40, tipo: 'calcada' },
      { y: 100, altura: 240, numFaixas: 5, velMin: 3.0, velMax: 4.2, freq: 120 }
    ];
  } else if (numeroFase === 5) {
    // Fase 5: Duas áreas seguras estreitas e tráfego intenso
    configuracaoPistas = [
      { y: 540, altura: 140, numFaixas: 3, velMin: 3.2, velMax: 4.2, freq: 110 },
      { y: 480, altura: 35, tipo: 'calcada' },
      { y: 300, altura: 140, numFaixas: 3, velMin: 3.4, velMax: 4.5, freq: 105 },
      { y: 240, altura: 35, tipo: 'calcada' },
      { y: 90, altura: 120, numFaixas: 3, velMin: 3.6, velMax: 4.8, freq: 100 }
    ];
  } else if (numeroFase === 6) {
    // Fase 6: Tráfego pesado com caminhões e alta velocidade
    configuracaoPistas = [
      { y: 520, altura: 160, numFaixas: 4, velMin: 3.4, velMax: 4.6, freq: 100 },
      { y: 450, altura: 35, tipo: 'calcada' },
      { y: 100, altura: 300, numFaixas: 6, velMin: 3.8, velMax: 5.0, freq: 95 }
    ];
  } else if (numeroFase === 7) {
    // Fase 7: Via expressa contínua com poucas áreas de descanso
    configuracaoPistas = [
      { y: 490, altura: 180, numFaixas: 4, velMin: 3.8, velMax: 5.2, freq: 90 },
      { y: 420, altura: 30, tipo: 'calcada' },
      { y: 80, altura: 310, numFaixas: 7, velMin: 4.0, velMax: 5.5, freq: 85 }
    ];
  } else if (numeroFase === 8) {
    // Fase 8: Tráfego cruzado ultra rápido
    configuracaoPistas = [
      { y: 510, altura: 160, numFaixas: 4, velMin: 4.2, velMax: 5.6, freq: 80 },
      { y: 440, altura: 30, tipo: 'calcada' },
      { y: 260, altura: 150, numFaixas: 3, velMin: 4.5, velMax: 5.8, freq: 80 },
      { y: 210, altura: 25, tipo: 'calcada' },
      { y: 80, altura: 110, numFaixas: 3, velMin: 4.6, velMax: 6.0, freq: 75 }
    ];
  } else if (numeroFase === 9) {
    // Fase 9: Tráfego frenético, quase sem pausas
    configuracaoPistas = [
      { y: 460, altura: 210, numFaixas: 5, velMin: 4.5, velMax: 6.0, freq: 75 },
      { y: 400, altura: 25, tipo: 'calcada' },
      { y: 80, altura: 300, numFaixas: 7, velMin: 4.8, velMax: 6.4, freq: 70 }
    ];
  } else {
    // Fase 10 (FINAL): Mega Rodovia Continental com tráfego caótico!
    configuracaoPistas = [
      { y: 440, altura: 240, numFaixas: 6, velMin: 5.0, velMax: 6.8, freq: 65 },
      { y: 380, altura: 25, tipo: 'calcada' },
      { y: 80, altura: 280, numFaixas: 7, velMin: 5.2, velMax: 7.2, freq: 60 }
    ];
  }

  // Gera as pistas, calçadas e carros
  configuracaoPistas.forEach((bloco, blocoIdx) => {
    if (bloco.tipo === 'calcada') {
      areasSeguras.push({
        y: bloco.y,
        altura: bloco.altura,
        tipo: 'calcada'
      });

      // Adiciona árvores decorativas nas calçadas
      const qtdArvores = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < qtdArvores; i++) {
        arvores.push({
          x: 20 + i * (canvas.width / qtdArvores) + (Math.random() * 20 - 10),
          y: bloco.y + bloco.altura / 2,
          raio: 10 + Math.random() * 5
        });
      }
    } else {
      // É uma rua com várias faixas de rolagem
      const alturaFaixa = bloco.altura / bloco.numFaixas;

      for (let f = 0; f < bloco.numFaixas; f++) {
        const faixaY = bloco.y + f * alturaFaixa;
        // Sentido alternado: faixas pares vão para direita, ímpares para esquerda
        const direcao = (f % 2 === 0) ? 1 : -1;

        // Velocidade da faixa
        const velFaixa = bloco.velMin + Math.random() * (bloco.velMax - bloco.velMin);

        const novaFaixa = {
          y: faixaY,
          altura: alturaFaixa,
          direcao: direcao,
          velocidade: velFaixa * direcao,
          intervaloSpawn: bloco.freq + Math.floor(Math.random() * 40),
          contadorSpawn: Math.floor(Math.random() * bloco.freq)
        };
        faixasDeTransito.push(novaFaixa);

        // Pré-popula a faixa com 2 ou 3 carros para não começar vazia
        const qtdCarrosIniciais = 2 + Math.floor(Math.random() * 2);
        for (let c = 0; c < qtdCarrosIniciais; c++) {
          const xInicial = (canvas.width / qtdCarrosIniciais) * c + (Math.random() * 40 - 20);
          criarCarroNaFaixa(novaFaixa, xInicial);
        }
      }
    }
  });

  // Árvores no gramado de partida
  for (let i = 0; i < 4; i++) {
    arvores.push({
      x: 30 + i * 160 + (Math.random() * 20 - 10),
      y: 770,
      raio: 12 + Math.random() * 4
    });
  }

  // 4. DISTRIBUIÇÃO DE MOEDAS COLETÁVEIS NO CENÁRIO
  // Quantidade de moedas aumenta com a fase (de 4 a 12 moedas)
  const qtdMoedas = Math.min(12, 4 + numeroFase);
  for (let m = 0; m < qtdMoedas; m++) {
    // Escolhe uma posição Y em uma faixa ou calçada segura
    const faixaAleatoria = faixasDeTransito[Math.floor(Math.random() * faixasDeTransito.length)];
    const moedaY = faixaAleatoria ? faixaAleatoria.y + faixaAleatoria.altura / 2 : 300;
    const moedaX = 40 + Math.random() * (canvas.width - 80);

    moedas.push({
      x: moedaX,
      y: moedaY,
      raio: 9,
      coletada: false,
      anguloRotacao: Math.random() * Math.PI * 2
    });
  }
}

/**
 * Cria um veículo (carro esportivo, sedan ou caminhão)
 */
function criarCarroNaFaixa(faixa, xForcado = null) {
  // Tipos de veículos com diferentes tamanhos e cores
  const tipos = [
    { tipo: 'sedan', largura: 60, altura: 28, cor: '#3b82f6' },      // Azul
    { tipo: 'sedan', largura: 58, altura: 28, cor: '#e11d48' },      // Vermelho
    { tipo: 'esportivo', largura: 52, altura: 26, cor: '#eab308' },  // Amarelo
    { tipo: 'esportivo', largura: 50, altura: 25, cor: '#06b6d4' },  // Ciano
    { tipo: 'caminhao', largura: 95, altura: 32, cor: '#84cc16' },   // Verde limão
    { tipo: 'caminhao', largura: 110, altura: 34, cor: '#a855f7' }   // Roxo
  ];

  // Sorteia um modelo
  const modelo = tipos[Math.floor(Math.random() * tipos.length)];

  // Define a posição horizontal
  let posX = 0;
  if (xForcado !== null) {
    posX = xForcado;
  } else {
    // Se anda para direita (direcao 1), nasce à esquerda do canvas (-largura)
    // Se anda para esquerda (direcao -1), nasce à direita do canvas (canvas.width + 10)
    posX = faixa.direcao === 1 ? -modelo.largura - 10 : canvas.width + 10;
  }

  // Centraliza o carro na altura da faixa
  const posY = faixa.y + (faixa.altura - modelo.altura) / 2;

  carros.push({
    x: posX,
    y: posY,
    largura: modelo.largura,
    altura: modelo.altura,
    velocidade: faixa.velocidade,
    direcao: faixa.direcao,
    cor: modelo.cor,
    tipo: modelo.tipo
  });
}

/* ============================================================================
   7. LÓGICA DE MOVIMENTAÇÃO E ENTRADAS
   ============================================================================ */

function moverGalinha() {
  let moveu = false;
  let novoX = galinha.x;
  let novoY = galinha.y;

  // Teclado ou Controles Virtuais
  if (teclas.ArrowUp || teclas.KeyW) {
    novoY -= galinha.velocidade;
    galinha.direcao = 'up';
    moveu = true;
  }
  if (teclas.ArrowDown || teclas.KeyS) {
    novoY += galinha.velocidade;
    galinha.direcao = 'down';
    moveu = true;
  }
  if (teclas.ArrowLeft || teclas.KeyA) {
    novoX -= galinha.velocidade;
    galinha.direcao = 'left';
    moveu = true;
  }
  if (teclas.ArrowRight || teclas.KeyD) {
    novoX += galinha.velocidade;
    galinha.direcao = 'right';
    moveu = true;
  }

  // Limites do Canvas (impede a galinha de sair da tela)
  galinha.x = Math.max(0, Math.min(canvas.width - galinha.largura, novoX));
  galinha.y = Math.max(0, Math.min(canvas.height - galinha.altura, novoY));

  galinha.estaAndando = moveu;
  if (moveu) {
    galinha.animPasso += 0.25;

    // Detecta travessia de faixa para progredir a missão diária
    if (galinha.y < galinha.ultimaFaixaY - 50) {
      galinha.ultimaFaixaY = galinha.y;
      progredirMissao('ruas', 1);
    }
  }

  // Atualiza a barra de progresso lateral (0% na base, 100% no topo)
  const distanciaTotal = 740; // da base até o topo
  const progresso = Math.max(0, Math.min(100, ((distanciaTotal - galinha.y) / distanciaTotal) * 100));
  phaseProgressBar.style.height = `${progresso}%`;
  phaseChickenPin.style.bottom = `${progresso}%`;
}

function moverCarros() {
  for (let i = carros.length - 1; i >= 0; i--) {
    const c = carros[i];
    c.x += c.velocidade;

    // Remove carros que saíram completamente do campo de visão
    if (c.direcao === 1 && c.x > canvas.width + 120) {
      carros.splice(i, 1);
    } else if (c.direcao === -1 && c.x < -c.largura - 120) {
      carros.splice(i, 1);
    }
  }

  // Spawna novos carros continuamente nas faixas
  faixasDeTransito.forEach(faixa => {
    faixa.contadorSpawn++;
    if (faixa.contadorSpawn >= faixa.intervaloSpawn) {
      faixa.contadorSpawn = 0;
      // Garante uma distância mínima do último carro
      const temCarroPerto = carros.some(c => {
        if (faixa.direcao === 1) {
          return c.y >= faixa.y && c.y < faixa.y + faixa.altura && c.x < 80;
        } else {
          return c.y >= faixa.y && c.y < faixa.y + faixa.altura && c.x > canvas.width - 80;
        }
      });

      if (!temCarroPerto) {
        criarCarroNaFaixa(faixa);
      }
    }
  });
}

/* ============================================================================
   8. DETECÇÃO DE COLISÕES (AABB - AXIS-ALIGNED BOUNDING BOX)
   ============================================================================
   Método clássico e didático com retângulos delimitadores.
*/

// Verifica se dois retângulos se sobrepõem
function colisaoRetangulos(r1, r2) {
  // Ajuste de margem (hitbox suave) para tornar o jogo justo e gostoso de jogar
  const margem = 4;
  return (
    r1.x + margem < r2.x + r2.largura &&
    r1.x + r1.largura - margem > r2.x &&
    r1.y + margem < r2.y + r2.altura &&
    r1.y + r1.altura - margem > r2.y
  );
}

function verificarColisoes() {
  // 1. Colisão Galinha x Carros
  if (estadoJogo.animacaoDanoTimer <= 0) {
    for (let i = 0; i < carros.length; i++) {
      if (colisaoRetangulos(galinha, carros[i])) {
        perderVida();
        break;
      }
    }
  }

  // 2. Colisão Galinha x Moedas
  moedas.forEach(m => {
    if (!m.coletada) {
      // Distância euclidiana simples entre o centro da galinha e a moeda
      const centroGalinhaX = galinha.x + galinha.largura / 2;
      const centroGalinhaY = galinha.y + galinha.altura / 2;
      const dist = Math.hypot(centroGalinhaX - m.x, centroGalinhaY - m.y);

      if (dist < galinha.largura / 2 + m.raio) {
        coletarMoeda(m);
      }
    }
  });

  // 3. Colisão Galinha x Linha de Chegada (Meta no topo)
  if (galinha.y <= 65) {
    concluirFase();
  }
}

function coletarMoeda(moeda) {
  moeda.coletada = true;
  estadoJogo.moedasColetadasNaFase++;
  dadosJogador.moedasTotais++;
  coinsDisplay.textContent = dadosJogador.moedasTotais;

  audio.playCoin();
  progredirMissao('moedas', 1);

  // Efeito visual flutuante "+1"
  criarTextoFlutuante('+1 🪙', moeda.x, moeda.y, '#facc15');

  // Faíscas douradas de partículas
  for (let i = 0; i < 8; i++) {
    particulas.push({
      x: moeda.x,
      y: moeda.y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      cor: '#fde047',
      raio: 3,
      vida: 1.0,
      decaimento: 0.05
    });
  }
}

function perderVida() {
  estadoJogo.vidas--;
  estadoJogo.vidasPerdidasNestaFase++;
  livesDisplay.textContent = estadoJogo.vidas;

  audio.playDamage();

  // Efeito de tela piscando vermelho
  damageOverlay.classList.add('flash');
  setTimeout(() => damageOverlay.classList.remove('flash'), 180);

  // Efeito de Screen Shake
  estadoJogo.shakeTimer = 15;

  // Cria explosão de penas
  for (let i = 0; i < 16; i++) {
    particulas.push({
      x: galinha.x + galinha.largura / 2,
      y: galinha.y + galinha.altura / 2,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      cor: Math.random() > 0.3 ? '#ffffff' : '#ef4444',
      raio: 4 + Math.random() * 3,
      vida: 1.0,
      decaimento: 0.03
    });
  }

  // Verifica Game Over
  if (estadoJogo.vidas <= 0) {
    mostrarGameOver();
  } else {
    // Retorna a galinha para o início da fase atual
    galinha.x = canvas.width / 2 - galinha.largura / 2;
    galinha.y = 740;
    galinha.direcao = 'up';
    galinha.ultimaFaixaY = 740;
    estadoJogo.animacaoDanoTimer = 40; // Breve período de invencibilidade visual
  }
}

/* ============================================================================
   9. CONCLUSÃO DE FASE E GAME OVER
   ============================================================================ */

function concluirFase() {
  estadoJogo.emExecucao = false;
  audio.playWin();

  const tempoFinalSegundos = Math.floor((Date.now() - estadoJogo.tempoInicialFase) / 1000);
  const bonusFase = 10;
  dadosJogador.moedasTotais += bonusFase;

  // Verifica se bateu recorde de tempo
  const tempoAnterior = dadosJogador.melhoresTempos[estadoJogo.faseAtual];
  if (!tempoAnterior || tempoFinalSegundos < tempoAnterior) {
    dadosJogador.melhoresTempos[estadoJogo.faseAtual] = tempoFinalSegundos;
  }

  // Desbloqueia a próxima fase
  if (estadoJogo.faseAtual >= dadosJogador.faseDesbloqueada && estadoJogo.faseAtual < TOTAL_FASES) {
    dadosJogador.faseDesbloqueada = estadoJogo.faseAtual + 1;
  }

  // Progresso das Missões
  if (estadoJogo.vidasPerdidasNestaFase === 0) {
    progredirMissao('sem_dano', 1);
  }
  if (tempoFinalSegundos < 30) {
    progredirMissao('velocidade', 1);
  }

  salvarProgresso();

  // Exibe tela de vitória
  vstatCoinsPicked.textContent = `+${estadoJogo.moedasColetadasNaFase} 🪙`;
  vstatBonus.textContent = `+${bonusFase} 🪙`;
  vstatTime.textContent = formatarTempo(tempoFinalSegundos);
  vstatTotalCoins.textContent = `${dadosJogador.moedasTotais} 🪙`;

  // Se já chegou na última fase
  if (estadoJogo.faseAtual >= TOTAL_FASES) {
    btnNextLevel.innerHTML = '<span class="btn-icon">🏆</span> Jogo Zerado!';
  } else {
    btnNextLevel.innerHTML = '<span class="btn-icon">➔</span> Próxima Fase';
  }

  victoryScreen.classList.remove('hidden');
}

function mostrarGameOver() {
  estadoJogo.emExecucao = false;
  audio.playGameOver();

  gstatCoins.textContent = `${dadosJogador.moedasTotais} 🪙`;
  gstatLevel.textContent = `Fase ${estadoJogo.faseAtual}`;

  salvarProgresso();
  gameOverScreen.classList.remove('hidden');
}

/* ============================================================================
   10. DESENHO NO CANVAS (GRÁFICOS 2D ESTILIZADOS)
   ============================================================================
   Desenho 100% nativo com Canvas 2D: galinha com crista e bico, carros
   com faróis e janelas, asfalto com faixas brancas e gramado.
*/

function desenharJogo() {
  ctx.save();

  // Efeito de Screen Shake se estiver ativo
  if (estadoJogo.shakeTimer > 0) {
    const shakeMagnitude = 5;
    const dx = (Math.random() - 0.5) * shakeMagnitude;
    const dy = (Math.random() - 0.5) * shakeMagnitude;
    ctx.translate(dx, dy);
    estadoJogo.shakeTimer--;
  }

  // 1. Limpa o Canvas com a cor base da grama
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Desenha as faixas de asfalto (ruas)
  faixasDeTransito.forEach((faixa, idx) => {
    // Asfalto cinza escuro
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, faixa.y, canvas.width, faixa.altura);

    // Linha divisória de faixa (branca/amarela tracejada)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(0, faixa.y);
    ctx.lineTo(canvas.width, faixa.y);
    ctx.stroke();
    ctx.setLineDash([]); // Restaura traço contínuo
  });

  // 3. Desenha Áreas Seguras e Calçadas
  areasSeguras.forEach(area => {
    if (area.tipo === 'meta') {
      // Faixa quadriculada de chegada (estilo corrida)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, area.y, canvas.width, area.altura);

      // Padrão de linha de chegada
      const tamanhoBloco = 20;
      for (let x = 0; x < canvas.width; x += tamanhoBloco) {
        for (let y = area.altura - 20; y < area.altura; y += 10) {
          const par = (Math.floor(x / tamanhoBloco) + Math.floor(y / 10)) % 2 === 0;
          ctx.fillStyle = par ? '#ffffff' : '#0f172a';
          ctx.fillRect(x, y, tamanhoBloco, 10);
        }
      }

      // Texto de CHEGADA
      ctx.font = 'bold 22px Fredoka, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('🏁 CHEGADA DA FAZENDA 🏁', canvas.width / 2, 35);

    } else if (area.tipo === 'calcada') {
      // Calçada intermediária
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, area.y, canvas.width, area.altura);

      // Borda de meio-fio
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, area.y, canvas.width, 3);
      ctx.fillRect(0, area.y + area.altura - 3, canvas.width, 3);
    } else {
      // Gramado de partida
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, area.y, canvas.width, area.altura);
    }
  });

  // 4. Desenha as Árvores Decorativas
  arvores.forEach(arv => {
    // Tronco
    ctx.fillStyle = '#78350f';
    ctx.fillRect(arv.x - 3, arv.y, 6, 8);

    // Copa da Árvore
    ctx.beginPath();
    ctx.arc(arv.x, arv.y - 2, arv.raio, 0, Math.PI * 2);
    ctx.fillStyle = '#166534';
    ctx.fill();

    // Destaque de luz na copa
    ctx.beginPath();
    ctx.arc(arv.x - 3, arv.y - 5, arv.raio * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  });

  // 5. Desenha as Moedas (Girando e Brilhando)
  const tempoAtual = Date.now() * 0.005;
  moedas.forEach(m => {
    if (!m.coletada) {
      ctx.save();
      ctx.translate(m.x, m.y);

      // Simulação de rotação 3D variando a escala X com Math.cos
      const escalaX = Math.abs(Math.cos(tempoAtual + m.anguloRotacao));
      ctx.scale(escalaX, 1);

      // Moeda externa dourada
      ctx.beginPath();
      ctx.arc(0, 0, m.raio, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ca8a04';
      ctx.stroke();

      // Centro da moeda
      ctx.beginPath();
      ctx.arc(0, 0, m.raio * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      ctx.restore();
    }
  });

  // 6. Desenha os Carros
  carros.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);

    // Se estiver se movendo para a esquerda, espelha o desenho
    if (c.direcao === -1) {
      ctx.translate(c.largura, 0);
      ctx.scale(-1, 1);
    }

    // Feixe de luz dos faróis
    ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.beginPath();
    ctx.moveTo(c.largura, 6);
    ctx.lineTo(c.largura + 50, -4);
    ctx.lineTo(c.largura + 50, c.altura + 4);
    ctx.lineTo(c.largura, c.altura - 6);
    ctx.closePath();
    ctx.fill();

    // Sombra do carro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(2, c.altura - 2, c.largura - 4, 6);

    // Rodas (4 pneus pretos)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, -2, 12, 4);
    ctx.fillRect(c.largura - 20, -2, 12, 4);
    ctx.fillRect(8, c.altura - 2, 12, 4);
    ctx.fillRect(c.largura - 20, c.altura - 2, 12, 4);

    // Carroceria principal
    ctx.fillStyle = c.cor;
    desenharRetanguloArredondado(ctx, 0, 0, c.largura, c.altura, 6);
    ctx.fill();

    // Teto / Cabine
    ctx.fillStyle = '#0f172a';
    const recuoX = c.tipo === 'caminhao' ? c.largura - 35 : 14;
    const larguraCabine = c.tipo === 'caminhao' ? 30 : c.largura - 28;
    desenharRetanguloArredondado(ctx, recuoX, 4, larguraCabine, c.altura - 8, 4);
    ctx.fill();

    // Para-brisa dianteiro
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(recuoX + larguraCabine - 6, 6, 4, c.altura - 12);

    // Faróis dianteiros (amarelos brilhantes)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(c.largura - 3, 2, 3, 6);
    ctx.fillRect(c.largura - 3, c.altura - 8, 3, 6);

    // Lanternas traseiras (vermelhas)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 3, 3, 5);
    ctx.fillRect(0, c.altura - 8, 3, 5);

    ctx.restore();
  });

  // 7. Desenha a Galinha (Jogador)
  desenharGalinha();

  // 8. Desenha Partículas e Textos Flutuantes
  desenharParticulas();
  desenharTextosFlutuantes();

  ctx.restore();
}

/**
 * Desenha a galinha estilizada vista de cima
 */
function desenharGalinha() {
  ctx.save();
  ctx.translate(galinha.x + galinha.largura / 2, galinha.y + galinha.altura / 2);

  // Rotação suave baseada na direção do movimento
  let angulo = 0;
  if (galinha.direcao === 'down') angulo = Math.PI;
  if (galinha.direcao === 'left') angulo = -Math.PI / 2;
  if (galinha.direcao === 'right') angulo = Math.PI / 2;
  ctx.rotate(angulo);

  // Pisca se estiver no tempo pós-dano (invencibilidade temporária)
  if (estadoJogo.animacaoDanoTimer > 0) {
    estadoJogo.animacaoDanoTimer--;
    if (Math.floor(estadoJogo.animacaoDanoTimer / 4) % 2 === 0) {
      ctx.restore();
      return;
    }
  }

  // Animação de caminhada com oscilação dos pezinhos
  const balancoPernas = galinha.estaAndando ? Math.sin(galinha.animPasso) * 4 : 0;

  // Patas de galinha (alaranjadas)
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-8, 8 + balancoPernas, 4, 6);
  ctx.fillRect(4, 8 - balancoPernas, 4, 6);

  // Sombra suave sob a galinha
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();

  // Corpo principal (redondo branco)
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // Asinhas laterais com leve movimento
  const flap = galinha.estaAndando ? Math.sin(galinha.animPasso * 2) * 2 : 0;
  ctx.fillStyle = '#f1f5f9';
  // Asa esquerda
  ctx.beginPath();
  ctx.ellipse(-12 - flap, 0, 3, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Asa direita
  ctx.beginPath();
  ctx.ellipse(12 + flap, 0, 3, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crista vermelha charmosa no topo da cabeça
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(0, -10, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bico amarelo pontudo voltado para a frente
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(-4, -10);
  ctx.lineTo(4, -10);
  ctx.lineTo(0, -17);
  ctx.closePath();
  ctx.fill();

  // Olhos expressivos
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-4, -7, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -7, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Pontinhos de luz nos olhos
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-4.5, -7.5, 0.8, 0, Math.PI * 2);
  ctx.arc(3.5, -7.5, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Desenha partículas (penas, fumaça, confetes)
 */
function desenharParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vida -= p.decaimento;

    if (p.vida <= 0) {
      particulas.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.vida);
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Textos flutuantes animados (+1, +10)
 */
function criarTextoFlutuante(texto, x, y, cor = '#ffffff') {
  textosFlutuantes.push({
    texto: texto,
    x: x,
    y: y,
    vy: -1.5,
    alfa: 1.0,
    cor: cor
  });
}

function desenharTextosFlutuantes() {
  for (let i = textosFlutuantes.length - 1; i >= 0; i--) {
    const t = textosFlutuantes[i];
    t.y += t.vy;
    t.alfa -= 0.025;

    if (t.alfa <= 0) {
      textosFlutuantes.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = t.alfa;
    ctx.font = 'bold 18px Fredoka, sans-serif';
    ctx.fillStyle = t.cor;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(t.texto, t.x, t.y);
    ctx.restore();
  }
}

// Utilitário para desenhar retângulos com cantos arredondados no Canvas
function desenharRetanguloArredondado(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/* ============================================================================
   11. LOOP PRINCIPAL DO JOGO (requestAnimationFrame)
   ============================================================================ */

let ultimoTimestamp = 0;
let acumuladorTempoMissao = 0;

function loopPrincipal(timestamp) {
  if (!ultimoTimestamp) ultimoTimestamp = timestamp;
  const delta = (timestamp - ultimoTimestamp) / 1000;
  ultimoTimestamp = timestamp;

  if (estadoJogo.emExecucao && !estadoJogo.pausado) {
    // 1. Atualizações lógicas do jogo
    moverGalinha();
    moverCarros();
    verificarColisoes();

    // 2. Atualização do temporizador da fase
    estadoJogo.tempoDecorridoFase = Math.floor((Date.now() - estadoJogo.tempoInicialFase) / 1000);
    timeDisplay.textContent = formatarTempo(estadoJogo.tempoDecorridoFase);

    // 3. Atualização do tempo total jogado para a missão de tempo
    acumuladorTempoMissao += delta;
    if (acumuladorTempoMissao >= 1) {
      dadosJogador.estatisticas.tempoTotalJogado += Math.floor(acumuladorTempoMissao);
      progredirMissao('tempo_jogo', Math.floor(acumuladorTempoMissao));
      acumuladorTempoMissao = 0;
    }
  }

  // 4. Renderização gráfica no Canvas
  desenharJogo();

  requestAnimationFrame(loopPrincipal);
}

/* ============================================================================
   12. CONTROLE DE FLUXO (INICIAR, PAUSAR, REINICIAR)
   ============================================================================ */

function iniciarJogo(faseParaIniciar = 1) {
  try {
    audio.init();
    audio.playClick();
  } catch (err) {
    console.warn('Áudio não inicializado:', err);
  }

  fecharTodosModaisETelas();

  const faseAlvo = Math.max(1, Math.min(TOTAL_FASES, Number(faseParaIniciar) || 1));
  estadoJogo.faseAtual = faseAlvo;
  estadoJogo.vidas = 3;
  estadoJogo.vidasPerdidasNestaFase = 0;
  estadoJogo.moedasColetadasNaFase = 0;
  estadoJogo.pausado = false;
  estadoJogo.emExecucao = true;
  estadoJogo.tempoInicialFase = Date.now();
  estadoJogo.tempoDecorridoFase = 0;

  // Atualiza a interface do HUD
  livesDisplay.textContent = estadoJogo.vidas;
  coinsDisplay.textContent = dadosJogador.moedasTotais;
  levelDisplay.textContent = `Fase ${estadoJogo.faseAtual}`;
  timeDisplay.textContent = '00:00';

  hud.classList.remove('hidden');
  phaseProgressWrapper.classList.remove('hidden');

  configurarFase(estadoJogo.faseAtual);
}

function alternarPausa() {
  if (!estadoJogo.emExecucao) return;

  estadoJogo.pausado = !estadoJogo.pausado;
  try { audio.playClick(); } catch (e) { }

  if (estadoJogo.pausado) {
    pauseScreen.classList.remove('hidden');
  } else {
    pauseScreen.classList.add('hidden');
    // Ajusta o tempo inicial para descontar a pausa
    estadoJogo.tempoInicialFase = Date.now() - (estadoJogo.tempoDecorridoFase * 1000);
  }
}

function voltarAoMenu() {
  try { audio.playClick(); } catch (e) { }
  estadoJogo.emExecucao = false;
  estadoJogo.pausado = false;

  fecharTodosModaisETelas();
  menuScreen.classList.remove('hidden');
  menuScreen.classList.add('active');
  hud.classList.add('hidden');
  phaseProgressWrapper.classList.add('hidden');

  atualizarInterfaceGeral();
}

function fecharTodosModaisETelas() {
  menuScreen.classList.add('hidden');
  menuScreen.classList.remove('active');
  pauseScreen.classList.add('hidden');
  victoryScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  levelSelectModal.classList.add('hidden');
  missionsModal.classList.add('hidden');
  howToPlayModal.classList.add('hidden');
}

function atualizarInterfaceGeral() {
  menuTotalCoins.textContent = dadosJogador.moedasTotais;
  menuCurrentLevel.textContent = `Fase ${dadosJogador.faseDesbloqueada}`;
  atualizarBadgeMissoes();
}

function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

/* ============================================================================
   13. SELEÇÃO DE FASES (MODAL)
   ============================================================================ */

function abrirModalSeletorFases() {
  audio.playClick();
  levelsGrid.innerHTML = '';

  for (let i = 1; i <= TOTAL_FASES; i++) {
    const card = document.createElement('div');
    const desbloqueada = i <= dadosJogador.faseDesbloqueada;
    card.className = `level-card ${desbloqueada ? 'unlocked' : 'locked'}`;

    if (i === dadosJogador.faseDesbloqueada) {
      card.classList.add('active-phase');
    }

    const recorde = dadosJogador.melhoresTempos[i] ? `${dadosJogador.melhoresTempos[i]}s` : '';

    card.innerHTML = `
      <div class="level-num">${desbloqueada ? i : '🔒'}</div>
      ${recorde ? `<div class="level-record">⏱️ ${recorde}</div>` : ''}
    `;

    if (desbloqueada) {
      card.addEventListener('click', () => {
        iniciarJogo(i);
      });
    }

    levelsGrid.appendChild(card);
  }

  levelSelectModal.classList.remove('hidden');
}

/* ============================================================================
   14. CONFIGURAÇÃO DE EVENTOS DE TECLADO E TOQUE (MOBILE)
   ============================================================================ */

// Teclado
window.addEventListener('keydown', (e) => {
  if (teclas.hasOwnProperty(e.code)) {
    teclas[e.code] = true;
    e.preventDefault();
  }

  // Tecla ESC para pausar/despausar
  if (e.code === 'Escape') {
    alternarPausa();
  }
});

window.addEventListener('keyup', (e) => {
  if (teclas.hasOwnProperty(e.code)) {
    teclas[e.code] = false;
    e.preventDefault();
  }
});

// Controles Virtuais Mobile (D-Pad)
const mapeamentoMobile = [
  { btn: btnUp, key: 'ArrowUp' },
  { btn: btnDown, key: 'ArrowDown' },
  { btn: btnLeft, key: 'ArrowLeft' },
  { btn: btnRight, key: 'ArrowRight' }
];

mapeamentoMobile.forEach(item => {
  if (item.btn) {
    const ativar = (e) => {
      e.preventDefault();
      teclas[item.key] = true;
      item.btn.classList.add('active');
    };
    const desativar = (e) => {
      e.preventDefault();
      teclas[item.key] = false;
      item.btn.classList.remove('active');
    };

    item.btn.addEventListener('touchstart', ativar, { passive: false });
    item.btn.addEventListener('touchend', desativar, { passive: false });
    item.btn.addEventListener('touchcancel', desativar, { passive: false });
    item.btn.addEventListener('mousedown', ativar);
    item.btn.addEventListener('mouseup', desativar);
    item.btn.addEventListener('mouseleave', desativar);
  }
});

// Botões da Interface
btnPlay.addEventListener('click', (e) => {
  e.preventDefault();
  try { audio.playClick(); } catch (err) { }
  iniciarJogo(dadosJogador.faseDesbloqueada || 1);
});

btnSelectLevel.addEventListener('click', (e) => {
  e.preventDefault();
  abrirModalSeletorFases();
});

btnOpenMissions.addEventListener('click', (e) => {
  e.preventDefault();
  try { audio.playClick(); } catch (err) { }
  renderizarMissoes();
  missionsModal.classList.remove('hidden');
});

btnOpenHowToPlay.addEventListener('click', (e) => {
  e.preventDefault();
  try { audio.playClick(); } catch (err) { }
  howToPlayModal.classList.remove('hidden');
});

btnToggleSound.addEventListener('click', (e) => {
  e.preventDefault();
  const ativado = audio.toggle();
  soundIcon.textContent = ativado ? '🔊' : '🔇';
  soundStatus.textContent = ativado ? 'Ligado' : 'Mudo';
  if (ativado) {
    try { audio.playClick(); } catch (err) { }
  }
});

btnPause.addEventListener('click', (e) => {
  e.preventDefault();
  alternarPausa();
});

btnResume.addEventListener('click', (e) => {
  e.preventDefault();
  alternarPausa();
});

btnRestartLevel.addEventListener('click', (e) => {
  e.preventDefault();
  try { audio.playClick(); } catch (err) { }
  iniciarJogo(estadoJogo.faseAtual);
});

btnPauseMenu.addEventListener('click', (e) => {
  e.preventDefault();
  voltarAoMenu();
});

btnNextLevel.addEventListener('click', (e) => {
  e.preventDefault();
  try { audio.playClick(); } catch (err) { }
  if (estadoJogo.faseAtual < TOTAL_FASES) {
    iniciarJogo(estadoJogo.faseAtual + 1);
  } else {
    voltarAoMenu();
  }
});

btnVictoryMenu.addEventListener('click', (e) => {
  e.preventDefault();
  voltarAoMenu();
});

btnRetryLevel.addEventListener('click', (e) => {
  e.preventDefault();
  try { audio.playClick(); } catch (err) { }
  iniciarJogo(estadoJogo.faseAtual);
});

btnGameOverMenu.addEventListener('click', (e) => {
  e.preventDefault();
  voltarAoMenu();
});

// Fechamento genérico de modais via atributo data-close
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    try { audio.playClick(); } catch (err) { }
    const modalId = btn.getAttribute('data-close');
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  });
});

/* ============================================================================
   15. INICIALIZAÇÃO AUTOMÁTICA AO CARREGAR A PÁGINA
   ============================================================================ */

function inicializarApp() {
  carregarProgresso();
  renderizarMissoes();
  atualizarInterfaceGeral();

  // Inicia o loop de animação do Canvas
  requestAnimationFrame(loopPrincipal);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
  inicializarApp();
}
