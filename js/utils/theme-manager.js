/**
 * Theme Manager - Gerenciador de Temas
 * Controla a troca e persistência de temas da aplicação
 */

class ThemeManager {
    constructor() {
        this.themes = ['light', 'dark', 'corporate', 'eco'];
        this.currentTheme = this.getSavedTheme() || 'light';
        this.init();
    }

    /**
     * Inicializa o gerenciador de temas
     */
    init() {
        // Aplica o tema salvo no carregamento
        this.applyTheme(this.currentTheme);

        // Escuta mudanças na preferência do sistema
        this.watchSystemTheme();

        // Cria os botões de controle (opcional)
        this.createThemeControls();
    }

    /**
     * Aplica um tema específico
     * @param {string} themeName - Nome do tema
     */
    applyTheme(themeName) {
        const html = document.documentElement;

        // Remove tema anterior
        html.removeAttribute('data-theme');

        // Aplica novo tema (se não for 'light')
        if (themeName !== 'light') {
            html.setAttribute('data-theme', themeName);
        }

        this.currentTheme = themeName;
        this.saveTheme(themeName);

        // Dispara evento customizado
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeName }
        }));
    }

    /**
     * Alterna entre light e dark
     */
    toggleDarkMode() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    /**
     * Salva tema no localStorage
     * @param {string} themeName
     */
    saveTheme(themeName) {
        localStorage.setItem('app-theme', themeName);
    }

    /**
     * Recupera tema salvo
     * @returns {string|null}
     */
    getSavedTheme() {
        return localStorage.getItem('app-theme');
    }

    /**
     * Detecta preferência do sistema
     * @returns {string}
     */
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    /**
     * Observa mudanças na preferência do sistema
     */
    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            // Só aplica se o usuário não escolheu um tema específico
            if (!this.getSavedTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Cria controles de tema (opcional)
     */
    createThemeControls() {
        const existingControls = document.querySelector('.theme-controls');
        if (existingControls) return; // Já existe

        const controls = document.createElement('div');
        controls.className = 'theme-controls';
        controls.innerHTML = `
            <button class="theme-toggle" data-theme="light" title="Tema Claro">🌞</button>
            <button class="theme-toggle" data-theme="dark" title="Tema Escuro">🌙</button>
            <button class="theme-toggle" data-theme="corporate" title="Corporativo">💼</button>
            <button class="theme-toggle" data-theme="eco" title="Sustentável">🌱</button>
        `;

        // Adiciona event listeners
        controls.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-toggle')) {
                const theme = e.target.getAttribute('data-theme');
                this.applyTheme(theme);
                this.updateControlsState();
            }
        });

        // Adiciona ao DOM (você pode mudar o local)
        document.body.appendChild(controls);
        this.updateControlsState();
    }

    /**
     * Atualiza estado visual dos controles
     */
    updateControlsState() {
        const controls = document.querySelectorAll('.theme-toggle');
        controls.forEach(btn => {
            const theme = btn.getAttribute('data-theme');
            btn.classList.toggle('active', theme === this.currentTheme);
        });
    }

    /**
     * Remove tema e volta para o padrão do sistema
     */
    resetToSystem() {
        localStorage.removeItem('app-theme');
        const systemTheme = this.getSystemTheme();
        this.applyTheme(systemTheme);
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Exporta para uso em outros módulos (se usar ES6 modules)
// export default ThemeManager;
