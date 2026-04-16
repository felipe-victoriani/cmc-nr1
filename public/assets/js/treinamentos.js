// ============================================================
// treinamentos.js — Gestão de Treinamentos
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
  getTrainings,
  saveTraining,
  deleteTraining,
  getEstablishments,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate, daysUntil, exportCSV } from "./utils.js";

await requireProfile([
  "admin_master",
  "gestor_rh",
  "gestor_unidade",
  "tecnico_sst",
]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "RH" },
  { label: "Treinamentos" },
]);

const profile = getCurrentProfile();
const companyId = profile.companyId || null;

let _all = [];
let _establishments = [];
let _page = 1;
const PER_PAGE = 20;

const CATEGORY_LABELS = {
  nr: "NR",
  epi: "EPI/EPC",
  emergency: "Emergência",
  operational: "Operacional",
  integration: "Integração",
  other: "Outros",
};

_establishments = await getEstablishments(companyId);

const selEst = document.getElementById("filterEstablishment");
_establishments.forEach((e) => {
  const o = document.createElement("option");
  o.value = e.id;
  o.textContent = e.name;
  selEst.appendChild(o);
});

document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("btnExport").addEventListener("click", doExport);
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document.getElementById("filterCategory").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterStatus").addEventListener("change", () => {
  _page = 1;
  render();
});
document
  .getElementById("filterEstablishment")
  .addEventListener("change", () => {
    _page = 1;
    render();
  });

await loadData();

async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 5, 5);
  _all = await getTrainings(companyId);
  render();
}

function computeStatus(t) {
  if (!t.expirationDate) return "active";
  const days = daysUntil(t.expirationDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "active";
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const cat = document.getElementById("filterCategory").value;
  const st = document.getElementById("filterStatus").value;
  const est = document.getElementById("filterEstablishment").value;
  return _all.filter((t) => {
    const status = computeStatus(t);
    return (
      (!q || (t.trainingName || "").toLowerCase().includes(q)) &&
      (!cat || t.category === cat) &&
      (!st || status === st) &&
      (!est || t.establishmentId === est)
    );
  });
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
      title: "Nenhum treinamento encontrado",
      description: 'Clique em "Novo Treinamento" para cadastrar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Treinamento</th><th>Categoria</th><th>Estabelecimento</th><th>Realizado em</th><th>Vencimento</th><th>Carga</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map((t) => {
          const status = computeStatus(t);
          const badgeMap = {
            active: "badge-success",
            expired: "badge-danger",
            expiring_soon: "badge-warning",
          };
          const labelMap = {
            active: "Em Dia",
            expired: "Vencido",
            expiring_soon: "Vence em Breve",
          };
          return `<tr>
          <td><div style="font-weight:var(--font-medium);font-size:var(--text-sm)">${t.trainingName || "—"}</div>${t.instructor ? `<div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${t.instructor}</div>` : ""}</td>
          <td><span class="badge badge-info" style="font-size:var(--text-xs)">${CATEGORY_LABELS[t.category] || t.category || "—"}</span></td>
          <td style="font-size:var(--text-sm)">${estMap[t.establishmentId] || "Geral"}</td>
          <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${formatDate(t.trainingDate)}</td>
          <td style="font-size:var(--text-xs);color:${status === "expired" ? "var(--clr-danger-500)" : status === "expiring_soon" ? "var(--clr-warning-600)" : "var(--clr-text-muted)"}">${t.expirationDate ? formatDate(t.expirationDate) : "—"}</td>
          <td style="font-size:var(--text-sm)">${t.workload ? t.workload + "h" : "—"}</td>
          <td><span class="badge ${badgeMap[status]}">${labelMap[status]}</span></td>
          <td><div style="display:flex;gap:var(--sp-1)">
            <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
          </div></td>
        </tr>`;
        })
        .join("")}
    </tbody></table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((t) => t.id === b.dataset.id)),
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

  _establishments.forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = e.name;
    body.querySelector("#trainModalEst")?.appendChild(o);
  });

  openModal({
    title: item ? "Editar Treinamento" : "Novo Treinamento",
    body: body.innerHTML,
    size: "modal-xl",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar" : "Cadastrar",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  if (item) {
    [
      "trainingName",
      "category",
      "establishmentId",
      "workload",
      "validityMonths",
      "trainingDate",
      "expirationDate",
      "instructor",
      "location",
      "notes",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
  }

  // Auto-calcula data de vencimento baseado na data do treinamento + validade em meses
  const trainDate = () =>
    document.querySelector('.modal-body [name="trainingDate"]');
  const validity = () =>
    document.querySelector('.modal-body [name="validityMonths"]');
  const expDate = () =>
    document.querySelector('.modal-body [name="expirationDate"]');
  const calcExpiry = () => {
    const d = trainDate()?.value;
    const m = Number(validity()?.value);
    if (d && m) {
      const dt = new Date(d);
      dt.setMonth(dt.getMonth() + m);
      if (expDate()) expDate().value = dt.toISOString().substring(0, 10);
    }
  };
  trainDate()?.addEventListener("change", calcExpiry);
  validity()?.addEventListener("input", calcExpiry);

  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    trainingName: { required: true, label: "Nome do Treinamento" },
    category: { required: true, label: "Categoria" },
    trainingDate: { required: true, label: "Data de Realização" },
  });
  if (!valid) return;
  data.companyId = companyId;
  try {
    await saveTraining(data, id);
    showToast(
      id ? "Treinamento atualizado!" : "Treinamento cadastrado!",
      "success",
    );
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((t) => t.id === id);
  if (
    !(await showConfirm(
      `Excluir treinamento <strong>${item?.trainingName || id}</strong>?`,
      "Excluir Treinamento",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteTraining(id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

function doExport() {
  const filtered = getFiltered();
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));
  const headers = [
    "Treinamento",
    "Categoria",
    "Estabelecimento",
    "Data Realização",
    "Vencimento",
    "CH (h)",
    "Instrutor",
    "Local",
    "Status",
  ];
  const rows = filtered.map((t) => {
    const status = computeStatus(t);
    const labelMap = {
      active: "Em Dia",
      expired: "Vencido",
      expiring_soon: "Vence em Breve",
    };
    return [
      t.trainingName || "",
      CATEGORY_LABELS[t.category] || t.category || "",
      estMap[t.establishmentId] || "Geral",
      t.trainingDate || "",
      t.expirationDate || "",
      t.workload || "",
      t.instructor || "",
      t.location || "",
      labelMap[status],
    ];
  });
  exportCSV(headers, rows, "treinamentos.csv");
}
