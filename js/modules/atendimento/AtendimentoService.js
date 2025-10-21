/**
 * Serviço para gerenciamento de atendimentos
 */
export class AtendimentoService {

    /**
     * Lista atendimentos recentes
     * @param {number} limite - Número máximo de atendimentos a retornar
     * @returns {Promise<Array>} - Array de atendimentos
     */
    static async listarRecentes(limite = 5) {
        try {
            // Simula uma requisição à API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Dados de exemplo - em um sistema real, isso viria de uma API
            const atendimentos = [
                {
                    id: 1,
                    registro: "AT2023001",
                    data: "2023-08-15",
                    usuario: "Maria Silva",
                    cidadao: "João da Silva",
                    responsavel: "Maria da Silva",
                    tipoPessoa: "Idoso",
                    situacao: "concluido"
                },
                {
                    id: 2,
                    registro: "AT2023002",
                    data: "2023-08-16",
                    usuario: "Carlos Souza",
                    cidadao: "Ana Oliveira",
                    responsavel: "",
                    tipoPessoa: "Adulto",
                    situacao: "andamento"
                },
                {
                    id: 3,
                    registro: "AT2023003",
                    data: "2023-08-17",
                    usuario: "Paula Mendes",
                    cidadao: "Pedro Costa",
                    responsavel: "",
                    tipoPessoa: "Criança",
                    situacao: "pendente"
                },
                {
                    id: 4,
                    registro: "AT2023004",
                    data: "2023-08-18",
                    usuario: "Ricardo Alves",
                    cidadao: "Mariana Santos",
                    responsavel: "José Santos",
                    tipoPessoa: "Adolescente",
                    situacao: "concluido"
                },
                {
                    id: 5,
                    registro: "AT2023005",
                    data: "2023-08-19",
                    usuario: "Fernanda Lima",
                    cidadao: "Antônio Rodrigues",
                    responsavel: "",
                    tipoPessoa: "Idoso",
                    situacao: "andamento"
                }
            ];

            // Retorna os atendimentos limitados
            return atendimentos.slice(0, limite);
        } catch (error) {
            console.error('Erro ao listar atendimentos recentes:', error);
            throw new Error('Não foi possível carregar os atendimentos');
        }
    }

    /**
     * Busca atendimento por ID
     * @param {number} id - ID do atendimento
     * @returns {Promise<Object>} - Dados do atendimento
     */
    static async buscarPorId(id) {
        try {
            // Simula uma requisição à API
            await new Promise(resolve => setTimeout(resolve, 800));

            // Em um sistema real, isso viria de uma API
            const atendimentos = await this.listarRecentes();
            return atendimentos.find(a => a.id === parseInt(id)) || null;
        } catch (error) {
            console.error('Erro ao buscar atendimento:', error);
            throw new Error('Não foi possível carregar o atendimento');
        }
    }

    /**
     * Pesquisa atendimentos com base em filtros
     * @param {Object} filtros - Objeto com os filtros de pesquisa
     * @returns {Promise<Array>} - Array de atendimentos filtrados
     */
    static async pesquisar(filtros) {
        try {
            // Simula uma requisição à API
            await new Promise(resolve => setTimeout(resolve, 800));

            // Obtém todos os atendimentos
            let resultados = await this.listarRecentes(50);

            // Aplica filtros
            if (filtros.nome) {
                resultados = resultados.filter(a =>
                    a.cidadao.toLowerCase().includes(filtros.nome.toLowerCase()));
            }

            if (filtros.cpf) {
                // Em um sistema real, haveria uma verificação por CPF
                resultados = resultados; // Filtro não implementado nos dados de exemplo
            }

            if (filtros.status) {
                resultados = resultados.filter(a => a.situacao === filtros.status);
            }

            if (filtros.dataInicio && filtros.dataFim) {
                // Em um sistema real, filtraria por data
                resultados = resultados; // Filtro não implementado nos dados de exemplo
            }

            return resultados;
        } catch (error) {
            console.error('Erro ao pesquisar atendimentos:', error);
            throw new Error('Não foi possível realizar a pesquisa');
        }
    }

    /**
     * Exclui um atendimento
     * @param {number} id - ID do atendimento a ser excluído
     * @returns {Promise<boolean>} - True se foi excluído com sucesso
     */
    static async excluir(id) {
        try {
            // Simula uma requisição à API
            await new Promise(resolve => setTimeout(resolve, 500));

            // Simulação da exclusão
            console.log(`Atendimento ${id} excluído com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao excluir atendimento:', error);
            throw new Error('Não foi possível excluir o atendimento');
        }
    }

    /**
     * Salva um novo atendimento
     * @param {Object} atendimento - Dados do atendimento a ser salvo
     * @returns {Promise<Object>} - Dados do atendimento salvo
     */
    static async salvar(atendimento) {
        try {
            // Simula uma requisição à API
            await new Promise(resolve => setTimeout(resolve, 500));

            // Em um sistema real, isso seria um POST para salvar os dados
            atendimento.id = Date.now();
            console.log(`Atendimento ${atendimento.id} salvo com sucesso`);
            return atendimento;
        } catch (error) {
            console.error('Erro ao salvar atendimento:', error);
            throw new Error('Não foi possível salvar o atendimento');
        }
    }
}
