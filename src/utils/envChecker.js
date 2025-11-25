const logger = require('./logger');

/**
 * Variáveis obrigatórias
 */
const REQUIRED_VARS = [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

/**
 * Variáveis recomendadas
 */
const RECOMMENDED_VARS = [
    'REDIS_HOST',
    'REDIS_PORT',
    'ADMIN_KEY',
    'METRICS_KEY',
    'LOG_LEVEL'
];

/**
 * Validar tamanho mínimo de secrets
 */
const SECRET_MIN_LENGTH = 32;

/**
 * Verificar variáveis de ambiente
 */
function checkEnvironment() {
    logger.info('🔍 Verificando variáveis de ambiente...');

    const missing = [];
    const weak = [];
    const recommended = [];

    // Verificar obrigatórias
    REQUIRED_VARS.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        } else if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
            if (process.env[varName].length < SECRET_MIN_LENGTH) {
                weak.push(varName);
            }
        }
    });

    // Verificar recomendadas
    RECOMMENDED_VARS.forEach(varName => {
        if (!process.env[varName]) {
            recommended.push(varName);
        }
    });

    // Reportar problemas
    if (missing.length > 0) {
        logger.error('❌ Variáveis obrigatórias faltando:', missing);
        logger.error('Configure as variáveis no arquivo .env');
        process.exit(1);
    }

    if (weak.length > 0) {
        logger.warn('⚠️  Secrets fracos detectados:', weak);
        logger.warn(`Recomendado: mínimo ${SECRET_MIN_LENGTH} caracteres`);

        if (process.env.NODE_ENV === 'production') {
            logger.error('❌ Secrets fracos não permitidos em produção');
            process.exit(1);
        }
    }

    if (recommended.length > 0) {
        logger.warn('⚠️  Variáveis recomendadas faltando:', recommended);
    }

    // Verificar NODE_ENV
    if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
        logger.warn('⚠️  NODE_ENV inválido, usando "development"');
        process.env.NODE_ENV = 'development';
    }

    // Verificar fallbacks perigosos em produção
    if (process.env.NODE_ENV === 'production') {
        if (process.env.JWT_SECRET.includes('sua_chave_secreta')) {
            logger.error('❌ JWT_SECRET com valor padrão em produção!');
            process.exit(1);
        }

        if (process.env.DB_PASSWORD === 'root' || process.env.DB_PASSWORD === 'password') {
            logger.error('❌ Senha de banco muito fraca em produção!');
            process.exit(1);
        }
    }

    logger.info('✅ Variáveis de ambiente validadas');

    return {
        valid: true,
        missing: [],
        weak: weak.length > 0 ? weak : [],
        recommended: recommended.length > 0 ? recommended : []
    };
}

module.exports = { checkEnvironment };
