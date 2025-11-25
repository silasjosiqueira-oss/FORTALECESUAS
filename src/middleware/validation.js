const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para processar erros de validação
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validação falhou',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

/**
 * Validador de CPF
 */
const isValidCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto >= 10 ? 0 : resto;

    if (digito1 !== parseInt(cpf.charAt(9))) {
        return false;
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto >= 10 ? 0 : resto;

    return digito2 === parseInt(cpf.charAt(10));
};

/**
 * Validações para Atendimentos
 */
const validateAtendimento = [
    body('nomeCompleto')
        .trim()
        .notEmpty().withMessage('Nome completo é obrigatório')
        .isLength({ min: 3, max: 200 }).withMessage('Nome deve ter entre 3 e 200 caracteres')
        .matches(/^[a-záàâãéèêíïóôõöúçñ\s]+$/i).withMessage('Nome contém caracteres inválidos'),

    body('cpf')
        .trim()
        .notEmpty().withMessage('CPF é obrigatório')
        .custom((value) => {
            if (!isValidCPF(value)) {
                throw new Error('CPF inválido');
            }
            return true;
        }),

    body('telefone')
        .optional()
        .trim()
        .matches(/^\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/).withMessage('Telefone inválido'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),

    body('dataNascimento')
        .optional()
        .isISO8601().withMessage('Data de nascimento inválida'),

    body('status')
        .optional()
        .isIn(['aguardando', 'em-andamento', 'concluido', 'cancelado']).withMessage('Status inválido'),

    body('prioridade')
        .optional()
        .isIn(['baixa', 'normal', 'alta', 'urgente']).withMessage('Prioridade inválida'),

    handleValidationErrors
];

/**
 * Validações para Benefícios
 */
const validateBeneficio = [
    body('nome')
        .trim()
        .notEmpty().withMessage('Nome é obrigatório')
        .isLength({ min: 3, max: 200 }).withMessage('Nome deve ter entre 3 e 200 caracteres'),

    body('cpf')
        .optional()
        .trim()
        .custom((value) => {
            if (value && !isValidCPF(value)) {
                throw new Error('CPF inválido');
            }
            return true;
        }),

    body('nis')
        .optional()
        .trim()
        .matches(/^\d{11}$/).withMessage('NIS deve conter 11 dígitos'),

    body('situacao')
        .optional()
        .isIn(['Ativo', 'Suspenso', 'Cancelado', 'Em Análise', 'Concedido', 'Indeferido', 'Entregue', 'Pendente'])
        .withMessage('Situação inválida'),

    handleValidationErrors
];

/**
 * Validação de ID
 */
const validateId = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID inválido'),

    handleValidationErrors
];

/**
 * Validação de Query de Paginação
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Página deve ser um número maior que 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limite deve estar entre 1 e 100'),

    handleValidationErrors
];

/**
 * Sanitização de Input
 */
const sanitizeInput = (req, res, next) => {
    // Remove caracteres perigosos
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
        }
        if (typeof obj === 'object' && obj !== null) {
            for (let key in obj) {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);

    next();
};

module.exports = {
    validateAtendimento,
    validateBeneficio,
    validateId,
    validatePagination,
    sanitizeInput,
    handleValidationErrors,
    isValidCPF
};
