const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/index');

// Criar diretório de logs se não existir
if (config.logging.file.enabled) {
    if (!fs.existsSync(config.logging.file.path)) {
        fs.mkdirSync(config.logging.file.path, { recursive: true });
    }
}

// Formato customizado para logs
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            log += '\n' + JSON.stringify(meta, null, 2);
        }

        return log;
    })
);

// Configuração dos transports
const transports = [];

// Console transport
if (config.logging.console.enabled) {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({
                    format: 'HH:mm:ss'
                }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let log = `${timestamp} ${level}: ${message}`;

                    if (Object.keys(meta).length > 0 && config.env !== 'production') {
                        log += '\n' + JSON.stringify(meta, null, 2);
                    }

                    return log;
                })
            ),
            level: config.logging.level
        })
    );
}

// File transports
if (config.logging.file.enabled) {
    // Log geral
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.file.path, 'app.log'),
            format: customFormat,
            level: config.logging.level,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );

    // Log de erros
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.file.path, 'error.log'),
            format: customFormat,
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );

    // Log de segurança
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.file.path, 'security.log'),
            format: customFormat,
            level: 'warn',
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    );
}

// Criar logger
const logger = winston.createLogger({
    level: config.logging.level,
    format: customFormat,
    transports,
    exitOnError: false,
    // Não registrar erros internos do winston no console em produção
    silent: false
});

// Métodos customizados para diferentes tipos de log
const customLogger = {
    // Logs gerais
    debug: (message, meta = {}) => logger.debug(message, meta),
    info: (message, meta = {}) => logger.info(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    error: (message, meta = {}) => logger.error(message, meta),

    // Logs de segurança
    security: (event, details = {}) => {
        logger.warn(`SECURITY: ${event}`, {
            event,
            ...details,
            timestamp: new Date().toISOString(),
            category: 'security'
        });
    },

    // Logs de auditoria
    audit: (action, details = {}) => {
        logger.info(`AUDIT: ${action}`, {
            action,
            ...details,
            timestamp: new Date().toISOString(),
            category: 'audit'
        });
    },

    // Logs de performance
    performance: (operation, duration, details = {}) => {
        logger.info(`PERFORMANCE: ${operation} completed in ${duration}ms`, {
            operation,
            duration,
            ...details,
            category: 'performance'
        });
    },

    // Logs de banco de dados
    database: (query, duration, details = {}) => {
        if (config.env === 'development') {
            logger.debug(`DATABASE: Query executed in ${duration}ms`, {
                query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
                duration,
                ...details,
                category: 'database'
            });
        }
    },

    // Log de requests HTTP
    http: (req, res, duration) => {
        const { method, url, ip, headers } = req;
        const { statusCode } = res;

        // Não logar requests de assets estáticos em produção
        if (config.env === 'production' && url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
            return;
        }

        const level = statusCode >= 400 ? 'warn' : 'info';

        logger[level](`HTTP ${statusCode} ${method} ${url} - ${duration}ms`, {
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent: headers['user-agent'],
            category: 'http'
        });
    }
};

// Stream para o morgan (se usado futuramente)
customLogger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

module.exports = customLogger;
