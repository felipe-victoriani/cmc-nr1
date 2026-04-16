// ============================================================
// services.database.js — Operações genéricas e específicas
// com o Firebase Realtime Database.
// ============================================================

import { db } from "./firebase-init.js";
import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  onValue,
  off,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getCurrentUser, getCurrentProfile } from "./auth.js";

// ──────────────────────────────────────────────────────────
// CRUD GENÉRICO
// ──────────────────────────────────────────────────────────

/** Lê um nó por caminho. Retorna o valor ou null. */
export async function dbGet(path) {
  const snap = await get(ref(db, path));
  return snap.exists() ? snap.val() : null;
}

/** Define valor em um caminho (sobrescreve). */
export async function dbSet(path, data) {
  await set(ref(db, path), data);
}

/** Atualiza campos parcial em um caminho. */
export async function dbUpdate(path, data) {
  await update(ref(db, path), data);
}

/** Remove um nó. */
export async function dbRemove(path) {
  await remove(ref(db, path));
}

/** Insere novo nó com ID automático (push). Retorna o novo ID. */
export async function dbPush(path, data) {
  const r = await push(ref(db, path), data);
  return r.key;
}

/** Lista todos os filhos de um nó como array com {id, ...dados}. */
export async function dbList(path) {
  const snap = await get(ref(db, path));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
}

/** Lista filhos filtrando por campo = valor usando orderByChild. */
export async function dbListByField(path, field, value) {
  const q = query(ref(db, path), orderByChild(field), equalTo(value));
  const snap = await get(q);
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
}

// ──────────────────────────────────────────────────────────
// AUDIT LOG
// ──────────────────────────────────────────────────────────
export async function writeAuditLog({
  module,
  action,
  recordId = "",
  summary = "",
}) {
  try {
    const user = getCurrentUser();
    const profile = getCurrentProfile();
    if (!user) return;

    await push(ref(db, "auditLogs"), {
      userId: user.uid,
      userName: profile?.fullName || user.email,
      profile: profile?.profile || "desconhecido",
      module,
      action,
      recordId,
      summary,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // Audit log nunca deve quebrar a operação principal
    console.warn("Falha ao registrar audit log:", e.message);
  }
}

// ──────────────────────────────────────────────────────────
// HELPERS POR ENTIDADE — cada função encapsula
// path + audit log para consistência
// ──────────────────────────────────────────────────────────

// ── Empresas ─────────────────────────────────────────────
export async function getCompanies() {
  return dbList("companies");
}
export async function getCompany(id) {
  return dbGet(`companies/${id}`);
}
export async function saveCompany(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`companies/${id}`, { ...data, updatedAt: ts });
    await writeAuditLog({
      module: "companies",
      action: "update",
      recordId: id,
      summary: `Empresa atualizada: ${data.name}`,
    });
    return id;
  }
  const newId = await dbPush("companies", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "companies",
    action: "create",
    recordId: newId,
    summary: `Empresa criada: ${data.name}`,
  });
  return newId;
}
export async function deleteCompany(id) {
  await dbRemove(`companies/${id}`);
  await writeAuditLog({
    module: "companies",
    action: "delete",
    recordId: id,
    summary: `Empresa removida`,
  });
}

// ── Estabelecimentos ─────────────────────────────────────
export async function getEstablishments(companyId = null) {
  if (companyId) return dbListByField("establishments", "companyId", companyId);
  return dbList("establishments");
}
export async function getEstablishment(id) {
  return dbGet(`establishments/${id}`);
}
export async function saveEstablishment(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`establishments/${id}`, { ...data, updatedAt: ts });
    await writeAuditLog({
      module: "establishments",
      action: "update",
      recordId: id,
      summary: `Estabelecimento atualizado: ${data.name}`,
    });
    return id;
  }
  const newId = await dbPush("establishments", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "establishments",
    action: "create",
    recordId: newId,
    summary: `Estabelecimento criado: ${data.name}`,
  });
  return newId;
}
export async function deleteEstablishment(id) {
  await dbRemove(`establishments/${id}`);
  await writeAuditLog({
    module: "establishments",
    action: "delete",
    recordId: id,
    summary: `Estabelecimento removido`,
  });
}

