// src/middleware/errorHandler.js

// Classes de erro customizadas
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.field = field;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Recurso não encontrado') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Conflito de dados') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

// Wrapper para async functions
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware de tratamento de erros
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Se já foi enviada uma resposta, delega para o handler padrão do Express
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Erro interno do servidor';

  // Tratar diferentes tipos de erro
  switch (err.name) {
    case 'ValidationError':
      status = 400;
      break;
    case 'CastError':
      status = 400;
      message = 'ID inválido';
      break;
    case 'JsonWebTokenError':
      status = 401;
      message = 'Token inválido';
      break;
    case 'TokenExpiredError':
      status = 401;
      message = 'Token expirado';
      break;
    case 'MongoError':
    case 'MongoServerError':
      if (err.code === 11000) {
        status = 409;
        message = 'Dados duplicados';
      }
      break;
    case 'SequelizeValidationError':
      status = 400;
      message = 'Erro de validação dos dados';
      break;
    case 'SequelizeUniqueConstraintError':
      status = 409;
      message = 'Dados já existem';
      break;
    case 'SequelizeForeignKeyConstraintError':
      status = 400;
      message = 'Referência inválida';
      break;
  }

  // Resposta de erro padrão
  const errorResponse = {
    error: true,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Adicionar detalhes em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  res.status(status).json(errorResponse);
};

// Middleware para rotas não encontradas
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Rota ${req.originalUrl} não encontrada`);
  next(error);
};

// Middleware para validação de dados
const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Executar todas as validações
    await Promise.all(validations.map(validation => validation.run(req)));

    // Verificar resultados
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Formatar erros
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({
      field: err.param,
      message: err.msg
    }));

    return res.status(400).json({
      error: true,
      message: 'Dados inválidos',
      details: extractedErrors
    });
  };
};

// Log de requisições
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  next();
};

module.exports = {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  asyncErrorHandler,
  errorHandler,
  notFoundHandler,
  validateRequest,
  requestLogger
};
