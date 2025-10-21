/* ===========================
   atendimento.app.js
   Script completo para o sistema de atendimentos
   =========================== */

// Configurações globais
const CONFIG = {
    API_BASE: '/api/atendimentos',
    PAGE_SIZE: 10,
    TIMEOUT: 30000
};

// Estado da aplicação
const STATE = {
    atendimentos: [],
    filteredAtendimentos: [],
    currentPage: 1,
    currentTab: 'recepcao',
    isLoading: false
};

// ===========================
// Funções Utilitárias
// ===========================

// Obter token de autenticação
function getAuthToken() {
    return localStorage.getItem('token') || '';
}

// Headers para requisições autenticadas
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
}

// Requisição genérica com tratamento de erro
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getHeaders(),
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
                return null;
            }
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// Formatar data/hora
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatar CPF
function formatCPF(cpf) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Limpar CPF
function cleanCPF(cpf) {
    return cpf ? cpf.replace(/\D/g, '') : '';
}

// ===========================
// Interface - Notificações
// ===========================

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = `
        animation: slideIn 0.3s ease;
        margin-bottom: 10px;
    `;

    const icon = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';

    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ===========================
// Interface - Loading
// ===========================

function showLoading(message = 'Carregando...') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;

    const messageEl = overlay.querySelector('#loading-message');
    if (messageEl) messageEl.textContent = message;

    overlay.style.display = 'flex';
    STATE.isLoading = true;
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
    STATE.isLoading = false;
}

// ===========================
// Interface - Tabs
// ===========================

function showTab(tabId) {
    // Desativar todas as tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Ativar tab selecionada
    const tabButton = Array.from(document.querySelectorAll('.tab-button')).find(btn =>
        btn.getAttribute('onclick')?.includes(tabId)
    );
    if (tabButton) tabButton.classList.add('active');

    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');

    STATE.currentTab = tabId;

    // Carregar dados específicos da tab
    if (tabId === 'recepcao') {
        carregarAtendimentosAguardando();
    } else if (tabId === 'atendimentos-cadastrados') {
        carregarTodosAtendimentos();
    }
}

function showSubTab(tabId) {
    document.querySelectorAll('.sub-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const subTabButton = Array.from(document.querySelectorAll('.sub-tab-button')).find(btn =>
        btn.getAttribute('onclick')?.includes(tabId)
    );
    if (subTabButton) subTabButton.classList.add('active');

    const subTabContent = document.getElementById(tabId);
    if (subTabContent) subTabContent.classList.add('active');
}

// ===========================
// Interface - Modals
// ===========================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===========================
// API - Atendimentos
// ===========================

