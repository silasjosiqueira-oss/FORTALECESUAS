import { AtendimentoService } from '../AtendimentoService.js';
import { validarCPF } from '../../shared/validators/cpfValidator.js';

export class FormAtendimento {
    constructor() {
        this.formData = {
            dadosBasicos: {},
            especificidades: {},
            contato: {},
            documentacao: {},
            saude: {},
            remuneracao: {},
            composicaoFamiliar: []
        };
    }

    init() {
        this.carregarFormulario();
        this.configurarEventos();
    }

    async carregarFormulario() {
        const form = document.getElementById('form-recepcao');
        if (!form) return;

        form.innerHTML = this.getFormTemplate();
        this.configurarMascaras();
        this.configurarValidacoes();
    }

    getFormTemplate() {
        return `
            <!-- 1. DADOS BÁSICOS -->
            <div class="form-section">
                <h4>1. Dados Básicos do Atendimento</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Código do Recepcionista*</label>
                        <input type="text" class="form-input" name="codigo_recepcionista" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data do Atendimento*</label>
                        <input type="datetime-local" class="form-input" name="data_atendimento" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Formato do Atendimento*</label>
                        <select class="form-input" name="formato_atendimento" required>
                            <option value="">Selecione...</option>
                            <option value="presencial">Presencial</option>
                            <option value="telefonico">Telefônico</option>
                            <option value="virtual">Virtual</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unidade*</label>
                        <select class="form-input" name="unidade" required>
                            <option value="">Selecione...</option>
                            <option value="cras">CRAS</option>
                            <option value="creas">CREAS</option>
                            <option value="secretaria">Secretaria de Assistência</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 2. DADOS PESSOAIS -->
            <div class="form-section">
                <h4>2. Dados Pessoais do Cidadão</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Nome Completo*</label>
                        <input type="text" class="form-input" name="nome_completo" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome Social</label>
                        <input type="text" class="form-input" name="nome_social">
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPF*</label>
                        <input type="text" class="form-input" name="cpf" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Nascimento*</label>
                        <input type="date" class="form-input" name="data_nascimento" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado Civil*</label>
                        <select class="form-input" name="estado_civil" required>
                            <option value="">Selecione...</option>
                            <option value="solteiro">Solteiro(a)</option>
                            <option value="casado">Casado(a)</option>
                            <option value="viuvo">Viúvo(a)</option>
                            <option value="separado">Separado(a)</option>
                            <option value="divorciado">Divorciado(a)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">NIS (Número de Identificação Social)</label>
                        <input type="text" class="form-input" name="nis">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Número CADÚNICO</label>
                        <input type="text" class="form-input" name="cadunico">
                    </div>
                </div>
            </div>

            <!-- 3. CONTATO E ENDEREÇO -->
            <div class="form-section">
                <h4>3. Contato e Endereço</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Telefone/Celular*</label>
                        <input type="tel" class="form-input" name="telefone" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" name="email">
                    </div>
                    <div class="form-group">
                        <label class="form-label">CEP*</label>
                        <input type="text" class="form-input" name="cep" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Endereço*</label>
                        <input type="text" class="form-input" name="endereco" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Número*</label>
                        <input type="text" class="form-input" name="numero" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bairro*</label>
                        <input type="text" class="form-input" name="bairro" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cidade*</label>
                        <input type="text" class="form-input" name="cidade" required>
                    </div>
                </div>
            </div>

            <!-- 4. MOTIVO DO ATENDIMENTO -->
            <div class="form-section">
                <h4>4. Motivo do Atendimento</h4>
                <div class="checkbox-group">
                    <label class="form-label">Selecione os serviços solicitados:*</label>
                    <div class="checkbox-item">
                        <input type="checkbox" name="motivo_atendimento" value="psicologico" id="motivo-psicologico">
                        <label for="motivo-psicologico">Atendimento Psicológico</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" name="motivo_atendimento" value="psicosocial" id="motivo-psicosocial">
                        <label for="motivo-psicosocial">Atendimento Psicosocial</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" name="motivo_atendimento" value="social" id="motivo-social">
                        <label for="motivo-social">Atendimento Social</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" name="motivo_atendimento" value="atualizacao_cadastro" id="motivo-atualizacao">
                        <label for="motivo-atualizacao">Atualização Cadastro Único</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" name="motivo_atendimento" value="auxilio_brasil" id="motivo-auxilio">
                        <label for="motivo-auxilio">Auxílio Brasil</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" name="motivo_atendimento" value="encaminhamento_bpc" id="motivo-bpc">
                        <label for="motivo-bpc">Encaminhamento BPC</label>
                    </div>
                    <!-- Adicione outros motivos conforme a minuta -->
                </div>

                <div class="form-group">
                    <label class="form-label">Descrição detalhada da demanda*</label>
                    <textarea class="form-input" name="descricao_demanda" rows="4" required></textarea>
                </div>
            </div>

            <!-- 5. INFORMAÇÕES REMOTAS -->
            <div class="form-section">
                <h4>5. Informações para Retorno (se aplicável)</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Melhor horário para contato</label>
                        <input type="time" class="form-input" name="melhor_horario">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Informações adicionais para retorno</label>
                        <textarea class="form-input" name="info_retorno" rows="3"></textarea>
                    </div>
                </div>
            </div>

            <!-- AÇÕES DO FORMULÁRIO -->
            <div class="form-actions">
                <button type="button" class="btn btn--outline" id="btn-cancelar">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="button" class="btn btn--secondary" id="btn-rascunho">
                    <i class="fas fa-save"></i> Salvar Rascunho
                </button>
                <button type="submit" class="btn btn--primary" id="btn-encaminhar">
                    <i class="fas fa-paper-plane"></i> Encaminhar para Atendimento
                </button>
            </div>
        `;
    }

