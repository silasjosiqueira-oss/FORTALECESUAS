const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Importar módulos refatorados
const { connectDatabase, getConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

// Importar rotas existentes
const estoqueRoutes = require('./src/routes/estoque');
const agendaRoutes = require('./src/routes/agenda');
const adminRoutes = require('./src/routes/admin');
const tenantsRoutes = require('./src/routes/tenants');
const app = express();

// ==========================================
// MIDDLEWARE MULTI-TENANT
// ==========================================

// Middleware para identificar o Tenant pelo subdomínio
const identifyTenant = async (req, res, next) => {
    try {
        const host = req.hostname || req.headers.host?.split(':')[0];

        // Extrair subdomínio
        const parts = host.split('.');
        let subdomain = null;

        // localhost:3000 ou IP direto = desenvolvimento
        if (host === 'localhost' || host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            subdomain = 'demo'; // Tenant padrão para desenvolvimento
            console.log('[DEV] Modo desenvolvimento - usando tenant "demo"');
        }
        // Subdomínio real: cliente.fortalecesuas.com
        else if (parts.length >= 3) {
            subdomain = parts[0];

            // Ignorar www e domínio principal
            if (subdomain === 'www' || subdomain === 'fortalecesuas') {
                return res.redirect('https://fortalecesuas.com/cadastro');
            }
        }
        // Domínio sem subdomínio
        else {
            return res.status(400).json({
                error: 'Acesso inválido. Use: https://seucliente.fortalecesuas.com'
            });
        }

        // Buscar tenant no banco
        const connection = await getConnection();
        const [tenants] = await connection.query(
            `SELECT t.*,
                    COUNT(u.id) as usuarios_ativos,
                    DATEDIFF(t.data_vencimento, NOW()) as dias_restantes
             FROM tenants t
             LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = TRUE
             WHERE t.subdomain = ?
             GROUP BY t.id`,
            [subdomain]
        );

        if (tenants.length === 0) {
            return res.status(404).json({
                error: 'Organização não encontrada',
                message: 'Entre em contato com o suporte ou verifique o endereço.'
            });
        }

        const tenant = tenants[0];

        // Verificar status do tenant
        if (tenant.status === 'suspenso') {
            return res.status(403).json({
                error: 'Conta suspensa',
                message: 'Entre em contato com o suporte para regularizar.'
            });
        }

        if (tenant.status === 'cancelado') {
            return res.status(403).json({
                error: 'Conta cancelada',
                message: 'Esta organização não possui mais acesso ao sistema.'
            });
        }

        // Verificar vencimento
        if (tenant.dias_restantes < 0) {
            return res.status(402).json({
                error: 'Assinatura vencida',
                message: `Sua assinatura venceu há ${Math.abs(tenant.dias_restantes)} dias. Renove para continuar.`,
                dias_vencidos: Math.abs(tenant.dias_restantes)
            });
        }

        // Aviso de vencimento próximo
        if (tenant.dias_restantes <= 7 && tenant.dias_restantes > 0) {
            res.set('X-Aviso-Vencimento', `Sua assinatura vence em ${tenant.dias_restantes} dias`);
        }

        // Anexar tenant ao request
        req.tenant = tenant;
        req.tenantId = tenant.id;

        console.log(`[OK] Tenant identificado: ${tenant.nome_organizacao} (${subdomain})`);
        next();

    } catch (error) {
        console.error('[ERRO] Erro ao identificar tenant:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura', (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }

        // Verificar se o token pertence ao tenant correto
        if (req.tenantId && decoded.tenantId !== req.tenantId) {
            return res.status(403).json({ error: 'Token não pertence a esta organização' });
        }

        req.user = decoded;
        next();
    });
};

// Middleware para verificar permissões
const checkPermission = (recurso, acao) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            // Admin tem todas as permissões
            if (req.user.perfil === 'admin') {
                return next();
            }

            const connection = await getConnection();
            const [permissoes] = await connection.query(
                `SELECT p.* FROM permissoes p
                 WHERE p.perfil = ? AND p.recurso = ? AND p.acao = ? AND p.permitido = TRUE`,
                [req.user.perfil, recurso, acao]
            );

            if (permissoes.length === 0) {
                return res.status(403).json({
                    error: 'Sem permissão',
                    message: `Você não tem permissão para ${acao} em ${recurso}`
                });
            }

            next();
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            res.status(500).json({ error: 'Erro ao verificar permissões' });
        }
    };
};

// ==========================================
// CONFIGURAÇÕES BÁSICAS
// ==========================================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS CORRIGIDO
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Requested-With',
        'X-Super-Admin-Key'
    ]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// SERVIR ARQUIVOS ESTÁTICOS (ANTES DE TUDO!)
// ==========================================

// Middleware para configurar MIME types corretos
app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.url.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
});

