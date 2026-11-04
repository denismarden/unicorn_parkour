---
name: melhorar-jogo
description: Analisa o Unicorn Parkour e propõe/aplica melhorias de sensação do pulo, gameplay, performance, bugs e animação do unicórnio usando agentes especialistas. Use quando o usuário pedir para melhorar, revisar, otimizar ou deixar o jogo mais divertido.
---

# Melhorar o Unicorn Parkour

Objetivo extra do usuário (se houver): $ARGUMENTS

## Passos

1. Leia `CLAUDE.md`, `index.html` e `game.js` para entender o loop, a física do pulo, as colisões e como o sprite é desenhado.
   NÃO leia `unicorn_data.js` inteiro (pode ser enorme, com base64) — só as primeiras ~30 linhas.

2. Chame EM PARALELO estes agentes, passando o objetivo do usuário a cada um:
   - `sensacao-parkour` — pulo, controles, física
   - `designer-fases` — obstáculos, dificuldade, progressão, recompensas
   - `analista-performance` — FPS e uso de memória
   - `cacador-bugs` — bugs e casos extremos
   - `animador-sprite` — animação e visual do unicórnio

3. Junte os relatórios em UMA tabela, sem repetir itens, com as colunas:
   `# | Melhoria | Área | Impacto (alto/médio/baixo) | Esforço (P/M/G)`
   Ordene por maior impacto e menor esforço primeiro.

4. Mostre a tabela e pergunte ao usuário quais números aplicar.

5. Aplique só os itens aprovados, um por vez:
   - faça a mudança mínima necessária em `game.js` / `style.css` / `index.html`
   - depois de cada item, diga em uma linha o que mudou e como testar no navegador
   - valores de ajuste (gravidade, força do pulo, velocidade) devem virar constantes no topo de `game.js`

6. No final, sugira ao usuário fazer um commit no git.
