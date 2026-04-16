// ============================================================
// terceiros.js — Terceiros e Prestadores de Serviços
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
import { getThirdParties, saveThirdParty } from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate, applyAllMasks, exportCSV } from "./utils.js";

await requireProfile(["admin_master", "gestor_rh", "gestor_unidade"]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "RH" },
  { label: "Terceiros" },
]);

const profile = getCurrentProfile();
const companyId = profile.companyId || null;

let _all = [];
let _page = 1;
const PER_PAGE = 20;

const STATUS_BADGE = {
  active: `<span class="badge badge-success">Ativo</span>`,
  inactive: `<span class="badge badge-gray">Inativo</span>`,
  pending_docs: `<span class="badge badge-warning">Doc. Pendente</span>`,
};

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

await loadData();

async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 5, 4);
  _all = await getThirdParties(companyId);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const tp = document.getElementById("filterType").value;
  const st = document.getElementById("filterStatus").value;
  return _all.filter(
    (t) =>
      (!q ||
        (t.name || "").toLowerCase().includes(q) ||
        (t.document || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))) &&
      (!tp || t.thirdPartyType === tp) &&
      (!st || t.status === st),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      title: "Nenhum terceiro encontrado",
      description: 'Clique em "Cadastrar Terceiro" para adicionar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Nome / Razão Social</th><th>Documento</th><th>Telefone</th><th>Serviços</th><th>Contrato</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map(
          (t) => `<tr>
        <td><div style="font-weight:var(--font-medium);font-size:var(--text-sm)">${t.name || "—"}</div>${t.contactName ? `<div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${t.contactName}</div>` : ""}</td>
        <td style="font-size:var(--text-xs);font-family:var(--font-mono)">${t.document || "—"}</td>
        <td style="font-size:var(--text-sm)">${t.phone || "—"}</td>
        <td style="font-size:var(--text-xs);max-width:160px;color:var(--clr-text-muted)">${t.services ? t.services.substring(0, 60) + (t.services.length > 60 ? "…" : "") : "—"}</td>
        <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${t.contractEnd ? `até ${formatDate(t.contractEnd)}` : "—"}</td>
        <td>${STATUS_BADGE[t.status] || STATUS_BADGE.active}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
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
  openModal({
    title: item ? "Editar Terceiro" : "Cadastrar Terceiro",
    body: tpl.innerHTML,
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
      "thirdPartyType",
      "status",
      "name",
      "document",
      "phone",
      "email",
      "contactName",
      "services",
      "contractStart",
      "contractEnd",
      "requiredDocs",
      "notes",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
  }
  applyAllMasks(document.querySelector(".modal-body"));
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    thirdPartyType: { required: true, label: "Tipo" },
    name: { required: true, label: "Nome / Razão Social" },
    email: { email: true, label: "E-mail" },
  });
  if (!valid) return;
  data.companyId = companyId;
  try {
    await saveThirdParty(data, id);
    showToast(id ? "Terceiro atualizado!" : "Terceiro cadastrado!", "success");
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
      `Excluir <strong>${item?.name || id}</strong>?`,
      "Excluir Terceiro",
      "btn-danger",
    ))
  )
    return;
  try {
    await saveThirdParty({ deleted: true }, id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

function doExport() {
  const filtered = getFiltered();
  const headers = [
    "Tipo",
    "Nome",
    "Documento",
    "Telefone",
    "E-mail",
    "Responsável",
    "Serviços",
    "Início Contrato",
    "Término Contrato",
    "Status",
  ];
  const rows = filtered.map((t) => [
    t.thirdPartyType === "company" ? "Empresa" : "Pessoa Física",
    t.name || "",
    t.document || "",
    t.phone || "",
    t.email || "",
    t.contactName || "",
    t.services || "",
    t.contractStart || "",
    t.contractEnd || "",
    t.status || "",
  ]);
  exportCSV(headers, rows, "terceiros.csv");
}
