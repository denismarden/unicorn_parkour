// Foto do jogo rodando (fundo + jogo), para atualizar o screenshot_fixed.png.
// Uso: bash .claude/skills/testar-jogo/rodar.sh .claude/skills/publicar-jogo/foto_jogo.js
window.addEventListener('load', () => setTimeout(() => {
    partidasJogadas = 99;   // pula as dicas do tutorial: a foto mostra o jogo limpo
    btnStart.click();
    // pula alguns vezes para o personagem aparecer em ação (rastro, crina ao vento)
    let n = 0;
    const pular = setInterval(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 200);
        if (++n >= 6) clearInterval(pular);
    }, 450);
    setTimeout(() => {
        const fundo = document.getElementById('bg-canvas'), jogo = document.getElementById('game-canvas');
        const foto = document.createElement('canvas');
        foto.width = jogo.width; foto.height = jogo.height;
        const g = foto.getContext('2d');
        g.drawImage(fundo, 0, 0, foto.width, foto.height);
        g.drawImage(jogo, 0, 0);
        document.body.setAttribute('data-img', foto.toDataURL());
        document.body.setAttribute('data-res', `foto ${foto.width}x${foto.height} estado=${state}\nERROS JS: ${JSON.stringify(window.__erros)}`);
    }, 3200);
}, 300));
