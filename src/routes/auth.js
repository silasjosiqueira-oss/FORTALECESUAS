/**
 * Rotas de Autenticação
 * Compatível com multi-tenant e sistema legado
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const { identifyTenant } = require('../middleware/tenant');
const { authenticateToken, requireAdmin, autenticar } = require('../middleware/auth');
const { getConnection } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-temporaria';

// ============================================
// POST /login - UNIFICADO
// Funciona com e sem tenant
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { username, password, email, senha } = req.body;
        const loginField = username || email;
        const pass = password || senha;
        const tenantId = req.tenantId || null;

        const result = await authService.login(loginField, pass, tenantId);
        res.json(result);

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(401).json({
            sucesso: false,
            error: error.message || 'Erro ao fazer login',
            mensagem: error.message || 'Credenciais inválidas'
        });
    }
});

// ============================================
// POST /logout
// ============================================
router.post('/logout', (req, res) => {
    res.json({
        sucesso: true,
        success: true,
        mensagem: 'Logout realizado com sucesso'
    });
});

// ============================================
// GET /verificar - Verificar sessão
// ============================================
router.get('/verificar', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token não fornecido'
            });
        }

        const tenantId = req.tenantId || null;
        const result = await authService.verificarToken(token, tenantId);
        res.json(result);

    } catch (error) {
        console.error('❌ Erro ao verificar token:', error);
        res.status(401).json({
            sucesso: false,
            mensagem: error.message || 'Erro ao verificar sessão'
        });
    }
});

// ============================================
// GET /validate - Validar token (compatibilidade)
// ============================================
router.get('/validate', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        valido: true,
        user: req.user,
        tenant: req.tenant ? {
            id: req.tenant.id,
            nome: req.tenant.nome_organizacao,
            plano: req.tenant.plano
        } : null
    });
});

// ============================================
// GET /me - Obter usuário atual
// ============================================
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Não autenticado'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const connection = await getConnection();

        // Buscar dados completos do usuário
        const [usuarios] = await connection.query(`
            SELECT
                u.id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone,
                u.cargo, u.unidade, u.ativo, u.nivel_acesso_codigo, u.perfil,
                na.nome as nivel_nome, na.descricao as nivel_descricao
            FROM usuarios u
            LEFT JOIN niveis_acesso na ON u.nivel_acesso_codigo = na.codigo
            WHERE u.id = ?
        `, [decoded.userId]);

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        const usuario = usuarios[0];

        // Buscar permissões detalhadas
        const [permissoes] = await connection.query(`
            SELECT
                p.modulo_codigo,
                p.pode_visualizar,
                p.pode_criar,
                p.pode_editar,
                p.pode_excluir,
                p.pode_exportar,
                p.restricao_unidade,
                ms.nome as modulo_nome,
                ms.icone as modulo_icone
            FROM permissoes p
            LEFT JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
            LEFT JOIN modulos_sistema ms ON p.modulo_codigo = ms.codigo
            WHERE (na.codigo = ? OR p.perfil = ?)
        `, [usuario.nivel_acesso_codigo, usuario.perfil]);

        const permissoesArray = permissoes
            .filter(p => p.pode_visualizar)
            .map(p => p.modulo_codigo);

        if (usuario.nivel_acesso_codigo === 'administrador' || usuario.perfil === 'admin') {
            permissoesArray.unshift('todas');
        }

        res.json({
            sucesso: true,
            usuario: {
                ...usuario,
                permissoes: permissoesArray
            },
            permissoes: permissoes
        });

    } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar dados do usuário'
        });
    }
});

// ============================================
// POST /register - Registrar novo usuário
// ============================================
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenantId || null;
        const result = await authService.register(req.body, tenantId, req.user);
        res.json(result);

    } catch (error) {
        console.error('❌ Erro ao registrar:', error);
        res.status(400).json({
            sucesso: false,
            error: error.message || 'Erro ao criar usuário',
            mensagem: error.message
        });
    }
});

// ============================================
// POST /alterar-senha - Alterar senha
// ============================================
router.post('/alterar-senha', authenticateToken, async (req, res) => {
    try {
        const { senha_atual, senha_nova } = req.body;

        if (!senha_atual || !senha_nova) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Senha atual e nova senha são obrigatórias'
            });
        }

        if (senha_nova.length < 6) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A nova senha deve ter no mínimo 6 caracteres'
            });
        }

        const connection = await getConnection();
        const [usuarios] = await connection.query(
            'SELECT id, senha, senha_hash FROM usuarios WHERE id = ?',
            [req.user.userId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        const senhaAtualHash = usuarios[0].senha_hash || usuarios[0].senha;
        const senhaValida = await bcrypt.compare(senha_atual, senhaAtualHash);

        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Senha atual incorreta'
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha_nova, 10);
        await connection.query(
            'UPDATE usuarios SET senha = ?, senha_hash = ?, data_atualizacao = NOW() WHERE id = ?',
            [senhaCriptografada, senhaCriptografada, req.user.userId]
        );

        res.json({
            sucesso: true,
            mensagem: 'Senha alterada com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao alterar senha:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar senha'
        });
    }
});

// ============================================
// GET /sessoes - Listar sessões ativas
// ============================================
router.get('/sessoes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Em produção, implementar gestão de sessões com Redis
        res.json({
            sucesso: true,
            total: 0,
            sessoes: [],
            mensagem: 'Implementar gestão de sessões ativas com Redis'
        });

    } catch (error) {
        console.error('❌ Erro ao listar sessões:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar sessões'
        });
    }
});

module.exports = router;
