// src/utils/validators.js - VERSÃO CORRIGIDA

const validator = require('validator');

// Regex corrigidas
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cepRegex = /^\d{5}-\d{3}$/;
const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

// Validadores básicos
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email é obrigatório' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Formato de email inválido' };
  }

  return { valid: true };
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, message: 'Telefone é obrigatório' };
  }

  if (!phoneRegex.test(phone)) {
    return { valid: false, message: 'Formato de telefone inválido. Use: (00) 0000-0000 ou (00) 00000-0000' };
  }

  return { valid: true };
}

function validateCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') {
    return { valid: false, message: 'CPF é obrigatório' };
  }

  // Remove formatação
  const numbers = cpf.replace(/[^\d]/g, '');

  if (numbers.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' };
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) {
    return { valid: false, message: 'CPF inválido' };
  }

  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(numbers.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.substring(9, 10))) {
    return { valid: false, message: 'CPF inválido' };
  }

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(numbers.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.substring(10, 11))) {
    return { valid: false, message: 'CPF inválido' };
  }

  return { valid: true };
}

function validateCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') {
    return { valid: false, message: 'CNPJ é obrigatório' };
  }

  // Remove formatação
  const numbers = cnpj.replace(/[^\d]/g, '');

  if (numbers.length !== 14) {
    return { valid: false, message: 'CNPJ deve ter 14 dígitos' };
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numbers)) {
    return { valid: false, message: 'CNPJ inválido' };
  }

  // Validação dos dígitos verificadores
  let length = numbers.length - 2;
  let digits = numbers.substring(0, length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(digits.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(numbers.charAt(length))) {
    return { valid: false, message: 'CNPJ inválido' };
  }

  length = length + 1;
  digits = numbers.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(digits.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(numbers.charAt(length))) {
    return { valid: false, message: 'CNPJ inválido' };
  }

  return { valid: true };
}

function validateCEP(cep) {
  if (!cep || typeof cep !== 'string') {
    return { valid: false, message: 'CEP é obrigatório' };
  }

  if (!cepRegex.test(cep)) {
    return { valid: false, message: 'Formato de CEP inválido. Use: 00000-000' };
  }

  return { valid: true };
}

function validateDate(date) {
  if (!date || typeof date !== 'string') {
    return { valid: false, message: 'Data é obrigatória' };
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);

    if (dateObj.getFullYear() === year &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getDate() === day) {
      return { valid: true };
    }
  }

  return { valid: false, message: 'Data inválida. Use o formato: dd/mm/yyyy' };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Senha é obrigatória' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra minúscula' };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra maiúscula' };
  }

  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um número' };
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um caractere especial (@$!%*?&)' };
  }

  return { valid: true };
}

function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Nome é obrigatório' };
  }

  if (name.trim().length < 2) {
    return { valid: false, message: 'Nome deve ter pelo menos 2 caracteres' };
  }

  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
    return { valid: false, message: 'Nome deve conter apenas letras e espaços' };
  }

  return { valid: true };
}

// Sanitização de HTML - CORRIGIDA
function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Validador genérico para objetos
function validateObject(data, rules) {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    let validation;

    switch (rule.type) {
      case 'email':
        validation = validateEmail(value);
        break;
      case 'phone':
        validation = validatePhone(value);
        break;
      case 'cpf':
        validation = validateCPF(value);
        break;
      case 'cnpj':
        validation = validateCNPJ(value);
        break;
      case 'cep':
        validation = validateCEP(value);
        break;
      case 'date':
        validation = validateDate(value);
        break;
      case 'password':
        validation = validatePassword(value);
        break;
      case 'name':
        validation = validateName(value);
        break;
      default:
        validation = { valid: true };
    }

    if (!validation.valid) {
      errors[field] = validation.message;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateEmail,
  validatePhone,
  validateCPF,
  validateCNPJ,
  validateCEP,
  validateDate,
  validatePassword,
  validateName,
  sanitizeHtml,
  validateObject
};
