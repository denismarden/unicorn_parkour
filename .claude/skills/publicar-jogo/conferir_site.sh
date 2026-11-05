#!/usr/bin/env bash
# Espera o GitHub Pages publicar a versão nova (até ~6 min) e confere os arquivos do site.
#   bash .claude/skills/publicar-jogo/conferir_site.sh 2026.11.04-2105
set -u
V="${1:?informe a versão carimbada pelo versao.sh}"
SITE="https://denismarden.github.io/unicorn_parkour"
for i in $(seq 1 36); do
    if curl -s -H 'Cache-Control: no-cache' "$SITE/index.html?nocache=$RANDOM" | grep -q "game.js?v=$V"; then
        echo "SITE ATUALIZADO com a versão $V (após ~$((i * 10)) s)"
        for f in index.html style.css personagem.js game.js; do
            printf '  %-14s HTTP %s\n' "$f" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/$f?v=$V")"
        done
        exit 0
    fi
    sleep 10
done
echo "O site ainda não mostra a versão $V depois de 6 min."
echo "Veja em https://github.com/denismarden/unicorn_parkour/actions se a publicação do Pages falhou."
exit 1
