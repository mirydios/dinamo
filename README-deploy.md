# Dínamo Sombrio — Deploy na VPS

Jogo de terror em HTML único, servido por nginx em um container leve (~10 MB de imagem base, ~64 MB de RAM no máximo).

## Estrutura

```
dinamo-sombrio/
├── Dockerfile           # nginx:alpine + o jogo
├── nginx.conf           # gzip, cache e headers de segurança
├── docker-compose.yml   # porta 8090, limites de recursos
└── site/
    └── index.html       # o jogo completo (um arquivo só)
```

## Passo a passo

**1. Envie a pasta para a VPS**

```bash
scp -r dinamo-sombrio/ usuario@SEU_IP:~/
```

**2. Entre na pasta e suba o container**

```bash
cd ~/dinamo-sombrio
docker compose up -d --build
```

**3. Teste**

```bash
curl -I http://localhost:8090
# Esperado: HTTP/1.1 200 OK

docker ps --filter name=dinamo-sombrio
# Esperado: status "healthy" após ~30s
```

**4. Acesse no navegador**

```
http://SEU_IP:8090
```

> Se a VPS tiver firewall (ufw), libere a porta:
> `sudo ufw allow 8090/tcp`

## Usando domínio + HTTPS (opcional)

Se você já roda Traefik na VPS (comum em setups com n8n), abra o
`docker-compose.yml`, remova o bloco `ports:` e descomente o bloco de
`labels:` e `networks:`, ajustando:

- `jogo.seudominio.com.br` → seu subdomínio (com DNS apontando para a VPS)
- `traefik` → o nome real da rede externa do seu Traefik
- `letsencrypt` → o nome do seu certresolver

Depois: `docker compose up -d --build` de novo.

Se usar **Nginx Proxy Manager** em vez de Traefik: mantenha o `ports:`
como está e crie um Proxy Host apontando para `IP_DA_VPS:8090`.

## Atualizar o jogo

Substitua `site/index.html` pela nova versão e:

```bash
docker compose up -d --build
```

## Remover

```bash
docker compose down
docker rmi dinamo-sombrio:1.0
```
