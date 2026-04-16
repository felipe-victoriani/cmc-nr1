/**
 * perfil.js — Página de Perfil do Usuário Logado
 * Auto-serviço: editar nome/telefone, alterar senha.
 */

import { requireAuth } from "./guards.js";
import { initAppUI, setBreadcrumb, showToast } from "./ui.js";
import { getCurrentUser } from "./auth.js";
import { getUserData, saveUser } from "./services.database.js";
import { changePassword } from "./services.auth.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  admin_master: "Admin Master",
  gestor_rh: "Gestor RH",
  gestor_unidade: "Gestor de Unidade",
  tecnico_sst: "Técnico SST",
  colaborador: "Colaborador",
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

await requireAuth();
initAppUI();
setBreadcrumb([
  { label: "Início", href: "index.html" },
  { label: "Meu Perfil" },
]);

await loadProfile();
bindListeners();

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadProfile() {
  showLoader(true);
  try {
    const authUser = getCurrentUser();
    if (!authUser) return;

    const userData = await getUserData(authUser.uid);

    // Avatar + header
    const nome = userData?.nome || authUser.displayName || "";
    const email = authUser.email || "";
    const tipo = userData?.tipo || "";

    setText("profileNameDisplay", nome || "—");
    setText("profileRoleDisplay", ROLE_LABELS[tipo] || tipo || "—");
    setAvatar("avatarDisplay", nome);

    // Form fields
    setVal("profileNome", nome);
    setVal("profileEmail", email);
    setVal("profilePhone", userData?.phone || "");

    // Account info
    setText("infoRole", ROLE_LABELS[tipo] || tipo || "—");
    setText("infoUid", authUser.uid || "—");
    setText(
      "infoLastLogin",
      authUser.metadata?.lastSignInTime
        ? new Date(authUser.metadata.lastSignInTime).toLocaleString("pt-BR")
        : "—",
    );
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar perfil.", "error");
  } finally {
    showLoader(false);
  }
}

// ─── Save Profile ─────────────────────────────────────────────────────────────

async function saveProfile() {
  const authUser = getCurrentUser();
  if (!authUser) return;

  const nome = getVal("profileNome").trim();
  const phone = getVal("profilePhone").trim();

  if (!nome) return showToast("Nome é obrigatório.", "warning");

  const btn = document.getElementById("btnSaveProfile");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Salvando...";
  }

  try {
    await saveUser(authUser.uid, {
      nome,
      phone,
      updatedAt: new Date().toISOString(),
    });

    // Update avatar display
    setAvatar("avatarDisplay", nome);
    setText("profileNameDisplay", nome);

    showToast("Perfil atualizado com sucesso.", "success");
  } catch (err) {
    console.error(err);
    showToast("Erro ao atualizar perfil.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Salvar Informações";
    }
  }
}

// ─── Change Password ──────────────────────────────────────────────────────────

async function handleChangePassword() {
  const current = getVal("currentPassword");
  const next = getVal("newPassword");
  const confirm = getVal("confirmPassword");

  if (!current) return showToast("Informe a senha atual.", "warning");
  if (!next) return showToast("Informe a nova senha.", "warning");
  if (next.length < 8)
    return showToast("Nova senha deve ter no mínimo 8 caracteres.", "warning");
  if (next !== confirm) return showToast("As senhas não coincidem.", "warning");

  const btn = document.getElementById("btnChangePassword");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Alterando...";
  }

  try {
    await changePassword(current, next);
    showToast("Senha alterada com sucesso.", "success");

    // Clear fields
    setVal("currentPassword", "");
    setVal("newPassword", "");
    setVal("confirmPassword", "");
  } catch (err) {
    console.error(err);
    const msg =
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-credential"
        ? "Senha atual incorreta."
        : err.message || "Erro ao alterar senha.";
    showToast(msg, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Alterar Senha";
    }
  }
}

// ─── Listeners ───────────────────────────────────────────────────────────────

function bindListeners() {
  document
    .getElementById("btnSaveProfile")
    ?.addEventListener("click", saveProfile);
  document
    .getElementById("btnChangePassword")
    ?.addEventListener("click", handleChangePassword);
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function showLoader(visible) {
  const el = document.getElementById("globalLoader");
  if (el) el.classList.toggle("hidden", !visible);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? "";
}

function getVal(id) {
  return document.getElementById(id)?.value ?? "";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAvatar(id, nome) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!nome) {
    el.textContent = "?";
    return;
  }
  const parts = nome.trim().split(/\s+/);
  el.textContent =
    parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
