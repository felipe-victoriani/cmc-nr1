// ============================================================
// dashboard.js — Painel principal com estatísticas e gráficos
// ============================================================

import { requireAuth } from "./guards.js";
import { initAppUI, setBreadcrumb, showToast } from "./ui.js";
import { getCurrentProfile } from "./auth.js";
import {
  getEmployees,
  getRisks,
  getActionPlans,
  getTrainings,
  getIncidents,
  getCommunications,
  getEstablishments,
  getCompanies,
  getDepartments,
  getRoles,
} from "./services.database.js";
import { formatDate, daysUntil, urgencyClass, relativeTime } from "./utils.js";

await requireAuth();
await initAppUI();
setBreadcrumb([{ label: "Dashboard" }]);

// ──────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ──────────────────────────────────────────────────────────
const profile = getCurrentProfile();
const isAdmin = profile?.tipo === "admin_master";
const companyId = isAdmin ? null : profile?.companyId || null;

const keys = [
  "employees",
  "risks",
  "actions",
  "trainings",
  "incidents",
  "comms",
  "establishments",
  "companies",
  "departments",
  "roles",
];

const results = await Promise.allSettled([
  getEmployees(companyId),
  getRisks(companyId),
  getActionPlans(companyId),
  getTrainings(companyId),
  getIncidents(companyId),
  getCommunications(companyId),
  getEstablishments(isAdmin ? null : companyId),
  isAdmin ? getCompanies() : Promise.resolve([]),
  getDepartments(isAdmin ? null : companyId),
  getRoles(isAdmin ? null : companyId),
]);

const data = {};
let hasError = false;
results.forEach((r, i) => {
  if (r.status === "fulfilled") {
    data[keys[i]] = r.value;
  } else {
    console.warn(
      `[dashboard] Falha ao carregar "${keys[i]}":`,
      r.reason?.message,
    );
    data[keys[i]] = [];
    hasError = true;
  }
});

if (hasError) {
  showToast(
    "Alguns dados não puderam ser carregados. Verifique o console.",
    "warning",
  );
}

renderStats({ ...data, isAdmin, profile });
renderRiskChart(data.risks);
renderActionChart(data.actions);
renderUrgentActions(data.actions, data.risks);
renderExpiringTrainings(data.trainings);

// Ocultar secoes de SST para perfis nao-SST
const sstProfiles = [
  "admin_master",
  "gestor_rh",
  "gestor_unidade",
  "tecnico_sst",
];
if (!sstProfiles.includes(profile?.tipo)) {
  const chartsRow = document
    .getElementById("riskChart")
    ?.closest(".dashboard-grid-2");
  if (chartsRow) chartsRow.style.display = "none";
  const urgentCard = document
    .getElementById("urgentActionsList")
    ?.closest(".card");
  if (urgentCard) urgentCard.style.display = "none";
}

