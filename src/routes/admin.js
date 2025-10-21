const express = require('express');
const router = express.Router();

// Simulação de banco de dados em memória
let usuarios = [
    {
        id: 1,
        nome: 'Administrador',
        email: 'admin@sistema.com',
        senha: '123456', // Em produção, use hash!
        tipo: 'admin',
        ativo: true,
        dataCriacao: new Date()
    }
];
let proximoId = 2;

// Middleware simples de autenticação (exemplo básico)
const verificarAdmin = (req, res, next) => {
    // Em produção, use JWT ou sessão adequada
    const { adminToken } = req.headers;

    if (!adminToken || adminToken !== 'admin123') {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Acesso negado. Token de admin inválido'
        });
    }

    next();
};

// POST - Login de administrador
router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Email e senha são obrigatórios'
        });
    }

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Credenciais inválidas'
        });
    }

    if (!usuario.ativo) {
        return res.status(403).json({
            sucesso: false,
            mensagem: 'Usuário inativo'
        });
    }

    // Em produção, gere um JWT real
    res.json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso',
        dados: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo,
            token: 'admin123' // Token fictício
        }
    });
});

// GET - Listar todos os usuários (apenas admin)
router.get('/usuarios', verificarAdmin, (req, res) => {
    const usuariosSemSenha = usuarios.map(u => {
        const { senha, ...usuarioSeguro } = u;
        return usuarioSeguro;
    });

    res.json({
        sucesso: true,
        total: usuariosSemSenha.length,
        dados: usuariosSemSenha
    });
});

// GET - Buscar usuário específico (apenas admin)
router.get('/usuarios/:id', verificarAdmin, (req, res) => {
    const usuario = usuarios.find(u => u.id === parseInt(req.params.id));

    if (!usuario) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Usuário não encontrado'
        });
    }

    const { senha, ...usuarioSeguro } = usuario;

    res.json({
        sucesso: true,
        dados: usuarioSeguro
    });
});

// POST - Criar novo usuário (apenas admin)
router.post('/usuarios', verificarAdmin, (req, res) => {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Nome, email e senha são obrigatórios'
        });
    }

    // Verificar se email já existe
    const emailExiste = usuarios.find(u => u.email === email);
    if (emailExiste) {
        return res.status(409).json({
            sucesso: false,
            mensagem: 'Email já cadastrado'
        });
    }

    const novoUsuario = {
        id: proximoId++,
        nome,
        email,
        senha, // Em produção, use bcrypt para hash!
        tipo: tipo || 'usuario',
        ativo: true,
        dataCriacao: new Date()
    };

    usuarios.push(novoUsuario);

    const { senha: _, ...usuarioSeguro } = novoUsuario;

    res.status(201).json({
        sucesso: true,
        mensagem: 'Usuário criado com sucesso',
        dados: usuarioSeguro
    });
});

// PUT - Atualizar usuário (apenas admin)
router.put('/usuarios/:id', verificarAdmin, (req, res) => {
    const indice = usuarios.findIndex(u => u.id === parseInt(req.params.id));

    if (indice === -1) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Usuário não encontrado'
        });
    }

    const { nome, email, senha, tipo, ativo } = req.body;

    // Verificar se novo email já existe em outro usuário
    if (email && email !== usuarios[indice].email) {
        const emailExiste = usuarios.find(u => u.email === email && u.id !== usuarios[indice].id);
        if (emailExiste) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Email já cadastrado'
            });
        }
    }

    if (nome) usuarios[indice].nome = nome;
    if (email) usuarios[indice].email = email;
    if (senha) usuarios[indice].senha = senha; // Em produção, use hash!
    if (tipo) usuarios[indice].tipo = tipo;
    if (ativo !== undefined) usuarios[indice].ativo = ativo;
    usuarios[indice].dataAtualizacao = new Date();

    const { senha: _, ...usuarioSeguro } = usuarios[indice];

    res.json({
        sucesso: true,
        mensagem: 'Usuário atualizado com sucesso',
        dados: usuarioSeguro
    });
});

// DELETE - Remover usuário (apenas admin)
router.delete('/usuarios/:id', verificarAdmin, (req, res) => {
    const id = parseInt(req.params.id);

    // Impedir exclusão do último admin
    const usuario = usuarios.find(u => u.id === id);
    if (usuario && usuario.tipo === 'admin') {
        const adminsAtivos = usuarios.filter(u => u.tipo === 'admin' && u.ativo).length;
        if (adminsAtivos <= 1) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível remover o último administrador'
            });
        }
    }

    const indice = usuarios.findIndex(u => u.id === id);

    if (indice === -1) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Usuário não encontrado'
        });
    }

    const usuarioRemovido = usuarios.splice(indice, 1)[0];
    const { senha, ...usuarioSeguro } = usuarioRemovido;

    res.json({
        sucesso: true,
        mensagem: 'Usuário removido com sucesso',
        dados: usuarioSeguro
    });
});

// GET - Dashboard com estatísticas (apenas admin)
router.get('/dashboard', verificarAdmin, (req, res) => {
    const totalUsuarios = usuarios.length;
    const usuariosAtivos = usuarios.filter(u => u.ativo).length;
    const admins = usuarios.filter(u => u.tipo === 'admin').length;

    res.json({
        sucesso: true,
        dados: {
            usuarios: {
                total: totalUsuarios,
                ativos: usuariosAtivos,
                inativos: totalUsuarios - usuariosAtivos,
                administradores: admins
            },
            sistema: {
                versao: '1.0.0',
                dataInicio: new Date('2025-09-29'),
                status: 'online'
            }
        }
    });
});

// PATCH - Ativar/Desativar usuário (apenas admin)
router.patch('/usuarios/:id/status', verificarAdmin, (req, res) => {
    const usuario = usuarios.find(u => u.id === parseInt(req.params.id));

    if (!usuario) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Usuário não encontrado'
        });
    }

    const { ativo } = req.body;

    if (ativo === undefined) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Status "ativo" é obrigatório (true/false)'
        });
    }

    // Impedir desativação do último admin
    if (!ativo && usuario.tipo === 'admin') {
        const adminsAtivos = usuarios.filter(u => u.tipo === 'admin' && u.ativo).length;
        if (adminsAtivos <= 1) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível desativar o último administrador'
            });
        }
    }

    usuario.ativo = ativo;
    usuario.dataAtualizacao = new Date();

    const { senha, ...usuarioSeguro } = usuario;

    res.json({
        sucesso: true,
        mensagem: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
        dados: usuarioSeguro
    });
});

module.exports = router;
