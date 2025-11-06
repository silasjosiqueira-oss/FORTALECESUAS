// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================
let familyMemberCount = 1;
let autoSaveInterval;

// ==========================================
// VERIFICAÇÃO DE AUTENTICAÇÃO AO CARREGAR
// ==========================================
window.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando formulário de atendimento...');

    // Verificar se está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Você precisa fazer login primeiro', 'warning');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 2000);
        return;
    }

    // Definir data e hora atual
    const now = new Date();
    document.querySelector('input[name="dataAtendimento"]').value = now.toISOString().split('T')[0];
    document.querySelector('input[name="horaAtendimento"]').value = now.toTimeString().slice(0,5);

    // Aplicar máscaras
    const cpfInput = document.querySelector('input[name="cpf"]');
    if (cpfInput) {
        cpfInput.addEventListener('input', maskCPF);
        cpfInput.addEventListener('blur', function() {
            const cpfValido = validarCPF(this.value);
            if (this.value && !cpfValido) {
                showNotification('CPF inválido!', 'error', 3000);
                this.style.borderColor = '#dc2626';
            } else if (cpfValido) {
                this.style.borderColor = '#059669';
                buscarPorCPF(this.value);
            }
        });
    }

    const telefoneInput = document.querySelector('input[name="telefone"]');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', maskTelefone);
    }

    const cepInput = document.querySelector('input[name="cep"]');
    if (cepInput) {
        cepInput.addEventListener('input', maskCEP);
        cepInput.addEventListener('blur', autocompleteCEP);
    }

    // Preencher código do recepcionista automaticamente
    const recepcionistaSelect = document.querySelector('select[name="recepcionista"]');
    const codigoInput = document.querySelector('input[name="codigoRecepcionista"]');
    if (recepcionistaSelect && codigoInput) {
        recepcionistaSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const codigo = selectedOption.getAttribute('data-codigo') || '';
            codigoInput.value = codigo;
        });
    }

    // Verificar se está editando um atendimento existente
    const urlParams = new URLSearchParams(window.location.search);
    const atendimentoId = urlParams.get('id');

    if (atendimentoId) {
        console.log('📝 Modo EDIÇÃO - Carregando atendimento ID:', atendimentoId);
        await carregarAtendimentoParaEdicao(atendimentoId);
    } else {
        console.log('✨ Modo NOVO atendimento');

        // Verificar rascunho no sessionStorage apenas se não estiver editando
        const rascunho = sessionStorage.getItem('rascunhoAtendimento');
        if (rascunho && confirm('Deseja carregar o rascunho salvo anteriormente?')) {
            try {
                const data = JSON.parse(rascunho);
                preencherFormulario(data);
                showNotification('Rascunho carregado!', 'info');
            } catch (error) {
                console.error('Erro ao carregar rascunho:', error);
            }
        }
    }

    // Iniciar auto-save
    iniciarAutoSave();

    console.log('✅ Formulário carregado com sucesso!');
});

// ==========================================
// AUTO-SAVE DE RASCUNHO
// ==========================================
function iniciarAutoSave() {
    // Salvar automaticamente a cada 30 segundos
    autoSaveInterval = setInterval(() => {
        const formData = new FormData(document.getElementById('formNovoAtendimento'));
        let hasData = false;

        for (let [key, value] of formData.entries()) {
            if (value && value.trim() !== '') {
                hasData = true;
                break;
            }
        }

        if (hasData) {
            salvarRascunho(true); // true = silencioso
            console.log('💾 Rascunho salvo automaticamente');
        }
    }, 30000); // 30 segundos
}

// Limpar interval ao sair
window.addEventListener('beforeunload', function() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
});

// ==========================================
// VALIDAÇÃO DE CPF
// ==========================================
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto === 10 || resto === 11 ? 0 : resto;

    if (parseInt(cpf.charAt(9)) !== digito1) {
        return false;
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto === 10 || resto === 11 ? 0 : resto;

    return parseInt(cpf.charAt(10)) === digito2;
}

