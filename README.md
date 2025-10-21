# Sistema CRAS - Versão Refatorada

Sistema de gestão para Centros de Referência de Assistência Social (CRAS), desenvolvido em Node.js com arquitetura modular e foco em segurança.

## Características Principais

- **Arquitetura Modular**: Separação clara de responsabilidades com controllers, middleware e utilitários
- **Segurança Robusta**: Autenticação JWT, rate limiting, validação de entrada e logs de segurança
- **Sistema de Logging**: Logs estruturados com Winston, incluindo logs de segurança e auditoria
- **Tratamento de Erros**: Sistema centralizado com classes de erro específicas
- **Validação Completa**: Validadores customizados e express-validator
- **Pool de Conexão Otimizado**: Gerenciamento eficiente de conexões MySQL
- **Rate Limiting Inteligente**: Proteção contra ataques de força bruta
- **API RESTful**: Endpoints bem estruturados com paginação e filtros

## Tecnologias

- **Backend**: Node.js 16+, Express.js
- **Banco de Dados**: MySQL 8.0+
- **Autenticação**: JWT com refresh tokens
- **Validação**: express-validator + validadores customizados
- **Logging**: Winston
- **Segurança**: Helmet, CORS, Rate Limiting
- **Criptografia**: bcryptjs

## Estrutura do Projeto

```
sistema-cras-refatorado/
├── server.js                  # Arquivo principal do servidor
├── package.json               # Dependências e scripts
├── .env.example               # Exemplo de variáveis de ambiente
├── MIGRATION_GUIDE.md         # Guia de migração
├── ecosystem.config.js        # Configuração PM2
├── src/
│   ├── config/
│   │   ├── index.js           # Configurações centralizadas
│   │   └── database.js        # Configuração do banco de dados
│   ├── controllers/
│   │   ├── authController.js  # Lógica de autenticação
│   │   └── atendimentosController.js  # Lógica de atendimentos
│   ├── middleware/
│   │   ├── errorHandler.js    # Tratamento de erros
│   │   ├── rateLimiter.js     # Rate limiting
│   │   └── security.js        # Middlewares de segurança
│   ├── routes/
│   │   ├── auth.js            # Rotas de autenticação
│   │   ├── atendimentos.js    # Rotas de atendimentos
│   │   └── usuarios.js        # Rotas de usuários
│   └── utils/
│       ├── logger.js          # Sistema de logging
│       └── validators.js      # Validadores customizados
├── logs/                      # Diretório de logs
├── pages/                     # Páginas HTML (frontend)
├── css/                       # Arquivos CSS
├── js/                        # Arquivos JavaScript frontend
└── img/                       # Imagens
```

## Instalação

### Pré-requisitos

- Node.js 16.0.0 ou superior
- MySQL 8.0 ou superior
- npm 8.0.0 ou superior

### 1. Clonar o Repositório

```bash
git clone [URL_DO_REPOSITORIO]
cd sistema-cras-refatorado
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
nano .env
```

Configure as variáveis obrigatórias:

```env
# Banco de dados
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_segura
DB_NAME=sistema_assistencia

# Segurança
JWT_SECRET=sua_chave_jwt_muito_longa_e_segura
JWT_REFRESH_SECRET=sua_chave_refresh_muito_longa_e_segura
CSRF_SECRET=sua_chave_csrf_segura

# Em produção
ALLOWED_ORIGINS=https://seu-dominio.com.br
```

### 4. Criar Estrutura de Pastas

```bash
mkdir -p logs uploads backups tmp
chmod 755 logs uploads backups tmp
```

### 5. Executar o Sistema

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## Uso

### Login Padrão

- **Usuário**: `admin`
- **Senha**: `admin123`

### Endpoints Principais

#### Autenticação
- `POST /auth/login` - Login do usuário
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Renovar token
- `GET /auth/profile` - Perfil do usuário

#### Atendimentos
- `GET /api/atendimentos` - Listar atendimentos
- `POST /api/atendimentos` - Criar atendimento
- `PUT /api/atendimentos/:id` - Atualizar atendimento
- `DELETE /api/atendimentos/:id` - Excluir atendimento

#### Usuários (Beneficiários)
- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Excluir usuário

#### Sistema
- `GET /health` - Status do sistema
- `GET /api/estatisticas/dashboard` - Estatísticas gerais

### Autenticação

Todas as rotas protegidas requerem token JWT no header:

```bash
Authorization: Bearer [TOKEN]
```

### Exemplos de Uso

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "senha": "admin123"}'
```

#### Listar Atendimentos
```bash
curl http://localhost:3000/api/atendimentos \
  -H "Authorization: Bearer [SEU_TOKEN]"
```

#### Criar Atendimento
```bash
curl -X POST http://localhost:3000/api/atendimentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SEU_TOKEN]" \
  -d '{
    "nomeCompleto": "João Silva",
    "telefone": "(11) 99999-9999",
    "tipoAtendimento": "social",
    "prioridade": "normal",
    "descricaoDemanda": "Solicitação de benefício"
  }'
