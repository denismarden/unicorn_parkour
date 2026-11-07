const _origSet = Storage.prototype.setItem;
Storage.prototype.setItem = function () { try { _origSet.apply(this, arguments); } catch (e) { } };
const _origGet = Storage.prototype.getItem;
Storage.prototype.getItem = function () { try { return _origGet.apply(this, arguments); } catch (e) { return null; } };

// ─────────────────────────────────────────────────────────────────────────
// CONSTANTES DE AJUSTE — física, sensação do pulo, dificuldade e economia
// ─────────────────────────────────────────────────────────────────────────
const PASSO_FISICA = 1 / 60;          // passo fixo da simulação (s) — igual em 60, 120 ou 144 Hz
const GRAVIDADE_BASE = 0.6;           // gravidade por passo
const FORCA_PULO = -12;               // velocidade vertical inicial do pulo
const MULT_GRAVIDADE_QUEDA = 1.6;     // a queda é mais pesada que a subida
const CORTE_PULO = 0.5;               // soltar o botão na subida multiplica a velocidade por isto
const PASSOS_PULO_MIN = 6;            // o corte só vale depois de 6 passos no ar: toque rápido ainda dá um pulo útil (~74 px)
const PASSOS_BUFFER_PULO = 8;         // ~133 ms: pulo apertado pouco antes de pousar ainda vale
const PASSOS_COYOTE = 6;              // ~100 ms: depois de sair da borda ainda conta como "no chão"
const VEL_SLAM = 30;                  // velocidade de descida do slam
const VEL_MAX_QUEDA = 16;             // queda livre nunca passa disto (o slam pode ir até VEL_SLAM)
const VEL_TREMOR_POUSO = 15;          // pouso acima desta velocidade dá um tremor leve
const SUAVIZACAO_SLOWMO = 0.08;       // transição suave da câmera lenta
const MULT_CURVA_DASH = 1.5;          // dash com entrada/saída suave (1.5 mantém a distância total)
const VEL_MIN_SLAM = 15;              // abaixo disso o pouso não conta como slam
const DURACAO_DASH = 0.3;             // s
const RECARGA_DASH = 3.0;             // s
const MOLA_RIGIDEZ = 0.22, MOLA_AMORTECIMENTO = 0.28;   // squash & stretch: força da mola e quanto ela freia
const ESTICADA_SLAM = 1.18;           // escala vertical durante o slam (desce "esticado")
const SUAVIZACAO_POSE_AR = 0.35;      // quanto a pose das patas no ar anda por passo até a nova pose
const ATRASO_CABELO = 0.14;           // crina/cauda seguem a subida/queda com atraso (menor = mais atraso)
const BUFFER_DASH = 0.15;            // s — dash apertado até 0,15 s antes de recarregar não se perde
const BONUS_VEL_DASH = 25;            // velocidade extra durante o dash
const ACELERACAO_JOGO = 0.0004;       // aumento da velocidade alvo a cada passo
const VEL_MAXIMA = 22;                // teto da velocidade do jogo
const SUAVIZACAO_VEL = 0.02;          // quão rápido a velocidade alcança o alvo
const ESCALA_SLOWMO = 0.45;           // escala de tempo da câmera lenta
const TREMOR_MORTE = 14;
const TREMOR_POUSO_FORTE = 4;
const DECAIMENTO_TREMOR = 0.9;
const DURACAO_GIRO = 0.5;             // s — duração do mortal para trás do pulo duplo
const PASSOS_POUSO = 10;              // duração da pose de recuperação depois de pousar
const PASSOS_ANIM_MORTE = 60;         // animação de morte antes da tela de game over
const PASSOS_HITPAUSE_MORTE = 6;      // congelamento curto no impacto da morte
const PASSOS_INVULNERAVEL = 60;       // invulnerabilidade depois de escudo / segunda chance
const MAX_PARTICULAS = 150;           // pool fixo reaproveitado
const FATOR_CORRIDA = 0.11;           // velocidade das patas por unidade de velocidade do jogo
const MAX_PASSO_CORRIDA = 0.9;        // limite para as patas não "embaralharem" em alta velocidade
const MARGEM_ALCANCE = 0.8;           // vãos usam no máximo 80% do alcance real do personagem
const DURACAO_ESCUDO = 15;            // s (escudo coletado como power-up)
const CHANCE_POWERUP = 0.06;          // por plataforma (~2 power-ups por minuto)
const AVISO_FIM_PODER = 2;            // s: a pílula do poder pisca quando falta isto
const ATRACAO_POWERUP = 90;          // px: a bolha do power-up é puxada até o personagem a esta distância
const CHANCE_OMNI =0.02;             // por plataforma (no máximo 1 por fase)
const CONVERSAO_ESTRELAS = 0.5;       // fração das estrelas da partida que vai para a carteira
const LARGURA_MIN_ESPINHO = 110;      // plataformas estreitas (fases finais) ainda podem ter espinho no meio
const CHANCE_OBST_FASE1_VETERANO = 0.08; // depois de 3 partidas, a fase 1 já tem alguns obstáculos
const DIST_TREINO_DASH = 4300, DIST_TREINO_SLAM = 6100; // tutorial: barreira e bloco logo depois das dicas
const MIN_LARGURA_PLATAFORMA = 80;    // evita janelas de pouso de 2-3 frames nas fases finais
const GORJETA_POR_NIVEL = 500;        // "Gorjeta Inicial": estrelas para a loja por nível, por partida
const CUSTO_POR_PERSONAGEM = 800;     // preço = id × este valor (os 3 primeiros são livres)

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let floatingTexts = [];
let sleepFrames = 0;
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

let cw, ch;
let bgStars = [];          // estrelas que piscam no céu
let cacheCenario = null;   // camadas de fundo pré-desenhadas (refeitas na troca de fase / resize)

// ─────────────────────────────────────────────────────────────────────────
// PALETA — estilo "noite mágica" com nuvens pastel (as cores de cada fase continuam em PHASES)
// ─────────────────────────────────────────────────────────────────────────
const PALETA = {
    lua: '#FFE9B8',
    estrela: '#FFFFFF', estrelaQuente: '#FFE8B0',
    aurora: ['#7FFFD4', '#FF9EE5', '#B9A4FF'],
    nuvem: '#EEE8FF', nuvemSombra: '#C7B4EC', nuvemContorno: '#4A2763',   // nuvem lavanda: o herói é o ponto mais claro
    nuvemMovel: '#DDF0FF', nuvemChuva: '#B9B0CC',
    cristal: '#BFEFFF', cristalSombra: '#6FA8E8', cristalContorno: '#2A3A7A',
    barreira: ['#7FFFD4', '#B9A4FF'],
    bloco: '#9C7BDB', blocoSombra: '#5A3F96', blocoContorno: '#2E1A55',
    particulas: ['#FF9CCB', '#9BE7FF', '#FFE08A', '#B9A4FF', '#FFFFFF'],
    poeira: '#FFFFFF', gota: '#9BD0FF',
    texto: '#FFF6E8', textoContorno: '#2A1450', destaque: '#FFE08A',
    vagalume: '#FFF3A0', sombraJogador: '#000000'
};
const DENSIDADE_FUNDO_CELULAR = 1;    // resolução do fundo no celular (1 = leve; 2 = nítido e pesado)
const FONTE_JOGO ="'Fredoka', 'Segoe UI', system-ui, sans-serif";

// Detecta aparelho de toque — mostra os controles mobile só em telas de toque
const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const gameContainer = document.getElementById('game-container');

// Resolução lógica (cw × ch) + nitidez em telas HiDPI.
// No celular a altura (paisagem) ou a largura (retrato) lógica fica em 900 para manter a "câmera" afastada,
// mas a proporção acompanha a tela de verdade (sem esticar a imagem).
function resize() {
    const rect = gameContainer.getBoundingClientRect();
    const cssW = Math.max(1, rect.width), cssH = Math.max(1, rect.height);
    const chAntigo = ch, cwAntigo = cw;
    if (isTouchDevice()) {
        if (cssH > cssW) { cw = 900; ch = Math.round(900 * cssH / cssW); }
        else { ch = 900; cw = Math.round(900 * cssW / cssH); }
    } else {
        cw = Math.round(cssW); ch = Math.round(cssH);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [cv, c2d] of [[canvas, ctx], [bgCanvas, bgCtx]]) {
        // no celular o fundo (macio: degradês, aurora) usa densidade 1 — bem mais leve para a GPU;
        // o canvas do jogo continua nítido
        const d = (cv === bgCanvas && isTouchDevice()) ? Math.min(dpr, DENSIDADE_FUNDO_CELULAR) : dpr;
        cv.width = Math.round(cssW * d);
        cv.height = Math.round(cssH * d);
        const escala = (cssW * d) / cw;
        c2d.setTransform(escala, 0, 0, escala, 0, 0);
    }
    gerarEstrelasFundo();
    cacheCenario = null;
    if (!chAntigo) return;   // 1ª chamada (antes de 'state' existir: não pode nem ser lido)
    if (chAntigo !== ch) reescalarMundo(chAntigo);
    else if (state === 'playing' && cwAntigo !== cw && player) {
        // só a largura mudou: o personagem volta a 20% da tela (senão fica colado na borda direita)
        player.x = cw * 0.2; player.ant = null; limparEfeitosPersonagem(player);
        if (!isPaused) alternarPausa(); else render();
    }
    else if (state === 'playing' && isPaused) render();
    if (state === 'gameover' && player) render();   // redimensionar apaga o canvas: redesenha o último quadro
}

function gerarEstrelasFundo() {
    bgStars = [];
    for (let i = 0; i < 26; i++) {
        bgStars.push({
            x: Math.random() * cw, y: Math.random() * ch * 0.6,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.1,
            alpha: Math.random() * 0.4 + 0.4,       // brilho fixo por estrela (sem piscar aleatório)
            fase: Math.random() * Math.PI * 2
        });
    }
}

// Ao redimensionar / girar o celular no meio da partida, reposiciona o mundo na nova altura
function reescalarMundo(chAntigo) {
    const r = ch / chAntigo;
    for (const p of platforms) { p.y *= r; p.baseY *= r; p.h = ch; }
    for (const arr of [stars, feathers, powerupItems]) for (const o of arr) o.y *= r;
    limparParticulas();
    // reescala a posição dos PÉS (senão o jogador fica flutuando acima da plataforma)
    if (player) { player.y = (player.y + player.h) * r - player.h; player.x = cw * 0.2; player.ant = null; limparEfeitosPersonagem(player); }
    for (const p of platforms) p.yAnt = undefined;
    if (state === 'playing' && !isPaused) alternarPausa();   // pausa para o jogador se reorganizar
    else if (state === 'playing') render();
}
window.addEventListener('resize', resize);
resize();

// UI Elements
const mainMenu = document.getElementById('main-menu');
const charMenu = document.getElementById('character-menu');
const leaderboardMenu = document.getElementById('leaderboard-menu');
const gameOverMenu = document.getElementById('game-over');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score');
const starsDisplay = document.getElementById('stars');
const finalScore = document.getElementById('final-score');
const finalStars = document.getElementById('final-stars');

const speedDisplay = document.getElementById('speed');
const powerupDisplay = document.getElementById('powerup-display');
const flightTimerDisplay = document.getElementById('flight-timer');
const magnetDisplay = document.getElementById('magnet-display');
const magnetTimerDisplay = document.getElementById('magnet-timer');
const shieldDisplay = document.getElementById('shield-display');
const shieldTimerDisplay = document.getElementById('shield-timer');
const bonusDisplay = document.getElementById('bonus-display');
const bonusTimerDisplay = document.getElementById('bonus-timer');
const slowmoDisplay = document.getElementById('slowmo-display');
const slowmoTimerDisplay = document.getElementById('slowmo-timer');
const infjumpDisplay = document.getElementById('infjump-display');
const infjumpTimerDisplay = document.getElementById('infjump-timer');
const shrinkDisplay = document.getElementById('shrink-display');
const shrinkTimerDisplay = document.getElementById('shrink-timer');
const giantDisplay = document.getElementById('giant-display');
const giantTimerDisplay = document.getElementById('giant-timer');
const meteorDisplay = document.getElementById('meteor-display');
const meteorTimerDisplay = document.getElementById('meteor-timer');
const rocketDisplay = document.getElementById('rocket-display');
const rocketTimerDisplay = document.getElementById('rocket-timer');
const blackholeDisplay = document.getElementById('blackhole-display');
const blackholeTimerDisplay = document.getElementById('blackhole-timer');
const luckyDisplay = document.getElementById('lucky-display');
const luckyTimerDisplay = document.getElementById('lucky-timer');
const hoverDisplay = document.getElementById('hover-display');
const hoverTimerDisplay = document.getElementById('hover-timer');
const nogapDisplay = document.getElementById('nogap-display');
const nogapTimerDisplay = document.getElementById('nogap-timer');

const btnStart = document.getElementById('btn-start');
const btnChars = document.getElementById('btn-characters');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const btnBack = document.getElementById('btn-back');
const btnLeadBack = document.getElementById('btn-lead-back');
const btnRestart = document.getElementById('btn-restart');
const btnMenuGo = document.getElementById('btn-menu-go');
const btnSaveScore = document.getElementById('btn-save-score');
const btnClearLeaderboard = document.getElementById('btn-clear-leaderboard');
const pauseMenu = document.getElementById('pause-menu');
const charGrid = document.getElementById('character-grid');
const upgradesGrid = document.getElementById('upgrades-grid');
const skinsGrid = document.getElementById('skins-grid');
const shopStarsDisplay = document.getElementById('shop-stars-display');
const inputOverlay = document.getElementById('input-overlay');
const mobileControls = document.getElementById('mobile-controls');
const mobileJumpBtn = document.getElementById('mobile-jump');
const mobileDashBtn = document.getElementById('mobile-dash');
const mobileSlamBtn = document.getElementById('mobile-slam');
const mobilePauseBtn = document.getElementById('mobile-pause');

// Detect touch device moved to the top

const btnMute = document.getElementById('btn-mute');
const globalStarsDisplay = document.getElementById('global-stars-display');
const toastContainer = document.getElementById('toast-container');

const nameInputContainer = document.getElementById('name-input-container');
const playerNameInput = document.getElementById('player-name');

// Game Variables
// Carteira começa em 0 para jogadores novos (quem já tem estrelas salvas mantém o saldo)
const _estrelasSalvas = localStorage.getItem('uniparkourGlobalStars');
let globalStars = _estrelasSalvas === null ? 0 : (parseInt(_estrelasSalvas) || 0);
// Lê um valor salvo sem nunca derrubar o jogo: se estiver corrompido ou no formato errado, usa o padrão
// (a chave NÃO é apagada, para não perder progresso por causa de um erro temporário)
function lerJSON(chave, padrao, valido = () => true) {
    try {
        const txt = localStorage.getItem(chave);
        if (txt === null) return padrao;
        const v = JSON.parse(txt);
        return (v !== null && valido(v)) ? v : padrao;
    } catch (e) {
        console.warn('Save corrompido em', chave, e);
        return padrao;
    }
}
const ehObjeto = (v) => typeof v === 'object' && !Array.isArray(v);
let unlockedChars = lerJSON('uniparkourChars', [0, 1, 2], Array.isArray);
let partidasJogadas = parseInt(localStorage.getItem('uniparkourPartidas')) || 0;
let savedUpgrades = lerJSON('uniparkourUpgrades', {}, ehObjeto);
const defaultUpgrades = {
    jump: 0, score: 0, shield: 0, magnet: 0, dash_cd: 0, dash_pwr: 0,
    slam_score: 0, pu_time: 0, start_stars: 0, jump_pwr: 0, lucky_mult: 0,
    meteor_pts: 0, rocket_spd: 0, free_revive: 0, gravity_f: 0, slowmo_score: 0,
    coin_val: 0, star_spawn: 0, phase_chill: 0, magnet_spd: 0
};
let unlockedUpgrades = { ...defaultUpgrades, ...savedUpgrades };

let unlockedSkins = lerJSON('uniparkourSkins', ['default'], Array.isArray);
let selectedSkin = localStorage.getItem('uniparkourActiveSkin') || 'default';
let isMuted = lerJSON('uniparkourMuted', false, (v) => typeof v === 'boolean');
let globalPowerupDurMult = parseFloat(localStorage.getItem('uniparkourPUDur')) || 1.0;

let audioCtx = null;
let musicOsc = null;
let musicGain = null;
let isSlamming = false;
let screenShake = 0;
let isDashing = false;
let dashCooldown = 0;
let dashTimeLeft = 0;
let gameSpeedAlvo = 5;
let passosMorte = 0;
let plataformasFaceis = 0;
let mostrarTutorial = false;
let tutorialObst = {};   // obstáculos de treino do tutorial já colocados nesta partida
let tutorialIdx = 0;

let state = 'menu';
let isPaused = false;
let score = 0;
let starsCollected = 0;
let gorjetaInicial = 0;   // estrelas do poder "Gorjeta Inicial" (só valem se a partida chegar à fase 2)
let distance = 0;
let gameSpeed = 5;
let frames = 0;
let currentPhase = 0;
let phaseAnnounceFrames = 0;
let usedFreeRevive = false;

let isFlying = false; let flightTimeLeft = 0;
let isMagnetActive = false; let magnetTimeLeft = 0;
let isShieldActive = false; let shieldTimeLeft = 0;
let isBonusActive = false; let bonusTimeLeft = 0;
let isSlowMoActive = false; let slowMoTimeLeft = 0;
let isInfJumpActive = false; let infJumpTimeLeft = 0;
let isShrinkActive = false; let shrinkTimeLeft = 0;
let isGiantActive = false; let giantTimeLeft = 0;
let isMeteorActive = false; let meteorTimeLeft = 0;
let isRocketActive = false; let rocketTimeLeft = 0;
let isBlackHoleActive = false; let blackholeTimeLeft = 0;
let isLuckyActive = false; let luckyTimeLeft = 0;
let isHoverActive = false; let hoverTimeLeft = 0;
let isNoGapActive = false; let noGapTimeLeft = 0;
let rainbowPlatformsCount = 0;

let omniSpawnedThisPhase = false;
let powerupItems = []; // { type, x, y, size, collected, oscOffset }

// Entities
let player;
let platforms = [];
let stars = [];
let feathers = [];
let obstaculos = []; // { tipo: 'espinho'|'barreira'|'bloco', plat, x, w, h, destruido }

// ─────────────────────────────────────────────────────────────────────────
// 10 TIPOS DE ESTRELA — cada tipo tem valor, visual e raridade
// ─────────────────────────────────────────────────────────────────────────
const STAR_TYPES = [
    { id: 'comum', name: 'Estrela Comum', value: 10, size: 10, color: '#FFE08A', glow: '#FFC24A', points: 6, weight: 400 },
    { id: 'brilhante', name: 'Estrela Brilhante', value: 25, size: 12, color: '#ffff88', glow: '#ffdd00', points: 6, weight: 200 },
    { id: 'rara', name: 'Estrela Rara', value: 50, size: 14, color: '#00ddff', glow: '#00aaff', points: 7, weight: 120 },
    { id: 'superior', name: 'Estrela Superior', value: 100, size: 16, color: '#00ff88', glow: '#00cc44', points: 7, weight: 70 },
    { id: 'mistica', name: 'Estrela Mística', value: 250, size: 18, color: '#cc44ff', glow: '#8800ff', points: 8, weight: 40 },
    { id: 'epica', name: 'Estrela Épica', value: 500, size: 20, color: '#ff6600', glow: '#ff3300', points: 8, weight: 20 },
    { id: 'lendaria', name: 'Estrela Lendária', value: 1000, size: 22, color: '#ffd700', glow: '#ffaa00', points: 9, weight: 10 },
    { id: 'suprema', name: 'Estrela Suprema', value: 2500, size: 24, color: '#ff00ff', glow: '#cc00cc', points: 10, weight: 4 },
    { id: 'divina', name: 'Estrela Divina', value: 5000, size: 26, color: '#ffffff', glow: '#aaddff', points: 12, weight: 2 },
    { id: 'cosmica', name: 'Estrela Cósmica', value: 10000, size: 30, color: '#ff0055', glow: '#ff00aa', points: 12, weight: 1 }
];

const STAR_TOTAL_WEIGHT = STAR_TYPES.reduce((acc, t) => acc + t.weight, 0);

function pickStarType() {
    let roll = Math.random() * STAR_TOTAL_WEIGHT;
    for (let t of STAR_TYPES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return STAR_TYPES[0];
}

// ─────────────────────────────────────────────────────────────
// 10 PHASES — Each has a theme, visual palette, and difficulty
// ─────────────────────────────────────────────────────────────
const PHASES = [
    {
        id: 0, name: '🌸 Pradaria Mágica', scoreThreshold: 0,
        sky: ['#1a0a2e', '#2d1050'],
        platform: { top: '#7800ff', glow: '#7800ff', edge: '#00f0ff' },
        baseSpeed: 5, minGap: 150, maxGap: 350, minW: 200, maxW: 500,
        bgColor: '#0d0520', starDensity: 80
    },
    {
        id: 1, name: '☁️ Ilhas Flutuantes', scoreThreshold: 800,
        sky: ['#0a1a3a', '#1a3a6a'],
        platform: { top: '#2255aa', glow: '#4488ff', edge: '#88ccff' },
        baseSpeed: 6, minGap: 160, maxGap: 380, minW: 180, maxW: 480,
        bgColor: '#060f22', starDensity: 60
    },
    {
        id: 2, name: '⚡ Tempestade Elétrica', scoreThreshold: 2000,
        sky: ['#0a0a1a', '#1a0a2e'],
        platform: { top: '#553300', glow: '#ffaa00', edge: '#ffdd00' },
        baseSpeed: 7, minGap: 170, maxGap: 400, minW: 160, maxW: 450,
        bgColor: '#070710', starDensity: 40
    },
    {
        id: 3, name: '🌋 Cavernas de Lava', scoreThreshold: 4000,
        sky: ['#1a0500', '#2a0800'],
        platform: { top: '#881100', glow: '#ff3300', edge: '#ff6600' },
        baseSpeed: 8, minGap: 180, maxGap: 420, minW: 150, maxW: 420,
        bgColor: '#0d0200', starDensity: 20
    },
    {
        id: 4, name: '❄️ Tundra Glacial', scoreThreshold: 7000,
        sky: ['#001a2a', '#002a40'],
        platform: { top: '#004466', glow: '#00aaff', edge: '#aaddff' },
        baseSpeed: 8.5, minGap: 190, maxGap: 430, minW: 140, maxW: 400,
        bgColor: '#000d16', starDensity: 90
    },
    {
        id: 5, name: '🚀 Órbita Cósmica', scoreThreshold: 11000,
        sky: ['#000010', '#0a000a'],
        platform: { top: '#220044', glow: '#8800ff', edge: '#cc44ff' },
        baseSpeed: 9, minGap: 200, maxGap: 450, minW: 130, maxW: 380,
        bgColor: '#000008', starDensity: 120
    },
    {
        id: 6, name: '💜 Portal Neon', scoreThreshold: 16000,
        sky: ['#0a001a', '#1a0030'],
        platform: { top: '#003322', glow: '#00ff88', edge: '#00ffcc' },
        baseSpeed: 9.5, minGap: 210, maxGap: 470, minW: 120, maxW: 360,
        bgColor: '#04000f', starDensity: 70
    },
    {
        id: 7, name: '🍭 Mundo Doce', scoreThreshold: 22000,
        sky: ['#1a0520', '#2a0535'],
        platform: { top: '#882244', glow: '#ff4488', edge: '#ffaacc' },
        baseSpeed: 10, minGap: 220, maxGap: 490, minW: 110, maxW: 340,
        bgColor: '#0d0215', starDensity: 60
    },
    {
        id: 8, name: '👻 Dimensão Sombria', scoreThreshold: 30000,
        sky: ['#000000', '#0a0010'],
        platform: { top: '#111122', glow: '#4444aa', edge: '#6666dd' },
        baseSpeed: 11, minGap: 230, maxGap: 510, minW: 100, maxW: 320,
        bgColor: '#000005', starDensity: 30
    },
    {
        id: 9, name: '🌈 Fim do Arco-Íris', scoreThreshold: 40000,
        sky: ['#000020', '#100020'],
        platform: { top: '#4400aa', glow: '#ff00ff', edge: '#ffff00' },
        baseSpeed: 12, minGap: 240, maxGap: 530, minW: 90, maxW: 300,
        bgColor: '#05000f', starDensity: 100
    },
    {
        id: 10, name: '🍄 Floresta Encantada', scoreThreshold: 52000,
        sky: ['#002200', '#001100'],
        platform: { top: '#22aa22', glow: '#55ff55', edge: '#aaffaa' },
        baseSpeed: 12.5, minGap: 250, maxGap: 540, minW: 85, maxW: 280, bgColor: '#000500', starDensity: 110
    },
    {
        id: 11, name: '🌊 Abismo Oceânico', scoreThreshold: 66000,
        sky: ['#001133', '#00001a'],
        platform: { top: '#0044bb', glow: '#0088ff', edge: '#aaddff' },
        baseSpeed: 13.0, minGap: 255, maxGap: 550, minW: 80, maxW: 260, bgColor: '#00020a', starDensity: 90
    },
    {
        id: 12, name: '⚙️ Ruínas Mecânicas', scoreThreshold: 82000,
        sky: ['#221100', '#110500'],
        platform: { top: '#884400', glow: '#ff8800', edge: '#ffcc88' },
        baseSpeed: 13.5, minGap: 260, maxGap: 560, minW: 80, maxW: 240, bgColor: '#050200', starDensity: 70
    },
    {
        id: 13, name: '🏜️ Deserto das Ilusões', scoreThreshold: 100000,
        sky: ['#332200', '#1a1100'],
        platform: { top: '#dd8800', glow: '#ffaa00', edge: '#ffeeaa' },
        baseSpeed: 14.0, minGap: 265, maxGap: 570, minW: 75, maxW: 220, bgColor: '#0a0500', starDensity: 50
    },
    {
        id: 14, name: '🧬 Matriz de Dados', scoreThreshold: 120000,
        sky: ['#002211', '#001105'],
        platform: { top: '#008844', glow: '#00ff88', edge: '#88ffaa' },
        baseSpeed: 14.5, minGap: 270, maxGap: 580, minW: 75, maxW: 200, bgColor: '#000502', starDensity: 120
    },
    {
        id: 15, name: '🌇 Metrópole Celeste', scoreThreshold: 142000,
        sky: ['#220022', '#110011'],
        platform: { top: '#aa00aa', glow: '#ff00ff', edge: '#ff88ff' },
        baseSpeed: 15.0, minGap: 275, maxGap: 590, minW: 70, maxW: 190, bgColor: '#050005', starDensity: 100
    },
    {
        id: 16, name: '🌋 Cratera Vulcânica', scoreThreshold: 166000,
        sky: ['#330000', '#1a0000'],
        platform: { top: '#cc0000', glow: '#ff0000', edge: '#ffaaaa' },
        baseSpeed: 15.3, minGap: 280, maxGap: 600, minW: 65, maxW: 180, bgColor: '#0a0000', starDensity: 60
    },
    {
        id: 17, name: '🔮 Reino Místico', scoreThreshold: 192000,
        sky: ['#110033', '#05001a'],
        platform: { top: '#6600cc', glow: '#aa00ff', edge: '#ddaaff' },
        baseSpeed: 15.6, minGap: 285, maxGap: 610, minW: 65, maxW: 170, bgColor: '#02000a', starDensity: 90
    },
    {
        id: 18, name: '☀️ Forja Solar', scoreThreshold: 220000,
        sky: ['#441100', '#220500'],
        platform: { top: '#ff4400', glow: '#ff8800', edge: '#ffffaa' },
        baseSpeed: 16.0, minGap: 290, maxGap: 620, minW: 60, maxW: 160, bgColor: '#0a0200', starDensity: 40
    },
    {
        id: 19, name: '🌌 Fronteira Galáctica', scoreThreshold: 250000,
        sky: ['#000022', '#000011'],
        platform: { top: '#2222ff', glow: '#4444ff', edge: '#aaaaff' },
        baseSpeed: 16.3, minGap: 295, maxGap: 630, minW: 60, maxW: 150, bgColor: '#000005', starDensity: 130
    },
    {
        id: 20, name: '🌀 Espiral do Tempo', scoreThreshold: 282000,
        sky: ['#112233', '#05111a'],
        platform: { top: '#4488cc', glow: '#66aaff', edge: '#aaddff' },
        baseSpeed: 16.6, minGap: 300, maxGap: 640, minW: 55, maxW: 140, bgColor: '#02050a', starDensity: 100
    },
    {
        id: 21, name: '🕸️ Covil Aracnídeo', scoreThreshold: 316000,
        sky: ['#1a1a1a', '#0d0d0d'],
        platform: { top: '#666666', glow: '#aaaaaa', edge: '#ffffff' },
        baseSpeed: 17.0, minGap: 300, maxGap: 650, minW: 55, maxW: 130, bgColor: '#050505', starDensity: 0
    },
    {
        id: 22, name: '💎 Caverna de Diamantes', scoreThreshold: 352000,
        sky: ['#003333', '#001a1a'],
        platform: { top: '#00aaaa', glow: '#00ffff', edge: '#ccffff' },
        baseSpeed: 17.3, minGap: 305, maxGap: 660, minW: 50, maxW: 120, bgColor: '#000a0a', starDensity: 150
    },
    {
        id: 23, name: '☣️ Planalto Tóxico', scoreThreshold: 390000,
        sky: ['#1a3300', '#0d1a00'],
        platform: { top: '#55aa00', glow: '#88ff00', edge: '#ccffaa' },
        baseSpeed: 17.6, minGap: 310, maxGap: 670, minW: 50, maxW: 110, bgColor: '#050a00', starDensity: 50
    },
    {
        id: 24, name: '⚡ Cidadela dos Trovões', scoreThreshold: 430000,
        sky: ['#000033', '#00001a'],
        platform: { top: '#ffd700', glow: '#ffff00', edge: '#ffffff' },
        baseSpeed: 18.0, minGap: 315, maxGap: 680, minW: 45, maxW: 100, bgColor: '#00000a', starDensity: 80
    },
    {
        id: 25, name: '🌒 Face Oculta da Lua', scoreThreshold: 472000,
        sky: ['#0a0a0a', '#000000'],
        platform: { top: '#444444', glow: '#888888', edge: '#cccccc' },
        baseSpeed: 18.2, minGap: 320, maxGap: 690, minW: 45, maxW: 90, bgColor: '#000000', starDensity: 40
    },
    {
        id: 26, name: '🔥 Singularidade Ativa', scoreThreshold: 516000,
        sky: ['#33001a', '#1a000d'],
        platform: { top: '#ff0055', glow: '#ff0088', edge: '#ff66aa' },
        baseSpeed: 18.5, minGap: 325, maxGap: 700, minW: 45, maxW: 85, bgColor: '#0a0005', starDensity: 160
    },
    {
        id: 27, name: '🌌 Nebulosa de Órion', scoreThreshold: 562000,
        sky: ['#1a0033', '#0d001a'],
        platform: { top: '#aa00ff', glow: '#dd44ff', edge: '#ffccff' },
        baseSpeed: 18.8, minGap: 330, maxGap: 710, minW: 40, maxW: 80, bgColor: '#05000a', starDensity: 180
    },
    {
        id: 28, name: '🔱 Trono dos Deuses', scoreThreshold: 610000,
        sky: ['#332200', '#1a1100'],
        platform: { top: '#ffcc00', glow: '#ffffaa', edge: '#ffffff' },
        baseSpeed: 19.3, minGap: 335, maxGap: 720, minW: 40, maxW: 75, bgColor: '#0a0500', starDensity: 200
    },
    {
        id: 29, name: '✨ O Fim de Tudo', scoreThreshold: 660000,
        sky: ['#000000', '#000000'],
        platform: { top: '#ffffff', glow: '#ffffff', edge: '#ffffff' },
        baseSpeed: 20.0, minGap: 340, maxGap: 730, minW: 40, maxW: 60, bgColor: '#000000', starDensity: 250
    }
];

// Variações de plataforma por tema: chance de plataforma móvel (sobe e desce) ou quebradiça (cai ~0,6 s após pisar)
const MODS_FASE = {
    1: { movel: 0.4 },              // Ilhas Flutuantes
    2: { quebra: 0.15 },
    3: { quebra: 0.25 },            // Cavernas de Lava
    4: { movel: 0.25 },
    5: { movel: 0.4 },              // Órbita Cósmica
    6: { movel: 0.3, quebra: 0.1 },
    7: { quebra: 0.3 },
    8: { quebra: 0.4 },             // Dimensão Sombria
    9: { movel: 0.35, quebra: 0.15 },
    10: { movel: 0.4, quebra: 0.2 },
    11: { movel: 0.5 },             // Abismo Oceânico
    12: { movel: 0.3, quebra: 0.2 },// Ruínas Mecânicas
    13: { quebra: 0.3 },
    14: { movel: 0.4 },
    15: { movel: 0.3, quebra: 0.2 },
    16: { quebra: 0.35 },           // Cratera Vulcânica
    17: { movel: 0.35, quebra: 0.25 },
    18: { quebra: 0.45 },
    19: { movel: 0.5 }              // Fronteira Galáctica
};

// A fase agora avança por DISTÂNCIA percorrida (não por pontos), então estrelas raras
// e multiplicadores não pulam várias fases de uma vez. Cada fase dura um pouco mais que a anterior.
// (scoreThreshold ficou só como referência histórica e não é mais usado.)
{
    let distAcumulada = 0;
    PHASES.forEach((ph, i) => {
        // da fase 21 em diante alterna o tema: fase par só móveis, ímpar só quebradiças
        ph.mods = MODS_FASE[i] || (i >= 20 ? (i % 2 === 0 ? { movel: 0.5 } : { quebra: 0.45 }) : {});
        ph.minW = Math.max(ph.minW, MIN_LARGURA_PLATAFORMA);
        ph.maxW = Math.max(ph.maxW, ph.minW + 40);
        ph.distThreshold = distAcumulada;
        distAcumulada += 18000 + i * 2000;
    });
}

// ─────────────────────────────────────────────────────────────────────────
// GLOBAL LEADERBOARD — Firebase Realtime Database
// Follow the setup guide to configure your Firebase URL.
// ─────────────────────────────────────────────────────────────────────────

// ⚙️  CONFIGURE AQUI após criar seu projeto Firebase:
const FIREBASE_URL = 'https://unicornparkour-8f6a2-default-rtdb.firebaseio.com/';

// Detecta modo admin via URL (?admin=1)
const _urlParams = new URLSearchParams(window.location.search);
const isAdminMode = _urlParams.has('admin');

let leaderboard = [];
let _firebaseAvailable = (FIREBASE_URL && FIREBASE_URL !== 'COLE_SUA_URL_AQUI');

// Endereço do placar no Firebase (sem barra dupla)
const URL_PLACAR = FIREBASE_URL.replace(/\/+$/, '') + '/leaderboard.json';

// Converte a resposta do Firebase ({id: recorde, ...}) no top 10 ordenado, ignorando entradas inválidas
function topDezDe(data) {
    if (!data || typeof data !== 'object' || data.error) return [];
    return Object.values(data)
        .filter(e => e && typeof e.score === 'number' && e.name)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}

// fetch com tempo limite: rede travada não prende a tela
function fetchComPrazo(url, opcoes = {}, ms = 8000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opcoes, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

let placarCarregado = false;   // só decide "entrou no Top 10?" depois de conhecer o placar

async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (listEl) listEl.innerHTML = '<p style="text-align:center;color:#aaa;">⏳ Carregando...</p>';

    if (_firebaseAvailable) {
        try {
            // Baixa só o top 10 (precisa do ".indexOn": "score" das regras em database.rules.json).
            // Se as regras ainda não foram publicadas, o Firebase recusa e baixamos a lista inteira.
            let res = await fetchComPrazo(`${URL_PLACAR}?orderBy=${encodeURIComponent('"score"')}&limitToLast=10`);
            if (!res.ok) res = await fetchComPrazo(URL_PLACAR);
            leaderboard = topDezDe(await res.json());
            placarCarregado = true;
            return leaderboard;
        } catch (err) {
            console.warn('Firebase indisponível, usando localStorage:', err);
            _firebaseAvailable = false;
        }
    }
    // Fallback local
    leaderboard = topDezDe(lerJSON('unicornLeaderboard', [], Array.isArray));
    placarCarregado = true;
    return leaderboard;
}

// Salva um recorde. As regras do Firebase só permitem CRIAR recordes válidos (nunca editar nem apagar),
// por isso o jogo não tenta mais "podar" a lista nem zerar o placar.
async function addScoreOnline(entry) {
    if (_firebaseAvailable) {
        try {
            const res = await fetchComPrazo(URL_PLACAR, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...entry, ts: Date.now() })
            });
            if (res.ok) {
                await loadLeaderboard();
                return;
            }
            console.warn('Firebase recusou o recorde:', res.status);
            showToast('Não foi possível salvar no placar global agora.');
        } catch (err) {
            console.warn('Erro ao salvar no Firebase:', err);
        }
    }
    // Fallback local: só a lista LOCAL (não mistura com o placar global que estava na memória)
    const local = topDezDe(lerJSON('unicornLeaderboard', [], Array.isArray));
    local.push(entry);
    leaderboard = topDezDe(local);
    localStorage.setItem('unicornLeaderboard', JSON.stringify(leaderboard));
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    if (leaderboard.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#aaa;">Nenhum recorde ainda! Seja o primeiro! 🏆</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    // Monta as linhas com textContent (nunca innerHTML): nomes vindos do placar global não executam código
    const span = (cls, txt) => { const s = document.createElement('span'); s.className = cls; s.textContent = txt; return s; };
    leaderboard.forEach((entry, index) => {
        let div = document.createElement('div');
        div.className = 'lb-row';
        let badge = medals[index] || `#${index + 1}`;
        const nome = span('lb-name', String(entry.name).slice(0, 20));
        if (entry.charName) {
            const c = span('lb-char', ` (${String(entry.charName).slice(0, 20)} — Fase ${parseInt(entry.phase) || 1})`);
            c.style.cssText = 'font-size:0.85em;margin-left:5px;';   // cor vem do style.css (.lb-char)
            nome.appendChild(c);
        }
        div.append(span('lb-rank', badge), nome, span('lb-score', `${Number(entry.score).toLocaleString()} pts`));
        list.appendChild(div);
    });

    if (_firebaseAvailable) {
        const note = document.createElement('p');
        note.style.cssText = 'text-align:center;color:#B9A4FF;font-size:0.75rem;margin-top:12px;';
        note.textContent = '🌐 Placar global — compartilhado entre todos os jogadores';
        list.appendChild(note);
    }
}

