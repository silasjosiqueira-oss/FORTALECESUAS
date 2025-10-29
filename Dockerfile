FROM node:18-alpine AS builder

LABEL maintainer="Silas Josiqueira <silasjosiqueira@example.com>"
LABEL description="Sistema de Gestão CRAS - FORTALECESUAS"

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache \
    tini \
    curl \
    dumb-init

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs uploads backups tmp && \
    chmod 755 logs uploads backups tmp

# Stage de produção
FROM node:18-alpine

WORKDIR /app

# Copiar tini e dumb-init
COPY --from=builder /sbin/tini /sbin/tini
COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar aplicação do builder
COPY --from=builder --chown=node:node /app /app

# Usar usuário não-root
USER node

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Entrypoint com tini para gerenciar processos
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de inicialização
CMD ["node", "server.js"]
