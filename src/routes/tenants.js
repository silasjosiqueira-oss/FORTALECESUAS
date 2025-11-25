const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
    try {
        const connection = await getConnection();
        const [tenants] = await connection.query(`
            SELECT t.*,
                   COUNT(u.id) as usuarios_ativos,
                   DATEDIFF(t.data_vencimento, NOW()) as dias_restantes
            FROM tenants t
            LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = TRUE
            GROUP BY t.id
            ORDER BY t.nome_organizacao
        `);

        logger.info('Tenants listados com sucesso', {
            total: tenants.length,
            usuario: req.user.username
        });

        res.json({
            sucesso: true,
            dados: tenants
        });

    } catch (error) {
        logger.error('Erro ao listar tenants', { error: error.message });
        res.status(500).json({ error: 'Erro ao listar organizações' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const connection = await getConnection();
        const [tenants] = await connection.query(`
            SELECT t.*,
                   COUNT(u.id) as usuarios_ativos,
                   DATEDIFF(t.data_vencimento, NOW()) as dias_restantes
            FROM tenants t
            LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = TRUE
            WHERE t.id = ?
            GROUP BY t.id
        `, [req.params.id]);

        if (tenants.length === 0) {
            return res.status(404).json({ error: 'Organização não encontrada' });
        }

        res.json({
            sucesso: true,
            dados: tenants[0]
        });

    } catch (error) {
        logger.error('Erro ao buscar tenant', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao buscar organização' });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            subdomain,
            nome_organizacao,
            cnpj,
            email_contato,
            plano,
            limite_usuarios,
            data_vencimento
        } = req.body;

        if (!subdomain || !nome_organizacao || !email_contato) {
            return res.status(400).json({
                error: 'Campos obrigatórios: subdomain, nome_organizacao, email_contato'
            });
        }

        const connection = await getConnection();

        const [existente] = await connection.query(
            'SELECT id FROM tenants WHERE subdomain = ?',
            [subdomain]
        );

        if (existente.length > 0) {
            return res.status(400).json({
                error: 'Subdomínio já está em uso'
            });
        }

        const [result] = await connection.query(`
            INSERT INTO tenants (
                subdomain, nome_organizacao, cnpj, email_contato,
                plano, limite_usuarios, data_vencimento, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            subdomain.toLowerCase(),
            nome_organizacao,
            cnpj || null,
            email_contato,
            plano || 'basico',
            limite_usuarios || 10,
            data_vencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            'trial'
        ]);

        logger.info('Tenant criado', {
            id: result.insertId,
            subdomain,
            nome_organizacao,
            usuario: req.user.username
        });

        res.json({
            sucesso: true,
            mensagem: 'Organização criada com sucesso',
            id: result.insertId
        });

    } catch (error) {
        logger.error('Erro ao criar tenant', { error: error.message });
        res.status(500).json({ error: 'Erro ao criar organização' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            nome_organizacao,
            cnpj,
            email_contato,
            plano,
            limite_usuarios,
            data_vencimento
        } = req.body;

        const connection = await getConnection();

        const [result] = await connection.query(`
            UPDATE tenants SET
                nome_organizacao = ?,
                cnpj = ?,
                email_contato = ?,
                plano = ?,
                limite_usuarios = ?,
                data_vencimento = ?
            WHERE id = ?
        `, [
            nome_organizacao,
            cnpj || null,
            email_contato,
            plano,
            limite_usuarios,
            data_vencimento,
            req.params.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organização não encontrada' });
        }

        logger.info('Tenant atualizado', {
            id: req.params.id,
            usuario: req.user.username
        });

        res.json({
            sucesso: true,
            mensagem: 'Organização atualizada com sucesso'
        });

    } catch (error) {
        logger.error('Erro ao atualizar tenant', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao atualizar organização' });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const statusPermitidos = ['ativo', 'trial', 'suspenso', 'cancelado'];

        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({
                error: 'Status inválido',
                statusPermitidos
            });
        }

        const connection = await getConnection();

        const [result] = await connection.query(
            'UPDATE tenants SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organização não encontrada' });
        }

        logger.info('Status do tenant alterado', {
            id: req.params.id,
            novoStatus: status,
            usuario: req.user.username
        });

        res.json({
            sucesso: true,
            mensagem: 'Status alterado com sucesso'
        });

    } catch (error) {
        logger.error('Erro ao alterar status', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao alterar status' });
    }
});

router.post('/:id/renovar', async (req, res) => {
    try {
        const { dias } = req.body;

        if (!dias || dias <= 0) {
            return res.status(400).json({
                error: 'Número de dias inválido'
            });
        }

        const connection = await getConnection();

        const [result] = await connection.query(`
            UPDATE tenants
            SET data_vencimento = DATE_ADD(
                GREATEST(data_vencimento, NOW()),
                INTERVAL ? DAY
            )
            WHERE id = ?
        `, [dias, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organização não encontrada' });
        }

        logger.info('Assinatura renovada', {
            id: req.params.id,
            dias,
            usuario: req.user.username
        });

        res.json({
            sucesso: true,
            mensagem: `Assinatura renovada por ${dias} dias`
        });

    } catch (error) {
        logger.error('Erro ao renovar assinatura', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao renovar assinatura' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const connection = await getConnection();

        const [usuarios] = await connection.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = ?',
            [req.params.id]
        );

        if (usuarios[0].total > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir',
                mensagem: 'Esta organização possui usuários cadastrados. Cancele a conta ao invés de excluir.'
            });
        }

        const [result] = await connection.query(
            'DELETE FROM tenants WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organização não encontrada' });
        }

        logger.info('Tenant excluído', {
            id: req.params.id,
            usuario: req.user.username
        });

        res.json({
            sucesso: true,
            mensagem: 'Organização excluída com sucesso'
        });

    } catch (error) {
        logger.error('Erro ao excluir tenant', { error: error.message, id: req.params.id });
        res.status(500).json({ error: 'Erro ao excluir organização' });
    }
});

module.exports = router;
