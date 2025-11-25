// ==========================================
// SISTEMA DE GERENCIAMENTO MELHORADO - v2.1 - COM EXCLUSÃO SUPER ADMIN
// usuarios.app.js
// ==========================================

console.log('🚀 Carregando Sistema de Gerenciamento v2.1...');

// CONFIGURAÇÃO GLOBAL
const APP_CONFIG = {
    api: {
        usuarios: '/api/usuarios',
        tenants: '/api/admin/tenants',
        auth: '/auth'
    },
    pagination: {
        itemsPerPage: 10,
        maxButtons: 5
    },
    cache: {
        ttl: 5 * 60 * 1000
    },
    debounce: {
        search: 500
    }
};

// ESTADO GLOBAL
let state = {
    usuarios: [],
    tenants: [],
    niveisAcesso: {},
    usuarioLogado: null, // ⭐ NOVO: Dados do usuário logado
    abaAtual: 'usuarios',
    pagination: {
        usuarios: { currentPage: 1, totalPages: 1 },
        tenants: { currentPage: 1, totalPages: 1 }
    },
    filters: {
        usuarios: {},
        tenants: {}
    },
    loading: false
};

// ==========================================
// UTILITÁRIOS
// ==========================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatarCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    return cnpj.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatarTelefone(telefone) {
    if (!telefone) return '';
    return telefone.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.charAt(10));
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// ⭐ NOVO: Função para verificar se é super admin
function isSuperAdmin() {
    return state.usuarioLogado &&
           (state.usuarioLogado.nivel_acesso_codigo === 'super_admin' ||
            state.usuarioLogado.nivel_acesso_codigo === 'superadmin');
}

// ==========================================
// NOTIFICAÇÕES E MODAIS
// ==========================================

function mostrarNotificacao(mensagem, tipo = 'info') {
    const cores = {
        success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: 'check-circle' },
        error: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: 'exclamation-circle' },
        warning: { bg: '#fffbeb', color: '#d97706', border: '#fed7aa', icon: 'exclamation-triangle' },
        info: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: 'info-circle' }
    };

    const cor = cores[tipo] || cores.info;
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        padding: 1rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: ${cor.bg};
        color: ${cor.color};
        border: 1px solid ${cor.border};
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease-out;
    `;

    notif.innerHTML = `
        <i class="fas fa-${cor.icon}"></i>
        <span style="flex: 1;">${mensagem}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 1.25rem; color: inherit;">&times;</button>
    `;

    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

function confirmar(titulo, mensagem) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;';

        overlay.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px;">
                <h3 style="margin-bottom: 1rem;">${titulo}</h3>
                <p style="margin-bottom: 1.5rem; color: #64748b;">${mensagem}</p>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn--outline" id="btn-cancel">Cancelar</button>
                    <button class="btn btn--primary" id="btn-confirm">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-confirm').onclick = () => {
            overlay.remove();
            resolve(true);
        };

        document.getElementById('btn-cancel').onclick = () => {
            overlay.remove();
            resolve(false);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        };
    });
}

function mostrarLoading(show = true) {
    let loading = document.getElementById('loading-overlay');

    if (show) {
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading-overlay';
            loading.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); z-index: 9998; display: flex; justify-content: center; align-items: center;';
            loading.innerHTML = '<div style="width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top-color: #483D8B; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>';
            document.body.appendChild(loading);
        }
        loading.style.display = 'flex';
    } else {
        if (loading) loading.style.display = 'none';
    }
}

// ==========================================
// API HELPERS
// ==========================================

function getHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        mostrarNotificacao('Faça login para continuar', 'error');
        setTimeout(() => window.location.href = '/pages/login.html', 2000);
        return {};
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensagem || data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// ⭐ NOVO: Carregar dados do usuário logado
async function carregarUsuarioLogado() {
    try {
        const data = await apiRequest('/auth/me');

        if (data.sucesso && data.dados) {
            state.usuarioLogado = data.dados;
            console.log('✅ Usuário logado:', state.usuarioLogado.nome, '- Nível:', state.usuarioLogado.nivel_acesso_codigo);
            return true;
        }
    } catch (error) {
        console.error('Erro ao carregar usuário logado:', error);
        // Tentar extrair do token JWT como fallback
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                state.usuarioLogado = {
                    id: payload.id || payload.userId,
                    nome: payload.nome || payload.name,
                    email: payload.email,
                    nivel_acesso_codigo: payload.nivel_acesso_codigo || payload.nivelAcesso || payload.role
                };
                console.log('✅ Dados do usuário extraídos do token');
                return true;
            }
        } catch (err) {
            console.error('Erro ao decodificar token:', err);
        }
    }
    return false;
}

// ==========================================
// CONTROLE DE ABAS
// ==========================================

function inicializarAbas() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => mudarAba(tab.dataset.tab));
    });
}

function mudarAba(aba) {
    state.abaAtual = aba;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${aba}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${aba}`).classList.add('active');

    const btnNovo = document.getElementById('btn-novo');
    const btnNovoText = document.getElementById('btn-novo-text');

    if (aba === 'usuarios') {
        btnNovoText.textContent = 'Novo Usuário';
        btnNovo.onclick = abrirModalNovoUsuario;
        if (state.usuarios.length === 0) carregarUsuarios();
    } else {
        btnNovoText.textContent = 'Nova Organização';
        btnNovo.onclick = abrirModalNovoTenant;
        if (state.tenants.length === 0) carregarTenants();
    }
}

