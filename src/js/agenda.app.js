// ==========================================
// CONFIGURAÇÃO GLOBAL
// ==========================================
const API_BASE = '/api/agenda';
let eventosCache = [];
let agendamentosCache = [];
let atividadesCache = [];
let institucionalCache = [];

// ==========================================
// CLASSE AGENDAMANAGER COMPLETA
// ==========================================
class AgendaManager {
    constructor() {
        this.currentMonth = new Date();
        this.token = null;
        this.init();
    }

    async init() {
        if (!this.verificarAutenticacao()) return;
        this.token = localStorage.getItem('token');
        this.inicializarAbas();
        this.inicializarEventListeners();
        await this.carregarDadosIniciais();
    }

    verificarAutenticacao() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.mostrarNotificacao('Faça login primeiro', 'warning');
            setTimeout(() => window.location.href = '/pages/login.html', 2000);
            return false;
        }
        return true;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    async handleResponse(response) {
        if (response.status === 401) {
            this.mostrarNotificacao('Sessão expirada', 'error');
            localStorage.removeItem('token');
            setTimeout(() => window.location.href = '/pages/login.html', 2000);
            throw new Error('Não autenticado');
        }
        if (response.status === 403) {
            this.mostrarNotificacao('Sem permissão', 'error');
            throw new Error('Sem permissão');
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Erro HTTP: ${response.status}`);
        }
        return response.json();
    }

    // ==========================================
    // CONTROLE DE ABAS
    // ==========================================
    inicializarAbas() {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.getAttribute('data-tab');
                document.getElementById(`tab-${target}`)?.classList.add('active');
                this.carregarDadosAba(target);
            });
        });
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    inicializarEventListeners() {
        document.getElementById('btn-novo-evento')?.addEventListener('click', () =>
            this.abrirModal('modal-novo-evento'));
        document.getElementById('btn-novo-agendamento')?.addEventListener('click', () =>
            this.abrirModal('modal-novo-agendamento'));
        document.getElementById('btn-nova-atividade')?.addEventListener('click', () =>
            this.abrirModal('modal-nova-atividade'));
        document.getElementById('btn-novo-institucional')?.addEventListener('click', () =>
            this.abrirModal('modal-novo-institucional'));

        document.getElementById('btn-mes-anterior')?.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.atualizarCalendario();
        });
        document.getElementById('btn-mes-proximo')?.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.atualizarCalendario();
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.fecharModal(modal.id);
            });
        });
    }

    // ==========================================
    // MODAIS
    // ==========================================
    abrirModal(id) {
        document.getElementById(id).style.display = 'flex';
    }

    fecharModal(id) {
        const modal = document.getElementById(id);
        modal.style.display = 'none';
        modal.querySelector('form')?.reset();
    }

    // ==========================================
    // CARREGAR DADOS
    // ==========================================
    async carregarDadosIniciais() {
        try {
            this.showLoading();
            await Promise.all([
                this.carregarEventos(),
                this.carregarAgendamentos(),
                this.carregarAtividades(),
                this.carregarInstitucional()
            ]);
            this.atualizarCalendario();
        } catch (error) {
            console.error('Erro:', error);
        } finally {
            this.hideLoading();
        }
    }

    carregarDadosAba(aba) {
        switch(aba) {
            case 'agendamentos': this.carregarAgendamentos(); break;
            case 'atividades': this.carregarAtividades(); break;
            case 'institucional': this.carregarInstitucional(); break;
            default: this.carregarEventos();
        }
    }

    // ==========================================
    // CRUD EVENTOS
    // ==========================================
    async carregarEventos() {
        try {
            const response = await fetch(`${API_BASE}/eventos`, { headers: this.getHeaders() });
            eventosCache = await this.handleResponse(response);
            this.renderizarEventosCalendario(eventosCache);
            this.renderizarProximosEventos(eventosCache);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    async salvarEvento() {
        try {
            const form = document.getElementById('form-novo-evento');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const dados = {
                tipo: formData.get('tipo'),
                unidade: formData.get('unidade'),
                data: formData.get('data'),
                hora: formData.get('hora'),
                titulo: formData.get('titulo'),
                descricao: formData.get('descricao') || '',
                status: 'agendado'
            };

            this.showLoading();
            const response = await fetch(`${API_BASE}/eventos`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(dados)
            });

            await this.handleResponse(response);
            this.mostrarNotificacao('Evento salvo!', 'success');
            this.fecharModal('modal-novo-evento');
            await this.carregarEventos();
        } catch (error) {
            if (error.message !== 'Não autenticado') {
                this.mostrarNotificacao('Erro: ' + error.message, 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    async excluirEvento(id) {
        if (!confirm('Excluir este evento?')) return;
        try {
            this.showLoading();
            await fetch(`${API_BASE}/eventos/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            this.mostrarNotificacao('Evento excluído!', 'success');
            await this.carregarEventos();
        } catch (error) {
            this.mostrarNotificacao('Erro ao excluir', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // CRUD AGENDAMENTOS
    // ==========================================
    async carregarAgendamentos() {
        try {
            const response = await fetch(`${API_BASE}/agendamentos`, { headers: this.getHeaders() });
            agendamentosCache = await this.handleResponse(response);
            this.renderizarTabelaAgendamentos(agendamentosCache);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    async salvarAgendamento() {
        try {
            const form = document.getElementById('form-novo-agendamento');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const dados = {
                usuario: formData.get('usuario'),
                cpf_nis: formData.get('cpf_nis') || '',
                servico: formData.get('servico'),
                unidade: formData.get('unidade'),
                formato: formData.get('formato'),
                profissional: formData.get('profissional') || 'A definir',
                data: formData.get('data'),
                hora: formData.get('hora'),
                observacoes: formData.get('observacoes') || '',
                status: 'agendado'
            };

            this.showLoading();
            const response = await fetch(`${API_BASE}/agendamentos`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(dados)
            });

            await this.handleResponse(response);
            this.mostrarNotificacao('Agendamento salvo!', 'success');
            this.fecharModal('modal-novo-agendamento');
            await this.carregarAgendamentos();
        } catch (error) {
            if (error.message !== 'Não autenticado') {
                this.mostrarNotificacao('Erro: ' + error.message, 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    async excluirAgendamento(id) {
        if (!confirm('Excluir agendamento?')) return;
        try {
            this.showLoading();
            await fetch(`${API_BASE}/agendamentos/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            this.mostrarNotificacao('Agendamento excluído!', 'success');
            await this.carregarAgendamentos();
        } catch (error) {
            this.mostrarNotificacao('Erro ao excluir', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // CRUD ATIVIDADES
    // ==========================================
    async carregarAtividades() {
        try {
            const response = await fetch(`${API_BASE}/atividades`, { headers: this.getHeaders() });
            atividadesCache = await this.handleResponse(response);
            this.renderizarTabelaAtividades(atividadesCache);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    async salvarAtividade() {
        try {
            const form = document.getElementById('form-nova-atividade');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const dados = {
                titulo: formData.get('titulo'),
                unidade: formData.get('unidade'),
                descricao: formData.get('descricao') || '',
                dia_semana: formData.get('dia_semana'),
                horario: formData.get('horario'),
                coordenador: formData.get('coordenador'),
                vagas: parseInt(formData.get('vagas')) || 15,
                participantes: 0,
                observacoes: formData.get('observacoes') || '',
                status: 'ativo'
            };

            this.showLoading();
            const response = await fetch(`${API_BASE}/atividades`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(dados)
            });

            await this.handleResponse(response);
            this.mostrarNotificacao('Atividade salva!', 'success');
            this.fecharModal('modal-nova-atividade');
            await this.carregarAtividades();
        } catch (error) {
            if (error.message !== 'Não autenticado') {
                this.mostrarNotificacao('Erro: ' + error.message, 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // CRUD INSTITUCIONAL
    // ==========================================
    async carregarInstitucional() {
        try {
            const response = await fetch(`${API_BASE}/institucional`, { headers: this.getHeaders() });
            institucionalCache = await this.handleResponse(response);
            this.renderizarInstitucional(institucionalCache);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    async salvarInstitucional() {
        try {
            const form = document.getElementById('form-novo-institucional');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const dados = {
                titulo: formData.get('titulo'),
                data: formData.get('data'),
                hora: formData.get('hora'),
                pauta: formData.get('pauta'),
                representantes: formData.get('representantes'),
                local: formData.get('local') || '',
                observacoes: formData.get('observacoes') || '',
                status: 'agendado'
            };

            this.showLoading();
            const response = await fetch(`${API_BASE}/institucional`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(dados)
            });

            await this.handleResponse(response);
            this.mostrarNotificacao('Evento institucional salvo!', 'success');
            this.fecharModal('modal-novo-institucional');
            await this.carregarInstitucional();
        } catch (error) {
            if (error.message !== 'Não autenticado') {
                this.mostrarNotificacao('Erro: ' + error.message, 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // FILTROS
    // ==========================================
    filtrarAgendamentos() {
        const dataInicial = document.getElementById('filtro-data-inicial').value;
        const dataFinal = document.getElementById('filtro-data-final').value;
        const unidade = document.getElementById('filtro-unidade').value;
        const status = document.getElementById('filtro-status').value;

        let filtrados = [...agendamentosCache];

        if (dataInicial) {
            filtrados = filtrados.filter(a => a.data >= dataInicial);
        }
        if (dataFinal) {
            filtrados = filtrados.filter(a => a.data <= dataFinal);
        }
        if (unidade) {
            filtrados = filtrados.filter(a => a.unidade === unidade);
        }
        if (status) {
            filtrados = filtrados.filter(a => a.status === status);
        }

        this.renderizarTabelaAgendamentos(filtrados);
        this.mostrarNotificacao(`${filtrados.length} agendamento(s) encontrado(s)`, 'info');
    }

    limparFiltros() {
        document.getElementById('filtro-data-inicial').value = '';
        document.getElementById('filtro-data-final').value = '';
        document.getElementById('filtro-unidade').value = '';
        document.getElementById('filtro-status').value = '';
        this.renderizarTabelaAgendamentos(agendamentosCache);
    }

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================
    atualizarCalendario() {
        const currentMonthElement = document.querySelector('.current-month');
        if (currentMonthElement) {
            const options = { year: 'numeric', month: 'long' };
            currentMonthElement.textContent = this.currentMonth.toLocaleDateString('pt-BR', options);
        }
        this.gerarCalendario();
        this.renderizarEventosCalendario(eventosCache);
    }

    gerarCalendario() {
        const calendar = document.getElementById('calendar-grid');
        if (!calendar) return;

        calendar.innerHTML = '';
        const ano = this.currentMonth.getFullYear();
        const mes = this.currentMonth.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();
        const mesAnterior = new Date(ano, mes, 0).getDate();

        for (let i = primeiroDia - 1; i >= 0; i--) {
            calendar.appendChild(this.criarDiaCalendario(mesAnterior - i, true));
        }

        const hoje = new Date();
        for (let dia = 1; dia <= ultimoDia; dia++) {
            const isToday = hoje.getFullYear() === ano &&
                           hoje.getMonth() === mes &&
                           hoje.getDate() === dia;
            calendar.appendChild(this.criarDiaCalendario(dia, false, isToday));
        }

        const diasRestantes = 42 - (primeiroDia + ultimoDia);
        for (let dia = 1; dia <= diasRestantes; dia++) {
            calendar.appendChild(this.criarDiaCalendario(dia, true));
        }
    }

    criarDiaCalendario(numero, outroMes = false, isToday = false) {
        const dia = document.createElement('div');
        dia.className = 'calendar-day';
        if (outroMes) dia.classList.add('other-month');
        if (isToday) dia.classList.add('today');

        const numeroDia = document.createElement('div');
        numeroDia.className = 'day-number';
        numeroDia.textContent = numero;
        dia.appendChild(numeroDia);
        return dia;
    }

    renderizarEventosCalendario(eventos) {
        document.querySelectorAll('.calendar-day .event-preview').forEach(el => el.remove());

        eventos.forEach(evento => {
            const dataEvento = new Date(`${evento.data}T${evento.hora}`);
            const dia = dataEvento.getDate();
            const mes = dataEvento.getMonth();
            const ano = dataEvento.getFullYear();

            if (mes === this.currentMonth.getMonth() && ano === this.currentMonth.getFullYear()) {
                const dias = document.querySelectorAll('.calendar-day:not(.other-month)');
                const diaElement = Array.from(dias).find(diaEl => {
                    const numeroDia = parseInt(diaEl.querySelector('.day-number').textContent);
                    return numeroDia === dia;
                });

                if (diaElement) {
                    const eventoElement = document.createElement('div');
                    eventoElement.className = `event-preview ${evento.tipo}`;
                    eventoElement.textContent = evento.titulo;
                    eventoElement.title = evento.descricao || evento.titulo;
                    diaElement.appendChild(eventoElement);
                    diaElement.classList.add('has-events');
                }
            }
        });
    }

    renderizarProximosEventos(eventos) {
        const container = document.getElementById('proximos-eventos');
        if (!container) return;

        const agora = new Date();
        const eventosFuturos = eventos
            .filter(e => new Date(`${e.data}T${e.hora}`) > agora)
            .sort((a, b) => new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`))
            .slice(0, 5);

        if (eventosFuturos.length === 0) {
            container.innerHTML = '<p>Nenhum evento futuro.</p>';
            return;
        }

        container.innerHTML = eventosFuturos.map(e => `
            <div class="event-item">
                <div class="event-time">
                    <div class="event-hour">${e.hora}</div>
                    <div class="event-date">${new Date(e.data).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="event-details">
                    <div class="event-title">${e.titulo}</div>
                    <div class="event-description">${e.descricao || ''}</div>
                    <div class="event-participants"><i class="fas fa-map-marker-alt"></i> ${e.unidade || ''}</div>
                </div>
                <div class="event-actions">
                    <button class="btn btn--sm btn--outline" onclick="agendaManager.excluirEvento(${e.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderizarTabelaAgendamentos(agendamentos) {
        const tbody = document.getElementById('tabela-agendamentos');
        if (!tbody) return;

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">Nenhum agendamento.</td></tr>';
            return;
        }

        tbody.innerHTML = agendamentos.map(ag => `
            <tr>
                <td>${new Date(ag.data).toLocaleDateString('pt-BR')} ${ag.hora}</td>
                <td>${ag.usuario}</td>
                <td>${ag.servico}</td>
                <td>${ag.unidade || '-'}</td>
                <td>${ag.formato || '-'}</td>
                <td>${ag.profissional || '-'}</td>
                <td><span class="status-badge status-${ag.status}">${ag.status}</span></td>
                <td class="table-actions">
                    <button class="btn btn--sm btn--outline" onclick="agendaManager.excluirAgendamento(${ag.id})" title="Excluir">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderizarTabelaAtividades(atividades) {
        const tbody = document.getElementById('tabela-atividades');
        if (!tbody) return;

        if (atividades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Nenhuma atividade.</td></tr>';
            return;
        }

        tbody.innerHTML = atividades.map(at => `
            <tr>
                <td>${at.titulo}</td>
                <td>${at.descricao || '-'}</td>
                <td>${at.dia_semana}, ${at.horario}</td>
                <td>${at.unidade || '-'}</td>
                <td>${at.participantes}/${at.vagas || '-'}</td>
                <td>${at.coordenador || '-'}</td>
                <td class="table-actions">
                    <button class="btn btn--sm btn--outline" onclick="agendaManager.abrirListaPresenca(${at.id})" title="Lista Presença">
                        <i class="fas fa-clipboard-check"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderizarInstitucional(institucional) {
        const container = document.getElementById('lista-institucional');
        if (!container) return;

        if (institucional.length === 0) {
            container.innerHTML = '<p>Nenhum evento institucional.</p>';
            return;
        }

        container.innerHTML = institucional.map(e => `
            <div class="event-item">
                <div class="event-time">
                    <div class="event-hour">${e.hora}</div>
                    <div class="event-date">${new Date(e.data).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="event-details">
                    <div class="event-title">${e.titulo}</div>
                    <div class="event-description"><strong>Pauta:</strong> ${e.pauta || '-'}</div>
                    <div class="event-participants">
                        <i class="fas fa-users"></i> ${e.representantes || '-'}
                    </div>
                </div>
                <div class="event-actions">
                    <button class="btn btn--sm btn--outline" onclick="agendaManager.visualizarInstitucional(${e.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ==========================================
    // LISTA DE PRESENÇA
    // ==========================================
    abrirListaPresenca(atividadeId) {
        const atividade = atividadesCache.find(a => a.id === atividadeId);
        if (!atividade) return;

        const infoDiv = document.getElementById('presenca-info');
        infoDiv.innerHTML = `
            <h4>${atividade.titulo}</h4>
            <p><strong>Coordenador:</strong> ${atividade.coordenador}</p>
            <p><strong>Horário:</strong> ${atividade.dia_semana}, ${atividade.horario}</p>
        `;

        // Mock de participantes
        const participantes = [
            { nome: 'Maria Silva', presente: true },
            { nome: 'João Santos', presente: true },
            { nome: 'Ana Costa', presente: false }
        ];

        const container = document.getElementById('lista-presenca-container');
        container.innerHTML = participantes.map((p, i) => `
            <div class="presenca-item">
                <span>${i + 1}. ${p.nome}</span>
                <input type="checkbox" ${p.presente ? 'checked' : ''}>
            </div>
        `).join('');

        this.abrirModal('modal-lista-presenca');
    }

    imprimirListaPresenca() {
        window.print();
    }

    exportarPresencaExcel() {
        this.mostrarNotificacao('Exportação Excel em desenvolvimento', 'info');
    }

    // ==========================================
    // EXPORTAÇÃO/IMPRESSÃO
    // ==========================================
    imprimirCalendario() {
        window.print();
    }

    imprimirAgendamentos() {
        window.print();
    }

    imprimirAtividades() {
        window.print();
    }

    imprimirInstitucional() {
        window.print();
    }

    async baixarPDF(tipo) {
        this.mostrarNotificacao('Gerando PDF...', 'info');

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.text(`Relatório de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`, 20, 20);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);

            // Aqui você adicionaria o conteúdo específico
            doc.text('Conteúdo do relatório...', 20, 40);

            doc.save(`agenda_${tipo}_${Date.now()}.pdf`);
            this.mostrarNotificacao('PDF gerado com sucesso!', 'success');
        } catch (error) {
            this.mostrarNotificacao('Erro ao gerar PDF', 'error');
        }
    }

    gerarRelatorioAgendamentos() {
        const dataInicial = document.getElementById('filtro-data-inicial').value;
        const dataFinal = document.getElementById('filtro-data-final').value;

        let dados = agendamentosCache;
        if (dataInicial) dados = dados.filter(a => a.data >= dataInicial);
        if (dataFinal) dados = dados.filter(a => a.data <= dataFinal);

        const totalAgendamentos = dados.length;
        const porUnidade = {};
        const porStatus = {};

        dados.forEach(ag => {
            porUnidade[ag.unidade] = (porUnidade[ag.unidade] || 0) + 1;
            porStatus[ag.status] = (porStatus[ag.status] || 0) + 1;
        });

        alert(`RELATÓRIO DE AGENDAMENTOS\n\nTotal: ${totalAgendamentos}\n\nPor Unidade:\n${Object.entries(porUnidade).map(([k,v]) => `${k}: ${v}`).join('\n')}\n\nPor Status:\n${Object.entries(porStatus).map(([k,v]) => `${k}: ${v}`).join('\n')}`);
    }

    visualizarInstitucional(id) {
        const evento = institucionalCache.find(e => e.id === id);
        if (evento) {
            alert(`${evento.titulo}\n\nData: ${new Date(evento.data).toLocaleDateString('pt-BR')} ${evento.hora}\n\nPauta:\n${evento.pauta}\n\nRepresentantes:\n${evento.representantes}`);
        }
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        const notificacao = document.createElement('div');
        notificacao.className = `alert alert-${tipo}`;
        notificacao.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            min-width: 300px; padding: 1rem; border-radius: 8px;
            display: flex; align-items: center; gap: 0.5rem;
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

        const icones = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        notificacao.innerHTML = `
            <i class="fas fa-${icones[tipo] || 'info-circle'}"></i>
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; margin-left: auto; cursor: pointer; font-size: 1.25rem;">&times;</button>
        `;

        document.body.appendChild(notificacao);
        setTimeout(() => notificacao.remove(), 5000);
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
let agendaManager;
document.addEventListener('DOMContentLoaded', () => {
    agendaManager = new AgendaManager();
});

function logout() {
    if (confirm('Sair do sistema?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    }
}
