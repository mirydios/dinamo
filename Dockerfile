# Estágio de build do frontend Vite
FROM node:20-alpine AS build
WORKDIR /app
COPY site/package*.json ./
RUN npm install
COPY site/ ./
RUN npm run build

# Estágio de deploy com Nginx
FROM nginx:1.27-alpine

# Limpa o HTML padrao do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os arquivos de build gerados pelo Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuracao
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