async function checkHighScore(finalPt) {
    if (finalPt <= 0) return;
    if (!placarCarregado) await loadLeaderboard();   // sem conhecer o placar, "qualquer ponto" parecia Top 10
    if (state !== 'gameover') return;                // o jogador já saiu da tela enquanto carregava
    const threshold = leaderboard.length < 10 ? 0 : (leaderboard[leaderboard.length - 1]?.score ?? 0);
    if (finalPt > threshold) {
        nameInputContainer.classList.remove('hidden');
        btnRestart.classList.add('hidden');
        btnMenuGo.classList.add('hidden');
        playerNameInput.focus();
    }
}

btnSaveScore.onclick = async () => {
    let name = playerNameInput.value.trim() || 'Anônimo';
    const entry = { name, score: Math.floor(score), charName: player.char.name, phase: currentPhase + 1 };

    btnSaveScore.disabled = true;
    btnSaveScore.textContent = '💾 Salvando...';

    try {
        await addScoreOnline(entry);
    } finally {   // aconteça o que acontecer, os botões voltam
        btnSaveScore.disabled = false;
        btnSaveScore.textContent = 'Salvar';
        nameInputContainer.classList.add('hidden');
        btnRestart.classList.remove('hidden');
        btnMenuGo.classList.remove('hidden');
    }
};
loadLeaderboard();   // já ao abrir a página (sem esperar), para o game over saber quem entra no Top 10

btnLeaderboard.onclick = async () => {
    mainMenu.classList.add('hidden');
    leaderboardMenu.classList.remove('hidden');
    await loadLeaderboard();
    renderLeaderboard();

    // Mostrar botão de admin apenas com ?admin=1 na URL
    btnClearLeaderboard.style.display = isAdminMode ? 'inline-flex' : 'none';
};

btnLeadBack.onclick = () => {
    leaderboardMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    iniciarLoopMenu();
};

// Zerar o placar global não é mais possível pelo jogo: as regras do Firebase (database.rules.json)
// bloqueiam apagar, justamente para ninguém conseguir apagar pela URL. O dono zera pelo console.
btnClearLeaderboard.onclick = () => {
    alert('Para zerar o placar global: Firebase Console → Realtime Database → Dados → '
        + 'passe o mouse em "leaderboard" e clique no X (excluir).');
};

btnMute.onclick = () => {
    isMuted = !isMuted;
    localStorage.setItem('uniparkourMuted', isMuted);
    btnMute.innerText = isMuted ? '🔇' : '🔊';
    if (isMuted && musicGain) musicGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    else if (!isMuted && musicGain) musicGain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.1);
};
btnMute.innerText = isMuted ? '🔇' : '🔊';

function playSound(type, forca = 1) {
    if (isMuted || !audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    let now = audioCtx.currentTime;
    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'jump2') {
        // pulo no ar: mais agudo e com um "brilhinho" no fim
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1050, now + 0.12);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.start(now); osc.stop(now + 0.14);
    } else if (type === 'collect') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'powerup') {
        // power-up: arpejo mágico subindo (dó-mi-sol-dó)
        osc.type = 'triangle';
        [523, 659, 784, 1047].forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.055));
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'land') {
        // pouso: "tum" curto e grave, mais alto quanto mais forte a queda
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.03 + 0.09 * forca, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.09);
        osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'slam') {
        // slam: impacto mais grave e longo que o de quebrar obstáculo
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'dash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(500, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
}

let musicInterval = null;

function startMusic() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (musicInterval) return; // Já está rodando o sequencer!

    if (!musicGain) {
        musicGain = audioCtx.createGain();
        musicGain.connect(audioCtx.destination);
    }
    musicGain.gain.value = isMuted ? 0 : 0.8;

    const n = { B1: 61.7, C2: 65.4, D2: 73.4, E2: 82.4, B2: 123.5, C3: 130.8, D3: 146.8, E3: 164.8, G3: 196.0, A3: 220.0, B3: 246.9, C4: 261.6, D4: 293.7, E4: 329.6, G4: 392.0, A4: 440.0, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3 };

    const leadSeq = [
        n.E4, null, n.G4, n.E4, n.D4, null, n.A4, n.D4, n.C4, null, n.G4, n.C4, n.B3, null, n.D4, n.B3,
        n.E4, n.D4, n.G4, n.E4, n.A4, n.G4, n.B4, n.A4, n.C5, n.B4, n.A4, n.G4, n.E4, n.D4, n.C4, n.B3
    ];

    const bassSeq = [
        n.E2, n.E2, n.E3, n.E2, n.D2, n.D2, n.D3, n.D2, n.C2, n.C2, n.C3, n.C2, n.B1, n.B1, n.B2, n.B1,
        n.E2, n.E2, n.E3, n.E2, n.D2, n.D2, n.D3, n.D2, n.C2, n.C2, n.C3, n.C2, n.B1, n.B1, n.B2, n.B1
    ];

    const arpSeq = [
        n.E4, n.G4, n.B4, n.E5, n.D4, n.A4, n.D5, n.A4, n.C4, n.G4, n.C5, n.G4, n.B3, n.D4, n.G4, n.B4,
        n.E4, n.B4, n.G4, n.E5, n.D4, n.A4, n.D5, n.A4, n.C4, n.G4, n.E5, n.G4, n.B3, n.D4, n.G4, n.B4
    ];

    let step = 0;

    musicInterval = setInterval(() => {
        let now = audioCtx.currentTime;
        let speedMult = 1 + (currentPhase * 0.04); // Muda o tom (Pitch) conforme as Fases

        // Canal Lead (Square wave estilo chiptune melody)
        let leadF = leadSeq[step % 32];
        if (leadF) {
            let osc = audioCtx.createOscillator(); let g = audioCtx.createGain();
            osc.type = 'square'; osc.frequency.value = leadF * speedMult;
            osc.connect(g); g.connect(musicGain);
            g.gain.setValueAtTime(0.04, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Enveloper staccato
            osc.start(now); osc.stop(now + 0.15);
        }

        // Canal Bass (Triangle wave profunda)
        let bassF = bassSeq[step % 32];
        if (bassF) {
            let oscB = audioCtx.createOscillator(); let gB = audioCtx.createGain();
            oscB.type = 'triangle'; oscB.frequency.value = bassF * speedMult;
            oscB.connect(gB); gB.connect(musicGain);
            gB.gain.setValueAtTime(0.08, now);
            gB.gain.linearRampToValueAtTime(0.01, now + 0.2);
            oscB.start(now); oscB.stop(now + 0.2);
        }

        // Canal Arpeggio (Sawtooth cintilante e rápida)
        let arpF = arpSeq[step % 32];
        if (arpF && (state === 'playing' || state === 'menu')) {
            let oscA = audioCtx.createOscillator(); let gA = audioCtx.createGain();
            oscA.type = 'sawtooth'; oscA.frequency.value = arpF * speedMult;
            oscA.connect(gA); gA.connect(musicGain);
            gA.gain.setValueAtTime(0.02, now);
            gA.gain.linearRampToValueAtTime(0.001, now + 0.1);
            oscA.start(now); oscA.stop(now + 0.1);
        }

        step++;
    }, 125); // Velocidade (125ms = bpm intenso)
}

function updateGlobalStarsDisplay() {
    globalStarsDisplay.innerText = globalStars.toLocaleString();
    if (shopStarsDisplay) shopStarsDisplay.innerText = globalStars.toLocaleString();
}
updateGlobalStarsDisplay();

function showToast(msg) {
    let t = document.createElement('div');
    t.className = 'toast';   // visual no style.css
    t.innerText = msg;
    toastContainer.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
    }, 3000);
}

// ── Missões do dia: 3 por dia (as mesmas o dia inteiro), baú ao completar as 3 e bônus por dias seguidos ──
// Salvo em 'uniparkourMissoesDia' e 'uniparkourSequencia' (a chave antiga 'uniparkourMission' não é mais usada).
const TIPOS_MISSAO = [
    { type: 'stars', target: 15000, reward: 2500, desc: 'Colete 15.000 em valor de estrelas' },
    { type: 'jumps', target: 150, reward: 1500, desc: 'Dê 150 pulos' },
    { type: 'score', target: 4000, reward: 2500, desc: 'Some 4.000 pontos de distância' },
    { type: 'slams', target: 10, reward: 2000, desc: 'Faça 10 slams' },
    { type: 'dashes', target: 15, reward: 1500, desc: 'Use o dash 15 vezes' },
    { type: 'powerups', target: 8, reward: 2000, desc: 'Pegue 8 power-ups' },
    { type: 'fases', target: 5, reward: 4000, desc: 'Avance 5 fases' },
    { type: 'obstaculos', target: 10, reward: 3000, desc: 'Destrua 10 obstáculos' }
];
const PREMIO_BAU_DIARIO = 5000;       // completar as 3 missões do dia
const BONUS_SEQUENCIA = 0.1;          // +10% nos prêmios por dia seguido jogado (até 2×)

const hojeTexto = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
function multSequencia() { return Math.min(2, 1 + BONUS_SEQUENCIA * Math.max(0, sequencia.dias - 1)); }

let missoesDia = lerJSON('uniparkourMissoesDia', null, ehObjeto);
let sequencia = lerJSON('uniparkourSequencia', { ultimoDia: '', dias: 0 }, ehObjeto);

function salvarMissao() {
    localStorage.setItem('uniparkourMissoesDia', JSON.stringify(missoesDia));
    localStorage.setItem('uniparkourSequencia', JSON.stringify(sequencia));
}

// Sorteia as 3 missões do dia (semente = data: todo mundo tem as mesmas no mesmo dia) e conta a sequência
function prepararMissoesDoDia() {
    const hoje = hojeTexto();
    if (missoesDia && missoesDia.dia === hoje && Array.isArray(missoesDia.missoes)) return;
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    sequencia.dias = sequencia.ultimoDia === hojeTexto(ontem) ? sequencia.dias + 1 : 1;
    sequencia.ultimoDia = hoje;
    const rnd = aleatorioSemente(hoje.split('-').reduce((s, n) => s * 37 + Number(n), 7));
    const tipos = TIPOS_MISSAO.slice();
    const escolhidas = [];
    while (escolhidas.length < 3) escolhidas.push(tipos.splice(Math.floor(rnd() * tipos.length), 1)[0]);
    missoesDia = { dia: hoje, bau: false, missoes: escolhidas.map(m => ({ ...m, current: 0, feita: false })) };
    salvarMissao();
}

function updateMissionUI() {
    prepararMissoesDoDia();
    const painel = document.getElementById('missions-lista');
    if (!painel) return;
    const mult = multSequencia();
    painel.textContent = '';
    for (const m of missoesDia.missoes) {
        const linha = document.createElement('div');
        linha.className = 'missao-linha' + (m.feita ? ' feita' : '');
        const desc = document.createElement('div'); desc.className = 'missao-desc';
        desc.textContent = (m.feita ? '✅ ' : '') + m.desc;
        const trilho = document.createElement('div'); trilho.className = 'missao-trilho';
        const barra = document.createElement('div'); barra.className = 'missao-barra';
        barra.style.width = Math.min(100, m.current / m.target * 100) + '%';
        trilho.appendChild(barra);
        const rodape = document.createElement('div'); rodape.className = 'missao-rodape';
        const prog = document.createElement('span'); prog.textContent = `${Math.min(m.target, Math.floor(m.current)).toLocaleString()} / ${m.target.toLocaleString()}`;
        const premio = document.createElement('span'); premio.className = 'missao-premio'; premio.textContent = `🎁 +${Math.round(m.reward * mult).toLocaleString()}`;
        rodape.append(prog, premio);
        linha.append(desc, trilho, rodape);
        painel.appendChild(linha);
    }
    const feitas = missoesDia.missoes.filter(m => m.feita).length;
    document.getElementById('missions-extra').textContent =
        `${missoesDia.bau ? '🎉 Baú do dia aberto!' : `🧰 Baú: ${feitas}/3 → +${Math.round(PREMIO_BAU_DIARIO * mult).toLocaleString()}`}` +
        `  ·  🔥 ${sequencia.dias} dia${sequencia.dias > 1 ? 's' : ''} seguido${sequencia.dias > 1 ? 's' : ''} (×${mult.toFixed(1)})`;
}

function pagarEstrelas(qtd) {
    globalStars += qtd;
    localStorage.setItem('uniparkourGlobalStars', globalStars);
    updateGlobalStarsDisplay();
}

function completeMission(m) {
    m.feita = true;
    const mult = multSequencia();
    const premio = Math.round(m.reward * mult);
    showToast(`Missão cumprida: +${premio.toLocaleString()} 🌟`);
    playSound('buy');
    pagarEstrelas(premio);
    if (!missoesDia.bau && missoesDia.missoes.every(x => x.feita)) {
        missoesDia.bau = true;
        const bau = Math.round(PREMIO_BAU_DIARIO * mult);
        setTimeout(() => showToast(`🧰 Baú do dia: +${bau.toLocaleString()} 🌟`), 900);
        pagarEstrelas(bau);
    }
    salvarMissao();
}

updateMissionUI();

function checkMission(type, amount) {
    if (!missoesDia) return;
    // Progresso fica em memória e é salvo no fim da partida (evita gravar no localStorage a cada frame)
    for (const m of missoesDia.missoes) {
        if (m.feita || m.type !== type) continue;
        m.current += amount;
        if (m.current >= m.target) completeMission(m);
    }
}

// 3D Shader Vector Characters Characters Data
const characters = [
    { id: 0, cost: 0, name: "Padrão", desc: "Equilíbrio perfeito.", spawnRateMult: 1.5, body: "#ffffff", mane: ["#ff3399", "#33ccff"], particle: "#ffffff" },
    { id: 1, cost: 0, name: "Fogo", desc: "Pula 2 vezes mais alto.", jumpPowerMult: 1.414, body: "#ff5500", mane: ["#ffaa00", "#ffff00"], particle: "#ff5500" },
    { id: 2, cost: 0, name: "Gelo", desc: "Cai mais lento (flutua).", gravityMult: 0.4, body: "#d0ffff", mane: ["#ffffff", "#87cefa"], particle: "#00ffff" },
    { id: 3, cost: 0, name: "Sombra", desc: "Agilidade tripla (pulo).", maxJumps: 3, body: "#3a2b4a", mane: ["#8a2be2", "#4b0082"], particle: "#8a2be2" },
    { id: 4, cost: 0, name: "Dourado", desc: "Efeito imantado inato.", magnetic: 90, body: "#ffd700", mane: ["#ffffff", "#ff8c00"], particle: "#ffd700" },
    { id: 5, cost: 0, name: "Esmeralda", desc: "Pula 3 vezes mais alto.", jumpPowerMult: 1.732, gravityMult: 1.0, body: "#a0ffc0", mane: ["#2e8b57", "#00ffaa"], particle: "#00fa9a" },
    { id: 6, cost: 0, name: "Cósmico", desc: "Quad-jump longo leve.", maxJumps: 4, jumpPowerMult: 0.85, body: "#191970", mane: ["#ffffff", "#dda0dd"], particle: "#dda0dd" },
    { id: 7, cost: 0, name: "Neon", desc: "Ganha +20% de pontos.", pointsMult: 1.2, body: "#ff00ff", mane: ["#00ffff", "#ffffff"], particle: "#ff00ff" },
    { id: 8, cost: 0, name: "Fantasma", desc: "Duração estendida magias", powerupDurMult: 1.5, body: "rgba(232,224,255,0.72)", mane: ["rgba(255,255,255,0.6)", "rgba(170,150,240,0.6)"], particle: "rgba(220,210,255,0.5)" },
    { id: 9, cost: 0, name: "Ciborgue", desc: "Resistência estrutural", startShield: true, body: "#b0b0b0", mane: ["#ff0000", "#555555"], particle: "#ff0000" },
    { id: 10, cost: 0, name: "Aqua", desc: "Desliza e flutua 20%.", gravityMult: 0.8, body: "#44aaff", mane: ["#0055ff", "#002288"], particle: "#00aaff" },
    { id: 11, cost: 0, name: "Guerreiro", desc: "Mestre em Combate.", body: "#C98A4B", mane: ["#7A3A14", "#4A2208"], particle: "#FFB347" },
    { id: 12, cost: 0, name: "Anjo", desc: "Pulo suave.", jumpPowerMult: 1.2, body: "#ffffee", mane: ["#ffffff", "#ffddaa"], particle: "#ffffff" },
    { id: 13, cost: 0, name: "Oni", desc: "Score 1.5x, cai rápido.", pointsMult: 1.5, gravityMult: 1.5, body: "#220000", mane: ["#ff0000", "#aa0000"], particle: "#ff0000" },
    { id: 14, cost: 0, name: "Tóxico", desc: "Ímã natural extremo.", magnetic: 150, body: "#9A5BD8", mane: ["#B7FF3B", "#5FBF00"], particle: "#B7FF3B" },
    { id: 15, cost: 0, name: "Ninja", desc: "Pulo x5, pulos fracos.", maxJumps: 5, jumpPowerMult: 0.7, body: "#111111", mane: ["#333333", "#555555"], particle: "#555555" },
    { id: 16, cost: 0, name: "Robô", desc: "Pulo Foguete x2.", jumpPowerMult: 2.0, pointsMult: 0.8, body: "#88aaa0", mane: ["#555555", "#00ffff"], particle: "#00ffff" },
    { id: 17, cost: 0, name: "Cristal", desc: "Estrelas raras x2.5.", spawnRateMult: 2.5, body: "#9EEBDD", mane: ["#FFFFFF", "#2FC7B5"], particle: "#9EEBDD" },
    { id: 18, cost: 0, name: "Bardo", desc: "Powerups x2 tempo.", powerupDurMult: 2.0, body: "#ff55aa", mane: ["#ff0055", "#ffaaaa"], particle: "#ff55aa" },
    { id: 19, cost: 0, name: "Rei", desc: "Maior chance e pontos.", pointsMult: 1.5, spawnRateMult: 1.5, maxJumps: 3, body: "#ffdd00", mane: ["#ffffff", "#ff8800"], particle: "#ffdd00" },
    { id: 20, cost: 0, name: "Dragão", desc: "Voa mais alto e veloz.", jumpPowerMult: 1.6, gravityMult: 0.7, maxJumps: 3, body: "#cc2200", mane: ["#ff6600", "#ffdd00"], particle: "#ff4400" },
    { id: 21, cost: 0, name: "Gatinho", desc: "Pula 4x e cai suave.", maxJumps: 4, gravityMult: 0.6, body: "#ffaadd", mane: ["#ff66bb", "#ffffff"], particle: "#ff99cc" },
    { id: 22, cost: 0, name: "Coelho", desc: "Pulo ultra-alto triplo.", jumpPowerMult: 1.8, maxJumps: 3, body: "#ffffff", mane: ["#ffccee", "#aaddff"], particle: "#ffffff" }
];
// Preço dos personagens: os 3 primeiros são livres, depois sobe aos poucos
characters.forEach(c => { c.cost = c.id < 3 ? 0 : c.id * CUSTO_POR_PERSONAGEM; });
let selectedChar = parseInt(localStorage.getItem('uniparkourChar')) || 0;
if (!unlockedChars.includes(selectedChar)) selectedChar = 0;

function selecionarPersonagem(char) {
    if (unlockedChars.includes(char.id)) {
        selectedChar = char.id;
        localStorage.setItem('uniparkourChar', selectedChar);
        renderCharMenu();
        return;
    }
    if (globalStars < char.cost) { alert("Estrelas insuficientes!"); return; }
    if (!confirm(`Desbloquear ${char.name} por ${char.cost} estrelas?`)) return;
    globalStars -= char.cost;
    unlockedChars.push(char.id);
    selectedChar = char.id;
    localStorage.setItem('uniparkourGlobalStars', globalStars);
    localStorage.setItem('uniparkourChars', JSON.stringify(unlockedChars));
    localStorage.setItem('uniparkourChar', selectedChar);
    updateGlobalStarsDisplay();
    renderCharMenu();
    playSound('buy');
}

const upgrades = [
    { id: 'jump', name: 'Salto Duplo+', desc: '+1 Pulo extra garantido', cost: 20000, maxLevel: 2 },
    { id: 'score', name: 'Multiplicador+', desc: 'Bônus de Score passivo', cost: 15000, maxLevel: 5 },
    { id: 'shield', name: 'Escudo Inicial', desc: 'Sempre inicie com escudo', cost: 50000, maxLevel: 1 },
    { id: 'magnet', name: 'Rádio-Ímã+', desc: '+20% alcance do ímã', cost: 10000, maxLevel: 5 },
    { id: 'dash_cd', name: 'Dash Recarga Rápida', desc: '-15% CD do Dash', cost: 18000, maxLevel: 3 },
    { id: 'dash_pwr', name: 'Super Dash', desc: 'Aumenta a velocidade do dash', cost: 22000, maxLevel: 3 },
    { id: 'slam_score', name: 'Impacto Lucrativo', desc: '+Pontos ao realizar Slam', cost: 12000, maxLevel: 5 },
    { id: 'pu_time', name: 'Maestria Arcana', desc: 'Magias duram +10%', cost: 25000, maxLevel: 4 },
    { id: 'start_stars', name: 'Gorjeta Inicial', desc: '+500 🌟 para a loja por nível em cada partida (a partir da fase 2)', cost: 10000, maxLevel: 5 },
    { id: 'jump_pwr', name: 'Músculos Tensos', desc: 'Pula levemente mais alto', cost: 20000, maxLevel: 3 },
    { id: 'lucky_mult', name: 'Trevo de Ouro', desc: 'Bônus lucky aumenta', cost: 30000, maxLevel: 3 },
    { id: 'meteor_pts', name: 'Cratera de Pontos', desc: 'Slam do meteoro mais valioso', cost: 28000, maxLevel: 3 },
    { id: 'rocket_spd', name: 'Foguete V8', desc: 'Foguete viaja ainda mais longe', cost: 40000, maxLevel: 2 },
    { id: 'free_revive', name: 'Segunda Chance', desc: 'Uma revivida passiva gratuita', cost: 80000, maxLevel: 1 },
    { id: 'gravity_f', name: 'Ossos Ocos', desc: 'Reduz a gravidade', cost: 24000, maxLevel: 3 },
    { id: 'slowmo_score', name: 'Tempo é Dinheiro', desc: 'Ganha mais pontos no slowmo', cost: 16000, maxLevel: 3 },
    { id: 'coin_val', name: 'Pedras Preciosas', desc: '+25% no valor de cada estrela (vai para a loja)', cost: 35000, maxLevel: 4 },
    { id: 'star_spawn', name: 'Chuva Estelar', desc: 'Aumenta chance de estrelas', cost: 45000, maxLevel: 3 },
    { id: 'phase_chill', name: 'Pés no Chão', desc: 'Atrapalha a aceleração natural', cost: 60000, maxLevel: 2 },
    { id: 'magnet_spd', name: 'Tração Nuclear', desc: 'Magnetismo mais forte ainda', cost: 20000, maxLevel: 2 }
];

const skins = [
    { id: 'default', name: 'Nenhuma', desc: 'Aura padrão', cost: 0, type: 'none' },
    { id: 'golden', name: 'Aura Dourada', desc: 'Rastro brilhante ouro', cost: 10000, type: 'golden', colors: ['#ffd700', '#ff8c00'] },
    { id: 'shadow', name: 'Aura Sombria', desc: 'Rastro negro/roxo', cost: 20000, type: 'shadow', colors: ['#4b0082', '#191970'] },
    { id: 'rainbow', name: 'Aura Arco-Íris', desc: 'Cintilante permanente', cost: 35000, type: 'rainbow', colors: ['#ff0000', '#00ff00'] },
    { id: 'fire', name: 'Chamas Vivas', desc: 'Aura ardente quente', cost: 15000, type: 'fire', colors: ['#ff3300', '#ffaa00'] },
    { id: 'ice', name: 'Nevasca', desc: 'Tempestade gélida passiva', cost: 15000, type: 'ice', colors: ['#aaddff', '#ffffff'] },
    { id: 'electric', name: 'Trovão', desc: 'Faíscas chocantes ativas', cost: 18000, type: 'electric', colors: ['#ffff00', '#ffffff'] },
    { id: 'nature', name: 'Folhas e Flores', desc: 'Aura da floresta profunda', cost: 12000, type: 'nature', colors: ['#00ff00', '#00aa00'] },
    { id: 'void', name: 'O Vazio', desc: 'Escuridão devoradora', cost: 40000, type: 'void', colors: ['#111111', '#000000'] },
    { id: 'galactic', name: 'Nebulosa', desc: 'Galáxia no seu ser', cost: 50000, type: 'galactic', colors: ['#cc00ff', '#0000ff'] },
    { id: 'cyber', name: 'Cyberpunk', desc: 'Matrix verde fluente', cost: 32000, type: 'cyber', colors: ['#00ff00', '#003300'] },
    { id: 'blood', name: 'Sanguinária', desc: 'Aura sinistra vermelha', cost: 25000, type: 'blood', colors: ['#880000', '#440000'] },
    { id: 'candy', name: 'Doce Sonho', desc: 'Açúcar e algodão doce visual', cost: 14000, type: 'candy', colors: ['#ffbbf1', '#ffffff'] },
    { id: 'glitch', name: 'Corrompido', desc: 'Aura bugada em código', cost: 45000, type: 'glitch', colors: ['#00ffff', '#ff00ff'] },
    { id: 'holy', name: 'Luz Sagrada', desc: 'Iluminação pura dos céus', cost: 38000, type: 'holy', colors: ['#ffffff', '#ffffee'] },
    { id: 'cursed', name: 'Amaldiçoado', desc: 'Chamas verdes', cost: 22000, type: 'cursed', colors: ['#00ff88', '#005522'] },
    { id: 'diamond', name: 'Brilhante', desc: 'Reflexos perfeitamente puros', cost: 55000, type: 'diamond', colors: ['#ccffff', '#ffffff'] },
    { id: 'bubble', name: 'Espuma do Mar', desc: 'Efeito molhado bolhas', cost: 16000, type: 'bubble', colors: ['#00aaff', '#aaddff'] },
    { id: 'sand', name: 'Areia do Deserto', desc: 'Dunas envolvendo você', cost: 19000, type: 'sand', colors: ['#ddaadd', '#aa7744'] },
    { id: 'smoke', name: 'Fumaça Densa', desc: 'Cinzas te seguindo', cost: 21000, type: 'smoke', colors: ['#555555', '#222222'] },
    { id: 'plasma', name: 'Plasma Energizado', desc: 'Supercondutor vibracional', cost: 60000, type: 'plasma', colors: ['#ff0055', '#5500ff'] }
];

function buyUpgrade(id) {
    let u = upgrades.find(x => x.id === id);
    let curLvl = unlockedUpgrades[id];
    if (curLvl >= u.maxLevel) return;

    let price = u.cost * (curLvl + 1);
    if (globalStars >= price) {
        if (confirm(`Comprar ${u.name} (Nível ${curLvl + 1}) por ${price} estrelas?`)) {
            globalStars -= price;
            unlockedUpgrades[id]++;
            localStorage.setItem('uniparkourGlobalStars', globalStars);
            localStorage.setItem('uniparkourUpgrades', JSON.stringify(unlockedUpgrades));
            updateGlobalStarsDisplay();
            renderCharMenu();
            playSound('buy');
        }
    } else { alert("Estrelas insuficientes!"); }
}

// ─────────────────────────────────────────────────────────────────────────
// VISUAL DO PERSONAGEM (loja): auras, pelagens, rastros, chifres e chapéus
// ─────────────────────────────────────────────────────────────────────────

// Efeito de cada aura: forma das partículas, cores e movimento
//  sobe = flutua para cima e fica para trás · cai = desce do alto · flutua = espalha em volta · faisca = estala rápido
const AURA_EFEITO = {
    golden: { forma: 'brilho', cores: ['#FFD54A', '#FFB300'], mov: 'sobe', brilho: '#FFD54A' },
    shadow: { forma: 'fumaca', cores: ['#4B2A7A', '#2A1A4A'], mov: 'sobe' },
    rainbow: { forma: 'brilho', cores: ['#FF5F7E', '#FFB347', '#FFE66D', '#7DDE92', '#6FC3FF', '#B387FF'], mov: 'flutua', brilho: '#FF9CCB' },
    fire: { forma: 'chama', cores: ['#FF7A1A', '#FF4500'], mov: 'sobe', brilho: '#FF7A1A' },
    ice: { forma: 'floco', cores: ['#CFF4FF', '#FFFFFF'], mov: 'cai', brilho: '#BFEFFF' },
    electric: { forma: 'faisca', cores: ['#FFF176', '#9BE7FF'], mov: 'faisca', brilho: '#FFF176' },
    nature: { forma: 'folha', cores: ['#4CD07D', '#9BE36B', '#FF9CCB'], mov: 'cai' },
    void: { forma: 'fumaca', cores: ['#120A20', '#2A1A3A'], mov: 'sobe' },
    galactic: { forma: 'estrela', cores: ['#C7A8F0', '#9BE7FF', '#FFE08A'], mov: 'flutua', brilho: '#B387FF' },
    cyber: { forma: 'digito', cores: ['#39FF88', '#00C853'], mov: 'cai', brilho: '#39FF88' },
    blood: { forma: 'gota', cores: ['#C62828', '#8E0000'], mov: 'cai' },
    candy: { forma: 'confete', cores: ['#FF9CCB', '#9BE7FF', '#FFE08A', '#C7A8F0'], mov: 'flutua', brilho: '#FF9CCB' },
    glitch: { forma: 'pixel', cores: ['#00FFFF', '#FF00FF'], mov: 'faisca', brilho: '#FF00FF' },
    holy: { forma: 'brilho', cores: ['#FFFFFF', '#FFF3C4'], mov: 'sobe', brilho: '#FFF3C4' },
    cursed: { forma: 'chama', cores: ['#39FF88', '#00A86B'], mov: 'sobe', brilho: '#39FF88' },
    diamond: { forma: 'brilho', cores: ['#CFF4FF', '#FFFFFF'], mov: 'flutua', brilho: '#CFF4FF' },
    bubble: { forma: 'bolha', cores: ['#9BE7FF', '#CFF4FF'], mov: 'sobe' },
    sand: { forma: 'circulo', cores: ['#E6C88A', '#C9A56B'], mov: 'flutua' },
    smoke: { forma: 'fumaca', cores: ['#8A8A9A', '#5A5A6A'], mov: 'sobe' },
    plasma: { forma: 'faisca', cores: ['#FF4FD8', '#7C4DFF'], mov: 'faisca', brilho: '#B387FF' }
};

// Cada item: id único (salvo no localStorage), valor (o que o desenho usa), nome, descrição, preço
const PELAGENS = [
    { id: 'pel_nenhuma', valor: 'nenhuma', name: 'Lisa', desc: 'Sem estampa', cost: 0 },
    { id: 'pel_bolinhas', valor: 'bolinhas', name: 'Dálmata', desc: 'Bolinhas pretas', cost: 6000 },
    { id: 'pel_coracoes', valor: 'coracoes', name: 'Coraçõezinhos', desc: 'Estampa de amor', cost: 7000 },
    { id: 'pel_listras', valor: 'listras', name: 'Zebra', desc: 'Listras onduladas', cost: 8000 },
    { id: 'pel_oncinha', valor: 'oncinha', name: 'Oncinha', desc: 'Pintas de onça', cost: 9000 },
    { id: 'pel_estrelas', valor: 'estrelas', name: 'Estrelado', desc: 'Estrelinhas douradas', cost: 10000 },
    { id: 'pel_arcoiris', valor: 'arcoiris', name: 'Arco-Íris', desc: 'Faixas coloridas', cost: 15000 },
    { id: 'pel_cromado', valor: 'cromado', name: 'Cromado', desc: 'Metal com reflexo passando', cost: 20000 },
    { id: 'pel_galaxia', valor: 'galaxia', name: 'Galáxia', desc: 'Um céu estrelado no corpo', cost: 25000 }
];
const RASTROS = [
    { id: 'ras_arcoiris', valor: 'arcoiris', name: 'Fita Arco-Íris', desc: 'Nas cores da crina', cost: 0 },
    { id: 'ras_nenhum', valor: 'nenhum', name: 'Sem Rastro', desc: 'Discreto', cost: 0 },
    { id: 'ras_coracoes', valor: 'coracoes', name: 'Corações', desc: 'Deixa amor pelo caminho', cost: 5000 },
    { id: 'ras_estrelas', valor: 'estrelas', name: 'Estrelas', desc: 'Pó de estrela dourado', cost: 6000 },
    { id: 'ras_bolhas', valor: 'bolhas', name: 'Bolhas', desc: 'Bolhas de sabão', cost: 6000 },
    { id: 'ras_petalas', valor: 'petalas', name: 'Pétalas', desc: 'Chuva de cerejeira', cost: 8000 },
    { id: 'ras_notas', valor: 'notas', name: 'Notas Musicais', desc: 'Corre no ritmo', cost: 9000 },
    { id: 'ras_chamas', valor: 'chamas', name: 'Chamas', desc: 'Pegando fogo', cost: 12000 },
    { id: 'ras_raio', valor: 'raio', name: 'Raio', desc: 'Velocidade elétrica', cost: 15000 }
];
const CHIFRES = [
    { id: 'chi_dourado', valor: 'dourado', name: 'Dourado', desc: 'O clássico', cost: 0 },
    { id: 'chi_rosa', valor: 'rosa', name: 'Pérola Rosa', desc: 'Delicado e brilhante', cost: 4000 },
    { id: 'chi_gelo', valor: 'gelo', name: 'Gelo', desc: 'Frio que brilha', cost: 6000 },
    { id: 'chi_cristal', valor: 'cristal', name: 'Cristal', desc: 'Transparente como vidro', cost: 8000 },
    { id: 'chi_chocolate', valor: 'chocolate', name: 'Chocolate', desc: 'Com granulado!', cost: 9000 },
    { id: 'chi_neon', valor: 'neon', name: 'Neon', desc: 'Acende no escuro', cost: 12000 },
    { id: 'chi_arcoiris', valor: 'arcoiris', name: 'Arco-Íris', desc: 'Espiral colorida', cost: 15000 },
    { id: 'chi_estelar', valor: 'estelar', name: 'Estelar', desc: 'Feito de noite', cost: 18000 }
];
const CHAPEUS = [
    { id: 'cha_nenhum', valor: 'nenhum', name: 'Nenhum', desc: 'Usa o acessório do personagem', cost: 0 },
    { id: 'cha_laco', valor: 'laco', name: 'Laçarote', desc: 'Um laço enorme', cost: 4000 },
    { id: 'cha_flores', valor: 'flores', name: 'Coroa de Flores', desc: 'Primavera o ano todo', cost: 6000 },
    { id: 'cha_festa', valor: 'festa', name: 'Chapéu de Festa', desc: 'Todo dia é aniversário', cost: 6000 },
    { id: 'cha_orelhasGato', valor: 'orelhasGato', name: 'Tiara de Gatinho', desc: 'Miau!', cost: 7000 },
    { id: 'cha_oculosCoracao', valor: 'oculosCoracao', name: 'Óculos de Coração', desc: 'Apaixonado pela corrida', cost: 8000 },
    { id: 'cha_fones', valor: 'fones', name: 'Fones de Ouvido', desc: 'Correndo com música', cost: 10000 },
    { id: 'cha_gorro', valor: 'gorro', name: 'Gorro de Natal', desc: 'Ho ho ho!', cost: 10000 },
    { id: 'cha_cartola', valor: 'cartola', name: 'Cartola', desc: 'Elegância mágica', cost: 14000 }
];
const CATEGORIAS_VISUAL = [
    { id: 'aura', nome: '✨ Auras', itens: () => skins },
    { id: 'pelagem', nome: '🎨 Pelagens', itens: () => PELAGENS },
    { id: 'rastro', nome: '🌈 Rastros', itens: () => RASTROS },
    { id: 'chifre', nome: '🦄 Chifres', itens: () => CHIFRES },
    { id: 'chapeu', nome: '🎩 Chapéus', itens: () => CHAPEUS }
];

