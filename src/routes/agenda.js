const express = require('express');
const router = express.Router();

// ==============================================
// SIMULAÇÃO DE BANCO DE DADOS EM MEMÓRIA
// ==============================================
let eventos = [
    {
        id: 1,
        tipo: "agendamento",
        titulo: "Atendimento - Ana Costa",
        descricao: "Atendimento psicológico - Segunda sessão",
        data: "2025-10-05",
        hora: "14:00",
        duracao: 60,
        participantes: ["Ana Silva"],
        local: "CRAS Centro",
        status: "confirmado"
    },
    {
        id: 2,
        tipo: "reuniao",
        titulo: "Reunião da Rede SUAS",
        descricao: "Reunião mensal de alinhamento",
        data: "2025-10-06",
        hora: "16:00",
        duracao: 120,
        participantes: ["CRAS", "CREAS", "Conselho Tutelar"],
        local: "Sala de Reuniões",
        status: "agendado"
    }
];

let agendamentos = [
    {
        id: 1,
        usuario: "Ana Costa",
        servico: "Atendimento Psicológico",
        data: "2025-10-05",
        hora: "14:00",
        profissional: "Ana Silva",
        status: "confirmado",
        telefone: "(11) 98765-4321",
        observacoes: "Segunda sessão"
    },
    {
        id: 2,
        usuario: "Carlos Mendes",
        servico: "Orientação Social",
        data: "2025-10-08",
        hora: "10:30",
        profissional: "Carlos Santos",
        status: "agendado",
        telefone: "(11) 91234-5678",
        observacoes: ""
    }
];

let atividades = [
    {
        id: 1,
        atividade: "Oficina de Artesanato",
        descricao: "Confecção de peças artesanais com materiais reciclados",
        dia: "Quintas",
        horario: "14:00-16:00",
        participantes: 12,
        responsavel: "Ana Silva",
        status: "ativo"
    },
    {
        id: 2,
        atividade: "Grupo de Idosos",
        descricao: "Atividade física e roda de conversa",
        dia: "Quartas",
        horario: "09:00-11:00",
        participantes: 15,
        responsavel: "Carlos Santos",
        status: "ativo"
    },
    {
        id: 3,
        atividade: "Grupo PAIF",
        descricao: "Serviço de Proteção e Atendimento Integral à Família",
        dia: "Quintas",
        horario: "09:00-11:00",
        participantes: 10,
        responsavel: "Carlos Santos",
        status: "ativo"
    }
];

let institucional = [
    {
        id: 1,
        titulo: "Reunião com Conselho Tutelar",
        descricao: "Reunião de alinhamento de casos e fluxos de atendimento",
        data: "2025-10-08",
        hora: "14:00",
        participantes: ["Equipe CRAS", "Conselho Tutelar"],
        local: "CRAS Centro",
        status: "agendado"
    },
    {
        id: 2,
        titulo: "Reunião da Rede SUAS",
        descricao: "Reunião mensal de alinhamento da rede de proteção",
        data: "2025-10-15",
        hora: "16:00",
        participantes: ["CRAS", "CREAS", "Conselho Tutelar"],
        local: "Secretaria de Assistência Social",
        status: "agendado"
    },
    {
        id: 3,
        titulo: "Planejamento Mensal",
        descricao: "Reunião de planejamento das atividades do próximo mês",
        data: "2025-10-20",
        hora: "10:00",
        participantes: ["Equipe CRAS"],
        local: "CRAS Centro",
        status: "agendado"
    }
];

let proximoIdEvento = 3;
let proximoIdAgendamento = 3;
let proximoIdAtividade = 4;
let proximoIdInstitucional = 4;

// ==============================================
// ROTAS DE EVENTOS
// ==============================================

// GET - Listar todos os eventos
router.get('/eventos', (req, res) => {
    res.json(eventos);
});

// GET - Buscar evento por ID
router.get('/eventos/:id', (req, res) => {
    const evento = eventos.find(e => e.id === parseInt(req.params.id));
    if (!evento) {
        return res.status(404).json({ erro: 'Evento não encontrado' });
    }
    res.json(evento);
});

// POST - Criar novo evento
router.post('/eventos', (req, res) => {
    const novoEvento = {
        id: proximoIdEvento++,
        ...req.body,
        dataCriacao: new Date()
    };
    eventos.push(novoEvento);
    res.status(201).json(novoEvento);
});

// PUT - Atualizar evento
router.put('/eventos/:id', (req, res) => {
    const index = eventos.findIndex(e => e.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Evento não encontrado' });
    }
    eventos[index] = { ...eventos[index], ...req.body, dataAtualizacao: new Date() };
    res.json(eventos[index]);
});

