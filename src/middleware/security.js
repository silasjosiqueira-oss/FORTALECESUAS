// src/middleware/security.js - VERSÃO LIMPA SEM DUPLICAÇÕES

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Padrões de SQL Injection
const sqlInjectionPatterns = [
  /('|\\')|(;\s*--)|(;\s*\/\*)|(;\s*\*\/)|(\*\/)/gi,
  /(union\s+select|exec\s*\(|execute\s*\()/gi,
  /(script|javascript|vbscript|onload|onerror)/gi,
  /(drop\s+table|delete\s+from|insert\s+into)/gi,
  /(update\s+set|alter\s+table|create\s+table)/gi
];

// Padrões XSS
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi
];

// Padrões de Path Traversal
const pathTraversalPatterns = [
  /\.\.\//g,
  /\.\.\\+/g,
  /%2e%2e%2f/gi,
  /%252e%252e%252f/gi,
  /\/etc\/passwd/i,
  /\/proc\/self\//i,
  /\\windows\\system32/i
];

// Middleware de sanitização
function sanitizeInput(req, res, next) {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error('Erro na sanitização:', error);
    return res.status(400).json({
      error: 'Dados de entrada inválidos'
    });
  }
}

// Função para sanitizar objetos recursivamente
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
}

// Função para sanitizar strings
function sanitizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  let sanitized = value;

  // Remover scripts maliciosos
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Escapar caracteres HTML
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
}

// Middleware de detecção de ataques
function detectAttacks(req, res, next) {
  try {
    const inputs = [
      ...Object.values(req.body || {}),
      ...Object.values(req.query || {}),
      ...Object.values(req.params || {})
    ].filter(val => typeof val === 'string');

    for (const input of inputs) {
      if (detectSQLInjection(input)) {
        console.warn('Tentativa de SQL Injection detectada:', input);
        return res.status(403).json({
          error: 'Entrada suspeita detectada'
        });
      }

      if (detectXSS(input)) {
        console.warn('Tentativa de XSS detectada:', input);
        return res.status(403).json({
          error: 'Entrada suspeita detectada'
        });
      }

      if (detectPathTraversal(input)) {
        console.warn('Tentativa de Path Traversal detectada:', input);
        return res.status(403).json({
          error: 'Entrada suspeita detectada'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Erro na detecção de ataques:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
}

// Funções de detecção individuais
function detectSQLInjection(input) {
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

function detectXSS(input) {
  return xssPatterns.some(pattern => pattern.test(input));
}

function detectPathTraversal(input) {
  return pathTraversalPatterns.some(pattern => pattern.test(input));
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: true,
      message: 'Token de acesso requerido'
    });
  }

  try {
    // TEMPORÁRIO - aceitar qualquer token para teste
    req.user = { id: 1, role: 'admin' };
    next();
  } catch (error) {
    return res.status(403).json({
      error: true,
      message: 'Token inválido'
    });
  }
}

// Middleware de verificação de permissão
function checkPermission(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado'
      });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'Permissão insuficiente'
      });
    }

    next();
  };
}

// Middleware de segurança HTTP
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

// Middleware para logs de segurança
function securityLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  console.log(`[${timestamp}] Security Check - IP: ${ip} - UserAgent: ${userAgent} - Route: ${req.method} ${req.path}`);

  next();
}

// Exportações
module.exports = {
  limiter,
  sanitizeInput,
  detectAttacks,
  detectSQLInjection,
  securityHeaders,
  securityLogger,
  sanitizeString,
  detectXSS,
  detectPathTraversal,
  authenticateToken,
  checkPermission
};
