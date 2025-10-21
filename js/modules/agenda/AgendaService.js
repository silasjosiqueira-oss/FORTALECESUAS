/**
 * AgendaService - Gerencia todas as operações relacionadas à agenda
 */
class AgendaService {
    constructor() {
        this.eventos = this.carregarEventos();
        this.agendamentos = this.carregarAgendamentos();
        this.atividades = this.carregarAtividades();
        this.eventosSelecionados = new Set();
        this.filtros = {
            dataInicio: null,
            dataFim: null,
            profissional: '',
            status: '',
            tipo: ''
        };
    }

    /**
     * Carrega eventos do localStorage ou retorna dados de exemplo
     */
    carregarEventos() {
        const eventosStorage = localStorage.getItem('agenda_eventos');
        if (eventosStorage) {
            return JSON.parse(eventosStorage);
        }

        // Dados de exemplo
        return [
            {
                id: 1,
                tipo: 'agendamento',
                titulo: 'Atendimento - Ana Costa',
                descricao: 'Atendimento psicológico - Segunda sessão',
                data: '2025-08-28',
                horario: '14:00',
                duracao: 60,
                profissional: 'Ana Silva',
                participantes: 'Ana Costa',
                local: 'Sala de Atendimento 1',
                status: 'confirmado'
            },
            {
                id: 2,
                tipo: 'atividade',
                titulo: 'Oficina de Artesanato',
                descricao: 'Confecção de peças artesanais com materiais reciclados',
                data: '2025-08-29',
                horario: '14:00',
                duracao: 120,
                profissional: 'Ana Silva',
                participantes: '12 participantes',
                local: 'Sala de Atividades',
                status: 'ativo'
            },
            {
                id: 3,
                tipo: 'reuniao',
                titulo: 'Reunião da Rede SUAS',
                descricao: 'Reunião mensal de alinhamento da rede de proteção',
                data: '2025-08-30',
                horario: '16:00',
                duracao: 90,
                profissional: 'Carlos Santos',
                participantes: 'CRAS, CREAS, Conselho Tutelar',
                local: 'Auditório',
                status: 'agendado'
            }
        ];
    }

    /**
     * Carrega agendamentos específicos
     */
    carregarAgendamentos() {
        const agendamentosStorage = localStorage.getItem('agenda_agendamentos');
        if (agendamentosStorage) {
            return JSON.parse(agendamentosStorage);
        }

        return [
            {
                id: 1,
                usuario: 'Ana Costa',
                servico: 'Atendimento Psicológico',
                profissional: 'Ana Silva',
                data: '2025-08-28',
                horario: '14:00',
                status: 'confirmado',
                observacoes: 'Segunda sessão de acompanhamento'
            },
            {
                id: 2,
                usuario: 'Carlos Mendes',
                servico: 'Orientação Social',
                profissional: 'Carlos Santos',
                data: '2025-08-30',
                horario: '10:30',
                status: 'agendado',
                observacoes: 'Primeira consulta'
            }
        ];
    }

    /**
     * Carrega atividades coletivas
     */
    carregarAtividades() {
        const atividadesStorage = localStorage.getItem('agenda_atividades');
        if (atividadesStorage) {
            return JSON.parse(atividadesStorage);
        }

        return [
            {
                id: 1,
                nome: 'Oficina de Artesanato',
                descricao: 'Confecção de peças artesanais com materiais reciclados',
                diaHorario: 'Quintas, 14:00-16:00',
                participantes: 12,
                responsavel: 'Ana Silva',
                status: 'ativo'
            },
            {
                id: 2,
                nome: 'Grupo de Idosos',
                descricao: 'Atividade física e roda de conversa',
                diaHorario: 'Quartas, 09:00-11:00',
                participantes: 15,
                responsavel: 'Carlos Santos',
                status: 'ativo'
            },
            {
                id: 3,
                nome: 'Grupo PAIF',
                descricao: 'Serviço de Proteção e Atendimento Integral à Família',
                diaHorario: 'Quintas, 09:00-11:00',
                participantes: 10,
                responsavel: 'Carlos Santos',
                status: 'ativo'
            }
        ];
    }

    /**
     * Salva dados no localStorage
     */
    salvarDados() {
        localStorage.setItem('agenda_eventos', JSON.stringify(this.eventos));
        localStorage.setItem('agenda_agendamentos', JSON.stringify(this.agendamentos));
        localStorage.setItem('agenda_atividades', JSON.stringify(this.atividades));
    }

    /**
     * Adiciona novo evento
     */
    adicionarEvento(dadosEvento) {
        try {
            const novoEvento = {
                id: Date.now(),
                ...dadosEvento,
                dataCriacao: new Date().toISOString()
            };

            this.eventos.push(novoEvento);
            this.salvarDados();

            return { sucesso: true, evento: novoEvento };
        } catch (error) {
            console.error('Erro ao adicionar evento:', error);
            return { sucesso: false, erro: 'Erro ao adicionar evento' };
        }
    }

