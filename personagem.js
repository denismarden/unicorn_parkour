// ─────────────────────────────────────────────────────────────────────────
// personagem.js — Unicórnio redesenhado
// Silhueta única com contorno, sombreamento em 1 camada (cell shading) e paleta por personagem.
// Carregado ANTES do game.js. Usa variáveis do jogo (isFlying, gameSpeed, frames...) só na hora
// de desenhar, nunca no carregamento do arquivo.
// Unidades locais (u): origem no centro da hitbox, +x para a frente, +y para baixo; 1u = 1,3 px.
// ─────────────────────────────────────────────────────────────────────────

const USAR_PERSONAGEM_NOVO = true;    // false = volta para o desenho antigo (drawUnicorn) para comparar

// ─── Paleta do unicórnio padrão (id 0) ───
const PALETA_PADRAO = {
    alfa: 1,
    corpo: '#FCEFF7', claro: '#FFFFFF', sombra: '#DDBDE6', fundo: '#C3A0D6',
    contorno: '#4A2763',
    crina: ['#FF5FA8', '#FF9CCF', '#B77BFF', '#6FD3FF'], contornoCrina: '#7A2E6E',
    crinaFundo: ['#C9478F', '#8C5AD0'],
    crinaSombra: ['#D2468E', '#E07AB4', '#9561DA', '#4FAEDB'],   // sombra de cada cor de crina (separa as mechas sem linha)
    chifre: { base: '#FFC94A', sombra: '#E0962B', brilho: '#FFF4C2', contorno: '#9A5A12' },
    casco: { base: '#8A4F7D', sombra: '#5E3158', brilho: '#C08AB4' },
    focinho: '#FFD9EA', narina: '#C77AA0', orelhaDentro: '#FFB3D1', bochecha: 'rgba(255,143,184,0.55)',
    iris: ['#4FB6FF', '#1D5FC9'], olhoCiborgue: false,
    contornoInterno: '#93709F'
};
const CHIFRE_PEROLA = { base: '#FFF8E1', sombra: '#E8C98A', brilho: '#FFFFFF', contorno: '#9A6A1A' };
const IRIS_ESPECIAL = {
    1: ['#5BC46A', '#2E7A3A'], 6: ['#B57BFF', '#6A2FCC'],
    20: ['#FFD54A', '#E08A00'], 21: ['#8EE08E', '#2E8B57'], 22: ['#FF9CC0', '#C2185B']
};

// ─── Utilidades de cor ───
const _BRANCO = { r: 255, g: 255, b: 255, a: 1 };
const _ROXO_SOMBRA = { r: 90, g: 58, b: 138, a: 1 };
const _ROXO_CONT = { r: 42, g: 18, b: 64, a: 1 };

function paraRGBA(c) {
    if (!c) return { ..._BRANCO };
    if (c[0] === '#') {
        const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1, 7);
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return { ..._BRANCO };
    const v = m[1].split(',').map(s => parseFloat(s));
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
}
const misturar = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: a.a });
const paraHex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const luminancia = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
const contraste = (a, b) => { const la = luminancia(a) + 0.05, lb = luminancia(b) + 0.05; return la > lb ? la / lb : lb / la; };

// Paleta derivada das cores de cada personagem (corpo + 2 cores de crina), em cache por id
const cachePaletas = new Map();
function paletaDe(c) {
    if (cachePaletas.has(c.id)) return cachePaletas.get(c.id);
    if (c.id === 0) { cachePaletas.set(0, PALETA_PADRAO); return PALETA_PADRAO; }
    const b = paraRGBA(c.body), m0 = paraRGBA(c.mane[0]), m1 = paraRGBA(c.mane[1] || c.mane[0]);
    m0.a = m1.a = 1;
    const escuro = luminancia(b) < 0.22;
    let crina = [m0, misturar(m0, _BRANCO, 0.35), misturar(m0, m1, 0.5), m1];
    // crina sem contraste com o corpo (ex.: Ninja): clareia
    if (contraste(crina[0], b) < 1.6) crina = crina.map(t => misturar(t, _BRANCO, 0.35));
    // corpo escuro: levanta um pouco a cor base e usa a cor original como sombra, senão o volume some
    const base = escuro ? misturar(b, _BRANCO, 0.14) : b;
    const p = {
        alfa: b.a,                                         // Fantasma é translúcido
        corpo: paraHex(base), claro: paraHex(misturar(b, _BRANCO, escuro ? 0.5 : 0.35)),
        sombra: escuro ? paraHex(b) : paraHex(misturar(b, _ROXO_SOMBRA, 0.30)),  // sombra puxada para o roxo, não só mais escura
        fundo: paraHex(misturar(b, _ROXO_SOMBRA, 0.45)),
        contorno: escuro ? paraHex(misturar(m0, _BRANCO, 0.40))   // corpo escuro: contorno CLARO
            : paraHex(misturar(b, _ROXO_CONT, 0.78)),
        crina: crina.map(paraHex),
        crinaFundo: [paraHex(misturar(crina[0], _ROXO_SOMBRA, 0.35)), paraHex(misturar(crina[2], _ROXO_SOMBRA, 0.35))],
        crinaSombra: crina.map(t => paraHex(misturar(t, _ROXO_SOMBRA, 0.25))),
        contornoCrina: paraHex(misturar(m0, _ROXO_CONT, 0.7)),
        chifre: [1, 4, 19].includes(c.id) ? CHIFRE_PEROLA : PALETA_PADRAO.chifre,
        casco: escuro ? { base: '#2A1E36', sombra: '#140C1E', brilho: '#5A4A70' } : PALETA_PADRAO.casco,
        focinho: paraHex(misturar(b, { r: 255, g: 190, b: 215, a: 1 }, 0.25)),
        narina: paraHex(misturar(b, _ROXO_CONT, 0.45)),
        orelhaDentro: paraHex(misturar(m0, _BRANCO, 0.5)),
        bochecha: 'rgba(255,143,184,0.45)',
        iris: IRIS_ESPECIAL[c.id] || PALETA_PADRAO.iris,
        olhoCiborgue: c.id === 9,
        pupila: c.id === 20 ? 'fenda' : 'redonda'
    };
    if (c.id === 20) { p.chifre = CHIFRE_OSSO; p.ventre = '#FFD27A'; }   // dragão: barriga clara (contraste clássico)
    // linhas internas (divisões dentro da silhueta) mais suaves que o contorno externo
    p.contornoInterno = paraHex(misturar(paraRGBA(p.sombra), paraRGBA(p.contorno), 0.5));
    cachePaletas.set(c.id, p);
    return p;
}

// ─── Formas fixas (Path2D criados uma vez só) ───
const FORMAS = (() => {
    const tronco = new Path2D();
    tronco.moveTo(9, -15);                                   // cernelha
    tronco.bezierCurveTo(2, -12.5, -6, -12.5, -13, -15.5);   // dorso levemente selado
    tronco.bezierCurveTo(-20, -16, -23, -6, -17, 1);         // garupa / anca redonda
    tronco.bezierCurveTo(-10, 4, 4, 4, 11, 2);               // barriga
    tronco.bezierCurveTo(17, 1, 21, -6, 17, -12);            // peito projetado
    tronco.closePath();

    // Pescoço (coordenadas do pescoço; pivô no tronco em (12,-11))
    const pescoco = new Path2D();
    pescoco.moveTo(-6, -1);
    pescoco.bezierCurveTo(-6, -8, -2, -13, 3, -15);          // crista (onde nasce a crina)
    pescoco.lineTo(8, -11);
    pescoco.bezierCurveTo(9, -6, 9, -2, 7, 3);               // garganta
    pescoco.closePath();

    // Cabeça (coordenadas da cabeça; pivô na nuca) — UM contorno só, em curvas:
    // nuca → alto da cabeça → testa → chanfro → ponta do focinho → queixo → bochecha
    const cabeca = new Path2D();
    cabeca.moveTo(-5.5, 2);
    cabeca.bezierCurveTo(-7, -6, -3, -12, 3, -12);        // nuca e alto da cabeça
    cabeca.bezierCurveTo(8, -12, 10.5, -8.6, 12.4, -5.2); // testa
    cabeca.bezierCurveTo(14.4, -3.2, 18.4, -3, 19.2, 0.4); // chanfro até a ponta do focinho
    cabeca.bezierCurveTo(19.8, 3.8, 17.4, 6.4, 13.6, 6.2); // focinho arredondado
    cabeca.bezierCurveTo(10.2, 6, 8, 7.6, 4, 7.9);         // queixo
    cabeca.bezierCurveTo(-0.6, 8.2, -5, 6.2, -5.5, 2);     // bochecha
    cabeca.closePath();

    const focinho = new Path2D();
    focinho.ellipse(12, 1.6, 5.6, 4.3, 0.25, 0, Math.PI * 2);

    // Orelha em folha (coordenadas da orelha; pivô em (-1,-10) da cabeça)
    const orelha = new Path2D();
    orelha.moveTo(-2.6, 0);
    orelha.quadraticCurveTo(-4.5, -6, -3, -10);
    orelha.quadraticCurveTo(0.5, -6, 2.6, 0);
    orelha.closePath();
    const orelhaDentro = new Path2D();
    orelhaDentro.moveTo(-1.4, -0.5);
    orelhaDentro.quadraticCurveTo(-2.8, -5, -2.4, -7.6);
    orelhaDentro.quadraticCurveTo(-0.2, -4.6, 1.2, -0.5);
    orelhaDentro.closePath();

    // Chifre (coordenadas da cabeça): base em (4,-11), ponta em (8,-23)
    const chifre = new Path2D();
    chifre.moveTo(1.8, -10.5);
    chifre.lineTo(7.5, -22.6);
    chifre.quadraticCurveTo(8.2, -23.7, 8.7, -22.4);
    chifre.lineTo(6.4, -11.4);
    chifre.closePath();
    const chifreSombra = new Path2D();
    chifreSombra.moveTo(4.6, -11.1);
    chifreSombra.lineTo(8.2, -22.9);
    chifreSombra.lineTo(6.4, -11.4);
    chifreSombra.closePath();

    const olho = new Path2D();
    olho.ellipse(5, -3, 3.6, 4.6, -0.1, 0, Math.PI * 2);
    const iris = new Path2D();
    iris.ellipse(5.7, -2.6, 2.7, 3.4, -0.1, 0, Math.PI * 2);

    return { tronco, pescoco, cabeca, focinho, orelha, orelhaDentro, chifre, chifreSombra, olho, iris };
})();

// Proporção "chibi": tronco 13% mais curto (os pivôs acompanham) e cabeça maior (escalaCabeca em ESPECIES)
const ESCALA_TRONCO_X = 0.87;
const PIVO_PESCOCO = [10.5, -11];
const NUCA_NO_PESCOCO = [3, -14];
const INCLINACAO_PESCOCO = 24;        // graus para a frente (pescoço arqueado, não vertical)
const INCLINACAO_CABECA = 8;          // graus: focinho levemente para baixo
const PIVO_ORELHA = [-1, -10];
const PIVO_PATA_TRAS = [-10.5, -4];
const PIVO_PATA_FRENTE = [9.5, -4];
const RAIZ_CAUDA = [-15.5, -11];
const PIVO_ASA = [5, -14];            // cernelha

// ─── Espécies: o mesmo rig (corpo, patas, galope, poses) com cabeça, orelhas, cauda e pés próprios ───
// Corpo e andar também variam: coxa/canela (comprimento das patas), cadência e defasagem do galope,
// inclinação do tronco, troncoY (achatado/alto), flexão da coluna (gato) e salto (coelho)
const OFFSET_CAVALO = { tb: 0.00, tf: 0.12, db: 0.30, df: 0.42 };
const ESPECIES = {
    unicornio: { cabeca: 'cabeca', focinho: 'focinho', escalaCabeca: 1.4, pescoco: 1, orelha: 'folha', chifre: 'unicornio', crina: true, topete: true, cauda: 'mechas', pe: 'casco', bigodes: false, nariz: 'narina', boca: 'cavalo', asas: 'penas',
        coxa: 9, canela: 7.5, cadencia: 1, offsets: OFFSET_CAVALO, inclinacao: 3.5, troncoY: 1, flexao: 0, salto: 0 },
    dragao: { cabeca: 'cabecaDragao', focinho: 'focinhoDragao', escalaCabeca: 1.3, pescoco: 1.05, orelha: 'barbatana', chifre: 'dragao', crina: false, espinhos: true, cauda: 'reptil', pe: 'garra', bigodes: false, nariz: 'dragao', boca: 'dragao', asas: 'morcego',
        coxa: 8.5, canela: 7, cadencia: 0.85, offsets: OFFSET_CAVALO, inclinacao: 2, troncoY: 1.05, flexao: 0, salto: 0, ventre: true },
    // gato: corpo longo e baixo, patas curtas, galope com a coluna esticando e encolhendo
    gato: { cabeca: 'cabecaGato', focinho: 'focinhoGato', escalaCabeca: 1.5, pescoco: 0.72, orelha: 'gato', chifre: null, crina: false, cauda: 'gato', pe: 'pata', bigodes: true, nariz: 'gato', boca: 'gato', asas: 'penas',
        coxa: 6.5, canela: 5.5, cadencia: 1.1, offsets: { tb: 0.00, tf: 0.08, db: 0.45, df: 0.53 }, inclinacao: 6, troncoY: 0.85, flexao: 0.07, salto: 0 },
    // coelho: patas traseiras juntas, dianteiras juntas, com pulinho
    coelho: { cabeca: 'cabecaCoelho', focinho: 'focinhoGato', escalaCabeca: 1.5, pescoco: 0.72, orelha: 'coelho', chifre: null, crina: false, cauda: 'pompom', pe: 'pata', bigodes: true, nariz: 'coelho', boca: 'coelho', asas: 'penas',
        coxa: 7, canela: 5.5, cadencia: 0.9, offsets: { tb: 0.00, tf: 0.03, db: 0.50, df: 0.55 }, inclinacao: 5, troncoY: 1.05, flexao: 0, salto: 5 }
};
function especieDe(c) {
    return c.id === 20 ? ESPECIES.dragao : c.id === 21 ? ESPECIES.gato : c.id === 22 ? ESPECIES.coelho : ESPECIES.unicornio;
}
// centro e raio do degradê do focinho em cada formato de cabeça
const CENTRO_FOCINHO = { cabeca: [15.5, 2, 7.5], cabecaDragao: [16.5, 1.5, 8.5], cabecaGato: [12, 3, 6], cabecaCoelho: [12, 3, 6] };
const CHIFRE_OSSO = { base: '#F5E6C8', sombra: '#C9B48A', brilho: '#FFFFFF', contorno: '#5A3A1A' };

