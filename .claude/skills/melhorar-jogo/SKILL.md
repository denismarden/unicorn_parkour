---
name: melhorar-jogo
description: Analisa o Unicorn Parkour e propõe/aplica melhorias de sensação do pulo, gameplay, performance, bugs e animação do personagem usando agentes especialistas. Use quando o usuário pedir para melhorar, revisar, otimizar, achar bugs ou deixar o jogo mais divertido (para aparência/visual use a skill visual-do-jogo).
---

# Melhorar o Unicorn Parkour

Objetivo extra do usuário (se houver): $ARGUMENTS

## 1. Contexto (rápido)
- Leia `CLAUDE.md`: ele tem o mapa do código (onde fica cada coisa) e as regras. Não leia `game.js`/`personagem.js` inteiros.
- Rode a bateria de testes (skill `testar-jogo`) ANTES de mudar algo: assim você sabe o que já passava.
- Veja `git log --oneline -15` para não propor de novo algo que já foi feito.

## 2. Especialistas EM PARALELO
Chame numa única mensagem, passando a cada um o objetivo do usuário e a frase
"o mapa do código está no CLAUDE.md; o personagem é desenhado em código no personagem.js"
e a lista dos commits recentes (os agentes não têm terminal para ver o git):
- `sensacao-parkour` — pulo, controles, física
- `designer-fases` — obstáculos, dificuldade, progressão, recompensas, loja
- `analista-performance` — FPS e memória
- `cacador-bugs` — bugs e casos extremos
- `animador-sprite` — animação do personagem
Se o objetivo do usuário for de uma área só (ex.: "o pulo está estranho"), chame só os especialistas dessa área.

## 3. Juntar e conferir
- Uma tabela, sem itens repetidos: `# | Melhoria | Área | Impacto (alto/médio/baixo) | Esforço (P/M/G)`,
  ordenada por maior impacto e menor esforço. No máximo ~12 linhas: corte o que for fraco.
- Antes de mostrar, confira no código cada bug relatado (abra o arquivo:linha). Os agentes às vezes
  apontam algo que já foi corrigido ou que não acontece: tire esses da lista.

## 4. Perguntar
Mostre a tabela e pergunte quais números aplicar. Ofereça explicitamente "todas" como resposta.
Se a ferramenta de pergunta for recusada, pergunte em texto simples e espere.

## 5. Aplicar
- Itens aprovados um por vez, mudança mínima. Valores ajustáveis viram constantes no topo de `game.js` com comentário em português.
- Itens grandes (mexem em muitas partes): mostre o plano em 3–4 linhas antes (regra do CLAUDE.md).
- Depois de cada item: rode `testar-jogo`. Se o item mexe em desenho, gere uma imagem e OLHE.
  Se o teste antigo quebrou porque a regra mudou de propósito, atualize o teste; se não, conserte o código.
- Ao terminar: diga em uma linha por item o que mudou e como perceber no navegador (F5).

## 6. Fechar
Faça commit LOCAL (mensagem em português, resumindo os itens). Push só se o usuário pedir.
