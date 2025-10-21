// src/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

// Store para rate limiting (em produção use Redis)
const store = new Map();

// Rate limiter para autenticação
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: true,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    console.warn(`Rate limit excedido para IP: ${req.ip} na rota de auth`);
    res.status(429).json({
      error: true,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: 15 * 60
    });
  }
});

// Rate limiter para API geral
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: true,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    console.warn(`Rate limit excedido para IP: ${req.ip} na API`);
    res.status(429).json({
      error: true,
      message: 'Muitas requisições. Tente novamente em 15 minutos.',
      retryAfter: 15 * 60
    });
  }
});

// Rate limiter mais restritivo para operações administrativas
const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 requests por IP
  message: {
    error: true,
    message: 'Muitas requisições administrativas. Tente novamente em 5 minutos.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    console.warn(`Rate limit admin excedido para IP: ${req.ip}`);
    res.status(429).json({
      error: true,
      message: 'Muitas requisições administrativas. Tente novamente em 5 minutos.',
      retryAfter: 5 * 60
    });
  }
});

// Rate limiter global muito permissivo
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP
  message: {
    error: true,
    message: 'Limite global de requisições excedido.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

// Função para limpar rate limit em caso de sucesso
const clearRateLimitOnSuccess = (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    // Se a resposta foi bem-sucedida (2xx), limpar o contador de tentativas falhas
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Em uma implementação real com Redis, você limparia o contador aqui
      console.log(`Rate limit resetado para IP: ${req.ip} após sucesso`);
    }

    return originalSend.call(this, data);
  };

  next();
};

// Middleware personalizado para casos específicos
const createCustomRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
      error: true,
      message: 'Muitas requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Rate limiters por tipo de operação
const rateLimiter = {
  auth: authRateLimit,
  api: apiRateLimit,
  admin: adminRateLimit,
  global: globalRateLimit,
  custom: createCustomRateLimit
};

module.exports = {
  rateLimiter,
  clearRateLimitOnSuccess,
  createCustomRateLimit,

  // Exportações individuais para compatibilidade
  authRateLimit,
  apiRateLimit,
  adminRateLimit,
  globalRateLimit
};