// O que está equipado (ids). A aura continua em selectedSkin (compatível com o save antigo).
const VISUAL_PADRAO = { pelagem: 'pel_nenhuma', rastro: 'ras_arcoiris', chifre: 'chi_dourado', chapeu: 'cha_nenhum' };
let visualEquipado = { ...VISUAL_PADRAO, ...lerJSON('uniparkourVisual', {}, ehObjeto) };
let abaVisual = 'pelagem';

const itemPorId = (cat, id) => CATEGORIAS_VISUAL.find(c => c.id === cat).itens().find(i => i.id === id);
const possuiVisual = (item) => item.cost === 0 || unlockedSkins.includes(item.id);
const equipadoNaCategoria = (cat) => cat === 'aura' ? selectedSkin : visualEquipado[cat];

// Converte os ids equipados nos valores que o desenho do personagem usa (p.visual)
function visualParaDesenho(equip = visualEquipado) {
    const v = {};
    for (const cat of ['pelagem', 'rastro', 'chifre', 'chapeu']) {
        const item = itemPorId(cat, equip[cat]) || itemPorId(cat, VISUAL_PADRAO[cat]);
        v[cat] = item.valor;
    }
    return v;
}

function escolherVisual(cat, item) {
    const equipar = () => {
        if (cat === 'aura') { selectedSkin = item.id; localStorage.setItem('uniparkourActiveSkin', selectedSkin); }
        else { visualEquipado[cat] = item.id; localStorage.setItem('uniparkourVisual', JSON.stringify(visualEquipado)); }
    };
    if (possuiVisual(item)) {
        equipar();
        playSound('jump');
    } else if (globalStars < item.cost) {
        alert('Estrelas insuficientes!');
        return;
    } else if (confirm(`Desbloquear ${item.name} por ${item.cost} estrelas?`)) {
        globalStars -= item.cost;
        unlockedSkins.push(item.id);
        localStorage.setItem('uniparkourGlobalStars', globalStars);
        localStorage.setItem('uniparkourSkins', JSON.stringify(unlockedSkins));
        equipar();
        updateGlobalStarsDisplay();
        playSound('buy');
    } else return;
    renderCharMenu();
}

