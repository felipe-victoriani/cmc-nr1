// ============================================================
// ui.js — Componentes de UI reutilizáveis
// Funções para renderizar sidebar, topbar, toasts, modais,
// loaders, paginação, empty states e inicialização do layout.
// ============================================================

import { getCurrentProfile, getCurrentUser, hasProfile } from "./auth.js";
import { signOutUser } from "./services.auth.js";
import { writeAuditLog } from "./services.database.js";

/* ─────────────────────────────────────────────────────────
   DEFINIÇÃO DA NAVEGAÇÃO
   ─────────────────────────────────────────────────────── */
const NAV_CONFIG = [
  {
    group: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "index.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        profiles: [
          "admin_master",
          "gestor_rh",
          "tecnico_sst",
          "gestor_unidade",
          "colaborador",
        ],
      },
    ],
  },
  {
    group: "Empresas",
    profiles: ["admin_master"],
    items: [
      {
        label: "Empresas",
        href: "empresas.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M9 21V7l7-4v18M9 10.5H3v10.5"/></svg>`,
        profiles: ["admin_master"],
      },
      {
        label: "Estabelecimentos",
        href: "estabelecimentos.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
        profiles: ["admin_master"],
      },
    ],
  },
  {
    group: "Organização",
    profiles: ["admin_master", "gestor_rh", "gestor_unidade"],
    items: [
      {
        label: "Setores",
        href: "setores.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>`,
        profiles: ["admin_master", "gestor_rh", "gestor_unidade"],
      },
      {
        label: "Cargos e Funções",
        href: "cargos.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/></svg>`,
        profiles: ["admin_master", "gestor_rh", "gestor_unidade"],
      },
      {
        label: "Trabalhadores",
        href: "trabalhadores.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
        profiles: ["admin_master", "gestor_rh", "gestor_unidade"],
      },
    ],
  },
  {
    group: "SST / NR-1",
    profiles: ["admin_master", "tecnico_sst", "gestor_unidade"],
    items: [
      {
        label: "Inventário de Riscos",
        href: "riscos.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        profiles: [
          "admin_master",
          "tecnico_sst",
          "gestor_unidade",
          "gestor_rh",
        ],
      },
      {
        label: "Plano de Ação",
        href: "plano-acao.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
        profiles: [
          "admin_master",
          "tecnico_sst",
          "gestor_rh",
          "gestor_unidade",
        ],
      },
      {
        label: "Ergonomia e Psicossociais",
        href: "ergonomia-psicossociais.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 013 3v6a3 3 0 11-6 0V5a3 3 0 013-3z"/><path d="M19 10a7 7 0 01-14 0"/><line x1="12" y1="19" x2="12" y2="23"/></svg>`,
        profiles: [
          "admin_master",
          "tecnico_sst",
          "gestor_rh",
          "gestor_unidade",
        ],
      },
      {
        label: "Incidentes",
        href: "incidentes.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 4.9A10 10 0 1119.1 19.1 10 10 0 014.9 4.9z"/><line x1="4.9" y1="19.1" x2="19.1" y2="4.9"/></svg>`,
        profiles: [
          "admin_master",
          "tecnico_sst",
          "gestor_rh",
          "gestor_unidade",
        ],
      },
      {
        label: "EPI",
        href: "epi.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        profiles: [
          "admin_master",
          "tecnico_sst",
          "gestor_rh",
          "gestor_unidade",
        ],
      },
      {
        label: "PCMSO / ASO",
        href: "pcmso.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
        profiles: [
          "admin_master",
          "tecnico_sst",
          "gestor_rh",
          "gestor_unidade",
        ],
      },
    ],
  },
  {
    group: "RH",
    profiles: ["admin_master", "gestor_rh", "gestor_unidade", "colaborador"],
    items: [
      {
        label: "Treinamentos",
        href: "treinamentos.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
        profiles: [
          "admin_master",
          "gestor_rh",
          "tecnico_sst",
          "gestor_unidade",
          "colaborador",
        ],
      },
      {
        label: "Comunicados",
        href: "comunicados.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
        profiles: [
          "admin_master",
          "gestor_rh",
          "gestor_unidade",
          "tecnico_sst",
          "colaborador",
        ],
      },
      {
        label: "Terceiros",
        href: "terceiros.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
        profiles: ["admin_master", "gestor_rh", "gestor_unidade"],
      },
    ],
  },
  {
    group: "Gestão",
    items: [
      {
        label: "Documentos",
        href: "documentos.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        profiles: [
          "admin_master",
          "gestor_rh",
          "tecnico_sst",
          "gestor_unidade",
        ],
      },
      {
        label: "Relatórios",
        href: "relatorios.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        profiles: [
          "admin_master",
          "gestor_rh",
          "tecnico_sst",
          "gestor_unidade",
        ],
      },
      {
        label: "Usuários",
        href: "usuarios.html",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
        profiles: ["admin_master"],
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────
   INICIALIZAÇÃO DO LAYOUT PRINCIPAL
   ─────────────────────────────────────────────────────── */
/**
 * Chame initAppUI() em cada página protegida para montar
 * sidebar, topbar e event handlers globais.
 */
export async function initAppUI() {
  const profile = getCurrentProfile();
  const user = getCurrentUser();
  if (!profile || !user) return;

  renderSidebar(profile);
  renderTopbar(profile, user);
  setupSidebarToggle();
  markActiveNavItem();
}

/* ─────────────────────────────────────────────────────────
   SIDEBAR
   ─────────────────────────────────────────────────────── */
function renderSidebar(profile) {
  const nav = document.getElementById("sidebarNav");
  if (!nav) return;

  const userProf = profile.tipo ?? profile.profile;
  let html = "";

  for (const group of NAV_CONFIG) {
    // Filtra itens visíveis para o perfil atual
    const visibleItems = group.items.filter((item) =>
      item.profiles.includes(userProf),
    );
    if (visibleItems.length === 0) continue;

    html += `<div class="nav-group">`;
    html += `<div class="nav-group-label">${group.group}</div>`;
    for (const item of visibleItems) {
      html += `
        <a href="${item.href}" class="nav-item" data-href="${item.href}">
          ${item.icon}
          <span>${item.label}</span>
        </a>`;
    }
    html += `</div>`;
  }

  nav.innerHTML = html;

  // Preenche o usuário no rodapé da sidebar
  renderSidebarUser(profile);
}

function renderSidebarUser(profile) {
  const container = document.getElementById("sidebarUser");
  if (!container) return;

  const initials = (profile.nome || profile.fullName || profile.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const roleLabels = {
    admin_master: "Admin Master",
    gestor_rh: "Gestor RH",
    tecnico_sst: "Técnico SST",
    gestor_unidade: "Gestor de Unidade",
    colaborador: "Colaborador",
  };

  container.innerHTML = `
    <div class="sidebar-user-avatar">${initials}</div>
    <div class="sidebar-user-info">
      <div class="sidebar-user-name truncate">${profile.nome || profile.fullName || profile.email}</div>
      <div class="sidebar-user-role">${roleLabels[profile.tipo ?? profile.profile] || profile.tipo || profile.profile}</div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────
   TOPBAR
   ─────────────────────────────────────────────────────── */
function renderTopbar(profile, user) {
  const container = document.getElementById("topbarUser");
  if (!container) return;

  const initials = (profile.nome || profile.fullName || user.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  container.innerHTML = `
    <span class="topbar-user-name truncate" style="max-width:160px">${profile.nome || profile.fullName || user.email}</span>
    <div class="topbar-avatar" id="topbarAvatarBtn" aria-haspopup="true" title="Menu do usuário">
      ${initials}
      <div class="user-dropdown hidden" id="userDropdown">
        <div class="user-dropdown-header">
          <div class="user-dropdown-name">${profile.nome || profile.fullName || "Usuário"}</div>
          <div class="user-dropdown-email">${user.email}</div>
        </div>
        <a href="perfil.html" class="user-dropdown-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/></svg>
          Meu Perfil
        </a>
        <div class="dropdown-divider"></div>
        <div class="user-dropdown-item danger" id="logoutBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair
        </div>
      </div>
    </div>
  `;

  // Toggle dropdown
  const avatarBtn = document.getElementById("topbarAvatarBtn");
  const dropdown = document.getElementById("userDropdown");
  avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", () => dropdown.classList.add("hidden"));

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    if (await showConfirm("Deseja realmente sair do sistema?")) {
      await writeAuditLog({
        module: "auth",
        action: "logout",
        summary: "Logout realizado",
      });
      await signOutUser();
      window.location.href = "login.html";
    }
  });
}

/* ─────────────────────────────────────────────────────────
   SIDEBAR TOGGLE (mobile + collapse)
   ─────────────────────────────────────────────────────── */
function setupSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("topbarMenuBtn");
  const closeBtn = document.getElementById("sidebarClose");
  const nav = document.getElementById("sidebarNav");

  // Impede que o scroll dentro da sidebar vaze para o main-wrapper
  if (nav) {
    nav.addEventListener(
      "wheel",
      (e) => {
        const atTop = nav.scrollTop === 0 && e.deltaY < 0;
        const atBottom =
          nav.scrollTop + nav.clientHeight >= nav.scrollHeight && e.deltaY > 0;
        if (!atTop && !atBottom) {
          e.stopPropagation();
        }
      },
      { passive: true },
    );
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      // No mobile: abre/fecha sidebar com overlay
      if (window.innerWidth <= 1024) {
        sidebar?.classList.toggle("mobile-open");
        overlay?.classList.toggle("hidden");
      }
      // No desktop: botão ☰ não faz nada (menu sempre visível)
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sidebar?.classList.remove("mobile-open");
      overlay?.classList.add("hidden");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar?.classList.remove("mobile-open");
      overlay.classList.add("hidden");
    });
  }
}

function markActiveNavItem() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item[data-href]").forEach((el) => {
    if (el.dataset.href === currentPage) {
      el.classList.add("active");
    }
  });
}

/* ─────────────────────────────────────────────────────────
   BREADCRUMB
   ─────────────────────────────────────────────────────── */
/**
 * @param {Array<{label: string, href?: string}>} crumbs
 */
export function setBreadcrumb(crumbs) {
  const bc = document.getElementById("breadcrumb");
  if (!bc) return;

  const parts = crumbs.map((c, i) => {
    if (i === crumbs.length - 1) {
      return `<span class="crumb-current">${c.label}</span>`;
    }
    return `<a href="${c.href || "#"}">${c.label}</a><span class="crumb-sep">›</span>`;
  });

  bc.innerHTML = parts.join("");
}