// ──────────────────────────────────────────────────────────
// CARDS DE ESTATÍSTICAS
// ──────────────────────────────────────────────────────────
function renderStats({
  employees,
  risks,
  actions,
  trainings,
  incidents,
  comms,
  establishments,
  companies,
  departments,
  roles,
  isAdmin,
  profile,
}) {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  const tipo = profile?.tipo || (isAdmin ? "admin_master" : "");
  const HR = ["admin_master", "gestor_rh", "gestor_unidade"];
  const SST = ["admin_master", "gestor_rh", "gestor_unidade", "tecnico_sst"];
  const TODOS = [
    "admin_master",
    "gestor_rh",
    "gestor_unidade",
    "tecnico_sst",
    "colaborador",
  ];

  const activeEmp = employees.filter((e) => e.status !== "inactive").length;
  const activeEst = establishments.filter(
    (e) => e.status !== "inactive",
  ).length;
  const activeCompanies = companies.filter(
    (c) => c.status !== "inactive",
  ).length;
  const activeDepts = departments.filter((d) => d.status !== "inactive").length;
  const activeRoles = roles.filter((r) => r.status !== "inactive").length;
  const criticalRisk = risks.filter(
    (r) => String(r.riskLevel || "").toLowerCase() === "critical",
  ).length;
  const openActions = actions.filter(
    (a) =>
      !["concluida", "cancelada", "completed", "cancelled"].includes(a.status),
  ).length;
  const overdueAct = actions.filter((a) => {
    const d = daysUntil(a.dueDate);
    return (
      d !== null &&
      d < 0 &&
      !["concluida", "cancelada", "completed", "cancelled"].includes(a.status)
    );
  }).length;
  const expTrainings = trainings.filter((t) => {
    const d = daysUntil(t.expirationDate || t.nextDueDate);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const monthInc = incidents.filter((i) => i.createdAt >= monthStart).length;
  const pendingComms = comms.filter(
    (c) => c.mandatoryRead && !c.allAcknowledged,
  ).length;

  const cards = [
    {
      label: "Empresas",
      value: activeCompanies,
      sub: `${companies.length} cadastradas`,
      color: "primary",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>`,
      href: "empresas.html",
      profiles: ["admin_master"],
    },
    {
      label: "Trabalhadores Ativos",
      value: activeEmp,
      sub: `${employees.length} cadastrados`,
      color: "success",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      href: "trabalhadores.html",
      profiles: HR,
    },
    {
      label: "Estabelecimentos",
      value: activeEst,
      sub: `${establishments.length} cadastrados`,
      color: "primary",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M9 21V7l7-4v18M9 10.5H3v10.5"/></svg>`,
      href: "estabelecimentos.html",
      profiles: ["admin_master"],
    },
    {
      label: "Setores",
      value: activeDepts,
      sub: `${departments.length} cadastrados`,
      color: "primary",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
      href: "setores.html",
      profiles: HR,
    },
    {
      label: "Cargos",
      value: activeRoles,
      sub: `${roles.length} cadastrados`,
      color: "primary",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/></svg>`,
      href: "cargos.html",
      profiles: HR,
    },
    {
      label: "Riscos Cadastrados",
      value: risks.length,
      sub: `${criticalRisk} críticos`,
      color: criticalRisk > 0 ? "danger" : "warning",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      href: "riscos.html",
      profiles: SST,
    },
    {
      label: "Ações em Aberto",
      value: openActions,
      sub: overdueAct > 0 ? `${overdueAct} vencidas` : "Todas no prazo",
      color: overdueAct > 0 ? "danger" : "primary",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
      href: "plano-acao.html",
      profiles: SST,
    },
    {
      label: "Treins. Vencendo",
      value: expTrainings,
      sub: "Próximos 30 dias",
      color: expTrainings > 0 ? "warning" : "success",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
      href: "treinamentos.html",
      profiles: TODOS,
    },
    {
      label: "Incidentes (mês)",
      value: monthInc,
      sub: `${incidents.length} total`,
      color: monthInc > 0 ? "danger" : "success",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 4.9A10 10 0 1119.1 19.1 10 10 0 014.9 4.9z"/><line x1="4.9" y1="19.1" x2="19.1" y2="4.9"/></svg>`,
      href: "incidentes.html",
      profiles: SST,
    },
    {
      label: "Comunicados Pendentes",
      value: pendingComms,
      sub: `${comms.length} total`,
      color: pendingComms > 0 ? "warning" : "success",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
      href: "comunicados.html",
      profiles: TODOS,
    },
    {
      label: "Total de Riscos Críticos",
      value: criticalRisk,
      sub: `de ${risks.length} riscos`,
      color: criticalRisk > 0 ? "danger" : "success",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      href: "riscos.html",
      profiles: SST,
    },
  ].filter((c) => c.profiles.includes(tipo));

  const grid = document.getElementById("statsGrid");
  grid.innerHTML = cards
    .map(
      (c) => `
    <a href="${c.href}" class="stat-card" style="text-decoration:none;cursor:pointer">
      <div class="stat-icon ${c.color}">
        ${c.icon}
      </div>
      <div class="stat-content">
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>
    </a>
  `,
    )
    .join("");
}

// ──────────────────────────────────────────────────────────
// GRÁFICO: RISCOS POR NÍVEL
// ──────────────────────────────────────────────────────────
function renderRiskChart(risks) {
  const levels = { critical: 0, high: 0, medium: 0, low: 0 };
  risks.forEach((r) => {
    const lvl = (r.riskLevel || "medium").toLowerCase();
    if (lvl in levels) levels[lvl]++;
  });

  const total = risks.length || 1;
  const rows = [
    {
      label: "Crítico",
      value: levels.critical,
      color: "var(--clr-risk-critical)",
    },
    { label: "Alto", value: levels.high, color: "var(--clr-risk-high)" },
    { label: "Médio", value: levels.medium, color: "var(--clr-risk-medium)" },
    { label: "Baixo", value: levels.low, color: "var(--clr-risk-low)" },
  ];

  if (risks.length === 0) {
    document.getElementById("riskChart").innerHTML =
      `<p style="color:var(--clr-text-muted);text-align:center;padding:var(--sp-8) 0;font-size:var(--text-sm)">Nenhum risco cadastrado.</p>`;
    return;
  }

  document.getElementById("riskChart").innerHTML = `
    <div class="bar-chart">
      ${rows
        .map(
          (r) => `
        <div class="bar-row">
          <div class="bar-label">${r.label}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${((r.value / total) * 100).toFixed(1)}%;background:${r.color}"></div>
          </div>
          <div class="bar-value">${r.value}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────
// GRÁFICO: STATUS DAS AÇÕES
// ──────────────────────────────────────────────────────────
function renderActionChart(actions) {
  const statuses = { aberta: 0, em_andamento: 0, concluida: 0, cancelada: 0 };
  const statusMap = {
    open: "aberta",
    in_progress: "em_andamento",
    completed: "concluida",
    cancelled: "cancelada",
    aberta: "aberta",
    em_andamento: "em_andamento",
    concluida: "concluida",
    cancelada: "cancelada",
  };
  actions.forEach((a) => {
    const k = statusMap[a.status] || "aberta";
    statuses[k]++;
  });

  const total = actions.length || 1;
  const rows = [
    {
      label: "Em Aberto",
      value: statuses.aberta,
      color: "var(--clr-primary-500)",
    },
    {
      label: "Em Andamento",
      value: statuses.em_andamento,
      color: "var(--clr-warning-500)",
    },
    {
      label: "Concluída",
      value: statuses.concluida,
      color: "var(--clr-success-500)",
    },
    {
      label: "Cancelada",
      value: statuses.cancelada,
      color: "var(--clr-gray-400)",
    },
  ];

  if (actions.length === 0) {
    document.getElementById("actionChart").innerHTML =
      `<p style="color:var(--clr-text-muted);text-align:center;padding:var(--sp-8) 0;font-size:var(--text-sm)">Nenhuma ação cadastrada.</p>`;
    return;
  }

  document.getElementById("actionChart").innerHTML = `
    <div class="bar-chart">
      ${rows
        .map(
          (r) => `
        <div class="bar-row">
          <div class="bar-label">${r.label}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${((r.value / total) * 100).toFixed(1)}%;background:${r.color}"></div>
          </div>
          <div class="bar-value">${r.value}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────
// LISTA: AÇÕES URGENTES (vencendo em ≤ 7 dias ou vencidas)
// ──────────────────────────────────────────────────────────
function renderUrgentActions(actions, risks) {
  const riskMap = Object.fromEntries(risks.map((r) => [r.id, r]));

  const urgent = actions
    .filter((a) => {
      if (
        ["concluida", "cancelada", "completed", "cancelled"].includes(a.status)
      )
        return false;
      const d = daysUntil(a.dueDate);
      return d !== null && d <= 7;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 8);

  const container = document.getElementById("urgentActionsList");

  if (urgent.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--sp-6)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="color:var(--clr-success-500)"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <p class="empty-title" style="font-size:var(--text-sm)">Sem ações urgentes</p>
        <p style="font-size:var(--text-xs)">Todas as ações estão dentro do prazo.</p>
      </div>`;
    return;
  }

  container.innerHTML = urgent
    .map((a) => {
      const days = daysUntil(a.dueDate);
      const cls =
        days < 0
          ? "text-danger"
          : days <= 3
            ? "text-warning"
            : "text-text-secondary";
      return `
      <a href="plano-acao.html" class="mini-list-item" style="padding:var(--sp-3) var(--sp-6);display:flex;align-items:center;gap:var(--sp-3);border-bottom:1px solid var(--clr-border);text-decoration:none;color:inherit">
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--clr-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.actionTitle || a.title || "Ação sem título"}</div>
          <div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${a.responsible || "—"}</div>
        </div>
        <div style="font-size:var(--text-xs);font-weight:var(--font-semi);color:${days < 0 ? "var(--clr-danger-500)" : days <= 3 ? "var(--clr-warning-600)" : "var(--clr-text-secondary)"};white-space:nowrap">
          ${relativeTime(a.dueDate)}
        </div>
      </a>`;
    })
    .join("");
}

// ──────────────────────────────────────────────────────────
// LISTA: TREINAMENTOS VENCENDO EM 30 DIAS
// ──────────────────────────────────────────────────────────
function renderExpiringTrainings(trainings) {
  const expiring = trainings
    .filter((t) => {
      const d = daysUntil(t.expirationDate || t.nextDueDate);
      return d !== null && d >= 0 && d <= 30;
    })
    .sort((a, b) => {
      const da = new Date(a.expirationDate || a.nextDueDate);
      const db = new Date(b.expirationDate || b.nextDueDate);
      return da - db;
    })
    .slice(0, 8);

  const container = document.getElementById("expiringTrainingsList");

  if (expiring.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--sp-6)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="color:var(--clr-success-500)"><path d="M20 6L9 17l-5-5"/></svg>
        <p class="empty-title" style="font-size:var(--text-sm)">Nenhum treinamento vencendo</p>
        <p style="font-size:var(--text-xs)">Todos os treinamentos estão em dia.</p>
      </div>`;
    return;
  }

  container.innerHTML = expiring
    .map((t) => {
      const expDate = t.expirationDate || t.nextDueDate;
      const days = daysUntil(expDate);
      return `
      <a href="treinamentos.html" class="mini-list-item" style="padding:var(--sp-3) var(--sp-6);display:flex;align-items:center;gap:var(--sp-3);border-bottom:1px solid var(--clr-border);text-decoration:none;color:inherit">
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--clr-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title || t.name || "Treinamento"}</div>
          <div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${t.category || t.type || "—"}</div>
        </div>
        <div style="font-size:var(--text-xs);font-weight:var(--font-semi);color:${days <= 7 ? "var(--clr-danger-500)" : "var(--clr-warning-600)"};white-space:nowrap">
          ${formatDate(expDate)}
        </div>
      </a>`;
    })
    .join("");
}