// Desenha uma "partícula" de qualquer forma (usado no jogo e na prévia da loja)
function desenharFormaParticula(ctx, forma, cor, x, y, tam, rot = 0, texto = '1') {
    if (forma === 'brilho') { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(spriteEstrelinha(cor), -tam / 2, -tam / 2, tam, tam); ctx.restore(); }
    else if (forma === 'fumaca' || forma === 'poeira') ctx.drawImage(spritePoeira(cor), x - tam / 2, y - tam / 2, tam, tam);
    else if (forma === 'confete' || forma === 'pixel') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(forma === 'pixel' ? 0 : rot);
        ctx.fillStyle = cor; ctx.fillRect(-tam * 0.25, -tam * (forma === 'pixel' ? 0.25 : 0.12), tam * 0.5, tam * (forma === 'pixel' ? 0.5 : 0.24));
        ctx.restore();
    } else if (forma === 'digito') {
        ctx.font = `700 ${Math.round(tam * 0.8)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = cor; ctx.fillText(texto, x, y);
    } else if (forma === 'faisca') {
        ctx.strokeStyle = cor; ctx.lineWidth = Math.max(1, tam * 0.12); ctx.lineJoin = 'miter';
        ctx.beginPath();
        let px = x, py = y;
        ctx.moveTo(px, py);
        for (let i = 0; i < 3; i++) { px += Math.cos(rot) * tam * 0.3 + (i % 2 ? 1 : -1) * tam * 0.15; py += Math.sin(rot) * tam * 0.3; ctx.lineTo(px, py); }
        ctx.stroke();
    } else if (forma === 'circulo') { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x, y, tam * 0.25, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(spriteForma(forma, cor), -tam / 2, -tam / 2, tam, tam); ctx.restore(); }
}

// Solta partículas da aura equipada em volta do jogador (chamado a cada passo de física)
function emitirAura(efeito) {
    if (!efeito || frames % 4 !== 0) return;
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2, cor = efeito.cores[Math.floor(Math.random() * efeito.cores.length)];
    const base = { forma: efeito.forma, color: cor, life: 1, size: 5 + Math.random() * 3, texto: Math.random() < 0.5 ? '0' : '1' };
    if (efeito.mov === 'sobe') Object.assign(base, { x: cx + (Math.random() - 0.5) * player.w, y: cy + player.h * 0.3, vx: (Math.random() - 0.5) * 0.6, vy: -1.5 - Math.random() * 1.5, noMundo: true });
    else if (efeito.mov === 'cai') Object.assign(base, { x: cx + (Math.random() - 0.5) * player.w * 1.6, y: cy - player.h * 1.2, vx: (Math.random() - 0.5) * 0.6, vy: 1 + Math.random(), noMundo: true });
    else if (efeito.mov === 'faisca') Object.assign(base, { x: cx + (Math.random() - 0.5) * player.w, y: cy + (Math.random() - 0.5) * player.h, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.5 });
    else Object.assign(base, { x: cx, y: cy, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 });
    if (base.forma === 'fumaca') base.size = 8 + Math.random() * 4;
    emitirParticula(base);
}

// Abas + cards com prévia ao vivo do personagem usando o item
function renderVisual() {
    const abas = document.getElementById('abas-visual');
    abas.innerHTML = '';
    CATEGORIAS_VISUAL.forEach(cat => {
        const b = document.createElement('button');
        b.className = 'aba-visual' + (cat.id === abaVisual ? ' ativa' : '');
        b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', cat.id === abaVisual);
        b.textContent = cat.nome;
        b.onclick = () => { abaVisual = cat.id; renderCharMenu(); };
        abas.appendChild(b);
    });
    skinsGrid.innerHTML = '';
    const cat = CATEGORIAS_VISUAL.find(c => c.id === abaVisual);
    // chifre só aparece em unicórnio: a prévia usa o Padrão se o personagem escolhido não tiver chifre
    const charPrevia = (abaVisual === 'chifre' && especieDe(characters[selectedChar]).chifre !== 'unicornio') ? characters[0] : characters[selectedChar];
    cat.itens().forEach(item => {
        const tem = possuiVisual(item), equipado = equipadoNaCategoria(abaVisual) === item.id;
        const card = document.createElement('div');
        card.className = `char-card ${equipado ? 'selected' : ''} ${tem ? '' : 'bloqueado'}`;
        card.onclick = () => escolherVisual(abaVisual, item);
        const retrato = document.createElement('canvas');
        retrato.className = 'retrato';
        const equipPrevia = { ...visualEquipado };
        if (abaVisual !== 'aura') equipPrevia[abaVisual] = item.id;
        const extra = abaVisual === 'aura' ? { aura: AURA_EFEITO[item.id] || null } : abaVisual === 'rastro' ? { rastro: true }
            : abaVisual === 'chifre' ? { foco: 'cabeca' } : {};   // chifres: close na cabeça (o material aparece)
        retratosPendentes.push([retrato, charPrevia, visualParaDesenho(equipPrevia), extra]);
        card.innerHTML = `<div class="char-name">${item.name}</div><div class="char-desc">${item.desc}</div>` +
            `<div style="font-weight:bold; white-space:nowrap; color:${tem ? '#9BE7FF' : '#FFE08A'}">${tem ? (equipado ? 'EQUIPADO' : 'USAR') : '🔒 ' + item.cost + ' ⭐'}</div>`;
        card.insertBefore(retrato, card.firstChild);
        skinsGrid.appendChild(card);
    });
}

// Retrato de verdade de cada personagem na loja (o mesmo desenho do jogo, parado no meio da passada).
// Só desenha depois que o jogo terminou de carregar (as funções de pose ficam mais abaixo no arquivo).
var retratosLiberados = false;
const retratosPendentes = [];
function desenharRetrato(cv, char, visual, extra = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = 140 * dpr; cv.height = 104 * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // disco claro atrás: personagens escuros não somem no fundo roxo do card
    const disco = g.createRadialGradient(70, 56, 4, 70, 56, 48);
    disco.addColorStop(0, 'rgba(255,240,255,0.22)');
    disco.addColorStop(1, 'rgba(255,240,255,0)');
    g.fillStyle = disco; g.fillRect(0, 0, 140, 104);
    g.setTransform(dpr * 0.88, 0, 0, dpr * 0.88, 0, 0);
    const p = {
        char, w: 50, h: 40, rot: 0, spin: 0, scaleX: 1, scaleY: 1, vy: 0, onGround: true, mistura: 0,
        runPhase: 0.12 / FATOR_FASE_GALOPE, poseAr: { fl: -35, fr: -15, bl: 25, br: 5 },
        hurtFrames: 0, sorriso: 1, piscar: 100, assustado: false,
        visual: visual || visualParaDesenho(), x: 55, y: 58
    };
    // prévia da aura: brilho + algumas partículas espalhadas em volta
    if (extra.aura) {
        const ef = extra.aura;
        if (ef.brilho) {
            g.save(); g.globalCompositeOperation = 'lighter';
            g.drawImage(spriteLuz(ef.brilho), 55 - 75, 58 - 70, 150, 140);
            g.restore();
        }
        const pos = [[18, 30], [96, 22], [30, 88], [100, 80], [62, 14], [12, 62], [108, 52], [80, 98]];
        pos.forEach(([x, y], i) => {
            g.save();
            if (ef.forma === 'brilho' || ef.forma === 'faisca') g.globalCompositeOperation = 'lighter';
            desenharFormaParticula(g, ef.forma, ef.cores[i % ef.cores.length], x, y, ef.forma === 'fumaca' ? 22 : 13, i * 0.9, i % 2 ? '1' : '0');
            g.restore();
        });
    }
    // prévia do rastro: o personagem vai para a direita do card e a trilha (maior) ondula para a esquerda
    if (extra.rastro) {
        p.x = 70; p.escalaRastro = 1.25;
        const raiz = pontoLocalNaTela(p, RAIZ_CAUDA[0], RAIZ_CAUDA[1], 1.3);
        p.rastro = [];
        for (let i = 0; i < 13; i++) p.rastro.push({ x: raiz.x - 12 - i * 5, y: raiz.y + 8 + Math.sin(i * 0.7) * 6 + i * 0.6 });
        p.alfaFita = 1; p.onGround = false;
        desenharRastro(g, p, 0, 8, paletaDe(char), 0.3);
        p.onGround = true;
    }
    // chifres: close na cabeça, para o material e o formato aparecerem
    if (extra.foco === 'cabeca') { g.translate(79.5, 59); g.scale(1.55, 1.55); g.translate(-100, -30); }
    desenharUnicornio(g, p.x, p.y, p, 0.3, 1.3);   // enquadrado para a cabeça maior
}
function desenharRetratosPendentes() {
    if (!retratosLiberados) return;
    while (retratosPendentes.length) { const [cv, char, visual, extra] = retratosPendentes.shift(); desenharRetrato(cv, char, visual, extra); }
}

function renderCharMenu() {
    charGrid.innerHTML = '';
    retratosPendentes.length = 0;
    characters.forEach(char => {
        const card = document.createElement('div');
        const liberado = unlockedChars.includes(char.id);
        card.className = `char-card ${char.id === selectedChar ? 'selected' : ''} ${liberado ? '' : 'bloqueado'}`;
        card.onclick = () => selecionarPersonagem(char);
        const retrato = document.createElement('canvas');
        retrato.className = 'retrato';
        retratosPendentes.push([retrato, char]);

        card.innerHTML += `<div class="char-name">${char.name}</div><div class="char-desc">${char.desc}</div>` +
            `<div style="font-weight:bold; white-space:nowrap; color:${liberado ? '#9BE7FF' : '#FFE08A'}">${liberado ? (char.id === selectedChar ? 'EQUIPADO' : 'USAR') : '🔒 ' + char.cost + ' ⭐'}</div>`;
        card.insertBefore(retrato, card.firstChild);
        charGrid.appendChild(card);
    });

    upgradesGrid.innerHTML = '';
    upgrades.forEach(u => {
        const card = document.createElement('div');
        card.className = 'char-card';
        let cur = unlockedUpgrades[u.id];
        let price = u.cost * (cur + 1);
        let isMax = cur >= u.maxLevel;
        card.onclick = () => buyUpgrade(u.id);

        card.innerHTML = `
            <div style="font-size:2rem; margin-bottom:10px;">${isMax ? '⭐' : '⚡'}</div>
            <div class="char-name">${u.name} (Nvl ${cur}/${u.maxLevel})</div>
            <div class="char-desc">${u.desc}</div>
            <div style="margin-top:10px; font-weight:bold; color:${isMax ? '#9BE7FF' : '#FFE08A'}">${isMax ? 'MÁXIMO' : price + ' ⭐'}</div>
        `;
        upgradesGrid.appendChild(card);
    });

    renderVisual();
    desenharRetratosPendentes();
}
renderCharMenu();

function initGame() {
    state = 'playing';
    isPaused = false;
    pauseMenu.classList.add('hidden');
    score = 0;
    starsCollected = 0;
    estrelasHudAntes = -1;
    gorjetaInicial = 0;
    distance = 0;
    currentPhase = 0;
    phaseAnnounceFrames = 0;
    gameSpeed = gameSpeedAlvo = PHASES[0].baseSpeed;
    frames = 0;
    platforms = [];
    stars = [];
    feathers = [];
    limparParticulas();
    limparInputs();      // nenhum botão "preso" da partida anterior
    // Zera tudo que poderia vazar da partida anterior
    powerupItems = [];
    obstaculos = [];
    floatingTexts = [];
    aneis = [];
    isSlamming = false;
    isDashing = false; dashCooldown = 0; dashTimeLeft = 0; pedidoDash = false;
    screenShake = 0; sleepFrames = 0;
    passosMorte = 0;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // Espaço não "clica" no botão focado

    // Tutorial nas 3 primeiras partidas; começo sempre com alguns vãos curtos e planos
    partidasJogadas++;
    localStorage.setItem('uniparkourPartidas', partidasJogadas);
    mostrarTutorial = partidasJogadas <= 3;
    tutorialObst = {};
    tutorialIdx = 0;
    plataformasFaceis = mostrarTutorial ? 6 : 2;

    isFlying = false;
    flightTimeLeft = 0;
    powerupDisplay.classList.add('hidden');

    // Active powerup states
    isMagnetActive = false; magnetTimeLeft = 0;
    isShieldActive = false; shieldTimeLeft = 0;
    isBonusActive = false; bonusTimeLeft = 0;
    isSlowMoActive = false; slowMoTimeLeft = 0;
    isInfJumpActive = false; infJumpTimeLeft = 0;
    isShrinkActive = false; shrinkTimeLeft = 0;
    isGiantActive = false; giantTimeLeft = 0;
    isMeteorActive = false; meteorTimeLeft = 0;
    isRocketActive = false; rocketTimeLeft = 0;
    isBlackHoleActive = false; blackholeTimeLeft = 0;
    isLuckyActive = false; luckyTimeLeft = 0;
    isHoverActive = false; hoverTimeLeft = 0;
    isNoGapActive = false; noGapTimeLeft = 0;
    rainbowPlatformsCount = 0;
    omniSpawnedThisPhase = false;
    usedFreeRevive = false;

    magnetDisplay.classList.add('hidden');
    shieldDisplay.classList.add('hidden');
    bonusDisplay.classList.add('hidden');
    slowmoDisplay.classList.add('hidden');
    infjumpDisplay.classList.add('hidden');
    shrinkDisplay.classList.add('hidden');
    giantDisplay.classList.add('hidden');
    meteorDisplay.classList.add('hidden');
    rocketDisplay.classList.add('hidden');
    blackholeDisplay.classList.add('hidden');
    luckyDisplay.classList.add('hidden');
    hoverDisplay.classList.add('hidden');
    nogapDisplay.classList.add('hidden');

    let selectedCharObj = characters[selectedChar];

    player = {
        x: cw * 0.2,
        y: ch / 2 - 50,
        w: 50, h: 40,
        vy: 0,
        jumps: 0,
        onGround: false,
        char: selectedCharObj,
        visual: visualParaDesenho(),   // pelagem, rastro, chifre e chapéu escolhidos na loja
        spin: 0,
        scaleX: 1, scaleY: 1,
        // Atributos do personagem
        gravity: GRAVIDADE_BASE * (selectedCharObj.gravityMult || 1.0) * (1 - ((unlockedUpgrades.gravity_f || 0) * 0.08)),
        jumpPower: FORCA_PULO * (selectedCharObj.jumpPowerMult || 1.0) * (1 + ((unlockedUpgrades.jump_pwr || 0) * 0.05)),
        maxJumps: (selectedCharObj.maxJumps || 2) + unlockedUpgrades.jump,
        // Sensação do pulo
        coyote: 0, bufferPulo: 0, podeCortarPulo: false,
        // Animação
        runPhase: 0, mistura: 1, rot: 0,
        poseAr: { fl: -35, fr: -15, bl: 25, br: 5 },
        hurtFrames: 0, sorriso: 0, piscar: 150, assustado: false
    };

    limparEfeitosPersonagem(player); // estrelinhas da partida anterior não reaparecem

    if (unlockedUpgrades.start_stars > 0) {
        gorjetaInicial = unlockedUpgrades.start_stars * GORJETA_POR_NIVEL / CONVERSAO_ESTRELAS;   // +500 na loja por nível
        starsCollected = gorjetaInicial;
    }


    if (selectedCharObj.startShield || unlockedUpgrades.shield > 0) {
        isShieldActive = true;
        shieldTimeLeft = 9999;
        shieldDisplay.classList.remove('hidden');
    }

    platforms.push({ x: 0, y: ch / 2 + 50, baseY: ch / 2 + 50, w: cw, h: ch });

    lastPlatformX = cw;
    applyPhaseParams();
    generateWorld();
    // Arrancada: começa parado e acelera suavemente até a velocidade da fase (a geração acima já usou a velocidade alvo)
    gameSpeed = 0;
    escalaTempo = 1; tremorX = tremorY = 0;

    mainMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    nameInputContainer.classList.add('hidden');
    btnRestart.classList.remove('hidden');
    btnMenuGo.classList.remove('hidden');

    hud.classList.remove('hidden');

    // Show mobile controls on touch devices
    if (isTouchDevice()) {
        mobileControls.style.display = 'block';
        mobilePauseBtn.textContent = '⏸';
    }

    updateHUD();
    iniciarLoop();
}

function applyPhaseParams() {
    const ph = PHASES[currentPhase];
    minGap = ph.minGap;
    maxGap = ph.maxGap;
    minWidth = ph.minW;
    maxWidth = ph.maxW;
}

let lastPlatformX = 0;
let minGap = 150, maxGap = 450;
let minWidth = 150, maxWidth = 500;

// Simula um pulo do personagem atual (com os pulos extras dados no ápice) e devolve:
// - distancia: quanto ele anda na horizontal até voltar à altura de pouso (`subida` px acima da partida)
// - alturaMax: a maior altura que ele consegue atingir
// Usado para nunca gerar vãos ou degraus impossíveis para o personagem escolhido.
function alcanceDoPulo(subida) {
    const pulos = Math.min(player.maxJumps, 3);
    let y = 0, vy = player.jumpPower, usados = 1, passos = 0, alturaMax = 0;
    while (passos < 600) {
        vy += vy > 0 ? player.gravity * MULT_GRAVIDADE_QUEDA : player.gravity;
        if (vy > VEL_MAX_QUEDA) vy = VEL_MAX_QUEDA;
        y += vy; passos++;
        if (-y > alturaMax) alturaMax = -y;
        if (vy >= 0 && usados < pulos) { vy = player.jumpPower; usados++; }
        if (vy > 0 && -y <= subida) break;
    }
    const folgaHitbox = player.w * 0.4; // a hitbox tem 20% de folga de cada lado
    // Durante a arrancada a velocidade ainda está subindo: usa quase a velocidade alvo
    const vel = Math.max(gameSpeed, gameSpeedAlvo * 0.9);
    return { distancia: passos * vel + folgaHitbox, alturaMax };
}

const POWERUP_TYPES = ['magnet', 'shield', 'bonus', 'slowmo', 'infjump', 'starchest', 'shrink', 'giant', 'meteor', 'rocket', 'blackhole', 'lucky', 'hover', 'coinshower', 'rainbow', 'jackpot', 'nogap'];
// Raridade dos power-ups: úteis e comuns saem mais; os de economia (baú, chuva, jackpot) são raros
const PESO_POWERUP = { magnet: 10, shield: 8, bonus: 8, slowmo: 6, infjump: 6, hover: 6, nogap: 5, rainbow: 5, shrink: 5, giant: 5, meteor: 4, rocket: 4, blackhole: 3, lucky: 3, starchest: 3, coinshower: 3, jackpot: 1 };
const PESO_POWERUP_TOTAL = POWERUP_TYPES.reduce((s, t) => s + (PESO_POWERUP[t] || 1), 0);
function sortearPowerup() {
    let r = Math.random() * PESO_POWERUP_TOTAL;
    for (const t of POWERUP_TYPES) { r -= PESO_POWERUP[t] || 1; if (r <= 0) return t; }
    return POWERUP_TYPES[0];
}
const DIMENSOES_OBSTACULO = { espinho: [36, 22], barreira: [22, 150], bloco: [44, 44] };

function generateWorld() {
    const ph = PHASES[currentPhase];
    while (lastPlatformX < distance + cw * 2) {
        let gap = Math.random() * (maxGap - minGap) + minGap;
        let w = Math.random() * (maxWidth - minWidth) + minWidth;

        let prevPlatform = platforms[platforms.length - 1];
        let py = prevPlatform ? prevPlatform.baseY : ch / 2;

        let yOffset = (Math.random() * 250) - 125;
        let trechoLivre = false; // sem obstáculos nem plataformas especiais

        if (plataformasFaceis > 0) {
            gap = 120 + Math.random() * 60;
            yOffset = 0;
            w = Math.max(w, 300);
            plataformasFaceis--;
            trechoLivre = true;
        }

        if (rainbowPlatformsCount > 0) {
            gap = 0;
            yOffset = 0;
            rainbowPlatformsCount--;
            trechoLivre = true;
        }

        if (isNoGapActive) {
            gap = 0;
            yOffset = 0;
            trechoLivre = true;
        }

        // Tutorial: um obstáculo "de treino" logo depois de cada dica (barreira → dash, bloco → slam),
        // numa plataforma larga e reta, para o jogador testar na hora o que acabou de ler
        let obstTutorial = null;
        if (mostrarTutorial && !isNoGapActive && rainbowPlatformsCount <= 0) {
            if (!tutorialObst.barreira && lastPlatformX >= DIST_TREINO_DASH) obstTutorial = tutorialObst.barreira = 'barreira';
            else if (!tutorialObst.bloco && lastPlatformX >= DIST_TREINO_SLAM) obstTutorial = tutorialObst.bloco = 'bloco';
            if (obstTutorial) { w = Math.max(w, 420); yOffset = 0; trechoLivre = true; }
        }

        // Plataformas especiais do tema da fase
        let amp = 0, quebradica = false;
        if (gap > 0 && !trechoLivre) {
            if (ph.mods.movel && Math.random() < ph.mods.movel) amp = 30 + Math.random() * 30;
            else if (ph.mods.quebra && Math.random() < ph.mods.quebra && w < 320) quebradica = true;
        }

        // Garante que o vão e a subida caibam no alcance real do personagem (com margem de segurança)
        if (gap > 0) {
            const alc = alcanceDoPulo(0);
            const subidaMax = alc.alturaMax * MARGEM_ALCANCE - amp;
            if (-yOffset > subidaMax) yOffset = -subidaMax;
            const subida = Math.max(0, -yOffset) + amp;
            gap = Math.min(gap, alcanceDoPulo(subida).distancia * MARGEM_ALCANCE);
        }

        let y = py + yOffset;
        if (y < ch * 0.3) y = ch * 0.3;
        if (y > ch * 0.8) y = ch * 0.8;

        let x = lastPlatformX + gap;
        const plat = { x: x, y: y, baseY: y, w: w, h: ch };
        if (amp) { plat.amp = amp; plat.velOsc = 0.02 + Math.random() * 0.02; plat.faseOsc = Math.random() * Math.PI * 2; }
        if (quebradica) { plat.quebradica = true; plat.tempoPisado = 0; plat.vyQueda = 0; }
        platforms.push(plat);

        // Obstáculos (a partir da fase 2; veteranos já na fase 1): espinho pede pulo, barreira pede dash
        // (ou pulo duplo), bloco pede slam. Plataformas estreitas das fases finais recebem só espinho, no meio.
        const chanceObst = currentPhase >= 1 ? Math.min(0.45, 0.12 + currentPhase * 0.015)
            : (partidasJogadas > 3 ? CHANCE_OBST_FASE1_VETERANO : 0);
        if (obstTutorial) {
            const [ow, oh] = DIMENSOES_OBSTACULO[obstTutorial];
            obstaculos.push({ tipo: obstTutorial, plat, x: x + w * 0.5 - ow / 2, w: ow, h: oh, destruido: false });
        } else if (!trechoLivre && w >= 160 && Math.random() < chanceObst) {
            const r = Math.random();
            const tipo = r < 0.5 ? 'espinho' : (r < 0.75 ? 'barreira' : 'bloco');
            const [ow, oh] = DIMENSOES_OBSTACULO[tipo];
            obstaculos.push({ tipo, plat, x: x + w * 0.4 + Math.random() * (w * 0.3 - ow), w: ow, h: oh, destruido: false });
        } else if (!trechoLivre && w >= LARGURA_MIN_ESPINHO && currentPhase >= 1 && Math.random() < chanceObst) {
            const [ow, oh] = DIMENSOES_OBSTACULO.espinho;
            obstaculos.push({ tipo: 'espinho', plat, x: x + w * 0.5 - ow / 2, w: ow, h: oh, destruido: false });
        }

        let srMult = (player.char.spawnRateMult || 1.0) * (1 + ((unlockedUpgrades.star_spawn || 0) * 0.15));
        if (Math.random() < 0.6 * srMult) {
            let numStars = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numStars; i++) {
                let st = pickStarType();
                stars.push({
                    x: x + (w / (numStars + 1)) * (i + 1),
                    y: y - 60 - Math.random() * 40,
                    size: st.size,
                    starType: st,
                    collected: false,
                    oscOffset: Math.random() * Math.PI * 2
                });
            }
        }

        if (Math.random() < 0.05 * srMult) {
            feathers.push({
                x: x + w / 2,
                y: y - 100 - Math.random() * 50,
                size: 20,
                collected: false,
                oscOffset: Math.random() * Math.PI * 2
            });
        }

        // Power-ups: chance base fixa (o multiplicador do personagem vale só para estrelas)
        if (!omniSpawnedThisPhase && Math.random() < CHANCE_OMNI) {
            omniSpawnedThisPhase = true;
            powerupItems.push({
                type: 'omni',
                x: x + w * 0.3 + Math.random() * w * 0.4,
                y: y - 90 - Math.random() * 50,
                size: 24,
                collected: false,
                oscOffset: Math.random() * Math.PI * 2
            });
        } else if (Math.random() < CHANCE_POWERUP) {
            let type = sortearPowerup();
            powerupItems.push({
                type,
                x: x + w * 0.3 + Math.random() * w * 0.4,
                y: y - 90 - Math.random() * 50,
                size: 18,
                collected: false,
                oscOffset: Math.random() * Math.PI * 2
            });
        }

        lastPlatformX = x + w;
    }
}

// Pulo: faíscas pastel + um "puf" de nuvem embaixo dos cascos
function spawnJumpParticles(noAr = false) {
    const x = player.x + player.w / 2, y = player.y + player.h;
    if (noAr) {
        // pulo no ar: anel de brilhos saindo do corpo (sem "puf" de nuvem flutuando)
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            emitirParticula({
                x, y: y - player.h * 0.4, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
                life: 0.7, size: 4.5, forma: 'brilho', color: PALETA.particulas[i % PALETA.particulas.length]
            });
        }
        return;
    }
    for (let i = 0; i < 7; i++) {
        emitirParticula({
            x, y, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 2.5,
            life: 0.8, size: 4 + Math.random() * 3, forma: 'brilho',
            color: PALETA.particulas[i % PALETA.particulas.length]
        });
    }
    for (let i = 0; i < 3; i++) {
        emitirParticula({ x: x + (i - 1) * 8, y, vx: (i - 1) * 1.2, vy: 0.4, life: 0.6, size: 6, forma: 'poeira', noMundo: true, color: PALETA.nuvemSombra });
    }
}

// Existe chão logo abaixo dos pés (até `dist` px)?
function chaoAbaixo(dist) {
    const pRealX = distance + player.x, margem = player.w * 0.2, pes = player.y + player.h;
    for (const p of platforms) {
        if (p.caindo) continue;
        if (pRealX + player.w - margem > p.x && pRealX + margem < p.x + p.w && p.y >= pes - 2 && p.y - pes <= dist) return true;
    }
    return false;
}

// Copia o valor atual para o "anterior" da interpolação: evita desenhar um salto (ex.: 0 → -2π) num quadro
function semInterpolar(...campos) {
    if (!player || !player.ant) return;
    for (const k of campos) player.ant[k] = player[k];
}

function jump() {
    if (state !== 'playing' || isPaused) return;

    // o pulo cancela o dash (vira um "dash-jump"); a recarga continua
    if (dashTimeLeft > 0) { dashTimeLeft = 0; isDashing = false; }

    if (isFlying) {
        player.vy = player.jumpPower * 0.8;
        player.scaleX = 0.7; // Estica fino
        player.scaleY = 1.3; // Estica para cima
        player.podeCortarPulo = false;
        spawnJumpParticles();
        return;
    }

    // Caindo quase no chão com o pulo do ar sobrando: guarda para pular do chão (não gasta o pulo duplo à toa)
    if (!player.onGround && player.vy > 0 && player.jumps > 0 && !isInfJumpActive && !isHoverActive
        && chaoAbaixo(Math.max(12, player.vy * 3))) {
        player.bufferPulo = PASSOS_BUFFER_PULO;
        return;
    }

    if (player.jumps < player.maxJumps || isInfJumpActive || isHoverActive) {
        const noAr = !player.onGround && player.coyote <= 0;
        player.vy = player.jumpPower;
        player.jumps++;
        player.onGround = false;
        player.coyote = 0;
        player.bufferPulo = 0;
        player.podeCortarPulo = true;
        // Botão já solto (toque rápido ou pulo do buffer): sai baixo, mas só depois do pulo mínimo (ver step)
        player.passosPulo = 0;

        isSlamming = false;
        player.scaleX = noAr ? 0.84 : 0.8; // esticada (suave: o rig inteiro é escalado)
        player.scaleY = noAr ? 1.25 : 1.35; player.sqV = 0;

        // Mortal para trás no pulo duplo (ou a cada 2 pulos no pulo infinito)
        if (player.jumps % 2 === 0) {
            player.spin = -Math.PI * 2;
            player.giroT = 0;
            player.giroRapido = false;
        }
        semInterpolar('spin', 'scaleX', 'scaleY');

        playSound(noAr ? 'jump2' : 'jump');
        checkMission('jumps', 1);
        spawnJumpParticles(noAr);
    } else {
        // Sem pulos sobrando: guarda o pedido e pula assim que pousar (jump buffer)
        player.bufferPulo = PASSOS_BUFFER_PULO;
    }
}

// Botão de pulo está apertado agora? (teclado, toque ou mouse)
let puloSegurado = false;
function apertarPulo() {
    puloSegurado = true;
    jump();
}

// Soltar o botão durante a subida corta o pulo (pulo de altura variável)
function soltarPulo() {
    puloSegurado = false;
    if (state !== 'playing' || !player) return;
    // antes do pulo mínimo o corte fica "agendado" (o step corta quando completar PASSOS_PULO_MIN)
    if ((player.passosPulo || 0) < PASSOS_PULO_MIN) return;
    if (player.podeCortarPulo && player.vy < 0 && !isFlying) player.vy *= CORTE_PULO;
    player.podeCortarPulo = false;
}

// Botão de DASH do celular mostra a recarga (só mexe no DOM quando o valor muda de verdade)
let recargaDashTotal = RECARGA_DASH, pedidoDash = false, dashBtnNivel = -1;
function atualizarBotaoDash() {
    const nivel = dashCooldown > 0 ? Math.floor((1 - dashCooldown / recargaDashTotal) * 20) : 20;   // 0..20
    if (nivel === dashBtnNivel) return;
    dashBtnNivel = nivel;
    mobileDashBtn.classList.toggle('recarregando', nivel < 20);
    mobileDashBtn.style.setProperty('--pronto', (nivel / 20).toFixed(2));
}

function doDash() {
    if (state !== 'playing' || isPaused) return;
    // apertou um pouco antes da recarga acabar: guarda o pedido e dispara quando ficar pronto
    if (dashCooldown > 0 && dashCooldown <= BUFFER_DASH && !isDashing) { pedidoDash = true; return; }
    if (dashCooldown > 0 || isDashing) return;
    pedidoDash = false;
    isDashing = true;
    dashTimeLeft = DURACAO_DASH;
    dashCooldown = recargaDashTotal = RECARGA_DASH * (1 - ((unlockedUpgrades.dash_cd || 0) * 0.15));
    isSlamming = false; // o dash cancela o slam (e o bônus dele)
    player.vy = 0;      // trava a altura já no primeiro passo
    // estouro de ar atrás do personagem
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    aneis.push({ x: cx - player.w * 0.4, y: cy, cor: '#9BE7FF', t: 0, raio: 34 });
    for (let i = 0; i < 6; i++) emitirParticula({ x: cx - player.w * 0.5, y: cy + (Math.random() - 0.5) * player.h, vx: -4 - Math.random() * 4, vy: (Math.random() - 0.5) * 2, life: 0.6, size: 7, forma: 'poeira', color: '#DDF0FF' });
    playSound('dash');
    checkMission('dashes', 1);
}

function doSlam() {
    if (state !== 'playing' || isPaused) return;
    if (player.onGround) return; // não dá slam no chão
    if (dashTimeLeft > 0) { dashTimeLeft = 0; isDashing = false; } // o slam cancela o dash
    player.vy = VEL_SLAM;
    player.podeCortarPulo = false;
    isSlamming = true;
}

function alternarPausa() {
    if (state !== 'playing') return;
    isPaused = !isPaused;
    pauseMenu.classList.toggle('hidden', !isPaused);
    mobilePauseBtn.textContent = isPaused ? '▶' : '⏸';
    if (!isPaused) iniciarLoop();
}

const TECLAS_PULO = ['Space', 'ArrowUp', 'KeyW'];

window.addEventListener('keydown', (e) => {
    if (state === 'playing') {
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (!e.repeat) alternarPausa();
            e.preventDefault();
        } else if (TECLAS_PULO.includes(e.code)) {
            if (!e.repeat) apertarPulo(); // segurar a tecla não repete o pulo
            e.preventDefault();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (!e.repeat) doDash();
            e.preventDefault();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            if (!e.repeat) doSlam();
            e.preventDefault();
        }
    } else if (state === 'gameover') {
        if (e.code === 'Enter') {
            if (!nameInputContainer.classList.contains('hidden')) {
                btnSaveScore.click();
            } else {
                btnRestart.click();
            }
            e.preventDefault();
        } else if (e.code === 'Escape') {
            if (nameInputContainer.classList.contains('hidden')) {
                btnMenuGo.click();
            }
            e.preventDefault();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (TECLAS_PULO.includes(e.code)) soltarPulo();
});

// Ao perder o foco (alt-tab, trocar de aba) o "soltar" do botão se perde: limpa tudo que está segurado
function limparInputs() {
    if (typeof ponteirosPulo !== 'undefined') ponteirosPulo.clear();
    puloSegurado = false;
}
window.addEventListener('blur', limparInputs);

// Pausa sozinho ao trocar de aba / minimizar
document.addEventListener('visibilitychange', () => {
    if (document.hidden) limparInputs();
    if (document.hidden && state === 'playing' && !isPaused) alternarPausa();
});

// ─────────────────────────────────────────────────────────────────────────
// CONTROLES MOBILE — botões visíveis em telas de toque
// ─────────────────────────────────────────────────────────────────────────

// Pointer events: respondem na hora a toque, mouse e caneta (sem o atraso do 'click')
// Guardamos quais ponteiros estão segurando o pulo; o pulo só é "solto" quando o último sai.
const ponteirosPulo = new Set();

function pressionarPuloPonteiro(e) {
    ponteirosPulo.add(e.pointerId);
    apertarPulo();
}
function liberarPuloPonteiro(e) {
    if (!ponteirosPulo.delete(e.pointerId)) return;
    if (ponteirosPulo.size === 0) soltarPulo();
}

function ligarBotao(btn, acao, ehPulo) {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
        btn.style.transform = 'scale(0.88)'; btn.style.opacity = '0.7';
        if (ehPulo) pressionarPuloPonteiro(e); else acao();
    });
    const soltar = (e) => {
        btn.style.transform = ''; btn.style.opacity = '';
        if (ehPulo) liberarPuloPonteiro(e);
    };
    btn.addEventListener('pointerup', soltar);
    btn.addEventListener('pointercancel', soltar);
}
ligarBotao(mobileJumpBtn, null, true);
ligarBotao(mobileDashBtn, doDash, false);
ligarBotao(mobileSlamBtn, doSlam, false);
mobilePauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); alternarPausa(); });

// ─── Toque/clique no resto da tela (tudo que NÃO é botão nem menu) também pula ───
document.addEventListener('pointerdown', (e) => {
    if (state !== 'playing' || isPaused) return;
    if (e.target.closest && (e.target.closest('#mobile-controls') || e.target.closest('.ui-panel'))) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    pressionarPuloPonteiro(e);
});
document.addEventListener('pointerup', liberarPuloPonteiro);
document.addEventListener('pointercancel', liberarPuloPonteiro);

function createPlayerParticle() {
    emitirParticula({
        x: player.x,
        y: player.y + player.h - 10 + (Math.random() * 10 - 5),
        vx: -Math.random() * 2 - 1,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        color: player.char.particle,
        size: Math.random() * 6 + 4
    });
}

// ─────────────────────────────────────────────────────────────────────────
// RIG E POSE COMUNS A TODOS OS PERSONAGENS
// ─────────────────────────────────────────────────────────────────────────

// Cache de gradientes: gradientes do canvas usam o sistema de coordenadas do momento do desenho,
// então podem ser criados uma vez (em coordenadas locais) e reaproveitados em todo frame.
const cacheGradientes = new Map();
function gradCache(chave, criar) {
    let g = cacheGradientes.get(chave);
    if (!g) { g = criar(); cacheGradientes.set(chave, g); }
    return g;
}

// Atualiza a pose do personagem a cada passo da física (não depende do FPS)
// Mola do squash & stretch (por passo de física). Alvo 1, ou esticado para baixo durante o slam.
function molaEscala(p) {
    const alvo = (p === player && isSlamming) ? ESTICADA_SLAM : 1;
    p.sqV = (p.sqV || 0) + (alvo - p.scaleY) * MOLA_RIGIDEZ - p.sqV * MOLA_AMORTECIMENTO;
    p.scaleY += p.sqV;
    p.scaleY = Math.max(0.45, Math.min(1.6, p.scaleY));
    p.scaleX = 1 / Math.sqrt(p.scaleY);   // conserva o volume
}

function atualizarPose(p, vel) {
    // Pose aérea suavizada por pata (dash, slam, mortal e voo mudam de pose aos poucos, não num quadro)
    if (typeof poseArPata === 'function') {
        if (!p.arSuave) p.arSuave = { d: poseArPata(p, true, tempoAnim), t: poseArPata(p, false, tempoAnim) };
        for (const n of ['d', 't']) {
            const alvo = poseArPata(p, n === 'd', tempoAnim), s = p.arSuave[n];
            s[0] += (alvo[0] - s[0]) * SUAVIZACAO_POSE_AR; s[1] += (alvo[1] - s[1]) * SUAVIZACAO_POSE_AR;
        }
    }
    // Crina e cauda com atraso (follow-through): seguem a subida/queda um pouco depois do corpo
    p.vyCabelo = p.vyCabelo === undefined ? p.vy : p.vyCabelo + (p.vy - p.vyCabelo) * ATRASO_CABELO;
    p.misCabelo = p.misCabelo === undefined ? p.mistura : p.misCabelo + (p.mistura - p.misCabelo) * ATRASO_CABELO;
    p.velAnim = vel;
    // Patas no ritmo da velocidade real do jogo (aceleram no dash, desaceleram no slow-mo)
    if (p.onGround) p.runPhase += Math.min(vel * FATOR_CORRIDA, MAX_PASSO_CORRIDA);
    if (p.pouso) { p.pouso.t++; if (p.pouso.t > PASSOS_POUSO) p.pouso = null; }

    // Mistura suave entre a corrida (0) e a pose aérea (1)
    const alvoMistura = (p.onGround && !isFlying) ? 0 : 1;
    p.mistura += (alvoMistura - p.mistura) * 0.25;

    // Pose aérea: subindo encolhe as patas da frente e estica as de trás; caindo, abre para pousar
    let ar;
    if (isFlying) ar = { fl: -20, fr: -10, bl: 20, br: 10 };
    else if (p.vy < 0) ar = { fl: -55, fr: -35, bl: 40, br: 25 };
    else if (p.vy > 4) ar = { fl: -15, fr: -5, bl: -10, br: 5 };
    else ar = { fl: -35, fr: -15, bl: 25, br: 5 };
    for (const k in ar) p.poseAr[k] += (ar[k] - p.poseAr[k]) * 0.2;

    // Rotação suavizada (antes pulava direto ao sair do chão)
    // no chão: leve inclinação para a frente conforme a velocidade (o balanço vem do galope da espécie)
    const alvoRot = p.onGround ? Math.min(0.05, vel * 0.0025) : Math.max(-0.3, Math.min(0.4, p.vy * 0.03));
    p.rot += (alvoRot - p.rot) * 0.3;

    // Piscar com intervalo aleatório
    p.piscar--;
    if (p.piscar < -8) p.piscar = 120 + Math.random() * 200;
}

function posePernas(p, amp) {
    const t = p.runPhase, m = p.mistura, a = p.poseAr, c = (1 - m) * amp;
    return {
        fl: Math.sin(t) * c + a.fl * m,
        fr: Math.sin(t + Math.PI) * c + a.fr * m,
        bl: Math.sin(t + Math.PI * 0.5) * c + a.bl * m,
        br: Math.sin(t + Math.PI * 1.5) * c + a.br * m
    };
}

// Posiciona o personagem: rotação, squash/stretch ancorado nos pés e quique da corrida.
// Deve ser chamado logo após ctx.save().
function aplicarRig(ctx, p, balanco) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.hurtFrames > 0 && Math.floor(p.hurtFrames / 4) % 2 === 0) ctx.globalAlpha = 0.35; // pisca ao levar dano
    ctx.rotate(p.rot + p.spin);
    ctx.translate(0, p.h / 2);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.translate(0, -p.h / 2);
    ctx.scale(p.w / 50, p.h / 40);   // escala visual (gigante / minúsculo)
    // Quique: dois por ciclo de passada, sempre para cima (não afunda os cascos na plataforma)
    ctx.translate(0, -Math.abs(Math.sin(p.runPhase)) * balanco * (1 - p.mistura));
    ctx.scale(1.3, 1.3);
}

const estaSorrindo = (p) => !p.onGround || isFlying || p.sorriso > 0;
const estaPiscando = (p) => p.piscar < 0 || p.assustado;

// ─────────────────────────────────────────────────────────────────────────
// DRAGON CHARACTER — Scaly, winged, fire-breathing beast
// ─────────────────────────────────────────────────────────────────────────
function drawDragon(ctx, p) {
    ctx.save();
    aplicarRig(ctx, p, 2);

    const pernas = posePernas(p, 30);
    let legFL = pernas.fl, legFR = pernas.fr, legBL = pernas.bl, legBR = pernas.br;
    let tailWave = Math.sin(frames * 0.3) * 12;
    let wingFlap = isFlying ? Math.sin(frames * 0.6) * 22 : Math.sin(frames * 0.25) * 5;

    const sc = ['#880800', '#cc2200', '#ff4400', '#ff8800', '#ffcc00'];
    const body = sc[1], bodyL = sc[2], bodyD = sc[0], bodyLL = sc[3];

    function scalyGrad(hx, hy, cx, cy, r) {
        return gradCache(`dr|${hx}|${hy}|${cx}|${cy}|${r}`, () => {
            let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
            g.addColorStop(0, bodyLL); g.addColorStop(0.4, bodyL); g.addColorStop(0.7, body); g.addColorStop(1, bodyD);
            return g;
        });
    }

    // TAIL — thick spiky dragon tail
    ctx.fillStyle = scalyGrad(-30, 0, -18, 10, 28);
    ctx.beginPath();
    ctx.moveTo(-15, 8);
    ctx.bezierCurveTo(-28, 2 + tailWave * 0.5, -52, 16 + tailWave, -48, 30 + tailWave);
    ctx.bezierCurveTo(-44, 38 + tailWave, -30, 32 + tailWave * 0.7, -20, 22);
    ctx.quadraticCurveTo(-16, 14, -15, 8);
    ctx.fill();
    // Tail spines
    ctx.fillStyle = sc[4];
    for (let i = 0; i < 4; i++) {
        let tx = -22 - i * 7 + tailWave * 0.1 * i;
        let ty = 12 + i * 4 + tailWave * 0.2 * i;
        ctx.beginPath();
        ctx.moveTo(tx - 2, ty + 2);
        ctx.lineTo(tx, ty - 7 - i);
        ctx.lineTo(tx + 2, ty + 1);
        ctx.closePath(); ctx.fill();
    }

    // REAR LEGS (behind body)
    ctx.globalAlpha = 0.65;
    function drawDragonLeg(lx, ly, angle, col) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle * Math.PI / 180);
        ctx.fillStyle = gradCache('dr|perna', () => {
            let lg = ctx.createRadialGradient(-4, 6, 0, 0, 12, 12);
            lg.addColorStop(0, bodyL); lg.addColorStop(1, bodyD);
            return lg;
        });
        ctx.beginPath(); ctx.ellipse(0, 8, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bodyD;
        ctx.beginPath(); ctx.ellipse(0, 18, 4, 8, 0.1, 0, Math.PI * 2); ctx.fill();
        // Claw
        ctx.fillStyle = '#ffeeaa';
        [-3, 0, 3].forEach(dx => {
            ctx.beginPath(); ctx.moveTo(dx, 24); ctx.lineTo(dx - 2, 30); ctx.lineTo(dx + 2, 30); ctx.closePath(); ctx.fill();
        });
        ctx.restore();
    }
    drawDragonLeg(-10, 12, legBR, bodyD);
    drawDragonLeg(9, 12, legFR, bodyD);
    ctx.globalAlpha = 1.0;

    // BODY — wide barrel, scaly
    ctx.fillStyle = scalyGrad(-12, -6, -8, 6, 20);
    ctx.beginPath(); ctx.ellipse(-10, 6, 14, 12, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = scalyGrad(-2, -14, 2, 4, 25);
    ctx.beginPath(); ctx.ellipse(2, 4, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = scalyGrad(12, -14, 14, -2, 16);
    ctx.beginPath(); ctx.ellipse(14, -3, 12, 10, -0.3, 0, Math.PI * 2); ctx.fill();

    // Belly — lighter scales
    let bellyG = ctx.createLinearGradient(-10, 8, 10, 22);
    bellyG.addColorStop(0, '#ff6633'); bellyG.addColorStop(1, '#ff9966');
    ctx.fillStyle = bellyG;
    ctx.beginPath(); ctx.ellipse(3, 16, 12, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Back spines
    ctx.fillStyle = sc[4];
    [[-14, -12], [-6, -18], [2, -20], [10, -16]].forEach(([sx, sy], i) => {
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy + 4);
        ctx.lineTo(sx, sy - 8 - i * 2);
        ctx.lineTo(sx + 3, sy + 4);
        ctx.closePath(); ctx.fill();
    });

    // WINGS
    ctx.save();
    ctx.globalAlpha = 0.88;
    // Back wing (darker)
    ctx.fillStyle = '#770000';
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.bezierCurveTo(-14, -28 + wingFlap, -38, -36 + wingFlap, -40, -20 + wingFlap);
    ctx.bezierCurveTo(-34, -10 + wingFlap, -18, -2 + wingFlap, -6, 2);
    ctx.closePath(); ctx.fill();
    // Membrane webbing
    ctx.strokeStyle = '#550000'; ctx.lineWidth = 0.8;
    [-22, -30, -36].forEach(wx => {
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(wx, -28 + wingFlap);
        ctx.stroke();
    });
    // Front wing (brighter)
    ctx.fillStyle = '#aa1100';
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.bezierCurveTo(-8, -22 + wingFlap * 0.7, -28, -28 + wingFlap * 0.7, -30, -16 + wingFlap * 0.7);
    ctx.bezierCurveTo(-24, -8 + wingFlap * 0.7, -12, -2, -4, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // HEAD
    ctx.save();
    ctx.translate(14, -12 - Math.abs(Math.cos(p.runPhase)) * (1 - p.mistura));
    // Neck
    let nkG = ctx.createLinearGradient(-8, 12, 4, -12);
    nkG.addColorStop(0, bodyD); nkG.addColorStop(0.5, body); nkG.addColorStop(1, bodyL);
    ctx.fillStyle = nkG;
    ctx.beginPath();
    ctx.moveTo(-8, 12); ctx.quadraticCurveTo(-12, 2, -10, -4);
    ctx.lineTo(-1, -14); ctx.quadraticCurveTo(5, -6, 5, 2); ctx.lineTo(3, 12);
    ctx.closePath(); ctx.fill();
    // Skull — elongated draconic
    ctx.fillStyle = scalyGrad(-2, -12, 2, -4, 16);
    ctx.beginPath(); ctx.ellipse(2, -5, 13, 10, -0.1, 0, Math.PI * 2); ctx.fill();
    // Snout — long reptile jaw
    ctx.fillStyle = scalyGrad(8, -6, 14, 0, 13);
    ctx.beginPath(); ctx.ellipse(14, -1, 10, 6, 0.15, 0, Math.PI * 2); ctx.fill();
    // Nostrils with smoke
    ctx.fillStyle = '#220000';
    ctx.beginPath(); ctx.ellipse(19, 1, 2, 1.5, 0.3, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,0,0.4)';
    ctx.beginPath(); ctx.arc(20, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    // Horns
    [[2, -14, -4, -26], [8, -12, 6, -25]].forEach(([bx, by, tx, ty]) => {
        let hg = ctx.createLinearGradient(bx, by, tx, ty);
        hg.addColorStop(0, bodyL); hg.addColorStop(1, '#ffdd00');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(bx - 2, by); ctx.lineTo(tx, ty); ctx.lineTo(bx + 3, by);
        ctx.closePath(); ctx.fill();
    });
    // Ear fin
    ctx.fillStyle = '#880800';
    ctx.beginPath(); ctx.moveTo(-1, -13); ctx.lineTo(-6, -24); ctx.lineTo(4, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.moveTo(-1, -14); ctx.lineTo(-4, -22); ctx.lineTo(2, -17); ctx.closePath(); ctx.fill();
    // Eye — reptile slit pupil
    ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(6, -7, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#222200';
    ctx.beginPath(); ctx.ellipse(6.5, -7, 1.5, 3.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(5, -8.5, 1.4, 1, -0.4, 0, Math.PI * 2); ctx.fill();
    // Fire breath (periodic)
    if (frames % 120 < 30) {
        let fireAmt = (frames % 120) / 30;
        ctx.save();
        ctx.globalAlpha = fireAmt * 0.8;
        ['#ffff00', '#ffaa00', '#ff4400'].forEach((fc, fi) => {
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.ellipse(22 + fi * 5 + fireAmt * 15, -1 + Math.sin(frames * 0.4 + fi) * 3,
                (4 - fi) * fireAmt, (3 - fi) * fireAmt, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
    ctx.restore(); // end head
    // FRONT LEGS
    drawDragonLeg(-9, 12, legBL, body);
    drawDragonLeg(12, 12, legFL, body);
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
// CAT CHARACTER — Fluffy, big-eyed, with animated whiskers and ears
// ─────────────────────────────────────────────────────────────────────────
function drawCat(ctx, p) {
    ctx.save();
    aplicarRig(ctx, p, 2);

    const pernas = posePernas(p, 32);
    let legFL = pernas.fl, legFR = pernas.fr, legBL = pernas.bl, legBR = pernas.br;
    let tailWave = Math.sin(frames * 0.35) * 14;
    let isBlinking = estaPiscando(p);
    let isSmiling = estaSorrindo(p);

    const body = '#ffaadd', bodyL = '#ffd0ee', bodyD = '#dd77bb', bodyLL = '#fff0f8';

    function catGrad(hx, hy, cx, cy, r) {
        return gradCache(`gt|${hx}|${hy}|${cx}|${cy}|${r}`, () => {
            let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
            g.addColorStop(0, bodyLL); g.addColorStop(0.4, bodyL); g.addColorStop(0.75, body); g.addColorStop(1, bodyD);
            return g;
        });
    }

    function drawCatLeg(lx, ly, angle) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle * Math.PI / 180);
        ctx.fillStyle = gradCache('gt|perna', () => {
            let lg = ctx.createRadialGradient(-3, 5, 0, 0, 11, 11);
            lg.addColorStop(0, bodyL); lg.addColorStop(1, bodyD);
            return lg;
        });
        ctx.beginPath(); ctx.ellipse(0, 8, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bodyD;
        ctx.beginPath(); ctx.ellipse(0, 18, 4.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Paw with toe beans
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 25, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffbbdd';
        [-3, 0, 3].forEach(dx => { ctx.beginPath(); ctx.arc(dx, 25, 1.5, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
    }

    // BIG CAT TAIL — curls up dramatically
    ctx.fillStyle = catGrad(-36, -8, -22, 10, 24);
    ctx.beginPath();
    ctx.moveTo(-15, 8);
    ctx.bezierCurveTo(-30, 2 + tailWave * 0.5, -50, 12 + tailWave, -44, 28 + tailWave);
    ctx.bezierCurveTo(-40, 38 + tailWave, -26, 34 + tailWave * 0.7, -18, 20);
    ctx.quadraticCurveTo(-15, 12, -15, 8);
    ctx.fill();
    // Tail floof tip
    ctx.fillStyle = bodyLL;
    ctx.beginPath(); ctx.ellipse(-44, 28 + tailWave, 7, 7, 0, 0, Math.PI * 2); ctx.fill();

    // REAR LEGS
    ctx.globalAlpha = 0.65;
    drawCatLeg(-10, 12, legBR);
    drawCatLeg(9, 12, legFR);
    ctx.globalAlpha = 1.0;

    // BODY — round fluffy
    ctx.fillStyle = catGrad(-14, -6, -10, 6, 18);
    ctx.beginPath(); ctx.ellipse(-10, 6, 14, 13, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = catGrad(-3, -14, 1, 4, 25);
    ctx.beginPath(); ctx.ellipse(1, 4, 22, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = catGrad(12, -14, 14, -3, 17);
    ctx.beginPath(); ctx.ellipse(13, -4, 12, 11, -0.3, 0, Math.PI * 2); ctx.fill();
    // Fluffy belly tuff
    let bG = ctx.createRadialGradient(4, 14, 0, 4, 16, 14);
    bG.addColorStop(0, bodyLL); bG.addColorStop(1, body);
    ctx.fillStyle = bG;
    ctx.beginPath(); ctx.ellipse(4, 16, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Dorsal rim light
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -10); ctx.quadraticCurveTo(-1, -20, 14, -13); ctx.stroke(); ctx.restore();

    // HEAD
    ctx.save();
    ctx.translate(14, -12 - Math.abs(Math.cos(p.runPhase)) * 1.5 * (1 - p.mistura));
    // Neck
    let nkG = ctx.createLinearGradient(-9, 12, 4, -12);
    nkG.addColorStop(0, bodyD); nkG.addColorStop(0.5, body); nkG.addColorStop(1, bodyL);
    ctx.fillStyle = nkG;
    ctx.beginPath();
    ctx.moveTo(-8, 12); ctx.quadraticCurveTo(-13, 2, -11, -4);
    ctx.lineTo(-2, -15); ctx.quadraticCurveTo(5, -7, 5, 2); ctx.lineTo(4, 12);
    ctx.closePath(); ctx.fill();
    // Cranium — very round cat head
    ctx.fillStyle = catGrad(-4, -14, 1, -5, 18);
    ctx.beginPath(); ctx.ellipse(1, -5, 15, 14, -0.08, 0, Math.PI * 2); ctx.fill();
    // Face fluff
    let fG = ctx.createRadialGradient(10, 2, 0, 10, 2, 12);
    fG.addColorStop(0, bodyLL); fG.addColorStop(1, body);
    ctx.fillStyle = fG;
    ctx.beginPath(); ctx.ellipse(10, 2, 10, 8, 0.1, 0, Math.PI * 2); ctx.fill();
    // Round muzzle / nose area
    ctx.fillStyle = catGrad(9, -3, 14, 0, 10);
    ctx.beginPath(); ctx.ellipse(13, -1, 8, 6, 0.1, 0, Math.PI * 2); ctx.fill();
    // Little pink nose
    ctx.fillStyle = '#ff88bb'; ctx.shadowColor = '#ff44aa'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.moveTo(17, -1); ctx.lineTo(15, 2); ctx.lineTo(19, 2); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // POINTY CAT EARS
    [[-7, -18, -12, -30, -4, -22], [5, -17, 2, -29, 11, -21]].forEach(([bx1, by1, tx, ty, bx2, by2]) => {
        ctx.fillStyle = catGrad(tx, ty, tx, ty - 4, 14);
        ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(tx, ty); ctx.lineTo(bx2, by2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff88bb';
        ctx.beginPath(); ctx.moveTo(bx1 + 1, by1); ctx.lineTo(tx, ty + 3); ctx.lineTo(bx2 - 1, by2); ctx.closePath(); ctx.fill();
    });
    // EYES — huge Sanrio-style
    if (isBlinking) {
        ctx.strokeStyle = '#550033'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1, -8); ctx.quadraticCurveTo(6, -4, 11, -8); ctx.stroke();
        ctx.fillStyle = 'rgba(255,100,160,0.35)';
        ctx.beginPath(); ctx.ellipse(12, -3, 4, 2.5, 0.2, 0, Math.PI * 2); ctx.fill();
    } else {
        // Left eye
        ctx.fillStyle = '#fafafa';
        ctx.beginPath(); ctx.ellipse(5.5, -8, 5.5, 5.5, -0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4424cc';
        ctx.beginPath(); ctx.ellipse(5.8, -8, 3.8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#110a33';
        ctx.beginPath(); ctx.ellipse(6.2, -8.2, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(4.5, -10, 1.7, 1.4, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(8, -6.5, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#550033'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(5.5, -8, 5.5, 5.5, -0.05, 0, Math.PI * 2); ctx.stroke();
        // Eyelash
        ctx.strokeStyle = '#550033'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0.5, -12.5); ctx.quadraticCurveTo(5.5, -15.5, 11, -12.5); ctx.stroke();
        // Blush
        ctx.fillStyle = 'rgba(255,100,160,0.32)';
        ctx.beginPath(); ctx.ellipse(13, -3, 4.5, 2.8, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // MOUTH
    if (isSmiling) {
        ctx.strokeStyle = '#aa4466'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(13, 3); ctx.quadraticCurveTo(15, 6, 20, 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(17, 2); ctx.quadraticCurveTo(18, 5, 22, 1); ctx.stroke();
    }
    // WHISKERS
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    let wWave = Math.sin(frames * 0.2) * 1.5;
    [[-2, 1.5], [1, 3.5], [-1, 5.5]].forEach(([wy, wa]) => {
        ctx.beginPath(); ctx.moveTo(9, wy + wWave); ctx.lineTo(22, wy - wa + wWave); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, wy + wWave); ctx.lineTo(-2, wy - wa + wWave); ctx.stroke();
    });
    ctx.restore();
    ctx.restore(); // end head
    // FRONT LEGS
    drawCatLeg(-9, 12, legBL);
    drawCatLeg(12, 12, legFL);
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
// RABBIT CHARACTER — Long ears, stocky body, bouncy movement
// ─────────────────────────────────────────────────────────────────────────
function drawRabbit(ctx, p) {
    ctx.save();
    aplicarRig(ctx, p, 2.5);

    const pernas = posePernas(p, 36);
    let legFL = pernas.fl, legFR = pernas.fr, legBL = pernas.bl, legBR = pernas.br;
    let earWave = Math.sin(frames * 0.28) * 6 + (p.onGround ? 0 : Math.sin(frames * 0.7) * 12);
    let isBlinking = estaPiscando(p);
    let isSmiling = estaSorrindo(p);

    const body = '#f4f4f4', bodyL = '#ffffff', bodyD = '#cccccc', bodyDeep = '#aaaaaa';
    const accent = '#ffbbcc'; // pink accents

    function rabbitGrad(hx, hy, cx, cy, r) {
        return gradCache(`co|${hx}|${hy}|${cx}|${cy}|${r}`, () => {
            let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
            g.addColorStop(0, bodyL); g.addColorStop(0.4, body); g.addColorStop(0.75, bodyD); g.addColorStop(1, bodyDeep);
            return g;
        });
    }

    function drawRabbitLeg(lx, ly, angle, isFront) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle * Math.PI / 180);
        ctx.fillStyle = gradCache('co|perna', () => {
            let lg = ctx.createRadialGradient(-4, 5, 0, 0, 12, 14);
            lg.addColorStop(0, bodyL); lg.addColorStop(1, bodyD);
            return lg;
        });
        // Rabbits have big chunky hind legs
        let ew = isFront ? 5 : 7, eh = isFront ? 10 : 13;
        ctx.beginPath(); ctx.ellipse(0, eh * 0.7, ew, eh, 0, 0, Math.PI * 2); ctx.fill();
        // Big round paw
        ctx.fillStyle = bodyD;
        ctx.beginPath(); ctx.ellipse(isFront ? 0 : 2, eh * 1.4 + 4, isFront ? 4 : 6, isFront ? 3 : 4.5, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // FLUFFY TAIL
    ctx.fillStyle = rabbitGrad(-38, -6, -28, 8, 16);
    ctx.beginPath(); ctx.arc(-28, 9, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyL;
    ctx.beginPath(); ctx.arc(-28, 8, 7, 0, Math.PI * 2); ctx.fill();

    // REAR LEGS
    ctx.globalAlpha = 0.65;
    drawRabbitLeg(-10, 14, legBR, false);
    drawRabbitLeg(10, 14, legFR, false);
    ctx.globalAlpha = 1.0;

    // BODY — very round, chubby
    ctx.fillStyle = rabbitGrad(-14, -6, -10, 7, 18);
    ctx.beginPath(); ctx.ellipse(-10, 7, 14, 14, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rabbitGrad(-2, -16, 1, 5, 27);
    ctx.beginPath(); ctx.ellipse(1, 5, 23, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rabbitGrad(12, -15, 14, -3, 17);
    ctx.beginPath(); ctx.ellipse(14, -4, 12, 11, -0.3, 0, Math.PI * 2); ctx.fill();
    // Soft belly
    let bG2 = ctx.createRadialGradient(4, 14, 0, 4, 14, 16);
    bG2.addColorStop(0, '#fff8f0'); bG2.addColorStop(1, body);
    ctx.fillStyle = bG2;
    ctx.beginPath(); ctx.ellipse(4, 15, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Rim light
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, -11); ctx.quadraticCurveTo(-1, -22, 14, -14); ctx.stroke(); ctx.restore();

    // HEAD
    ctx.save();
    ctx.translate(14, -13 - Math.abs(Math.cos(p.runPhase)) * 1.5 * (1 - p.mistura));
    // Neck
    let nkG = ctx.createLinearGradient(-9, 14, 4, -12);
    nkG.addColorStop(0, bodyD); nkG.addColorStop(0.5, body); nkG.addColorStop(1, bodyL);
    ctx.fillStyle = nkG;
    ctx.beginPath();
    ctx.moveTo(-8, 12); ctx.quadraticCurveTo(-13, 2, -11, -4);
    ctx.lineTo(-2, -15); ctx.quadraticCurveTo(5, -7, 5, 2); ctx.lineTo(4, 12);
    ctx.closePath(); ctx.fill();

    // BIG EARS — rabbit's signature feature
    // Inner pink part
    const earPairs = [[-3, -26, -10, earWave], [5, -25, 4, earWave * 0.7]];
    earPairs.forEach(([ex, ey, tiltX, tw], i) => {
        // Outer ear
        let earG = ctx.createLinearGradient(ex + tiltX, ey, ex + tiltX, ey - 22);
        earG.addColorStop(0, bodyD); earG.addColorStop(1, bodyL);
        ctx.fillStyle = earG;
        ctx.beginPath();
        ctx.ellipse(ex + tiltX, ey - 10 + tw, 6, 18, 0.1 * (i === 0 ? -1 : 1), 0, Math.PI * 2);
        ctx.fill();
        // Inner ear pink
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.ellipse(ex + tiltX, ey - 10 + tw, 3, 13, 0.1 * (i === 0 ? -1 : 1), 0, Math.PI * 2);
        ctx.fill();
    });

    // BIG ROUND HEAD
    ctx.fillStyle = rabbitGrad(-3, -14, 1, -5, 18);
    ctx.beginPath(); ctx.ellipse(1, -5, 14.5, 13, -0.08, 0, Math.PI * 2); ctx.fill();
    // Chubby cheeks
    ctx.fillStyle = rabbitGrad(9, -2, 14, 1, 12);
    ctx.beginPath(); ctx.ellipse(13, 1, 9, 7.5, 0.12, 0, Math.PI * 2); ctx.fill();
    // Cute nose — big round pink
    ctx.fillStyle = '#ff99bb'; ctx.shadowColor = '#ff66aa'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(17, 1, 3.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Nose line
    ctx.strokeStyle = '#cc4466'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(17, 3); ctx.lineTo(17, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, 6); ctx.lineTo(14, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, 6); ctx.lineTo(20, 9); ctx.stroke();
    // EYES — large innocent eyes
    if (isBlinking) {
        ctx.strokeStyle = '#220011'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1, -8); ctx.quadraticCurveTo(6, -4.5, 11, -8); ctx.stroke();
        ctx.fillStyle = 'rgba(255,150,180,0.32)';
        ctx.beginPath(); ctx.ellipse(12, -3, 4.5, 2.5, 0.3, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = '#f8f8f8';
        ctx.beginPath(); ctx.ellipse(5.5, -8, 5.5, 5.5, -0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#880033';
        ctx.beginPath(); ctx.ellipse(5.8, -8, 3.8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a0005';
        ctx.beginPath(); ctx.ellipse(6.2, -8.2, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(4.4, -10, 1.8, 1.4, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(8, -6, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#330011'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(5.5, -8, 5.5, 5.5, -0.05, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#330011'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -12.5); ctx.quadraticCurveTo(5.5, -15.5, 11, -12.5); ctx.stroke();
        // Blush
        ctx.fillStyle = 'rgba(255,100,140,0.3)';
        ctx.beginPath(); ctx.ellipse(13, -3, 4.5, 2.8, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // MOUTH — cute W mouth
    if (isSmiling) {
        ctx.strokeStyle = '#441122'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(13, 4); ctx.quadraticCurveTo(15, 7, 17, 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(17, 4); ctx.quadraticCurveTo(19, 7, 21, 4); ctx.stroke();
    }
    // WHISKERS
    ctx.save(); ctx.strokeStyle = 'rgba(200,200,200,0.9)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    let ww = Math.sin(frames * 0.18) * 1.5;
    [[0, 1], [2, 3.5], [4, 5.5]].forEach(([wy, wa]) => {
        ctx.beginPath(); ctx.moveTo(9, wy + ww); ctx.lineTo(22, wy - wa + ww); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, wy + ww); ctx.lineTo(-2, wy - wa + ww); ctx.stroke();
    });
    ctx.restore();
    ctx.restore(); // end head
    // FRONT LEGS
    drawRabbitLeg(-9, 13, legBL, true);
    drawRabbitLeg(12, 13, legFL, true);
    ctx.restore();
}


// Cores clareadas/escurecidas ficam em cache (antes eram recalculadas em todo frame)
const cacheCores = new Map();
function _ajustarCor(col, amount, fallback) {
    if (!col || col.startsWith('rgba') || col.startsWith('rgb')) return col || fallback;
    const chave = col + '|' + amount;
    let res = cacheCores.get(chave);
    if (res === undefined) {
        let r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
        const lim = v => Math.max(0, Math.min(255, v + amount));
        res = isNaN(r + g + b) ? col : `rgb(${lim(r)},${lim(g)},${lim(b)})`;
        cacheCores.set(chave, res);
    }
    return res;
}
function shadeLighter(col, amount) { return _ajustarCor(col, amount, '#fff'); }
function shadeDarker(col, amount) { return _ajustarCor(col, -amount, '#000'); }

// Perna estilo PS2 — formas arredondadas com sombreamento radial (gradientes em cache)
function drawLeg(ctx, x, y, w, h, angleDeg, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleDeg * Math.PI / 180);

    const lw = w;
    const light = shadeLighter(color, 70);
    const dark = shadeDarker(color, 50);
    const k = `leg|${color}|${w}|${h}|`;

    // Coxa — elipse com sombreamento 3D
    ctx.fillStyle = gradCache(k + 'coxa', () => {
        let g = ctx.createRadialGradient(-lw * 0.3, h * 0.07, 0, 0, h * 0.22, lw * 1.5);
        g.addColorStop(0, light); g.addColorStop(0.45, color); g.addColorStop(1, dark);
        return g;
    });
    ctx.beginPath();
    ctx.ellipse(0, h * 0.22, lw, h * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();

    // Joelho
    ctx.fillStyle = gradCache(k + 'joelho', () => {
        let g = ctx.createRadialGradient(-lw * 0.2, h * 0.50, 0, 0, h * 0.52, lw * 0.9);
        g.addColorStop(0, light); g.addColorStop(1, dark);
        return g;
    });
    ctx.beginPath();
    ctx.ellipse(0, h * 0.52, lw * 0.62, lw * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Canela — afinando
    ctx.fillStyle = gradCache(k + 'canela', () => {
        let g = ctx.createLinearGradient(-lw, h * 0.52, lw, h * 0.52);
        g.addColorStop(0, dark); g.addColorStop(0.35, light); g.addColorStop(1, dark);
        return g;
    });
    ctx.beginPath();
    ctx.moveTo(-lw * 0.54, h * 0.50);
    ctx.lineTo(lw * 0.54, h * 0.50);
    ctx.quadraticCurveTo(lw * 0.64, h * 0.75, lw * 0.38, h * 0.88);
    ctx.lineTo(-lw * 0.38, h * 0.88);
    ctx.quadraticCurveTo(-lw * 0.64, h * 0.75, -lw * 0.54, h * 0.50);
    ctx.fill();

    // Fetlock bump
    ctx.fillStyle = shadeDarker(color, 30);
    ctx.beginPath();
    ctx.ellipse(0, h * 0.88, lw * 0.42, lw * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hoof — rounded, dark, solid
    ctx.fillStyle = gradCache(`casco|${w}|${h}`, () => {
        let g = ctx.createLinearGradient(-lw * 0.45, h * 0.88, lw * 0.45, h * 1.1);
        g.addColorStop(0, '#3a3042'); g.addColorStop(0.4, '#2a2030'); g.addColorStop(1, '#14101a');
        return g;
    });
    ctx.beginPath();
    ctx.moveTo(-lw * 0.45, h * 0.88);
    ctx.lineTo(lw * 0.45, h * 0.88);
    ctx.quadraticCurveTo(lw * 0.55, h * 0.98, lw * 0.5, h * 1.09);
    ctx.quadraticCurveTo(0, h * 1.14, -lw * 0.5, h * 1.09);
    ctx.quadraticCurveTo(-lw * 0.55, h * 0.98, -lw * 0.45, h * 0.88);
    ctx.fill();

    ctx.restore();
}

function drawUnicorn(ctx, p) {
    let c = p.char;
    ctx.save();
    aplicarRig(ctx, p, 3);
    const aBase = ctx.globalAlpha;               // < 1 enquanto pisca por dano
    const alfa = (v) => { ctx.globalAlpha = aBase * v; };

    // ── EXPRESSÕES (ligadas a eventos) ──
    let isBlinking = estaPiscando(p);
    let isSmiling = estaSorrindo(p);

    // ── CICLO DE CORRIDA (ritmo da velocidade) + pose aérea suavizada ──
    const pernas = posePernas(p, 35);
    let legFrontL = pernas.fl, legFrontR = pernas.fr, legBackL = pernas.bl, legBackR = pernas.br;

    let bColor = c.body || '#ffffff';
    let maneCols = c.mane || ['#ff007f', '#00f0ff'];
    let ghost = (c.id === 8);
    if (ghost) alfa(0.72);

    const bodyLight = shadeLighter(bColor, 75);
    const bodyMid = bColor;
    const bodySh = shadeDarker(bColor, 38);
    const bodyDeep = shadeDarker(bColor, 66);
    const mane0 = maneCols[0];
    const mane1 = maneCols[1] || maneCols[0];

    // Smooth Gouraud-like radial body gradient
    function bGrad(hx, hy, cx, cy, r) {
        if (ghost) return bColor;
        return gradCache(`uc|${bColor}|${hx}|${hy}|${cx}|${cy}|${r}`, () => {
            let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
            g.addColorStop(0, bodyLight);
            g.addColorStop(0.38, bodyMid);
            g.addColorStop(0.72, bodySh);
            g.addColorStop(1, bodyDeep);
            return g;
        });
    }
    // Gradiente da crina/cauda
    function mGrad(x0, y0, x1, y1) {
        return gradCache(`um|${mane0}|${mane1}|${x0}|${y0}|${x1}|${y1}`, () => {
            let g = ctx.createLinearGradient(x0, y0, x1, y1);
            g.addColorStop(0, shadeLighter(mane0, 45));
            g.addColorStop(0.45, mane0);
            g.addColorStop(1, mane1);
            return g;
        });
    }

    const tailWave = Math.sin(frames * 0.28) * 10;
    const tailWave2 = Math.sin(frames * 0.44 + 1.1) * 6;
    const maneWave = Math.sin(frames * 0.35) * 5;
    const headBob = -Math.abs(Math.cos(p.runPhase)) * 1.5 * (1 - p.mistura); // cabeça no ritmo do passo

    // ═══════════════════════════════════════════════
    // CAMADA 1 — PATAS DE TRÁS (atrás do corpo — opacas, só mais escuras)
    // ═══════════════════════════════════════════════
    alfa(ghost ? 0.35 : 1.0);
    drawLeg(ctx, -11, 12, 6.5, 22, legBackR, bodyDeep);
    drawLeg(ctx, 8, 12, 6.5, 22, legFrontR, bodyDeep);
    alfa(ghost ? 0.72 : 1.0);

    // ═══════════════════════════════════════════════
    // LAYER 2 — TAIL (flowing bezier strands)
    // ═══════════════════════════════════════════════
    // Strand 1 — widest, behind
    ctx.fillStyle = mGrad(-44, -8, -14, 28);
    ctx.beginPath();
    ctx.moveTo(-17, 5);
    ctx.bezierCurveTo(-28, 2 + tailWave, -52, 14 + tailWave, -44, 28 + tailWave);
    ctx.bezierCurveTo(-40, 36 + tailWave, -26, 32 + tailWave2, -20, 18);
    ctx.quadraticCurveTo(-18, 10, -17, 5);
    ctx.fill();
    // Strand 2 — mid
    alfa(ghost ? 0.6 : 0.88);
    ctx.fillStyle = mGrad(-38, -6, -10, 22);
    ctx.beginPath();
    ctx.moveTo(-16, 3);
    ctx.bezierCurveTo(-25, -1 + tailWave2, -46, 9 + tailWave2, -38, 21 + tailWave2);
    ctx.bezierCurveTo(-32, 29 + tailWave2, -22, 23 + tailWave, -16, 12);
    ctx.closePath();
    ctx.fill();
    // Strand 3 — front wisp
    alfa(ghost ? 0.45 : 0.6);
    ctx.fillStyle = mGrad(-28, -4, -8, 15);
    ctx.beginPath();
    ctx.moveTo(-15, 1);
    ctx.quadraticCurveTo(-30, -1 + tailWave, -24, 12 + tailWave);
    ctx.quadraticCurveTo(-18, 18 + tailWave, -14, 8);
    ctx.fill();
    alfa(ghost ? 0.72 : 1.0);

    // ═══════════════════════════════════════════════
    // LAYER 3 — BODY (3 overlapping ellipses — PS2 mass)
    // ═══════════════════════════════════════════════

    // Rump / hip
    ctx.fillStyle = bGrad(-16, -8, -10, 4, 20);
    ctx.beginPath();
    ctx.ellipse(-12, 5, 16, 13, 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Main barrel (biggest, centre)
    ctx.fillStyle = bGrad(-4, -15, 1, 4, 28);
    ctx.beginPath();
    ctx.ellipse(0, 4, 23, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest / shoulder
    ctx.fillStyle = bGrad(12, -16, 14, -3, 18);
    ctx.beginPath();
    ctx.ellipse(14, -4, 13, 11, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Belly underline shadow
    ctx.strokeStyle = bodyDeep;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 17, 17, 4, 0, 0, Math.PI);
    ctx.stroke();

    // Dorsal highlight (rim light — classic PS2 top-light trick)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.quadraticCurveTo(-2, -20, 14, -13);
    ctx.stroke();
    ctx.restore();

    // ═══════════════════════════════════════════════
    // LAYER 4 — HEAD + NECK (clearly separate anatomy)
    // ═══════════════════════════════════════════════
    ctx.save();
    ctx.translate(14, -13 + headBob);

    // NECK — elongated smooth trapezoid
    ctx.fillStyle = gradCache(`un|${bColor}`, () => {
        let g = ctx.createLinearGradient(-10, 14, 5, -14);
        g.addColorStop(0, bodySh); g.addColorStop(0.45, bodyMid); g.addColorStop(1, bodyLight);
        return g;
    });
    ctx.beginPath();
    ctx.moveTo(-9, 14);
    ctx.quadraticCurveTo(-14, 4, -13, -3);
    ctx.lineTo(-2, -16);
    ctx.quadraticCurveTo(6, -8, 6, 2);
    ctx.lineTo(4, 14);
    ctx.closePath();
    ctx.fill();
    // Neck front rim highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.quadraticCurveTo(6, -8, -2, -16);
    ctx.stroke();

    // MANE — three flowing bezier strands
    // Back strand (largest)
    ctx.fillStyle = mGrad(-4, -17, -22, 12);
    ctx.beginPath();
    ctx.moveTo(-2, -15);
    ctx.bezierCurveTo(-12, -12 + maneWave, -28, -2 + maneWave, -22, 12 + maneWave);
    ctx.bezierCurveTo(-18, 18 + maneWave, -8, 14 + maneWave, -4, 6);
    ctx.closePath();
    ctx.fill();
    // Mid strand
    alfa(ghost ? 0.6 : 0.82);
    ctx.fillStyle = mGrad(0, -16, -16, 8);
    ctx.beginPath();
    ctx.moveTo(-1, -14);
    ctx.bezierCurveTo(-8, -10 + maneWave * 0.7, -20, 2 + maneWave * 0.7, -16, 10 + maneWave * 0.7);
    ctx.bezierCurveTo(-12, 16 + maneWave * 0.7, -4, 12, -2, 4);
    ctx.closePath();
    ctx.fill();
    alfa(ghost ? 0.72 : 1.0);
    // Forelock (small front tuft over forehead)
    ctx.fillStyle = mGrad(4, -15, -2, -8);
    ctx.beginPath();
    ctx.moveTo(2, -15);
    ctx.quadraticCurveTo(0, -10 + maneWave * 0.4, -4, -8 + maneWave * 0.4);
    ctx.quadraticCurveTo(-1, -14, 2, -15);
    ctx.fill();

    // EAR — pointed with inner colour
    // Outer ear
    ctx.fillStyle = bGrad(-4, -24, -1, -16, 9);
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(-7, -27);
    ctx.lineTo(5, -20);
    ctx.closePath();
    ctx.fill();
    // Inner ear (mane colour accent)
    ctx.fillStyle = mane0;
    ctx.beginPath();
    ctx.moveTo(-2, -15);
    ctx.lineTo(-5, -25);
    ctx.lineTo(3, -20);
    ctx.closePath();
    ctx.fill();

    // CRANIUM — large expressive round head (Spyro / Crash style)
    ctx.fillStyle = bGrad(-3, -14, 1, -5, 17);
    ctx.beginPath();
    ctx.ellipse(1, -6, 14, 12, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // MUZZLE — elongated horse snout, slightly separate
    ctx.fillStyle = bGrad(9, -5, 15, 0, 12);
    ctx.beginPath();
    ctx.ellipse(14, -1, 9, 6.5, 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Subtle underline shadow on snout
    ctx.strokeStyle = bodyDeep;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(14, 4, 7, 2, 0.1, 0, Math.PI);
    ctx.stroke();
    // Nostril (small half-oval, not a square)
    ctx.fillStyle = bodyDeep;
    ctx.beginPath();
    ctx.ellipse(18, 2, 2.2, 1.5, 0.3, 0, Math.PI);
    ctx.fill();

    // HORN — spiraled, glowing, properly angular (3 faces)
    let hornCol = (c.id === 4) ? '#fffacd' : '#ffe066';
    ctx.save();
    ctx.shadowColor = hornCol;
    ctx.shadowBlur = 12 + Math.sin(frames * 0.08) * 4;
    // Main horn face
    ctx.fillStyle = gradCache(`uh|${hornCol}`, () => {
        let g = ctx.createLinearGradient(5, -14, 10, -37);
        g.addColorStop(0, shadeDarker(hornCol, 20)); g.addColorStop(0.6, hornCol); g.addColorStop(1, '#ffffff');
        return g;
    });
    ctx.beginPath();
    ctx.moveTo(4, -14); ctx.lineTo(10, -37); ctx.lineTo(13, -13);
    ctx.closePath(); ctx.fill();
    // Shadow face
    ctx.fillStyle = shadeDarker(hornCol, 40);
    ctx.beginPath();
    ctx.moveTo(4, -14); ctx.lineTo(10, -37); ctx.lineTo(7, -14);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // Spiral grooves
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    [{ y: -20, t: 0.75 }, { y: -26, t: 0.5 }, { y: -31, t: 0.28 }].forEach(({ y, t }) => {
        ctx.beginPath();
        ctx.ellipse(8 + t, y, 1 + t * 3.5, 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.restore();

    // EYE — large Pixar/PS2 expressive eye
    if (p.assustado) {
        // Olho em "X" na animação de morte
        ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(3, -11); ctx.lineTo(9, -5);
        ctx.moveTo(9, -11); ctx.lineTo(3, -5);
        ctx.stroke();
    } else if (c.id === 9) {
        // Cyborg glowing lens
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#cc0000';
        ctx.beginPath(); ctx.ellipse(6, -8, 5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff3333';
        ctx.beginPath(); ctx.ellipse(6, -8, 2.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(4.2, -9.5, 1.4, 1.1, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    } else if (isBlinking) {
        ctx.strokeStyle = '#1a0a2a';
        ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2, -8); ctx.quadraticCurveTo(6.5, -4.5, 11, -8);
        ctx.stroke();
        // Rosy cheek blush
        ctx.fillStyle = 'rgba(255,130,155,0.38)';
        ctx.beginPath(); ctx.ellipse(13, -3, 4.5, 2.8, 0.3, 0, Math.PI * 2); ctx.fill();
    } else {
        // Sclera
        ctx.fillStyle = '#fafafa';
        ctx.beginPath(); ctx.ellipse(6, -8, 5.5, 5, -0.1, 0, Math.PI * 2); ctx.fill();
        // Iris
        let irisCol = (c.id === 1) ? '#336633' : (c.id === 6) ? '#8833ff' : '#2244cc';
        ctx.fillStyle = irisCol;
        ctx.beginPath(); ctx.ellipse(6.2, -8, 3.8, 3.8, 0, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#080815';
        ctx.beginPath(); ctx.ellipse(6.5, -8.2, 2.2, 2.7, 0, 0, Math.PI * 2); ctx.fill();
        // Main catchlight (Pixar-style — large)
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.beginPath(); ctx.ellipse(4.8, -9.8, 1.8, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
        // Secondary sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(9, -6.5, 0.8, 0, Math.PI * 2); ctx.fill();
        // Eye outline
        ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(6, -8, 5.5, 5, -0.1, 0, Math.PI * 2); ctx.stroke();
        // Upper eyelashes
        ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(1.5, -12); ctx.quadraticCurveTo(6, -14.5, 11.5, -12);
        ctx.stroke();
    }

    // MOUTH / SMILE
    ctx.strokeStyle = bodyDeep;
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    if (p.assustado) {
        // Boca em "O" de susto
        ctx.fillStyle = '#441122';
        ctx.beginPath(); ctx.ellipse(16.5, 4, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    } else if (isSmiling) {
        ctx.beginPath();
        ctx.moveTo(13, 3); ctx.quadraticCurveTo(16, 7, 20, 2);
        ctx.stroke();
        ctx.fillStyle = '#ff7799';
        ctx.beginPath();
        ctx.ellipse(16.5, 4, 2, 1.4, -0.1, 0, Math.PI);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(14, 3); ctx.lineTo(20, 2.5);
        ctx.stroke();
    }

    ctx.restore(); // end head

    // ═══════════════════════════════════════════════
    // LAYER 5 — FRONT LEGS (foreground, full brightness)
    // ═══════════════════════════════════════════════
    drawLeg(ctx, -10, 12, 7.5, 22, legBackL, bColor);
    drawLeg(ctx, 12, 12, 7.5, 22, legFrontL, bColor);

    // ═══════════════════════════════════════════════
    // LAYER 6 — WINGS (feathered bezier — when flying)
    // ═══════════════════════════════════════════════
    if (isFlying) {
        let flap = Math.sin(frames * 0.55) * 16;
        // (sem shadowBlur: o brilho do voo agora é um gradiente único desenhado atrás do personagem)
        ctx.fillStyle = 'rgba(210,240,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(2, -6);
        ctx.bezierCurveTo(-8, -18 + flap, -22, -28 + flap, -30, -24 + flap);
        ctx.bezierCurveTo(-22, -18 + flap, -10, -10 + flap, -2, -4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.bezierCurveTo(-8, -10 + flap * 0.5, -18, -12 + flap * 0.5, -22, -6 + flap * 0.5);
        ctx.bezierCurveTo(-14, -8 + flap * 0.5, -6, -6, 2, -2);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore(); // end drawUnicorn
}


function drawStar(ctx, x, y, size, collected, t, starType) {
    if (collected) return;
    let st = starType || STAR_TYPES[0];
    let pts = st.points || 6;
    let sz = st.size || size;
    let bob = Math.sin(t) * 5;

    ctx.save();
    ctx.translate(x, y + bob);
    // brilho pré-desenhado (sprite) no lugar do shadowBlur
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tg = sz * (3 + Math.sin(t * 2) * 0.5);
    ctx.drawImage(spriteLuz(st.glow), -tg / 2, -tg / 2, tg, tg);
    ctx.restore();
    ctx.rotate(t * 0.5);

    // Gradiente radial para visual rico
    let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
    grad.addColorStop(0, '#ffffff');
    // a Cósmica troca de cor como um arco-íris
    grad.addColorStop(0.3, st.id === 'cosmica' ? `hsl(${Math.round(t * 80) % 360},100%,68%)` : st.color);
    grad.addColorStop(1, st.glow);
    ctx.fillStyle = grad;

    // Desenha estrela com N pontas usando pts
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
        let angle = (i * Math.PI) / pts - Math.PI / 2;
        let r = (i % 2 === 0) ? sz : sz * 0.45;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = PALETA.textoContorno; ctx.lineWidth = 2;   // contorno: separa do fundo estrelado
    ctx.stroke();
    ctx.fill();

    // Brilho central (estrelas raras+)
    if (st.value >= 50) {
        ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Halo extra para estrelas épicas+
    if (st.value >= 500) {
        ctx.globalAlpha = 0.2 + Math.sin(t * 2) * 0.15;
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.arc(0, 0, sz * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Raras (100+): brilhinhos girando em volta — 2, ou 3 nas lendárias+
    if (st.value >= 100) {
        const n = st.value >= 1000 ? 3 : 2, img = spriteEstrelinha('#FFFFFF');
        for (let i = 0; i < n; i++) {
            const a = t * 1.6 + i * Math.PI * 2 / n, r = sz * 1.55, tam = 8 + sz * 0.25;
            ctx.drawImage(img, Math.cos(a) * r - tam / 2, Math.sin(a) * r - tam / 2, tam, tam);
        }
    }

    ctx.restore();

    // Label de valor para estrelas supremas+ (hard to miss)
    if (st.value >= 2500) {
        ctx.save();
        ctx.font = `700 ${Math.max(9, Math.floor(sz * 0.55))}px ${FONTE_JOGO}`;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        let label = st.value >= 10000 ? '10K' : (st.value >= 5000 ? '5K' : '2.5K');
        ctx.strokeText(label, x, y + bob - sz - 4);
        ctx.fillText(label, x, y + bob - sz - 4);
        ctx.restore();
    }
}

function drawPowerupItem(ctx, pu, t, offsetX) {
    if (pu.collected) return;
    const s = ESTILOS_POWERUP[pu.type];
    // "pop" ao aparecer na tela: cresce passando um pouco do tamanho e assenta (~0,3 s)
    if (pu.surgiu === undefined) pu.surgiu = frames;
    const ks = Math.min(1, (frames - pu.surgiu) / 18);
    const pop = ks < 1 ? Math.sin(ks * Math.PI * 0.5) * (1 + 0.25 * Math.sin(ks * Math.PI)) : 1;
    const respira = 1 + Math.sin(t * 3) * 0.05;
    const x = pu.x - offsetX;
    const y = pu.y + Math.sin(t * 1.4) * 7;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop * respira, pop * (2 - respira));   // respira: estica um pouco na vertical e na horizontal, alternando
    desenharPowerupInterno(ctx, s, s.r, t);
    ctx.restore();
}

// Cores pastel do tema "noite mágica"; cat: poder (anel lilás), tesouro (anel dourado), lendario (arco-íris)
const ESTILOS_POWERUP = {
    magnet: { cor: '#FF8CC6', label: '🧲', nome: 'Ímã!', cat: 'poder', r: 24 },
    shield: { cor: '#8FE3FF', label: '🛡️', nome: 'Escudo!', cat: 'poder', r: 24 },
    bonus: { cor: '#FFE08A', label: '✨', nome: 'Pontos x2!', cat: 'poder', r: 24 },
    slowmo: { cor: '#8FF0D8', label: '🌀', nome: 'Câmera lenta!', cat: 'poder', r: 24 },
    infjump: { cor: '#FFB27A', label: '🦘', nome: 'Pulo infinito!', cat: 'poder', r: 24 },
    shrink: { cor: '#FF9CB0', label: '🍄', nome: 'Mini!', cat: 'poder', r: 24 },
    giant: { cor: '#A8F07A', label: '🦖', nome: 'Gigante!', cat: 'poder', r: 24 },
    meteor: { cor: '#FF8F6B', label: '☄️', nome: 'Meteoro!', cat: 'poder', r: 24 },
    rocket: { cor: '#D9DEF0', label: '🚀', nome: 'Foguete!', cat: 'poder', r: 24 },
    blackhole: { cor: '#B98CFF', label: '🌌', nome: 'Buraco negro!', cat: 'poder', r: 24 },
    hover: { cor: '#8CC8FF', label: '🛸', nome: 'Flutuar!', cat: 'poder', r: 24 },
    nogap: { cor: '#9BEF9B', label: '🌉', nome: 'Ponte!', cat: 'poder', r: 24 },
    lucky: { cor: '#8FF0B8', label: '🍀', nome: 'Sorte!', cat: 'tesouro', r: 24 },
    starchest: { cor: '#FFD27A', label: '📦', nome: 'Baú de estrelas!', cat: 'tesouro', r: 27 },
    coinshower: { cor: '#FFE98A', label: '🌧️', nome: 'Chuva de estrelas!', cat: 'tesouro', r: 27 },
    rainbow: { cor: '#FFB3E6', label: '🌈', nome: 'Arco-íris!', cat: 'tesouro', r: 27 },
    jackpot: { cor: '#FFC56B', label: '🎰', nome: 'Jackpot!', cat: 'tesouro', r: 27 },
    omni: { cor: '#FFFFFF', label: '🌟', nome: 'OMNI!', cat: 'lendario', r: 30 }
};
const COR_ANEL_PU = { poder: '#B9A4FF', tesouro: '#FFD54A', lendario: '#FFFFFF' };

// Bolha de vidro do power-up, pré-desenhada uma vez por tipo (o emoji também: nada de texto por quadro)
function spriteBolhaPowerup(s) {
    const esc = 3, tam = Math.ceil(s.r * 2 * esc + 8);
    return spriteCache('pu|' + s.label + '|' + s.r, tam, (g, T) => {
        const m = T / 2, r = s.r * esc;
        // interior: vidro escuro tingido com a cor do poder
        const dentro = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
        dentro.addColorStop(0, rgbaDe(corMix(s.cor, '#FFFFFF', 0.35), 0.95));
        dentro.addColorStop(0.55, rgbaDe(corMix(s.cor, COR_NOITE, 0.45), 0.92));
        dentro.addColorStop(1, rgbaDe(corMix(s.cor, COR_NOITE, 0.75), 0.95));
        g.fillStyle = dentro; g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();
        // contorno escuro (padrão do jogo) + aro claro
        g.lineWidth = 2.2 * esc; g.strokeStyle = PALETA.textoContorno;
        g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1.2 * esc; g.strokeStyle = rgbaDe(corMix(s.cor, '#FFFFFF', 0.5), 0.9);
        g.beginPath(); g.arc(m, m, r - 1.6 * esc, 0, Math.PI * 2); g.stroke();
        // ícone
        g.font = `${Math.round(r * 1.05)}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(s.label, m, m + r * 0.06);
        // reflexo do vidro por cima (arco claro no alto à esquerda + pontinho)
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.2 * esc; g.lineCap = 'round';
        g.beginPath(); g.arc(m, m, r * 0.72, Math.PI * 1.08, Math.PI * 1.42); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath(); g.arc(m - r * 0.22, m - r * 0.68, 1.4 * esc, 0, Math.PI * 2); g.fill();
    });
}

