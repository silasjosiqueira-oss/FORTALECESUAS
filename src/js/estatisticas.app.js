 // Theme Management
        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            if (newTheme === 'light') {
                html.removeAttribute('data-theme');
            } else {
                html.setAttribute('data-theme', newTheme);
            }

            localStorage.setItem('app-theme', newTheme);
            updateThemeButton(newTheme);
        }

        function updateThemeButton(theme) {
            const btn = document.getElementById('theme-toggle');
            if (btn) {
                const icon = btn.querySelector('i');
                if (theme === 'dark') {
                    icon.className = 'fas fa-sun';
                    btn.title = 'Mudar para tema claro';
                } else {
                    icon.className = 'fas fa-moon';
                    btn.title = 'Mudar para tema escuro';
                }
            }
        }

        // Simple notification system
        function showNotification(message, type = 'info') {
            const container = document.getElementById('notifications-container');
            if (!container) return;

            const colors = {
                success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: 'check-circle' },
                error: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: 'exclamation-circle' },
                warning: { bg: '#fffbeb', color: '#d97706', border: '#fed7aa', icon: 'exclamation-triangle' },
                info: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: 'info-circle' }
            };

            const style = colors[type] || colors.info;

            const notification = document.createElement('div');
            notification.style.cssText = `
                padding: 1rem;
                margin-bottom: 1rem;
                border-radius: 0.375rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                min-width: 300px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                background: ${style.bg};
                color: ${style.color};
                border: 1px solid ${style.border};
                animation: slideInRight 0.3s ease;
            `;

            notification.innerHTML = `
                <i class="fas fa-${style.icon}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()"
                        style="background: none; border: none; margin-left: auto; cursor: pointer; font-size: 1.25rem; color: inherit; opacity: 0.7;"
                        title="Fechar">&times;</button>
            `;

            container.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }

        // Chart.js Configuração
        let charts = {};

        function initCharts() {
            // Dados de exemplo para os gráficos
            const ctxAtendimentosTipo = document.getElementById('chartAtendimentosTipo').getContext('2d');
            charts.atendimentosTipo = new Chart(ctxAtendimentosTipo, {
                type: 'doughnut',
                data: {
                    labels: ['Atendimento Social', 'Atendimento Psicológico', 'Atualização Cadastro', 'Encaminhamentos', 'Outros'],
                    datasets: [{
                        data: [35, 25, 20, 15, 5],
                        backgroundColor: [
                            '#4f46e5',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#6b7280'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            const ctxBeneficiosPrograma = document.getElementById('chartBeneficiosPrograma').getContext('2d');
            charts.beneficiosPrograma = new Chart(ctxBeneficiosPrograma, {
                type: 'bar',
                data: {
                    labels: ['Bolsa Família', 'BPC', 'Auxílio Emergencial', 'Cesta Básica', 'Outros'],
                    datasets: [{
                        label: 'Quantidade',
                        data: [120, 85, 65, 42, 30],
                        backgroundColor: '#4f46e5',
                        borderColor: '#4f46e5',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            const ctxFaixaEtaria = document.getElementById('chartFaixaEtaria').getContext('2d');
            charts.faixaEtaria = new Chart(ctxFaixaEtaria, {
                type: 'pie',
                data: {
                    labels: ['0-12 anos', '13-17 anos', '18-29 anos', '30-59 anos', '60+ anos'],
                    datasets: [{
                        data: [15, 20, 25, 30, 10],
                        backgroundColor: [
                            '#4f46e5',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            const ctxAtendimentosMes = document.getElementById('chartAtendimentosMes').getContext('2d');
            charts.atendimentosMes = new Chart(ctxAtendimentosMes, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                    datasets: [{
                        label: 'Atendimentos',
                        data: [85, 92, 78, 105, 120, 98, 115, 130, 125, 140, 135, 150],
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        borderColor: '#4f46e5',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Popula tabela com dados de exemplo
        function populateTable() {
            const tableBody = document.querySelector('#tabela-dados tbody');
            const dados = [
                { id: 'AT001', nome: 'Maria Silva', tipo: 'Atendimento Social', data: '15/10/2023', localidade: 'CRAS Centro', idade: 35, genero: 'Feminino', status: 'Concluído' },
                { id: 'AT002', nome: 'João Santos', tipo: 'Atualização Cadastro', data: '14/10/2023', localidade: 'CRAS Bairro', idade: 42, genero: 'Masculino', status: 'Concluído' },
                { id: 'AT003', nome: 'Ana Oliveira', tipo: 'Atendimento Psicológico', data: '13/10/2023', localidade: 'CREAS', idade: 28, genero: 'Feminino', status: 'Em Andamento' },
                { id: 'AT004', nome: 'Pedro Costa', tipo: 'Encaminhamento', data: '12/10/2023', localidade: 'CRAS Centro', idade: 55, genero: 'Masculino', status: 'Concluído' },
                { id: 'AT005', nome: 'Carla Mendes', tipo: 'Atendimento Social', data: '11/10/2023', localidade: 'Secretaria', idade: 38, genero: 'Feminino', status: 'Concluído' },
                { id: 'AT006', nome: 'Roberto Alves', tipo: 'Atualização Cadastro', data: '10/10/2023', localidade: 'CRAS Bairro', idade: 61, genero: 'Masculino', status: 'Concluído' },
                { id: 'AT007', nome: 'Fernanda Lima', tipo: 'Atendimento Psicológico', data: '09/10/2023', localidade: 'CREAS', idade: 32, genero: 'Feminino', status: 'Em Andamento' },
                { id: 'AT008', nome: 'Ricardo Souza', tipo: 'Encaminhamento', data: '08/10/2023', localidade: 'CRAS Centro', idade: 47, genero: 'Masculino', status: 'Concluído' }
            ];

            tableBody.innerHTML = '';
            dados.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.nome}</td>
                    <td>${item.tipo}</td>
                    <td>${item.data}</td>
                    <td>${item.localidade}</td>
                    <td>${item.idade}</td>
                    <td>${item.genero}</td>
                    <td><span class="badge ${item.status === 'Concluído' ? 'badge--success' : 'badge--warning'}">${item.status}</span></td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Filtros
        function setupFilters() {
            const periodoSelect = document.getElementById('periodo');
            const dataInicioContainer = document.getElementById('data-inicio-container');
            const dataFimContainer = document.getElementById('data-fim-container');

            periodoSelect.addEventListener('change', function() {
                if (this.value === 'personalizado') {
                    dataInicioContainer.style.display = 'block';
                    dataFimContainer.style.display = 'block';
                } else {
                    dataInicioContainer.style.display = 'none';
                    dataFimContainer.style.display = 'none';
                }
            });

            document.getElementById('limpar-filtros').addEventListener('click', function() {
                document.querySelectorAll('.stats-filters select, .stats-filters input').forEach(element => {
                    if (element.type === 'select-one') {
                        element.selectedIndex = 0;
                    } else {
                        element.value = '';
                    }
                });
                dataInicioContainer.style.display = 'none';
                dataFimContainer.style.display = 'none';
                showNotification('Filtros limpos com sucesso', 'info');
            });

            document.getElementById('aplicar-filtros').addEventListener('click', function() {
                // Aqui você implementaria a lógica para aplicar os filtros
                showNotification('Filtros aplicados com sucesso', 'success');
                // Simulação de atualização dos dados
                setTimeout(() => {
                    // Atualiza alguns números para simular a filtragem
                    document.getElementById('total-atendimentos').textContent = '856';
                    document.getElementById('beneficios-ativos').textContent = '210';
                    document.getElementById('familias-cadastradas').textContent = '432';
                    document.getElementById('atividades-coletivas').textContent = '45';

                    // Atualiza a tabela
                    populateTable();
                }, 500);
            });

            // Botões de exportação
            document.getElementById('exportar-csv').addEventListener('click', function() {
                showNotification('Exportação para CSV iniciada', 'info');
                // Aqui você implementaria a lógica de exportação para CSV
            });

            document.getElementById('exportar-pdf').addEventListener('click', function() {
                showNotification('Exportação para PDF iniciada', 'info');
                // Aqui você implementaria a lógica de exportação para PDF
            });

            document.getElementById('imprimir').addEventListener('click', function() {
                window.print();
            });
        }

        // Initialize everything
        document.addEventListener('DOMContentLoaded', function() {
            // Setup theme
            const savedTheme = localStorage.getItem('app-theme') || 'light';
            updateThemeButton(savedTheme);

            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', toggleTheme);
            }

            // Inicializa gráficos
            initCharts();

            // Popula tabela
            populateTable();

            // Configura filtros
            setupFilters();

            // Simula carregamento de dados da API
            setTimeout(() => {
                showNotification('Dados estatísticos carregados com sucesso', 'success');
            }, 1000);
        });
