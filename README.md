# 🕯️ DÍNAMO SOMBRIO: FUGA

> *Usina Nº 7 — Três Noites e a Fuga*

Jogo de terror para navegador em arquivo HTML único, agora acompanhado de um backend PostgreSQL + Node.js para ranking global de jogadores. Sobreviva à manutenção do velho dínamo e fuja pelos corredores escuros até o elevador.

![Versão](https://img.shields.io/badge/versão-2.0-b87333?style=flat-square)
![Stack](https://img.shields.io/badge/tecnologia-HTML%20+%20Express%20+%20PG-ffb347?style=flat-square)
![Mobile](https://img.shields.io/badge/mobile-primeira%20classe-8b0000?style=flat-square)

---

## 🎮 Como Jogar (Fases)

### Fase 1: O Dínamo
- **Girar manivela:** `←` / `→` (ou `A` / `D`) alternando ou tocando nos cantos da tela.
- **Trocar fusível:** Segure `E` (ou toque no botão de alerta) por 2,4s.
Sobreviva às 3 noites girando a manivela para gerar luz e afastar a criatura. 

### Fase 2: O Corredor Escuro
- **Mover-se:** Setas do teclado ou `W` `A` `S` `D` (ou botões direcionais no mobile).
- **Bombear Óleo:** Pressione `ESPAÇO` (ou toque no centro do d-pad) para colocar óleo na lanterna.
Fuja pelos corredores da usina. Quanto mais escuro (menos óleo), mais rápido a criatura te alcança. Você não pode andar enquanto bombeia óleo.

### Fase 3: O Poço do Elevador
- **Girar manivela (subir):** `←` / `→` alternando ou tocando.
- **Puxar freio:** Segure `E` para frear.
Cuidado com a **tensão do cabo**. Se girar rápido demais, o cabo arrebenta. Se girar devagar demais, a gravidade e a criatura te alcançam pelo fosso.

> **Regra Crucial:** O jogo não possui continues! Uma morte em qualquer etapa reinicia seu turno inteiro a partir da Fase 1, mas sua pontuação será enviada ao Ranking Global no ponto de morte.

---

## 🏆 Ranking Global
A v2.0 introduz o painel global de Operadores da Usina Nº 7! 
A pontuação é unificada e calcula o tempo sobrevivente acrescido do bônus de noites completas. O ranking indica também a última `Fase Máxima` alcançada com ícones (⚙️ Dínamo, 🕯️ Corredor, ⛓️ Elevador).

---

## 🐳 Infraestrutura e Deploy (Docker)

O projeto é mantido por 3 containers Docker:
1. `postgres` (Banco de dados de ranking)
2. `node-api` (API de submissão Express / Node.js)
3. `nginx` (Frontend / site)

Para iniciar todos localmente:
```bash
git clone https://github.com/mirydios/dinamo.git
cd dinamo
docker compose up -d --build
```
Acesse `http://localhost:8090` (ou sua URL de produção) no navegador. O Docker rodará automaticamente a seed/migration no banco de dados.

---

## 📋 Changelog

| Versão | Destaques |
|---|---|
| **v2.0** | Fuga (Fase 2: Corredor e Fase 3: Elevador), Arquitetura Modular de Fases, Banco de Dados PostgreSQL, Ranking Global na tela inicial |
| **v1.4** | Integração Node.js + Express para Pontuações Globais |
| **v1.3** | Chuva procedural, trovões, relâmpago; eventos de susto aleatórios |
| **v1.2** | Bilhetes narrativos do Operador; achievements com toasts |
| **v1.0** | 3 noites do Dínamo; fusíveis; superaquecimento |

---

## 📄 Licença
Projeto pessoal. Uso e modificação livres para fins não comerciais.
