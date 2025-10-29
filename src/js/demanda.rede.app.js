/**
 * ========================================
 * DEMANDA REDE DE PROTEÇÃO - APPLICATION
 * Sistema de Assistência Social SUAS
 * ========================================
 * Arquivo: demanda.rede.app.js
 * Padrão: *.app.js
 * ========================================
 */

// ========================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ========================================
const CONFIG = {
  API_BASE_URL: '/api',
  DEMANDAS_ENDPOINT: '/api/demandas-rede',
  PROFISSIONAIS_ENDPOINT: '/api/profissionais',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
};

let profissionaisSelecionados = [];
let arquivosAnexados = [];

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🛡️ Demanda Rede de Proteção - Sistema Inicializado');

  // Inicializar componentes
  initTabNavigation();
  initUploadArea();
  initFormValidation();
  carregarProfissionais();

  console.log('✅ Todos os componentes inicializados');
});

// ========================================
// SISTEMA DE ABAS
// ========================================
function initTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');

      // Remove active de todos
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Adiciona active ao selecionado
      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      // Scroll suave para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ========================================
// UPLOAD DE ARQUIVOS
// ========================================
function initUploadArea() {
  const uploadArea = document.getElementById('uploadArea');
  const inputArquivos = document.getElementById('inputArquivos');
  const listaAnexos = document.getElementById('listaAnexos');

  if (!uploadArea || !inputArquivos || !listaAnexos) {
    console.warn('Elementos de upload não encontrados');
    return;
  }

  // Click para abrir seleção de arquivos
  uploadArea.addEventListener('click', () => inputArquivos.click());

  // Drag and Drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // Seleção de arquivos
  inputArquivos.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      // Validar tamanho (10MB)
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        showNotification('Arquivo muito grande: ' + file.name + ' (máx. 10MB)', 'error');
        return;
      }

      // Validar tipo de arquivo
      const extensao = '.' + file.name.split('.').pop().toLowerCase();
      if (!CONFIG.ALLOWED_FILE_TYPES.includes(extensao)) {
        showNotification('Tipo de arquivo não permitido: ' + file.name, 'error');
        return;
      }

      // Adicionar à lista
      arquivosAnexados.push(file);
      adicionarAnexoNaLista(file);
    });
  }

  function adicionarAnexoNaLista(file) {
    const anexoItem = document.createElement('div');
    anexoItem.className = 'anexo-item';

    const icon = getFileIcon(file.type);
    const tamanho = formatarTamanho(file.size);

    anexoItem.innerHTML = `
      <div class="anexo-info">
        <i class="anexo-icon ${icon}"></i>
        <div class="anexo-details">
          <div class="anexo-nome">${file.name}</div>
          <div class="anexo-tamanho">${tamanho}</div>
        </div>
      </div>
      <button type="button" class="btn-remove-anexo" onclick="removerAnexo('${file.name}')">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;

    listaAnexos.appendChild(anexoItem);
  }

  function getFileIcon(type) {
    if (type.includes('pdf')) return 'fas fa-file-pdf';
    if (type.includes('word') || type.includes('document')) return 'fas fa-file-word';
    if (type.includes('image')) return 'fas fa-file-image';
    return 'fas fa-file';
  }

  function formatarTamanho(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// ========================================
// REMOVER ANEXO
// ========================================
window.removerAnexo = function(fileName) {
  const index = arquivosAnexados.findIndex(f => f.name === fileName);
  const listaAnexos = document.getElementById('listaAnexos');

  if (index > -1) {
    arquivosAnexados.splice(index, 1);
    listaAnexos.children[index].remove();
    showNotification('Arquivo removido', 'info');
  }
};

// ========================================
// CARREGAR PROFISSIONAIS
// ========================================
async function carregarProfissionais() {
  try {
    // Em produção, fazer chamada à API
    // const response = await fetch(CONFIG.PROFISSIONAIS_ENDPOINT);
    // const profissionais = await response.json();

    // Dados de exemplo (já estão no HTML)
    console.log('Profissionais carregados do HTML');

    // Adicionar event listeners nos checkboxes
    const checkboxes = document.querySelectorAll('input[name="profissionais[]"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          profissionaisSelecionados.push(this.value);
        } else {
          const index = profissionaisSelecionados.indexOf(this.value);
          if (index > -1) {
            profissionaisSelecionados.splice(index, 1);
          }
        }
        console.log('Profissionais selecionados:', profissionaisSelecionados);
      });
    });

  } catch (error) {
    console.error('Erro ao carregar profissionais:', error);
    showNotification('Erro ao carregar lista de profissionais', 'error');
  }
}

// ========================================
// VALIDAÇÃO DO FORMULÁRIO
// ========================================
function initFormValidation() {
  const form = document.getElementById('formDemandaRede');

  if (!form) {
    console.warn('Formulário não encontrado');
    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!validarFormulario()) {
      return;
    }

    // Confirmar envio
    if (!confirm('Deseja finalizar e salvar esta demanda?')) {
      return;
    }

    // Mostrar loading
    showLoading('Salvando demanda...');

    try {
      const formData = coletarDadosFormulario();

      console.log('📤 Dados a serem enviados:', formData);

      // Em produção, fazer chamada à API
      // const response = await fetch(CONFIG.DEMANDAS_ENDPOINT, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer ' + getToken()
      //   },
      //   body: JSON.stringify(formData)
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Erro ao salvar demanda');
      // }
      //
      // const resultado = await response.json();

      // Simulação
      await new Promise(resolve => setTimeout(resolve, 2000));

      hideLoading();
      showNotification('Demanda salva com sucesso!', 'success');

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = 'atendimento.html';
      }, 2000);

    } catch (error) {
      hideLoading();
      console.error('❌ Erro ao salvar:', error);
      showNotification('Erro ao salvar demanda: ' + error.message, 'error');
    }
  });
}

function validarFormulario() {
  const camposObrigatorios = document.querySelectorAll('[required]');
  let valido = true;
  let primeiroErro = null;

  camposObrigatorios.forEach(campo => {
    if (!campo.value.trim()) {
      campo.style.borderColor = '#dc2626';
      valido = false;

      if (!primeiroErro) {
        primeiroErro = campo;
      }
    } else {
      campo.style.borderColor = '#d1d5db';
    }
  });

  if (!valido) {
    showNotification('Preencha todos os campos obrigatórios', 'error');

    // Ir para a primeira aba com erro
    if (primeiroErro) {
      const tabContent = primeiroErro.closest('.tab-content');
      if (tabContent) {
        const tabId = tabContent.id;
        const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabButton) {
          tabButton.click();
          setTimeout(() => {
            primeiroErro.focus();
            primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    }
  }

  return valido;
}

// ========================================
// COLETAR DADOS DO FORMULÁRIO
// ========================================
function coletarDadosFormulario() {
  const form = document.getElementById('formDemandaRede');
  const formData = new FormData(form);
  const dados = {};

  // Converter FormData para objeto
  for (let [key, value] of formData.entries()) {
    // Se for checkbox array, criar array
    if (key.endsWith('[]')) {
      const cleanKey = key.replace('[]', '');
      if (!dados[cleanKey]) {
        dados[cleanKey] = [];
      }
      dados[cleanKey].push(value);
    } else {
      dados[key] = value;
    }
  }

  // Adicionar profissionais selecionados
  dados.profissionaisResponsaveis = profissionaisSelecionados;

  // Adicionar timestamp
  dados.dataCriacao = new Date().toISOString();

  // Adicionar informações dos arquivos (em produção, fazer upload separado)
  dados.quantidadeAnexos = arquivosAnexados.length;
  dados.nomesAnexos = arquivosAnexados.map(f => f.name);

  return dados;
}

// ========================================
// SALVAR RASCUNHO
// ========================================
async function salvarRascunho() {
  showLoading('Salvando rascunho...');

  try {
    const formData = coletarDadosFormulario();
    formData.rascunho = true;

    console.log('💾 Salvando rascunho:', formData);

    // Em produção, fazer chamada à API
    // const response = await fetch(CONFIG.DEMANDAS_ENDPOINT + '/rascunho', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': 'Bearer ' + getToken()
    //   },
    //   body: JSON.stringify(formData)
    // });

    // Simulação
    await new Promise(resolve => setTimeout(resolve, 1500));

    hideLoading();
    showNotification('Rascunho salvo com sucesso!', 'success');

  } catch (error) {
    hideLoading();
    console.error('❌ Erro ao salvar rascunho:', error);
    showNotification('Erro ao salvar rascunho: ' + error.message, 'error');
  }
}

// ========================================
// NAVEGAÇÃO
// ========================================
function voltarParaAtendimentos() {
  const form = document.getElementById('formDemandaRede');
  const temDados = Array.from(form.elements).some(el => el.value && el.value.trim() !== '');

  if (temDados || arquivosAnexados.length > 0) {
    if (confirm('Existem dados não salvos. Deseja realmente sair?')) {
      window.location.href = 'atendimento.html';
    }
  } else {
    window.location.href = 'atendimento.html';
  }
}

// ========================================
// LOADING OVERLAY
// ========================================
function showLoading(message = 'Carregando...') {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingMessage = document.getElementById('loadingMessage');

  if (loadingMessage) {
    loadingMessage.textContent = message;
  }

  if (loadingOverlay) {
    loadingOverlay.classList.add('active');
  }
}

function hideLoading() {
  const loadingOverlay = document.getElementById('loadingOverlay');

  if (loadingOverlay) {
    loadingOverlay.classList.remove('active');
  }
}

// ========================================
// SISTEMA DE NOTIFICAÇÕES
// ========================================
function showNotification(message, type = 'info') {
  const container = document.getElementById('notifications-container');

  if (!container) {
    console.warn('Container de notificações não encontrado');
    return;
  }

  const notification = document.createElement('div');
  notification.className = `alert alert-${type}`;
  notification.style.cssText = 'margin-bottom: 1rem; animation: slideIn 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  notification.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <div>${message}</div>
  `;

  container.appendChild(notification);

  // Auto remover após 5 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 5000);
}