// Formas extras das outras espécies (coordenadas da cabeça)
(() => {
    const novo = (f) => { const p = new Path2D(); f(p); return p; };
    // cabeças das outras espécies também em UM contorno (sem "dois círculos")
    FORMAS.cabecaDragao = novo(p => { p.moveTo(-5, 2); p.bezierCurveTo(-6, -6, -2, -11, 3, -11); p.bezierCurveTo(7, -11, 9, -8, 11, -5); p.bezierCurveTo(14, -3.4, 20, -3.6, 21.6, -0.6); p.bezierCurveTo(22.6, 2, 21, 5, 17, 5); p.bezierCurveTo(13, 5, 8, 6.6, 4, 7); p.bezierCurveTo(-1, 7.5, -4.5, 5.6, -5, 2); p.closePath(); });
    FORMAS.focinhoDragao = novo(p => p.ellipse(13.5, 1.8, 7, 3.4, 0.12, 0, Math.PI * 2));
    FORMAS.cabecaGato = novo(p => { p.moveTo(-6.4, 1); p.bezierCurveTo(-7.4, -8, -2, -12.6, 3.5, -12.6); p.bezierCurveTo(9.4, -12.6, 13, -8.4, 13.2, -3.4); p.bezierCurveTo(13.4, -1.4, 15.4, -0.4, 15.6, 2); p.bezierCurveTo(15.8, 5, 13, 6.8, 9.6, 6.8); p.bezierCurveTo(6, 7.2, 0, 7.8, -3.2, 5.6); p.bezierCurveTo(-5.2, 4.4, -6.2, 3, -6.4, 1); p.closePath(); });
    FORMAS.cabecaCoelho = novo(p => { p.moveTo(-6, 1); p.bezierCurveTo(-7, -7.6, -2, -12, 3, -12); p.bezierCurveTo(9, -12, 12.6, -8, 13, -3.6); p.bezierCurveTo(13.4, -1.6, 15.6, -0.6, 15.8, 1.8); p.bezierCurveTo(16, 5, 13, 6.8, 9.6, 6.8); p.bezierCurveTo(6, 7, 0, 7.6, -3, 5.4); p.bezierCurveTo(-5, 4.2, -6, 3, -6, 1); p.closePath(); });
    FORMAS.focinhoGato = novo(p => p.ellipse(10.8, 2.8, 4.2, 3.2, 0.15, 0, Math.PI * 2));
    FORMAS.orelhaGato = novo(p => { p.moveTo(-4, 0); p.lineTo(-3, -10); p.lineTo(4, -1); p.closePath(); });
    FORMAS.orelhaGatoDentro = novo(p => { p.moveTo(-2.6, -1); p.lineTo(-2.3, -7); p.lineTo(2, -1.4); p.closePath(); });
    FORMAS.orelhaCoelho = novo(p => p.ellipse(0, -10, 3.4, 11, 0, 0, Math.PI * 2));
    FORMAS.orelhaCoelhoDentro = novo(p => p.ellipse(0.3, -10, 1.6, 8, 0, 0, Math.PI * 2));
    FORMAS.barbatana = novo(p => { p.moveTo(-3, 0); p.lineTo(-7, -8); p.lineTo(-3.5, -6); p.lineTo(-4.5, -12); p.lineTo(0.5, -5); p.lineTo(3, 0); p.closePath(); });
    FORMAS.chifreDragao = novo(p => { p.moveTo(-2.2, -8.4); p.quadraticCurveTo(-3.6, -12.6, -7.2, -14.6); p.quadraticCurveTo(-2.6, -11.6, 2.4, -9.6); p.closePath(); });   // curto e grosso
    FORMAS.asaMorcego = novo(p => {
        p.moveTo(0, 0); p.lineTo(-3, -16); p.lineTo(-10, -12); p.lineTo(-15, -20); p.lineTo(-19, -11);
        p.lineTo(-26, -14); p.quadraticCurveTo(-18, -4, 0, 2); p.closePath();
    });
    FORMAS.pompom = novo(p => {
        p.arc(0, 0, 5.2, 0, Math.PI * 2);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p.moveTo(Math.cos(a) * 4 + 3.4, Math.sin(a) * 4); p.arc(Math.cos(a) * 4, Math.sin(a) * 4, 3.4, 0, Math.PI * 2); }
    });
})();

// ─── Peças auxiliares ───

// Preenche uma forma com sombreamento de 1 camada: sombra embaixo/direita, cor base deslocada para cima/esquerda
function preencherSombreado(ctx, path, base, sombra) {
    ctx.fillStyle = sombra;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    ctx.translate(-2, -2.6);
    ctx.fillStyle = base;
    ctx.fill(path);
    ctx.restore();
}

// Mecha de crina/cauda: fita que afina, com borda em bezier e um traço de brilho
// a = ângulo base (rad), dobra = curvatura (rad), L = comprimento, W = largura na raiz
function desenharMecha(ctx, x, y, a, dobra, L, W, cor, corBrilho, contorno, lw) {
    const h = L / 2, a2 = a + dobra, a3 = a + dobra * 2.2;
    const mx = x + Math.cos(a) * h, my = y + Math.sin(a) * h;
    const px = mx + Math.cos(a2) * h, py = my + Math.sin(a2) * h;
    const nx = -Math.sin(a) * W / 2, ny = Math.cos(a) * W / 2;
    const n2x = -Math.sin(a2) * W * 0.35, n2y = Math.cos(a2) * W * 0.35;
    ctx.beginPath();
    ctx.moveTo(x + nx, y + ny);
    ctx.bezierCurveTo(mx + n2x * 1.4, my + n2y * 1.4, px + Math.cos(a3) * 2 + n2x, py + Math.sin(a3) * 2 + n2y, px, py);
    ctx.bezierCurveTo(px - n2x, py - n2y, mx - n2x * 1.2, my - n2y * 1.2, x - nx, y - ny);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = contorno; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = cor; ctx.fill();
    ctx.strokeStyle = corBrilho; ctx.lineWidth = W * 0.22; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx, my, (mx + px) / 2, (my + py) / 2);
    ctx.stroke();
}

