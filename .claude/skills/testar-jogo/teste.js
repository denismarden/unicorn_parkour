// Teste automatizado headless — roda o jogo e registra resultados no <body data-res>
const log = [];
const ok = (cond, msg) => log.push((cond ? 'OK   ' : 'FALHA ') + msg);
const tecla = (code, tipo = 'keydown', repeat = false) => window.dispatchEvent(new KeyboardEvent(tipo, { code, repeat, bubbles: true }));
const espera = (ms) => new Promise(r => setTimeout(r, ms));

async function rodar() {
    try {
        let nRaf = 0; requestAnimationFrame(function f() { nRaf++; if (nRaf < 1000) requestAnimationFrame(f); });
        await espera(500);
        log.push(`rAF bruto em 500ms: ${nRaf}`);
        ok(state === 'menu', 'começa no menu');
        ok(cw > 0 && ch > 0, `resolução lógica ${cw}x${ch}`);
        btnStart.click();
        ok(state === 'playing', 'Jogar inicia a partida');
        await espera(500);
        ok(frames > 10, `frames avançaram: ${frames}`);

        // #1 Espaço pula e não pausa
        player.y = platforms[0].y - player.h; player.vy = 0;
        await espera(100);
        const j0 = player.jumps;
        tecla('Space');
        ok(!isPaused, 'Espaço não pausa');
        ok(player.jumps === j0 + 1 || player.vy < 0, `Espaço pula (jumps ${j0}→${player.jumps}, vy ${player.vy.toFixed(1)})`);
        tecla('Space', 'keyup');
        tecla('Space', 'keydown', true);
        ok(player.jumps <= j0 + 1, 'segurar Espaço (repeat) não repete pulo');
        tecla('KeyP');
        ok(isPaused, 'P pausa');
        const fPausa = frames;
        await espera(300);
        ok(frames === fPausa, 'pausado não avança');
        tecla('KeyP');
        tecla('KeyP'); tecla('KeyP'); // alterna rápido: não pode criar loop duplo
        ok(!isPaused, 'P despausa');
        const f1 = frames; await espera(1000); const taxa = frames - f1;
        ok(taxa > 40 && taxa < 75, `~60 passos/s mesmo após alternar pausa rápido: ${taxa}`);

        // #6 alcance
        const a = alcanceDoPulo(0);
        ok(a.distancia > 200 && a.alturaMax > 150, `alcance do pulo: dist ${a.distancia.toFixed(0)} altura ${a.alturaMax.toFixed(0)}`);

        // #7/#8 fase por distância e velocidade sem queda
        const vAntes = gameSpeed;
        distance = PHASES[3].distThreshold + 10;
        await espera(300);
        ok(currentPhase === 3, `alcança fase 4 por distância (idx ${currentPhase})`);
        ok(gameSpeed >= vAntes - 0.01, `velocidade não cai: ${vAntes.toFixed(2)} → ${gameSpeed.toFixed(2)}`);

        // #6 #14 #15 geração das fases (com o jogo pausado, gerando direto)
        tecla('KeyP');
        let totObs = {}, mov = 0, queb = 0, piorFolga = Infinity, piorDegrau = Infinity, minW = Infinity;
        for (const fase of [1, 3, 8, 12, 25, 29]) {
            currentPhase = fase; applyPhaseParams();
            gameSpeed = PHASES[fase].baseSpeed;
            platforms = [platforms[platforms.length - 1]]; obstaculos = [];
            lastPlatformX = platforms[0].x + platforms[0].w;
            const d0 = distance; distance = lastPlatformX - cw * 2 + 40000;
            generateWorld();
            distance = d0;
            for (const o of obstaculos) totObs[o.tipo] = (totObs[o.tipo] || 0) + 1;
            mov += platforms.filter(p => p.amp).length; queb += platforms.filter(p => p.quebradica).length;
            for (let i = 1; i < platforms.length; i++) {
                const a = platforms[i - 1], b = platforms[i];
                const gap = b.x - (a.x + a.w);
                const subida = Math.max(0, a.baseY - b.baseY) + (b.amp || 0);
                if (gap > 0) piorFolga = Math.min(piorFolga, alcanceDoPulo(subida).distancia - gap);
                piorDegrau = Math.min(piorDegrau, alcanceDoPulo(0).alturaMax - subida);
                minW = Math.min(minW, b.w);
            }
        }
        ok(Object.keys(totObs).length === 3, `obstáculos gerados: ${JSON.stringify(totObs)}`);
        ok(mov > 0 && queb > 0, `plataformas especiais: móveis ${mov}, quebradiças ${queb}`);
        ok(minW >= MIN_LARGURA_PLATAFORMA, `largura mínima respeitada (menor ${minW.toFixed(0)})`);
        ok(piorFolga > 0, `todos os vãos dentro do alcance (pior folga ${piorFolga.toFixed(0)}px)`);
        ok(piorDegrau > 0, `todas as subidas alcançáveis (pior folga ${piorDegrau.toFixed(0)}px)`);
        // Oni (gravidade 1.5x) — personagem mais difícil
        const pOrig = player.gravity; player.gravity = GRAVIDADE_BASE * 1.5;
        currentPhase = 0; applyPhaseParams(); gameSpeed = 5;
        platforms = [platforms[platforms.length - 1]]; lastPlatformX = platforms[0].x + platforms[0].w;
        { const d0 = distance; distance = lastPlatformX - cw * 2 + 20000; generateWorld(); distance = d0; }
        let folgaOni = Infinity;
        for (let i = 1; i < platforms.length; i++) { const g = platforms[i].x - (platforms[i - 1].x + platforms[i - 1].w); if (g > 0) folgaOni = Math.min(folgaOni, alcanceDoPulo(Math.max(0, platforms[i - 1].baseY - platforms[i].baseY)).distancia - g); }
        ok(folgaOni > 0, `Oni: todos os vãos possíveis (pior folga ${folgaOni.toFixed(0)}px)`);
        player.gravity = pOrig;

        // recomeça uma partida limpa para os próximos testes
        btnStart.click();
        await espera(300);

        // #17 resgate com escudo: cai no buraco e volta numa plataforma à frente
        player.hurtFrames = 0;
        isShieldActive = true; shieldTimeLeft = 10;
        player.y = ch + 10;
        await espera(100);
        ok(state === 'playing', 'escudo salva da queda');
        const px = distance + player.x;
        const sob = platforms.some(p => px + player.w * 0.8 > p.x && px + player.w * 0.2 < p.x + p.w);
        ok(sob, 'após o resgate há plataforma sob o jogador');

        // #3 aura
        selectedSkin = 'golden';
        await espera(100);
        selectedSkin = 'default';

        // #13 resize no meio da partida
        const yAntes = player.y, chAntes = ch;
        window.innerWidth; window.dispatchEvent(new Event('resize'));
        ok(state === 'playing', 'resize não mata o jogador');

        // #19 slam bloqueado no dash
        if (isPaused) tecla('KeyP');
        player.onGround = false; player.y = 100;
        tecla('ArrowRight');
        tecla('ArrowDown');
        ok(isSlamming && dashTimeLeft === 0, 'slam cancela o dash');

        // #20 #28 morte com animação e game over depois
        await espera(400);
        isShieldActive = false; unlockedUpgrades.free_revive = 0; player.hurtFrames = 0;
        const estrelasAntes = globalStars;
        starsCollected = 1000;
        player.y = ch + 50;
        await espera(100);
        ok(state === 'dying', `morte entra em animação (state ${state})`);
        ok(gameOverMenu.classList.contains('hidden'), 'game over ainda escondido durante a animação');
        await espera(1500);
        ok(state === 'gameover', 'game over aparece depois');
        const esperado = Math.floor(1000 * CONVERSAO_ESTRELAS);
        ok(globalStars === estrelasAntes + esperado, `carteira recebe ${CONVERSAO_ESTRELAS * 100}%: +${globalStars - estrelasAntes}`);
        await espera(1200);   // a contagem do ganho leva ~0,9 s
        ok(finalStars.textContent.indexOf(esperado.toLocaleString()) >= 0, `game over mostra o ganho da loja (${finalStars.textContent})`);
        ok(document.getElementById('final-carteira').textContent === globalStars.toLocaleString(), 'game over mostra o total da carteira');
        ok(starsDisplay.textContent === esperado.toLocaleString(), `HUD mostra estrelas para a loja (${starsDisplay.textContent})`);

        // #33 menu volta ao estado menu
        btnMenuGo.click();
        ok(state === 'menu', 'botão Menu volta state para menu');
        tecla('Enter');
        ok(state === 'menu', 'Enter no menu não inicia partida');

        // #16 reiniciar zera estado
        powerupItems.push({ type: 'magnet', x: 500, y: 100, size: 18, collected: false, oscOffset: 0 });
        isSlamming = true; dashCooldown = 2;
        btnStart.click();
        ok(!isSlamming && dashCooldown === 0, 'reinício zera slam e dash');
        ok(!powerupItems.some(p => p.x === 500 && p.type === 'magnet' && p.oscOffset === 0), 'reinício limpa power-ups antigos');

        // #4 XSS
        leaderboard = [{ name: '<img src=x onerror="window.__xss=1">', score: 10, charName: 'Padrão', phase: 1 }];
        renderLeaderboard();
        await espera(100);
        ok(!window.__xss && !document.querySelector('#leaderboard-list img'), 'placar não executa HTML do nome');

        // ── FASE A: movimentação (passos manuais com o jogo pausado) ──
        await espera(1500);
        ok(gameSpeed > 3, `arrancada chega à velocidade: ${gameSpeed.toFixed(2)}`);
        tecla('KeyP');
        const passo = (n = 1) => { for (let i = 0; i < n; i++) step(); };
        // velocidade máxima de queda
        player.hurtFrames = 9999; player.y = 50; player.vy = 25; isSlamming = false; player.onGround = false;
        passo();
        ok(player.vy <= VEL_MAX_QUEDA + 0.001, `queda limitada: vy ${player.vy.toFixed(1)}`);
        // pulo do buffer sem botão segurado sai baixo
        // (com pulo mínimo: o corte só acontece depois de PASSOS_PULO_MIN passos)
        player.y = ch * 0.5; puloSegurado = false; isPaused = false; player.jumps = 0; jump(); isPaused = true;
        const vyInicioCurto = player.vy;
        passo(PASSOS_PULO_MIN); const vyCurto = player.vy;
        player.y = ch * 0.5; puloSegurado = true; isPaused = false; player.jumps = 0; jump(); isPaused = true;
        ok(Math.abs(player.vy - player.jumpPower) < 0.01, `pulo com botão segurado é alto: vy ${player.vy.toFixed(1)}`);
        passo(PASSOS_PULO_MIN); const vyLongo = player.vy; puloSegurado = false;
        ok(Math.abs(vyInicioCurto - player.jumpPower) < 0.01, `toque rápido começa com o pulo inteiro (pulo mínimo)`);
        ok(vyCurto > vyLongo + 2, `toque rápido é cortado depois do pulo mínimo: ${vyCurto.toFixed(1)} vs ${vyLongo.toFixed(1)}`);
        // plataforma móvel descendo: jogador fica colado
        const pm = { x: distance + player.x - 50, y: ch * 0.5, baseY: ch * 0.5, w: 2000, h: ch, amp: 60, velOsc: 0.04, faseOsc: 0 };
        platforms.push(pm); obstaculos = [];
        player.y = pm.y - player.h; player.vy = 0; player.onGround = true; player.ant = null;
        let noChao = 0;
        for (let i = 0; i < 60; i++) { passo(); if (player.onGround) noChao++; }
        ok(noChao >= 58, `colado na plataforma móvel: ${noChao}/60 passos no chão`);
        // dash caindo rápido perto do chão não atravessa
        player.y = pm.y - player.h - 6; player.vy = 14; player.onGround = false; dashCooldown = 0; isDashing = false; dashTimeLeft = 0;
        isPaused = false; doDash(); isPaused = true;
        passo(30);   // o dash trava a altura; pousa (sem atravessar) quando o dash acaba
        ok(player.onGround && Math.abs(player.y + player.h - pm.y) < 1, `dash perto do chão pousa (onGround ${player.onGround})`);
        // interpolação desenha e restaura o estado real
        const dReal = distance, yReal = player.y;
        renderInterpolado(0.5);
        ok(distance === dReal && player.y === yReal, 'render interpolado restaura o estado real');
        // câmera lenta: plataforma móvel não teleporta ao ligar
        const yM0 = pm.y; isSlowMoActive = true; slowMoTimeLeft = 1; passo();
        ok(Math.abs(pm.y - yM0) < 4, `câmera lenta não teleporta plataforma (Δ ${Math.abs(pm.y - yM0).toFixed(2)})`);
        isSlowMoActive = false; player.hurtFrames = 0;
        // pointer no documento pula; soltar corta
        isPaused = false; player.jumps = 0; player.onGround = true;
        document.body.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true, button: 0, pointerType: 'touch' }));
        const vyPt = player.vy;
        document.body.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true, pointerType: 'touch' }));
        passo(PASSOS_PULO_MIN);
        ok(vyPt < -10 && !player.podeCortarPulo, `toque pula (${vyPt.toFixed(1)}) e soltar corta depois do pulo mínimo (${player.vy.toFixed(1)})`);
        isPaused = true;

        // ── FASE A (2ª rodada) ──
        // pulo durante o dash: cancela o dash e sobe de verdade
        player.y = pm.y - player.h - 80; player.vy = 0; player.onGround = false; player.jumps = 0; dashCooldown = 0; isDashing = false; dashTimeLeft = 0;
        isPaused = false; doDash(); puloSegurado = true; jump(); puloSegurado = false; isPaused = true;
        passo(2);
        ok(dashTimeLeft === 0 && player.vy < -5, `pulo no dash cancela o dash e sobe (vy ${player.vy.toFixed(1)})`);
        // mortal não pisca de ponta-cabeça: o "anterior" da interpolação acompanha o salto 0 → -2π
        player.y = pm.y - player.h - 120; player.vy = -2; player.onGround = false; player.jumps = 1; player.spin = 0;
        isPaused = false; puloSegurado = true; jump(); puloSegurado = false; isPaused = true;
        ok(player.spin < -6 && player.ant && player.ant.spin === player.spin, 'mortal começa sem quadro de ponta-cabeça');
        // caindo quase no chão com pulo do ar sobrando: guarda no buffer em vez de gastar
        player.spin = 0; player.y = pm.y - player.h - 8; player.vy = 6; player.onGround = false; player.jumps = 1;
        isPaused = false; puloSegurado = true; jump(); isPaused = true;
        ok(player.jumps === 1 && player.bufferPulo > 0, 'pulo perto do chão vai para o buffer');
        isPaused = false; passo(4); isPaused = true;   // jump() ignora comandos com o jogo pausado
        ok(player.vy < -5, `...e sai do chão logo ao pousar (vy ${player.vy.toFixed(1)})`);
        puloSegurado = false;
        // perder o foco limpa o botão segurado
        puloSegurado = true; window.dispatchEvent(new Event('blur'));
        ok(!puloSegurado, 'perder o foco solta o pulo');
        // bloco em plataforma descendo: continua no chão sem "repousar"
        obstaculos = [{ tipo: 'bloco', plat: pm, x: distance + player.x - 10, w: 200, h: 44, destruido: false }];
        pm.amp = 60; pm.velOsc = 0.04; pm.faseOsc = Math.PI * 1.5;  // vai descer
        pm.y = pm.baseY + Math.sin(pm.faseOsc) * pm.amp;
        player.y = pm.y - 44 - player.h; player.vy = 0; player.onGround = true; player.ant = null;
        let pousosBloco = 0; const _ap = aoPousar; aoPousar = function (t, est) { if (!est) pousosBloco++; return _ap.apply(this, arguments); };
        for (let i = 0; i < 30; i++) passo();
        aoPousar = _ap; obstaculos = [];
        ok(pousosBloco === 0, `em cima do bloco descendo não repousa (${pousosBloco} pousos)`);
        tecla('KeyP');
        await espera(300);

        // Rodar um pouco jogando "de verdade" (pulando periodicamente) para pegar erros
        const fim = Date.now() + 4000;
        while (Date.now() < fim && state === 'playing') { tecla('Space'); await espera(250); tecla('Space', 'keyup'); await espera(150); }

        // Visual do personagem: todas as auras, pelagens, rastros, chifres e chapéus desenham sem erro
        const errosAntes = window.__erros.length;
        btnStart.click(); await espera(200);
        for (const s of skins) { selectedSkin = s.id; await espera(80); }
        selectedSkin = 'default';
        for (const cat of ['pelagem', 'rastro', 'chifre', 'chapeu']) {
            for (const item of CATEGORIAS_VISUAL.find(c => c.id === cat).itens()) {
                player.visual = visualParaDesenho({ ...VISUAL_PADRAO, [cat]: item.id });
                await espera(60);
            }
        }
        ok(window.__erros.length === errosAntes, `auras e visuais no jogo sem erro (${window.__erros.length - errosAntes})`);
        state = 'menu';
        for (const cat of CATEGORIAS_VISUAL) { abaVisual = cat.id; renderCharMenu(); }
        ok(skinsGrid.children.length === CHAPEUS.length && document.querySelectorAll('.aba-visual').length === 5, 'loja com 5 abas e cards da aba atual');
        ok(window.__erros.length === errosAntes, 'prévias da loja sem erro');
        // comprar e equipar uma pelagem
        globalStars = 999999; window.confirm = () => true;
        escolherVisual('pelagem', PELAGENS.find(p => p.id === 'pel_galaxia'));
        ok(unlockedSkins.includes('pel_galaxia') && JSON.parse(localStorage.getItem('uniparkourVisual')).pelagem === 'pel_galaxia', 'comprar pelagem desbloqueia e equipa');
        btnStart.click(); await espera(100);
        ok(player.visual.pelagem === 'galaxia', 'partida nova usa a pelagem equipada');
        // personagens alternativos desenham sem erro
        for (const id of [20, 21, 22, 8, 9]) {
            unlockedChars.push(id); selectedChar = id;
            btnStart.click(); await espera(250);
        }

        // missões do dia: 3 diferentes, completar paga com o bônus de sequência e as 3 abrem o baú
        ok(missoesDia && missoesDia.missoes.length === 3 && new Set(missoesDia.missoes.map(m => m.type)).size === 3,
            `3 missões do dia diferentes (${missoesDia.missoes.map(m => m.type).join(',')})`);
        ok(document.querySelectorAll('#missions-lista .missao-linha').length === 3, 'painel mostra as 3 missões');
        globalStars = 0;
        const multAtual = multSequencia();
        const somaPremios = missoesDia.missoes.reduce((s, m) => s + Math.round(m.reward * multAtual), 0) + Math.round(PREMIO_BAU_DIARIO * multAtual);
        missoesDia.missoes.forEach(m => { m.feita = false; m.current = 0; }); missoesDia.bau = false;
        missoesDia.missoes.forEach(m => checkMission(m.type, m.target));
        ok(missoesDia.bau && globalStars === somaPremios, `3 missões + baú pagam ${somaPremios} (carteira ${globalStars})`);
        checkMission(missoesDia.missoes[0].type, 99999);
        ok(globalStars === somaPremios, 'missão feita não paga de novo');

        // save corrompido não derruba o jogo
        localStorage.setItem('uniparkourTesteRuim', '{x');
        ok(JSON.stringify(lerJSON('uniparkourTesteRuim', [0], Array.isArray)) === '[0]' && lerJSON('uniparkourTesteRuim2', 5) === 5,
            'lerJSON devolve o padrão com save corrompido ou ausente');
        localStorage.setItem('uniparkourTesteRuim', '5');
        ok(JSON.stringify(lerJSON('uniparkourTesteRuim', [0], Array.isArray)) === '[0]', 'lerJSON recusa formato errado');
        localStorage.removeItem('uniparkourTesteRuim');

        // power-ups: todos têm estilo; coletar mostra o nome do poder e estoura a bolha
        ok(POWERUP_TYPES.concat('omni').every(t => ESTILOS_POWERUP[t] && ESTILOS_POWERUP[t].nome), 'todos os power-ups têm estilo e nome');
        btnStart.click(); await espera(100); isPaused = true;
        floatingTexts = [];
        coletarPowerup({ type: 'magnet', x: distance + player.x, y: player.y });
        ok(isMagnetActive && floatingTexts.some(f => f.text === ESTILOS_POWERUP.magnet.nome), 'coletar power-up ativa e mostra o nome');
        // power-ups: o sorteio com raridade só devolve tipos que existem
        const sorteados = new Set(); for (let i = 0; i < 2000; i++) sorteados.add(sortearPowerup());
        ok([...sorteados].every(t => POWERUP_TYPES.includes(t)) && sorteados.size >= 15, `sorteio de power-ups com raridade (${sorteados.size} tipos)`);
    } catch (e) {
        log.push('EXCEÇÃO ' + e.message + ' ' + e.stack);
    }
    log.push('ERROS JS: ' + JSON.stringify(window.__erros));
    document.body.setAttribute('data-res', log.join('\n'));
}
window.addEventListener('load', () => setTimeout(rodar, 200));
