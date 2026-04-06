const _origSet = Storage.prototype.setItem;
Storage.prototype.setItem = function () { try { _origSet.apply(this, arguments); } catch (e) { } };
const _origGet = Storage.prototype.getItem;
Storage.prototype.getItem = function () { try { return _origGet.apply(this, arguments); } catch (e) { return null; } };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let floatingTexts = [];
let sleepFrames = 0;
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

let cw, ch;

// Detect touch device — show mobile controls only on touch screens
const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function resize() {
    if (isTouchDevice()) {
        // Melhora a visão no celular usando o aspecto padronizado de um S24 Plus
        let isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait) {
            cw = canvas.width = bgCanvas.width = 900;
            ch = canvas.height = bgCanvas.height = 1950;
        } else {
            cw = canvas.width = bgCanvas.width = 1950;
            ch = canvas.height = bgCanvas.height = 900;
        }
    } else {
        cw = canvas.width = bgCanvas.width = window.innerWidth;
        ch = canvas.height = bgCanvas.height = window.innerHeight;
    }
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
const missionDesc = document.getElementById('mission-desc');
const missionProgressBar = document.getElementById('mission-progress-bar');
const missionProgressText = document.getElementById('mission-progress-text');
const missionReward = document.getElementById('mission-reward');
const toastContainer = document.getElementById('toast-container');

const nameInputContainer = document.getElementById('name-input-container');
const playerNameInput = document.getElementById('player-name');

// Game Variables
let globalStars = parseInt(localStorage.getItem('uniparkourGlobalStars')) || 10000;
let savedUpgrades = JSON.parse(localStorage.getItem('uniparkourUpgrades')) || {};
const defaultUpgrades = {
    jump: 0, score: 0, shield: 0, magnet: 0, dash_cd: 0, dash_pwr: 0,
    slam_score: 0, pu_time: 0, start_stars: 0, jump_pwr: 0, lucky_mult: 0,
    meteor_pts: 0, rocket_spd: 0, free_revive: 0, gravity_f: 0, slowmo_score: 0,
    coin_val: 0, star_spawn: 0, phase_chill: 0, magnet_spd: 0
};
let unlockedUpgrades = { ...defaultUpgrades, ...savedUpgrades };

let unlockedSkins = JSON.parse(localStorage.getItem('uniparkourSkins')) || ['default'];
let selectedSkin = localStorage.getItem('uniparkourActiveSkin') || 'default';
let currentMission = JSON.parse(localStorage.getItem('uniparkourMission')) || null;
let isMuted = JSON.parse(localStorage.getItem('uniparkourMuted'));
if (isMuted === null) isMuted = false;
let globalPowerupDurMult = parseFloat(localStorage.getItem('uniparkourPUDur')) || 1.0;

let audioCtx = null;
let musicOsc = null;
let musicGain = null;
let isSlamming = false;
let screenShake = 0;
let isDashing = false;
let dashCooldown = 0;
let dashTimeLeft = 0;

let state = 'menu';
let isPaused = false;
let score = 0;
let starsCollected = 0;
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
let particles = [];
let bgStars = [];

// ─────────────────────────────────────────────────────────────────────────
// 10 TIPOS DE ESTRELA — cada tipo tem valor, visual e raridade
// ─────────────────────────────────────────────────────────────────────────
const STAR_TYPES = [
    { id: 'comum', name: 'Estrela Comum', value: 10, size: 10, color: '#aaaaaa', glow: '#888888', points: 6, weight: 400 },
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

for (let i = 0; i < 100; i++) {
    bgStars.push({
        x: Math.random() * (window.innerWidth || 1920),
        y: Math.random() * (window.innerHeight || 1080),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1
    });
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

// ─────────────────────────────────────────────────────────────────────────
// GLOBAL LEADERBOARD — Firebase Realtime Database
// Follow the setup guide to configure your Firebase URL.
// ─────────────────────────────────────────────────────────────────────────

// ⚙️  CONFIGURE AQUI após criar seu projeto Firebase:
const FIREBASE_URL = 'https://unicornparkour-8f6a2-default-rtdb.firebaseio.com/';

// 🔑 Senha de admin criptografada (SHA-256 de "unicorn2024")
// Para trocar: gere o hash em https://emn178.github.io/online-tools/sha256.html
const ADMIN_PASSWORD_HASH = '26af5e5ee7c44cc8968b492f8b5bb861a8758d8653ce82ecf790a5f896c004d1';

// Detecta modo admin via URL (?admin=1)
const _urlParams = new URLSearchParams(window.location.search);
const isAdminMode = _urlParams.has('admin');

let leaderboard = [];
let _firebaseAvailable = (FIREBASE_URL && FIREBASE_URL !== 'COLE_SUA_URL_AQUI');

// SHA-256 via Web Crypto API (built-in no browser)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (listEl) listEl.innerHTML = '<p style="text-align:center;color:#aaa;">⏳ Carregando...</p>';

    if (_firebaseAvailable) {
        try {
            const res = await fetch(`${FIREBASE_URL}/leaderboard.json`);
            const data = await res.json();
            if (data && typeof data === 'object') {
                leaderboard = Object.values(data)
                    .filter(e => e && typeof e.score === 'number' && e.name)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10);
            } else {
                leaderboard = [];
            }
            return leaderboard;
        } catch (err) {
            console.warn('Firebase indisponível, usando localStorage:', err);
            _firebaseAvailable = false;
        }
    }
    // Fallback local
    leaderboard = JSON.parse(localStorage.getItem('unicornLeaderboard') || '[]');
    return leaderboard;
}

async function addScoreOnline(entry) {
    if (_firebaseAvailable) {
        try {
            await fetch(`${FIREBASE_URL}/leaderboard.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...entry, ts: Date.now() })
            });
            // Prune: manter só os top 100 no Firebase para economizar espaço
            await _pruneFirebase();
            await loadLeaderboard();
            return;
        } catch (err) {
            console.warn('Erro ao salvar no Firebase:', err);
        }
    }
    // Fallback local
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem('unicornLeaderboard', JSON.stringify(leaderboard));
}

async function _pruneFirebase() {
    try {
        const res = await fetch(`${FIREBASE_URL}/leaderboard.json`);
        const data = await res.json();
        if (!data) return;
        const entries = Object.entries(data)
            .map(([key, val]) => ({ key, ...val }))
            .sort((a, b) => b.score - a.score);
        const toDelete = entries.slice(100); // mantém top 100
        await Promise.all(toDelete.map(e =>
            fetch(`${FIREBASE_URL}/leaderboard/${e.key}.json`, { method: 'DELETE' })
        ));
    } catch { }
}

async function clearLeaderboardOnline() {
    if (_firebaseAvailable) {
        try {
            await fetch(`${FIREBASE_URL}/leaderboard.json`, { method: 'DELETE' });
        } catch (err) {
            console.warn('Erro ao limpar Firebase:', err);
        }
    }
    leaderboard = [];
    localStorage.removeItem('unicornLeaderboard');
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    if (leaderboard.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#aaa;">Nenhum recorde ainda! Seja o primeiro! 🏆</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    leaderboard.forEach((entry, index) => {
        let div = document.createElement('div');
        div.className = 'lb-row';
        let badge = medals[index] || `#${index + 1}`;
        let cName = entry.charName
            ? `<span class="lb-char" style="color:#00f0ff;font-size:0.85em;margin-left:5px;">(${entry.charName} — Fase ${entry.phase || 1})</span>`
            : '';
        div.innerHTML = `<span class="lb-rank">${badge}</span>
                         <span class="lb-name">${entry.name}${cName}</span>
                         <span class="lb-score">${Number(entry.score).toLocaleString()} pts</span>`;
        list.appendChild(div);
    });

    if (_firebaseAvailable) {
        const note = document.createElement('p');
        note.style.cssText = 'text-align:center;color:#555;font-size:0.75rem;margin-top:12px;';
        note.textContent = '🌐 Placar global — compartilhado entre todos os jogadores';
        list.appendChild(note);
    }
}

function checkHighScore(finalPt) {
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

    await addScoreOnline(entry);

    btnSaveScore.disabled = false;
    btnSaveScore.textContent = 'Salvar';
    nameInputContainer.classList.add('hidden');
    btnRestart.classList.remove('hidden');
    btnMenuGo.classList.remove('hidden');
};

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
};

btnClearLeaderboard.onclick = async () => {
    const pwd = prompt('🔑 Senha de administrador:');
    if (!pwd) return;
    const hash = await sha256(pwd);
    if (hash === ADMIN_PASSWORD_HASH) {
        if (confirm('⚠️ Apagar TODOS os recordes globais permanentemente?')) {
            await clearLeaderboardOnline();
            renderLeaderboard();
            showToast('Placar zerado com sucesso!');
        }
    } else {
        alert('❌ Senha incorreta!');
    }
};

btnMute.onclick = () => {
    isMuted = !isMuted;
    localStorage.setItem('uniparkourMuted', isMuted);
    btnMute.innerText = isMuted ? '🔇' : '🔊';
    if (isMuted && musicGain) musicGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    else if (!isMuted && musicGain) musicGain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.1);
};
btnMute.innerText = isMuted ? '🔇' : '🔊';

function playSound(type) {
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
    t.innerText = msg;
    t.style.background = '#ffdd00';
    t.style.color = '#000';
    t.style.padding = '10px 20px';
    t.style.borderRadius = '5px';
    t.style.fontWeight = 'bold';
    t.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
    t.style.animation = 'slideDown 0.3s ease-out';
    toastContainer.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transition = 'opacity 0.5s';
        setTimeout(() => t.remove(), 500);
    }, 3000);
}

