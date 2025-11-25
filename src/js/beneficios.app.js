// ===== Configuração da API =====
const API_BASE_URL = 'http://localhost:3000';

// ===== Variáveis globais =====
let currentData = {
    mov: [],
    bolsa: [],
    eventuais: [],
    bpc: []
};

// Estado de paginação
let pagination = {
    mov: { page: 1, perPage: 10, total: 0 },
    bolsa: { page: 1, perPage: 10, total: 0 },
    eventuais: { page: 1, perPage: 10, total: 0 },
    bpc: { page: 1, perPage: 10, total: 0 },
    lista: { page: 1, perPage: 10, total: 0 }
};

// Dados filtrados
let filteredData = {
    mov: [],
    bolsa: [],
    eventuais: [],
    bpc: []
};

// Flag para evitar duplicação de listeners
let listenersInitialized = false;

// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    setupModaisCriacao();
    loadAllData();
    setupPagination();
});

function initializeElements() {
    // Obter referências das tabelas
    window.tbodyMov = document.querySelector('#tabela-mov tbody');
    window.tbodyBolsa = document.querySelector('#tabela-bolsa tbody');
    window.tbodyEvent = document.querySelector('#tabela-eventuais tbody');
    window.tbodyBpc = document.querySelector('#tabela-bpc tbody');
    window.tbodyLista = document.querySelector('#tabela-lista tbody');
}

function setupEventListeners() {
    if (listenersInitialized) return;
    listenersInitialized = true;

    // Configurar abas
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const id = btn.dataset.tab;
            document.getElementById(`tab-${id}`).classList.add('active');
        });
    });

    // Botões de exportação
    document.getElementById('btn-exportar-bolsa')?.addEventListener('click', exportarBolsa);
    document.getElementById('btn-exportar-lista')?.addEventListener('click', exportarLista);
    document.getElementById('btn-importar-bolsa')?.addEventListener('click', importarBolsa);

    // Botões de novo registro
    document.getElementById('btn-nova-mov')?.addEventListener('click', () => abrirModalCriacao('mov'));
    document.getElementById('btn-novo-bolsa')?.addEventListener('click', () => abrirModalCriacao('bolsa'));
    document.getElementById('btn-novo-eventual')?.addEventListener('click', () => abrirModalCriacao('eventual'));
    document.getElementById('btn-novo-bpc')?.addEventListener('click', () => abrirModalCriacao('bpc'));

    // Botões de filtro
    document.getElementById('btn-filtrar-mov')?.addEventListener('click', filtrarMovimentacao);
    document.getElementById('btn-filtrar-eventual')?.addEventListener('click', filtrarEventuais);
    document.getElementById('btn-filtrar-bpc')?.addEventListener('click', filtrarBPC);
    document.getElementById('btn-limpar-mov')?.addEventListener('click', limparFiltrosMov);
    document.getElementById('btn-limpar-lista')?.addEventListener('click', limparFiltrosLista);

    // Configurar modal de detalhes
    document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModal);
    document.getElementById('modal-cancelar')?.addEventListener('click', fecharModal);
}

// ===== PAGINAÇÃO =====
function setupPagination() {
    ['mov', 'bolsa', 'eventuais', 'bpc', 'lista'].forEach(type => {
        document.getElementById(`prev-${type}`)?.addEventListener('click', () => changePage(type, -1));
        document.getElementById(`next-${type}`)?.addEventListener('click', () => changePage(type, 1));
    });
}

function changePage(type, direction) {
    const state = pagination[type];
    const newPage = state.page + direction;

    if (newPage < 1 || newPage > Math.ceil(state.total / state.perPage)) {
        return;
    }

    state.page = newPage;

    // Re-renderizar a tabela específica
    if (type === 'mov') renderMov();
    if (type === 'bolsa') renderBolsa();
    if (type === 'eventuais') renderEventuais();
    if (type === 'bpc') renderBpc();
    if (type === 'lista') renderLista();
}

function updatePaginationInfo(type) {
    const state = pagination[type];
    const totalPages = Math.ceil(state.total / state.perPage);
    const pageInfo = document.getElementById(`page-info-${type}`);

    if (pageInfo) {
        pageInfo.textContent = `Página ${state.page} de ${totalPages || 1} (${state.total} registros)`;
    }

    // Habilitar/desabilitar botões
    const prevBtn = document.getElementById(`prev-${type}`);
    const nextBtn = document.getElementById(`next-${type}`);

    if (prevBtn) prevBtn.disabled = state.page === 1;
    if (nextBtn) nextBtn.disabled = state.page >= totalPages || totalPages === 0;
}

function getPaginatedData(data, type) {
    const state = pagination[type];
    const start = (state.page - 1) * state.perPage;
    const end = start + state.perPage;
    return data.slice(start, end);
}

// ===== MODAIS DE CRIAÇÃO =====
function setupModaisCriacao() {
    criarModalMovimentacao();
    criarModalBolsa();
    criarModalEventual();
    criarModalBPC();
}

