# Guia de Migração - Sistema CRAS Refatorado

Este documento descreve como migrar do sistema anterior para a versão refatorada.

## 📋 Pré-requisitos

### Software Necessário
- **Node.js**: Versão 16 ou superior
- **MySQL**: Versão 8.0 ou superior
- **npm**: Versão 8 ou superior

### Verificar Versões
```bash
node --version    # >= 16.0.0
npm --version     # >= 8.0.0
mysql --version   # >= 8.0.0
```

## 🚀 Processo de Migração

### 1. Backup dos Dados Existentes

**⚠️ IMPORTANTE: Sempre faça backup antes da migração!**

```bash
# Backup completo do banco de dados
mysqldump -u root -p sistema_assistencia > backup_sistema_$(date +%Y%m%d).sql

# Backup dos arquivos do sistema antigo
cp -r /caminho/sistema-antigo /caminho/backup-sistema-antigo-$(date +%Y%m%d)
```

### 2. Instalação do Sistema Refatorado

```bash
# 1. Clone ou descompacte o sistema refatorado
cd /caminho/sistema-cras-refatorado

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
nano .env
```

### 3. Configuração das Variáveis de Ambiente

Edite o arquivo `.env` com suas configurações:

```bash
# CONFIGURAÇÕES OBRIGATÓRIAS
NODE_ENV=production
PORT=3000

# BANCO DE DADOS
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_segura
DB_NAME=sistema_assistencia
DB_PORT=3306

# SEGURANÇA - GERE CHAVES SEGURAS!
JWT_SECRET=sua_chave_jwt_muito_longa_e_segura_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_muito_longa_e_segura_aqui
CSRF_SECRET=sua_chave_csrf_segura_aqui

# CORS - DEFINA APENAS OS DOMÍNIOS AUTORIZADOS
ALLOWED_ORIGINS=https://seu-dominio.com.br,https://www.seu-dominio.com.br
```

**🔐 Geração de Chaves Seguras:**
```bash
# Gerar chaves aleatórias seguras
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Estrutura de Pastas

Crie a estrutura de pastas necessária:

```bash
mkdir -p logs
mkdir -p uploads
mkdir -p backups
mkdir -p tmp

# Ajustar permissões
chmod 755 logs uploads backups tmp
```

### 5. Migração do Banco de Dados

O sistema refatorado criará automaticamente as tabelas necessárias na primeira execução, mas você pode fazer a migração manual:

```bash
# Testar conexão com o banco
npm run test:db

# Executar migração (se disponível)
npm run migrate
```

### 6. Migração dos Dados Existentes

Se você tem dados do sistema anterior, execute as queries de migração:

```sql
-- Conectar ao MySQL
mysql -u root -p

-- Usar o banco de dados
USE sistema_assistencia;

-- Verificar tabelas existentes
SHOW TABLES;

-- Migrar dados de usuários (se necessário)
INSERT INTO usuarios (nome_completo, cpf, telefone, email, endereco, bairro, data_nascimento, criado_em)
SELECT nome_completo, cpf, telefone, email, endereco, bairro, data_nascimento, criado_em
FROM usuarios_antigo
WHERE cpf IS NOT NULL AND cpf != '';

-- Migrar profissionais (se necessário)
INSERT INTO profissionais (nome_profissional, cargo, especialidade, ativo, criado_em)
SELECT nome_profissional, cargo, especialidade, ativo, criado_em
FROM profissionais_antigo;

-- Migrar atendimentos (se necessário)
INSERT INTO atendimentos (id_usuario, id_profissional, tipo_atendimento, status, prioridade, observacoes, data_atendimento, criado_em)
SELECT u.id_usuario, p.id_profissional,
       CASE
         WHEN tipo LIKE '%psico%' THEN 'psicologia'
         WHEN tipo LIKE '%social%' THEN 'social'
         WHEN tipo LIKE '%jurid%' THEN 'juridico'
         ELSE 'outros'
       END as tipo_atendimento,
       COALESCE(status, 'aguardando') as status,
       COALESCE(prioridade, 'normal') as prioridade,
       observacoes,
       data_atendimento,
       criado_em