function updateMissionUI() {
    if (!currentMission) {
        const types = ['stars', 'jumps', 'score'];
        let type = types[Math.floor(Math.random() * types.length)];
        let target = 0, reward = 0, desc = '';
        if (type === 'stars') { target = 200; reward = 3000; desc = 'Colete 200 estrelas'; }
        else if (type === 'jumps') { target = 50; reward = 2000; desc = 'Realize 50 pulos'; }
        else if (type === 'score') { target = 10000; reward = 5000; desc = 'Alcance 10,000 pontos'; }
        currentMission = { type, target, current: 0, reward, desc };
        localStorage.setItem('uniparkourMission', JSON.stringify(currentMission));
    }
    missionDesc.innerText = currentMission.desc;
    let pct = Math.min(100, (currentMission.current / currentMission.target) * 100);
    missionProgressBar.style.width = pct + '%';
    missionProgressText.innerText = `${Math.floor(currentMission.current)} / ${currentMission.target}`;
    missionReward.innerText = `🎁 +${currentMission.reward}`;
}
updateMissionUI();

function completeMission() {
    if (!currentMission) return;
    showToast(`Missão Cumprida: +${currentMission.reward} Estrelas!`);
    playSound('buy');
    globalStars += currentMission.reward;
    localStorage.setItem('uniparkourGlobalStars', globalStars);
    updateGlobalStarsDisplay();
    // Zera a missão para gerar uma nova
    currentMission = null;
    localStorage.removeItem('uniparkourMission');
    updateMissionUI(); // Gera nova missão automaticamente dentro de updateMissionUI
}