// Coxa em forma de gota: larga no quadril/ombro, afinando até o joelho
function caminhoCoxa(px, py, kx, ky, w1, w2) {
    const dx = kx - px, dy = ky - py, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, ang = Math.atan2(dy, dx);
    const c = new Path2D();
    c.moveTo(px + nx * w1 / 2, py + ny * w1 / 2);
    c.lineTo(kx + nx * w2 / 2, ky + ny * w2 / 2);
    c.arc(kx, ky, w2 / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.lineTo(px - nx * w1 / 2, py - ny * w1 / 2);
    c.arc(px, py, w1 / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
    c.closePath();
    return c;
}

// Pata: coxa afunilada + canela + casco/pata. Ângulos em graus a partir da vertical (positivo = casco para trás).
// modo: 'tudo' | 'contorno' (só a silhueta por trás) | 'preenchimento' (sem o contorno — para fundir com o corpo)
function desenharPata(ctx, px, py, a1, a2, larg1, larg2, cor, pal, lw, pe = 'casco', coxa = 9, canela = 7.5, modo = 'tudo') {
    const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180;
    const kx = px - Math.sin(r1) * coxa, ky = py + Math.cos(r1) * coxa;          // joelho / jarrete
    const tx = kx - Math.sin(r2) * canela, ty = ky + Math.cos(r2) * canela;      // fim da canela
    const formaCoxa = caminhoCoxa(px, py, kx, ky, larg1 * 1.6, larg2 * 1.15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (modo !== 'preenchimento') {
        // contorno por trás (coxa + canela)
        ctx.strokeStyle = pal.contorno;
        ctx.lineWidth = lw * 2; ctx.stroke(formaCoxa);
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
        ctx.lineWidth = larg2 + lw * 2; ctx.stroke();
        if (modo === 'contorno') return;
    }
    // preenchimento
    ctx.fillStyle = cor; ctx.fill(formaCoxa);
    ctx.strokeStyle = cor;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
    ctx.lineWidth = larg2; ctx.stroke();
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(r2);
    if (pe !== 'casco') {
        // pata almofadada (gato, coelho) ou com garras (dragão)
        ctx.beginPath(); ctx.ellipse(0.6, 0.5, 3.6, 2.4, 0, 0, Math.PI * 2);   // base em ~2,9u, igual ao casco
        ctx.lineWidth = lw * 0.9; ctx.strokeStyle = pal.contorno; ctx.stroke();
        ctx.fillStyle = cor; ctx.fill();
        if (pe === 'garra') {
            ctx.fillStyle = '#FFF1D6'; ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.35;
            for (const dx of [-0.6, 1.4, 3.2]) {
                ctx.beginPath(); ctx.moveTo(dx, 1.6); ctx.lineTo(dx + 1.8, 3); ctx.lineTo(dx + 1.2, 1.1); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
        } else {
            ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.3;
            ctx.beginPath(); ctx.moveTo(0.8, 1.4); ctx.lineTo(0.8, 2.7); ctx.moveTo(2.4, 1.2); ctx.lineTo(2.4, 2.5); ctx.stroke();
        }
        ctx.restore();
        return;
    }
    // casco maior (trapézio alinhado com a canela) — a corrida "pisa" visivelmente
    ctx.beginPath();
    ctx.moveTo(-2.3, -0.4); ctx.lineTo(2.3, -0.4); ctx.lineTo(3.2, 2.8); ctx.lineTo(-3.2, 2.8);
    ctx.closePath();
    ctx.lineWidth = lw * 0.9; ctx.strokeStyle = pal.contorno; ctx.stroke();
    ctx.fillStyle = pal.casco.base; ctx.fill();
    ctx.fillStyle = pal.casco.brilho; ctx.fillRect(-2, 0.2, 1.3, 1.6);
    ctx.restore();
}

// humor: 'correndo' | 'subindo' | 'caindo' | 'feliz' (pouso) | 'determinado' (dash)
function desenharOlho(ctx, p, pal, lw, dano, humor = 'correndo') {
    if (dano && dano.olhosFechados && !p.assustado) {
        // olhos apertados "> <" no instante do dano
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.75; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(2.4, -5.6); ctx.lineTo(7.2, -3); ctx.lineTo(2.4, -0.6); ctx.stroke();
        return;
    }
    if (p.assustado) {
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(3, -5.5); ctx.lineTo(7.4, -0.8);
        ctx.moveTo(7.4, -5.5); ctx.lineTo(3, -0.8);
        ctx.stroke();
        return;
    }
    if (humor === 'feliz') {
        // pouso: olhinho fechado de alegria "^"
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1.8, -2); ctx.quadraticCurveTo(5, -6.6, 8.4, -2.4); ctx.stroke();
        return;
    }
    if (humor === 'determinado') {
        // sobrancelha decidida
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(2.2, -9.6); ctx.lineTo(8.6, -8.2); ctx.stroke();
    }
    // Piscar animado: a pálpebra desce e sobe (p.piscar vai de 0 a -8 passos); no dash o olho fica semicerrado
    let fecha = p.piscar < 0 && p.piscar >= -8 ? 1 - Math.abs(p.piscar + 4) / 4 : 0;
    if (humor === 'determinado') fecha = Math.max(fecha, 0.42);
    // para onde a pupila olha: para a frente correndo, para cima subindo, para baixo caindo
    const olharX = humor === 'caindo' ? 0.2 : 0.6, olharY = humor === 'caindo' ? 0.9 : (humor === 'subindo' ? -0.6 : 0);
    if (fecha > 0.85) {
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.75; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1.6, -2.4); ctx.quadraticCurveTo(5, 0.6, 8.6, -2.6); ctx.stroke();
        return;
    }
    // esclera
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(FORMAS.olho);
    ctx.save();
    ctx.clip(FORMAS.olho);
    if (pal.olhoCiborgue) {
        ctx.fillStyle = '#B00018'; ctx.fill(FORMAS.iris);
        ctx.fillStyle = '#FF3B3B'; ctx.beginPath(); ctx.arc(5.7, -2.6, 1.6, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.translate(olharX, olharY);
        // íris em 2 tons chapados (escura em cima, clara embaixo)
        ctx.fillStyle = pal.iris[0]; ctx.fill(FORMAS.iris);
        ctx.save(); ctx.clip(FORMAS.iris);
        ctx.fillStyle = pal.iris[1]; ctx.fillRect(0, -7, 12, 4.4);
        ctx.restore();
        ctx.fillStyle = '#1A1033';
        ctx.beginPath();
        if (pal.pupila === 'fenda') ctx.ellipse(5.9, -2.7, 0.7, 2.7, -0.1, 0, Math.PI * 2);   // olho de réptil
        else ctx.ellipse(5.9, -2.7, 1.6, 2.2, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(-olharX, -olharY);
    }
    // brilhos
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(4.2, -4.6, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.6, -0.6, 0.6, 0, Math.PI * 2); ctx.fill();
    // pálpebra descendo (cor do corpo) até a altura "fecha"
    let yPalpebra = null;
    if (fecha > 0) {
        yPalpebra = -7.6 + 9.2 * fecha;
        ctx.fillStyle = pal.corpo;
        ctx.fillRect(0, -9, 11, yPalpebra + 9);
    }
    ctx.restore();
    if (yPalpebra !== null) {
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.75; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1.4, yPalpebra); ctx.lineTo(8.6, yPalpebra - 0.4); ctx.stroke();
        return;
    }
    // contorno do olho + pálpebra superior mais grossa com 2 cílios
    ctx.strokeStyle = pal.contorno; ctx.lineCap = 'round';
    ctx.lineWidth = lw * 0.5; ctx.stroke(FORMAS.olho);
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath(); ctx.ellipse(5, -3, 3.6, 4.6, -0.1, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath();
    ctx.moveTo(8.2, -5.6); ctx.lineTo(10, -6.8);
    ctx.moveTo(8.8, -4.2); ctx.lineTo(10.6, -4.9);
    ctx.stroke();
}

// Nariz, boca e bigodes de cada espécie (coordenadas da cabeça)
function desenharRostoEspecie(ctx, p, pal, lw, esp, humor = 'correndo') {
    const bocaO = p.assustado || humor === 'caindo';   // boca em "o" de susto ou de queda
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (esp.nariz === 'narina') {
        ctx.fillStyle = pal.narina;
        ctx.beginPath(); ctx.ellipse(16, 0, 1.2, 0.8, 0.3, 0, Math.PI * 2); ctx.fill();
        desenharBoca(ctx, p, pal, lw, humor);
        return;
    }
    if (esp.nariz === 'dragao') {
        ctx.fillStyle = pal.narina;
        ctx.beginPath(); ctx.ellipse(19.6, -0.6, 1.1, 0.7, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.55;
        if (bocaO) {
            ctx.fillStyle = '#5A1A3A';
            ctx.beginPath(); ctx.ellipse(16, 4, 1.8, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else {
            // sorriso comprido de dragão, com um dentinho
            ctx.beginPath(); ctx.moveTo(10.5, 3.6); ctx.quadraticCurveTo(15, estaSorrindo(p) ? 6.2 : 5, 20, 2.8); ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.moveTo(17, 3.9); ctx.lineTo(17.8, 5.6); ctx.lineTo(18.6, 3.7); ctx.closePath(); ctx.fill();
            ctx.lineWidth = lw * 0.3; ctx.stroke();
        }
        return;
    }
    // gato e coelho: nariz rosado, boca em "w" e bigodes
    ctx.fillStyle = '#FF8FB1'; ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.35;
    ctx.beginPath();
    if (esp.nariz === 'gato') { ctx.moveTo(13.4, 0.2); ctx.lineTo(15.8, 0.2); ctx.lineTo(14.6, 1.7); ctx.closePath(); }
    else ctx.ellipse(14.7, 0.8, 1.5, 1.1, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = lw * 0.5;
    if (bocaO) {
        ctx.fillStyle = '#5A1A3A';
        ctx.beginPath(); ctx.ellipse(14.6, 4, 1.3, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(14.6, 1.7); ctx.lineTo(14.6, 2.7);
        ctx.moveTo(14.6, 2.7); ctx.quadraticCurveTo(13.5, 4.2, 12.3, 3.1);
        ctx.moveTo(14.6, 2.7); ctx.quadraticCurveTo(15.7, 4.2, 16.8, 3.1);
        ctx.stroke();
        if (esp.boca === 'coelho') {
            // dentinhos
            ctx.fillStyle = '#FFFFFF'; ctx.lineWidth = lw * 0.3;
            ctx.beginPath(); ctx.rect(13.9, 3.3, 1.4, 1.7); ctx.fill(); ctx.stroke();
        } else if (estaSorrindo(p)) {
            ctx.fillStyle = '#FF7799';
            ctx.beginPath(); ctx.ellipse(14.6, 4.3, 1.2, 0.9, 0, 0, Math.PI); ctx.fill();
        }
    }
    if (esp.bigodes) {
        ctx.strokeStyle = rgbaContorno(pal, 0.7); ctx.lineWidth = lw * 0.28;
        ctx.beginPath();
        ctx.moveTo(13, 2.2); ctx.lineTo(20, 0.6);
        ctx.moveTo(13.2, 3); ctx.lineTo(20.4, 3);
        ctx.moveTo(13, 3.8); ctx.lineTo(19.6, 5.4);
        ctx.stroke();
    }
}
function rgbaContorno(pal, a) {
    const c = paraRGBA(pal.contorno);
    return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;
}

function desenharBoca(ctx, p, pal, lw, humor = 'correndo') {
    const bocaO = p.assustado || humor === 'caindo';
    ctx.strokeStyle = pal.contorno; ctx.lineCap = 'round'; ctx.lineWidth = lw * 0.55;
    if (bocaO) {
        ctx.fillStyle = '#5A1A3A';
        ctx.beginPath(); ctx.ellipse(14.6, 4.6, 1.6, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (estaSorrindo(p)) {
        ctx.fillStyle = '#FF7799';
        ctx.beginPath(); ctx.moveTo(12, 4); ctx.quadraticCurveTo(14.6, 7.6, 17, 4.6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(12, 4); ctx.quadraticCurveTo(14.6, 7.6, 17, 4.6); ctx.stroke();
    } else {
        ctx.beginPath(); ctx.moveTo(12, 4.2); ctx.quadraticCurveTo(14.4, 5.6, 16.6, 4.8); ctx.stroke();
    }
}

// ─── Crina e cauda (B2) ───
// Ângulos base (graus, no sistema do corpo; 180° = para trás, 270° = para cima) por estado
const CRINA_BASE = {
    correndo: [128, 140, 152, 164, 176],   // cai pelo pescoço e flui para trás
    subindo: [160, 166, 172, 178, 184],    // colada para trás pelo vento
    caindo: [222, 230, 238, 246, 254]      // sobe com a queda
};
const CAUDA_BASE = {
    correndo: [128, 138, 148, 158, 168],   // cauda caída, enrolando no fim
    subindo: [150, 156, 162, 168, 174],
    caindo: [205, 212, 220, 228, 236]
};

// Mistura os ângulos dos 3 estados conforme o quanto está no ar (mistura) e a velocidade vertical
function angulosEstado(tabela, p, i) {
    // (usa os valores com atraso, se houver: crina e cauda acompanham o corpo um pouco depois)
    const vy = p.vyCabelo === undefined ? p.vy : p.vyCabelo, mis = p.misCabelo === undefined ? p.mistura : p.misCabelo;
    const s = Math.max(-1, Math.min(1, -vy / 8));            // +1 subindo forte, -1 caindo forte
    const ar = s >= 0 ? tabela.correndo[i] + (tabela.subindo[i] - tabela.correndo[i]) * s
        : tabela.correndo[i] + (tabela.caindo[i] - tabela.correndo[i]) * -s;
    return tabela.correndo[i] + (ar - tabela.correndo[i]) * mis;
}

// Fase da ondulação acumulada com o tempo: a frequência muda com a velocidade sem dar "pulos"
function atualizarOnda(p, tempo, vel) {
    const dt = p._tempoOnda === undefined ? 0 : Math.max(0, Math.min(0.1, tempo - p._tempoOnda));
    p._tempoOnda = tempo;
    const f = 1.4 + 0.12 * vel;                               // Hz
    p.faseOnda = (p.faseOnda || 0) + 2 * Math.PI * f * dt;
    const k = Math.min(vel / 10, 1);
    return {
        fase: p.faseOnda,
        A: (6 + 10 * k) * (p.vy < 0 ? 0.5 : 1) * Math.PI / 180, // subindo: crina mais colada
        B: 0.25 + 0.2 * k
    };
}

// ─── Cabelo: crina, cauda e topete como UMA massa de mechas ───
// Cada mecha é um cacho: a "espinha" curva cada vez mais perto da ponta (enrola), e a largura
// incha no primeiro terço e afina até a ponta. O grupo inteiro recebe um só contorno por fora;
// por dentro as mechas se separam só por sombra e cor (sem linha entre elas = menos "artificial").
function caminhoMecha(x, y, a, cacho, L, W) {
    // Mecha de cabelo de desenho animado: larga, com a ponta arredondada que enrola em cacho.
    // cacho = quanto a ponta gira no total (rad); a curva fica concentrada no fim da mecha.
    const N = 12, esq = [], dir = [], espinha = [];
    let px = x, py = y, ang = a;
    const passo = L / N;
    let somaPeso = 0;
    for (let i = 1; i <= N; i++) somaPeso += Math.pow(i / N, 2.2);
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        // largura: cheia no meio, afinando só no fim (ponta redonda, não espetada)
        const w = W / 2 * (0.82 + 0.3 * Math.sin(Math.PI * t * 0.85)) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 3)));
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        esq.push([px + nx * w, py + ny * w]);
        dir.push([px - nx * w, py - ny * w]);
        espinha.push([px, py]);
        px += Math.cos(ang) * passo; py += Math.sin(ang) * passo;
        ang += cacho * Math.pow((i + 1) / N, 2.2) / somaPeso;
    }
    const pts = esq.concat(dir.reverse());
    const forma = new Path2D();
    forma.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
        forma.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    }
    forma.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    forma.closePath();
    return { forma, espinha, W, lado: esq };
}

// Desenha um grupo de mechas: contorno único por trás → para cada mecha (de trás para a frente)
// uma sombra levemente deslocada e a cor → um reflexo suave e curvo nas mechas maiores
function desenharGrupoMechas(ctx, mechas, pal, lw) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = pal.contornoCrina; ctx.lineWidth = lw * 2;
    for (const m of mechas) ctx.stroke(m.forma);
    for (const m of mechas) {
        ctx.save(); ctx.translate(0.7, 1.6);
        ctx.fillStyle = m.sombra; ctx.fill(m.forma);
        ctx.restore();
        ctx.fillStyle = m.cor; ctx.fill(m.forma);
    }
    // reflexo: curva fina entre a borda e o meio da mecha, só no primeiro trecho
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    for (const m of mechas) {
        if (m.W < 9) continue;
        const e = m.espinha, b = m.lado, ini = 1, fim = Math.floor(e.length * 0.5);
        ctx.lineWidth = m.W * 0.13;
        ctx.beginPath();
        for (let i = ini; i <= fim; i++) {
            const x = e[i][0] * 0.55 + b[i][0] * 0.45, y = e[i][1] * 0.55 + b[i][1] * 0.45;
            if (i === ini) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

// Ângulo de uma tabela de 5 entradas para N mechas (interpola)
function anguloMecha(tabela, p, i, n) {
    const f = i * 4 / Math.max(1, n - 1), j = Math.floor(f), k = Math.min(4, j + 1), t = f - j;
    return angulosEstado(tabela, p, j) * (1 - t) + angulosEstado(tabela, p, k) * t;
}

const CRINA_L = [15, 19, 21, 18, 13], CRINA_W = [11, 12.5, 13, 11.5, 9], CRINA_COR = [1, 0, 2, 3, 0];
const CRINA_VARIA = [-4, 5, -3, 4, -2];   // pequena variação de ângulo por mecha (graus): nada fica paralelo
const CAUDA_L = [25, 31, 28, 21], CAUDA_W = [11.5, 13.5, 12, 9], CAUDA_COR = [0, 2, 3, 1];

function desenharCrina(ctx, p, pal, lw, onda, angPescoco, fundo) {
    const mechas = [];
    if (fundo) {
        // 2 mechas escuras atrás do pescoço: dão volume à crina
        for (let i = 0; i < 2; i++) {
            const t = 0.3 + i * 0.45;
            const rx = 3 + (-5 - 3) * t, ry = -14.5 + (-2 + 14.5) * t;
            const a = (anguloMecha(CRINA_BASE, p, i * 2 + 1, 5) + 12) * Math.PI / 180 - angPescoco
                + onda.A * Math.sin(onda.fase - 0.6 * i - 0.3);
            const m = caminhoMecha(rx, ry, a, 1.4 + onda.B * Math.sin(onda.fase - 0.6 * i - 1.1), 19, 12);
            m.cor = pal.crinaFundo[i]; m.sombra = pal.crinaSombra[3];
            mechas.push(m);
        }
        desenharGrupoMechas(ctx, mechas, pal, lw);
        return;
    }
    // 5 mechas largas ao longo da crista do pescoço; as de trás primeiro. A ponta enrola para dentro.
    for (let i = 4; i >= 0; i--) {
        const t = i / 4;
        const rx = 3.5 + (-5.5 - 3.5) * t, ry = -15 + (-1.5 + 15) * t;
        const a = (anguloMecha(CRINA_BASE, p, i, 5) + CRINA_VARIA[i]) * Math.PI / 180 - angPescoco
            + onda.A * Math.sin(onda.fase - 0.6 * i);
        const cacho = -(1.6 + 0.15 * i) + onda.B * 1.2 * Math.sin(onda.fase - 0.6 * i - 0.8);
        const m = caminhoMecha(rx, ry, a, cacho, CRINA_L[i], CRINA_W[i]);
        m.cor = pal.crina[CRINA_COR[i]]; m.sombra = pal.crinaSombra[CRINA_COR[i]];
        mechas.push(m);
    }
    desenharGrupoMechas(ctx, mechas, pal, lw);
}

function desenharCauda(ctx, p, pal, lw, onda) {
    const mechas = [];
    for (let i = 0; i < 4; i++) {
        const a = (anguloMecha(CAUDA_BASE, p, i, 4) + CRINA_VARIA[i]) * Math.PI / 180
            + onda.A * 1.2 * Math.sin(onda.fase - 0.5 * i - 1.4);
        // ponta em cacho, enrolando para cima, balançando com a onda
        const cacho = 1.6 + 0.2 * i + onda.B * 1.4 * Math.sin(onda.fase - 0.5 * i - 2.2);
        const m = caminhoMecha(RAIZ_CAUDA[0] + 1, RAIZ_CAUDA[1] + 1, a, cacho, CAUDA_L[i], CAUDA_W[i]);
        m.cor = pal.crina[CAUDA_COR[i]]; m.sombra = pal.crinaSombra[CAUDA_COR[i]];
        mechas.push(m);
    }
    desenharGrupoMechas(ctx, mechas, pal, lw);
}

// Topete: 3 mechas no alto da cabeça (uma caindo para a frente sobre a testa, sem cobrir o olho)
function desenharTopete(ctx, pal, lw, onda) {
    const def = [[-155, 1.6, 11, 8, 1], [-128, 1.4, 10, 7.5, 0], [-58, -1.5, 9, 7, 2]];
    const mechas = def.map(([ang, cacho, L, W, cor], i) => {
        const a = ang * Math.PI / 180 + onda.A * 0.5 * Math.sin(onda.fase - i);
        const m = caminhoMecha(1.5 - i * 1.5, -10.5, a, cacho, L, W);
        m.cor = pal.crina[cor]; m.sombra = pal.crinaSombra[cor];
        return m;
    });
    desenharGrupoMechas(ctx, mechas, pal, lw);
}

// ─── Galope de 4 tempos (B3) ───
const FATOR_FASE_GALOPE = 0.085;      // runPhase → fase do galope (0..1); cadência um pouco maior (menos "patinação")
const CHAO = 15.4;                    // linha dos cascos em unidades locais ((h/2)/1,3)
// Defasagem de cada pata no ciclo fica em ESPECIES[...].offsets (cavalo = galope transverso)
// Keyframes [u, coxa, canela] — ângulos absolutos a partir da vertical (positivo = casco para trás)
// u 0–0,4: apoio no chão (casco plantado, passada longa) · 0,4–1: pata no ar
const KF_DIANTEIRA = [[0, -36, -28], [0.2, 0, 0], [0.4, 40, 26], [0.6, 12, 95], [0.8, -42, 30], [1, -36, -28]];
const KF_TRASEIRA = [[0, -30, -16], [0.2, 5, -5], [0.4, 48, 30], [0.6, -15, 50], [0.8, -40, 5], [1, -30, -16]];

function amostrarKF(kf, u) {
    for (let i = 0; i < kf.length - 1; i++) {
        const a = kf[i], b = kf[i + 1];
        if (u >= a[0] && u <= b[0]) {
            const t = (u - a[0]) / (b[0] - a[0]);
            const s = t * t * (3 - 2 * t);           // smoothstep
            return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
        }
    }
    return [kf[0][1], kf[0][2]];
}

const _lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Pose de cada pata no ar (subindo / ápice / caindo / voo / dash / slam / mortal / morte)
function poseArPata(p, dianteira, tempo) {
    if (p.assustado) return dianteira ? [-65, -35] : [60, 35];                                     // morte: patas abertas
    if (typeof isDashing !== 'undefined' && isDashing) return dianteira ? [-75, -60] : [70, 60];   // "super-herói"
    if (typeof isSlamming !== 'undefined' && isSlamming) return dianteira ? [5, 0] : [-5, 0];      // patas retas para baixo
    if (typeof isFlying !== 'undefined' && isFlying) {
        const osc = 10 * Math.sin(tempo * 2 * Math.PI * 0.8 + (dianteira ? 0 : 1.2));
        return dianteira ? [-25 + osc, 35] : [25 + osc, 30];
    }
    const subindo = dianteira ? [-55, 40] : [50, 60];
    const apice = dianteira ? [-40, 70] : [-25, 35];
    const caindo = dianteira ? [-20, -10] : [5, -5];
    const s = Math.max(-1, Math.min(1, -p.vy / 6));
    let pose = s >= 0 ? _lerp2(apice, subindo, s) : _lerp2(apice, caindo, -s);
    // mortal para trás: encolhe as patas (pose "bola")
    const giro = Math.min(1, Math.abs(p.spin) * 1.5);
    if (giro > 0) pose = _lerp2(pose, dianteira ? [-60, 90] : [-35, 45], giro);
    return pose;
}

// Ângulos finais das 4 patas: galope (da espécie) no chão misturado com a pose aérea
function calcularPatas(p, tempo, kPouso, esp = ESPECIES.unicornio) {
    const fase = ((p.runPhase * FATOR_FASE_GALOPE * esp.cadencia) % 1 + 1) % 1;
    const res = {};
    for (const [nome, off] of Object.entries(esp.offsets)) {
        const dianteira = nome[0] === 'd';
        const u = (fase - off + 1) % 1;
        let chao = amostrarKF(dianteira ? KF_DIANTEIRA : KF_TRASEIRA, u);
        // pouso: joelhos dobram (recuperação)
        if (kPouso > 0) chao = [chao[0] + (dianteira ? -6 : 8) * kPouso, chao[1] + (dianteira ? 18 : -14) * kPouso];
        // pose do ar suavizada no passo de física (atualizarPose); morte e retratos usam a pose direta
        let ar = (p.arSuave && !p.assustado) ? p.arSuave[dianteira ? 'd' : 't'].slice() : poseArPata(p, dianteira, tempo);
        if (nome[1] === 'b') ar = [ar[0] + 6, ar[1] + 6];   // pata do fundo levemente defasada
        res[nome] = _lerp2(chao, ar, p.mistura);
    }
    res.fase = fase;
    return res;
}

// Altura do casco (em u) para uma pata com pivô em pivoY (casco/pata tem ~2,8u)
function alturaCasco(pivoY, ang, coxa = 9, canela = 7.5) {
    const r1 = ang[0] * Math.PI / 180, r2 = ang[1] * Math.PI / 180;
    return pivoY + Math.cos(r1) * coxa + Math.cos(r2) * (canela + 2.8);
}

// Estado de dano: recuo, flash branco e pisca
function estadoDano(p) {
    const total = typeof PASSOS_INVULNERAVEL === 'number' ? PASSOS_INVULNERAVEL : 60;
    if (!(p.hurtFrames > 0)) return { t: 99, recuo: 0, rot: 0, flash: false, alfa: 1, olhosFechados: false };
    const t = (total - p.hurtFrames) / 60;
    const k = Math.exp(-t / 0.12);
    return {
        t,
        recuo: -4 * k,
        rot: -8 * k * Math.PI / 180,
        flash: t < 0.12 && p.hurtFrames % 2 === 0,
        alfa: t >= 0.3 && Math.floor(p.hurtFrames / 4) % 2 === 0 ? 0.35 : 1,
        olhosFechados: t < 0.3
    };
}

// ─── Acessórios: cada personagem ganha um detalhe próprio (não é só troca de cor) ───
// onde: 'antes' (atrás do tronco), 'tras' (por cima das costas), 'corpo' (marcas no corpo),
//       'cabeca' (coordenadas da cabeça, antes do chifre), 'depois' (por cima de tudo)
function _contornar(ctx, path, cor, contorno, lw) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = contorno; ctx.lineWidth = lw; ctx.stroke(path);
    ctx.fillStyle = cor; ctx.fill(path);
}
function _estrela(cx, cy, r, pontas = 5) {
    const c = new Path2D();
    for (let i = 0; i < pontas * 2; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45, a = i * Math.PI / pontas - Math.PI / 2;
        c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath();
    return c;
}
const ACESS = {
    marca: (cor) => (ctx, pal, lw) => _contornar(ctx, _estrela(-11, -4.5, 3.2), cor, pal.contornoInterno, lw * 0.55),
    constelacao: (ctx, pal, lw) => {
        ctx.strokeStyle = '#FFE08A'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(-10, -2); ctx.lineTo(-7, -5.5); ctx.stroke();
        for (const [x, y] of [[-13, -6], [-10, -2], [-7, -5.5]]) _contornar(ctx, _estrela(x, y, 1.6, 4), '#FFE08A', pal.contornoInterno, lw * 0.35);
    },
    manchas: (cor) => (ctx) => {
        ctx.fillStyle = cor; ctx.globalAlpha *= 0.85;
        for (const [x, y, r] of [[-12, -3, 2.6], [-4.5, -1, 1.8], [3.5, -6, 2.2], [-8, -9, 1.5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    },
    painel: (ctx, pal, lw) => {
        const c = new Path2D(); c.roundRect(-7, -7, 9, 6, 1.5);
        _contornar(ctx, c, '#A9C4BE', pal.contorno, lw * 0.6);
        ctx.fillStyle = '#3A4A48';
        for (const [x, y] of [[-6, -6], [1, -6], [-6, -2], [1, -2]]) { ctx.beginPath(); ctx.arc(x, y, 0.55, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#00E5FF'; ctx.fillRect(-4, -5, 3, 1.2);
    },
    cristais: (ctx, pal, lw) => {
        for (const [x, y, t] of [[-16, -11.5, 5], [-11.5, -13.5, 7], [-7, -14, 5]]) {   // na garupa (a crina cobre o meio das costas)
            const c = new Path2D(); c.moveTo(x - 2.4, y + 2); c.lineTo(x, y - t); c.lineTo(x + 2.4, y + 2); c.closePath();
            _contornar(ctx, c, '#CFF4FF', '#2A3A7A', lw * 1.3);
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(x - 0.6, y - t + 2); ctx.lineTo(x - 1.4, y + 1); ctx.stroke();
        }
    },
    capa: (cor, borda) => (ctx, pal, lw, onda) => {
        const w = Math.sin(onda.fase) * 1.6;
        const c = new Path2D();
        c.moveTo(5, -14.5); c.quadraticCurveTo(-5, -18, -16, -13 + w);
        c.lineTo(-18.5, -3 + w * 1.4); c.quadraticCurveTo(-8, -5, 2, -8.5); c.closePath();
        _contornar(ctx, c, cor, pal.contorno, lw * 1.6);
        ctx.strokeStyle = borda; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-16, -12.5 + w); ctx.lineTo(-18.2, -3.4 + w * 1.4); ctx.stroke();
    },
    bolhas: (ctx, pal, lw, onda, tempo) => {
        ctx.strokeStyle = 'rgba(230,250,255,0.95)'; ctx.lineWidth = 1.3;
        const a0 = ctx.globalAlpha;
        for (let i = 0; i < 3; i++) {
            const sobe = ((tempo * 9 + i * 6) % 18);
            const x = 20 + i * 4 + Math.sin(tempo * 3 + i) * 1.5, y = -22 - sobe, r = 2.2 + i * 0.6;
            ctx.globalAlpha = a0 * (1 - sobe / 18);
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.stroke();
        }
    },
    // Fantasma: fiapos de névoa saindo da barriga e da cauda, ondulando
    nevoa: (ctx, pal, lw, onda, tempo) => {
        const a0 = ctx.globalAlpha;
        // fiapos mais fortes atrás (cobrem as patas de trás, como um "rabo" de fantasma) e mais fracos na frente
        for (let i = 0; i < 4; i++) {
            const x = -17 + i * 6.5, ond = Math.sin(tempo * 3 + i * 1.4) * 1.8;
            ctx.globalAlpha = a0 * (0.85 - i * 0.17);
            ctx.fillStyle = '#FBF8FF';
            ctx.beginPath();
            ctx.moveTo(x - 5, -1);
            ctx.quadraticCurveTo(x - 4 + ond, 10, x - 9 + ond * 2, 16);
            ctx.quadraticCurveTo(x + ond, 12, x + 5, -1);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = a0;
    },
    // ── cabeça ──
    coroa:(ctx, pal, lw) => {
        ctx.translate(-0.5, -10.4); ctx.rotate(-0.25);
        const c = new Path2D();
        c.moveTo(-5, 0); c.lineTo(-5, -4); c.lineTo(-2.5, -1.8); c.lineTo(0, -5.6); c.lineTo(2.5, -1.8); c.lineTo(5, -4); c.lineTo(5, 0); c.closePath();
        _contornar(ctx, c, '#FFD54A', '#8A5A00', lw * 1.2);
        ctx.fillStyle = '#E53935'; ctx.beginPath(); ctx.arc(0, -1.3, 1, 0, Math.PI * 2); ctx.fill();
    },
    aureola: (ctx, pal, lw, onda, tempo) => {
        const y = -21 + Math.sin(tempo * 2.5) * 0.6;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(spriteLuz('#FFE08A'), -6, y - 8, 16, 16);
        ctx.restore();
        ctx.strokeStyle = '#8A5A00'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(2, y, 6.5, 2, -0.1, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#FFE08A'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(2, y, 6.5, 2, -0.1, 0, Math.PI * 2); ctx.stroke();
    },
    faixaNinja: (ctx, pal, lw, onda) => {
        for (let i = 0; i < 2; i++) {
            const a = (192 + i * 14) * Math.PI / 180 + 0.25 * Math.sin(onda.fase * 1.5 - i);
            desenharMecha(ctx, -6.5, -7, a, 0.3 * Math.sin(onda.fase - i), 10, 3.2, '#E53935', 'rgba(255,255,255,0.3)', pal.contorno, lw * 0.6);
        }
        ctx.lineCap = 'round';
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = 4.8;
        ctx.beginPath(); ctx.moveTo(-6.5, -7.2); ctx.quadraticCurveTo(3, -11, 11.5, -8.2); ctx.stroke();
        ctx.strokeStyle = '#E53935'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-6.5, -7.2); ctx.quadraticCurveTo(3, -11, 11.5, -8.2); ctx.stroke();
    },
    chifrinhos: (ctx, pal, lw) => {
        // chifres de oni: grandes, curvos e cor de osso (contrastam com o corpo vermelho)
        for (const [x, y, r] of [[-2.5, -9.5, -0.5], [8.5, -8.8, 0.35]]) {
            ctx.save(); ctx.translate(x, y); ctx.rotate(r);
            const c = new Path2D(); c.moveTo(-2.6, 0.8); c.quadraticCurveTo(-2.2, -4.5, 1.6, -8.5); c.quadraticCurveTo(0.6, -3.5, 2.6, 0.8); c.closePath();
            _contornar(ctx, c, '#FFE9B0', pal.contorno, lw * 1.1);
            ctx.fillStyle = '#E0B060';   // anéis do chifre
            ctx.fillRect(-1.8, -2.2, 3.6, 0.9); ctx.fillRect(-1.2, -4.6, 2.6, 0.8);
            ctx.restore();
        }
    },
    antena: (cor) => (ctx, pal, lw, onda, tempo) => {
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-1, -10.5); ctx.quadraticCurveTo(-1.5, -16, -4, -19.5); ctx.stroke();
        const c = new Path2D(); c.arc(-4, -19.5, 1.8, 0, Math.PI * 2);
        _contornar(ctx, c, cor, pal.contorno, lw * 0.6);
        if (Math.sin(tempo * 6) > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(spriteLuz(cor), -9, -24.5, 10, 10);
        }
    },
    chapeu: (ctx, pal, lw, onda) => {
        desenharMecha(ctx, -3, -13, (205 + 6 * Math.sin(onda.fase)) * Math.PI / 180, 0.4, 11, 3.6, '#FFE08A', 'rgba(255,255,255,0.4)', pal.contorno, lw * 0.6);
        ctx.translate(1.5, -11.5); ctx.rotate(-0.2);
        const c = new Path2D(); c.ellipse(0, 0, 7.8, 3.2, 0, 0, Math.PI * 2);
        _contornar(ctx, c, '#7B3FA0', pal.contorno, lw * 1.2);
        ctx.fillStyle = '#9C5CC4'; ctx.beginPath(); ctx.ellipse(-1.5, -1, 4, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    },
    elmo: (ctx, pal, lw, onda) => {
        desenharMecha(ctx, 2, -12, (250 + 8 * Math.sin(onda.fase)) * Math.PI / 180, -0.5, 10, 4.2, '#E53935', 'rgba(255,255,255,0.3)', pal.contorno, lw * 0.6);
        const c = new Path2D();
        c.arc(3, -3, 9.8, Math.PI * 1.02, Math.PI * 1.98); c.closePath();
        _contornar(ctx, c, '#B0BEC5', pal.contorno, lw * 1.4);
        ctx.strokeStyle = '#78909C'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-6.4, -3.6); ctx.lineTo(12.4, -3.6); ctx.stroke();
    },
    tiara: (ctx, pal, lw) => {
        for (const [x, y, t] of [[-5, -8.5, 3.5], [-1.8, -10.8, 5], [1.6, -11.6, 3.5]]) {
            const c = new Path2D(); c.moveTo(x - 1.4, y + 1); c.lineTo(x, y - t); c.lineTo(x + 1.4, y + 1); c.lineTo(x, y + 2); c.closePath();
            _contornar(ctx, c, '#CFF4FF', '#2A3A7A', lw * 0.8);
        }
    },
    folhas: (ctx, pal, lw) => {
        for (const [x, y, r] of [[-5, -8, -1.1], [-2, -10.6, -0.5], [1.6, -11.6, 0.2]]) {
            ctx.save(); ctx.translate(x, y); ctx.rotate(r);
            const c = new Path2D(); c.ellipse(0, -2, 1.6, 3, 0, 0, Math.PI * 2);
            _contornar(ctx, c, '#4CD07D', '#1E6B3A', lw * 0.7);
            ctx.restore();
        }
    },
    oculos: (ctx, pal, lw) => {
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(1.4, -3.4); ctx.lineTo(-6, -4.5); ctx.stroke();
        const c = new Path2D(); c.ellipse(5.8, -2.8, 4.6, 3.4, -0.1, 0, Math.PI * 2);
        _contornar(ctx, c, '#1A1033', '#FF4FD8', lw * 0.7);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(3.6, -4.6); ctx.lineTo(6.2, -4.9); ctx.stroke();
    },
    chama: (ctx, pal, lw, onda, tempo) => {
        const f = Math.sin(tempo * 14) * 0.8;
        ctx.translate(8.3, -23);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(spriteLuz('#FF8A00'), -7, -12, 14, 14);
        ctx.globalCompositeOperation = 'source-over';
        const fora = new Path2D(); fora.moveTo(0, 0); fora.quadraticCurveTo(-3, -3, 0, -7.5 - f); fora.quadraticCurveTo(3, -3, 0, 0);
        _contornar(ctx, fora, '#FF9800', '#B23B00', lw * 0.5);
        ctx.fillStyle = '#FFF176';
        ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.quadraticCurveTo(-1.4, -2.5, 0, -4.6 - f * 0.6); ctx.quadraticCurveTo(1.4, -2.5, 0, -0.5); ctx.fill();
    },
    lacinho: (cor) => (ctx, pal, lw) => {
        ctx.translate(-3.5, -10.5); ctx.rotate(-0.4);
        for (const s of [-1, 1]) {
            const c = new Path2D(); c.moveTo(0, 0); c.lineTo(4 * s, -2.6); c.lineTo(4 * s, 2.6); c.closePath();
            _contornar(ctx, c, cor, pal.contorno, lw * 0.6);
        }
        const n = new Path2D(); n.arc(0, 0, 1.4, 0, Math.PI * 2);
        _contornar(ctx, n, cor, pal.contorno, lw * 0.6);
    }
};
// id do personagem → acessórios (ver o array `characters` no game.js)
const ACESSORIOS = {
    0: { corpo: ACESS.marca('#FF5FA8') },                        // Padrão: marca de estrela rosa
    1: { frente: ACESS.chama },                                  // Fogo: chifre em chamas (desenhada depois do chifre)
    2: { cabeca: ACESS.tiara },                                  // Gelo: tiara de cristais
    3: { tras: ACESS.capa('#9C6BFF', '#E0D4FF') },               // Sombra: capa roxa
    4: { corpo: ACESS.marca('#FFC94A') },                        // Dourado: marca dourada
    5: { cabeca: ACESS.folhas },                                 // Esmeralda: coroa de folhas
    6: { corpo: ACESS.constelacao },                             // Cósmico: constelação
    7: { cabeca: ACESS.oculos },                                 // Neon: óculos escuros
    8: { depois: ACESS.nevoa },                                  // Fantasma: névoa ondulando por cima das patas de trás
    9: { cabeca: ACESS.antena('#FF3B3B') },                      // Ciborgue: antena
    10: { depois: ACESS.bolhas },                                // Aqua: bolhas
    11: { tras: ACESS.capa('#C62828', '#FFD54A'), cabeca: ACESS.elmo },        // Guerreiro
    12: { cabeca: ACESS.aureola, asinhas: true },                // Anjo
    13: { cabeca: ACESS.chifrinhos },                            // Oni
    14: { corpo: ACESS.manchas('#B7FF3B') },                     // Tóxico: roxo com manchas verde-limão
    15: { cabeca: ACESS.faixaNinja },                            // Ninja
    16: { cabeca: ACESS.antena('#00E5FF'), corpo: ACESS.painel }, // Robô
    17: { tras: ACESS.cristais },                                // Cristal
    18: { cabeca: ACESS.chapeu },                                // Bardo
    19: { tras: ACESS.capa('#C62828', '#FFFFFF'), cabeca: ACESS.coroa },        // Rei
    21: { cabeca: ACESS.lacinho('#FF5FA8') },                    // Gatinho
    22: { cabeca: ACESS.lacinho('#6FD3FF') }                     // Coelho
};
function desenharAcessorio(ctx, id, onde, pal, lw, onda, tempo) {
    const a = ACESSORIOS[id];
    if (!a || !a[onde]) return;
    ctx.save();
    a[onde](ctx, pal, lw, onda, tempo);
    ctx.restore();
}
const temAsinhas = (id) => !!(ACESSORIOS[id] && ACESSORIOS[id].asinhas);

// ─── Desenho principal ───
// x, y: canto da hitbox na tela; p: estado do jogador; tempo: segundos; escala: 1,3 no tamanho normal
// Quando precisa de transparência ou flash (Fantasma, dano), desenha numa camada fora da tela e
// aplica o efeito uma vez só — assim as partes sobrepostas não viram manchas.
let _camada = null, _camadaCtx = null;

function desenharUnicornio(ctx, x, y, p, tempo, escala) {
    const pal = paletaDe(p.char);
    const dano = estadoDano(p);
    if (pal.alfa >= 1 && !dano.flash && dano.alfa >= 1) {
        desenharUnicornioDireto(ctx, x, y, p, tempo, escala, pal, dano);
        return;
    }
    const m = ctx.getTransform();
    const s = Math.hypot(m.a, m.b) || 1;
    const tam = 180 * Math.max(p.w / 50, p.h / 40);        // área lógica ao redor do personagem
    const px = Math.ceil(tam * s);
    if (!_camada) { _camada = document.createElement('canvas'); _camadaCtx = _camada.getContext('2d'); }
    if (_camada.width < px) { _camada.width = px; _camada.height = px; }
    const o = _camadaCtx;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalCompositeOperation = 'source-over';
    o.globalAlpha = 1;
    o.clearRect(0, 0, px, px);
    o.setTransform(s, 0, 0, s, px / 2, px / 2);
    desenharUnicornioDireto(o, -p.w / 2, -p.h / 2, p, tempo, escala, pal, dano);
    if (dano.flash) {
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.globalCompositeOperation = 'source-atop';
        o.fillStyle = 'rgba(255,255,255,0.8)';
        o.fillRect(0, 0, px, px);
        o.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.globalAlpha *= dano.alfa * (pal.alfa < 1 ? 0.75 : 1);
    ctx.drawImage(_camada, 0, 0, px, px, x + p.w / 2 - tam / 2, y + p.h / 2 - tam / 2, tam, tam);
    ctx.restore();
}

function desenharUnicornioDireto(ctx, x, y, p, tempo, escala, pal, dano) {
    const esp = especieDe(p.char);
    const lw = Math.max(2.2, 2.0 / (escala * p.w / 50));   // contorno ~2,9 px, nunca menos de 2 px
    // pose de recuperação do pouso: curva com saída suave (mais visível no começo)
    const passosPouso = typeof PASSOS_POUSO === 'number' ? PASSOS_POUSO : 10;
    const kPouso = p.pouso ? Math.pow(Math.max(0, 1 - p.pouso.t / passosPouso), 2) * Math.min(1, p.pouso.forca / 12) * (1 - p.mistura * 0.5) : 0;
    const patas = calcularPatas(p, tempo, kPouso, esp);
    const naCorrida = 1 - p.mistura;
    const coxa = esp.coxa, canela = esp.canela;

    // Cascos plantados: desloca o corpo para que o casco mais baixo fique exatamente na linha do chão
    const maisBaixo = Math.max(
        alturaCasco(PIVO_PATA_TRAS[1], patas.tb, coxa, canela), alturaCasco(PIVO_PATA_TRAS[1], patas.tf, coxa, canela),
        alturaCasco(PIVO_PATA_FRENTE[1], patas.db, coxa, canela), alturaCasco(PIVO_PATA_FRENTE[1], patas.df, coxa, canela));
    let ajusteChao = (CHAO - maisBaixo) * naCorrida;
    // coelho: pulinho quando as patas traseiras empurram
    if (esp.salto) ajusteChao -= esp.salto * Math.max(0, Math.sin(2 * Math.PI * (patas.fase - 0.05))) * naCorrida;
    const inclinacao = esp.inclinacao * Math.sin(2 * Math.PI * (patas.fase - 0.2)) * naCorrida;   // graus
    // gato: a coluna estica e encolhe com a passada
    const flexao = 1 + esp.flexao * Math.sin(2 * Math.PI * patas.fase) * naCorrida;

    ctx.save();
    // ── Rig: posição, inclinação, squash ancorado nos pés, tamanho, recuo de dano ──
    ctx.translate(x + p.w / 2, y + p.h / 2);
    ctx.rotate(p.rot + p.spin + dano.rot);
    ctx.translate(0, p.h / 2);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.translate(0, -p.h / 2);
    ctx.scale(p.w / 50, p.h / 40);
    ctx.scale(escala, escala);
    ctx.translate(dano.recuo, ajusteChao);
    ctx.rotate(inclinacao * Math.PI / 180);

    // Pescoço: balança com atraso em relação ao tronco; estica subindo, abaixa caindo e no pouso
    const sVy = Math.max(-1, Math.min(1, -p.vy / 6)) * p.mistura;
    const angPescocoGraus = INCLINACAO_PESCOCO
        + (-0.6 * inclinacao + 4 * Math.sin(2 * Math.PI * (patas.fase - 0.28))) * naCorrida
        + (sVy > 0 ? -10 * sVy : -6 * sVy)
        + 12 * kPouso;
    const angPescoco = angPescocoGraus * Math.PI / 180;
    const angOrelha = -6 + 8 * Math.sin(2 * Math.PI * patas.fase) * naCorrida
        + (sVy > 0 ? 25 * sVy : 5 * sVy) + (dano.t < 0.6 ? 30 : 0);
    const kPesc = esp.pescoco;   // gato e coelho têm pescoço mais curto

    // Humor do rosto conforme o estado
    const dashando = typeof isDashing !== 'undefined' && isDashing;
    const humor = dashando ? 'determinado' : kPouso > 0.3 ? 'feliz' : sVy > 0.3 ? 'subindo' : sVy < -0.4 ? 'caindo' : 'correndo';

    // velocidade REAL da animação (inclui o dash): a crina reage ao dash
    const vel = typeof p.velAnim === 'number' ? p.velAnim : (typeof gameSpeed === 'number' ? gameSpeed : 5);
    const ondaCrina = atualizarOnda(p, tempo, vel);
    const idAcc = p.char.id;
    const lwMecha = lw * 0.6;   // linhas internas mais finas que o contorno externo

    // Transformação do tronco (mais curto; gato achatado e com a coluna flexionando)
    const comTronco = (f) => { ctx.save(); ctx.scale(ESCALA_TRONCO_X * flexao, esp.troncoY); f(); ctx.restore(); };

    // ── 1. Patas do fundo ──
    const largTras = esp.cauda === 'pompom' ? 8.5 : 7;   // coelho: coxas traseiras fortes
    desenharPata(ctx, PIVO_PATA_TRAS[0] + 2.5, PIVO_PATA_TRAS[1], patas.tb[0], patas.tb[1], largTras, 3.6, pal.fundo, pal, lw, esp.pe, coxa, canela);
    desenharPata(ctx, PIVO_PATA_FRENTE[0] + 2.5, PIVO_PATA_FRENTE[1], patas.db[0], patas.db[1], 5.5, 3.4, pal.fundo, pal, lw, esp.pe, coxa, canela);

    // asa de trás: penas no voo (ou asinhas do Anjo); o dragão sempre tem asas de morcego
    const voando = typeof isFlying !== 'undefined' && isFlying;
    const asinhas = !voando && temAsinhas(idAcc);
    const bateAsa = 25 * Math.sin(tempo * 2 * Math.PI * 2.2) * Math.PI / 180;
    const bateMorcego = (voando ? 25 * Math.sin(tempo * 2 * Math.PI * 2.2) : 6 * Math.sin(tempo * 2 * Math.PI)) * Math.PI / 180;
    const desenharAsaPenas = (fundo) => {
        ctx.save(); ctx.translate(PIVO_ASA[0] + (fundo ? 2 : 0), PIVO_ASA[1] - (fundo ? 1 : 0));
        if (asinhas) ctx.scale(0.55, 0.55);
        desenharAsa(ctx, pal, lw, (asinhas ? bateAsa * 0.4 : bateAsa) * (fundo ? 0.9 : 1) + (fundo ? 0.15 : 0), fundo);
        ctx.restore();
    };
    if (esp.asas === 'morcego') {
        ctx.save(); ctx.translate(PIVO_ASA[0] + 2, PIVO_ASA[1] - 1);
        desenharAsaMorcego(ctx, pal, lw, bateMorcego * 0.9 + 0.2, true);
        ctx.restore();
    } else if (voando || asinhas) desenharAsaPenas(true);

    // ── 2. Cauda, crina de fundo, espinhos e acessórios de trás (atrás do corpo) ──
    if (esp.cauda === 'mechas') desenharCauda(ctx, p, pal, lwMecha, ondaCrina);
    else desenharCaudaEspecie(ctx, p, pal, lw, ondaCrina, esp);
    if (esp.crina) {
        ctx.save();
        ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]); ctx.rotate(angPescoco);
        desenharCrina(ctx, p, pal, lwMecha, ondaCrina, angPescoco, true);
        ctx.restore();
    }
    if (esp.espinhos) desenharEspinhos(ctx, pal, lw, angPescoco, kPesc);
    desenharAcessorio(ctx, idAcc, 'antes', pal, lw, ondaCrina, tempo);

    // ── 3. Silhueta única: contorno por trás de tronco + pescoço + patas da frente, depois o preenchimento ──
    // (as patas da frente se fundem ao corpo: o contorno delas não corta mais a barriga)
    desenharPata(ctx, PIVO_PATA_TRAS[0], PIVO_PATA_TRAS[1], patas.tf[0], patas.tf[1], largTras, 3.6, pal.corpo, pal, lw, esp.pe, coxa, canela, 'contorno');
    desenharPata(ctx, PIVO_PATA_FRENTE[0], PIVO_PATA_FRENTE[1], patas.df[0], patas.df[1], 5.5, 3.4, pal.corpo, pal, lw, esp.pe, coxa, canela, 'contorno');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.contorno;
    ctx.lineWidth = lw * 2;
    comTronco(() => ctx.stroke(FORMAS.tronco));
    ctx.save();
    ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]); ctx.rotate(angPescoco); ctx.scale(1, kPesc);
    ctx.stroke(FORMAS.pescoco);
    ctx.restore();

    comTronco(() => {
        preencherSombreado(ctx, FORMAS.tronco, pal.corpo, pal.sombra);
        desenharPelagem(ctx, visualDe(p).pelagem, FORMAS.tronco, CAIXA_TRONCO, tempo, 1);   // pelagem da loja
        ctx.save(); ctx.clip(FORMAS.tronco);
        if (esp.ventre && pal.ventre) {
            // dragão: barriga clara com placas
            ctx.fillStyle = pal.ventre;
            ctx.beginPath(); ctx.ellipse(1, 3, 17, 5.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = pal.contornoInterno; ctx.lineWidth = lw * 0.35;
            ctx.beginPath(); for (const xx of [-9, -4, 1, 6, 11]) { ctx.moveTo(xx, -1); ctx.lineTo(xx + 1, 4); } ctx.stroke();
        }
        // brilhos do dorso e da anca
        ctx.fillStyle = pal.claro;
        ctx.beginPath(); ctx.ellipse(-5, -11, 9, 2.2, -0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-14, -10, 4, 2.6, -0.4, 0, Math.PI * 2); ctx.fill();
        // luz de borda (1px clara no topo): separa o personagem do céu roxo
        ctx.translate(0.7, 0.9); ctx.strokeStyle = pal.claro; ctx.lineWidth = 1.2; ctx.globalAlpha *= 0.8;
        ctx.stroke(FORMAS.tronco);
        ctx.restore();
    });

    desenharAcessorio(ctx, idAcc, 'tras', pal, lw, ondaCrina, tempo);

    // ── 4. Pescoço, crina, cabeça (hierarquia: tronco → pescoço → cabeça) ──
    ctx.save();
    ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]);
    ctx.rotate(angPescoco);
    ctx.save(); ctx.scale(1, kPesc);
    preencherSombreado(ctx, FORMAS.pescoco, pal.corpo, pal.sombra);
    desenharPelagem(ctx, visualDe(p).pelagem, FORMAS.pescoco, CAIXA_PESCOCO, tempo, 2);
    ctx.restore();

    // crina: 5 mechas ao longo da crista do pescoço
    if (esp.crina) desenharCrina(ctx, p, pal, lwMecha, ondaCrina, angPescoco, false);

    // cabeça: desconta metade do balanço do pescoço (olhar estável) e aponta o focinho um pouco para baixo
    ctx.translate(NUCA_NO_PESCOCO[0], NUCA_NO_PESCOCO[1] * kPesc);
    ctx.rotate(-INCLINACAO_PESCOCO * Math.PI / 180 - (angPescoco - INCLINACAO_PESCOCO * Math.PI / 180) * 0.5
        + INCLINACAO_CABECA * Math.PI / 180 + 0.12 * kPouso);
    ctx.scale(esp.escalaCabeca, esp.escalaCabeca);
    const lwCab = lw / esp.escalaCabeca * 1.15;   // a cabeça cresceu: o contorno não engrossa junto

    // orelha de trás (gato e coelho têm duas visíveis)
    if (esp.orelha === 'gato' || esp.orelha === 'coelho') desenharOrelhaEspecie(ctx, pal, lwCab, esp, angOrelha, ondaCrina, true);

    const formaCabeca = FORMAS[esp.cabeca], formaFocinho = FORMAS[esp.focinho];
    ctx.strokeStyle = pal.contorno; ctx.lineWidth = lwCab * 2;
    ctx.stroke(formaCabeca);
    preencherSombreado(ctx, formaCabeca, pal.corpo, pal.sombra);
    desenharPelagem(ctx, visualDe(p).pelagem, formaCabeca, CAIXA_CABECA, tempo, 3);
    ctx.save(); ctx.clip(formaCabeca);
    // tom do focinho em degradê suave (sem borda dura: não denuncia uma "segunda forma" na cabeça)
    const [fx, fy, fr] = CENTRO_FOCINHO[esp.cabeca] || CENTRO_FOCINHO.cabeca;
    const corF = paraRGBA(pal.focinho);
    const gradF = ctx.createRadialGradient(fx, fy, fr * 0.2, fx, fy, fr);
    gradF.addColorStop(0, `rgba(${corF.r},${corF.g},${corF.b},1)`);
    gradF.addColorStop(1, `rgba(${corF.r},${corF.g},${corF.b},0)`);
    ctx.fillStyle = gradF; ctx.fill(formaCabeca);
    ctx.fillStyle = pal.claro; ctx.beginPath(); ctx.arc(0, -8, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0.6, 0.8); ctx.strokeStyle = pal.claro; ctx.lineWidth = 1; ctx.globalAlpha *= 0.8;
    ctx.stroke(formaCabeca);   // luz de borda da cabeça
    ctx.restore();
    // bochecha, nariz/boca da espécie, olho
    ctx.fillStyle = pal.bochecha;
    ctx.beginPath(); ctx.ellipse(9, 2.2, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    desenharRostoEspecie(ctx, p, pal, lwCab, esp, humor);
    desenharOlho(ctx, p, pal, lwCab, dano, humor);

    // topete (só unicórnio): 3 mechas — duas para trás e uma caindo para a frente (sem cobrir o olho)
    if (esp.topete) desenharTopete(ctx, pal, lwMecha, ondaCrina);

    // orelha da frente
    desenharOrelhaEspecie(ctx, pal, lwCab, esp, angOrelha, ondaCrina, false);

    // acessórios da cabeça (antes do chifre: coroa, chapéu, faixa... o chifre "atravessa").
    // Um chapéu da loja substitui o acessório de cabeça do personagem (para não encavalar).
    const vis = visualDe(p);
    if (vis.chapeu && vis.chapeu !== 'nenhum') desenharChapeu(ctx, vis.chapeu, pal, lwCab, ondaCrina, tempo);
    else desenharAcessorio(ctx, idAcc, 'cabeca', pal, lwCab, ondaCrina, tempo);

    // chifre(s)
    const mat = materialChifre(vis.chifre, pal);   // material escolhido na loja (dourado = padrão)
    if (esp.chifre === 'unicornio') {
        // chifre espiral (sem shadowBlur): base, face de sombra, faixas da espiral, brilho
        if (mat.halo) {
            // neon: halo aceso em volta do chifre
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255,79,216,0.45)'; ctx.lineWidth = lwCab * 4.5; ctx.stroke(FORMAS.chifre);
            ctx.restore();
        }
        ctx.strokeStyle = mat.contorno; ctx.lineWidth = lwCab * 1.5; ctx.stroke(FORMAS.chifre);
        ctx.fillStyle = mat.base; ctx.fill(FORMAS.chifre);
        ctx.save();
        ctx.clip(FORMAS.chifre);
        if (mat.faceta) {
            // cristal: metade clara e metade escura, separadas por uma aresta (parece lapidado)
            ctx.fillStyle = mat.sombra;
            ctx.beginPath(); ctx.moveTo(8.2, -24); ctx.lineTo(14, -9); ctx.lineTo(6.5, -9); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(8.2, -24); ctx.lineTo(6.5, -9); ctx.moveTo(1, -12); ctx.lineTo(13, -15); ctx.stroke();
        } else if (mat.espiralGrossa) {
            // chocolate: espiral larga e escura (sorvete de casquinha)
            ctx.strokeStyle = mat.sombra; ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let k = 0; k < 4; k++) { const yy = -11.5 - k * 3.2; ctx.moveTo(0, yy + 2); ctx.lineTo(12, yy - 1.5); }
            ctx.stroke();
        } else if (mat.faixas) {
            // arco-íris: faixas diagonais coloridas em espiral
            ctx.lineWidth = 2.4;
            mat.faixas.forEach((cor, k) => { ctx.strokeStyle = cor; ctx.beginPath(); const yy = -9 - k * 2.4; ctx.moveTo(0, yy + 2); ctx.lineTo(12, yy - 1.5); ctx.stroke(); });
        } else {
            ctx.fillStyle = mat.sombra; ctx.fill(FORMAS.chifreSombra);
            ctx.strokeStyle = mat.sombra; ctx.lineWidth = 1.1;
            ctx.beginPath();
            for (let k = 0; k < 3; k++) { const yy = -13.8 - k * 3.4; ctx.moveTo(0, yy + 2); ctx.lineTo(12, yy - 1.5); }
            ctx.stroke();
        }
        if (mat.granulado) {
            // chocolate com granulado colorido
            ['#FF5FA8', '#FFE08A', '#9BE7FF', '#7DDE92', '#FFFFFF'].forEach((cor, k) => {
                ctx.save(); ctx.translate(4 + (k % 2) * 2.2, -13 - k * 2); ctx.rotate(k * 1.3);
                ctx.fillStyle = cor; ctx.fillRect(-0.9, -0.35, 1.8, 0.7); ctx.restore();
            });
        }
        if (mat.estrelas) {
            ctx.fillStyle = '#FFFFFF';
            for (const [x, y] of [[5, -13.5], [6.8, -17.5], [7.4, -21]]) ctx.fillRect(x, y, 0.9, 0.9);
        }
        ctx.strokeStyle = mat.brilho; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2.8, -11.5); ctx.lineTo(7.6, -21.8); ctx.stroke();
        ctx.restore();
        if (mat.estrelaPonta) {
            // estelar: estrela de 4 pontas na ponta do chifre
            ctx.save(); ctx.translate(8.2, -23.5); ctx.rotate(Math.sin(tempo * 2) * 0.3);
            _contornar(ctx, _estrela(0, 0, 3.4, 4), '#FFF4C2', '#6B4FC8', lwCab * 0.6);
            ctx.restore();
        }
    } else if (esp.chifre === 'dragao') {
        // dois chifres curtos e grossos, curvos para trás
        for (const [dx, k] of [[4.5, 0.85], [0, 1]]) {
            ctx.save(); ctx.translate(dx, 0); ctx.rotate(-0.3); ctx.scale(k, k);
            ctx.strokeStyle = pal.chifre.contorno; ctx.lineWidth = lwCab * 1.4; ctx.stroke(FORMAS.chifreDragao);
            ctx.fillStyle = pal.chifre.base; ctx.fill(FORMAS.chifreDragao);
            ctx.restore();
        }
    }

    // pontos de luz pré-desenhados (substituem o shadowBlur antigo): ponta do chifre e lente do Ciborgue
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (esp.chifre === 'unicornio') {
        const tamLuz = 9 + 2 * Math.sin(tempo * 4);
        ctx.drawImage(spriteLuz(mat.luz || mat.base), 8.2 - tamLuz / 2, -23 - tamLuz / 2, tamLuz, tamLuz);
    }
    if (pal.olhoCiborgue && !p.assustado) ctx.drawImage(spriteLuz('#FF2A2A'), 5.7 - 5, -2.6 - 5, 10, 10);
    ctx.restore();
    desenharAcessorio(ctx, idAcc, 'frente', pal, lwCab, ondaCrina, tempo);   // ex.: chama na ponta do chifre

    ctx.restore(); // fim pescoço/cabeça

    // asa da frente
    if (esp.asas === 'morcego') {
        ctx.save(); ctx.translate(PIVO_ASA[0], PIVO_ASA[1]);
        desenharAsaMorcego(ctx, pal, lw, bateMorcego, false);
        ctx.restore();
    } else if (voando || asinhas) desenharAsaPenas(false);

    // ── 5. Patas da frente: só o preenchimento (o contorno já está na silhueta) ──
    desenharPata(ctx, PIVO_PATA_TRAS[0], PIVO_PATA_TRAS[1], patas.tf[0], patas.tf[1], largTras, 3.6, pal.corpo, pal, lw, esp.pe, coxa, canela, 'preenchimento');
    desenharPata(ctx, PIVO_PATA_FRENTE[0], PIVO_PATA_FRENTE[1], patas.df[0], patas.df[1], 5.5, 3.4, pal.corpo, pal, lw, esp.pe, coxa, canela, 'preenchimento');

    desenharAcessorio(ctx, idAcc, 'corpo', pal, lw, ondaCrina, tempo);    // marcas na anca (por cima da coxa)
    desenharAcessorio(ctx, idAcc, 'depois', pal, lw, ondaCrina, tempo);
    ctx.restore();
}

// Orelhas das espécies (coordenadas da cabeça; pivô em PIVO_ORELHA)
function desenharOrelhaEspecie(ctx, pal, lw, esp, angOrelha, onda, deTras) {
    ctx.save();
    ctx.translate(PIVO_ORELHA[0] + (deTras ? 5 : 0), PIVO_ORELHA[1] + (deTras ? 0.5 : 0));
    const corBase = deTras ? pal.fundo : pal.corpo, corSombra = deTras ? pal.fundo : pal.sombra;
    if (esp.orelha === 'folha') {
        ctx.rotate(angOrelha * Math.PI / 180);
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.6; ctx.stroke(FORMAS.orelha);
        preencherSombreado(ctx, FORMAS.orelha, corBase, corSombra);
        ctx.fillStyle = pal.orelhaDentro; ctx.fill(FORMAS.orelhaDentro);
    } else if (esp.orelha === 'gato') {
        ctx.rotate((angOrelha * 0.6 + (deTras ? 8 : 0)) * Math.PI / 180);
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.6; ctx.stroke(FORMAS.orelhaGato);
        preencherSombreado(ctx, FORMAS.orelhaGato, corBase, corSombra);
        ctx.fillStyle = pal.orelhaDentro; ctx.fill(FORMAS.orelhaGatoDentro);
    } else if (esp.orelha === 'coelho') {
        // orelhas compridas, para trás, balançando com a corrida
        ctx.rotate((-22 + angOrelha * 1.3 + (deTras ? 12 : 0)) * Math.PI / 180 + onda.A * 0.8 * Math.sin(onda.fase - (deTras ? 1 : 0)));
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.6; ctx.stroke(FORMAS.orelhaCoelho);
        preencherSombreado(ctx, FORMAS.orelhaCoelho, corBase, corSombra);
        ctx.fillStyle = pal.orelhaDentro; ctx.fill(FORMAS.orelhaCoelhoDentro);
    } else if (esp.orelha === 'barbatana') {
        ctx.rotate((angOrelha * 0.5 - 10) * Math.PI / 180);
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.4; ctx.stroke(FORMAS.barbatana);
        ctx.fillStyle = pal.crina[0]; ctx.fill(FORMAS.barbatana);
    }
    ctx.restore();
}

// Caudas das outras espécies
function desenharCaudaEspecie(ctx, p, pal, lw, onda, esp) {
    const s = Math.max(-1, Math.min(1, -p.vy / 8)) * p.mistura;
    if (esp.cauda === 'reptil') {
        // cauda grossa de dragão com ponta em espada (a ponta é desenhada antes, para a cauda "soldar" por cima)
        const a = (165 - 25 * s + 10 * Math.sin(onda.fase)) * Math.PI / 180;
        const dobra = 0.15 + 0.15 * Math.sin(onda.fase - 0.8);
        const L = 22, h = L / 2 * 0.85, a2 = a + dobra;
        const rx = RAIZ_CAUDA[0] + 2, ry = RAIZ_CAUDA[1] + 4;
        const mx = rx + Math.cos(a) * L / 2, my = ry + Math.sin(a) * L / 2;
        const px = mx + Math.cos(a2) * h, py = my + Math.sin(a2) * h;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a2);
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(3, -4.2); ctx.lineTo(8, 0); ctx.lineTo(3, 4.2); ctx.closePath();
        ctx.lineWidth = lw * 1.2; ctx.strokeStyle = pal.contorno; ctx.stroke();
        ctx.fillStyle = pal.crina[0]; ctx.fill();
        ctx.restore();
        desenharMecha(ctx, rx, ry, a, dobra, L, 12, pal.corpo, 'rgba(255,255,255,0.25)', pal.contorno, lw * 1.6);
    } else if (esp.cauda === 'gato') {
        // cauda fina, levantada, com a ponta enrolada
        const a = (205 + 15 * s + 8 * Math.sin(onda.fase)) * Math.PI / 180;
        desenharMecha(ctx, RAIZ_CAUDA[0] + 1, RAIZ_CAUDA[1] + 2, a, 0.7 + 0.2 * Math.sin(onda.fase - 1), 26, 6, pal.corpo, 'rgba(255,255,255,0.35)', pal.contorno, lw * 1.5);
    } else if (esp.cauda === 'pompom') {
        ctx.save();
        ctx.translate(RAIZ_CAUDA[0] - 1, RAIZ_CAUDA[1] + 3 + Math.sin(onda.fase * 2) * 0.8);
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.6; ctx.stroke(FORMAS.pompom);
        ctx.fillStyle = pal.claro; ctx.fill(FORMAS.pompom);
        ctx.restore();
    }
}

// Espinhos nas costas e no pescoço do dragão (desenhados antes do corpo: a base fica escondida)
function desenharEspinhos(ctx, pal, lw, angPescoco, kPesc) {
    const espinho = (x, y, ang, tam) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(-2.8, 1.5); ctx.lineTo(0, -tam); ctx.lineTo(2.8, 1.5); ctx.closePath();
        ctx.lineJoin = 'round'; ctx.lineWidth = lw * 1.4; ctx.strokeStyle = pal.contorno; ctx.stroke();
        ctx.fillStyle = pal.crina[1]; ctx.fill();
        ctx.restore();
    };
    for (const [x, t] of [[-15, 5], [-9, 6.5], [-3, 7], [3, 6]]) espinho(x, -14.2, -0.15, t);
    ctx.save();
    ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]); ctx.rotate(angPescoco); ctx.scale(1, kPesc);
    for (const [t, tam] of [[0.2, 5.5], [0.5, 6], [0.8, 5]]) {
        const cx = 3 + (-5.5 - 3) * t, cy = -15 + (-1 + 15) * t;
        espinho(cx, cy, -1.0, tam);
    }
    ctx.restore();
}

// Asa de morcego do dragão (membrana na cor da crina, "dedos" com contorno)
function desenharAsaMorcego(ctx, pal, lw, angulo, fundo) {
    ctx.save();
    ctx.rotate(angulo);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.6; ctx.stroke(FORMAS.asaMorcego);
    ctx.fillStyle = fundo ? pal.crinaFundo[0] : pal.crina[0]; ctx.fill(FORMAS.asaMorcego);
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-10, -12);
    ctx.moveTo(0, 0); ctx.lineTo(-19, -11);
    ctx.stroke();
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
// EFEITOS DO PERSONAGEM (B4): fita de arco-íris, estrelinhas da crina, brilho e asas
// Tudo pré-desenhado em canvas pequenos (sprites) — nada de shadowBlur.
// ─────────────────────────────────────────────────────────────────────────
const RASTRO_PONTOS = 12;             // tamanho da fita (pontos guardados, 1 por passo de física)
const RASTRO_LARGURA = 2.6;           // px por faixa de cor (4 faixas)
const MAX_ESTRELINHAS = 30;           // pool fixo das estrelinhas da crina
const VIDA_ESTRELINHA = 36;           // passos (~0,6 s)

const _cacheSprites = new Map();
function spriteCache(chave, tam, desenhar) {
    let c = _cacheSprites.get(chave);
    if (!c) {
        c = document.createElement('canvas');
        c.width = c.height = tam;
        desenhar(c.getContext('2d'), tam);
        _cacheSprites.set(chave, c);
    }
    return c;
}

// Estrela de 4 pontas com miolo branco
function spriteEstrelinha(cor) {
    return spriteCache('estrela|' + cor, 32, (g, t) => {
        const m = t / 2;
        const grad = g.createRadialGradient(m, m, 0, m, m, m);
        grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.35, cor); grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? m : m * 0.28, a = i * Math.PI / 4 - Math.PI / 2;
            g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
        }
        g.closePath(); g.fill();
    });
}

// Brilho suave atrás do personagem (cor da crina)
function spriteBrilho(cor) {
    return spriteCache('brilho|' + cor, 128, (g, t) => {
        const m = t / 2, c = paraRGBA(cor);
        const grad = g.createRadialGradient(m, m, 0, m, m, m);
        grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.28)`);
        grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
        g.fillStyle = grad; g.fillRect(0, 0, t, t);
    });
}

// Pontinho de luz (ponta do chifre, lente do Ciborgue)
function spriteLuz(cor) {
    return spriteCache('luz|' + cor, 32, (g, t) => {
        const m = t / 2, c = paraRGBA(cor);
        const grad = g.createRadialGradient(m, m, 0, m, m, m);
        grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.9)`);
        grad.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},0.35)`);
        grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
        g.fillStyle = grad; g.fillRect(0, 0, t, t);
    });
}

const _estrelinhas = Array.from({ length: MAX_ESTRELINHAS }, () => ({ ativa: false }));

// Converte um ponto local (u) do corpo para a tela (sem rotação — suficiente para efeitos)
// Converte um ponto local (u) do corpo para a tela, acompanhando o giro (mortal/inclinação) e o squash
function pontoLocalNaTela(p, ux, uy, escala) {
    const sx = (p.scaleX || 1) * escala * p.w / 50, sy = (p.scaleY || 1) * escala * p.h / 40;
    const lx = ux * sx, ly = uy * sy;
    const a = (p.rot || 0) + (p.spin || 0), c = Math.cos(a), s = Math.sin(a);
    return { x: p.x + p.w / 2 + lx * c - ly * s, y: p.y + p.h / 2 + lx * s + ly * c };
}

// Chamado 1 vez por passo de física pelo jogo
function atualizarEfeitosPersonagem(p, vel, dist) {
    // fita: guarda a raiz da cauda em coordenadas do MUNDO (não anda junto com a câmera)
    if (!p.rastro) p.rastro = [];
    const raiz = pontoLocalNaTela(p, RAIZ_CAUDA[0], RAIZ_CAUDA[1], 1.3);
    p.rastro.unshift({ x: raiz.x + dist, y: raiz.y });
    if (p.rastro.length > RASTRO_PONTOS) p.rastro.length = RASTRO_PONTOS;

    // estrelinhas nascendo na crina a cada 0,1–0,18 s
    p.tEstrelinha = (p.tEstrelinha || 0) - 1;
    if (p.tEstrelinha <= 0) {
        p.tEstrelinha = 6 + Math.random() * 5;
        const e = _estrelinhas.find(s => !s.ativa);
        if (e) {
            const pal = paletaDe(p.char);
            const pos = pontoLocalNaTela(p, 4 - Math.random() * 12, -20 + Math.random() * 10, 1.3);
            Object.assign(e, {
                ativa: true, x: pos.x, y: pos.y, xAnt: pos.x, yAnt: pos.y,
                vx: -(0.5 * vel + 0.35), vy: 0.25,
                vida: VIDA_ESTRELINHA, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
                cor: pal.crina[Math.floor(Math.random() * pal.crina.length)]
            });
        }
    }
    for (const e of _estrelinhas) {
        if (!e.ativa) continue;
        e.xAnt = e.x; e.yAnt = e.y;
        e.x += e.vx; e.y += e.vy; e.rot += e.vr;
        if (--e.vida <= 0) e.ativa = false;
    }
}

function limparEfeitosPersonagem(p) {
    p.rastro = [];
    for (const e of _estrelinhas) e.ativa = false;
}

// Desenhado ATRÁS do personagem: brilho, fita de arco-íris e estrelinhas
function desenharEfeitosPersonagem(ctx, p, dist, vel, tempo = 0) {
    const a = typeof alfaRender === 'number' ? alfaRender : 1;   // interpolação entre passos
    const pal = paletaDe(p.char);

    // brilho pulsando
    const centro = pontoLocalNaTela(p, 0, -6, 1.3);
    const tamBrilho = 110 * (p.w / 50) * (1 + 0.1 * Math.sin(tempo * 3.3));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(spriteBrilho(pal.crina[1]), centro.x - tamBrilho / 2, centro.y - tamBrilho / 2, tamBrilho, tamBrilho);
    ctx.restore();

    // rastro escolhido na loja (fita arco-íris, corações, estrelas, raio...)
    desenharRastro(ctx, p, dist, vel, pal, tempo);

    // estrelinhas da crina (encolhem e somem)
    ctx.save();
    for (const e of _estrelinhas) {
        if (!e.ativa) continue;
        const k = e.vida / VIDA_ESTRELINHA;
        const tam = 12 * k;
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.save();
        ctx.translate(e.xAnt + (e.x - e.xAnt) * a, e.yAnt + (e.y - e.yAnt) * a);
        ctx.rotate(e.rot);
        ctx.drawImage(spriteEstrelinha(e.cor), -tam / 2, -tam / 2, tam, tam);
        ctx.restore();
    }
    ctx.restore();
}

// Asa de penas (coordenadas da asa; pivô na cernelha). fundo = asa de trás, mais escura
// Pena comprida com ponta arredondada, apontando para +x (usada nas asas)
function caminhoPenaAsa(L, W) {
    const p = new Path2D();
    p.moveTo(0, -W * 0.35);
    p.quadraticCurveTo(L * 0.5, -W * 0.62, L - W * 0.5, -W * 0.48);
    p.arc(L - W * 0.5, 0, W * 0.5, -Math.PI / 2, Math.PI / 2);
    p.quadraticCurveTo(L * 0.5, W * 0.6, 0, W * 0.35);
    p.closePath();
    return p;
}
// Penas da asa: [direção em graus (0 = direita, 270 = para cima), comprimento, largura]
const PENAS_ASA = [[244, 23, 9], [228, 28, 9.5], [212, 31, 9.5], [196, 29, 9]];   // varridas para trás, sobrepostas
const _PENAS_ASA_PATH = PENAS_ASA.map(([, L, W]) => caminhoPenaAsa(L, W));
const COBERTURA_ASA = (() => {   // parte de cima da asa (o "braço"), cobre a raiz das penas
    const c = new Path2D();
    c.moveTo(3, 2);
    c.bezierCurveTo(5, -10, -3, -21, -12, -20);
    c.quadraticCurveTo(-15, -12, -11, -7);
    c.quadraticCurveTo(-6, -2, 3, 2);
    c.closePath();
    return c;
})();

// cor da crina clareada para as pontas das penas (em cache: não cria texto novo a cada quadro)
const _cacheClareada = new Map();
function corMisturada(cor) {
    let c = _cacheClareada.get(cor);
    if (!c) { c = paraHex(misturar(paraRGBA(cor), _BRANCO, 0.4)); _cacheClareada.set(cor, c); }
    return c;
}

function desenharAsa(ctx, pal, lw, angulo, fundo) {
    ctx.save();
    ctx.rotate(angulo);
    ctx.scale(1.15, 1.15);
    // as penas se abrem um pouco quando a asa sobe (leque)
    const abre = 1 + Math.max(0, -angulo) * 0.35;
    const raizX = -2, raizY = -6;
    const cont = pal.contorno, base = fundo ? pal.fundo : '#FFFFFF';
    // pontas com a cor da crina clareada (suave: a asa continua branca)
    const ponta = corMisturada(fundo ? pal.crinaFundo[0] : pal.crina[0]), ponta2 = corMisturada(fundo ? pal.crinaFundo[1] : pal.crina[2]);
    ctx.lineJoin = 'round';
    // 1) contorno único por trás de tudo (penas + cobertura)
    ctx.strokeStyle = cont; ctx.lineWidth = lw * 1.5 / 1.15;
    PENAS_ASA.forEach(([ang], i) => {
        ctx.save(); ctx.translate(raizX, raizY); ctx.rotate(((ang - 220) * abre + 220) * Math.PI / 180);
        ctx.stroke(_PENAS_ASA_PATH[i]); ctx.restore();
    });
    ctx.stroke(COBERTURA_ASA);
    // 2) penas, da de cima (atrás) para a de baixo (frente): branco + ponta colorida + sombra separando
    PENAS_ASA.forEach(([ang, L], i) => {
        ctx.save(); ctx.translate(raizX, raizY); ctx.rotate(((ang - 220) * abre + 220) * Math.PI / 180);
        const pena = _PENAS_ASA_PATH[i];
        ctx.fillStyle = base; ctx.fill(pena);
        ctx.save(); ctx.clip(pena);
        ctx.fillStyle = i % 2 ? ponta2 : ponta;
        ctx.beginPath(); ctx.ellipse(L, 0, L * 0.3, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(90,58,138,0.22)';   // sombra na borda de baixo: separa uma pena da outra
        ctx.fillRect(0, 1.2, L, 6);
        ctx.restore();
        ctx.restore();
    });
    // 3) cobertura por cima, com sombra suave e "escamas" de penas pequenas
    ctx.fillStyle = base; ctx.fill(COBERTURA_ASA);
    ctx.save(); ctx.clip(COBERTURA_ASA);
    ctx.fillStyle = 'rgba(90,58,138,0.18)';
    for (const [x, y] of [[-8, -9], [-3, -6], [-10, -15]]) { ctx.beginPath(); ctx.arc(x, y + 3, 3.4, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-3, -15, 3, 1.2, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
}

// O personagem novo vale para todos (unicórnios, dragão, gato e coelho)
function usaPersonagemNovo(p) {
    return USAR_PERSONAGEM_NOVO && p && p.char;
}

// ─────────────────────────────────────────────────────────────────────────
// VISUAL DA LOJA: pelagens, chifres, chapéus e rastros — tudo desenhado por código.
// O que está equipado vem em p.visual = { pelagem, rastro, chifre, chapeu } (a aura fica no game.js).
// ─────────────────────────────────────────────────────────────────────────
const visualDe = (p) => p.visual || {};

function caminhoCoracao(cx, cy, s) {
    const c = new Path2D();
    c.moveTo(cx, cy + s * 0.9);
    c.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.45);
    c.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9);
    c.closePath();
    return c;
}

// Sprites de 32 px para partículas de aura e rastros (em cache por forma e cor)
function spriteForma(forma, cor) {
    return spriteCache('forma|' + forma + '|' + cor, 32, (g, t) => {
        g.translate(t / 2, t / 2);
        g.lineJoin = 'round'; g.lineCap = 'round';
        const contorno = 'rgba(42,20,80,0.85)';
        const comContorno = (c, lw = 2.4) => { g.lineWidth = lw; g.strokeStyle = contorno; g.stroke(c); g.fillStyle = cor; g.fill(c); };
        if (forma === 'coracao') {
            comContorno(caminhoCoracao(0, 1, 9));
            g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-4, -3, 2.2, 1.5, -0.6, 0, Math.PI * 2); g.fill();
        } else if (forma === 'estrela') {
            comContorno(_estrela(0, 0, 12, 5));
            g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-2, -2, 2, 0, Math.PI * 2); g.fill();
        } else if (forma === 'nota') {
            const haste = new Path2D(); haste.moveTo(5, 6); haste.lineTo(5, -11); haste.lineTo(11, -7);
            g.strokeStyle = contorno; g.lineWidth = 5.5; g.stroke(haste);
            g.strokeStyle = cor; g.lineWidth = 2.6; g.stroke(haste);
            const cabeca = new Path2D(); cabeca.ellipse(1, 7, 5, 3.8, -0.4, 0, Math.PI * 2);
            comContorno(cabeca);
        } else if (forma === 'bolha') {
            g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
            g.strokeStyle = cor; g.lineWidth = 2; g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(-4, -5, 3, 2, -0.6, 0, Math.PI * 2); g.fill();
        } else if (forma === 'petala') {
            const c = new Path2D(); c.ellipse(0, 0, 6, 11, 0.5, 0, Math.PI * 2);
            comContorno(c, 2);
            g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(-3, 6); g.quadraticCurveTo(0, 0, 3, -6); g.stroke();
        } else if (forma === 'chama') {
            const c = new Path2D(); c.moveTo(0, 13); c.bezierCurveTo(-11, 6, -6, -4, 0, -14); c.bezierCurveTo(6, -4, 11, 6, 0, 13);
            g.fillStyle = cor; g.fill(c);
            const d = new Path2D(); d.moveTo(0, 11); d.bezierCurveTo(-5, 6, -3, 0, 0, -5); d.bezierCurveTo(3, 0, 5, 6, 0, 11);
            g.fillStyle = '#FFF3A0'; g.fill(d);
        } else if (forma === 'floco') {
            g.strokeStyle = cor; g.lineWidth = 2.2;
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3;
                g.beginPath();
                g.moveTo(0, 0); g.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
                g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); g.lineTo(Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 9);
                g.stroke();
            }
        } else if (forma === 'folha') {
            const c = new Path2D(); c.moveTo(-11, 0); c.quadraticCurveTo(0, -10, 11, 0); c.quadraticCurveTo(0, 10, -11, 0);
            comContorno(c, 2);
            g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke();
        } else if (forma === 'gota') {
            const c = new Path2D(); c.moveTo(0, -12); c.bezierCurveTo(4, -4, 9, 2, 0, 11); c.bezierCurveTo(-9, 2, -4, -4, 0, -12);
            comContorno(c, 2);
            g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-2.5, 3, 1.6, 2.6, 0.3, 0, Math.PI * 2); g.fill();
        }
    });
}

// ── Pelagens: padrão desenhado DENTRO da forma (recorte) no tronco, pescoço e cabeça ──
const CAIXA_TRONCO = [-24, -17, 22, 6], CAIXA_PESCOCO = [-8, -17, 10, 4], CAIXA_CABECA = [-8, -13, 21, 9];

function desenharPelagem(ctx, tipo, forma, caixa, tempo, semente = 1) {
    if (!tipo || tipo === 'nenhuma') return;
    const [x0, y0, x1, y1] = caixa;
    // aleatório fixo (a pelagem não "pula" de um quadro para o outro)
    const rnd = (i) => { const s = Math.sin(i * 127.1 + semente * 311.7) * 43758.5453; return s - Math.floor(s); };
    ctx.save();
    ctx.clip(forma);
    if (tipo === 'listras') {
        ctx.fillStyle = 'rgba(30,16,50,0.75)';
        for (let x = x0 - 4, i = 0; x < x1 + 6; x += 5.2, i++) {
            const w = 1.4 + rnd(i) * 1.2, ym = (y0 + y1) / 2, xb = x - 1 + rnd(i + 9) * 2;
            ctx.beginPath(); ctx.moveTo(x, y0 - 2); ctx.quadraticCurveTo(x + 3, ym, xb, y1 + 2);
            ctx.lineTo(xb + w, y1 + 2); ctx.quadraticCurveTo(x + 3 + w * 1.5, ym, x + w, y0 - 2); ctx.closePath(); ctx.fill();
        }
    } else if (tipo === 'bolinhas') {
        ctx.fillStyle = 'rgba(30,16,50,0.8)';
        let i = 0;
        for (let y = y0; y < y1; y += 5.5) for (let x = x0 + (i % 2) * 2.5; x < x1; x += 6, i++) {
            if (rnd(i) < 0.45) continue;
            ctx.beginPath(); ctx.arc(x + rnd(i + 3) * 2, y + rnd(i + 7) * 2, 1.2 + rnd(i + 11) * 1.3, 0, Math.PI * 2); ctx.fill();
        }
    } else if (tipo === 'oncinha') {
        let i = 0;
        for (let y = y0 + 2; y < y1; y += 6) for (let x = x0 + (i % 2) * 3; x < x1; x += 7, i++) {
            const cx = x + rnd(i) * 2, cy = y + rnd(i + 5) * 2;
            ctx.fillStyle = 'rgba(214,150,60,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(50,25,15,0.85)'; ctx.lineWidth = 0.9;
            ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0.3, 2.2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, 2.4, 3, 5.2); ctx.stroke();
        }
    } else if (tipo === 'estrelas' || tipo === 'coracoes') {
        let i = 0;
        // figuras grandes com contorno fino: aparecem até no retrato pequeno da loja
        ctx.lineWidth = 0.7; ctx.lineJoin = 'round';
        ctx.strokeStyle = tipo === 'estrelas' ? '#B5761A' : '#B0306E';
        for (let y = y0 + 1; y < y1; y += 7.5) for (let x = x0 + (i % 2) * 3.8; x < x1; x += 7.5, i++) {
            if (rnd(i) < 0.3) continue;
            ctx.fillStyle = tipo === 'estrelas' ? '#FFD65A' : '#FF5FA8';
            const fig = tipo === 'estrelas' ? _estrela(x, y, 2.7, 5) : caminhoCoracao(x, y, 2.2);
            ctx.fill(fig); ctx.stroke(fig);
        }
    } else if (tipo === 'galaxia') {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(40,20,110,0.92)'); g.addColorStop(0.5, 'rgba(110,40,160,0.9)'); g.addColorStop(1, 'rgba(20,40,120,0.92)');
        ctx.fillStyle = g; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
        ctx.fillStyle = 'rgba(255,150,220,0.28)';
        ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.3, (y1 - y0) * 0.25, -0.3, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 34; i++) {
            const a = 0.5 + 0.5 * Math.sin(tempo * 3 + i * 1.7);
            ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.55 * a})`;
            const t = i % 5 === 0 ? 1.6 : 1.1;   // algumas estrelas maiores: aparecem no retrato da loja
            ctx.fillRect(x0 + rnd(i) * (x1 - x0), y0 + rnd(i + 40) * (y1 - y0), t, t);
        }
        // 3 estrelinhas de 4 pontas
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 3; i++) {
            const cx = x0 + (0.2 + 0.3 * i) * (x1 - x0), cy = y0 + rnd(i + 90) * (y1 - y0), r = 2.4;
            ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + 0.6, cy - 0.6); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + 0.6, cy + 0.6);
            ctx.lineTo(cx, cy + r); ctx.lineTo(cx - 0.6, cy + 0.6); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - 0.6, cy - 0.6); ctx.closePath(); ctx.fill();
        }
    } else if (tipo === 'arcoiris') {
        const cores = ['#FF5F7E', '#FFB347', '#FFE66D', '#7DDE92', '#6FC3FF', '#B387FF'];
        ctx.globalAlpha *= 0.55;
        const larg = 3.2;
        for (let i = -12; i < 30; i++) {
            ctx.fillStyle = cores[((i % 6) + 6) % 6];
            const x = x0 + i * larg;
            ctx.beginPath(); ctx.moveTo(x, y1 + 2); ctx.lineTo(x + larg, y1 + 2); ctx.lineTo(x + larg + 14, y0 - 2); ctx.lineTo(x + 14, y0 - 2); ctx.closePath(); ctx.fill();
        }
    } else if (tipo === 'cromado') {
        // metal prateado de verdade: degradê claro→azul-acinzentado + 2 reflexos diagonais fixos
        const m = ctx.createLinearGradient(0, y0, 0, y1);
        m.addColorStop(0, 'rgba(245,248,255,0.92)'); m.addColorStop(0.45, 'rgba(176,188,214,0.92)'); m.addColorStop(1, 'rgba(110,122,160,0.92)');
        ctx.fillStyle = m; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (const [f, l] of [[0.25, 3.5], [0.38, 1.6]]) {
            const x = x0 + f * (x1 - x0);
            ctx.beginPath(); ctx.moveTo(x, y0 - 2); ctx.lineTo(x + l, y0 - 2); ctx.lineTo(x + l - 8, y1 + 2); ctx.lineTo(x - 8, y1 + 2); ctx.closePath(); ctx.fill();
        }
        const varre = ((tempo * 0.6) % 1.6 - 0.3) * (x1 - x0) + x0;   // faixa de brilho passando
        const g = ctx.createLinearGradient(varre - 6, 0, varre + 6, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(varre - 6, y0 - 2, 12, y1 - y0 + 4);
    }
    ctx.restore();
}

