// ============================================================
// auth.js — Estado global de autenticação e perfil
// Mantém o usuário autenticado e o perfil em memória.
// Outros módulos importam getCurrentUser() / getUserProfile().
// ============================================================

import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUserProfile as fetchProfileFromDB } from "./services.auth.js";

// Estado em memória do módulo
let _currentUser = null;
let _currentProfile = null;

// Resolvida após a primeira verificação de auth
let _readyResolve;
const _authReady = new Promise((resolve) => {
  _readyResolve = resolve;
});

// Escuta mudanças de estado de autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    _currentUser = user;
    try {
      _currentProfile = await fetchProfileFromDB(user.uid);
    } catch {
      _currentProfile = null;
    }
  } else {
    _currentUser = null;
    _currentProfile = null;
  }
  _readyResolve(); // sinaliza que o estado inicial foi resolvido
});

/** Aguarda a resolução do estado de auth (uso em guards) */
export function waitForAuthReady() {
  return _authReady;
}

/** Retorna o usuário Firebase atual ou null */
export function getCurrentUser() {
  return _currentUser;
}

/** Retorna o objeto de perfil do banco ou null */
export function getCurrentProfile() {
  return _currentProfile;
}

/**
 * Verifica se o usuário tem pelo menos um dos perfis permitidos.
 * @param {string[]} allowed - ex: ['admin_master', 'gestor_rh']
 */
export function hasProfile(allowed) {
  const profile = _currentProfile?.tipo ?? _currentProfile?.profile;
  return Array.isArray(allowed)
    ? allowed.includes(profile)
    : profile === allowed;
}

/** Atualiza o perfil em memória (após edição) */
export function refreshProfile(profileData) {
  _currentProfile = profileData;
}
