// beneficios.js
// =============================
// Gerenciamento da página de Benefícios
// =============================

// Configuração da API
const API_BASE_URL = 'http://localhost:3000';

// Elementos da página
let tbodyMov, tbodyBolsa, tbodyEvent, tbodyBpc, tbodyLista;

// Estado da aplicação
let currentData = {
    mov: [],
    bolsa: [],
    eventuais: [],
    bpc: []
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadAllData();
});

function initializeElements() {
    // Obter referências das tabelas
    tbodyMov = document.querySelector('#tabela-mov tbody');
    tbodyBolsa = document.querySelector('#tabela-bolsa tbody');
    tbodyEvent = document.querySelector('#tabela-eventuais tbody');
    tbodyBpc = document.querySelector('#tabela-bpc tbody');
    tbodyLista = document.querySelector('#tabela-lista tbody');
}

function setupEventListeners() {
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
    document.getElementById('btn-exportar-geral')?.addEventListener('click', exportarGeral);
    document.getElementById('btn-exportar-bolsa')?.addEventListener('click', exportarBolsa);
    document.getElementById('btn-exportar-lista')?.addEventListener('click', exportarLista);

    // Botões de novo registro
    document.getElementById('btn-nova-mov')?.addEventListener('click', novaMovimentacao);
    document.getElementById('btn-novo-bolsa')?.addEventListener('click', novoBolsa);
    document.getElementById('btn-novo-eventual')?.addEventListener('click', novoEventual);
    document.getElementById('btn-novo-bpc')?.addEventListener('click', novoBPC);

    // Botões de filtro
    document.getElementById('btn-filtrar-mov')?.addEventListener('click', filtrarMovimentacao);
    document.getElementById('btn-filtrar-eventual')?.addEventListener('click', filtrarEventuais);
    document.getElementById('btn-filtrar-bpc')?.addEventListener('click', filtrarBPC);
    document.getElementById('btn-limpar-mov')?.addEventListener('click', limparFiltrosMov);
    document.getElementById('btn-limpar-lista')?.addEventListener('click', limparFiltrosLista);

    // Configurar modal
    document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModal);
    document.getElementById('modal-cancelar')?.addEventListener('click', fecharModal);
}

// ===== FUNÇÕES DE API =====
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        showNotification('Erro ao conectar com o servidor', 'error');
        throw error;
    }
}

// Movimentação
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

// Bolsa Família
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

// Benefícios Eventuais
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

// BPC
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

// ===== CARREGAMENTO DE DADOS =====
async function loadAllData() {
    try {
        showLoading('Carregando dados...');

        const [mov, bolsa, eventuais, bpc] = await Promise.all([
            getMovimentacao(),
            getBolsaFamilia(),
            getBeneficiosEventuais(),
            getBPC()
        ]);

        currentData = { mov, bolsa, eventuais, bpc };

        renderMov();
        renderBolsa();
        renderEventuais();
        renderBpc();
        renderLista();

        hideLoading();
        showNotification('Dados carregados com sucesso', 'success');
    } catch (error) {
        hideLoading();
        showNotification('Erro ao carregar dados', 'error');
    }
}

// ===== RENDERIZAÇÃO =====
function badge(situacao) {
    const map = {
        'Ativo':'status-ativo',
        'Suspenso':'status-suspenso',
        'Cancelado':'status-inativo',
        'Em Análise':'status-inativo',
        'Entregue':'status-ativo',
        'Concedido':'status-ativo',
        'ativo':'status-ativo',
        'suspenso':'status-suspenso',
        'cancelado':'status-inativo'
    };
    const cls = map[situacao] || 'status-ativo';
    return `<span class="status-badge ${cls}">${situacao}</span>`;
}

