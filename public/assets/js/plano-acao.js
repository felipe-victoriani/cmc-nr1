// ============================================================
// plano-acao.js — Plano de Ação (CAPA / PGR)
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
  getActionPlans,
  saveActionPlan,
  deleteActionPlan,
  getRisks,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import {
  formatDate,
  daysUntil,
  urgencyClass,
  exportCSV,
  ACTION_STATUS_BADGES,
  ACTION_STATUS_LABELS,
} from "./utils.js";

await requireProfile([
  "admin_master",
  "gestor_rh",
  "gestor_unidade",
  "tecnico_sst",
]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "SST / NR-1" },
  { label: "Plano de Ação" },
]);

const profile = getCurrentProfile();
const companyId = profile.companyId || null;

let _all = [];
let _risks = [];
let _page = 1;
const PER_PAGE = 20;

const PRIORITY_BADGE = {
  critical: `<span class="badge badge-danger">Crítica</span>`,
  high: `<span class="badge badge-warning">Alta</span>`,
  medium: `<span class="badge badge-info">Média</span>`,
  low: `<span class="badge badge-gray">Baixa</span>`,
};

// ── Carrega dados de apoio ────────────────────────────────
_risks = await getRisks(companyId);

// ── Eventos ────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("btnExport").addEventListener("click", doExport);
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document.getElementById("filterStatus").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterPriority").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterResponsible").addEventListener("input", () => {
  _page = 1;
  render();
});

await loadData();

// ──────────────────────────────────────────────────────────
async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 5, 5);
  _all = await getActionPlans(companyId);
  renderSummary();
  render();
}

function renderSummary() {
  const pending = _all.filter((a) => a.status === "pending").length;
  const inProgress = _all.filter((a) => a.status === "in_progress").length;
  const completed = _all.filter((a) => a.status === "completed").length;
  const overdue = _all.filter(
    (a) =>
      a.status !== "completed" &&
      a.status !== "cancelled" &&
      a.dueDate &&
      daysUntil(a.dueDate) < 0,
  ).length;

  document.getElementById("actionSummary").innerHTML = `
    <div class="stat-card"><div class="stat-icon warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div><div class="stat-value">${pending}</div><div class="stat-label">Pendentes</div></div></div>
    <div class="stat-card"><div class="stat-icon primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div><div class="stat-value">${inProgress}</div><div class="stat-label">Em Andamento</div></div></div>
    <div class="stat-card"><div class="stat-icon success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div><div class="stat-value">${completed}</div><div class="stat-label">Concluídas</div></div></div>
    <div class="stat-card"><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div><div class="stat-value">${overdue}</div><div class="stat-label">Atrasadas</div></div></div>
  `;
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const st = document.getElementById("filterStatus").value;
  const pri = document.getElementById("filterPriority").value;
  const resp = (
    document.getElementById("filterResponsible").value || ""
  ).toLowerCase();
  return _all.filter(
    (a) =>
      (!q ||
        (a.actionTitle || "").toLowerCase().includes(q) ||
        (a.responsible || "").toLowerCase().includes(q)) &&
      (!st || a.status === st) &&
      (!pri || a.priority === pri) &&
      (!resp || (a.responsible || "").toLowerCase().includes(resp)),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const riskMap = Object.fromEntries(
    _risks.map((r) => [
      r.id,
      r.description ? r.description.substring(0, 60) : r.id,
    ]),
  );

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
      title: "Nenhuma ação encontrada",
      description: 'Clique em "Nova Ação" para criar uma ação corretiva.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Ação</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th>Risco Vinculado</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map((a) => {
          const days = a.dueDate ? daysUntil(a.dueDate) : null;
          const urgent =
            a.status !== "completed" &&
            a.status !== "cancelled" &&
            days !== null &&
            days < 0;
          const dueCls = urgent
            ? "color:var(--clr-danger-500)"
            : days !== null && days <= 7
              ? "color:var(--clr-warning-600)"
              : "color:var(--clr-text-muted)";
          return `<tr>
          <td style="max-width:240px"><div style="font-size:var(--text-sm);font-weight:var(--font-medium)">${a.actionTitle || "—"}</div></td>
          <td style="font-size:var(--text-sm)">${a.responsible || "—"}</td>
          <td><div style="font-size:var(--text-xs);${dueCls}">${formatDate(a.dueDate)}${urgent ? " <strong>ATRASADA</strong>" : days !== null && days <= 7 && days >= 0 ? ` (${days}d)` : ""}</div></td>
          <td>${PRIORITY_BADGE[a.priority] || a.priority || "—"}</td>
          <td><span class="badge ${ACTION_STATUS_BADGES[a.status] || "badge-gray"}">${ACTION_STATUS_LABELS[a.status] || a.status || "—"}</span></td>
          <td style="font-size:var(--text-xs);color:var(--clr-text-muted);max-width:160px">${a.riskId ? riskMap[a.riskId] || a.riskId : "—"}</td>
          <td><div style="display:flex;gap:var(--sp-1)">
            <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
          </div></td>
        </tr>`;
        })
        .join("")}
    </tbody></table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((a) => a.id === b.dataset.id)),
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

  _risks.forEach((r) => {
    const o = document.createElement("option");
    o.value = r.id;
    o.textContent = (r.description || "").substring(0, 80) || r.id;
    body.querySelector("#actionRiskSel")?.appendChild(o);
  });

  openModal({
    title: item ? "Editar Ação" : "Nova Ação",
    body: body.innerHTML,
    size: "modal-lg",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar" : "Criar Ação",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  if (item) {
    [
      "actionTitle",
      "riskId",
      "priority",
      "responsible",
      "responsibleEmail",
      "dueDate",
      "status",
      "completionDate",
      "notes",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
  }
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    actionTitle: { required: true, label: "Título da Ação" },
    priority: { required: true, label: "Prioridade" },
    responsible: { required: true, label: "Responsável" },
    dueDate: { required: true, label: "Prazo" },
    responsibleEmail: { email: true, label: "E-mail do Responsável" },
  });
  if (!valid) return;

  data.companyId = companyId;

  // Marca como atrasada se prazo passou e não está concluída/cancelada
  if (
    data.dueDate &&
    daysUntil(data.dueDate) < 0 &&
    data.status !== "completed" &&
    data.status !== "cancelled"
  ) {
    data.status = "overdue";
  }

  try {
    await saveActionPlan(data, id);
    showToast(id ? "Ação atualizada!" : "Ação criada!", "success");
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((a) => a.id === id);
  if (
    !(await showConfirm(
      `Excluir ação <strong>${item?.actionTitle || id}</strong>?`,
      "Excluir Ação",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteActionPlan(id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

function doExport() {
  const filtered = getFiltered();
  const riskMap = Object.fromEntries(
    _risks.map((r) => [r.id, (r.description || "").substring(0, 80)]),
  );
  const headers = [
    "Título",
    "Responsável",
    "E-mail Responsável",
    "Prazo",
    "Prioridade",
    "Status",
    "Data Conclusão",
    "Risco Vinculado",
    "Observações",
  ];
  const rows = filtered.map((a) => [
    a.actionTitle || "",
    a.responsible || "",
    a.responsibleEmail || "",
    a.dueDate || "",
    a.priority || "",
    ACTION_STATUS_LABELS[a.status] || a.status || "",
    a.completionDate || "",
    a.riskId ? riskMap[a.riskId] || a.riskId : "",
    a.notes || "",
  ]);
  exportCSV(headers, rows, "plano_acao.csv");
}
