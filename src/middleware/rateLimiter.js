const rateLimit = require('express-rate-limit');

/**
 * Rate limiter global
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500,
    message: {
        error: 'Muitas requisições',
        message: 'Tente novamente em 15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `global:${req.tenantId || 'no-tenant'}:${req.ip}`;
    }
});

/**
 * Rate limiter para autenticação
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 tentativas
    message: {
        error: 'Muitas tentativas de login',
        message: 'Tente novamente em 15 minutos'
    },
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const username = req.body?.username || req.body?.usuario || 'unknown';
        return `auth:${username}:${req.ip}`;
    },
    handler: (req, res) => {
        const username = req.body?.username || req.body?.usuario;
        const logger = require('../utils/logger');

        logger.warn('Rate limit de autenticação atingido', {
            username,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(429).json({
            error: 'Muitas tentativas de login',
            message: 'Sua conta foi temporariamente bloqueada. Tente novamente em 15 minutos.',
            retryAfter: 900
        });
    }
});

/**
 * Rate limiter por usuário
 */
const userLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100,
    keyGenerator: (req) => {
        if (req.user?.role === 'super_admin') {
            return null; // Super admin sem limite
        }
        return `user:${req.tenantId}:${req.user?.id || req.ip}`;
    },
    skip: (req) => req.user?.role === 'super_admin',
    handler: (req, res) => {
        const logger = require('../utils/logger');

        logger.warn('Rate limit de usuário atingido', {
            user: req.user?.username,
            tenant: req.tenant?.nome_organizacao,
            ip: req.ip,
            path: req.path
        });

        res.status(429).json({
            error: 'Limite de requisições excedido',
            message: 'Você está fazendo muitas requisições. Aguarde um momento.',
            retryAfter: 60
        });
    }
});

/**
 * Rate limiter para operações de escrita
 */
const writeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30, // 30 escritas por minuto
    keyGenerator: (req) => {
        return `write:${req.tenantId}:${req.user?.id || req.ip}`;
    },
    skip: (req) => req.user?.role === 'super_admin',
    message: {
        error: 'Limite de operações de escrita excedido',
        message: 'Aguarde um momento antes de criar/editar mais registros'
    }
});

/**
 * Rate limiter para operações de leitura
 */
const readLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200, // 200 leituras por minuto
    keyGenerator: (req) => {
        return `read:${req.tenantId}:${req.user?.id || req.ip}`;
    },
    skip: (req) => req.user?.role === 'super_admin',
    message: {
        error: 'Limite de consultas excedido',
        message: 'Aguarde um momento antes de fazer mais consultas'
    }
});

/**
 * Rate limiter para operações pesadas (relatórios, exportações)
 */
const heavyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 operações pesadas
    keyGenerator: (req) => {
        return `heavy:${req.tenantId}:${req.user?.id}`;
    },
    skip: (req) => req.user?.role === 'super_admin',
    message: {
        error: 'Limite de operações pesadas excedido',
        message: 'Aguarde alguns minutos antes de gerar outro relatório ou exportação'
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    userLimiter,
    writeLimiter,
    readLimiter,
    heavyLimiter
};
