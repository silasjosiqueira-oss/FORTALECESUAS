/* ===========================
   atendimento.app.js - VERSÃO COM DEBUG
   Sistema de Atendimentos
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
// MAPEAMENTO DE CAMPOS
// ===========================
// Ajuste estes nomes se a API retornar campos diferentes
const FIELD_MAPPING = {
    // Nome do campo no código : nome do campo na API
    nomeCompleto: 'nomeCompleto', // pode ser 'nome', 'nome_completo', etc
    cpf: 'cpf',
    telefone: 'telefone',
    dataHora: 'dataHora', // pode ser 'data_hora', 'created_at', etc
    tipoAtendimento: 'tipoAtendimento', // pode ser 'tipo', 'tipo_atendimento', etc
    status: 'status',
    tecnicoResponsavel: 'tecnicoResponsavel', // pode ser 'tecnico', 'responsavel', etc
    unidade: 'unidade',
    prioridade: 'prioridade',
    registro: 'registro',
    motivoAtendimento: 'motivoAtendimento',
    descricaoDemanda: 'descricaoDemanda'
};

// Função helper para pegar valor do campo
function getFieldValue(obj, fieldName) {
    // Tenta pegar o valor usando o mapeamento
    const mappedField = FIELD_MAPPING[fieldName];

    // Tenta várias possibilidades de nome
    const possibleFields = [
        mappedField,
        fieldName,
        fieldName.toLowerCase(),
        fieldName.replace(/([A-Z])/g, '_$1').toLowerCase(), // camelCase para snake_case
        fieldName.replace(/_/g, '') // remove underscores
    ];

    for (const field of possibleFields) {
        if (obj[field] !== undefined && obj[field] !== null) {
            return obj[field];
        }
    }

    return null;
}

// ===========================
// Funções Utilitárias
// ===========================

function getAuthToken() {
    return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
}

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
                    window.location.href = '/pages/login.html';
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

function formatDateTime(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Erro ao formatar data:', dateString, e);
        return '-';
    }
}

function formatCPF(cpf) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

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
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabButton = Array.from(document.querySelectorAll('.tab-button')).find(btn =>
        btn.getAttribute('onclick')?.includes(tabId)
    );
    if (tabButton) tabButton.classList.add('active');

    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');

    STATE.currentTab = tabId;

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

            // DEBUG: Mostrar estrutura do primeiro atendimento
            if (STATE.atendimentos.length > 0) {
                console.log('📋 ESTRUTURA DO ATENDIMENTO:');
                console.log('Campos disponíveis:', Object.keys(STATE.atendimentos[0]));
                console.log('Primeiro atendimento completo:', STATE.atendimentos[0]);
            }

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
            const aguardando = Array.isArray(data) ? data.filter(a => {
                const status = getFieldValue(a, 'status');
                return status === 'aguardando';
            }) : [];

            // DEBUG: Mostrar estrutura
            if (aguardando.length > 0) {
                console.log('📋 ESTRUTURA DO ATENDIMENTO (Recepção):');
                console.log('Campos:', Object.keys(aguardando[0]));
                console.log('Exemplo:', aguardando[0]);
            }

            renderRecepcaoTable(aguardando);
        }
    } catch (error) {
        showNotification('Erro ao carregar fila', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function atualizarAtendimento(id, dados) {
    try {
        showLoading('Atualizando...');
        const response = await apiRequest(`${CONFIG.API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });

        if (response) {
            showNotification('Atendimento atualizado!', 'success');

            if (STATE.currentTab === 'recepcao') {
                await carregarAtendimentosAguardando();
            } else {
                await carregarTodosAtendimentos();
            }
        }
    } catch (error) {
        showNotification('Erro ao atualizar: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

async function excluirAtendimento(id) {
    if (!confirm('Deseja realmente excluir este atendimento?')) return;

    try {
        showLoading('Excluindo...');
        await apiRequest(`${CONFIG.API_BASE}/${id}`, {
            method: 'DELETE'
        });

        showNotification('Atendimento excluído!', 'success');

        if (STATE.currentTab === 'recepcao') {
            await carregarAtendimentosAguardando();
        } else {
            await carregarTodosAtendimentos();
        }
    } catch (error) {
        showNotification('Erro ao excluir: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// ===========================
// Renderização - Tabelas
// ===========================

function renderRecepcaoTable(atendimentos) {
    const tbody = document.querySelector('#recepcao-table tbody');
    if (!tbody) return;

    if (!atendimentos || atendimentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">Nenhum atendimento aguardando</td></tr>';
        return;
    }

    tbody.innerHTML = atendimentos.map(a => {
        // Pegar valores usando o helper
        const registro = getFieldValue(a, 'registro') || `#${a.id}`;
        const nome = getFieldValue(a, 'nomeCompleto') || '-';
        const cpf = getFieldValue(a, 'cpf') || '';
        const tipo = getFieldValue(a, 'tipoAtendimento') || '-';
        const dataHora = getFieldValue(a, 'dataHora') || '';

        console.log(`Renderizando linha - ID: ${a.id}, Nome: ${nome}, CPF: ${cpf}, Tipo: ${tipo}`);

        return `
            <tr class="clickable" onclick="verDetalhesAtendimento(${a.id})">
                <td>${registro}</td>
                <td>${nome}</td>
                <td>${formatCPF(cpf)}</td>
                <td>${tipo}</td>
                <td>${formatDateTime(dataHora)}</td>
                <td>
                    <button class="btn btn--primary btn-xs" onclick="event.stopPropagation(); iniciarAtendimento(${a.id})">
                        <i class="fas fa-play"></i> Iniciar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAtendimentosTable() {
    const tbody = document.querySelector('#atendimentos-table tbody');
    if (!tbody) return;

    const start = (STATE.currentPage - 1) * CONFIG.PAGE_SIZE;
    const end = start + CONFIG.PAGE_SIZE;
    const pageData = STATE.filteredAtendimentos.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">Nenhum atendimento encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = pageData.map(a => {
        // Pegar valores usando o helper
        const registro = getFieldValue(a, 'registro') || `#${a.id}`;
        const nome = getFieldValue(a, 'nomeCompleto') || '-';
        const cpf = getFieldValue(a, 'cpf') || '';
        const tipo = getFieldValue(a, 'tipoAtendimento') || '-';
        const status = getFieldValue(a, 'status') || 'aguardando';
        const tecnico = getFieldValue(a, 'tecnicoResponsavel') || '-';
        const dataHora = getFieldValue(a, 'dataHora') || '';

        console.log(`Renderizando - ID: ${a.id}, Nome: ${nome}, Tipo: ${tipo}, Status: ${status}`);

        return `
            <tr class="clickable" onclick="verDetalhesAtendimento(${a.id})">
                <td>${registro}</td>
                <td>${nome}</td>
                <td>${formatCPF(cpf)}</td>
                <td>${tipo}</td>
                <td><span class="status-badge ${getStatusClass(status)}">${getStatusLabel(status)}</span></td>
                <td>${tecnico}</td>
                <td>${formatDateTime(dataHora)}</td>
                <td onclick="event.stopPropagation()">
                    <button class="btn btn--warning btn-xs" onclick="editarAtendimento(${a.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--danger btn-xs" onclick="excluirAtendimento(${a.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(STATE.filteredAtendimentos.length / CONFIG.PAGE_SIZE);
    const paginationEl = document.querySelector('.pagination');
    if (!paginationEl) return;

    let html = `
        <button ${STATE.currentPage === 1 ? 'disabled' : ''} onclick="mudarPagina(${STATE.currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button class="${i === STATE.currentPage ? 'active' : ''}" onclick="mudarPagina(${i})">
                ${i}
            </button>
        `;
    }

    html += `
        <button ${STATE.currentPage === totalPages ? 'disabled' : ''} onclick="mudarPagina(${STATE.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationEl.innerHTML = html;
}

function mudarPagina(page) {
    const totalPages = Math.ceil(STATE.filteredAtendimentos.length / CONFIG.PAGE_SIZE);
    if (page < 1 || page > totalPages) return;

    STATE.currentPage = page;
    renderAtendimentosTable();
}

function updateTotalRegistros() {
    const recordCount = document.querySelector('.record-count');
    if (recordCount) {
        recordCount.textContent = `Mostrando ${STATE.filteredAtendimentos.length} de ${STATE.atendimentos.length} registros`;
    }
}

// ===========================
// Busca e Filtros
// ===========================

function buscarAtendimentos() {
    const busca = document.getElementById('busca-atendimento')?.value.toLowerCase() || '';

    if (!busca) {
        STATE.filteredAtendimentos = STATE.atendimentos;
    } else {
        STATE.filteredAtendimentos = STATE.atendimentos.filter(a => {
            const nome = getFieldValue(a, 'nomeCompleto') || '';
            const cpf = getFieldValue(a, 'cpf') || '';
            const registro = getFieldValue(a, 'registro') || '';

            return nome.toLowerCase().includes(busca) ||
                   cpf.includes(busca) ||
                   registro.toLowerCase().includes(busca);
        });
    }

    STATE.currentPage = 1;
    renderAtendimentosTable();
    updateTotalRegistros();
}

function limparBusca() {
    const input = document.getElementById('busca-atendimento');
    if (input) input.value = '';

    STATE.filteredAtendimentos = STATE.atendimentos;
    STATE.currentPage = 1;
    renderAtendimentosTable();
    updateTotalRegistros();
}

// ===========================
// Ações de Atendimento
// ===========================

function abrirNovoAtendimento() {
    console.log('📝 Abrindo formulário de novo atendimento...');
    window.location.href = '/pages/novo-atendimento.html';
}

function editarAtendimento(id) {
    console.log('✏️ Redirecionando para edição do atendimento:', id);
    window.location.href = `/pages/novo-atendimento.html?id=${id}`;
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
            console.log('📄 Detalhes do atendimento:', atendimento);
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
    // Usar helper para pegar valores
    const registro = getFieldValue(atendimento, 'registro') || `#${atendimento.id}`;
    const status = getFieldValue(atendimento, 'status') || 'aguardando';
    const nome = getFieldValue(atendimento, 'nomeCompleto') || '-';
    const cpf = getFieldValue(atendimento, 'cpf') || '';
    const telefone = getFieldValue(atendimento, 'telefone') || '-';
    const dataHora = getFieldValue(atendimento, 'dataHora') || '';
    const tecnico = getFieldValue(atendimento, 'tecnicoResponsavel') || '-';
    const unidade = getFieldValue(atendimento, 'unidade') || '-';
    const tipo = getFieldValue(atendimento, 'tipoAtendimento') || '-';
    const prioridade = getFieldValue(atendimento, 'prioridade') || 'Normal';
    const motivo = getFieldValue(atendimento, 'motivoAtendimento') || '-';
    const descricao = getFieldValue(atendimento, 'descricaoDemanda') || '-';

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
                            <strong>Registro:</strong> ${registro}
                        </div>
                        <div>
                            <strong>Status:</strong>
                            <span class="status-badge ${getStatusClass(status)}">
                                ${getStatusLabel(status)}
                            </span>
                        </div>
                    </div>
                    <hr style="margin: 1rem 0;">
                    <div class="form-grid-2">
                        <div>
                            <strong>Nome:</strong> ${nome}
                        </div>
                        <div>
                            <strong>CPF:</strong> ${formatCPF(cpf)}
                        </div>
                        <div>
                            <strong>Telefone:</strong> ${telefone}
                        </div>
                        <div>
                            <strong>Data/Hora:</strong> ${formatDateTime(dataHora)}
                        </div>
                    </div>
                    <hr style="margin: 1rem 0;">
                    <div class="form-grid-2">
                        <div>
                            <strong>Técnico:</strong> ${tecnico}
                        </div>
                        <div>
                            <strong>Unidade:</strong> ${unidade}
                        </div>
                        <div>
                            <strong>Tipo:</strong> ${tipo}
                        </div>
                        <div>
                            <strong>Prioridade:</strong> ${prioridade}
                        </div>
                    </div>
                    <hr style="margin: 1rem 0;">
                    <div>
                        <strong>Motivo:</strong><br>
                        ${motivo}
                    </div>
                    <div style="margin-top: 1rem;">
                        <strong>Descrição:</strong><br>
                        ${descricao}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--secondary" onclick="closeModal('modalDetalhes')">Fechar</button>
                    <button class="btn btn--warning" onclick="closeModal('modalDetalhes'); editarAtendimento(${atendimento.id})">
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
// Logout
// ===========================

function fazerLogout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        console.log('🚪 Fazendo logout...');

        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('tenant_data');

        showNotification('Logout realizado com sucesso!', 'success');

        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 1000);
    }
}

// ===========================
// Funções auxiliares globais
// ===========================

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
window.mudarPagina = mudarPagina;
window.fazerLogout = fazerLogout;

// Funções stub
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
    console.log('='.repeat(60));
    console.log('🚀 SISTEMA DE ATENDIMENTOS - INICIANDO');
    console.log('🌐 Servidor: Express/Node.js Multi-Tenant');
    console.log('📁 HTML: /pages/atendimento.html');
    console.log('📜 JS: /src/js/atendimento.app.js');
    console.log('='.repeat(60));

    const token = getAuthToken();

    if (!token) {
        console.warn('⚠️ Token não encontrado!');
        showNotification('Por favor, faça login para continuar', 'warning');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 2000);
        return;
    }

    console.log('✅ Token encontrado!');

    const userData = localStorage.getItem('user_data');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('👤 Usuário:', user.nome || 'Nome não encontrado');
            console.log('🏢 Perfil:', user.perfil || 'Perfil não encontrado');
        } catch (e) {
            console.warn('⚠️ Erro ao parsear dados do usuário');
        }
    }

    console.log('📊 Carregando dados iniciais da tab:', STATE.currentTab);
    if (STATE.currentTab === 'recepcao') {
        carregarAtendimentosAguardando();
    }

    setInterval(() => {
        if (!STATE.isLoading && STATE.currentTab === 'recepcao') {
            console.log('🔄 Atualizando lista automaticamente...');
            carregarAtendimentosAguardando();
        }
    }, 30000);

    console.log('='.repeat(60));
    console.log('✅ SISTEMA PRONTO!');
    console.log('='.repeat(60));
});
