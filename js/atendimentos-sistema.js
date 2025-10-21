/**
 * Sistema de Gerenciamento de Atendimentos - Fortalece SUAS
 * Integrado com backend multi-tenant
 */

class SistemaFortalece {
    constructor() {
        this.apiUrl = '/api/atendimentos';
        this.authUrl = '/auth';
        this.token = localStorage.getItem('token');
        this.atendimentos = [];
        this.usuario = null;
        this.currentPage = 1;
        this.recordsPerPage = 10;
    }

    async init() {
        console.log('🚀 Inicializando Sistema Fortalece...');

        // Verificar autenticação
        if (!this.token) {
            console.warn('⚠️ Token não encontrado');
            this.redirectToLogin();
            return;
        }

        try {
            await this.verificarAutenticacao();
            this.setCurrentDate();
            await this.loadData();
            this.setupEventListeners();
            this.renderInitialData();
            this.atualizarInfoUsuario();
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showNotification('Erro ao carregar sistema. Verifique sua conexão.', 'error');
        }
    }

    async verificarAutenticacao() {
        try {
            const response = await fetch(`${this.authUrl}/verificar`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Sessão inválida');
            }

            const data = await response.json();

            if (!data.sucesso || !data.valido) {
                throw new Error('Sessão expirada');
            }

            console.log('✅ Sessão válida:', data.sessao);
            this.usuario = data.sessao;

        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            this.showNotification('Sua sessão expirou. Faça login novamente.', 'warning');
            localStorage.removeItem('token');
            this.redirectToLogin();
            throw error;
        }
    }

