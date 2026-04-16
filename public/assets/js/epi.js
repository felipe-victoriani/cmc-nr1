// ============================================================
// epi.js — Controle de EPIs
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
  getEPIs,
  saveEPI,
  deleteEPI,
  getEmployees,
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
  { label: "SST / NR-1" },
  { label: "EPI" },
]);

const profile = getCurrentProfile();
const isAdmin = profile.tipo === "admin_master";
const companyId = isAdmin ? null : profile.companyId || null;

let _all = [];
let _establishments = [];
let _employees = [];
let _page = 1;
const PER_PAGE = 20;

const CATEGORY_LABELS = {
  protecao_cabeca: "Proteção da Cabeça",
  protecao_ocular: "Proteção Ocular/Facial",
  protecao_auditiva: "Proteção Auditiva",
  protecao_respiratoria: "Proteção Respiratória",
  protecao_maos: "Proteção das Mãos",
  protecao_pes: "Proteção dos Pés",
  protecao_quedas: "Proteção contra Quedas",
  vestimenta: "Vestimenta",
  outros: "Outros",
};

[_establishments, _employees] = await Promise.all([
  getEstablishments(companyId),
  getEmployees(companyId),
]);

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
  renderSkeletonTable(document.getElementById("tableWrapper"), 5, 7);
  _all = await getEPIs(companyId);
  render();
}

function computeStatus(item) {
  if (!item.nextReplacement) return "active";
  const days = daysUntil(item.nextReplacement);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "active";
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const cat = document.getElementById("filterCategory").value;
  const st = document.getElementById("filterStatus").value;
  const est = document.getElementById("filterEstablishment").value;
  const empMap = Object.fromEntries(
    _employees.map((e) => [e.id, e.fullName || ""]),
  );
  return _all.filter((item) => {
    const status = computeStatus(item);
    const empName = (empMap[item.employeeId] || "").toLowerCase();
    return (
      (!q ||
        (item.epiName || "").toLowerCase().includes(q) ||
        empName.includes(q) ||
        (item.caNumber || "").toLowerCase().includes(q)) &&
      (!cat || item.category === cat) &&
      (!st || status === st) &&
      (!est || item.establishmentId === est)
    );
  });
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));
  const empMap = Object.fromEntries(
    _employees.map((e) => [e.id, e.fullName || ""]),
  );

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      title: "Nenhum EPI encontrado",
      description: 'Clique em "Novo EPI" para registrar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>EPI</th><th>CA</th><th>Categoria</th><th>Trabalhador</th><th>Estabelecimento</th><th>Próx. Troca</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map((item) => {
          const status = computeStatus(item);
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
          <td><div style="font-weight:var(--font-medium);font-size:var(--text-sm)">${item.epiName || "—"}</div></td>
          <td style="font-size:var(--text-sm)">${item.caNumber || "—"}</td>
          <td><span class="badge badge-info" style="font-size:var(--text-xs)">${CATEGORY_LABELS[item.category] || item.category || "—"}</span></td>
          <td style="font-size:var(--text-sm)">${empMap[item.employeeId] || "—"}</td>
          <td style="font-size:var(--text-sm)">${estMap[item.establishmentId] || "Geral"}</td>
          <td style="font-size:var(--text-xs);color:${status === "expired" ? "var(--clr-danger-500)" : status === "expiring_soon" ? "var(--clr-warning-600)" : "var(--clr-text-muted)"}">${item.nextReplacement ? formatDate(item.nextReplacement) : "—"}</td>
          <td><span class="badge ${badgeMap[status]}">${labelMap[status]}</span></td>
          <td><div style="display:flex;gap:var(--sp-1)">
            <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${item.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${item.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
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
    body.querySelector("#epiModalEst")?.appendChild(o);
  });

  _employees.forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = e.fullName || e.id;
    body.querySelector("#epiModalEmployee")?.appendChild(o);
  });

  openModal({
    title: item ? "Editar EPI" : "Novo EPI",
    body: body.innerHTML,
    size: "modal-lg",
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
      "epiName",
      "caNumber",
      "category",
      "establishmentId",
      "employeeId",
      "deliveryDate",
      "nextReplacement",
      "quantity",
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
    epiName: { required: true, label: "Nome do EPI" },
    caNumber: { required: true, label: "Número CA" },
    category: { required: true, label: "Categoria" },
    deliveryDate: { required: true, label: "Data de Entrega" },
  });
  if (!valid) return;
  data.companyId = companyId;
  try {
    await saveEPI(data, id);
    showToast(id ? "EPI atualizado!" : "EPI cadastrado!", "success");
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
      `Excluir EPI <strong>${item?.epiName || id}</strong>?`,
      "Excluir EPI",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteEPI(id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

function doExport() {
  const filtered = getFiltered();
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));
  const empMap = Object.fromEntries(
    _employees.map((e) => [e.id, e.fullName || ""]),
  );
  const headers = [
    "EPI",
    "CA",
    "Categoria",
    "Trabalhador",
    "Estabelecimento",
    "Data Entrega",
    "Próx. Troca",
    "Qtd",
    "Status",
    "Observações",
  ];
  const rows = filtered.map((item) => {
    const status = computeStatus(item);
    const labelMap = {
      active: "Em Dia",
      expired: "Vencido",
      expiring_soon: "Vence em Breve",
    };
    return [
      item.epiName || "",
      item.caNumber || "",
      CATEGORY_LABELS[item.category] || item.category || "",
      empMap[item.employeeId] || "",
      estMap[item.establishmentId] || "Geral",
      item.deliveryDate || "",
      item.nextReplacement || "",
      item.quantity || "",
      labelMap[status],
      item.notes || "",
    ];
  });
  exportCSV(headers, rows, "epis.csv");
}