    /**
     * Atualiza evento existente
     */
    atualizarEvento(id, dadosAtualizados) {
        try {
            const indice = this.eventos.findIndex(evento => evento.id === id);
            if (indice === -1) {
                return { sucesso: false, erro: 'Evento não encontrado' };
            }

            this.eventos[indice] = {
                ...this.eventos[indice],
                ...dadosAtualizados,
                dataAtualizacao: new Date().toISOString()
            };

            this.salvarDados();
            return { sucesso: true, evento: this.eventos[indice] };
        } catch (error) {
            console.error('Erro ao atualizar evento:', error);
            return { sucesso: false, erro: 'Erro ao atualizar evento' };
        }
    }

    /**
     * Remove evento
     */
    removerEvento(id) {
        try {
            const indice = this.eventos.findIndex(evento => evento.id === id);
            if (indice === -1) {
                return { sucesso: false, erro: 'Evento não encontrado' };
            }

            const eventoRemovido = this.eventos.splice(indice, 1)[0];
            this.salvarDados();

            return { sucesso: true, evento: eventoRemovido };
        } catch (error) {
            console.error('Erro ao remover evento:', error);
            return { sucesso: false, erro: 'Erro ao remover evento' };
        }
    }

    /**
     * Busca eventos por data
     */
    buscarEventosPorData(data) {
        return this.eventos.filter(evento => evento.data === data);
    }

    /**
     * Busca eventos por período
     */
    buscarEventosPorPeriodo(dataInicio, dataFim) {
        return this.eventos.filter(evento => {
            return evento.data >= dataInicio && evento.data <= dataFim;
        });
    }

    /**
     * Busca próximos eventos
     */
    buscarProximosEventos(limite = 5) {
        const hoje = new Date().toISOString().split('T')[0];

        return this.eventos
            .filter(evento => evento.data >= hoje)
            .sort((a, b) => {
                if (a.data !== b.data) {
                    return new Date(a.data) - new Date(b.data);
                }
                return a.horario.localeCompare(b.horario);
            })
            .slice(0, limite);
    }

    /**
     * Aplica filtros aos eventos
     */
    filtrarEventos(filtros = {}) {
        let eventosFiltrados = [...this.eventos];

        if (filtros.dataInicio) {
            eventosFiltrados = eventosFiltrados.filter(
                evento => evento.data >= filtros.dataInicio
            );
        }

        if (filtros.dataFim) {
            eventosFiltrados = eventosFiltrados.filter(
                evento => evento.data <= filtros.dataFim
            );
        }

        if (filtros.profissional) {
            eventosFiltrados = eventosFiltrados.filter(
                evento => evento.profissional.includes(filtros.profissional)
            );
        }

        if (filtros.status) {
            eventosFiltrados = eventosFiltrados.filter(
                evento => evento.status === filtros.status
            );
        }

        if (filtros.tipo) {
            eventosFiltrados = eventosFiltrados.filter(
                evento => evento.tipo === filtros.tipo
            );
        }

        return eventosFiltrados;
    }

    /**
     * Gera dados do calendário para um mês específico
     */
    gerarCalendarioMes(ano, mes) {
        const primeiroDia = new Date(ano, mes - 1, 1);
        const ultimoDia = new Date(ano, mes, 0);
        const diasMes = ultimoDia.getDate();

        // Dias da semana que começam antes do primeiro dia do mês
        const diasAnteriores = primeiroDia.getDay();

        const calendario = [];
        const hoje = new Date().toISOString().split('T')[0];

        // Adiciona dias do mês anterior
        const ultimoMesAnterior = new Date(ano, mes - 1, 0).getDate();
        for (let i = diasAnteriores - 1; i >= 0; i--) {
            calendario.push({
                dia: ultimoMesAnterior - i,
                data: new Date(ano, mes - 2, ultimoMesAnterior - i).toISOString().split('T')[0],
                outroMes: true,
                hoje: false,
                eventos: []
            });
        }

        // Adiciona dias do mês atual
        for (let dia = 1; dia <= diasMes; dia++) {
            const data = new Date(ano, mes - 1, dia).toISOString().split('T')[0];
            const eventosData = this.buscarEventosPorData(data);

            calendario.push({
                dia,
                data,
                outroMes: false,
                hoje: data === hoje,
                eventos: eventosData
            });
        }

        // Completa com dias do próximo mês se necessário
        const totalCelulas = 42; // 6 semanas x 7 dias
        const diasRestantes = totalCelulas - calendario.length;

        for (let dia = 1; dia <= diasRestantes; dia++) {
            calendario.push({
                dia,
                data: new Date(ano, mes, dia).toISOString().split('T')[0],
                outroMes: true,
                hoje: false,
                eventos: []
            });
        }

        return calendario;
    }