// ── Setores ───────────────────────────────────────────────
export async function getDepartments(companyId = null) {
  if (companyId) return dbListByField("departments", "companyId", companyId);
  return dbList("departments");
}
export async function saveDepartment(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`departments/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  const newId = await dbPush("departments", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "departments",
    action: "create",
    recordId: newId,
    summary: `Setor criado: ${data.name}`,
  });
  return newId;
}
export async function deleteDepartment(id) {
  await dbRemove(`departments/${id}`);
  await writeAuditLog({
    module: "departments",
    action: "delete",
    recordId: id,
    summary: "Setor removido",
  });
}

// ── Cargos ────────────────────────────────────────────────
export async function getRoles(companyId = null) {
  if (companyId) return dbListByField("roles", "companyId", companyId);
  return dbList("roles");
}
export async function saveRole(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`roles/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  const newId = await dbPush("roles", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "roles",
    action: "create",
    recordId: newId,
    summary: `Cargo criado: ${data.name}`,
  });
  return newId;
}
export async function deleteRole(id) {
  await dbRemove(`roles/${id}`);
  await writeAuditLog({
    module: "roles",
    action: "delete",
    recordId: id,
    summary: "Cargo removido",
  });
}

// ── Trabalhadores ─────────────────────────────────────────
export async function getEmployees(companyId = null) {
  if (companyId) return dbListByField("employees", "companyId", companyId);
  return dbList("employees");
}
export async function getEmployee(id) {
  return dbGet(`employees/${id}`);
}
export async function saveEmployee(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`employees/${id}`, { ...data, updatedAt: ts });
    await writeAuditLog({
      module: "employees",
      action: "update",
      recordId: id,
      summary: `Trabalhador atualizado: ${data.fullName}`,
    });
    return id;
  }
  const newId = await dbPush("employees", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "employees",
    action: "create",
    recordId: newId,
    summary: `Trabalhador cadastrado: ${data.fullName}`,
  });
  return newId;
}
export async function deleteEmployee(id) {
  await dbRemove(`employees/${id}`);
  await writeAuditLog({
    module: "employees",
    action: "delete",
    recordId: id,
    summary: "Trabalhador removido",
  });
}

// ── Inventário de Riscos ──────────────────────────────────
export async function getRisks(companyId = null) {
  if (companyId)
    return dbListByField("riskInventories", "companyId", companyId);
  return dbList("riskInventories");
}
export async function getRisk(id) {
  return dbGet(`riskInventories/${id}`);
}
export async function saveRisk(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    const current = await getRisk(id);
    const rev = (current?.revisionNumber || 0) + 1;
    await dbUpdate(`riskInventories/${id}`, {
      ...data,
      updatedAt: ts,
      revisionNumber: rev,
    });
    await writeAuditLog({
      module: "riskInventories",
      action: "update",
      recordId: id,
      summary: `Risco atualizado: ${data.description}`,
    });
    return id;
  }
  const newId = await dbPush("riskInventories", {
    ...data,
    revisionNumber: 0,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "riskInventories",
    action: "create",
    recordId: newId,
    summary: `Risco cadastrado: ${data.description}`,
  });
  return newId;
}
export async function deleteRisk(id) {
  await dbRemove(`riskInventories/${id}`);
  await writeAuditLog({
    module: "riskInventories",
    action: "delete",
    recordId: id,
    summary: "Risco removido",
  });
}

