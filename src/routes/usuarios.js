// src/routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getConnection } = require('../config/database');

router.use((req, res, next) => {
    if (!req.tenantId) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Tenant não identificado'
        });
    }
    next();
});

// GET /api/usuarios/meta/estatisticas
router.get('/meta/estatisticas', async (req, res) => {
    try {
        const connection = await getConnection();

        const [stats] = await connection.query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN ativo = TRUE THEN 1 ELSE 0 END) as ativos,
                SUM(CASE WHEN ativo = FALSE THEN 1 ELSE 0 END) as inativos,
                0 as suspensos
            FROM usuarios
            WHERE tenant_id = ?
        `, [req.tenantId]);

        res.json({
            sucesso: true,
            dados: stats[0]
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar estatísticas'
        });
    }
});

// GET /api/usuarios/meta/niveis-acesso
router.get('/meta/niveis-acesso', async (req, res) => {
    try {
        const niveis = [
            { codigo: 'admin', nome: 'Administrador', descricao: 'Acesso total ao sistema' },
            { codigo: 'coordenador', nome: 'Coordenador', descricao: 'Gerencia equipes e atendimentos' },
            { codigo: 'tecnico', nome: 'Técnico', descricao: 'Realiza atendimentos' },
            { codigo: 'recepcao', nome: 'Recepção', descricao: 'Atendimento ao público' }
        ];

        res.json({
            sucesso: true,
            dados: niveis
        });
    } catch (error) {
        console.error('Erro ao buscar níveis:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar níveis de acesso'
        });
    }
});

// GET /api/usuarios - Listar todos
router.get('/', async (req, res) => {
    try {
        const connection = await getConnection();

        const [usuarios] = await connection.query(`
            SELECT
                u.id,
                u.nome_completo as nome,
                u.email,
                u.cpf,
                u.telefone,
                u.cargo,
                u.unidade,
                u.perfil as nivel_acesso_codigo,
                u.ativo,
                u.data_criacao,
                u.ultimo_acesso,
                CASE
                    WHEN u.perfil = 'admin' THEN 'Administrador'
                    WHEN u.perfil = 'coordenador' THEN 'Coordenador'
                    WHEN u.perfil = 'tecnico' THEN 'Técnico'
                    WHEN u.perfil = 'recepcao' THEN 'Recepção'
                    ELSE 'Técnico'
                END as nivel_nome
            FROM usuarios u
            WHERE u.tenant_id = ?
            ORDER BY u.nome_completo
        `, [req.tenantId]);

        res.json({
            sucesso: true,
            dados: usuarios
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar usuários',
            erro: error.message
        });
    }
});

// GET /api/usuarios/:id
router.get('/:id', async (req, res) => {
    try {
        const connection = await getConnection();

        const [usuarios] = await connection.query(`
            SELECT
                u.id,
                u.nome_completo as nome,
                u.email,
                u.cpf,
                u.telefone,
                u.cargo,
                u.unidade,
                u.perfil as nivel_acesso_codigo,
                u.ativo
            FROM usuarios u
            WHERE u.id = ? AND u.tenant_id = ?
        `, [req.params.id, req.tenantId]);

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        res.json({
            sucesso: true,
            dados: usuarios[0]
        });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar usuário'
        });
    }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
    try {
        const { nome, email, cpf, telefone, cargo, unidade, nivel_acesso_codigo, senha } = req.body;

        if (!nome || !email || !nivel_acesso_codigo || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, email, nível de acesso e senha são obrigatórios'
            });
        }

        const connection = await getConnection();

        // Verificar se email já existe no tenant
        const [existentes] = await connection.query(
            'SELECT id FROM usuarios WHERE email = ? AND tenant_id = ?',
            [email.toLowerCase(), req.tenantId]
        );

        if (existentes.length > 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email já cadastrado nesta organização'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const username = email.split('@')[0];

        const [result] = await connection.query(`
            INSERT INTO usuarios (
                tenant_id, username, email, senha_hash, nome_completo,
                cpf, telefone, cargo, unidade, perfil, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `, [
            req.tenantId,
            username,
            email.toLowerCase(),
            senhaHash,
            nome,
            cpf || null,
            telefone || null,
            cargo || null,
            unidade || null,
            nivel_acesso_codigo
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Usuário criado com sucesso',
            dados: { id: result.insertId }
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao criar usuário',
            erro: error.message
        });
    }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
    try {
        const { nome, email, cpf, telefone, cargo, unidade, nivel_acesso_codigo } = req.body;

        if (!nome || !email || !nivel_acesso_codigo) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, email e nível de acesso são obrigatórios'
            });
        }

        const connection = await getConnection();

        const [usuarios] = await connection.query(
            'SELECT id FROM usuarios WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        await connection.query(`
            UPDATE usuarios SET
                nome_completo = ?,
                email = ?,
                cpf = ?,
                telefone = ?,
                cargo = ?,
                unidade = ?,
                perfil = ?
            WHERE id = ? AND tenant_id = ?
        `, [
            nome,
            email.toLowerCase(),
            cpf || null,
            telefone || null,
            cargo || null,
            unidade || null,
            nivel_acesso_codigo,
            req.params.id,
            req.tenantId
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Usuário atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar usuário'
        });
    }
});

// PATCH /api/usuarios/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { ativo } = req.body;

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Status inválido'
            });
        }

        const connection = await getConnection();

        const [result] = await connection.query(`
            UPDATE usuarios
            SET ativo = ?
            WHERE id = ? AND tenant_id = ?
        `, [ativo, req.params.id, req.tenantId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        res.json({
            sucesso: true,
            mensagem: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`
        });
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar status'
        });
    }
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req, res) => {
    try {
        const connection = await getConnection();

        const [usuarios] = await connection.query(
            'SELECT perfil FROM usuarios WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        if (usuarios[0].perfil === 'admin') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não é possível excluir usuários administradores'
            });
        }

        await connection.query(
            'DELETE FROM usuarios WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );

        res.json({
            sucesso: true,
            mensagem: 'Usuário excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir usuário'
        });
    }
});

module.exports = router;