// ── Chifres: material (cores) + detalhe especial ──
const MATERIAIS_CHIFRE = {
    cristal: { base: '#EBDDFF', sombra: '#B79BEF', brilho: '#FFFFFF', contorno: '#4A2A8A', luz: '#D9C2FF', faceta: true },   // lilás translúcido (o gelo é azul)
    arcoiris: { base: '#FFFFFF', sombra: '#E6E0F5', brilho: '#FFFFFF', contorno: '#6B3FA0', luz: '#FF9CCB',
        faixas: ['#FF5F7E', '#FFB347', '#FFE66D', '#7DDE92', '#6FC3FF', '#B387FF'] },
    gelo: { base: '#E6F7FF', sombra: '#A9D8F5', brilho: '#FFFFFF', contorno: '#3A6EA5', luz: '#BFEFFF' },
    chocolate: { base: '#8B5A2B', sombra: '#5E3A1A', brilho: '#C9925A', contorno: '#3B220E', luz: '#FFB347', granulado: true, espiralGrossa: true },
    estelar: { base: '#2A1E66', sombra: '#160F40', brilho: '#B9A4FF', contorno: '#B9A4FF', luz: '#B9A4FF', estrelas: true, estrelaPonta: true },
    rosa: { base: '#FFD1E8', sombra: '#F49AC1', brilho: '#FFFFFF', contorno: '#9A3F6E', luz: '#FF9CCB' },
    neon: { base: '#FF4FD8', sombra: '#B0109A', brilho: '#FFFFFF', contorno: '#4A0A45', luz: '#FF4FD8', halo: true }
};
function materialChifre(tipo, pal) {
    return MATERIAIS_CHIFRE[tipo] || pal.chifre;
}