function desenharPowerupInterno(ctx, s, r, t) {
    // brilho pulsante (sprite, sem shadowBlur)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tg = r * (3.2 + Math.sin(t * 2) * 0.4);
    ctx.drawImage(spriteLuz(s.cat === 'lendario' ? `hsl(${(Math.round(t * 2) * 30) % 360},100%,75%)` : s.cor), -tg / 2, -tg / 2, tg, tg);
    ctx.restore();

    // anel da categoria girando (tracinhos), por fora da bolha
    const corAnel = s.cat === 'lendario' ? `hsl(${(Math.round(t * 2) * 30) % 360},100%,75%)` : COR_ANEL_PU[s.cat];
    ctx.save();
    ctx.rotate(t * (s.cat === 'tesouro' ? -0.9 : 0.7));
    ctx.strokeStyle = corAnel; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const n = s.cat === 'poder' ? 6 : 8;
    for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n;
        ctx.beginPath(); ctx.arc(0, 0, r + 5, a, a + Math.PI / n * 0.9); ctx.stroke();
    }
    ctx.restore();

    // bolha com o ícone (balança de leve)
    const b = spriteBolhaPowerup(s), tam = r * 2 + 8 / 3;
    ctx.save();
    ctx.rotate(Math.sin(t * 2.2) * 0.12);
    ctx.drawImage(b, -tam / 2, -tam / 2, tam, tam);
    ctx.restore();

    // brilhinhos em órbita (tesouros e lendário têm mais)
    const img = spriteEstrelinha(s.cat === 'poder' ? '#FFFFFF' : '#FFE08A');
    const nb = s.cat === 'poder' ? 2 : 3;
    for (let i = 0; i < nb; i++) {
        const a = t * 1.8 + i * Math.PI * 2 / nb, rr = r + 9;
        const tb = 7 + 3 * Math.sin(t * 4 + i);
        ctx.drawImage(img, Math.cos(a) * rr - tb / 2, Math.sin(a) * rr * 0.6 - tb / 2, tb, tb);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// EFEITOS DOS PODERES ATIVOS — cada poder mostra no personagem (e na tela) que está valendo
// ─────────────────────────────────────────────────────────────────────────
const CORES_PODER = {
    rocket: ['#FFE08A', '#FFB347', '#FF7A1A'], meteor: ['#FFB347', '#FF7A1A', '#FF4500'],
    bonus: '#FFE08A', lucky: '#8FF0B8', infjump: '#FFB27A', shrink: '#FF9CB0', giant: '#A8F07A',
    hover: '#8CC8FF', blackhole: '#B98CFF', slowmo: '#8FF0D8', voo: '#FFFFFF'
};

// Partículas dos poderes (1 vez por passo de física, pelo pool — sem arrays novos)
function emitirEfeitosPoderes() {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2, f = frames;
    const ale = (a) => (Math.random() - 0.5) * a;
    if (isRocketActive) {
        // jato de fogo saindo de trás + fumaça lilás
        for (let i = 0; i < 2; i++) emitirParticula({ x: player.x - 2, y: cy + 4 + ale(10), vx: -7 - Math.random() * 5, vy: ale(1.5), life: 0.55, size: 12 + Math.random() * 8, forma: 'chama', color: CORES_PODER.rocket[(f + i) % 3] });
        if (f % 3 === 0) emitirParticula({ x: player.x - 18, y: cy + 4, vx: -4, vy: ale(1), life: 0.9, size: 20, forma: 'fumaca', color: '#B9A4FF' });
    }
    if (isMeteorActive && f % 2 === 0) {
        emitirParticula({ x: cx + ale(player.w), y: cy + ale(player.h), vx: -2 - Math.random() * 2, vy: -1.5 - Math.random(), life: 0.6, size: 10 + Math.random() * 6, forma: 'chama', color: CORES_PODER.meteor[f % 3] });
    }
    if (isBonusActive && f % 6 === 0) emitirParticula({ x: cx + ale(player.w * 1.2), y: cy + ale(player.h), vx: ale(0.6), vy: -1.6, life: 0.9, size: 11, forma: 'estrela', color: CORES_PODER.bonus });
    if (isLuckyActive && f % 7 === 0) emitirParticula({ x: cx + ale(player.w * 1.3), y: cy + ale(player.h), vx: ale(0.5), vy: -1.2, life: 1, size: 12, forma: 'brilho', color: CORES_PODER.lucky });
    if (isInfJumpActive && f % 8 === 0) emitirParticula({ x: cx + ale(player.w), y: player.y + player.h, vx: -1.5, vy: 0.8, life: 0.6, size: 12, forma: 'faisca', color: CORES_PODER.infjump });
    if (isShrinkActive && f % 4 === 0) emitirParticula({ x: player.x, y: cy, vx: -2, vy: ale(0.6), life: 0.6, size: 9, forma: 'brilho', color: CORES_PODER.shrink });
    if (isHoverActive && f % 3 === 0) emitirParticula({ x: cx + ale(30), y: player.y + player.h + 6, vx: -1, vy: 2.2, life: 0.6, size: 9, forma: 'brilho', color: CORES_PODER.hover });
    if (isBlackHoleActive && f % 2 === 0) {
        // poeira de estrelas sendo sugada em espiral
        const a = Math.random() * Math.PI * 2, r = 110 + Math.random() * 40;
        emitirParticula({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r / 28 + Math.sin(a) * 2, vy: -Math.sin(a) * r / 28 - Math.cos(a) * 2, life: 0.55, size: 8, forma: 'brilho', color: f % 4 ? CORES_PODER.blackhole : '#FF9CCB' });
    }
    if (isSlowMoActive && f % 10 === 0) emitirParticula({ x: Math.random() * cw, y: Math.random() * ch, vx: -0.5, vy: -0.3, life: 1.4, size: 10, forma: 'bolha', color: CORES_PODER.slowmo });
    if (isFlying && f % 5 === 0) emitirParticula({ x: player.x + 4, y: cy - 4 + ale(10), vx: -2.5, vy: 0.6, life: 0.9, size: 10, forma: 'petala', color: '#FFFFFF' });
}

// Selos sobre a cabeça (x2, canguru, trevo, ampulheta): mostram de longe quais poderes estão valendo
function spriteSelo(txt, cor) {
    return spriteCache('selo|' + txt + '|' + cor, 72, (g, T) => {
        const m = T / 2, r = T * 0.36;
        g.fillStyle = corMix(cor, COR_NOITE, 0.55); g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();
        g.lineWidth = 5; g.strokeStyle = cor; g.stroke();
        g.font = `700 ${Math.round(r * 1.15)}px 'Fredoka', 'Segoe UI Emoji', 'Segoe UI', sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 5; g.strokeStyle = PALETA.textoContorno; g.strokeText(txt, m, m + 2);
        g.fillStyle = PALETA.texto; g.fillText(txt, m, m + 2);
    });
}
const SELOS_PODER = [
    ['bonus', 'x2', '#FFE08A'], ['infjump', '🦘', '#FFB27A'], ['lucky', '🍀', '#8FF0B8'], ['slowmo', '⏳', '#8FF0D8']
];
const _selosAtivos = [];

// Desenho por trás do personagem (auras grandes) — chamado antes de desenharUnicornio
function desenharEfeitosPoderes(ctx) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2, t = frames;
    ctx.save();
    if (isBlackHoleActive) {
        // vórtice girando atrás do personagem
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(spriteLuz(CORES_PODER.blackhole), cx - 90, cy - 90, 180, 180);
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const a = -t * 0.08 + i * Math.PI * 2 / 3;
            ctx.strokeStyle = i === 1 ? 'rgba(255,156,203,0.55)' : 'rgba(185,140,255,0.6)'; ctx.lineWidth = 4 - i;
            ctx.beginPath(); ctx.arc(cx, cy, 48 + i * 12, a, a + 1.6); ctx.stroke();
        }
    }
    if (isHoverActive) {
        // raio de disco voador: cone de luz embaixo + disco brilhando
        const pe = player.y + player.h;
        ctx.fillStyle = gradCache('hoverCone', () => {
            const gr = ctx.createLinearGradient(0, 0, 0, 120);
            gr.addColorStop(0, 'rgba(140,200,255,0.35)'); gr.addColorStop(1, 'rgba(140,200,255,0)');
            return gr;
        });
        ctx.save(); ctx.translate(0, pe);
        ctx.beginPath(); ctx.moveTo(cx - 22, 0); ctx.lineTo(cx + 22, 0); ctx.lineTo(cx + 46, 120); ctx.lineTo(cx - 46, 120); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(spriteLuz(CORES_PODER.hover), cx - 40, pe - 18, 80, 36);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(200,235,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, pe + 4, 30, 6 + Math.sin(t * 0.2), 0, 0, Math.PI * 2); ctx.stroke();
    }
    // auras de fogo / gigante / mini / pontos
    ctx.globalCompositeOperation = 'lighter';
    if (isRocketActive || isMeteorActive) {
        const tg = 150 + Math.sin(t * 0.5) * 12;
        ctx.drawImage(spriteLuz('#FF8A3A'), cx - tg / 2, cy - tg / 2, tg, tg);
    }
    if (isGiantActive) ctx.drawImage(spriteLuz(CORES_PODER.giant), cx - 110, cy - 100, 220, 200);
    if (isShrinkActive) ctx.drawImage(spriteLuz(CORES_PODER.shrink), cx - 40, cy - 40, 80, 80);
    if (isBonusActive) ctx.drawImage(spriteLuz(CORES_PODER.bonus), cx - 70, cy - 70, 140, 140);
    ctx.restore();
}

// Desenho por cima do personagem: selos dos poderes + labareda do foguete
function desenharSelosPoderes(ctx) {
    const cx = player.x + player.w / 2;
    if (isRocketActive) {
        const cy = player.y + player.h / 2 + 4, L = 34 + Math.sin(frames * 0.9) * 8;
        ctx.save();
        ctx.fillStyle = 'rgba(255,122,26,0.85)';
        ctx.beginPath(); ctx.moveTo(player.x + 6, cy - 9); ctx.quadraticCurveTo(player.x - L * 0.6, cy - 6, player.x - L, cy); ctx.quadraticCurveTo(player.x - L * 0.6, cy + 6, player.x + 6, cy + 9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,150,0.95)';
        ctx.beginPath(); ctx.moveTo(player.x + 4, cy - 4); ctx.quadraticCurveTo(player.x - L * 0.35, cy - 2, player.x - L * 0.55, cy); ctx.quadraticCurveTo(player.x - L * 0.35, cy + 2, player.x + 4, cy + 4); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    _selosAtivos.length = 0;
    for (const s of SELOS_PODER) {
        const ativo = (s[0] === 'bonus' && isBonusActive) || (s[0] === 'infjump' && isInfJumpActive) || (s[0] === 'lucky' && isLuckyActive) || (s[0] === 'slowmo' && isSlowMoActive);
        if (ativo) _selosAtivos.push(s);
    }
    if (!_selosAtivos.length) return;
    const tam = 34, gap = 5, larg = _selosAtivos.length * (tam + gap) - gap;
    const y = player.y - tam - 22 + Math.sin(frames * 0.1) * 3;
    _selosAtivos.forEach((s, i) => {
        const x = cx - larg / 2 + i * (tam + gap);
        ctx.drawImage(spriteSelo(s[1], s[2]), x, y, tam, tam);
    });
}

// Moldura colorida na tela enquanto um poder "grande" está ativo
function desenharVinhetaPoder(ctx) {
    const cor = isSlowMoActive ? CORES_PODER.slowmo : isBlackHoleActive ? CORES_PODER.blackhole
        : isRocketActive ? '#FF8A3A' : isGiantActive ? CORES_PODER.giant : isBonusActive ? CORES_PODER.bonus : null;
    if (!cor) return;
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(frames * 0.08);
    ctx.fillStyle = gradCache(`vinheta|${cor}|${cw}|${ch}`, () => {
        const gr = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.55);
        gr.addColorStop(0, rgbaDe(cor, 0)); gr.addColorStop(1, rgbaDe(cor, 0.6));
        return gr;
    });
    ctx.fillRect(0, 0, cw, ch);
    if (isSlowMoActive) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(120,220,255,0.07)'; ctx.fillRect(0, 0, cw, ch); }
    ctx.restore();
}

// Draws the shield ring around the player when shield is active
function drawShieldRing(ctx, p) {
    if (!isShieldActive) return;
    let cx = p.x + p.w / 2;
    let cy = p.y + p.h / 2;
    let pulse = 1 + Math.sin(frames * 0.12) * 0.06;
    let r = 38 * pulse;
    ctx.save();
    // Bolha: preenchimento suave
    ctx.fillStyle = 'rgba(155,231,255,0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Arcos girando: traço largo e translúcido por baixo faz o "brilho" (sem shadowBlur)
    let rot = frames * 0.04;
    for (const [larg, cor] of [[9, 'rgba(155,231,255,0.25)'], [3, 'rgba(210,245,255,0.95)']]) {
        ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            let a = rot + (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, a, a + Math.PI * 0.38);
            ctx.stroke();
        }
    }
    // reflexo
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.75, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
    ctx.restore();
}

// Draws the magnet field radius indicator
function drawMagnetField(ctx, p) {
    let passiveRad = p.char.magnetic || 0;
    if (!isMagnetActive && passiveRad === 0) return;

    let rad = isMagnetActive ? 180 : passiveRad;
    let cx = p.x + p.w / 2;
    let cy = p.y + p.h / 2;
    ctx.save();
    if (isMagnetActive) {
        // ímã ativo: 3 ondas rosa que se fecham no personagem (mostram o "puxão")
        ctx.strokeStyle = '#FF8CC6';
        for (let i = 0; i < 3; i++) {
            const k = ((frames * 0.012) + i / 3) % 1;          // 0 = borda, 1 = chegou no personagem
            ctx.globalAlpha = 0.35 * Math.sin(k * Math.PI);
            ctx.lineWidth = 1 + 2 * k;
            ctx.beginPath(); ctx.arc(cx, cy, rad * (1 - k) + 20 * k, 0, Math.PI * 2); ctx.stroke();
        }
    } else {
        // ímã natural do personagem: círculo pontilhado discreto
        ctx.strokeStyle = 'rgba(255,215,0,0.1)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -(frames * 1.2);
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();
}

// Pena do power-up de voo: pré-desenhada uma vez (cabo curvo, duas metades desiguais com fendas e fiozinhos)
function spritePena() {
    return spriteCache('penaVoo', 160, (g, T) => {
        const k = T / 64;          // desenha num espaço 64×64
        g.scale(k, k);
        g.translate(32, 34); g.rotate(-0.55);   // pena inclinada, cabo embaixo à esquerda
        // contorno da pena (metade de cima mais estreita, de baixo mais larga), com 2 fendas
        const vane = new Path2D();
        vane.moveTo(0, 26);                                     // começo da parte com fios (perto do cabo)
        vane.bezierCurveTo(-9, 18, -10, 4, -7, -8);             // borda esquerda
        vane.lineTo(-4.5, -9);                                  // fenda 1
        vane.bezierCurveTo(-6, -18, -3, -26, 1, -29);           // até a ponta
        vane.bezierCurveTo(6, -24, 8, -14, 7, -3);              // borda direita
        vane.lineTo(4.5, -1.5);                                 // fenda 2
        vane.bezierCurveTo(8, 6, 6, 18, 0, 26);
        vane.closePath();
        g.lineJoin = 'round';
        g.strokeStyle = PALETA.nuvemContorno; g.lineWidth = 3.2; g.stroke(vane);
        const grad = g.createLinearGradient(0, -29, 0, 26);
        grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.55, '#F2ECFF'); grad.addColorStop(1, '#C9B8FF');
        g.fillStyle = grad; g.fill(vane);
        // fiozinhos (barbas) diagonais saindo do cabo
        g.save(); g.clip(vane);
        g.strokeStyle = 'rgba(140,110,200,0.45)'; g.lineWidth = 0.8;
        for (let y = -24; y < 24; y += 3.2) {
            g.beginPath(); g.moveTo(0.3, y); g.lineTo(-10, y - 6); g.stroke();
            g.beginPath(); g.moveTo(0.3, y); g.lineTo(10, y - 5); g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,0.6)';   // brilho
        g.beginPath(); g.ellipse(-3.5, -12, 1.6, 7, 0.15, 0, Math.PI * 2); g.fill();
        g.restore();
        // cabo (raque) levemente curvo, passando do fim da pena
        g.lineCap = 'round';
        g.strokeStyle = PALETA.nuvemContorno; g.lineWidth = 3.4;
        g.beginPath(); g.moveTo(1, -27); g.quadraticCurveTo(0.6, 4, -1.5, 31); g.stroke();
        g.strokeStyle = '#FFF6E8'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(1, -27); g.quadraticCurveTo(0.6, 4, -1.5, 31); g.stroke();
    });
}

function drawFeather(ctx, x, y, size, collected, t) {
    if (collected) return;
    ctx.save();
    ctx.translate(x, y + Math.sin(t) * 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(spriteLuz('#DCD0FF'), -size * 1.8, -size * 1.8, size * 3.6, size * 3.6);
    ctx.restore();
    // balança como uma pena caindo (vai e volta, inclinando)
    ctx.rotate(Math.sin(t * 0.9) * 0.35);
    const tam = size * 3;
    ctx.drawImage(spritePena(), -tam / 2, -tam / 2, tam, tam);
    // brilhinho piscando na ponta
    const b = 6 + 3 * Math.sin(t * 3);
    ctx.drawImage(spriteEstrelinha('#FFFFFF'), size * 0.35 - b / 2, -size * 1.05 - b / 2, b, b);
    ctx.restore();
}

// Só escreve no DOM quando o texto muda (evita trabalho de layout a cada frame)
const starsPill = starsDisplay.parentElement;
let estrelasHudAntes = -1; // -1 = partida nova (não pula no primeiro quadro)

function setTexto(el, txt) {
    if (el._txt !== txt) { el._txt = txt; el.textContent = txt; }
}

const faseDisplay = document.getElementById('fase-display');
let faseDisplayIdx = -1;
function updateHUD() {
    // pílula da fase: nome completo no computador, curto no celular; a borda leva a cor da fase
    const estreito = (gameContainer.clientWidth || cw) < 600;
    const ph = PHASES[currentPhase];
    setTexto(faseDisplay, estreito ? `✦ Fase ${currentPhase + 1}/${PHASES.length} ✦` : `✦ Fase ${currentPhase + 1}/${PHASES.length}: ${ph.name} ✦`);
    if (faseDisplayIdx !== currentPhase) {
        faseDisplayIdx = currentPhase;
        faseDisplay.style.setProperty('--cor-fase', FASES_VISUAL[currentPhase].platform.edge);
    }
    setTexto(scoreDisplay, String(Math.floor(score)));
    // estrelas que vão para a loja (já com a conversão), com um pulinho a cada ganho
    const paraLoja = Math.floor(starsCollected * CONVERSAO_ESTRELAS);
    if (paraLoja > estrelasHudAntes && estrelasHudAntes >= 0) {
        starsPill.classList.remove('ganhou');
        void starsPill.offsetWidth; // reinicia a animação
        starsPill.classList.add('ganhou');
    }
    estrelasHudAntes = paraLoja;
    setTexto(starsDisplay, paraLoja.toLocaleString());
    setTexto(speedDisplay, (gameSpeed / (window.innerWidth > 800 ? 7 : 5)).toFixed(1));
}

// Remove do array (no mesmo lugar, sem criar array novo) os itens que já ficaram para trás
function removerAntigos(arr, fimX) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) {
        if (fimX(arr[i]) > distance - 100) arr[j++] = arr[i];
    }
    arr.length = j;
}

// ─────────────────────────────────────────────────────────────────────────
// LOOP PRINCIPAL — passo fixo de física + render a cada quadro da tela
// ─────────────────────────────────────────────────────────────────────────
let rafId = null, ultimoTempo = 0, acumulador = 0;

function iniciarLoop() {
    if (rafId !== null) return; // nunca dois loops ao mesmo tempo
    ultimoTempo = 0;
    acumulador = 0;
    rafId = requestAnimationFrame(loop);
}

function loop(agora) {
    rafId = null;
    if ((state !== 'playing' && state !== 'dying') || isPaused) return;
    if (!ultimoTempo) ultimoTempo = agora;
    acumulador += Math.min(agora - ultimoTempo, 100) / 1000;
    ultimoTempo = agora;
    let passos = 0;
    while (acumulador >= PASSO_FISICA && passos < 6) {
        step();
        acumulador -= PASSO_FISICA;
        passos++;
        if (state !== 'playing' && state !== 'dying') return;
    }
    if (passos === 6) acumulador = 0;
    renderInterpolado(acumulador / PASSO_FISICA);
    updateHUD();
    rafId = requestAnimationFrame(loop);
}

// ─── Interpolação entre passos de física ───
// A física roda a 60 passos/s; em telas de 120/144 Hz desenhamos o estado "entre" dois passos
// para a rolagem e o personagem andarem lisos em vez de aos trancos.
const CAMPOS_INTERP = ['y', 'vy', 'rot', 'spin', 'runPhase', 'mistura', 'scaleX', 'scaleY', 'w', 'h'];
let distAnt = 0;
// Relógio da animação (crina, asas, brilhos): anda com a câmera lenta, para no hit-pause e é interpolado
let tempoAnim = 0, tempoAnimAnt = 0, tempoRender = 0;
let alfaRender = 1;   // fração entre o passo anterior e o atual (usada também por partículas)

function guardarEstadoAnterior() {
    distAnt = distance;
    tempoAnimAnt = tempoAnim;
    if (!player) return;
    player.ant = player.ant || {};
    for (const k of CAMPOS_INTERP) player.ant[k] = player[k];
    for (const p of platforms) p.yAnt = p.y;
}

function renderInterpolado(alfa) {
    if (!player || !player.ant || state === 'dying' && passosMorte >= PASSOS_ANIM_MORTE - PASSOS_HITPAUSE_MORTE) {
        tempoRender = tempoAnim; alfaRender = 1;
        render(); return;
    }
    alfa = Math.max(0, Math.min(1, alfa));
    const lerp = (a, b) => a + (b - a) * alfa;
    alfaRender = alfa;
    tempoRender = lerp(tempoAnimAnt, tempoAnim);
    // troca temporariamente os valores reais pelos interpolados, desenha e restaura
    const real = { distance };
    for (const k of CAMPOS_INTERP) real[k] = player[k];
    distance = lerp(distAnt, distance);
    for (const k of CAMPOS_INTERP) if (player.ant[k] !== undefined) player[k] = lerp(player.ant[k], player[k]);
    const platY = platforms.map(p => p.y);
    for (const p of platforms) if (p.yAnt !== undefined) p.y = lerp(p.yAnt, p.y);
    render();
    platforms.forEach((p, i) => { p.y = platY[i]; });
    for (const k of CAMPOS_INTERP) player[k] = real[k];
    distance = real.distance;
    alfaRender = 1;
}

const DICAS_TUTORIAL = [
    { dist: 200, teclado: 'Espaço / ↑ / clique: pular (segure para ir mais alto)', toque: 'Toque na tela: pular (segure para ir mais alto)' },
    { dist: 1800, teclado: 'Aperte de novo no ar: pulo duplo!', toque: 'Toque de novo no ar: pulo duplo!' },
    { dist: 3600, teclado: '→ ou D: Dash atravessa barreiras e blocos (espinho, só pulando!)', toque: 'DASH atravessa barreiras e blocos (espinho, só pulando!)' },
    { dist: 5400, teclado: '↓ ou S no ar: Slam (quebra blocos)', toque: 'SLAM no ar: desce com tudo (quebra blocos)' },
    { dist: 7200, teclado: 'P ou Esc: pausar', toque: '⏸ para pausar' }
];

// Multiplicador de pontos atual (bônus, sorte, personagem, upgrades, câmera lenta)
function multiplicadorPontos() {
    let smGain = isSlowMoActive ? (1 + ((unlockedUpgrades.slowmo_score || 0) * 0.5)) : 1;
    let luckyM = isLuckyActive ? (5 + ((unlockedUpgrades.lucky_mult || 0) * 2)) : 1;
    return (isBonusActive ? 2 : 1) * luckyM * (player.char.pointsMult || 1.0) * (1 + (unlockedUpgrades.score * 0.2)) * smGain;
}

// Atualiza um timer de power-up; devolve false quando acaba
function passoTimer(ativo, tempo, display, timerEl, dt) {
    if (!ativo) return [false, 0];
    tempo -= dt;
    setTexto(timerEl, Math.max(0, tempo).toFixed(1) + 's');
    // pílula pisca nos últimos 2 s (avisa que o poder vai acabar); só mexe no DOM quando muda
    const acabando = tempo > 0 && tempo < AVISO_FIM_PODER;
    if (display._acabando !== acabando) { display._acabando = acabando; display.classList.toggle('acabando', acabando); }
    if (tempo <= 0) { display.classList.add('hidden'); return [false, 0]; }
    return [true, tempo];
}

let escalaTempo = 1;          // 1 = normal; vai suavemente até ESCALA_SLOWMO na câmera lenta
let tremorX = 0, tremorY = 0; // deslocamento do tremor, sorteado por passo (não por quadro desenhado)

function sortearTremor() {
    screenShake = screenShake > 0.5 ? screenShake * DECAIMENTO_TREMOR : 0;
    tremorX = screenShake ? (Math.random() - 0.5) * screenShake : 0;
    tremorY = screenShake ? (Math.random() - 0.5) * screenShake : 0;
}

function step() {
    guardarEstadoAnterior();
    if (state === 'dying') { passoMorte(); return; }
    if (sleepFrames > 0) { sleepFrames--; return; } // hit-pause
    frames++;

    const dt = PASSO_FISICA;
    // Câmera lenta desacelera a física inteira (o alcance do pulo não muda), com transição suave
    escalaTempo += ((isSlowMoActive ? ESCALA_SLOWMO : 1) - escalaTempo) * SUAVIZACAO_SLOWMO;
    const ts = escalaTempo;
    tempoAnim += PASSO_FISICA * ts;

    // Textos flutuantes
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y -= 2.5;
        ft.life -= 0.02;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // ── Timers dos power-ups ──
    [isFlying, flightTimeLeft] = passoTimer(isFlying, flightTimeLeft, powerupDisplay, flightTimerDisplay, dt);
    [isMagnetActive, magnetTimeLeft] = passoTimer(isMagnetActive, magnetTimeLeft, magnetDisplay, magnetTimerDisplay, dt);
    if (isShieldActive) {
        if (shieldTimeLeft > 9000) setTexto(shieldTimerDisplay, '∞'); // escudo inicial: dura até ser usado
        else [isShieldActive, shieldTimeLeft] = passoTimer(true, shieldTimeLeft, shieldDisplay, shieldTimerDisplay, dt);
    }
    [isBonusActive, bonusTimeLeft] = passoTimer(isBonusActive, bonusTimeLeft, bonusDisplay, bonusTimerDisplay, dt);
    [isSlowMoActive, slowMoTimeLeft] = passoTimer(isSlowMoActive, slowMoTimeLeft, slowmoDisplay, slowmoTimerDisplay, dt);
    [isInfJumpActive, infJumpTimeLeft] = passoTimer(isInfJumpActive, infJumpTimeLeft, infjumpDisplay, infjumpTimerDisplay, dt);
    [isShrinkActive, shrinkTimeLeft] = passoTimer(isShrinkActive, shrinkTimeLeft, shrinkDisplay, shrinkTimerDisplay, dt);
    [isGiantActive, giantTimeLeft] = passoTimer(isGiantActive, giantTimeLeft, giantDisplay, giantTimerDisplay, dt);
    [isMeteorActive, meteorTimeLeft] = passoTimer(isMeteorActive, meteorTimeLeft, meteorDisplay, meteorTimerDisplay, dt);
    [isRocketActive, rocketTimeLeft] = passoTimer(isRocketActive, rocketTimeLeft, rocketDisplay, rocketTimerDisplay, dt);
    [isBlackHoleActive, blackholeTimeLeft] = passoTimer(isBlackHoleActive, blackholeTimeLeft, blackholeDisplay, blackholeTimerDisplay, dt);
    [isLuckyActive, luckyTimeLeft] = passoTimer(isLuckyActive, luckyTimeLeft, luckyDisplay, luckyTimerDisplay, dt);
    [isHoverActive, hoverTimeLeft] = passoTimer(isHoverActive, hoverTimeLeft, hoverDisplay, hoverTimerDisplay, dt);
    [isNoGapActive, noGapTimeLeft] = passoTimer(isNoGapActive, noGapTimeLeft, nogapDisplay, nogapTimerDisplay, dt);

    // Tamanho (gigante / minúsculo)
    let targetW = 50, targetH = 40;
    if (isShrinkActive) { targetW = 25; targetH = 20; }
    else if (isGiantActive) { targetW = 100; targetH = 80; }
    player.w += (targetW - player.w) * 0.1;
    player.h += (targetH - player.h) * 0.1;

    // Squash & stretch com MOLA: passa um pouquinho do normal e volta ("boing"); a largura acompanha
    // a altura (conserva o volume), então o personagem nunca fica fino E achatado ao mesmo tempo
    molaEscala(player);
    player.scaleY += (1 - player.scaleY) * 0.15;

    // Mortal para trás: uma volta em DURACAO_GIRO segundos com ease-in-out; se pousar no meio, termina rápido
    if (player.spin < 0) {
        player.giroT = (player.giroT || 0) + (player.giroRapido ? 0.12 : PASSO_FISICA / DURACAO_GIRO);
        const t = Math.min(1, player.giroT);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        player.spin = -2 * Math.PI * (1 - e);
        if (t >= 1) { player.spin = 0; player.giroRapido = false; }
    }
    if (player.hurtFrames > 0) player.hurtFrames--;
    if (player.sorriso > 0) player.sorriso--;
    if (player.bufferPulo > 0) player.bufferPulo--;
    sortearTremor();
    if (phaseAnnounceFrames > 0) phaseAnnounceFrames--;

    // ── Gravidade: queda mais pesada que a subida, com velocidade máxima ──
    if (dashTimeLeft > 0) player.vy = 0;   // no dash a altura fica travada desde o primeiro passo
    let currentGravity = dashTimeLeft > 0 ? 0 : (isFlying ? player.gravity * 0.4 : player.gravity);
    if (player.vy > 0 && !isFlying && !isHoverActive) currentGravity *= MULT_GRAVIDADE_QUEDA;
    if (isMeteorActive && !player.onGround && player.vy > 0) currentGravity *= 2.5;
    player.vy += currentGravity * ts;
    const tetoQueda = isSlamming ? VEL_SLAM : VEL_MAX_QUEDA;
    if (player.vy > tetoQueda) player.vy = tetoQueda;

    if (isHoverActive && player.vy > 0) player.vy *= 0.8;
    // pulo mínimo: botão solto antes da hora → o corte acontece só ao completar PASSOS_PULO_MIN
    player.passosPulo = (player.passosPulo || 0) + 1;
    if (player.podeCortarPulo && !puloSegurado && player.passosPulo >= PASSOS_PULO_MIN && player.vy < 0 && !isFlying) {
        player.vy *= CORTE_PULO; player.podeCortarPulo = false;
    }
    if (player.podeCortarPulo && player.vy >= 0) player.podeCortarPulo = false;

    const yAntesDoPasso = player.y; // para a colisão usar o deslocamento REAL (o dash zera vy depois)
    player.y += player.vy * ts;

    if (player.y < -50) { player.y = -50; player.vy = 0; }

    // Foguete
    if (isRocketActive) {
        player.y = ch * 0.1;   // no alto da tela (visível, com o jato de fogo), acima de tudo
        player.vy = 0;
        player.jumps = 0;
    }

    let effectiveSpeed = gameSpeed;
    if (isRocketActive) effectiveSpeed += gameSpeed * (2.0 + ((unlockedUpgrades.rocket_spd || 0) * 0.5));

    // Dash
    if (dashCooldown > 0) {
        dashCooldown -= dt;
        if (dashCooldown <= 0) {
            dashCooldown = 0;
            // pronto de novo: brilho leve no personagem e no botão; pedido guardado vira dash agora
            aneis.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, cor: '#9BE7FF', t: 0, raio: 18 });
            mobileDashBtn.classList.remove('pronto-agora'); void mobileDashBtn.offsetWidth; mobileDashBtn.classList.add('pronto-agora');
            if (pedidoDash) doDash();
        }
    }
    atualizarBotaoDash();
    if (dashTimeLeft > 0) {
        dashTimeLeft -= dt * ts;   // na câmera lenta o dash dura mais e mantém o alcance
        isDashing = true;
        // Entrada e saída suaves (curva seno); MULT_CURVA_DASH mantém a distância total do dash
        const tDash = 1 - Math.max(0, dashTimeLeft) / DURACAO_DASH;
        const curva = Math.sin(Math.PI * Math.min(tDash, 1));
        effectiveSpeed += (BONUS_VEL_DASH + ((unlockedUpgrades.dash_pwr || 0) * 10)) * curva * MULT_CURVA_DASH;
        player.vy = 0; // congela o movimento vertical
        player.scaleX = 1 + 0.3 * curva;    // esticada do dash (moderada: o rig inteiro é escalado)
        player.scaleY = 1 - 0.22 * curva; player.sqV = 0;
        if (!usaPersonagemNovo(player)) emitirParticula({ x: player.x, y: player.y + player.h / 2 + (Math.random() * 20 - 10), vx: -10, vy: (Math.random() - 0.5) * 2, life: 1, color: '#00ffff', size: 6 });
    } else {
        isDashing = false;
    }

    effectiveSpeed *= ts;
    distance += effectiveSpeed;

    let scoreGain = effectiveSpeed * 0.05 * multiplicadorPontos() * (isGiantActive ? 3 : 1);
    score += scoreGain;
    checkMission('score', scoreGain);

    // ── Fase: avança por distância, no máximo uma por vez ──
    let nextPhase = currentPhase + 1;
    if (nextPhase < PHASES.length && distance >= PHASES[nextPhase].distThreshold) {
        currentPhase = nextPhase;
        omniSpawnedThisPhase = false;
        applyPhaseParams();
        phaseAnnounceFrames = 180;
        checkMission('fases', 1);
    }

    // ── Velocidade: sobe devagar até o teto e nunca cai na troca de fase ──
    const chill = 1 - ((unlockedUpgrades.phase_chill || 0) * 0.25);
    gameSpeedAlvo = Math.min(VEL_MAXIMA, Math.max(PHASES[currentPhase].baseSpeed, gameSpeedAlvo + ACELERACAO_JOGO * chill));
    gameSpeed += (gameSpeedAlvo - gameSpeed) * SUAVIZACAO_VEL;

    // ── Tutorial ──
    if (mostrarTutorial && tutorialIdx < DICAS_TUTORIAL.length && distance >= DICAS_TUTORIAL[tutorialIdx].dist) {
        const d = DICAS_TUTORIAL[tutorialIdx++];
        showToast(isTouchDevice() ? d.toque : d.teclado);
    }

    // ── Plataformas móveis e quebradiças ──
    for (const p of platforms) {
        const yAnt = p.y;
        // a fase acumula com a escala de tempo: ligar/desligar a câmera lenta não "teleporta" a plataforma
        if (p.amp) { p.faseOsc += p.velOsc * ts; p.y = p.baseY + Math.sin(p.faseOsc) * p.amp; }
        if (p.caindo) { p.vyQueda += 0.5 * ts; p.y += p.vyQueda * ts; }
        p.dy = p.y - yAnt;
    }

    removerAntigos(platforms, p => p.x + p.w);
    removerAntigos(stars, s => s.x);
    removerAntigos(feathers, f => f.x);
    removerAntigos(powerupItems, p => p.x);
    removerAntigos(obstaculos, o => o.x + o.w);
    generateWorld();

    // ── Colisão com plataformas ──
    const wasGrounded = player.onGround;
    player.onGround = false;
    let pRealX = distance + player.x;
    let hitMargin = player.w * 0.2; // ~10px de folga em cada lado no tamanho normal
    let pRealRight = pRealX + player.w - hitMargin;
    let pRealLeft = pRealX + hitMargin;
    const dyPasso = player.y - yAntesDoPasso; // deslocamento real neste passo

    for (let p of platforms) {
        if (p.caindo) continue;
        if (pRealRight > p.x && pRealLeft < p.x + p.w) {
            const pes = player.y + player.h;
            const pousou = pes > p.y && pes - dyPasso <= p.y + 10;
            // já estava em cima de uma plataforma que desceu: continua "colado" nela
            const colado = wasGrounded && player.vy >= 0 && (p.dy || 0) > 0 && pes >= p.y - p.dy - 2 && pes <= p.y + 12;
            if (pousou || colado) {
                aoPousar(p.y, wasGrounded);
                if (p.quebradica) {
                    // nuvem de chuva pingando enquanto alguém está em cima
                    if (frames % 5 === 0) emitirParticula({ x: p.x - distance + Math.random() * p.w, y: p.y + ESPESSURA_NUVEM - 6, vx: 0, vy: 2, gravidade: 0.25, life: 0.8, size: 2, noMundo: true, color: PALETA.gota });
                    p.tempoPisado += ts; // conta em tempo de jogo (igual na câmera lenta)
                    // aviso: a nuvem começa a soltar fiapos antes de cair
                    if (p.tempoPisado > 15 && frames % 4 === 0) emitirParticula({ x: p.x - distance + Math.random() * p.w, y: p.y + 10, vx: (Math.random() - 0.5) * 2, vy: 1.5, gravidade: 0.1, life: 0.6, size: 6, forma: 'poeira', noMundo: true, color: PALETA.nuvemChuva });
                    if (p.tempoPisado > 35) {
                        p.caindo = true; p.vyQueda = 0;
                        for (let i = 0; i < 8; i++) emitirParticula({ x: p.x - distance + (i + 0.5) * p.w / 8, y: p.y + 14, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 2, life: 0.8, size: 9, forma: 'poeira', noMundo: true, color: PALETA.nuvemChuva });
                    }
                }
            }
        }
    }

    // ── Obstáculos ──
    for (const ob of obstaculos) {
        if (ob.destruido) continue;
        if (ob.plat.caindo) { ob.destruido = true; continue; }
        const topo = ob.plat.y - ob.h;
        const dentroX = pRealRight > ob.x && pRealLeft < ob.x + ob.w;
        // em cima de um bloco que está numa plataforma descendo: continua colado (sem "pousar" de novo a cada 2 passos)
        if (ob.tipo === 'bloco' && dentroX && wasGrounded && player.vy >= 0) {
            const pdy = ob.plat.dy || 0, pes = player.y + player.h;
            if (pdy > 0 && pes >= topo - pdy - 2 && pes <= topo + 12) { aoPousar(topo, true); continue; }
        }
        if (!(dentroX && player.y + player.h > topo && player.y + 4 < ob.plat.y)) continue;

        if (ob.tipo === 'bloco' && player.vy >= 0 && player.y + player.h - dyPasso <= topo + 10) {
            // Pousou em cima do bloco: slam quebra, senão funciona como chão
            if (isSlamming && player.vy >= VEL_MIN_SLAM) { destruirObstaculo(ob); aoPousar(ob.plat.y, false); }
            else aoPousar(topo, wasGrounded);
            continue;
        }
        if ((isDashing && ob.tipo !== 'espinho') || isGiantActive || isRocketActive) { destruirObstaculo(ob); continue; }
        if (player.hurtFrames > 0) continue;
        if (isShieldActive) {
            isShieldActive = false; shieldTimeLeft = 0; shieldDisplay.classList.add('hidden');
            destruirObstaculo(ob);
            player.hurtFrames = PASSOS_INVULNERAVEL;
            showToast('🛡️ Escudo bloqueou o obstáculo!');
            continue;
        }
        morrer();
        return;
    }

    // Coyote time: saiu da borda sem pular → ainda pode pular "do chão" por alguns passos
    if (!player.onGround && player.coyote > 0) {
        player.coyote--;
        if (player.coyote === 0 && player.jumps === 0) player.jumps = 1;
    }
    // Jump buffer: pulo apertado pouco antes de pousar
    if (player.onGround && !wasGrounded && player.bufferPulo > 0) jump();

    pRealX = distance + player.x;
    let pCX = pRealX + player.w / 2;
    let pCY = player.y + player.h / 2;
    const MAGNET_RADIUS = isBlackHoleActive ? 900 : (isMagnetActive ? 180 : ((player.char.magnetic || 0) + (unlockedUpgrades.magnet * 30)));

    for (let s of stars) {
        if (s.collected) continue;
        let dx = pCX - s.x;
        let dy = pCY - s.y;
        let dist = Math.hypot(dx, dy);
        // Ímã
        if (MAGNET_RADIUS > 0 && dist < MAGNET_RADIUS && dist > 0) {
            let pull = (MAGNET_RADIUS - dist) / MAGNET_RADIUS * (5 + ((unlockedUpgrades.magnet_spd || 0) * 2.5));
            s.x += (dx / dist) * pull;
            s.y += (dy / dist) * pull;
        }
        if (dist < player.w / 2 + s.size) {
            s.collected = true;
            let st = s.starType || STAR_TYPES[0];
            let starVal = Math.round((st.value || 10) * (1 + ((unlockedUpgrades.coin_val || 0) * 0.25)));
            starsCollected += starVal;
            playSound('collect');
            checkMission('stars', starVal);
            player.sorriso = 40;

            score += starVal * multiplicadorPontos();
            let burstColor = st.glow || '#ffdd00';
            for (let i = 0; i < 8; i++) emitirParticula({ x: s.x - distance, y: s.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1, color: burstColor, size: 5, forma: 'brilho' });

            aneis.push({ x: s.x - distance, y: s.y, cor: burstColor, t: 0 });   // anel que expande ao coletar
            // "+N" do tamanho da raridade: comuns pequenos, lendárias enormes
            const escala = starVal >= 1000 ? 1.9 : starVal >= 250 ? 1.4 : starVal >= 100 ? 1.15 : 0.8;
            floatingTexts.push({ x: s.x - distance, y: s.y - 15, text: `+${starVal.toLocaleString()}`, life: 1.0, color: burstColor, escala });
            if (starVal >= 250) sleepFrames = 2; // micro hit-pause só nas raras (comuns em sequência travavam o jogo)

            if (starVal >= 500) {
                showToast(`${st.name}: +${starVal.toLocaleString()} ⭐`);
                // explosão extra: mais brilhos e um anel grande
                for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; emitirParticula({ x: s.x - distance, y: s.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, life: 1.2, color: st.color, size: 7, forma: 'brilho' }); }
                aneis.push({ x: s.x - distance, y: s.y, cor: st.color, t: 0, raio: 60 });
                screenShake = Math.max(screenShake, 6);
            }
        }
    }

    for (let f of feathers) {
        if (f.collected) continue;
        let dx = pCX - f.x; let dy = pCY - f.y;
        if (Math.hypot(dx, dy) < player.w / 2 + f.size) {
            f.collected = true;
            isFlying = true; flightTimeLeft = 10.0 * (player.char.powerupDurMult || 1.0);
            powerupDisplay.classList.remove('hidden');
            player.jumps = 0;
            player.sorriso = 60;
            score += (isBonusActive ? 200 : 100) * (player.char.pointsMult || 1.0);
            for (let i = 0; i < 16; i++) emitirParticula({ x: f.x - distance, y: f.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1, color: PALETA.particulas[i % 5], size: 6, forma: 'brilho' });
        }
    }

    // ── Coleta de power-ups ──
    for (let pu of powerupItems) {
        if (pu.collected) continue;
        let dx = pCX - pu.x; let dy = pCY - pu.y;
        const d = Math.hypot(dx, dy);
        // perto do personagem a bolha é "puxada" até ele (a coleta fica gostosa, sem raspar de leve e errar)
        if (d < ATRACAO_POWERUP && d > 0) { const v = Math.min(d, 7); pu.x += dx / d * v; pu.y += dy / d * v; }
        if (d < player.w / 2 + pu.size) {
            pu.collected = true;
            coletarPowerup(pu);
        }
    }

    atualizarPose(player, effectiveSpeed);
    emitirEfeitosPoderes();   // fogo do foguete, estrelas do x2, vórtice do buraco negro...
    const personagemNovo = usaPersonagemNovo(player);
    if (personagemNovo) atualizarEfeitosPersonagem(player, effectiveSpeed, distance); // fita e estrelinhas

    if (frames % 3 === 0 && player.onGround && !personagemNovo) createPlayerParticle();
    if (isFlying && frames % 2 === 0) {
        emitirParticula({
            x: player.x + 10,
            y: player.y + player.h / 2 + (Math.random() * 10 - 5),
            vx: -Math.random() * 4 - 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1.2,
            color: "rgba(255,255,255,0.8)",
            size: Math.random() * 8 + 4
        });
    }
    // Partículas da aura: cada aura tem a sua forma e o seu movimento (AURA_EFEITO)
    if (selectedSkin !== 'default') emitirAura(AURA_EFEITO[selectedSkin]);

    atualizarParticulas(effectiveSpeed);   // poeira no chão rola junto com o mundo

    if (player.y > ch) caiuNoBuraco();
}

// ─── Partículas: pool fixo de MAX_PARTICULAS objetos reaproveitados ───
// formas: 'circulo' (padrão), 'brilho' (estrela de 4 pontas, modo lighter), 'poeira' (nuvenzinha que cresce)
const poolParticulas = Array.from({ length: MAX_PARTICULAS }, () => ({ ativa: false }));
let cursorParticula = 0;

function emitirParticula(o) {
    // procura um espaço livre a partir do cursor; se o pool estiver cheio, reaproveita o mais antigo
    let s = null;
    for (let i = 0; i < MAX_PARTICULAS; i++) {
        const k = (cursorParticula + i) % MAX_PARTICULAS;
        if (!poolParticulas[k].ativa) { s = poolParticulas[k]; cursorParticula = k + 1; break; }
    }
    if (!s) { s = poolParticulas[cursorParticula % MAX_PARTICULAS]; cursorParticula++; }
    s.ativa = true;
    s.x = o.x; s.y = o.y; s.xAnt = o.x; s.yAnt = o.y; s.noMundo = !!o.noMundo; s.vx = o.vx || 0; s.vy = o.vy || 0;
    s.life = o.life || 1; s.vida0 = s.life;
    s.color = o.color || '#ffffff'; s.size = o.size || 3;
    s.forma = o.forma || 'circulo'; s.gravidade = o.gravidade || 0;
    s.rot = Math.random() * Math.PI; s.vr = (Math.random() - 0.5) * 0.3;
    s.texto = o.texto || '1';
}

function limparParticulas() {
    for (const p of poolParticulas) p.ativa = false;
}

// Anéis que expandem ao coletar estrela (curtos: 12 passos; no máximo 12 de uma vez)
let aneis = [];
function atualizarAneis() {
    let j = 0;
    for (const a of aneis) { a.t++; if (a.t <= 12) aneis[j++] = a; }
    aneis.length = j;
    if (aneis.length > 12) aneis.splice(0, aneis.length - 12);   // descarta os mais ANTIGOS
}
// Linhas de vento: aparecem quando o jogo fica rápido e com força total no dash/foguete
function desenharLinhasVelocidade(ctx) {
    let forca = Math.max(0, Math.min(1, (gameSpeed - 10) / (VEL_MAXIMA - 10))) * 0.6;
    if (isDashing || isRocketActive) forca = 1;
    if (forca < 0.05) return;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
        const vel = 20 + (i % 3) * 8, comp = 50 + (i % 4) * 35;
        const x = cw - ((frames * vel + i * 311) % (cw + comp + 100)) + 50;
        const y = ch * (0.06 + ((i * 173) % 97) / 97 * 0.82);
        ctx.globalAlpha = forca * (0.12 + (i % 3) * 0.08);
        ctx.lineWidth = 1.5 + (i % 2);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + comp, y); ctx.stroke();
    }
    ctx.restore();
}

function desenharAneis(ctx) {
    ctx.save();
    for (const a of aneis) {
        if (a.t < 0) continue;   // anel com atraso (t negativo) ainda não apareceu
        const k = a.t / 12;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = a.cor; ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.arc(a.x, a.y, 6 + k * (a.raio || 22), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

function atualizarParticulas(velMundo = 0) {
    atualizarAneis();
    for (const pt of poolParticulas) {
        if (!pt.ativa) continue;
        pt.xAnt = pt.x; pt.yAnt = pt.y;
        pt.x += pt.vx - (pt.noMundo ? velMundo : 0);
        pt.y += pt.vy;
        pt.vy += pt.gravidade;
        if (pt.forma === 'poeira') { pt.vx *= 0.92; pt.vy *= 0.92; }
        pt.rot += pt.vr;
        pt.life -= 0.03;
        if (pt.life <= 0) pt.ativa = false;
    }
}

function spritePoeira(cor = '#FFFFFF') {   // "puf" de nuvem tingido
    return spriteCache('poeira|' + cor, 64, (g, t) => {
        const c = paraRGBA(cor);
        const m = t / 2;
        const grad = g.createRadialGradient(m, m, 0, m, m, m);
        grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.9)`);
        grad.addColorStop(0.6, `rgba(${c.r},${c.g},${c.b},0.5)`);
        grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
        g.fillStyle = grad; g.fillRect(0, 0, t, t);
    });
}

