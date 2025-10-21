const express = require('express');
const router = express.Router();

// Simulação de banco de dados em memória (substitua por banco real depois)
let estoque = [];
let proximoId = 1;

// GET - Listar todos os produtos do estoque
router.get('/', (req, res) => {
    res.json({
        sucesso: true,
        total: estoque.length,
        dados: estoque
    });
});

// GET - Buscar produto específico por ID
router.get('/:id', (req, res) => {
    const produto = estoque.find(p => p.id === parseInt(req.params.id));

    if (!produto) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Produto não encontrado'
        });
    }

    res.json({
        sucesso: true,
        dados: produto
    });
});

// POST - Adicionar novo produto ao estoque
router.post('/', (req, res) => {
    const { nome, quantidade, preco, categoria } = req.body;

    // Validação básica
    if (!nome || quantidade === undefined || preco === undefined) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Nome, quantidade e preço são obrigatórios'
        });
    }

    const novoProduto = {
        id: proximoId++,
        nome,
        quantidade: parseInt(quantidade),
        preco: parseFloat(preco),
        categoria: categoria || 'Sem categoria',
        dataCriacao: new Date()
    };

    estoque.push(novoProduto);

    res.status(201).json({
        sucesso: true,
        mensagem: 'Produto adicionado com sucesso',
        dados: novoProduto
    });
});

// PUT - Atualizar produto existente
router.put('/:id', (req, res) => {
    const indice = estoque.findIndex(p => p.id === parseInt(req.params.id));

    if (indice === -1) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Produto não encontrado'
        });
    }

    const { nome, quantidade, preco, categoria } = req.body;

    // Atualiza apenas os campos enviados
    if (nome) estoque[indice].nome = nome;
    if (quantidade !== undefined) estoque[indice].quantidade = parseInt(quantidade);
    if (preco !== undefined) estoque[indice].preco = parseFloat(preco);
    if (categoria) estoque[indice].categoria = categoria;
    estoque[indice].dataAtualizacao = new Date();

    res.json({
        sucesso: true,
        mensagem: 'Produto atualizado com sucesso',
        dados: estoque[indice]
    });
});

// DELETE - Remover produto do estoque
router.delete('/:id', (req, res) => {
    const indice = estoque.findIndex(p => p.id === parseInt(req.params.id));

    if (indice === -1) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Produto não encontrado'
        });
    }

    const produtoRemovido = estoque.splice(indice, 1)[0];

    res.json({
        sucesso: true,
        mensagem: 'Produto removido com sucesso',
        dados: produtoRemovido
    });
});

// PATCH - Atualizar quantidade do produto (entrada/saída)
router.patch('/:id/quantidade', (req, res) => {
    const produto = estoque.find(p => p.id === parseInt(req.params.id));

    if (!produto) {
        return res.status(404).json({
            sucesso: false,
            mensagem: 'Produto não encontrado'
        });
    }

    const { operacao, valor } = req.body;

    if (!operacao || valor === undefined) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Operação (adicionar/remover) e valor são obrigatórios'
        });
    }

    if (operacao === 'adicionar') {
        produto.quantidade += parseInt(valor);
    } else if (operacao === 'remover') {
        if (produto.quantidade < parseInt(valor)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Quantidade insuficiente em estoque'
            });
        }
        produto.quantidade -= parseInt(valor);
    } else {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Operação inválida. Use "adicionar" ou "remover"'
        });
    }

    produto.dataAtualizacao = new Date();

    res.json({
        sucesso: true,
        mensagem: `Quantidade ${operacao === 'adicionar' ? 'adicionada' : 'removida'} com sucesso`,
        dados: produto
    });
});

module.exports = router;