// Adicionar estilos de animação se não existirem
if (!document.getElementById('notification-animations')) {
  const style = document.createElement('style');
  style.id = 'notification-animations';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ========================================
// UTILIDADES
// ========================================

/**
 * Obter token de autenticação
 */
function getToken() {
  return localStorage.getItem('token') || '';
}

/**
 * Formatar data para exibição
 */
function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR');
}

/**
 * Validar CPF
 */
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '');

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

// ========================================
// MÁSCARAS DE INPUT
// ========================================
function aplicarMascaras() {
  // Máscara de telefone
  const telefonesInputs = document.querySelectorAll('input[type="tel"]');
  telefonesInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
      }

      e.target.value = value;
    });
  });

  // Máscara de CPF
  const cpfInputs = document.querySelectorAll('input[name*="cpf"]');
  cpfInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }

      e.target.value = value;
    });
  });
}

// Aplicar máscaras ao carregar
document.addEventListener('DOMContentLoaded', aplicarMascaras);

// ========================================
// LOGOUT
// ========================================
function fazerLogout() {
  if (confirm('Deseja realmente sair do sistema?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
  }
}

// ========================================
// AUTO-SAVE (opcional)
// ========================================
let autoSaveTimer = null;

function enableAutoSave() {
  const form = document.getElementById('formDemandaRede');

  form.addEventListener('input', function() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      salvarRascunhoSilencioso();
    }, 30000); // 30 segundos
  });
}

