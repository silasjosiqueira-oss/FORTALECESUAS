// resetar-senha.js
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetarSenha() {
    try {
        // Conectar ao banco
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cras_db'
        });

        console.log('✅ Conectado ao banco de dados\n');

        // ============================================
        // ALTERE APENAS ESTAS 3 LINHAS:
        // ============================================
        const email = 'admin@demo.com';  // Email do usuário
        const novaSenha = '123456';      // Nova senha
        const tenantId = 1;              // ID do tenant (normalmente 1)

        // Gerar hash da nova senha
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        // Atualizar no banco
        const [result] = await connection.query(
            'UPDATE usuarios SET senha_hash = ? WHERE email = ? AND tenant_id = ?',
            [senhaHash, email, tenantId]
        );

        if (result.affectedRows > 0) {
            console.log('====================================');
            console.log('✅ SENHA ALTERADA COM SUCESSO!');
            console.log('====================================');
            console.log('');
            console.log('Credenciais de login:');
            console.log(`   Email: ${email}`);
            console.log(`   Senha: ${novaSenha}`);
            console.log('');
            console.log('====================================');
        } else {
            console.log('❌ Usuário não encontrado');
            console.log('');
            console.log('Verifique:');
            console.log(`   - Email: ${email}`);
            console.log(`   - Tenant ID: ${tenantId}`);
        }

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.log('');
        console.log('Verifique:');
        console.log('   - Se o MySQL está rodando');
        console.log('   - Se as credenciais do .env estão corretas');
        console.log('   - Se o banco de dados existe');
        process.exit(1);
    }
}

resetarSenha();
