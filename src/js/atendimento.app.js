/* ===========================
   atendimento.app.js - VERSÃO CORRIGIDA
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
// MAPEAMENTO DE CAMPOS CORRIGIDO
// ===========================
const FIELD_MAPPING = {
    // Nome do campo usado no código : nome do campo retornado pela API
    nomeCompleto: 'nome_completo',
    cpf: 'cpf',
    telefone: 'telefone',
    dataHora: 'data_atendimento',
    tipoAtendimento: 'tipo_atendimento',
    status: 'status',
    tecnicoResponsavel: 'tecnico_responsavel',
    unidade: 'unidade',
    prioridade: 'prioridade',
    registro: 'registro',
    motivoAtendimento: 'motivo_atendimento',
    descricaoDemanda: 'descricao_demanda',
    dataNascimento: 'data_nascimento',
    horaAtendimento: 'hora_atendimento'
};

// Função helper CORRIGIDA para pegar valor do campo
function getFieldValue(obj, fieldName) {
    if (!obj) return null;

    // Primeiro tenta pelo mapeamento direto
    const mappedField = FIELD_MAPPING[fieldName];
    if (mappedField && obj[mappedField] !== undefined && obj[mappedField] !== null) {
        return obj[mappedField];
    }

    // Tenta pelo nome original
    if (obj[fieldName] !== undefined && obj[fieldName] !== null) {
        return obj[fieldName];
    }

    // Tenta lowercase
    const lowerField = fieldName.toLowerCase();
    if (obj[lowerField] !== undefined && obj[lowerField] !== null) {
        return obj[lowerField];
    }

    // Tenta converter camelCase para snake_case
    const snakeCase = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (obj[snakeCase] !== undefined && obj[snakeCase] !== null) {
        return obj[snakeCase];
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
    if (!modal) {
        console.warn('Modal não encontrado:', modalId);
        return;
    }

    // Remover classe active e display
    modal.classList.remove('active');
    modal.style.display = 'none';

    // Restaurar scroll do body
    document.body.style.overflow = '';

    // Se for o modal de detalhes, remover do DOM após animação
    if (modalId === 'modalDetalhes') {
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ===========================
// API - Atendimentos
// ===========================

async function carregarTodosAtendimentos() {
    try {
        showLoading('Carregando atendimentos...');
        const data = await apiRequest(CONFIG.API_BASE);

        if (data) {
            console.log('📦 Resposta da API:', data);

            // Extrair array de atendimentos da resposta
            let atendimentos = [];
            if (Array.isArray(data)) {
                atendimentos = data;
            } else if (data.atendimentos && Array.isArray(data.atendimentos)) {
                atendimentos = data.atendimentos;
            } else if (data.dados && Array.isArray(data.dados)) {
                atendimentos = data.dados;
            }

            STATE.atendimentos = atendimentos;

            // DEBUG: Mostrar estrutura do primeiro atendimento
            if (STATE.atendimentos.length > 0) {
                console.log('📋 ESTRUTURA DO ATENDIMENTO:');
                console.log('Campos disponíveis:', Object.keys(STATE.atendimentos[0]));
                console.log('Primeiro atendimento completo:', STATE.atendimentos[0]);
            } else {
                console.warn('⚠️ Nenhum atendimento encontrado!');
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
            console.log('📦 Resposta da API (Recepção):', data);

            // Extrair array de atendimentos da resposta
            let todosAtendimentos = [];
            if (Array.isArray(data)) {
                todosAtendimentos = data;
            } else if (data.atendimentos && Array.isArray(data.atendimentos)) {
                todosAtendimentos = data.atendimentos;
            } else if (data.dados && Array.isArray(data.dados)) {
                todosAtendimentos = data.dados;
            }

            // Filtrar apenas os aguardando
            const aguardando = todosAtendimentos.filter(a => {
                const status = getFieldValue(a, 'status');
                return status === 'aguardando';
            });

            console.log(`📊 Total de atendimentos: ${todosAtendimentos.length}`);
            console.log(`⏳ Aguardando: ${aguardando.length}`);

            // DEBUG: Mostrar estrutura
            if (aguardando.length > 0) {
                console.log('📋 ESTRUTURA DO ATENDIMENTO (Recepção):');
                console.log('Campos:', Object.keys(aguardando[0]));
                console.log('Exemplo:', aguardando[0]);
            } else {
                console.warn('⚠️ Nenhum atendimento aguardando!');
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
// Renderização - Tabelas CORRIGIDO
// ===========================

function renderRecepcaoTable(atendimentos) {
    const tbody = document.querySelector('#recepcao-table tbody');
    if (!tbody) return;

    if (!atendimentos || atendimentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">Nenhum atendimento aguardando</td></tr>';
        return;
    }

    tbody.innerHTML = atendimentos.map(a => {
        // CORRIGIDO: Pegar valores diretamente do objeto
        const registro = a.registro || `#${a.id}`;
        const nome = a.nome_completo || '-';
        const cpf = a.cpf || '';
        const tipo = a.tipo_atendimento || '-';
        const dataHora = a.data_atendimento || '';

        console.log(`✅ Recepção - ID: ${a.id}, Nome: ${nome}, CPF: ${cpf}, Tipo: ${tipo}`);

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

    const startIndex = (STATE.currentPage - 1) * CONFIG.PAGE_SIZE;
    const endIndex = startIndex + CONFIG.PAGE_SIZE;
    const paginatedData = STATE.filteredAtendimentos.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">Nenhum atendimento encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = paginatedData.map(a => {
        const registro = a.registro || `#${a.id}`;
        const nome = a.nome_completo || '-';
        const cpf = a.cpf || '';
        const tipo = a.tipo_atendimento || '-';
        const status = a.status || 'aguardando';
        const tecnico = a.tecnico_responsavel || '-';
        const dataHora = a.data_atendimento || '';

        return `
            <tr class="clickable" onclick="editarAtendimento(${a.id})">
                <td>${registro}</td>
                <td>
                    <span class="status-badge ${getStatusClass(status)}">
                        ${getStatusLabel(status)}
                    </span>
                </td>
                <td>${nome}</td>
                <td>${formatCPF(cpf)}</td>
                <td>${tipo}</td>
                <td>${tecnico}</td>
                <td>${formatDateTime(dataHora)}</td>
                <td>
                    <button class="btn btn--warning btn-xs" onclick="event.stopPropagation(); editarAtendimento(${a.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--danger btn-xs" onclick="event.stopPropagation(); excluirAtendimento(${a.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    updatePagination();
}

// ===========================
// Paginação
// ===========================

function updatePagination() {
    const totalPages = Math.ceil(STATE.filteredAtendimentos.length / CONFIG.PAGE_SIZE);
    const paginationDiv = document.querySelector('.pagination');

    if (!paginationDiv || totalPages <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="changePage(1)" ${STATE.currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-double-left"></i>
        </button>
        <button onclick="changePage(${STATE.currentPage - 1})" ${STATE.currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-left"></i>
        </button>
    `;

    const startPage = Math.max(1, STATE.currentPage - 2);
    const endPage = Math.min(totalPages, STATE.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button
                onclick="changePage(${i})"
                class="${i === STATE.currentPage ? 'active' : ''}"
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button onclick="changePage(${STATE.currentPage + 1})" ${STATE.currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-right"></i>
        </button>
        <button onclick="changePage(${totalPages})" ${STATE.currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-double-right"></i>
        </button>
    `;

    paginationDiv.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(STATE.filteredAtendimentos.length / CONFIG.PAGE_SIZE);
    if (page < 1 || page > totalPages) return;

    STATE.currentPage = page;
    renderAtendimentosTable();
}

function updateTotalRegistros() {
    const recordCount = document.querySelector('.record-count');
    if (recordCount) {
        const total = STATE.filteredAtendimentos.length;
        const showing = Math.min(CONFIG.PAGE_SIZE, total - ((STATE.currentPage - 1) * CONFIG.PAGE_SIZE));
        recordCount.textContent = `Mostrando ${showing} de ${total} registros`;
    }
}

// ===========================
// Busca e Filtros
// ===========================

function buscarAtendimentos() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const termo = searchInput.value.toLowerCase().trim();

    if (!termo) {
        STATE.filteredAtendimentos = STATE.atendimentos;
    } else {
        STATE.filteredAtendimentos = STATE.atendimentos.filter(a => {
            const nome = (a.nome_completo || '').toLowerCase();
            const cpf = (a.cpf || '').replace(/\D/g, '');
            const registro = (a.registro || '').toLowerCase();
            const tipo = (a.tipo_atendimento || '').toLowerCase();

            return nome.includes(termo) ||
                   cpf.includes(termo) ||
                   registro.includes(termo) ||
                   tipo.includes(termo);
        });
    }

    STATE.currentPage = 1;
    renderAtendimentosTable();
    updateTotalRegistros();
}

function filtrarPorStatus(status) {
    if (!status) {
        STATE.filteredAtendimentos = STATE.atendimentos;
    } else {
        STATE.filteredAtendimentos = STATE.atendimentos.filter(a => a.status === status);
    }

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
        const response = await apiRequest(`${CONFIG.API_BASE}/${id}`);

        if (response) {
            // Extrair o atendimento da resposta
            let atendimento = response;

            // Se a resposta tem um campo 'atendimento', usar ele
            if (response.atendimento) {
                atendimento = response.atendimento;
            }
            // Se a resposta tem um campo 'dados', usar ele
            else if (response.dados) {
                atendimento = response.dados;
            }

            console.log('='.repeat(60));
            console.log('📄 DETALHES DO ATENDIMENTO');
            console.log('='.repeat(60));
            console.log('ID:', id);
            console.log('Atendimento extraído:', atendimento);
            console.log('='.repeat(60));

            mostrarModalDetalhes(atendimento);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar detalhes:', error);
        showNotification('Erro ao carregar detalhes', 'error');
    } finally {
        hideLoading();
    }
}

function mostrarModalDetalhes(atendimento) {
    console.log('🔍 Montando modal com dados:', atendimento);

    // Se existir dados_completos, mesclar com os dados principais
    const dadosCompletos = atendimento.dados_completos || {};
    const dadosMesclados = { ...dadosCompletos, ...atendimento };

    // Extrair dados com múltiplos fallbacks
    const registro = dadosMesclados.registro || `#${dadosMesclados.id || 'undefined'}`;
    const status = dadosMesclados.status || 'aguardando';
    const nome = dadosMesclados.nome_completo || dadosMesclados.nomeCompleto || dadosMesclados.nome || '-';
    const cpf = dadosMesclados.cpf || '';
    const telefone = dadosMesclados.telefone || '-';

    let dataHora = dadosMesclados.data_atendimento ||
                   dadosMesclados.dataAtendimento ||
                   dadosMesclados.data_hora ||
                   dadosMesclados.created_at ||
                   '-';

    const tecnico = dadosMesclados.tecnico_responsavel ||
                    dadosMesclados.tecnicoResponsavel ||
                    dadosMesclados.tecnico ||
                    '-';

    const unidade = dadosMesclados.unidade || '-';
    const tipo = dadosMesclados.tipo_atendimento ||
                 dadosMesclados.tipoAtendimento ||
                 dadosMesclados.tipo ||
                 '-';
    const prioridade = dadosMesclados.prioridade || 'Normal';
    const motivo = dadosMesclados.motivo_atendimento ||
                   dadosMesclados.motivoAtendimento ||
                   dadosMesclados.motivo ||
                   '-';
    const descricao = dadosMesclados.descricao_demanda ||
                      dadosMesclados.descricaoDemanda ||
                      dadosMesclados.descricao ||
                      '-';

    console.log('📋 Valores extraídos para o modal:', {
        registro, status, nome, cpf, telefone,
        dataHora, tecnico, unidade, tipo,
        prioridade, motivo, descricao
    });

    // Remover modal existente se houver
    const modalExistente = document.getElementById('modalDetalhes');
    if (modalExistente) {
        modalExistente.remove();
    }

    // Criar o modal
    const modalDiv = document.createElement('div');
    modalDiv.id = 'modalDetalhes';
    modalDiv.className = 'modal';
    modalDiv.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fas fa-info-circle"></i> Detalhes do Atendimento
                </h3>
                <button class="btn-close" type="button">&times;</button>
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
                    <p style="margin-top: 0.5rem;">${motivo}</p>
                </div>
                <div style="margin-top: 1rem;">
                    <strong>Descrição:</strong><br>
                    <p style="margin-top: 0.5rem;">${descricao}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn--secondary" type="button" id="btnFecharModal">Fechar</button>
                <button class="btn btn--warning" type="button" id="btnEditarModal">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        </div>
    `;

    // Adicionar ao body
    document.body.appendChild(modalDiv);

    // Adicionar event listeners após o modal estar no DOM
    setTimeout(() => {
        // Botão X de fechar
        const btnClose = modalDiv.querySelector('.btn-close');
        if (btnClose) {
            btnClose.addEventListener('click', function() {
                console.log('Clicou no X para fechar');
                closeModal('modalDetalhes');
            });
        }

        // Botão Fechar
        const btnFechar = document.getElementById('btnFecharModal');
        if (btnFechar) {
            btnFechar.addEventListener('click', function() {
                console.log('Clicou no botão Fechar');
                closeModal('modalDetalhes');
            });
        }

        // Botão Editar
        const btnEditar = document.getElementById('btnEditarModal');
        if (btnEditar) {
            btnEditar.addEventListener('click', function() {
                console.log('Clicou no botão Editar');
                closeModal('modalDetalhes');
                editarAtendimento(atendimento.id);
            });
        }

        // Clicar fora do modal para fechar
        modalDiv.addEventListener('click', function(e) {
            if (e.target === modalDiv) {
                console.log('Clicou fora do modal');
                closeModal('modalDetalhes');
            }
        });

        // Abrir o modal
        modalDiv.classList.add('active');
        modalDiv.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        console.log('✅ Modal montado e event listeners adicionados');
    }, 50);
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
    return labels[status] || status;
}

// ===========================
// Exportação de Dados
// ===========================

function abrirModalImpressao() {
    openModal('modalImpressao');
}

function abrirModalExportarPDF() {
    openModal('modalExportarPDF');
}

function filtrarAtendimentosParaExportacao(opcao, filtroStatus, dataInicio, dataFim) {
    let atendimentos = [];

    if (opcao === 'todos') {
        atendimentos = STATE.atendimentos;
    } else if (opcao === 'filtrados') {
        atendimentos = STATE.filteredAtendimentos;
    } else if (opcao === 'pagina') {
        const startIndex = (STATE.currentPage - 1) * CONFIG.PAGE_SIZE;
        const endIndex = startIndex + CONFIG.PAGE_SIZE;
        atendimentos = STATE.filteredAtendimentos.slice(startIndex, endIndex);
    }

    if (filtroStatus) {
        atendimentos = atendimentos.filter(a => a.status === filtroStatus);
    }

    if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);

        atendimentos = atendimentos.filter(a => {
            if (!a.data_atendimento) return false;
            const dataAtend = new Date(a.data_atendimento);
            return dataAtend >= inicio && dataAtend <= fim;
        });
    }

    return atendimentos;
}

// Função de impressão
function executarImpressao() {
    try {
        const opcao = document.querySelector('input[name="opcaoImpressao"]:checked').value;
        const filtroStatus = document.getElementById('filtroStatusImpressao').value;
        const dataInicio = document.getElementById('dataInicioImpressao').value;
        const dataFim = document.getElementById('dataFimImpressao').value;

        const atendimentos = filtrarAtendimentosParaExportacao(opcao, filtroStatus, dataInicio, dataFim);

        if (atendimentos.length === 0) {
            showNotification('Nenhum atendimento encontrado com os filtros selecionados', 'warning');
            return;
        }

        const printArea = document.getElementById('print-area');
        if (!printArea) {
            showNotification('Área de impressão não encontrada', 'error');
            return;
        }

        const tableHTML = `
            <div class="print-header">
                <h2 class="print-title">Relatório de Atendimentos</h2>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                ${dataInicio && dataFim ? `<p>Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}</p>` : ''}
                ${filtroStatus ? `<p>Status: ${getStatusLabel(filtroStatus)}</p>` : ''}
                <p>Total de registros: ${atendimentos.length}</p>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Registro</th>
                        <th>Nome</th>
                        <th>CPF</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Técnico</th>
                        <th>Data/Hora</th>
                    </tr>
                </thead>
                <tbody>
                    ${atendimentos.map(a => `
                        <tr>
                            <td>${a.registro || '#' + a.id}</td>
                            <td>${a.nome_completo || '-'}</td>
                            <td>${formatCPF(a.cpf || '')}</td>
                            <td>${a.tipo_atendimento || '-'}</td>
                            <td>${getStatusLabel(a.status)}</td>
                            <td>${a.tecnico_responsavel || '-'}</td>
                            <td>${formatDateTime(a.data_atendimento)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        printArea.innerHTML = tableHTML;
        closeModal('modalImpressao');

        setTimeout(() => {
            window.print();
        }, 500);

    } catch (error) {
        console.error('Erro ao imprimir:', error);
        showNotification('Erro ao gerar impressão', 'error');
    }
}

// Função de exportação PDF
function executarExportarPDF() {
    try {
        const opcao = document.querySelector('input[name="opcaoPDF"]:checked').value;
        const filtroStatus = document.getElementById('filtroStatusPDF').value;
        const dataInicio = document.getElementById('dataInicioPDF').value;
        const dataFim = document.getElementById('dataFimPDF').value;
        const incluirDetalhes = document.getElementById('incluirDetalhes').checked;
        const nomePDF = document.getElementById('nomePDF').value || 'atendimentos';

        // Filtrar atendimentos
        const atendimentos = filtrarAtendimentosParaExportacao(opcao, filtroStatus, dataInicio, dataFim);

        if (atendimentos.length === 0) {
            showNotification('Nenhum atendimento encontrado com os filtros selecionados', 'warning');
            return;
        }

        showLoading('Gerando PDF...');

        // Verificar se jsPDF está disponível
        if (typeof window.jspdf === 'undefined') {
            hideLoading();
            showNotification('Biblioteca jsPDF não carregada. Verifique sua conexão com a internet.', 'error');
            return;
        }

        // Criar PDF usando jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configurações
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Cabeçalho
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Relatório de Atendimentos', pageWidth / 2, yPos, { align: 'center' });

        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const dataAtual = new Date().toLocaleString('pt-BR');
        doc.text(`Gerado em: ${dataAtual}`, pageWidth / 2, yPos, { align: 'center' });

        yPos += 5;
        if (dataInicio && dataFim) {
            const periodo = `Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`;
            doc.text(periodo, pageWidth / 2, yPos, { align: 'center' });
            yPos += 5;
        }

        if (filtroStatus) {
            doc.text(`Status: ${getStatusLabel(filtroStatus)}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 5;
        }

        doc.text(`Total de registros: ${atendimentos.length}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Preparar dados para a tabela
        const tableData = atendimentos.map(a => [
            a.registro || '#' + a.id,
            a.nome_completo || '-',
            formatCPF(a.cpf || ''),
            a.tipo_atendimento || '-',
            getStatusLabel(a.status),
            a.tecnico_responsavel || '-',
            formatDateTime(a.data_atendimento)
        ]);

        // Adicionar tabela
        doc.autoTable({
            startY: yPos,
            head: [['Registro', 'Nome', 'CPF', 'Tipo', 'Status', 'Técnico', 'Data/Hora']],
            body: tableData,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [72, 61, 139],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { top: yPos, left: 10, right: 10 },
            didDrawPage: function(data) {
                // Rodapé com numeração de página
                doc.setFontSize(8);
                doc.text(
                    `Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
        });

        // Se incluir detalhes, adicionar página com descrições
        if (incluirDetalhes) {
            atendimentos.forEach((a, index) => {
                if (a.descricao_demanda || a.motivo_atendimento) {
                    doc.addPage();

                    let detailYPos = 20;

                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Detalhes - ${a.registro || '#' + a.id}`, 10, detailYPos);

                    detailYPos += 10;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');

                    doc.text(`Nome: ${a.nome_completo || '-'}`, 10, detailYPos);
                    detailYPos += 7;
                    doc.text(`CPF: ${formatCPF(a.cpf || '')}`, 10, detailYPos);
                    detailYPos += 7;
                    doc.text(`Tipo: ${a.tipo_atendimento || '-'}`, 10, detailYPos);
                    detailYPos += 7;
                    doc.text(`Técnico: ${a.tecnico_responsavel || '-'}`, 10, detailYPos);
                    detailYPos += 10;

                    if (a.motivo_atendimento) {
                        doc.setFont('helvetica', 'bold');
                        doc.text('Motivo:', 10, detailYPos);
                        detailYPos += 7;
                        doc.setFont('helvetica', 'normal');

                        const motivoLines = doc.splitTextToSize(a.motivo_atendimento, pageWidth - 20);
                        doc.text(motivoLines, 10, detailYPos);
                        detailYPos += motivoLines.length * 7 + 5;
                    }

                    if (a.descricao_demanda) {
                        doc.setFont('helvetica', 'bold');
                        doc.text('Descrição:', 10, detailYPos);
                        detailYPos += 7;
                        doc.setFont('helvetica', 'normal');

                        const descLines = doc.splitTextToSize(a.descricao_demanda, pageWidth - 20);
                        doc.text(descLines, 10, detailYPos);
                    }
                }
            });
        }

        // Salvar PDF
        doc.save(`${nomePDF}_${new Date().toISOString().split('T')[0]}.pdf`);

        closeModal('modalExportarPDF');
        hideLoading();
        showNotification('PDF gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        hideLoading();
        showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
}

// Exportar funções para o escopo global
window.showTab = showTab;
window.showSubTab = showSubTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.abrirNovoAtendimento = abrirNovoAtendimento;
window.editarAtendimento = editarAtendimento;
window.iniciarAtendimento = iniciarAtendimento;
window.verDetalhesAtendimento = verDetalhesAtendimento;
window.excluirAtendimento = excluirAtendimento;
window.buscarAtendimentos = buscarAtendimentos;
window.filtrarPorStatus = filtrarPorStatus;
window.changePage = changePage;
window.abrirModalImpressao = abrirModalImpressao;
window.abrirModalExportarPDF = abrirModalExportarPDF;
window.executarImpressao = executarImpressao;
window.executarExportarPDF = executarExportarPDF;

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
    console.log('🚀 SISTEMA DE ATENDIMENTOS - VERSÃO CORRIGIDA');
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
