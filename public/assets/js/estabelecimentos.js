// ============================================================
// estabelecimentos.js — CRUD de Estabelecimentos
// ============================================================

import { requireProfile } from "./guards.js";
import {
  initAppUI,
  setBreadcrumb,
  showToast,
  openModal,
  closeModal,
  showConfirm,
  renderPagination,
  renderEmptyState,
  renderSkeletonTable,
} from "./ui.js";
import { getCurrentProfile } from "./auth.js";
import {
  getEstablishments,
  saveEstablishment,
  deleteEstablishment,
  getCompanies,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate, applyAllMasks } from "./utils.js";

await requireProfile(["admin_master", "gestor_rh", "gestor_unidade"]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Estabelecimentos" },
]);

const profile = getCurrentProfile();
const isAdmin = profile.profile === "admin_master";
const companyId = profile.companyId || null;

let _all = [];
let _companies = [];
let _page = 1;
const PER_PAGE = 15;

// ── Carrega empresas para filtro (só admin vê todas) ───────
if (isAdmin) {
  _companies = await getCompanies();
  const sel = document.getElementById("filterCompany");
  _companies.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
} else {
  document.getElementById("filterCompany")?.closest?.("div")?.remove?.();
}

// ── Eventos ────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document.getElementById("filterStatus").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterCompany")?.addEventListener("change", () => {
  _page = 1;
  render();
});

await loadData();

// ──────────────────────────────────────────────────────────
async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 5, 5);
  _all = await getEstablishments(isAdmin ? null : companyId);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const st = document.getElementById("filterStatus").value;
  const cId = document.getElementById("filterCompany")?.value || "";
  return _all.filter(
    (e) =>
      (!q ||
        (e.name || "").toLowerCase().includes(q) ||
        (e.city || "").toLowerCase().includes(q)) &&
      (!st || e.status === st) &&
      (!cId || e.companyId === cId),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const compMap = Object.fromEntries(_companies.map((c) => [c.id, c.name]));

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M9 21V7l7-4v18M9 10.5H3v10.5"/></svg>`,
      title: "Nenhum estabelecimento encontrado",
      description: 'Clique em "Novo Estabelecimento" para adicionar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  const typeLbl = {
    head: "Matriz",
    branch: "Filial",
    warehouse: "Depósito",
    office: "Escritório",
    factory: "Fábrica",
    other: "Outro",
  };
  const stBadge = (s) =>
    s === "inactive"
      ? `<span class="badge badge-gray">Inativo</span>`
      : `<span class="badge badge-success">Ativo</span>`;

  wrap.innerHTML = `
    <table class="table">
      <thead><tr>
        <th>Nome</th><th>Tipo</th>${isAdmin ? "<th>Empresa</th>" : ""}
        <th>Cidade/UF</th><th>Trabalhadores</th><th>Status</th><th style="width:88px"></th>
      </tr></thead>
      <tbody>${page
        .map(
          (e) => `<tr>
        <td style="font-weight:var(--font-medium)">${e.name}</td>
        <td>${typeLbl[e.type] || e.type || "—"}</td>
        ${isAdmin ? `<td style="font-size:var(--text-xs)">${compMap[e.companyId] || e.companyId || "—"}</td>` : ""}
        <td>${[e.city, e.state].filter(Boolean).join(" – ") || "—"}</td>
        <td>${e.employeeCount ?? "—"}</td>
        <td>${stBadge(e.status)}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${e.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${e.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
        .join("")}</tbody>
    </table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((e) => e.id === b.dataset.id)),
      ),
    );
  wrap
    .querySelectorAll('[data-action="delete"]')
    .forEach((b) =>
      b.addEventListener("click", () => confirmDelete(b.dataset.id)),
    );

  const pag = document.getElementById("paginationContainer");
  pag.style.display = filtered.length > PER_PAGE ? "" : "none";
  if (filtered.length > PER_PAGE)
    renderPagination(pag, filtered.length, _page, PER_PAGE, (pg) => {
      _page = pg;
      render();
    });
}

function openForm(item = null) {
  const tpl = document.getElementById("tplModal");
  const body = document.createElement("div");
  body.innerHTML = tpl.innerHTML;

  // Popula dropdown de empresas
  const sel = body.querySelector("#selectCompany");
  if (isAdmin && sel) {
    _companies.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } else if (sel) {
    sel.innerHTML = `<option value="${companyId}">${profile.companyName || "Minha Empresa"}</option>`;
    body.querySelector('[id="g-companyId"]')?.remove?.();
  }

  openModal({
    title: item ? "Editar Estabelecimento" : "Novo Estabelecimento",
    body: body.innerHTML,
    size: "modal-lg",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar" : "Criar",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  if (item) {
    const fields = [
      "companyId",
      "name",
      "type",
      "cnpj",
      "phone",
      "address",
      "city",
      "state",
      "cep",
      "employeeCount",
      "status",
      "notes",
    ];
    fields.forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el)
        el.tagName === "SELECT"
          ? (el.value = item[f] || "")
          : (el.value = item[f] ?? "");
    });
  }
  applyAllMasks(document.querySelector(".modal-body"));
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    companyId: { required: isAdmin, label: "Empresa" },
    name: { required: true, label: "Nome" },
    address: { required: true, label: "Endereço" },
  });
  if (!valid) return;
  if (!isAdmin) data.companyId = companyId;
  try {
    await saveEstablishment(data, id);
    showToast(
      id ? "Estabelecimento atualizado!" : "Estabelecimento criado!",
      "success",
    );
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro ao salvar: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((e) => e.id === id);
  if (
    !(await showConfirm(
      `Excluir <strong>${item?.name || id}</strong>? Esta ação não pode ser desfeita.`,
      "Excluir Estabelecimento",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteEstablishment(id);
    showToast("Excluído com sucesso.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro ao excluir: " + err.message, "error");
  }
}
