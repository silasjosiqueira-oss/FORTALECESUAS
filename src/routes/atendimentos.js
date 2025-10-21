const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { autenticar } = require('../middleware/auth'); // 👈 ADICIONAR ESTA LINHA!

// ==========================================
// GET /api/atendimentos/buscar-cpf/:cpf
// ==========================================
router.get('/buscar-cpf/:cpf', autenticar, async (req, res) => {
    try {
        const { cpf } = req.params;
        const cpfLimpo = cpf.replace(/\D/g, ''); // Remove pontos e traços

        console.log('🔍 Buscando CPF:', cpfLimpo);

        const pool = getPool();

        // Buscar último atendimento do CPF no MySQL
        const [rows] = await pool.query(`
            SELECT * FROM atendimentos
            WHERE cpf LIKE ? OR cpf = ?
            ORDER BY dataHora DESC
            LIMIT 1
        `, [`%${cpfLimpo}%`, cpfLimpo]);

        if (rows.length > 0) {
            const atendimento = rows[0];

            // Parse do JSON de observações se existir
            let dadosCompletos = {};
            try {
                dadosCompletos = atendimento.observacoes ?
                    JSON.parse(atendimento.observacoes) : {};
            } catch (e) {
                console.warn('Não foi possível parsear observações');
            }

            res.json({
                encontrado: true,
                dados: {
                    // Dados básicos do banco
                    nomeCompleto: atendimento.nomeCompleto,
                    cpf: atendimento.cpf,
                    telefone: atendimento.telefone,

                    // Dados completos do JSON (se existirem)
                    nomeSocial: dadosCompletos.nomeSocial,
                    rg: dadosCompletos.rg,
                    nis: dadosCompletos.nis,
                    cadUnico: dadosCompletos.cadUnico,
                    dataNascimento: dadosCompletos.dataNascimento,
                    estadoCivil: dadosCompletos.estadoCivil,
                    corRaca: dadosCompletos.corRaca,
                    sexo: dadosCompletos.sexo,
                    identidadeGenero: dadosCompletos.identidadeGenero,
                    orientacaoSexual: dadosCompletos.orientacaoSexual,
                    filiacao1: dadosCompletos.filiacao1,
                    filiacao2: dadosCompletos.filiacao2,
                    naturalidade: dadosCompletos.naturalidade,
                    nacionalidade: dadosCompletos.nacionalidade,

                    // Contato
                    email: dadosCompletos.email,
                    endereco: dadosCompletos.endereco,
                    bairro: dadosCompletos.bairro,
                    cep: dadosCompletos.cep,
                    cidade: dadosCompletos.cidade,
                    estado: dadosCompletos.estado,

                    // Religião e especificidades
                    religiao: dadosCompletos.religiao,
                    situacoesEspecificas: dadosCompletos.situacoesEspecificas,

                    // Documentação
                    dataEmissaoRg: dadosCompletos.dataEmissaoRg,
                    orgaoEmissor: dadosCompletos.orgaoEmissor,
                    carteiraTrabalho: dadosCompletos.carteiraTrabalho,
                    tituloEleitor: dadosCompletos.tituloEleitor,
                    cartaoSus: dadosCompletos.cartaoSus,

                    // Saúde
                    observacoesSaude: dadosCompletos.observacoesSaude,
                    possuiDeficiencia: dadosCompletos.possuiDeficiencia,
                    tipoDeficiencia: dadosCompletos.tipoDeficiencia,

                    // Renda
                    possuiRemuneracao: dadosCompletos.possuiRemuneracao,
                    frequenciaRemuneracao: dadosCompletos.frequenciaRemuneracao,
                    valorRemuneracao: dadosCompletos.valorRemuneracao,
                    situacaoMoradia: dadosCompletos.situacaoMoradia,

                    // Composição familiar
                    responsavelFamilia: dadosCompletos.responsavelFamilia,
                    composicaoFamiliar: dadosCompletos.composicaoFamiliar,

                    // Info do último atendimento
                    ultimoAtendimento: atendimento.dataHora,
                    ultimoTecnico: atendimento.tecnicoResponsavel,
                    ultimaUnidade: atendimento.unidade,
                    ultimoRegistro: atendimento.registro
                }
            });
        } else {
            console.log('❌ CPF não encontrado:', cpfLimpo);
            res.json({
                encontrado: false,
                mensagem: 'Nenhum cadastro encontrado para este CPF'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao buscar CPF:', error);
        res.status(500).json({
            error: 'Erro ao buscar cadastro',
            mensagem: error.message
        });
    }
});

// ==========================================
// GET - Listar todos os atendimentos
// ==========================================
router.get('/', autenticar, async (req, res) => { // 👈 Adicionar autenticar aqui também
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT * FROM atendimentos
            ORDER BY dataHora DESC
        `);
        console.log(`✅ GET /atendimentos - Retornando ${rows.length} atendimentos do banco`);
        res.json(rows);
    } catch (error) {
        console.error('❌ Erro ao buscar atendimentos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar atendimentos',
            error: error.message
        });
    }
});

// GET - Buscar atendimento específico
router.get('/:id', autenticar, async (req, res) => { // 👈 Adicionar autenticar
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM atendimentos WHERE id = ?', [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        console.log(`✅ Atendimento encontrado:`, rows[0].nomeCompleto);
        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Erro ao buscar atendimento:', error);
        res.status(500).json({ error: 'Erro ao buscar atendimento' });
    }
});

// POST - Criar novo atendimento
router.post('/', autenticar, async (req, res) => { // 👈 Adicionar autenticar
    try {
        const pool = getPool();
        console.log('📝 POST /atendimentos - Criando novo atendimento');

        if (!req.body.nomeCompleto && !req.body.nomeUsuario) {
            return res.status(400).json({
                success: false,
                error: 'Nome completo é obrigatório'
            });
        }

        // Gerar número de registro
        const [count] = await pool.query('SELECT COUNT(*) as total FROM atendimentos');
        const registro = `2025${String(count[0].total + 1).padStart(6, '0')}`;

        const nomeCompleto = req.body.nomeCompleto || req.body.nomeUsuario;
        const motivosAtendimento = Array.isArray(req.body.motivosAtendimento)
            ? req.body.motivosAtendimento.join(', ')
            : req.body.motivoAtendimento || '';

        // Inserir no banco
        const [result] = await pool.query(`
            INSERT INTO atendimentos (
                registro, dataHora, nomeCompleto, nomeUsuario, cpf, telefone,
                tecnicoResponsavel, tipoAtendimento, unidade, status, prioridade,
                motivoAtendimento, descricaoDemanda, observacoes
            ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            registro,
            nomeCompleto,
            nomeCompleto,
            req.body.cpf || null,
            req.body.telefone || null,
            req.body.tecnicoResponsavel || 'Não informado',
            req.body.tipoAtendimento || 'Atendimento Geral',
            req.body.unidade || 'Secretaria',
            req.body.statusInicial || req.body.status || 'aguardando',
            req.body.prioridade || 'normal',
            motivosAtendimento,
            req.body.descricaoDemanda || '',
            JSON.stringify(req.body) // Salva TODOS os dados em JSON
        ]);

        console.log(`✅ Atendimento salvo no banco! ID: ${result.insertId}, Registro: ${registro}`);

        res.status(201).json({
            success: true,
            message: 'Atendimento criado com sucesso',
            data: {
                id: result.insertId,
                registro: registro,
                nomeCompleto: nomeCompleto
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar atendimento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar atendimento',
            error: error.message
        });
    }
});

// DELETE - Remover atendimento
router.delete('/:id', autenticar, async (req, res) => { // 👈 Adicionar autenticar
    try {
        const pool = getPool();
        console.log(`🗑️ DELETE /atendimentos/${req.params.id}`);

        const [result] = await pool.query('DELETE FROM atendimentos WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        console.log(`✅ Atendimento ${req.params.id} removido do banco`);
        res.json({
            success: true,
            message: 'Atendimento removido com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao remover:', error);
        res.status(500).json({ error: 'Erro ao remover atendimento' });
    }
});

// PUT - Atualizar atendimento
router.put('/:id', autenticar, async (req, res) => { // 👈 Adicionar autenticar
    try {
        const pool = getPool();
        const [result] = await pool.query(`
            UPDATE atendimentos
            SET nomeCompleto = ?, cpf = ?, telefone = ?,
                tecnicoResponsavel = ?, status = ?, prioridade = ?,
                observacoes = ?
            WHERE id = ?
        `, [
            req.body.nomeCompleto,
            req.body.cpf,
            req.body.telefone,
            req.body.tecnicoResponsavel,
            req.body.status,
            req.body.prioridade,
            JSON.stringify(req.body), // Atualiza JSON completo
            req.params.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        res.json({ success: true, message: 'Atendimento atualizado' });
    } catch (error) {
        console.error('❌ Erro ao atualizar:', error);
        res.status(500).json({ error: 'Erro ao atualizar atendimento' });
    }
});

console.log('✅ Rotas de atendimentos (MySQL) carregadas');

module.exports = router;
