/**
 * Script para corrigir e criar a estrutura completa do banco de dados
 * Execute ANTES de criar o super admin
 *
 * Uso: node fix-database.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabase() {
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

        // ==========================================
        // 1. CRIAR TABELA TENANTS
        // ==========================================
        console.log('📦 Verificando tabela tenants...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id INT PRIMARY KEY AUTO_INCREMENT,
                subdomain VARCHAR(100) UNIQUE NOT NULL,
                nome_organizacao VARCHAR(255) NOT NULL,
                cnpj VARCHAR(18),
                email_contato VARCHAR(255) NOT NULL,
                telefone VARCHAR(20),
                endereco TEXT,
                status ENUM('ativo', 'trial', 'suspenso', 'cancelado') DEFAULT 'ativo',
                plano ENUM('basico', 'profissional', 'empresarial', 'ilimitado') DEFAULT 'basico',
                limite_usuarios INT DEFAULT 10,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_vencimento DATE,
                configuracoes JSON,
                INDEX idx_subdomain (subdomain),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ Tabela tenants OK\n');

        // ==========================================
        // 2. CRIAR TABELA NIVEIS_ACESSO
        // ==========================================
        console.log('🔐 Verificando tabela niveis_acesso...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS niveis_acesso (
                id INT PRIMARY KEY AUTO_INCREMENT,
                codigo VARCHAR(50) UNIQUE NOT NULL,
                nome VARCHAR(100) NOT NULL,
                descricao TEXT,
                nivel_hierarquia INT DEFAULT 100,
                permissoes JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_codigo (codigo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ Tabela niveis_acesso OK\n');

        // ==========================================
        // 3. VERIFICAR E ATUALIZAR TABELA USUARIOS
        // ==========================================
        console.log('👥 Verificando tabela usuarios...');

        // Verificar se a tabela existe
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'usuarios'
        `);

        if (tables.length === 0) {
            // Criar tabela do zero
            console.log('⚠️  Tabela usuarios não existe. Criando...');

            await connection.query(`
                CREATE TABLE usuarios (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    tenant_id INT NOT NULL DEFAULT 0,
                    username VARCHAR(100) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    senha_hash VARCHAR(255) NOT NULL,
                    nome_completo VARCHAR(255),
                    cpf VARCHAR(14),
                    telefone VARCHAR(20),
                    cargo VARCHAR(100),
                    unidade VARCHAR(100),
                    nivel_acesso_codigo VARCHAR(50) DEFAULT 'operador',
                    perfil VARCHAR(50) DEFAULT 'user',
                    ativo BOOLEAN DEFAULT TRUE,
                    foto_perfil VARCHAR(255),
                    ultimo_acesso TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_username_tenant (username, tenant_id),
                    UNIQUE KEY unique_email_tenant (email, tenant_id),
                    INDEX idx_tenant (tenant_id),
                    INDEX idx_email (email),
                    INDEX idx_nivel (nivel_acesso_codigo),
                    INDEX idx_ativo (ativo),
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                    FOREIGN KEY (nivel_acesso_codigo) REFERENCES niveis_acesso(codigo) ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            console.log('✅ Tabela usuarios criada\n');
        } else {
            // Tabela existe, verificar e adicionar colunas faltantes
            console.log('📋 Tabela usuarios existe. Verificando colunas...');

            const [columns] = await connection.query(`
                SHOW COLUMNS FROM usuarios
            `);

            const columnNames = columns.map(col => col.Field);

            // Adicionar colunas faltantes
            const columnsToAdd = [
                {
                    name: 'tenant_id',
                    sql: 'ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER id'
                },
                {
                    name: 'nivel_acesso_codigo',
                    sql: "ADD COLUMN nivel_acesso_codigo VARCHAR(50) DEFAULT 'operador'"
                },
                {
                    name: 'perfil',
                    sql: "ADD COLUMN perfil VARCHAR(50) DEFAULT 'user'"
                },
                {
                    name: 'cargo',
                    sql: 'ADD COLUMN cargo VARCHAR(100)'
                },
                {
                    name: 'unidade',
                    sql: 'ADD COLUMN unidade VARCHAR(100)'
                },
                {
                    name: 'ativo',
                    sql: 'ADD COLUMN ativo BOOLEAN DEFAULT TRUE'
                },
                {
                    name: 'foto_perfil',
                    sql: 'ADD COLUMN foto_perfil VARCHAR(255)'
                },
                {
                    name: 'ultimo_acesso',
                    sql: 'ADD COLUMN ultimo_acesso TIMESTAMP NULL'
                }
            ];

            for (const col of columnsToAdd) {
                if (!columnNames.includes(col.name)) {
                    console.log(`   ➕ Adicionando coluna: ${col.name}`);
                    try {
                        await connection.query(`ALTER TABLE usuarios ${col.sql}`);
                    } catch (err) {
                        console.log(`   ⚠️  Erro ao adicionar ${col.name}: ${err.message}`);
                    }
                }
            }

            // Adicionar índices se não existirem
            console.log('   🔍 Verificando índices...');

            try {
                await connection.query(`
                    ALTER TABLE usuarios
                    ADD INDEX IF NOT EXISTS idx_tenant (tenant_id)
                `);
            } catch (err) {
                // Índice já existe, tudo bem
            }

            try {
                await connection.query(`
                    ALTER TABLE usuarios
                    ADD INDEX IF NOT EXISTS idx_nivel (nivel_acesso_codigo)
                `);
            } catch (err) {
                // Índice já existe
            }

            console.log('✅ Tabela usuarios atualizada\n');
        }

        // ==========================================
        // 4. INSERIR NÍVEIS DE ACESSO PADRÃO
        // ==========================================
        console.log('🎯 Inserindo níveis de acesso padrão...');

        const niveisAcesso = [
            {
                codigo: 'super_admin',
                nome: 'Super Administrador',
                descricao: 'Acesso total ao sistema e gerenciamento de tenants',
                nivel: 0
            },
            {
                codigo: 'admin',
                nome: 'Administrador',
                descricao: 'Acesso administrativo completo ao tenant',
                nivel: 10
            },
            {
                codigo: 'coordenador',
                nome: 'Coordenador',
                descricao: 'Coordena equipes e acessa relatórios avançados',
                nivel: 20
            },
            {
                codigo: 'tecnico',
                nome: 'Técnico',
                descricao: 'Realiza atendimentos e cadastros',
                nivel: 30
            },
            {
                codigo: 'operador',
                nome: 'Operador',
                descricao: 'Acesso básico para operações cotidianas',
                nivel: 40
            },
            {
                codigo: 'visualizador',
                nome: 'Visualizador',
                descricao: 'Apenas visualização, sem edição',
                nivel: 50
            }
        ];

        for (const nivel of niveisAcesso) {
            await connection.query(`
                INSERT IGNORE INTO niveis_acesso (codigo, nome, descricao, nivel_hierarquia)
                VALUES (?, ?, ?, ?)
            `, [nivel.codigo, nivel.nome, nivel.descricao, nivel.nivel]);

            console.log(`   ✓ ${nivel.nome} (${nivel.codigo})`);
        }

        console.log('✅ Níveis de acesso configurados\n');

        // ==========================================
        // 5. CRIAR TENANT SISTEMA (ID = 0)
        // ==========================================
        console.log('🏢 Verificando tenant sistema...');

        const [systemTenant] = await connection.query(
            'SELECT id FROM tenants WHERE id = 0'
        );

        if (systemTenant.length === 0) {
            await connection.query(`
                INSERT INTO tenants (id, subdomain, nome_organizacao, email_contato, status, plano, limite_usuarios, data_vencimento)
                VALUES (0, 'system', 'Sistema Principal', 'admin@fortalecesuas.com', 'ativo', 'ilimitado', 9999, DATE_ADD(NOW(), INTERVAL 100 YEAR))
            `);
            console.log('✅ Tenant sistema criado\n');
        } else {
            console.log('✅ Tenant sistema já existe\n');
        }

        // ==========================================
        // 6. CRIAR TENANT DEMO (PARA TESTES)
        // ==========================================
        console.log('🧪 Verificando tenant demo...');

        const [demoTenant] = await connection.query(
            "SELECT id FROM tenants WHERE subdomain = 'demo'"
        );

        if (demoTenant.length === 0) {
            await connection.query(`
                INSERT INTO tenants (subdomain, nome_organizacao, email_contato, status, plano, limite_usuarios, data_vencimento)
                VALUES ('demo', 'CRAS Demonstração', 'demo@fortalecesuas.com', 'ativo', 'profissional', 50, DATE_ADD(NOW(), INTERVAL 1 YEAR))
            `);
            console.log('✅ Tenant demo criado\n');
        } else {
            console.log('✅ Tenant demo já existe\n');
        }

        // ==========================================
        // 7. VERIFICAR OUTRAS TABELAS NECESSÁRIAS
        // ==========================================
        console.log('📊 Verificando outras tabelas...');

        // Tabela de atendimentos
        await connection.query(`
            CREATE TABLE IF NOT EXISTS atendimentos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                tenant_id INT NOT NULL,
                usuario_id INT,
                registro VARCHAR(50),
                data_atendimento DATE,
                hora_atendimento TIME,
                nome_completo VARCHAR(255),
                cpf VARCHAR(14),
                telefone VARCHAR(20),
                data_nascimento DATE,
                tecnico_responsavel VARCHAR(255),
                tipo_atendimento VARCHAR(100),
                unidade VARCHAR(100),
                status VARCHAR(50) DEFAULT 'aguardando',
                prioridade VARCHAR(50) DEFAULT 'normal',
                dados_completos JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tenant (tenant_id),
                INDEX idx_cpf (cpf),
                INDEX idx_data (data_atendimento),
                INDEX idx_status (status),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('   ✓ Tabela atendimentos');

        // Outras tabelas básicas podem ser adicionadas aqui...

        console.log('✅ Todas as tabelas verificadas\n');

        // ==========================================
        // RESUMO FINAL
        // ==========================================
        console.log('');
        console.log('═════════════════════════════════════════════════════════');
        console.log('  ✅ BANCO DE DADOS CONFIGURADO COM SUCESSO!');
        console.log('═════════════════════════════════════════════════════════');
        console.log('');
        console.log('📋 Estrutura criada:');
        console.log('   ✓ Tabela tenants');
        console.log('   ✓ Tabela niveis_acesso (6 níveis)');
        console.log('   ✓ Tabela usuarios (atualizada)');
        console.log('   ✓ Tabela atendimentos');
        console.log('   ✓ Tenant sistema (ID: 0)');
        console.log('   ✓ Tenant demo (subdomain: demo)');
        console.log('');
        console.log('🎯 Próximo passo:');
        console.log('   Execute: node create-super-admin.js');
        console.log('');
        console.log('═════════════════════════════════════════════════════════');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ ERRO AO CONFIGURAR BANCO DE DADOS');
        console.error('═════════════════════════════════════════════════════════');
        console.error('');
        console.error('Erro:', error.message);
        console.error('');
        console.error('💡 Possíveis soluções:');
        console.error('   1. Verifique se o MySQL está rodando');
        console.error('   2. Confirme as credenciais no arquivo .env');
        console.error('   3. Verifique se o banco de dados existe');
        console.error('   4. Teste a conexão manualmente');
        console.error('');
        console.error('🔧 Criar banco manualmente:');
        console.error('   mysql -u root -p');
        console.error('   CREATE DATABASE cras_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
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

// Executar
fixDatabase()
    .then(() => {
        console.log('🎉 Script finalizado!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erro fatal:', error.message);
        process.exit(1);
    });
