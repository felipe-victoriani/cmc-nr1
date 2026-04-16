// ============================================================
// empresas.js — CRUD de Empresas
// Requer perfil: admin_master
// ============================================================

import { requireProfile } from "./guards.js";
import {
  initAppUI,
  setBreadcrumb,
  showToast,
  openModal,
  closeModal,
  showConfirm,
  showLoader,
  hideLoader,
  renderPagination,
  renderEmptyState,
  renderSkeletonTable,
} from "./ui.js";
import {
  getCompanies,
  saveCompany,
  deleteCompany,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import {
  maskCNPJ,
  maskPhone,
  maskCEP,
  applyAllMasks,
  formatDate,
} from "./utils.js";

await requireProfile(["admin_master"]);
await initAppUI();
setBreadcrumb([{ label: "Início", href: "index.html" }, { label: "Empresas" }]);

// ──────────────────────────────────────────────────────────
// ESTADO
// ──────────────────────────────────────────────────────────
let _all = []; // todos os registros
let _page = 1;
const PER_PAGE = 15;

// ──────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ──────────────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document.getElementById("filterStatus").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterRisk").addEventListener("change", () => {
  _page = 1;
  render();
});

await loadData();

// ──────────────────────────────────────────────────────────
// CARREGAMENTO
// ──────────────────────────────────────────────────────────
async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 6, 5);
  try {
    _all = await getCompanies();
    _page = 1;
    render();
  } catch (err) {
    showToast("Erro ao carregar empresas: " + err.message, "error");
  }
}

// ──────────────────────────────────────────────────────────
// FILTRO E RENDER
// ──────────────────────────────────────────────────────────
function getFiltered() {
  const q = (document.getElementById("searchInput").value || "")
    .toLowerCase()
    .trim();
  const status = document.getElementById("filterStatus").value;
  const risk = document.getElementById("filterRisk").value;

  return _all.filter((c) => {
    const matchQ =
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.cnpj || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
      (c.tradeName || "").toLowerCase().includes(q);
    const matchS = !status || c.status === status;
    const matchR = !risk || String(c.riskGrade) === risk;
    return matchQ && matchS && matchR;
  });
}

function render() {
  const filtered = getFiltered();
  const total = filtered.length;
  const start = (_page - 1) * PER_PAGE;
  const page = filtered.slice(start, start + PER_PAGE);

  const wrap = document.getElementById("tableWrapper");

  if (total === 0) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M9 21V7l7-4v18M9 10.5H3v10.5"/></svg>`,
      title: "Nenhuma empresa encontrada",
      description:
        'Clique em "Nova Empresa" para adicionar a primeira empresa.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  const statusBadge = (s) =>
    s === "inactive"
      ? `<span class="badge badge-gray">Inativa</span>`
      : `<span class="badge badge-success">Ativa</span>`;

  const riskBadge = (g) => {
    const map = {
      1: "badge-success",
      2: "badge-info",
      3: "badge-warning",
      4: "badge-danger",
    };
    return g
      ? `<span class="badge ${map[String(g)] || ""}">Grau ${g}</span>`
      : "—";
  };

  wrap.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Empresa</th>
          <th>CNPJ</th>
          <th>Grau de Risco</th>
          <th>Segmento</th>
          <th>Status</th>
          <th>Cadastro</th>
          <th style="width:100px"></th>
        </tr>
      </thead>
      <tbody>
        ${page
          .map(
            (c) => `
          <tr>
            <td>
              <div style="font-weight:var(--font-medium)">${c.name}</div>
              ${c.tradeName ? `<div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${c.tradeName}</div>` : ""}
            </td>
            <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${c.cnpj || "—"}</td>
            <td>${riskBadge(c.riskGrade)}</td>
            <td>${c.segment || "—"}</td>
            <td>${statusBadge(c.status)}</td>
            <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${formatDate(c.createdAt)}</td>
            <td>
              <div style="display:flex;gap:var(--sp-1)">
                <button class="btn btn-ghost btn-icon btn-sm" title="Editar" data-action="edit" data-id="${c.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm text-danger" title="Excluir" data-action="delete" data-id="${c.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;

  // Botões de ação
  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        openForm(_all.find((c) => c.id === btn.dataset.id)),
      ),
    );
  wrap
    .querySelectorAll('[data-action="delete"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => confirmDelete(btn.dataset.id)),
    );

  // Paginação
  const pagEl = document.getElementById("paginationContainer");
  pagEl.style.display = total > PER_PAGE ? "" : "none";
  if (total > PER_PAGE) {
    renderPagination(pagEl, total, _page, PER_PAGE, (pg) => {
      _page = pg;
      render();
    });
  }
}

// ──────────────────────────────────────────────────────────
// MODAL CRIAR / EDITAR
// ──────────────────────────────────────────────────────────
function openForm(item = null) {
  const tpl = document.getElementById("tplModalEmpresa");
  const body = tpl.content.cloneNode(true);
  const wrap = document.createElement("div");
  wrap.appendChild(body);

  openModal({
    title: item ? "Editar Empresa" : "Nova Empresa",
    body: wrap.innerHTML,
    size: "modal-lg",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar Alterações" : "Criar Empresa",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  // Preenche form se edição
  if (item) {
    const form =
      document.querySelector("#modalBackdrop form") ||
      document.querySelector(".modal-body");
    fillForm(item);
  }

  // Máscaras e limpar erros no input
  applyAllMasks(document.querySelector(".modal-body"));
  clearOnInput(document.querySelector(".modal-body"));
}

function fillForm(item) {
  const fields = [
    "name",
    "tradeName",
    "cnpj",
    "cnae",
    "riskGrade",
    "segment",
    "phone",
    "email",
    "street",
    "number",
    "complement",
    "neighborhood",
    "city",
    "state",
    "cep",
    "status",
  ];
  fields.forEach((f) => {
    const el = document.querySelector(`.modal-body [name="${f}"]`);
    if (!el) return;
    if (el.tagName === "SELECT") el.value = item[f] || "";
    else el.value = item[f] || "";
  });
}

// ──────────────────────────────────────────────────────────
// SALVAR
// ──────────────────────────────────────────────────────────
async function submitForm(id = null) {
  const body = document.querySelector(".modal-body");
  const rules = {
    name: { required: true, label: "Razão Social" },
    cnpj: { required: true, cnpj: true, label: "CNPJ" },
    riskGrade: { required: true, label: "Grau de Risco" },
    email: { email: true, label: "E-mail" },
  };

  const { valid, data } = validateForm(body, rules);
  if (!valid) return;

  // Limpa CNPJ para armazenar só dígitos + formatado
  data.cnpj = maskCNPJ(data.cnpj || "");

  try {
    const savedId = await saveCompany(data, id);
    showToast(
      id ? "Empresa atualizada!" : "Empresa criada com sucesso!",
      "success",
    );
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro ao salvar: " + err.message, "error");
  }
}

// ──────────────────────────────────────────────────────────
// EXCLUIR
// ──────────────────────────────────────────────────────────
async function confirmDelete(id) {
  const company = _all.find((c) => c.id === id);
  const ok = await showConfirm(
    `Deseja excluir a empresa "<strong>${company?.name || id}</strong>"? Esta ação não pode ser desfeita.`,
    "Excluir Empresa",
    "btn-danger",
  );
  if (!ok) return;
  try {
    await deleteCompany(id);
    showToast("Empresa excluída.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro ao excluir: " + err.message, "error");
  }
}
