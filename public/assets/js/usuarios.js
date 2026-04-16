/**
 * usuarios.js — Gestão de Usuários do Sistema
 * Apenas admin_master pode acessar.
 */

import { requireProfile } from "./guards.js";
import { initAppUI, setBreadcrumb, openModal, showToast } from "./ui.js";
import { getCurrentProfile, getCurrentUser } from "./auth.js";
import { formatDate, exportCSV } from "./utils.js";
import {
  getUsers,
  saveUser,
  getEstablishments,
  getCompanies,
} from "./services.database.js";
import { createUserWithProfile } from "./services.auth.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  admin_master: "Admin Master",
  gestor_rh: "Gestor RH",
  gestor_unidade: "Gestor de Unidade",
  tecnico_sst: "Técnico SST",
  colaborador: "Colaborador",
};

const ROLE_BADGE = {
  admin_master: '<span class="badge badge-danger">Admin Master</span>',
  gestor_rh: '<span class="badge badge-info">Gestor RH</span>',
  gestor_unidade: '<span class="badge badge-warning">Gestor Unidade</span>',
  tecnico_sst: '<span class="badge badge-success">Técnico SST</span>',
  colaborador: '<span class="badge badge-outline">Colaborador</span>',
};

const STATUS_BADGE = {
  active: '<span class="badge badge-success">Ativo</span>',
  inactive: '<span class="badge badge-outline">Inativo</span>',
};

// ─── State ────────────────────────────────────────────────────────────────────

let _all = [];
let _filtered = [];
let _establishments = {};
let _establishmentsList = [];
let _companies = [];
let _companyId = null;
let _editId = null;
let _currentUid = null;

// ─── Boot ─────────────────────────────────────────────────────────────────────

await requireProfile(["admin_master"]);
initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Configurações" },
  { label: "Usuários" },
]);
// admin_master vê todos os usuários, independente de ter companyId no perfil
_companyId =
  getCurrentProfile()?.tipo === "admin_master"
    ? null
    : getCurrentProfile()?.companyId || null;
