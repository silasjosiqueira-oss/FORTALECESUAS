import { LayoutManager } from './modules/layout/LayoutManager.js';
import { AtendimentoService } from './modules/atendimento/AtendimentoService.js';

const layoutManager = new LayoutManager();

document.addEventListener('DOMContentLoaded', () => {
    layoutManager.init();

    carregarTotais();
    carregarAtendimentosRecentes();
    configurarMenuLateral();
    configurarBotoes();
});

// ===== Funções de Totais =====
async function carregarTotais() {
    try {
        if (typeof AtendimentoService.listarTotaisAtendimentos !== 'function') {
            console.error('Método listarTotaisAtendimentos não existe no AtendimentoService');
            safeSetTextContent('total-atendimentos', '0');
            safeSetTextContent('total-beneficios', '0');
            return;
        }

        const totalAtendimentos = await AtendimentoService.listarTotaisAtendimentos();
        const totalBeneficios = 50; // Valor padrão ou buscar de outro serviço

        safeSetTextContent('total-atendimentos', totalAtendimentos);
        safeSetTextContent('total-beneficios', totalBeneficios);
    } catch (error) {
        console.error('Erro ao carregar totais:', error);
        safeSetTextContent('total-atendimentos', '0');
        safeSetTextContent('total-beneficios', '0');
    }
}

// ===== Funções de Atendimentos =====
async function carregarAtendimentosRecentes() {
    try {
        const corpoTabela = document.getElementById('tbody-resultados');
        if (!corpoTabela) return;

        corpoTabela.innerHTML = '<tr><td colspan="6" class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando atendimentos...</td></tr>';

        const atendimentos = await AtendimentoService.listarRecentes();

        const badgeAtendimentos = document.getElementById('badge-atendimentos');
        if (badgeAtendimentos) badgeAtendimentos.textContent = atendimentos.length;

        renderizarTabela(atendimentos);
    } catch (error) {
        console.error('Erro ao carregar atendimentos recentes:', error);
        const corpoTabela = document.getElementById('tbody-resultados');
        if (corpoTabela) {
            corpoTabela.innerHTML = `<tr><td colspan="6" class="error-message"><i class="fas fa-exclamation-circle"></i> Erro ao carregar atendimentos: ${error.message}</td></tr>`;
        }
    }
}

