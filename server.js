const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const responseTime = require('response-time');
require('dotenv').config();

const NodeCache = require('node-cache');
const tenantCache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
});

const { connectDatabase, getConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

const estoqueRoutes = require('./src/routes/estoque');
const agendaRoutes = require('./src/routes/agenda');
const adminRoutes = require('./src/routes/admin');
const tenantsRoutes = require('./src/routes/tenants');
const app = express();

const requestStats = new Map();

app.use(responseTime((req, res, time) => {
    const route = req.route?.path || req.path;
    const key = `${req.method}:${route}`;
    const current = requestStats.get(key) || { count: 0, total: 0, errors: 0 };

    requestStats.set(key, {
        count: current.count + 1,
        total: current.total + time,
        avg: (current.total + time) / (current.count + 1),
        errors: res.statusCode >= 400 ? current.errors + 1 : current.errors,
        lastAccess: new Date()
    });

    if (time > 1000) {
        logger.warn('Requisição lenta detectada', {
            method: req.method,
            path: req.path,
            time: Math.round(time),
            tenant: req.tenant?.nome_organizacao
        });
    }
}));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `${req.tenantId || 'no-tenant'}-${req.ip}`;
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    skipSuccessfulRequests: true
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'Limite de requisições excedido. Tente novamente em 1 minuto.' }
});

const identifyTenant = async (req, res, next) => {
    try {
        const host = req.hostname || req.headers.host?.split(':')[0];
        const parts = host.split('.');
        let subdomain = null;

        if (host === 'localhost' || host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            subdomain = 'demo';
            logger.info('[DEV] Modo desenvolvimento - usando tenant "demo"');
        } else if (parts.length >= 3) {
            subdomain = parts[0];

            if (subdomain === 'www' || subdomain === 'fortalecesuas') {
                return res.redirect('https://fortalecesuas.com/cadastro');
            }
        } else {
            return res.status(400).json({
                error: 'Acesso inválido. Use: https://seucliente.fortalecesuas.com'
            });
        }

        let tenant = tenantCache.get(subdomain);

        if (tenant) {
            logger.debug('Tenant carregado do cache', { subdomain, tenant: tenant.nome_organizacao });
        } else {
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

            tenant = tenants[0];
            tenantCache.set(subdomain, tenant);
            logger.debug('Tenant armazenado no cache', { subdomain, tenant: tenant.nome_organizacao });
        }

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

        if (tenant.dias_restantes < 0) {
            return res.status(402).json({
                error: 'Assinatura vencida',
                message: `Sua assinatura venceu há ${Math.abs(tenant.dias_restantes)} dias. Renove para continuar.`,
                dias_vencidos: Math.abs(tenant.dias_restantes)
            });
        }

        if (tenant.dias_restantes <= 7 && tenant.dias_restantes > 0) {
            res.set('X-Aviso-Vencimento', `Sua assinatura vence em ${tenant.dias_restantes} dias`);
        }

        req.tenant = tenant;
        req.tenantId = tenant.id;

        logger.info('Tenant identificado', {
            tenant: tenant.nome_organizacao,
            subdomain,
            status: tenant.status,
            dias_restantes: tenant.dias_restantes
        });

        next();

    } catch (error) {
        logger.error('Erro ao identificar tenant', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.warn('Token não fornecido', {
            path: req.path,
            ip: req.ip,
            tenant: req.tenant?.nome_organizacao
        });
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura', (err, decoded) => {
        if (err) {
            logger.warn('Token inválido ou expirado', {
                error: err.message,
                path: req.path,
                tenant: req.tenant?.nome_organizacao
            });
            res.setHeader('X-Auth-Status', 'invalid');
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }

        const isSuperAdmin = decoded.role === 'super_admin';

        if (isSuperAdmin) {
            logger.info('🔓 Acesso superadmin permitido', {
                username: decoded.username,
                tenant: req.tenant?.nome_organizacao || 'N/A',
                path: req.path
            });
            req.user = decoded;
            return next();
        }

        if (req.tenantId && decoded.tenantId !== req.tenantId) {
            logger.error('🚫 Token rejeitado - acesso cross-tenant detectado', {
                tokenTenant: decoded.tenantId,
                requestTenant: req.tenantId,
                subdomain: req.tenant?.subdomain,
                username: decoded.username || decoded.usuario,
                ip: req.ip
            });

            res.setHeader('X-Auth-Status', 'cross-tenant');
            return res.status(403).json({
                error: 'Token inválido para esta organização',
                message: 'Seu token pertence a outro cliente. Faça login novamente.'
            });
        }

        req.user = decoded;
        next();
    });
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Não autenticado',
            message: 'Token não fornecido ou inválido'
        });
    }

    if (req.user.role !== 'super_admin') {
        logger.warn('🚫 Acesso negado - não é super admin', {
            username: req.user.username,
            role: req.user.role,
            path: req.path
        });

        return res.status(403).json({
            error: 'Acesso negado',
            message: 'Apenas Super Admins podem acessar esta rota.'
        });
    }

    logger.info('✅ Super Admin autenticado', {
        username: req.user.username,
        path: req.path
    });

    next();
};

