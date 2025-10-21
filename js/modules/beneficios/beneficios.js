// js/beneficios.js
import { BeneficioService } from './modules/beneficios/BeneficioService.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando sistema de benefícios...');

    inicializarTabs();
    inicializarFormularios();
    inicializarNavegacao();
    await carregarTabelaBeneficios();
    inicializarAcoesTabela();

    console.log('Sistema de benefícios iniciado com sucesso!');
});

/**
 * Inicializa as abas
 */
function inicializarTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', e => {
            e.preventDefault();
            const tabId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const target = document.getElementById(`tab-${tabId}`);
            if (target) target.classList.add('active');
        });
    });
}

/**
 * Inicializa formulários e botões
 */
function inicializarFormularios() {
    const btnNovo = document.getElementById('btn-novo-beneficio');
    btnNovo.addEventListener('click', () => ativarAba('cadastro'));

    const form = document.getElementById('form-beneficio');
    form.addEventListener('submit', e => {
        e.preventDefault();
        alert('Benefício salvo com sucesso!');
        ativarAba('lista');
        form.reset();
    });

    const btnsCancelar = document.querySelectorAll('.btn--outline');
    btnsCancelar.forEach(btn => {
        btn.addEventListener('click', () => ativarAba('lista'));
    });
}

/**
 * Marca o menu lateral ativo
 */
function inicializarNavegacao() {
    const linksMenu = document.querySelectorAll('.sidebar__nav a');
    linksMenu.forEach(link => {
        link.classList.remove('active');
        if (link.href.includes('beneficios.html') || link.getAttribute('href') === 'beneficios.html') {
            link.classList.add('active');
        }
    });
}

/**
 * Ativa uma aba pelo ID
 */
function ativarAba(tabId) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const targetTab = document.querySelector(`[data-tab="${tabId}"]`);
    const targetContent = document.getElementById(`tab-${tabId}`);

    if (targetTab && targetContent) {
        targetTab.classList.add('active');
        targetContent.classList.add('active');
    }
}

/**
 * Carrega a tabela de benefícios
 */
async function carregarTabelaBeneficios() {
    const tbody = document.getElementById('tbody-beneficios');
    tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';

    const beneficios = await BeneficioService.listarTodos();
    tbody.innerHTML = '';

    beneficios.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b.nome}</td>
            <td>${b.valor}</td>
            <td><span class="status-badge ${b.status === 'ativo' ? 'status-ativo' : 'status-inativo'}">${b.status}</span></td>
            <td>
                <button class="btn btn--outline btn-visualizar">Visualizar</button>
                <button class="btn btn--outline btn-editar">Editar</button>
                <button class="btn btn--outline btn-excluir">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Inicializa ações da tabela (Visualizar, Editar, Excluir)
 */
function inicializarAcoesTabela() {
    const tbody = document.getElementById('tbody-beneficios');

    tbody.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;

        const tr = target.closest('tr');
        const nome = tr.children[0].textContent;

        if (target.classList.contains('btn-visualizar')) {
            alert(`Visualizando benefício: ${nome}`);
        } else if (target.classList.contains('btn-editar')) {
            ativarAba('cadastro');
            alert(`Editando benefício: ${nome}`);
        } else if (target.classList.contains('btn-excluir')) {
            if (confirm(`Deseja realmente excluir o benefício "${nome}"?`)) {
                tr.remove();
            }
        }
    });
}
