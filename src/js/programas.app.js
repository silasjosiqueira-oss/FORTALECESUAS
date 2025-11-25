        // Variáveis globais
        const API_BASE = window.location.origin;

        // Dados simulados para estatísticas
        let estatisticasData = {
            totalAtendimentos: 1248,
            atendimentosMes: 156,
            aguardandoAtendimento: 23,
            totalBeneficios: 892,
            oficinasAtivas: 12,
            familiasCadastradas: 634
        };

        // Função para alternar entre tabs
        function switchTab(tabName) {
            // Remove active de todas as tabs e conteúdos
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Adiciona active na tab e conteúdo selecionados
            event.target.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        }

        // Aplicar filtros
        function aplicarFiltros() {
            const unidade = document.getElementById('filtroUnidade').value;
            const profissional = document.getElementById('filtroProfissional').value;
            const dataInicio = document.getElementById('dataInicio').value;
            const dataFim = document.getElementById('dataFim').value;

            console.log('Aplicando filtros:', {
                unidade,
                profissional,
                dataInicio,
                dataFim
            });

            // Aqui você implementaria a lógica de filtro
            // Por enquanto, apenas mostra uma mensagem
            alert('Filtros aplicados! (Funcionalidade em desenvolvimento)');
            atualizarEstatisticas();
        }

        // Limpar filtros
        function limparFiltros() {
            document.getElementById('filtroUnidade').value = '';
            document.getElementById('filtroProfissional').value = '';
            document.getElementById('dataInicio').value = '';
            document.getElementById('dataFim').value = '';
            atualizarEstatisticas();
        }

        // Atualizar estatísticas com dados reais
        async function atualizarEstatisticas() {
            try {
                const response = await fetch(`${API_BASE}/estatisticas/dashboard`);
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('totalAtendimentos').textContent = data.totalAtendimentos;
                    document.getElementById('atendimentosMes').textContent = data.atendimentosMes;
                    document.getElementById('aguardandoAtendimento').textContent = data.aguardandoAtendimento;
                    document.getElementById('totalBeneficios').textContent = data.totalBeneficios;
                    document.getElementById('oficinasAtivas').textContent = data.oficinasAtivas;
                    document.getElementById('familiasCadastradas').textContent = data.familiasCadastradas;
                } else {
                    // Em caso de erro, usa dados simulados
                    document.getElementById('totalAtendimentos').textContent = estatisticasData.totalAtendimentos;
                    document.getElementById('atendimentosMes').textContent = estatisticasData.atendimentosMes;
                    document.getElementById('aguardandoAtendimento').textContent = estatisticasData.aguardandoAtendimento;
                    document.getElementById('totalBeneficios').textContent = estatisticasData.totalBeneficios;
                    document.getElementById('oficinasAtivas').textContent = estatisticasData.oficinasAtivas;
                    document.getElementById('familiasCadastradas').textContent = estatisticasData.familiasCadastradas;
                }
            } catch (error) {
                console.error('Erro ao atualizar estatísticas:', error);
                // Mantém dados simulados em caso de erro
                document.getElementById('totalAtendimentos').textContent = estatisticasData.totalAtendimentos;
                document.getElementById('atendimentosMes').textContent = estatisticasData.atendimentosMes;
                document.getElementById('aguardandoAtendimento').textContent = estatisticasData.aguardandoAtendimento;
                document.getElementById('totalBeneficios').textContent = estatisticasData.totalBeneficios;
                document.getElementById('oficinasAtivas').textContent = estatisticasData.oficinasAtivas;
                document.getElementById('familiasCadastradas').textContent = estatisticasData.familiasCadastradas;
            }
        }

        // Abrir modal de relatório personalizado
        function openCustomReportModal() {
            document.getElementById('customReportModal').style.display = 'block';
        }

        // Fechar modal
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // Exportar gráfico específico
        function exportChart(chartType) {
            alert(`Exportando gráfico: ${chartType} (Funcionalidade em desenvolvimento)`);
        }

        // Funções de exportação
        function exportToPDF() {
            alert('Exportando para PDF... (Funcionalidade em desenvolvimento)');
        }

        function exportToExcel() {
            alert('Exportando para Excel... (Funcionalidade em desenvolvimento)');
        }

        function exportToCSV() {
            alert('Exportando para CSV... (Funcionalidade em desenvolvimento)');
        }

        function printReport() {
            window.print();
        }

        // Event Listeners
        document.getElementById('customReportForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(e.target);
            const reportTitle = document.getElementById('reportTitle').value;
            const reportPeriod = document.getElementById('reportPeriod').value;
            const reportFormat = document.getElementById('reportFormat').value;

            // Coletar dados selecionados
            const dadosIncluidos = [];
            document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked').forEach(checkbox => {
                dadosIncluidos.push(checkbox.id.replace('incluir-', ''));
            });

            console.log('Gerando relatório personalizado:', {
                titulo: reportTitle,
                periodo: reportPeriod,
                formato: reportFormat,
                dados: dadosIncluidos
            });

            alert('Gerando relatório personalizado... (Funcionalidade em desenvolvimento)');
            closeModal('customReportModal');
        });

        // Controle do período personalizado
        document.getElementById('reportPeriod').addEventListener('change', function(e) {
            const customPeriod = document.getElementById('customPeriod');
            if (e.target.value === 'personalizado') {
                customPeriod.style.display = 'block';
            } else {
                customPeriod.style.display = 'none';
            }
        });

        // Fechar modal clicando fora
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Inicializar página
        document.addEventListener('DOMContentLoaded', function() {
            atualizarEstatisticas();
        });

        // Função para buscar dados reais da API (implementar quando necessário)
        async function fetchEstatisticas() {
            try {
                // Implementar chamadas para as APIs
                // const atendimentos = await fetch(`${API_BASE}/atendimentos/estatisticas`);
                // const beneficios = await fetch(`${API_BASE}/beneficios/estatisticas`);
                // etc...

                console.log('Buscando estatísticas da API...');
            } catch (error) {
                console.error('Erro ao buscar estatísticas:', error);
            }
        }