const checkPermission = (recurso, acao) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            if (req.user.role === 'super_admin' || req.user.perfil === 'admin') {
                logger.info('✅ Permissão concedida - Admin/Super Admin', {
                    usuario: req.user.username,
                    perfil: req.user.perfil || req.user.role,
                    recurso,
                    acao,
                    path: req.path
                });
                return next();
            }

            const cacheKey = `perm_${req.user.perfil}_${recurso}_${acao}`;
            let hasPermission = tenantCache.get(cacheKey);

            if (hasPermission === undefined) {
                const connection = await getConnection();
                const [permissoes] = await connection.query(
                    `SELECT p.* FROM permissoes p
                     WHERE p.perfil = ? AND p.recurso = ? AND p.acao = ? AND p.permitido = TRUE`,
                    [req.user.perfil, recurso, acao]
                );

                hasPermission = permissoes.length > 0;
                tenantCache.set(cacheKey, hasPermission, 300);
            }

            if (!hasPermission) {
                logger.warn('❌ Permissão negada', {
                    usuario: req.user.username,
                    perfil: req.user.perfil,
                    recurso,
                    acao,
                    path: req.path,
                    tenant: req.tenant?.nome_organizacao
                });
                return res.status(403).json({
                    error: 'Sem permissão',
                    message: `Você não tem permissão para ${acao} em ${recurso}`
                });
            }

            logger.info('✅ Permissão concedida', {
                usuario: req.user.username,
                perfil: req.user.perfil,
                recurso,
                acao,
                path: req.path
            });

            next();
        } catch (error) {
            logger.error('Erro ao verificar permissões', { error: error.message });
            res.status(500).json({ error: 'Erro ao verificar permissões' });
        }
    };
};

app.use(compression());

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            /\.fortalecesuas\.com$/,
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
        ];

        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(pattern =>
            typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
        );

        if (isAllowed || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            logger.warn('Origem CORS bloqueada', { origin });
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Requested-With',
        'X-Super-Admin-Key'
    ]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalLimiter);

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

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'cadastro.html'));
});

app.get("/superadmin", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "superadmin-login.html"));
});

app.get('/health', async (req, res) => {
    try {
        const connection = await getConnection();
        await connection.query('SELECT 1');

        const uptime = process.uptime();
        const memory = process.memoryUsage();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
            database: 'connected',
            cache: {
                tenants: tenantCache.keys().length,
                stats: tenantCache.getStats()
            },
            memory: {
                rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        logger.error('Health check falhou', { error: error.message });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
    }
});

app.get('/metrics', (req, res) => {
    const apiKey = req.headers['x-metrics-key'];

    if (apiKey !== process.env.METRICS_KEY && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const metrics = Array.from(requestStats.entries()).map(([route, data]) => ({
        route,
        requests: data.count,
        avgTime: Math.round(data.avg),
        totalTime: Math.round(data.total),
        errors: data.errors,
        errorRate: data.count > 0 ? ((data.errors / data.count) * 100).toFixed(2) + '%' : '0%',
        lastAccess: data.lastAccess
    }));

    metrics.sort((a, b) => b.requests - a.requests);

    res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        totalRequests: Array.from(requestStats.values()).reduce((sum, stat) => sum + stat.count, 0),
        cache: tenantCache.getStats(),
        routes: metrics
    });
});

