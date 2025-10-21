/**
 * Serviços para benefícios - Sistema SUAS
 * Gerencia a integração com APIs externas e serviços do sistema
 */

const BeneficiosService = {
    // Configurações da API
    config: {
        baseURL: '/api/suas',
        timeout: 30000,
        endpoints: {
            beneficios: '/beneficios',
            beneficiarios: '/beneficiarios',
            cadUnico: '/cadunico',
            suas: '/suas-integration',
            bpc: '/bpc-integration',
            bolsaFamilia: '/bolsa-familia',
            relatorios: '/relatorios'
        }
    },

    /**
     * Faz requisições HTTP genéricas
     */
    async makeRequest(method, endpoint, data = null) {
        try {
            const config = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            };

            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                config.body = JSON.stringify(data);
            }

            const response = await fetch(this.config.baseURL + endpoint, config);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            return {
                success: true,
                data: result,
                message: 'Operação realizada com sucesso'
            };

        } catch (error) {
            console.error('Erro na requisição:', error);
            return {
                success: false,
                error: error.message,
                message: 'Erro ao realizar operação'
            };
        }
    },

    /**
     * Obtém token de autenticação
     */
    getAuthToken() {
        // Em produção, seria obtido do localStorage ou sistema de autenticação
        return localStorage.getItem('suas_token') || 'demo_token';
    },

    /**
     * Serviços de Validação
     */
    validacao: {
        /**
         * Valida NIS
         */
        validarNIS(nis) {
            if (!nis || typeof nis !== 'string') return false;
            const nisLimpo = nis.replace(/\D/g, '');
            if (nisLimpo.length !== 11) return false;

            // Algoritmo de validação do NIS
            const sequencia = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            let soma = 0;

            for (let i = 0; i < 10; i++) {
                soma += parseInt(nisLimpo[i]) * sequencia[i];
            }

            let resto = soma % 11;
            let dv = resto < 2 ? 0 : 11 - resto;

            return dv === parseInt(nisLimpo[10]);
        },

        /**
         * Valida CPF
         */
        validarCPF(cpf) {
            if (!cpf || typeof cpf !== 'string') return false;
            const cpfLimpo = cpf.replace(/\D/g, '');

            if (cpfLimpo.length !== 11) return false;
            if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

            let soma = 0;
            for (let i = 0; i < 9; i++) {
                soma += parseInt(cpfLimpo[i]) * (10 - i);
            }
            let resto = soma % 11;
            let dv1 = resto < 2 ? 0 : 11 - resto;

            if (dv1 !== parseInt(cpfLimpo[9])) return false;

            soma = 0;
            for (let i = 0; i < 10; i++) {
                soma += parseInt(cpfLimpo[i]) * (11 - i);
            }
            resto = soma % 11;
            let dv2 = resto < 2 ? 0 : 11 - resto;

            return dv2 === parseInt(cpfLimpo[10]);
        },

        /**
         * Valida formato de data
         */
        validarData(data) {
            if (!data) return false;
            const dataObj = new Date(data);
            return !isNaN(dataObj.getTime());
        },

        /**
         * Valida valor monetário
         */
        validarValor(valor) {
            if (valor === null || valor === undefined) return false;
            const valorNum = parseFloat(valor);
            return !isNaN(valorNum) && valorNum >= 0;
        }
    },

    /**
     * Serviços utilitários
     */
    utils: {
        /**
         * Formata valor para moeda brasileira
         */
        formatarMoeda(valor) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(valor);
        },

        /**
         * Formata data para padrão brasileiro
         */
        formatarData(data) {
            if (!data) return '';
            return new Date(data).toLocaleDateString('pt-BR');
        },

        /**
         * Formata NIS para exibição
         */
        formatarNIS(nis) {
            if (!nis) return '';
            const nisLimpo = nis.replace(/\D/g, '');
            return nisLimpo.replace(/(\d{3})(\d{5})(\d{2})(\d{1})/, '$1.$2.$3-$4');
        },

        /**
         * Formata CPF para exibição
         */
        formatarCPF(cpf) {
            if (!cpf) return '';
            const cpfLimpo = cpf.replace(/\D/g, '');
            return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        },

        /**
         * Remove formatação de documentos
         */
        limparDocumento(documento) {
            return documento ? documento.replace(/\D/g, '') : '';
        }
    }
};viços de Benefícios
     */
    beneficios: {
        /**
         * Lista todos os benefícios com paginação
         */
        async listar(page = 1, limit = 10, filtros = {}) {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...filtros
            });

            return await BeneficiosService.makeRequest(
                'GET',
                `${BeneficiosService.config.endpoints.beneficios}?${queryParams}`
            );
        },

        /**
         * Busca benefício por ID
         */
        async buscarPorId(id) {
            return await BeneficiosService.makeRequest(
                'GET',
                `${BeneficiosService.config.endpoints.beneficios}/${id}`
            );
        },

        /**
         * Cria novo benefício
         */
        async criar(dadosBeneficio) {
            return await BeneficiosService.makeRequest(
                'POST',
                BeneficiosService.config.endpoints.beneficios,
                dadosBeneficio
            );
        },

        /**
         * Atualiza benefício existente
         */
        async atualizar(id, dadosBeneficio) {
            return await BeneficiosService.makeRequest(
                'PUT',
                `${BeneficiosService.config.endpoints.beneficios}/${id}`,
                dadosBeneficio
            );
        },

        /**
         * Remove benefício
         */
        async remover(id) {
            return await BeneficiosService.makeRequest(
                'DELETE',
                `${BeneficiosService.config.endpoints.beneficios}/${id}`
            );
        },

        /**
         * Busca benefícios por NIS
         */
        async buscarPorNIS(nis) {
            return await BeneficiosService.makeRequest(
                'GET',
                `${BeneficiosService.config.endpoints.beneficios}/nis/${nis}`
            );
        },

        /**
         * Atualiza situação do benefício
         */
        async atualizarSituacao(id, novaSituacao, motivo = '') {
            const dados = {
                situacao: novaSituacao,
                motivo: motivo,
                dataAlteracao: new Date().toISOString()
            };

            return await BeneficiosService.makeRequest(
                'PATCH',
                `${BeneficiosService.config.endpoints.beneficios}/${id}/situacao`,
                dados
            );
        }
    },

    /**
     * Serviços de Beneficiários
     */
    beneficiarios: {
        /**
         * Lista beneficiários
         */
        async listar(filtros = {}) {
            const queryParams = new URLSearchParams(filtros);
            return await BeneficiosService.makeRequest(
                'GET',
                `${BeneficiosService.config.endpoints.beneficiarios}?${queryParams}`
            );
        },

        /**
         * Busca beneficiário por CPF ou NIS
         */
        async buscar(documento) {
            return await BeneficiosService.makeRequest(
                'GET',
                `${BeneficiosService.config.endpoints.beneficiarios}/buscar/${documento}`
            );
        },

        /**
         * Cadastra novo beneficiário
         */
        async cadastrar(dadosBeneficiario) {
            return await BeneficiosService.makeRequest(
                'POST',
                BeneficiosService.config.endpoints.beneficiarios,
                dadosBeneficiario
            );
        }
    },

    /**
     * Serviços de Integração Externa
     */
    integracao: {
        /**
         * Importa dados do CadÚnico
         */
        async importarCadUnico() {
            try {
                const response = await BeneficiosService.makeRequest(
                    'POST',
                    BeneficiosService.config.endpoints.cadUnico + '/importar'
                );

                if (response.success) {
                    return {
                        success: true,
                        data: response.data,
                        message: 'Dados do CadÚnico importados com sucesso'
                    };
                }

                throw new Error(response.error || 'Erro na importação');

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao importar dados do CadÚnico'
                };
            }
        },

        /**
         * Importa dados do Bolsa Família
         */
        async importarBolsaFamilia() {
            try {
                const response = await BeneficiosService.makeRequest(
                    'POST',
                    BeneficiosService.config.endpoints.bolsaFamilia + '/importar'
                );

                return {
                    success: response.success,
                    data: response.data || {},
                    message: response.success ?
                        'Dados do Bolsa Família importados com sucesso' :
                        'Erro ao importar dados do Bolsa Família'
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao conectar com sistema do Bolsa Família'
                };
            }
        },

        /**
         * Importa dados do BPC
         */
        async importarBPC() {
            try {
                const response = await BeneficiosService.makeRequest(
                    'POST',
                    BeneficiosService.config.endpoints.bpc + '/importar'
                );

                return {
                    success: response.success,
                    data: response.data || {},
                    message: response.success ?
                        'Dados do BPC importados com sucesso' :
                        'Erro ao importar dados do BPC'
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao conectar com sistema do BPC'
                };
            }
        },

        /**
         * Sincroniza dados com sistema SUAS
         */
        async sincronizarSUAS() {
            try {
                const response = await BeneficiosService.makeRequest(
                    'POST',
                    BeneficiosService.config.endpoints.suas + '/sincronizar'
                );

                return {
                    success: response.success,
                    data: response.data || {},
                    message: response.success ?
                        'Sincronização com SUAS realizada com sucesso' :
                        'Erro na sincronização com SUAS'
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao sincronizar com sistema SUAS'
                };
            }
        },

        /**
         * Consulta situação no sistema externo
         */
        async consultarSituacaoExterna(nis, sistema = 'cadunico') {
            try {
                const endpoint = `/${sistema}/consultar/${nis}`;
                const response = await BeneficiosService.makeRequest('GET', endpoint);

                return {
                    success: response.success,
                    data: response.data || {},
                    message: response.success ?
                        'Consulta realizada com sucesso' :
                        'Erro na consulta externa'
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao consultar sistema externo'
                };
            }
        }
    },

    /**
     * Serviços de Relatórios
     */
    relatorios: {
        /**
         * Gera relatório geral de benefícios
         */
        async gerarRelatorioGeral(filtros = {}) {
            try {
                const queryParams = new URLSearchParams(filtros);
                const response = await BeneficiosService.makeRequest(
                    'GET',
                    `${BeneficiosService.config.endpoints.relatorios}/geral?${queryParams}`
                );

                return response;

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao gerar relatório geral'
                };
            }
        },

        /**
         * Gera relatório por período
         */
        async gerarRelatorioPeriodo(dataInicio, dataFim, tipoRelatorio = 'completo') {
            try {
                const dados = {
                    dataInicio,
                    dataFim,
                    tipo: tipoRelatorio
                };

                const response = await BeneficiosService.makeRequest(
                    'POST',
                    `${BeneficiosService.config.endpoints.relatorios}/periodo`,
                    dados
                );

                return response;

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao gerar relatório por período'
                };
            }
        },

        /**
         * Gera relatório estatístico
         */
        async gerarRelatorioEstatistico() {
            try {
                const response = await BeneficiosService.makeRequest(
                    'GET',
                    `${BeneficiosService.config.endpoints.relatorios}/estatisticas`
                );

                return response;

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao gerar relatório estatístico'
                };
            }
        },

        /**
         * Exporta relatório em PDF
         */
        async exportarPDF(tipoRelatorio, filtros = {}) {
            try {
                const dados = {
                    tipo: tipoRelatorio,
                    filtros,
                    formato: 'pdf'
                };

                const response = await fetch(
                    `${BeneficiosService.config.baseURL}${BeneficiosService.config.endpoints.relatorios}/exportar`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${BeneficiosService.getAuthToken()}`
                        },
                        body: JSON.stringify(dados)
                    }
                );

                if (!response.ok) {
                    throw new Error('Erro ao gerar PDF');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_beneficios_${new Date().getTime()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                return {
                    success: true,
                    message: 'Relatório PDF gerado com sucesso'
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Erro ao exportar relatório em PDF'
                };
            }
        }
    },

    /**
     * Ser
