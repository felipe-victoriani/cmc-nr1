/**
 * documentos.js — Repositório de Documentos SST
 * Módulo: upload / listagem / download de documentos via Firebase Storage + Realtime Database
 */

import { requireProfile } from "./guards.js";
import { initAppUI, setBreadcrumb, openModal, showToast } from "./ui.js";
import { getCurrentProfile } from "./auth.js";
import { formatDate, daysUntil, exportCSV } from "./utils.js";
import {
  getDocuments,
  saveDocument,
  getEstablishments,
} from "./services.database.js";
import { uploadFile } from "./services.storage.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  pgr: "PGR",
  pcmso: "PCMSO",
  aso: "ASO",
  ltcat: "LTCAT",
  nr_training: "Certificado NR",
  admission: "Admissão",
  dismissal: "Demissão",
  other: "Outros",
};

const STATUS_BADGE = {
  valid: '<span class="badge badge-success">Válido</span>',
  expired: '<span class="badge badge-danger">Vencido</span>',
  expiring_soon: '<span class="badge badge-warning">Vence em Breve</span>',
  no_expiry: '<span class="badge badge-info">Sem Validade</span>',
};

// ─── State ────────────────────────────────────────────────────────────────────

let _all = [];
let _filtered = [];
let _establishments = {};
let _companyId = null;
let _editId = null;

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
  { label: "Documentos" },
]);
_companyId = getCurrentProfile()?.companyId || null;
loadData();
bindGlobalListeners();

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadData() {
  showLoader(true);
  try {
    const [docs, ests] = await Promise.all([
      getDocuments(_companyId),
      getEstablishments(_companyId),
    ]);

    _establishments = {};
    (ests || []).forEach((e) => (_establishments[e.id] = e.name));
    populateEstSelect();

    _all = (docs || []).filter((d) => !d.deleted);
    applyFilters();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar documentos.", "error");
  } finally {
    showLoader(false);
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function applyFilters() {
  const search =
    document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
  const cat = document.getElementById("filterCategory")?.value || "";
  const status = document.getElementById("filterStatus")?.value || "";
  const est = document.getElementById("filterEstablishment")?.value || "";

  _filtered = _all.filter((d) => {
    const matchSearch =
      !search ||
      d.documentName?.toLowerCase().includes(search) ||
      d.notes?.toLowerCase().includes(search);
    const matchCat = !cat || d.category === cat;
    const matchEst = !est || d.establishmentId === est;
    const matchStatus = !status || computeStatus(d) === status;
    return matchSearch && matchCat && matchEst && matchStatus;
  });

  renderTable();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(doc) {
  if (!doc.expirationDate) return "no_expiry";
  const days = daysUntil(doc.expirationDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

function populateEstSelect() {
  const sel = document.getElementById("filterEstablishment");
  if (!sel) return;
  const saved = sel.value;
  sel.innerHTML = '<option value="">Todos os Estabelecimentos</option>';
  Object.entries(_establishments).forEach(([id, name]) => {
    sel.insertAdjacentHTML(
      "beforeend",
      `<option value="${id}">${name}</option>`,
    );
  });
  sel.value = saved;
}

function populateModalEstSelect(currentVal) {
  const sel = document.getElementById("docModalEst");
  if (!sel) return;
  sel.innerHTML = '<option value="">Geral / Empresa</option>';
  Object.entries(_establishments).forEach(([id, name]) => {
    sel.insertAdjacentHTML(
      "beforeend",
      `<option value="${id}">${name}</option>`,
    );
  });
  if (currentVal) sel.value = currentVal;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTable() {
  const wrapper = document.getElementById("tableWrapper");
  if (!wrapper) return;

  if (!_filtered.length) {
    wrapper.innerHTML = `<div class="empty-state"><p>Nenhum documento encontrado.</p></div>`;
    return;
  }

  const rows = _filtered
    .map((d) => {
      const status = computeStatus(d);
      const badge = STATUS_BADGE[status] || "";
      const estName = _establishments[d.establishmentId] || "—";
      const catLabel = CATEGORY_LABELS[d.category] || d.category || "—";
      const exp = d.expirationDate ? formatDate(d.expirationDate) : "—";
      const docDate = d.documentDate ? formatDate(d.documentDate) : "—";

      const downloadBtn = d.fileUrl
        ? `<a href="${escapeHtml(d.fileUrl)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" title="Baixar">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
         </a>`
        : '<span style="color:var(--clr-text-muted);font-size:var(--text-xs)">Sem arquivo</span>';

      return `<tr>
      <td><strong>${escapeHtml(d.documentName || "")}</strong></td>
      <td><span class="badge badge-outline">${catLabel}</span></td>
      <td>${escapeHtml(estName)}</td>
      <td>${docDate}</td>
      <td>${exp}</td>
      <td>${badge}</td>
      <td>${downloadBtn}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${d.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-sm btn-ghost btn-danger-ghost" data-action="delete" data-id="${d.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Categoria</th>
          <th>Estabelecimento</th>
          <th>Data</th>
          <th>Validade</th>
          <th>Status</th>
          <th>Arquivo</th>
          <th style="width:90px">Ações</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  wrapper.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") openForm(id);
      if (btn.dataset.action === "delete") confirmDelete(id);
    });
  });
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function openForm(id) {
  _editId = id || null;
  const doc = id ? _all.find((d) => d.id === id) : null;

  const tpl = document.getElementById("tplModal");
  if (!tpl) return;
  const body = tpl.content.cloneNode(true);
  const div = document.createElement("div");
  div.appendChild(body);

  openModal({
    title: id ? "Editar Documento" : "Enviar Documento",
    body: div.innerHTML,
    size: "modal-md",
    footer: [
      { label: "Cancelar", type: "secondary", action: "close" },
      { label: id ? "Salvar" : "Enviar", type: "primary", id: "btnSaveDoc" },
    ],
  });

  // populate establishment select
  populateModalEstSelect(doc?.establishmentId || "");

  // fill values if editing
  if (doc) {
    const set = (name, val) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (el) el.value = val ?? "";
    };
    set("documentName", doc.documentName);
    set("category", doc.category);
    set("documentDate", doc.documentDate);
    set("expirationDate", doc.expirationDate);
    set("fileUrl", doc.fileUrl);
    set("notes", doc.notes);
  }

  // hide file URL when file is uploading; wire save btn
  setTimeout(() => {
    document
      .getElementById("btnSaveDoc")
      ?.addEventListener("click", () => saveForm());
  }, 50);
}

async function saveForm() {
  const get = (name) => document.querySelector(`[name="${name}"]`);

  const documentName = get("documentName")?.value.trim() || "";
  const category = get("category")?.value || "";
  const documentDate = get("documentDate")?.value || "";
  const expirationDate = get("expirationDate")?.value || "";
  const notes = get("notes")?.value.trim() || "";
  const fileInput = document.getElementById("docFileInput");
  let fileUrl = get("fileUrl")?.value.trim() || "";
  let fileName = "";

  // Validation
  if (!documentName)
    return showToast("Nome do documento é obrigatório.", "warning");
  if (!category) return showToast("Categoria é obrigatória.", "warning");

  const estId = document.getElementById("docModalEst")?.value || "";
  const saveBtn = document.getElementById("btnSaveDoc");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
  }

  try {
    // Upload file if provided
    if (fileInput?.files?.[0]) {
      const file = fileInput.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast("Arquivo muito grande. Máximo 10 MB.", "warning");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = _editId ? "Salvar" : "Enviar";
        }
        return;
      }
      fileName = file.name;
      const path = `companies/${_companyId}/documents/${Date.now()}_${fileName}`;
      fileUrl = await uploadFile(file, path);
    }

    const payload = {
      companyId: _companyId,
      documentName,
      category,
      establishmentId: estId,
      documentDate,
      expirationDate,
      fileUrl,
      fileName,
      notes,
      updatedAt: new Date().toISOString(),
    };

    if (!_editId) payload.createdAt = new Date().toISOString();

    await saveDocument(payload, _editId);
    showToast(
      _editId ? "Documento atualizado." : "Documento enviado.",
      "success",
    );

    // close modal
    document.getElementById("modalBackdrop")?.dispatchEvent(new Event("click"));
    await loadData();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar documento: " + (err.message || ""), "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = _editId ? "Salvar" : "Enviar";
    }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function confirmDelete(id) {
  const doc = _all.find((d) => d.id === id);
  if (!doc) return;

  openModal({
    title: "Excluir Documento",
    body: `<p>Deseja excluir o documento <strong>${escapeHtml(doc.documentName || "")}</strong>?</p>
           <p style="color:var(--clr-text-muted);font-size:var(--text-sm);margin-top:var(--sp-2)">Esta ação não remove o arquivo do Storage.</p>`,
    size: "sm",
    footer: [
      { label: "Cancelar", type: "secondary", action: "close" },
      { label: "Excluir", type: "danger", id: "btnConfirmDelete" },
    ],
  });

  setTimeout(() => {
    document
      .getElementById("btnConfirmDelete")
      ?.addEventListener("click", async () => {
        try {
          await saveDocument({ deleted: true }, id);
          showToast("Documento excluído.", "success");
          document
            .getElementById("modalBackdrop")
            ?.dispatchEvent(new Event("click"));
          await loadData();
        } catch (err) {
          showToast("Erro ao excluir.", "error");
        }
      });
  }, 50);
}

// ─── Global Listeners ────────────────────────────────────────────────────────

function bindGlobalListeners() {
  document
    .getElementById("btnNew")
    ?.addEventListener("click", () => openForm(null));

  [
    "searchInput",
    "filterCategory",
    "filterStatus",
    "filterEstablishment",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", applyFilters);
    document.getElementById(id)?.addEventListener("change", applyFilters);
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function showLoader(visible) {
  const el = document.getElementById("globalLoader");
  if (el) el.classList.toggle("hidden", !visible);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
