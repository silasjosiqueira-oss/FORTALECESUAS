/**
 * Script para criar o primeiro Super Admin do sistema
 * Execute este script UMA VEZ para configurar o super administrador inicial
 *
 * Uso: node create-super-admin.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createSuperAdmin() {
    let connection;

    try {
        console.log('🔧 Conectando ao banco de dados...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cras_db'
        });

        console.log('✅ Conectado ao banco de dados\n');

        // Dados do Super Admin
        const superAdmin = {
            username: 'superadmin',
            email: 'admin@fortalecesuas.com',
            senha: 'Admin@2025', // ALTERE ESTA SENHA APÓS O PRIMEIRO LOGIN!
            nome_completo: 'Super Administrador',
            cpf: '00000000000'
        };

        // Verificar se a coluna nivel_acesso_codigo existe
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM usuarios LIKE 'nivel_acesso_codigo'
        `);

        if (columns.length === 0) {
            console.log('❌ ERRO: Estrutura do banco incompleta!');
            console.log('');
            console.log('A coluna "nivel_acesso_codigo" não existe na tabela usuarios.');
            console.log('');
            console.log('🔧 Solução: Execute primeiro o script de migração:');
            console.log('   node fix-database.js');
            console.log('');
            console.log('Depois execute novamente este script.');
            console.log('');
            process.exit(1);
        }

        // Verificar se já existe um super admin
        const [existingAdmin] = await connection.query(
            'SELECT id FROM usuarios WHERE username = ? OR nivel_acesso_codigo = ?',
            [superAdmin.username, 'super_admin']
        );

        if (existingAdmin.length > 0) {
            console.log('⚠️  Super Admin já existe!');
            console.log('📧 Email: ' + superAdmin.email);
            console.log('👤 Username: ' + superAdmin.username);
            console.log('\n💡 Se esqueceu a senha, delete o registro e execute este script novamente.\n');
            console.log('💡 Ou use: node create-super-admin.js --reset-password\n');
            return;
        }

        // Verificar se existe tenant com subdomain 'system'
        const [systemTenant] = await connection.query(
            "SELECT id FROM tenants WHERE subdomain = 'system'"
        );

        let tenantId = 0;

        if (systemTenant.length === 0) {
            console.log('📦 Criando tenant sistema...');
            await connection.query(
                `INSERT INTO tenants (id, subdomain, nome_organizacao, email_contato, status, plano, limite_usuarios, data_vencimento)
                 VALUES (0, 'system', 'Sistema Principal', ?, 'ativo', 'ilimitado', 9999, DATE_ADD(NOW(), INTERVAL 100 YEAR))`,
                [superAdmin.email]
            );
            console.log('✅ Tenant sistema criado\n');
        } else {
            console.log('✅ Tenant sistema já existe (ID: ' + systemTenant[0].id + ')\n');
            tenantId = systemTenant[0].id;
        }

        // Verificar se existe o nível de acesso super_admin
        const [nivelAcesso] = await connection.query(
            'SELECT codigo FROM niveis_acesso WHERE codigo = ?',
            ['super_admin']
        );

        if (nivelAcesso.length === 0) {
            console.log('🔐 Criando nível de acesso super_admin...');
            await connection.query(
                `INSERT INTO niveis_acesso (codigo, nome, descricao, nivel_hierarquia)
                 VALUES ('super_admin', 'Super Administrador', 'Acesso total ao sistema e gerenciamento de tenants', 0)`
            );
            console.log('✅ Nível de acesso criado\n');
        } else {
            console.log('✅ Nível de acesso super_admin já existe\n');
        }

        // Hash da senha
        console.log('🔒 Gerando hash da senha...');
        const senhaHash = await bcrypt.hash(superAdmin.senha, 10);

        // Criar super admin
        console.log('👤 Criando Super Admin...');
        const [result] = await connection.query(
            `INSERT INTO usuarios (
                tenant_id,
                username,
                email,
                senha_hash,
                nome_completo,
                cpf,
                nivel_acesso_codigo,
                ativo,
                perfil
            ) VALUES (?, ?, ?, ?, ?, ?, 'super_admin', TRUE, 'admin')`,
            [
                tenantId,
                superAdmin.username,
                superAdmin.email,
                senhaHash,
                superAdmin.nome_completo,
                superAdmin.cpf
            ]
        );

        console.log('\n');
        console.log('═════════════════════════════════════════════════════════');
        console.log('  ✅ SUPER ADMIN CRIADO COM SUCESSO!');
        console.log('═════════════════════════════════════════════════════════');
        console.log('');
        console.log('📧 Email:    ' + superAdmin.email);
        console.log('👤 Username: ' + superAdmin.username);
        console.log('🔑 Senha:    ' + superAdmin.senha);
        console.log('');
        console.log('⚠️  IMPORTANTE:');
        console.log('   1. Altere a senha após o primeiro login!');
        console.log('   2. Não compartilhe estas credenciais');
        console.log('   3. Use este acesso apenas para gerenciar tenants');
        console.log('');
        console.log('🌐 Para acessar:');
        console.log('   • Página de login: http://localhost:3000/pages/login.html');
        console.log('   • Após login, acesse: http://localhost:3000/pages/usuarios.html');
        console.log('');
        console.log('═════════════════════════════════════════════════════════');
        console.log('');

    } catch (error) {
        console.error('❌ Erro ao criar Super Admin:', error.message);
        console.error('\n💡 Verifique:');
        console.error('   • O banco de dados está rodando?');
        console.error('   • As credenciais no .env estão corretas?');
        console.error('   • As tabelas foram criadas?');
        console.error('');
        console.error('Detalhes técnicos:');
        console.error(error.stack);
        console.error('');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Função auxiliar para resetar senha do super admin
async function resetSuperAdminPassword() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cras_db'
        });

        const novaSenha = 'Admin@2025';
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await connection.query(
            'UPDATE usuarios SET senha_hash = ? WHERE nivel_acesso_codigo = ? OR username = ?',
            [senhaHash, 'super_admin', 'superadmin']
        );

        console.log('✅ Senha do Super Admin resetada para: ' + novaSenha);
        console.log('⚠️  Altere esta senha após o login!\n');

    } catch (error) {
        console.error('❌ Erro ao resetar senha:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Verificar argumentos de linha de comando
const args = process.argv.slice(2);

if (args.includes('--reset-password')) {
    console.log('🔄 Resetando senha do Super Admin...\n');
    resetSuperAdminPassword()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    // Executar criação normal
    createSuperAdmin()
        .then(() => {
            console.log('🎉 Script finalizado com sucesso!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}
