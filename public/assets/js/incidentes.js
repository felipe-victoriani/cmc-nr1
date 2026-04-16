// ============================================================
// incidentes.js — Registro de Incidentes e Acidentes
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
  getIncidents,
  saveIncident,
  getEstablishments,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import {
  formatDate,
  formatDateTime,
  exportCSV,
  INCIDENT_TYPE_LABELS,
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
  { label: "Incidentes" },
]);

const profile = getCurrentProfile();
const companyId = profile.companyId || null;

let _all = [];
let _establishments = [];
let _page = 1;
const PER_PAGE = 20;

const STATUS_BADGE = {
  open: `<span class="badge badge-danger">Aberto</span>`,
  investigating: `<span class="badge badge-warning">Em Investigação</span>`,
  closed: `<span class="badge badge-gray">Encerrado</span>`,
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
  _all = await getIncidents(companyId);
  renderSummary();
  render();
}

function renderSummary() {
  const open = _all.filter((i) => i.status === "open").length;
  const inv = _all.filter((i) => i.status === "investigating").length;
  const fatal = _all.filter((i) => i.incidentType === "fatal").length;
  const near = _all.filter((i) => i.incidentType === "near_miss").length;

  document.getElementById("incidentSummary").innerHTML = `
    <div class="stat-card"><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div><div class="stat-value">${open}</div><div class="stat-label">Abertos</div></div></div>
    <div class="stat-card"><div class="stat-icon warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
      <div><div class="stat-value">${inv}</div><div class="stat-label">Em Investigação</div></div></div>
    <div class="stat-card"><div class="stat-icon primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div><div class="stat-value">${near}</div><div class="stat-label">Quase Acidentes</div></div></div>
    <div class="stat-card"><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
      <div><div class="stat-value">${fatal}</div><div class="stat-label">Fatais</div></div></div>
    <div class="stat-card"><div class="stat-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
      <div><div class="stat-value">${_all.length}</div><div class="stat-label">Total</div></div></div>
  `;
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const tp = document.getElementById("filterType").value;
  const st = document.getElementById("filterStatus").value;
  const est = document.getElementById("filterEstablishment").value;
  return _all.filter(
    (i) =>
      (!q ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.involvedPerson || "").toLowerCase().includes(q)) &&
      (!tp || i.incidentType === tp) &&
      (!st || i.status === st) &&
      (!est || i.establishmentId === est),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      title: "Nenhum incidente encontrado",
      description: 'Clique em "Registrar Incidente" para criar um registro.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Descrição</th><th>Tipo</th><th>Estabelecimento</th><th>Envolvido</th><th>Data</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map(
          (i) => `<tr>
        <td style="max-width:240px"><div style="font-size:var(--text-sm)">${(i.description || "—").substring(0, 80)}${(i.description || "").length > 80 ? "…" : ""}</div></td>
        <td style="font-size:var(--text-sm)">${INCIDENT_TYPE_LABELS[i.incidentType] || i.incidentType || "—"}</td>
        <td style="font-size:var(--text-sm)">${estMap[i.establishmentId] || "—"}</td>
        <td style="font-size:var(--text-sm)">${i.involvedPerson || "—"}</td>
        <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${i.incidentDate ? formatDateTime(i.incidentDate) : "—"}</td>
        <td>${STATUS_BADGE[i.status] || STATUS_BADGE.open}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${i.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${i.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
        .join("")}
    </tbody></table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((i) => i.id === b.dataset.id)),
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
    body.querySelector("#incidentModalEst")?.appendChild(o);
  });

  openModal({
    title: item ? "Editar Incidente" : "Registrar Incidente",
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
      "incidentType",
      "establishmentId",
      "incidentDate",
      "location",
      "description",
      "involvedPerson",
      "bodyPart",
      "materialDamage",
      "rootCause",
      "correctiveActions",
      "investigator",
      "status",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
  } else {
    const dt = document.querySelector('.modal-body [name="incidentDate"]');
    if (dt) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dt.value = now.toISOString().substring(0, 16);
    }
  }
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    incidentType: { required: true, label: "Tipo de Incidente" },
    establishmentId: { required: true, label: "Estabelecimento" },
    incidentDate: { required: true, label: "Data e Hora" },
    description: { required: true, label: "Descrição" },
  });
  if (!valid) return;
  data.companyId = companyId;
  try {
    await saveIncident(data, id);
    showToast(
      id ? "Incidente atualizado!" : "Incidente registrado!",
      "success",
    );
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((i) => i.id === id);
  if (
    !(await showConfirm(
      `Excluir registro de incidente?`,
      "Excluir Incidente",
      "btn-danger",
    ))
  )
    return;
  try {
    await saveIncident({ deleted: true }, id);
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
    "Estabelecimento",
    "Data/Hora",
    "Local",
    "Descrição",
    "Envolvido",
    "Parte do Corpo",
    "Danos Materiais",
    "Causa Raiz",
    "Ações Corretivas",
    "Investigador",
    "Status",
  ];
  const rows = filtered.map((i) => [
    INCIDENT_TYPE_LABELS[i.incidentType] || i.incidentType || "",
    estMap[i.establishmentId] || "",
    i.incidentDate || "",
    i.location || "",
    i.description || "",
    i.involvedPerson || "",
    i.bodyPart || "",
    i.materialDamage || "",
    i.rootCause || "",
    i.correctiveActions || "",
    i.investigator || "",
    i.status || "",
  ]);
  exportCSV(headers, rows, "incidentes.csv");
}
