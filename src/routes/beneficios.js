const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// Middleware para extrair tenant_id
const extractTenantId = (req, res, next) => {
    // O tenant_id pode vir de diferentes lugares dependendo do middleware
    req.tenant_id = req.tenantId || req.user?.tenantId || req.user?.tenant_id;

    if (!req.tenant_id) {
        console.error('[ERRO] tenant_id não encontrado:', {
            tenantId: req.tenantId,
            user: req.user
        });
        return res.status(400).json({
            mensagem: 'Tenant não identificado',
            debug: process.env.NODE_ENV === 'development' ? {
                tenantId: req.tenantId,
                user: req.user
            } : undefined
        });
    }

    next();
};

// Aplicar middleware em todas as rotas deste router
router.use(extractTenantId);

// ===================================
// MOVIMENTAÇÃO DE BENEFÍCIOS
// ===================================

// Listar todas as movimentações
router.get('/movimentacao', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [rows] = await connection.query(
            `
            SELECT *
            FROM beneficios_movimentacao
            WHERE tenant_id = ?
            ORDER BY data DESC
            LIMIT 100
        `,
            [req.tenant_id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({ mensagem: 'Erro ao buscar movimentações', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Criar nova movimentação
router.post('/movimentacao', async (req, res) => {
    let connection;
    try {
        const { beneficio, nome, cpf, data, acao, situacao, unidade, observacoes } = req.body;

        if (!beneficio || !nome || !data || !acao || !situacao) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios faltando' });
        }

        connection = await getConnection();

        const [result] = await connection.query(
            `
            INSERT INTO beneficios_movimentacao
            (tenant_id, beneficio, nome, cpf, data, acao, situacao, unidade, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [req.tenant_id, beneficio, nome, cpf, data, acao, situacao, unidade, observacoes]
        );

        res.status(201).json({
            mensagem: 'Movimentação criada com sucesso',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao criar movimentação:', error);
        res.status(500).json({ mensagem: 'Erro ao criar movimentação', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Atualizar movimentação
router.put('/movimentacao/:id', async (req, res) => {
    let connection;
    try {
        const { beneficio, nome, cpf, data, acao, situacao, unidade, observacoes } = req.body;

        connection = await getConnection();

        const [result] = await connection.query(
            `
            UPDATE beneficios_movimentacao
            SET beneficio = ?, nome = ?, cpf = ?, data = ?, acao = ?,
                situacao = ?, unidade = ?, observacoes = ?
            WHERE id = ? AND tenant_id = ?
        `,
            [beneficio, nome, cpf, data, acao, situacao, unidade, observacoes, req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Movimentação não encontrada' });
        }

        res.json({ mensagem: 'Movimentação atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar movimentação:', error);
        res.status(500).json({ mensagem: 'Erro ao atualizar movimentação', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Deletar movimentação
router.delete('/movimentacao/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [result] = await connection.query(
            'DELETE FROM beneficios_movimentacao WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Movimentação não encontrada' });
        }

        res.json({ mensagem: 'Movimentação deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar movimentação:', error);
        res.status(500).json({ mensagem: 'Erro ao deletar movimentação', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// ===================================
// BOLSA FAMÍLIA
// ===================================

// Listar Bolsa Família
router.get('/bolsa', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [rows] = await connection.query(
            `
            SELECT *
            FROM beneficios_bolsa_familia
            WHERE tenant_id = ?
            ORDER BY entrada DESC
            LIMIT 100
        `,
            [req.tenant_id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar Bolsa Família:', error);
        res.status(500).json({ mensagem: 'Erro ao buscar Bolsa Família', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Criar novo registro Bolsa Família
router.post('/bolsa', async (req, res) => {
    let connection;
    try {
        const { rf, nis, cpf, grupo, entrada, renovacao, situacao, observacoes } = req.body;

        if (!rf || !nis || !grupo || !entrada || !situacao) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios faltando' });
        }

        connection = await getConnection();

        const [result] = await connection.query(
            `
            INSERT INTO beneficios_bolsa_familia
            (tenant_id, rf, nis, cpf, grupo, entrada, renovacao, situacao, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [req.tenant_id, rf, nis, cpf, grupo, entrada, renovacao, situacao, observacoes]
        );

        res.status(201).json({
            mensagem: 'Registro de Bolsa Família criado com sucesso',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao criar registro Bolsa Família:', error);
        res.status(500).json({ mensagem: 'Erro ao criar registro', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Atualizar registro Bolsa Família
router.put('/bolsa/:id', async (req, res) => {
    let connection;
    try {
        const { rf, nis, cpf, grupo, entrada, renovacao, situacao, observacoes } = req.body;

        connection = await getConnection();

        const [result] = await connection.query(
            `
            UPDATE beneficios_bolsa_familia
            SET rf = ?, nis = ?, cpf = ?, grupo = ?, entrada = ?,
                renovacao = ?, situacao = ?, observacoes = ?
            WHERE id = ? AND tenant_id = ?
        `,
            [rf, nis, cpf, grupo, entrada, renovacao, situacao, observacoes, req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado' });
        }

        res.json({ mensagem: 'Registro atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar registro:', error);
        res.status(500).json({ mensagem: 'Erro ao atualizar registro', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Deletar registro Bolsa Família
router.delete('/bolsa/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [result] = await connection.query(
            'DELETE FROM beneficios_bolsa_familia WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado' });
        }

        res.json({ mensagem: 'Registro deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar registro:', error);
        res.status(500).json({ mensagem: 'Erro ao deletar registro', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// ===================================
// BENEFÍCIOS EVENTUAIS
// ===================================

// Listar Benefícios Eventuais
router.get('/eventuais', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [rows] = await connection.query(
            `
            SELECT
                id,
                tenant_id,
                tipo,
                nome,
                cpf,
                valor,
                data_solicitacao AS data,
                situacao,
                observacoes,
                created_at,
                updated_at
            FROM beneficios_eventuais
            WHERE tenant_id = ?
            ORDER BY data_solicitacao DESC
            LIMIT 100
        `,
            [req.tenant_id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar benefícios eventuais:', error);
        res.status(500).json({ mensagem: 'Erro ao buscar benefícios eventuais', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Criar novo Benefício Eventual
router.post('/eventuais', async (req, res) => {
    let connection;
    try {
        const { tipo, nome, cpf, valor, data, situacao, observacoes } = req.body;

        if (!tipo || !nome || !valor || !data || !situacao) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios faltando' });
        }

        connection = await getConnection();

        const [result] = await connection.query(
            `
            INSERT INTO beneficios_eventuais
            (tenant_id, tipo, nome, cpf, valor, data_solicitacao, situacao, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [req.tenant_id, tipo, nome, cpf, valor, data, situacao, observacoes]
        );

        res.status(201).json({
            mensagem: 'Benefício eventual criado com sucesso',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao criar benefício eventual:', error);
        res.status(500).json({ mensagem: 'Erro ao criar benefício eventual', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Atualizar Benefício Eventual
router.put('/eventuais/:id', async (req, res) => {
    let connection;
    try {
        const { tipo, nome, cpf, valor, data, situacao, observacoes } = req.body;

        connection = await getConnection();

        const [result] = await connection.query(
            `
            UPDATE beneficios_eventuais
            SET tipo = ?, nome = ?, cpf = ?, valor = ?, data_solicitacao = ?,
                situacao = ?, observacoes = ?
            WHERE id = ? AND tenant_id = ?
        `,
            [tipo, nome, cpf, valor, data, situacao, observacoes, req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Benefício não encontrado' });
        }

        res.json({ mensagem: 'Benefício atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar benefício:', error);
        res.status(500).json({ mensagem: 'Erro ao atualizar benefício', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Deletar Benefício Eventual
router.delete('/eventuais/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [result] = await connection.query(
            'DELETE FROM beneficios_eventuais WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Benefício não encontrado' });
        }

        res.json({ mensagem: 'Benefício deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar benefício:', error);
        res.status(500).json({ mensagem: 'Erro ao deletar benefício', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// ===================================
// BPC
// ===================================

// Listar BPC
router.get('/bpc', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [rows] = await connection.query(
            `
            SELECT *
            FROM beneficios_bpc
            WHERE tenant_id = ?
            ORDER BY data_cadastro DESC
            LIMIT 100
        `,
            [req.tenant_id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar BPC:', error);
        console.error('Erro na query:', error.message);
        console.error('SQL:', error.sql);
        console.error('Params:', [req.tenant_id]);
        res.status(500).json({ mensagem: 'Erro ao buscar BPC', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Criar novo registro BPC
router.post('/bpc', async (req, res) => {
    let connection;
    try {
        const { nome, cpf, nis, categoria, protocolo, situacao, observacoes } = req.body;

        if (!nome || !cpf || !nis || !categoria || !situacao) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios faltando' });
        }

        connection = await getConnection();

        const [result] = await connection.query(
            `
            INSERT INTO beneficios_bpc
            (tenant_id, nome, cpf, nis, categoria, protocolo, situacao, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [req.tenant_id, nome, cpf, nis, categoria, protocolo, situacao, observacoes]
        );

        res.status(201).json({
            mensagem: 'Registro de BPC criado com sucesso',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao criar registro BPC:', error);
        res.status(500).json({ mensagem: 'Erro ao criar registro BPC', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Atualizar registro BPC
router.put('/bpc/:id', async (req, res) => {
    let connection;
    try {
        const { nome, cpf, nis, categoria, protocolo, situacao, observacoes, tipoBpc } = req.body;

        connection = await getConnection();

        const [result] = await connection.query(
            `
            UPDATE beneficios_bpc
            SET nome = ?, cpf = ?, nis = ?, categoria = ?, protocolo = ?,
                situacao = ?, observacoes = ?
            WHERE id = ? AND tenant_id = ?
        `,
            [nome, cpf, nis, categoria || tipoBpc, protocolo, situacao, observacoes, req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado' });
        }

        res.json({ mensagem: 'Registro atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar registro:', error);
        res.status(500).json({ mensagem: 'Erro ao atualizar registro', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

// Deletar registro BPC
router.delete('/bpc/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [result] = await connection.query(
            'DELETE FROM beneficios_bpc WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenant_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado' });
        }

        res.json({ mensagem: 'Registro deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar registro:', error);
        res.status(500).json({ mensagem: 'Erro ao deletar registro', erro: error.message });
    } finally {
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
    }
});

module.exports = router;
