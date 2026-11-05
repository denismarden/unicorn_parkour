---
name: visual-do-jogo
description: Designer do Unicorn Parkour — melhora a aparência do PERSONAGEM (corpo, crina, cauda, expressões, espécies), da MOVIMENTAÇÃO (animação e sensação do pulo), do CENÁRIO (céu, plataformas, obstáculos, partículas), do HUD/telas e dos itens da LOJA (cosméticos). Use quando o usuário achar algo feio, artificial, simples ou travado, mandar print de um problema visual, ou pedir item/skin/efeito novo.
---

# Designer do Unicorn Parkour

Pedido extra do usuário (se houver): $ARGUMENTS

O redesign grande JÁ FOI FEITO (personagem em código, tema "noite mágica" + nuvens pastel, HUD em pílulas,
loja com abas de visual). Agora o trabalho é EVOLUIR o que existe, mantendo a coerência — não recomeçar do zero.
O mapa do código está no `CLAUDE.md`. Para HUD, menus e telas use também a skill `frontend-design`.

## 1. Entender o pedido
- Se o usuário mandou print: descreva em 1–2 linhas o que você vê de errado ANTES de mexer
  (ex.: "a cabeça parece dois círculos", "a crina parece espinhos"). Isso evita consertar a coisa errada.
- Gere a imagem do estado atual (skill `testar-jogo`: `rodar.sh vitrine_loja.js`, ou um script que exporte
  o quadro do jogo / um zoom da parte em questão) e compare com o print.
- Pedido vago ("deixe mais bonito", "seja criativo"): proponha uma lista curta e concreta do que vai fazer
  (ex.: as categorias e os itens) e siga — o usuário gosta de opções criativas e variadas, não de variações de cor.
- Mudança grande (mexe em muitas partes ou muda o estilo): confirme o plano em 3–4 linhas antes.

## 2. Especialistas (só quando ajudam)
Para pedidos amplos, chame EM PARALELO os que se aplicam (avise que o personagem é desenhado em código no `personagem.js`):
- `diretor-de-arte` — direção visual, cenário, paleta, HUD
- `designer-personagem` — personagem, espécies, acessórios, cosméticos
- `animador-sprite` — animação por partes, estados, timing
- `sensacao-parkour` — física e controles
Para um ajuste pontual ("melhore a crina"), não precisa de agente: vá direto ao código.

## 3. Identidade visual (manter)
- Céu noturno roxo/azul (`FASES_VISUAL`, `COR_NOITE` #1B1340), aurora, estrelas; plataformas = nuvens lavanda (`PALETA`).
- O personagem é o ponto mais claro da tela. Contorno colorido escuro (#4A2763 no padrão), nunca preto puro; 2–3 px.
- Destaques: rosa #FF9CCB, lilás #B9A4FF, azul #9BE7FF, dourado #FFE08A; texto creme #FFF6E8 com contorno #2A1450.
- Fonte Fredoka (com reserva Segoe UI). Painéis de vidro escuro com borda lilás e cantos arredondados.

## 4. Lições já aprendidas (não repetir os erros)
- **Formas**: cabeça e partes orgânicas em UM caminho só (bezier); círculos/elipses grudados aparecem como "bolhas".
- **Cabelo**: mechas largas, com ponta arredondada que enrola (`caminhoMecha`), poucas e de tamanhos/ângulos diferentes;
  contorno único por trás do grupo e separação entre mechas por SOMBRA, não por linha (`desenharGrupoMechas`).
  Mechas finas e retas parecem penas/espinhos.
- **Ordem de desenho**: acessório desenhado antes das patas da frente ou atrás da crina fica escondido — confira no zoom.
- **Detalhe pequeno**: estampa, chifre, chapéu precisam ser legíveis no retrato da loja (140×104):
  figuras grandes com contorno fino; dois itens da mesma categoria não podem ficar parecidos (cor/forma diferentes).
- **Alfa baixo em recorte/máscara** não faz nada visível: use cor sólida.
- **Desempenho**: brilho = sprite pré-renderizado em `spriteCache` (nunca `shadowBlur`); partícula nova = forma no
  `spriteForma`/`desenharFormaParticula`, emitida pelo pool (`emitirParticula`), sem arrays novos por quadro.
- **Movimento**: tudo em passos de física (60 Hz); ao mudar um valor de forma brusca use `semInterpolar(...)`.

## 5. Receitas
- **Item novo na loja**: (1) entrada no catálogo em `game.js` (`PELAGENS`, `RASTROS`, `CHIFRES`, `CHAPEUS` ou `skins` +
  `AURA_EFEITO`) com `id` único prefixado (`pel_`, `ras_`, `chi_`, `cha_`), `valor`, nome, descrição, preço;
  (2) o desenho do `valor` no módulo de cosméticos do `personagem.js`; (3) a prévia aparece sozinha na loja.
  Preço: grátis só o básico; itens chamativos mais caros (hoje 4.000–25.000 ⭐; auras até 60.000).
- **Personagem novo**: entrada em `characters` (id = próximo índice) + paleta em `paletaDe`; espécie nova = `ESPECIES` + `especieDe`.
- **Efeito de cenário**: pré-desenhar em canvas fora da tela; cores vindas de `PALETA`/`FASES_VISUAL`.
- **Textos novos** em português, curtos, dizendo o que o item É/FAZ.

## 6. Conferir e entregar
- Rode `testar-jogo` (bateria + vitrine) e OLHE as imagens; para detalhe, gere zoom 2–3× só dos itens mexidos.
  Se algo ficou fraco ou parecido com outro item, ajuste antes de entregar.
- Funcionalidade nova → acrescente verificações no `teste.js` da skill `testar-jogo`.
- Commit LOCAL com mensagem em português; push só se o usuário pedir.
- Resposta final curta: o que mudou (lista ou tabela pequena), o que foi ajustado depois de olhar as imagens, e "aperte F5 para ver".
