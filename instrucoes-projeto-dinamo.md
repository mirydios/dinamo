# PROJETO: Dínamo Sombrio

Jogo de terror para navegador, em HTML único, com a dinâmica central de girar
manivelas de um dínamo antigo para manter as luzes acesas e afastar a criatura
que vive no escuro. Ambientação: Usina Nº 7, ano 1923.

## Como usar este documento

Este arquivo é a memória do projeto. Ao iniciar uma nova conversa dentro do
Projeto, o Claude deve ler este documento para saber o estado atual, as
decisões já tomadas e o que vem a seguir. Sempre que uma versão nova for
concluída, atualizar a seção "Estado atual" e o "Changelog".

## Instruções de trabalho (preferências do dono do projeto)

- Comunicação em português do Brasil, linguagem humana e direta.
- Explicar passo a passo, sem despejar tudo de uma vez ("vamos por partes").
- O dono entende de infraestrutura self-hosted (Docker, n8n, PostgreSQL, VPS).
- Entregar sempre o jogo como UM arquivo HTML (site/index.html), sem build
  tools, sem dependências externas — funciona offline e em qualquer navegador.
- Mobile é cidadão de primeira classe: toda mecânica nova precisa funcionar
  com toque, não só teclado.

## Estado atual — v1.3 (atmosfera + epílogo + sustos)

### Mecânicas implementadas
1. **Manivela por alternância**: ← → (ou A/D) no teclado; no celular, tocar
   alternando os dois lados da tela. Ritmo rápido (<220ms) dá bônus de 25%.
2. **Carga (0–100)**: decai constantemente; a intensidade da luz acompanha a
   carga. Abaixo de 35%, a criatura avança (olhos surgem no escuro).
3. **Criatura**: proximidade 0–100. Chegou a 100 → jumpscare e derrota.
   Luz forte faz ela recuar.
4. **3 noites progressivas**: duração 180/210/240s; decaimento, fusíveis e
   velocidade da criatura pioram a cada noite. Derrota recomeça a noite atual.
5. **Fusíveis**: queimam em intervalos aleatórios (raros na noite 1,
   frequentes na 3). Com fusível queimado, a manivela transfere só 18% da
   força. Trocar = segurar [E] ou o botão na tela por 2,4s — sem poder girar
   enquanto isso. Soltar antes perde parte do progresso.
6. **Superaquecimento**: carga acima de 82% aquece o dínamo (taxa cresce por
   noite). Temperatura em 100 → dínamo TRAVA por 3,5–5,5s (manivela emperra,
   vapor, brilho incandescente, carga despenca).
7. **Sobrecargas**: eventos aleatórios com arcos elétricos que aumentam o
   decaimento e reduzem a força da manivela pela metade por alguns segundos.
8. **Recordes (localStorage)**: melhor tempo de sobrevivência por noite
   (noite completa = tempo máximo) e contagem de turnos completos (vitórias).
   Exibidos na tela inicial, na tela de cada noite e na tela de derrota
   (com destaque "★ NOVO RECORDE"). Tudo protegido por try/catch para
   navegadores em modo privado.

### Áudio (Web Audio API, gerado em tempo real — sem arquivos)
- Zumbido do dínamo (sawtooth + lowpass): volume e pitch seguem a carga.
- Drone grave (34Hz): volume segue a proximidade da criatura.
- **Passos posicionais**: graves curtos com StereoPanner, vindos do lado onde
  os olhos surgiram; começam em proximidade >18 e aceleram (2,1s → 0,45s de
  intervalo) conforme a criatura avança. Fallback sem pan se o navegador não
  tiver createStereoPanner.
- **Respiração da criatura**: ruído filtrado (bandpass 380Hz) com "fôlego"
  via LFO; surge em proximidade >25, ofega mais rápido quando perto e
  acompanha o lado da criatura no estéreo.
- Cliques de manivela, estalo de fusível, som de travamento, sting de morte.