function checkMission(type, amount) {
    if (!currentMission) return;
    if (currentMission.type === type) {
        currentMission.current += amount;
        if (currentMission.current >= currentMission.target) {
            completeMission();
        } else {
            localStorage.setItem('uniparkourMission', JSON.stringify(currentMission));
            updateMissionUI();
        }
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
    { id: 8, cost: 0, name: "Fantasma", desc: "Duração estendida magias", powerupDurMult: 1.5, body: "rgba(255,255,255,0.7)", mane: ["rgba(255,255,255,0.5)", "rgba(100,200,255,0.5)"], particle: "rgba(255,255,255,0.4)" },
    { id: 9, cost: 0, name: "Ciborgue", desc: "Resistência estrutural", startShield: true, body: "#b0b0b0", mane: ["#ff0000", "#555555"], particle: "#ff0000" },
    { id: 10, cost: 0, name: "Aqua", desc: "Desliza e flutua 20%.", gravityMult: 0.8, body: "#44aaff", mane: ["#0055ff", "#002288"], particle: "#00aaff" },
    { id: 11, cost: 0, name: "Guerreiro", desc: "Mestre em Combate.", body: "#880000", mane: ["#ff0000", "#550000"], particle: "#ff3333" },
    { id: 12, cost: 0, name: "Anjo", desc: "Pulo suave.", jumpPowerMult: 1.2, body: "#ffffee", mane: ["#ffffff", "#ffddaa"], particle: "#ffffff" },
    { id: 13, cost: 0, name: "Oni", desc: "Score 1.5x, cai rápido.", pointsMult: 1.5, gravityMult: 1.5, body: "#220000", mane: ["#ff0000", "#aa0000"], particle: "#ff0000" },
    { id: 14, cost: 0, name: "Tóxico", desc: "Ímã natural extremo.", magnetic: 150, body: "#00ff00", mane: ["#005500", "#002200"], particle: "#00aa00" },
    { id: 15, cost: 0, name: "Ninja", desc: "Pulo x5, pulos fracos.", maxJumps: 5, jumpPowerMult: 0.7, body: "#111111", mane: ["#333333", "#555555"], particle: "#555555" },
    { id: 16, cost: 0, name: "Robô", desc: "Pulo Foguete x2.", jumpPowerMult: 2.0, pointsMult: 0.8, body: "#88aaa0", mane: ["#555555", "#00ffff"], particle: "#00ffff" },
    { id: 17, cost: 0, name: "Cristal", desc: "Estrelas raras x2.5.", spawnRateMult: 2.5, body: "#aaddff", mane: ["#ffffff", "#55aaff"], particle: "#aaddff" },
    { id: 18, cost: 0, name: "Bardo", desc: "Powerups x2 tempo.", powerupDurMult: 2.0, body: "#ff55aa", mane: ["#ff0055", "#ffaaaa"], particle: "#ff55aa" },
    { id: 19, cost: 0, name: "Rei", desc: "Maior chance e pontos.", pointsMult: 1.5, spawnRateMult: 1.5, maxJumps: 3, body: "#ffdd00", mane: ["#ffffff", "#ff8800"], particle: "#ffdd00" },
    { id: 20, cost: 0, name: "Dragão", desc: "Voa mais alto e veloz.", jumpPowerMult: 1.6, gravityMult: 0.7, maxJumps: 3, body: "#cc2200", mane: ["#ff6600", "#ffdd00"], particle: "#ff4400" },
    { id: 21, cost: 0, name: "Gatinho", desc: "Pula 4x e cai suave.", maxJumps: 4, gravityMult: 0.6, body: "#ffaadd", mane: ["#ff66bb", "#ffffff"], particle: "#ff99cc" },
    { id: 22, cost: 0, name: "Coelho", desc: "Pulo ultra-alto triplo.", jumpPowerMult: 1.8, maxJumps: 3, body: "#ffffff", mane: ["#ffccee", "#aaddff"], particle: "#ffffff" }
];
let selectedChar = 0;

const upgrades = [
    { id: 'jump', name: 'Salto Duplo+', desc: '+1 Pulo extra garantido', cost: 20000, maxLevel: 2 },
    { id: 'score', name: 'Multiplicador+', desc: 'Bônus de Score passivo', cost: 15000, maxLevel: 5 },
    { id: 'shield', name: 'Escudo Inicial', desc: 'Sempre inicie com escudo', cost: 50000, maxLevel: 1 },
    { id: 'magnet', name: 'Rádio-Ímã+', desc: '+20% alcance do ímã', cost: 10000, maxLevel: 5 },
    { id: 'dash_cd', name: 'Dash Recarga Rápida', desc: '-15% CD do Dash', cost: 18000, maxLevel: 3 },
    { id: 'dash_pwr', name: 'Super Dash', desc: 'Aumenta a velocidade do dash', cost: 22000, maxLevel: 3 },
    { id: 'slam_score', name: 'Impacto Lucrativo', desc: '+Pontos ao realizar Slam', cost: 12000, maxLevel: 5 },
    { id: 'pu_time', name: 'Maestria Arcana', desc: 'Magias duram +10%', cost: 25000, maxLevel: 4 },
    { id: 'start_stars', name: 'Gorjeta Inicial', desc: 'Inicia com 100 estrelas per lvl', cost: 10000, maxLevel: 5 },
    { id: 'jump_pwr', name: 'Músculos Tensos', desc: 'Pula levemente mais alto', cost: 20000, maxLevel: 3 },
    { id: 'lucky_mult', name: 'Trevo de Ouro', desc: 'Bônus lucky aumenta', cost: 30000, maxLevel: 3 },
    { id: 'meteor_pts', name: 'Cratera de Pontos', desc: 'Slam do meteoro mais valioso', cost: 28000, maxLevel: 3 },
    { id: 'rocket_spd', name: 'Foguete V8', desc: 'Foguete viaja ainda mais longe', cost: 40000, maxLevel: 2 },
    { id: 'free_revive', name: 'Segunda Chance', desc: 'Uma revivida passiva gratuita', cost: 80000, maxLevel: 1 },
    { id: 'gravity_f', name: 'Ossos Ocos', desc: 'Reduz a gravidade', cost: 24000, maxLevel: 3 },
    { id: 'slowmo_score', name: 'Tempo é Dinheiro', desc: 'Ganha mais pontos no slowmo', cost: 16000, maxLevel: 3 },
    { id: 'coin_val', name: 'Pedras Preciosas', desc: 'Estrelas dão mais score', cost: 35000, maxLevel: 4 },
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

function buySkin(id) {
    let s = skins.find(x => x.id === id);
    if (unlockedSkins.includes(id)) {
        selectedSkin = id;
        localStorage.setItem('uniparkourActiveSkin', selectedSkin);
        renderCharMenu();
        playSound('jump');
    } else {
        if (globalStars >= s.cost) {
            if (confirm(`Desbloquear ${s.name} por ${s.cost} estrelas?`)) {
                globalStars -= s.cost;
                unlockedSkins.push(id);
                selectedSkin = id;
                localStorage.setItem('uniparkourGlobalStars', globalStars);
                localStorage.setItem('uniparkourSkins', JSON.stringify(unlockedSkins));
                localStorage.setItem('uniparkourActiveSkin', selectedSkin);
                updateGlobalStarsDisplay();
                renderCharMenu();
                playSound('buy');
            }
        } else { alert("Estrelas insuficientes!"); }
    }
}

function renderCharMenu() {
    charGrid.innerHTML = '';
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = `char-card ${char.id === selectedChar ? 'selected' : ''}`;
        card.onclick = () => {
            document.querySelectorAll('#character-grid .char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedChar = char.id;
        };
        const preview = document.createElement('div'); preview.className = 'char-color-preview'; preview.style.backgroundColor = char.body;
        const mane = document.createElement('div');
        mane.style.position = 'absolute'; mane.style.top = '-5px'; mane.style.right = '-15px'; mane.style.width = '70px'; mane.style.height = '40px';
        mane.style.background = `linear-gradient(135deg, ${char.mane[0]}, ${char.mane[1]})`; mane.style.transform = 'rotate(45deg)';
        preview.appendChild(mane);

        card.innerHTML += `<div class="char-name">${char.name}</div><div class="char-desc">${char.desc}</div>`;
        card.insertBefore(preview, card.firstChild);
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
            <div style="margin-top:10px; font-weight:bold; color:${isMax ? '#00ff00' : '#ffdd00'}">${isMax ? 'MÁXIMO' : price + ' ⭐'}</div>
        `;
        upgradesGrid.appendChild(card);
    });

    skinsGrid.innerHTML = '';
    skins.forEach(s => {
        const isUnlocked = unlockedSkins.includes(s.id);
        const card = document.createElement('div');
        card.className = `char-card ${s.id === selectedSkin ? 'selected' : ''}`;
        card.onclick = () => buySkin(s.id);

        let visual = s.type !== 'none' ? `<div style="width:40px; height:40px; margin:0 auto 10px; border-radius:50%; background:linear-gradient(45deg, ${s.colors[0]}, ${s.colors[1]}); border: 2px solid #fff; box-shadow: 0 0 10px ${s.colors[0]}"></div>` : '<div style="font-size:2rem; margin-bottom:10px;">🦄</div>';

        card.innerHTML = `
            ${visual}
            <div class="char-name">${s.name}</div>
            <div class="char-desc">${s.desc}</div>
            <div style="margin-top:10px; font-weight:bold; color:${isUnlocked ? '#00f0ff' : '#ffdd00'}">${isUnlocked ? (s.id === selectedSkin ? 'EQUIPADO' : 'USAR') : s.cost + ' ⭐'}</div>
        `;
        skinsGrid.appendChild(card);
    });
}
renderCharMenu();

function initGame() {
    state = 'playing';
    isPaused = false;
    pauseMenu.classList.add('hidden');
    score = 0;
    starsCollected = 0;
    distance = 0;
    currentPhase = 0;
    phaseAnnounceFrames = 0;
    gameSpeed = PHASES[0].baseSpeed;
    frames = 0;
    platforms = [];
    stars = [];
    feathers = [];
    particles = [];

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
        spin: 0,
        scaleX: 1, scaleY: 1,
        // Character stats overrides
        gravity: 0.6 * (selectedCharObj.gravityMult || 1.0) * (1 - ((unlockedUpgrades.gravity_f || 0) * 0.08)),
        jumpPower: -12 * (selectedCharObj.jumpPowerMult || 1.0) * (1 + ((unlockedUpgrades.jump_pwr || 0) * 0.05)),
        maxJumps: (selectedCharObj.maxJumps || 2) + unlockedUpgrades.jump
    };

    if (unlockedUpgrades.start_stars > 0) {
        starsCollected = unlockedUpgrades.start_stars * 100;
    }


    if (selectedCharObj.startShield || unlockedUpgrades.shield > 0) {
        isShieldActive = true;
        shieldTimeLeft = 9999;
        shieldDisplay.classList.remove('hidden');
    }

    platforms.push({ x: 0, y: ch / 2 + 50, w: cw, h: ch });

    lastPlatformX = cw;
    applyPhaseParams();
    generateWorld();

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
    requestAnimationFrame(update);
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

function generateWorld() {
    while (lastPlatformX < distance + cw * 2) {
        let gap = Math.random() * (maxGap - minGap) + minGap;
        let w = Math.random() * (maxWidth - minWidth) + minWidth;

        let prevPlatform = platforms[platforms.length - 1];
        let py = prevPlatform ? prevPlatform.y : ch / 2;

        let yOffset = (Math.random() * 250) - 125;

        if (rainbowPlatformsCount > 0) {
            gap = 0;
            yOffset = 0;
            rainbowPlatformsCount--;
        }

        if (isNoGapActive) {
            gap = 0;
            yOffset = 0;
        }

        let y = py + yOffset;
        if (y < ch * 0.3) y = ch * 0.3;
        if (y > ch * 0.8) y = ch * 0.8;

        let x = lastPlatformX + gap;
        platforms.push({ x: x, y: y, w: w, h: ch });

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

        // Spawn powerup items (mutually exclusive, low chance)
        const POWERUP_TYPES = ['magnet', 'shield', 'bonus', 'infjump', 'starchest', 'shrink', 'giant', 'meteor', 'rocket', 'blackhole', 'lucky', 'hover', 'coinshower', 'rainbow', 'jackpot', 'nogap'];
        if (!omniSpawnedThisPhase && Math.random() < 0.03 * srMult) {
            omniSpawnedThisPhase = true;
            powerupItems.push({
                type: 'omni',
                x: x + w * 0.3 + Math.random() * w * 0.4,
                y: y - 90 - Math.random() * 50,
                size: 24,
                collected: false,
                oscOffset: Math.random() * Math.PI * 2
            });
        } else if (Math.random() < 0.07 * srMult) {
            let type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
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

function spawnJumpParticles() {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: player.x + player.w / 2,
            y: player.y + player.h,
            vx: (Math.random() - 0.5) * 5,
            vy: Math.random() * 2,
            life: 1,
            color: "#ffffff"
        });
    }
}

function jump() {
    if (state !== 'playing') return;

    if (isFlying) {
        player.vy = player.jumpPower * 0.8;
        player.scaleX = 0.7; // Stretch thin
        player.scaleY = 1.3; // Stretch up
        spawnJumpParticles();
        return;
    }

    if (player.jumps < player.maxJumps || isInfJumpActive || isHoverActive) {
        player.vy = player.jumpPower;
        player.jumps++;
        player.onGround = false;
        player.scaleX = 0.5; // Extreme stretch 
        player.scaleY = 1.6;

        // Backflip on double jump (or frequent jumps on infjump)
        if (player.jumps % 2 === 0) {
            player.spin = -Math.PI * 2;
        }

        playSound('jump');
        checkMission('jumps', 1);
        spawnJumpParticles();
    }
}

window.addEventListener('keydown', (e) => {
    if (state === 'playing') {
        if (e.code === 'Space' || e.code === 'KeyP' || e.code === 'Escape') {
            isPaused = !isPaused;
            if (isPaused) {
                pauseMenu.classList.remove('hidden');
            } else {
                pauseMenu.classList.add('hidden');
                update(); // Resume the loop
            }
            e.preventDefault();
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
            if (!isPaused) jump();
            e.preventDefault();
        } else if ((e.code === 'ArrowRight' || e.code === 'KeyD') && dashCooldown <= 0 && !isPaused && !isDashing) {
            isDashing = true;
            dashTimeLeft = 0.3; // 300ms
            dashCooldown = 3.0 * (1 - ((unlockedUpgrades.dash_cd || 0) * 0.15)); // 3 secs default, reduced by upgrade
            playSound('dash');
            e.preventDefault();
        } else if ((e.code === 'ArrowDown' || e.code === 'KeyS') && !player.onGround && !isPaused) {
            player.vy = 30; // Slam
            isSlamming = true;
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
// ─────────────────────────────────────────────────────────────────────────
// MOBILE CONTROLS — Visible buttons for touch devices
// ─────────────────────────────────────────────────────────────────────────

function doMobileDash() {
    if (state !== 'playing' || isPaused) return;
    if (dashCooldown <= 0 && !isDashing) {
        isDashing = true;
        dashTimeLeft = 0.3;
        dashCooldown = 3.0 * (1 - ((unlockedUpgrades.dash_cd || 0) * 0.15));
        playSound('dash');
    }
}

function doMobileSlam() {
    if (state !== 'playing' || isPaused) return;
    if (!player.onGround) {
        player.vy = 30;
        isSlamming = true;
    }
}

function doMobilePause() {
    if (state !== 'playing') return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseMenu.classList.remove('hidden');
        mobilePauseBtn.textContent = '▶';
    } else {
        pauseMenu.classList.add('hidden');
        mobilePauseBtn.textContent = '⏸';
        update();
    }
}

// Wire up mobile buttons — use 'click' for broad compatibility
// 'touchstart' listener added separately with passive:false to allow preventDefault
mobileJumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, { passive: false });
mobileDashBtn.addEventListener('touchstart', (e) => { e.preventDefault(); doMobileDash(); }, { passive: false });
mobileSlamBtn.addEventListener('touchstart', (e) => { e.preventDefault(); doMobileSlam(); }, { passive: false });
mobilePauseBtn.addEventListener('touchstart', (e) => { e.preventDefault(); doMobilePause(); }, { passive: false });

// Also 'click' for desktop emulation / accessibility
mobileJumpBtn.addEventListener('click', jump);
mobileDashBtn.addEventListener('click', doMobileDash);
mobileSlamBtn.addEventListener('click', doMobileSlam);
mobilePauseBtn.addEventListener('click', doMobilePause);

// Visual feedback: button press animation
[mobileJumpBtn, mobileDashBtn, mobileSlamBtn].forEach(btn => {
    btn.addEventListener('touchstart', () => { btn.style.transform = 'scale(0.88)'; btn.style.opacity = '0.7'; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(ev =>
        btn.addEventListener(ev, () => { btn.style.transform = ''; btn.style.opacity = ''; }, { passive: true })
    );
});

// ─── Fallback touch/click on the game area (everything that is NOT a button) ───
// Listen on document so the whole screen becomes the jump zone.
// Events that originate from inside #mobile-controls are ignored here.
document.addEventListener('touchstart', (e) => {
    if (state !== 'playing' || isPaused) return;
    if (e.target.closest && e.target.closest('#mobile-controls')) return; // button handled it
    jump();
    e.preventDefault();
}, { passive: false });

document.addEventListener('mousedown', (e) => {
    if (state !== 'playing' || isPaused) return;
    if (e.target.closest && e.target.closest('#mobile-controls')) return;
    if (e.target.closest && e.target.closest('.ui-panel')) return; // ignore menus
    jump();
});

function createPlayerParticle() {
    particles.push({
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
// UNICORN VISUAL ENGINE v4 — Correct proportions
// Physics, rig, hitbox: 100% UNCHANGED
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// DRAGON CHARACTER — Scaly, winged, fire-breathing beast
// ─────────────────────────────────────────────────────────────────────────
function drawDragon(ctx, p) {
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    let yOffset = p.onGround ? Math.sin(frames * 0.8) * 2 : 0;
    let rotation = p.onGround ? Math.sin(frames * 0.4) * 0.04 : Math.max(-0.3, Math.min(0.4, p.vy * 0.03));
    if (p.spin !== 0) rotation += p.spin;
    ctx.rotate(rotation);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.scale(p.w / 50, p.h / 40);
    ctx.translate(0, yOffset);
    ctx.scale(1.3, 1.3);

    let runTime = p.onGround ? frames * 0.55 : 0;
    let legFL = p.onGround ? Math.sin(runTime) * 30 : -25;
    let legFR = p.onGround ? Math.sin(runTime + Math.PI) * 30 : 8;
    let legBL = p.onGround ? Math.sin(runTime + Math.PI * 0.5) * 30 : 28;
    let legBR = p.onGround ? Math.sin(runTime + Math.PI * 1.5) * 30 : -8;
    let tailWave = Math.sin(frames * 0.3) * 12;
    let wingFlap = isFlying ? Math.sin(frames * 0.6) * 22 : Math.sin(frames * 0.25) * 5;

    const sc = ['#880800', '#cc2200', '#ff4400', '#ff8800', '#ffcc00'];
    const body = sc[1], bodyL = sc[2], bodyD = sc[0], bodyLL = sc[3];

    function scalyGrad(hx, hy, cx, cy, r) {
        let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
        g.addColorStop(0, bodyLL); g.addColorStop(0.4, bodyL); g.addColorStop(0.7, body); g.addColorStop(1, bodyD);
        return g;
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
        let lg = ctx.createRadialGradient(-4, 6, 0, 0, 12, 12);
        lg.addColorStop(0, bodyL); lg.addColorStop(1, bodyD);
        ctx.fillStyle = lg;
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
    ctx.translate(14, -12 + (p.onGround ? Math.sin(frames * 0.8) * 1 : 0));
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
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    let yOffset = p.onGround ? Math.sin(frames * 0.8) * 2 : 0;
    let rotation = p.onGround ? Math.sin(frames * 0.4) * 0.04 : Math.max(-0.3, Math.min(0.4, p.vy * 0.03));
    if (p.spin !== 0) rotation += p.spin;
    ctx.rotate(rotation);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.scale(p.w / 50, p.h / 40);
    ctx.translate(0, yOffset);
    ctx.scale(1.3, 1.3);

    let runTime = p.onGround ? frames * 0.65 : 0;
    let legFL = p.onGround ? Math.sin(runTime) * 32 : -28;
    let legFR = p.onGround ? Math.sin(runTime + Math.PI) * 32 : 9;
    let legBL = p.onGround ? Math.sin(runTime + Math.PI * 0.5) * 32 : 30;
    let legBR = p.onGround ? Math.sin(runTime + Math.PI * 1.5) * 32 : -9;
    let tailWave = Math.sin(frames * 0.35) * 14;
    let tailTip = Math.sin(frames * 0.55) * 10;
    let isBlinking = frames % 160 < 8;
    let isSmiling = !p.onGround || isFlying || score > 500;

    const body = '#ffaadd', bodyL = '#ffd0ee', bodyD = '#dd77bb', bodyLL = '#fff0f8';

    function catGrad(hx, hy, cx, cy, r) {
        let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
        g.addColorStop(0, bodyLL); g.addColorStop(0.4, bodyL); g.addColorStop(0.75, body); g.addColorStop(1, bodyD);
        return g;
    }

    function drawCatLeg(lx, ly, angle) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle * Math.PI / 180);
        let lg = ctx.createRadialGradient(-3, 5, 0, 0, 11, 11);
        lg.addColorStop(0, bodyL); lg.addColorStop(1, bodyD);
        ctx.fillStyle = lg;
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
    ctx.translate(14, -12 + (p.onGround ? Math.sin(frames * 0.8) * 1.5 : 0));
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
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    let yOffset = p.onGround ? Math.sin(frames * 0.9) * 2 : 0;
    let rotation = p.onGround ? Math.sin(frames * 0.4) * 0.03 : Math.max(-0.3, Math.min(0.4, p.vy * 0.03));
    if (p.spin !== 0) rotation += p.spin;
    ctx.rotate(rotation);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.scale(p.w / 50, p.h / 40);
    ctx.translate(0, yOffset);
    ctx.scale(1.3, 1.3);

    let runTime = p.onGround ? frames * 0.7 : 0;
    let legFL = p.onGround ? Math.sin(runTime) * 36 : -30;
    let legFR = p.onGround ? Math.sin(runTime + Math.PI) * 36 : 10;
    let legBL = p.onGround ? Math.sin(runTime + Math.PI * 0.5) * 36 : 34;
    let legBR = p.onGround ? Math.sin(runTime + Math.PI * 1.5) * 36 : -10;
    let earWave = Math.sin(frames * 0.28) * 6 + (p.onGround ? 0 : Math.sin(frames * 0.7) * 12);
    let isBlinking = frames % 140 < 8;
    let isSmiling = !p.onGround || isFlying || score > 300;

    const body = '#f4f4f4', bodyL = '#ffffff', bodyD = '#cccccc', bodyDeep = '#aaaaaa';
    const accent = '#ffbbcc'; // pink accents

    function rabbitGrad(hx, hy, cx, cy, r) {
        let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
        g.addColorStop(0, bodyL); g.addColorStop(0.4, body); g.addColorStop(0.75, bodyD); g.addColorStop(1, bodyDeep);
        return g;
    }

    function drawRabbitLeg(lx, ly, angle, isFront) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle * Math.PI / 180);
        let lg = ctx.createRadialGradient(-4, 5, 0, 0, 12, 14);
        lg.addColorStop(0, bodyL); lg.addColorStop(1, bodyD);
        ctx.fillStyle = lg;
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
    ctx.translate(14, -13 + (p.onGround ? Math.sin(frames * 0.8) * 1.5 : 0));
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


function shadeLighter(col, amount) {
    if (!col || col.startsWith('rgba') || col.startsWith('rgb')) return col || '#fff';
    try {
        let r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
        return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
    } catch (e) { return col; }
}
function shadeDarker(col, amount) {
    if (!col || col.startsWith('rgba') || col.startsWith('rgb')) return col || '#000';
    try {
        let r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
        return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
    } catch (e) { return col; }
}

// PS2-style leg — organic rounded shapes with Gouraud-like radial shading
// pivot/rotation logic: 100% UNCHANGED
function drawLeg(ctx, x, y, w, h, angleDeg, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleDeg * Math.PI / 180);

    const lw = w;
    const light = shadeLighter(color, 70);
    const dark = shadeDarker(color, 50);

    // Upper thigh — rounded ellipse with radial 3D shading
    let thighG = ctx.createRadialGradient(-lw * 0.3, h * 0.07, 0, 0, h * 0.22, lw * 1.5);
    thighG.addColorStop(0, light);
    thighG.addColorStop(0.45, color);
    thighG.addColorStop(1, dark);
    ctx.fillStyle = thighG;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.22, lw, h * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knee cap — subtle rounded bump
    let kneeG = ctx.createRadialGradient(-lw * 0.2, h * 0.50, 0, 0, h * 0.52, lw * 0.9);
    kneeG.addColorStop(0, light);
    kneeG.addColorStop(1, dark);
    ctx.fillStyle = kneeG;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.52, lw * 0.62, lw * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower shin — tapered
    let shinG = ctx.createLinearGradient(-lw, h * 0.52, lw, h * 0.52);
    shinG.addColorStop(0, dark);
    shinG.addColorStop(0.35, light);
    shinG.addColorStop(1, dark);
    ctx.fillStyle = shinG;
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
    let hoofG = ctx.createLinearGradient(-lw * 0.45, h * 0.88, lw * 0.45, h * 1.1);
    hoofG.addColorStop(0, '#3a3042');
    hoofG.addColorStop(0.4, '#2a2030');
    hoofG.addColorStop(1, '#14101a');
    ctx.fillStyle = hoofG;
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

    // ── RIG ANCHOR (unchanged) ──
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);

    // ── PHYSICS TRANSFORMS (unchanged) ──
    let yOffset = p.onGround ? Math.sin(frames * 0.8) * 3 : 0;
    let rotation = 0;
    if (p.onGround) {
        rotation = Math.sin(frames * 0.4) * 0.05;
    } else {
        rotation = p.vy * 0.03;
        rotation = Math.max(-0.3, Math.min(0.4, rotation));
    }
    if (p.spin !== 0) rotation += p.spin;
    ctx.rotate(rotation);
    ctx.scale(p.scaleX, p.scaleY);   // squash & stretch — UNCHANGED
    ctx.scale(p.w / 50, p.h / 40);   // Visual scale for giant/shrink powerups
    ctx.translate(0, yOffset);
    ctx.scale(1.3, 1.3);

    // ── EXPRESSIONS (unchanged logic) ──
    let runTime = p.onGround ? frames * 0.6 : 0;
    let isBlinking = (frames % 180 < 10);
    let isSmiling = (!p.onGround || isFlying || score > 1000);

    // ── WALK CYCLE (unchanged math) ──
    let legFrontL = p.onGround ? Math.sin(runTime) * 35 : -30;
    let legFrontR = p.onGround ? Math.sin(runTime + Math.PI) * 35 : 10;
    let legBackL = p.onGround ? Math.sin(runTime + Math.PI * 0.5) * 35 : 30;
    let legBackR = p.onGround ? Math.sin(runTime + Math.PI * 1.5) * 35 : -10;

    if (isFlying) {
        legFrontL = -20; legFrontR = -10; legBackL = 20; legBackR = 10;
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 18;
    }

    let bColor = c.body || '#ffffff';
    let maneCols = c.mane || ['#ff007f', '#00f0ff'];
    let ghost = (c.id === 8);
    if (ghost) ctx.globalAlpha = 0.72;

    const bodyLight = shadeLighter(bColor, 75);
    const bodyMid = bColor;
    const bodySh = shadeDarker(bColor, 38);
    const bodyDeep = shadeDarker(bColor, 66);
    const mane0 = maneCols[0];
    const mane1 = maneCols[1] || maneCols[0];

    // Smooth Gouraud-like radial body gradient
    function bGrad(hx, hy, cx, cy, r) {
        if (ghost) return bColor;
        let g = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
        g.addColorStop(0, bodyLight);
        g.addColorStop(0.38, bodyMid);
        g.addColorStop(0.72, bodySh);
        g.addColorStop(1, bodyDeep);
        return g;
    }
    // Mane/tail gradient
    function mGrad(x0, y0, x1, y1) {
        let g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, shadeLighter(mane0, 45));
        g.addColorStop(0.45, mane0);
        g.addColorStop(1, mane1);
        return g;
    }

    const tailWave = Math.sin(frames * 0.28) * 10;
    const tailWave2 = Math.sin(frames * 0.44 + 1.1) * 6;
    const maneWave = Math.sin(frames * 0.35) * 5;
    const headBob = p.onGround ? Math.sin(frames * 0.8) * 1.5 : 0;

    // ═══════════════════════════════════════════════
    // LAYER 1 — REAR LEGS (behind torso — slightly dim)
    // ═══════════════════════════════════════════════
    ctx.globalAlpha = ghost ? 0.35 : 0.65;
    drawLeg(ctx, -11, 12, 6.5, 22, legBackR, bodySh);
    drawLeg(ctx, 8, 12, 6.5, 22, legFrontR, bodySh);
    ctx.globalAlpha = ghost ? 0.72 : 1.0;

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
    ctx.globalAlpha = ghost ? 0.6 : 0.88;
    ctx.fillStyle = mGrad(-38, -6, -10, 22);
    ctx.beginPath();
    ctx.moveTo(-16, 3);
    ctx.bezierCurveTo(-25, -1 + tailWave2, -46, 9 + tailWave2, -38, 21 + tailWave2);
    ctx.bezierCurveTo(-32, 29 + tailWave2, -22, 23 + tailWave, -16, 12);
    ctx.closePath();
    ctx.fill();
    // Strand 3 — front wisp
    ctx.globalAlpha = ghost ? 0.45 : 0.6;
    ctx.fillStyle = mGrad(-28, -4, -8, 15);
    ctx.beginPath();
    ctx.moveTo(-15, 1);
    ctx.quadraticCurveTo(-30, -1 + tailWave, -24, 12 + tailWave);
    ctx.quadraticCurveTo(-18, 18 + tailWave, -14, 8);
    ctx.fill();
    ctx.globalAlpha = ghost ? 0.72 : 1.0;

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
    let nkG = ctx.createLinearGradient(-10, 14, 5, -14);
    nkG.addColorStop(0, bodySh);
    nkG.addColorStop(0.45, bodyMid);
    nkG.addColorStop(1, bodyLight);
    ctx.fillStyle = nkG;
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
    ctx.globalAlpha = ghost ? 0.6 : 0.82;
    ctx.fillStyle = mGrad(0, -16, -16, 8);
    ctx.beginPath();
    ctx.moveTo(-1, -14);
    ctx.bezierCurveTo(-8, -10 + maneWave * 0.7, -20, 2 + maneWave * 0.7, -16, 10 + maneWave * 0.7);
    ctx.bezierCurveTo(-12, 16 + maneWave * 0.7, -4, 12, -2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = ghost ? 0.72 : 1.0;
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
    let hG = ctx.createLinearGradient(5, -14, 10, -37);
    hG.addColorStop(0, shadeDarker(hornCol, 20));
    hG.addColorStop(0.6, hornCol);
    hG.addColorStop(1, '#ffffff');
    ctx.fillStyle = hG;
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
    if (c.id === 9) {
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
    if (isSmiling) {
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
        ctx.shadowColor = '#aae8ff'; ctx.shadowBlur = 20;
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
    ctx.rotate(t * 0.5);
    ctx.shadowColor = st.glow;
    ctx.shadowBlur = 15 + Math.sin(t * 2) * 6;

    // Gradiente radial para visual rico
    let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, st.color);
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

    ctx.restore();

    // Label de valor para estrelas supremas+ (hard to miss)
    if (st.value >= 2500) {
        ctx.save();
        ctx.font = `bold ${Math.max(9, Math.floor(sz * 0.55))}px sans-serif`;
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

function drawPowerupItem(ctx, pu, t) {
    if (pu.collected) return;
    const x = pu.x;
    const y = pu.y + Math.sin(t * 1.4) * 7;
    ctx.save();
    ctx.translate(x, y);

    const STYLES = {
        magnet: { glow: '#ff44aa', label: '🧲', bg1: '#cc2288', bg2: '#ff88cc', r: 19 },
        shield: { glow: '#44ccff', label: '🛡', bg1: '#0066aa', bg2: '#88ddff', r: 19 },
        bonus: { glow: '#ffff00', label: '✨', bg1: '#aa8800', bg2: '#ffff44', r: 19 },
        slowmo: { glow: '#00ffcc', label: '🌀', bg1: '#006644', bg2: '#44ffcc', r: 19 },
        infjump: { glow: '#ff8800', label: '🦘', bg1: '#aa3300', bg2: '#ff8800', r: 19 },
        shrink: { glow: '#ff0055', label: '🍄', bg1: '#880022', bg2: '#ff3377', r: 19 },
        giant: { glow: '#44ff00', label: '🦖', bg1: '#116600', bg2: '#66ff44', r: 19 },
        meteor: { glow: '#ff2200', label: '☄️', bg1: '#aa1100', bg2: '#ff5533', r: 19 },
        rocket: { glow: '#ffffff', label: '🚀', bg1: '#555555', bg2: '#aaaaaa', r: 19 },
        blackhole: { glow: '#8800ff', label: '🌌', bg1: '#330066', bg2: '#aa44ff', r: 19 },
        lucky: { glow: '#00ffaa', label: '🍀', bg1: '#006644', bg2: '#44ffcc', r: 19 },
        hover: { glow: '#00ccff', label: '🛸', bg1: '#004488', bg2: '#44aaff', r: 19 },
        nogap: { glow: '#00ff00', label: '🌉', bg1: '#004400', bg2: '#00ff00', r: 19 },
        starchest: { glow: '#ffd700', label: '📦', bg1: '#8b4500', bg2: '#ffd700', r: 22 },
        coinshower: { glow: '#ffee00', label: '🌧️', bg1: '#aa8800', bg2: '#ffee00', r: 22 },
        rainbow: { glow: '#ff00ff', label: '🌈', bg1: '#ff0000', bg2: '#0000ff', r: 22 },
        jackpot: { glow: '#ffaa00', label: '🎰', bg1: '#bb6600', bg2: '#ffaa00', r: 22 },
        omni: { glow: '#ffffff', label: '🌟', bg1: '#ff00ff', bg2: '#00ffff', r: 24 }
    };
    const s = STYLES[pu.type];
    const r = s.r;

    // Outer glow pulse
    ctx.shadowColor = s.glow;
    ctx.shadowBlur = 16 + Math.sin(t * 2) * 6;

    // Background circle
    let bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    bg.addColorStop(0, s.bg2);
    bg.addColorStop(1, s.bg1);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Bright rim
    ctx.strokeStyle = s.glow;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Emoji icon
    ctx.font = `bold ${Math.round(r * 1.1)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, 0, 1);

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
    // Outer glow
    ctx.shadowColor = '#44ccff';
    ctx.shadowBlur = 18;
    // Rotating arc segments
    ctx.strokeStyle = 'rgba(100,220,255,0.88)';
    ctx.lineWidth = 3;
    let rot = frames * 0.04;
    for (let i = 0; i < 4; i++) {
        let a = rot + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a, a + Math.PI * 0.38);
        ctx.stroke();
    }
    // Inner soft fill
    let grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, 'rgba(100,220,255,0.06)');
    grd.addColorStop(1, 'rgba(100,220,255,0.18)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.strokeStyle = isMagnetActive ? 'rgba(255,100,180,0.2)' : 'rgba(255,215,0,0.1)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -(frames * 1.2);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawFeather(ctx, x, y, size, collected, t) {
    if (collected) return;
    ctx.save();
    ctx.translate(x, y + Math.sin(t) * 10);
    ctx.rotate(Math.sin(t * 0.5) * 0.2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.quadraticCurveTo(-size, size / 2, 0, -size);
    ctx.quadraticCurveTo(size, size / 2, 0, size);
    ctx.fill();
    ctx.strokeStyle = "#aaaaaa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, -size + 4);
    ctx.stroke();
    ctx.restore();
}

function updateHUD() {
    scoreDisplay.innerText = Math.floor(score);
    starsDisplay.innerText = starsCollected;
    let spdMult = ((gameSpeed / (window.innerWidth > 800 ? 7 : 5))).toFixed(1);
    speedDisplay.innerText = spdMult;
}

function update() {
    if (state !== 'playing' || isPaused) return;

    if (sleepFrames > 0) {
        sleepFrames--;
        requestAnimationFrame(update);
        return; // Hit-Pause effect
    }

    // Process floating texts logic
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y -= 2.5;
        ft.life -= 0.02;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    const dt = 1 / 60;

    // ── Powerup timers ──
    if (isFlying) {
        flightTimeLeft -= dt;
        flightTimerDisplay.innerText = Math.max(0, flightTimeLeft).toFixed(1);
        if (flightTimeLeft <= 0) { isFlying = false; flightTimeLeft = 0; powerupDisplay.classList.add('hidden'); }
    }
    if (isMagnetActive) {
        magnetTimeLeft -= dt;
        magnetTimerDisplay.innerText = Math.max(0, magnetTimeLeft).toFixed(1);
        if (magnetTimeLeft <= 0) { isMagnetActive = false; magnetTimeLeft = 0; magnetDisplay.classList.add('hidden'); }
    }
    if (isShieldActive) {
        shieldTimerDisplay.innerText = "∞";
    }
    if (isBonusActive) {
        bonusTimeLeft -= dt;
        bonusTimerDisplay.innerText = Math.max(0, bonusTimeLeft).toFixed(1);
        if (bonusTimeLeft <= 0) { isBonusActive = false; bonusTimeLeft = 0; bonusDisplay.classList.add('hidden'); }
    }
    if (isSlowMoActive) {
        slowMoTimeLeft -= dt;
        slowmoTimerDisplay.innerText = Math.max(0, slowMoTimeLeft).toFixed(1);
        if (slowMoTimeLeft <= 0) { isSlowMoActive = false; slowMoTimeLeft = 0; slowmoDisplay.classList.add('hidden'); }
    }
    if (isInfJumpActive) {
        infJumpTimeLeft -= dt;
        infjumpTimerDisplay.innerText = Math.max(0, infJumpTimeLeft).toFixed(1);
        if (infJumpTimeLeft <= 0) { isInfJumpActive = false; infJumpTimeLeft = 0; infjumpDisplay.classList.add('hidden'); }
    }
    if (isShrinkActive) {
        shrinkTimeLeft -= dt;
        shrinkTimerDisplay.innerText = Math.max(0, shrinkTimeLeft).toFixed(1);
        if (shrinkTimeLeft <= 0) { isShrinkActive = false; shrinkTimeLeft = 0; shrinkDisplay.classList.add('hidden'); }
    }
    if (isGiantActive) {
        giantTimeLeft -= dt;
        giantTimerDisplay.innerText = Math.max(0, giantTimeLeft).toFixed(1);
        if (giantTimeLeft <= 0) { isGiantActive = false; giantTimeLeft = 0; giantDisplay.classList.add('hidden'); }
    }
    if (isMeteorActive) {
        meteorTimeLeft -= dt;
        meteorTimerDisplay.innerText = Math.max(0, meteorTimeLeft).toFixed(1);
        if (meteorTimeLeft <= 0) { isMeteorActive = false; meteorTimeLeft = 0; meteorDisplay.classList.add('hidden'); }
    }
    if (isRocketActive) {
        rocketTimeLeft -= dt;
        rocketTimerDisplay.innerText = Math.max(0, rocketTimeLeft).toFixed(1);
        if (rocketTimeLeft <= 0) { isRocketActive = false; rocketTimeLeft = 0; rocketDisplay.classList.add('hidden'); }
    }
    if (isBlackHoleActive) {
        blackholeTimeLeft -= dt;
        blackholeTimerDisplay.innerText = Math.max(0, blackholeTimeLeft).toFixed(1);
        if (blackholeTimeLeft <= 0) { isBlackHoleActive = false; blackholeTimeLeft = 0; blackholeDisplay.classList.add('hidden'); }
    }
    if (isLuckyActive) {
        luckyTimeLeft -= dt;
        luckyTimerDisplay.innerText = Math.max(0, luckyTimeLeft).toFixed(1);
        if (luckyTimeLeft <= 0) { isLuckyActive = false; luckyTimeLeft = 0; luckyDisplay.classList.add('hidden'); }
    }
    if (isHoverActive) {
        hoverTimeLeft -= dt;
        hoverTimerDisplay.innerText = Math.max(0, hoverTimeLeft).toFixed(1);
        if (hoverTimeLeft <= 0) { isHoverActive = false; hoverTimeLeft = 0; hoverDisplay.classList.add('hidden'); }
    }
    if (isNoGapActive) {
        noGapTimeLeft -= dt;
        nogapTimerDisplay.innerText = Math.max(0, noGapTimeLeft).toFixed(1);
        if (noGapTimeLeft <= 0) { isNoGapActive = false; noGapTimeLeft = 0; nogapDisplay.classList.add('hidden'); }
    }

    let targetW = 50, targetH = 40;
    if (isShrinkActive) { targetW = 25; targetH = 20; }
    else if (isGiantActive) { targetW = 100; targetH = 80; }
    else if (player.char.id === 0) { targetW = 50; targetH = 40; } // Fallback to normal
    player.w += (targetW - player.w) * 0.1;
    player.h += (targetH - player.h) * 0.1;

    // Squash & Stretch interpolation back to 1
    player.scaleX += (1 - player.scaleX) * 0.15;
    player.scaleY += (1 - player.scaleY) * 0.15;

    // Decay spin
    if (player.spin < 0) {
        player.spin += 0.2;
        if (player.spin > 0) player.spin = 0;
    }

    let currentGravity = isFlying ? player.gravity * 0.4 : player.gravity;
    // Meteor ability
    if (isMeteorActive && !player.onGround && player.vy > 0) currentGravity *= 2.5;

    player.vy += currentGravity;

    // Hover ability
    if (isHoverActive && player.vy > 0) player.vy *= 0.8;

    player.y += player.vy;

    if (player.y < -50) { player.y = -50; player.vy = 0; }

    // Rocket override
    if (isRocketActive) {
        player.y = -80;
        player.vy = 0;
        player.jumps = 0;
        for (let i = 0; i < 3; i++) particles.push({ x: player.x, y: player.y + player.h / 2, vx: -Math.random() * 20, vy: (Math.random() - 0.5) * 10, life: 1, color: '#ff4400', size: 6 });
    }

    let effectiveSpeed = isSlowMoActive ? gameSpeed * 0.45 : gameSpeed;
    if (isRocketActive) effectiveSpeed += gameSpeed * (2.0 + ((unlockedUpgrades.rocket_spd || 0) * 0.5));

    // Dash Logic
    if (dashCooldown > 0) dashCooldown -= dt;
    if (dashTimeLeft > 0) {
        dashTimeLeft -= dt;
        isDashing = true;
        effectiveSpeed += 25 + ((unlockedUpgrades.dash_pwr || 0) * 10); // Massive speed boost
        player.vy = 0; // Freeze vertical movement
        player.scaleX = 1.6;
        player.scaleY = 0.5;
        particles.push({ x: player.x, y: player.y + player.h / 2 + (Math.random() * 20 - 10), vx: -10, vy: (Math.random() - 0.5) * 2, life: 1, color: '#00ffff', size: 6 });
    } else {
        isDashing = false;
    }

    distance += effectiveSpeed;

    let smGain = isSlowMoActive ? (1 + ((unlockedUpgrades.slowmo_score || 0) * 0.5)) : 1;
    let luckyM = isLuckyActive ? (5 + ((unlockedUpgrades.lucky_mult || 0) * 2)) : 1;
    let mult = (isBonusActive ? 2 : 1) * luckyM * (player.char.pointsMult || 1.0) * (1 + (unlockedUpgrades.score * 0.2)) * smGain;
    if (isGiantActive) mult *= 3;
    let scoreGain = effectiveSpeed * 0.05 * mult;
    score += scoreGain;

    checkMission('score', scoreGain);
    // Phase check — advance when score threshold reached
    let nextPhase = currentPhase + 1;
    if (nextPhase < PHASES.length && score >= PHASES[nextPhase].scoreThreshold) {
        currentPhase = nextPhase;
        omniSpawnedThisPhase = false;
        gameSpeed = PHASES[currentPhase].baseSpeed + (score / 10000) * 0.5;
        applyPhaseParams();
        phaseAnnounceFrames = 180;
    } else {
        gameSpeed += 0.0015 * (1 - ((unlockedUpgrades.phase_chill || 0) * 0.25));
    }

    player.onGround = false;

    platforms = platforms.filter(p => p.x + p.w > distance - 100);
    stars = stars.filter(s => s.x > distance - 100);
    feathers = feathers.filter(f => f.x > distance - 100);
    powerupItems = powerupItems.filter(p => p.x > distance - 100);
    generateWorld();

    // Platform Collision 
    for (let p of platforms) {
        let pRealX = distance + player.x;
        let hitMargin = player.w * 0.2; // roughly equivalent to 10-15px for normal width
        let pRealRight = pRealX + player.w - hitMargin;
        let pRealLeft = pRealX + hitMargin;
        let platLeft = p.x;
        let platRight = p.x + p.w;

        if (pRealRight > platLeft && pRealLeft < platRight) {
            if (player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 10) {
                // Hard Landing Squash
                if (player.vy > 8 || isSlamming) {
                    player.scaleX = 1.6;
                    player.scaleY = 0.4;
                    for (let i = 0; i < (isSlamming ? 20 : 8); i++) particles.push({ x: player.x + player.w / 2, y: p.y, vx: (Math.random() - 0.5) * 15, vy: -Math.random() * (isSlamming ? 8 : 4), life: 1, color: "rgba(200,200,200,0.8)", size: Math.random() * 6 + 2 });
                    if (isSlamming) {
                        screenShake = 20; // Brutal impact screenshake
                        playSound('hit');
                        let slamBonus = (unlockedUpgrades.slam_score || 0) * 50;
                        if (slamBonus > 0) score += slamBonus;
                    }
                    isSlamming = false;
                } else if (!player.onGround) {
                    // Light landing squash
                    player.scaleX = 1.3;
                    player.scaleY = 0.7;
                }

                if (isMeteorActive && player.vy > 10) {
                    // Huge boom score
                    score += 500 * (player.char.pointsMult || 1.0) * (1 + ((unlockedUpgrades.meteor_pts || 0) * 0.5));
                    for (let i = 0; i < 25; i++) particles.push({ x: player.x + player.w / 2, y: p.y, vx: (Math.random() - 0.5) * 25, vy: -Math.random() * 15, life: 1.5, color: "#ff2200", size: Math.random() * 15 + 5 });
                }

                player.onGround = true;
                player.vy = 0;
                player.y = p.y - player.h;
                player.jumps = 0;
            }
        }
    }

    let pRealX = distance + player.x;
    let pCX = pRealX + player.w / 2;
    let pCY = player.y + player.h / 2;
    const MAGNET_RADIUS = isBlackHoleActive ? 900 : (isMagnetActive ? 180 : ((player.char.magnetic || 0) + (unlockedUpgrades.magnet * 30)));

    for (let s of stars) {
        if (s.collected) continue;
        let dx = pCX - s.x;
        let dy = pCY - s.y;
        let dist = Math.hypot(dx, dy);
        // Magnet attraction
        if (MAGNET_RADIUS > 0 && dist < MAGNET_RADIUS) {
            let pull = (MAGNET_RADIUS - dist) / MAGNET_RADIUS * (5 + ((unlockedUpgrades.magnet_spd || 0) * 2.5));
            s.x += (dx / dist) * pull;
            s.y += (dy / dist) * pull;
        }
        if (dist < player.w / 2 + s.size) {
            s.collected = true;
            let st = s.starType || STAR_TYPES[0];
            let starVal = (st.value || 10) * (1 + ((unlockedUpgrades.coin_val || 0) * 0.25));
            starsCollected += starVal;
            playSound('collect');
            checkMission('stars', starVal);

            let smGain = isSlowMoActive ? (1 + ((unlockedUpgrades.slowmo_score || 0) * 0.5)) : 1;
            let luckyM = isLuckyActive ? (5 + ((unlockedUpgrades.lucky_mult || 0) * 2)) : 1;
            score += (isBonusActive ? starVal * 2 : starVal) * luckyM * (player.char.pointsMult || 1.0) * (1 + (unlockedUpgrades.score * 0.2)) * smGain;
            let burstColor = st.glow || '#ffdd00';
            for (let i = 0; i < 10; i++) particles.push({ x: s.x - distance, y: s.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1, color: burstColor, size: 4 });

            // Pop-up +Score Text Feedback
            floatingTexts.push({ x: s.x - distance, y: s.y - 15, text: `+${starVal}`, life: 1.0, color: burstColor });
            sleepFrames = 2; // Micro hit-pause 

            // Toast para estrelas raras+
            if (starVal >= 500) showToast(`${st.name}: +${starVal.toLocaleString()} ⭐`);
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
            score += (isBonusActive ? 200 : 100) * (player.char.pointsMult || 1.0);
            for (let i = 0; i < 30; i++) particles.push({ x: f.x - distance, y: f.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1, color: '#ffffff', size: 5 });
        }
    }

    // ── New Powerup Items collection ──
    for (let pu of powerupItems) {
        if (pu.collected) continue;
        let dx = pCX - pu.x; let dy = pCY - pu.y;
        if (Math.hypot(dx, dy) < player.w / 2 + pu.size) {
            pu.collected = true;
            let burstCol = '#ffffff';
            let pDur = (player.char.powerupDurMult || 1.0) * (1 + ((unlockedUpgrades.pu_time || 0) * 0.1));
            switch (pu.type) {
                case 'magnet':
                    isMagnetActive = true; magnetTimeLeft = 8 * pDur;
                    magnetDisplay.classList.remove('hidden');
                    burstCol = '#ff66aa'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'shield':
                    isShieldActive = true; shieldTimeLeft = 9999;
                    shieldDisplay.classList.remove('hidden');
                    burstCol = '#44ccff'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'bonus':
                    isBonusActive = true; bonusTimeLeft = 8 * pDur;
                    bonusDisplay.classList.remove('hidden');
                    burstCol = '#ffff00'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'slowmo':
                    isSlowMoActive = true; slowMoTimeLeft = 5 * pDur;
                    slowmoDisplay.classList.remove('hidden');
                    burstCol = '#88ffff'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'infjump':
                    isInfJumpActive = true; infJumpTimeLeft = 10 * pDur;
                    infjumpDisplay.classList.remove('hidden');
                    burstCol = '#ffaa00'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'starchest':
                    starsCollected += 5;
                    let chestLuckyM = isLuckyActive ? (5 + ((unlockedUpgrades.lucky_mult || 0) * 2)) : 1;
                    score += (isBonusActive ? 1000 : 500) * chestLuckyM * (player.char.pointsMult || 1.0);
                    burstCol = '#ffd700';
                    for (let i = 0; i < 5; i++) stars.push({ x: pu.x + (Math.random() - 0.5) * 60, y: pu.y - Math.random() * 40, size: 15, collected: false, oscOffset: Math.random() * Math.PI * 2 });
                    break;
                case 'shrink':
                    isShrinkActive = true; shrinkTimeLeft = 8 * pDur; shrinkDisplay.classList.remove('hidden');
                    burstCol = '#ff0055'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'giant':
                    isGiantActive = true; giantTimeLeft = 8 * pDur; giantDisplay.classList.remove('hidden');
                    burstCol = '#44ff00'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'meteor':
                    isMeteorActive = true; meteorTimeLeft = 8 * pDur; meteorDisplay.classList.remove('hidden');
                    burstCol = '#ff2200'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'rocket':
                    isRocketActive = true; rocketTimeLeft = 5 * pDur; rocketDisplay.classList.remove('hidden');
                    burstCol = '#ffffff'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'blackhole':
                    isBlackHoleActive = true; blackholeTimeLeft = 6 * pDur; blackholeDisplay.classList.remove('hidden');
                    burstCol = '#8800ff'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'lucky':
                    isLuckyActive = true; luckyTimeLeft = 8 * pDur; luckyDisplay.classList.remove('hidden');
                    burstCol = '#00ffaa'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'hover':
                    isHoverActive = true; hoverTimeLeft = 8 * pDur; hoverDisplay.classList.remove('hidden');
                    burstCol = '#00ccff'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'nogap':
                    isNoGapActive = true; noGapTimeLeft = 15 * pDur; nogapDisplay.classList.remove('hidden');
                    burstCol = '#00ff00'; score += 80 * (player.char.pointsMult || 1.0);
                    break;
                case 'coinshower':
                    score += 500 * (player.char.pointsMult || 1.0);
                    burstCol = '#ffee00';
                    // Spawn stars ahead of the player in world space so the player runs through them
                    for (let i = 0; i < 40; i++) {
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
                    score += 500 * (player.char.pointsMult || 1.0);
                    burstCol = '#ff00ff';
                    rainbowPlatformsCount = 10; // next 10 platforms are zero gap (will implement in world gen shortly)
                    break;
                case 'jackpot':
                    score += 5000 * (player.char.pointsMult || 1.0);
                    burstCol = '#ffaa00';
                    break;
                case 'omni':
                    isMagnetActive = true; magnetTimeLeft = 10 * pDur; magnetDisplay.classList.remove('hidden');
                    isShieldActive = true; shieldTimeLeft = 9999; shieldDisplay.classList.remove('hidden');
                    isBonusActive = true; bonusTimeLeft = 10 * pDur; bonusDisplay.classList.remove('hidden');
                    isInfJumpActive = true; infJumpTimeLeft = 10 * pDur; infjumpDisplay.classList.remove('hidden');
                    isFlying = true; flightTimeLeft = 10 * pDur; powerupDisplay.classList.remove('hidden');
                    player.jumps = 0;
                    score += 1000 * (player.char.pointsMult || 1.0);
                    burstCol = '#ffffff';
                    for (let i = 0; i < 30; i++) particles.push({ x: pu.x - distance, y: pu.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 1.5, color: ['#ff00ff', '#00ffff', '#ffff00'][Math.floor(Math.random() * 3)], size: Math.random() * 8 + 4 });
                    break;
            }
            for (let i = 0; i < 25; i++) particles.push({ x: pu.x - distance, y: pu.y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1.2, color: burstCol, size: Math.random() * 6 + 3 });
        }
    }

    if (frames % 3 === 0 && player.onGround) createPlayerParticle();
    if (isFlying && frames % 2 === 0) {
        particles.push({
            x: player.x + 10,
            y: player.y + player.h / 2 + (Math.random() * 10 - 5),
            vx: -Math.random() * 4 - 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1.2,
            color: "rgba(255,255,255,0.8)",
            size: Math.random() * 8 + 4
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.03;
        if (pt.life <= 0) particles.splice(i, 1);
    }

    if (player.y > ch) {
        if (isShieldActive) {
            // Shield absorbs the fall — place player back on nearest platform
            isShieldActive = false; shieldTimeLeft = 0;
            shieldDisplay.classList.add('hidden');
            let nearest = platforms.reduce((best, p) => {
                let sx = p.x - distance;
                return (Math.abs(sx + p.w / 2 - player.x) < Math.abs(best.x + best.w / 2 - distance - player.x)) ? p : best;
            }, platforms[0]);
            player.y = nearest.y - player.h;
            player.vy = -8;
            player.jumps = 0;
            for (let i = 0; i < 20; i++) particles.push({ x: player.x + player.w / 2, y: player.y + player.h, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 6, life: 1.2, color: '#44ccff', size: 5 });
            showToast('🛡️ Escudo absorveu a queda!');
        } else if (unlockedUpgrades.free_revive > 0 && !usedFreeRevive) {
            // Segunda Chance — revive in place, launches player upward with a golden flash
            usedFreeRevive = true;
            let nearest = platforms.reduce((best, p) => {
                let sx = p.x - distance;
                return (Math.abs(sx + p.w / 2 - player.x) < Math.abs(best.x + best.w / 2 - distance - player.x)) ? p : best;
            }, platforms[0]);
            player.y = nearest.y - player.h;
            player.vy = -14;
            player.jumps = 0;
            for (let i = 0; i < 35; i++) particles.push({ x: player.x + player.w / 2, y: player.y + player.h, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 10, life: 1.5, color: i % 2 === 0 ? '#ffd700' : '#ffffff', size: Math.random() * 8 + 3 });
            showToast('✨ Segunda Chance ativada!');
        } else {
            playSound('hit');
            state = 'gameover';
            gameOverMenu.classList.remove('hidden');
            hud.classList.add('hidden');
            mobileControls.style.display = 'none';
            finalScore.innerText = Math.floor(score);
            finalStars.innerText = starsCollected;
            document.getElementById('final-phase').innerText = currentPhase + 1;
            document.getElementById('final-char').innerText = player.char.name;

            // Add stars to global wallet
            globalStars += starsCollected;
            localStorage.setItem('uniparkourGlobalStars', globalStars);
            updateGlobalStarsDisplay();

            checkHighScore(Math.floor(score));
        }
    }

    updateHUD();
    render();
    frames++;

    if (state === 'playing') requestAnimationFrame(update);
}

function render() {
    const ph = PHASES[currentPhase];

    // ── BACKGROUND gradient (phase-themed) ──
    bgCtx.clearRect(0, 0, cw, ch);
    ctx.save();
    if (screenShake > 0) {
        let dx = (Math.random() - 0.5) * screenShake;
        let dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake--;
    }
    let skyGrad = bgCtx.createLinearGradient(0, 0, 0, ch);
    skyGrad.addColorStop(0, ph.sky[0]);
    skyGrad.addColorStop(1, ph.sky[1]);
    bgCtx.fillStyle = skyGrad;
    bgCtx.fillRect(0, 0, cw, ch);

    // ── PARALLAX LAYERS ──
    // Mountains (Layer 1)
    bgCtx.fillStyle = ph.platform.edge;
    bgCtx.globalAlpha = 0.2;
    bgCtx.beginPath();
    bgCtx.moveTo(0, ch);
    for (let i = 0; i < cw; i += 150) {
        let py = ch - 150 + Math.sin((i + distance * 0.2) * 0.01) * 80;
        bgCtx.lineTo(i, py);
    }
    bgCtx.lineTo(cw, ch);
    bgCtx.fill();

    // Near Hills (Layer 2)
    bgCtx.fillStyle = ph.platform.glow;
    bgCtx.globalAlpha = 0.15;
    bgCtx.beginPath();
    bgCtx.moveTo(0, ch);
    for (let i = 0; i < cw; i += 100) {
        let py = ch - 80 + Math.sin((i + distance * 0.4) * 0.02) * 40;
        bgCtx.lineTo(i, py);
    }
    bgCtx.lineTo(cw, ch);
    bgCtx.fill();
    bgCtx.globalAlpha = 1.0;

    // Phase-specific background effects
    if (ph.id === 2) {
        // Lightning bolts in storm
        if (frames % 90 < 3) {
            bgCtx.strokeStyle = 'rgba(255,220,0,0.6)';
            bgCtx.lineWidth = 2;
            bgCtx.beginPath();
            let lx = Math.random() * cw;
            bgCtx.moveTo(lx, 0);
            bgCtx.lineTo(lx + 20, ch * 0.4);
            bgCtx.lineTo(lx - 10, ch * 0.6);
            bgCtx.lineTo(lx + 30, ch);
            bgCtx.stroke();
        }
    } else if (ph.id === 3) {
        // Lava glow at bottom
        let lavaG = bgCtx.createLinearGradient(0, ch * 0.7, 0, ch);
        lavaG.addColorStop(0, 'rgba(0,0,0,0)');
        lavaG.addColorStop(1, 'rgba(255,60,0,0.4)');
        bgCtx.fillStyle = lavaG;
        bgCtx.fillRect(0, ch * 0.7, cw, ch * 0.3);
    } else if (ph.id === 4) {
        // Snow particles
        bgCtx.fillStyle = 'rgba(200,230,255,0.6)';
        for (let i = 0; i < 5; i++) {
            let sx = (frames * (i + 1) * 3 + i * 300) % cw;
            let sy = (frames * (i + 1) * 1.5 + i * 200) % ch;
            bgCtx.beginPath(); bgCtx.arc(sx, sy, 1.5, 0, Math.PI * 2); bgCtx.fill();
        }
    } else if (ph.id === 9) {
        // Rainbow streak
        let rainbowColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
        rainbowColors.forEach((col, i) => {
            bgCtx.strokeStyle = col;
            bgCtx.globalAlpha = 0.15;
            bgCtx.lineWidth = 18;
            bgCtx.beginPath();
            bgCtx.moveTo(0, ch * 0.3 + i * 20);
            bgCtx.quadraticCurveTo(cw / 2, ch * 0.1 + i * 20, cw, ch * 0.3 + i * 20);
            bgCtx.stroke();
        });
        bgCtx.globalAlpha = 1.0;
    }

    // Stars / particles in background
    bgCtx.fillStyle = '#ffffff';
    for (let bs of bgStars) {
        bs.x -= bs.speed * (gameSpeed * 0.1);
        if (bs.x < 0) bs.x = cw;
        bgCtx.beginPath();
        bgCtx.globalAlpha = Math.random() * 0.5 + 0.4;
        bgCtx.arc(bs.x, bs.y, bs.size, 0, Math.PI * 2);
        bgCtx.fill();
    }
    bgCtx.globalAlpha = 1.0;

    // ── GAME CANVAS ──
    ctx.clearRect(0, 0, cw, ch);

    // Platforms (phase-themed)
    for (let p of platforms) {
        let screenX = p.x - distance;
        let platGrad = ctx.createLinearGradient(0, p.y, 0, p.y + 80);
        platGrad.addColorStop(0, ph.platform.top);
        platGrad.addColorStop(1, ph.bgColor);
        ctx.fillStyle = platGrad;
        ctx.shadowColor = ph.platform.glow;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.roundRect(screenX, p.y, p.w, p.h, [8, 8, 0, 0]);
        ctx.fill();
        // Glowing edge line
        ctx.fillStyle = ph.platform.edge;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ph.platform.edge;
        ctx.fillRect(screenX, p.y, p.w, 4);
        ctx.shadowBlur = 0;
    }

    // Stars, feathers & powerup items
    for (let s of stars) {
        if (!s.collected) drawStar(ctx, s.x - distance, s.y, s.size, s.collected, (frames * 0.05) + s.oscOffset, s.starType);
    }
    for (let f of feathers) {
        if (!f.collected) drawFeather(ctx, f.x - distance, f.y, f.size, f.collected, (frames * 0.05) + f.oscOffset);
    }
    for (let pu of powerupItems) {
        if (!pu.collected) {
            let puScreen = { ...pu, x: pu.x - distance };
            drawPowerupItem(ctx, puScreen, (frames * 0.05) + pu.oscOffset);
        }
    }

    // Magnet field behind player
    if (isMagnetActive) drawMagnetField(ctx, player);

    // Particles
    for (let pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size || 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // ── AURAS & SKINS ──
    if (selectedSkin !== 'default') {
        const auraConfig = skins.find(s => s.id === selectedSkin);
        if (auraConfig) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            let cx = player.x + player.w / 2 - distance;
            let cy = player.y + player.h / 2;
            let aSize = Math.max(player.w, player.h) * 1.5;

            ctx.beginPath();
            let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, aSize);

            let colorHex = auraConfig.colors[0];
            // Helper to get raw RGB from Hex roughly
            grad.addColorStop(0, colorHex + '88'); // 50% opacity append
            grad.addColorStop(1, colorHex + '00'); // 0% opacity append

            if (frames % 4 === 0) {
                particles.push({
                    x: player.x + player.w / 2, y: cy,
                    vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 4,
                    life: 1, color: Math.random() > 0.5 ? auraConfig.colors[0] : auraConfig.colors[1], size: 4
                });
            }

            ctx.fillStyle = grad;
            ctx.arc(cx, cy, aSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Player and Shield
    if (player.char.id === 20) { drawDragon(ctx, player); }
    else if (player.char.id === 21) { drawCat(ctx, player); }
    else if (player.char.id === 22) { drawRabbit(ctx, player); }
    else { drawUnicorn(ctx, player); }
    if (isShieldActive) drawShieldRing(ctx, player);

    // ── PHASE BANNER ──
    if (phaseAnnounceFrames > 0) {
        phaseAnnounceFrames--;
        let prog = phaseAnnounceFrames / 180;
        let alpha = prog > 0.8 ? (1 - prog) / 0.2 :
            prog < 0.15 ? prog / 0.15 : 1.0;
        ctx.save();
        ctx.globalAlpha = alpha * 0.95;
        // Banner background
        let bh = 90;
        let bannerGrad = ctx.createLinearGradient(0, ch / 2 - bh / 2, 0, ch / 2 + bh / 2);
        bannerGrad.addColorStop(0, 'rgba(0,0,0,0)');
        bannerGrad.addColorStop(0.3, 'rgba(0,0,20,0.92)');
        bannerGrad.addColorStop(0.7, 'rgba(0,0,20,0.92)');
        bannerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bannerGrad;
        ctx.fillRect(0, ch / 2 - bh / 2, cw, bh);
        // Phase number
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.fillStyle = ph.platform.edge;
        ctx.textAlign = 'center';
        ctx.shadowColor = ph.platform.edge;
        ctx.shadowBlur = 12;
        ctx.fillText(`FASE ${currentPhase + 1} DE 10`, cw / 2, ch / 2 - 16);
        // Phase name
        ctx.font = 'bold 32px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = ph.platform.glow;
        ctx.shadowBlur = 20;
        ctx.fillText(ph.name, cw / 2, ch / 2 + 18);
        ctx.restore();
    }

    // ── PHASE INDICATOR on HUD ── (top center, away from powerup badges)
    ctx.save();
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = ph.platform.edge;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 8;
    ctx.fillText(`✦ Fase ${currentPhase + 1}: ${ph.name} ✦`, cw / 2, 70);

    // ── FLOATING TEXTS (Pop-ups) ──
    for (let ft of floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.font = 'bold 24px Outfit, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore();
    ctx.restore();
}

// Menus Logic
btnStart.onclick = () => { startMusic(); initGame(); };
btnChars.onclick = () => {
    mainMenu.classList.add('hidden');
    charMenu.classList.remove('hidden');
};
btnBack.onclick = () => {
    charMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
};
btnRestart.onclick = () => { startMusic(); initGame(); };
btnMenuGo.onclick = () => {
    gameOverMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    mobileControls.style.display = 'none';
    ctx.clearRect(0, 0, cw, ch);
};

setInterval(() => {
    if (state === 'menu') {
        bgCtx.clearRect(0, 0, cw, ch);
        const ph0 = PHASES[0];
        let skyGrad = bgCtx.createLinearGradient(0, 0, 0, ch);
        skyGrad.addColorStop(0, ph0.sky[0]);
        skyGrad.addColorStop(1, ph0.sky[1]);
        bgCtx.fillStyle = skyGrad;
        bgCtx.fillRect(0, 0, cw, ch);
        bgCtx.fillStyle = '#ffffff';
        for (let bs of bgStars) {
            bs.x -= bs.speed * 0.5;
            if (bs.x < 0) bs.x = cw;
            bgCtx.beginPath();
            bgCtx.globalAlpha = Math.random() * 0.5 + 0.5;
            bgCtx.arc(bs.x, bs.y, bs.size, 0, Math.PI * 2);
            bgCtx.fill();
        }
        bgCtx.globalAlpha = 1.0;
    }
}, 1000 / 60);
