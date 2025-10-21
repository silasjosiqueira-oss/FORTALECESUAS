const path = require('path');

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Erro: Variável de ambiente ${envVar} é obrigatória`);
        process.exit(1);
    }
}

const config = {
    // Servidor
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',

    // Banco de dados
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306,
        charset: 'utf8mb4',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        timeout: parseInt(process.env.DB_TIMEOUT) || 60000
    },

    // Autenticação
    auth: {
        jwtSecret: process.env.JWT_SECRET,
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutos
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutos
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
        csrfSecret: process.env.CSRF_SECRET || process.env.JWT_SECRET + '_csrf'
    },

    // CORS
    cors: {
        allowedOrigins: process.env.NODE_ENV === 'production'
            ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
            : [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:8080',
                'http://127.0.0.1:8080'
            ]
    },

    // Rate Limiting
    rateLimit: {
        auth: {
            windowMs: parseInt(process.env.AUTH_RATE_WINDOW) || 15 * 60 * 1000, // 15 minutos
            max: parseInt(process.env.AUTH_RATE_MAX) || 5,
            message: { success: false, error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
        },
        api: {
            windowMs: parseInt(process.env.API_RATE_WINDOW) || 15 * 60 * 1000, // 15 minutos
            max: parseInt(process.env.API_RATE_MAX) || 100,
            message: { success: false, error: 'Muitas requisições. Tente novamente mais tarde.' }
        }
    },

    // Logs
    logging: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        file: {
            enabled: process.env.LOG_FILE_ENABLED === 'true',
            path: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs')
        },
        console: {
            enabled: process.env.LOG_CONSOLE_ENABLED !== 'false'
        }
    },

    // Upload de arquivos
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,application/pdf').split(',')
    },

    // Cache (Redis)
    redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        ttl: parseInt(process.env.REDIS_TTL) || 3600 // 1 hora
    },

    // Email (se implementado futuramente)
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@cras.gov.br'
    }
};

// Validações específicas para produção
if (config.env === 'production') {
    if (config.cors.allowedOrigins.length === 0) {
        console.error('Erro: ALLOWED_ORIGINS deve ser definida em produção');
        process.exit(1);
    }

    if (config.auth.jwtSecret.length < 32) {
        console.error('Erro: JWT_SECRET deve ter pelo menos 32 caracteres em produção');
        process.exit(1);
    }
}

module.exports = config;