// ==========================================
// BUSCAR CIDADÃO POR CPF
// ==========================================
async function buscarPorCPF(cpf) {
    const cpfLimpo = cpf.replace(/\D/g, '');

    console.log('🔍 Buscando atendimentos por CPF:', cpfLimpo);

    if (cpfLimpo.length !== 11) {
        console.log('⚠️ CPF inválido, não buscará');
        return;
    }

    try {
        showLoading('Verificando cadastro...');
        const token = localStorage.getItem('token');

        // Buscar atendimentos existentes com este CPF EXATO
        const url = `/api/atendimentos?cpf=${cpfLimpo}`;
        console.log('📡 Fazendo requisição:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('📦 Resultado da busca:', result);

            if (result.atendimentos && result.atendimentos.length > 0) {
                console.log(`✅ Encontrado ${result.atendimentos.length} atendimento(s) com este CPF`);

                const ultimoAtendimento = result.atendimentos[0];

                // Verificar se o CPF do resultado corresponde ao CPF buscado
                const cpfResultado = (ultimoAtendimento.cpf || '').replace(/\D/g, '');
                if (cpfResultado !== cpfLimpo) {
                    console.error('❌ ERRO: CPF do resultado não corresponde ao CPF buscado!');
                    console.error('CPF buscado:', cpfLimpo);
                    console.error('CPF retornado:', cpfResultado);
                    showNotification('Erro ao buscar CPF. Tente novamente.', 'error');
                    return;
                }

                const dados = typeof ultimoAtendimento.dados_completos === 'string'
                    ? JSON.parse(ultimoAtendimento.dados_completos)
                    : ultimoAtendimento.dados_completos;

                const dataFormatada = new Date(ultimoAtendimento.created_at || ultimoAtendimento.data_atendimento).toLocaleDateString('pt-BR');

                if (confirm(`✅ Cidadão já cadastrado!\n\nNome: ${ultimoAtendimento.nome_completo}\nCPF: ${formatCPF(cpfLimpo)}\nÚltimo atendimento: ${dataFormatada}\n\nDeseja carregar os dados anteriores?`)) {
                    preencherFormulario(dados);
                    showNotification('Dados carregados com sucesso!', 'success');
                }
            } else {
                console.log('ℹ️ Nenhum atendimento encontrado com este CPF');
            }
        } else {
            console.error('❌ Erro na resposta da API:', response.status);
        }
    } catch (error) {
        console.error('❌ Erro ao buscar CPF:', error);
        showNotification('Erro ao verificar CPF', 'error');
    } finally {
        hideLoading();
    }
}

