// ============================================================
// guards.js — Proteção de rotas
// Importado em todas as páginas protegidas.
// Redireciona para login se não autenticado.
// Expõe requireProfile() para restrição por perfil.
// ============================================================

import { waitForAuthReady, getCurrentUser, hasProfile } from "./auth.js";
import { showToast } from "./ui.js";

const LOGIN_PAGE = "login.html";

/**
 * Garante que o usuário está autenticado.
 * Deve ser chamado no topo de todos os módulos de página protegida.
 * Retorna o usuário atual ou redireciona para login.
 */
export async function requireAuth() {
  await waitForAuthReady();
  const user = getCurrentUser();
  if (!user) {
    window.location.href = LOGIN_PAGE;
    return null;
  }
  return user;
}

/**
 * Garante autenticação E perfil(s) permitido(s).
 * @param {string|string[]} profiles - ex: 'admin_master' ou ['admin_master','gestor_rh']
 * @param {string} [redirectTo] - URL de redirecionamento alternativa (padrão: index.html)
 */
export async function requireProfile(profiles, redirectTo = "index.html") {
  const user = await requireAuth();
  if (!user) return null;

  if (!hasProfile(Array.isArray(profiles) ? profiles : [profiles])) {
    showToast("Sem permissão para acessar esta área.", "error");
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 1500);
    return null;
  }
  return user;
}

/**
 * Em páginas de login/registro: redireciona para o dashboard
 * se o usuário já estiver autenticado.
 */
export async function redirectIfAuthenticated() {
  await waitForAuthReady();
  if (getCurrentUser()) {
    window.location.href = "index.html";
  }
}
