// ============================================================
// validators.js — Validação de formulários
// ============================================================

import { maskCPF, maskCNPJ } from "./utils.js";

/* ─────────────────────────────────────────────────────────
   HELPERS INDIVIDUAIS
   ─────────────────────────────────────────────────────── */

export function isRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isValidCPF(value) {
  const cpf = String(value).replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}

export function isValidCNPJ(value) {
  const cnpj = String(value).replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (c, w) => 11 - (c.reduce((s, d, i) => s + d * w[i], 0) % 11);
  const d1 = calc(cnpj.slice(0, 12).split("").map(Number), weights1);
  const d2 = calc(cnpj.slice(0, 13).split("").map(Number), weights2);
  return (
    (d1 > 9 ? 0 : d1) === parseInt(cnpj[12]) &&
    (d2 > 9 ? 0 : d2) === parseInt(cnpj[13])
  );
}

export function isValidPhone(value) {
  return /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/.test(
    String(value).replace(/\s/g, ""),
  );
}

export function isValidDate(value) {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function isMinLength(value, min) {
  return String(value || "").trim().length >= min;
}

export function isMaxLength(value, max) {
  return String(value || "").trim().length <= max;
}

/**
 * Valida força de senha.
 * Requisitos: mínimo 8 chars, letra maiúscula, minúscula, número e caractere especial.
 * Retorna { valid: boolean, message: string }
 */
export function isStrongPassword(value) {
  const v = String(value || "");
  if (v.length < 8)
    return { valid: false, message: "Senha deve ter no mínimo 8 caracteres." };
  if (!/[A-Z]/.test(v))
    return {
      valid: false,
      message: "Senha deve conter pelo menos uma letra maiúscula.",
    };
  if (!/[a-z]/.test(v))
    return {
      valid: false,
      message: "Senha deve conter pelo menos uma letra minúscula.",
    };
  if (!/[0-9]/.test(v))
    return { valid: false, message: "Senha deve conter pelo menos um número." };
  if (!/[^A-Za-z0-9]/.test(v))
    return {
      valid: false,
      message:
        "Senha deve conter pelo menos um caractere especial (ex: !@#$%).",
    };
  return { valid: true, message: "" };
}

/* ─────────────────────────────────────────────────────────
   VALIDAÇÃO DE FORMULÁRIO
   ─────────────────────────────────────────────────────── */

/**
 * Valida um formulário baseado em regras por campo.
 * Aplica classes de erro visuais e retorna { valid, errors }.
 *
 * Regras por campo:
 *   { required, email, cpf, cnpj, phone, minLength, maxLength, custom }
 *
 * Exemplo:
 *   validateForm(form, {
 *     nome:  { required: true, minLength: 3 },
 *     email: { required: true, email: true },
 *     cpf:   { required: true, cpf: true }
 *   })
 */
export function validateForm(formEl, rules) {
  const errors = {};
  const data = {};
  let valid = true;

  // Coleta todos os campos do formulário
  formEl.querySelectorAll("[name]").forEach((input) => {
    const name = input.getAttribute("name");
    if (name) data[name] = input.value;
  });

  // Limpa erros anteriores
  formEl
    .querySelectorAll(".form-group")
    .forEach((g) => g.classList.remove("invalid"));

  for (const [fieldName, rule] of Object.entries(rules)) {
    const input = formEl.querySelector(`[name="${fieldName}"]`);
    if (!input) continue;

    const value = input.value;
    let errorMsg = null;

    if (rule.required && !isRequired(value)) {
      errorMsg = rule.requiredMsg || "Campo obrigatório.";
    } else if (value) {
      if (rule.email && !isEmail(value)) {
        errorMsg = "E-mail inválido.";
      } else if (rule.cpf && !isValidCPF(value)) {
        errorMsg = "CPF inválido.";
      } else if (rule.cnpj && !isValidCNPJ(value)) {
        errorMsg = "CNPJ inválido.";
      } else if (rule.phone && !isValidPhone(value)) {
        errorMsg = "Telefone inválido.";
      } else if (rule.minLength && !isMinLength(value, rule.minLength)) {
        errorMsg = `Mínimo de ${rule.minLength} caracteres.`;
      } else if (rule.maxLength && !isMaxLength(value, rule.maxLength)) {
        errorMsg = `Máximo de ${rule.maxLength} caracteres.`;
      } else if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) errorMsg = customResult || "Valor inválido.";
      }
    }

    if (errorMsg) {
      valid = false;
      errors[fieldName] = errorMsg;
      const group = input.closest(".form-group");
      if (group) {
        group.classList.add("invalid");
        const errEl = group.querySelector(".form-error");
        if (errEl) errEl.textContent = errorMsg;
      }
    }
  }

  // Foca o primeiro campo com erro
  if (!valid) {
    const firstError = formEl.querySelector(
      ".form-group.invalid input, .form-group.invalid select, .form-group.invalid textarea",
    );
    firstError?.focus();
  }

  return { valid, errors, data };
}

/**
 * Remove marcação de erro de um campo ao digitar.
 * Chame após abrir o formulário.
 */
export function clearOnInput(formEl) {
  formEl.querySelectorAll("input, select, textarea").forEach((input) => {
    input.addEventListener(
      "input",
      () => {
        const group = input.closest(".form-group");
        if (group) group.classList.remove("invalid");
      },
      { once: false },
    );
  });
}

/**
 * Serializa um formulário em objeto JS.
 * @param {HTMLFormElement} formEl
 * @returns {Object}
 */
export function serializeForm(formEl) {
  const data = {};
  new FormData(formEl).forEach((value, key) => {
    // Se já existe, converte para array
    if (key in data) {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  });
  return data;
}
