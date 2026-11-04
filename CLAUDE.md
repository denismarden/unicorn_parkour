# Unicorn Parkour

Jogo web de plataforma/parkour com um unicórnio, feito em HTML + CSS + JavaScript puro (sem build).

## Arquivos
- `index.html` — página que carrega o jogo
- `style.css` — estilos da página/HUD
- `game.js` — lógica principal: loop, física, pulo, colisões, obstáculos, pontuação, desenho
- `unicorn_data.js` — dados do sprite/animação do unicórnio (pode conter imagem em base64 — NÃO ler o arquivo inteiro; use Grep ou leia só as primeiras linhas)
- `unicorn_spritesheet_*.png` / `unicorn.png` — imagens do personagem
- `process_img.ps1` — script PowerShell (Windows) usado para processar as imagens do sprite
- `screenshot_fixed.png` — captura de tela de referência

## Como rodar
Abrir `index.html` no navegador (ou usar a extensão Live Server do VS Code).

## Regras
- Manter o jogo sem dependências externas e sem etapa de build.
- Comentários e textos do jogo em português.
- Antes de mudanças grandes, confirmar com o usuário.