function criarModalMovimentacao() {
    const modalHTML = `
    <div id="modal-criar-mov" class="modal" aria-hidden="true" style="display: none;">
        <div class="modal__content modal__content--large">
            <button class="modal__close" id="close-mov">&times;</button>
            <div class="modal__header">
                <h2>Nova Movimentação de Benefício</h2>
            </div>
            <div class="modal__body">
                <form id="form-movimentacao" class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Tipo de Benefício *</label>
                        <select class="form-input" name="beneficio" required>

                            <option value="Bolsa Família">Bolsa Família</option>
                            <option value="Benefício Eventual">Benefício Eventual</option>
                            <option value="BPC">BPC</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome do Beneficiário *</label>
                        <input type="text" class="form-input" name="nome" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF</label>
                        <input type="text" class="form-input" name="cpf" maxlength="14">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data da Movimentação *</label>
                        <input type="date" class="form-input" name="data" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Ação *</label>
                        <select class="form-input" name="acao" required>
                            <option value="">Selecione...</option>
                            <option value="Inclusão">Inclusão</option>
                            <option value="Atualização">Atualização</option>
                            <option value="Suspensão">Suspensão</option>
                            <option value="Cancelamento">Cancelamento</option>
                            <option value="Reativação">Reativação</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação *</label>
                        <select class="form-input" name="situacao" required>
                            <option value="">Selecione...</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Suspenso">Suspenso</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unidade/Setor</label>
                        <input type="text" class="form-input" name="unidade">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button class="btn btn--outline" id="cancel-mov">Cancelar</button>
                <button class="btn btn--primary" id="save-mov">Salvar Movimentação</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-mov').addEventListener('click', () => fecharModalCriacao('mov'));
    document.getElementById('cancel-mov').addEventListener('click', () => fecharModalCriacao('mov'));
    document.getElementById('save-mov').addEventListener('click', criarMovimentacao);
}

function criarModalBolsa() {
    const modalHTML = `
    <div id="modal-criar-bolsa" class="modal" aria-hidden="true" style="display: none;">
        <div class="modal__content modal__content--large">
            <button class="modal__close" id="close-bolsa">&times;</button>
            <div class="modal__header">
                <h2>Novo Registro - Bolsa Família</h2>
            </div>
            <div class="modal__body">
                <form id="form-bolsa" class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Responsável Familiar *</label>
                        <input type="text" class="form-input" name="rf" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">NIS *</label>
                        <input type="text" class="form-input" name="nis" maxlength="11" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF do Responsável</label>
                        <input type="text" class="form-input" name="cpf" maxlength="14">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantidade no Grupo Familiar *</label>
                        <input type="number" class="form-input" name="grupo" min="1" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Entrada *</label>
                        <input type="date" class="form-input" name="entrada" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Renovação</label>
                        <input type="date" class="form-input" name="renovacao">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação *</label>
                        <select class="form-input" name="situacao" required>
                            <option value="">Selecione...</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Suspenso">Suspenso</option>
                            <option value="Em Análise">Em Análise</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button class="btn btn--outline" id="cancel-bolsa">Cancelar</button>
                <button class="btn btn--primary" id="save-bolsa">Salvar Registro</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-bolsa').addEventListener('click', () => fecharModalCriacao('bolsa'));
    document.getElementById('cancel-bolsa').addEventListener('click', () => fecharModalCriacao('bolsa'));
    document.getElementById('save-bolsa').addEventListener('click', criarBolsa);
}

function criarModalEventual() {
    const modalHTML = `
    <div id="modal-criar-eventual" class="modal" aria-hidden="true" style="display: none;">
        <div class="modal__content modal__content--large">
            <button class="modal__close" id="close-eventual">&times;</button>
            <div class="modal__header">
                <h2>Novo Benefício Eventual</h2>
            </div>
            <div class="modal__body">
                <form id="form-eventual" class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Tipo de Benefício *</label>
                        <select class="form-input" name="tipo" required>
                            <option value="">Selecione...</option>
                            <option value="Cesta Básica">Cesta Básica</option>
                            <option value="Aluguel Social">Aluguel Social</option>
                            <option value="Natalidade">Natalidade</option>
                            <option value="Funeral">Funeral</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome do Beneficiário *</label>
                        <input type="text" class="form-input" name="nome" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF</label>
                        <input type="text" class="form-input" name="cpf" maxlength="14">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Valor *</label>
                        <input type="number" class="form-input" name="valor" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Concessão *</label>
                        <input type="date" class="form-input" name="data" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação *</label>
                        <select class="form-input" name="situacao" required>
                            <option value="">Selecione...</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Entregue">Entregue</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button class="btn btn--outline" id="cancel-eventual">Cancelar</button>
                <button class="btn btn--primary" id="save-eventual">Salvar Benefício</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-eventual').addEventListener('click', () => fecharModalCriacao('eventual'));
    document.getElementById('cancel-eventual').addEventListener('click', () => fecharModalCriacao('eventual'));
    document.getElementById('save-eventual').addEventListener('click', criarEventual);
}

function criarModalBPC() {
    const modalHTML = `
    <div id="modal-criar-bpc" class="modal" aria-hidden="true" style="display: none;">
        <div class="modal__content modal__content--large">
            <button class="modal__close" id="close-bpc">&times;</button>
            <div class="modal__header">
                <h2>Novo Registro - BPC</h2>
            </div>
            <div class="modal__body">
                <form id="form-bpc" class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Nome do Beneficiário *</label>
                        <input type="text" class="form-input" name="nome" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF *</label>
                        <input type="text" class="form-input" name="cpf" maxlength="14" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">NIS *</label>
                        <input type="text" class="form-input" name="nis" maxlength="11" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Categoria *</label>
                        <select class="form-input" name="categoria" required>
                            <option value="">Selecione...</option>
                            <option value="Idoso">Idoso</option>
                            <option value="Pessoa com Deficiência">Pessoa com Deficiência</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Número do Protocolo</label>
                        <input type="text" class="form-input" name="protocolo">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação *</label>
                        <select class="form-input" name="situacao" required>
                            <option value="">Selecione...</option>
                            <option value="Em Análise">Em Análise</option>
                            <option value="Concedido">Concedido</option>
                            <option value="Indeferido">Indeferido</option>
                            <option value="Suspenso">Suspenso</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button class="btn btn--outline" id="cancel-bpc">Cancelar</button>
                <button class="btn btn--primary" id="save-bpc">Salvar Registro</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-bpc').addEventListener('click', () => fecharModalCriacao('bpc'));
    document.getElementById('cancel-bpc').addEventListener('click', () => fecharModalCriacao('bpc'));
    document.getElementById('save-bpc').addEventListener('click', criarBPC);
}

