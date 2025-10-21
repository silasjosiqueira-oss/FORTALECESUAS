/**
 * Interceptor de Autenticação
 * Centraliza requisições HTTP com JWT
 */

class AuthInterceptor {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.token = null;
        this.loadToken();
    }

    loadToken() {
        this.token = localStorage.getItem('token');
    }

    saveToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    isAuthenticated() {
        return !!this.token;
    }

    redirectToLogin() {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html')) {
            localStorage.setItem('redirectAfterLogin', currentPage);
            window.location.href = 'login.html';
        }
    }

    async fetch(endpoint, options = {}) {
        // Verificar autenticação
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            throw new Error('Não autenticado');
        }

        // Preparar URL
        const url = endpoint.startsWith('http')
            ? endpoint
            : `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        // Configurar headers
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        // Se houver body e for objeto, converter para JSON
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);

            // Tratar erros de autenticação
            if (response.status === 401) {
                console.warn('🔒 Token inválido ou expirado');
                this.removeToken();
                this.redirectToLogin();
                throw new Error('Sessão expirada');
            }

            // Tratar erro de permissão
            if (response.status === 403) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Sem permissão para esta ação');
            }

            // Tratar outros erros HTTP
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || error.message || `Erro HTTP: ${response.status}`);
            }

            // Retornar resposta
            return response;

        } catch (error) {
            // Se for erro de rede
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('❌ Erro de conexão com o servidor');
                throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
            }
            throw error;
        }
    }

    // Métodos de conveniência
    async get(endpoint, options = {}) {
        return this.fetch(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data, options = {}) {
        return this.fetch(endpoint, {
            ...options,
            method: 'POST',
            body: data
        });
    }

    async put(endpoint, data, options = {}) {
        return this.fetch(endpoint, {
            ...options,
            method: 'PUT',
            body: data
        });
    }

    async delete(endpoint, options = {}) {
        return this.fetch(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }

    async patch(endpoint, data, options = {}) {
        return this.fetch(endpoint, {
            ...options,
            method: 'PATCH',
            body: data
        });
    }
}

// Criar instância global
const authFetch = new AuthInterceptor();

// Exportar para uso global
window.authFetch = authFetch;
