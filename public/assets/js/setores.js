// ============================================================
// setores.js — CRUD de Setores (Departamentos)
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
  getDepartments,
  saveDepartment,
  deleteDepartment,
  getEstablishments,
  getCompanies,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import { formatDate } from "./utils.js";

await requireProfile(["admin_master", "gestor_rh", "gestor_unidade"]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Organização" },
  { label: "Setores" },
]);

const profile = getCurrentProfile();
const isAdmin = profile.tipo === "admin_master";
const companyId = isAdmin ? null : profile.companyId || null;

let _all = [];
let _establishments = [];
let _companies = [];
let _page = 1;
const PER_PAGE = 20;

// ── Carrega dados de apoio ─────────────────────────────────
if (isAdmin) {
  _companies = await getCompanies();
}
_establishments = await getEstablishments(companyId);

const filterEst = document.getElementById("filterEstablishment");
_establishments.forEach((e) => {
  const opt = document.createElement("option");
  opt.value = e.id;
  opt.textContent = e.name;
  filterEst.appendChild(opt);
});

// ── Eventos ────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("searchInput").addEventListener("input", () => {
  _page = 1;
  render();
});
document
  .getElementById("filterEstablishment")
  .addEventListener("change", () => {
    _page = 1;
    render();
  });
document.getElementById("filterStatus").addEventListener("change", () => {
  _page = 1;
  render();
});

await loadData();

// ──────────────────────────────────────────────────────────
async function loadData() {
  renderSkeletonTable(document.getElementById("tableWrapper"), 6, 4);
  _all = await getDepartments(companyId);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const est = document.getElementById("filterEstablishment").value;
  const st = document.getElementById("filterStatus").value;
  return _all.filter(
    (d) =>
      (!q ||
        (d.name || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)) &&
      (!est || d.establishmentId === est) &&
      (!st || d.status === st),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));
  const stBadge = (s) =>
    s === "inactive"
      ? `<span class="badge badge-gray">Inativo</span>`
      : `<span class="badge badge-success">Ativo</span>`;

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>`,
      title: "Nenhum setor encontrado",
      description: 'Clique em "Novo Setor" para adicionar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Nome do Setor</th><th>Estabelecimento</th><th>Responsável</th><th>Status</th><th>Cadastro</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map(
          (d) => `<tr>
        <td><div style="font-weight:var(--font-medium)">${d.name}</div>${d.description ? `<div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${d.description}</div>` : ""}</td>
        <td style="font-size:var(--text-sm)">${estMap[d.establishmentId] || "—"}</td>
        <td style="font-size:var(--text-sm)">${d.managerName || "—"}</td>
        <td>${stBadge(d.status)}</td>
        <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${formatDate(d.createdAt)}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${d.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${d.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
        .join("")}
    </tbody></table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((d) => d.id === b.dataset.id)),
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

function buildEstablishmentOptions(sel, filterByCompany = null) {
  const list = filterByCompany
    ? _establishments.filter((e) => e.companyId === filterByCompany)
    : _establishments;
  sel.innerHTML = '<option value="">Selecione</option>';
  list.forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = e.name;
    sel.appendChild(opt);
  });
}

function openForm(item = null) {
  const tpl = document.getElementById("tplModal");
  const body = document.createElement("div");
  body.innerHTML = tpl.innerHTML;

  // Para admin_master: insere seletor de empresa antes do estabelecimento
  if (isAdmin) {
    const gEst = body.querySelector("#g-establishmentId");
    const gCompany = document.createElement("div");
    gCompany.className = "form-group col-span-full";
    gCompany.id = "g-companyId";
    gCompany.innerHTML = `
      <label class="form-label">Empresa <span class="required">*</span></label>
      <select class="form-control" name="companyId" id="selectCompanySetor">
        <option value="">Selecione a empresa</option>
        ${_companies.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
      <span class="form-error">Obrigatório.</span>`;
    gEst.parentNode.insertBefore(gCompany, gEst);
  }

  const sel = body.querySelector("#selectEstablishment");
  buildEstablishmentOptions(sel, isAdmin ? item?.companyId || null : null);

  openModal({
    title: item ? "Editar Setor" : "Novo Setor",
    body: body.innerHTML,
    size: "modal-md",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar" : "Criar",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  // Cascata empresa → estabelecimento para admin_master
  if (isAdmin) {
    const selComp = document.querySelector(".modal-body #selectCompanySetor");
    const selEst = document.querySelector(".modal-body #selectEstablishment");
    selComp?.addEventListener("change", () => {
      buildEstablishmentOptions(selEst, selComp.value || null);
    });
    if (item?.companyId) selComp.value = item.companyId;
  }

  if (item) {
    ["establishmentId", "name", "description", "managerName", "status"].forEach(
      (f) => {
        const el = document.querySelector(`.modal-body [name="${f}"]`);
        if (el)
          el.tagName === "SELECT"
            ? (el.value = item[f] || "")
            : (el.value = item[f] || "");
      },
    );
  }
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const rules = {
    establishmentId: { required: true, label: "Estabelecimento" },
    name: { required: true, label: "Nome do Setor" },
  };
  if (isAdmin) rules.companyId = { required: true, label: "Empresa" };
  const { valid, data } = validateForm(
    document.querySelector(".modal-body"),
    rules,
  );
  if (!valid) return;
  if (!isAdmin) data.companyId = companyId;
  // Para admin, o companyId vem do form; garante consistência com o estabelecimento selecionado
  if (isAdmin && data.establishmentId) {
    const est = _establishments.find((e) => e.id === data.establishmentId);
    if (est) data.companyId = est.companyId;
  }
  try {
    await saveDepartment(data, id);
    showToast(id ? "Setor atualizado!" : "Setor criado!", "success");
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((d) => d.id === id);
  if (
    !(await showConfirm(
      `Excluir setor <strong>${item?.name || id}</strong>?`,
      "Excluir Setor",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteDepartment(id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}
