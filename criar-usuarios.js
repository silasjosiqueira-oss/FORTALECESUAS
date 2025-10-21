const bcrypt = require('bcrypt');
const db = require('./config/database');

async function criarUsuarios() {
    const usuarios = [
        {
            nome: "Administrador Sistema",
            email: "admin@sistema.com",
            cpf: "00000000000",
            senha: "admin123",
            cargo: "Administrador",
            unidade: "Secretaria de Assistência",
            nivel: "administrador"
        },
        {
            nome: "Ana Silva",
            email: "ana.silva@cras.com",
            cpf: "11111111111",
            senha: "ana123",
            cargo: "Psicóloga",
            unidade: "CRAS Centro",
            nivel: "psicologo"
        },
        {
            nome: "Carlos Santos",
            email: "carlos.santos@cras.com",
            cpf: "22222222222",
            senha: "carlos123",
            cargo: "Assistente Social",
            unidade: "CRAS Centro",
            nivel: "assistente_social"
        },
        {
            nome: "Maria Oliveira",
            email: "maria.oliveira@cras.com",
            cpf: "33333333333",
            senha: "maria123",
            cargo: "Recepcionista",
            unidade: "CRAS Centro",
            nivel: "recepcionista"
        }
    ];

    for (const user of usuarios) {
        const senhaHash = await bcrypt.hash(user.senha, 10);

        await db.query(
            `INSERT INTO usuarios (nome, email, cpf, senha, cargo, unidade, nivel_acesso_codigo, status, data_cadastro)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo', NOW())`,
            [user.nome, user.email, user.cpf, senhaHash, user.cargo, user.unidade, user.nivel]
        );

        console.log(`✅ Usuário criado: ${user.email} / ${user.senha}`);
    }

    console.log('\n✨ Todos os usuários foram criados!');
    process.exit();
}

criarUsuarios().catch(console.error);
