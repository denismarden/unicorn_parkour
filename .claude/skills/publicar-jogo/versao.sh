#!/usr/bin/env bash
# Carimba uma versão nova nos arquivos do jogo dentro do index.html (style.css?v=..., personagem.js?v=..., game.js?v=...).
# Assim o navegador de quem já jogou baixa os arquivos novos em vez de usar a cópia antiga guardada (cache).
#   bash .claude/skills/publicar-jogo/versao.sh   → imprime a versão carimbada (ex.: 2026.11.04-2105)
set -eu
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"
V="$(date +%Y.%m.%d-%H%M)"
sed -i -E \
    -e "s#href=\"style\.css(\?v=[^\"]*)?\"#href=\"style.css?v=$V\"#" \
    -e "s#src=\"personagem\.js(\?v=[^\"]*)?\"#src=\"personagem.js?v=$V\"#" \
    -e "s#src=\"game\.js(\?v=[^\"]*)?\"#src=\"game.js?v=$V\"#" \
    "$RAIZ/index.html"
n=$(grep -c "?v=$V" "$RAIZ/index.html")
[ "$n" -eq 3 ] || { echo "ERRO: esperava 3 arquivos carimbados no index.html, achei $n"; exit 1; }
echo "$V"
