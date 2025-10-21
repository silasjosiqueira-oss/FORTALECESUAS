document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000/api";  // URL correta para a API

  // Função para carregar eventos
  async function carregarEventos() {
    try {
      const res = await fetch(`${API}/eventos`);
      if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);  // Verifica se a requisição foi bem-sucedida
      const eventos = await res.json();  // Converte a resposta em JSON

      const lista = document.querySelector("#tab-calendario .event-list");
      if (!lista) return;  // Se o elemento não for encontrado, retorna

      lista.innerHTML = "";  // Limpa a lista antes de adicionar os eventos

      eventos.forEach(ev => {
        lista.innerHTML += `
          <div class="event-item">
            <div class="event-time">
              <div class="event-hour">${ev.hora}</div>
              <div class="event-date">${new Date(ev.data).toLocaleDateString("pt-BR")}</div>
            </div>
            <div class="event-details">
              <div class="event-title">${ev.titulo}</div>
              <div class="event-description">${ev.descricao || ""}</div>
              <div class="event-participants"><i class="fas fa-users"></i> ${ev.participantes || ""}</div>
            </div>
          </div>
        `;
      });
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);  // Mostra erro no console
      alert("Ocorreu um erro ao carregar os eventos. Tente novamente.");
    }
  }

  // Função para carregar agendamentos
  async function carregarAgendamentos() {
    try {
      const res = await fetch(`${API}/eventos`);  // URL de eventos
      if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
      const data = await res.json();

      const tbody = document.querySelector("#tab-agendamentos tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      data.forEach(a => {
        tbody.innerHTML += `
          <tr>
            <td>${new Date(a.data).toLocaleDateString("pt-BR")} ${a.hora}</td>
            <td>${a.usuario}</td>
            <td>${a.servico}</td>
            <td>${a.profissional || "-"}</td>
            <td><span class="status-badge status-ativo">${a.status || "Agendado"}</span></td>
            <td class="table-actions">
              <button class="btn btn--sm btn--outline"><i class="fas fa-eye"></i></button>
              <button class="btn btn--sm btn--outline"><i class="fas fa-edit"></i></button>
              <button class="btn btn--sm btn--outline"><i class="fas fa-times"></i></button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
      alert("Ocorreu um erro ao carregar os agendamentos. Tente novamente.");
    }
  }

  // Função para carregar atividades
  async function carregarAtividades() {
    try {
      const res = await fetch(`${API}/atividades`);
      if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
      const data = await res.json();

      const tbody = document.querySelector("#tab-atividades tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      data.forEach(at => {
        tbody.innerHTML += `
          <tr>
            <td>${at.atividade}</td>
            <td>${at.descricao}</td>
            <td>${at.dia}, ${at.horario}</td>
            <td>${at.participantes}</td>
            <td>${at.responsavel}</td>
            <td class="table-actions">
              <button class="btn btn--sm btn--outline"><i class="fas fa-eye"></i></button>
              <button class="btn btn--sm btn--outline"><i class="fas fa-edit"></i></button>
              <button class="btn btn--sm btn--outline"><i class="fas fa-users"></i></button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error("Erro ao carregar atividades:", err);
      alert("Ocorreu um erro ao carregar as atividades. Tente novamente.");
    }
  }

  // Função para carregar institucional
  async function carregarInstitucional() {
    try {
      const res = await fetch(`${API}/institucional`);
      if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
      const data = await res.json();

      const lista = document.querySelector("#tab-institucional .event-list");
      if (!lista) return;
      lista.innerHTML = "";

      data.forEach(ev => {
        lista.innerHTML += `
          <div class="event-item">
            <div class="event-time">
              <div class="event-hour">${ev.hora}</div>
              <div class="event-date">${new Date(ev.data).toLocaleDateString("pt-BR")}</div>
            </div>
            <div class="event-details">
              <div class="event-title">${ev.titulo}</div>
              <div class="event-description">${ev.descricao}</div>
              <div class="event-participants"><i class="fas fa-users"></i> ${ev.participantes?.join(", ") || ""}</div>
            </div>
          </div>
        `;
      });
    } catch (err) {
      console.error("Erro ao carregar institucional:", err);
      alert("Ocorreu um erro ao carregar a agenda institucional. Tente novamente.");
    }
  }

  // Inicializa o carregamento dos dados
  carregarEventos();
  carregarAgendamentos();
  carregarAtividades();
  carregarInstitucional();
});