// posição da partícula entre o passo anterior e o atual (lisa em 120/144 Hz)
const px = (p) => p.xAnt + (p.x - p.xAnt) * alfaRender;
const py = (p) => p.yAnt + (p.y - p.yAnt) * alfaRender;

function desenharParticulas(ctx) {
    ctx.save();
    // 1) círculos, poeira e as formas das auras (normal)
    for (const pt of poolParticulas) {
        if (!pt.ativa || pt.forma === 'brilho' || pt.forma === 'faisca') continue;
        const k = Math.max(0, pt.life / pt.vida0);
        if (pt.forma === 'poeira' || pt.forma === 'fumaca') {
            const t = pt.size * (1 + (1 - k) * 1.6);
            ctx.globalAlpha = k * 0.7;
            ctx.drawImage(spritePoeira(pt.color), px(pt) - t, py(pt) - t, t * 2, t * 2);
        } else if (pt.forma !== 'circulo') {
            ctx.globalAlpha = Math.min(1, k * 1.5);
            desenharFormaParticula(ctx, pt.forma, pt.color, px(pt), py(pt), pt.size * 2.4, pt.rot, pt.texto);
        } else {
            ctx.globalAlpha = Math.min(1, pt.life);
            ctx.fillStyle = pt.color;
            ctx.beginPath(); ctx.arc(px(pt), py(pt), pt.size, 0, Math.PI * 2); ctx.fill();
        }
    }
    // 2) brilhos (modo lighter)
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of poolParticulas) {
        if (!pt.ativa || (pt.forma !== 'brilho' && pt.forma !== 'faisca')) continue;
        const k = Math.max(0, pt.life / pt.vida0);
        if (pt.forma === 'faisca') {
            ctx.globalAlpha = Math.min(1, k * 1.6);
            desenharFormaParticula(ctx, 'faisca', pt.color, px(pt), py(pt), pt.size * 2.4, pt.rot);
            continue;
        }
        const t = pt.size * 2.4 * (0.4 + 0.6 * k);
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.save();
        ctx.translate(px(pt), py(pt)); ctx.rotate(pt.rot);
        ctx.drawImage(spriteEstrelinha(pt.color), -t / 2, -t / 2, t, t);
        ctx.restore();
    }
    ctx.restore();
}