// ==========================================
// PREENCHER FORMULÁRIO COM DADOS
// ==========================================
function preencherFormulario(dados) {
    Object.keys(dados).forEach(key => {
        const element = document.querySelector(`[name="${key}"]`);
        if (element) {
            // CRÍTICO: Ignorar campos de arquivo (não podem ser preenchidos por segurança)
            if (element.type === 'file') {
                console.log(`⚠️ Ignorando campo de arquivo: ${key}`);
                return;
            }

            if (element.type === 'checkbox') {
                element.checked = dados[key] === 'on' || dados[key] === true;
            } else if (element.type === 'radio') {
                const radio = document.querySelector(`[name="${key}"][value="${dados[key]}"]`);
                if (radio) radio.checked = true;
            } else {
                try {
                    element.value = dados[key];
                } catch (error) {
                    console.warn(`⚠️ Não foi possível preencher campo ${key}:`, error.message);
                }
            }
        }
    });

    // Processar arrays de checkboxes
    if (dados.motivosAtendimento && Array.isArray(dados.motivosAtendimento)) {
        dados.motivosAtendimento.forEach(valor => {
            const checkbox = document.querySelector(`input[name="motivosAtendimento[]"][value="${valor}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    if (dados.situacoesEspecificas && Array.isArray(dados.situacoesEspecificas)) {
        dados.situacoesEspecificas.forEach(valor => {
            const checkbox = document.querySelector(`input[name="situacoesEspecificas[]"][value="${valor}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// ==========================================
// CARREGAR ATENDIMENTO PARA EDIÇÃO
// ==========================================
async function carregarAtendimentoParaEdicao(id) {
    try {
        showLoading('Carregando dados do atendimento...');
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/atendimentos/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao carregar atendimento: ${response.status}`);
        }

        const result = await response.json();

        console.log('📦 Resposta da API de edição:', result);

        // Extrair o atendimento da resposta
        let atendimento = result;
        if (result.atendimento) {
            atendimento = result.atendimento;
        } else if (result.dados) {
            atendimento = result.dados;
        }

        console.log('📋 Atendimento extraído:', atendimento);

        // Mesclar dados_completos com dados principais
        let dadosParaPreencher = {};

        if (atendimento.dados_completos) {
            // Se dados_completos for string, fazer parse
            const dadosCompletos = typeof atendimento.dados_completos === 'string'
                ? JSON.parse(atendimento.dados_completos)
                : atendimento.dados_completos;

            dadosParaPreencher = { ...dadosCompletos };
        }

        // Sobrescrever com dados principais do atendimento
        dadosParaPreencher = {
            ...dadosParaPreencher,
            nomeCompleto: atendimento.nome_completo || dadosParaPreencher.nomeCompleto,
            cpf: atendimento.cpf || dadosParaPreencher.cpf,
            telefone: atendimento.telefone || dadosParaPreencher.telefone,
            dataNascimento: atendimento.data_nascimento?.split('T')[0] || dadosParaPreencher.dataNascimento,
            dataAtendimento: atendimento.data_atendimento?.split('T')[0] || dadosParaPreencher.dataAtendimento,
            horaAtendimento: atendimento.hora_atendimento || dadosParaPreencher.horaAtendimento,
            tecnicoResponsavel: atendimento.tecnico_responsavel || dadosParaPreencher.tecnicoResponsavel,
            tipoAtendimento: atendimento.tipo_atendimento || dadosParaPreencher.tipoAtendimento,
            unidade: atendimento.unidade || dadosParaPreencher.unidade,
            status: atendimento.status || dadosParaPreencher.status,
            prioridade: atendimento.prioridade || dadosParaPreencher.prioridade
        };

        console.log('✅ Dados mesclados para preenchimento:', dadosParaPreencher);

        // Preencher o formulário
        preencherFormulario(dadosParaPreencher);

        // Mudar o título da página
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.innerHTML = `<i class="fas fa-edit"></i> Editar Atendimento #${atendimento.registro || id}`;
        }

        // Mudar texto do botão de salvar
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-save"></i> Atualizar Atendimento';
        }

        // Guardar o ID no formulário para uso no submit
        const form = document.getElementById('formNovoAtendimento');
        if (form) {
            form.dataset.atendimentoId = id;
        }

        showNotification('Dados carregados para edição!', 'success');

    } catch (error) {
        console.error('❌ Erro ao carregar atendimento:', error);
        showNotification('Erro ao carregar dados do atendimento: ' + error.message, 'error');

        // Voltar para lista após erro
        setTimeout(() => {
            window.location.href = '/pages/atendimento.html';
        }, 3000);
    } finally {
        hideLoading();
    }
}

// ==========================================
// FUNÇÃO PARA ADICIONAR MEMBRO FAMILIAR
// ==========================================
function addFamilyMember() {
    familyMemberCount++;
    const container = document.getElementById('familyMembers');
    const newMember = document.createElement('div');
    newMember.className = 'family-member';
    newMember.innerHTML = `
        <div class="family-member-header">
            <span class="family-member-title">Membro da Família ${familyMemberCount}</span>
            <button type="button" class="family-member-remove" onclick="removeFamilyMember(this)">
                <i class="fas fa-times"></i> Remover
            </button>
        </div>
        <div class="form-grid-3">
            <div class="form-group">
                <label class="form-label">Nome</label>
                <input type="text" class="form-control" name="familiarNome[]">
            </div>
            <div class="form-group">
                <label class="form-label">Parentesco</label>
                <select class="form-control" name="familiarParentesco[]">
                    <option value="">Selecione</option>
                    <option value="Pai">Pai</option>
                    <option value="Mãe">Mãe</option>
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="Irmão(ã)">Irmão(ã)</option>
                    <option value="Avô(ó)">Avô(ó)</option>
                    <option value="Neto(a)">Neto(a)</option>
                    <option value="Outro">Outro</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Idade</label>
                <input type="number" class="form-control" name="familiarIdade[]">
            </div>
        </div>
    `;
    container.appendChild(newMember);
    showNotification('Membro familiar adicionado', 'success', 2000);
}

function removeFamilyMember(button) {
    if (confirm('Deseja remover este membro familiar?')) {
        button.closest('.family-member').remove();
        showNotification('Membro familiar removido', 'info', 2000);
    }
}

// ==========================================
// SALVAR RASCUNHO
// ==========================================
function salvarRascunho(silencioso = false) {
    try {
        const form = document.getElementById('formNovoAtendimento');
        const formData = new FormData(form);
        const dados = {};

        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            if (key.endsWith('[]')) {
                const cleanKey = key.slice(0, -2);
                if (!dados[cleanKey]) dados[cleanKey] = [];
                dados[cleanKey].push(value);
            } else {
                dados[key] = value;
            }
        }

        // Salvar no sessionStorage
        sessionStorage.setItem('rascunhoAtendimento', JSON.stringify(dados));

        if (!silencioso) {
            showNotification('💾 Rascunho salvo com sucesso!', 'success', 2000);
        }
    } catch (error) {
        console.error('Erro ao salvar rascunho:', error);
        if (!silencioso) {
            showNotification('Erro ao salvar rascunho', 'error');
        }
    }
}

// ==========================================
// SALVAR ATENDIMENTO NO SERVIDOR
// ==========================================
async function salvarAtendimento() {
    try {
        // Validar campos obrigatórios
        const camposObrigatorios = [
            { name: 'nomeCompleto', label: 'Nome Completo' },
            { name: 'cpf', label: 'CPF' },
            { name: 'telefone', label: 'Telefone' },
            { name: 'tecnicoResponsavel', label: 'Técnico Responsável' }
        ];

        const camposFaltando = [];
        for (const campo of camposObrigatorios) {
            const elemento = document.querySelector(`[name="${campo.name}"]`);
            if (!elemento || !elemento.value || elemento.value.trim() === '') {
                camposFaltando.push(campo.label);
                if (elemento) elemento.style.borderColor = '#dc2626';
            }
        }

        if (camposFaltando.length > 0) {
            showNotification(
                `❌ Preencha os campos obrigatórios: ${camposFaltando.join(', ')}`,
                'error',
                5000
            );
            return;
        }

        // Validar CPF
        const cpfInput = document.querySelector('input[name="cpf"]');
        if (cpfInput && !validarCPF(cpfInput.value)) {
            showNotification('❌ CPF inválido!', 'error');
            cpfInput.style.borderColor = '#dc2626';
            cpfInput.focus();
            return;
        }

        // Confirmar envio
        if (!confirm('Deseja salvar este atendimento?')) {
            return;
        }

        showLoading('Salvando atendimento...');

        // Coletar dados do formulário
        const form = document.getElementById('formNovoAtendimento');
        const formData = new FormData(form);
        const dados = {};

        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            if (key.endsWith('[]')) {
                const cleanKey = key.slice(0, -2);
                if (!dados[cleanKey]) dados[cleanKey] = [];
                dados[cleanKey].push(value);
            } else {
                dados[key] = value;
            }
        }

        // Preparar payload para o servidor (formato esperado pelo server.js)
        const payload = {
            nomeCompleto: dados.nomeCompleto,
            cpf: dados.cpf.replace(/\D/g, ''),
            telefone: dados.telefone,
            tecnicoResponsavel: dados.tecnicoResponsavel,
            tipoAtendimento: dados.tipoAtendimento || 'Atendimento Geral',
            unidade: dados.unidade || 'Secretaria',
            status: dados.status || 'aguardando',
            prioridade: dados.prioridade || 'normal',
            dataAtendimento: dados.dataAtendimento,
            horaAtendimento: dados.horaAtendimento,
            // Todos os dados completos em JSON
            ...dados
        };

        // Obter token
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('❌ Sessão expirada. Faça login novamente.', 'error');
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 2000);
            return;
        }

        // Verificar se está em modo de edição
        const atendimentoId = form.dataset.atendimentoId;
        const isEdicao = !!atendimentoId;

        const metodo = isEdicao ? 'PUT' : 'POST';
        const url = isEdicao ? `/api/atendimentos/${atendimentoId}` : '/api/atendimentos';

        console.log(`${isEdicao ? '✏️ ATUALIZANDO' : '➕ CRIANDO'} atendimento...`);
        console.log('URL:', url);
        console.log('Método:', metodo);

        // Enviar para o servidor
        const response = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            const mensagem = isEdicao
                ? `✅ Atendimento atualizado com sucesso!`
                : `✅ Atendimento salvo com sucesso! Registro: ${result.registro}`;

            showNotification(mensagem, 'success', 5000);

            // Limpar rascunho
            sessionStorage.removeItem('rascunhoAtendimento');

            // Comportamento diferente para edição vs criação
            setTimeout(() => {
                if (isEdicao) {
                    // Se está editando, voltar para a lista
                    voltarAtendimentos();
                } else {
                    // Se está criando, perguntar se quer criar outro
                    if (confirm('Atendimento salvo!\n\nDeseja criar um novo atendimento?')) {
                        document.getElementById('formNovoAtendimento').reset();
                        window.scrollTo(0, 0);

                        // Redefinir data e hora
                        const now = new Date();
                        document.querySelector('input[name="dataAtendimento"]').value = now.toISOString().split('T')[0];
                        document.querySelector('input[name="horaAtendimento"]').value = now.toTimeString().slice(0,5);
                    } else {
                        voltarAtendimentos();
                    }
                }
            }, 1500);

        } else {
            // Tratar erros específicos
            if (response.status === 401) {
                showNotification('❌ Sessão expirada. Redirecionando...', 'error');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else if (response.status === 403) {
                showNotification('❌ Você não tem permissão para criar atendimentos', 'error');
            } else if (response.status === 402) {
                showNotification('❌ Assinatura vencida. Entre em contato com o suporte.', 'error');
            } else {
                showNotification(
                    `❌ Erro ao salvar: ${result.error || 'Erro desconhecido'}`,
                    'error',
                    5000
                );
            }
        }

    } catch (error) {
        console.error('Erro ao salvar atendimento:', error);
        showNotification(
            `❌ Erro ao salvar atendimento: ${error.message}`,
            'error',
            5000
        );
    } finally {
        hideLoading();
    }
}

