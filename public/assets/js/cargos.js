// ============================================================
// cargos.js — CRUD de Cargos e Funções
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
  getRoles,
  saveRole,
  deleteRole,
  getCompanies,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate } from "./utils.js";

await requireProfile(["admin_master", "gestor_rh", "gestor_unidade"]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Organização" },
  { label: "Cargos" },
]);

const profile = getCurrentProfile();
const isAdmin = profile.tipo === "admin_master";
const companyId = profile.companyId || null;

let _all = [];
let _companies = [];
let _page = 1;
const PER_PAGE = 20;

if (isAdmin) {
  _companies = await getCompanies();
}

const RISK_BADGE = {
  low: `<span class="badge badge-success">Baixo</span>`,
  medium: `<span class="badge badge-warning">Médio</span>`,
  high: `<span class="badge badge-danger">Alto</span>`,
  critical: `<span class="badge" style="background:var(--clr-risk-critical);color:white">Crítico</span>`,
};

document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document.getElementById("filterRisk").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterStatus").addEventListener("change", () => {
  _page = 1;
  render();
});

await loadData();

async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 6, 4);
  _all = await getRoles(companyId);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const rk = document.getElementById("filterRisk").value;
  const st = document.getElementById("filterStatus").value;
  return _all.filter(
    (r) =>
      (!q ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.cbo || "").includes(q)) &&
      (!rk || r.riskLevel === rk) &&
      (!st || r.status === st),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/></svg>`,
      title: "Nenhum cargo encontrado",
      description: 'Clique em "Novo Cargo" para adicionar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  const stBadge = (s) =>
    s === "inactive"
      ? `<span class="badge badge-gray">Inativo</span>`
      : `<span class="badge badge-success">Ativo</span>`;

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Cargo / Função</th><th>CBO</th><th>Nível de Risco</th><th>EPIs</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map(
          (r) => `<tr>
        <td><div style="font-weight:var(--font-medium)">${r.name}</div></td>
        <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${r.cbo || "—"}</td>
        <td>${RISK_BADGE[r.riskLevel] || '<span style="color:var(--clr-text-muted)">—</span>'}</td>
        <td style="font-size:var(--text-xs);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.requiredEquipment || "—"}</td>
        <td>${stBadge(r.status)}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
        .join("")}
    </tbody></table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((r) => r.id === b.dataset.id)),
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

  if (isAdmin) {
    const firstGroup = body.querySelector(".form-group");
    const gCompany = document.createElement("div");
    gCompany.className = "form-group col-span-full";
    gCompany.innerHTML = `
      <label class="form-label">Empresa <span class="required">*</span></label>
      <select class="form-control" name="companyId" id="selectCompanyCargo">
        <option value="">Selecione a empresa</option>
        ${_companies.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
      <span class="form-error">Obrigatório.</span>`;
    firstGroup.parentNode.insertBefore(gCompany, firstGroup);
  }

  openModal({
    title: item ? "Editar Cargo" : "Novo Cargo",
    body: body.innerHTML,
    size: "modal-md",
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
    [
      "name",
      "cbo",
      "riskLevel",
      "description",
      "requiredEquipment",
      "status",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el)
        el.tagName === "SELECT"
          ? (el.value = item[f] || "")
          : (el.value = item[f] || "");
    });
    if (isAdmin && item.companyId) {
      const sel = document.querySelector(".modal-body #selectCompanyCargo");
      if (sel) sel.value = item.companyId;
    }
  }
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const rules = { name: { required: true, label: "Cargo" } };
  if (isAdmin) rules.companyId = { required: true, label: "Empresa" };
  const { valid, data } = validateForm(
    document.querySelector(".modal-body"),
    rules,
  );
  if (!valid) return;
  if (!isAdmin) data.companyId = companyId;
  try {
    await saveRole(data, id);
    showToast(id ? "Cargo atualizado!" : "Cargo criado!", "success");
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((r) => r.id === id);
  if (
    !(await showConfirm(
      `Excluir cargo <strong>${item?.name || id}</strong>?`,
      "Excluir Cargo",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteRole(id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}
