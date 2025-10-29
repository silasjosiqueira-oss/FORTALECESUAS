/**
 * ========================================
 * INFORMAÇÃO REMOTA - APPLICATION
 * Sistema de Assistência Social SUAS
 * ========================================
 * Arquivo: informacao.remota.app.js
 * Padrão: *.app.js
 * ========================================
 */

// ========================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ========================================
const CONFIG = {
  API_BASE_URL: '/api',
  MAX_CHAR_DESCRICAO: 2000,
  MAX_CHAR_RESPOSTA: 2000,
  PROFISSIONAIS_ENDPOINT: '/api/profissionais',
  INFORMACOES_ENDPOINT: '/api/informacoes-remotas'
};

let profissionaisList = [];
let profissionalSelecionado = null;

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 Informação Remota - Sistema Inicializado');

  // Inicializar componentes
  initFormValidation();
  initCharCounters();
  initProfissionaisSelection();
  initConditionalFields();
  carregarProfissionais();
  setDataHoraAtual();

  // Event Listeners
  document.getElementById('btnSalvarRascunho').addEventListener('click', salvarRascunho);
  document.getElementById('formInformacaoRemota').addEventListener('submit', handleFormSubmit);
});

// ========================================
// DEFINIR DATA/HORA ATUAL
// ========================================
function setDataHoraAtual() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');

  const dataHoraFormatada = `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  document.getElementById('dataHoraContato').value = dataHoraFormatada;
}

// ========================================
// CONTADOR DE CARACTERES
// ========================================
function initCharCounters() {
  const descricaoTextarea = document.getElementById('descricaoSolicitacao');
  const respostaTextarea = document.getElementById('respostaRetorno');
  const charCounter = document.getElementById('charCounter');
  const charCounterResposta = document.getElementById('charCounterResposta');

  // Contador para Descrição
  descricaoTextarea.addEventListener('input', function() {
    const length = this.value.length;
    const max = CONFIG.MAX_CHAR_DESCRICAO;
    charCounter.textContent = `${length} / ${max} caracteres`;

    // Mudar cor baseado no limite
    charCounter.classList.remove('warning', 'danger');
    if (length > max * 0.9) {
      charCounter.classList.add('danger');
    } else if (length > max * 0.7) {
      charCounter.classList.add('warning');
    }
  });

  // Contador para Resposta
  respostaTextarea.addEventListener('input', function() {
    const length = this.value.length;
    const max = CONFIG.MAX_CHAR_RESPOSTA;
    charCounterResposta.textContent = `${length} / ${max} caracteres`;

    charCounterResposta.classList.remove('warning', 'danger');
    if (length > max * 0.9) {
      charCounterResposta.classList.add('danger');
    } else if (length > max * 0.7) {
      charCounterResposta.classList.add('warning');
    }
  });
}

// ========================================
// CAMPOS CONDICIONAIS
// ========================================
function initConditionalFields() {
  const statusSelect = document.getElementById('statusSolicitacao');
  const grupoEncaminhamento = document.getElementById('grupoEncaminhamento');

  statusSelect.addEventListener('change', function() {
    // Mostrar campo de encaminhamento se status for "encaminhada"
    if (this.value === 'encaminhada' || this.value === 'requer-acompanhamento') {
      grupoEncaminhamento.style.display = 'block';
    } else {
      grupoEncaminhamento.style.display = 'none';
    }
  });
}

// ========================================
// CARREGAR PROFISSIONAIS
// ========================================
async function carregarProfissionais() {
  try {
    // Simulação - em produção seria uma chamada à API
    // const response = await fetch(CONFIG.PROFISSIONAIS_ENDPOINT);
    // profissionaisList = await response.json();

    // Dados de exemplo
    profissionaisList = [
      { id: 1, nome: 'Maria Silva Santos', cargo: 'Assistente Social', unidade: 'CRAS Centro' },
      { id: 2, nome: 'João Pedro Oliveira', cargo: 'Psicólogo', unidade: 'CREAS' },
      { id: 3, nome: 'Ana Paula Costa', cargo: 'Assistente Social', unidade: 'CREAS' },
      { id: 4, nome: 'Carlos Eduardo Lima', cargo: 'Coordenador', unidade: 'CRAS Vila Nova' },
      { id: 5, nome: 'Fernanda Alves Rocha', cargo: 'Psicóloga', unidade: 'CRAS Centro' },
      { id: 6, nome: 'Ricardo Santos Pereira', cargo: 'Assistente Social', unidade: 'Secretaria' }
    ];

    renderizarProfissionais();
  } catch (error) {
    console.error('Erro ao carregar profissionais:', error);
    showNotification('Erro ao carregar lista de profissionais', 'error');
  }
}

// ========================================
// RENDERIZAR LISTA DE PROFISSIONAIS
// ========================================
function renderizarProfissionais() {
  const container = document.getElementById('listaProfissionaisResponsaveis');

  if (!container) return;

  container.innerHTML = '';

  profissionaisList.forEach(profissional => {
    const card = document.createElement('div');
    card.className = 'profissional-select-card';
    card.dataset.profissionalId = profissional.id;

    const iniciais = profissional.nome.split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    card.innerHTML = `
      <div class="profissional-avatar">${iniciais}</div>
      <div class="profissional-info">
        <div class="profissional-nome">${profissional.nome}</div>
        <div class="profissional-cargo">${profissional.cargo} - ${profissional.unidade}</div>
      </div>
      <div class="profissional-check">
        <i class="fas fa-check"></i>
      </div>
    `;

    card.addEventListener('click', function() {
      selecionarProfissional(profissional.id);
    });

    container.appendChild(card);
  });
}

// ========================================
// SELEÇÃO DE PROFISSIONAL
// ========================================
function initProfissionaisSelection() {
  // Será implementado após renderização
}

function selecionarProfissional(profissionalId) {
  // Remove seleção anterior
  const cards = document.querySelectorAll('.profissional-select-card');
  cards.forEach(card => card.classList.remove('selected'));

  // Adiciona nova seleção
  const card = document.querySelector(`[data-profissional-id="${profissionalId}"]`);
  if (card) {
    card.classList.add('selected');
    profissionalSelecionado = profissionalId;
  }
}

// ========================================
// VALIDAÇÃO DO FORMULÁRIO
// ========================================
function initFormValidation() {
  const form = document.getElementById('formInformacaoRemota');
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

  // Validação em tempo real
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      validarCampo(this);
    });

    input.addEventListener('input', function() {
      if (this.classList.contains('is-invalid')) {
        validarCampo(this);
      }
    });
  });
}

function validarCampo(campo) {
  const isValid = campo.checkValidity();

  if (!isValid || !campo.value.trim()) {
    campo.style.borderColor = '#dc2626';
    campo.classList.add('is-invalid');
    return false;
  } else {
    campo.style.borderColor = '#d1d5db';
    campo.classList.remove('is-invalid');
    return true;
  }
}

function validarFormulario() {
  const form = document.getElementById('formInformacaoRemota');
  const camposObrigatorios = form.querySelectorAll('[required]');
  let isValid = true;
  let primeiroErro = null;

  camposObrigatorios.forEach(campo => {
    if (!validarCampo(campo)) {
      isValid = false;
      if (!primeiroErro) {
        primeiroErro = campo;
      }
    }
  });

  if (!isValid) {
    showNotification('Por favor, preencha todos os campos obrigatórios', 'error');

    if (primeiroErro) {
      primeiroErro.focus();
      primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return isValid;
}

// ========================================
// SUBMIT DO FORMULÁRIO
// ========================================
async function handleFormSubmit(event) {
  event.preventDefault();

  // Validar
  if (!validarFormulario()) {
    return;
  }

  // Confirmar envio
  if (!confirm('Deseja finalizar e salvar esta informação remota?')) {
    return;
  }

  showLoading('Salvando informação remota...');

  try {
    const formData = coletarDadosFormulario();

    // Adicionar profissional selecionado
    if (profissionalSelecionado) {
      formData.profissionalResponsavelId = profissionalSelecionado;
    }

    console.log('📤 Dados a serem enviados:', formData);

    // Em produção, fazer a chamada à API
    // const response = await fetch(CONFIG.INFORMACOES_ENDPOINT, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': 'Bearer ' + getToken()
    //   },
    //   body: JSON.stringify(formData)
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Erro ao salvar informação remota');
    // }
    //
    // const resultado = await response.json();

    // Simulação
    await new Promise(resolve => setTimeout(resolve, 2000));

    hideLoading();
    showNotification('Informação remota salva com sucesso!', 'success');

    // Redirecionar após 2 segundos
    setTimeout(() => {
      window.location.href = 'atendimento.html';
    }, 2000);

  } catch (error) {
    hideLoading();
    console.error('❌ Erro ao salvar:', error);
    showNotification('Erro ao salvar informação remota: ' + error.message, 'error');
  }
}

// ========================================
// SALVAR RASCUNHO
// ========================================
async function salvarRascunho() {
  showLoading('Salvando rascunho...');

  try {
    const formData = coletarDadosFormulario();
    formData.rascunho = true;

    if (profissionalSelecionado) {
      formData.profissionalResponsavelId = profissionalSelecionado;
    }

    console.log('💾 Salvando rascunho:', formData);

    // Em produção:
    // const response = await fetch(CONFIG.INFORMACOES_ENDPOINT + '/rascunho', {
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
// COLETAR DADOS DO FORMULÁRIO
// ========================================
function coletarDadosFormulario() {
  const form = document.getElementById('formInformacaoRemota');
  const formData = new FormData(form);
  const dados = {};

  // Converter FormData para objeto
  for (let [key, value] of formData.entries()) {
    dados[key] = value;
  }

  // Adicionar timestamp
  dados.dataCriacao = new Date().toISOString();
  dados.profissionalResponsavelId = profissionalSelecionado;

  return dados;
}

// ========================================
// NAVEGAÇÃO
// ========================================
function voltarParaAtendimentos() {
  const form = document.getElementById('formInformacaoRemota');
  const temDados = Array.from(form.elements).some(el => el.value && el.value.trim() !== '');

  if (temDados) {
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
 * Obter token de autenticação do localStorage
 */
function getToken() {
  return localStorage.getItem('token') || '';
}

/**
 * Formatar data para exibição
 */
function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
}

/**
 * Formatar telefone
 */
function formatarTelefone(telefone) {
  const cleaned = ('' + telefone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return telefone;
}

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
// CARREGAR HISTÓRICO (para edição)
// ========================================
async function carregarHistorico(informacaoId) {
  try {
    // const response = await fetch(`${CONFIG.INFORMACOES_ENDPOINT}/${informacaoId}/historico`);
    // const historico = await response.json();

    // Dados de exemplo
    const historico = [
      {
        data: '2025-10-29T10:30:00',
        texto: 'Informação remota criada',
        autor: 'Maria Silva Santos'
      },
      {
        data: '2025-10-29T14:15:00',
        texto: 'Resposta fornecida ao cidadão por telefone',
        autor: 'Maria Silva Santos'
      }
    ];

    renderizarHistorico(historico);
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  }
}

function renderizarHistorico(historico) {
  const cardHistorico = document.getElementById('cardHistorico');
  const timeline = document.getElementById('timelineHistorico');

  if (!historico || historico.length === 0) {
    cardHistorico.style.display = 'none';
    return;
  }

  cardHistorico.style.display = 'block';
  timeline.innerHTML = '';

  historico.forEach(item => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';

    timelineItem.innerHTML = `
      <div class="timeline-marker"></div>
      <div class="timeline-content">
        <div class="timeline-date">${formatarData(item.data)}</div>
        <div class="timeline-text">${item.texto}</div>
        <div class="timeline-author">Por: ${item.autor}</div>
      </div>
    `;

    timeline.appendChild(timelineItem);
  });
}

// ========================================
// AUTO-SAVE (opcional)
// ========================================
let autoSaveTimer = null;

function enableAutoSave() {
  const form = document.getElementById('formInformacaoRemota');

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
    localStorage.setItem('rascunho_informacao_remota', JSON.stringify(formData));

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
    const rascunho = localStorage.getItem('rascunho_informacao_remota');

    if (rascunho) {
      const dados = JSON.parse(rascunho);

      if (confirm('Foi encontrado um rascunho salvo. Deseja recuperá-lo?')) {
        preencherFormulario(dados);
        localStorage.removeItem('rascunho_informacao_remota');
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
      campo.value = dados[key];
    }
  });

  if (dados.profissionalResponsavelId) {
    selecionarProfissional(dados.profissionalResponsavelId);
  }
}

// ========================================
// MÁSCARAS DE INPUT
// ========================================
function aplicarMascaras() {
  // Máscara de telefone
  const telefoneInput = document.getElementById('telefoneContato');
  if (telefoneInput) {
    telefoneInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
      }

      e.target.value = value;
    });
  }

  // Máscara de CPF
  const cpfInput = document.getElementById('cpfNis');
  if (cpfInput) {
    cpfInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length <= 11) {
        // CPF
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }

      e.target.value = value;
    });
  }
}

// Aplicar máscaras ao carregar
document.addEventListener('DOMContentLoaded', aplicarMascaras);

// ========================================
// EXPORT / GLOBAL SCOPE
// ========================================
// Expor funções globais necessárias
window.voltarParaAtendimentos = voltarParaAtendimentos;
window.fazerLogout = fazerLogout;
window.selecionarProfissional = selecionarProfissional;

console.log('✅ JavaScript Informação Remota (informacao.remota.app.js) carregado com sucesso');
