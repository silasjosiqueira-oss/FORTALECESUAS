# 🏛️ FORTALECESUAS

<div align="center">

![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-brightgreen?style=for-the-badge&logo=node.js)
![MySQL](https://img.shields.io/badge/mysql-8.0%2B-blue?style=for-the-badge&logo=mysql)
![Express](https://img.shields.io/badge/express-4.x-lightgrey?style=for-the-badge&logo=express)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge)

![CI/CD](https://img.shields.io/github/actions/workflow/status/silasjosiqueira-oss/FORTALECESUAS/ci.yml?style=for-the-badge&label=build)
![Stars](https://img.shields.io/github/stars/silasjosiqueira-oss/FORTALECESUAS?style=for-the-badge)
![Forks](https://img.shields.io/github/forks/silasjosiqueira-oss/FORTALECESUAS?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/silasjosiqueira-oss/FORTALECESUAS?style=for-the-badge)

**Sistema completo de gestão para Centros de Referência de Assistência Social (CRAS)**

[📖 Documentação](#documentação) •
[🚀 Quick Start](#quick-start-com-docker) •
[💻 Demo](#demo) •
[🤝 Contribuir](#contribuindo)

</div>

---

## 📸 Screenshots

> **Nota:** Adicione suas screenshots aqui!

<div align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard" width="400"/>
  <img src="docs/images/atendimentos.png" alt="Atendimentos" width="400"/>
</div>

---

## ⚡ Quick Start com Docker

A maneira mais rápida de rodar o projeto!

```bash
# Clone o repositório
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS

# Configure variáveis de ambiente
cp .env.example .env
nano .env  # Edite com suas configurações

# Inicie com Docker
docker-compose up -d

# Acesse:
# App: http://localhost:3000
# phpMyAdmin: http://localhost:8080
```

**Pronto! Sistema rodando em menos de 2 minutos!** 🎉

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Características](#características)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
  - [Com Docker](#instalação-com-docker-recomendado)
  - [Sem Docker](#instalação-tradicional)
- [Configuração](#configuração)
- [Uso](#uso)
- [API](#api-endpoints)
- [Testes](#testes)
- [Deploy](#deploy)
- [Segurança](#segurança)
- [Contribuindo](#contribuindo)
- [Licença](#licença)
- [Contato](#contato)

---

## 🎯 Sobre o Projeto

Sistema de gestão completo para Centros de Referência de Assistência Social (CRAS), desenvolvido com foco em:

- ✅ **Segurança:** Autenticação JWT, rate limiting, validação rigorosa
- ✅ **Performance:** Pool de conexões, cache, otimizações
- ✅ **Escalabilidade:** Arquitetura modular, containerização
- ✅ **Manutenibilidade:** Código limpo, documentação completa
- ✅ **Auditoria:** Sistema de logs detalhado

---

## ✨ Características

### Core Features
- 🔐 **Autenticação JWT** com refresh tokens
- 👥 **Multi-tenant** - Suporte para múltiplas organizações
- 📊 **Dashboard** com estatísticas em tempo real
- 📝 **Gestão de Atendimentos** completa
- 👨‍💼 **Gestão de Usuários** com permissões granulares
- 🎭 **Sistema de Permissões** baseado em cargo
- 📅 **Agendamentos** e calendário integrado
- 📦 **Controle de Estoque** de materiais

### Segurança
- 🛡️ Rate limiting inteligente por IP e usuário
- 🔒 Validação e sanitização de dados
- 🚨 Detecção de SQL Injection e XSS
- 📋 Logs de segurança detalhados
- 🔑 Refresh tokens seguros
- 🌐 CORS configurável por ambiente

### DevOps
- 🐳 Docker e Docker Compose prontos
- 🔄 CI/CD com GitHub Actions
- 📊 Health checks e monitoring
- 💾 Sistema de backup automatizado
- 📝 Logs estruturados com Winston

---

## 🛠️ Tecnologias

### Backend
- **Node.js** 18+ - Runtime JavaScript
- **Express.js** - Framework web
- **MySQL** 8.0+ - Banco de dados relacional
- **JWT** - Autenticação stateless
- **bcryptjs** - Hash de senhas

### Segurança
- **Helmet** - Headers de segurança
- **express-validator** - Validação de entrada
- **rate-limiter-flexible** - Rate limiting
- **cors** - Cross-Origin Resource Sharing

### DevOps & Tools
- **Docker** - Containerização
- **Winston** - Sistema de logging
- **PM2** - Process manager
- **GitHub Actions** - CI/CD

---

## 📦 Pré-requisitos

### Sem Docker
- Node.js 18.0.0 ou superior
- MySQL 8.0 ou superior
- npm 8.0.0 ou superior

### Com Docker (Recomendado)
- Docker 20.10+
- Docker Compose 2.0+

---

## 🚀 Instalação

### Instalação com Docker (Recomendado)

```bash
# 1. Clone o repositório
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS

# 2. Configure variáveis de ambiente
cp .env.example .env

# Edite o .env com suas configurações
nano .env

# 3. Inicie os containers
docker-compose up -d

# 4. Verifique os logs
docker-compose logs -f app

# 5. Acesse a aplicação
# App: http://localhost:3000
# phpMyAdmin: http://localhost:8080
```

**Comandos úteis:**
```bash
# Parar containers
docker-compose down

# Ver logs
docker-compose logs -f

# Reiniciar aplicação
docker-compose restart app

# Rebuild após mudanças
docker-compose up -d --build
```

---

### Instalação Tradicional

```bash
# 1. Clone o repositório
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
nano .env

# 4. Configure o banco de dados
mysql -u root -p < database/schema.sql

# 5. Crie diretórios necessários
mkdir -p logs uploads backups tmp
chmod 755 logs uploads backups tmp

# 6. Inicie a aplicação
npm start
```

---

## ⚙️ Configuração

### Variáveis de Ambiente Principais

```env
# Banco de Dados
DB_HOST=localhost
DB_USER=cras_user
DB_PASSWORD=senha_segura
DB_NAME=sistema_assistencia

# JWT
JWT_SECRET=chave_64_caracteres_aleatoria
JWT_REFRESH_SECRET=outra_chave_64_caracteres

# Servidor
PORT=3000
NODE_ENV=production
```

**Gerar chaves seguras:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Ver [.env.example](.env.example) para todas as opções.

---

## 💻 Uso

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Com PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 monit
pm2 logs
```

### Credenciais Padrão
- **Usuário:** `admin`
- **Senha:** `admin123`

⚠️ **Altere a senha padrão após o primeiro login!**

---

## 📡 API Endpoints

### Autenticação
```http
POST   /auth/login          # Login
POST   /auth/logout         # Logout
POST   /auth/refresh        # Renovar token
GET    /auth/profile        # Perfil do usuário
```

### Atendimentos
```http
GET    /api/atendimentos           # Listar
POST   /api/atendimentos           # Criar
GET    /api/atendimentos/:id       # Detalhes
PUT    /api/atendimentos/:id       # Atualizar
DELETE /api/atendimentos/:id       # Excluir
```

### Usuários
```http
GET    /api/usuarios               # Listar
POST   /api/usuarios               # Criar
PUT    /api/usuarios/:id           # Atualizar
DELETE /api/usuarios/:id           # Excluir
```

### Sistema
```http
GET    /health                     # Health check
GET    /api/estatisticas/dashboard # Dashboard
```

**Autenticação:**
```bash
Authorization: Bearer {TOKEN}
```

**Exemplo com curl:**
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "senha": "admin123"}'

# Listar atendimentos
curl http://localhost:3000/api/atendimentos \
  -H "Authorization: Bearer {TOKEN}"
```

---

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 🚀 Deploy

### Com Docker

```bash
# Build da imagem
docker build -t fortalecesuas:latest .

# Push para registry
docker tag fortalecesuas:latest seu-usuario/fortalecesuas:latest
docker push seu-usuario/fortalecesuas:latest
```

### Heroku

```bash
heroku create fortalecesuas
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=sua_chave
git push heroku main
```

### VPS/Servidor

```bash
# Com PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 🔒 Segurança

- ✅ Autenticação JWT com refresh tokens
- ✅ Rate limiting por IP e usuário
- ✅ Validação rigorosa de entrada
- ✅ Sanitização contra XSS
- ✅ Detecção de SQL Injection
- ✅ Headers de segurança (Helmet)
- ✅ CORS configurável
- ✅ Logs de segurança
- ✅ Bloqueio automático após tentativas falhadas

**Reporte vulnerabilidades para:** security@fortalecesuas.com.br

---

## 📊 Monitoramento

### Logs
```bash
# Ver logs em tempo real
tail -f logs/app.log
tail -f logs/error.log
tail -f logs/security.log
```

### Health Check
```bash
curl http://localhost:3000/health
```

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

**Padrões de código:**
- ESLint Standard
- Commits semânticos
- Testes para novas features
- Documentação atualizada

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Contato

**Silas Josiqueira**

- GitHub: [@silasjosiqueira-oss](https://github.com/silasjosiqueira-oss)
- Email: contato@fortalecesuas.com.br
- LinkedIn: [Silas Josiqueira](https://linkedin.com/in/silasjosiqueira)

---

## 🙏 Agradecimentos

- Comunidade Node.js
- Contribuidores do projeto
- Usuários e testers

---

<div align="center">

**⭐ Se este projeto foi útil, deixe uma estrela!**

Made with ❤️ by [Silas Josiqueira](https://github.com/silasjosiqueira-oss)

</div>
