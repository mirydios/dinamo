# 🕯️ DÍNAMO SOMBRIO

> *Usina Nº 7 — Três Noites — 1923*

Jogo de terror para navegador em arquivo HTML único. Gire as manivelas do velho dínamo para manter as luzes acesas — porque **aquilo que vive no escuro** só precisa de um momento de fraqueza para entrar.

![Versão](https://img.shields.io/badge/versão-1.2-b87333?style=flat-square)
![HTML](https://img.shields.io/badge/tecnologia-HTML%20único-ffb347?style=flat-square)
![Offline](https://img.shields.io/badge/offline-sim-6e3b1f?style=flat-square)
![Mobile](https://img.shields.io/badge/mobile-primeira%20classe-8b0000?style=flat-square)

---

## 🎮 Como Jogar

### Controles

| Ação | Teclado | Mobile |
|---|---|---|
| Girar manivela | `←` / `→` ou `A` / `D` (alternando) | Tocar alternando os dois lados da tela |
| Trocar fusível | Segurar `E` por 2,4s | Segurar o botão na tela |

> **Dica de ritmo:** alternâncias com menos de 220ms rendem um bônus de 25% de força. Mantenha o ritmo!

### Objetivo

Sobreviva às **3 noites** na Usina Nº 7. Cada noite é mais longa e mais difícil que a anterior. O turno começa ao amanhecer.

---

## ⚙️ Mecânicas

### Carga & Luz
A **carga** do dínamo (0–100%) controla a intensidade da luz. A luz decai constantemente — você precisa girar a manivela para recarregar. Se a carga cair abaixo de **35%**, a criatura começa a se aproximar.

### A Criatura
A **proximidade** (0–100%) representa o quanto ela está perto. Quando chega a 100%: jumpscare e derrota. Luz forte a faz recuar. Abaixo de 8% de proximidade, ela some.

### Fusíveis
Em intervalos aleatórios, um **fusível queima**. Com o fusível queimado, a manivela transfere apenas **18% da força normal**. Para trocar: segure `E` (ou o botão) por **2,4 segundos** sem soltar — mas enquanto troca, você não pode girar a manivela.

### Superaquecimento
Manter a carga acima de **78%** esquenta o dínamo. Quando a temperatura atinge 100%, o dínamo **trava** — a manivela emperra, vapor sai, a carga despenca. Ao destravar, a temperatura volta para 45%.

### Sobrecargas
Eventos aleatórios geram **arcos elétricos** que aumentam o decaimento da carga e reduzem a força da manivela pela metade por alguns segundos.

### Progressão por Noite

| Noite | Duração | Fusíveis | Velocidade da Criatura | Aquecimento |
|---|---|---|---|---|
| 1 | 3:00 | Raros (38–55s) | Lento | Moderado |
| 2 | 3:30 | Frequentes (26–40s) | Médio | Alto |
| 3 | 4:00 | Muito frequentes (18–30s) | Rápido | Máximo |

---

## 📜 Narrativa

Antes de cada noite, você encontra um bilhete deixado pelo **Operador R. Menezes** — o homem que trabalhou na Usina Nº 7 antes de você. Os três bilhetes revelam, em ordem crescente de desespero, o que aconteceu com ele.

---

## ★ Achievements

O jogo possui **8 conquistas** persistidas em `localStorage`, exibidas na tela inicial.

| Ícone | Nome | Condição |
|---|---|---|
| 🕯️ | **SOBREVIVENTE** | Completar as 3 noites pela primeira vez |
| ⚙️ | **VETERANO** | Completar as 3 noites 3 vezes |
| ❄️ | **SANGUE FRIO** | Completar uma noite sem a temperatura passar de 60% |
| ⚡ | **NO FIO** | Sobreviver 10 segundos contínuos com carga abaixo de 10% |
| 🔩 | **MÃO RÁPIDA** | Manter ritmo acelerado (<220ms) por 30 segundos consecutivos |
| 🔌 | **IMPROVISO** | Completar uma noite sem trocar o fusível |
| 👁️ | **FACE DAS TREVAS** | Deixar a proximidade chegar a 90% e ainda assim sobreviver |
| 🌅 | **ÚLTIMA LUZ** | Sobreviver à noite 3 |

---

## 🔊 Áudio

Todo o áudio é **gerado em tempo real** via Web Audio API — nenhum arquivo de som externo.

- **Zumbido do dínamo** (oscilador sawtooth + filtro lowpass): volume e pitch seguem a carga
- **Drone grave 34Hz**: volume segue a proximidade da criatura
- **Passos posicionais** (StereoPanner): vindos do lado onde os olhos surgiram, acelerando com a proximidade
- **Respiração da criatura** (ruído bandpass 380Hz + LFO): surge próximo de 25% e ofega mais rápido quando perto
- **Efeitos de ação**: cliques de manivela, estalo de fusível, som de travamento, sting de morte, som de achievement

---

## 🎨 Visual

Renderizado inteiramente em **Canvas 2D**, sem bibliotecas externas.

- Lâmpada pendurada com raio de luz proporcional à carga, com flicker constante
- Dínamo com estator de 8 bobinas de cobre, rotor giratório e manivela
- Caixa de fusíveis na parede (acende vermelho quando queima)
- Olhos no escuro que avançam ao centro conforme a proximidade
- Vinheta dinâmica, tremor de tela, faíscas, vapor e arcos elétricos
- Brilho incandescente no corpo do dínamo quando quente

**Paleta:**
```
Preto      #070605    Tungstênio  #ffb347
Cobre      #b87333    Ferrugem    #6e3b1f
Sangue     #8b0000    Calor       #ff5a2a
```

---

## 🐳 Deploy com Docker

O projeto inclui infraestrutura pronta para deploy em VPS com Docker.

### Pré-requisitos
- Docker e Docker Compose instalados
- Porta 8090 disponível

### Subir o container

```bash
git clone https://github.com/mirydios/dinamo.git
cd dinamo
docker compose up -d
```

O jogo estará disponível em: `http://seu-servidor:8090`

### Configuração do container

```yaml
# docker-compose.yml (resumo)
services:
  dinamo:
    image: nginx:1.27-alpine
    ports:
      - "8090:80"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 64M
          cpus: "0.25"
```

Os limites de recursos são conservadores para conviver com outros serviços (n8n, PostgreSQL) na mesma VPS.

### Traefik + HTTPS

O `docker-compose.yml` inclui um bloco Traefik comentado para expor o jogo em um domínio com HTTPS automático. Consulte o arquivo [README-deploy.md](./README-deploy.md) para instruções detalhadas.

---

## 🗂️ Estrutura do Projeto

```
dinamo/
├── site/
│   └── index.html              # O jogo completo (HTML único, ~33KB)
├── Dockerfile                  # Imagem nginx:1.27-alpine
├── docker-compose.yml          # Serviço + limites de recurso + bloco Traefik
├── nginx.conf                  # Gzip, headers de segurança, cache
├── instrucoes-projeto-dinamo.md# Memória do projeto (estado, roadmap, changelog)
└── README.md                   # Este arquivo
```

> O jogo é **um único arquivo HTML** sem dependências externas. Funciona offline, em qualquer navegador moderno, direto com duplo clique.

---

## 📋 Changelog

| Versão | Destaques |
|---|---|
| **v1.3** | Chuva procedural + gotas visuais; trovões + relâmpago; epílogo cinematográfico typewriter; 8 eventos aleatórios de susto |
| **v1.2** | Bilhetes narrativos do Operador R. Menezes; 8 achievements com toasts; balanceamento fino do superaquecimento |
| **v1.1** | Passos e respiração posicionais (StereoPanner); recordes por noite em localStorage |
| **v1.0** | 3 noites progressivas; fusíveis; superaquecimento; sobrecargas; container Docker |
| **v0.1** | Protótipo: manivela, carga, luz, criatura, 1 noite |

---

## 🗺️ Roadmap

- [ ] Sala com profundidade visual (paredes, janelas, canos no canvas)
- [ ] Silhueta da criatura em alta proximidade
- [ ] Modo Hard: sem HUD (perceber a carga apenas pela intensidade da luz)
- [ ] Objeto coletável por noite (fragmentos da história do Menezes)
- [ ] Modo cooperativo local (dois jogadores, mesmo teclado)
- [ ] Segunda sala / gerador auxiliar que precisa ser religado no escuro
- [ ] Balanceamento contínuo baseado em feedback real de jogo

---

## 🛠️ Convenções de Código

- **Arquivo único** — vanilla JS, IIFE, sem frameworks ou build tools
- **Estado central** no objeto `S`; parâmetros de dificuldade no array `NOITES`
- **Texto do jogo** em pt-BR; variáveis e comentários em pt-BR
- `prefers-reduced-motion` respeitado nas animações CSS

---

## 📄 Licença

Projeto pessoal. Uso e modificação livres para fins não comerciais.
