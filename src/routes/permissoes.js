// src/routes/permissoes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database').db;

// Matriz de permissões baseada na minuta
const PERMISSOES_MATRIZ = {
    'recepcionista': {
        abas: ['recepcao', 'informacao-remota'],
        campos_formulario: {
            // Dados básicos que recepção pode preencher
            'dados_basicos': ['nomeCompleto', 'cpf', 'rg', 'telefone', 'endereco', 'bairro', 'nis', 'cadUnico'],
            'motivo_atendimento': true,
            'formato_atendimento': true,
            'unidade': true,
            'data_hora': true
        },
        acoes: ['criar_recepcao', 'encaminhar_profissional', 'informacao_remota', 'visualizar_proprios'],
        restricoes: {
            'dados_sensiveis': false,
            'formulario_completo': false,
            'editar_atendimento': false,
            'visualizar_outros_profissionais': false
        }
    },

    'psicologo': {
        abas: ['recepcao', 'atendimentos-cadastrados', 'acompanhamentos', 'atividades-equipe'],
        campos_formulario: {
            'formulario_completo': true,
            'dados_psicologicos': true,
            'observacoes_saude': true,
            'acompanhamento': true
        },
        acoes: [
            'visualizar_atendimentos_psicologicos',
            'criar_atendimento_completo',
            'editar_atendimento_proprio',
            'visualizar_historico',
            'criar_acompanhamento',
            'compartilhar_com_profissional',
            'gerar_relatorio_individual'
        ],
        restricoes: {
            'atendimentos_outros_profissionais': 'somente_leitura',
            'beneficios': 'somente_leitura',
            'cadastro_unico': false,
            'excluir_atendimento': false
        }
    },

    'assistente_social': {
        abas: ['recepcao', 'atendimentos-cadastrados', 'demanda-rede', 'acompanhamentos', 'beneficios', 'atividades-equipe'],
        campos_formulario: {
            'formulario_completo': true,
            'composicao_familiar': true,
            'renda_remuneracao': true,
            'beneficios': true,
            'encaminhamentos': true,
            'acompanhamento_scfv': true
        },
        acoes: [
            'visualizar_todos_atendimentos_sociais',
            'criar_atendimento_completo',
            'editar_atendimento_proprio',
            'criar_demanda_rede',
            'criar_acompanhamento_scfv',
            'gestao_beneficios',
            'cadastro_unico',
            'gerar_relatorio_completo',
            'compartilhar_com_profissional'
        ],
        restricoes: {
            'atendimentos_psicologicos_completos': false,
            'excluir_atendimento_outros': false
        }
    },

    'coordenador_cras': {
        abas: ['todas'],
        campos_formulario: {
            'formulario_completo': true,
            'visualizar_tudo': true
        },
        acoes: [
            'visualizar_todos_atendimentos',
            'editar_qualquer_atendimento',
            'excluir_atendimento',
            'gestao_equipe',
            'relatorios_gerenciais',
            'estatisticas_completas',
            'gestao_atividades_equipe',
            'agenda_institucional'
        ],
        restricoes: {
            'configuracoes_sistema': false,
            'gestao_usuarios': false
        }
    },

    'secretaria_assistencia': {
        abas: ['recepcao', 'atendimentos-cadastrados', 'beneficios', 'cadastro-unico'],
        campos_formulario: {
            'dados_basicos': true,
            'cadastro_unico': true,
            'beneficios': true,
            'documentacao': true
        },
        acoes: [
            'cadastro_unico',
            'gestao_beneficios_eventuais',
            'impressao_documentos',
            'visualizar_atendimentos_gerais',
            'gerar_relatorios_administrativos'
        ],
        restricoes: {
            'atendimentos_tecnicos': 'somente_leitura',
            'dados_psicologicos': false,
            'acompanhamentos_scfv': false
        }
    },

    'administrador': {
        abas: ['todas'],
        campos_formulario: {
            'acesso_total': true
        },
        acoes: ['todas'],
        restricoes: {}
    }
};

// GET - Obter permissões de um usuário
router.get('/usuario/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const [usuarios] = await db.query(
            'SELECT u.*, n.codigo as nivel_codigo FROM usuarios u JOIN niveis_acesso n ON u.nivel_acesso_codigo = n.codigo WHERE u.id = ?',
            [userId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        const usuario = usuarios[0];
        const permissoes = PERMISSOES_MATRIZ[usuario.nivel_codigo] || PERMISSOES_MATRIZ['recepcionista'];

        res.json({
            sucesso: true,
            dados: {
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    nivel: usuario.nivel_codigo,
                    unidade: usuario.unidade
                },
                permissoes: permissoes
            }
        });

    } catch (error) {
        console.error('Erro ao buscar permissões:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar permissões do usuário'
        });
    }
});

// POST - Verificar permissão específica
router.post('/verificar', async (req, res) => {
    try {
        const { userId, acao, recurso } = req.body;

        const [usuarios] = await db.query(
            'SELECT u.*, n.codigo as nivel_codigo FROM usuarios u JOIN niveis_acesso n ON u.nivel_acesso_codigo = n.codigo WHERE u.id = ?',
            [userId]
        );

        if (usuarios.length === 0) {
            return res.json({
                sucesso: false,
                permitido: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        const usuario = usuarios[0];
        const permissoes = PERMISSOES_MATRIZ[usuario.nivel_codigo];

        const temPermissao = permissoes.acoes.includes(acao) || permissoes.acoes.includes('todas');

        res.json({
            sucesso: true,
            permitido: temPermissao,
            nivel: usuario.nivel_codigo
        });

    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        res.status(500).json({
            sucesso: false,
            permitido: false,
            mensagem: 'Erro ao verificar permissão'
        });
    }
});

// GET - Listar todas as permissões disponíveis
router.get('/matriz', (req, res) => {
    res.json({
        sucesso: true,
        dados: PERMISSOES_MATRIZ
    });
});

// GET - Filtrar atendimentos por permissão do usuário
router.get('/atendimentos-permitidos/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const [usuarios] = await db.query(
            'SELECT u.*, n.codigo as nivel_codigo FROM usuarios u JOIN niveis_acesso n ON u.nivel_acesso_codigo = n.codigo WHERE u.id = ?',
            [userId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        const usuario = usuarios[0];
        const permissoes = PERMISSOES_MATRIZ[usuario.nivel_codigo];

        let query = 'SELECT * FROM atendimentos WHERE 1=1';
        const params = [];

        if (usuario.nivel_codigo === 'recepcionista') {
            query += ' AND usuario_criacao_id = ?';
            params.push(userId);
        } else if (usuario.nivel_codigo === 'psicologo') {
            query += ' AND (tecnico_responsavel_id = ? OR tipo_atendimento LIKE "%psicológico%")';
            params.push(userId);
        } else if (usuario.nivel_codigo === 'assistente_social') {
            query += ' AND (tecnico_responsavel_id = ? OR tipo_atendimento NOT LIKE "%psicológico%")';
            params.push(userId);
        }

        const [atendimentos] = await db.query(query, params);

        res.json({
            sucesso: true,
            dados: atendimentos,
            permissoes: permissoes
        });

    } catch (error) {
        console.error('Erro ao buscar atendimentos permitidos:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar atendimentos'
        });
    }
});

module.exports = router;
module.exports.PERMISSOES_MATRIZ = PERMISSOES_MATRIZ;
