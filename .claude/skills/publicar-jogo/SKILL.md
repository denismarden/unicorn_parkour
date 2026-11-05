---
name: publicar-jogo
description: Publica a versão atual do Unicorn Parkour no site https://denismarden.github.io/unicorn_parkour/ (GitHub Pages) com segurança — testa, confere o placar, atualiza a foto, carimba a versão contra cache, sincroniza com o GitHub, faz push e confere o site no ar. Use quando o usuário pedir para publicar, subir, atualizar o site, fazer deploy ou push.
---

# Publicar o Unicorn Parkour

Pedido extra do usuário (se houver): $ARGUMENTS

Site: https://denismarden.github.io/unicorn_parkour/ — servido pelo GitHub Pages direto da branch `main` (raiz).
Git fora do PATH: `G="/c/Program Files/Git/cmd/git.exe"`. Não há `gh`. Todos os comandos no Git Bash, na raiz do projeto.

Publicar deixa a versão pública para todos os jogadores. Se o usuário chamou esta skill (ou pediu "publica", "sobe",
"faz o push"), isso é a autorização. Se foi você que pensou em publicar, pergunte antes.

## 1. Pré-voo (pare no primeiro problema e explique ao usuário)
1. Mudanças não commitadas: `"$G" status --short`. Se houver mudanças do jogo, pergunte se entram nesta publicação
   (se sim, commit com mensagem em português). Nunca publique arquivo pela metade.
2. Testes: `bash .claude/skills/testar-jogo/rodar.sh` → tudo `OK` e `ERROS JS: []`. Falhou = não publica.
3. Placar protegido: `curl -s -X PUT -d 'null' -w ' %{http_code}' "https://unicornparkour-8f6a2-default-rtdb.firebaseio.com/_checagem_regras.json"`
   precisa responder **401 Permission denied** (as regras do `database.rules.json` estão publicadas).
   Se responder 200, o placar está aberto: avise e mostre como publicar as regras
   (console do Firebase → projeto unicornparkour-8f6a2 → Realtime Database → Regras → colar `database.rules.json` → Publicar).
   Se o `database.rules.json` mudou desde a última publicação, lembre o usuário de republicá-lo no console.

## 2. Sincronizar com o GitHub (o usuário às vezes sobe arquivos pelo site do GitHub)
```bash
"$G" fetch origin
"$G" rev-list --count main..origin/main      # commits que só existem no GitHub
```
- 0 → siga.
- Mais de 0 → para cada arquivo que esses commits mudaram, compare com o local:
  `B=$("$G" merge-base main origin/main); for f in $("$G" diff --name-only $B origin/main); do "$G" diff --quiet origin/main main -- "$f" && echo "$f igual" || echo "$f DIFERENTE"; done`
  - Tudo igual (upload da mesma versão) → `"$G" merge origin/main -m "Sincroniza com os envios feitos pelo site do GitHub"`;
    em conflito, fique com a versão local (`"$G" checkout --ours <arquivo>`) — o conteúdo do GitHub já está nela.
  - Algum DIFERENTE → NÃO resolva sozinho: mostre ao usuário o que mudou no GitHub (`"$G" diff main origin/main -- <arquivo> | head -60`)
    e pergunte qual versão fica. Nunca use `push --force`.

## 3. Preparar a versão
1. Foto nova: `bash .claude/skills/testar-jogo/rodar.sh .claude/skills/publicar-jogo/foto_jogo.js` → abra o PNG e olhe;
   se estiver boa, copie por cima do `screenshot_fixed.png` (`cp "<caminho impresso>" screenshot_fixed.png`, convertendo o caminho com `cygpath -u`).
2. Carimbo contra cache: `V=$(bash .claude/skills/publicar-jogo/versao.sh)` — põe `?v=$V` no style.css, personagem.js e game.js
   do `index.html`, para quem já jogou baixar os arquivos novos.
3. Rode os testes de novo (o `index.html` mudou) e faça o commit: `Publica versão $V` + no corpo a lista do que mudou para o jogador.

## 4. Publicar
- `"$G" push origin main`. Se pedir login, o Git Credential Manager abre uma janela do navegador: peça ao usuário para
  entrar na conta do GitHub e tente de novo. Se o push for recusado (o GitHub andou), volte ao passo 2 — nunca force.
- `bash .claude/skills/publicar-jogo/conferir_site.sh "$V"` (rode em segundo plano; leva 1–5 min).
  Ele espera o site mostrar a versão nova e confere se os 4 arquivos respondem 200.

## 5. Contar ao usuário (curto, em português)
- Link do site, a versão `$V` e o que mudou para o jogador (3–6 itens, linguagem de jogador, não de código —
  ex.: "Loja com pelagens, rastros, chifres e chapéus", não "refatorei desenharRetrato").
- Avisos que existirem (regras do Firebase, arquivos que estavam diferentes no GitHub).
- Dica: quem estiver com o jogo aberto precisa recarregar a página (F5) para ver a versão nova.
