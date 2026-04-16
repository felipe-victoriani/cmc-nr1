// ============================================================
// services.storage.js — Upload e gestão de arquivos
// no Firebase Storage. Salva metadados no RTDB via
// services.database.js.
// ============================================================

import { storage } from "./firebase-init.js";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { saveDocument } from "./services.database.js";
import { getCurrentUser, getCurrentProfile } from "./auth.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Faz upload de um arquivo para o Storage.
 * @param {File} file
 * @param {string} path - Caminho no Storage (ex: companies/{companyId}/docs)
 * @param {Function} [onProgress] - Callback (percentual 0-100)
 * @returns {Promise<{url: string, path: string, name: string}>}
 */
export async function uploadFile(file, path, onProgress = null) {
  if (!file) throw new Error("Arquivo não informado.");
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Arquivo excede o limite de 20 MB.");

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const fullPath = `${path}/${safeName}`;
  const fileRef = storageRef(storage, fullPath);
  const metadata = { contentType: file.type };

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, metadata);

    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        if (onProgress) onProgress(progress);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({
          url,
          path: fullPath,
          name: file.name,
          contentType: file.type,
          size: file.size,
        });
      },
    );
  });
}

/**
 * Faz upload e registra o documento no RTDB.
 * @param {File}   file
 * @param {Object} meta - { companyId, establishmentId?, module, referenceId?, title, category }
 * @param {Function} [onProgress]
 */
export async function uploadAndSaveDocument(file, meta, onProgress = null) {
  const user = getCurrentUser();
  const profile = getCurrentProfile();
  if (!user) throw new Error("Usuário não autenticado.");

  const { url, path, name, contentType } = await uploadFile(
    file,
    `companies/${meta.companyId}/docs/${meta.module}`,
    onProgress,
  );

  const docId = await saveDocument({
    companyId: meta.companyId,
    establishmentId: meta.establishmentId || "",
    module: meta.module,
    referenceId: meta.referenceId || "",
    title: meta.title || name,
    category: meta.category || "outros",
    fileUrl: url,
    storagePath: path,
    fileName: name,
    contentType,
    uploadedBy: user.uid,
    uploaderName: profile?.fullName || user.email,
  });

  return { docId, url, name };
}

/**
 * Remove arquivo do Storage pelo caminho.
 * @param {string} storagePath
 */
export async function deleteFile(storagePath) {
  if (!storagePath) return;
  const fileRef = storageRef(storage, storagePath);
  await deleteObject(fileRef);
}

/**
 * Obtém URL pública de um arquivo.
 * @param {string} storagePath
 */
export async function getFileUrl(storagePath) {
  const fileRef = storageRef(storage, storagePath);
  return getDownloadURL(fileRef);
}
