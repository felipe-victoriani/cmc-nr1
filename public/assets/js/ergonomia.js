// ============================================================
// ergonomia.js — Avaliações Ergonômicas e Psicossociais
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
  getErgonomicAssessments,
  saveErgonomicAssessment,
  getEstablishments,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate, exportCSV } from "./utils.js";

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
  { label: "Ergonomia e Psicossociais" },
]);

const profile = getCurrentProfile();
const isAdmin = profile.tipo === "admin_master";
const companyId = isAdmin ? null : profile.companyId || null;

let _all = [];
let _establishments = [];
let _page = 1;
const PER_PAGE = 20;

const TYPE_LABELS = {
  ergonomic: "Ergonômico (NR-17)",
  psychosocial: "Psicossocial",
};

const RISK_BADGE = {
  low: `<span class="badge" style="background:var(--clr-risk-low-bg,#dcfce7);color:var(--clr-risk-low,#15803d)">Baixo</span>`,
  medium: `<span class="badge" style="background:var(--clr-risk-medium-bg,#fef9c3);color:var(--clr-risk-medium,#854d0e)">Médio</span>`,
  high: `<span class="badge" style="background:var(--clr-risk-high-bg,#ffedd5);color:var(--clr-risk-high,#c2410c)">Alto</span>`,
  critical: `<span class="badge" style="background:var(--clr-risk-critical-bg,#fee2e2);color:var(--clr-risk-critical,#b91c1c)">Crítico</span>`,
};

const STATUS_BADGE = {
  open: `<span class="badge badge-warning">Aberta</span>`,
  in_progress: `<span class="badge badge-info">Em Acompanhamento</span>`,
  closed: `<span class="badge badge-gray">Encerrada</span>`,
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
document.getElementById("filterType").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterRisk").addEventListener("change", () => {
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
  _all = (await getErgonomicAssessments(companyId)).filter((r) => !r.deleted);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const tp = document.getElementById("filterType").value;
  const lvl = document.getElementById("filterRisk").value;
  const est = document.getElementById("filterEstablishment").value;
  return _all.filter(
    (a) =>
      (!q ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.jobRole || "").toLowerCase().includes(q)) &&
      (!tp || a.assessmentType === tp) &&
      (!lvl || a.riskLevel === lvl) &&
      (!est || a.establishmentId === est),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
      title: "Nenhuma avaliação encontrada",
      description: 'Clique em "Nova Avaliação" para registrar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Cargo / Função</th><th>Tipo</th><th>Estabelecimento</th><th>Risco</th><th>Data</th><th>Avaliador</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map(
          (a) => `<tr>
        <td><div style="font-weight:var(--font-medium);font-size:var(--text-sm)">${a.jobRole || "—"}</div><div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${(a.description || "").substring(0, 60)}${(a.description || "").length > 60 ? "…" : ""}</div></td>
        <td style="font-size:var(--text-sm)">${TYPE_LABELS[a.assessmentType] || a.assessmentType || "—"}</td>
        <td style="font-size:var(--text-sm)">${estMap[a.establishmentId] || "—"}</td>
        <td>${RISK_BADGE[a.riskLevel] || a.riskLevel || "—"}</td>
        <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${formatDate(a.assessmentDate)}</td>
        <td style="font-size:var(--text-sm)">${a.evaluator || "—"}</td>
        <td>${STATUS_BADGE[a.status] || STATUS_BADGE.open}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
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

  _establishments.forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = e.name;
    body.querySelector("#ergoModalEst")?.appendChild(o);
  });

  openModal({
    title: item ? "Editar Avaliação" : "Nova Avaliação",
    body: body.innerHTML,
    size: "modal-xl",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar" : "Registrar",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  if (item) {
    [
      "assessmentType",
      "establishmentId",
      "jobRole",
      "description",
      "riskLevel",
      "assessmentDate",
      "evaluator",
      "nextReview",
      "recommendations",
      "status",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
  }
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    assessmentType: { required: true, label: "Tipo de Avaliação" },
    establishmentId: { required: true, label: "Estabelecimento" },
    jobRole: { required: true, label: "Cargo / Função" },
    description: { required: true, label: "Descrição" },
  });
  if (!valid) return;
  data.companyId = companyId;
  try {
    await saveErgonomicAssessment(data, id);
    showToast(
      id ? "Avaliação atualizada!" : "Avaliação registrada!",
      "success",
    );
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
      `Excluir avaliação <strong>${item?.jobRole || id}</strong>?`,
      "Excluir Avaliação",
      "btn-danger",
    ))
  )
    return;
  try {
    await saveErgonomicAssessment({ deleted: true }, id);
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
    "Tipo",
    "Cargo/Função",
    "Estabelecimento",
    "Nível de Risco",
    "Data",
    "Avaliador",
    "Status",
    "Recomendações",
  ];
  const rows = filtered.map((a) => [
    TYPE_LABELS[a.assessmentType] || a.assessmentType || "",
    a.jobRole || "",
    estMap[a.establishmentId] || "",
    a.riskLevel || "",
    a.assessmentDate || "",
    a.evaluator || "",
    a.status || "",
    a.recommendations || "",
  ]);
  exportCSV(headers, rows, "ergonomia_psicossociais.csv");
}
