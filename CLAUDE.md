# Unicorn Parkour

Jogo web de plataforma/parkour com um unicórnio, feito em HTML + CSS + JavaScript puro (sem build).
Tema visual: "noite mágica" (céu roxo/azul escuro, aurora, estrelas) + plataformas de nuvem pastel; fonte Fredoka.

## Arquivos
- `index.html` — página do jogo: canvas, HUD (pílulas em DOM), menus, loja, placar, game over. Carrega `personagem.js` ANTES de `game.js`.
- `style.css` — tema "noite mágica" dos painéis, botões, cards da loja, HUD e versão celular.
- `personagem.js` (~1.800 linhas) — o personagem é DESENHADO EM CÓDIGO (não usa imagem):
  rig por partes (patas com coxa/canela, galope de 4 tempos), espécies (`ESPECIES`: unicórnio, dragão, gato, coelho),
  paletas (`paletaDe`), cabeças em contorno único (`FORMAS`), crina/cauda em mechas (`caminhoMecha`, `desenharGrupoMechas`),
  expressões, acessórios por personagem (`ACESSORIOS`) e o módulo de cosméticos
  (`desenharPelagem`, `MATERIAIS_CHIFRE`, `desenharChapeu`, `desenharRastro`, `spriteForma`) que lê `p.visual`.
- `game.js` (~4.700 linhas) — constantes de ajuste no topo, loop, física, fases (`PHASES`, `FASES_VISUAL`), obstáculos,
  power-ups, partículas, cenário, HUD, missões, loja (personagens, poderes e visual) e placar online.
- `database.rules.json` — regras do Firebase Realtime Database do placar (publicadas à mão no console do Firebase).
- Legado, NÃO usado pelo jogo: `unicorn_data.js` (~4 MB de base64 — nunca ler inteiro), `unicorn.png`,
  `unicorn_spritesheet_*.png`, `process_img.ps1`. `screenshot_fixed.png` é uma captura antiga de referência.

## Como o código funciona (para achar as coisas rápido)
- **Arquivos grandes**: use Grep e leia só o trecho necessário (`offset`/`limit`); não leia `game.js` inteiro.
- **Loop**: passo fixo de física a 60 Hz (`PASSO_FISICA`) com acumulador; o desenho interpola entre passos
  (`renderInterpolado`, `CAMPOS_INTERP`, `alfaRender`). Ao teleportar um valor, chame `semInterpolar('campo')`.
  Toda física conta em "passos" (1 passo = 1/60 s), nunca em frames de tela.
- **Ajustes**: valores de jogo são constantes no topo de `game.js` (`FORCA_PULO`, `GRAVIDADE_BASE`, `PASSOS_COYOTE`…);
  cores do cenário em `PALETA` e `FASES_VISUAL`. Por fase: tema do céu em `obterCenario` (`ceuExtra`: constelação/planeta/ilhas/nebulosa),
  material das plataformas em `materialDaFase` (nuvem/cristal/doce/arco-íris), silhuetas em `decorDaFase`.
- **Desempenho**: partículas em pool fixo (`emitirParticula`, `MAX_PARTICULAS = 150`); brilhos e formas são
  sprites pré-renderizados em cache (`spriteCache`, `spriteLuz`, `spriteEstrelinha`, `spritePoeira`, `spriteForma`).
  Nada de `shadowBlur` nem de criar objetos/gradientes novos a cada quadro.
- **Personagem no jogo**: `player` (criado em `initGame`) com `char` (personagem da loja) e `visual`
  (`{pelagem, rastro, chifre, chapeu}`); desenhado por `desenharUnicornio(ctx, x, y, p, tempo, 1.3)`. A hitbox (50×40) não muda com o visual.
- **Loja**: personagens em `characters` (id = índice; ids 20–22 são dragão/gato/coelho); poderes em `upgrades`;
  visual em abas (`CATEGORIAS_VISUAL`: auras `skins` + `AURA_EFEITO`, `PELAGENS`, `RASTROS`, `CHIFRES`, `CHAPEUS`).
  Retratos dos cards: `desenharRetrato(canvas, char, visual, extra)`.
- **Salvo no navegador (localStorage, prefixo `uniparkour`)**: `GlobalStars` (carteira), `Chars` (personagens comprados),
  `Char` (escolhido), `Skins` (auras e itens de visual comprados), `ActiveSkin` (aura), `Visual` (pelagem/rastro/chifre/chapéu),
  `Upgrades`, `PUDur`, `Mission`, `Recorde`, `Partidas`, `Muted`. Nunca renomear chaves: o progresso dos jogadores se perderia.
- **Placar online**: Firebase REST (`URL_PLACAR`); o jogo só ADICIONA recordes (as regras proíbem apagar/alterar).

## Como rodar e testar
- Jogar: abrir `index.html` no navegador (ou Live Server do VS Code).
- Publicar: skill `publicar-jogo` (testa, sincroniza, carimba versão contra cache, push e confere o site https://denismarden.github.io/unicorn_parkour/).
- Testar: skill `testar-jogo` → `bash .claude/skills/testar-jogo/rodar.sh` (bateria de testes no Chrome headless)
  e `rodar.sh vitrine_loja.js` (imagem com todos os personagens e itens). Rodar depois de toda mudança.

## Regras
- Sem dependências externas e sem etapa de build. Exceção permitida: fontes do Google Fonts (com fonte de reserva).
- Comentários e textos do jogo em português; respostas ao usuário em português, curtas.
- Antes de mudanças grandes, confirmar com o usuário (mostrar o plano em poucas linhas).
- Git: fazer commit LOCAL ao terminar cada pedido (mensagem em português). Push para o GitHub
  (https://github.com/denismarden/unicorn_parkour) só quando o usuário pedir. O git não está no PATH:
  usar `"/c/Program Files/Git/cmd/git.exe"` (Git Bash).
