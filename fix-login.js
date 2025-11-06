const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function fixLogin() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  🔧 DIAGNÓSTICO E CORREÇÃO DE LOGIN       ║');
    console.log('╚════════════════════════════════════════════╝\n');

    let connection;

    try {
        // 1. CONECTAR AO BANCO
        console.log('📡 [1/5] Conectando ao banco de dados...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cras_system',
            multipleStatements: true
        });
        console.log('   ✅ Conectado com sucesso!\n');

        // 2. VERIFICAR TENANTS
        console.log('🏢 [2/5] Verificando tenants...');
        const [tenants] = await connection.query('SELECT * FROM tenants WHERE subdomain = "demo"');

        let tenantId;

        if (tenants.length === 0) {
            console.log('   ⚠️  Tenant "demo" não existe! Criando...');

            const [result] = await connection.query(`
                INSERT INTO tenants (
                    subdomain,
                    nome_organizacao,
                    status,
                    plano,
                    data_cadastro,
                    data_vencimento
                ) VALUES (
                    'demo',
                    'Organização Demo',
                    'ativo',
                    'premium',
                    NOW(),
                    DATE_ADD(NOW(), INTERVAL 1 YEAR)
                )
            `);

            tenantId = result.insertId;
            console.log(`   ✅ Tenant "demo" criado! (ID: ${tenantId})\n`);
        } else {
            tenantId = tenants[0].id;
            console.log(`   ✅ Tenant "demo" encontrado! (ID: ${tenantId})`);

            // Verificar status
            if (tenants[0].status !== 'ativo') {
                console.log('   ⚠️  Status: ' + tenants[0].status + ' → Corrigindo para ATIVO...');
                await connection.query('UPDATE tenants SET status = "ativo" WHERE id = ?', [tenantId]);
                console.log('   ✅ Status atualizado!\n');
            } else {
                console.log('   ✅ Status: ativo\n');
            }

            // Verificar vencimento
            const [vencimento] = await connection.query(
                'SELECT DATEDIFF(data_vencimento, NOW()) as dias FROM tenants WHERE id = ?',
                [tenantId]
            );

            if (vencimento[0].dias < 0) {
                console.log('   ⚠️  Assinatura vencida! Renovando...');
                await connection.query(
                    'UPDATE tenants SET data_vencimento = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE id = ?',
                    [tenantId]
                );
                console.log('   ✅ Assinatura renovada!\n');
            }
        }

        // 3. VERIFICAR USUÁRIOS
        console.log('👤 [3/5] Verificando usuários...');
        const [usuarios] = await connection.query(
            'SELECT * FROM usuarios WHERE tenant_id = ? AND perfil = "admin"',
            [tenantId]
        );

        let userId;
        let username;
        let senha = 'admin123'; // senha padrão

        if (usuarios.length === 0) {
            console.log('   ⚠️  Nenhum usuário admin encontrado! Criando...');

            const senhaHash = await bcrypt.hash(senha, 10);

            const [result] = await connection.query(`
                INSERT INTO usuarios (
                    tenant_id,
                    username,
                    email,
                    senha_hash,
                    nome_completo,
                    perfil,
                    ativo,
                    criado_em
                ) VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
            `, [tenantId, 'admin', 'admin@demo.com', senhaHash, 'Administrador Demo', 'admin']);

            userId = result.insertId;
            username = 'admin';
            console.log(`   ✅ Usuário admin criado! (ID: ${userId})`);
            console.log(`   📝 Username: admin`);
            console.log(`   🔑 Senha: admin123\n`);
        } else {
            userId = usuarios[0].id;
            username = usuarios[0].username;

            console.log(`   ✅ Usuário admin encontrado! (ID: ${userId})`);
            console.log(`   📝 Username: ${username}`);

            // Verificar se está ativo
            if (!usuarios[0].ativo) {
                console.log('   ⚠️  Usuário INATIVO! Ativando...');
                await connection.query('UPDATE usuarios SET ativo = TRUE WHERE id = ?', [userId]);
                console.log('   ✅ Usuário ativado!\n');
            } else {
                console.log('   ✅ Status: ativo\n');
            }

            // Perguntar se quer resetar a senha
            console.log('   ℹ️  Usuário já existe. Se não lembrar da senha:');
            console.log(`   💡 Execute: node -e "require('bcrypt').hash('NOVA_SENHA', 10).then(h => console.log('UPDATE usuarios SET senha_hash = \\'' + h + '\\' WHERE id = ${userId};'))"`);
            console.log('');
        }

        // 4. TESTAR CONEXÃO
        console.log('🔐 [4/5] Testando autenticação...');

        const [testUser] = await connection.query(
            `SELECT u.*, t.nome_organizacao
             FROM usuarios u
             INNER JOIN tenants t ON t.id = u.tenant_id
             WHERE u.id = ?`,
            [userId]
        );

        if (testUser.length > 0) {
            console.log('   ✅ Consulta SQL funcionando!\n');
        }

        // 5. RESUMO E INSTRUÇÕES
        console.log('╔════════════════════════════════════════════╗');
        console.log('║  ✅ CONFIGURAÇÃO CONCLUÍDA!                ║');
        console.log('╚════════════════════════════════════════════╝\n');

        console.log('📋 INFORMAÇÕES PARA LOGIN:\n');
        console.log('┌─────────────────────────────────────────┐');
        console.log('│  URL:      http://localhost:3000        │');
        console.log(`│  Usuário:  ${username.padEnd(28)} │`);
        console.log(`│  Senha:    ${(usuarios.length === 0 ? senha : 'admin123').padEnd(28)} │`);
        console.log('└─────────────────────────────────────────┘\n');

        console.log('🧪 TESTE COM CURL:\n');
        console.log('curl -X POST http://localhost:3000/auth/login \\');
        console.log('  -H "Content-Type: application/json" \\');
        console.log(`  -d '{"usuario":"${username}","senha":"${usuarios.length === 0 ? senha : 'SUA_SENHA'}"}'`);
        console.log('\n');

        console.log('💡 DICAS:\n');
        console.log('1. Certifique-se que o servidor está rodando (npm start)');
        console.log('2. Use http://localhost:3000 (não use subdomínio)');
        console.log('3. O sistema vai usar automaticamente o tenant "demo"');
        console.log('4. Verifique o console do servidor para ver os logs\n');

        if (usuarios.length > 0) {
            console.log('⚠️  NOTA: Como o usuário já existia, use sua senha atual.');
            console.log('   Se esqueceu, execute este comando para resetar:\n');
            const novoHash = await bcrypt.hash('novaSenha123', 10);
            console.log(`   UPDATE usuarios SET senha_hash = '${novoHash}' WHERE id = ${userId};\n`);
        }

        await connection.end();

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error('\nDetalhes técnicos:');
        console.error(error);

        console.error('\n🔍 VERIFICAÇÕES:');
        console.error('1. O arquivo .env existe e tem as credenciais corretas?');
        console.error('2. O banco de dados "cras_system" existe?');
        console.error('3. As tabelas "tenants" e "usuarios" existem?');
        console.error('4. O MySQL está rodando?');
        console.error('\n💡 Tente: mysql -u root -p < schema.sql (se tiver o arquivo de schema)\n');

        if (connection) {
            await connection.end();
        }
    }
}

// Executar
fixLogin();
