const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// GET - Listar todas atividades
router.get('/', async (req, res) => {
    try {
        console.log('GET /atividades - Listando todas as atividades');

        const pool = getPool();
        const query = `
            SELECT
                id,
                atividade,
                responsavel,
                dia,
                horario,
                participantes,
                status,
                descricao,
                created_at,
                updated_at
            FROM atividades
            ORDER BY
                CASE dia
                    WHEN 'Segunda' THEN 1
                    WHEN 'Terça' THEN 2
                    WHEN 'Quarta' THEN 3
                    WHEN 'Quinta' THEN 4
                    WHEN 'Sexta' THEN 5
                    WHEN 'Sábado' THEN 6
                    WHEN 'Domingo' THEN 7
                END,
                horario
        `;

        const [atividades] = await pool.query(query);
        res.json(atividades);
    } catch (error) {
        console.error('Erro ao listar atividades:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET - Buscar atividade por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`GET /atividades/${id} - Buscando atividade`);

        const pool = getPool();
        const query = 'SELECT * FROM atividades WHERE id = ?';
        const [atividades] = await pool.query(query, [id]);

        if (atividades.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        res.json(atividades[0]);
    } catch (error) {
        console.error('Erro ao buscar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST - Criar nova atividade
router.post('/', async (req, res) => {
    try {
        console.log('POST /atividades - Criando nova atividade:', req.body);

        const {
            atividade,
            responsavel,
            dia,
            horario,
            participantes = 0,
            status = 'ativo',
            descricao = ''
        } = req.body;

        const pool = getPool();
        const query = `
            INSERT INTO atividades
            (atividade, responsavel, dia, horario, participantes, status, descricao)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(query, [
            atividade,
            responsavel,
            dia,
            horario,
            participantes,
            status,
            descricao
        ]);

        // Buscar a atividade criada
        const [novaAtividade] = await pool.query(
            'SELECT * FROM atividades WHERE id = ?',
            [result.insertId]
        );

        console.log('Atividade criada com sucesso:', novaAtividade[0]);
        res.status(201).json(novaAtividade[0]);
    } catch (error) {
        console.error('Erro ao criar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT - Atualizar atividade
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`PUT /atividades/${id} - Atualizando atividade`);

        const {
            atividade,
            responsavel,
            dia,
            horario,
            participantes,
            status,
            descricao
        } = req.body;

        const pool = getPool();

        // Verificar se existe
        const [exists] = await pool.query('SELECT id FROM atividades WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        const query = `
            UPDATE atividades
            SET
                atividade = COALESCE(?, atividade),
                responsavel = COALESCE(?, responsavel),
                dia = COALESCE(?, dia),
                horario = COALESCE(?, horario),
                participantes = COALESCE(?, participantes),
                status = COALESCE(?, status),
                descricao = COALESCE(?, descricao),
                updated_at = NOW()
            WHERE id = ?
        `;

        await pool.query(query, [
            atividade,
            responsavel,
            dia,
            horario,
            participantes,
            status,
            descricao,
            id
        ]);

        // Buscar a atividade atualizada
        const [atividadeAtualizada] = await pool.query(
            'SELECT * FROM atividades WHERE id = ?',
            [id]
        );

        console.log('Atividade atualizada:', atividadeAtualizada[0]);
        res.json(atividadeAtualizada[0]);
    } catch (error) {
        console.error('Erro ao atualizar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PATCH - Atualizar parcialmente
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`PATCH /atividades/${id} - Atualizando parcialmente`);

        const pool = getPool();

        // Verificar se existe
        const [exists] = await pool.query('SELECT id FROM atividades WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        // Construir query dinâmica apenas com campos fornecidos
        const fields = [];
        const values = [];

        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(req.body[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum campo para atualizar'
            });
        }

        fields.push('updated_at = NOW()');
        values.push(id);

        const query = `UPDATE atividades SET ${fields.join(', ')} WHERE id = ?`;
        await pool.query(query, values);

        // Buscar a atividade atualizada
        const [atividadeAtualizada] = await pool.query(
            'SELECT * FROM atividades WHERE id = ?',
            [id]
        );

        console.log('Atividade atualizada:', atividadeAtualizada[0]);
        res.json(atividadeAtualizada[0]);
    } catch (error) {
        console.error('Erro ao atualizar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE - Excluir atividade
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`DELETE /atividades/${id} - Excluindo atividade`);

        const pool = getPool();

        // Buscar antes de deletar
        const [atividade] = await pool.query('SELECT * FROM atividades WHERE id = ?', [id]);

        if (atividade.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        await pool.query('DELETE FROM atividades WHERE id = ?', [id]);

        console.log('Atividade excluída:', atividade[0]);
        res.json({
            success: true,
            message: 'Atividade excluída com sucesso',
            atividade: atividade[0]
        });
    } catch (error) {
        console.error('Erro ao excluir atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
