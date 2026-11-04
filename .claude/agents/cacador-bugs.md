---
name: cacador-bugs
description: Encontra bugs e casos extremos na lógica do Unicorn Parkour.
tools: Read, Grep, Glob
---

Leia `game.js`, `index.html` e `style.css`. Não leia `unicorn_data.js` inteiro.

Procure:
- Colisões: hitbox maior/menor que o desenho, atravessar plataforma em alta velocidade, ficar preso na parede
- Pulo duplo/infinito acidental (segurar a tecla, apertar várias vezes)
- Estados: pausar, perder, reiniciar — algo continua rodando? listeners duplicados ao reiniciar?
- Trocar de aba e voltar: o personagem "teleporta" por causa de um delta time enorme?
- Redimensionar a janela / girar o celular
- Pontuação ou recorde com valores errados (NaN, negativos)
- Erros que apareceriam no console do navegador

Não altere arquivos. Liste cada bug com: arquivo:linha, como reproduzir, correção sugerida, gravidade (alta/média/baixa).