async function salvarRascunhoSilencioso() {
  try {
    const formData = coletarDadosFormulario();
    formData.autoSave = true;

    // Salvar no localStorage como backup
    localStorage.setItem('rascunho_demanda_rede', JSON.stringify(formData));

    console.log('💾 Auto-save realizado');
  } catch (error) {
    console.error('Erro no auto-save:', error);
  }
}

// ========================================
// RECUPERAR RASCUNHO
// ========================================
function recuperarRascunho() {
  try {
    const rascunho = localStorage.getItem('rascunho_demanda_rede');

    if (rascunho) {
      const dados = JSON.parse(rascunho);

      if (confirm('Foi encontrado um rascunho salvo. Deseja recuperá-lo?')) {
        preencherFormulario(dados);
        localStorage.removeItem('rascunho_demanda_rede');
        showNotification('Rascunho recuperado com sucesso!', 'info');
      }
    }
  } catch (error) {
    console.error('Erro ao recuperar rascunho:', error);
  }
}

function preencherFormulario(dados) {
  Object.keys(dados).forEach(key => {
    const campo = document.querySelector(`[name="${key}"]`);
    if (campo) {
      if (campo.type === 'checkbox') {
        campo.checked = dados[key];
      } else {
        campo.value = dados[key];
      }
    }
  });

  // Preencher checkboxes de encaminhamentos
  if (dados.encaminhamentos && Array.isArray(dados.encaminhamentos)) {
    dados.encaminhamentos.forEach(valor => {
      const checkbox = document.querySelector(`input[name="encaminhamentos[]"][value="${valor}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }

  // Preencher profissionais
  if (dados.profissionaisResponsaveis && Array.isArray(dados.profissionaisResponsaveis)) {
    dados.profissionaisResponsaveis.forEach(id => {
      const checkbox = document.querySelector(`input[name="profissionais[]"][value="${id}"]`);
      if (checkbox) {
        checkbox.checked = true;
        profissionaisSelecionados.push(id);
      }
    });
  }
}

// ========================================
// EXPORT / GLOBAL SCOPE
// ========================================
// Expor funções globais necessárias
window.voltarParaAtendimentos = voltarParaAtendimentos;
window.fazerLogout = fazerLogout;
window.salvarRascunho = salvarRascunho;
window.removerAnexo = removerAnexo;

console.log('✅ JavaScript Demanda Rede de Proteção (demanda.rede.app.js) carregado com sucesso');
