const express = require('express');
const router = express.Router();

let profissionais = [
    { id: 1, nome: 'Ana Costa - Assistente Social (CRESS: 12345/RS)', cargo: 'Assistente Social', ativo: true },
    { id: 2, nome: 'Carlos Santos - Psicólogo (CRP: 07/12345)', cargo: 'Psicólogo', ativo: true },
    { id: 3, nome: 'Maria Silva - Recepcionista', cargo: 'Recepcionista', ativo: true },
    { id: 4, nome: 'João Oliveira - Coordenador CRAS', cargo: 'Coordenador', ativo: true },
    { id: 5, nome: 'Patricia Lima - Assistente Social (CRESS: 54321/RS)', cargo: 'Assistente Social', ativo: true }
];

// GET - Listar profissionais
router.get('/', (req, res) => {
    res.json(profissionais);
});

// GET - Buscar profissional específico
router.get('/:id', (req, res) => {
    const profissional = profissionais.find(p => p.id === parseInt(req.params.id));
    if (!profissional) {
        return res.status(404).json({ error: 'Profissional não encontrado' });
    }
    res.json(profissional);
});

// POST - Criar profissional
router.post('/', (req, res) => {
    const novo = { id: profissionais.length + 1, ...req.body, ativo: true };
    profissionais.push(novo);
    res.status(201).json({ success: true, data: novo });
});

module.exports = router;
