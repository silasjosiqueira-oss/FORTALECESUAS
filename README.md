# 🏛️ FORTALECESUAS

<div align="center">

![Node.js](https://img.shields.io/badge/node-%3E%3D16.0-brightgreen?style=for-the-badge&logo=node.js)
![MySQL](https://img.shields.io/badge/mysql-8.0%2B-blue?style=for-the-badge&logo=mysql&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-lightgrey?style=for-the-badge&logo=express)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge)

[![GitHub Stars](https://img.shields.io/github/stars/silasjosiqueira-oss/FORTALECESUAS?style=for-the-badge)](https://github.com/silasjosiqueira-oss/FORTALECESUAS/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/silasjosiqueira-oss/FORTALECESUAS?style=for-the-badge)](https://github.com/silasjosiqueira-oss/FORTALECESUAS/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/silasjosiqueira-oss/FORTALECESUAS?style=for-the-badge)](https://github.com/silasjosiqueira-oss/FORTALECESUAS/issues)

**Sistema completo de gestão para Centros de Referência de Assistência Social (CRAS)**

*Desenvolvido com Node.js, Express e MySQL | Arquitetura modular | Segurança robusta*

[🚀 Quick Start](#-quick-start-com-docker) •
[📖 Documentação](#-documentação) •
[🤝 Contribuir](#-contribuindo) •
[📝 Changelog](CHANGELOG.md)

---

</div>

## 📋 Sobre o Projeto

Sistema de gestão completo para **Centros de Referência de Assistência Social (CRAS)**, desenvolvido em Node.js com arquitetura modular e foco em segurança, performance e escalabilidade.

### ✨ Destaques

- 🔐 **Segurança Robusta:** Autenticação JWT, rate limiting, validação de entrada e logs de segurança
- 🏗️ **Arquitetura Modular:** Separação clara de responsabilidades com controllers, middleware e utilitários
- 📊 **Dashboard Completo:** Estatísticas em tempo real e relatórios gerenciais
- 👥 **Multi-tenant:** Suporte para múltiplas organizações
- 🔄 **API RESTful:** Endpoints bem estruturados com paginação e filtros
- 🐳 **Docker Ready:** Containerização completa com MySQL e phpMyAdmin

---

## 🚀 Quick Start com Docker

```bash
# Clone o repositório
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS

# Configure variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# Inicie com Docker
docker-compose up -d

# Acesse:
# App: http://localhost:3000
# phpMyAdmin: http://localhost:8080
```

**Credenciais padrão:** admin / admin123 ⚠️ *Altere após primeiro acesso!*

---

## 🛠️ Tecnologias

<div align="center">

| Backend | Database | Security | DevOps |
|---------|----------|----------|--------|
| Node.js 16+ | MySQL 8.0+ | JWT | Docker |
| Express.js | Pool de Conexões | Helmet | GitHub Actions |
| Winston | Indexes | CORS | PM2 |

</div>

### Stack Completa

**Backend:**
- Node.js 16+ / Express.js
- JWT (autenticação stateless)
- bcryptjs (hash de senhas)
- Winston (logging estruturado)

**Banco de Dados:**
- MySQL 8.0+
- Pool de conexões otimizado
- Migrations e seeds

**Segurança:**
- Helmet (headers seguros)
- express-validator (validação)
- rate-limiter-flexible (rate limiting)
- CORS configurável

**DevOps:**
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- PM2 (process manager)
- Health checks

---

## 📦 Instalação

### Opção 1: Docker (Recomendado) 🐳

```bash
# 1. Clone e configure
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS
cp .env.example .env

# 2. Edite as variáveis (gere chaves seguras)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Inicie
docker-compose up -d

# 4. Verifique
docker-compose logs -f app
```

### Opção 2: Instalação Manual

```bash
# 1. Pré-requisitos
# - Node.js 16+
# - MySQL 8.0+
# - npm 8+

# 2. Clone e instale
git clone https://github.com/silasjosiqueira-oss/FORTALECESUAS.git
cd FORTALECESUAS
npm install

# 3. Configure banco de dados
mysql -u root -p
CREATE DATABASE sistema_assistencia;
CREATE USER 'cras_user'@'localhost' IDENTIFIED BY 'senha_segura';
GRANT ALL PRIVILEGES ON sistema_assistencia.* TO 'cras_user'@'localhost';

# 4. Configure .env
cp .env.example .env
nano .env

# 5. Inicie
npm start  # Produção
npm run dev  # Desenvolvimento
```

📖 **Guia completo:** [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)

---

## 🎯 Funcionalidades

### Core

- ✅ **Gestão de Atendimentos** - CRUD completo com histórico
- ✅ **Gestão de Usuários** - Permissões granulares por cargo
- ✅ **Dashboard** - Estatísticas e métricas em tempo real
- ✅ **Sistema de Permissões** - 7 níveis de acesso
- ✅ **Agendamentos** - Calendário integrado
- ✅ **Controle de Estoque** - Gestão de materiais

### Segurança

- 🔐 Autenticação JWT com refresh tokens
- 🛡️ Rate limiting por IP e usuário
- ✅ Validação rigorosa de entrada
- 🚫 Proteção contra XSS e SQL Injection
- 📋 Logs de segurança detalhados
- 🔒 CORS configurável por ambiente

### Sistema

- 📊 Logs estruturados (Winston)
- ⚡ Pool de conexões otimizado
- 🔄 Health checks
- 📦 Backup automatizado
- 🐳 Docker ready
- 🔄 CI/CD com GitHub Actions

---

## 📡 API Endpoints

### Autenticação
```http
POST   /auth/login          # Login do usuário
POST   /auth/logout         # Logout
POST   /auth/refresh        # Renovar token
GET    /auth/profile        # Perfil do usuário
```

### Atendimentos
```http
GET    /api/atendimentos           # Listar todos
POST   /api/atendimentos           # Criar novo
GET    /api/atendimentos/:id       # Buscar por ID
PUT    /api/atendimentos/:id       # Atualizar
DELETE /api/atendimentos/:id       # Excluir
```

### Usuários
```http
GET    /api/usuarios               # Listar usuários
POST   /api/usuarios               # Criar usuário
PUT    /api/usuarios/:id           # Atualizar
DELETE /api/usuarios/:id           # Excluir
```

### Sistema
```http
GET    /health                     # Health check
GET    /api/estatisticas/dashboard # Dashboard
```

**Autenticação:** `Authorization: Bearer {TOKEN}`

📚 **Documentação completa da API:** Em desenvolvimento

---

## ⚙️ Configuração

### Variáveis Essenciais

```env
# Banco de Dados
DB_HOST=localhost
DB_USER=cras_user
DB_PASSWORD=sua_senha_segura
DB_NAME=sistema_assistencia

# JWT (gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=sua_chave_64_caracteres
JWT_REFRESH_SECRET=outra_chave_64_caracteres
CSRF_SECRET=chave_csrf_32_caracteres

# Servidor
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://seu-dominio.com
```

Ver: [.env.example](.env.example) para todas as opções

---

## 🔐 Segurança

### Implementações

- ✅ Autenticação JWT com refresh tokens
- ✅ Rate limiting (5 tentativas de login / 15 min)
- ✅ Validação rigorosa com express-validator
- ✅ Sanitização contra XSS
- ✅ Detecção de SQL Injection
- ✅ Headers de segurança (Helmet)
- ✅ CORS configurável
- ✅ Logs de auditoria
- ✅ Bloqueio automático após falhas

### Boas Práticas

- 🔒 Senhas hasheadas com bcrypt
- 🔑 Tokens com expiração
- 📋 Logs de todas as ações sensíveis
- 🚫 Validação em todas as entradas
- 🛡️ Princípio do menor privilégio

**Reporte vulnerabilidades:** security@fortalecesuas.com.br

---

## 📊 Estrutura do Projeto

```
FORTALECESUAS/
├── server.js                 # Servidor principal
├── package.json              # Dependências
├── docker-compose.yml        # Docker setup
├── .env.example              # Configurações
├── src/
│   ├── config/
│   │   ├── database.js       # Configuração DB
│   │   └── index.js          # Config geral
│   ├── controllers/          # Lógica de negócio
│   ├── middleware/           # Middlewares
│   ├── routes/               # Rotas da API
│   └── utils/                # Utilitários
├── pages/                    # Frontend HTML
├── logs/                     # Logs do sistema
└── docs/                     # Documentação
```

---

## 🧪 Testes

```bash
npm test              # Executar testes
npm run test:watch    # Modo watch
npm run test:coverage # Coverage report
npm run lint          # Verificar código
```

*Obs: Testes em desenvolvimento*

---

## 🚀 Deploy

### Com Docker (Produção)

```bash
# Build
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f

# Restart
docker-compose restart app
```

### Com PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar
pm2 start ecosystem.config.js --env production

# Monitorar
pm2 monit

# Configurar startup
pm2 startup
pm2 save
```

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

**Padrões:**
- ESLint Standard
- Commits semânticos
- Testes para novas features

[📋 Guia de contribuição](CONTRIBUTING.md)

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Silas Josiqueira**

[![GitHub](https://img.shields.io/badge/GitHub-silasjosiqueira--oss-181717?style=for-the-badge&logo=github)](https://github.com/silasjosiqueira-oss)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Silas_Josiqueira-0A66C2?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/silasjosiqueira)
[![Email](https://img.shields.io/badge/Email-contato-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:contato@fortalecesuas.com.br)

---

## 📞 Suporte

- 📖 [Documentação Completa](docs/)
- 🐛 [Reportar Bug](https://github.com/silasjosiqueira-oss/FORTALECESUAS/issues)
- 💡 [Solicitar Feature](https://github.com/silasjosiqueira-oss/FORTALECESUAS/issues)
- 📧 Email: contato@fortalecesuas.com.br

---

## 📈 Status do Projeto

![GitHub last commit](https://img.shields.io/github/last-commit/silasjosiqueira-oss/FORTALECESUAS)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/silasjosiqueira-oss/FORTALECESUAS)
![GitHub repo size](https://img.shields.io/github/repo-size/silasjosiqueira-oss/FORTALECESUAS)

---

## 🙏 Agradecimentos

- Comunidade Node.js
- Contribuidores do projeto
- Equipes de CRAS que inspiraram o projeto

---

<div align="center">

**⭐ Se este projeto foi útil, deixe uma estrela!**

**Versão 2.0.0** | Última atualização: 2025

Made with ❤️ by [Silas Josiqueira](https://github.com/silasjosiqueira-oss)

</div>
 
 