// Pouso em uma superfície (plataforma ou topo de bloco)
function aoPousar(topoY, estavaNoChao) {
    const vyImpacto = player.vy;
    const slamValido = isSlamming && vyImpacto >= VEL_MIN_SLAM;
    if (!estavaNoChao) {
        // Pose de recuperação do pouso + passada recomeça com os cascos da frente tocando o chão
        player.pouso = { t: 0, forca: vyImpacto };
        player.runPhase = (Math.floor(player.runPhase * FATOR_FASE_GALOPE) + 1 + 0.3) / FATOR_FASE_GALOPE;
        semInterpolar('runPhase'); // a passada recomeça sem "varrer" um ciclo inteiro num quadro
        player.mistura = Math.min(player.mistura, 0.3);   // a pose de pouso aparece já no impacto
        if (player.spin < 0) player.giroRapido = true;
        // squash proporcional à força do pouso (antes todo pouso acima de 8 parecia um slam)
        const kPouso = slamValido ? 1 : Math.min(1, Math.max(0, (vyImpacto - 4) / 14));
        player.scaleY = 0.88 - 0.38 * kPouso; player.scaleX = 1 / Math.sqrt(player.scaleY); player.sqV = 0;
        const nPoeira = slamValido ? 12 : Math.round(3 + 4 * kPouso);
        for (let i = 0; i < nPoeira; i++) emitirParticula({ x: player.x + player.w / 2 + (Math.random() - 0.5) * 20, y: topoY, vx: (Math.random() - 0.5) * (slamValido ? 16 : 4 + 6 * kPouso), vy: -Math.random() * (slamValido ? 4 : 0.6 + 1.4 * kPouso), life: 0.6 + 0.3 * kPouso, size: slamValido ? 10 : 5 + 2 * kPouso, forma: 'poeira', noMundo: true, color: PALETA.nuvemSombra });
        if (!slamValido) playSound('land', kPouso);
        if (isGiantActive && vyImpacto > 6 && !slamValido) {
            // gigante: cada pouso faz o chão tremer
            screenShake = Math.max(screenShake, 9);
            aneis.push({ x: player.x + player.w / 2, y: topoY, cor: CORES_PODER.giant, t: 0, raio: 60 });
        }
        if (slamValido) {
            screenShake = 20; // impacto brutal
            aneis.push({ x: player.x + player.w / 2, y: topoY, cor: '#FFFFFF', t: 0, raio: 70 });   // onda de choque
            aneis.push({ x: player.x + player.w / 2, y: topoY, cor: PALETA.destaque, t: -3, raio: 45 });
            playSound('slam');
            let slamBonus = (unlockedUpgrades.slam_score || 0) * 50;
            if (slamBonus > 0) score += slamBonus;
            checkMission('slams', 1);
        } else if (vyImpacto > VEL_TREMOR_POUSO) {
            screenShake = Math.max(screenShake, TREMOR_POUSO_FORTE);
        }
        if (isMeteorActive && vyImpacto > 10) {
            score += 500 * (player.char.pointsMult || 1.0) * (1 + ((unlockedUpgrades.meteor_pts || 0) * 0.5));
            // meteoro: explosão de chamas e anel de fogo no pouso
            for (let i = 0; i < 18; i++) emitirParticula({ x: player.x + player.w / 2, y: topoY, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 9, life: 0.9, color: CORES_PODER.meteor[i % 3], size: 12 + Math.random() * 10, forma: 'chama' });
            aneis.push({ x: player.x + player.w / 2, y: topoY, cor: '#FF8A3A', t: 0, raio: 80 });
            screenShake = Math.max(screenShake, 12);
        }
    }
    isSlamming = false;
    player.onGround = true;
    player.vy = 0;
    player.y = topoY - player.h;
    player.jumps = 0;
    player.coyote = PASSOS_COYOTE;
}

function destruirObstaculo(ob) {
    ob.destruido = true;
    const cx = ob.x - distance + ob.w / 2, cy = ob.plat.y - ob.h / 2;
    const cor = ob.tipo === 'bloco' ? '#c08040' : (ob.tipo === 'barreira' ? '#00ffff' : '#ffffff');
    for (let i = 0; i < 14; i++) emitirParticula({ x: cx, y: cy, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, life: 1, color: cor, size: Math.random() * 4 + 4, forma: 'brilho', gravidade: 0.15 });
    const pts = Math.round(150 * multiplicadorPontos());
    score += pts;
    floatingTexts.push({ x: cx, y: cy - 20, text: `+${pts}`, life: 1.0, color: cor });
    screenShake = Math.max(screenShake, 6);
    sleepFrames = 3;
    playSound('hit');
    checkMission('obstaculos', 1);
}

function coletarPowerup(pu) {
    let pDur = (player.char.powerupDurMult || 1.0) * (1 + ((unlockedUpgrades.pu_time || 0) * 0.1));
    const pm = player.char.pointsMult || 1.0;
    player.sorriso = 60;
    checkMission('powerups', 1);
    switch (pu.type) {
        case 'magnet':
            isMagnetActive = true; magnetTimeLeft = 8 * pDur;
            magnetDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'shield':
            isShieldActive = true;
            if (shieldTimeLeft < 9000) shieldTimeLeft = DURACAO_ESCUDO * pDur; // não encurta o escudo inicial infinito
            shieldDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'bonus':
            isBonusActive = true; bonusTimeLeft = 8 * pDur;
            bonusDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'slowmo':
            isSlowMoActive = true; slowMoTimeLeft = 5 * pDur;
            slowmoDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'infjump':
            isInfJumpActive = true; infJumpTimeLeft = 10 * pDur;
            infjumpDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'starchest': {
            // Baú: 5 estrelas de tipos sorteados de verdade + bônus de pontos
            let chestLuckyM = isLuckyActive ? (5 + ((unlockedUpgrades.lucky_mult || 0) * 2)) : 1;
            score += (isBonusActive ? 1000 : 500) * chestLuckyM * pm;
           
            for (let i = 0; i < 5; i++) {
                const st = pickStarType();
                stars.push({ x: pu.x + (Math.random() - 0.5) * 60, y: pu.y - Math.random() * 40, size: st.size, starType: st, collected: false, oscOffset: Math.random() * Math.PI * 2 });
            }
            break;
        }
        case 'shrink':
            isShrinkActive = true; shrinkTimeLeft = 8 * pDur; shrinkDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'giant':
            isGiantActive = true; giantTimeLeft = 8 * pDur; giantDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'meteor':
            isMeteorActive = true; meteorTimeLeft = 8 * pDur; meteorDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'rocket':
            isRocketActive = true; rocketTimeLeft = 5 * pDur; rocketDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'blackhole':
            isBlackHoleActive = true; blackholeTimeLeft = 6 * pDur; blackholeDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'lucky':
            isLuckyActive = true; luckyTimeLeft = 8 * pDur; luckyDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'hover':
            isHoverActive = true; hoverTimeLeft = 8 * pDur; hoverDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'nogap':
            isNoGapActive = true; noGapTimeLeft = 15 * pDur; nogapDisplay.classList.remove('hidden');
            score += 80 * pm;
            break;
        case 'coinshower':
            score += 500 * pm;
           
            // Estrelas à frente do jogador (no mundo) para ele passar por elas
            for (let i = 0; i < 20; i++) {
                let st = pickStarType();
                stars.push({
                    x: distance + player.x + player.w / 2 + Math.random() * 800 + 50,
                    y: player.y - 40 - Math.random() * (ch * 0.4),
                    size: st.size,
                    starType: st,
                    collected: false,
                    oscOffset: Math.random() * Math.PI * 2
                });
            }
            break;
        case 'rainbow':
            score += 500 * pm;
           
            rainbowPlatformsCount = 10; // as próximas 10 plataformas não têm vão
            break;
        case 'jackpot':
            score += 5000 * pm;
           
            break;
        case 'omni':
            isMagnetActive = true; magnetTimeLeft = 10 * pDur; magnetDisplay.classList.remove('hidden');
            isShieldActive = true; if (shieldTimeLeft < 9000) shieldTimeLeft = DURACAO_ESCUDO * pDur; shieldDisplay.classList.remove('hidden');
            isBonusActive = true; bonusTimeLeft = 10 * pDur; bonusDisplay.classList.remove('hidden');
            isInfJumpActive = true; infJumpTimeLeft = 10 * pDur; infjumpDisplay.classList.remove('hidden');
            isFlying = true; flightTimeLeft = 10 * pDur; powerupDisplay.classList.remove('hidden');
            player.jumps = 0;
            score += 1000 * pm;
           
            for (let i = 0; i < 18; i++) emitirParticula({ x: pu.x - distance, y: pu.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 1.5, color: PALETA.particulas[i % 5], size: Math.random() * 5 + 5, forma: 'brilho' });
            break;
    }
    // estouro da bolha: anel grande + brilhos em círculo na cor do poder + o nome do poder subindo
    const est = ESTILOS_POWERUP[pu.type] || ESTILOS_POWERUP.magnet;
    const cx = pu.x - distance, cy = pu.y;
    aneis.push({ x: cx, y: cy, cor: est.cor, t: 0, raio: 55 });
    aneis.push({ x: cx, y: cy, cor: '#FFFFFF', t: -3, raio: 35 });
    for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, v = 5 + Math.random() * 3;
        emitirParticula({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, color: i % 3 ? est.cor : '#FFFFFF', size: 5 + Math.random() * 3, forma: 'brilho' });
    }
    floatingTexts.push({ x: cx, y: cy - 30, text: est.nome, life: 1.2, color: corMix(est.cor, COR_NOITE, 0.55), escala: est.cat === 'poder' ? 1.05 : 1.3 });
    player.scaleY = 1.18; player.sqV = 0;   // o personagem "estica" de alegria
    playSound('powerup');
}

// ─────────────────────────────────────────────────────────────────────────
// QUEDA, RESGATE E MORTE
// ─────────────────────────────────────────────────────────────────────────
function caiuNoBuraco() {
    if (isShieldActive) {
        isShieldActive = false; shieldTimeLeft = 0;
        shieldDisplay.classList.add('hidden');
        resgatarJogador(-8, '#44ccff');
        showToast('🛡️ Escudo absorveu a queda!');
    } else if (unlockedUpgrades.free_revive > 0 && !usedFreeRevive) {
        usedFreeRevive = true;
        resgatarJogador(-14, '#ffd700');
        showToast('✨ Segunda Chance ativada!');
    } else {
        morrer();
    }
}

// Coloca o jogador numa plataforma À FRENTE (nunca em cima do buraco).
// Se a próxima plataforma ainda não chegou, cria uma plataforma de resgate ligando até ela.
function resgatarJogador(vyImpulso, cor) {
    const px = distance + player.x;
    const idx = platforms.findIndex(p => !p.caindo && p.x + p.w > px + player.w);
    const alvo = idx >= 0 ? platforms[idx] : null;
    const yAlvo = alvo ? alvo.baseY : ch * 0.6;
    if (!alvo || alvo.x > px) {
        const ini = px - 40;
        const fim = alvo ? alvo.x : px + 300;
        const resgate = { x: ini, y: yAlvo, baseY: yAlvo, w: Math.max(fim - ini, player.w + 80), h: ch };
        if (idx >= 0) platforms.splice(idx, 0, resgate); else platforms.push(resgate);
    }
    player.y = yAlvo - player.h;
    player.ant = null; // teletransporte: não interpola deste passo
    if (usaPersonagemNovo(player)) limparEfeitosPersonagem(player); // fita não "risca" a tela até o ponto novo
    player.vy = vyImpulso;
    player.jumps = 0;
    player.hurtFrames = PASSOS_INVULNERAVEL;
    isSlamming = false;
    for (let i = 0; i < 16; i++) emitirParticula({ x: player.x + player.w / 2, y: player.y + player.h, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 8, life: 1.3, color: i % 2 === 0 ? cor : '#ffffff', size: Math.random() * 4 + 5, forma: 'brilho', gravidade: 0.2 });
}

function morrer() {
    playSound('hit');
    state = 'dying';
    passosMorte = PASSOS_ANIM_MORTE;
    screenShake = TREMOR_MORTE;
    player.assustado = true;
    player.hurtFrames = 0;
    player.vy = -13;
    if (player.y > ch - player.h) player.y = ch - player.h; // volta para a tela para a animação ser vista
    player.ant = null;
    mobileControls.style.display = 'none';
    // explosão de estrelas pastel saindo do personagem
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, v = 5 + Math.random() * 6;
        emitirParticula({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1.6, size: 6 + Math.random() * 5, color: PALETA.particulas[i % 5], forma: 'brilho', gravidade: 0.12 });
    }
}

// Animação de morte: congela um instante, depois o personagem pula e cai girando
function passoMorte() {
    passosMorte--;
    frames++;
    tempoAnim += PASSO_FISICA;
    sortearTremor();
    if (passosMorte < PASSOS_ANIM_MORTE - PASSOS_HITPAUSE_MORTE) {
        player.vy += player.gravity;
        player.y += player.vy;
        player.spin -= 0.25;
        player.mistura += (1 - player.mistura) * 0.3;   // patas abrem (pose de susto)
        player.scaleY += (1 - player.scaleY) * 0.3; player.scaleX += (1 - player.scaleX) * 0.3;   // não morre achatado
        atualizarParticulas(0);
    }
    if (passosMorte <= 0) mostrarGameOver();
}