function abrirModalCriacao(tipo) {
    const modal = document.getElementById(`modal-criar-${tipo}`);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('modal--open');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function fecharModalCriacao(tipo) {
    const modal = document.getElementById(`modal-criar-${tipo}`);
    const form = document.getElementById(`form-${tipo}`);

    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('modal--open');
        modal.setAttribute('aria-hidden', 'true');
    }
    if (form) {
        form.reset();
    }
}

// ===== FUNÇÕES DE CRIAÇÃO =====
async function criarMovimentacao() {
    const form = document.getElementById('form-movimentacao');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const data = {
        beneficio: sanitizeInput(formData.get('beneficio')),
        nome: sanitizeInput(formData.get('nome')),
        cpf: sanitizeInput(formData.get('cpf')),
        data: formData.get('data'),
        acao: sanitizeInput(formData.get('acao')),
        situacao: sanitizeInput(formData.get('situacao')),
        unidade: sanitizeInput(formData.get('unidade')),
        observacoes: sanitizeInput(formData.get('observacoes'))
    };

    if (data.cpf && !validarCPF(data.cpf)) {
        showNotification('CPF inválido', 'error');
        return;
    }

    try {
        showLoading('Criando movimentação...');
        await addMovimentacao(data);
        showNotification('Movimentação criada com sucesso!', 'success');
        fecharModalCriacao('mov');
        await loadAllData();
    } catch (error) {
        showNotification(error.message || 'Erro ao criar movimentação', 'error');
    } finally {
        hideLoading();
    }
}

async function criarBolsa() {
    const form = document.getElementById('form-bolsa');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const data = {
        rf: sanitizeInput(formData.get('rf')),
        nis: sanitizeInput(formData.get('nis')),
        cpf: sanitizeInput(formData.get('cpf')),
        grupo: formData.get('grupo'),
        entrada: formData.get('entrada'),
        renovacao: formData.get('renovacao'),
        situacao: sanitizeInput(formData.get('situacao')),
        observacoes: sanitizeInput(formData.get('observacoes'))
    };

    if (data.cpf && !validarCPF(data.cpf)) {
        showNotification('CPF inválido', 'error');
        return;
    }

    if (data.nis && !validarNIS(data.nis)) {
        showNotification('NIS inválido', 'error');
        return;
    }

    try {
        showLoading('Criando registro do Bolsa Família...');
        await addBolsaFamilia(data);
        showNotification('Registro do Bolsa Família criado com sucesso!', 'success');
        fecharModalCriacao('bolsa');
        await loadAllData();
    } catch (error) {
        showNotification(error.message || 'Erro ao criar registro', 'error');
    } finally {
        hideLoading();
    }
}

async function criarEventual() {
    const form = document.getElementById('form-eventual');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const data = {
        tipo: sanitizeInput(formData.get('tipo')),
        nome: sanitizeInput(formData.get('nome')),
        cpf: sanitizeInput(formData.get('cpf')),
        valor: parseFloat(formData.get('valor')),
        data: formData.get('data'),
        situacao: sanitizeInput(formData.get('situacao')),
        observacoes: sanitizeInput(formData.get('observacoes'))
    };

    if (data.cpf && !validarCPF(data.cpf)) {
        showNotification('CPF inválido', 'error');
        return;
    }

    try {
        showLoading('Criando benefício eventual...');
        await addBeneficioEventual(data);
        showNotification('Benefício eventual criado com sucesso!', 'success');
        fecharModalCriacao('eventual');
        await loadAllData();
    } catch (error) {
        showNotification(error.message || 'Erro ao criar benefício eventual', 'error');
    } finally {
        hideLoading();
    }
}

async function criarBPC() {
    const form = document.getElementById('form-bpc');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const data = {
        nome: sanitizeInput(formData.get('nome')),
        cpf: sanitizeInput(formData.get('cpf')),
        nis: sanitizeInput(formData.get('nis')),
        categoria: sanitizeInput(formData.get('categoria')),
        protocolo: sanitizeInput(formData.get('protocolo')),
        situacao: sanitizeInput(formData.get('situacao')),
        observacoes: sanitizeInput(formData.get('observacoes'))
    };

    if (!validarCPF(data.cpf)) {
        showNotification('CPF inválido', 'error');
        return;
    }

    if (!validarNIS(data.nis)) {
        showNotification('NIS inválido', 'error');
        return;
    }

    try {
        showLoading('Criando registro de BPC...');
        await addBPC(data);
        showNotification('Registro de BPC criado com sucesso!', 'success');
        fecharModalCriacao('bpc');
        await loadAllData();
    } catch (error) {
        showNotification(error.message || 'Erro ao criar registro de BPC', 'error');
    } finally {
        hideLoading();
    }
}