// ── Plano de Ação ─────────────────────────────────────────
export async function getActionPlans(companyId = null) {
  if (companyId) return dbListByField("actionPlans", "companyId", companyId);
  return dbList("actionPlans");
}
export async function getActionPlan(id) {
  return dbGet(`actionPlans/${id}`);
}
export async function saveActionPlan(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`actionPlans/${id}`, { ...data, updatedAt: ts });
    await writeAuditLog({
      module: "actionPlans",
      action: "update",
      recordId: id,
      summary: `Ação atualizada: ${data.actionTitle}`,
    });
    return id;
  }
  const newId = await dbPush("actionPlans", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "actionPlans",
    action: "create",
    recordId: newId,
    summary: `Ação criada: ${data.actionTitle}`,
  });
  return newId;
}
export async function deleteActionPlan(id) {
  await dbRemove(`actionPlans/${id}`);
  await writeAuditLog({
    module: "actionPlans",
    action: "delete",
    recordId: id,
    summary: "Ação removida",
  });
}

// ── Ergonomia/Psicossociais ───────────────────────────────
export async function getErgonomicAssessments(companyId = null) {
  if (companyId)
    return dbListByField("ergonomicsPsychosocial", "companyId", companyId);
  return dbList("ergonomicsPsychosocial");
}
export async function saveErgonomicAssessment(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`ergonomicsPsychosocial/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  return dbPush("ergonomicsPsychosocial", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
}

// ── Treinamentos ──────────────────────────────────────────
export async function getTrainings(companyId = null) {
  if (companyId) return dbListByField("trainings", "companyId", companyId);
  return dbList("trainings");
}
export async function saveTraining(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`trainings/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  const newId = await dbPush("trainings", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "trainings",
    action: "create",
    recordId: newId,
    summary: `Treinamento: ${data.title}`,
  });
  return newId;
}
export async function deleteTraining(id) {
  await dbRemove(`trainings/${id}`);
}

export async function getTrainingSessions(trainingId = null) {
  if (trainingId)
    return dbListByField("trainingSessions", "trainingId", trainingId);
  return dbList("trainingSessions");
}
export async function saveTrainingSession(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`trainingSessions/${id}`, data);
    return id;
  }
  return dbPush("trainingSessions", { ...data, createdAt: ts });
}

export async function getTrainingAttendance(employeeId = null) {
  if (employeeId)
    return dbListByField("trainingAttendance", "employeeId", employeeId);
  return dbList("trainingAttendance");
}
export async function saveTrainingAttendance(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`trainingAttendance/${id}`, data);
    return id;
  }
  return dbPush("trainingAttendance", { ...data, createdAt: ts });
}

// ── EPIs ──────────────────────────────────────────────────
export async function getEPIs(companyId = null) {
  if (companyId) return dbListByField("epis", "companyId", companyId);
  return dbList("epis");
}
export async function saveEPI(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`epis/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  const newId = await dbPush("epis", { ...data, createdAt: ts, updatedAt: ts });
  await writeAuditLog({
    module: "epis",
    action: "create",
    recordId: newId,
    summary: `EPI cadastrado: ${data.epiName}`,
  });
  return newId;
}
export async function deleteEPI(id) {
  await dbRemove(`epis/${id}`);
}

// ── Exames Médicos (PCMSO/ASO) ────────────────────────────
export async function getExams(companyId = null) {
  if (companyId) return dbListByField("exams", "companyId", companyId);
  return dbList("exams");
}
export async function saveExam(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`exams/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  const newId = await dbPush("exams", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "exams",
    action: "create",
    recordId: newId,
    summary: `ASO cadastrado: ${data.workerName} (${data.examType})`,
  });
  return newId;
}
export async function deleteExam(id) {
  await dbRemove(`exams/${id}`);
}

