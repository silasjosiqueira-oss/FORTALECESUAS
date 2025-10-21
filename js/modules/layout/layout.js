/**
 * MÃ³dulo de Gerenciamento de Layout
 * ResponsÃ¡vel por: sidebar, header, modais e componentes globais
 */
export class LayoutManager {
  constructor() {
    this.sidebar = document.querySelector('.sidebar');
    this.sidebarToggles = document.querySelectorAll('[data-toggle="sidebar"]');
    this.modals = document.querySelectorAll('.modal');
  }

  /**
   * Inicializa todos os componentes de layout
   */
  init() {
    this._setupSidebar();
    this._setupModals();
    this._setupTooltips();
    this._setupActiveMenu();
    this._setupResponsiveChecks();
  }

  /**
   * Configura o comportamento da sidebar
   * @private
   */
  _setupSidebar() {
    // Toggle sidebar em dispositivos mÃ³veis
    this.sidebarToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed');
      });
    });

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
      const isMobile = window.innerWidth < 992;
      const isSidebar = e.target.closest('.sidebar');
      const isToggle = e.target.closest('[data-toggle="sidebar"]');

      if (isMobile && !isSidebar && !isToggle && !this.sidebar.classList.contains('collapsed')) {
        this.sidebar.classList.add('collapsed');
      }
    });
  }

  /**
   * Configura modais do sistema
   * @private
   */
  _setupModals() {
    this.modals.forEach(modal => {
      const closeBtn = modal.querySelector('.modal__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    });

    // Abrir modais por data-target
    document.querySelectorAll('[data-target="modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modalId;
        document.getElementById(modalId)?.classList.add('active');
      });
    });
  }

  /**
   * Ativa menu conforme a pÃ¡gina atual
   * @private
   */
  _setupActiveMenu() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.sidebar__nav a').forEach(link => {
      const linkPath = link.getAttribute('href').split('/').pop();
      if (currentPath === linkPath) {
        link.classList.add('active');
        // Abre submenu se existir
        const parentMenu = link.closest('.has-submenu');
        if (parentMenu) {
          parentMenu.classList.add('open');
        }
      }
    });
  }

  /**
   * Configura tooltips usando Tippy.js
   * @private
   */
  _setupTooltips() {
    if (typeof tippy !== 'undefined') {
      tippy('[data-tippy-content]', {
        placement: 'right',
        theme: 'light-border',
        animation: 'fade',
        duration: [200, 150],
        hideOnClick: false,
      });
    }
  }

  /**
   * Configura listeners para responsividade
   * @private
   */
  _setupResponsiveChecks() {
    window.addEventListener('resize', this._handleResize.bind(this));
    this._handleResize(); // Executa no carregamento
  }

  /**
   * Trata mudanÃ§as de tamanho de tela
   * @private
   */
  _handleResize() {
    const isMobile = window.innerWidth < 992;
    document.body.classList.toggle('is-mobile', isMobile);

    if (!isMobile) {
      this.sidebar.classList.remove('collapsed');
    }
  }

  /**
   * Mostra um toast/notificaÃ§Ã£o
   * @param {string} message - Mensagem a ser exibida
   * @param {string} type - Tipo (success, error, warning, info)
   * @param {number} duration - DuraÃ§Ã£o em milissegundos (opcional)
   */
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast__content">${message}</div>
      <button class="toast__close">&times;</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast__close').addEventListener('click', removeToast);

    if (duration) {
      setTimeout(removeToast, duration);
    }
  }
}

// InicializaÃ§Ã£o automÃ¡tica quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const layoutManager = new LayoutManager();
  layoutManager.init();

  // Disponibiliza globalmente se necessÃ¡rio
  window.LayoutManager = layoutManager;
});
