#!/usr/bin/env bash
# Roda um script de teste dentro do jogo, no Chrome headless (Git Bash, Windows).
#   bash .claude/skills/testar-jogo/rodar.sh                 → teste.js (bateria completa)
#   bash .claude/skills/testar-jogo/rodar.sh vitrine_loja.js → salva vitrine_loja.png
#   bash .claude/skills/testar-jogo/rodar.sh meu.js 412      → mede o layout dentro de um iframe de 412 px (celular)
#   ORCAMENTO=260000 bash .claude/skills/testar-jogo/rodar.sh meu.js → simulação mais longa (tempo virtual em ms; padrão 90000)
# O script de teste escreve o resultado em <body data-res="..."> e, se quiser uma imagem, em <body data-img="data:image/png;base64,...">.
# Saída: o texto de data-res; a imagem vai para a pasta temporária (o caminho é impresso).
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../../.." && pwd)"
SCRIPT="${1:-teste.js}"
LARGURA="${2:-}"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -f "$CHROME" ] || CHROME="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
[ -f "$SCRIPT" ] || SCRIPT="$AQUI/$SCRIPT"
[ -f "$SCRIPT" ] || { echo "script não encontrado: $1"; exit 1; }

TMP="$(mktemp -d)"
cp "$SCRIPT" "$TMP/teste_atual.js"
B="file:///$(cygpath -m "$RAIZ")"

# Página de teste = index.html ATUAL + coletor de erros + rAF trocado por setTimeout (no headless o rAF não dispara)
POLY="<script>window.__erros=[];window.onerror=function(m,s,l,c){window.__erros.push(m+' @'+l+':'+c);};window.requestAnimationFrame=function(cb){return setTimeout(function(){cb(performance.now());},16);};window.cancelAnimationFrame=clearTimeout;</script>"
# (aceita o carimbo de versão "?v=..." que o publicar-jogo põe no index.html)
sed -E -e "s|href=\"style\.css(\?v=[^\"]*)?\"|href=\"$B/style.css\"|" \
    -e "s|<script src=\"personagem\.js(\?v=[^\"]*)?\"></script>|$POLY<script src=\"$B/personagem.js\"></script>|" \
    -e "s|<script src=\"game\.js(\?v=[^\"]*)?\"></script>|<script src=\"$B/game.js\"></script><script src=\"teste_atual.js\"></script>|" \
    "$RAIZ/index.html" > "$TMP/pagina.html"
grep -q "teste_atual.js" "$TMP/pagina.html" || { echo "ERRO: não achei as tags de script no index.html"; exit 1; }

ALVO="pagina.html"
if [ -n "$LARGURA" ]; then   # moldura com largura fixa: --window-size não vale no --dump-dom
    cat > "$TMP/moldura.html" <<EOF
<!DOCTYPE html><html><body style="margin:0"><iframe id="f" src="pagina.html" style="width:${LARGURA}px;height:860px;border:0"></iframe>
<script>setTimeout(function(){var d=document.getElementById('f').contentDocument.body;['data-res','data-img'].forEach(function(a){if(d.hasAttribute(a))document.body.setAttribute(a,d.getAttribute(a));});},20000);</script></body></html>
EOF
    ALVO="moldura.html"
fi

W="$(cygpath -w "$TMP")"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="$W\\perfil" \
    --virtual-time-budget=${ORCAMENTO:-90000} --dump-dom "file:///$W\\$ALVO" 2>/dev/null > "$TMP/saida.html"

# data-res (pode ter várias linhas)
awk '/data-res="/{f=1} f{print} f&&/"( |>)/{exit}' "$TMP/saida.html" | sed 's/.*data-res="//; s/"[ >].*//; s/&quot;/"/g; s/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g'
# data-img → PNG
if grep -q 'data-img="data:image/png;base64,' "$TMP/saida.html"; then
    NOME="$(basename "$SCRIPT" .js).png"
    grep -o 'data-img="data:image/png;base64,[^"]*"' "$TMP/saida.html" | sed 's/data-img="data:image\/png;base64,//; s/"$//' | base64 -d > "$TMP/$NOME"
    echo "IMAGEM: $(cygpath -w "$TMP/$NOME")"
fi