// ── Comunicados ────────────────────────────────────────────
export async function getCommunications(companyId = null) {
  if (companyId) return dbListByField("communications", "companyId", companyId);
  return dbList("communications");
}
export async function saveCommunication(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`communications/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  return dbPush("communications", { ...data, createdAt: ts, updatedAt: ts });
}
export async function deleteCommunication(id) {
  await dbRemove(`communications/${id}`);
}
export async function acknowledgeComm(ackData, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`communicationAcknowledgements/${id}`, {
      ...ackData,
      updatedAt: ts,
    });
    return id;
  }
  return dbPush("communicationAcknowledgements", { ...ackData, createdAt: ts });
}

// ── Incidentes ─────────────────────────────────────────────
export async function getIncidents(companyId = null) {
  if (companyId) return dbListByField("incidents", "companyId", companyId);
  return dbList("incidents");
}
export async function saveIncident(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`incidents/${id}`, { ...data, updatedAt: ts });
    await writeAuditLog({
      module: "incidents",
      action: "update",
      recordId: id,
      summary: `Incidente atualizado: ${data.type}`,
    });
    return id;
  }
  const newId = await dbPush("incidents", {
    ...data,
    createdAt: ts,
    updatedAt: ts,
  });
  await writeAuditLog({
    module: "incidents",
    action: "create",
    recordId: newId,
    summary: `Incidente registrado: ${data.type}`,
  });
  return newId;
}
export async function deleteIncident(id) {
  await dbRemove(`incidents/${id}`);
  await writeAuditLog({
    module: "incidents",
    action: "delete",
    recordId: id,
    summary: "Incidente removido",
  });
}

// ── Terceiros ──────────────────────────────────────────────
export async function getThirdParties(companyId = null) {
  if (companyId) return dbListByField("thirdParties", "companyId", companyId);
  return dbList("thirdParties");
}
export async function saveThirdParty(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`thirdParties/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  return dbPush("thirdParties", { ...data, createdAt: ts });
}
export async function deleteThirdParty(id) {
  await dbRemove(`thirdParties/${id}`);
}
export async function getThirdPartyWorkers(thirdPartyId = null) {
  if (thirdPartyId)
    return dbListByField("thirdPartyWorkers", "thirdPartyId", thirdPartyId);
  return dbList("thirdPartyWorkers");
}
export async function saveThirdPartyWorker(data, id = null) {
  const ts = new Date().toISOString();
  if (id) {
    await dbUpdate(`thirdPartyWorkers/${id}`, { ...data, updatedAt: ts });
    return id;
  }
  return dbPush("thirdPartyWorkers", { ...data, createdAt: ts });
}

// ── Documentos ─────────────────────────────────────────────
export async function getDocuments(companyId = null) {
  if (companyId) return dbListByField("documents", "companyId", companyId);
  return dbList("documents");
}
export async function saveDocument(data) {
  const ts = new Date().toISOString();
  const newId = await dbPush("documents", { ...data, createdAt: ts });
  await writeAuditLog({
    module: "documents",
    action: "create",
    recordId: newId,
    summary: `Documento: ${data.title}`,
  });
  return newId;
}
export async function deleteDocument(id) {
  await dbRemove(`documents/${id}`);
  await writeAuditLog({
    module: "documents",
    action: "delete",
    recordId: id,
    summary: "Documento removido",
  });
}

// ── Usuários ───────────────────────────────────────────────
export async function getUsers(companyId = null) {
  if (companyId) return dbListByField("users", "companyId", companyId);
  return dbList("users");
}
export async function getUserData(uid) {
  return dbGet(`users/${uid}`);
}
export async function saveUser(uid, data) {
  const ts = new Date().toISOString();
  await dbUpdate(`users/${uid}`, { ...data, updatedAt: ts });
  await writeAuditLog({
    module: "users",
    action: "update",
    recordId: uid,
    summary: `Usuário atualizado: ${data.email}`,
  });
}

// ── Configurações ──────────────────────────────────────────
export async function getSettings() {
  return dbGet("settings");
}
export async function saveSettings(data) {
  await dbUpdate("settings", data);
}

// ── Audit Logs ─────────────────────────────────────────────
export async function getAuditLogs(limit = 100) {
  const q = query(
    ref(db, "auditLogs"),
    orderByChild("createdAt"),
    limitToLast(limit),
  );
  const snap = await get(q);
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
