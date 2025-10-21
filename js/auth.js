// Sistema de Autenticação Client-Side
// Incluir este script em todas as páginas protegidas

const Auth = {
    API_BASE: 'http://localhost:3000/auth',

    // Inicializar verificação de autenticação
    init() {
        // Páginas que não precisam de autenticação
        const paginasPublicas = ['login.html'];
        const paginaAtual = window.location.pathname.split('/').pop();

        // Se não for página pública, verificar autenticação
        if (!paginasPublicas.includes(paginaAtual)) {
            this.verificarAutenticacao();
        }
    },

    // Verificar se usuário está autenticado
    async verificarAutenticacao() {
        const token = this.getToken();

        if (!token) {
            this.redirecionarLogin();
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/verificar`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!data.sucesso) {
                // Sessão inválida ou expirada
                this.logout();
                return;
            }

            // Sessão válida, atualizar informações do usuário
            this.atualizarUsuarioLogado(data.sessao);

        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            // Em caso de erro, manter o usuário logado localmente
            // mas mostrar aviso
            this.mostrarAvisoConexao();
        }
    },

    // Obter token do localStorage
    getToken() {
        return localStorage.getItem('token');
    },

    // Obter usuário do localStorage
    getUsuario() {
        const usuarioStr = localStorage.getItem('usuario');
        return usuarioStr ? JSON.parse(usuarioStr) : null;
    },

    // Verificar se usuário tem permissão
    temPermissao(permissao) {
        const usuario = this.getUsuario();
        if (!usuario) return false;

        // Administrador tem todas as permissões
        if (usuario.nivel_acesso === 'administrador') return true;

        // Verificar se tem a permissão específica
        return usuario.permissoes && usuario.permissoes.includes(permissao);
    },

    // Verificar nível de acesso
    temNivel(nivel) {
        const usuario = this.getUsuario();
        if (!usuario) return false;
        return usuario.nivel_acesso === nivel;
    },

    // Fazer logout
    async logout() {
        const token = this.getToken();

        if (token) {
            try {
                await fetch(`${this.API_BASE}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
            }
        }

        // Limpar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');

        // Redirecionar para login
        this.redirecionarLogin();
    },

    // Redirecionar para login
    redirecionarLogin() {
        window.location.href = 'login.html';
    },

    // Atualizar informações do usuário logado na interface
    atualizarUsuarioLogado(sessao) {
        // Atualizar nome do usuário se houver elemento
        const nomeUsuarioElements = document.querySelectorAll('.usuario-logado-nome');
        nomeUsuarioElements.forEach(el => {
            el.textContent = sessao.nome;
        });

        // Atualizar cargo do usuário se houver elemento
        const cargoUsuarioElements = document.querySelectorAll('.usuario-logado-cargo');
        cargoUsuarioElements.forEach(el => {
            el.textContent = sessao.cargo;
        });

        // Atualizar unidade do usuário se houver elemento
        const unidadeUsuarioElements = document.querySelectorAll('.usuario-logado-unidade');
        unidadeUsuarioElements.forEach(el => {
            el.textContent = sessao.unidade;
        });
    },

    // Mostrar aviso de conexão
    mostrarAvisoConexao() {
        console.warn('Não foi possível verificar a sessão com o servidor. Trabalhando offline.');
    },

    // Fazer requisição autenticada
    async fetch(url, options = {}) {
        const token = this.getToken();

        if (!token) {
            throw new Error('Não autenticado');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Se retornar 401, sessão expirou
            if (response.status === 401) {
                this.logout();
                throw new Error('Sessão expirada');
            }

            return response;
        } catch (error) {
            throw error;
        }
    },

    // Ocultar elementos baseado em permissões
    ocultarPorPermissao() {
        // Elementos com data-permissao
        const elementosComPermissao = document.querySelectorAll('[data-permissao]');

        elementosComPermissao.forEach(el => {
            const permissaoRequerida = el.getAttribute('data-permissao');

            if (!this.temPermissao(permissaoRequerida)) {
                el.style.display = 'none';
            }
        });

        // Elementos com data-nivel
        const elementosComNivel = document.querySelectorAll('[data-nivel]');

        elementosComNivel.forEach(el => {
            const nivelRequerido = el.getAttribute('data-nivel');

            if (!this.temNivel(nivelRequerido)) {
                el.style.display = 'none';
            }
        });
    },

    // Adicionar informações do usuário ao header
    adicionarInfoUsuario() {
        const usuario = this.getUsuario();
        if (!usuario) return;

        // Procurar área de informações do usuário no header
        const userInfo = document.querySelector('.header-user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="user-details">
                    <div class="user-name">${usuario.nome}</div>
                    <div class="user-role">${usuario.cargo}</div>
                </div>
            `;
        }

        // Adicionar botão de logout se não existir
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Deseja realmente sair do sistema?')) {
                    this.logout();
                }
            });
        }
    }
};

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Auth.ocultarPorPermissao();
    Auth.adicionarInfoUsuario();
});

// Exportar para uso global
window.Auth = Auth;
