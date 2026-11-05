// Vitrine: desenha a prévia de TODOS os itens da loja (personagens + cada aba do visual) numa imagem só.
// Uso: bash rodar.sh vitrine_loja.js  → salva vitrine_loja.png
window.addEventListener('load', () => setTimeout(() => {
    retratosLiberados = true;
    const COLUNAS = 9, W = 210, H = 156, ROTULO = 16;
    // cada grupo: [título, itens, função que desenha o retrato de um item]
    const grupos = [['Personagens', characters, (cv, c) => desenharRetrato(cv, c)]];
    for (const cat of CATEGORIAS_VISUAL) {
        grupos.push([cat.nome, cat.itens(), (cv, item) => {
            const eq = { ...VISUAL_PADRAO };
            if (cat.id !== 'aura') eq[cat.id] = item.id;
            const extra = cat.id === 'aura' ? { aura: AURA_EFEITO[item.id] || null } : cat.id === 'rastro' ? { rastro: true } : {};
            desenharRetrato(cv, characters[0], visualParaDesenho(eq), extra);
        }]);
    }
    const linhasDe = (n) => Math.ceil(n / COLUNAS);
    const totalLinhas = grupos.reduce((s, g) => s + linhasDe(g[1].length), 0);
    const big = document.createElement('canvas');
    big.width = COLUNAS * W; big.height = totalLinhas * (H + ROTULO) + grupos.length * 24;
    const g = big.getContext('2d');
    g.fillStyle = '#2A1A55'; g.fillRect(0, 0, big.width, big.height);
    let y = 0;
    for (const [titulo, itens, desenhar] of grupos) {
        g.fillStyle = '#FFE08A'; g.font = 'bold 16px sans-serif'; g.fillText(titulo, 6, y + 18);
        y += 24;
        itens.forEach((item, i) => {
            const cv = document.createElement('canvas');
            desenhar(cv, item);
            const x = (i % COLUNAS) * W, yy = y + Math.floor(i / COLUNAS) * (H + ROTULO);
            g.drawImage(cv, x, yy, W, H);
            g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(item.name, x + 6, yy + H + 12);
        });
        y += linhasDe(itens.length) * (H + ROTULO);
    }
    document.body.setAttribute('data-img', big.toDataURL());
    document.body.setAttribute('data-res', 'vitrine com ' + grupos.map(g => g[1].length).join('+') + ' itens\nERROS JS: ' + JSON.stringify(window.__erros));
}, 300));
