const bcrypt = require('bcrypt');

const hashArmazenado = '$2b$10$K9Z8vP0qX5YgF3xW2nL0/.eF5mJH4xZ9vK2yT7wR3nM5pQ8xV1zAO';
const senhaTeste = 'sua_senha_plain_aqui';  // Substitua pela senha que você acha correta

bcrypt.compare(senhaTeste, hashArmazenado)
  .then(match => {
    console.log(match ? 'Senha CORRETA: Hash bate!' : 'Senha INVÁLIDA: Hash não bate.');
  })
  .catch(err => console.error('Erro:', err));