// DELETE - Excluir evento
router.delete('/eventos/:id', (req, res) => {
    const index = eventos.findIndex(e => e.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Evento não encontrado' });
    }
    const eventoRemovido = eventos.splice(index, 1)[0];
    res.json({ mensagem: 'Evento excluído com sucesso', evento: eventoRemovido });
});

// ==============================================
// ROTAS DE AGENDAMENTOS
// ==============================================

// GET - Listar todos os agendamentos
router.get('/agendamentos', (req, res) => {
    res.json(agendamentos);
});

// GET - Buscar agendamento por ID
router.get('/agendamentos/:id', (req, res) => {
    const agendamento = agendamentos.find(a => a.id === parseInt(req.params.id));
    if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado' });
    }
    res.json(agendamento);
});

// POST - Criar novo agendamento
router.post('/agendamentos', (req, res) => {
    const novoAgendamento = {
        id: proximoIdAgendamento++,
        ...req.body,
        dataCriacao: new Date()
    };
    agendamentos.push(novoAgendamento);
    res.status(201).json(novoAgendamento);
});

// PUT - Atualizar agendamento
router.put('/agendamentos/:id', (req, res) => {
    const index = agendamentos.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Agendamento não encontrado' });
    }
    agendamentos[index] = { ...agendamentos[index], ...req.body, dataAtualizacao: new Date() };
    res.json(agendamentos[index]);
});

// DELETE - Excluir agendamento
router.delete('/agendamentos/:id', (req, res) => {
    const index = agendamentos.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Agendamento não encontrado' });
    }
    const agendamentoRemovido = agendamentos.splice(index, 1)[0];
    res.json({ mensagem: 'Agendamento excluído com sucesso', agendamento: agendamentoRemovido });
});

// ==============================================
// ROTAS DE ATIVIDADES
// ==============================================

// GET - Listar todas as atividades
router.get('/atividades', (req, res) => {
    res.json(atividades);
});

// GET - Buscar atividade por ID
router.get('/atividades/:id', (req, res) => {
    const atividade = atividades.find(a => a.id === parseInt(req.params.id));
    if (!atividade) {
        return res.status(404).json({ erro: 'Atividade não encontrada' });
    }
    res.json(atividade);
});

// POST - Criar nova atividade
router.post('/atividades', (req, res) => {
    const novaAtividade = {
        id: proximoIdAtividade++,
        ...req.body,
        dataCriacao: new Date()
    };
    atividades.push(novaAtividade);
    res.status(201).json(novaAtividade);
});

// PUT - Atualizar atividade
router.put('/atividades/:id', (req, res) => {
    const index = atividades.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Atividade não encontrada' });
    }
    atividades[index] = { ...atividades[index], ...req.body, dataAtualizacao: new Date() };
    res.json(atividades[index]);
});

// DELETE - Excluir atividade
router.delete('/atividades/:id', (req, res) => {
    const index = atividades.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Atividade não encontrada' });
    }
    const atividadeRemovida = atividades.splice(index, 1)[0];
    res.json({ mensagem: 'Atividade excluída com sucesso', atividade: atividadeRemovida });
});

// ==============================================
// ROTAS DE EVENTOS INSTITUCIONAIS
// ==============================================

// GET - Listar todos os eventos institucionais
router.get('/institucional', (req, res) => {
    res.json(institucional);
});

// GET - Buscar evento institucional por ID
router.get('/institucional/:id', (req, res) => {
    const evento = institucional.find(e => e.id === parseInt(req.params.id));
    if (!evento) {
        return res.status(404).json({ erro: 'Evento institucional não encontrado' });
    }
    res.json(evento);
});

// POST - Criar novo evento institucional
router.post('/institucional', (req, res) => {
    const novoEvento = {
        id: proximoIdInstitucional++,
        ...req.body,
        dataCriacao: new Date()
    };
    institucional.push(novoEvento);
    res.status(201).json(novoEvento);
});

// PUT - Atualizar evento institucional
router.put('/institucional/:id', (req, res) => {
    const index = institucional.findIndex(e => e.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Evento institucional não encontrado' });
    }
    institucional[index] = { ...institucional[index], ...req.body, dataAtualizacao: new Date() };
    res.json(institucional[index]);
});

// DELETE - Excluir evento institucional
router.delete('/institucional/:id', (req, res) => {
    const index = institucional.findIndex(e => e.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ erro: 'Evento institucional não encontrado' });
    }
    const eventoRemovido = institucional.splice(index, 1)[0];
    res.json({ mensagem: 'Evento institucional excluído com sucesso', evento: eventoRemovido });
});

// ==============================================
// ROTA PADRÃO (compatibilidade)
// ==============================================
router.get('/', (req, res) => {
    res.json({
        mensagem: 'API de Agenda - Sistema CRAS',
        endpoints: {
            eventos: '/eventos',
            agendamentos: '/agendamentos',
            atividades: '/atividades',
            institucional: '/institucional'
        }
    });
});

module.exports = router;