// Servir arquivos estáticos (SEM middleware de tenant)
app.use('/css', express.static(path.join(__dirname, 'css'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use(express.static(path.join(__dirname, 'public')));
// Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.hostname}`);
    next();
});

// ==========================================
// ROTAS PÚBLICAS (SEM TENANT)
// ==========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        multitenant: true
    });
});

// Rota inicial
app.get('/', (req, res) => {
    res.redirect('/pages/login.html');
});

// ==========================================
// ROTAS ADMINISTRATIVAS (SUPER ADMIN)
// DEVEM VIR ANTES DAS ROTAS COM TENANT
// ==========================================

// Rota de tenants (Super Admin - SEM identifyTenant)
app.use('/api/admin/tenants', tenantsRoutes);
console.log('[OK] Rota tenants (Super Admin) carregada');

// ==========================================
// FUNÇÃO DE LOGIN REUTILIZÁVEL (COM DEBUG)
// ==========================================

const handleLogin = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const tenantId = req.tenantId;

        console.log('[LOGIN] Dados recebidos:', { username, email, password: password ? '***' : 'undefined', tenantId });

        // Aceitar tanto username quanto email
        const loginField = username || email;

        if (!loginField || !password) {
            console.log('[ERRO] Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Usuário/email e senha são obrigatórios' });
        }

        const connection = await getConnection();

        console.log('[BUSCA] Buscando usuário:', loginField, 'no tenant:', tenantId);

        // Buscar usuário por username OU email
        const [users] = await connection.query(
            `SELECT u.*, t.nome_organizacao, t.subdomain, t.plano
             FROM usuarios u
             JOIN tenants t ON t.id = u.tenant_id
             WHERE u.tenant_id = ? AND (u.username = ? OR u.email = ?) AND u.ativo = TRUE`,
            [tenantId, loginField, loginField]
        );

        console.log('[INFO] Usuários encontrados:', users.length);

        if (users.length === 0) {
            console.log('[ERRO] Nenhum usuário encontrado');
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const user = users[0];
        console.log('[OK] Usuário encontrado:', {
            id: user.id,
            email: user.email,
            username: user.username,
            hashLength: user.senha_hash ? user.senha_hash.length : 0,
            hashPreview: user.senha_hash ? user.senha_hash.substring(0, 20) + '...' : 'null'
        });

        // Verificar senha
        console.log('[CHECK] Comparando senha...');
        const passwordMatch = await bcrypt.compare(password, user.senha_hash);
        console.log('[CHECK] Resultado da comparação:', passwordMatch);

        if (!passwordMatch) {
            console.log('[ERRO] Senha inválida');
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        console.log('[OK] Senha correta! Gerando token...');

        // Gerar token JWT
        const token = jwt.sign(
            {
                userId: user.id,
                tenantId: tenantId,
                username: user.username,
                perfil: user.perfil,
                nomeCompleto: user.nome_completo
            },
            process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura',
            { expiresIn: '8h' }
        );

        // Atualizar último acesso
        await connection.query(
            'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?',
            [user.id]
        );

        console.log('[OK] Login bem-sucedido para:', user.email);

        res.json({
            sucesso: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                nome_completo: user.nome_completo,
                email: user.email,
                perfil: user.perfil,
                cargo: user.cargo,
                permissoes: user.perfil === 'admin' ? ['todas'] : []
            },
            tenant: {
                id: tenantId,
                nome: user.nome_organizacao,
                subdomain: user.subdomain,
                plano: user.plano
            }
        });

    } catch (error) {
        console.error('[ERRO] Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

// ==========================================
// ROTAS DE AUTENTICAÇÃO (COM TENANT)
// ==========================================

// Login - Rota padrão com /api
app.post('/api/auth/login', identifyTenant, handleLogin);

// Login - Rota de compatibilidade sem /api
app.post('/auth/login', identifyTenant, handleLogin);

// ROTA VERIFICAR TOKEN
app.get('/auth/verificar', identifyTenant, async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token não fornecido'
            });
        }

        // Verificar token JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura');
        } catch (error) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token inválido ou expirado'
            });
        }

        // Buscar usuário no banco
        const connection = await getConnection();
        const [users] = await connection.query(
            `SELECT u.*, t.nome_organizacao, t.subdomain
             FROM usuarios u
             JOIN tenants t ON t.id = u.tenant_id
             WHERE u.id = ? AND u.tenant_id = ? AND u.ativo = TRUE`,
            [decoded.userId, req.tenantId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Sessão inválida'
            });
        }

        const user = users[0];

        res.json({
            sucesso: true,
            valido: true,
            sessao: {
                usuario_id: user.id,
                nome: user.nome_completo,
                email: user.email,
                cargo: user.cargo || 'N/A',
                unidade: user.unidade || 'N/A',
                nivel_acesso: user.perfil,
                permissoes: user.perfil === 'admin' ? ['todas'] : [],
                login_em: new Date(decoded.iat * 1000).toISOString(),
                expira_em: new Date(decoded.exp * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao verificar sessão'
        });
    }
});

