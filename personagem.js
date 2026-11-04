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
    chifre: { base: '#FFC94A', sombra: '#E0962B', brilho: '#FFF4C2', contorno: '#9A5A12' },
    casco: { base: '#8A4F7D', sombra: '#5E3158', brilho: '#C08AB4' },
    focinho: '#FFD9EA', narina: '#C77AA0', orelhaDentro: '#FFB3D1', bochecha: 'rgba(255,143,184,0.55)',
    iris: ['#4FB6FF', '#1D5FC9'], olhoCiborgue: false
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
    const p = {
        alfa: b.a,                                         // Fantasma é translúcido
        corpo: paraHex(b), claro: paraHex(misturar(b, _BRANCO, 0.35)),
        sombra: paraHex(misturar(b, _ROXO_SOMBRA, 0.30)),  // sombra puxada para o roxo, não só mais escura
        fundo: paraHex(misturar(b, _ROXO_SOMBRA, 0.45)),
        contorno: escuro ? paraHex(misturar(m0, _BRANCO, 0.40))   // corpo escuro: contorno CLARO
            : paraHex(misturar(b, _ROXO_CONT, 0.78)),
        crina: crina.map(paraHex),
        crinaFundo: [paraHex(misturar(crina[0], _ROXO_SOMBRA, 0.35)), paraHex(misturar(crina[2], _ROXO_SOMBRA, 0.35))],
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
    if (c.id === 20) p.chifre = CHIFRE_OSSO;
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

    // Cabeça (coordenadas da cabeça; pivô na nuca) — crânio + focinho numa silhueta só
    const cabeca = new Path2D();
    cabeca.arc(3, -3, 8.5, 0, Math.PI * 2);
    cabeca.ellipse(11, 1, 7, 5.5, 0.25, 0, Math.PI * 2);

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

const PIVO_PESCOCO = [12, -11];
const NUCA_NO_PESCOCO = [3, -14];
const INCLINACAO_PESCOCO = 24;        // graus para a frente (pescoço arqueado, não vertical)
const INCLINACAO_CABECA = 8;          // graus: focinho levemente para baixo
const ESCALA_CABECA = 1.15;           // cabeça um pouco maior (estilo fofo)
const PIVO_ORELHA = [-1, -10];
const PIVO_PATA_TRAS = [-12, -4];
const PIVO_PATA_FRENTE = [11, -4];
const RAIZ_CAUDA = [-18, -11];
const PIVO_ASA = [6, -14];            // cernelha

// ─── Espécies: o mesmo rig (corpo, patas, galope, poses) com cabeça, orelhas, cauda e pés próprios ───
const ESPECIES = {
    unicornio: { cabeca: 'cabeca', focinho: 'focinho', escalaCabeca: 1.15, pescoco: 1, orelha: 'folha', chifre: 'unicornio', crina: true, topete: true, cauda: 'mechas', pe: 'casco', bigodes: false, nariz: 'narina', boca: 'cavalo', asas: 'penas' },
    dragao: { cabeca: 'cabecaDragao', focinho: 'focinhoDragao', escalaCabeca: 1.1, pescoco: 1.05, orelha: 'barbatana', chifre: 'dragao', crina: false, espinhos: true, cauda: 'reptil', pe: 'garra', bigodes: false, nariz: 'dragao', boca: 'dragao', asas: 'morcego' },
    gato: { cabeca: 'cabecaGato', focinho: 'focinhoGato', escalaCabeca: 1.25, pescoco: 0.72, orelha: 'gato', chifre: null, crina: false, cauda: 'gato', pe: 'pata', bigodes: true, nariz: 'gato', boca: 'gato', asas: 'penas' },
    coelho: { cabeca: 'cabecaCoelho', focinho: 'focinhoGato', escalaCabeca: 1.25, pescoco: 0.72, orelha: 'coelho', chifre: null, crina: false, cauda: 'pompom', pe: 'pata', bigodes: true, nariz: 'coelho', boca: 'coelho', asas: 'penas' }
};
function especieDe(c) {
    return c.id === 20 ? ESPECIES.dragao : c.id === 21 ? ESPECIES.gato : c.id === 22 ? ESPECIES.coelho : ESPECIES.unicornio;
}
const CHIFRE_OSSO = { base: '#F5E6C8', sombra: '#C9B48A', brilho: '#FFFFFF', contorno: '#5A3A1A' };

// Formas extras das outras espécies (coordenadas da cabeça)
(() => {
    const novo = (f) => { const p = new Path2D(); f(p); return p; };
    FORMAS.cabecaDragao = novo(p => { p.arc(2, -3, 8, 0, Math.PI * 2); p.ellipse(12, 0.5, 9.5, 5, 0.12, 0, Math.PI * 2); });
    FORMAS.focinhoDragao = novo(p => p.ellipse(13.5, 1.8, 7, 3.4, 0.12, 0, Math.PI * 2));
    FORMAS.cabecaGato = novo(p => { p.arc(3, -3, 9.5, 0, Math.PI * 2); p.ellipse(10, 2, 5.2, 4.2, 0.15, 0, Math.PI * 2); });
    FORMAS.cabecaCoelho = novo(p => { p.arc(3, -3, 9, 0, Math.PI * 2); p.ellipse(10, 2, 5.4, 4.4, 0.15, 0, Math.PI * 2); });
    FORMAS.focinhoGato = novo(p => p.ellipse(10.8, 2.8, 4.2, 3.2, 0.15, 0, Math.PI * 2));
    FORMAS.orelhaGato = novo(p => { p.moveTo(-4, 0); p.lineTo(-3, -10); p.lineTo(4, -1); p.closePath(); });
    FORMAS.orelhaGatoDentro = novo(p => { p.moveTo(-2.6, -1); p.lineTo(-2.3, -7); p.lineTo(2, -1.4); p.closePath(); });
    FORMAS.orelhaCoelho = novo(p => p.ellipse(0, -10, 3.4, 11, 0, 0, Math.PI * 2));
    FORMAS.orelhaCoelhoDentro = novo(p => p.ellipse(0.3, -10, 1.6, 8, 0, 0, Math.PI * 2));
    FORMAS.barbatana = novo(p => { p.moveTo(-3, 0); p.lineTo(-7, -8); p.lineTo(-3.5, -6); p.lineTo(-4.5, -12); p.lineTo(0.5, -5); p.lineTo(3, 0); p.closePath(); });
    FORMAS.chifreDragao = novo(p => { p.moveTo(-1.5, -8.5); p.quadraticCurveTo(-4, -14, -9.5, -17.5); p.quadraticCurveTo(-4, -12.5, 1.8, -9.6); p.closePath(); });
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

// Pata em 2 segmentos (cápsulas) + casco. Ângulos em graus a partir da vertical; positivo = casco para trás.
function desenharPata(ctx, px, py, a1, a2, larg1, larg2, cor, pal, lw, pe = 'casco') {
    const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180;
    const kx = px - Math.sin(r1) * 9, ky = py + Math.cos(r1) * 9;          // joelho / jarrete
    const tx = kx - Math.sin(r2) * 7.5, ty = ky + Math.cos(r2) * 7.5;      // fim da canela
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // contorno por trás
    ctx.strokeStyle = pal.contorno;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(kx, ky);
    ctx.lineWidth = larg1 + lw * 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
    ctx.lineWidth = larg2 + lw * 2; ctx.stroke();
    // preenchimento
    ctx.strokeStyle = cor;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(kx, ky);
    ctx.lineWidth = larg1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
    ctx.lineWidth = larg2; ctx.stroke();
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(r2);
    if (pe !== 'casco') {
        // pata almofadada (gato, coelho) ou com garras (dragão)
        ctx.beginPath(); ctx.ellipse(0.6, 0.5, 3.2, 2.4, 0, 0, Math.PI * 2);   // base em ~2,9u, igual ao casco
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
    // casco (trapézio alinhado com a canela)
    ctx.beginPath();
    ctx.moveTo(-1.8, -0.4); ctx.lineTo(1.8, -0.4); ctx.lineTo(2.5, 2.8); ctx.lineTo(-2.5, 2.8);
    ctx.closePath();
    ctx.lineWidth = lw * 0.9; ctx.strokeStyle = pal.contorno; ctx.stroke();
    ctx.fillStyle = pal.casco.base; ctx.fill();
    ctx.fillStyle = pal.casco.brilho; ctx.fillRect(-1.6, 0.2, 1.1, 1.6);
    ctx.restore();
}

function desenharOlho(ctx, p, pal, lw, dano) {
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
    // Piscar animado: a pálpebra desce e sobe (p.piscar vai de 0 a -8 passos)
    const fecha = p.piscar < 0 && p.piscar >= -8 ? 1 - Math.abs(p.piscar + 4) / 4 : 0;
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
function desenharRostoEspecie(ctx, p, pal, lw, esp) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (esp.nariz === 'narina') {
        ctx.fillStyle = pal.narina;
        ctx.beginPath(); ctx.ellipse(16, 0, 1.2, 0.8, 0.3, 0, Math.PI * 2); ctx.fill();
        desenharBoca(ctx, p, pal, lw);
        return;
    }
    if (esp.nariz === 'dragao') {
        ctx.fillStyle = pal.narina;
        ctx.beginPath(); ctx.ellipse(19.6, -0.6, 1.1, 0.7, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.55;
        if (p.assustado) {
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
    if (p.assustado) {
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

function desenharBoca(ctx, p, pal, lw) {
    ctx.strokeStyle = pal.contorno; ctx.lineCap = 'round'; ctx.lineWidth = lw * 0.55;
    if (p.assustado) {
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
    correndo: [166, 175, 184, 192, 200],
    subindo: [176, 180, 184, 188, 192],    // colada para trás pelo vento
    caindo: [222, 230, 238, 246, 254]      // sobe com a queda
};
const CAUDA_BASE = {
    correndo: [148, 158, 168, 178, 190],
    subindo: [158, 163, 168, 173, 178],
    caindo: [205, 212, 220, 228, 236]
};
const CRINA_L = [13, 16, 17, 14, 10], CRINA_W = [6, 6.5, 6, 5.5, 5], CRINA_COR = [0, 1, 2, 3, 1];
const CAUDA_L = [16, 21, 24, 21, 15], CAUDA_COR = [1, 0, 2, 3, 2];

// Mistura os ângulos dos 3 estados conforme o quanto está no ar (mistura) e a velocidade vertical
function angulosEstado(tabela, p, i) {
    const s = Math.max(-1, Math.min(1, -p.vy / 8));          // +1 subindo forte, -1 caindo forte
    const ar = s >= 0 ? tabela.correndo[i] + (tabela.subindo[i] - tabela.correndo[i]) * s
        : tabela.correndo[i] + (tabela.caindo[i] - tabela.correndo[i]) * -s;
    return tabela.correndo[i] + (ar - tabela.correndo[i]) * p.mistura;
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

function desenharCrina(ctx, p, pal, lw, onda, angPescoco, fundo) {
    if (fundo) {
        // 2 mechas escuras atrás do pescoço: dão volume à crina
        for (let i = 0; i < 2; i++) {
            const t = 0.25 + i * 0.4;
            const rx = 3 + (-5 - 3) * t, ry = -14.5 + (-2 + 14.5) * t;
            const a = (angulosEstado(CRINA_BASE, p, i + 1) - 8) * Math.PI / 180 - angPescoco
                + onda.A * Math.sin(onda.fase - 0.6 * i - 0.3);
            desenharMecha(ctx, rx, ry, a, 0.3 + onda.B * 0.5 * Math.sin(onda.fase - 0.6 * i - 1.1), 16, 7,
                pal.crinaFundo[i], 'rgba(255,255,255,0.2)', pal.contornoCrina, lw * 0.75);
        }
        return;
    }
    // 5 mechas ao longo da crista do pescoço (de trás para a frente)
    for (let i = 4; i >= 0; i--) {
        const t = i / 4;
        const rx = 3 + (-5 - 3) * t, ry = -14.5 + (-2 + 14.5) * t;
        // ângulo em relação ao corpo (desconta a inclinação do pescoço)
        const a = angulosEstado(CRINA_BASE, p, i) * Math.PI / 180 - angPescoco
            + onda.A * Math.sin(onda.fase - 0.6 * i);
        const dobra = 0.2 + onda.B * Math.sin(onda.fase - 0.6 * i - 0.8);
        desenharMecha(ctx, rx, ry, a, dobra, CRINA_L[i], CRINA_W[i],
            pal.crina[CRINA_COR[i]], 'rgba(255,255,255,0.45)', pal.contornoCrina, lw * 0.75);
    }
}

function desenharCauda(ctx, p, pal, lw, onda) {
    for (let i = 0; i < 5; i++) {
        const a = angulosEstado(CAUDA_BASE, p, i) * Math.PI / 180 + onda.A * 1.2 * Math.sin(onda.fase - 0.5 * i - 1.4);
        // dobra positiva = cachinho para baixo; aumenta com a onda
        const dobra = 0.4 + onda.B * 0.8 * Math.sin(onda.fase - 0.5 * i - 2.2);
        desenharMecha(ctx, RAIZ_CAUDA[0], RAIZ_CAUDA[1], a, dobra, CAUDA_L[i], 7.5,
            pal.crina[CAUDA_COR[i]], 'rgba(255,255,255,0.45)', pal.contornoCrina, lw * 0.75);
    }
}

// ─── Galope de 4 tempos (B3) ───
const FATOR_FASE_GALOPE = 0.067;      // runPhase → fase do galope (0..1); ~0,45 s por ciclo na velocidade 5
const CHAO = 15.4;                    // linha dos cascos em unidades locais ((h/2)/1,3)
// Defasagem de cada pata no ciclo (galope transverso): traseira fundo, traseira frente, dianteira fundo, dianteira frente
const OFFSET_GALOPE = { tb: 0.00, tf: 0.12, db: 0.30, df: 0.42 };
// Keyframes [u, coxa, canela] — ângulos absolutos a partir da vertical (positivo = casco para trás)
// u 0–0,4: apoio no chão (casco plantado) · 0,4–1: pata no ar
const KF_DIANTEIRA = [[0, -25, -20], [0.2, 0, 0], [0.4, 30, 20], [0.6, 10, 95], [0.8, -35, 30], [1, -25, -20]];
const KF_TRASEIRA = [[0, -20, -10], [0.2, 5, -5], [0.4, 40, 25], [0.6, -15, 50], [0.8, -35, 5], [1, -20, -10]];

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

// Pose de cada pata no ar (subindo / ápice / caindo / voo / dash / slam / mortal)
function poseArPata(p, dianteira, tempo) {
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

// Ângulos finais das 4 patas: galope no chão misturado com a pose aérea
function calcularPatas(p, tempo, kPouso) {
    const fase = ((p.runPhase * FATOR_FASE_GALOPE) % 1 + 1) % 1;
    const res = {};
    for (const [nome, off] of Object.entries(OFFSET_GALOPE)) {
        const dianteira = nome[0] === 'd';
        const u = (fase - off + 1) % 1;
        let chao = amostrarKF(dianteira ? KF_DIANTEIRA : KF_TRASEIRA, u);
        // pouso: joelhos dobram (recuperação)
        if (kPouso > 0) chao = [chao[0] + (dianteira ? -6 : 8) * kPouso, chao[1] + (dianteira ? 18 : -14) * kPouso];
        let ar = poseArPata(p, dianteira, tempo);
        if (nome[1] === 'b') ar = [ar[0] + 6, ar[1] + 6];   // pata do fundo levemente defasada
        res[nome] = _lerp2(chao, ar, p.mistura);
    }
    res.fase = fase;
    return res;
}

// Altura do casco (em u) para uma pata com pivô em pivoY
function alturaCasco(pivoY, ang) {
    const r1 = ang[0] * Math.PI / 180, r2 = ang[1] * Math.PI / 180;
    return pivoY + Math.cos(r1) * 9 + Math.cos(r2) * 10.3;
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
    const tam = 220 * Math.max(p.w / 50, p.h / 40);        // área lógica ao redor do personagem
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
    const kPouso = p.pouso ? (1 - p.pouso.t / 10) * Math.min(1, p.pouso.forca / 12) * (1 - p.mistura) : 0;
    const patas = calcularPatas(p, tempo, kPouso);
    const naCorrida = 1 - p.mistura;

    // Cascos plantados: desloca o corpo para que o casco mais baixo fique exatamente na linha do chão
    const maisBaixo = Math.max(
        alturaCasco(PIVO_PATA_TRAS[1], patas.tb), alturaCasco(PIVO_PATA_TRAS[1], patas.tf),
        alturaCasco(PIVO_PATA_FRENTE[1], patas.db), alturaCasco(PIVO_PATA_FRENTE[1], patas.df));
    const ajusteChao = (CHAO - maisBaixo) * naCorrida;
    const inclinacao = 3.5 * Math.sin(2 * Math.PI * (patas.fase - 0.2)) * naCorrida;   // graus

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
        + 10 * kPouso;
    const angPescoco = angPescocoGraus * Math.PI / 180;
    const angOrelha = -6 + 8 * Math.sin(2 * Math.PI * patas.fase) * naCorrida
        + (sVy > 0 ? 25 * sVy : 5 * sVy) + (dano.t < 0.6 ? 30 : 0);
    const kPesc = esp.pescoco;   // gato e coelho têm pescoço mais curto

    const vel = typeof gameSpeed === 'number' ? gameSpeed : 5;
    const ondaCrina = atualizarOnda(p, tempo, vel);

    // ── 1. Patas do fundo ──
    const largTras = esp.cauda === 'pompom' ? 8.5 : 7;   // coelho: coxas traseiras fortes
    desenharPata(ctx, PIVO_PATA_TRAS[0] + 2.5, PIVO_PATA_TRAS[1], patas.tb[0], patas.tb[1], largTras, 3.6, pal.fundo, pal, lw, esp.pe);
    desenharPata(ctx, PIVO_PATA_FRENTE[0] + 2.5, PIVO_PATA_FRENTE[1], patas.db[0], patas.db[1], 5.5, 3.4, pal.fundo, pal, lw, esp.pe);

    // asa de trás: penas só no voo; o dragão sempre tem asas de morcego (batem mais forte no voo)
    const voando = typeof isFlying !== 'undefined' && isFlying;
    const bateAsa = 25 * Math.sin(tempo * 2 * Math.PI * 2.2) * Math.PI / 180;
    const bateMorcego = (voando ? 25 * Math.sin(tempo * 2 * Math.PI * 2.2) : 6 * Math.sin(tempo * 2 * Math.PI)) * Math.PI / 180;
    if (esp.asas === 'morcego') {
        ctx.save(); ctx.translate(PIVO_ASA[0] + 2, PIVO_ASA[1] - 1);
        desenharAsaMorcego(ctx, pal, lw, bateMorcego * 0.9 + 0.2, true);
        ctx.restore();
    } else if (voando) {
        ctx.save(); ctx.translate(PIVO_ASA[0] + 2, PIVO_ASA[1] - 1);
        desenharAsa(ctx, pal, lw, bateAsa * 0.9 + 0.15, true);
        ctx.restore();
    }

    // ── 2. Cauda, crina de fundo e espinhos (atrás do corpo) ──
    if (esp.cauda === 'mechas') desenharCauda(ctx, p, pal, lw, ondaCrina);
    else desenharCaudaEspecie(ctx, p, pal, lw, ondaCrina, esp);
    if (esp.crina) {
        ctx.save();
        ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]); ctx.rotate(angPescoco);
        desenharCrina(ctx, p, pal, lw, ondaCrina, angPescoco, true);
        ctx.restore();
    }
    if (esp.espinhos) desenharEspinhos(ctx, pal, lw, angPescoco, kPesc);

    // ── 3. Tronco + pescoço: contorno único por trás, depois o preenchimento ──
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.contorno;
    ctx.lineWidth = lw * 2;
    ctx.stroke(FORMAS.tronco);
    ctx.save();
    ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]); ctx.rotate(angPescoco); ctx.scale(1, kPesc);
    ctx.stroke(FORMAS.pescoco);
    ctx.restore();

    preencherSombreado(ctx, FORMAS.tronco, pal.corpo, pal.sombra);
    // brilhos do dorso e da anca
    ctx.fillStyle = pal.claro;
    ctx.beginPath(); ctx.ellipse(-5, -11, 9, 2.2, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-14, -10, 4, 2.6, -0.4, 0, Math.PI * 2); ctx.fill();

    // ── 4. Pescoço, crina, cabeça (hierarquia: tronco → pescoço → cabeça) ──
    ctx.save();
    ctx.translate(PIVO_PESCOCO[0], PIVO_PESCOCO[1]);
    ctx.rotate(angPescoco);
    ctx.save(); ctx.scale(1, kPesc);
    preencherSombreado(ctx, FORMAS.pescoco, pal.corpo, pal.sombra);
    ctx.restore();

    // crina: 5 mechas ao longo da crista do pescoço
    if (esp.crina) desenharCrina(ctx, p, pal, lw, ondaCrina, angPescoco, false);

    // cabeça: desconta metade do balanço do pescoço (olhar estável) e aponta o focinho um pouco para baixo
    ctx.translate(NUCA_NO_PESCOCO[0], NUCA_NO_PESCOCO[1] * kPesc);
    ctx.rotate(-INCLINACAO_PESCOCO * Math.PI / 180 - (angPescoco - INCLINACAO_PESCOCO * Math.PI / 180) * 0.5
        + INCLINACAO_CABECA * Math.PI / 180);
    ctx.scale(esp.escalaCabeca, esp.escalaCabeca);

    // orelha de trás (gato e coelho têm duas visíveis)
    if (esp.orelha === 'gato' || esp.orelha === 'coelho') desenharOrelhaEspecie(ctx, pal, lw, esp, angOrelha, ondaCrina, true);

    const formaCabeca = FORMAS[esp.cabeca], formaFocinho = FORMAS[esp.focinho];
    ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 2;
    ctx.stroke(formaCabeca);
    preencherSombreado(ctx, formaCabeca, pal.corpo, pal.sombra);
    ctx.save(); ctx.clip(formaCabeca);
    ctx.fillStyle = pal.focinho; ctx.fill(formaFocinho);
    ctx.fillStyle = pal.claro; ctx.beginPath(); ctx.arc(0, -8, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // bochecha, nariz/boca da espécie, olho
    ctx.fillStyle = pal.bochecha;
    ctx.beginPath(); ctx.ellipse(9, 2.2, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    desenharRostoEspecie(ctx, p, pal, lw, esp);
    desenharOlho(ctx, p, pal, lw, dano);

    // topete (só unicórnio): 2 mechas curtas para cima e para trás (não cobre o olho)
    if (esp.topete) {
        for (let i = 0; i < 2; i++) {
            const a = (-150 + i * 22) * Math.PI / 180 + ondaCrina.A * 0.5 * Math.sin(ondaCrina.fase - i);
            desenharMecha(ctx, 1.5 - i * 2, -10, a, 0.5, 7, 4, pal.crina[i === 0 ? 1 : 0], 'rgba(255,255,255,0.45)', pal.contornoCrina, lw * 0.7);
        }
    }

    // orelha da frente
    desenharOrelhaEspecie(ctx, pal, lw, esp, angOrelha, ondaCrina, false);

    // chifre(s)
    if (esp.chifre === 'unicornio') {
        // chifre espiral (sem shadowBlur): base, face de sombra, faixas da espiral, brilho
        ctx.strokeStyle = pal.chifre.contorno; ctx.lineWidth = lw * 1.5; ctx.stroke(FORMAS.chifre);
        ctx.fillStyle = pal.chifre.base; ctx.fill(FORMAS.chifre);
        ctx.save();
        ctx.clip(FORMAS.chifre);
        ctx.fillStyle = pal.chifre.sombra; ctx.fill(FORMAS.chifreSombra);
        ctx.strokeStyle = pal.chifre.sombra; ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) { const yy = -13.8 - k * 3.4; ctx.moveTo(0, yy + 2); ctx.lineTo(12, yy - 1.5); }
        ctx.stroke();
        ctx.strokeStyle = pal.chifre.brilho; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2.8, -11.5); ctx.lineTo(7.6, -21.8); ctx.stroke();
        ctx.restore();
    } else if (esp.chifre === 'dragao') {
        // dois chifres curvos para trás
        for (const [dx, k] of [[4.5, 0.85], [0, 1]]) {
            ctx.save(); ctx.translate(dx, 0); ctx.rotate(-0.55); ctx.scale(k, k);   // inclinados para trás
            ctx.strokeStyle = pal.chifre.contorno; ctx.lineWidth = lw * 1.4; ctx.stroke(FORMAS.chifreDragao);
            ctx.fillStyle = pal.chifre.base; ctx.fill(FORMAS.chifreDragao);
            ctx.strokeStyle = pal.chifre.sombra; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(-1.5, -12.2); ctx.moveTo(-5.5, -13.8); ctx.lineTo(-4.2, -14.8); ctx.stroke();
            ctx.restore();
        }
    }

    // pontos de luz pré-desenhados (substituem o shadowBlur antigo): ponta do chifre e lente do Ciborgue
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (esp.chifre === 'unicornio') {
        const tamLuz = 9 + 2 * Math.sin(tempo * 4);
        ctx.drawImage(spriteLuz(pal.chifre.base), 8.2 - tamLuz / 2, -23 - tamLuz / 2, tamLuz, tamLuz);
    }
    if (pal.olhoCiborgue && !p.assustado) ctx.drawImage(spriteLuz('#FF2A2A'), 5.7 - 5, -2.6 - 5, 10, 10);
    ctx.restore();

    ctx.restore(); // fim pescoço/cabeça

    // asa da frente
    if (esp.asas === 'morcego') {
        ctx.save(); ctx.translate(PIVO_ASA[0], PIVO_ASA[1]);
        desenharAsaMorcego(ctx, pal, lw, bateMorcego, false);
        ctx.restore();
    } else if (voando) {
        ctx.save(); ctx.translate(PIVO_ASA[0], PIVO_ASA[1]);
        desenharAsa(ctx, pal, lw, bateAsa, false);
        ctx.restore();
    }

    // ── 5. Patas da frente (por cima do corpo) ──
    desenharPata(ctx, PIVO_PATA_TRAS[0], PIVO_PATA_TRAS[1], patas.tf[0], patas.tf[1], largTras, 3.6, pal.corpo, pal, lw, esp.pe);
    desenharPata(ctx, PIVO_PATA_FRENTE[0], PIVO_PATA_FRENTE[1], patas.df[0], patas.df[1], 5.5, 3.4, pal.corpo, pal, lw, esp.pe);

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
        // cauda grossa de dragão com ponta em espada
        const a = (165 - 25 * s + 10 * Math.sin(onda.fase)) * Math.PI / 180;
        const dobra = 0.25 + 0.2 * Math.sin(onda.fase - 0.8);
        desenharMecha(ctx, RAIZ_CAUDA[0] + 2, RAIZ_CAUDA[1] + 4, a, dobra, 22, 10, pal.corpo, 'rgba(255,255,255,0.25)', pal.contorno, lw * 1.6);
        // ponta: losango na cor da crina
        const h = 11, a2 = a + dobra;
        const mx = RAIZ_CAUDA[0] + 2 + Math.cos(a) * h, my = RAIZ_CAUDA[1] + 4 + Math.sin(a) * h;
        const px = mx + Math.cos(a2) * h, py = my + Math.sin(a2) * h;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a2);
        ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(3, -3.5); ctx.lineTo(7, 0); ctx.lineTo(3, 3.5); ctx.closePath();
        ctx.lineWidth = lw * 1.2; ctx.strokeStyle = pal.contorno; ctx.stroke();
        ctx.fillStyle = pal.crina[0]; ctx.fill();
        ctx.restore();
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
function pontoLocalNaTela(p, ux, uy, escala) {
    return { x: p.x + p.w / 2 + ux * escala * p.w / 50, y: p.y + p.h / 2 + uy * escala * p.h / 40 };
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

    // fita de arco-íris (só correndo rápido ou no ar)
    const r = p.rastro;
    if (r && r.length > 2 && (vel > 4 || !p.onGround)) {
        const raiz = pontoLocalNaTela(p, RAIZ_CAUDA[0], RAIZ_CAUDA[1], 1.3);
        const pts = [{ x: raiz.x, y: raiz.y }];
        for (let i = 1; i < r.length; i++) pts.push({ x: r[i].x - dist, y: r[i].y });
        const n = pts.length;
        ctx.save();
        for (let i = 0; i < n - 1; i++) {
            const k = 1 - i / (n - 1);                           // 1 perto da cauda, 0 na ponta
            ctx.globalAlpha = 0.85 * k;
            const larg = RASTRO_LARGURA * (0.4 + 0.6 * k) * (p.w / 50);
            for (let b = 0; b < 4; b++) {
                const off0 = (b - 2) * larg, off1 = off0 + larg;
                ctx.fillStyle = pal.crina[b];
                ctx.beginPath();
                ctx.moveTo(pts[i].x, pts[i].y + off0);
                ctx.lineTo(pts[i + 1].x, pts[i + 1].y + off0);
                ctx.lineTo(pts[i + 1].x, pts[i + 1].y + off1 + 0.5);
                ctx.lineTo(pts[i].x, pts[i].y + off1 + 0.5);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
    }

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
function desenharAsa(ctx, pal, lw, angulo, fundo) {
    ctx.save();
    ctx.rotate(angulo);
    const asa = new Path2D();
    asa.moveTo(0, 0);
    asa.bezierCurveTo(2, -8, -4, -18, -12, -20);
    asa.quadraticCurveTo(-22, -21, -25, -15);
    asa.quadraticCurveTo(-20, -13, -22, -9);
    asa.quadraticCurveTo(-17, -9, -18, -5);
    asa.quadraticCurveTo(-13, -5, -12, -1.5);
    asa.quadraticCurveTo(-6, -0.5, 0, 0);
    asa.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 1.6; ctx.stroke(asa);
    ctx.fillStyle = fundo ? pal.fundo : '#FFFFFF'; ctx.fill(asa);
    // pontas das penas na cor da crina
    ctx.save();
    ctx.clip(asa);
    ctx.fillStyle = fundo ? pal.crinaFundo[0] : pal.crina[0];
    ctx.beginPath(); ctx.ellipse(-22, -12, 7, 12, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.contorno; ctx.lineWidth = lw * 0.45;
    ctx.beginPath();
    ctx.moveTo(-3, -4); ctx.quadraticCurveTo(-10, -9, -18, -9);
    ctx.moveTo(-5, -9); ctx.quadraticCurveTo(-12, -14, -21, -14);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
}

// O personagem novo vale para todos (unicórnios, dragão, gato e coelho)
function usaPersonagemNovo(p) {
    return USAR_PERSONAGEM_NOVO && p && p.char;
}