app.post('/api/cache/clear', (req, res) => {
    const apiKey = req.headers['x-admin-key'];

    if (apiKey !== process.env.ADMIN_KEY && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const keys = tenantCache.keys();
    tenantCache.flushAll();

    logger.info('Cache limpo manualmente', { keysCleared: keys.length });

    res.json({
        success: true,
        message: 'Cache limpo com sucesso',
        keysCleared: keys.length
    });
});

app.get('/api/debug/me', authenticateToken, (req, res) => {
    res.json({
        user: req.user,
        isSuperAdmin: req.user.role === 'super_admin',
        tenant: req.tenant?.nome_organizacao || 'N/A'
    });
});

app.post('/auth/superadmin/login', authLimiter, async (req, res) => {
    try {
        const { username, password, usuario, senha } = req.body;

        const user = username || usuario;
        const pass = password || senha;

        if (!user || !pass) {
            return res.status(400).json({
                error: 'Usuário e senha são obrigatórios'
            });
        }

        const connection = await getConnection();

        const [usuarios] = await connection.query(
            'SELECT * FROM users WHERE username = ? AND role = ?',
            [user, 'super_admin']
        );

        if (usuarios.length === 0) {
            logger.warn('Tentativa de login super admin - usuário não encontrado', {
                username: user,
                ip: req.ip
            });
            return res.status(401).json({
                error: 'Usuário ou senha inválidos'
            });
        }

        const superAdmin = usuarios[0];

        const senhaValida = await bcrypt.compare(pass, superAdmin.password);

        if (!senhaValida) {
            logger.warn('Tentativa de login super admin - senha inválida', {
                username: user,
                ip: req.ip
            });
            return res.status(401).json({
                error: 'Usuário ou senha inválidos'
            });
        }

        const token = jwt.sign(
            {
                id: superAdmin.id,
                username: superAdmin.username,
                role: 'super_admin'
            },
            process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura',
            { expiresIn: '8h' }
        );

        logger.info('✅ Login super admin bem-sucedido', {
            username: superAdmin.username,
            ip: req.ip
        });

        res.json({
            sucesso: true,
            token,
            usuario: {
                id: superAdmin.id,
                username: superAdmin.username,
                role: 'super_admin'
            }
        });

    } catch (error) {
        logger.error('Erro no login do superadmin', { error: error.message });
        res.status(500).json({ error: 'Erro ao realizar login do superadmin' });
    }
});

app.post('/auth/login', authLimiter, identifyTenant, async (req, res) => {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        }

        const connection = await getConnection();
        const [usuarios] = await connection.query(
            `SELECT u.*, t.nome_organizacao, t.status as tenant_status
             FROM usuarios u
             INNER JOIN tenants t ON t.id = u.tenant_id
             WHERE (u.username = ? OR u.email = ?) AND u.tenant_id = ? AND u.ativo = TRUE`,
            [usuario, usuario, req.tenantId]
        );

        if (usuarios.length === 0) {
            logger.warn('Tentativa de login com usuário inválido', {
                usuario,
                tenant: req.tenant.nome_organizacao,
                ip: req.ip
            });
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const user = usuarios[0];

        const senhaValida = await bcrypt.compare(senha, user.senha_hash);

        if (!senhaValida) {
            logger.warn('Tentativa de login com senha inválida', {
                usuario,
                tenant: req.tenant.nome_organizacao,
                ip: req.ip
            });
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                perfil: user.perfil,
                tenantId: req.tenantId,
                nomeOrganizacao: user.nome_organizacao
            },
            process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura',
            { expiresIn: '8h' }
        );

        await connection.query(
            'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?',
            [user.id]
        );

        logger.info('Login bem-sucedido', {
            username: user.username,
            perfil: user.perfil,
            tenant: req.tenant.nome_organizacao
        });

        res.json({
            sucesso: true,
            token,
            usuario: {
                id: user.id,
                username: user.username,
                nome: user.nome_completo,
                email: user.email,
                perfil: user.perfil,
                organizacao: user.nome_organizacao
            }
        });

    } catch (error) {
        logger.error('Erro no login', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

app.get('/auth/verificar', identifyTenant, authenticateToken, (req, res) => {
    res.json({
        valido: true,
        usuario: req.user
    });
});

app.post('/auth/logout', identifyTenant, authenticateToken, (req, res) => {
    logger.info('Logout', {
        usuario: req.user.username,
        tenant: req.tenant?.nome_organizacao || 'N/A'
    });
    res.json({ sucesso: true, mensagem: 'Logout realizado' });
});

app.get('/', identifyTenant, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// ============================================
// 📋 ROTA: LISTAR TIPOS DE ATENDIMENTO
// ============================================
app.get('/api/tipos-atendimento', identifyTenant, authenticateToken, (req, res) => {
    const tipos = [
        {
            valor: 'atendimento_geral',
            nome: 'Atendimento Geral/Recepção',
            descricao: 'Atendimento básico e encaminhamentos',
            categoria: 'geral'
        },
        {
            valor: 'pia',
            nome: 'PIA - Plano Individual de Atendimento',
            descricao: 'Plano individual para crianças e adolescentes em acolhimento',
            categoria: 'especializado'
        },
        {
            valor: 'demanda_rede_protecao',
            nome: 'Demanda Rede de Proteção',
            descricao: 'Demandas vindas de órgãos da rede (MP, CT, etc)',
            categoria: 'rede'
        },
        {
            valor: 'acompanhamento_sociofamiliar',
            nome: 'Acompanhamento Sociofamiliar',
            descricao: 'Acompanhamento sistemático de famílias',
            categoria: 'paif'
        },
        {
            valor: 'acolhimento',
            nome: 'Acolhimento',
            descricao: 'Acolhimento institucional de crianças, adolescentes ou idosos',
            categoria: 'especializado'
        },
        {
            valor: 'movimentacao_beneficios',
            nome: 'Movimentação de Benefícios',
            descricao: 'Inclusão, atualização ou cancelamento de benefícios',
            categoria: 'beneficios'
        },
        {
            valor: 'oficina',
            nome: 'Oficina/Atividade Coletiva',
            descricao: 'Atividades em grupo e oficinas',
            categoria: 'coletivo'
        }
    ];

    res.json({
        sucesso: true,
        tipos
    });
});

// ============================================
// 📋 ROTAS DE ATENDIMENTOS COM TIPOS
// ============================================
app.get('/api/atendimentos', identifyTenant, authenticateToken, checkPermission('atendimentos', 'ler'), async (req, res) => {
    try {
        const { dataInicio, dataFim, status, tecnico, busca, cpf, tipo, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT
                a.*,
                DATE_FORMAT(a.data_atendimento, '%d/%m/%Y') as data_formatada
            FROM atendimentos a
            WHERE a.tenant_id = ?
        `;
        const params = [req.tenantId];

        if (tipo) {
            query += ' AND a.tipo_atendimento = ?';
            params.push(tipo);
        }

        if (cpf) {
            const cpfLimpo = cpf.replace(/\D/g, '');
            query += ' AND a.cpf = ?';
            params.push(cpfLimpo);
        }

        if (dataInicio) {
            query += ' AND a.data_atendimento >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            query += ' AND a.data_atendimento <= ?';
            params.push(dataFim);
        }
        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }
        if (tecnico) {
            query += ' AND a.tecnico_responsavel = ?';
            params.push(tecnico);
        }
        if (busca) {
            query += ' AND (a.nome_completo LIKE ? OR a.cpf LIKE ? OR a.telefone LIKE ?)';
            const buscaTermo = `%${busca}%`;
            params.push(buscaTermo, buscaTermo, buscaTermo);
        }

        query += ' ORDER BY a.data_atendimento DESC, a.hora_atendimento DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const connection = await getConnection();
        const [atendimentos] = await connection.query(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM atendimentos a WHERE a.tenant_id = ?';
        const countParams = [req.tenantId];

        if (tipo) {
            countQuery += ' AND a.tipo_atendimento = ?';
            countParams.push(tipo);
        }

        if (cpf) {
            const cpfLimpo = cpf.replace(/\D/g, '');
            countQuery += ' AND a.cpf = ?';
            countParams.push(cpfLimpo);
        }

        if (dataInicio) {
            countQuery += ' AND a.data_atendimento >= ?';
            countParams.push(dataInicio);
        }
        if (dataFim) {
            countQuery += ' AND a.data_atendimento <= ?';
            countParams.push(dataFim);
        }
        if (status) {
            countQuery += ' AND a.status = ?';
            countParams.push(status);
        }
        if (tecnico) {
            countQuery += ' AND a.tecnico_responsavel = ?';
            countParams.push(tecnico);
        }
        if (busca) {
            countQuery += ' AND (a.nome_completo LIKE ? OR a.cpf LIKE ? OR a.telefone LIKE ?)';
            const buscaTermo = `%${busca}%`;
            countParams.push(buscaTermo, buscaTermo, buscaTermo);
        }

        const [[{ total }]] = await connection.query(countQuery, countParams);

        res.json({
            sucesso: true,
            atendimentos,
            paginacao: {
                total,
                pagina: parseInt(page),
                limite: parseInt(limit),
                totalPaginas: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Erro ao listar atendimentos', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar atendimentos' });
    }
});

// ============================================
// 📋 ROTA: BUSCAR ATENDIMENTOS POR TIPO ESPECÍFICO
// ============================================
app.get('/api/atendimentos/pia', identifyTenant, authenticateToken, checkPermission('atendimentos', 'ler'), async (req, res) => {
    try {
        const { dataInicio, dataFim, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT a.*, DATE_FORMAT(a.data_atendimento, '%d/%m/%Y') as data_formatada
            FROM atendimentos a
            WHERE a.tenant_id = ? AND a.tipo_atendimento = 'pia'
        `;
        const params = [req.tenantId];

        if (dataInicio) {
            query += ' AND a.data_atendimento >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            query += ' AND a.data_atendimento <= ?';
            params.push(dataFim);
        }

        query += ' ORDER BY a.data_atendimento DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const connection = await getConnection();
        const [atendimentos] = await connection.query(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM atendimentos a
                         WHERE a.tenant_id = ? AND a.tipo_atendimento = 'pia'`;
        const countParams = [req.tenantId];

        if (dataInicio) {
            countQuery += ' AND a.data_atendimento >= ?';
            countParams.push(dataInicio);
        }
        if (dataFim) {
            countQuery += ' AND a.data_atendimento <= ?';
            countParams.push(dataFim);
        }

        const [[{ total }]] = await connection.query(countQuery, countParams);

        res.json({
            sucesso: true,
            tipo: 'pia',
            atendimentos,
            paginacao: {
                total,
                pagina: parseInt(page),
                limite: parseInt(limit),
                totalPaginas: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Erro ao listar PIAs', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar PIAs' });
    }
});

app.get('/api/atendimentos/acolhimentos', identifyTenant, authenticateToken, checkPermission('atendimentos', 'ler'), async (req, res) => {
    try {
        const { dataInicio, dataFim, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT a.*, DATE_FORMAT(a.data_atendimento, '%d/%m/%Y') as data_formatada
            FROM atendimentos a
            WHERE a.tenant_id = ? AND a.tipo_atendimento = 'acolhimento'
        `;
        const params = [req.tenantId];

        if (dataInicio) {
            query += ' AND a.data_atendimento >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            query += ' AND a.data_atendimento <= ?';
            params.push(dataFim);
        }

        query += ' ORDER BY a.data_atendimento DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const connection = await getConnection();
        const [atendimentos] = await connection.query(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM atendimentos a
                         WHERE a.tenant_id = ? AND a.tipo_atendimento = 'acolhimento'`;
        const countParams = [req.tenantId];

        if (dataInicio) {
            countQuery += ' AND a.data_atendimento >= ?';
            countParams.push(dataInicio);
        }
        if (dataFim) {
            countQuery += ' AND a.data_atendimento <= ?';
            countParams.push(dataFim);
        }

        const [[{ total }]] = await connection.query(countQuery, countParams);

        res.json({
            sucesso: true,
            tipo: 'acolhimento',
            atendimentos,
            paginacao: {
                total,
                pagina: parseInt(page),
                limite: parseInt(limit),
                totalPaginas: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Erro ao listar acolhimentos', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar acolhimentos' });
    }
});

app.get('/api/atendimentos/demandas-rede', identifyTenant, authenticateToken, checkPermission('atendimentos', 'ler'), async (req, res) => {
    try {
        const { dataInicio, dataFim, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT a.*, DATE_FORMAT(a.data_atendimento, '%d/%m/%Y') as data_formatada
            FROM atendimentos a
            WHERE a.tenant_id = ? AND a.tipo_atendimento = 'demanda_rede_protecao'
        `;
        const params = [req.tenantId];

        if (dataInicio) {
            query += ' AND a.data_atendimento >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            query += ' AND a.data_atendimento <= ?';
            params.push(dataFim);
        }

        query += ' ORDER BY a.data_atendimento DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const connection = await getConnection();
        const [atendimentos] = await connection.query(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM atendimentos a
                         WHERE a.tenant_id = ? AND a.tipo_atendimento = 'demanda_rede_protecao'`;
        const countParams = [req.tenantId];

        if (dataInicio) {
            countQuery += ' AND a.data_atendimento >= ?';
            countParams.push(dataInicio);
        }
        if (dataFim) {
            countQuery += ' AND a.data_atendimento <= ?';
            countParams.push(dataFim);
        }

        const [[{ total }]] = await connection.query(countQuery, countParams);

        res.json({
            sucesso: true,
            tipo: 'demanda_rede_protecao',
            atendimentos,
            paginacao: {
                total,
                pagina: parseInt(page),
                limite: parseInt(limit),
                totalPaginas: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Erro ao listar demandas da rede', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar demandas da rede' });
    }
});

// ============================================
// 📊 ESTATÍSTICAS POR TIPO DE ATENDIMENTO
// ============================================
app.get('/api/atendimentos/estatisticas/tipos', identifyTenant, authenticateToken, checkPermission('atendimentos', 'ler'), async (req, res) => {
    try {
        const { dataInicio, dataFim } = req.query;

        let query = `
            SELECT
                tipo_atendimento,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'concluido' THEN 1 END) as concluidos,
                COUNT(CASE WHEN status = 'em_andamento' THEN 1 END) as em_andamento,
                COUNT(CASE WHEN status = 'aguardando' THEN 1 END) as aguardando,
                COUNT(CASE WHEN prioridade = 'urgente' THEN 1 END) as urgentes
            FROM atendimentos
            WHERE tenant_id = ?
        `;
        const params = [req.tenantId];

        if (dataInicio) {
            query += ' AND data_atendimento >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            query += ' AND data_atendimento <= ?';
            params.push(dataFim);
        }

        query += ' GROUP BY tipo_atendimento ORDER BY total DESC';

        const connection = await getConnection();
        const [estatisticas] = await connection.query(query, params);

        // Total geral
        const [[{ total_geral }]] = await connection.query(
            `SELECT COUNT(*) as total_geral FROM atendimentos WHERE tenant_id = ?` +
            (dataInicio ? ' AND data_atendimento >= ?' : '') +
            (dataFim ? ' AND data_atendimento <= ?' : ''),
            [req.tenantId, dataInicio, dataFim].filter(p => p)
        );

        res.json({
            sucesso: true,
            periodo: {
                dataInicio: dataInicio || null,
                dataFim: dataFim || null
            },
            total_geral,
            por_tipo: estatisticas
        });

    } catch (error) {
        logger.error('Erro ao buscar estatísticas por tipo', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ============================================
// 📋 BUSCAR ATENDIMENTO POR ID
// ============================================
app.get('/api/atendimentos/:id', identifyTenant, authenticateToken, checkPermission('atendimentos', 'ler'), async (req, res) => {
    try {
        const connection = await getConnection();
        const [atendimentos] = await connection.query(
            `SELECT a.*,
                    DATE_FORMAT(a.data_atendimento, '%d/%m/%Y') as data_formatada
             FROM atendimentos a
             WHERE a.id = ? AND a.tenant_id = ?`,
            [req.params.id, req.tenantId]
        );

        if (atendimentos.length === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        res.json({ sucesso: true, atendimento: atendimentos[0] });

    } catch (error) {
        logger.error('Erro ao buscar atendimento', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao buscar atendimento' });
    }
});

// ============================================
// ✏️ CRIAR ATENDIMENTO (QUALQUER TIPO)
// ============================================
app.post('/api/atendimentos', identifyTenant, authenticateToken, checkPermission('atendimentos', 'criar'), async (req, res) => {
    try {
        const dados = req.body;

        if (!dados.nomeCompleto || !dados.cpf) {
            return res.status(400).json({
                error: 'Dados obrigatórios faltando',
                campos: ['nomeCompleto', 'cpf']
            });
        }

        const connection = await getConnection();

        const ano = new Date().getFullYear();

        const [ultimoRegistro] = await connection.query(
            `SELECT registro FROM atendimentos
             WHERE tenant_id = ? AND registro LIKE ?
             ORDER BY id DESC LIMIT 1`,
            [req.tenantId, `${ano}-%`]
        );

        let numeroSequencial = 1;
        if (ultimoRegistro.length > 0 && ultimoRegistro[0].registro) {
            const match = ultimoRegistro[0].registro.match(/\d{4}-(\d+)/);
            if (match && match[1]) {
                numeroSequencial = parseInt(match[1]) + 1;
            }
        }

        const registro = `${ano}-${String(numeroSequencial).padStart(4, '0')}`;

        const [result] = await connection.query(
            `INSERT INTO atendimentos (
                tenant_id, usuario_id, registro, data_atendimento, hora_atendimento,
                nome_completo, cpf, telefone, data_nascimento,
                tecnico_responsavel, tipo_atendimento, unidade,
                status, prioridade, dados_completos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.tenantId,
                req.user.id,
                registro,
                dados.dataAtendimento || null,
                dados.horaAtendimento || null,
                dados.nomeCompleto,
                dados.cpf,
                dados.telefone,
                dados.dataNascimento || null,
                dados.tecnicoResponsavel,
                dados.tipoAtendimento || 'atendimento_geral',
                dados.unidade || 'Secretaria',
                dados.status || 'aguardando',
                dados.prioridade || 'normal',
                JSON.stringify(dados)
            ]
        );

        logger.info('Atendimento criado', {
            id: result.insertId,
            registro,
            tipo: dados.tipoAtendimento,
            usuario: req.user.username,
            tenant: req.tenant.nome_organizacao
        });

        res.json({
            sucesso: true,
            mensagem: 'Atendimento criado com sucesso',
            id: result.insertId,
            registro: registro
        });

    } catch (error) {
        logger.error('Erro ao criar atendimento', { error: error.message });
        res.status(500).json({ error: 'Erro ao criar atendimento' });
    }
});

// ============================================
// 🔄 ATUALIZAR ATENDIMENTO
// ============================================
app.put('/api/atendimentos/:id', identifyTenant, authenticateToken, checkPermission('atendimentos', 'editar'), async (req, res) => {
    try {
        const dados = req.body;
        const connection = await getConnection();

        const [result] = await connection.query(
            `UPDATE atendimentos SET
                data_atendimento = ?,
                hora_atendimento = ?,
                nome_completo = ?,
                cpf = ?,
                telefone = ?,
                data_nascimento = ?,
                tecnico_responsavel = ?,
                tipo_atendimento = ?,
                unidade = ?,
                status = ?,
                prioridade = ?,
                dados_completos = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                dados.dataAtendimento || null,
                dados.horaAtendimento || null,
                dados.nomeCompleto,
                dados.cpf,
                dados.telefone,
                dados.dataNascimento || null,
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

        logger.info('Atendimento atualizado', {
            id: req.params.id,
            usuario: req.user.username,
            tenant: req.tenant.nome_organizacao
        });

        res.json({ sucesso: true, mensagem: 'Atendimento atualizado' });

    } catch (error) {
        logger.error('Erro ao atualizar atendimento', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao atualizar atendimento' });
    }
});

// ============================================
// 🗑️ DELETAR ATENDIMENTO
// ============================================
app.delete('/api/atendimentos/:id', identifyTenant, authenticateToken, checkPermission('atendimentos', 'deletar'), async (req, res) => {
    try {
        const connection = await getConnection();
        const [result] = await connection.query(
            'DELETE FROM atendimentos WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        logger.info('Atendimento excluído', {
            id: req.params.id,
            usuario: req.user.username,
            tenant: req.tenant.nome_organizacao
        });

        res.json({ sucesso: true, mensagem: 'Atendimento excluído' });

    } catch (error) {
        logger.error('Erro ao deletar atendimento', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao deletar atendimento' });
    }
});

app.use('/api/', apiLimiter);

app.use('/api/estoque', identifyTenant, authenticateToken, checkPermission('estoque', 'ler'), estoqueRoutes);
app.use('/api/agenda', identifyTenant, authenticateToken, checkPermission('agenda', 'ler'), agendaRoutes);
app.use('/api/admin', identifyTenant, authenticateToken, checkPermission('admin', 'ler'), adminRoutes);

app.use('/api/admin/tenants', authenticateToken, requireSuperAdmin, tenantsRoutes);

app.use('/estoque', identifyTenant, authenticateToken, checkPermission('estoque', 'ler'), estoqueRoutes);
app.use('/eventos', identifyTenant, authenticateToken, checkPermission('agenda', 'ler'), agendaRoutes);
app.use('/agendamentos', identifyTenant, authenticateToken, checkPermission('agenda', 'ler'), agendaRoutes);

const routesToLoad = [
    { path: '/api/atividades', file: './src/routes/atividades', name: 'atividades', recurso: 'atividades' },
    { path: '/api/permissoes', file: './src/routes/permissoes', name: 'permissões', recurso: 'permissoes' },
    { path: '/api/usuarios', file: './src/routes/usuarios', name: 'usuarios', recurso: 'usuarios' },
    { path: '/api/profissionais', file: './src/routes/profissionais', name: 'profissionais', recurso: 'profissionais' },
    { path: '/api/estatisticas', file: './src/routes/estatisticas', name: 'estatísticas', recurso: 'estatisticas' },
    { path: '/api/beneficios', file: './src/routes/beneficios', name: 'benefícios', recurso: 'beneficios' }
];

routesToLoad.forEach(route => {
    try {
        const routeModule = require(route.file);
        app.use(route.path, identifyTenant, authenticateToken, checkPermission(route.recurso, 'ler'), routeModule);

        if (route.name === 'benefícios') {
            app.use('/beneficios', identifyTenant, authenticateToken, checkPermission(route.recurso, 'ler'), routeModule);
        }

        logger.info(`✅ Rota ${route.name} carregada com permissões`);
    } catch (e) {
        logger.warn(`Rota ${route.name} não encontrada`, { error: e.message });
    }
});

app.use((req, res) => {
    logger.warn('Rota não encontrada', {
        path: req.path,
        method: req.method,
        tenant: req.tenant?.nome_organizacao
    });
    res.status(404).json({
        sucesso: false,
        mensagem: 'Rota não encontrada',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    logger.error('Erro não tratado', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        tenant: req.tenant?.nome_organizacao
    });
    res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

async function startServer() {
    try {
        logger.info('Inicializando Sistema CRAS Multi-Tenant...');

        await connectDatabase();

        const PORT = process.env.PORT || 3000;

        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info('');
            logger.info('=================================================');
            logger.info('  ✅ SERVIDOR MULTI-TENANT COM TIPOS DE ATENDIMENTO');
            logger.info('=================================================');
            logger.info('');
            logger.info(`Porta: ${PORT}`);
            logger.info('Sistema: Multi-Tenant (Subdomínios)');
            logger.info('Autenticação: JWT');
            logger.info('Cache: Node-Cache (300s TTL)');
            logger.info('Rate Limiting: Ativo');
            logger.info('Compression: Ativo');
            logger.info('Métricas: Ativo');
            logger.info('🔐 Permissões: ATIVO EM TODAS AS ROTAS');
            logger.info('📋 Tipos de Atendimento: ATIVO');
            logger.info('');
            logger.info('URLs de Exemplo:');
            logger.info(`   • Demo: http://demo.localhost:${PORT}`);
            logger.info('   • Cliente1: http://cliente1.fortalecesuas.com');
            logger.info(`   • Health: http://localhost:${PORT}/health`);
            logger.info(`   • Metrics: http://localhost:${PORT}/metrics`);
            logger.info('');
            logger.info('API Endpoints - Atendimentos:');
            logger.info('   • GET  /api/tipos-atendimento - Lista tipos disponíveis');
            logger.info('   • GET  /api/atendimentos - Lista todos (com filtro ?tipo=)');
            logger.info('   • GET  /api/atendimentos/:id - Busca por ID');
            logger.info('   • POST /api/atendimentos - Cria atendimento');
            logger.info('   • PUT  /api/atendimentos/:id - Atualiza atendimento');
            logger.info('   • DEL  /api/atendimentos/:id - Deleta atendimento');
            logger.info('');
            logger.info('API Endpoints - Por Tipo:');
            logger.info('   • GET  /api/atendimentos/pia - Lista PIAs');
            logger.info('   • GET  /api/atendimentos/acolhimentos - Lista acolhimentos');
            logger.info('   • GET  /api/atendimentos/demandas-rede - Lista demandas');
            logger.info('   • GET  /api/atendimentos/estatisticas/tipos - Stats por tipo');
            logger.info('');
            logger.info('Tipos Disponíveis:');
            logger.info('   ✓ atendimento_geral');
            logger.info('   ✓ pia (Plano Individual de Atendimento)');
            logger.info('   ✓ demanda_rede_protecao');
            logger.info('   ✓ acompanhamento_sociofamiliar');
            logger.info('   ✓ acolhimento');
            logger.info('   ✓ movimentacao_beneficios');
            logger.info('   ✓ oficina');
            logger.info('');
            logger.info('=================================================');
        });

        const gracefulShutdown = async (signal) => {
            logger.warn(`Recebido sinal ${signal}, iniciando shutdown gracioso...`);

            server.close(async () => {
                logger.info('Servidor HTTP fechado');

                try {
                    tenantCache.flushAll();
                    logger.info('Cache limpo');

                    const { closeDatabase } = require('./src/config/database');
                    await closeDatabase();
                    logger.info('Conexões do banco fechadas');

                    const totalRequests = Array.from(requestStats.values())
                        .reduce((sum, stat) => sum + stat.count, 0);
                    logger.info('Estatísticas finais', {
                        totalRequests,
                        uptime: process.uptime()
                    });

                } catch (error) {
                    logger.error('Erro durante shutdown', { error: error.message });
                }

                logger.info('Shutdown completo. Até logo! 👋');
                process.exit(0);
            });

            setTimeout(() => {
                logger.error('Forçando shutdown após timeout de 10s');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        process.on('uncaughtException', (error) => {
            logger.error('Exceção não capturada', { error: error.message, stack: error.stack });
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Promise rejeitada não tratada', { reason, promise });
        });

    } catch (error) {
        logger.error('Erro ao inicializar servidor', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