async function carregarTodosAtendimentos() {
    try {
        showLoading('Carregando atendimentos...');
        const data = await apiRequest(CONFIG.API_BASE);

        if (data) {
            STATE.atendimentos = Array.isArray(data) ? data : [];
            STATE.filteredAtendimentos = STATE.atendimentos;
            renderAtendimentosTable();
            updateTotalRegistros();
        }
    } catch (error) {
        showNotification('Erro ao carregar atendimentos', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function carregarAtendimentosAguardando() {
    try {
        showLoading('Carregando fila de espera...');
        const data = await apiRequest(CONFIG.API_BASE);

        if (data) {
            const aguardando = data.filter(a =>
                a.status === 'aguardando' || !a.status
            );
            renderAtendimentosAguardando(aguardando);
        }
    } catch (error) {
        showNotification('Erro ao carregar fila de espera', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function buscarPorCPF(cpf) {
    try {
        const cpfLimpo = cleanCPF(cpf);
        if (!cpfLimpo) return null;

        showLoading('Buscando CPF...');
        const data = await apiRequest(`${CONFIG.API_BASE}/buscar-cpf/${cpfLimpo}`);

        if (data && data.encontrado) {
            return data.dados;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar CPF:', error);
        return null;
    } finally {
        hideLoading();
    }
}

async function criarAtendimento(dados) {
    try {
        showLoading('Salvando atendimento...');
        const result = await apiRequest(CONFIG.API_BASE, {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        if (result) {
            showNotification('Atendimento criado com sucesso!', 'success');
            closeModal('modalNovoAtendimento');
            carregarAtendimentosAguardando();
            return result;
        }
    } catch (error) {
        showNotification('Erro ao criar atendimento', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function atualizarAtendimento(id, dados) {
    try {
        showLoading('Atualizando atendimento...');
        const result = await apiRequest(`${CONFIG.API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });

        if (result) {
            showNotification('Atendimento atualizado!', 'success');
            carregarTodosAtendimentos();
            return result;
        }
    } catch (error) {
        showNotification('Erro ao atualizar atendimento', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function excluirAtendimento(id) {
    if (!confirm('Confirma a exclusão deste atendimento?')) return;

    try {
        showLoading('Excluindo atendimento...');
        await apiRequest(`${CONFIG.API_BASE}/${id}`, {
            method: 'DELETE'
        });

        showNotification('Atendimento excluído', 'success');
        carregarAtendimentosAguardando();
    } catch (error) {
        showNotification('Erro ao excluir atendimento', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// ===========================
// Renderização - Tabelas
// ===========================

function renderAtendimentosAguardando(atendimentos) {
    const tbody = document.getElementById('atendimentosAguardando');
    const totalEl = document.getElementById('totalAguardando');
    const badgeEl = document.getElementById('totalAguardandoBadge');

    if (!tbody) return;

    if (atendimentos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    Nenhum atendimento aguardando
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = atendimentos.map(atendimento => `
            <tr class="clickable" onclick="verDetalhesAtendimento(${atendimento.id})">
                <td>${atendimento.registro || '#' + atendimento.id}</td>
                <td>${formatDateTime(atendimento.dataHora)}</td>
                <td>${atendimento.nomeCompleto || '-'}</td>
                <td>${atendimento.motivoAtendimento || '-'}</td>
                <td>
                    <span class="status-badge ${getPrioridadeClass(atendimento.prioridade)}">
                        ${atendimento.prioridade || 'Normal'}
                    </span>
                </td>
                <td><span class="status-badge status-aguardando">Aguardando</span></td>
                <td onclick="event.stopPropagation()">
                    <button class="btn btn--success btn-xs" onclick="iniciarAtendimento(${atendimento.id})" title="Iniciar">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn--info btn-xs" onclick="verDetalhesAtendimento(${atendimento.id})" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn--danger btn-xs" onclick="excluirAtendimento(${atendimento.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    if (totalEl) totalEl.textContent = atendimentos.length;
    if (badgeEl) badgeEl.textContent = `${atendimentos.length} aguardando`;
}

function renderAtendimentosTable() {
    const tbody = document.getElementById('atendimentosTable');
    if (!tbody) return;

    const start = (STATE.currentPage - 1) * CONFIG.PAGE_SIZE;
    const end = start + CONFIG.PAGE_SIZE;
    const pageData = STATE.filteredAtendimentos.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    Nenhum registro encontrado
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageData.map(atendimento => `
            <tr>
                <td>${atendimento.registro || '#' + atendimento.id}</td>
                <td>${formatDateTime(atendimento.dataHora)}</td>
                <td>${atendimento.nomeCompleto || '-'}</td>
                <td>${atendimento.tecnicoResponsavel || '-'}</td>
                <td>${atendimento.tipoAtendimento || '-'}</td>
                <td>${atendimento.unidade || '-'}</td>
                <td><span class="status-badge ${getStatusClass(atendimento.status)}">${getStatusLabel(atendimento.status)}</span></td>
                <td>
                    <button class="btn btn--info btn-xs" onclick="verDetalhesAtendimento(${atendimento.id})" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn--warning btn-xs" onclick="editarAtendimento(${atendimento.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPaginacao();
}

function renderPaginacao() {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;

    const totalPages = Math.ceil(STATE.filteredAtendimentos.length / CONFIG.PAGE_SIZE);

    let html = '';

    // Botão anterior
    html += `<button ${STATE.currentPage === 1 ? 'disabled' : ''} onclick="mudarPagina(${STATE.currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= STATE.currentPage - 2 && i <= STATE.currentPage + 2)) {
            html += `<button class="${i === STATE.currentPage ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
        } else if (i === STATE.currentPage - 3 || i === STATE.currentPage + 3) {
            html += '<span>...</span>';
        }
    }

    // Botão próximo
    html += `<button ${STATE.currentPage === totalPages ? 'disabled' : ''} onclick="mudarPagina(${STATE.currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    paginationEl.innerHTML = html;
}

function mudarPagina(page) {
    const totalPages = Math.ceil(STATE.filteredAtendimentos.length / CONFIG.PAGE_SIZE);
    if (page < 1 || page > totalPages) return;

    STATE.currentPage = page;
    renderAtendimentosTable();
}

// ===========================
// Filtros e Busca
// ===========================

function buscarAtendimentos() {
    const nome = document.getElementById('nomeUsuario')?.value.toLowerCase() || '';
    const responsavel = document.getElementById('responsavelFamiliar')?.value.toLowerCase() || '';
    const dataInicial = document.getElementById('dataInicial')?.value || '';
    const dataFinal = document.getElementById('dataFinal')?.value || '';
    const tecnico = document.getElementById('tecnicoResponsavel')?.value || '';
    const status = document.getElementById('statusAtendimento')?.value || '';
    const unidade = document.getElementById('unidadeFiltro')?.value || '';

    STATE.filteredAtendimentos = STATE.atendimentos.filter(atendimento => {
        if (nome && !atendimento.nomeCompleto?.toLowerCase().includes(nome)) return false;
        if (responsavel && !atendimento.responsavelFamiliar?.toLowerCase().includes(responsavel)) return false;
        if (tecnico && atendimento.tecnicoResponsavel !== tecnico) return false;
        if (status && atendimento.status !== status) return false;
        if (unidade && atendimento.unidade !== unidade) return false;

        if (dataInicial) {
            const dataAtendimento = new Date(atendimento.dataHora);
            const dataInicio = new Date(dataInicial);
            if (dataAtendimento < dataInicio) return false;
        }

        if (dataFinal) {
            const dataAtendimento = new Date(atendimento.dataHora);
            const dataFim = new Date(dataFinal);
            dataFim.setHours(23, 59, 59);
            if (dataAtendimento > dataFim) return false;
        }

        return true;
    });

    STATE.currentPage = 1;
    renderAtendimentosTable();
    updateTotalRegistros();

    showNotification(`${STATE.filteredAtendimentos.length} registros encontrados`, 'info');
}

function limparBusca() {
    document.getElementById('searchForm').reset();
    STATE.filteredAtendimentos = STATE.atendimentos;
    STATE.currentPage = 1;
    renderAtendimentosTable();
    updateTotalRegistros();
}

function updateTotalRegistros() {
    const totalEl = document.getElementById('totalRegistros');
    if (totalEl) {
        totalEl.textContent = `Total: ${STATE.filteredAtendimentos.length} registros`;
    }
}

// ===========================
// Ações - Atendimentos
// ===========================

function abrirNovoAtendimento() {
    // Redirecionar para a página de novo atendimento
    window.location.href = '/pages/novo-atendimento.html';

    // Remover modal existente se houver
    const modalExistente = document.getElementById('modalNovoAtendimento');
    if (modalExistente) modalExistente.remove();

    // Adicionar novo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    openModal('modalNovoAtendimento');
}

async function salvarNovoAtendimento() {
    const nome = document.getElementById('novo-nome')?.value;

    if (!nome) {
        showNotification('Por favor, preencha o nome do usuário', 'warning');
        return;
    }

    const dados = {
        nomeCompleto: nome,
        cpf: cleanCPF(document.getElementById('novo-cpf')?.value),
        telefone: document.getElementById('novo-telefone')?.value,
        tecnicoResponsavel: document.getElementById('novo-tecnico')?.value,
        unidade: document.getElementById('novo-unidade')?.value,
        tipoAtendimento: document.getElementById('novo-tipo')?.value,
        motivoAtendimento: document.getElementById('novo-motivo')?.value,
        prioridade: document.getElementById('novo-prioridade')?.value,
        descricaoDemanda: document.getElementById('novo-descricao')?.value,
        status: 'aguardando'
    };

    await criarAtendimento(dados);
}

async function buscarDadosCPF(cpf) {
    if (!cpf) return;

    const dados = await buscarPorCPF(cpf);
    if (dados) {
        document.getElementById('novo-nome').value = dados.nomeCompleto || '';
        document.getElementById('novo-telefone').value = dados.telefone || '';
        showNotification('Dados preenchidos automaticamente', 'info');
    }
}

async function iniciarAtendimento(id) {
    const dados = { status: 'em-andamento' };
    await atualizarAtendimento(id, dados);
}

async function verDetalhesAtendimento(id) {
    try {
        showLoading('Carregando detalhes...');
        const atendimento = await apiRequest(`${CONFIG.API_BASE}/${id}`);

        if (atendimento) {
            mostrarModalDetalhes(atendimento);
        }
    } catch (error) {
        showNotification('Erro ao carregar detalhes', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function mostrarModalDetalhes(atendimento) {
    const modalHtml = `
        <div id="modalDetalhes" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Detalhes do Atendimento</h3>
                    <button class="btn-close" onclick="closeModal('modalDetalhes')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-grid-2">
                        <div>
                            <strong>Registro:</strong> ${atendimento.registro || '#' + atendimento.id}
                        </div>
                        <div>
                            <strong>Status:</strong>
                            <span class="status-badge ${getStatusClass(atendimento.status)}">
                                ${getStatusLabel(atendimento.status)}
                            </span>
                        </div>
                    </div>
                    <hr style="margin: 1rem 0;">
                    <div class="form-grid-2">
                        <div>
                            <strong>Nome:</strong> ${atendimento.nomeCompleto || '-'}
                        </div>
                        <div>
                            <strong>CPF:</strong> ${formatCPF(atendimento.cpf) || '-'}
                        </div>
                        <div>
                            <strong>Telefone:</strong> ${atendimento.telefone || '-'}
                        </div>
                        <div>
                            <strong>Data/Hora:</strong> ${formatDateTime(atendimento.dataHora)}
                        </div>
                    </div>
                    <hr style="margin: 1rem 0;">
                    <div class="form-grid-2">
                        <div>
                            <strong>Técnico:</strong> ${atendimento.tecnicoResponsavel || '-'}
                        </div>
                        <div>
                            <strong>Unidade:</strong> ${atendimento.unidade || '-'}
                        </div>
                        <div>
                            <strong>Tipo:</strong> ${atendimento.tipoAtendimento || '-'}
                        </div>
                        <div>
                            <strong>Prioridade:</strong> ${atendimento.prioridade || 'Normal'}
                        </div>
                    </div>
                    <hr style="margin: 1rem 0;">
                    <div>
                        <strong>Motivo:</strong><br>
                        ${atendimento.motivoAtendimento || '-'}
                    </div>
                    <div style="margin-top: 1rem;">
                        <strong>Descrição:</strong><br>
                        ${atendimento.descricaoDemanda || '-'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--secondary" onclick="closeModal('modalDetalhes')">Fechar</button>
                    <button class="btn btn--warning" onclick="editarAtendimento(${atendimento.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalExistente = document.getElementById('modalDetalhes');
    if (modalExistente) modalExistente.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    openModal('modalDetalhes');
}

async function editarAtendimento(id) {
    // Implementar edição
    showNotification('Função de edição em desenvolvimento', 'info');
}

// ===========================
// Helpers - Status e Classes
// ===========================

function getStatusClass(status) {
    const classes = {
        'aguardando': 'status-aguardando',
        'em-andamento': 'status-em-andamento',
        'concluido': 'status-concluido',
        'cancelado': 'status-cancelado',
        'agendado': 'status-agendado'
    };
    return classes[status] || 'status-info';
}

function getStatusLabel(status) {
    const labels = {
        'aguardando': 'Aguardando',
        'em-andamento': 'Em Andamento',
        'concluido': 'Concluído',
        'cancelado': 'Cancelado',
        'agendado': 'Agendado'
    };
    return labels[status] || status || 'Aguardando';
}

function getPrioridadeClass(prioridade) {
    const classes = {
        'alta': 'status-cancelado',
        'urgente': 'status-cancelado',
        'normal': 'status-info'
    };
    return classes[prioridade] || 'status-info';
}

// ===========================
// Funções auxiliares globais
// ===========================

// Tornar funções disponíveis globalmente para onclick do HTML
window.showTab = showTab;
window.showSubTab = showSubTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.abrirNovoAtendimento = abrirNovoAtendimento;
window.buscarAtendimentos = buscarAtendimentos;
window.limparBusca = limparBusca;
window.verDetalhesAtendimento = verDetalhesAtendimento;
window.editarAtendimento = editarAtendimento;
window.iniciarAtendimento = iniciarAtendimento;
window.excluirAtendimento = excluirAtendimento;
window.salvarNovoAtendimento = salvarNovoAtendimento;
window.buscarDadosCPF = buscarDadosCPF;
window.mudarPagina = mudarPagina;

// Funções stub para funcionalidades ainda não implementadas
window.filtrosAvancados = () => showNotification('Filtros avançados em desenvolvimento', 'info');
window.gerarRelatorio = () => showNotification('Geração de relatórios em desenvolvimento', 'info');
window.exportarDados = () => showNotification('Exportação de dados em desenvolvimento', 'info');
window.updateProfissionalInfo = () => console.log('Profissional atualizado');
window.salvarDemandaRede = () => showNotification('Função em desenvolvimento', 'info');
window.salvarInformacaoRemota = () => showNotification('Função em desenvolvimento', 'info');

// ===========================
// Inicialização
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Atendimentos iniciando...');

    // Verificar autenticação
    const token = getAuthToken();
    if (!token) {
        showNotification('Por favor, faça login para continuar', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        return;
    }

    // Carregar dados iniciais
    if (STATE.currentTab === 'recepcao') {
        carregarAtendimentosAguardando();
    }

    // Configurar intervalo para atualizar a cada 30 segundos
    setInterval(() => {
        if (!STATE.isLoading) {
            if (STATE.currentTab === 'recepcao') {
                carregarAtendimentosAguardando();
            }
        }
    }, 30000);

    console.log('✅ Sistema pronto!');
});
