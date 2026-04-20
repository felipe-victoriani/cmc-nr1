// ============================================================
// utils.js — Utilitários gerais
// Formatação, máscaras, cálculos, exportação, etc.
// ============================================================

/* ─────────────────────────────────────────────────────────
   DATAS
   ─────────────────────────────────────────────────────── */

/** Formata data para pt-BR: 01/01/2024 */
export function formatDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}

/** Formata data e hora para pt-BR: 01/01/2024 14:30 */
export function formatDateTime(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "—";
  return (
    d.toLocaleDateString("pt-BR") +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Converte string/número de timestamp para Date */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

/** Retorna ISO string para hoje */
export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/** Calcula data de vencimento adicionando dias */
export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Retorna quantos dias faltam até a data (positivo = futuro, negativo = passado) */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/** Retorna classe CSS de urgência baseado em dias restantes */
export function urgencyClass(days) {
  if (days === null) return "";
  if (days < 0) return "badge-danger";
  if (days <= 30) return "badge-warning";
  return "badge-success";
}

/** Retorna texto legível de "há X dias" ou "em X dias" */
export function relativeTime(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return "—";
  if (d === 0) return "Hoje";
  if (d > 0) return `Em ${d} dia${d > 1 ? "s" : ""}`;
  return `Há ${Math.abs(d)} dia${Math.abs(d) > 1 ? "s" : ""}`;
}

/* ─────────────────────────────────────────────────────────
   MÁSCARAS E FORMATAÇÃO
   ─────────────────────────────────────────────────────── */

export function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
}

export function maskCNPJ(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    .substring(0, 18);
}

export function maskPhone(value) {
  const v = value.replace(/\D/g, "").substring(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trimEnd();
  }
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trimEnd();
}

export function maskDate(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .substring(0, 10);
}

export function maskCEP(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d{0,3})/, "$1-$2")
    .substring(0, 9);
}

/**
 * Aplica máscara em tempo real a um input.
 * @param {HTMLInputElement} input
 * @param {'cpf'|'cnpj'|'phone'|'date'|'cep'} type
 */
export function applyMask(input, type) {
  const masks = {
    cpf: maskCPF,
    cnpj: maskCNPJ,
    phone: maskPhone,
    date: maskDate,
    cep: maskCEP,
  };
  const fn = masks[type];
  if (!fn || !input) return;

  input.addEventListener("input", () => {
    const pos = input.selectionStart;
    input.value = fn(input.value);
    // Tenta restaurar posição do cursor
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      /* posição do cursor não suportada neste contexto */
    }
  });
}

/** Aplica máscaras a todos os inputs marcados com data-mask */
export function applyAllMasks(container = document) {
  container.querySelectorAll("[data-mask]").forEach((input) => {
    applyMask(input, input.dataset.mask);
  });
}

/* ─────────────────────────────────────────────────────────
   CÁLCULO DE RISCO (Matriz Probabilidade x Severidade)
   ─────────────────────────────────────────────────────── */

/**
 * Calcula nível de risco baseado em probabilidade e severidade (1-5).
 * Retorna { score, level, badgeClass }
 */
export function calculateRiskLevel(probability, severity) {
  const p = parseInt(probability) || 1;
  const s = parseInt(severity) || 1;
  const score = p * s;

  let level, badgeClass;
  if (score <= 4) {
    level = "Baixo";
    badgeClass = "badge-risk-low";
  } else if (score <= 9) {
    level = "Moderado";
    badgeClass = "badge-risk-medium";
  } else if (score <= 16) {
    level = "Alto";
    badgeClass = "badge-risk-high";
  } else {
    level = "Crítico";
    badgeClass = "badge-risk-critical";
  }

  return { score, level, badgeClass };
}

/* ─────────────────────────────────────────────────────────
   STRINGS
   ─────────────────────────────────────────────────────── */

export function truncate(text, maxLength = 60) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
}

export function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Remove acentos para busca case-insensitive */
export function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/* ─────────────────────────────────────────────────────────
   EXPORTAÇÃO
   ─────────────────────────────────────────────────────── */

/**
 * Gera e faz download de um arquivo CSV.
 * @param {string[]}   headers  - Cabeçalhos
 * @param {any[][]}    rows     - Linhas de dados
 * @param {string}     filename - Nome do arquivo (sem .csv)
 */
export function exportCSV(headers, rows, filename = "exportacao") {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────
   DEBOUNCE / THROTTLE
   ─────────────────────────────────────────────────────── */

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 200) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}

/* ─────────────────────────────────────────────────────────
   OUTROS
   ─────────────────────────────────────────────────────── */

/** Copia texto para a área de transferência */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Formata valor monetário em BRL */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Mapeia valor de perfil para label legível */
export const PROFILE_LABELS = {
  admin_master: "Admin Master",
  gestor_rh: "Gestor RH",
  tecnico_sst: "Técnico SST",
  gestor_unidade: "Gestor de Unidade",
  colaborador: "Colaborador",
};

/** Mapeia status de ação do plano para badge */
export const ACTION_STATUS_BADGES = {
  pendente: "badge-warning",
  em_andamento: "badge-info",
  concluido: "badge-success",
  atrasado: "badge-danger",
  cancelado: "badge-gray",
};

export const ACTION_STATUS_LABELS = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export const RISK_CATEGORY_LABELS = {
  fisico: "Físico",
  quimico: "Químico",
  biologico: "Biológico",
  acidente: "Acidente",
  ergonomico: "Ergonômico",
  psicossocial: "Psicossocial",
};

export const INCIDENT_TYPE_LABELS = {
  incidente: "Incidente",
  acidente: "Acidente",
  quase_acidente: "Quase-Acidente",
  evento_perigoso: "Evento Perigoso",
};

export const EMPLOYMENT_TYPE_LABELS = {
  clt: "CLT",
  temporario: "Temporário",
  terceirizado: "Terceirizado",
  aprendiz: "Aprendiz",
  autonomo: "Autônomo",
  estagiario: "Estagiário",
};