function renderMov() {
    const data = currentData.mov;
    tbodyMov.innerHTML = data.map(r => `
        <tr>
            <td>${r.beneficio || '—'}</td>
            <td>${r.nome || '—'}</td>
            <td>${r.cpf || '—'}</td>
            <td>${formatarData(r.data)}</td>
            <td>${r.acao || '—'}</td>
            <td>${badge(r.situacao || 'Ativo')}</td>
            <td>${r.unidade || '—'}</td>
            <td>
                <div class="inline-actions">
                    <button class="btn btn--outline btn-sm" data-view="mov" data-id="${r.id}">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-edit="mov" data-id="${r.id}">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-del="mov" data-id="${r.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Adicionar event listeners para os botões
    addActionListeners();
}

function renderBolsa() {
    const data = currentData.bolsa;
    tbodyBolsa.innerHTML = data.map(r => `
        <tr>
            <td>${r.rf || '—'}</td>
            <td>${r.nis || '—'}</td>
            <td>${r.grupo || '—'}</td>
            <td>${formatarData(r.entrada)}</td>
            <td>${formatarData(r.renovacao)}</td>
            <td>${badge(r.situacao || 'Ativo')}</td>
            <td>
                <div class="inline-actions">
                    <button class="btn btn--outline btn-sm" data-view="bolsa" data-id="${r.id}">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-edit="bolsa" data-id="${r.id}">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-del="bolsa" data-id="${r.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    addActionListeners();
}

function renderEventuais() {
    const data = currentData.eventuais;
    tbodyEvent.innerHTML = data.map(r => `
        <tr>
            <td>${r.tipo || '—'}</td>
            <td>${r.nome || '—'}</td>
            <td>${r.cpf || '—'}</td>
            <td>R$ ${r.valor ? Number(r.valor).toFixed(2) : '0,00'}</td>
            <td>${formatarData(r.data)}</td>
            <td>${badge(r.situacao || 'Ativo')}</td>
            <td>
                <div class="inline-actions">
                    <button class="btn btn--outline btn-sm" data-view="eventual" data-id="${r.id}">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-edit="eventual" data-id="${r.id}">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-del="eventual" data-id="${r.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    addActionListeners();
}

function renderBpc() {
    const data = currentData.bpc;
    tbodyBpc.innerHTML = data.map(r => `
        <tr>
            <td>${r.nome || '—'}</td>
            <td>${r.cpf || '—'}</td>
            <td>${r.nis || '—'}</td>
            <td>${r.categoria || '—'}</td>
            <td>${r.protocolo || '—'}</td>
            <td>${badge(r.situacao || 'Ativo')}</td>
            <td>
                <div class="inline-actions">
                    <button class="btn btn--outline btn-sm" data-view="bpc" data-id="${r.id}">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-edit="bpc" data-id="${r.id}">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="btn btn--outline btn-sm" data-del="bpc" data-id="${r.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    addActionListeners();
}

function renderLista() {
    // Criar lista consolidada
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

    tbodyLista.innerHTML = listaConsolidada.map(r => `
        <tr>
            <td>${r.nome || '—'}</td>
            <td>${r.cpf || '—'}</td>
            <td>${r.beneficio || '—'}</td>
            <td>${badge(r.situacao || 'Ativo')}</td>
            <td>${formatarData(r.inicio)}</td>
            <td>${r.unidade || '—'}</td>
            <td>
                <div class="inline-actions">
                    <button class="btn btn--outline btn-sm" data-view="lista">
                        <i class="fa fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== FUNÇÕES AUXILIARES =====
function formatarData(data) {
    if (!data || data === '—') return '—';
    return new Date(data).toLocaleDateString('pt-BR');
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.375rem;
        z-index: 10000;
        background: ${type === 'success' ? '#f0fdf4' : type === 'error' ? '#fef2f2' : '#eff6ff'};
        color: ${type === 'success' ? '#166534' : type === 'error' ? '#b91c1c' : '#1e40af'};
        border: 1px solid ${type === 'success' ? '#bbf7d0' : type === 'error' ? '#fecaca' : '#bfdbfe'};
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; margin-left: 1rem; cursor: pointer;">&times;</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function showLoading(message) {
    // Implementar loading se necessário
    console.log('Loading:', message);
}

function hideLoading() {
    // Implementar esconder loading se necessário
    console.log('Loading completo');
}

function addActionListeners() {
    // Adicionar event listeners para os botões de ação
    document.querySelectorAll('[data-view], [data-edit], [data-del]').forEach(btn => {
        btn.addEventListener('click', handleActionClick);
    });
}

async function handleActionClick(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.view ? 'view' : btn.dataset.edit ? 'edit' : 'del';
    const type = btn.dataset.view || btn.dataset.edit || btn.dataset.del;
    const id = btn.dataset.id;

    if (action === 'del') {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                if (type === 'mov') await deleteMovimentacao(id);
                if (type === 'bolsa') await deleteBolsaFamilia(id);
                if (type === 'eventual') await deleteBeneficioEventual(id);
                if (type === 'bpc') await deleteBPC(id);

                showNotification('Registro excluído com sucesso', 'success');
                await loadAllData(); // Recarregar todos os dados
            } catch (error) {
                showNotification('Erro ao excluir registro', 'error');
            }
        }
        return;
    }

    // Para visualizar/editar, abrir modal
    abrirModal(type, id, action);
}

function abrirModal(tipo, id, acao) {
    const modal = document.getElementById('modal-detalhes');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalCorpo = document.getElementById('modal-corpo');

    modalTitulo.textContent = `${acao === 'view' ? 'Visualizar' : 'Editar'} ${tipo}`;

    // Aqui você pode carregar os dados específicos do registro se necessário
    modalCorpo.innerHTML = `
        <p class="helper">${acao === 'view' ? 'Visualizando' : 'Editando'} registro ${id} do tipo ${tipo}.</p>
        <div class="form-group">
            <label class="form-label">ID do Registro</label>
            <input class="form-input" value="${id}" readonly>
        </div>
        <div class="form-group">
            <label class="form-label">Ação</label>
            <select class="form-input">
                <option>Visualizar dados</option>
                <option>Editar informações</option>
                <option>Exportar registro</option>
            </select>
        </div>
    `;

    modal.classList.add('modal--open');
}

function fecharModal() {
    document.getElementById('modal-detalhes').classList.remove('modal--open');
}

// ===== FUNÇÕES DE UI =====
function exportarGeral() {
    showNotification('Exportação geral iniciada', 'info');
}

function exportarBolsa() {
    showNotification('Exportar Bolsa Família iniciada', 'info');
}

function exportarLista() {
    showNotification('Exportar Lista Consolidada iniciada', 'info');
}

function novaMovimentacao() {
    showNotification('Abrir formulário de nova movimentação', 'info');
}

function novoBolsa() {
    showNotification('Abrir formulário de novo Bolsa Família', 'info');
}

function novoEventual() {
    showNotification('Abrir formulário de novo benefício eventual', 'info');
}

function novoBPC() {
    showNotification('Abrir formulário de novo BPC', 'info');
}

function filtrarMovimentacao() {
    showNotification('Filtrando movimentação...', 'info');
}

function filtrarEventuais() {
    showNotification('Filtrando benefícios eventuais...', 'info');
}

function filtrarBPC() {
    showNotification('Filtrando BPC...', 'info');
}

function limparFiltrosMov() {
    showNotification('Filtros de movimentação limpos', 'info');
}

function limparFiltrosLista() {
    showNotification('Filtros de lista limpos', 'info');
}

// ===== INICIALIZAÇÃO DE MÁSCARAS =====
function inicializarMascaras() {
    // Máscara para CPF
    const cpfInputs = document.querySelectorAll('input[data-mask="cpf"]');
    cpfInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 9) {
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else if (value.length > 6) {
                value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
            } else if (value.length > 3) {
                value = value.replace(/(\d{3})(\d+)/, '$1.$2');
            }

            e.target.value = value;
        });
    });

    // Máscara para NIS
    const nisInputs = document.querySelectorAll('input[data-mask="nis"]');
    nisInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            e.target.value = value;
        });
    });
}

// Inicializar máscaras quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', inicializarMascaras);