_currentUid = getCurrentUser()?.uid || null;
loadData();
bindGlobalListeners();

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadData() {
  showLoader(true);
  try {
    const [users, ests, companies] = await Promise.all([
      getUsers(_companyId),
      getEstablishments(_companyId),
      getCompanies(),
    ]);

    _companies = (companies || []).filter((c) => !c.deleted);

    _establishments = {};
    _establishmentsList = ests || [];
    _establishmentsList.forEach((e) => (_establishments[e.id] = e.name));
    populateEstFilter();

    _all = (users || []).filter((u) => !u.deleted);
    applyFilters();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar usuários.", "error");
  } finally {
    showLoader(false);
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function applyFilters() {
  const search =
    document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
  const role = document.getElementById("filterRole")?.value || "";
  const status = document.getElementById("filterStatus")?.value || "";

  _filtered = _all.filter((u) => {
    const matchSearch =
      !search ||
      u.nome?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search);
    const matchRole = !role || u.tipo === role;
    const matchStatus = !status || (u.status ?? "active") === status;
    return matchSearch && matchRole && matchStatus;
  });

  renderTable();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function populateEstFilter() {
  // No establishment filter in users page (filter by role/status only)
}

function populateModalCompany(currentVal) {
  const sel = document.getElementById("userModalCompany");
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione a empresa...</option>';
  _companies.forEach((c) => {
    sel.insertAdjacentHTML(
      "beforeend",
      `<option value="${c.id}">${escapeHtml(c.name || c.razaoSocial || c.id)}</option>`,
    );
  });
  if (currentVal) sel.value = currentVal;
}

function populateModalEst(currentVal, companyIdFilter) {
  const sel = document.getElementById("userModalEst");
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos os estabelecimentos</option>';
  const list = companyIdFilter
    ? _establishmentsList.filter((e) => e.companyId === companyIdFilter)
    : _establishmentsList;
  list.forEach((e) => {
    sel.insertAdjacentHTML(
      "beforeend",
      `<option value="${e.id}">${escapeHtml(e.name)}</option>`,
    );
  });
  if (currentVal) sel.value = currentVal;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTable() {
  const wrapper = document.getElementById("tableWrapper");
  if (!wrapper) return;

  if (!_filtered.length) {
    wrapper.innerHTML = `<div class="empty-state"><p>Nenhum usuário encontrado.</p></div>`;
    return;
  }

  const rows = _filtered
    .map((u) => {
      const roleBadge =
        ROLE_BADGE[u.tipo] ||
        `<span class="badge badge-outline">${u.tipo || "—"}</span>`;
      const statusBadge = STATUS_BADGE[u.status ?? "active"] || "";
      const estName = _establishments[u.establishmentId] || "—";
      const compName =
        _companies.find((c) => c.id === u.companyId)?.name ||
        (u.tipo === "admin_master" ? "— (global)" : "—");
      const isSelf = u.id === _currentUid;

      return `<tr${isSelf ? ' style="background:var(--clr-primary-50)"' : ""}>
      <td>
        <div style="display:flex;align-items:center;gap:var(--sp-2)">
          <div class="avatar-sm">${avatarInitials(u.nome)}</div>
          <div>
            <div style="font-weight:500">${escapeHtml(u.nome || "")}${isSelf ? ' <span style="color:var(--clr-text-muted);font-size:var(--text-xs)">(você)</span>' : ""}</div>
            <div style="font-size:var(--text-xs);color:var(--clr-text-muted)">${escapeHtml(u.email || "")}</div>
          </div>
        </div>
      </td>
      <td>${roleBadge}</td>
      <td style="font-size:var(--text-xs)">${escapeHtml(compName)}</td>
      <td>${escapeHtml(estName)}</td>
      <td>${statusBadge}</td>
      <td>${u.createdAt ? formatDate(u.createdAt) : "—"}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${u.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${
            !isSelf
              ? `<button class="btn btn-sm btn-ghost btn-danger-ghost" data-action="delete" data-id="${u.id}" title="Desativar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </button>`
              : ""
          }
        </div>
      </td>
    </tr>`;
    })
    .join("");

  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Perfil</th>
          <th>Empresa</th>
          <th>Estabelecimento</th>
          <th>Status</th>
          <th>Criado em</th>
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
      if (btn.dataset.action === "delete") confirmDeactivate(id);
    });
  });
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function openForm(id) {
  _editId = id || null;
  const user = id ? _all.find((u) => u.id === id) : null;

  const tpl = document.getElementById("tplModal");
  if (!tpl) return;
  const div = document.createElement("div");
  div.appendChild(tpl.content.cloneNode(true));

  openModal({
    title: id ? "Editar Usuário" : "Novo Usuário",
    body: div.innerHTML,
    size: "modal-md",
    footer: [
      { label: "Cancelar", type: "secondary", action: "close" },
      {
        label: id ? "Salvar" : "Criar Usuário",
        type: "primary",
        id: "btnSaveUser",
      },
    ],
  });

  populateModalCompany(user?.companyId || "");
  populateModalEst(user?.establishmentId || "", user?.companyId || "");

  // When company changes → reload establishments filtered by that company
  setTimeout(() => {
    const companySel = document.getElementById("userModalCompany");
    if (companySel) {
      companySel.addEventListener("change", () => {
        populateModalEst("", companySel.value);
      });
    }
  }, 50);

  // show/hide fields depending on create vs edit
  const pwdGroup = document.getElementById("passwordGroup");
  const statusGrp = document.getElementById("statusGroup");
  const warnGroup = document.getElementById("warningGroup");
  if (id) {
    if (pwdGroup) pwdGroup.style.display = "none";
    if (statusGrp) statusGrp.style.display = "block";
    if (warnGroup) warnGroup.style.display = "block";
  }

  if (user) {
    const set = (name, val) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (el) el.value = val ?? "";
    };
    set("nome", user.nome);
    set("email", user.email);
    set("tipo", user.tipo);
    set("status", user.status ?? "active");
    set("notes", user.notes);
  }

  setTimeout(() => {
    document
      .getElementById("btnSaveUser")
      ?.addEventListener("click", () => saveForm());
  }, 50);
}

async function saveForm() {
  const get = (name) =>
    document.querySelector(`[name="${name}"]`)?.value.trim() || "";

  const nome = get("nome");
  const email = get("email");
  const password = get("password");
  const tipo = get("tipo");
  const companyId = document.getElementById("userModalCompany")?.value || "";
  const establishmentId = document.getElementById("userModalEst")?.value || "";
  const status = get("status") || "active";
  const notes = get("notes");

  if (!nome) return showToast("Nome é obrigatório.", "warning");
  if (!email) return showToast("E-mail é obrigatório.", "warning");
  if (!tipo) return showToast("Perfil é obrigatório.", "warning");
  if (!companyId && tipo !== "admin_master")
    return showToast("Selecione a empresa para este usuário.", "warning");
  if (!_editId && !password)
    return showToast("Senha é obrigatória para novo usuário.", "warning");
  if (!_editId && password.length < 8)
    return showToast("Senha deve ter no mínimo 8 caracteres.", "warning");

  const saveBtn = document.getElementById("btnSaveUser");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
  }

  try {
    if (_editId) {
      // Edit existing — update RTDB only
      const payload = {
        nome,
        email,
        tipo,
        companyId: companyId || null,
        establishmentId: establishmentId || null,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };
      await saveUser(_editId, payload);
      showToast("Usuário atualizado.", "success");
    } else {
      // New user — create Auth account + RTDB record
      await createUserWithProfile(email, password, {
        nome,
        tipo,
        companyId: companyId || null,
        establishmentId: establishmentId || null,
        notes,
        status: "active",
      });
      showToast("Usuário criado com sucesso.", "success");
    }

    document.getElementById("modalBackdrop")?.dispatchEvent(new Event("click"));
    await loadData();
  } catch (err) {
    console.error(err);
    const msg =
      err.code === "auth/email-already-in-use"
        ? "E-mail já está em uso."
        : err.message || "Erro ao salvar.";
    showToast(msg, "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = _editId ? "Salvar" : "Criar Usuário";
    }
  }
}

// ─── Deactivate ───────────────────────────────────────────────────────────────

function confirmDeactivate(id) {
  const user = _all.find((u) => u.id === id);
  if (!user) return;

  const isActive = (user.status ?? "active") === "active";
  const action = isActive ? "desativar" : "reativar";

  openModal({
    title: isActive ? "Desativar Usuário" : "Reativar Usuário",
    body: `<p>Deseja ${action} o usuário <strong>${escapeHtml(user.nome || "")}</strong>?</p>`,
    size: "sm",
    footer: [
      { label: "Cancelar", type: "secondary", action: "close" },
      {
        label: isActive ? "Desativar" : "Reativar",
        type: isActive ? "danger" : "primary",
        id: "btnConfirmDeact",
      },
    ],
  });

  setTimeout(() => {
    document
      .getElementById("btnConfirmDeact")
      ?.addEventListener("click", async () => {
        try {
          await saveUser(id, {
            status: isActive ? "inactive" : "active",
            updatedAt: new Date().toISOString(),
          });
          showToast(
            `Usuário ${isActive ? "desativado" : "reativado"}.`,
            "success",
          );
          document
            .getElementById("modalBackdrop")
            ?.dispatchEvent(new Event("click"));
          await loadData();
        } catch (err) {
          showToast("Erro ao alterar status.", "error");
        }
      });
  }, 50);
}

// ─── Global Listeners ────────────────────────────────────────────────────────

function bindGlobalListeners() {
  document
    .getElementById("btnNew")
    ?.addEventListener("click", () => openForm(null));

  ["searchInput", "filterRole", "filterStatus"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", applyFilters);
    document.getElementById(id)?.addEventListener("change", applyFilters);
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function avatarInitials(nome) {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