    configurarMascaras() {
        // Configurar máscaras para CPF, telefone, CEP, etc.
        const cpfInput = document.querySelector('input[name="cpf"]');
        const telefoneInput = document.querySelector('input[name="telefone"]');
        const cepInput = document.querySelector('input[name="cep"]');

        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) value = value.slice(0, 11);

                if (value.length > 9) {
                    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                } else if (value.length > 6) {
                    value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
                } else if (value.length > 3) {
                    value = value.replace(/(\d{3})(\d+)/, '$1.$2');
                }
                e.target.value = value;
            });
        }
    }

    configurarValidacoes() {
        const form = document.getElementById('form-recepcao');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validarFormulario()) {
                this.salvarAtendimento();
            }
        });

        // Validação em tempo real do CPF
        const cpfInput = document.querySelector('input[name="cpf"]');
        if (cpfInput) {
            cpfInput.addEventListener('blur', () => {
                this.validarCPF(cpfInput);
            });
        }
    }

    validarFormulario() {
        let isValid = true;
        const requiredFields = document.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = 'var(--color-danger)';
                isValid = false;
            } else {
                field.style.borderColor = '';
            }
        });

        // Validação específica do CPF
        const cpfInput = document.querySelector('input[name="cpf"]');
        if (cpfInput && !this.validarCPF(cpfInput)) {
            isValid = false;
        }

        return isValid;
    }

    validarCPF(input) {
        const cpf = input.value.replace(/\D/g, '');
        if (cpf && !validarCPF(cpf)) {
            input.style.borderColor = 'var(--color-danger)';
            alert('CPF inválido! Por favor, verifique o número digitado.');
            return false;
        }
        input.style.borderColor = '';
        return true;
    }

    async salvarAtendimento() {
        try {
            const formData = this.coletarDadosFormulario();
            const resultado = await AtendimentoService.criar(formData);

            if (resultado) {
                alert('Atendimento cadastrado com sucesso!');
                this.fecharModal();
                // Recarregar a lista de atendimentos
                if (typeof window.carregarAtendimentos === 'function') {
                    window.carregarAtendimentos();
                }
            }
        } catch (error) {
            console.error('Erro ao salvar atendimento:', error);
            alert('Erro ao salvar atendimento. Tente novamente.');
        }
    }

    coletarDadosFormulario() {
        const form = document.getElementById('form-recepcao');
        const formData = new FormData(form);
        const dados = {};

        // Coletar todos os dados do formulário
        for (let [key, value] of formData.entries()) {
            // Para checkboxes com mesmo name
            if (key === 'motivo_atendimento') {
                if (!dados[key]) dados[key] = [];
                dados[key].push(value);
            } else {
                dados[key] = value;
            }
        }

        return dados;
    }

    fecharModal() {
        const modal = document.getElementById('modal-novo-atendimento');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// Inicializar o formulário quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const formAtendimento = new FormAtendimento();
    formAtendimento.init();

    // Botão para abrir o modal de novo atendimento
    const btnNovoAtendimento = document.getElementById('btn-novo-atendimento');
    if (btnNovoAtendimento) {
        btnNovoAtendimento.addEventListener('click', () => {
            const modal = document.getElementById('modal-novo-atendimento');
            if (modal) {
                modal.classList.add('active');
                formAtendimento.carregarFormulario();
            }
        });
    }

    // Botão para fechar o modal
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            formAtendimento.fecharModal();
        });
    }

    // Botão cancelar dentro do modal
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            formAtendimento.fecharModal();
        });
    }
});