function renderizarTabela(atendimentos) {
    const corpoTabela = document.getElementById('tbody-resultados');
    if (!corpoTabela) return;

    if (atendimentos.length === 0) {
        corpoTabela.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum atendimento encontrado.</td></tr>';
        return;
    }

    let html = '';
    atendimentos.forEach(atendimento => {
        let classeStatus = '', textoStatus = '';
        switch (atendimento.situacao) {
            case 'pendente': classeStatus = 'status-pendente'; textoStatus = 'Pendente'; break;
            case 'andamento': classeStatus = 'status-andamento'; textoStatus = 'Em Andamento'; break;
            case 'concluido': classeStatus = 'status-concluido'; textoStatus = 'Concluído'; break;
            default: classeStatus = 'status-pendente'; textoStatus = 'Pendente';
        }

        html += `
            <tr>
                <td>${atendimento.registro}</td>
                <td>${atendimento.cidadao}</td>
                <td>${atendimento.responsavel || '—'}</td>
                <td>${formatarData(atendimento.data)}</td>
                <td><span class="status ${classeStatus}">${textoStatus}</span></td>
                <td>
                    <button class="btn-action btn-visualizar" data-id="${atendimento.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn-action btn-editar" data-id="${atendimento.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-excluir" data-id="${atendimento.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    corpoTabela.innerHTML = html;
    adicionarEventListenersAcoes();
}

function adicionarEventListenersAcoes() {
    document.querySelectorAll('.btn-visualizar').forEach(btn => {
        btn.addEventListener('click', () => visualizarAtendimento(btn.dataset.id));
    });
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => editarAtendimento(btn.dataset.id));
    });
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', () => excluirAtendimento(btn.dataset.id));
    });
}

function formatarData(dataString) {
    try { return new Date(dataString).toLocaleDateString('pt-BR'); }
    catch (error) { console.error('Erro ao formatar data:', error); return dataString; }
}

// ===== Funções de Ação =====
async function excluirAtendimento(id) {
    if (confirm('Tem certeza que deseja excluir este atendimento?')) {
        try {
            await AtendimentoService.excluir(id);
            carregarAtendimentosRecentes();
        } catch (error) {
            console.error('Erro ao excluir atendimento:', error);
            alert('Não foi possível excluir o atendimento.');
        }
    }
}

function visualizarAtendimento(id) {
    window.location.href = `detalhes-atendimento.html?id=${id}`;
}

function editarAtendimento(id) {
    window.location.href = `editar-atendimento.html?id=${id}`;
}

async function pesquisarAtendimentos(filtros) {
    console.log('Pesquisando atendimentos com filtros:', filtros);
    alert('Funcionalidade de pesquisa será implementada em breve!');
}

function gerarRelatorio() {
    alert('Funcionalidade de relatório será implementada em breve!');
}

// ===== Funções Auxiliares =====
function safeSetTextContent(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value;
    else console.warn(`Elemento com ID ${elementId} não encontrado`);
}

// ===== Configurações de Menu Lateral =====
function configurarMenuLateral() {
    const linksMenu = document.querySelectorAll('.sidebar__nav a');

    linksMenu.forEach(link => {
        const href = link.getAttribute('href');

        // Destaca a página atual
        if (href && window.location.pathname.endsWith(href)) link.classList.add('active');

        // Clique navega para a página
        if (href && !href.startsWith('#')) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                window.location.href = href;
            });
        }
    });
}

// ===== Configuração de Botões =====
function configurarBotoes() {
    const novoAtendimentoBtn = document.getElementById('btn-novo-atendimento');
    if (novoAtendimentoBtn) novoAtendimentoBtn.addEventListener('click', () => window.location.href = 'atendimento.html');

    const exportarBtn = document.getElementById('btn-exportar');
    if (exportarBtn) exportarBtn.addEventListener('click', gerarRelatorio);

    const btnPesquisar = document.getElementById('btn-pesquisar');
    const btnLimpar = document.getElementById('btn-limpar');

    if (btnPesquisar) btnPesquisar.addEventListener('click', () => {
        const filtros = {
            nome: document.getElementById('pesq-nome').value,
            cpf: document.getElementById('pesq-cpf').value,
            status: document.getElementById('pesq-status').value,
            dataInicio: document.getElementById('pesq-data-inicio').value,
            dataFim: document.getElementById('pesq-data-fim').value
        };
        pesquisarAtendimentos(filtros);
    });

    if (btnLimpar) btnLimpar.addEventListener('click', () => {
        ['pesq-nome','pesq-cpf','pesq-status','pesq-data-inicio','pesq-data-fim'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        carregarAtendimentosRecentes();
    });
}

// Torna algumas funções globais
window.excluirAtendimento = excluirAtendimento;
window.gerarRelatorio = gerarRelatorio;
// Exemplo: listar movimentações
fetch("/api/beneficios/movimentacao")
  .then(res => res.json())
  .then(data => console.log(data));
// =============================
// Configuração Global
// =============================
const API_BASE = 'http://localhost:3000';

// =============================
// Classe DashboardManager
// =============================
class DashboardManager {
    constructor() {
        this.dados = {
            atendimentos: [],
            beneficios: [],
            eventos: [],
            agendamentos: []
        };
        this.init();
    }

    init() {
        this.carregarTotais();
        this.configurarEventListeners();
    }

    // =============================
    // Carregar Dados do Dashboard
    // =============================
    async carregarTotais() {
        try {
            const promises = [
                this.carregarAtendimentos(),
                this.carregarBeneficios(),
                this.carregarEventos(),
                this.carregarAgendamentos()
            ];

            await Promise.all(promises);

            this.atualizarTotaisInterface();
            this.atualizarGraficos();
            this.atualizarNotificacoes();

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.mostrarDadosExemplo();
        }
    }

    async carregarAtendimentos() {
        try {
            const response = await fetch(`${API_BASE}/atendimentos`);
            if (response.ok) {
                this.dados.atendimentos = await response.json();
            } else {
                throw new Error(`Erro ${response.status}`);
            }
        } catch (error) {
            console.error('Erro ao carregar atendimentos:', error);
            this.dados.atendimentos = this.getDadosExemplo('atendimentos');
        }
    }

    async carregarBeneficios() {
        try {
            const tipos = ['movimentacao', 'bolsa', 'eventuais', 'bpc'];
            const promisesBeneficios = tipos.map(tipo =>
                fetch(`${API_BASE}/beneficios/${tipo}`)
                    .then(res => res.ok ? res.json() : [])
                    .catch(() => [])
            );

            const resultados = await Promise.all(promisesBeneficios);
            this.dados.beneficios = resultados.flat();
        } catch (error) {
            console.error('Erro ao carregar benefícios:', error);
            this.dados.beneficios = this.getDadosExemplo('beneficios');
        }
    }

    async carregarEventos() {
        try {
            const response = await fetch(`${API_BASE}/eventos`);
            if (response.ok) {
                this.dados.eventos = await response.json();
            } else {
                throw new Error(`Erro ${response.status}`);
            }
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            this.dados.eventos = this.getDadosExemplo('eventos');
        }
    }

    async carregarAgendamentos() {
        try {
            const response = await fetch(`${API_BASE}/agendamentos`);
            if (response.ok) {
                this.dados.agendamentos = await response.json();
            } else {
                throw new Error(`Erro ${response.status}`);
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            this.dados.agendamentos = this.getDadosExemplo('agendamentos');
        }
    }

    // =============================
    // Atualizar Interface
    // =============================
    atualizarTotaisInterface() {
        this.safeSetTextContent('total-atendimentos', this.dados.atendimentos.length);
        this.safeSetTextContent('total-beneficios', this.dados.beneficios.length);
        this.safeSetTextContent('total-eventos', this.dados.eventos.length);
        this.safeSetTextContent('total-agendamentos', this.dados.agendamentos.length);

        this.atualizarEstatisticasDetalhadas();
    }

    atualizarEstatisticasDetalhadas() {
        const atendimentosAguardando = this.dados.atendimentos.filter(a => a.situacao === 'AGUARDANDO').length;
        const atendimentosAndamento = this.dados.atendimentos.filter(a => a.situacao === 'EM_ATENDIMENTO').length;
        const atendimentosConcluidos = this.dados.atendimentos.filter(a => a.situacao === 'CONCLUIDO').length;

        this.safeSetTextContent('atendimentos-aguardando', atendimentosAguardando);
        this.safeSetTextContent('atendimentos-andamento', atendimentosAndamento);
        this.safeSetTextContent('atendimentos-concluidos', atendimentosConcluidos);

        const agora = new Date();
        const eventosProximos = this.dados.eventos.filter(evento => {
            const dataEvento = new Date(`${evento.data}T${evento.hora}`);
            const diffDias = Math.ceil((dataEvento - agora) / (1000 * 60 * 60 * 24));
            return diffDias >= 0 && diffDias <= 7;
        });

        this.safeSetTextContent('eventos-proximos', eventosProximos.length);

        const hoje = new Date().toISOString().split('T')[0];
        const agendamentosHoje = this.dados.agendamentos.filter(a => a.data === hoje).length;
        this.safeSetTextContent('agendamentos-hoje', agendamentosHoje);
    }

    atualizarGraficos() {
        this.atualizarGraficoAtendimentos();
        this.atualizarGraficoBeneficios();
    }

    atualizarGraficoAtendimentos() {
        const canvas = document.getElementById('grafico-atendimentos');
        if (!canvas) return;

        const ultimosSeisMeses = this.getUltimosSeisMeses();
        const dadosGrafico = ultimosSeisMeses.map(mes => {
            return this.dados.atendimentos.filter(atendimento => {
                const dataAtendimento = new Date(atendimento.dataAtendimento || atendimento.dataRegistro);
                return dataAtendimento.getMonth() === mes.numeroMes &&
                       dataAtendimento.getFullYear() === mes.ano;
            }).length;
        });

        if (typeof Chart !== 'undefined') {
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: ultimosSeisMeses.map(m => m.nome),
                    datasets: [{
                        label: 'Atendimentos',
                        data: dadosGrafico,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    atualizarGraficoBeneficios() {
        const canvas = document.getElementById('grafico-beneficios');
        if (!canvas || typeof Chart === 'undefined') return;

        const tiposBeneficios = {};
        this.dados.beneficios.forEach(beneficio => {
            const tipo = beneficio.tipo || 'Outros';
            tiposBeneficios[tipo] = (tiposBeneficios[tipo] || 0) + 1;
        });

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(tiposBeneficios),
                datasets: [{
                    data: Object.values(tiposBeneficios),
                    backgroundColor: [
                        '#2563eb',
                        '#16a34a',
                        '#d97706',
                        '#dc2626',
                        '#7c3aed'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    atualizarNotificacoes() {
        const containerNotificacoes = document.getElementById('notificacoes-lista');
        if (!containerNotificacoes) return;

        const notificacoes = this.gerarNotificacoes();

        containerNotificacoes.innerHTML = notificacoes.map(notif => `
            <div class="notificacao-item ${notif.tipo}">
                <div class="notificacao-icone">
                    <i class="fas fa-${notif.icone}"></i>
                </div>
                <div class="notificacao-conteudo">
                    <div class="notificacao-titulo">${notif.titulo}</div>
                    <div class="notificacao-descricao">${notif.descricao}</div>
                    <div class="notificacao-tempo">${notif.tempo}</div>
                </div>
            </div>
        `).join('');
    }

    gerarNotificacoes() {
        const notificacoes = [];
        const agora = new Date();

        this.dados.eventos.forEach(evento => {
            const dataEvento = new Date(`${evento.data}T${evento.hora}`);
            const diffHoras = Math.ceil((dataEvento - agora) / (1000 * 60 * 60));

            if (diffHoras > 0 && diffHoras <= 24) {
                notificacoes.push({
                    tipo: 'info',
                    icone: 'calendar',
                    titulo: 'Evento Próximo',
                    descricao: `${evento.titulo} em ${diffHoras}h`,
                    tempo: 'há poucos minutos'
                });
            }
        });

        const aguardando = this.dados.atendimentos.filter(a => a.situacao === 'AGUARDANDO').length;
        if (aguardando > 0) {
            notificacoes.push({
                tipo: 'warning',
                icone: 'clock',
                titulo: 'Atendimentos Pendentes',
                descricao: `${aguardando} atendimento(s) aguardando`,
                tempo: 'há 5 minutos'
            });
        }

        const hoje = new Date().toISOString().split('T')[0];
        const agendamentosHoje = this.dados.agendamentos.filter(a => a.data === hoje);
        if (agendamentosHoje.length > 0) {
            notificacoes.push({
                tipo: 'success',
                icone: 'check-circle',
                titulo: 'Agendamentos Hoje',
                descricao: `${agendamentosHoje.length} agendamento(s) para hoje`,
                tempo: 'há 10 minutos'
            });
        }

        return notificacoes.slice(0, 5);
    }

    // =============================
    // Event Listeners
    // =============================
    configurarEventListeners() {
        const btnAtualizar = document.getElementById('btn-atualizar-dashboard');
        if (btnAtualizar) {
            btnAtualizar.addEventListener('click', () => {
                this.carregarTotais();
                this.mostrarMensagem('Dados atualizados!', 'success');
            });
        }

        this.configurarNavegacaoRapida();
    }

    configurarNavegacaoRapida() {
        const botoes = {
            'btn-novo-atendimento': '/atendimento.html',
            'btn-ver-agenda': '/agenda.html',
            'btn-ver-beneficios': '/beneficios.html',
            'btn-ver-relatorios': '/relatorios.html'
        };

        Object.keys(botoes).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    window.location.href = botoes[btnId];
                });
            }
        });
    }

    // =============================
    // Funções Auxiliares
    // =============================
    safeSetTextContent(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`Elemento com ID ${elementId} não encontrado`);
        }
    }

    mostrarMensagem(mensagem, tipo = 'info') {
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao-temp ${tipo}`;
        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 0.375rem;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 300px;
        `;

        const cores = {
            success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
            error: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
            warning: { bg: '#fffbeb', color: '#d97706', border: '#fed7aa' },
            info: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' }
        };

        const cor = cores[tipo] || cores.info;
        notificacao.style.backgroundColor = cor.bg;
        notificacao.style.color = cor.color;
        notificacao.style.border = `1px solid ${cor.border}`;

        notificacao.innerHTML = `
            <i class="fas fa-${this.getIconeNotificacao(tipo)}"></i>
            <span>${mensagem}</span>
        `;

        document.body.appendChild(notificacao);

        setTimeout(() => {
            notificacao.remove();
        }, 3000);
    }

    getIconeNotificacao(tipo) {
        const icones = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icones[tipo] || 'info-circle';
    }

    getUltimosSeisMeses() {
        const meses = [];
        const agora = new Date();

        for (let i = 5; i >= 0; i--) {
            const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
            meses.push({
                nome: data.toLocaleDateString('pt-BR', { month: 'short' }),
                numeroMes: data.getMonth(),
                ano: data.getFullYear()
            });
        }

        return meses;
    }

    mostrarDadosExemplo() {
        console.log('Usando dados de exemplo - API não disponível');

        this.dados = {
            atendimentos: [
                { id: 1, situacao: 'AGUARDANDO', dataRegistro: '2025-09-01' },
                { id: 2, situacao: 'EM_ATENDIMENTO', dataRegistro: '2025-09-02' },
                { id: 3, situacao: 'CONCLUIDO', dataRegistro: '2025-09-03' }
            ],
            beneficios: [
                { id: 1, tipo: 'Auxílio Brasil' },
                { id: 2, tipo: 'BPC' },
                { id: 3, tipo: 'Benefício Eventual' }
            ],
            eventos: [
                { id: 1, titulo: 'Reunião', data: '2025-09-10', hora: '14:00' },
                { id: 2, titulo: 'Oficina', data: '2025-09-11', hora: '09:00' }
            ],
            agendamentos: [
                { id: 1, usuario: 'João Silva', data: '2025-09-05' },
                { id: 2, usuario: 'Maria Santos', data: '2025-09-06' }
            ]
        };

        this.atualizarTotaisInterface();
        this.mostrarMensagem('Usando dados de exemplo - verifique a conexão com a API', 'warning');
    }

    getDadosExemplo(tipo) {
        const exemplos = {
            atendimentos: [
                { id: 1, situacao: 'AGUARDANDO', nomeCidadao: 'João Silva', dataRegistro: '2025-09-01' },
                { id: 2, situacao: 'EM_ATENDIMENTO', nomeCidadao: 'Maria Santos', dataRegistro: '2025-09-02' }
            ],
            beneficios: [
                { id: 1, tipo: 'Auxílio Brasil', beneficiario: 'Ana Costa' },
                { id: 2, tipo: 'BPC', beneficiario: 'Carlos Lima' }
            ],
            eventos: [
                { id: 1, titulo: 'Reunião Equipe', data: '2025-09-10', hora: '14:00' },
                { id: 2, titulo: 'Oficina Artesanato', data: '2025-09-11', hora: '09:00' }
            ],
            agendamentos: [
                { id: 1, usuario: 'Pedro Oliveira', servico: 'Consulta Social', data: '2025-09-05' }
            ]
        };

        return exemplos[tipo] || [];
    }
}

// =============================
// Inicialização
// =============================
let dashboardManager;

document.addEventListener('DOMContentLoaded', function() {
    dashboardManager = new DashboardManager();

    setInterval(() => {
        if (dashboardManager) {
            dashboardManager.carregarTotais();
        }
    }, 5 * 60 * 1000);
});

// =============================
// Funções Globais
// =============================
function carregarTotais() {
    if (dashboardManager) {
        dashboardManager.carregarTotais();
    }
}

function atualizarDashboard() {
    if (dashboardManager) {
        dashboardManager.carregarTotais();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardManager };
}
