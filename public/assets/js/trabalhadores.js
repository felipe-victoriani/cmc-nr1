// ============================================================
// trabalhadores.js — CRUD de Trabalhadores
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
  getEmployees,
  saveEmployee,
  deleteEmployee,
  getEstablishments,
  getDepartments,
  getRoles,
  getCompanies,
} from "./services.database.js";
import { validateForm, clearOnInput } from "./validators.js";
import {
  formatDate,
  maskCPF,
  applyAllMasks,
  exportCSV,
  EMPLOYMENT_TYPE_LABELS,
} from "./utils.js";

await requireProfile(["admin_master", "gestor_rh", "gestor_unidade"]);
await initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Organização" },
  { label: "Trabalhadores" },
]);

const profile = getCurrentProfile();
const isAdmin = profile.tipo === "admin_master";
const companyId = isAdmin ? null : profile.companyId || null;

let _all = [];
let _establishments = [];
let _departments = [];
let _roles = [];
let _companies = [];
let _page = 1;
const PER_PAGE = 20;

const STATUS_BADGE = {
  active: `<span class="badge badge-success">Ativo</span>`,
  inactive: `<span class="badge badge-gray">Inativo</span>`,
  on_leave: `<span class="badge badge-warning">Afastado</span>`,
  vacation: `<span class="badge badge-info">Férias</span>`,
};

// ── Pré-carrega listas de apoio ───────────────────────────
if (isAdmin) _companies = await getCompanies();
[_establishments, _departments, _roles] = await Promise.all([
  getEstablishments(companyId),
  getDepartments(companyId),
  getRoles(companyId),
]);

// Popula filtros
const selEst = document.getElementById("filterEstablishment");
_establishments.forEach((e) => {
  const o = document.createElement("option");
  o.value = e.id;
  o.textContent = e.name;
  selEst.appendChild(o);
});

const selDep = document.getElementById("filterDepartment");
_departments.forEach((d) => {
  const o = document.createElement("option");
  o.value = d.id;
  o.textContent = d.name;
  selDep.appendChild(o);
});