// Conta de 0 até o valor (~0,9 s) e dá um "pop" no fim; sem animação, mostra direto
function contarAte(el, alvo, formatar) {
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.classList.remove('ganho-pop');
    if (!suave || alvo <= 0) { el.textContent = formatar(alvo); return; }
    const inicio = performance.now(), dur = 900;
    const passo = (agora) => {
        const k = Math.min(1, (agora - inicio) / dur);
        el.textContent = formatar(Math.round(alvo * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(passo);
        else { void el.offsetWidth; el.classList.add('ganho-pop'); }
    };
    el.textContent = formatar(0);
    requestAnimationFrame(passo);
}

function mostrarGameOver() {
    state = 'gameover';
    gameOverMenu.classList.remove('hidden');
    hud.classList.add('hidden');
    mobileControls.style.display = 'none';
    finalScore.innerText = Math.floor(score);
    // Gorjeta Inicial só vale se a partida chegou à fase 2 (morrer de propósito no começo não rende)
    if (gorjetaInicial > 0 && currentPhase < 1) {
        starsCollected = Math.max(0, starsCollected - gorjetaInicial);
        showToast('🎁 A Gorjeta Inicial vale a partir da fase 2');
    }
    const ganho = Math.floor(starsCollected * CONVERSAO_ESTRELAS);
    contarAte(finalStars, ganho, (n) => `+${n.toLocaleString()} 🌟`);
    document.getElementById('final-phase').innerText = currentPhase + 1;
    document.getElementById('final-char').innerText = player.char.name;

    // Recorde pessoal (neste aparelho)
    const pontos = Math.floor(score);
    const recordeAntigo = parseInt(localStorage.getItem('uniparkourRecorde')) || 0;
    const novoRecorde = pontos > recordeAntigo;
    if (novoRecorde) localStorage.setItem('uniparkourRecorde', pontos);
    document.getElementById('final-recorde').innerText = Math.max(pontos, recordeAntigo).toLocaleString();
    document.getElementById('novo-recorde').classList.toggle('hidden', !novoRecorde);

    // Parte das estrelas vai para a carteira
    globalStars += ganho;
    localStorage.setItem('uniparkourGlobalStars', globalStars);
    updateGlobalStarsDisplay();
    document.getElementById('final-carteira').textContent = globalStars.toLocaleString();
    salvarMissao();
    updateMissionUI();

    checkHighScore(Math.floor(score));
}

// ─────────────────────────────────────────────────────────────────────────
// RENDERIZAÇÃO — estilo "noite mágica" (lua, aurora, estrelas) com plataformas de nuvem pastel
// Camadas de fundo pré-desenhadas em canvas fora da tela; a cada quadro só são deslocadas.
// ─────────────────────────────────────────────────────────────────────────

const corMix = (a, b, t) => paraHex(misturar(paraRGBA(a), paraRGBA(b), t));
const rgbaDe = (cor, a) => { const c = paraRGBA(cor); return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`; };

// Cores "visuais" de cada fase, sem editar PHASES:
// - céu sempre com a cor mais escura em cima (horizonte iluminado em todas as fases)
// - céu puxado para a noite roxa (fases marrons, verde-ácido e cinza puro deixam de fugir do tema)
// - brilhos e bordas neon suavizados (teto de saturação)
const COR_NOITE = '#1B1340';
const FASES_VISUAL = PHASES.map(ph => {
    const ceu = [ph.sky[0], ph.sky[1]]
        .sort((a, b) => luminancia(paraRGBA(a)) - luminancia(paraRGBA(b)))
        .map(c => corMix(c, COR_NOITE, 0.45));
    const suave = (c) => corMix(c, '#FFFFFF', 0.3);
    return { ...ph, sky: ceu, platform: { top: ph.platform.top, glow: suave(ph.platform.glow), edge: suave(ph.platform.edge) } };
});

// Silhueta no topo das montanhas próximas, conforme o tema da fase
function decorDaFase(id) {
    if ([3, 16, 18].includes(id)) return 'estalagmite';
    if ([7, 10].includes(id)) return 'cogumelo';
    if ([4, 17, 22].includes(id)) return 'cristal';
    if ([12, 14, 15, 20, 24].includes(id)) return 'torre';
    return 'pinheiro';
}

// Aleatório com semente: o cenário de cada fase sai sempre igual
function aleatorioSemente(semente) {
    let s = semente >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const escalaFundo = () => bgCanvas.width / cw;

// Canvas fora da tela com tamanho LÓGICO (wl × hl) e resolução da tela
function novoCanvas(wl, hl) {
    const s = escalaFundo();
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(wl * s));
    c.height = Math.max(1, Math.ceil(hl * s));
    c.getContext('2d').setTransform(s, 0, 0, s, 0, 0);
    return c;
}

// ── Céu: gradiente que muda devagar ao longo da fase, indo em direção às cores da próxima ──
const ceuCanvas = document.createElement('canvas');
ceuCanvas.width = 1; ceuCanvas.height = 256;
let ceuChave = '';

function progressoNaFase() {
    const ph = PHASES[currentPhase], prox = PHASES[Math.min(currentPhase + 1, PHASES.length - 1)];
    if (prox === ph) return 0;
    return Math.max(0, Math.min(1, (distance - ph.distThreshold) / (prox.distThreshold - ph.distThreshold)));
}

function desenharCeu(faseIdx, t) {
    const ph = FASES_VISUAL[faseIdx], prox = FASES_VISUAL[Math.min(faseIdx + 1, PHASES.length - 1)];
    const chave = faseIdx + '|' + Math.round(t * 50);
    if (chave !== ceuChave) {
        ceuChave = chave;
        const g = ceuCanvas.getContext('2d');
        const topo = corMix(ph.sky[0], prox.sky[0], t), base = corMix(ph.sky[1], prox.sky[1], t);
        const brilho = corMix(ph.platform.glow, prox.platform.glow, t);
        const grad = g.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, corMix(topo, '#05001A', 0.3));
        grad.addColorStop(0.6, base);
        grad.addColorStop(1, corMix(base, brilho, 0.3)); // horizonte com a cor da fase
        g.fillStyle = grad;
        g.fillRect(0, 0, 1, 256);
    }
    bgCtx.save();
    bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.drawImage(ceuCanvas, 0, 0, 1, 256, 0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.restore();
}

// ── Camadas de parallax (geradas uma vez por fase / tamanho de tela) ──
function obterCenario(faseIdx) {
    const chave = faseIdx + '|' + cw + '|' + ch + '|' + bgCanvas.width;
    if (cacheCenario && cacheCenario.chave === chave) return cacheCenario;
    const ph = FASES_VISUAL[faseIdx];
    const rnd = aleatorioSemente(1234 + faseIdx * 97);
    const TW = Math.max(cw, 900);           // largura do "azulejo" que se repete na horizontal
    const onda = (x, n, f) => Math.sin(2 * Math.PI * n * x / TW + f); // n inteiro = emenda perfeita

    // 1) Campo de estrelas (redondas + algumas em cruz)
    const hE = ch * 0.8;
    const estrelas = novoCanvas(TW, hE);
    {
        const g = estrelas.getContext('2d');
        for (let i = 0; i < 150; i++) {
            const x = rnd() * TW, y = rnd() * hE, r = 0.4 + rnd() * 1.2;
            g.globalAlpha = 0.3 + rnd() * 0.6;
            g.fillStyle = rnd() < 0.2 ? PALETA.estrelaQuente : PALETA.estrela;
            g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = PALETA.estrela; g.lineCap = 'round';
        for (let i = 0; i < 12; i++) {
            const x = rnd() * TW, y = rnd() * hE * 0.8, r = 3 + rnd() * 3;
            g.globalAlpha = 0.5 + rnd() * 0.4; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
            g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fillStyle = PALETA.estrela; g.fill();
        }
        g.globalAlpha = 1;
    }

    // 2) Aurora: 3 faixas de luz onduladas e macias (sem raios verticais, que pareciam "código de barras").
    //    Cada faixa = várias camadas finas empilhadas, com borda de cima mais clara, que somem para baixo.
    const hA = ch * 0.5;
    const aurora = novoCanvas(TW, hA);
    {
        const g = aurora.getContext('2d');
        for (let k = 0; k < 3; k++) {
            const cor = corMix(PALETA.aurora[k % PALETA.aurora.length], ph.platform.glow, 0.3);
            const base = hA * (0.16 + 0.17 * k), amp = 18 + 10 * k, f = rnd() * 6, alt = 46 + 14 * k;
            const topoEm = (x) => base + amp * onda(x, k + 1, f) + 9 * onda(x, k + 3, f + 2);
            const espessuraEm = (x) => alt * (0.7 + 0.3 * onda(x, 2, f + 1));
            const fatias = 7;
            for (let s = 0; s < fatias; s++) {
                const a0 = s / fatias, a1 = (s + 1) / fatias;
                // opacidade: forte logo abaixo da borda de cima, some embaixo
                g.fillStyle = rgbaDe(cor, (k === 2 ? 0.07 : 0.11) * Math.pow(1 - a0, 1.6));
                g.beginPath();
                for (let x = -32; x <= TW + 32; x += 12) g.lineTo(x, topoEm(x) + espessuraEm(x) * a0);
                for (let x = TW + 32; x >= -32; x -= 12) g.lineTo(x, topoEm(x) + espessuraEm(x) * a1);
                g.closePath(); g.fill();
            }
            // borda de cima clara (a "fita" da aurora)
            g.strokeStyle = rgbaDe(corMix(cor, '#FFFFFF', 0.4), k === 2 ? 0.12 : 0.22);
            g.lineWidth = 2; g.lineJoin = 'round';
            g.beginPath();
            for (let x = -32; x <= TW + 32; x += 12) g.lineTo(x, topoEm(x));
            g.stroke();
        }
    }

    // 2b) Detalhe do céu que muda conforme a fase (constelações, planeta com anel, ilhas flutuantes ou nebulosa)
    const ceuExtra = novoCanvas(TW, ch * 0.6);
    {
        const g = ceuExtra.getContext('2d');
        const hX = ch * 0.6, tema = ['constelacao', 'planeta', 'ilhas', 'nebulosa'][faseIdx % 4];
        const corTema = corMix(ph.platform.edge, '#FFFFFF', 0.2);
        if (tema === 'constelacao') {
            // 3 constelações: estrelas ligadas por linhas finas
            for (let c = 0; c < 3; c++) {
                const cx = TW * (0.12 + c * 0.32) + rnd() * 60, cy = hX * (0.12 + rnd() * 0.3);
                const pts = [];
                for (let i = 0; i < 5; i++) pts.push([cx + (i - 2) * 28 + rnd() * 16, cy + (rnd() - 0.5) * 50]);
                g.strokeStyle = rgbaDe(corTema, 0.35); g.lineWidth = 1;
                g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.stroke();
                pts.forEach(([x, y], i) => {
                    g.fillStyle = rgbaDe('#FFFFFF', 0.9);
                    g.beginPath(); g.arc(x, y, i === 2 ? 2.4 : 1.6, 0, Math.PI * 2); g.fill();
                    g.fillStyle = rgbaDe(corTema, 0.25);
                    g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
                });
            }
        } else if (tema === 'planeta') {
            const px = TW * 0.22, py = hX * 0.3, r = 26 + rnd() * 10;
            const corP = corMix(ph.platform.glow, '#FFB8E0', 0.35);
            const corpo = g.createRadialGradient(px - r * 0.4, py - r * 0.4, 2, px, py, r);
            corpo.addColorStop(0, corMix(corP, '#FFFFFF', 0.5)); corpo.addColorStop(1, corMix(corP, COR_NOITE, 0.45));
            const anel = (frente) => {
                g.save(); g.translate(px, py); g.rotate(-0.35);
                g.strokeStyle = rgbaDe(corMix(corP, '#FFFFFF', 0.4), 0.75); g.lineWidth = 3;
                g.beginPath(); g.ellipse(0, 0, r * 1.9, r * 0.45, 0, frente ? 0 : Math.PI, frente ? Math.PI : Math.PI * 2); g.stroke();
                g.restore();
            };
            anel(false);
            g.fillStyle = corpo; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
            g.fillStyle = rgbaDe(COR_NOITE, 0.18);   // faixas do planeta
            g.fillRect(px - r, py - r * 0.2, r * 2, r * 0.18);
            anel(true);
            // duas luazinhas
            [[px + r * 3, py - r * 0.8, 5], [TW * 0.7, hX * 0.18, 8]].forEach(([x, y, rr]) => {
                g.fillStyle = corMix(PALETA.lua, ph.platform.edge, 0.3);
                g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
            });
        } else if (tema === 'ilhas') {
            // ilhas flutuantes distantes: topo arredondado + base em ponta, com um brilho na borda
            for (let i = 0; i < 3; i++) {
                const x = TW * (0.15 + i * 0.33) + rnd() * 50, y = hX * (0.4 + rnd() * 0.3), w = 90 + rnd() * 50;
                const corIlha = corMix(corMix(ph.sky[1], ph.platform.glow, 0.3), '#FFFFFF', 0.1);
                // rocha: topo reto (gramado) e base arredondada que afina para baixo
                g.fillStyle = corMix(corIlha, COR_NOITE, 0.3);
                g.beginPath();
                g.moveTo(x - w / 2, y);
                g.lineTo(x + w / 2, y);
                g.bezierCurveTo(x + w * 0.45, y + 18, x + w * 0.15, y + 26, x + w * 0.05, y + 40);
                g.bezierCurveTo(x - w * 0.05, y + 30, x - w * 0.4, y + 22, x - w / 2, y);
                g.closePath(); g.fill();
                // gramado claro em cima
                g.fillStyle = corIlha;
                g.beginPath(); g.roundRect(x - w / 2 - 3, y - 5, w + 6, 8, 4); g.fill();
                // arvorezinhas
                for (let a = 0; a < 3; a++) {
                    const ax = x - w * 0.3 + a * w * 0.28 + rnd() * 8, ah = 10 + rnd() * 8;
                    g.beginPath(); g.moveTo(ax - ah * 0.35, y - 4); g.lineTo(ax, y - 4 - ah); g.lineTo(ax + ah * 0.35, y - 4); g.closePath(); g.fill();
                }
                // cachoeirinha de luz
                g.fillStyle = rgbaDe(ph.platform.edge, 0.25);
                g.fillRect(x + w * 0.3, y + 2, 3, 30);
            }
        } else {
            // nebulosa: nuvens de cor suaves (várias manchas radiais)
            for (let i = 0; i < 9; i++) {
                const x = TW * (0.1 + rnd() * 0.8), y = hX * (0.15 + rnd() * 0.4), r = 40 + rnd() * 50;
                const cor = i % 2 ? ph.platform.glow : '#FF9CCB';
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, rgbaDe(cor, 0.13)); gr.addColorStop(1, rgbaDe(cor, 0));
                g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }
    }

    // 3) Montanhas distantes (enevoadas) e 4) montanhas próximas com pinheiros
    function montanhas(h, cor, borda, ns, amps, base, pinheiros) {
        const c = novoCanvas(TW, h);
        const g = c.getContext('2d');
        const fs = ns.map(() => rnd() * 6);
        const alturaEm = (x) => base + ns.reduce((s, n, i) => s + amps[i] * onda(x, n, fs[i]), 0);
        g.fillStyle = cor;
        g.beginPath(); g.moveTo(-16, h + 2);
        for (let x = -16; x <= TW + 16; x += 8) g.lineTo(x, h - alturaEm(x));
        g.lineTo(TW + 16, h + 2); g.closePath(); g.fill();
        if (pinheiros) {
            // silhueta conforme o tema: pinheiros, cogumelos, cristais, torres ou estalagmites
            const tipo = decorDaFase(ph.id);
            for (let i = 0; i < pinheiros; i++) {
                const x = rnd() * TW, y = h - alturaEm(x) + 2, a = 12 + rnd() * 18;
                g.beginPath();
                if (tipo === 'cogumelo') {
                    g.rect(x - a * 0.08, y - a * 0.55, a * 0.16, a * 0.55);
                    g.moveTo(x + a * 0.36, y - a * 0.5); g.ellipse(x, y - a * 0.55, a * 0.36, a * 0.26, 0, Math.PI, 0);
                } else if (tipo === 'cristal') {
                    g.moveTo(x - a * 0.18, y); g.lineTo(x - a * 0.12, y - a * 0.7); g.lineTo(x, y - a); g.lineTo(x + a * 0.12, y - a * 0.7); g.lineTo(x + a * 0.18, y);
                } else if (tipo === 'torre') {
                    g.rect(x - a * 0.14, y - a, a * 0.28, a);
                    g.moveTo(x - a * 0.2, y - a); g.lineTo(x, y - a * 1.3); g.lineTo(x + a * 0.2, y - a);
                } else if (tipo === 'estalagmite') {
                    g.moveTo(x - a * 0.25, y); g.quadraticCurveTo(x - a * 0.05, y - a * 0.5, x, y - a * 0.9); g.quadraticCurveTo(x + a * 0.05, y - a * 0.5, x + a * 0.25, y);
                } else {
                    g.moveTo(x - a * 0.32, y); g.lineTo(x, y - a); g.lineTo(x + a * 0.32, y);
                }
                g.closePath(); g.fill();
            }
        }
        // luz de borda no topo (cor da fase)
        g.strokeStyle = borda; g.lineWidth = 2;
        g.beginPath();
        for (let x = -16; x <= TW + 16; x += 8) g.lineTo(x, h - alturaEm(x));
        g.stroke();
        return c;
    }
    const hLonge = ch * 0.5, hPerto = ch * 0.38;
    const montanhasLonge = montanhas(hLonge, corMix(corMix(ph.sky[1], ph.platform.glow, 0.25), '#FFFFFF', 0.08),
        rgbaDe(ph.platform.edge, 0.25), [1, 2, 5], [hLonge * 0.18, hLonge * 0.1, hLonge * 0.04], hLonge * 0.45, 0);
    const montanhasPerto = montanhas(hPerto, corMix(corMix(ph.sky[0], '#000000', 0.35), ph.platform.glow, 0.12),
        rgbaDe(ph.platform.glow, 0.35), [2, 3, 7], [hPerto * 0.16, hPerto * 0.1, hPerto * 0.04], hPerto * 0.42, 40);

    // 5) Bancos de nuvem baixos e translúcidos (camada mais próxima do fundo)
    const hN = ch * 0.3;
    const nuvensBaixas = novoCanvas(TW, hN);
    {
        const g = nuvensBaixas.getContext('2d');
        // todos os círculos num caminho só, preenchido uma vez: transparência uniforme (sem anéis sobrepostos)
        const banco = new Path2D();
        const bolha = (x, r) => { banco.moveTo(x + r, hN - r * 0.35); banco.arc(x, hN - r * 0.35, r, 0, Math.PI * 2); };
        for (let i = 0; i < 26; i++) {
            const x = (i / 26) * TW + rnd() * 30, r = 26 + rnd() * 36;
            bolha(x, r);
            if (x - r < 0) bolha(x + TW, r);
            if (x + r > TW) bolha(x - TW, r);
        }
        // "mar de nuvens": degradê da cor da fase (topo) até o céu (base, opaco) + borda clara em cima
        const gradMar = g.createLinearGradient(0, hN * 0.2, 0, hN);
        // névoa lilás (puxada da cor da fase), não mais o cinza-azulado chapado
        const lilas = corMix(corMix(ph.sky[1], ph.platform.glow, 0.35), '#B9A4FF', 0.25);
        gradMar.addColorStop(0, rgbaDe(corMix(lilas, '#FFFFFF', 0.35), 0.45));
        gradMar.addColorStop(0.55, rgbaDe(lilas, 0.75));
        gradMar.addColorStop(1, corMix(lilas, COR_NOITE, 0.45));
        g.fillStyle = rgbaDe(corMix(ph.platform.edge, '#FFFFFF', 0.5), 0.55);     // borda clara: a forma inteira clara...
        g.fill(banco, 'nonzero');
        g.save(); g.translate(0, 2);                  // ...e por cima a mesma forma 2px abaixo (sobra só a borda do topo)
        g.fillStyle = gradMar;
        g.fill(banco, 'nonzero');
        g.restore();
    }

    // vaga-lumes: posições-base fixas por fase
    const vagalumes = Array.from({ length: 14 }, () => ({ x: rnd(), y: 0.3 + rnd() * 0.55, f: rnd() * 6, v: 0.6 + rnd() * 0.8 }));

    cacheCenario = { chave, estrelas, aurora, ceuExtra, montanhasLonge, montanhasPerto, nuvensBaixas, hLonge, hPerto, hN, vagalumes };
    return cacheCenario;
}

// Desenha um azulejo repetido na horizontal com deslocamento de parallax
function desenharCamada(img, x0, y) {
    const s = escalaFundo();
    const w = img.width / s, h = img.height / s;
    let x = -(x0 % w);
    if (x > 0) x -= w;
    for (; x < cw; x += w) bgCtx.drawImage(img, x, y, w, h);
}

// Lua: cheia (0), crescente (1) ou meia (2), conforme a fase
function spriteLua(variante = 0) {
    return spriteCache('lua|' + variante, 220, (g, t) => {
        const m = t / 2;
        const halo = g.createRadialGradient(m, m, 30, m, m, m);
        halo.addColorStop(0, `rgba(255,240,200,${variante === 1 ? 0.22 : 0.35})`);
        halo.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = halo; g.fillRect(0, 0, t, t);
        // disco da lua num canvas próprio, para "recortar" a sombra sem apagar o halo
        const d = document.createElement('canvas'); d.width = d.height = t;
        const dg = d.getContext('2d');
        const disco = dg.createRadialGradient(m - 12, m - 12, 4, m, m, 38);
        disco.addColorStop(0, '#FFFBEA'); disco.addColorStop(1, PALETA.lua);
        dg.fillStyle = disco;
        dg.beginPath(); dg.arc(m, m, 36, 0, Math.PI * 2); dg.fill();
        dg.fillStyle = 'rgba(190,160,110,0.22)';
        [[-10, 8, 7], [12, -6, 5], [6, 16, 4], [-14, -12, 3]].forEach(([dx, dy, r]) => { dg.beginPath(); dg.arc(m + dx, m + dy, r, 0, Math.PI * 2); dg.fill(); });
        dg.fillStyle = '#000';   // recorte opaco (senão a sombra quase não apaga)
        if (variante === 1) { dg.globalCompositeOperation = 'destination-out'; dg.beginPath(); dg.arc(m + 18, m - 8, 34, 0, Math.PI * 2); dg.fill(); }
        if (variante === 2) { dg.globalCompositeOperation = 'destination-out'; dg.fillRect(m + 4, 0, t, t); }
        g.drawImage(d, 0, 0);
    });
}

let estrelaCadente = null, proxCadente = 300;
function desenharEstrelaCadente() {
    if (!estrelaCadente && frames >= proxCadente) {
        estrelaCadente = { x: cw * (0.35 + Math.random() * 0.6), y: ch * (0.05 + Math.random() * 0.2), inicio: frames };
        proxCadente = frames + 600 + Math.random() * 900;
    }
    const e = estrelaCadente;
    if (!e) return;
    const t = (frames - e.inicio) / 45;
    if (t >= 1 || t < 0) { estrelaCadente = null; return; }
    const x = e.x - 380 * t, y = e.y + 170 * t;
    const grad = bgCtx.createLinearGradient(x, y, x + 70, y - 31);
    grad.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - t)})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    bgCtx.strokeStyle = grad; bgCtx.lineWidth = 2; bgCtx.lineCap = 'round';
    bgCtx.beginPath(); bgCtx.moveTo(x, y); bgCtx.lineTo(x + 70, y - 31); bgCtx.stroke();
}

// Fundo completo: céu, estrelas, lua, aurora, montanhas, nuvens e efeitos de algumas fases
function desenharFundo(faseIdx, dist, tx, ty) {
    const ph = FASES_VISUAL[faseIdx];
    desenharCeu(faseIdx, state === 'menu' ? 0 : progressoNaFase());
    const cen = obterCenario(faseIdx);
    bgCtx.save();
    bgCtx.translate(tx * 0.5, ty * 0.5);

    desenharCamada(cen.estrelas, dist * 0.02, 0);
    desenharCamada(cen.ceuExtra, dist * 0.035, Math.sin(frames * 0.006) * 4);   // tema do céu da fase
    const xLua = cw * (0.6 + (faseIdx % 4) * 0.09), yLua = ch * (0.13 + (faseIdx % 3) * 0.04);   // a lua muda de lugar e de fase
    bgCtx.drawImage(spriteLua(faseIdx % 3), xLua - 110, yLua - 110, 220, 220);
    // estrelas que piscam (sprite de 4 pontas, modo "lighter")
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'lighter';
    for (const bs of bgStars) {
        const x = ((bs.x - dist * 0.02) % cw + cw) % cw;
        const a = bs.alpha * (0.5 + 0.5 * Math.sin(frames * 0.07 + bs.fase));
        if (a < 0.05) continue;
        bgCtx.globalAlpha = a;
        const tam = bs.size * 6;
        bgCtx.drawImage(spriteEstrelinha('#FFFFFF'), x - tam / 2, bs.y - tam / 2, tam, tam);
    }
    bgCtx.restore();
    desenharEstrelaCadente();

    // aurora ondulando devagar
    bgCtx.globalAlpha = 0.75 + 0.25 * Math.sin(frames * 0.012);
    desenharCamada(cen.aurora, dist * 0.04 + frames * 0.25, Math.sin(frames * 0.008) * 8);
    bgCtx.globalAlpha = 1;

    // efeitos especiais de algumas fases
    if (ph.id === 2 && frames % 90 < 3) {
        bgCtx.strokeStyle = 'rgba(255,220,120,0.6)'; bgCtx.lineWidth = 2;
        const lx = (frames * 37) % cw;
        bgCtx.beginPath(); bgCtx.moveTo(lx, 0); bgCtx.lineTo(lx + 20, ch * 0.4); bgCtx.lineTo(lx - 10, ch * 0.6); bgCtx.lineTo(lx + 30, ch); bgCtx.stroke();
    } else if (ph.id === 9) {
        ['#ff8fb8', '#ffc98a', '#fff3a0', '#9be7a8', '#9bd0ff', '#c9a4ff'].forEach((col, i) => {
            bgCtx.strokeStyle = col; bgCtx.globalAlpha = 0.12; bgCtx.lineWidth = 16;
            bgCtx.beginPath(); bgCtx.moveTo(0, ch * 0.3 + i * 18);
            bgCtx.quadraticCurveTo(cw / 2, ch * 0.1 + i * 18, cw, ch * 0.3 + i * 18); bgCtx.stroke();
        });
        bgCtx.globalAlpha = 1;
    }

    desenharCamada(cen.montanhasLonge, dist * 0.12, ch - cen.hLonge);
    desenharCamada(cen.montanhasPerto, dist * 0.25, ch - cen.hPerto);
    desenharCamada(cen.nuvensBaixas, dist * 0.5, ch - cen.hN);

    if (ph.id === 3 || ph.id === 16) {
        bgCtx.fillStyle = gradCache(`lava|${ch}`, () => {
            const g = bgCtx.createLinearGradient(0, ch * 0.7, 0, ch);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,90,40,0.35)');
            return g;
        });
        bgCtx.fillRect(-20, ch * 0.7, cw + 40, ch * 0.3 + 20);
    } else if (ph.id === 4) {
        bgCtx.fillStyle = 'rgba(220,240,255,0.7)';
        for (let i = 0; i < 18; i++) {
            const sx = ((i * 211 + frames * (0.6 + (i % 4) * 0.3)) % (cw + 20)) - 10;
            const sy = (i * 97 + frames * (0.8 + (i % 3) * 0.4)) % ch;
            bgCtx.beginPath(); bgCtx.arc(cw - sx, sy, 1.5 + (i % 2), 0, Math.PI * 2); bgCtx.fill();
        }
    }
    bgCtx.restore();
}

// Vaga-lumes na frente (parallax 1,1x), pulsando
function desenharVagalumes(ctx, dist) {
    const cen = obterCenario(currentPhase);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const img = spriteLuz(PALETA.vagalume);
    for (const v of cen.vagalumes) {
        const x = (((v.x * (cw + 60) - dist * 1.1 * v.v + frames * 0.3) % (cw + 60)) + cw + 60) % (cw + 60) - 30;
        const y = v.y * ch + Math.sin(frames * 0.02 * v.v + v.f) * 14;
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(frames * 0.05 + v.f);
        ctx.drawImage(img, x - 7, y - 7, 14, 14);
    }
    ctx.restore();
}

// ── Plataformas de nuvem (sprite em cache por largura arredondada, tipo e fase) ──
const ESPESSURA_NUVEM = 44, MARGEM_NUVEM = 14;
const cacheNuvens = new Map();

// Material das plataformas normais em cada fase (a forma de nuvem e a área de pisar não mudam)
function materialDaFase(id) {
    const deco = decorDaFase(id);
    if (deco === 'cristal' || deco === 'estalagmite') return 'cristal';
    if (deco === 'cogumelo' || id % 6 === 1) return 'doce';
    if (id === 9 || id % 6 === 5) return 'arcoiris';
    return 'nuvem';
}
const CORES_ARCOIRIS = ['#FF9CCB', '#FFC98A', '#FFF3A0', '#A8F0C0', '#9BE7FF', '#C9A4FF'];
const CORES_CONFEITO = ['#FF6FA8', '#7FD8FF', '#FFE08A', '#8EE6A8', '#B9A4FF', '#FFFFFF'];

function spriteNuvem(w, tipo, ph) {
    const W = Math.max(48, Math.round(w / 16) * 16);
    const s = canvas.width / cw;
    const chave = `${ph.id}|${W}|${tipo}|${s}`;
    let c = cacheNuvens.get(chave);
    if (c) return c;
    if (cacheNuvens.size > 120) cacheNuvens.clear();
    const M = MARGEM_NUVEM, T = ESPESSURA_NUVEM;
    c = document.createElement('canvas');
    c.width = Math.ceil((W + 2 * M) * s);
    c.height = Math.ceil((T + 2 * M + 10) * s);
    c.larguraBase = W;
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, M * s, M * s);

    const material = tipo === 'normal' ? materialDaFase(ph.id) : 'nuvem';
    let base = corMix(PALETA.nuvem, ph.platform.edge, 0.06);
    let sombra = corMix(PALETA.nuvemSombra, ph.platform.glow, 0.25);
    let contorno = corMix(PALETA.nuvemContorno, ph.platform.glow, 0.15);
    if (material === 'cristal') { base = corMix(PALETA.cristal, ph.platform.edge, 0.15); sombra = corMix(PALETA.cristalSombra, ph.platform.glow, 0.2); contorno = PALETA.cristalContorno; }
    if (material === 'doce') { base = '#FFD3E8'; sombra = '#F29CC4'; contorno = '#6A2350'; }
    if (tipo === 'movel') base = corMix(PALETA.nuvemMovel, ph.platform.edge, 0.1);
    if (tipo === 'chuva') { base = PALETA.nuvemChuva; sombra = corMix(PALETA.nuvemChuva, '#3A2E55', 0.4); }

    // sombra projetada embaixo
    g.fillStyle = 'rgba(20,8,40,0.35)';
    g.beginPath(); g.ellipse(W / 2, T + 6, W / 2 - 4, 7, 0, 0, Math.PI * 2); g.fill();

    // forma: laje arredondada + bolhas embaixo + bolinhas no topo (sem passar da linha onde se pisa)
    const forma = new Path2D();
    forma.roundRect(0, 0, W, T - 12, [14, 14, 8, 8]);
    const nb = Math.max(2, Math.round(W / 26));
    for (let i = 0; i < nb; i++) {
        const bx = (i + 0.5) * W / nb, r = 13 + ((i * 7) % 5) * 1.6;
        forma.moveTo(bx + r, T - 14); forma.arc(bx, T - 14, r, 0, Math.PI * 2);
    }
    const nt = Math.max(2, Math.round(W / 30));
    for (let i = 0; i < nt; i++) {
        const bx = (i + 0.5) * W / nt;
        forma.moveTo(bx + 7, 6); forma.arc(bx, 6, 7, 0, Math.PI * 2);
    }
    g.lineJoin = 'round';
    g.strokeStyle = contorno; g.lineWidth = 5; g.stroke(forma);   // contorno único por trás
    g.fillStyle = sombra; g.fill(forma);
    g.save(); g.clip(forma); g.translate(-2, -6); g.fillStyle = base; g.fill(forma); g.restore();
    // brilho no topo + linha da cor da fase (identidade de cada fase)
    g.save(); g.clip(forma);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.roundRect(10, 2, W - 20, 4, 2); g.fill();
    g.fillStyle = rgbaDe(ph.platform.edge, 0.5);
    g.fillRect(0, T - 9, W, 3);   // faixa da cor da fase na borda de baixo
    if (material === 'arcoiris') {
        // faixas de arco-íris atravessando o meio da nuvem
        CORES_ARCOIRIS.forEach((c, i) => { g.fillStyle = rgbaDe(c, 0.8); g.fillRect(0, 11 + i * 3, W, 3); });
    } else if (material === 'cristal') {
        // facetas: cortes diagonais claros e escuros
        for (let x = 10; x < W - 6; x += 22) {
            g.fillStyle = 'rgba(255,255,255,0.45)';
            g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 8, 4); g.lineTo(x - 2, T - 14); g.lineTo(x - 8, T - 14); g.closePath(); g.fill();
            g.fillStyle = rgbaDe(PALETA.cristalContorno, 0.12);
            g.beginPath(); g.moveTo(x + 11, 4); g.lineTo(x + 14, 4); g.lineTo(x + 4, T - 14); g.lineTo(x + 1, T - 14); g.closePath(); g.fill();
        }
    } else if (material === 'doce') {
        // calda escorrendo (cobertura branca com pingos)
        g.fillStyle = '#FFF6FB';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 9);
        for (let x = W; x > 0; x -= 14) {
            const pingo = ((x * 7) % 3) * 3 + 4;
            g.quadraticCurveTo(x - 3, 9 + pingo * 2, x - 7, 9 + pingo);
            g.quadraticCurveTo(x - 10, 7, x - 14, 9);
        }
        g.closePath(); g.fill();
    }
    g.restore();
    if (material === 'doce') {
        // confeitos coloridos em cima
        for (let x = 9, i = 0; x < W - 6; x += 11, i++) {
            g.save(); g.translate(x, 5 + (i % 2) * 2); g.rotate((i * 1.3) % 3 - 1.5);
            g.fillStyle = CORES_CONFEITO[i % CORES_CONFEITO.length];
            g.beginPath(); g.roundRect(-3, -1.2, 6, 2.4, 1.2); g.fill();
            g.restore();
        }
    } else if (material === 'cristal') {
        // brilhinhos de 4 pontas no topo
        for (let x = 18, i = 0; x < W - 10; x += 46, i++) {
            g.drawImage(spriteEstrelinha('#FFFFFF'), x - 6, -3 + (i % 2) * 4, 12, 12);
        }
    }

    if (tipo === 'chuva') {
        // nuvem de chuva rachada (quebradiça)
        g.strokeStyle = contorno; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(W * 0.3, 3); g.lineTo(W * 0.36, 14); g.lineTo(W * 0.31, 24);
        g.moveTo(W * 0.68, 3); g.lineTo(W * 0.63, 16);
        g.stroke();
    } else if (tipo === 'movel') {
        // lacinho de fita na frente (plataforma móvel)
        g.save(); g.translate(W * 0.18, 8); g.scale(1.5, 1.5);   // lacinho maior
        g.fillStyle = PALETA.particulas[0]; g.strokeStyle = PALETA.nuvemContorno; g.lineWidth = 1.5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-8, -5); g.lineTo(-8, 5); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(0, 0); g.lineTo(8, -5); g.lineTo(8, 5); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.arc(0, 0, 2.6, 0, Math.PI * 2); g.fill(); g.stroke();
        g.restore();
    }
    cacheNuvens.set(chave, c);
    return c;
}

function desenharPlataforma(p, ph) {
    const screenX = p.x - distance;
    if (screenX > cw + 20 || screenX + p.w < -20) return;
    const tipo = p.quebradica ? 'chuva' : (p.amp ? 'movel' : 'normal');
    const img = spriteNuvem(p.w, tipo, ph);
    const k = p.w / img.larguraBase, M = MARGEM_NUVEM;
    const tremor = (p.quebradica && p.tempoPisado > 0 && !p.caindo) ? Math.sin(frames * 1.7) * 2 : 0;
    const s = canvas.width / cw;
    ctx.drawImage(img, screenX - M * k + tremor, p.y - M, img.width / s * k, img.height / s);
}

// ── Obstáculos (cristais, cortina de aurora, bloco de cristal) ──
const cacheObstaculos = new Map();
function _spriteObstaculo(tipo, ph, s) {
    const chave = `${tipo}|${ph.id}|${s}`;
    let c = cacheObstaculos.get(chave);
    if (c) return c;
    const [ow, oh] = DIMENSOES_OBSTACULO[tipo];
    const M = 8;
    c = document.createElement('canvas');
    c.width = Math.ceil((ow + 2 * M) * s); c.height = Math.ceil((oh + 2 * M) * s);
    c.margem = M;
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, M * s, M * s);
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (tipo === 'espinho') {
        const cor = corMix(PALETA.cristal, ph.platform.glow, 0.5), sombra = corMix(PALETA.cristalSombra, ph.platform.glow, 0.2);
        const picos = [[0, 13, 0.22, 0], [11, 25, 0.5, 0], [24, 36, 0.78, 0]];
        const alturas = [oh * 0.75, oh, oh * 0.8];
        picos.forEach(([x0, x1], i) => {
            const xm = (x0 + x1) / 2, topo = oh - alturas[i];
            const caminho = new Path2D();
            caminho.moveTo(x0, oh); caminho.lineTo(xm, topo); caminho.lineTo(x1, oh); caminho.closePath();
            g.strokeStyle = PALETA.cristalContorno; g.lineWidth = 4; g.stroke(caminho);
            g.fillStyle = sombra; g.fill(caminho);
            g.fillStyle = cor;
            g.beginPath(); g.moveTo(x0, oh); g.lineTo(xm, topo); g.lineTo(xm, oh); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(xm - 1, topo + 4); g.lineTo(x0 + 3, oh - 2); g.stroke();
        });
    } else if (tipo === 'barreira') {
        // cortina de aurora (o dash atravessa)
        const cor = corMix(PALETA.barreira[0], ph.platform.glow, 0.3), cor2 = corMix(PALETA.barreira[1], ph.platform.glow, 0.3);
        const grad = g.createLinearGradient(0, 0, 0, oh);
        grad.addColorStop(0, rgbaDe(cor, 0.15)); grad.addColorStop(0.5, rgbaDe(cor2, 0.75)); grad.addColorStop(1, rgbaDe(cor, 0.9));
        g.fillStyle = grad;
        g.beginPath();
        for (let y = 0; y <= oh; y += 6) g.lineTo(2 + Math.sin(y * 0.15) * 2, y);
        for (let y = oh; y >= 0; y -= 6) g.lineTo(ow - 2 + Math.sin(y * 0.15 + 1) * 2, y);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2;
        g.beginPath(); for (let y = 0; y <= oh; y += 6) g.lineTo(ow / 2 + Math.sin(y * 0.12) * 3, y); g.stroke();
    } else {
        // bloco de cristal rachado (o slam quebra)
        const cor = corMix(PALETA.bloco, ph.platform.glow, 0.2), sombra = corMix(PALETA.blocoSombra, ph.platform.glow, 0.15);
        const forma = new Path2D(); forma.roundRect(0, 0, ow, oh, 7);
        g.strokeStyle = PALETA.blocoContorno; g.lineWidth = 4; g.stroke(forma);
        g.fillStyle = sombra; g.fill(forma);
        g.save(); g.clip(forma); g.translate(-3, -4); g.fillStyle = cor; g.fill(forma); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath(); g.moveTo(5, 5); g.lineTo(ow * 0.55, 5); g.lineTo(5, oh * 0.55); g.closePath(); g.fill();
        g.strokeStyle = PALETA.blocoContorno; g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(ow * 0.2, 0); g.lineTo(ow * 0.45, oh * 0.4); g.lineTo(ow * 0.3, oh * 0.7); g.lineTo(ow * 0.55, oh);
        g.moveTo(ow * 0.45, oh * 0.4); g.lineTo(ow * 0.8, oh * 0.3);
        g.stroke();
    }
    cacheObstaculos.set(chave, c);
    return c;
}

// Ícone vetorial acima do obstáculo (substitui os emojis): >> = dash, ⇩ = slam
function desenharIcone(ctx, x, y, tipo) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const caminho = new Path2D();
    if (tipo === 'dash') {
        caminho.moveTo(-8, -5); caminho.lineTo(-3, 0); caminho.lineTo(-8, 5);
        caminho.moveTo(1, -5); caminho.lineTo(6, 0); caminho.lineTo(1, 5);
    } else {
        caminho.moveTo(0, -7); caminho.lineTo(0, 5);
        caminho.moveTo(-5, 0); caminho.lineTo(0, 5); caminho.lineTo(5, 0);
    }
    ctx.strokeStyle = PALETA.textoContorno; ctx.lineWidth = 5; ctx.stroke(caminho);
    ctx.strokeStyle = PALETA.texto; ctx.lineWidth = 2.4; ctx.stroke(caminho);
    ctx.restore();
}

function desenharObstaculo(ob, ph) {
    const sx = ob.x - distance;
    if (sx > cw || sx + ob.w < 0) return;
    const y = ob.plat.y - ob.h;
    const img = _spriteObstaculo(ob.tipo, ph, canvas.width / cw);
    const s = canvas.width / cw, M = img.margem;
    ctx.save();
    if (ob.tipo === 'barreira') ctx.globalAlpha = 0.75 + 0.25 * Math.sin(frames * 0.2);
    if (ob.tipo !== 'bloco') {
        // brilho atrás (sprite, sem shadowBlur)
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.6;
        ctx.drawImage(spriteLuz(ph.platform.glow), sx - 14, y - 10, ob.w + 28, ob.h + 20);
        ctx.restore();
    }
    ctx.drawImage(img, sx - M, y - M, img.width / s, img.height / s);
    ctx.restore();
    if (ob.tipo === 'barreira') desenharIcone(ctx, sx + ob.w / 2, y - 12, 'dash');
    else if (ob.tipo === 'bloco') desenharIcone(ctx, sx + ob.w / 2, y - 12, 'slam');
}

// Sombra no chão sob o personagem (ajuda a ler a altura do pulo)
function desenharSombraJogador() {
    const px = distance + player.x + player.w / 2;
    const pes = player.y + player.h;
    let chao = null;
    for (const p of platforms) {
        if (p.caindo || px < p.x || px > p.x + p.w || p.y < pes - 5) continue;
        if (!chao || p.y < chao.y) chao = p;
    }
    if (!chao) return;
    const k = Math.max(0.25, Math.min(1, 1 - (chao.y - pes) / 300));
    ctx.save();
    ctx.globalAlpha = 0.35 * k;
    ctx.fillStyle = PALETA.sombraJogador;
    ctx.beginPath();
    ctx.ellipse(player.x + player.w / 2, chao.y + 3, player.w * 0.55 * k, 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Escala da interface desenhada no canvas: no celular a resolução lógica (900) é maior que a tela,
// então textos e pílulas precisam crescer para continuar legíveis
function escalaUI() {
    const larguraCss = gameContainer.clientWidth || cw;
    return Math.max(1, cw / larguraCss);
}
const telaEstreita = () => (gameContainer.clientWidth || cw) < 600;

// Texto com contorno (sem shadowBlur)
function textoContornado(ctx, txt, x, y, cor, contorno, larguraContorno) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = contorno; ctx.lineWidth = larguraContorno;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = cor;
    ctx.fillText(txt, x, y);
}

function render() {
    const ph = FASES_VISUAL[currentPhase];
    // Tremor de tela: sorteado no passo de física (não muda a cada quadro desenhado em 144 Hz)
    const tx = tremorX, ty = tremorY;

    // ── FUNDO ──
    desenharFundo(currentPhase, distance, tx, ty);

    // ── CANVAS DO JOGO ──
    ctx.clearRect(0, 0, cw, ch); // limpa ANTES do tremor (sem faixas sujas nas bordas)
    ctx.save();
    ctx.translate(tx, ty);

    for (const p of platforms) desenharPlataforma(p, ph);
    for (const ob of obstaculos) if (!ob.destruido) desenharObstaculo(ob, ph);
    desenharVagalumes(ctx, distance);

    // Estrelas, penas e power-ups (só os que estão na tela)
    for (let s of stars) {
        const sx = s.x - distance;
        if (!s.collected && sx > -40 && sx < cw + 40) drawStar(ctx, sx, s.y, s.size, s.collected, (frames * 0.05) + s.oscOffset, s.starType);
    }
    for (let f of feathers) {
        if (!f.collected) drawFeather(ctx, f.x - distance, f.y, f.size, f.collected, (frames * 0.05) + f.oscOffset);
    }
    for (let pu of powerupItems) {
        const sx = pu.x - distance;
        if (!pu.collected && sx > -40 && sx < cw + 40) drawPowerupItem(ctx, pu, (frames * 0.05) + pu.oscOffset, distance);
    }

    if (isMagnetActive) drawMagnetField(ctx, player);

    desenharLinhasVelocidade(ctx);
    desenharParticulas(ctx);
    desenharAneis(ctx);
    desenharSombraJogador();

    const cx = player.x + player.w / 2; // player.x já é coordenada de tela
    const cy = player.y + player.h / 2;

    // ── AURAS & SKINS ──
    if (selectedSkin !== 'default') {
        const efeito = AURA_EFEITO[selectedSkin];
        if (efeito && efeito.brilho) {   // auras escuras (sombra, vazio, fumaça) não brilham
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const aSize = Math.max(player.w, player.h) * 3;
            ctx.drawImage(spriteLuz(efeito.brilho), cx - aSize / 2, cy - aSize / 2, aSize, aSize);
            ctx.restore();
        }
    }

    // Brilho do voo: um sprite só, atrás do personagem
    if (isFlying) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const t = 130 * (player.w / 50);
        ctx.drawImage(spriteLuz('#AADDFF'), cx - t / 2, cy - t / 2, t, t);
        ctx.restore();
    }

    desenharEfeitosPoderes(ctx);   // auras dos poderes por trás do personagem

    // Personagem e escudo (o unicórnio novo desenha antes o brilho, a fita de arco-íris e as estrelinhas)
    if (usaPersonagemNovo(player)) desenharEfeitosPersonagem(ctx, player, distance, gameSpeed, tempoRender);
    if (USAR_PERSONAGEM_NOVO) { desenharUnicornio(ctx, player.x, player.y, player, tempoRender, 1.3); }
    else if (player.char.id === 20) { drawDragon(ctx, player); }   // desenhos antigos (só para comparar)
    else if (player.char.id === 21) { drawCat(ctx, player); }
    else if (player.char.id === 22) { drawRabbit(ctx, player); }
    else { drawUnicorn(ctx, player); }
    if (isShieldActive) drawShieldRing(ctx, player);
    desenharSelosPoderes(ctx);   // x2, canguru, trevo... sobre a cabeça + labareda do foguete

    desenharVinhetaPoder(ctx);   // moldura colorida da câmera lenta, buraco negro, foguete...

    // ── FAIXA DE NOVA FASE ──
    if (phaseAnnounceFrames > 0) {
        let prog = phaseAnnounceFrames / 180;
        let alpha = prog > 0.8 ? (1 - prog) / 0.2 :
            prog < 0.15 ? prog / 0.15 : 1.0;
        ctx.save();
        ctx.globalAlpha = alpha * 0.95;
        let bh = 96;
        let bannerGrad = ctx.createLinearGradient(0, ch / 2 - bh / 2, 0, ch / 2 + bh / 2);
        bannerGrad.addColorStop(0, 'rgba(20,10,50,0)');
        bannerGrad.addColorStop(0.3, 'rgba(20,10,50,0.88)');
        bannerGrad.addColorStop(0.7, 'rgba(20,10,50,0.88)');
        bannerGrad.addColorStop(1, 'rgba(20,10,50,0)');
        ctx.fillStyle = bannerGrad;
        ctx.fillRect(0, ch / 2 - bh / 2, cw, bh);
        ctx.textAlign = 'center';
        // a faixa cresce no celular para o texto continuar legível
        const k = escalaUI();
        ctx.font = `600 ${15 * k}px ${FONTE_JOGO}`;
        textoContornado(ctx, `FASE ${currentPhase + 1} DE ${PHASES.length}`, cw / 2, ch / 2 - 16 * k, ph.platform.edge, PALETA.textoContorno, 4 * k);
        ctx.font = `700 ${Math.min(34 * k, cw / (ph.name.length * 0.62))}px ${FONTE_JOGO}`;
        textoContornado(ctx, ph.name, cw / 2, ch / 2 + 20 * k, PALETA.texto, PALETA.textoContorno, 6 * k);
        ctx.restore();
    }

    // (o indicador de fase agora é uma pílula do HUD em HTML — ver updateHUD)
    const kUI = escalaUI();

    // ── TEXTOS FLUTUANTES (com contorno, sem shadowBlur) ──
    ctx.save();
    ctx.textAlign = 'center';
    for (let ft of floatingTexts) {
        const e = ft.escala || 1;
        // surge com um "pop" (cresce rápido e assenta) e some no fim
        const pop = ft.life > 0.85 ? 1 + (ft.life - 0.85) * 3 : 1;
        ctx.globalAlpha = Math.max(0, Math.min(1, ft.life * 1.6));
        ctx.font = `700 ${Math.round(24 * kUI * e * pop)}px ${FONTE_JOGO}`;
        textoContornado(ctx, ft.text, ft.x, ft.y, PALETA.texto, ft.color, 5 * kUI * Math.min(e, 1.4));
    }
    ctx.restore();

    ctx.restore(); // tremor
}

// ─────────────────────────────────────────────────────────────────────────
// MENUS
// ─────────────────────────────────────────────────────────────────────────
btnStart.onclick = () => { startMusic(); initGame(); };
btnChars.onclick = () => {
    mainMenu.classList.add('hidden');
    charMenu.classList.remove('hidden');
    charMenu.scrollTop = 0;   // a loja sempre abre no começo
};
function voltarDaLoja() {
    charMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    iniciarLoopMenu();   // o fundo do menu fica parado enquanto a loja está aberta
}
btnBack.onclick = voltarDaLoja;   // botão fixo no topo da loja
document.getElementById('btn-back-fim').onclick = voltarDaLoja;   // e o do final, para quem rolou até lá
// atalhos da barra fixa: rolam a loja até a seção (descontando a altura da barra)
document.querySelectorAll('.loja-atalhos button').forEach(b => {
    b.onclick = () => {
        const alvo = document.getElementById(b.dataset.secao);
        const barra = charMenu.querySelector('.loja-topo').offsetHeight;
        const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        charMenu.scrollTo({ top: alvo.offsetTop - barra - 8, behavior: suave ? 'smooth' : 'auto' });
    };
});
// Esc fecha a loja
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !charMenu.classList.contains('hidden')) { voltarDaLoja(); e.preventDefault(); }
});
btnRestart.onclick = () => { startMusic(); initGame(); };
btnMenuGo.onclick = () => {
    state = 'menu'; // sem isto o Enter no menu reiniciava a partida e o fundo ficava parado
    gameOverMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    mobileControls.style.display = 'none';
    ctx.clearRect(0, 0, cw, ch);
    iniciarLoopMenu();
};

// Tela inicial: Espaço começa (só com o menu principal aberto)
window.addEventListener('keydown', (e) => {
    if (state !== 'menu' || mainMenu.classList.contains('hidden') || e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); btnStart.click(); }
});

// Fundo animado do menu: o mesmo cenário da Fase 1 passando devagar.
// Passo fixo de 60 Hz (mesma velocidade em telas de 60 ou 144 Hz) e parado quando a loja/placar cobre o menu.
let rafMenu = null, distanciaMenu = 0, ultimoMenu = 0, acumMenu = 0;
function loopMenu(agora) {
    if (state !== 'menu' || mainMenu.classList.contains('hidden')) {
        rafMenu = null;
        ctx.clearRect(0, 0, cw, ch);   // sem personagem por trás da loja/placar
        return;
    }
    if (!ultimoMenu) ultimoMenu = agora;
    acumMenu += Math.min(100, agora - ultimoMenu);
    ultimoMenu = agora;
    while (acumMenu >= PASSO_FISICA * 1000) {
        acumMenu -= PASSO_FISICA * 1000;
        frames++;
        distanciaMenu += 1.2;
        passoAtorMenu();
    }
    desenharFundo(0, distanciaMenu, 0, 0);
    desenharAtorMenu();
    rafMenu = requestAnimationFrame(loopMenu);
}

// Personagem escolhido correndo numa nuvem ao lado do painel do menu (pula de vez em quando)
let atorMenu = null, livreMenu = null;   // livreMenu: espaço à esquerda do painel (medido só quando a tela muda)
window.addEventListener('resize', () => { livreMenu = null; });
function passoAtorMenu() {
    const char = characters[selectedChar] || characters[0];
    if (!atorMenu || atorMenu.char !== char) {
        atorMenu = {
            char, w: 50, h: 40, rot: 0, spin: 0, scaleX: 1, scaleY: 1, vy: 0, onGround: true, mistura: 0,
            runPhase: 0, poseAr: { fl: -35, fr: -15, bl: 25, br: 5 }, hurtFrames: 0, sorriso: 0, piscar: 100,
            assustado: false, visual: visualParaDesenho(), x: 0, y: 0, alt: 0
        };
    }
    const a = atorMenu;
    // pulinho a cada ~4 s
    if (a.onGround && frames % 240 === 0) { a.vy = -8; a.onGround = false; }
    if (!a.onGround) {
        a.alt -= a.vy; a.vy += 0.4;
        if (a.alt <= 0) { a.alt = 0; a.vy = 0; a.onGround = true; a.scaleX = 1.3; a.scaleY = 0.7; }
    }
    a.scaleX += (1 - a.scaleX) * 0.2; a.scaleY += (1 - a.scaleY) * 0.2;
    atualizarPose(a, 6);
}
function desenharAtorMenu() {
    ctx.clearRect(0, 0, cw, ch);
    if (livreMenu === null) {
        const painel = mainMenu.getBoundingClientRect(), caixa = canvas.getBoundingClientRect();
        livreMenu = caixa.width ? (painel.left - caixa.left) * (cw / caixa.width) : 0;
    }
    // só aparece se couber à esquerda do painel (computador / celular deitado)
    if (livreMenu < 150 || !atorMenu) return;
    const a = atorMenu;
    a.visual = visualParaDesenho();
    const chao = ch * 0.72, xc = livreMenu / 2;
    const nuvem = spriteNuvem(160, 'normal', FASES_VISUAL[0]), s = canvas.width / cw;
    ctx.drawImage(nuvem, xc - 80 - MARGEM_NUVEM, chao - MARGEM_NUVEM, nuvem.width / s, nuvem.height / s);
    a.x = xc - a.w / 2; a.y = chao - a.h - a.alt;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(spriteLuz(PALETA.particulas[3]), xc - 70, a.y + a.h / 2 - 70, 140, 140);
    ctx.restore();
    desenharUnicornio(ctx, a.x, a.y, a, frames / 60, 1.3);
}
function iniciarLoopMenu() {
    // ao voltar ao menu, os poderes da última partida não valem mais (ex.: o ator não fica na pose de voo)
    isFlying = false;
    livreMenu = null;
    if (rafMenu === null) { ultimoMenu = 0; acumMenu = 0; rafMenu = requestAnimationFrame(loopMenu); }
}
iniciarLoopMenu();

// Tudo carregado: agora os retratos da loja podem ser desenhados
retratosLiberados = true;
desenharRetratosPendentes();