/* ─────────────────────────────────────────────────────────
   TOAST
   ─────────────────────────────────────────────────────── */
const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

const TOAST_TITLES = {
  success: "Sucesso",
  error: "Erro",
  warning: "Atenção",
  info: "Informação",
};

/**
 * Exibe um toast de notificação.
 * @param {string} message - Mensagem principal
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=4000] - ms até fechar automaticamente
 */
export function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) {
    // fallback simples se container não existir
    console.warn("[Toast]", type, message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-indicator"></div>
    <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-content">
      <div class="toast-title">${TOAST_TITLES[type] || "Notificação"}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const removeToast = () => {
    toast.classList.add("removing");
    toast.addEventListener("animationend", () => toast.remove(), {
      once: true,
    });
  };

  toast.querySelector(".toast-close").addEventListener("click", removeToast);
  container.appendChild(toast);

  if (duration > 0) setTimeout(removeToast, duration);
  return toast;
}

/* ─────────────────────────────────────────────────────────
   MODAL
   ─────────────────────────────────────────────────────── */
const _modalStack = [];

/**
 * Abre um modal.
 * @param {Object} config
 * @param {string} config.title
 * @param {string} config.body - HTML do conteúdo
 * @param {string} [config.size='modal-md'] - Classe de tamanho
 * @param {Array<{label,class,handler}>} [config.footer] - Botões do rodapé
 * @param {boolean} [config.closeOnBackdrop=true]
 */
export function openModal({
  title,
  body,
  size = "modal-md",
  footer = [],
  closeOnBackdrop = true,
}) {
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) return null;

  const modal = document.createElement("div");
  modal.className = `modal ${size} animate-fade-in`;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const footerHtml = footer.length
    ? `<div class="modal-footer">${footer
        .map(
          (f) =>
            `<button class="btn ${f.class || (f.type ? `btn-${f.type}` : "btn-secondary")}"${f.id ? ` id="${f.id}"` : ""} data-action="${f.action || ""}">${f.label}</button>`,
        )
        .join("")}</div>`
    : "";

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" aria-label="Fechar modal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-body">${body}</div>
    ${footerHtml}
  `;

  backdrop.classList.remove("hidden");
  backdrop.innerHTML = "";
  backdrop.appendChild(modal);

  // Handlers de fechamento
  const closeModal = () => {
    backdrop.classList.add("hidden");
    backdrop.innerHTML = "";
    _modalStack.pop();
  };

  modal.querySelector(".modal-close").addEventListener("click", closeModal);
  if (closeOnBackdrop) {
    backdrop.addEventListener(
      "click",
      (e) => {
        if (e.target === backdrop) closeModal();
      },
      { once: true },
    );
  }

  // Botões do rodapé
  const footerBtns = modal.querySelectorAll(".modal-footer .btn");
  footer.forEach((f, i) => {
    const btn = f.id
      ? modal.querySelector(`#${f.id}`)
      : f.action
        ? modal.querySelector(`[data-action="${f.action}"]`)
        : footerBtns[i] || null;
    if (!btn) return;
    if (f.action === "close" || f.close) {
      btn.addEventListener("click", closeModal);
    }
    if (f.handler) {
      btn.addEventListener("click", f.handler);
    }
  });

  _modalStack.push({ modal, close: closeModal });
  return { modal, close: closeModal };
}

