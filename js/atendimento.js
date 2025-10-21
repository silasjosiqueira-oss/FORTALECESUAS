// js/atendimento.js

const API_URL = "http://localhost:3000/atendimentos";

// ============================
// Alternar Sub-Tabs
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const subTabs = document.querySelectorAll(".sub-tab");
    const subContents = document.querySelectorAll(".sub-tab-content");

    subTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            subTabs.forEach(t => t.classList.remove("active"));
            subContents.forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.target).classList.add("active");
        });
    });
});

// ============================
// Salvar novo atendimento
// ============================
document.getElementById("formNovoAtendimento").addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = {
        nome: document.getElementById("nomeUsuario").value,
        cpf: document.getElementById("cpfUsuario").value,
        data: document.getElementById("dataAtendimento").value,
        hora: document.getElementById("horaAtendimento").value,
        tipo: document.getElementById("tipoAtendimento").value,
        observacoes: document.getElementById("observacoesAtendimento").value
    };

    try {
        const resp = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (resp.ok) {
            alert("✅ Atendimento salvo com sucesso!");
            document.getElementById("formNovoAtendimento").reset();
            carregarAtendimentos();
        } else {
            alert("❌ Erro ao salvar atendimento.");
        }
    } catch (err) {
        console.error("Erro:", err);
        alert("❌ Falha na conexão com o servidor.");
    }
});

// ============================
// Carregar lista de atendimentos
// ============================
async function carregarAtendimentos() {
    try {
        const resp = await fetch(API_URL);
        const lista = await resp.json();

        const tbody = document.getElementById("corpoTabelaAtendimentos");
        tbody.innerHTML = "";

        lista.forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${a.id}</td>
                <td>${a.nome}</td>
                <td>${a.data}</td>
                <td>${a.tipo}</td>
                <td><span class="status-badge status-ativo">Ativo</span></td>
                <td>
                    <button class="btn btn--outline" onclick="removerAtendimento(${a.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao carregar:", err);
    }
}

// ============================
// Remover atendimento
// ============================
async function removerAtendimento(id) {
    if (!confirm("Tem certeza que deseja remover este atendimento?")) return;

    try {
        const resp = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        if (resp.ok) {
            alert("✅ Atendimento removido!");
            carregarAtendimentos();
        } else {
            alert("❌ Erro ao remover.");
        }
    } catch (err) {
        console.error("Erro:", err);
    }
}

// ============================
// Pesquisa de atendimentos
// ============================
document.getElementById("formPesquisaAtendimento").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("pesquisaNome").value.toLowerCase();
    const cpf = document.getElementById("pesquisaCpf").value;
    const inicio = document.getElementById("pesquisaDataInicio").value;
    const fim = document.getElementById("pesquisaDataFim").value;

    try {
        const resp = await fetch(API_URL);
        const lista = await resp.json();

        const filtrados = lista.filter(a => {
            return (!nome || a.nome.toLowerCase().includes(nome)) &&
                   (!cpf || a.cpf === cpf) &&
                   (!inicio || a.data >= inicio) &&
                   (!fim || a.data <= fim);
        });

        const resultado = document.getElementById("resultadoPesquisa");
        resultado.innerHTML = "";
        if (filtrados.length === 0) {
            resultado.innerHTML = "<p>Nenhum atendimento encontrado.</p>";
        } else {
            const ul = document.createElement("ul");
            filtrados.forEach(a => {
                ul.innerHTML += `<li>${a.id} - ${a.nome} - ${a.data} (${a.tipo})</li>`;
            });
            resultado.appendChild(ul);
        }
    } catch (err) {
        console.error("Erro na pesquisa:", err);
    }
});

window.limparPesquisa = () => {
    document.getElementById("formPesquisaAtendimento").reset();
    document.getElementById("resultadoPesquisa").innerHTML = "";
};

// ============================
// Auto-carregar lista ao abrir "Cadastrados"
// ============================
document.querySelector('[data-target="cadastrados"]').addEventListener("click", carregarAtendimentos);
