# 🐳 FORTALECESUAS - Guia Docker

## 📋 Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM disponível
- 10GB espaço em disco

## 🚀 Quick Start

### 1. Clone o repositório
```bash
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS
```

### 2. Configure as variáveis de ambiente
```bash
# Copiar template
cp .env.docker .env

# Editar configurações
nano .env
```

**⚠️ IMPORTANTE:** Altere TODAS as variáveis marcadas com `ALTERAR`!

### 3. Gerar secrets seguras
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# CSRF Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Executar deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📦 Estrutura dos Containers

```
┌─────────────────────────────────────┐
│   fortalecesuas-nginx (opcional)    │
│          Nginx :80/:443             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      fortalecesuas-app              │
│       Node.js :3000                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     fortalecesuas-mysql             │
│       MySQL 8.0 :3306               │
└─────────────────────────────────────┘
```

## 🔧 Comandos Úteis

### Gerenciamento Básico

```bash
# Iniciar serviços
docker-compose up -d

# Parar serviços
docker-compose down

# Reiniciar serviços
docker-compose restart

# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f app
docker-compose logs -f mysql

# Logs específicos
docker-compose logs --tail=100 app
```

### Manutenção

```bash
# Acessar container da aplicação
docker exec -it fortalecesuas-app sh

# Acessar MySQL
docker exec -it fortalecesuas-mysql mysql -u root -p

# Limpar volumes (⚠️ APAGA DADOS!)
docker-compose down -v

# Rebuild completo
docker-compose build --no-cache
docker-compose up -d
```

### Backup e Restore

```bash
# Backup do banco
docker exec fortalecesuas-mysql mysqldump -u root -p"${DB_ROOT_PASSWORD}" sistema_assistencia > backup_$(date +%Y%m%d).sql

# Restore do banco
docker exec -i fortalecesuas-mysql mysql -u root -p"${DB_ROOT_PASSWORD}" sistema_assistencia < backup_20250127.sql

# Backup dos uploads
docker cp fortalecesuas-app:/app/uploads ./backup_uploads

# Restore dos uploads
docker cp ./backup_uploads fortalecesuas-app:/app/uploads
```

## 🔒 Segurança

### Checklist de Segurança

- [ ] Alterar senha padrão (admin/admin123)
- [ ] Gerar secrets fortes e únicas
- [ ] Configurar ALLOWED_ORIGINS corretamente
- [ ] Usar HTTPS em produção
- [ ] Configurar firewall
- [ ] Ativar backups automáticos
- [ ] Revisar logs de segurança
- [ ] Atualizar dependências regularmente

### Alterar Senha Padrão

```bash
# Acessar container
docker exec -it fortalecesuas-app sh

# Executar query (ajustar conforme seu sistema)
# Use a interface web ou API para alterar
```

## 🌐 Nginx (Produção)

### Com SSL/HTTPS

```bash
# Iniciar com Nginx
docker-compose --profile with-nginx up -d

# Configurar Certbot (Let's Encrypt)
docker run -it --rm -v ./ssl:/etc/letsencrypt certbot/certbot certonly --standalone -d seu-dominio.com.br
```

### nginx.conf (exemplo)
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name seu-dominio.com.br;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name seu-dominio.com.br;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## 📊 Monitoramento

### Health Check
```bash
# Verificar health
curl http://localhost:3000/health

# Monitorar continuamente
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

### Logs em Tempo Real
```bash
# Todos os serviços
docker-compose logs -f

# Apenas aplicação
docker-compose logs -f app

# Filtrar por erro
docker-compose logs app | grep ERROR
```

### Recursos
```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Verificar logs
docker-compose logs app

# Verificar variáveis de ambiente
docker exec fortalecesuas-app env | grep DB

# Testar conexão MySQL
docker exec fortalecesuas-mysql mysql -u root -p -e "SHOW DATABASES;"
```

### Erro de conexão MySQL

```bash
# Verificar se MySQL está rodando
docker-compose ps mysql

# Ver logs do MySQL
docker-compose logs mysql

# Aguardar MySQL ficar pronto
docker-compose restart app
```

### Porta já em uso

```bash
# Verificar portas em uso
sudo netstat -tulpn | grep :3000

# Alterar porta no .env
APP_PORT=3001
docker-compose up -d
```

### Container não para

```bash
# Forçar parada
docker-compose kill

# Remover tudo
docker-compose down --remove-orphans
```

## 🔄 Atualização

### Atualizar para nova versão

```bash
# 1. Backup
./deploy.sh  # Já faz backup automático

# 2. Atualizar código
git pull origin main

# 3. Rebuild
docker-compose build --no-cache

# 4. Reiniciar
docker-compose up -d

# 5. Verificar
curl http://localhost:3000/health
```

## 📈 Performance

### Otimizações

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### Cache Redis (opcional)

```yaml
# Adicionar ao docker-compose.yml
redis:
  image: redis:alpine
  container_name: fortalecesuas-redis
  restart: unless-stopped
  ports:
    - "6379:6379"
  networks:
    - fortalecesuas-network
```

## 📞 Suporte

- **Issues**: https://github.com/silasjosiqueira-oss/FORTALECESUAS/issues
- **Documentação**: README.md principal
- **Wiki**: Em construção

## 📝 Licença

MIT License - veja LICENSE para detalhes
