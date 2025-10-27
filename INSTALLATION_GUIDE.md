# 🚀 Guia Completo de Instalação - FORTALECESUAS

Este guia detalha passo a passo como instalar e configurar o sistema.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação com Docker](#instalação-com-docker-recomendado)
3. [Instalação Manual](#instalação-manual)
4. [Configuração](#configuração)
5. [Primeiro Acesso](#primeiro-acesso)
6. [Solução de Problemas](#solução-de-problemas)

---

## 🔧 Pré-requisitos

### Opção 1: Com Docker (Recomendado)
- ✅ Docker 20.10+ ([Instalar Docker](https://docs.docker.com/get-docker/))
- ✅ Docker Compose 2.0+ (geralmente vem com Docker)
- ✅ Git

### Opção 2: Sem Docker
- ✅ Node.js 18+ ([Instalar Node.js](https://nodejs.org/))
- ✅ MySQL 8.0+ ([Instalar MySQL](https://dev.mysql.com/downloads/))
- ✅ npm 8+ (vem com Node.js)
- ✅ Git

---

## 🐳 Instalação com Docker (Recomendado)

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS
```

### Passo 2: Configure as Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo
nano .env  # ou use seu editor preferido
```

**Configurações mínimas necessárias:**

```env
# Banco de Dados
DB_HOST=mysql
DB_USER=cras_user
DB_PASSWORD=SuaSenhaSegura123
DB_NAME=sistema_assistencia

# JWT (gere chaves com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=sua_chave_jwt_de_64_caracteres_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_de_64_caracteres_aqui
CSRF_SECRET=sua_chave_csrf_de_32_caracteres_aqui

# Servidor
PORT=3000
NODE_ENV=production
```

### Passo 3: Inicie os Containers

```bash
docker-compose up -d
```

Este comando vai:
- ✅ Baixar as imagens necessárias
- ✅ Criar o container MySQL
- ✅ Criar o container da aplicação
- ✅ Criar o container phpMyAdmin
- ✅ Configurar a rede entre eles

### Passo 4: Verifique os Logs

```bash
# Ver logs da aplicação
docker-compose logs -f app

# Ver logs do MySQL
docker-compose logs -f mysql
```

Aguarde até ver a mensagem:
```
[OK] SERVIDOR MULTI-TENANT RODANDO
```

### Passo 5: Acesse o Sistema

- **Aplicação:** http://localhost:3000
- **phpMyAdmin:** http://localhost:8080

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin123`

⚠️ **IMPORTANTE:** Altere a senha padrão após o primeiro login!

---

## 🛠️ Instalação Manual

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS
```

### Passo 2: Instale as Dependências

```bash
npm install
```

Se der erro, tente:
```bash
npm install --legacy-peer-deps
```

### Passo 3: Configure o MySQL

```bash
# Entre no MySQL
mysql -u root -p

# Crie o banco de dados
CREATE DATABASE sistema_assistencia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Crie o usuário
CREATE USER 'cras_user'@'localhost' IDENTIFIED BY 'SuaSenhaSegura123';

# Dê permissões
GRANT ALL PRIVILEGES ON sistema_assistencia.* TO 'cras_user'@'localhost';
FLUSH PRIVILEGES;

# Saia
EXIT;
```

### Passo 4: Importe o Schema

```bash
# Se você tem o arquivo schema.sql
mysql -u cras_user -p sistema_assistencia < database/schema.sql
```

### Passo 5: Configure as Variáveis de Ambiente

```bash
cp .env.example .env
nano .env
```

Configure especialmente:
```env
DB_HOST=localhost
DB_USER=cras_user
DB_PASSWORD=SuaSenhaSegura123
DB_NAME=sistema_assistencia
```

### Passo 6: Crie Diretórios Necessários

```bash
mkdir -p logs uploads backups tmp
chmod 755 logs uploads backups tmp
```

### Passo 7: Inicie a Aplicação

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

**Com PM2 (recomendado para produção):**
```bash
# Instale o PM2
npm install -g pm2

# Inicie a aplicação
pm2 start ecosystem.config.js --env production

# Configure para iniciar automaticamente
pm2 startup
pm2 save
```

---

## ⚙️ Configuração

### Gerar Chaves Seguras

```bash
# Execute este comando 3 vezes para gerar 3 chaves diferentes
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use as chaves geradas para:
1. `JWT_SECRET`
2. `JWT_REFRESH_SECRET`
3. `CSRF_SECRET`

### Configurar CORS (Produção)

```env
# Desenvolvimento
ALLOWED_ORIGINS=*

# Produção - liste os domínios permitidos
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

### Ajustar Rate Limiting

```env
# Mais restritivo (produção)
AUTH_RATE_MAX=5
API_RATE_MAX=100

# Mais permissivo (desenvolvimento)
AUTH_RATE_MAX=20
API_RATE_MAX=500
```

---

## 🔐 Primeiro Acesso

### 1. Acesse o Sistema

Abra: http://localhost:3000

### 2. Faça Login

- **Usuário:** `admin`
- **Senha:** `admin123`

### 3. Altere a Senha

⚠️ **IMPORTANTE:** Vá em **Perfil > Alterar Senha** e mude a senha padrão!

### 4. Configure Usuários

Vá em **Usuários > Novo Usuário** e crie os usuários da sua equipe.

### 5. Teste o Sistema

- Crie um atendimento de teste
- Verifique o dashboard
- Explore as funcionalidades

---

## 🆘 Solução de Problemas

### Erro: "Cannot connect to MySQL"

**Causa:** MySQL não está rodando ou credenciais erradas

**Solução:**

```bash
# Verifique se o MySQL está rodando
sudo systemctl status mysql  # Linux
brew services list  # macOS

# Teste a conexão
mysql -u cras_user -p -h localhost

# Verifique as variáveis no .env
cat .env | grep DB_
```

### Erro: "JWT_SECRET is not defined"

**Causa:** Arquivo .env não foi configurado

**Solução:**

```bash
# Verifique se o .env existe
ls -la .env

# Se não existir, copie do exemplo
cp .env.example .env

# Gere chaves seguras
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Erro: "EADDRINUSE: Port 3000 is already in use"

**Causa:** Outra aplicação está usando a porta 3000

**Solução:**

```bash
# Encontre o processo
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Mate o processo OU mude a porta no .env
PORT=3001
```

### Erro: "Permission denied" nos logs

**Causa:** Permissões incorretas nas pastas

**Solução:**

```bash
# Ajuste as permissões
sudo chown -R $USER:$USER logs/ uploads/ backups/ tmp/
chmod 755 logs/ uploads/ backups/ tmp/
```

### Docker: Containers não iniciam

**Solução:**

```bash
# Veja os logs
docker-compose logs

# Reconstrua os containers
docker-compose down -v
docker-compose up -d --build

# Verifique o status
docker-compose ps
```

### phpMyAdmin: "Access Denied"

**Solução:**

```bash
# Verifique as credenciais no docker-compose.yml
# Use as mesmas do .env:
# User: cras_user (ou o que está em DB_USER)
# Password: (o que está em DB_PASSWORD)
```

---

## 📊 Verificar Instalação

### Health Check

```bash
curl http://localhost:3000/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T..."
}
```

### Teste de Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "senha": "admin123"}'
```

Deve retornar um token JWT.

---

## 🔄 Próximos Passos

Após a instalação:

1. ✅ [Alterar senha padrão](#primeiro-acesso)
2. ✅ [Criar usuários](#primeiro-acesso)
3. ✅ [Configurar backup automático](BACKUP_GUIDE.md)
4. ✅ [Configurar HTTPS](HTTPS_GUIDE.md)
5. ✅ [Ler documentação da API](API_DOCS.md)

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os [logs](#verificar-instalação)
2. Consulte a [documentação](README.md)
3. Abra uma [issue no GitHub](https://github.com/silasjosiqueira-oss/FORTALECESUAS/issues)
4. Entre em contato: contato@fortalecesuas.com.br

---

**Boa sorte! 🚀**
