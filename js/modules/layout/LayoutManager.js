/**
 * Gerenciador de layout e modais
 */
export class LayoutManager {

    constructor() {
        this.modal = document.getElementById('modal-detalhes');
        this.modalNovoAtendimento = document.getElementById('modal-novo-atendimento');
    }

    /**
     * Inicializa o gerenciador de layout
     */
    init() {
        this.configurarEventListeners();
    }

    /**
     * Configura os event listeners para os modais
     */
    configurarEventListeners() {
        // Fechar modal ao clicar no botão de fechar
        const fecharModalBtn = document.getElementById('btn-fechar-modal');
        if (fecharModalBtn) {
            fecharModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Fechar modal ao clicar fora do conteúdo
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
            if (event.target === this.modalNovoAtendimento) {
                this.closeNovoAtendimentoModal();
            }
        });
    }

    /**
     * Abre o modal de detalhes
     */
    openModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Fecha o modal de detalhes
     */
    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Abre o modal de novo atendimento
     */
    openNovoAtendimentoModal() {
        if (this.modalNovoAtendimento) {
            this.modalNovoAtendimento.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Fecha o modal de novo atendimento
     */
    closeNovoAtendimentoModal() {
        if (this.modalNovoAtendimento) {
            this.modalNovoAtendimento.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Exibe uma mensagem de carregamento
     * @param {string} message - Mensagem a ser exibida
     */
    showLoading(message = 'Carregando...') {
        // Implementação para exibir um indicador de carregamento
        console.log('Loading:', message);
    }

    /**
     * Oculta a mensagem de carregamento
     */
    hideLoading() {
        // Implementação para ocultar o indicador de carregamento
        console.log('Loading hidden');
    }

    /**
     * Exibe uma mensagem de erro
     * @param {string} message - Mensagem de erro
     */
    showError(message) {
        // Implementação para exibir mensagem de erro
        console.error('Error:', message);
        alert(message); // Substituir por um toast ou modal de erro
    }
}