// ==========================================
// USUÁRIOS - CARREGAMENTO
// ==========================================

async function carregarUsuarios() {
    try {
        mostrarLoading(true);
        const data = await apiRequest(APP_CONFIG.api.usuarios);

        if (data.sucesso) {
            state.usuarios = data.dados.map(u => ({
                ...u,
                ativo: Boolean(u.ativo)
            }));
            aplicarFiltrosUsuarios();
            await carregarEstatisticasUsuarios();
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        mostrarNotificacao('Erro ao carregar usuários', 'error');
    } finally {
        mostrarLoading(false);
    }
}

async function carregarEstatisticasUsuarios() {
    try {
        const data = await apiRequest(`${APP_CONFIG.api.usuarios}/meta/estatisticas`);

        if (data.sucesso) {
            document.getElementById('total-usuarios').textContent = data.dados.total;
            document.getElementById('usuarios-ativos').textContent = data.dados.ativos;
            document.getElementById('usuarios-inativos').textContent = data.dados.inativos;
            document.getElementById('usuarios-suspensos').textContent = data.dados.suspensos || 0;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function carregarNiveisAcesso() {
    try {
        const data = await apiRequest(`${APP_CONFIG.api.usuarios}/meta/niveis-acesso`);

        if (data.sucesso) {
            state.niveisAcesso = data.dados.reduce((acc, n) => ({ ...acc, [n.codigo]: n }), {});

            const selects = [
                document.getElementById('filter-nivel'),
                document.getElementById('usuario-nivel')
            ];

            selects.forEach(select => {
                if (!select) return;
                select.innerHTML = '<option value="">Todos/Selecione</option>';
                data.dados.forEach(n => {
                    const option = document.createElement('option');
                    option.value = n.codigo;
                    option.textContent = n.nome;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Erro ao carregar níveis:', error);
    }
}

// ==========================================
// USUÁRIOS - RENDERIZAÇÃO
// ==========================================

function renderizarUsuarios(usuariosList) {
    const tbody = document.getElementById('tbody-usuarios');
    if (!tbody) return;

    if (usuariosList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3;"></i>
                    <p>Nenhum usuário encontrado</p>
                </td>
            </tr>
        `;
        document.getElementById('pagination-usuarios').innerHTML = '';
        return;
    }

    const { currentPage } = state.pagination.usuarios;
    const itemsPerPage = APP_CONFIG.pagination.itemsPerPage;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = usuariosList.slice(startIndex, endIndex);

    state.pagination.usuarios.totalPages = Math.ceil(usuariosList.length / itemsPerPage);

    tbody.innerHTML = paginatedUsers.map(u => {
        // ⭐ MODIFICADO: Lógica de exibição do botão de exclusão
        const podeExcluir = isSuperAdmin() &&
                           u.nivel_acesso_codigo !== 'admin' &&
                           u.nivel_acesso_codigo !== 'super_admin' &&
                           u.nivel_acesso_codigo !== 'superadmin' &&
                           u.id !== state.usuarioLogado?.id; // Não pode excluir a si mesmo

        return `
        <tr>
            <td>${escapeHtml(u.nome)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.cargo || '-')}</td>
            <td><span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; background: #e0e7ff; color: #3730a3;">${escapeHtml(u.nivel_nome || u.nivel_acesso_codigo)}</span></td>
            <td><span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 500; background: ${u.ativo ? '#dcfce7' : '#fee2e2'}; color: ${u.ativo ? '#166534' : '#991b1b'};">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn--outline" onclick="visualizarUsuario(${u.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn--outline" onclick="editarUsuario(${u.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn--outline" onclick="alterarStatusUsuario(${u.id})" title="Status"><i class="fas fa-toggle-on"></i></button>
                ${podeExcluir ? `<button class="btn btn-sm btn--danger" onclick="excluirUsuario(${u.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>
        `;
    }).join('');

    renderizarPaginacao('usuarios', usuariosList.length);
}

// ==========================================
// PAGINAÇÃO
// ==========================================

function renderizarPaginacao(tipo, totalItems) {
    const container = document.getElementById(`pagination-${tipo}`);
    if (!container) return;

    const { currentPage } = state.pagination[tipo];
    const totalPages = Math.ceil(totalItems / APP_CONFIG.pagination.itemsPerPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="mudarPagina('${tipo}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer;">
            <i class="fas fa-chevron-left"></i> Anterior
        </button>
    `;

    const maxButtons = APP_CONFIG.pagination.maxButtons;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="mudarPagina('${tipo}', 1)" style="padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer;">1</button>`;
        if (startPage > 2) html += '<span style="padding: 0.5rem;">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button onclick="mudarPagina('${tipo}', ${i})" style="padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: ${i === currentPage ? '#483D8B' : 'white'}; color: ${i === currentPage ? 'white' : 'inherit'}; border-radius: 6px; cursor: pointer;">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<span style="padding: 0.5rem;">...</span>';
        html += `<button onclick="mudarPagina('${tipo}', ${totalPages})" style="padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer;">${totalPages}</button>`;
    }

    html += `
        <button onclick="mudarPagina('${tipo}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer;">
            Próxima <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = html;
}

function mudarPagina(tipo, page) {
    state.pagination[tipo].currentPage = page;
    if (tipo === 'usuarios') aplicarFiltrosUsuarios();
    else aplicarFiltrosTenants();
}

// ==========================================
// USUÁRIOS - FILTROS
// ==========================================

function aplicarFiltrosUsuarios() {
    const status = document.getElementById('filter-status-usuario').value;
    const nivel = document.getElementById('filter-nivel').value;
    const search = document.getElementById('search-input-usuario').value.toLowerCase();

    let filtrados = state.usuarios;

    if (status) {
        filtrados = filtrados.filter(u => u.ativo === (status === 'ativo'));
    }

    if (nivel) {
        filtrados = filtrados.filter(u => u.nivel_acesso_codigo === nivel);
    }

    if (search) {
        filtrados = filtrados.filter(u =>
            u.nome.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            (u.cpf && u.cpf.includes(search))
        );
    }

    renderizarUsuarios(filtrados);
}

function limparFiltrosUsuarios() {
    document.getElementById('filter-status-usuario').value = '';
    document.getElementById('filter-nivel').value = '';
    document.getElementById('search-input-usuario').value = '';
    state.pagination.usuarios.currentPage = 1;
    renderizarUsuarios(state.usuarios);
}

// ==========================================
// USUÁRIOS - CRUD
// ==========================================

function abrirModalNovoUsuario() {
    document.getElementById('modal-usuario-title').textContent = 'Novo Usuário';
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('senha-fields').style.display = 'grid';
    document.getElementById('usuario-senha').required = true;
    document.getElementById('usuario-senha-confirmar').required = true;
    document.getElementById('modal-usuario').style.display = 'flex';
}

function editarUsuario(id) {
    const usuario = state.usuarios.find(u => u.id === id);
    if (!usuario) return;

    document.getElementById('modal-usuario-title').textContent = 'Editar Usuário';
    document.getElementById('usuario-id').value = usuario.id;
    document.getElementById('usuario-nome').value = usuario.nome;
    document.getElementById('usuario-email').value = usuario.email;
    document.getElementById('usuario-cpf').value = formatarCPF(usuario.cpf || '');
    document.getElementById('usuario-telefone').value = formatarTelefone(usuario.telefone || '');
    document.getElementById('usuario-cargo').value = usuario.cargo || '';
    document.getElementById('usuario-unidade').value = usuario.unidade || '';
    document.getElementById('usuario-nivel').value = usuario.nivel_acesso_codigo;

    document.getElementById('senha-fields').style.display = 'none';
    document.getElementById('usuario-senha').required = false;
    document.getElementById('usuario-senha-confirmar').required = false;

    document.getElementById('modal-usuario').style.display = 'flex';
}

function visualizarUsuario(id) {
    const usuario = state.usuarios.find(u => u.id === id);
    if (!usuario) return;

    const statusTexto = usuario.ativo ? 'Ativo' : 'Inativo';
    const nivelNome = usuario.nivel_nome || state.niveisAcesso[usuario.nivel_acesso_codigo]?.nome || usuario.nivel_acesso_codigo;

    alert(`Nome: ${usuario.nome}\nEmail: ${usuario.email}\nCPF: ${formatarCPF(usuario.cpf) || '-'}\nTelefone: ${formatarTelefone(usuario.telefone) || '-'}\nCargo: ${usuario.cargo || '-'}\nUnidade: ${usuario.unidade || '-'}\nNível: ${nivelNome}\nStatus: ${statusTexto}`);
}

async function salvarUsuario(e) {
    e.preventDefault();

    const id = document.getElementById('usuario-id').value;
    const dados = {
        nome: document.getElementById('usuario-nome').value.trim(),
        email: document.getElementById('usuario-email').value.trim(),
        cpf: document.getElementById('usuario-cpf').value.replace(/\D/g, ''),
        telefone: document.getElementById('usuario-telefone').value.replace(/\D/g, ''),
        cargo: document.getElementById('usuario-cargo').value.trim(),
        unidade: document.getElementById('usuario-unidade').value.trim(),
        nivel_acesso_codigo: document.getElementById('usuario-nivel').value
    };

    if (!validarEmail(dados.email)) {
        mostrarNotificacao('Email inválido', 'error');
        return;
    }

    if (dados.cpf && !validarCPF(dados.cpf)) {
        mostrarNotificacao('CPF inválido', 'warning');
    }

    if (!id) {
        const senha = document.getElementById('usuario-senha').value;
        const senhaConfirmar = document.getElementById('usuario-senha-confirmar').value;

        if (senha !== senhaConfirmar) {
            mostrarNotificacao('As senhas não conferem', 'error');
            return;
        }

        if (senha.length < 6) {
            mostrarNotificacao('A senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }

        dados.senha = senha;
    }

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            id ? `${APP_CONFIG.api.usuarios}/${id}` : APP_CONFIG.api.usuarios,
            {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(dados)
            }
        );

        if (result.sucesso) {
            mostrarNotificacao(result.mensagem, 'success');
            fecharModalUsuario();
            await carregarUsuarios();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao salvar usuário', 'error');
    } finally {
        mostrarLoading(false);
    }
}

async function alterarStatusUsuario(id) {
    const usuario = state.usuarios.find(u => u.id === id);
    if (!usuario) return;

    const confirmarAlteracao = await confirmar(
        'Alterar Status',
        `Status atual: ${usuario.ativo ? 'ativo' : 'inativo'}\n\nDeseja alternar?`
    );

    if (!confirmarAlteracao) return;

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            `${APP_CONFIG.api.usuarios}/${id}/status`,
            {
                method: 'PATCH',
                body: JSON.stringify({ ativo: !usuario.ativo })
            }
        );

        if (result.sucesso) {
            mostrarNotificacao(result.mensagem, 'success');
            await carregarUsuarios();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao alterar status', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// ⭐ MODIFICADO: Função de exclusão com verificação de permissão
async function excluirUsuario(id) {
    // Verificar se é super admin
    if (!isSuperAdmin()) {
        mostrarNotificacao('Apenas Super Admins podem excluir usuários', 'error');
        return;
    }

    const usuario = state.usuarios.find(u => u.id === id);
    if (!usuario) return;

    // Não permitir excluir admins ou super admins
    if (usuario.nivel_acesso_codigo === 'admin' ||
        usuario.nivel_acesso_codigo === 'super_admin' ||
        usuario.nivel_acesso_codigo === 'superadmin') {
        mostrarNotificacao('Não é possível excluir administradores', 'error');
        return;
    }

    // Não permitir excluir a si mesmo
    if (usuario.id === state.usuarioLogado?.id) {
        mostrarNotificacao('Você não pode excluir sua própria conta', 'error');
        return;
    }

    const confirmarExclusao = await confirmar(
        '⚠️ Confirmar Exclusão',
        `Tem certeza que deseja excluir o usuário "${usuario.nome}"?\n\nEsta ação não pode ser desfeita e todos os dados associados serão permanentemente removidos.`
    );

    if (!confirmarExclusao) return;

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            `${APP_CONFIG.api.usuarios}/${id}`,
            { method: 'DELETE' }
        );

        if (result.sucesso) {
            mostrarNotificacao('✅ Usuário excluído com sucesso', 'success');
            await carregarUsuarios();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao excluir usuário', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function fecharModalUsuario() {
    document.getElementById('modal-usuario').style.display = 'none';
    document.getElementById('form-usuario').reset();
}

// ==========================================
// TENANTS - CARREGAMENTO
// ==========================================

async function carregarTenants() {
    try {
        mostrarLoading(true);
        const data = await apiRequest(APP_CONFIG.api.tenants);

        if (data.sucesso) {
            state.tenants = data.dados;
            aplicarFiltrosTenants();
            calcularEstatisticasTenants();
        }
    } catch (error) {
        console.error('Erro ao carregar tenants:', error);
        mostrarNotificacao('Erro ao carregar organizações', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function calcularEstatisticasTenants() {
    const total = state.tenants.length;
    const ativos = state.tenants.filter(t => t.status === 'ativo').length;
    const trial = state.tenants.filter(t => t.plano === 'trial' || t.dias_restantes <= 30).length;
    const totalUsuarios = state.tenants.reduce((sum, t) => sum + (t.usuarios_ativos || 0), 0);

    document.getElementById('total-tenants').textContent = total;
    document.getElementById('tenants-ativos').textContent = ativos;
    document.getElementById('tenants-trial').textContent = trial;
    document.getElementById('total-usuarios-tenants').textContent = totalUsuarios;
}

// ==========================================
// TENANTS - RENDERIZAÇÃO
// ==========================================

function renderizarTenants(lista) {
    const container = document.getElementById('tenants-container');

    if (lista.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #64748b;">
                <i class="fas fa-building" style="font-size: 3rem; opacity: 0.3;"></i>
                <p>Nenhuma organização encontrada</p>
            </div>
        `;
        document.getElementById('pagination-tenants').innerHTML = '';
        return;
    }

    const { currentPage } = state.pagination.tenants;
    const itemsPerPage = APP_CONFIG.pagination.itemsPerPage;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTenants = lista.slice(startIndex, endIndex);

    state.pagination.tenants.totalPages = Math.ceil(lista.length / itemsPerPage);

    container.innerHTML = paginatedTenants.map(t => {
        const statusClass = t.status === 'ativo' ? 'ativo' : t.status === 'trial' ? 'trial' : t.status === 'suspenso' ? 'suspenso' : 'cancelado';
        const expiring = t.dias_restantes <= 7 && t.dias_restantes > 0;
        const expired = t.dias_restantes < 0;
        const borderColor = expired ? '#ef4444' : expiring ? '#f59e0b' : 'transparent';

        // ⭐ NOVO: Botão de exclusão para tenants (apenas super admin)
        const btnExcluirTenant = isSuperAdmin() ?
            `<button class="btn btn-sm btn--danger" onclick="excluirTenant(${t.id})"><i class="fas fa-trash"></i> Excluir</button>` :
            '';

        return `
            <div style="background: white; border: 1px solid #e2e8f0; border-left: 4px solid ${borderColor}; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">${escapeHtml(t.nome_organizacao)}</div>
                        <div style="color: #483D8B; font-size: 0.9rem;">
                            <i class="fas fa-link"></i> <a href="https://fortalecesuas.${t.subdomain}" target="_blank">fortalecesuas.${escapeHtml(t.subdomain)}</a>
                        </div>
                    </div>
                    <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 500; background: ${statusClass === 'ativo' ? '#dcfce7' : statusClass === 'trial' ? '#dbeafe' : statusClass === 'suspenso' ? '#fef3c7' : '#f1f5f9'}; color: ${statusClass === 'ativo' ? '#166534' : statusClass === 'trial' ? '#1e40af' : statusClass === 'suspenso' ? '#92400e' : '#475569'};">${escapeHtml(t.status)}</span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; margin: 1rem 0;">
                    <div>
                        <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Plano</span>
                        <div style="font-size: 1rem; color: #1e293b; font-weight: 500;">${escapeHtml(t.plano)}</div>
                    </div>
                    <div>
                        <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Usuários</span>
                        <div style="font-size: 1rem; color: #1e293b; font-weight: 500;">${t.usuarios_ativos || 0}/${t.limite_usuarios}</div>
                    </div>
                    <div>
                        <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Vencimento</span>
                        <div style="font-size: 1rem; color: #1e293b; font-weight: 500;">${new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div>
                        <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Dias</span>
                        <div style="font-size: 1rem; font-weight: 500; color: ${expired ? '#ef4444' : expiring ? '#f59e0b' : '#166534'};">${t.dias_restantes}</div>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn btn-sm btn--outline" onclick="editarTenant(${t.id})"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-sm btn--outline" onclick="renovarTenant(${t.id})"><i class="fas fa-calendar-plus"></i> Renovar</button>
                    <button class="btn btn-sm btn--outline" onclick="alterarStatusTenant(${t.id}, '${t.status}')"><i class="fas fa-toggle-on"></i> Status</button>
                    <button class="btn btn-sm btn--outline" onclick="visualizarTenant(${t.id})"><i class="fas fa-eye"></i> Detalhes</button>
                    ${btnExcluirTenant}
                </div>
            </div>
        `;
    }).join('');

    renderizarPaginacao('tenants', lista.length);
}

// ==========================================
// TENANTS - FILTROS
// ==========================================

function aplicarFiltrosTenants() {
    const status = document.getElementById('filter-status-tenant').value;
    const plano = document.getElementById('filter-plano').value;
    const search = document.getElementById('search-input-tenant').value.toLowerCase();

    let filtrados = state.tenants;

    if (status) filtrados = filtrados.filter(t => t.status === status);
    if (plano) filtrados = filtrados.filter(t => t.plano === plano);
    if (search) filtrados = filtrados.filter(t =>
        t.nome_organizacao.toLowerCase().includes(search) ||
        t.subdomain.toLowerCase().includes(search)
    );

    renderizarTenants(filtrados);
}

function limparFiltrosTenants() {
    document.getElementById('filter-status-tenant').value = '';
    document.getElementById('filter-plano').value = '';
    document.getElementById('search-input-tenant').value = '';
    state.pagination.tenants.currentPage = 1;
    renderizarTenants(state.tenants);
}

// ==========================================
// TENANTS - CRUD
// ==========================================

function abrirModalNovoTenant() {
    document.getElementById('modal-tenant-title').textContent = 'Nova Organização';
    document.getElementById('form-tenant').reset();
    document.getElementById('tenant-id').value = '';

    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30);
    document.getElementById('tenant-vencimento').value = dataVencimento.toISOString().split('T')[0];

    document.getElementById('modal-tenant').style.display = 'flex';
}

function editarTenant(id) {
    const tenant = state.tenants.find(t => t.id === id);
    if (!tenant) return;

    document.getElementById('modal-tenant-title').textContent = 'Editar Organização';
    document.getElementById('tenant-id').value = tenant.id;
    document.getElementById('tenant-nome').value = tenant.nome_organizacao;
    document.getElementById('tenant-subdomain').value = tenant.subdomain;
    document.getElementById('tenant-subdomain').disabled = true;
    document.getElementById('tenant-cnpj').value = formatarCNPJ(tenant.cnpj || '');
    document.getElementById('tenant-email').value = tenant.email_contato;
    document.getElementById('tenant-plano').value = tenant.plano;
    document.getElementById('tenant-limite').value = tenant.limite_usuarios;
    document.getElementById('tenant-vencimento').value = tenant.data_vencimento.split('T')[0];

    document.getElementById('modal-tenant').style.display = 'flex';
}

function visualizarTenant(id) {
    const tenant = state.tenants.find(t => t.id === id);
    if (!tenant) return;

    alert(`Nome: ${tenant.nome_organizacao}\nSubdomínio: ${tenant.subdomain}\nCNPJ: ${formatarCNPJ(tenant.cnpj) || '-'}\nEmail: ${tenant.email_contato}\nPlano: ${tenant.plano}\nStatus: ${tenant.status}\nUsuários: ${tenant.usuarios_ativos || 0}/${tenant.limite_usuarios}\nVencimento: ${new Date(tenant.data_vencimento).toLocaleDateString('pt-BR')}\nDias: ${tenant.dias_restantes}\nCriado: ${new Date(tenant.created_at).toLocaleDateString('pt-BR')}`);
}

async function salvarTenant(e) {
    e.preventDefault();

    const id = document.getElementById('tenant-id').value;
    const dados = {
        subdomain: document.getElementById('tenant-subdomain').value.toLowerCase().trim(),
        nome_organizacao: document.getElementById('tenant-nome').value.trim(),
        cnpj: document.getElementById('tenant-cnpj').value.replace(/\D/g, ''),
        email_contato: document.getElementById('tenant-email').value.trim(),
        plano: document.getElementById('tenant-plano').value,
        limite_usuarios: parseInt(document.getElementById('tenant-limite').value),
        data_vencimento: document.getElementById('tenant-vencimento').value
    };

    if (!validarEmail(dados.email_contato)) {
        mostrarNotificacao('Email inválido', 'error');
        return;
    }

    if (!/^[a-z0-9-]+$/.test(dados.subdomain)) {
        mostrarNotificacao('Subdomínio deve conter apenas letras minúsculas, números e hífen', 'error');
        return;
    }

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            id ? `${APP_CONFIG.api.tenants}/${id}` : APP_CONFIG.api.tenants,
            {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(dados)
            }
        );

        if (result.sucesso) {
            mostrarNotificacao(result.mensagem, 'success');
            fecharModalTenant();
            await carregarTenants();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao salvar organização', 'error');
    } finally {
        mostrarLoading(false);
    }
}

async function renovarTenant(id) {
    const dias = prompt('Quantos dias deseja adicionar?', '30');
    if (!dias || isNaN(dias) || parseInt(dias) <= 0) {
        mostrarNotificacao('Valor inválido', 'error');
        return;
    }

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            `${APP_CONFIG.api.tenants}/${id}/renovar`,
            {
                method: 'POST',
                body: JSON.stringify({ dias: parseInt(dias) })
            }
        );

        if (result.sucesso) {
            mostrarNotificacao(result.mensagem, 'success');
            await carregarTenants();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao renovar', 'error');
    } finally {
        mostrarLoading(false);
    }
}

async function alterarStatusTenant(id, statusAtual) {
    const opcoes = ['ativo', 'trial', 'suspenso', 'cancelado'];
    const novoStatus = prompt(`Status atual: ${statusAtual}\nNovo status (${opcoes.join(', ')}):`, statusAtual);

    if (!novoStatus || !opcoes.includes(novoStatus)) {
        mostrarNotificacao('Status inválido', 'error');
        return;
    }

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            `${APP_CONFIG.api.tenants}/${id}/status`,
            {
                method: 'PATCH',
                body: JSON.stringify({ status: novoStatus })
            }
        );

        if (result.sucesso) {
            mostrarNotificacao(result.mensagem, 'success');
            await carregarTenants();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao alterar status', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// ⭐ NOVO: Função para excluir tenant (apenas super admin)
async function excluirTenant(id) {
    if (!isSuperAdmin()) {
        mostrarNotificacao('Apenas Super Admins podem excluir organizações', 'error');
        return;
    }

    const tenant = state.tenants.find(t => t.id === id);
    if (!tenant) return;

    const confirmarExclusao = await confirmar(
        '⚠️ ATENÇÃO: Exclusão de Organização',
        `Tem certeza que deseja excluir a organização "${tenant.nome_organizacao}"?\n\n` +
        `⚠️ ESTA AÇÃO IRÁ:\n` +
        `• Excluir todos os ${tenant.usuarios_ativos || 0} usuários\n` +
        `• Remover todos os dados da organização\n` +
        `• Liberar o subdomínio "${tenant.subdomain}"\n\n` +
        `Esta ação NÃO PODE ser desfeita!`
    );

    if (!confirmarExclusao) return;

    try {
        mostrarLoading(true);

        const result = await apiRequest(
            `${APP_CONFIG.api.tenants}/${id}`,
            { method: 'DELETE' }
        );

        if (result.sucesso) {
            mostrarNotificacao('✅ Organização excluída com sucesso', 'success');
            await carregarTenants();
        }
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao excluir organização', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function fecharModalTenant() {
    document.getElementById('modal-tenant').style.display = 'none';
    document.getElementById('form-tenant').reset();
    document.getElementById('tenant-subdomain').disabled = false;
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

async function verificarAutenticacao() {
    const token = localStorage.getItem('token');

    if (!token) {
        mostrarNotificacao('Acesso não autorizado. Faça login.', 'error');
        setTimeout(() => window.location.href = '/pages/login.html', 2000);
        return false;
    }

    try {
        await apiRequest('/auth/verificar');
        console.log('✅ Autenticação verificada');
        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('token');
        mostrarNotificacao('Sessão expirada. Faça login novamente.', 'error');
        setTimeout(() => window.location.href = '/pages/login.html', 2000);
        return false;
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function inicializar() {
    console.log('🔐 Verificando autenticação...');
    const autenticado = await verificarAutenticacao();
    if (!autenticado) return;

    // ⭐ NOVO: Carregar dados do usuário logado
    console.log('👤 Carregando dados do usuário logado...');
    await carregarUsuarioLogado();

    console.log('🎨 Inicializando interface...');
    inicializarAbas();

    // Formatação automática
    document.getElementById('usuario-cpf')?.addEventListener('input', (e) => {
        e.target.value = formatarCPF(e.target.value);
    });

    document.getElementById('usuario-telefone')?.addEventListener('input', (e) => {
        e.target.value = formatarTelefone(e.target.value);
    });

    document.getElementById('tenant-cnpj')?.addEventListener('input', (e) => {
        e.target.value = formatarCNPJ(e.target.value);
    });

    // Event listeners usuários
    document.getElementById('btn-aplicar-filtros-usuario')?.addEventListener('click', aplicarFiltrosUsuarios);
    document.getElementById('btn-limpar-filtros-usuario')?.addEventListener('click', limparFiltrosUsuarios);
    document.getElementById('search-input-usuario')?.addEventListener('input', debounce(aplicarFiltrosUsuarios, APP_CONFIG.debounce.search));

    // Event listeners tenants
    document.getElementById('btn-aplicar-filtros-tenant')?.addEventListener('click', aplicarFiltrosTenants);
    document.getElementById('btn-limpar-filtros-tenant')?.addEventListener('click', limparFiltrosTenants);
    document.getElementById('search-input-tenant')?.addEventListener('input', debounce(aplicarFiltrosTenants, APP_CONFIG.debounce.search));

    // Modal handlers
    document.getElementById('modal-usuario-close')?.addEventListener('click', fecharModalUsuario);
    document.getElementById('btn-cancelar-usuario')?.addEventListener('click', fecharModalUsuario);
    document.getElementById('modal-tenant-close')?.addEventListener('click', fecharModalTenant);
    document.getElementById('btn-cancelar-tenant')?.addEventListener('click', fecharModalTenant);

    // Form handlers
    document.getElementById('form-usuario')?.addEventListener('submit', salvarUsuario);
    document.getElementById('form-tenant')?.addEventListener('submit', salvarTenant);

    // Fechar modais ao clicar fora
    document.getElementById('modal-usuario')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-usuario') fecharModalUsuario();
    });

    document.getElementById('modal-tenant')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-tenant') fecharModalTenant();
    });

    console.log('📊 Carregando dados...');
    await carregarNiveisAcesso();
    await carregarUsuarios();

    console.log('✅ Sistema de gerenciamento v2.1 inicializado com sucesso!');

    // ⭐ NOVO: Mostrar indicador de nível de acesso
    if (isSuperAdmin()) {
        console.log('👑 Modo Super Admin ativado - Exclusão habilitada');
    }
}

// ==========================================
// CSS DINÂMICO
// ==========================================

const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e2e8f0;
}

.tab {
    padding: 1rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
}

.tab:hover {
    color: #483D8B;
}

.tab.active {
    color: #483D8B;
    border-bottom-color: #483D8B;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    transition: transform 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #483D8B;
    margin-bottom: 0.5rem;
}

.stat-label {
    color: #64748b;
    font-size: 0.9rem;
}

.table-container {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
}

th {
    background: #f8fafc;
    font-weight: 600;
    color: #1e293b;
}

tbody tr:hover {
    background: #f8fafc;
}

.filters {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-bottom: 2rem;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #1e293b;
}

.form-input, .form-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.form-input:focus, .form-select:focus {
    outline: none;
    border-color: #483D8B;
    box-shadow: 0 0 0 3px rgba(72, 61, 139, 0.1);
}

.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.2s;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-content {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.3s;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #64748b;
    transition: color 0.2s;
}

.modal-close:hover {
    color: #1e293b;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
}

.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
}

/* ⭐ NOVO: Estilo para botão de perigo (exclusão) */
.btn--danger {
    background-color: #dc2626;
    color: white;
    border: 1px solid #dc2626;
}

.btn--danger:hover {
    background-color: #b91c1c;
    border-color: #b91c1c;
}

.btn--danger:disabled {
    background-color: #fca5a5;
    border-color: #fca5a5;
    cursor: not-allowed;
    opacity: 0.6;
}
`;
document.head.appendChild(style);

// ==========================================
// AUTO-INICIALIZAÇÃO
// ==========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}

console.log('📦 usuarios.app.js v2.1 carregado - aguardando DOM...');
