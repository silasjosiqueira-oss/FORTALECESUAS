  // Configuração da API
        const API_BASE = 'http://localhost:3000';

        class GruposAtividadesManager {
            constructor() {
                this.atividades = [];
                this.atividadeAtual = null;
                this.participantesAtual = [];
                this.presencasAtual = [];
                this.init();
            }

            async init() {
                await this.loadAtividades();
                this.updateStats();
                this.setupEventListeners();
            }

            setupEventListeners() {
                // Filtros com auto-aplicação
                ['filtroNome', 'filtroResponsavel', 'filtroUnidade', 'filtroStatus'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.addEventListener('input', () => this.aplicarFiltros());
                        el.addEventListener('change', () => this.aplicarFiltros());
                    }
                });

                // Busca de participantes
                const buscaParticipante = document.getElementById('buscaParticipante');
                if (buscaParticipante) {
                    buscaParticipante.addEventListener('input', () => this.filtrarParticipantes());
                }

                // Data atual na presença
                const dataPresenca = document.getElementById('dataPresenca');
                if (dataPresenca) {
                    dataPresenca.value = new Date().toISOString().split('T')[0];
                    dataPresenca.addEventListener('change', () => this.carregarPresencas());
                }
            }

            async loadAtividades() {
                try {
                    this.showLoading('Carregando atividades...');

                    // Tentar carregar do servidor
                    const response = await fetch(`${API_BASE}/atividades`);
                    if (response.ok) {
                        this.atividades = await response.json();
                    } else {
                        // Dados mock
                        this.atividades = this.getDadosMock();
                    }

                    this.renderAtividades();
                    this.updateStats();
                } catch (error) {
                    console.error('Erro ao carregar:', error);
                    this.atividades = this.getDadosMock();
                    this.renderAtividades();
                } finally {
                    this.hideLoading();
                }
            }

            getDadosMock() {
                return [
                    {
                        id: 1,
                        atividade: 'Grupo de Idosos - Convivência',
                        responsavel: 'Maria Silva',
                        educador: 'João Santos',
                        unidade: 'CRAS Centro',
                        localidade: 'Sala 1',
                        dia: 'Segunda',
                        horario: '14:00-16:00',
                        cargaHoraria: 8,
                        dataInicio: '2025-01-15',
                        dataTermino: '2025-12-15',
                        vagas: 30,
                        status: 'ativo',
                        descricao: 'Atividades de convivência para idosos',
                        participantes: []
                    },
                    {
                        id: 2,
                        atividade: 'Oficina de Artesanato',
                        responsavel: 'Ana Costa',
                        educador: 'Paula Lima',
                        unidade: 'CRAS Vila Nova',
                        localidade: 'Sala 2',
                        dia: 'Quarta',
                        horario: '09:00-11:00',
                        cargaHoraria: 8,
                        dataInicio: '2025-02-01',
                        vagas: 20,
                        status: 'ativo',
                        descricao: 'Oficina de artesanato e geração de renda',
                        participantes: []
                    }
                ];
            }

            renderAtividades(atividadesFiltradas = null) {
                const container = document.getElementById('gruposList');
                const atividades = atividadesFiltradas || this.atividades;

                if (atividades.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-users-cog"></i>
                            <h3>Nenhuma atividade encontrada</h3>
                            <p>Clique no botão "Nova Atividade" para criar a primeira.</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = atividades.map(ativ => {
                    const totalPartic = (ativ.participantes || []).length;
                    const vagasPreenchidas = ativ.vagas ? `${totalPartic}/${ativ.vagas}` : totalPartic;

                    return `
                        <div class="grupo-item" onclick="gruposManager.abrirDetalhes(${ativ.id})">
                            <div class="grupo-header">
                                <div style="flex: 1;">
                                    <div class="grupo-title">${ativ.atividade}</div>
                                    <div style="color: #64748b; margin-bottom: 0.5rem;">
                                        <i class="fas fa-user-tie"></i> ${ativ.responsavel} |
                                        <i class="fas fa-building"></i> ${ativ.unidade} |
                                        <i class="fas fa-calendar"></i> ${ativ.dia} ${ativ.horario}
                                    </div>
                                </div>
                                <span class="grupo-status status-${ativ.status}">${ativ.status}</span>
                            </div>

                            <div class="grupo-info">
                                <div class="info-item">
                                    <div class="info-value">${vagasPreenchidas}</div>
                                    <div class="info-label">Participantes</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-value">${ativ.dia}</div>
                                    <div class="info-label">Dia</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-value">${ativ.horario}</div>
                                    <div class="info-label">Horário</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-value">${ativ.cargaHoraria || '-'}h</div>
                                    <div class="info-label">Carga Horária</div>
                                </div>
                            </div>

                            ${ativ.descricao ? `<div style="margin-top: 1rem; color: #64748b;">${ativ.descricao}</div>` : ''}

                            <div class="grupo-actions" onclick="event.stopPropagation()">
                                <button class="btn btn--info btn-sm" onclick="gruposManager.abrirDetalhes(${ativ.id})">
                                    <i class="fas fa-eye"></i> Ver Detalhes
                                </button>
                                <button class="btn btn--warning btn-sm" onclick="gruposManager.editarGrupo(${ativ.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                ${ativ.status === 'ativo' ?
                                    `<button class="btn btn--secondary btn-sm" onclick="gruposManager.alterarStatus(${ativ.id}, 'inativo')">
                                        <i class="fas fa-pause"></i> Inativar
                                    </button>` :
                                    `<button class="btn btn--success btn-sm" onclick="gruposManager.alterarStatus(${ativ.id}, 'ativo')">
                                        <i class="fas fa-play"></i> Ativar
                                    </button>`
                                }
                                <button class="btn btn--danger btn-sm" onclick="gruposManager.excluirGrupo(${ativ.id})">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            updateStats() {
                const total = this.atividades.length;
                const ativos = this.atividades.filter(a => a.status === 'ativo').length;
                const totalParticipantes = this.atividades.reduce((sum, a) =>
                    sum + ((a.participantes || []).length), 0);

                const hoje = new Date();
                const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const diaHoje = diasSemana[hoje.getDay()];
                const atividadesHoje = this.atividades.filter(a =>
                    a.status === 'ativo' && a.dia === diaHoje).length;

                this.animateCounter(document.getElementById('totalGrupos'), total);
                this.animateCounter(document.getElementById('gruposAtivos'), ativos);
                this.animateCounter(document.getElementById('totalParticipantes'), totalParticipantes);
                this.animateCounter(document.getElementById('atividadesHoje'), atividadesHoje);
            }

            animateCounter(element, target) {
                if (!element) return;
                let current = 0;
                const increment = target / 20;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        element.textContent = target;
                        clearInterval(timer);
                    } else {
                        element.textContent = Math.floor(current);
                    }
                }, 50);
            }

            aplicarFiltros() {
                const nome = document.getElementById('filtroNome')?.value.toLowerCase() || '';
                const responsavel = document.getElementById('filtroResponsavel')?.value.toLowerCase() || '';
                const unidade = document.getElementById('filtroUnidade')?.value || '';
                const status = document.getElementById('filtroStatus')?.value || '';

                const filtradas = this.atividades.filter(ativ => {
                    const matchNome = !nome || ativ.atividade.toLowerCase().includes(nome);
                    const matchResp = !responsavel || ativ.responsavel.toLowerCase().includes(responsavel);
                    const matchUnid = !unidade || ativ.unidade === unidade;
                    const matchStatus = !status || ativ.status === status;

                    return matchNome && matchResp && matchUnid && matchStatus;
                });

                this.renderAtividades(filtradas);
            }

            limparFiltros() {
                document.getElementById('filtroNome').value = '';
                document.getElementById('filtroResponsavel').value = '';
                document.getElementById('filtroUnidade').value = '';
                document.getElementById('filtroStatus').value = '';
                this.renderAtividades();
            }

            async salvarGrupo() {
                const form = document.getElementById('formNovoGrupo');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const atividadeData = Object.fromEntries(formData);
                atividadeData.participantes = [];
                atividadeData.presencas = [];

                try {
                    this.showLoading('Salvando atividade...');

                    // Salvar no servidor
                    const response = await fetch(`${API_BASE}/atividades`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(atividadeData)
                    });

                    if (response.ok) {
                        const novaAtiv = await response.json();
                        this.atividades.push(novaAtiv);
                    } else {
                        // Fallback local
                        atividadeData.id = Date.now();
                        this.atividades.push(atividadeData);
                    }

                    this.renderAtividades();
                    this.updateStats();
                    closeModal('modalNovoGrupo');
                    form.reset();
                    this.showNotification('Atividade criada com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao salvar:', error);
                    // Salvar localmente
                    atividadeData.id = Date.now();
                    this.atividades.push(atividadeData);
                    this.renderAtividades();
                    this.updateStats();
                    closeModal('modalNovoGrupo');
                    form.reset();
                    this.showNotification('Atividade salva (modo offline)', 'warning');
                } finally {
                    this.hideLoading();
                }
            }

            editarGrupo(id) {
                const ativ = this.atividades.find(a => a.id === id);
                if (!ativ) return;

                document.getElementById('editId').value = ativ.id;
                document.getElementById('editAtividade').value = ativ.atividade || '';
                document.getElementById('editResponsavel').value = ativ.responsavel || '';
                document.getElementById('editEducador').value = ativ.educador || '';
                document.getElementById('editUnidade').value = ativ.unidade || '';
                document.getElementById('editLocalidade').value = ativ.localidade || '';
                document.getElementById('editDia').value = ativ.dia || '';
                document.getElementById('editHorario').value = ativ.horario || '';
                document.getElementById('editCargaHoraria').value = ativ.cargaHoraria || '';
                document.getElementById('editDataInicio').value = ativ.dataInicio || '';
                document.getElementById('editDataTermino').value = ativ.dataTermino || '';
                document.getElementById('editVagas').value = ativ.vagas || '';
                document.getElementById('editStatus').value = ativ.status || '';
                document.getElementById('editDescricao').value = ativ.descricao || '';

                openModal('modalEditarGrupo');
            }

            async atualizarGrupo() {
                const form = document.getElementById('formEditarGrupo');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const atividadeData = Object.fromEntries(formData);
                const id = parseInt(atividadeData.id);
                delete atividadeData.id;

                try {
                    this.showLoading('Atualizando...');

                    const response = await fetch(`${API_BASE}/atividades/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(atividadeData)
                    });

                    const index = this.atividades.findIndex(a => a.id === id);
                    if (index !== -1) {
                        this.atividades[index] = { ...this.atividades[index], ...atividadeData };
                    }

                    this.renderAtividades();
                    this.updateStats();
                    closeModal('modalEditarGrupo');
                    this.showNotification('Atividade atualizada!', 'success');
                } catch (error) {
                    console.error('Erro:', error);
                    const index = this.atividades.findIndex(a => a.id === id);
                    if (index !== -1) {
                        this.atividades[index] = { ...this.atividades[index], ...atividadeData };
                    }
                    this.renderAtividades();
                    closeModal('modalEditarGrupo');
                    this.showNotification('Atividade atualizada (offline)', 'warning');
                } finally {
                    this.hideLoading();
                }
            }

            async alterarStatus(id, novoStatus) {
                try {
                    this.showLoading('Alterando status...');

                    await fetch(`${API_BASE}/atividades/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: novoStatus })
                    });

                    const index = this.atividades.findIndex(a => a.id === id);
                    if (index !== -1) {
                        this.atividades[index].status = novoStatus;
                    }

                    this.renderAtividades();
                    this.updateStats();
                    this.showNotification(`Atividade ${novoStatus === 'ativo' ? 'ativada' : 'inativada'}!`, 'success');
                } catch (error) {
                    const index = this.atividades.findIndex(a => a.id === id);
                    if (index !== -1) {
                        this.atividades[index].status = novoStatus;
                    }
                    this.renderAtividades();
                    this.showNotification('Status alterado (offline)', 'warning');
                } finally {
                    this.hideLoading();
                }
            }

            async excluirGrupo(id) {
                if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;

                try {
                    this.showLoading('Excluindo...');

                    await fetch(`${API_BASE}/atividades/${id}`, {
                        method: 'DELETE'
                    });

                    this.atividades = this.atividades.filter(a => a.id !== id);
                    this.renderAtividades();
                    this.updateStats();
                    this.showNotification('Atividade excluída!', 'success');
                } catch (error) {
                    this.atividades = this.atividades.filter(a => a.id !== id);
                    this.renderAtividades();
                    this.showNotification('Atividade excluída (offline)', 'warning');
                } finally {
                    this.hideLoading();
                }
            }

            // ====================================
            // GESTÃO DE PARTICIPANTES
            // ====================================

            abrirDetalhes(id) {
                const ativ = this.atividades.find(a => a.id === id);
                if (!ativ) return;

                this.atividadeAtual = ativ;
                this.participantesAtual = ativ.participantes || [];

                document.getElementById('detalhesTitle').innerHTML =
                    `<i class="fas fa-info-circle"></i> ${ativ.atividade}`;

                document.getElementById('detalhesInfo').innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1rem;">
                        <div>
                            <strong>Responsável:</strong><br>${ativ.responsavel}
                        </div>
                        <div>
                            <strong>Educador:</strong><br>${ativ.educador || 'Não informado'}
                        </div>
                        <div>
                            <strong>Unidade:</strong><br>${ativ.unidade}
                        </div>
                        <div>
                            <strong>Localidade:</strong><br>${ativ.localidade || 'Não informado'}
                        </div>
                        <div>
                            <strong>Dia/Horário:</strong><br>${ativ.dia} ${ativ.horario}
                        </div>
                        <div>
                            <strong>Carga Horária:</strong><br>${ativ.cargaHoraria || 0}h semanais
                        </div>
                        <div>
                            <strong>Período:</strong><br>${ativ.dataInicio ? new Date(ativ.dataInicio).toLocaleDateString('pt-BR') : 'Não informado'} a ${ativ.dataTermino ? new Date(ativ.dataTermino).toLocaleDateString('pt-BR') : 'Em andamento'}
                        </div>
                        <div>
                            <strong>Vagas:</strong><br>${this.participantesAtual.length}/${ativ.vagas || '∞'}
                        </div>
                    </div>
                `;

                this.renderParticipantes();
                openModal('modalDetalhes');
            }

            renderParticipantes() {
                const tbody = document.getElementById('listaParticipantes');
                const total = document.getElementById('totalParticipantesTab');

                if (total) total.textContent = this.participantesAtual.length;

                if (this.participantesAtual.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
                                Nenhum participante cadastrado
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = this.participantesAtual.map(p => `
                    <tr>
                        <td>${p.nome}</td>
                        <td>${p.cpf}</td>
                        <td>${p.dataEntrada ? new Date(p.dataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>
                            <span class="badge ${
                                p.situacao === 'ativo' ? 'badge-success' :
                                p.situacao === 'desligado' ? 'badge-danger' : 'badge-warning'
                            }">${p.situacao}</span>
                        </td>
                        <td>
                            <button class="btn btn--danger btn-sm" onclick="gruposManager.excluirParticipante('${p.cpf}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            abrirModalNovoParticipante() {
                document.getElementById('formNovoParticipante').reset();
                document.querySelector('[name="dataEntrada"]').value = new Date().toISOString().split('T')[0];
                openModal('modalNovoParticipante');
            }

            salvarParticipante() {
                const form = document.getElementById('formNovoParticipante');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const participante = Object.fromEntries(formData);

                // Verificar se já existe
                if (this.participantesAtual.find(p => p.cpf === participante.cpf)) {
                    this.showNotification('Participante já cadastrado nesta atividade!', 'warning');
                    return;
                }

                this.participantesAtual.push(participante);
                this.atividadeAtual.participantes = this.participantesAtual;

                this.renderParticipantes();
                this.updateStats();
                closeModal('modalNovoParticipante');
                this.showNotification('Participante incluído!', 'success');
            }

            excluirParticipante(cpf) {
                if (!confirm('Tem certeza que deseja remover este participante?')) return;

                this.participantesAtual = this.participantesAtual.filter(p => p.cpf !== cpf);
                this.atividadeAtual.participantes = this.participantesAtual;

                this.renderParticipantes();
                this.updateStats();
                this.showNotification('Participante removido!', 'success');
            }

            filtrarParticipantes() {
                const busca = document.getElementById('buscaParticipante')?.value.toLowerCase() || '';
                // Implementar filtro se necessário
            }

            // ====================================
            // LISTA DE PRESENÇA
            // ====================================

            showTab(tabName) {
                // Desativar todos
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                // Ativar selecionado
                event.target.classList.add('active');
                document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');

                if (tabName === 'presenca') {
                    this.carregarPresencas();
                }
            }

            carregarPresencas() {
                const data = document.getElementById('dataPresenca')?.value;
                if (!data) return;

                const tbody = document.getElementById('listaPresencas');

                tbody.innerHTML = this.participantesAtual.map(p => `
                    <tr>
                        <td>${p.nome}</td>
                        <td>${new Date(data).toLocaleDateString('pt-BR')}</td>
                        <td>
                            <select class="form-control" style="width: auto;">
                                <option value="presente">Presente</option>
                                <option value="falta">Falta</option>
                                <option value="justificada">Justificada</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="form-control" placeholder="Observação">
                        </td>
                    </tr>
                `).join('');
            }

            registrarPresenca() {
                this.showNotification('Presença registrada com sucesso!', 'success');
            }

            imprimirListaPresenca() {
                window.print();
            }

            // ====================================
            // RELATÓRIOS
            // ====================================

            gerarRelatorioCompleto() {
                this.showNotification('Gerando relatório completo...', 'info');
                // Implementar geração de PDF
            }

            exportarParticipantes() {
                this.showNotification('Exportando lista de participantes...', 'info');
                // Implementar export Excel
            }

            gerarRelatorioFrequencia() {
                this.showNotification('Gerando relatório de frequência...', 'info');
            }

            gerarCertificados() {
                this.showNotification('Gerando certificados...', 'info');
            }

            // ====================================
            // UTILITÁRIOS
            // ====================================

            showLoading(message = 'Carregando...') {
                document.getElementById('loading-message').textContent = message;
                document.getElementById('loading-overlay').style.display = 'flex';
            }

            hideLoading() {
                document.getElementById('loading-overlay').style.display = 'none';
            }

            showNotification(message, type = 'info') {
                const container = document.getElementById('notifications-container');
                const notification = document.createElement('div');
                notification.className = `alert alert-${type}`;
                notification.innerHTML = `
                    <i class="fas fa-${
                        type === 'success' ? 'check-circle' :
                        type === 'error' ? 'exclamation-circle' :
                        type === 'warning' ? 'exclamation-triangle' : 'info-circle'
                    }"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.remove()" style="background: none; border: none; margin-left: auto; cursor: pointer; font-size: 1.25rem;">&times;</button>
                `;
                container.appendChild(notification);
                setTimeout(() => notification.remove(), 5000);
            }
        }

        // Funções globais
        function openModal(id) {
            document.getElementById(id)?.classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id)?.classList.remove('active');
        }

        // Inicializar
        let gruposManager;
        document.addEventListener('DOMContentLoaded', () => {
            gruposManager = new GruposAtividadesManager();
        });

        // Fechar modal ao clicar fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
