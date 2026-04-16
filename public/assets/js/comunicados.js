// ============================================================
// comunicados.js — Comunicados Internos
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
} from "./ui.js";
import { getCurrentProfile } from "./auth.js";
import { getCommunications, saveCommunication } from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate, relativeTime } from "./utils.js";

await requireProfile([
  "admin_master",
  "gestor_rh",
  "gestor_unidade",
  "tecnico_sst",
]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Gestão" },
  { label: "Comunicados" },
]);

const profile = getCurrentProfile();
const companyId = profile.companyId || null;

let _all = [];
let _page = 1;
const PER_PAGE = 12;

const TYPE_LABELS = {
  safety_alert: "Alerta de Segurança",
  policy: "Política / Norma",
  general: "Geral",
  urgent: "Urgente",
};
const TYPE_BADGE = {
  safety_alert: "badge-warning",
  policy: "badge-info",
  general: "badge-gray",
  urgent: "badge-danger",
};

document.getElementById("btnNew").addEventListener("click", () => openForm());
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
  document.getElementById("commsContainer").innerHTML =
    `<div class="stats-grid">${Array(4).fill(`<div class="skeleton" style="height:120px;border-radius:12px"></div>`).join("")}</div>`;
  _all = await getCommunications(companyId);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const tp = document.getElementById("filterType").value;
  const st = document.getElementById("filterStatus").value;
  return _all.filter(
    (c) =>
      (!q ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.content || "").toLowerCase().includes(q)) &&
      (!tp || c.type === tp) &&
      (!st || c.status === st),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("commsContainer");

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
      title: "Nenhum comunicado encontrado",
      description: 'Clique em "Novo Comunicado" para criar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `<div style="display:grid;gap:var(--sp-4)">
    ${page
      .map(
        (c) => `<div class="card">
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-3)">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-1)">
              <span class="badge ${TYPE_BADGE[c.type] || "badge-gray"}">${TYPE_LABELS[c.type] || c.type || "—"}</span>
              ${c.status === "archived" ? `<span class="badge badge-gray">Arquivado</span>` : ""}
            </div>
            <h3 style="font-size:var(--text-base);font-weight:var(--font-semi);margin-bottom:var(--sp-2)">${c.title || "Sem título"}</h3>
            <p style="font-size:var(--text-sm);color:var(--clr-text-secondary);line-height:1.6;white-space:pre-wrap">${(c.content || "").substring(0, 300)}${(c.content || "").length > 300 ? "…" : ""}</p>
            <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-4);font-size:var(--text-xs);color:var(--clr-text-muted)">
              ${c.author ? `<span>Por: ${c.author}</span>` : ""}
              ${c.publishDate ? `<span>Publicado: ${formatDate(c.publishDate)}</span>` : `<span>${relativeTime(c.createdAt)}</span>`}
              ${c.expirationDate ? `<span>Expira: ${formatDate(c.expirationDate)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:var(--sp-1);flex-shrink:0">
            <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
          </div>
        </div>
      </div>
    </div>`,
      )
      .join("")}
  </div>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((c) => c.id === b.dataset.id)),
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
    title: item ? "Editar Comunicado" : "Novo Comunicado",
    body: tpl.innerHTML,
    size: "modal-lg",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar" : "Publicar",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  if (item) {
    [
      "title",
      "type",
      "status",
      "content",
      "publishDate",
      "expirationDate",
      "author",
    ].forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (el) el.value = item[f] || "";
    });
  } else {
    const pd = document.querySelector('.modal-body [name="publishDate"]');
    if (pd) pd.value = new Date().toISOString().substring(0, 10);
  }
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const { valid, data } = validateForm(document.querySelector(".modal-body"), {
    title: { required: true, label: "Título" },
    type: { required: true, label: "Tipo" },
    content: { required: true, label: "Conteúdo" },
  });
  if (!valid) return;
  data.companyId = companyId;
  try {
    await saveCommunication(data, id);
    showToast(
      id ? "Comunicado atualizado!" : "Comunicado publicado!",
      "success",
    );
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((c) => c.id === id);
  if (
    !(await showConfirm(
      `Excluir comunicado <strong>${item?.title || id}</strong>?`,
      "Excluir Comunicado",
      "btn-danger",
    ))
  )
    return;
  try {
    await saveCommunication({ deleted: true }, id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}
