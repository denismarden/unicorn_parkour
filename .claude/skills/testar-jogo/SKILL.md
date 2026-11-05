---
name: testar-jogo
description: Testa o Unicorn Parkour automaticamente no Chrome headless (bateria de testes da física, menus e loja) e gera imagens para conferir o visual (vitrine de todos os personagens e itens da loja, quadros do jogo). Use depois de QUALQUER mudança no jogo, antes de dizer que terminou ou de fazer commit, e quando o usuário pedir para testar ou conferir.
---

# Testar o Unicorn Parkour

Nesta máquina não há Node. O jogo é testado no Chrome headless com o `rodar.sh` desta pasta
(Git Bash; ele monta a página de teste a partir do `index.html` atual, então elementos novos já entram).

## 1. Bateria de testes (sempre)
```bash
bash .claude/skills/testar-jogo/rodar.sh
```
- Imprime uma linha `OK` / `FALHA` por verificação e no fim `ERROS JS: [...]` (precisa ser `[]`).
- Leva ~10 s. Hoje são 53 verificações (pulo, pausa, dash, slam, coyote, fases, placar, loja, cosméticos…).
- Se uma verificação antiga falhar por causa de uma mudança DE PROPÓSITO (ex.: regra do jogo mudou),
  atualize o teste em `teste.js` e diga isso ao usuário; nunca apague um teste só para passar.
- Funcionalidade nova → acrescente verificações em `teste.js` (padrão: `ok(condição, 'descrição em português')`),
  antes do bloco "personagens alternativos desenham sem erro".

## 2. Conferir o visual (quando mexer em desenho, loja ou personagem)
```bash
bash .claude/skills/testar-jogo/rodar.sh vitrine_loja.js
```
Gera `vitrine_loja.png` (o caminho é impresso) com o retrato de todos os personagens e de cada item
das abas da loja. Abra a imagem com Read e olhe de verdade: algo sumido, igual a outro item, fraco demais, fora do lugar?
Para ver detalhe pequeno (cabelo, chifre, chapéu), escreva um script parecido que desenhe só os itens
que interessam em tamanho maior (escala 2–3×) — a vitrine inteira reduzida esconde defeitos.

## 3. Scripts próprios
Qualquer `.js` pode ser passado: ele roda depois do `game.js`, com acesso a todas as variáveis globais do jogo.
- Resultado em texto: `document.body.setAttribute('data-res', texto)`
- Imagem: `document.body.setAttribute('data-img', canvas.toDataURL())` → vira PNG
- Para um quadro do jogo: inicie (`btnStart.click()`), espere com `setTimeout`, e exporte `canvas.toDataURL()`
  do `#game-canvas` — NÃO use `--screenshot` (ele redimensiona a janela e o canvas é limpo).
- Layout de celular: `bash rodar.sh meu.js 400` roda dentro de um iframe de 400 px de largura
  (`--window-size` não vale para o resultado do DOM). Meça com `getBoundingClientRect()`/`scrollWidth`.

## Pegadinhas do headless (não são bugs do jogo)
- `requestAnimationFrame` não dispara → o `rodar.sh` troca por `setTimeout(16)`.
- Animações CSS ficam paradas no 0 ms → no script: `document.getAnimations().forEach(a => a.finish())`.
- `scrollTo({behavior:'smooth'})` não anda → para testar rolagem, defina `scrollTop` direto.
- `confirm`/`alert` travariam → no script substitua: `window.confirm = () => true; window.alert = () => {}`.
- O perfil do Chrome é temporário: o localStorage real do usuário nunca é tocado.

## Ao terminar
Diga ao usuário em 1 linha quantos testes passaram e se houve erro de JS; mostre o que viu na imagem só se algo chamou atenção.
