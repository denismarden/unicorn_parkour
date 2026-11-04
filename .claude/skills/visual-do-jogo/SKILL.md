---
name: visual-do-jogo
description: Designer completo do Unicorn Parkour — melhora o PERSONAGEM (visual do unicórnio), a MOVIMENTAÇÃO (animação, física e sensação do pulo) e o CENÁRIO inteiro (fundo, plataformas, efeitos, HUD e telas). Use quando o usuário achar o jogo simples, feio, travado ou quiser melhorar a aparência ou o movimento.
---

# Designer do Unicorn Parkour

Pedido extra do usuário (se houver): $ARGUMENTS

Use também a skill `frontend-design` (se existir em `.claude/skills`) para HUD, menus e telas.

## 1. Entender o jogo hoje

- Abra `screenshot_fixed.png`, `unicorn.png` e `unicorn_spritesheet_*.png`.
- Em `game.js`, localize: loop principal, física do jogador (gravidade, pulo, velocidade), estados do jogador, funções de desenho (`draw`, `render`, `ctx.`, `drawImage`).
- Leia `process_img.ps1` para entender como o spritesheet é montado.
- NÃO leia `unicorn_data.js` inteiro (só as primeiras ~30 linhas / Grep).

## 2. Chamar os especialistas EM PARALELO

Passe o pedido do usuário para cada um:
- `diretor-de-arte` → direção visual geral + cenário (3 estilos com paleta)
- `designer-personagem` → REDESIGN do unicórnio (silhueta, cores, crina/cauda, contorno, esqueleto de animação)
- `animador-sprite` → problemas técnicos da animação atual (timing, frames, estados)
- `sensacao-parkour` → física e controles da movimentação

## 3. Apresentar o plano e decidir

Mostre ao usuário, de forma curta:
- as **3 direções de estilo** do diretor de arte (nome, clima, paleta)
- o **plano do personagem** e o **plano de movimentação** (listas numeradas)

Faça UMA pergunta: qual estilo escolher (ou misturar). Se o usuário não responder ou fechar a pergunta, siga com a direção que melhor combina com o sprite atual e diga qual escolheu.
Fontes do Google Fonts são permitidas (ver CLAUDE.md) — não pergunte sobre isso.

## 4. Implementar em 3 fases

Ao fim de CADA fase: pare, diga em até 3 linhas o que mudou e peça para o usuário testar no navegador (F5) antes de seguir. Valores ajustáveis viram constantes no topo de `game.js`.

### Fase A — Movimentação (primeiro, porque afeta todo o resto)
- Delta time em toda a física (mesma velocidade em 60Hz e 144Hz; limitar dt ao voltar de outra aba)
- Coyote time (~100 ms), jump buffer (~120 ms), pulo variável (soltar cedo = pulo baixo)
- Gravidade maior na queda; velocidade máxima de queda
- Aceleração/desaceleração suaves em vez de velocidade instantânea
- Controles por teclado E toque no celular

### Fase B — Personagem (redesign)
O personagem atual parece amador: silhueta de bolhas, tudo da mesma cor pálida, crina e cauda quase inexistentes, patas duras, sem contorno. O objetivo é que ele pareça de um jogo mobile profissional.
Siga a especificação do `designer-personagem`. Implemente em sub-etapas, testando cada uma:
- **B1 — Silhueta e cores**: criar `personagem.js` (carregado antes de `game.js` no `index.html`) com `desenharUnicornio(ctx, x, y, estado, tempo, escala)`; corpo com pescoço/peito/anca, paleta com contraste, contorno de 2–3 px, sombreamento simples. Manter a hitbox igual. Deixar uma constante `USAR_PERSONAGEM_NOVO = true` para comparar com o antigo.
- **B2 — Crina e cauda**: mechas coloridas com `bezierCurveTo` que ondulam com a velocidade.
- **B3 — Animação por partes**: patas com joelho em galope de 4 tempos, estados `correndo`/`subindo`/`caindo`/`pousando`/`dano`, piscar o olho, squash & stretch, inclinação no ar, sombra no chão.
- **B4 — Efeitos do personagem**: rastro em fita de arco-íris (substitui os círculos), estrelinhas da crina, glow pré-renderizado.
Antes de B1, mostre ao usuário a paleta e a descrição do novo visual em 3–4 linhas. Se ele não responder, siga.

### Fase C — Cenário e mundo
- Corrigir artefatos visuais (ex.: polígono/triângulo azul que aparece dentro dos buracos entre plataformas)
- Estrelas: trocar quadradinhos por estrelas redondas/em cruz que piscam, combinando com o estilo do personagem
- Paleta: objeto `PALETA` no topo de `game.js`; trocar cores soltas
- Céu com gradiente que muda devagar com a distância (dia → pôr do sol → noite)
- 3 camadas de parallax (distante, meio, perto) pré-desenhadas em canvas fora da tela
- Plataformas/obstáculos com forma própria: bordas arredondadas, topo com grama/cristal/doce conforme o estilo, sombra embaixo
- Elementos decorativos animados: nuvens, estrelas piscando, flores, borboletas
- Partículas: poeira ao pousar, faíscas ao pular, brilhos ao coletar, explosão de estrelas no game over
- Tremida de tela (screen shake) curta ao bater
- HUD: fonte bonita com fonte de reserva, pontuação com contorno/sombra, ícones
- Tela inicial com título animado e "toque/espaço para começar"; tela de game over com pontuação e recorde

## 5. Performance (obrigatório)
- Partículas em pool reaproveitado (máx. ~150)
- Nada de `shadowBlur` em muitos objetos por frame — pré-renderizar o glow
- Remover do array tudo que sai da tela
- Sem bibliotecas externas, sem baixar imagens

## 6. Final
Resuma em uma lista curta o que mudou em cada fase, sugira tirar um novo `screenshot_fixed.png` e fazer commit no git.