/** Fecha o modal mais recente */
export function closeModal() {
  const top = _modalStack[_modalStack.length - 1];
  if (top) top.close();
}

/* ─────────────────────────────────────────────────────────
   CONFIRM DIALOG
   ─────────────────────────────────────────────────────── */
/**
 * Exibe diálogo de confirmação.
 * @param {string} message
 * @param {string} [title='Confirmar ação']
 * @param {string} [confirmClass='btn-danger']
 * @returns {Promise<boolean>}
 */
export function showConfirm(
  message,
  title = "Confirmar ação",
  confirmClass = "btn-danger",
) {
  return new Promise((resolve) => {
    const body = `
      <div class="confirm-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div class="confirm-title">${title}</div>
      <p class="confirm-text">${message}</p>
    `;

    const { close } = openModal({
      title: "",
      body,
      size: "modal-sm confirm-dialog",
      closeOnBackdrop: false,
      footer: [
        {
          label: "Cancelar",
          class: "btn-secondary",
          action: "cancel",
          close: true,
          handler: () => resolve(false),
        },
        {
          label: "Confirmar",
          class: confirmClass,
          action: "confirm",
          handler: () => {
            resolve(true);
            close();
          },
        },
      ],
    });
  });
}

/* ─────────────────────────────────────────────────────────
   LOADER GLOBAL
   ─────────────────────────────────────────────────────── */
