const bcrypt = require('bcrypt');

const senha = 'Admin@2025';

bcrypt.hash(senha, 10, (err, hash) => {
    if (err) {
        console.error('Erro:', err);
        return;
    }

    console.log('\n✅ HASH GERADO COM SUCESSO!\n');
    console.log('Senha:', senha);
    console.log('Hash:', hash);
    console.log('\n📋 USE ESTE SQL NO MYSQL WORKBENCH:\n');
    console.log(`INSERT INTO usuarios (
    username,
    email,
    senha_hash,
    nome_completo,
    perfil,
    ativo,
    data_criacao
) VALUES (
    'superadmin',
    'admin@fortalecesuas.com',
    '${hash}',
    'Super Administrador',
    'superadmin',
    1,
    NOW()
);`);
    console.log('\n');
});
