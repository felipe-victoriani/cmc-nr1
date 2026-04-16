/**
 * relatorios.js — Relatórios e Painel de Conformidade NR-1
 * Página somente-leitura com agregações de todos os módulos.
 */

import { requireProfile } from "./guards.js";
import { initAppUI, setBreadcrumb, showToast } from "./ui.js";
import { getCurrentProfile } from "./auth.js";
import { formatDate, daysUntil, exportCSV } from "./utils.js";
import {
  getEmployees,
  getRisks,
  getActionPlans,
  getTrainings,
  getIncidents,
} from "./services.database.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_COLORS = {
  critical: "var(--clr-risk-critical)",
  high: "var(--clr-risk-high)",
  medium: "var(--clr-risk-medium)",
  low: "var(--clr-risk-low)",
};

const RISK_LABELS = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const ACTION_STATUS_LABELS = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluído",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const INCIDENT_TYPE_LABELS = {
  near_miss: "Quase Acidente",
  minor_injury: "Acidente Leve",
  serious_injury: "Acidente Grave",
  fatal: "Fatal",
  property_damage: "Dano Material",
  environmental: "Ambiental",
};

const TRAINING_STATUS_LABELS = {
  active: "Vigente",
  expiring_soon: "Vence em Breve",
  expired: "Vencido",
};

// ─── State ────────────────────────────────────────────────────────────────────

