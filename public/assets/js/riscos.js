// ============================================================
// riscos.js — Inventário de Riscos (NR-1 PGR)
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
  getRisks,
  saveRisk,
  deleteRisk,
  getEstablishments,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate, calculateRiskLevel, exportCSV } from "./utils.js";

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
  { label: "Riscos" },
]);

const profile = getCurrentProfile();
const companyId = profile.companyId || null;

let _all = [];
let _establishments = [];
let _page = 1;
const PER_PAGE = 20;

const HAZARD_LABELS = {
  chemical: "Químico",
  physical: "Físico",
  biological: "Biológico",
  ergonomic: "Ergonômico",
  accident: "Acidente",
  psychosocial: "Psicossocial",
};

const STATUS_LABELS = {
  identified: "Identificado",
  in_control: "Em Controle",
  controlled: "Controlado",
  residual: "Risco Residual",
};

const RISK_BADGE = {
  low: `<span class="badge" style="background:var(--clr-risk-low-bg,#dcfce7);color:var(--clr-risk-low,#15803d)">Baixo</span>`,
  medium: `<span class="badge" style="background:var(--clr-risk-medium-bg,#fef9c3);color:var(--clr-risk-medium,#854d0e)">Médio</span>`,
  high: `<span class="badge" style="background:var(--clr-risk-high-bg,#ffedd5);color:var(--clr-risk-high,#c2410c)">Alto</span>`,
  critical: `<span class="badge" style="background:var(--clr-risk-critical-bg,#fee2e2);color:var(--clr-risk-critical,#b91c1c)">Crítico</span>`,
};

// ── Carrega dados de apoio ────────────────────────────────
_establishments = await getEstablishments(companyId);

const selEst = document.getElementById("filterEstablishment");
_establishments.forEach((e) => {
  const o = document.createElement("option");
  o.value = e.id;
  o.textContent = e.name;
  selEst.appendChild(o);
});

// ── Eventos ────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("btnExport").addEventListener("click", doExport);
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document.getElementById("filterHazardType").addEventListener("change", () => {
  _page = 1;
  render();
});
document.getElementById("filterRiskLevel").addEventListener("change", () => {
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

// ──────────────────────────────────────────────────────────
async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 5, 5);
  _all = await getRisks(companyId);
  renderSummary();
  render();
}

