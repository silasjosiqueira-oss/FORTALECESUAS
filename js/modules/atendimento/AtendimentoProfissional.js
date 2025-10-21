document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"), 10);

  const service = window.AtendimentoService;
  const atendimento = service.buscar(id);

  if (!atendimento) {
    alert("Atendimento não encontrado!");
    window.location.href = "atendimento.html";
    return;
  }

  // Preenche dados básicos
  document.getElementById("nomeCidadao").value = atendimento.cidadao;
  document.getElementById("cpfCidadao").value = atendimento.cpf;

  // Salvar atualização
  document.getElementById("formProfissional").addEventListener("submit", e => {
    e.preventDefault();

    atendimento.identificacao = {
      nomeSocial: document.getElementById("nomeSocial").value,
      estadoCivil: document.getElementById("estadoCivil").value,
      dataNascimento: document.getElementById("dataNascimento").value,
      corRaca: document.getElementById("corRaca").value,
      sexo: document.getElementById("sexo").value,
      identidadeGenero: document.getElementById("identidadeGenero").value,
      orientacaoSexual: document.getElementById("orientacaoSexual").value
    };

    atendimento.saude = {
      observacoes: document.getElementById("saudeObs").value
    };

    atendimento.remuneracao = {
      situacao: document.getElementById("remuneracao").value,
      valor: document.getElementById("valorRemuneracao").value
    };

    atendimento.encaminhamentos = document.getElementById("encaminhamentos").value;

    service.atualizar(id, atendimento);
    alert("Atendimento atualizado com sucesso!");
  });
});
