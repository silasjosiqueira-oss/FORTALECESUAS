// src/routes/tenants.js
const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// Middleware de autenticação Super Admin (TEMPORÁRIO - substituir por JWT real)
const authenticateSuperAdmin = (req, res, next) => {
    const superAdminKey = req.headers['x-super-admin-key'];

    // TODO: Implementar autenticação real com JWT
    if (superAdminKey !== 'CHAVE_SUPER_ADMIN_TEMPORARIA') {
        return res.status(403).json({
            sucesso: false,
            mensagem: 'Acesso negado. Apenas Super Admins podem acessar esta rota.'
        });
    }

    next();
};

router.use(authenticateSuperAdmin);

// GET /api/admin/tenants - Listar todos os tenants
router.get('/', async (req, res) => {
    try {
        const connection = await getConnection();

        // ✅ CORRIGIDO: Removido ORDER BY created_at (campo pode não existir)
        const [tenants] = await connection.query(`
            SELECT
                t.*,
                COUNT(DISTINCT u.id) as usuarios_ativos,
                DATEDIFF(t.data_vencimento, NOW()) as dias_restantes
            FROM tenants t
            LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = TRUE
            GROUP BY t.id
            ORDER BY t.id DESC
        `);

        res.json({
            sucesso: true,
            dados: tenants
        });
    } catch (error) {
        console.error('Erro ao listar tenants:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar organizações',
            erro: error.message
        });
    }
});

// GET /api/admin/tenants/:id - Buscar tenant por ID
router.get('/:id', async (req, res) => {
    try {
        const connection = await getConnection();

        const [tenants] = await connection.query(`
            SELECT
                t.*,
                COUNT(DISTINCT u.id) as usuarios_ativos,
                DATEDIFF(t.data_vencimento, NOW()) as dias_restantes
            FROM tenants t
            LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = TRUE
            WHERE t.id = ?
            GROUP BY t.id
        `, [req.params.id]);

        if (tenants.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Organização não encontrada'
            });
        }

        res.json({
            sucesso: true,
            dados: tenants[0]
        });
    } catch (error) {
        console.error('Erro ao buscar tenant:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar organização'
        });
    }
});

// POST /api/admin/tenants - Criar novo tenant
router.post('/', async (req, res) => {
    try {
        const { subdomain, nome_organizacao, cnpj, email_contato, plano, limite_usuarios, data_vencimento } = req.body;

        if (!subdomain || !nome_organizacao || !email_contato || !plano) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Campos obrigatórios: subdomain, nome_organizacao, email_contato, plano'
            });
        }

        const connection = await getConnection();

        // Verificar se subdomínio já existe
        const [existing] = await connection.query(
            'SELECT id FROM tenants WHERE subdomain = ?',
            [subdomain.toLowerCase()]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Subdomínio já está em uso'
            });
        }

        // Calcular data de vencimento se não fornecida
        let dataVenc = data_vencimento;
        if (!dataVenc) {
            const hoje = new Date();
            hoje.setDate(hoje.getDate() + 30); // 30 dias trial
            dataVenc = hoje.toISOString().split('T')[0];
        }

        const [result] = await connection.query(`
            INSERT INTO tenants (
                subdomain, nome_organizacao, cnpj, email_contato,
                plano, limite_usuarios, data_vencimento, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo')
        `, [
            subdomain.toLowerCase(),
            nome_organizacao,
            cnpj || null,
            email_contato,
            plano,
            limite_usuarios || 10,
            dataVenc
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Organização criada com sucesso',
            dados: {
                id: result.insertId,
                url: `https://${subdomain}.fortalecesuas.com`
            }
        });
    } catch (error) {
        console.error('Erro ao criar tenant:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao criar organização',
            erro: error.message
        });
    }
});

// PUT /api/admin/tenants/:id - Atualizar tenant
router.put('/:id', async (req, res) => {
    try {
        const { nome_organizacao, cnpj, email_contato, plano, limite_usuarios, data_vencimento } = req.body;

        if (!nome_organizacao || !email_contato || !plano) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Campos obrigatórios: nome_organizacao, email_contato, plano'
            });
        }

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
            limite_usuarios || 10,
            data_vencimento,
            req.params.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Organização não encontrada'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Organização atualizada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar tenant:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar organização'
        });
    }
});

// PATCH /api/admin/tenants/:id/status - Alterar status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const statusValidos = ['ativo', 'trial', 'suspenso', 'cancelado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: `Status inválido. Use: ${statusValidos.join(', ')}`
            });
        }

        const connection = await getConnection();

        const [result] = await connection.query(
            'UPDATE tenants SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Organização não encontrada'
            });
        }

        res.json({
            sucesso: true,
            mensagem: `Status alterado para ${status} com sucesso`
        });
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar status'
        });
    }
});

// POST /api/admin/tenants/:id/renovar - Renovar assinatura
router.post('/:id/renovar', async (req, res) => {
    try {
        const { dias } = req.body;

        if (!dias || dias <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o número de dias para renovação'
            });
        }

        const connection = await getConnection();

        // Buscar data de vencimento atual
        const [tenants] = await connection.query(
            'SELECT data_vencimento FROM tenants WHERE id = ?',
            [req.params.id]
        );

        if (tenants.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Organização não encontrada'
            });
        }

        const dataAtual = new Date(tenants[0].data_vencimento);
        const hoje = new Date();

        // Se já venceu, renovar a partir de hoje
        const dataBase = dataAtual > hoje ? dataAtual : hoje;
        dataBase.setDate(dataBase.getDate() + parseInt(dias));

        await connection.query(
            'UPDATE tenants SET data_vencimento = ?, status = ? WHERE id = ?',
            [dataBase.toISOString().split('T')[0], 'ativo', req.params.id]
        );

        res.json({
            sucesso: true,
            mensagem: `Assinatura renovada por ${dias} dias`,
            dados: {
                nova_data_vencimento: dataBase.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Erro ao renovar:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao renovar assinatura'
        });
    }
});

// DELETE /api/admin/tenants/:id - Deletar tenant (CUIDADO!)
router.delete('/:id', async (req, res) => {
    try {
        const connection = await getConnection();

        // Verificar se existem usuários
        const [usuarios] = await connection.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = ?',
            [req.params.id]
        );

        if (usuarios[0].total > 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: `Não é possível excluir. Existem ${usuarios[0].total} usuários vinculados a esta organização.`
            });
        }

        const [result] = await connection.query(
            'DELETE FROM tenants WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Organização não encontrada'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Organização excluída com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir tenant:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir organização'
        });
    }
});

module.exports = router;