// ── Chapéus (coordenadas da cabeça; desenhados antes do chifre, que "atravessa") ──
function desenharChapeu(ctx, tipo, pal, lw, onda, tempo) {
    if (!tipo || tipo === 'nenhum') return;
    const cont = pal.contorno;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (tipo === 'festa') {
        ctx.translate(-0.5, -11); ctx.rotate(-0.45);
        const cone = new Path2D(); cone.moveTo(-4.8, 0); cone.lineTo(0, -14); cone.lineTo(4.8, 0); cone.quadraticCurveTo(0, 1.6, -4.8, 0); cone.closePath();
        _contornar(ctx, cone, '#FF5FA8', cont, lw * 1.1);
        ctx.save(); ctx.clip(cone); ctx.strokeStyle = '#FFE08A'; ctx.lineWidth = 1.6;
        for (let y = -12; y < 2; y += 4) { ctx.beginPath(); ctx.moveTo(-6, y + 3); ctx.lineTo(6, y - 2); ctx.stroke(); }
        ctx.restore();
        const pompom = new Path2D(); pompom.arc(0, -14.5, 2.3, 0, Math.PI * 2);
        _contornar(ctx, pompom, '#9BE7FF', cont, lw * 0.8);
    } else if (tipo === 'flores') {
        const cores = ['#FF9CCB', '#FFE08A', '#9BE7FF', '#C7A8F0', '#FF9CCB'];
        [[-5, -7], [-2, -10.5], [2, -12], [6, -11.6], [9.6, -9]].forEach(([x, y], i) => {
            ctx.fillStyle = '#4CD07D';
            ctx.beginPath(); ctx.ellipse(x + 1.6, y + 1, 1.4, 0.8, 0.6, 0, Math.PI * 2); ctx.fill();
            for (let k = 0; k < 5; k++) {
                const a = k * Math.PI * 2 / 5 + i;
                const p = new Path2D(); p.arc(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, 1.3, 0, Math.PI * 2);
                _contornar(ctx, p, cores[i], cont, lw * 0.35);
            }
            ctx.fillStyle = '#FFD54A'; ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill();
        });
    } else if (tipo === 'gorro') {
        const balanco = Math.sin(onda.fase) * 1.2;
        const corpo = new Path2D(); corpo.moveTo(-6, -10.5); corpo.quadraticCurveTo(-1, -26, -12 + balanco, -22); corpo.quadraticCurveTo(4, -21, 10, -12.5); corpo.closePath();
        _contornar(ctx, corpo, '#E53935', cont, lw * 1.1);
        ctx.save(); ctx.translate(2, -11.4); ctx.rotate(-0.22);
        const faixa = new Path2D(); faixa.roundRect(-9, -2, 18, 4, 2);
        _contornar(ctx, faixa, '#FFFFFF', cont, lw * 0.9);
        ctx.restore();
        const pompom = new Path2D(); pompom.arc(-12 + balanco, -22, 2.6, 0, Math.PI * 2);
        _contornar(ctx, pompom, '#FFFFFF', cont, lw * 0.8);
    } else if (tipo === 'cartola') {
        ctx.translate(2, -12.6); ctx.rotate(-0.18);
        const aba = new Path2D(); aba.ellipse(0, 0, 8.5, 1.8, 0, 0, Math.PI * 2);
        const copa = new Path2D(); copa.roundRect(-5, -11, 10, 11, 1.5);
        _contornar(ctx, copa, '#2A1E36', '#B9A4FF', lw * 0.7);
        ctx.fillStyle = '#9C6BFF'; ctx.fillRect(-5, -3.2, 10, 2.4);
        _contornar(ctx, aba, '#2A1E36', '#B9A4FF', lw * 0.7);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-3.8, -10, 1.4, 6);
    } else if (tipo === 'fones') {
        const arco = new Path2D(); arco.moveTo(-2.5, -3.5); arco.quadraticCurveTo(-3.5, -14.5, 6, -14);
        ctx.strokeStyle = cont; ctx.lineWidth = 3.6; ctx.stroke(arco);
        ctx.strokeStyle = '#B9A4FF'; ctx.lineWidth = 2; ctx.stroke(arco);
        const concha = new Path2D(); concha.ellipse(-2.5, 0, 3.4, 4.4, 0, 0, Math.PI * 2);
        _contornar(ctx, concha, '#3A2A5A', cont, lw * 0.8);
        ctx.fillStyle = '#FF9CCB'; ctx.beginPath(); ctx.ellipse(-2.5, 0, 1.8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    } else if (tipo === 'oculosCoracao') {
        ctx.strokeStyle = cont; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(1.2, -3.6); ctx.lineTo(-6, -4.6); ctx.stroke();
        const lente = caminhoCoracao(5.6, -2.6, 4.2);
        _contornar(ctx, lente, 'rgba(255,60,140,0.88)', cont, lw * 0.7);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(3.2, -4.8); ctx.lineTo(4.6, -5.6); ctx.stroke();
    } else if (tipo === 'laco') {
        ctx.translate(-2.5, -11.5); ctx.rotate(-0.3); ctx.scale(1.9, 1.9);
        for (const s of [-1, 1]) {
            const c = new Path2D(); c.moveTo(0, 0); c.quadraticCurveTo(2.5 * s, -3.5, 4.6 * s, -2.4); c.lineTo(4.6 * s, 2.4); c.quadraticCurveTo(2.5 * s, 3.5, 0, 0); c.closePath();
            _contornar(ctx, c, '#FF5FA8', cont, lw * 0.5);
        }
        const n = new Path2D(); n.arc(0, 0, 1.3, 0, Math.PI * 2);
        _contornar(ctx, n, '#FF9CCB', cont, lw * 0.5);
    } else if (tipo === 'orelhasGato') {
        const arco = new Path2D(); arco.moveTo(-5.5, -5); arco.quadraticCurveTo(3, -15.5, 11.5, -8);
        ctx.strokeStyle = '#2A1E36'; ctx.lineWidth = 2.2; ctx.stroke(arco);
        for (const [x, y, r] of [[-1.5, -12, -0.3], [6, -13.4, 0.25]]) {
            ctx.save(); ctx.translate(x, y); ctx.rotate(r);
            const o = new Path2D(); o.moveTo(-3, 1); o.lineTo(0, -5.5); o.lineTo(3, 1); o.closePath();
            _contornar(ctx, o, '#2A1E36', '#B9A4FF', lw * 0.6);
            ctx.fillStyle = '#FF9CCB'; ctx.beginPath(); ctx.moveTo(-1.4, 0.4); ctx.lineTo(0, -3.4); ctx.lineTo(1.4, 0.4); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
    ctx.restore();
}

// ── Rastros: fita arco-íris (padrão) ou figuras que ficam para trás ──
const RASTRO_FIGURAS = {
    coracoes: { forma: 'coracao', cores: ['#FF5FA8', '#FF9CCB', '#E53970'] },
    estrelas: { forma: 'estrela', cores: ['#FFE08A', '#FFC24A', '#FFFFFF'] },
    notas: { forma: 'nota', cores: ['#B9A4FF', '#9BE7FF', '#FF9CCB'] },
    bolhas: { forma: 'bolha', cores: ['#9BE7FF', '#CFF4FF'] },
    petalas: { forma: 'petala', cores: ['#FF9CCB', '#FFD1E8', '#FFB3D1'] },
    chamas: { forma: 'chama', cores: ['#FF7A1A', '#FF4500', '#FFB347'] }
};
function desenharRastro(ctx, p, dist, vel, pal, tempo) {
    const tipo = visualDe(p).rastro || 'arcoiris';
    const r = p.rastro;
    const alvoFita = (vel > 4 || !p.onGround) ? 1 : 0;
    p.alfaFita = (p.alfaFita || 0) + (alvoFita - (p.alfaFita || 0)) * 0.12;
    if (tipo === 'nenhum' || !r || r.length <= 2 || p.alfaFita <= 0.02) return;
    const raiz = pontoLocalNaTela(p, RAIZ_CAUDA[0], RAIZ_CAUDA[1], 1.3);
    const pts = [{ x: raiz.x, y: raiz.y }];
    for (let i = 1; i < r.length; i++) pts.push({ x: r[i].x - dist, y: r[i].y });
    const n = pts.length, ponta = pts[n - 1];
    const escala = (p.w / 50) * (p.escalaRastro || 1);   // escalaRastro: prévia maior na loja
    ctx.save();
    ctx.globalAlpha *= p.alfaFita;
    if (tipo === 'arcoiris') {
        // 4 faixas (cores da crina), cada uma num caminho só, afinando até a ponta
        for (let b = 0; b < 4; b++) {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const k = 1 - i / (n - 1), larg = RASTRO_LARGURA * (0.4 + 0.6 * k) * escala;
                ctx.lineTo(pts[i].x, pts[i].y + (b - 2) * larg);
            }
            for (let i = n - 1; i >= 0; i--) {
                const k = 1 - i / (n - 1), larg = RASTRO_LARGURA * (0.4 + 0.6 * k) * escala;
                ctx.lineTo(pts[i].x, pts[i].y + (b - 1) * larg + 0.5);
            }
            ctx.closePath();
            const c = paraRGBA(pal.crina[b]);
            const grad = ctx.createLinearGradient(raiz.x, raiz.y, ponta.x, ponta.y);
            grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.85)`);
            grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    } else if (tipo === 'raio') {
        // raio em zigue-zague, brilhando
        ctx.globalCompositeOperation = 'lighter';
        for (const [larg, cor] of [[5 * escala, 'rgba(110,200,255,0.45)'], [1.8 * escala, 'rgba(240,250,255,0.95)']]) {
            ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.lineJoin = 'miter';
            ctx.beginPath();
            pts.forEach((q, i) => ctx.lineTo(q.x, q.y + (i % 2 ? 4 : -4) * escala * (1 - i / n)));
            ctx.stroke();
        }
    } else {
        // figuras (corações, estrelas, notas...) deixadas para trás, encolhendo e sumindo
        const fig = RASTRO_FIGURAS[tipo] || RASTRO_FIGURAS.estrelas;
        for (let i = 1; i < n; i += 2) {
            // na prévia da loja (escalaRastro) as figuras não somem: todas ficam visíveis
            const k = p.escalaRastro ? Math.max(0.6, 1 - i / (n - 1)) : 1 - i / (n - 1);
            const tam = (8 + 10 * k) * escala;
            ctx.globalAlpha = p.alfaFita * Math.min(1, k * 1.3);
            const y = pts[i].y + Math.sin(tempo * 6 + i) * 3 * escala;
            ctx.save();
            ctx.translate(pts[i].x, y); ctx.rotate(Math.sin(tempo * 3 + i) * 0.4);
            ctx.drawImage(spriteForma(fig.forma, fig.cores[(i >> 1) % fig.cores.length]), -tam / 2, -tam / 2, tam, tam);
            ctx.restore();
        }
    }
    ctx.restore();
}