    /**
     * Valida dados do evento
     */
    validarEvento(dados) {
        const erros = [];

        if (!dados.titulo || dados.titulo.trim().length === 0) {
            erros.push('Título é obrigatório');
        }

        if (!dados.data) {
            erros.push('Data é obrigatória');
        }

        if (!dados.horario) {
            erros.push('Horário é obrigatório');
        }

        if (!dados.tipo) {
            erros.push('Tipo do evento é obrigatório');
        }

        if (dados.duracao && (dados.duracao < 1 || dados.duracao > 480)) {
            erros.push('Duração deve ser entre 1 e 480 minutos');
        }

        // Validação de data no passado
        const dataEvento = new Date(dados.data);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (dataEvento < hoje) {
            erros.push('Não é possível criar eventos no passado');
        }

        return {
            valido: erros.length === 0,
            erros
        };
    }

    /**
     * Verifica conflitos de horário
     */
    verificarConflitos(dados, excluirId = null) {
        const conflitos = this.eventos.filter(evento => {
            if (excluirId && evento.id === excluirId) {
                return false;
            }

            if (evento.data !== dados.data) {
                return false;
            }

            if (evento.profissional !== dados.profissional) {
                return false;
            }

            // Converte horários para minutos para facilitar comparação
            const horarioEvento = this.horarioParaMinutos(evento.horario);
            const fimEvento = horarioEvento + (evento.duracao || 60);

            const horarioNovo = this.horarioParaMinutos(dados.horario);
            const fimNovo = horarioNovo + (dados.duracao || 60);

            // Verifica sobreposição
            return (horarioNovo < fimEvento && fimNovo > horarioEvento);
        });

        return conflitos;
    }

    /**
     * Converte horário HH:MM para minutos
     */
    horarioParaMinutos(horario) {
        const [horas, minutos] = horario.split(':').map(Number);
        return horas * 60 + minutos;
    }

    /**
     * Converte minutos para horário HH:MM
     */
    minutosParaHorario(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Formata data para exibição
     */
    formatarData(data, formato = 'dd/MM/yyyy') {
        const dataObj = new Date(data + 'T00:00:00');

        const dia = dataObj.getDate().toString().padStart(2, '0');
        const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
        const ano = dataObj.getFullYear();

        switch (formato) {
            case 'dd/MM/yyyy':
                return `${dia}/${mes}/${ano}`;
            case 'dd/MM':
                return `${dia}/${mes}`;
            case 'yyyy-MM-dd':
                return `${ano}-${mes}-${dia}`;
            default:
                return `${dia}/${mes}/${ano}`;
        }
    }

    /**
     * Estatísticas da agenda
     */
    obterEstatisticas() {
        const hoje = new Date().toISOString().split('T')[0];
        const proximaSemana = new Date();
        proximaSemana.setDate(proximaSemana.getDate() + 7);
        const dataProximaSemana = proximaSemana.toISOString().split('T')[0];

        const estatisticas = {
            totalEventos: this.eventos.length,
            eventosHoje: this.eventos.filter(e => e.data === hoje).length,
            eventosProximaSemana: this.eventos.filter(e => e.data >= hoje && e.data <= dataProximaSemana).length,
            eventosPorTipo: {},
            eventosPorStatus: {},
            eventosPorProfissional: {}
        };

        // Contagem por tipo
        this.eventos.forEach(evento => {
            estatisticas.eventosPorTipo[evento.tipo] =
                (estatisticas.eventosPorTipo[evento.tipo] || 0) + 1;

            estatisticas.eventosPorStatus[evento.status] =
                (estatisticas.eventosPorStatus[evento.status] || 0) + 1;

            estatisticas.eventosPorProfissional[evento.profissional] =
                (estatisticas.eventosPorProfissional[evento.profissional] || 0) + 1;
        });

        return estatisticas;
    }

    /**
     * Exporta dados da agenda
     */
    exportarDados(formato = 'json') {
        const dados = {
            eventos: this.eventos,
            agendamentos: this.agendamentos,
            atividades: this.atividades,
            dataExportacao: new Date().toISOString()
        };

        if (formato === 'json') {
            return JSON.stringify(dados, null, 2);
        }

        // Aqui poderia adicionar outros formatos como CSV
        return dados;
    }

    /**
     * Importa dados da agenda
     */
    importarDados(dados) {
        try {
            if (typeof dados === 'string') {
                dados = JSON.parse(dados);
            }

            if (dados.eventos) {
                this.eventos = dados.eventos;
            }
            if (dados.agendamentos) {
                this.agendamentos = dados.agendamentos;
            }
            if (dados.atividades) {
                this.atividades = dados.atividades;
            }

            this.salvarDados();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return { sucesso: false, erro: 'Erro ao importar dados' };
        }
    }
}

// Exporta a classe para uso em módulos
export default AgendaService;