### Visual (Canvas 2D)
- Lâmpada pendurada com raio de luz = carga; flicker constante.
- Dínamo: estator com 8 bobinas de cobre, rotor giratório, manivela.
- Caixa de fusíveis na parede (acende vermelho quando queima).
- Olhos no escuro que avançam ao centro conforme a proximidade.
- Vinheta que aperta, tremor de tela, faíscas, vapor, arcos elétricos.
- Paleta: preto #070605, tungstênio #ffb347, cobre #b87333,
  ferrugem #6e3b1f, sangue #8b0000, calor #ff5a2a.
- Tipografia: Courier New monoespaçada, letter-spacing largo (placas de usina).

### Infraestrutura
- Container: nginx:1.27-alpine, healthcheck, gzip, headers de segurança.
- docker-compose: porta 8090, restart unless-stopped, limites 64M RAM /
  0.25 CPU (para conviver com n8n/Postgres na mesma VPS).
- Bloco Traefik pronto (comentado) para domínio + HTTPS.

## Roadmap (ideias aprovadas e candidatas)

### Próximos passos prováveis
- [x] Sons de passos/respiração posicionais quando a criatura se aproxima. (v1.1)
- [x] Tela de recordes (melhor tempo por noite) — localStorage. (v1.1)
- [x] Balanceamento fino do superaquecimento — v1.2. (v1.2)
- [x] Narrativa entre noites (bilhetes do operador anterior). (v1.2)
- [x] Achievements / conquistas — 8 achievements. (v1.2)
- [x] Chuva procedural + trovões + relâmpago visual. (v1.3)
- [x] Epílogo cinematográfico com typewriter após vitória. (v1.3)
- [x] Eventos aleatórios de susto (texto + áudio, sem impacto mecânico). (v1.3)

### Candidatas (discutir antes de implementar)
- [ ] Sala com profundidade visual (paredes, janelas, canos no canvas).
- [ ] Silhueta da criatura em alta proximidade.
- [ ] Modo Hard: sem HUD (perceber carga só pela luz).
- [ ] Modo cooperativo local: dois dínamos, dois jogadores no mesmo teclado.
- [ ] Segunda sala / gerador auxiliar que precisa ser religado no escuro.
- [ ] Objeto coletável por noite (fragmentos da história do Menezes).
- [ ] Balanceamento contínuo baseado em feedback real de jogo.

## Convenções de código
- Arquivo único, vanilla JS, IIFE, sem frameworks.
- Estado central no objeto `S`; parâmetros de dificuldade no array `NOITES`.
- Texto do jogo em pt-BR; nomes de variáveis e comentários em pt-BR.
- `prefers-reduced-motion` respeitado nas animações CSS.

## Changelog
- **v0.1** — protótipo: manivela, carga, luz, criatura, 1 noite de 3 min.
- **v1.0** — 3 noites, fusíveis, superaquecimento, sobrecargas, vapor/calor
  visual, HUD com 2 medidores, container Docker completo.
- **v1.1** — passos e respiração posicionais da criatura (StereoPanner,
  com fallback); recordes por noite + turnos completos em localStorage.
- **v1.2** — bilhetes narrativos do Operador R. Menezes; sistema de 8
  achievements com toasts slide-in; balanceamento do superaquecimento
  (zona perigosa 82→78%, resfriamento 18→20/s, travaDur noite 1 3.5→3.0s).
- **v1.3** — chuva procedural contínua (ruído filtrado, Web Audio API) com
  gotas visuais no canvas; trovões aleatórios (baixo tonal + burst de ruído)
  com 40% de chance de relâmpago (flash branco que ilumina a cena); epílogo
  cinematográfico typewriter com 16 linhas após vencer as 3 noites, revelando
  o destino do Operador Menezes; 8 eventos aleatórios de susto (porta, risca,
  rangido, gemido, queda, respiração) com áudio dedicado e texto centralizado
  — sem impacto mecânico, só atmosfera.