// ── Eventos ────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openForm());
document.getElementById("btnExport").addEventListener("click", doExport);
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
document.getElementById("filterDepartment").addEventListener("change", () => {
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
  renderSkeletonTable(document.getElementById("tableWrapper"), 6, 5);
  _all = await getEmployees(companyId);
  render();
}

function getFiltered() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const est = document.getElementById("filterEstablishment").value;
  const dep = document.getElementById("filterDepartment").value;
  const st = document.getElementById("filterStatus").value;
  return _all.filter(
    (e) =>
      (!q ||
        (e.fullName || "").toLowerCase().includes(q) ||
        (e.cpf || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        (e.registration || "").toLowerCase().includes(q)) &&
      (!est || e.establishmentId === est) &&
      (!dep || e.departmentId === dep) &&
      (!st || e.status === st),
  );
}

function render() {
  const filtered = getFiltered();
  const page = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const wrap = document.getElementById("tableWrapper");
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));
  const depMap = Object.fromEntries(_departments.map((d) => [d.id, d.name]));
  const roleMap = Object.fromEntries(_roles.map((r) => [r.id, r.name]));

  if (!filtered.length) {
    renderEmptyState(wrap, {
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      title: "Nenhum trabalhador encontrado",
      description: 'Clique em "Novo Trabalhador" para adicionar.',
    });
    document.getElementById("paginationContainer").style.display = "none";
    return;
  }

  wrap.innerHTML = `
    <table class="table"><thead><tr>
      <th>Trabalhador</th><th>CPF</th><th>Estabelecimento</th><th>Cargo / Setor</th><th>Contrato</th><th>Admissão</th><th>Status</th><th style="width:88px"></th>
    </tr></thead><tbody>
      ${page
        .map(
          (e) => `<tr>
        <td><div style="font-weight:var(--font-medium)">${e.fullName}</div>${e.email ? `<div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${e.email}</div>` : ""}</td>
        <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${e.cpf || "—"}</td>
        <td style="font-size:var(--text-sm)">${estMap[e.establishmentId] || "—"}</td>
        <td><div style="font-size:var(--text-sm)">${roleMap[e.roleId] || "—"}</div><div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${depMap[e.departmentId] || ""}</div></td>
        <td style="font-size:var(--text-xs)">${EMPLOYMENT_TYPE_LABELS[e.contractType] || e.contractType || "—"}</td>
        <td style="font-size:var(--text-xs);color:var(--clr-text-muted)">${formatDate(e.admissionDate)}</td>
        <td>${STATUS_BADGE[e.status] || STATUS_BADGE.active}</td>
        <td><div style="display:flex;gap:var(--sp-1)">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${e.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm text-danger" data-action="delete" data-id="${e.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td>
      </tr>`,
        )
        .join("")}
    </tbody></table>`;

  wrap
    .querySelectorAll('[data-action="edit"]')
    .forEach((b) =>
      b.addEventListener("click", () =>
        openForm(_all.find((e) => e.id === b.dataset.id)),
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

  // Para admin_master: insere seletor de empresa no topo com cascata
  if (isAdmin) {
    const firstGroup = body.querySelector(".form-group");
    const gCompany = document.createElement("div");
    gCompany.className = "form-group col-span-full";
    gCompany.innerHTML = `
      <label class="form-label">Empresa <span class="required">*</span></label>
      <select class="form-control" name="companyId" id="selCompanyTrab">
        <option value="">Selecione a empresa</option>
        ${_companies.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
      <span class="form-error">Obrigatório.</span>`;
    firstGroup.parentNode.insertBefore(gCompany, firstGroup);
  }

  const filterByCompany = isAdmin ? item?.companyId || null : null;

  // Popula selects filtrando pela empresa quando admin
  const popSel = (id, arr) => {
    const el = body.querySelector(id);
    if (!el) return;
    el.innerHTML = '<option value="">Selecione</option>';
    arr.forEach((a) => {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = a.name;
      el.appendChild(o);
    });
  };

  const estsByCompany = filterByCompany
    ? _establishments.filter((e) => e.companyId === filterByCompany)
    : _establishments;
  const depsByCompany = filterByCompany
    ? _departments.filter((d) => d.companyId === filterByCompany)
    : _departments;
  const rolesByCompany = filterByCompany
    ? _roles.filter((r) => r.companyId === filterByCompany)
    : _roles;

  popSel("#selEstablishment", estsByCompany);
  popSel("#selDepartment", depsByCompany);
  popSel("#selRole", rolesByCompany);

  openModal({
    title: item ? "Editar Trabalhador" : "Novo Trabalhador",
    body: body.innerHTML,
    size: "modal-xl",
    footer: [
      { label: "Cancelar", class: "btn btn-secondary", handler: closeModal },
      {
        label: item ? "Salvar Alterações" : "Cadastrar",
        class: "btn btn-primary",
        handler: () => submitForm(item?.id),
      },
    ],
  });

  // Cascata empresa → estabelecimento/setor/cargo para admin
  if (isAdmin) {
    const selComp = document.querySelector(".modal-body #selCompanyTrab");
    selComp?.addEventListener("change", () => {
      const cId = selComp.value || null;
      const updateSel = (selector, arr) => {
        const el = document.querySelector(".modal-body " + selector);
        if (!el) return;
        el.innerHTML = '<option value="">Selecione</option>';
        const filtered = cId ? arr.filter((x) => x.companyId === cId) : arr;
        filtered.forEach((a) => {
          const o = document.createElement("option");
          o.value = a.id;
          o.textContent = a.name;
          el.appendChild(o);
        });
      };
      updateSel("#selEstablishment", _establishments);
      updateSel("#selDepartment", _departments);
      updateSel("#selRole", _roles);
    });
    if (item?.companyId) selComp.value = item.companyId;
  }

  if (item) {
    const fields = [
      "fullName",
      "cpf",
      "rg",
      "birthDate",
      "gender",
      "phone",
      "email",
      "establishmentId",
      "departmentId",
      "roleId",
      "contractType",
      "admissionDate",
      "registration",
      "status",
      "emergencyContact",
      "emergencyPhone",
      "notes",
    ];
    fields.forEach((f) => {
      const el = document.querySelector(`.modal-body [name="${f}"]`);
      if (!el) return;
      if (el.tagName === "SELECT") el.value = item[f] || "";
      else el.value = item[f] || "";
    });
  }
  applyAllMasks(document.querySelector(".modal-body"));
  clearOnInput(document.querySelector(".modal-body"));
}

async function submitForm(id = null) {
  const rules = {
    fullName: { required: true, label: "Nome Completo" },
    cpf: { required: true, cpf: true, label: "CPF" },
    establishmentId: { required: true, label: "Estabelecimento" },
    email: { email: true, label: "E-mail" },
  };
  if (isAdmin) rules.companyId = { required: true, label: "Empresa" };
  const { valid, data } = validateForm(
    document.querySelector(".modal-body"),
    rules,
  );
  if (!valid) return;

  if (!isAdmin) data.companyId = companyId;
  // Para admin: garante companyId consistente com o estabelecimento selecionado
  if (isAdmin && data.establishmentId) {
    const est = _establishments.find((e) => e.id === data.establishmentId);
    if (est) data.companyId = est.companyId;
  }
  data.cpf = maskCPF(data.cpf || "");

  try {
    await saveEmployee(data, id);
    showToast(
      id ? "Trabalhador atualizado!" : "Trabalhador cadastrado!",
      "success",
    );
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

async function confirmDelete(id) {
  const item = _all.find((e) => e.id === id);
  if (
    !(await showConfirm(
      `Excluir trabalhador <strong>${item?.fullName || id}</strong>?`,
      "Excluir Trabalhador",
      "btn-danger",
    ))
  )
    return;
  try {
    await deleteEmployee(id);
    showToast("Excluído.", "success");
    await loadData();
  } catch (err) {
    showToast("Erro: " + err.message, "error");
  }
}

function doExport() {
  const filtered = getFiltered();
  const estMap = Object.fromEntries(_establishments.map((e) => [e.id, e.name]));
  const depMap = Object.fromEntries(_departments.map((d) => [d.id, d.name]));
  const roleMap = Object.fromEntries(_roles.map((r) => [r.id, r.name]));

  const headers = [
    "Nome Completo",
    "CPF",
    "E-mail",
    "Telefone",
    "Estabelecimento",
    "Setor",
    "Cargo",
    "Contrato",
    "Admissão",
    "Status",
  ];
  const rows = filtered.map((e) => [
    e.fullName,
    e.cpf,
    e.email,
    e.phone,
    estMap[e.establishmentId] || "",
    depMap[e.departmentId] || "",
    roleMap[e.roleId] || "",
    EMPLOYMENT_TYPE_LABELS[e.contractType] || e.contractType || "",
    e.admissionDate || "",
    e.status || "",
  ]);
  exportCSV(headers, rows, "trabalhadores.csv");
}