function renderSummary() {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  _all.forEach((r) => {
    const k =
      r.riskLevel ||
      calculateRiskLevel(Number(r.probability), Number(r.severity));
    counts[k] = (counts[k] || 0) + 1;
  });
  document.getElementById("riskSummary").innerHTML = `
    <div class="stat-card"><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div><div class="stat-value">${counts.critical}</div><div class="stat-label">Críticos</div></div></div>
    <div class="stat-card"><div class="stat-icon warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div><div class="stat-value">${counts.high}</div><div class="stat-label">Altos</div></div></div>
    <div class="stat-card"><div class="stat-icon primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div><div class="stat-value">${counts.medium}</div><div class="stat-label">Médios</div></div></div>
    <div class="stat-card"><div class="stat-icon success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div><div class="stat-value">${counts.low}</div><div class="stat-label">Baixos</div></div></div>
    <div class="stat-card"><div class="stat-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
      <div><div class="stat-value">${_all.length}</div><div class="stat-label">Total de Riscos</div></div></div>
  `;
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const haz = document.getElementById("filterHazardType").value;
  const lvl = document.getElementById("filterRiskLevel").value;
  const est = document.getElementById("filterEstablishment").value;
  return _all.filter(
    (r) =>
      (!q ||
        (r.description || "").toLowerCase().includes(q) ||
        (HAZARD_LABELS[r.hazardType] || "").toLowerCase().includes(q)) &&
      (!haz || r.hazardType === haz) &&
      (!lvl ||
        (r.riskLevel ||
          calculateRiskLevel(Number(r.probability), Number(r.severity))) ===
          lvl) &&
      (!est || r.establishmentId === est),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      title: "Nenhum risco encontrado",
      description: 'Clique em "Novo Risco" para adicionar ao inventário.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Descrição</th><th>Tipo</th><th>Estabelecimento</th><th>Prob.</th><th>Sev.</th><th>Nível</th><th>Status</th><th>Revisão</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map((r) => {
          const level =
            r.riskLevel ||
            calculateRiskLevel(Number(r.probability), Number(r.severity));
          return `<tr>
          <td style="max-width:260px"><div style="font-size:var(--text-sm)">${r.description ? (r.description.length > 80 ? r.description.substring(0, 80) + "…" : r.description) : "—"}</div></td>
          <td><span class="badge badge-info" style="font-size:var(--text-xs)">${HAZARD_LABELS[r.hazardType] || r.hazardType || "—"}</span></td>
          <td style="font-size:var(--text-sm)">${estMap[r.establishmentId] || "—"}</td>
          <td style="text-align:center;font-weight:var(--font-bold)">${r.probability || "—"}</td>
          <td style="text-align:center;font-weight:var(--font-bold)">${r.severity || "—"}</td>
          <td>${RISK_BADGE[level] || level}</td>
          <td style="font-size:var(--text-xs)">${STATUS_LABELS[r.status] || r.status || "—"}</td>
          <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${formatDate(r.nextReview)}</td>
          <td><div style="display:flex;gap:var(--sp-1)">
            <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${r.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
          </div></td>
        </tr>`;
        })
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

  _establishments.forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = e.name;
    body.querySelector("#riskModalEst")?.appendChild(o);
  });

  openModal({
    title: item ? "Editar Risco" : "Novo Risco",
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
      "hazardType",
      "establishmentId",
      "description",
      "affectedWorkers",
      "probability",
      "severity",
      "nextReview",
      "existingControls",
      "proposedControls",
      "status",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
    updateRiskPreview(document.querySelector(".modal-body"));
  }

  // Cálculo automático ao mudar probabilidade/severidade
  const probEl = document.querySelector('.modal-body [name="probability"]');
  const sevEl = document.querySelector('.modal-body [name="severity"]');
  const update = () => updateRiskPreview(document.querySelector(".modal-body"));
  probEl?.addEventListener("change", update);
  sevEl?.addEventListener("change", update);

  clearOnInput(document.querySelector(".modal-body"));
}

function updateRiskPreview(container) {
  const prob = Number(
    container.querySelector('[name="probability"]')?.value || 0,
  );
  const sev = Number(container.querySelector('[name="severity"]')?.value || 0);
  const prev = container.querySelector("#riskLevelPreview");
  if (!prev) return;
  if (!prob || !sev) {
    prev.innerHTML =
      '<span style="color:var(--clr-text-muted)">— Selecione probabilidade e severidade</span>';
    return;
  }
  const level = calculateRiskLevel(prob, sev);
  prev.innerHTML = RISK_BADGE[level] || level;
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    hazardType: { required: true, label: "Tipo de Perigo" },
    establishmentId: { required: true, label: "Estabelecimento" },
    description: { required: true, label: "Descrição" },
    probability: { required: true, label: "Probabilidade" },
    severity: { required: true, label: "Severidade" },
  });
  if (!valid) return;

  data.companyId = companyId;
  data.riskLevel = calculateRiskLevel(
    Number(data.probability),
    Number(data.severity),
  );

  try {
    await saveRisk(data, id);
    showToast(id ? "Risco atualizado!" : "Risco registrado!", "success");
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
      `Excluir risco <strong>${item?.description?.substring(0, 60) || id}</strong>?`,
      "Excluir Risco",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteRisk(id);
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
    "Descrição",
    "Estabelecimento",
    "Probabilidade",
    "Severidade",
    "Nível de Risco",
    "controles Existentes",
    "Controles Propostos",
    "Status",
    "Próxima Revisão",
  ];
  const rows = filtered.map((r) => [
    HAZARD_LABELS[r.hazardType] || r.hazardType || "",
    r.description || "",
    estMap[r.establishmentId] || "",
    r.probability || "",
    r.severity || "",
    r.riskLevel ||
      calculateRiskLevel(Number(r.probability), Number(r.severity)),
    r.existingControls || "",
    r.proposedControls || "",
    STATUS_LABELS[r.status] || r.status || "",
    r.nextReview || "",
  ]);
  exportCSV(headers, rows, "inventario_riscos.csv");
}
