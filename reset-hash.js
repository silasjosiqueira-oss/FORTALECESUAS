const bcrypt = require('bcrypt');

const novaSenha = 'sua_nova_senha_segura_aqui';  // Escolha uma forte (ex: 12+ chars, mix de tipos)
const custo = 10;  // Mantenha o mesmo do hash original ($2b$10$)

bcrypt.hash(novaSenha, custo)
  .then(novoHash => {
    console.log('Novo hash gerado:', novoHash);
    // Copie esse hash para o próximo passo (UPDATE no BD)
  })
  .catch(err => console.error('Erro ao gerar hash:', err));

