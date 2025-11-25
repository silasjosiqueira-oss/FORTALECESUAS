const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function verificarOuCriarSuperAdmin() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'fortalece_suas',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ Conectado ao banco de dados');

        const [usuarios] = await connection.query(
            'SELECT * FROM usuarios WHERE perfil = "superadmin"'
        );

        if (usuarios.length > 0) {
            console.log('\n📋 USUÁRIOS SUPER ADMIN ENCONTRADOS:\n');
            usuarios.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user.id}`);
                console.log(`   Username: ${user.username}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Nome: ${user.nome_completo}`);
                console.log(`   Ativo: ${user.ativo ? 'SIM' : 'NÃO'}`);
                console.log(`   Criado em: ${user.created_at}`);
                console.log('');
            });

            console.log('\n❓ DESEJA RESETAR A SENHA?');
            console.log('Execute este script novamente com: node verificar-superadmin.js --reset');

        } else {
            console.log('\n⚠️  NENHUM SUPER ADMIN ENCONTRADO!\n');
            console.log('Criando Super Admin padrão...\n');

            const senhaPadrao = 'Admin@2025';
            const senhaHash = await bcrypt.hash(senhaPadrao, 10);

            const [result] = await connection.query(
                `INSERT INTO usuarios (
                    username, email, senha_hash, nome_completo,
                    perfil, ativo, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [
                    'superadmin',
                    'admin@fortalecesuas.com',
                    senhaHash,
                    'Super Administrador',
                    'superadmin',
                    1
                ]
            );

            console.log('✅ SUPER ADMIN CRIADO COM SUCESSO!\n');
            console.log('📋 DADOS DE ACESSO:');
            console.log('   Username: superadmin');
            console.log('   Email: admin@fortalecesuas.com');
            console.log(`   Senha: ${senhaPadrao}`);
            console.log('   Perfil: superadmin');
            console.log(`   ID: ${result.insertId}\n`);
        }

        if (process.argv.includes('--reset')) {
            console.log('\n🔄 RESETANDO SENHA DO PRIMEIRO SUPER ADMIN...\n');

            const novaSenha = 'Admin@2025';
            const senhaHash = await bcrypt.hash(novaSenha, 10);

            const [result] = await connection.query(
                'UPDATE usuarios SET senha_hash = ? WHERE perfil = "superadmin" LIMIT 1',
                [senhaHash]
            );

            if (result.affectedRows > 0) {
                console.log('✅ SENHA RESETADA COM SUCESSO!\n');
                console.log('📋 NOVA SENHA:');
                console.log(`   Senha: ${novaSenha}\n`);
            } else {
                console.log('❌ Erro ao resetar senha\n');
            }
        }

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        console.error('\nVerifique se:');
        console.error('1. O MySQL está rodando');
        console.error('2. As credenciais no .env estão corretas');
        console.error('3. O banco de dados existe');
        console.error('4. A tabela "usuarios" existe');
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ Conexão fechada');
        }
    }
}

console.log('🔍 VERIFICANDO SUPER ADMIN...\n');
verificarOuCriarSuperAdmin();