// Validar token
app.get('/api/auth/validate', identifyTenant, authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user,
        tenant: {
            id: req.tenant.id,
            nome: req.tenant.nome_organizacao,
            plano: req.tenant.plano
        }
    });
});

// Logout
app.post('/auth/logout', (req, res) => {
    res.json({
        sucesso: true,
        mensagem: 'Logout realizado com sucesso'
    });
});

// ==========================================
// ROTAS DE USUÁRIOS (COM TENANT)
// ==========================================

// Criar usuário
app.post('/api/admin/usuarios', identifyTenant, authenticateToken, checkPermission('usuarios', 'criar'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { username, email, senha, nome_completo, cargo, perfil } = req.body;

        if (!username || !email || !senha) {
            return res.status(400).json({ error: 'Username, email e senha são obrigatórios' });
        }

        const connection = await getConnection();
        const senhaHash = await bcrypt.hash(senha, 10);

        const [result] = await connection.query(
            `INSERT INTO usuarios (tenant_id, username, email, senha_hash, nome_completo, cargo, perfil)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, username, email.toLowerCase(), senhaHash, nome_completo, cargo, perfil || 'tecnico']
        );

        res.json({
            sucesso: true,
            mensagem: 'Usuário criado com sucesso',
            userId: result.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Usuário ou email já existe' });
        }
        console.error('Erro ao registrar:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// ==========================================
// ROTAS DE ATENDIMENTOS (COM TENANT)
// ==========================================

// Listar atendimentos
app.get('/api/atendimentos', identifyTenant, authenticateToken, async (req, res) => {
    try {
        const connection = await getConnection();
        const [atendimentos] = await connection.query(
            `SELECT * FROM atendimentos
             WHERE tenant_id = ?
             ORDER BY data_hora DESC
             LIMIT 100`,
            [req.tenantId]
        );

        res.json(atendimentos);
    } catch (error) {
        console.error('Erro ao buscar atendimentos:', error);
        res.status(500).json({ error: 'Erro ao buscar atendimentos' });
    }
});

// Buscar atendimento por ID
app.get('/api/atendimentos/:id', identifyTenant, authenticateToken, async (req, res) => {
    try {
        const connection = await getConnection();
        const [atendimentos] = await connection.query(
            'SELECT * FROM atendimentos WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );

        if (atendimentos.length === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        res.json(atendimentos[0]);
    } catch (error) {
        console.error('Erro ao buscar atendimento:', error);
        res.status(500).json({ error: 'Erro ao buscar atendimento' });
    }
});

// Criar atendimento
app.post('/api/atendimentos', identifyTenant, authenticateToken, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const usuarioId = req.user.userId;
        const dados = req.body;

        const connection = await getConnection();

        // Gerar número de registro único por tenant
        const [lastRecord] = await connection.query(
            'SELECT MAX(CAST(registro AS UNSIGNED)) as ultimo FROM atendimentos WHERE tenant_id = ?',
            [tenantId]
        );

        let numeroRegistro = 1;
        if (lastRecord[0]?.ultimo) {
            numeroRegistro = lastRecord[0].ultimo + 1;
        }

        const registro = String(numeroRegistro).padStart(6, '0');

        const [result] = await connection.query(
            `INSERT INTO atendimentos (
                tenant_id, usuario_id, registro, nome_completo, cpf, telefone,
                tecnico_responsavel, tipo_atendimento, unidade, status, prioridade, dados_completos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                usuarioId,
                registro,
                dados.nomeCompleto,
                dados.cpf,
                dados.telefone,
                dados.tecnicoResponsavel,
                dados.tipoAtendimento || 'Atendimento Geral',
                dados.unidade || 'Secretaria',
                dados.statusInicial || 'aguardando',
                dados.prioridade || 'normal',
                JSON.stringify(dados)
            ]
        );

        res.json({
            sucesso: true,
            mensagem: 'Atendimento criado com sucesso',
            id: result.insertId,
            registro: registro
        });

    } catch (error) {
        console.error('Erro ao criar atendimento:', error);
        res.status(500).json({ error: 'Erro ao criar atendimento' });
    }
});