FROM atendimentos_antigo a
LEFT JOIN usuarios u ON a.cpf_usuario = u.cpf
LEFT JOIN profissionais p ON a.nome_profissional = p.nome_profissional;
```

### 7. Primeira Execução

```bash
# Executar em modo de desenvolvimento para testar
npm run dev

# Verificar logs
tail -f logs/app.log

# Testar acesso
curl http://localhost:3000/health
```

### 8. Validação da Migração

Checklist de validação:

- [ ] ✅ Sistema inicializa sem erros
- [ ] ✅ Login do administrador funciona (admin/admin123)
- [ ] ✅ Banco de dados conecta corretamente
- [ ] ✅ Rotas principais funcionam
- [ ] ✅ Dados foram migrados corretamente
- [ ] ✅ Logs estão sendo gerados
- [ ] ✅ Autenticação JWT funciona
- [ ] ✅ Rate limiting está ativo

**Teste das rotas principais:**
```bash
# Saúde do sistema
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "senha": "admin123"}'

# Listar atendimentos (com token)
curl http://localhost:3000/api/atendimentos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🔄 Principais Mudanças

### Estrutura de Arquivos
- **Antes**: Arquivo monolítico `server.cjs`
- **Depois**: Estrutura modular em `/src`

### Autenticação
- **Antes**: Sistema básico
- **Depois**: JWT com refresh tokens, rate limiting, logs de segurança

### Banco de Dados
- **Antes**: Pool simples
- **Depois**: Pool otimizado com transações e tratamento de erros

### Logging
- **Antes**: console.log básico
- **Depois**: Sistema Winston com níveis e arquivos

### Validação
- **Antes**: Validação manual
- **Depois**: express-validator + validadores customizados

### Tratamento de Erros
- **Antes**: Try/catch simples
- **Depois**: Sistema centralizado com classes de erro

## 🚦 Configuração para Produção

### 1. PM2 (Recomendado)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Criar arquivo de configuração
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sistema-cras',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
EOF

# Iniciar em produção
pm2 start ecosystem.config.js --env production

# Salvar configuração
pm2 save
pm2 startup
```

### 2. Nginx (Proxy Reverso)
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL/TLS com Certbot
```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com.br
```

## 🔧 Solução de Problemas

### Problemas Comuns

**1. Erro de Conexão com Banco**
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Verificar conectividade
mysql -u root -p -h localhost

# Verificar variáveis de ambiente
cat .env | grep DB_
```

**2. Erro de Permissões**
```bash
# Ajustar permissões dos logs
sudo chown -R $USER:$USER logs/
chmod 755 logs/

# Verificar permissões do Node.js na porta
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

**3. Erros de JWT**
```bash
# Verificar se as chaves estão definidas
echo $JWT_SECRET

# Gerar novas chaves se necessário
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**4. Rate Limiting Muito Restritivo**
```bash
# Temporariamente aumentar limites em .env
AUTH_RATE_MAX=20
API_RATE_MAX=500

# Adicionar IPs à whitelist
RATE_LIMIT_WHITELIST=127.0.0.1,SEU_IP_AQUI
```

## 📊 Monitoramento

### Logs Importantes
```bash
# Log geral da aplicação
tail -f logs/app.log

# Logs de erro
tail -f logs/error.log

# Logs de segurança
tail -f logs/security.log

# PM2 logs (se usando)
pm2 logs sistema-cras
```

### Métricas de Sistema
```bash
# Status do PM2
pm2 status

# Uso de recursos
pm2 monit

# Reiniciar se necessário
pm2 restart sistema-cras
```

## 🎯 Próximos Passos

Após a migração bem-sucedida:

1. **Configurar backups automáticos**
2. **Implementar monitoramento de saúde**
3. **Configurar alertas de erro**
4. **Treinar usuários nas novas funcionalidades**
5. **Personalizar para necessidades específicas**

## 📞 Suporte

Em caso de problemas durante a migração:

1. Verifique os logs em `logs/app.log`
2. Consulte a documentação técnica
3. Verifique as issues conhecidas no repositório
4. Entre em contato com a equipe de suporte

---

**⚠️ Lembrete importante**: Mantenha sempre backups atualizados e teste a migração em ambiente de desenvolvimento antes de aplicar em produção!
