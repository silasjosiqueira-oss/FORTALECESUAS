FROM node:18-alpine

LABEL maintainer="Silas Josiqueira <silasjosiqueira@example.com>"
LABEL description="Sistema de Gestão CRAS - FORTALECESUAS"

WORKDIR /app

RUN apk add --no-cache \
    tini \
    curl

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force

COPY . .

RUN mkdir -p logs uploads backups tmp && \
    chmod 755 logs uploads backups tmp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

USER node

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]
