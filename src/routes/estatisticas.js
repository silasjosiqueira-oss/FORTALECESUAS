const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// GET - Estatísticas do Dashboard (usado pelo index.html)
router.get('/dashboard', async (req, res) => {
    try {
        const pool = getPool();

        // Atendimentos de hoje
        const [hoje] = await pool.query(`
            SELECT COUNT(*) as total
            FROM atendimentos
            WHERE DATE(data_Hora) = CURDATE()
        `);

        // Atendimentos aguardando
        const [aguardando] = await pool.query(`
            SELECT COUNT(*) as total
            FROM atendimentos
            WHERE status = 'aguardando'
        `);

        // Atendimentos do mês
        const [mes] = await pool.query(`
            SELECT COUNT(*) as total
            FROM atendimentos
            WHERE MONTH(data_Hora) = MONTH(CURDATE())
            AND YEAR(data_Hora) = YEAR(CURDATE())
        `);

        res.json({
            atendimentosHoje: hoje[0].total,
            aguardandoAtendimento: aguardando[0].total,
            atendimentosMes: mes[0].total,
            totalAtendimentos: mes[0].total,
            totalBeneficios: 342 // Fixo até criar tabela de benefícios
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        // Retornar valores padrão em caso de erro
        res.json({
            atendimentosHoje: 0,
            aguardandoAtendimento: 0,
            atendimentosMes: 0,
            totalAtendimentos: 0,
            totalBeneficios: 342
        });
    }
});

// GET - Estatísticas gerais
router.get('/', async (req, res) => {
    try {
        const pool = getPool();

        const [total] = await pool.query('SELECT COUNT(*) as total FROM atendimentos');
        const [mes] = await pool.query(`
            SELECT COUNT(*) as total FROM atendimentos
            WHERE MONTH(data_Hora) = MONTH(CURDATE()) AND YEAR(data_Hora) = YEAR(CURDATE())


        `);
        const [hoje] = await pool.query(`
            SELECT COUNT(*) as total FROM atendimentos WHERE DATE(data_Hora) = CURDATE()
        `);
        const [aguardando] = await pool.query(`
            SELECT COUNT(*) as total FROM atendimentos WHERE status = 'aguardando'
        `);
        const [emAndamento] = await pool.query(`
            SELECT COUNT(*) as total FROM atendimentos WHERE status = 'em-andamento'
        `);
        const [concluidos] = await pool.query(`
            SELECT COUNT(*) as total FROM atendimentos WHERE status = 'concluido'
        `);

        res.json({
            success: true,
            data: {
                totalAtendimentos: total[0].total,
                atendimentosMes: mes[0].total,
                atendimentosHoje: hoje[0].total,
                atendimentosAguardando: aguardando[0].total,
                atendimentosEmAndamento: emAndamento[0].total,
                atendimentosConcluidos: concluidos[0].total,
                totalUsuarios: total[0].total,
                totalProfissionais: 15,
                taxaConclusao: total[0].total > 0 ? Math.round((concluidos[0].total / total[0].total) * 100) : 0
            }
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Estatísticas por período
router.get('/periodo', async (req, res) => {
    try {
        const pool = getPool();
        const { dataInicio, dataFim } = req.query;

        const [atendimentos] = await pool.query(`
            SELECT COUNT(*) as total FROM atendimentos
            WHERE DATE(data_Hora) BETWEEN ? AND ?
        `, [dataInicio, dataFim]);

        const [tipos] = await pool.query(`
            SELECT tipoAtendimento, COUNT(*) as total
            FROM atendimentos
            WHERE DATE(data_Hora) BETWEEN ? AND ?
            GROUP BY tipoAtendimento
        `, [dataInicio, dataFim]);

        const tiposObj = {};
        tipos.forEach(t => {
            tiposObj[t.tipoAtendimento] = t.total;
        });

        res.json({
            success: true,
            data: {
                periodo: { dataInicio, dataFim },
                atendimentos: atendimentos[0].total,
                novosUsuarios: atendimentos[0].total,
                tiposAtendimento: tiposObj
            }
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manter outras rotas com valores fixos por enquanto
router.get('/profissional/:id', (req, res) => {
    res.json({
        success: true,
        data: {
            atendimentosRealizados: 45,
            atendimentosEmAndamento: 5,
            taxaConclusao: 92,
            mediaAtendimentosDia: 3
        }
    });
});

router.get('/atendimentos/tipos', (req, res) => {
    res.json({
        success: true,
        data: {
            'Acompanhamento Familiar': 65,
            'Atendimento Psicológico': 42,
            'Cadastro Único': 28,
            'Orientação Jurídica': 15
        }
    });
});

router.get('/beneficios', (req, res) => {
    res.json({
        success: true,
        data: {
            totalAtivos: 342,
            totalInativos: 58,
            aguardandoAnalise: 23,
            porTipo: {
                'Bolsa Família': 180,
                'BPC': 95,
                'Cesta Básica': 67
            }
        }
    });
});

router.get('/agenda', (req, res) => {
    res.json({
        success: true,
        data: {
            agendamentosHoje: 8,
            agendamentosProximos: 15,
            taxaComparecimento: 85,
            agendamentosPendentes: 5
        }
    });
});

module.exports = router;
// GET - Estatísticas do Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const pool = getPool();

        // Atendimentos de hoje
        const [hoje] = await pool.query(`
            SELECT COUNT(*) as total
            FROM atendimentos
            WHERE DATE(data_Hora) = CURDATE()
        `);

        // Atendimentos aguardando
        const [aguardando] = await pool.query(`
            SELECT COUNT(*) as total
            FROM atendimentos
            WHERE status = 'aguardando'
        `);

        // Atendimentos do mês
        const [mes] = await pool.query(`
            SELECT COUNT(*) as total
            FROM atendimentos
            WHERE MONTH(data_Hora) = MONTH(CURDATE())
            AND YEAR(data_Hora) = YEAR(CURDATE())
        `);

        // Benefícios ativos -
        const [beneficios] = await pool.query(`
            SELECT COUNT(*) as total
            FROM beneficios
            WHERE status = 'ativo'
        `);

        res.json({
            atendimentosHoje: hoje[0].total,
            aguardandoAtendimento: aguardando[0].total,
            atendimentosMes: mes[0].total,
            totalAtendimentos: mes[0].total,
            totalBeneficios: beneficios[0].total // AGORA É DINÂMICO
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.json({
            atendimentosHoje: 0,
            aguardandoAtendimento: 0,
            atendimentosMes: 0,
            totalAtendimentos: 0,
            totalBeneficios: 0
        });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const pool = getPool();

        const [hoje] = await pool.query(`SELECT COUNT(*) as total FROM atendimentos WHERE DATE(data_Hora) = CURDATE()`);
        const [aguardando] = await pool.query(`SELECT COUNT(*) as total FROM atendimentos WHERE status = 'aguardando'`);
        const [mes] = await pool.query(`SELECT COUNT(*) as total FROM atendimentos WHERE MONTH(data_Hora) = MONTH(CURDATE()) AND YEAR(data_Hora) = YEAR(CURDATE())`);
        const [beneficios] = await pool.query(`SELECT COUNT(*) as total FROM beneficios WHERE status = 'ativo'`);

        console.log('Benefícios encontrados:', beneficios[0].total);  // <-- ADICIONE ESTA LINHA

        res.json({
            atendimentosHoje: hoje[0].total,
            aguardandoAtendimento: aguardando[0].total,
            atendimentosMes: mes[0].total,
            totalAtendimentos: mes[0].total,
            totalBeneficios: beneficios[0].total
        });

    } catch (error) {
        console.error('ERRO capturado:', error.message);  // <-- E ESTA LINHA
        res.json({
            atendimentosHoje: 0,
            aguardandoAtendimento: 0,
            atendimentosMes: 0,
            totalAtendimentos: 0,
            totalBeneficios: 342
        });
    }
});
