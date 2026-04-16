// ============================================================
// services.auth.js — Operações de autenticação
// ============================================================

import { auth, db } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/** Faz login com e-mail e senha */
export async function signInUser(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Faz logout */
export async function signOutUser() {
  return signOut(auth);
}

/** Envia e-mail de recuperação de senha */
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Cria usuário no Firebase Auth e salva perfil no RTDB.
 * Uso exclusivo do admin.
 */
export async function createUserWithProfile(email, password, profileData) {
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  const uid = cred.user.uid;
  const ts = new Date().toISOString();

  await set(ref(db, `users/${uid}`), {
    ...profileData,
    email: email.trim(),
    active: true,
    createdAt: ts,
    updatedAt: ts,
  });

  return uid;
}

/** Busca o perfil do usuário no RTDB */
export async function getUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

/** Atualiza campos do perfil no RTDB */
export async function updateUserProfile(uid, data) {
  const ts = new Date().toISOString();
  await update(ref(db, `users/${uid}`), { ...data, updatedAt: ts });
}

/** Troca senha do usuário autenticado (requer re-autenticação) */
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");

  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

/** Troca e-mail do usuário autenticado (requer re-autenticação) */
export async function changeEmail(currentPassword, newEmail) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");

  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updateEmail(user, newEmail.trim());
  await update(ref(db, `users/${user.uid}`), {
    email: newEmail.trim(),
    updatedAt: new Date().toISOString(),
  });
}