    redirectToLogin() {
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 2000);
    }

    atualizarInfoUsuario() {
        if (!this.usuario) return;

        // Atualizar informações do usuário no cabeçalho se houver elementos
        const userElements = document.querySelectorAll('[data-user-name]');
        userElements.forEach(el => {
            el.textContent = this.usuario.nome || 'Usuário';
        });

        const cargoElements = document.querySelectorAll('[data-user-cargo]');
        cargoElements.forEach(el => {
            el.textContent = this.usuario.cargo || 'N/A';
        });
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = ['dataInicial', 'dataFinal'];

        dateInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element && !element.value) {
                if (id.includes('Inicial')) {
                    const firstDay = new Date();
                    firstDay.setDate(1);
                    element.value = firstDay.toISOString().split('T')[0];
                } else {
                    element.value = today;
                }
            }
        });
    }

    async loadData() {
        try {
            console.log('🔄 Carregando atendimentos do servidor...');
            this.showLoading('Carregando atendimentos...');

            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Sessão expirada');
                }
                throw new Error(`Erro ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Atendimentos carregados:', data.length);

            this.atendimentos = this.normalizeAtendimentos(data);

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);

            if (error.message === 'Sessão expirada') {
                this.showNotification('Sua sessão expirou. Redirecionando...', 'warning');
                this.redirectToLogin();
            } else {
                this.showNotification('Erro ao carregar atendimentos', 'error');
                // Usar dados mock em caso de erro
                this.atendimentos = this.getMockAtendimentos();
            }
        } finally {
            this.hideLoading();
        }
    }

    normalizeAtendimentos(atendimentos) {
        return atendimentos.map(atendimento => ({
            id: atendimento.id,
            registro: atendimento.registro,
            dataHora: atendimento.data_hora || atendimento.dataHora,
            nomeCompleto: atendimento.nome_completo || atendimento.nomeCompleto,
            nomeUsuario: atendimento.nome_completo || atendimento.nomeUsuario,
            cpf: atendimento.cpf,
            telefone: atendimento.telefone,
            tecnicoResponsavel: atendimento.tecnico_responsavel || atendimento.tecnicoResponsavel,
            tipoAtendimento: atendimento.tipo_atendimento || atendimento.tipoAtendimento,
            unidade: atendimento.unidade,
            status: atendimento.status,
            prioridade: atendimento.prioridade,
            motivoAtendimento: atendimento.motivo_atendimento || atendimento.motivoAtendimento,
            dadosCompletos: atendimento.dados_completos
        }));
    }

    getMockAtendimentos() {
        console.warn('⚠️ Usando dados de exemplo (mock)');
        return [
            {
                id: 1,
                registro: '000001',
                dataHora: '2025-10-10T14:30:00',
                nomeCompleto: 'Maria Silva Santos',
                nomeUsuario: 'Maria Silva Santos',
                tecnicoResponsavel: 'Ana Costa - Assistente Social',
                tipoAtendimento: 'Acompanhamento Familiar PAIF',
                unidade: 'CRAS Centro',
                status: 'em-andamento',
                prioridade: 'normal',
                cpf: '123.456.789-00',
                telefone: '(51) 99999-1234',
                motivoAtendimento: 'Atendimento Social'
            },
            {
                id: 2,
                registro: '000002',
                dataHora: '2025-10-09T09:15:00',
                nomeCompleto: 'João Oliveira Silva',
                nomeUsuario: 'João Oliveira Silva',
                tecnicoResponsavel: 'Carlos Santos - Psicólogo',
                tipoAtendimento: 'Atendimento Psicológico',
                unidade: 'CRAS Vila Nova',
                status: 'concluido',
                prioridade: 'alta',
                cpf: '987.654.321-00',
                telefone: '(51) 98888-5678',
                motivoAtendimento: 'Atendimento Psicológico'
            },
            {
                id: 3,
                registro: '000003',
                dataHora: '2025-10-10T16:00:00',
                nomeCompleto: 'Ana Paula Costa',
                nomeUsuario: 'Ana Paula Costa',
                tecnicoResponsavel: 'Patricia Lima - Assistente Social',
                tipoAtendimento: 'Cadastro Único',
                unidade: 'Secretaria',
                status: 'aguardando',
                prioridade: 'urgente',
                cpf: '456.789.123-00',
                telefone: '(51) 97777-9999',
                motivoAtendimento: 'Atualização Cadastro Único'
            }
        ];
    }

    setupEventListeners() {
        const searchInputs = ['nomeUsuario', 'responsavelFamiliar', 'tecnicoResponsavel'];
        searchInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', () => {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => this.buscarAtendimentos(), 300);
                });
            }
        });

        console.log('✅ Event listeners configurados');
    }

    renderInitialData() {
        this.renderAtendimentos();
        this.updateAtendimentosAguardando();
        this.updateTotalRegistros();
        this.updateBadges();
    }

    updateBadges() {
        const totalAguardando = this.atendimentos.filter(a => a.status === 'aguardando').length;

        const badgeElement = document.getElementById('badge-atendimentos');
        if (badgeElement) {
            badgeElement.textContent = totalAguardando;
        }

        const totalBadge = document.getElementById('totalAguardandoBadge');
        if (totalBadge) {
            totalBadge.textContent = `${totalAguardando} aguardando`;
        }
    }

    renderAtendimentos(atendimentosFiltrados = null) {
        const atendimentos = atendimentosFiltrados || this.atendimentos;
        const tbody = document.getElementById('atendimentosTable');

        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = startIndex + this.recordsPerPage;
        const paginatedData = atendimentos.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem;">
                        <i class="fas fa-search fa-2x" style="color: #d1d5db; margin-bottom: 1rem;"></i>
                        <p>Nenhum atendimento encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = paginatedData.map(atendimento => {
            const dataFormatada = new Date(atendimento.dataHora || Date.now()).toLocaleString('pt-BR');
            const statusClass = this.getStatusClass(atendimento.status);
            const statusLabel = this.getStatusLabel(atendimento.status);

            return `
                <tr class="clickable" onclick="visualizarAtendimento(${atendimento.id})">
                    <td>
                        <strong>${atendimento.registro}</strong>
                        ${atendimento.prioridade === 'urgente' ? '<i class="fas fa-exclamation-triangle" style="color: #dc2626;" title="Urgente"></i>' : ''}
                    </td>
                    <td>${dataFormatada}</td>
                    <td>
                        <strong>${atendimento.nomeUsuario || atendimento.nomeCompleto}</strong>
                        <br><small>${atendimento.cpf || 'CPF não informado'}</small>
                    </td>
                    <td>${atendimento.tecnicoResponsavel || 'N/A'}</td>
                    <td>${atendimento.tipoAtendimento || 'N/A'}</td>
                    <td><span class="status-badge status-info">${atendimento.unidade || 'N/A'}</span></td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <div class="form-actions">
                            <button class="btn btn--success btn-xs" onclick="event.stopPropagation(); editarAtendimento(${atendimento.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn--warning btn-xs" onclick="event.stopPropagation(); continuarAtendimento(${atendimento.id})" title="Continuar">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn--info btn-xs" onclick="event.stopPropagation(); gerarRelatorioIndividual(${atendimento.id})" title="Relatório">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                            <button class="btn btn--danger btn-xs" onclick="event.stopPropagation(); excluirAtendimento(${atendimento.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderPagination(atendimentos.length);
        this.updateTotalRegistros(atendimentos.length);
    }

    renderPagination(totalRecords) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalRecords / this.recordsPerPage);
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <button onclick="sistemaFortalece.changePage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
        `;

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button onclick="sistemaFortalece.changePage(1)">1</button>`;
            if (startPage > 2) paginationHTML += `<span>...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="active">${i}</button>`;
            } else {
                paginationHTML += `<button onclick="sistemaFortalece.changePage(${i})">${i}</button>`;
            }
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHTML += `<span>...</span>`;
            paginationHTML += `<button onclick="sistemaFortalece.changePage(${totalPages})">${totalPages}</button>`;
        }

        paginationHTML += `
            <button onclick="sistemaFortalece.changePage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                Próximo <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        const totalPages = Math.ceil(this.atendimentos.length / this.recordsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderAtendimentos();
    }

    updateAtendimentosAguardando() {
        const aguardando = this.atendimentos.filter(a => a.status === 'aguardando');
        const tbody = document.getElementById('atendimentosAguardando');
        const totalElement = document.getElementById('totalAguardando');

        if (totalElement) {
            totalElement.textContent = aguardando.length;
        }

        if (!tbody) return;

        if (aguardando.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 2rem;">
                        <i class="fas fa-check-circle fa-2x" style="color: #059669; margin-bottom: 1rem;"></i>
                        <p>Nenhum atendimento aguardando</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = aguardando.map(atendimento => {
            const dataFormatada = new Date(atendimento.dataHora || Date.now()).toLocaleString('pt-BR');
            const prioridadeIcon = atendimento.prioridade === 'urgente' ? '<i class="fas fa-exclamation-triangle" style="color: #dc2626;" title="Urgente"></i>' : '';

            return `
                <tr>
                    <td><strong>${atendimento.registro}</strong> ${prioridadeIcon}</td>
                    <td>${dataFormatada}</td>
                    <td>
                        <strong>${atendimento.nomeUsuario || atendimento.nomeCompleto}</strong>
                        <br><small>${atendimento.telefone || 'Telefone não informado'}</small>
                    </td>
                    <td>${atendimento.motivoAtendimento || atendimento.tipoAtendimento}</td>
                    <td><span class="status-badge ${this.getPrioridadeClass(atendimento.prioridade)}">${this.getPrioridadeLabel(atendimento.prioridade)}</span></td>
                    <td><span class="status-badge status-aguardando">Aguardando</span></td>
                    <td>
                        <div class="form-actions">
                            <button class="btn btn--success btn-xs" onclick="iniciarAtendimento(${atendimento.id})" title="Iniciar">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn--info btn-xs" onclick="visualizarAtendimento(${atendimento.id})" title="Visualizar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn--warning btn-xs" onclick="reagendarAtendimento(${atendimento.id})" title="Reagendar">
                                <i class="fas fa-calendar"></i>
                            </button>
                            <button class="btn btn--danger btn-xs" onclick="excluirAtendimento(${atendimento.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateTotalRegistros(total = null) {
        const totalElement = document.getElementById('totalRegistros');
        if (totalElement) {
            const count = total !== null ? total : this.atendimentos.length;
            totalElement.textContent = `Total: ${count} registros`;
        }
    }

    buscarAtendimentos() {
        const filtros = {
            nomeUsuario: document.getElementById('nomeUsuario')?.value.toLowerCase() || '',
            responsavelFamiliar: document.getElementById('responsavelFamiliar')?.value.toLowerCase() || '',
            tecnicoResponsavel: document.getElementById('tecnicoResponsavel')?.value || '',
            status: document.getElementById('statusAtendimento')?.value || '',
            unidade: document.getElementById('unidadeFiltro')?.value || '',
            dataInicial: document.getElementById('dataInicial')?.value || '',
            dataFinal: document.getElementById('dataFinal')?.value || ''
        };

        const atendimentosFiltrados = this.atendimentos.filter(atendimento => {
            const nomeUser = (atendimento.nomeUsuario || atendimento.nomeCompleto || '').toLowerCase();
            const tecnico = (atendimento.tecnicoResponsavel || '').toLowerCase();
            const dataAtendimento = new Date(atendimento.dataHora).toISOString().split('T')[0];

            if (filtros.nomeUsuario && !nomeUser.includes(filtros.nomeUsuario)) return false;
            if (filtros.tecnicoResponsavel && !tecnico.includes(filtros.tecnicoResponsavel.toLowerCase())) return false;
            if (filtros.status && atendimento.status !== filtros.status) return false;
            if (filtros.unidade && atendimento.unidade !== this.getUnidadeLabel(filtros.unidade)) return false;
            if (filtros.dataInicial && dataAtendimento < filtros.dataInicial) return false;
            if (filtros.dataFinal && dataAtendimento > filtros.dataFinal) return false;

            return true;
        });

        this.currentPage = 1;
        this.renderAtendimentos(atendimentosFiltrados);
    }

    async excluirAtendimentoServidor(id, nomeUsuario) {
        try {
            this.showLoading('Excluindo atendimento...');

            const response = await fetch(`${this.apiUrl}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            this.showNotification(`Atendimento de "${nomeUsuario}" excluído com sucesso!`, 'success');
            await this.loadData();
            this.renderInitialData();

        } catch (error) {
            console.error('Erro ao excluir atendimento:', error);
            this.showNotification(`Erro ao excluir atendimento: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    getUnidadeLabel(value) {
        const labels = {
            'cras-centro': 'CRAS Centro',
            'cras-vila-nova': 'CRAS Vila Nova',
            'creas': 'CREAS',
            'secretaria': 'Secretaria'
        };
        return labels[value] || value;
    }

    getStatusClass(status) {
        const classes = {
            'aguardando': 'status-aguardando',
            'em-andamento': 'status-em-andamento',
            'concluido': 'status-concluido',
            'cancelado': 'status-cancelado',
            'agendado': 'status-agendado'
        };
        return classes[status] || 'status-em-andamento';
    }

    getStatusLabel(status) {
        const labels = {
            'aguardando': 'Aguardando',
            'em-andamento': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado',
            'agendado': 'Agendado'
        };
        return labels[status] || status;
    }

    getPrioridadeClass(prioridade) {
        const classes = {
            'normal': 'status-em-andamento',
            'alta': 'status-aguardando',
            'urgente': 'status-cancelado'
        };
        return classes[prioridade] || 'status-em-andamento';
    }

    getPrioridadeLabel(prioridade) {
        const labels = {
            'normal': 'Normal',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        return labels[prioridade] || 'Normal';
    }

    showLoading(message = 'Carregando...') {
        const loadingElement = document.getElementById('loading-overlay');
        const messageElement = document.getElementById('loading-message');

        if (messageElement) {
            messageElement.textContent = message;
        }
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading-overlay');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notifications-container');
        if (!container) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.style.cssText = 'margin-bottom: 1rem; min-width: 300px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); animation: slideIn 0.3s ease-out;';

        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; margin-left: auto; cursor: pointer; font-size: 1.25rem; color: inherit;">&times;</button>
        `;

        container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Inicializar o sistema quando a página carregar
let sistemaFortalece;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado, inicializando sistema...');
    sistemaFortalece = new SistemaFortalece();
    sistemaFortalece.init();
});