// Atualizar atendimento
app.put('/api/atendimentos/:id', identifyTenant, authenticateToken, async (req, res) => {
    try {
        const dados = req.body;
        const connection = await getConnection();

        const [result] = await connection.query(
            `UPDATE atendimentos SET
                nome_completo = ?,
                cpf = ?,
                telefone = ?,
                tecnico_responsavel = ?,
                tipo_atendimento = ?,
                unidade = ?,
                status = ?,
                prioridade = ?,
                dados_completos = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                dados.nomeCompleto,
                dados.cpf,
                dados.telefone,
                dados.tecnicoResponsavel,
                dados.tipoAtendimento,
                dados.unidade,
                dados.status,
                dados.prioridade,
                JSON.stringify(dados),
                req.params.id,
                req.tenantId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        res.json({ sucesso: true, mensagem: 'Atendimento atualizado' });

    } catch (error) {
        console.error('Erro ao atualizar:', error);
        res.status(500).json({ error: 'Erro ao atualizar atendimento' });
    }
});

// Deletar atendimento
app.delete('/api/atendimentos/:id', identifyTenant, authenticateToken, async (req, res) => {
    try {
        const connection = await getConnection();
        const [result] = await connection.query(
            'DELETE FROM atendimentos WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        res.json({ sucesso: true, mensagem: 'Atendimento excluído' });

    } catch (error) {
        console.error('Erro ao deletar:', error);
        res.status(500).json({ error: 'Erro ao deletar atendimento' });
    }
});

// ==========================================
// ROTAS MODULARES (COM TENANT)
// ==========================================

// Rotas principais com /api
app.use('/api/estoque', identifyTenant, authenticateToken, estoqueRoutes);
app.use('/api/agenda', identifyTenant, authenticateToken, agendaRoutes);
app.use('/api/admin', identifyTenant, authenticateToken, adminRoutes);

// Rotas legacy (para compatibilidade)
app.use('/estoque', identifyTenant, authenticateToken, estoqueRoutes);
app.use('/eventos', identifyTenant, authenticateToken, agendaRoutes);
app.use('/agendamentos', identifyTenant, authenticateToken, agendaRoutes);

// Carregar rotas dinamicamente
const routesToLoad = [
    { path: '/api/atividades', file: './src/routes/atividades', name: 'atividades' },
    { path: '/api/permissoes', file: './src/routes/permissoes', name: 'permissões' },
    { path: '/api/usuarios', file: './src/routes/usuarios', name: 'usuarios' },
    { path: '/api/profissionais', file: './src/routes/profissionais', name: 'profissionais' },
    { path: '/api/estatisticas', file: './src/routes/estatisticas', name: 'estatísticas' },
    { path: '/api/beneficios', file: './src/routes/beneficios', name: 'benefícios' }
];

routesToLoad.forEach(route => {
    try {
        const routeModule = require(route.file);
        app.use(route.path, identifyTenant, authenticateToken, routeModule);

        // Adicionar rotas legacy se for benefícios
        if (route.name === 'benefícios') {
            app.use('/beneficios', identifyTenant, authenticateToken, routeModule);
        }

        console.log(`[OK] Rota ${route.name} carregada`);
    } catch (e) {
        console.log(`[AVISO] Rota ${route.name} não encontrada: ${e.message}`);
    }
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        sucesso: false,
        mensagem: 'Rota não encontrada',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function startServer() {
    try {
        console.log('[INICIO] Inicializando Sistema CRAS Multi-Tenant...');
        console.log('');

        await connectDatabase();

        const PORT = process.env.PORT || 3000;

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('=================================================');
            console.log('  [OK] SERVIDOR MULTI-TENANT RODANDO');
            console.log('=================================================');
            console.log('');
            console.log('Porta: ' + PORT);
            console.log('Sistema: Multi-Tenant (Subdomínios)');
            console.log('Autenticação: JWT');
            console.log('');
            console.log('URLs de Exemplo:');
            console.log('   • Demo: http://demo.localhost:' + PORT);
            console.log('   • Cliente1: http://cliente1.fortalecesuas.com');
            console.log('   • Health: http://localhost:' + PORT + '/health');
            console.log('');
            console.log('API Endpoints:');
            console.log('   • Login: POST /auth/login');
            console.log('   • Verificar: GET /auth/verificar');
            console.log('   • Logout: POST /auth/logout');
            console.log('   • Atendimentos: GET /api/atendimentos');
            console.log('   • Usuários: GET /api/usuarios');
            console.log('   • Benefícios: GET /api/beneficios');
            console.log('   • Tenants (Super Admin): GET /api/admin/tenants');
            console.log('');
            console.log('=================================================');
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n[AVISO] Recebido sinal ${signal}, iniciando shutdown...`);
            server.close(async () => {
                console.log('[OK] Servidor HTTP fechado');
                try {
                    const { closeDatabase } = require('./src/config/database');
                    await closeDatabase();
                    console.log('[OK] Conexões do banco fechadas');
                } catch (error) {
                    console.error('[ERRO] Erro ao fechar conexões:', error);
                }
                console.log('[OK] Shutdown completo');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('[AVISO] Forçando shutdown após timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('[ERRO] Erro ao inicializar servidor:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
