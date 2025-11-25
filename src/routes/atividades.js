const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// ============================================
// GET - Listar todas atividades
// ============================================
router.get('/', async (req, res) => {
    try {
        console.log('GET /atividades - Listando atividades', {
            tenant: req.tenant?.nome_organizacao,
            tenantId: req.tenantId
        });

        const pool = getPool();
        const query = `
            SELECT
                id,
                atividade,
                responsavel,
                educador,
                unidade,
                localidade,
                dia,
                horario,
                carga_horaria,
                data_inicio,
                data_termino,
                vagas,
                status,
                descricao,
                participantes,
                presencas,
                created_at,
                updated_at
            FROM atividades
            WHERE tenant_id = ?
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

        const [atividades] = await pool.query(query, [req.tenantId]);

        // Parsear JSON dos campos participantes e presencas
        const atividadesFormatadas = atividades.map(ativ => ({
            ...ativ,
            cargaHoraria: ativ.carga_horaria,
            dataInicio: ativ.data_inicio,
            dataTermino: ativ.data_termino,
            participantes: ativ.participantes ? JSON.parse(ativ.participantes) : [],
            presencas: ativ.presencas ? JSON.parse(ativ.presencas) : []
        }));

        res.json(atividadesFormatadas);
    } catch (error) {
        console.error('Erro ao listar atividades:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET - Buscar atividade por ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`GET /atividades/${id} - Buscando atividade`);

        const pool = getPool();
        const query = 'SELECT * FROM atividades WHERE id = ? AND tenant_id = ?';
        const [atividades] = await pool.query(query, [id, req.tenantId]);

        if (atividades.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        const atividade = {
            ...atividades[0],
            cargaHoraria: atividades[0].carga_horaria,
            dataInicio: atividades[0].data_inicio,
            dataTermino: atividades[0].data_termino,
            participantes: atividades[0].participantes ? JSON.parse(atividades[0].participantes) : [],
            presencas: atividades[0].presencas ? JSON.parse(atividades[0].presencas) : []
        };

        res.json(atividade);
    } catch (error) {
        console.error('Erro ao buscar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST - Criar nova atividade
// ============================================
router.post('/', async (req, res) => {
    try {
        console.log('POST /atividades - Criando nova atividade:', req.body);

        const {
            atividade,
            responsavel,
            educador = '',
            unidade = '',
            localidade = '',
            dia,
            horario,
            cargaHoraria = 0,
            dataInicio = null,
            dataTermino = null,
            vagas = null,
            status = 'ativo',
            descricao = '',
            participantes = [],
            presencas = []
        } = req.body;

        // Validação
        if (!atividade || !responsavel || !dia || !horario) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: atividade, responsavel, dia, horario'
            });
        }

        const pool = getPool();
        const query = `
            INSERT INTO atividades (
                tenant_id,
                atividade,
                responsavel,
                educador,
                unidade,
                localidade,
                dia,
                horario,
                carga_horaria,
                data_inicio,
                data_termino,
                vagas,
                status,
                descricao,
                participantes,
                presencas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(query, [
            req.tenantId,
            atividade,
            responsavel,
            educador,
            unidade,
            localidade,
            dia,
            horario,
            cargaHoraria,
            dataInicio,
            dataTermino,
            vagas,
            status,
            descricao,
            JSON.stringify(participantes),
            JSON.stringify(presencas)
        ]);

        // Buscar a atividade criada
        const [novaAtividade] = await pool.query(
            'SELECT * FROM atividades WHERE id = ?',
            [result.insertId]
        );

        const atividadeFormatada = {
            ...novaAtividade[0],
            cargaHoraria: novaAtividade[0].carga_horaria,
            dataInicio: novaAtividade[0].data_inicio,
            dataTermino: novaAtividade[0].data_termino,
            participantes: JSON.parse(novaAtividade[0].participantes || '[]'),
            presencas: JSON.parse(novaAtividade[0].presencas || '[]')
        };

        console.log('Atividade criada com sucesso:', atividadeFormatada);
        res.status(201).json(atividadeFormatada);
    } catch (error) {
        console.error('Erro ao criar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT - Atualizar atividade completa
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`PUT /atividades/${id} - Atualizando atividade`);

        const {
            atividade,
            responsavel,
            educador,
            unidade,
            localidade,
            dia,
            horario,
            cargaHoraria,
            dataInicio,
            dataTermino,
            vagas,
            status,
            descricao,
            participantes,
            presencas
        } = req.body;

        const pool = getPool();

        // Verificar se existe
        const [exists] = await pool.query(
            'SELECT id FROM atividades WHERE id = ? AND tenant_id = ?',
            [id, req.tenantId]
        );

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
                educador = COALESCE(?, educador),
                unidade = COALESCE(?, unidade),
                localidade = COALESCE(?, localidade),
                dia = COALESCE(?, dia),
                horario = COALESCE(?, horario),
                carga_horaria = COALESCE(?, carga_horaria),
                data_inicio = COALESCE(?, data_inicio),
                data_termino = COALESCE(?, data_termino),
                vagas = COALESCE(?, vagas),
                status = COALESCE(?, status),
                descricao = COALESCE(?, descricao),
                participantes = COALESCE(?, participantes),
                presencas = COALESCE(?, presencas),
                updated_at = NOW()
            WHERE id = ? AND tenant_id = ?
        `;

        await pool.query(query, [
            atividade,
            responsavel,
            educador,
            unidade,
            localidade,
            dia,
            horario,
            cargaHoraria,
            dataInicio,
            dataTermino,
            vagas,
            status,
            descricao,
            participantes ? JSON.stringify(participantes) : null,
            presencas ? JSON.stringify(presencas) : null,
            id,
            req.tenantId
        ]);

        // Buscar a atividade atualizada
        const [atividadeAtualizada] = await pool.query(
            'SELECT * FROM atividades WHERE id = ?',
            [id]
        );

        const atividadeFormatada = {
            ...atividadeAtualizada[0],
            cargaHoraria: atividadeAtualizada[0].carga_horaria,
            dataInicio: atividadeAtualizada[0].data_inicio,
            dataTermino: atividadeAtualizada[0].data_termino,
            participantes: JSON.parse(atividadeAtualizada[0].participantes || '[]'),
            presencas: JSON.parse(atividadeAtualizada[0].presencas || '[]')
        };

        console.log('Atividade atualizada:', atividadeFormatada);
        res.json(atividadeFormatada);
    } catch (error) {
        console.error('Erro ao atualizar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PATCH - Atualizar parcialmente
// ============================================
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`PATCH /atividades/${id} - Atualizando parcialmente`);

        const pool = getPool();

        // Verificar se existe
        const [exists] = await pool.query(
            'SELECT id FROM atividades WHERE id = ? AND tenant_id = ?',
            [id, req.tenantId]
        );

        if (exists.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        // Mapear campos do frontend para o banco
        const fieldMapping = {
            cargaHoraria: 'carga_horaria',
            dataInicio: 'data_inicio',
            dataTermino: 'data_termino'
        };

        const fields = [];
        const values = [];

        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined && key !== 'id') {
                const dbField = fieldMapping[key] || key;

                // Se for array/objeto, converter para JSON
                if (key === 'participantes' || key === 'presencas') {
                    fields.push(`${dbField} = ?`);
                    values.push(JSON.stringify(req.body[key]));
                } else {
                    fields.push(`${dbField} = ?`);
                    values.push(req.body[key]);
                }
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum campo para atualizar'
            });
        }

        fields.push('updated_at = NOW()');
        values.push(id, req.tenantId);

        const query = `UPDATE atividades SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`;
        await pool.query(query, values);

        // Buscar a atividade atualizada
        const [atividadeAtualizada] = await pool.query(
            'SELECT * FROM atividades WHERE id = ?',
            [id]
        );

        const atividadeFormatada = {
            ...atividadeAtualizada[0],
            cargaHoraria: atividadeAtualizada[0].carga_horaria,
            dataInicio: atividadeAtualizada[0].data_inicio,
            dataTermino: atividadeAtualizada[0].data_termino,
            participantes: JSON.parse(atividadeAtualizada[0].participantes || '[]'),
            presencas: JSON.parse(atividadeAtualizada[0].presencas || '[]')
        };

        console.log('Atividade atualizada:', atividadeFormatada);
        res.json(atividadeFormatada);
    } catch (error) {
        console.error('Erro ao atualizar atividade:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE - Excluir atividade
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`DELETE /atividades/${id} - Excluindo atividade`);

        const pool = getPool();

        // Buscar antes de deletar
        const [atividade] = await pool.query(
            'SELECT * FROM atividades WHERE id = ? AND tenant_id = ?',
            [id, req.tenantId]
        );

        if (atividade.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Atividade não encontrada'
            });
        }

        await pool.query(
            'DELETE FROM atividades WHERE id = ? AND tenant_id = ?',
            [id, req.tenantId]
        );

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