export function showLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.remove("hidden");
}

export function hideLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.add("hidden");
}

/* ─────────────────────────────────────────────────────────
   PAGINAÇÃO
   ─────────────────────────────────────────────────────── */
/**
 * Renderiza controles de paginação.
 * @param {HTMLElement} container  - Elemento pai
 * @param {number}      total       - Total de registros
 * @param {number}      currentPage - Página atual (1-indexed)
 * @param {number}      perPage     - Registros por página
 * @param {Function}    onPage      - Callback(página)
 */
export function renderPagination(
  container,
  total,
  currentPage,
  perPage,
  onPage,
) {
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  let pagesHtml = "";

  // Prev
  pagesHtml += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""} aria-label="Anterior">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  // Pages
  const pages = buildPageRange(currentPage, totalPages);
  for (const p of pages) {
    if (p === "...") {
      pagesHtml += `<span class="page-btn" style="pointer-events:none">…</span>`;
    } else {
      pagesHtml += `<button class="page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
  }

  // Next
  pagesHtml += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""} aria-label="Próxima">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  container.innerHTML = `
    <div class="pagination">
      <span class="pagination-info">${total === 0 ? "Nenhum registro" : `Exibindo ${start}–${end} de ${total}`}</span>
      <div class="pagination-controls">${pagesHtml}</div>
    </div>
  `;

  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p >= 1 && p <= totalPages) onPage(p);
    });
  });
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set(
    [1, total, current, current - 1, current + 1].filter(
      (p) => p >= 1 && p <= total,
    ),
  );
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("...");
    result.push(p);
    prev = p;
  }
  return result;
}

/* ─────────────────────────────────────────────────────────
   EMPTY STATE
   ─────────────────────────────────────────────────────── */
export function renderEmptyState(
  container,
  {
    message = "Nenhum registro encontrado",
    sub = "",
    btnLabel = "",
    btnHandler,
  } = {},
) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
      </div>
      <div class="empty-state-title">${message}</div>
      ${sub ? `<p class="empty-state-message">${sub}</p>` : ""}
      ${btnLabel ? `<button class="btn btn-primary" id="emptyStateBtn">${btnLabel}</button>` : ""}
    </div>
  `;
  if (btnLabel && btnHandler) {
    container
      .querySelector("#emptyStateBtn")
      ?.addEventListener("click", btnHandler);
  }
}

/* ─────────────────────────────────────────────────────────
   SKELETON LOADER
   ─────────────────────────────────────────────────────── */
export function renderSkeletonTable(container, rows = 5, cols = 5) {
  if (!container) return;
  const headerCells = Array.from({ length: cols })
    .map(
      () =>
        `<th><div class="skeleton skeleton-text" style="width:${60 + Math.random() * 40}%"></div></th>`,
    )
    .join("");
  const bodyCells = Array.from({ length: rows })
    .map(
      () =>
        `<tr>${Array.from({ length: cols })
          .map(
            (_, i) =>
              `<td><div class="skeleton skeleton-text" style="width:${i === 0 ? 80 : 50 + Math.random() * 40}%"></div></td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyCells}</tbody>
      </table>
    </div>
  `;
}
