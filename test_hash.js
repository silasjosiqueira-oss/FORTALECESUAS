const bcrypt = require('bcrypt');

async function test() {
    // Gerar hash da senha "admin123"
    const hash = await bcrypt.hash('admin123', 10);
    console.log('Nova senha hasheada:', hash);
    console.log('\nExecute este UPDATE:');
    console.log(`UPDATE usuarios SET senha = '${hash}' WHERE email = 'admin@sistema.com';`);

    // Testar se a senha atual funciona
    const senhaAtual = '$2b$10$rZ8qH3g5M6mF4jN7pK2wZOuEYvYLHzFqDZX3K5L0Q2W3E4R5T6Y7U';
    const valida = await bcrypt.compare('admin123', senhaAtual);
    console.log('\nA senha atual funciona?', valida);
}

test();