// ===== FUNÇÕES DE API =====
async function apiRequest(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            console.warn('Token não encontrado, redirecionando para login...');
            window.location.href = '/pages/login.html';
            throw new Error('Sessão expirada');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        });

        if (response.status === 401) {
            console.warn('Token inválido ou expirado');
            localStorage.removeItem('token');
            window.location.href = '/pages/login.html';
            throw new Error('Sessão expirada');
        }

        if (!response.ok) {
            let errorMessage = `Erro HTTP: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.mensagem || errorData.message || errorMessage;
            } catch (e) {
                // Não conseguiu fazer parse do erro
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

async function getMovimentacao() {
    return await apiRequest('/beneficios/movimentacao');
}

async function addMovimentacao(data) {
    return await apiRequest('/beneficios/movimentacao', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteMovimentacao(id) {
    return await apiRequest(`/beneficios/movimentacao/${id}`, {
        method: 'DELETE'
    });
}

async function getBolsaFamilia() {
    return await apiRequest('/beneficios/bolsa');
}

async function addBolsaFamilia(data) {
    return await apiRequest('/beneficios/bolsa', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteBolsaFamilia(id) {
    return await apiRequest(`/beneficios/bolsa/${id}`, {
        method: 'DELETE'
    });
}

async function getBeneficiosEventuais() {
    return await apiRequest('/beneficios/eventuais');
}

async function addBeneficioEventual(data) {
    return await apiRequest('/beneficios/eventuais', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteBeneficioEventual(id) {
    return await apiRequest(`/beneficios/eventuais/${id}`, {
        method: 'DELETE'
    });
}

async function getBPC() {
    return await apiRequest('/beneficios/bpc');
}

async function addBPC(data) {
    return await apiRequest('/beneficios/bpc', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteBPC(id) {
    return await apiRequest(`/beneficios/bpc/${id}`, {
        method: 'DELETE'
    });
}

// Funções de atualização (update)
async function updateMovimentacao(id, data) {
    return await apiRequest(`/beneficios/movimentacao/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function updateBolsaFamilia(id, data) {
    return await apiRequest(`/beneficios/bolsa/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function updateBeneficioEventual(id, data) {
    return await apiRequest(`/beneficios/eventuais/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function updateBPC(id, data) {
    return await apiRequest(`/beneficios/bpc/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}


// ===== FUNÇÕES AUXILIARES =====
function showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = document.getElementById('loading-message');
    if (overlay && messageEl) {
        messageEl.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        z-index: 10000;
        background: ${type === 'success' ? '#f0fdf4' : type === 'error' ? '#fef2f2' : '#eff6ff'};
        color: ${type === 'success' ? '#166534' : type === 'error' ? '#b91c1c' : '#1e40af'};
        border: 1px solid ${type === 'success' ? '#bbf7d0' : type === 'error' ? '#fecaca' : '#bfdbfe'};
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; margin-left: 1rem; cursor: pointer; font-size: 1.2rem;">&times;</button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function sanitizeInput(input) {
    if (!input) return '';
    return String(input).trim();
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto >= 10 ? 0 : resto;

    if (digito1 !== parseInt(cpf.charAt(9))) {
        return false;
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto >= 10 ? 0 : resto;

    return digito2 === parseInt(cpf.charAt(10));
}

function validarNIS(nis) {
    nis = nis.replace(/\D/g, '');
    return nis.length === 11;
}

function badge(situacao){
    const map = {
        'Ativo':'status-ativo',
        'Suspenso':'status-suspenso',
        'Cancelado':'status-inativo',
        'Em Análise':'status-inativo',
        'Entregue':'status-ativo',
        'Concedido':'status-ativo',
        'ativo':'status-ativo',
        'suspenso':'status-suspenso',
        'cancelado':'status-inativo',
        'Indeferido': 'status-inativo'
    };
    const cls = map[situacao] || 'status-ativo';
    return `<span class="status-badge ${cls}">${escapeHtml(situacao)}</span>`;
}

function formatarData(data) {
    if (!data || data === '—') return '—';
    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch {
        return '—';
    }
}

// ===== RENDERIZAÇÃO =====
async function renderMov() {
    try {
        const data = filteredData.mov.length > 0 ? filteredData.mov : currentData.mov;
        pagination.mov.total = data.length;
        const paginatedData = getPaginatedData(data, 'mov');

        if (paginatedData.length === 0) {
            tbodyMov.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">Nenhum registro encontrado</td></tr>';
        } else {
            tbodyMov.innerHTML = paginatedData.map(r => `
                <tr>
                    <td>${escapeHtml(r.beneficio || '—')}</td>
                    <td>${escapeHtml(r.nome || '—')}</td>
                    <td>${escapeHtml(r.cpf || '—')}</td>
                    <td>${formatarData(r.data)}</td>
                    <td>${escapeHtml(r.acao || '—')}</td>
                    <td>${badge(r.situacao || 'Ativo')}</td>
                    <td>${escapeHtml(r.unidade || '—')}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="btn btn--outline btn-sm" data-action="view" data-type="mov" data-id="${r.id}">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="edit" data-type="mov" data-id="${r.id}">
                                <i class="fa fa-pen"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="delete" data-type="mov" data-id="${r.id}">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        updatePaginationInfo('mov');
        addActionListeners();
    } catch (error) {
        console.error('Erro ao renderizar movimentação:', error);
        tbodyMov.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ef4444;">Erro ao carregar dados</td></tr>';
    }
}

async function renderBolsa() {
    try {
        const data = filteredData.bolsa.length > 0 ? filteredData.bolsa : currentData.bolsa;
        pagination.bolsa.total = data.length;
        const paginatedData = getPaginatedData(data, 'bolsa');

        if (paginatedData.length === 0) {
            tbodyBolsa.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">Nenhum registro encontrado</td></tr>';
        } else {
            tbodyBolsa.innerHTML = paginatedData.map(r => `
                <tr>
                    <td>${escapeHtml(r.rf || '—')}</td>
                    <td>${escapeHtml(r.nis || '—')}</td>
                    <td>${escapeHtml(r.grupo || '—')}</td>
                    <td>${formatarData(r.entrada)}</td>
                    <td>${formatarData(r.renovacao)}</td>
                    <td>${badge(r.situacao || 'Ativo')}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="btn btn--outline btn-sm" data-action="view" data-type="bolsa" data-id="${r.id}">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="edit" data-type="bolsa" data-id="${r.id}">
                                <i class="fa fa-pen"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="delete" data-type="bolsa" data-id="${r.id}">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        updatePaginationInfo('bolsa');
        addActionListeners();
    } catch (error) {
        console.error('Erro ao renderizar Bolsa Família:', error);
        tbodyBolsa.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444;">Erro ao carregar dados</td></tr>';
    }
}

async function renderEventuais() {
    try {
        const data = filteredData.eventuais.length > 0 ? filteredData.eventuais : currentData.eventuais;
        pagination.eventuais.total = data.length;
        const paginatedData = getPaginatedData(data, 'eventuais');

        if (paginatedData.length === 0) {
            tbodyEvent.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">Nenhum registro encontrado</td></tr>';
        } else {
            tbodyEvent.innerHTML = paginatedData.map(r => `
                <tr>
                    <td>${escapeHtml(r.tipo || '—')}</td>
                    <td>${escapeHtml(r.nome || '—')}</td>
                    <td>${escapeHtml(r.cpf || '—')}</td>
                    <td>R$ ${r.valor ? Number(r.valor).toFixed(2) : '0,00'}</td>
                    <td>${formatarData(r.data)}</td>
                    <td>${badge(r.situacao || 'Ativo')}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="btn btn--outline btn-sm" data-action="view" data-type="eventual" data-id="${r.id}">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="edit" data-type="eventual" data-id="${r.id}">
                                <i class="fa fa-pen"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="delete" data-type="eventual" data-id="${r.id}">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        updatePaginationInfo('eventuais');
        addActionListeners();
    } catch (error) {
        console.error('Erro ao renderizar benefícios eventuais:', error);
        tbodyEvent.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444;">Erro ao carregar dados</td></tr>';
    }
}

async function renderBpc() {
    try {
        const data = filteredData.bpc.length > 0 ? filteredData.bpc : currentData.bpc;
        pagination.bpc.total = data.length;
        const paginatedData = getPaginatedData(data, 'bpc');

        if (paginatedData.length === 0) {
            tbodyBpc.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">Nenhum registro encontrado</td></tr>';
        } else {
            tbodyBpc.innerHTML = paginatedData.map(r => `
                <tr>
                    <td>${escapeHtml(r.nome || '—')}</td>
                    <td>${escapeHtml(r.cpf || '—')}</td>
                    <td>${escapeHtml(r.nis || '—')}</td>
                    <td>${escapeHtml(r.categoria || '—')}</td>
                    <td>${escapeHtml(r.protocolo || '—')}</td>
                    <td>${badge(r.situacao || 'Ativo')}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="btn btn--outline btn-sm" data-action="view" data-type="bpc" data-id="${r.id}">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="edit" data-type="bpc" data-id="${r.id}">
                                <i class="fa fa-pen"></i>
                            </button>
                            <button class="btn btn--outline btn-sm" data-action="delete" data-type="bpc" data-id="${r.id}">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        updatePaginationInfo('bpc');
        addActionListeners();
    } catch (error) {
        console.error('Erro ao renderizar BPC:', error);
        tbodyBpc.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444;">Erro ao carregar dados</td></tr>';
    }
}

async function renderLista() {
    try {
        const listaMov = currentData.mov.map(r => ({
            nome: r.nome,
            cpf: r.cpf,
            beneficio: r.beneficio,
            situacao: r.situacao,
            inicio: r.data,
            unidade: r.unidade
        }));

        const listaEventuais = currentData.eventuais.map(r => ({
            nome: r.nome,
            cpf: r.cpf,
            beneficio: r.tipo,
            situacao: r.situacao,
            inicio: r.data,
            unidade: 'CRAS/CREAS'
        }));

        const listaBpc = currentData.bpc.map(r => ({
            nome: r.nome,
            cpf: r.cpf,
            beneficio: 'BPC',
            situacao: r.situacao,
            inicio: '—',
            unidade: 'Sec. Assistência'
        }));

        const listaBolsa = currentData.bolsa.map(r => ({
            nome: r.rf,
            cpf: '—',
            beneficio: 'Bolsa Família',
            situacao: r.situacao,
            inicio: r.entrada,
            unidade: 'CRAS'
        }));

        let listaConsolidada = [...listaMov, ...listaEventuais, ...listaBpc, ...listaBolsa];

        const beneficioFiltro = document.getElementById('lista-beneficio')?.value;
        const nomeCpfFiltro = document.getElementById('lista-nomecpf')?.value.toLowerCase();
        const unidadeFiltro = document.getElementById('lista-unidade')?.value;

        if (beneficioFiltro) {
            listaConsolidada = listaConsolidada.filter(r => r.beneficio === beneficioFiltro);
        }
        if (nomeCpfFiltro) {
            listaConsolidada = listaConsolidada.filter(r =>
                (r.nome && r.nome.toLowerCase().includes(nomeCpfFiltro)) ||
                (r.cpf && r.cpf.includes(nomeCpfFiltro))
            );
        }
        if (unidadeFiltro) {
            listaConsolidada = listaConsolidada.filter(r => r.unidade === unidadeFiltro);
        }

        pagination.lista.total = listaConsolidada.length;
        const paginatedData = getPaginatedData(listaConsolidada, 'lista');

        if (paginatedData.length === 0) {
            tbodyLista.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">Nenhum registro encontrado</td></tr>';
        } else {
            tbodyLista.innerHTML = paginatedData.map(r => `
                <tr>
                    <td>${escapeHtml(r.nome || '—')}</td>
                    <td>${escapeHtml(r.cpf || '—')}</td>
                    <td>${escapeHtml(r.beneficio || '—')}</td>
                    <td>${badge(r.situacao || 'Ativo')}</td>
                    <td>${formatarData(r.inicio)}</td>
                    <td>${escapeHtml(r.unidade || '—')}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="btn btn--outline btn-sm" data-action="view" data-type="lista">
                                <i class="fa fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        updatePaginationInfo('lista');
    } catch (error) {
        console.error('Erro ao renderizar lista:', error);
        tbodyLista.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444;">Erro ao carregar dados</td></tr>';
    }
}

function addActionListeners() {
    document.querySelectorAll('[data-action]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', handleActionClick);
    });
}

async function handleActionClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const type = btn.dataset.type;
    const id = btn.dataset.id;

    if (action === 'delete') {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                showLoading('Excluindo registro...');

                if (type === 'mov') await deleteMovimentacao(id);
                if (type === 'bolsa') await deleteBolsaFamilia(id);
                if (type === 'eventual') await deleteBeneficioEventual(id);
                if (type === 'bpc') await deleteBPC(id);

                showNotification('Registro excluído com sucesso', 'success');
                await loadAllData();
            } catch (error) {
                showNotification(error.message || 'Erro ao excluir registro', 'error');
            } finally {
                hideLoading();
            }
        }
        return;
    }

    if (action === 'view' || action === 'edit') {
        abrirModal(type, id, action);
    }
}

async function abrirModal(tipo, id, acao) {
    const modal = document.getElementById('modal-detalhes');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalCorpo = document.getElementById('modal-corpo');
    const modalFooter = document.querySelector('.modal__footer');

    try {
        showLoading('Carregando dados...');

        // Buscar dados do registro
        let registro = null;
        if (tipo === 'mov') {
            registro = currentData.mov.find(r => r.id == id);
        } else if (tipo === 'bolsa') {
            registro = currentData.bolsa.find(r => r.id == id);
        } else if (tipo === 'eventual') {
            registro = currentData.eventuais.find(r => r.id == id);
        } else if (tipo === 'bpc') {
            registro = currentData.bpc.find(r => r.id == id);
        }

        if (!registro) {
            throw new Error('Registro não encontrado');
        }

        const readonly = acao === 'view' ? 'readonly' : '';
        const disabled = acao === 'view' ? 'disabled' : '';

        modalTitulo.textContent = `${acao === 'view' ? 'Visualizar' : 'Editar'} - ${getTipoLabel(tipo)}`;

        // Gerar formulário baseado no tipo
        let formHtml = '';

        if (tipo === 'mov') {
            formHtml = `
                <form id="form-edit" class="form-grid">
                    <input type="hidden" name="id" value="${registro.id}">
                    <div class="form-group">
                        <label class="form-label">Tipo de Benefício</label>
                        <select class="form-input" name="beneficio" ${disabled}>
                            <option ${registro.beneficio === 'Bolsa Família' ? 'selected' : ''}>Bolsa Família</option>
                            <option ${registro.beneficio === 'Benefício Eventual' ? 'selected' : ''}>Benefício Eventual</option>
                            <option ${registro.beneficio === 'BPC' ? 'selected' : ''}>BPC</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome do Beneficiário</label>
                        <input type="text" class="form-input" name="nome" value="${escapeHtml(registro.nome || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF</label>
                        <input type="text" class="form-input" name="cpf" value="${escapeHtml(registro.cpf || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data da Movimentação</label>
                        <input type="date" class="form-input" name="data" value="${registro.data || ''}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Ação</label>
                        <select class="form-input" name="acao" ${disabled}>
                            <option ${registro.acao === 'Inclusão' ? 'selected' : ''}>Inclusão</option>
                            <option ${registro.acao === 'Atualização' ? 'selected' : ''}>Atualização</option>
                            <option ${registro.acao === 'Suspensão' ? 'selected' : ''}>Suspensão</option>
                            <option ${registro.acao === 'Cancelamento' ? 'selected' : ''}>Cancelamento</option>
                            <option ${registro.acao === 'Reativação' ? 'selected' : ''}>Reativação</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação</label>
                        <select class="form-input" name="situacao" ${disabled}>
                            <option ${registro.situacao === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option ${registro.situacao === 'Suspenso' ? 'selected' : ''}>Suspenso</option>
                            <option ${registro.situacao === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unidade/Setor</label>
                        <input type="text" class="form-input" name="unidade" value="${escapeHtml(registro.unidade || '')}" ${readonly}>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3" ${readonly}>${escapeHtml(registro.observacoes || '')}</textarea>
                    </div>
                </form>
            `;
        } else if (tipo === 'bolsa') {
            formHtml = `
                <form id="form-edit" class="form-grid">
                    <input type="hidden" name="id" value="${registro.id}">
                    <div class="form-group">
                        <label class="form-label">Responsável Familiar</label>
                        <input type="text" class="form-input" name="rf" value="${escapeHtml(registro.rf || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">NIS</label>
                        <input type="text" class="form-input" name="nis" value="${escapeHtml(registro.nis || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Grupo Familiar</label>
                        <input type="text" class="form-input" name="grupo" value="${escapeHtml(registro.grupo || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Entrada</label>
                        <input type="date" class="form-input" name="entrada" value="${registro.entrada || ''}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Renovação</label>
                        <input type="date" class="form-input" name="renovacao" value="${registro.renovacao || ''}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação</label>
                        <select class="form-input" name="situacao" ${disabled}>
                            <option ${registro.situacao === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option ${registro.situacao === 'Suspenso' ? 'selected' : ''}>Suspenso</option>
                            <option ${registro.situacao === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3" ${readonly}>${escapeHtml(registro.observacoes || '')}</textarea>
                    </div>
                </form>
            `;
        } else if (tipo === 'eventual') {
            formHtml = `
                <form id="form-edit" class="form-grid">
                    <input type="hidden" name="id" value="${registro.id}">
                    <div class="form-group">
                        <label class="form-label">Tipo de Auxílio</label>
                        <select class="form-input" name="tipo" ${disabled}>
                            <option ${registro.tipo === 'Cesta Básica' ? 'selected' : ''}>Cesta Básica</option>
                            <option ${registro.tipo === 'Auxílio Natalidade' ? 'selected' : ''}>Auxílio Natalidade</option>
                            <option ${registro.tipo === 'Auxílio Funeral' ? 'selected' : ''}>Auxílio Funeral</option>
                            <option ${registro.tipo === 'Auxílio Emergencial' ? 'selected' : ''}>Auxílio Emergencial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome do Beneficiário</label>
                        <input type="text" class="form-input" name="nome" value="${escapeHtml(registro.nome || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF</label>
                        <input type="text" class="form-input" name="cpf" value="${escapeHtml(registro.cpf || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantidade</label>
                        <input type="number" class="form-input" name="quantidade" value="${registro.quantidade || 1}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Concessão</label>
                        <input type="date" class="form-input" name="data" value="${registro.data || ''}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação</label>
                        <select class="form-input" name="situacao" ${disabled}>
                            <option ${registro.situacao === 'Entregue' ? 'selected' : ''}>Entregue</option>
                            <option ${registro.situacao === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option ${registro.situacao === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3" ${readonly}>${escapeHtml(registro.observacoes || '')}</textarea>
                    </div>
                </form>
            `;
        } else if (tipo === 'bpc') {
            formHtml = `
                <form id="form-edit" class="form-grid">
                    <input type="hidden" name="id" value="${registro.id}">
                    <div class="form-group">
                        <label class="form-label">Nome do Beneficiário</label>
                        <input type="text" class="form-input" name="nome" value="${escapeHtml(registro.nome || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF</label>
                        <input type="text" class="form-input" name="cpf" value="${escapeHtml(registro.cpf || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">NIS</label>
                        <input type="text" class="form-input" name="nis" value="${escapeHtml(registro.nis || '')}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de BPC</label>
                        <select class="form-input" name="tipoBpc" ${disabled}>
                            <option ${registro.tipoBpc === 'Idoso' ? 'selected' : ''}>Idoso</option>
                            <option ${registro.tipoBpc === 'Pessoa com Deficiência' ? 'selected' : ''}>Pessoa com Deficiência</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Concessão</label>
                        <input type="date" class="form-input" name="concessao" value="${registro.concessao || ''}" ${readonly}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Situação</label>
                        <select class="form-input" name="situacao" ${disabled}>
                            <option ${registro.situacao === 'Concedido' ? 'selected' : ''}>Concedido</option>
                            <option ${registro.situacao === 'Indeferido' ? 'selected' : ''}>Indeferido</option>
                            <option ${registro.situacao === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Observações</label>
                        <textarea class="form-input" name="observacoes" rows="3" ${readonly}>${escapeHtml(registro.observacoes || '')}</textarea>
                    </div>
                </form>
            `;
        }

        modalCorpo.innerHTML = formHtml;

        // Configurar botões do footer
        if (acao === 'edit') {
            modalFooter.innerHTML = `
                <button class="btn btn--outline" id="modal-cancelar">Cancelar</button>
                <button class="btn btn--primary" id="modal-salvar">Salvar Alterações</button>
            `;

            document.getElementById('modal-cancelar').addEventListener('click', fecharModal);
            document.getElementById('modal-salvar').addEventListener('click', () => salvarEdicao(tipo, id));
        } else {
            modalFooter.innerHTML = `
                <button class="btn btn--outline" id="modal-cancelar">Fechar</button>
            `;

            document.getElementById('modal-cancelar').addEventListener('click', fecharModal);
        }

        modal.classList.add('modal--open');
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir modal:', error);
        showNotification('Erro ao carregar dados do registro', 'error');
    }
}

function getTipoLabel(tipo) {
    const labels = {
        'mov': 'Movimentação',
        'bolsa': 'Bolsa Família',
        'eventual': 'Benefício Eventual',
        'bpc': 'BPC'
    };
    return labels[tipo] || tipo;
}

async function salvarEdicao(tipo, id) {
    try {
        const form = document.getElementById('form-edit');
        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());

        showLoading('Salvando alterações...');

        // Chamar API de atualização baseada no tipo
        if (tipo === 'mov') {
            await updateMovimentacao(id, dados);
        } else if (tipo === 'bolsa') {
            await updateBolsaFamilia(id, dados);
        } else if (tipo === 'eventual') {
            await updateBeneficioEventual(id, dados);
        } else if (tipo === 'bpc') {
            await updateBPC(id, dados);
        }

        showNotification('Registro atualizado com sucesso!', 'success');
        fecharModal();
        await loadAllData();

    } catch (error) {
        console.error('Erro ao salvar:', error);
        showNotification(error.message || 'Erro ao salvar alterações', 'error');
    } finally {
        hideLoading();
    }
}

function fecharModal() {
    document.getElementById('modal-detalhes').classList.remove('modal--open');
}

async function loadAllData() {
    try {
        showLoading('Carregando dados...');

        const [mov, bolsa, eventuais, bpc] = await Promise.all([
            getMovimentacao().catch(() => []),
            getBolsaFamilia().catch(() => []),
            getBeneficiosEventuais().catch(() => []),
            getBPC().catch(() => [])
        ]);

        currentData = { mov, bolsa, eventuais, bpc };
        filteredData = { mov: [], bolsa: [], eventuais: [], bpc: [] };

        Object.keys(pagination).forEach(key => {
            pagination[key].page = 1;
        });

        await Promise.all([
            renderMov(),
            renderBolsa(),
            renderEventuais(),
            renderBpc(),
            renderLista()
        ]);

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar dados:', error);
        showNotification('Erro ao carregar dados do servidor', 'error');
    }
}

function filtrarMovimentacao() {
    const beneficio = document.getElementById('mov-beneficio')?.value;
    const nomeCpf = document.getElementById('mov-nomecpf')?.value.toLowerCase();
    const inicio = document.getElementById('mov-inicio')?.value;
    const fim = document.getElementById('mov-fim')?.value;
    const situacao = document.getElementById('mov-situacao')?.value;

    filteredData.mov = currentData.mov.filter(r => {
        if (beneficio && r.beneficio !== beneficio) return false;
        if (nomeCpf && !r.nome?.toLowerCase().includes(nomeCpf) && !r.cpf?.includes(nomeCpf)) return false;
        if (situacao && r.situacao !== situacao) return false;
        if (inicio && r.data && new Date(r.data) < new Date(inicio)) return false;
        if (fim && r.data && new Date(r.data) > new Date(fim)) return false;
        return true;
    });

    pagination.mov.page = 1;
    renderMov();
    showNotification(`${filteredData.mov.length} registros encontrados`, 'success');
}

function filtrarEventuais() {
    const tipo = document.getElementById('eventual-tipo')?.value;
    const nomeCpf = document.getElementById('eventual-nomecpf')?.value.toLowerCase();
    const inicio = document.getElementById('eventual-inicio')?.value;
    const fim = document.getElementById('eventual-fim')?.value;

    filteredData.eventuais = currentData.eventuais.filter(r => {
        if (tipo && r.tipo !== tipo) return false;
        if (nomeCpf && !r.nome?.toLowerCase().includes(nomeCpf) && !r.cpf?.includes(nomeCpf)) return false;
        if (inicio && r.data && new Date(r.data) < new Date(inicio)) return false;
        if (fim && r.data && new Date(r.data) > new Date(fim)) return false;
        return true;
    });

    pagination.eventuais.page = 1;
    renderEventuais();
    showNotification(`${filteredData.eventuais.length} registros encontrados`, 'success');
}

function filtrarBPC() {
    const nomeCpf = document.getElementById('bpc-nomecpf')?.value.toLowerCase();
    const nis = document.getElementById('bpc-nis')?.value;
    const situacao = document.getElementById('bpc-situacao')?.value;

    filteredData.bpc = currentData.bpc.filter(r => {
        if (nomeCpf && !r.nome?.toLowerCase().includes(nomeCpf) && !r.cpf?.includes(nomeCpf)) return false;
        if (nis && r.nis !== nis) return false;
        if (situacao && r.situacao !== situacao) return false;
        return true;
    });

    pagination.bpc.page = 1;
    renderBpc();
    showNotification(`${filteredData.bpc.length} registros encontrados`, 'success');
}

function limparFiltrosMov() {
    document.getElementById('mov-beneficio').value = '';
    document.getElementById('mov-nomecpf').value = '';
    document.getElementById('mov-inicio').value = '';
    document.getElementById('mov-fim').value = '';
    document.getElementById('mov-situacao').value = '';

    filteredData.mov = [];
    pagination.mov.page = 1;
    renderMov();
    showNotification('Filtros limpos', 'success');
}

function limparFiltrosLista() {
    document.getElementById('lista-beneficio').value = '';
    document.getElementById('lista-nomecpf').value = '';
    document.getElementById('lista-unidade').value = '';

    renderLista();
    showNotification('Filtros limpos', 'success');
}

function exportarBolsa() {
    try {
        const data = currentData.bolsa;
        const csv = convertToCSV(data);
        downloadFile(csv, 'bolsa-familia.csv', 'text/csv');
        showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao exportar dados', 'error');
    }
}

function exportarLista() {
    try {
        const listaMov = currentData.mov.map(r => ({
            nome: r.nome,
            cpf: r.cpf,
            beneficio: r.beneficio,
            situacao: r.situacao,
            inicio: r.data,
            unidade: r.unidade
        }));

        const listaEventuais = currentData.eventuais.map(r => ({
            nome: r.nome,
            cpf: r.cpf,
            beneficio: r.tipo,
            situacao: r.situacao,
            inicio: r.data,
            unidade: 'CRAS/CREAS'
        }));

        const listaBpc = currentData.bpc.map(r => ({
            nome: r.nome,
            cpf: r.cpf,
            beneficio: 'BPC',
            situacao: r.situacao,
            inicio: '—',
            unidade: 'Sec. Assistência'
        }));

        const listaBolsa = currentData.bolsa.map(r => ({
            nome: r.rf,
            cpf: '—',
            beneficio: 'Bolsa Família',
            situacao: r.situacao,
            inicio: r.entrada,
            unidade: 'CRAS'
        }));

        const listaConsolidada = [...listaMov, ...listaEventuais, ...listaBpc, ...listaBolsa];
        const csv = convertToCSV(listaConsolidada);
        downloadFile(csv, 'lista-beneficiarios.csv', 'text/csv');
        showNotification('Lista consolidada exportada com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao exportar lista', 'error');
    }
}

function importarBolsa() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showLoading('Importando dados...');
            showNotification('Funcionalidade de importação em desenvolvimento', 'info');
        } catch (error) {
            showNotification('Erro ao importar arquivo', 'error');
        } finally {
            hideLoading();
        }
    };

    input.click();
}

function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