```

## Segurança

### Funcionalidades Implementadas

- **Autenticação JWT** com refresh tokens
- **Rate Limiting** por IP e usuário
- **Validação rigorosa** de entrada de dados
- **Sanitização** de dados para prevenir XSS
- **Detecção de SQL Injection**
- **Logs de segurança** detalhados
- **Headers de segurança** (Helmet)
- **CORS configurável** por ambiente
- **Bloqueio automático** após tentativas falhadas

### Configurações de Produção

1. **Definir variáveis de ambiente seguras**
2. **Configurar HTTPS** (recomendado Nginx + Certbot)
3. **Definir CORS** apenas para domínios autorizados
4. **Configurar firewall** para portas necessárias
5. **Ativar logs** de segurança e monitoramento

## Monitoramento

### Logs Disponíveis

- `logs/app.log` - Log geral da aplicação
- `logs/error.log` - Log de erros
- `logs/security.log` - Log de eventos de segurança

### Métricas do Sistema

- Status de saúde: `GET /health`
- Estatísticas: `GET /api/estatisticas/dashboard`

### PM2 (Recomendado para Produção)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start ecosystem.config.js --env production

# Monitorar
pm2 monit

# Ver logs
pm2 logs sistema-cras
```

## Desenvolvimento

### Scripts Disponíveis

```bash
npm start          # Iniciar em produção
npm run dev        # Iniciar em desenvolvimento com nodemon
npm test           # Executar testes
npm run test:watch # Testes em modo watch
npm run lint       # Verificar código com ESLint
npm run lint:fix   # Corrigir problemas do ESLint
```

### Estrutura de Permissões

O sistema implementa um modelo de permissões baseado em cargo:

- **Super Administrador**: Acesso total (`*`)
- **Administrador**: Gerenciamento geral e relatórios
- **Coordenador**: Coordenação de equipes e supervisão
- **Assistente Social**: Atendimentos sociais e PAIF
- **Psicólogo**: Atendimentos psicológicos
- **Técnico**: Suporte técnico e administrativo
- **Recepção**: Cadastros básicos e recepção

### Adicionando Novas Rotas

1. Criar controller em `src/controllers/`
2. Criar rotas em `src/routes/`
3. Adicionar validações necessárias
4. Registrar no `server.js`
5. Documentar no README

### Exemplo de Controller

```javascript
const { executeQuery } = require('../config/database');
const { asyncErrorHandler } = require('../middleware/errorHandler');

const getMeuRecurso = async (req, res) => {
    const data = await executeQuery('SELECT * FROM minha_tabela');
    res.json({ success: true, data });
};

module.exports = {
    getMeuRecurso: asyncErrorHandler(getMeuRecurso)
};
```

## Performance

### Otimizações Implementadas

- **Pool de conexões** MySQL otimizado
- **Compressão** de respostas HTTP
- **Cache** de queries (em desenvolvimento)
- **Paginação** eficiente
- **Índices** de banco de dados
- **Rate limiting** inteligente

### Recomendações de Performance

1. **Usar CDN** para assets estáticos
2. **Configurar cache** Redis (opcional)
3. **Otimizar queries** do banco de dados
4. **Monitorar** uso de recursos
5. **Configurar** load balancer se necessário

## Backup e Recuperação

### Backup do Banco de Dados

```bash
# Backup completo
mysqldump -u root -p sistema_assistencia > backup_$(date +%Y%m%d).sql

# Backup automático (adicionar ao cron)
0 2 * * * mysqldump -u root -p[senha] sistema_assistencia > /backups/sistema_$(date +\%Y\%m\%d).sql
```

### Backup dos Arquivos

```bash
# Backup dos uploads e logs
tar -czf backup_arquivos_$(date +%Y%m%d).tar.gz uploads/ logs/
```

## Troubleshooting

### Problemas Comuns

**1. Erro de Conexão MySQL**
```bash
# Verificar status do MySQL
sudo systemctl status mysql

# Verificar variáveis de ambiente
echo $DB_HOST $DB_USER $DB_NAME
```

**2. Token JWT Inválido**
```bash
# Verificar se JWT_SECRET está definido
echo $JWT_SECRET

# Gerar nova chave se necessário
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**3. Rate Limiting Muito Restritivo**
```bash
# Ajustar limites no .env
AUTH_RATE_MAX=20
API_RATE_MAX=500
```

**4. Permissões de Arquivo**
```bash
# Ajustar permissões
sudo chown -R $USER:$USER logs/ uploads/
chmod 755 logs/ uploads/
```

## Migração

Para migrar do sistema anterior, consulte o [Guia de Migração](MIGRATION_GUIDE.md).

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Crie um Pull Request

### Padrões de Código

- Use ESLint Standard
- Documente funções complexas
- Escreva testes para novas funcionalidades
- Mantenha logs informativos
- Valide todas as entradas de dados

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

- **Documentação**: README.md e MIGRATION_GUIDE.md
- **Logs**: Verifique `logs/app.log` para debugging
- **Issues**: Use o sistema de issues do repositório
- **Wiki**: Documentação adicional no wiki do projeto

---

**Versão**: 2.0.0
**Última Atualização**: 2025
**Compatibilidade**: Node.js 16+, MySQL 8.0+