// ==========================================
// VOLTAR PARA LISTA DE ATENDIMENTOS
// ==========================================
function voltarAtendimentos() {
    const form = document.getElementById('formNovoAtendimento');
    const formData = new FormData(form);
    let hasData = false;

    // Verificar se há dados não salvos
    for (let [key, value] of formData.entries()) {
        if (value && value.trim() !== '') {
            hasData = true;
            break;
        }
    }

    if (hasData) {
        if (confirm('Há dados não salvos. Deseja salvar como rascunho antes de sair?')) {
            salvarRascunho();
        }
    }

    // Redirecionar para a lista de atendimentos
    window.location.href = '/pages/atendimento.html';
}

// ==========================================
// EXPORTAR PARA PDF COMPLETO
// ==========================================
async function exportarPDF() {
    try {
        showLoading('Gerando PDF completo...');

        const form = document.getElementById('formNovoAtendimento');
        const formData = new FormData(form);

        // Validar se há dados mínimos
        if (!formData.get('nomeCompleto')) {
            showNotification('⚠️ Preencha pelo menos o nome para gerar o PDF', 'warning');
            hideLoading();
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let y = 20;
        const leftMargin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxWidth = pageWidth - 30;

        // Função auxiliar para adicionar texto com quebra de linha
        function addText(text, x, yPos, maxW = maxWidth) {
            if (!text || text.trim() === '') return yPos;
            const lines = doc.splitTextToSize(text, maxW);
            doc.text(lines, x, yPos);
            return yPos + (lines.length * 5);
        }

        // Função para verificar nova página
        function checkNewPage() {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        }

        // Cabeçalho
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('FICHA DE ATENDIMENTO COMPLETA', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema Fortalece SUAS - Rio Pardo/RS', 105, y, { align: 'center' });
        y += 5;
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, y, { align: 'center' });
        y += 10;

        // Linha separadora
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(leftMargin, y, pageWidth - leftMargin, y);
        y += 8;

        // Função para adicionar seção
        function addSection(title) {
            checkNewPage();
            doc.setFillColor(37, 99, 235);
            doc.rect(leftMargin, y, maxWidth, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(title, leftMargin + 2, y + 5);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            y += 10;
        }

        // Função para adicionar campo
        function addField(label, value, bold = false) {
            checkNewPage();
            if (bold) doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, leftMargin, y);
            if (bold) doc.setFont('helvetica', 'normal');
            y = addText(value || 'Não informado', leftMargin + 50, y);
            y += 2;
        }

        // 1. DADOS DO ATENDIMENTO
        addSection('1. DADOS DO ATENDIMENTO');
        addField('Data do Atendimento', formData.get('dataAtendimento'));
        addField('Hora', formData.get('horaAtendimento'));
        addField('Recepcionista', formData.get('recepcionista'));
        y += 3;

        // 2. IDENTIFICAÇÃO DO USUÁRIO
        addSection('2. IDENTIFICAÇÃO DO USUÁRIO');
        addField('Nome Completo', formData.get('nomeCompleto'), true);
        addField('CPF', formData.get('cpf'));
        addField('RG', formData.get('rg'));
        addField('Data de Nascimento', formData.get('dataNascimento'));
        addField('Sexo', formData.get('sexo'));
        addField('Telefone', formData.get('telefone'));
        addField('Email', formData.get('email'));
        y += 3;

        // 3. ENDEREÇO
        addSection('3. ENDEREÇO');
        addField('CEP', formData.get('cep'));
        addField('Endereço', formData.get('endereco'));
        addField('Número', formData.get('numero'));
        addField('Complemento', formData.get('complemento'));
        addField('Bairro', formData.get('bairro'));
        addField('Cidade', formData.get('cidade'));
        addField('Estado', formData.get('estado'));
        y += 3;

        // 4. DADOS SOCIAIS
        addSection('4. DADOS SOCIAIS');
        addField('Estado Civil', formData.get('estadoCivil'));
        addField('Escolaridade', formData.get('escolaridade'));
        addField('Profissão', formData.get('profissao'));
        addField('Situação de Trabalho', formData.get('situacaoTrabalho'));
        addField('Renda Familiar', formData.get('rendaFamiliar'));
        addField('Beneficiário BPC', formData.get('beneficiarioBpc'));
        addField('Beneficiário Bolsa Família', formData.get('beneficiarioBolsaFamilia'));
        y += 3;

        // 5. COMPOSIÇÃO FAMILIAR
        addSection('5. COMPOSIÇÃO FAMILIAR');
        addField('Número de Pessoas na Família', formData.get('numeroPessoasFamilia'));
        addField('Possui Filhos', formData.get('possuiFilhos'));
        addField('Número de Filhos', formData.get('numeroFilhos'));
        y += 3;

        // 6. MOTIVOS DO ATENDIMENTO
        addSection('6. MOTIVOS DO ATENDIMENTO');
        const motivos = formData.getAll('motivosAtendimento[]');
        if (motivos.length > 0) {
            doc.text('Motivos selecionados:', leftMargin, y);
            y += 5;
            motivos.forEach(motivo => {
                checkNewPage();
                doc.text(`• ${motivo}`, leftMargin + 5, y);
                y += 5;
            });
        } else {
            doc.text('Nenhum motivo selecionado', leftMargin, y);
            y += 5;
        }
        y += 3;

        // 7. SITUAÇÕES ESPECÍFICAS
        addSection('7. SITUAÇÕES ESPECÍFICAS');
        const situacoes = formData.getAll('situacoesEspecificas[]');
        if (situacoes.length > 0) {
            doc.text('Situações identificadas:', leftMargin, y);
            y += 5;
            situacoes.forEach(situacao => {
                checkNewPage();
                doc.text(`• ${situacao}`, leftMargin + 5, y);
                y += 5;
            });
        } else {
            doc.text('Nenhuma situação específica identificada', leftMargin, y);
            y += 5;
        }
        y += 3;

        // 8. RELATO DO ATENDIMENTO
        addSection('8. RELATO DO ATENDIMENTO');
        y = addText(formData.get('relatoAtendimento') || 'Não informado', leftMargin, y);
        y += 3;

        // 9. OBSERVAÇÕES
        addSection('9. OBSERVAÇÕES');
        y = addText(formData.get('observacoes') || 'Não informado', leftMargin, y);
        y += 3;

        // 10. DOCUMENTAÇÃO APRESENTADA
        addSection('10. DOCUMENTAÇÃO APRESENTADA');
        const docs = formData.getAll('documentosApresentados[]');
        if (docs.length > 0) {
            docs.forEach(doc_item => {
                checkNewPage();
                doc.text(`• ${doc_item}`, leftMargin + 5, y);
                y += 5;
            });
        } else {
            doc.text('Nenhum documento registrado', leftMargin, y);
            y += 5;
        }
        y += 3;

        // 11. PROFISSIONAIS E ENCAMINHAMENTOS
        addSection('11. PROFISSIONAIS E ENCAMINHAMENTOS');
        addField('Técnico Responsável', formData.get('tecnicoResponsavel'));
        addField('Tipo de Atendimento', formData.get('tipoAtendimento'));
        addField('Unidade', formData.get('unidade'));
        addField('Prioridade', formData.get('prioridade'));
        addField('Status', formData.get('status'));
        addField('Data de Retorno', formData.get('dataRetorno'));
        addField('Encaminhamentos', formData.get('encaminhamentos'));
        addField('Providências Tomadas', formData.get('providenciasTomadas'));
        y += 3;

        // 12. CONTROLE DE ACESSO E SIGILO
        addSection('12. CONTROLE DE ACESSO E SIGILO');
        addField('Nível de Sigilo', formData.get('nivelSigilo'));
        addField('Observações sobre Sigilo', formData.get('observacoesSigilo'));
        y += 3;

        // 13. CONCLUSÃO DO ATENDIMENTO
        addSection('13. CONCLUSÃO DO ATENDIMENTO');
        addField('Tipo de Conclusão', formData.get('tipoConclusao'));
        addField('Descrição', formData.get('descricaoConclusao'));
        y += 3;

        // 14. CONTROLE DE FLUXO
        addSection('14. CONTROLE DE FLUXO');
        addField('Ação', formData.get('acaoFluxo'));
        addField('Reencaminhar Para', formData.get('reencaminharPara'));
        addField('Observações', formData.get('observacoesFluxo'));

        // Rodapé em todas as páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text(`Página ${i} de ${totalPages}`, 105, 290, { align: 'center' });
            doc.text('Sistema Fortalece SUAS - Documento Confidencial', 105, 295, { align: 'center' });
            doc.text('Rio Pardo/RS', leftMargin, 295);
        }

        // Salvar PDF
        const cpf = formData.get('cpf')?.replace(/\D/g, '') || Date.now();
        const nomeArquivo = `atendimento_completo_${cpf}_${Date.now()}.pdf`;
        doc.save(nomeArquivo);

        showNotification('✅ PDF completo gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showNotification('❌ Erro ao gerar PDF: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function showLoading(message = 'Carregando...') {
    const loadingElement = document.getElementById('loading-overlay');
    const messageElement = document.getElementById('loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loading-overlay');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;

    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; margin-left: auto; cursor: pointer; font-size: 1.25rem; color: inherit;">&times;</button>
    `;

    container.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
}

function logout() {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        showNotification('Encerrando sessão...', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// ==========================================
// MÁSCARAS DE INPUT
// ==========================================

function maskCPF(event) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    event.target.value = value;
}

// Função helper para formatar CPF
function formatCPF(cpf) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function maskTelefone(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 11) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 6) {
        value = value.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
    } else if (value.length >= 2) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
    }
    event.target.value = value;
}

function maskCEP(event) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    event.target.value = value;
}

// ==========================================
// AUTOCOMPLETE CEP
// ==========================================

async function autocompleteCEP(event) {
    const cep = event.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
        try {
            showLoading('Buscando endereço...');
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.querySelector('input[name="endereco"]').value = data.logradouro || '';
                document.querySelector('input[name="bairro"]').value = data.bairro || '';
                document.querySelector('input[name="cidade"]').value = data.localidade || 'Rio Pardo';
                document.querySelector('input[name="estado"]').value = data.uf || 'RS';
                showNotification('✅ Endereço encontrado!', 'success', 2000);
            } else {
                showNotification('CEP não encontrado', 'warning');
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            showNotification('Erro ao buscar CEP', 'error');
        } finally {
            hideLoading();
        }
    }
}

// ==========================================
// PREVENIR PERDA DE DADOS
// ==========================================

window.addEventListener('beforeunload', function(e) {
    const form = document.getElementById('formNovoAtendimento');
    const formData = new FormData(form);
    let hasData = false;

    for (let [key, value] of formData.entries()) {
        if (value && value.trim() !== '') {
            hasData = true;
            break;
        }
    }

    if (hasData) {
        e.preventDefault();
        e.returnValue = '';
        salvarRascunho(true); // Salvar rascunho silenciosamente ao sair
    }
});

// ==========================================
// ATALHOS DE TECLADO
// ==========================================

document.addEventListener('keydown', function(event) {
    // Ctrl+S para salvar rascunho
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        salvarRascunho();
    }

    // ESC para voltar
    if (event.key === 'Escape') {
        voltarAtendimentos();
    }

    // Ctrl+P para gerar PDF
    if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        exportarPDF();
    }
});

console.log('✅ Sistema de atendimento carregado e integrado com servidor!');