let _companyId = null;
let _data = {
  employees: [],
  risks: [],
  actions: [],
  trainings: [],
  incidents: [],
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

await requireProfile([
  "admin_master",
  "gestor_rh",
  "gestor_unidade",
  "tecnico_sst",
]);
initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Relatórios" },
]);
_companyId = getCurrentProfile()?.companyId || null;
loadAll();
bindListeners();

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadAll() {
  showLoader(true);
  try {
    const [employees, risks, actions, trainings, incidents] = await Promise.all(
      [
        getEmployees(_companyId),
        getRisks(_companyId),
        getActionPlans(_companyId),
        getTrainings(_companyId),
        getIncidents(_companyId),
      ],
    );

    _data.employees = (employees || []).filter((r) => !r.deleted);
    _data.risks = (risks || []).filter((r) => !r.deleted);
    _data.actions = (actions || []).filter((r) => !r.deleted);
    _data.trainings = (trainings || []).filter((r) => !r.deleted);
    _data.incidents = (incidents || []).filter((r) => !r.deleted);

    renderKPIs();
    renderRisks();
    renderActions();
    renderTrainings();
    renderIncidents();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar dados de relatórios.", "error");
  } finally {
    showLoader(false);
  }
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

function renderKPIs() {
  const activeWorkers = _data.employees.filter(
    (e) => (e.status ?? "active") === "active",
  ).length;
  const critHigh = _data.risks.filter(
    (r) => r.riskLevel === "critical" || r.riskLevel === "high",
  ).length;
  const pendOver = _data.actions.filter(
    (a) =>
      a.status === "pending" ||
      a.status === "overdue" ||
      a.status === "in_progress",
  ).length;
  const expiredTrain = _data.trainings.filter(
    (t) => computeTrainingStatus(t) === "expired",
  ).length;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentIncidents = _data.incidents.filter((i) => {
    if (!i.incidentDate) return false;
    return new Date(i.incidentDate) >= oneYearAgo;
  }).length;

  setText("kpiWorkersVal", activeWorkers);
  setText("kpiRisksVal", critHigh);
  setText("kpiActionsVal", pendOver);
  setText("kpiTrainingsVal", expiredTrain);
  setText("kpiIncidentsVal", recentIncidents);
}

// ─── Risks Section ────────────────────────────────────────────────────────────

function renderRisks() {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  _data.risks.forEach((r) => {
    if (counts[r.riskLevel] !== undefined) counts[r.riskLevel]++;
  });

  const total = _data.risks.length || 1;

  // Bar chart (CSS-only)
  const bars = ["critical", "high", "medium", "low"]
    .map((level) => {
      const count = counts[level];
      const pct = Math.round((count / total) * 100);
      return `
      <div style="margin-bottom:var(--sp-3)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:var(--text-sm);font-weight:500">${RISK_LABELS[level]}</span>
          <span style="font-size:var(--text-sm);color:var(--clr-text-muted)">${count} (${pct}%)</span>
        </div>
        <div style="height:10px;background:var(--clr-gray-100);border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${RISK_COLORS[level]};border-radius:999px;transition:width .4s"></div>
        </div>
      </div>
    `;
    })
    .join("");

  const barsEl = document.getElementById("riskBarsWrap");
  if (barsEl) barsEl.innerHTML = bars;

  // Table
  const rows = ["critical", "high", "medium", "low"]
    .map(
      (level) => `
    <tr>
      <td><span class="badge" style="background:${RISK_COLORS[level]};color:#fff">${RISK_LABELS[level]}</span></td>
      <td style="text-align:right;font-weight:600">${counts[level]}</td>
    </tr>
  `,
    )
    .join("");

  const tableEl = document.getElementById("riskTableWrap");
  if (tableEl)
    tableEl.innerHTML = `
    <table class="table table-sm">
      <thead><tr><th>Nível</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ─── Actions Section ──────────────────────────────────────────────────────────

function renderActions() {
  const counts = {};
  _data.actions.forEach((a) => {
    const s = a.status || "pending";
    counts[s] = (counts[s] || 0) + 1;
  });

  const total = _data.actions.length || 1;
  const wrap = document.getElementById("actionsWrap");
  if (!wrap) return;

  const statuses = [
    "pending",
    "in_progress",
    "overdue",
    "completed",
    "cancelled",
  ];
  const colors = {
    pending: "var(--clr-warning-500)",
    in_progress: "var(--clr-info-500)",
    overdue: "var(--clr-danger-500)",
    completed: "var(--clr-success-500)",
    cancelled: "var(--clr-gray-400)",
  };

  const bars = statuses
    .map((s) => {
      const count = counts[s] || 0;
      const pct = Math.round((count / total) * 100);
      return `
      <div style="margin-bottom:var(--sp-3)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:var(--text-sm);font-weight:500">${ACTION_STATUS_LABELS[s]}</span>
          <span style="font-size:var(--text-sm);color:var(--clr-text-muted)">${count} (${pct}%)</span>
        </div>
        <div style="height:10px;background:var(--clr-gray-100);border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${colors[s]};border-radius:999px;transition:width .4s"></div>
        </div>
      </div>
    `;
    })
    .join("");

  wrap.innerHTML = bars;
}

// ─── Trainings Section ────────────────────────────────────────────────────────

function renderTrainings() {
  const wrap = document.getElementById("trainingsWrap");
  if (!wrap) return;

  const counts = { active: 0, expiring_soon: 0, expired: 0 };
  _data.trainings.forEach((t) => {
    const s = computeTrainingStatus(t);
    if (counts[s] !== undefined) counts[s]++;
  });

  const colors = {
    active: "var(--clr-success-500)",
    expiring_soon: "var(--clr-warning-500)",
    expired: "var(--clr-danger-500)",
  };

  const total = _data.trainings.length || 1;
  const bars = ["active", "expiring_soon", "expired"]
    .map((s) => {
      const count = counts[s];
      const pct = Math.round((count / total) * 100);
      return `
      <div style="margin-bottom:var(--sp-3)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:var(--text-sm);font-weight:500">${TRAINING_STATUS_LABELS[s]}</span>
          <span style="font-size:var(--text-sm);color:var(--clr-text-muted)">${count} (${pct}%)</span>
        </div>
        <div style="height:10px;background:var(--clr-gray-100);border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${colors[s]};border-radius:999px;transition:width .4s"></div>
        </div>
      </div>
    `;
    })
    .join("");

  wrap.innerHTML = bars;
}

// ─── Incidents Section ────────────────────────────────────────────────────────

function renderIncidents() {
  const wrap = document.getElementById("incidentsWrap");
  if (!wrap) return;

  const counts = {};
  _data.incidents.forEach((i) => {
    const t = i.incidentType || "other";
    counts[t] = (counts[t] || 0) + 1;
  });

  const total = _data.incidents.length;

  if (total === 0) {
    wrap.innerHTML = `<p style="color:var(--clr-text-muted);font-size:var(--text-sm)">Nenhum incidente registrado.</p>`;
    return;
  }

  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      const pct = Math.round((count / total) * 100);
      return `<tr>
        <td>${INCIDENT_TYPE_LABELS[type] || type}</td>
        <td style="text-align:right;font-weight:600">${count}</td>
        <td style="width:40%">
          <div style="height:8px;background:var(--clr-gray-100);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--clr-danger-500);border-radius:999px"></div>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  wrap.innerHTML = `
    <table class="table table-sm">
      <thead><tr><th>Tipo</th><th style="text-align:right">Total</th><th>Proporção</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

function bindListeners() {
  document
    .getElementById("btnPrint")
    ?.addEventListener("click", () => window.print());

  document.getElementById("btnExportRisks")?.addEventListener("click", () => {
    const headers = [
      "Descrição",
      "Tipo de Perigo",
      "Nível de Risco",
      "Probabilidade",
      "Severidade",
      "Status",
    ];
    const rows = _data.risks.map((r) => [
      r.description || "",
      r.hazardType || "",
      RISK_LABELS[r.riskLevel] || r.riskLevel || "",
      r.probability || "",
      r.severity || "",
      r.status || "",
    ]);
    exportCSV(headers, rows, "relatorio-riscos.csv");
  });

  document.getElementById("btnExportActions")?.addEventListener("click", () => {
    const headers = ["Título", "Prioridade", "Responsável", "Prazo", "Status"];
    const rows = _data.actions.map((a) => [
      a.actionTitle || "",
      a.priority || "",
      a.responsible || "",
      a.dueDate ? formatDate(a.dueDate) : "",
      ACTION_STATUS_LABELS[a.status] || a.status || "",
    ]);
    exportCSV(headers, rows, "relatorio-plano-acao.csv");
  });

  document
    .getElementById("btnExportTrainings")
    ?.addEventListener("click", () => {
      const headers = [
        "Treinamento",
        "Categoria",
        "Data",
        "Validade",
        "Status",
      ];
      const rows = _data.trainings.map((t) => [
        t.trainingName || "",
        t.category || "",
        t.trainingDate ? formatDate(t.trainingDate) : "",
        t.expirationDate ? formatDate(t.expirationDate) : "",
        TRAINING_STATUS_LABELS[computeTrainingStatus(t)] || "",
      ]);
      exportCSV(headers, rows, "relatorio-treinamentos.csv");
    });

  document
    .getElementById("btnExportIncidents")
    ?.addEventListener("click", () => {
      const headers = [
        "Tipo",
        "Data",
        "Localização",
        "Pessoa Envolvida",
        "Status",
      ];
      const rows = _data.incidents.map((i) => [
        INCIDENT_TYPE_LABELS[i.incidentType] || i.incidentType || "",
        i.incidentDate ? formatDate(i.incidentDate) : "",
        i.location || "",
        i.involvedPerson || "",
        i.status || "",
      ]);
      exportCSV(headers, rows, "relatorio-incidentes.csv");
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeTrainingStatus(t) {
  if (!t.expirationDate) return "active";
  const days = daysUntil(t.expirationDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "active";
}

function showLoader(visible) {
  const el = document.getElementById("globalLoader");
  if (el) el.classList.toggle("hidden", !visible);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
