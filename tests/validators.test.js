// tests/validators.test.js
// Testes unitários das funções puras de validators.js
// Não dependem de DOM, Firebase nem network — executam em ambiente Node.js.

import { describe, it, expect } from "vitest";
import {
  isRequired,
  isEmail,
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  isValidDate,
  isMinLength,
  isMaxLength,
  isStrongPassword,
} from "../public/assets/js/validators.js";

// ─── isRequired ──────────────────────────────────────────────────────────────

describe("isRequired", () => {
  it("retorna false para null", () => expect(isRequired(null)).toBe(false));
  it("retorna false para undefined", () =>
    expect(isRequired(undefined)).toBe(false));
  it("retorna false para string vazia", () =>
    expect(isRequired("")).toBe(false));
  it("retorna false para string só com espaços", () =>
    expect(isRequired("   ")).toBe(false));
  it("retorna true para string com conteúdo", () =>
    expect(isRequired("hello")).toBe(true));
  it("retorna true para 0 (zero é valor válido)", () =>
    expect(isRequired(0)).toBe(true));
  it("retorna true para false booleano", () =>
    expect(isRequired(false)).toBe(true));
  it("retorna true para número positivo", () =>
    expect(isRequired(42)).toBe(true));
});

// ─── isEmail ─────────────────────────────────────────────────────────────────

describe("isEmail", () => {
  it("aceita e-mail válido simples", () =>
    expect(isEmail("user@example.com")).toBe(true));
  it("aceita e-mail com subdomínio", () =>
    expect(isEmail("user@mail.example.com.br")).toBe(true));
  it("aceita e-mail com ponto antes do @", () =>
    expect(isEmail("nome.sobrenome@empresa.com.br")).toBe(true));
  it("rejeita e-mail sem @", () =>
    expect(isEmail("userexample.com")).toBe(false));
  it("rejeita e-mail sem domínio após @", () =>
    expect(isEmail("user@")).toBe(false));
  it("rejeita e-mail com espaço", () =>
    expect(isEmail("us er@example.com")).toBe(false));
  it("rejeita string vazia", () => expect(isEmail("")).toBe(false));
  it("rejeita apenas @", () => expect(isEmail("@")).toBe(false));
});

// ─── isValidCPF ──────────────────────────────────────────────────────────────

describe("isValidCPF", () => {
  // CPF real válido: 111.444.777-35
  it("aceita CPF válido com pontuação", () =>
    expect(isValidCPF("111.444.777-35")).toBe(true));
  it("aceita CPF válido sem pontuação", () =>
    expect(isValidCPF("11144477735")).toBe(true));

  // Casos inválidos
  it("rejeita CPF com todos os dígitos iguais (111.111.111-11)", () =>
    expect(isValidCPF("111.111.111-11")).toBe(false));
  it("rejeita CPF com todos zeros (000.000.000-00)", () =>
    expect(isValidCPF("00000000000")).toBe(false));
  it("rejeita CPF com dígito verificador errado", () =>
    expect(isValidCPF("111.444.777-36")).toBe(false));
  it("rejeita CPF muito curto", () =>
    expect(isValidCPF("1234567")).toBe(false));
  it("rejeita CPF muito longo", () =>
    expect(isValidCPF("111444777350")).toBe(false));
  it("rejeita string vazia", () => expect(isValidCPF("")).toBe(false));
  it("rejeita texto aleatório", () =>
    expect(isValidCPF("abc.def.ghi-jk")).toBe(false));
});

// ─── isValidCNPJ ─────────────────────────────────────────────────────────────

describe("isValidCNPJ", () => {
  // CNPJ real válido: 11.222.333/0001-81
  it("aceita CNPJ válido com pontuação", () =>
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true));
  it("aceita CNPJ válido sem pontuação", () =>
    expect(isValidCNPJ("11222333000181")).toBe(true));

  // Casos inválidos
  it("rejeita CNPJ com todos os dígitos iguais", () =>
    expect(isValidCNPJ("11.111.111/1111-11")).toBe(false));
  it("rejeita CNPJ com dígito verificador errado", () =>
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false));
  it("rejeita CNPJ muito curto", () =>
    expect(isValidCNPJ("1234567")).toBe(false));
  it("rejeita string vazia", () => expect(isValidCNPJ("")).toBe(false));
});

// ─── isValidPhone ────────────────────────────────────────────────────────────

describe("isValidPhone", () => {
  // Celular (9 dígitos)
  it("aceita (11) 98765-4321", () =>
    expect(isValidPhone("(11) 98765-4321")).toBe(true));
  it("aceita 11987654321 sem formatação", () =>
    expect(isValidPhone("11987654321")).toBe(true));

  // Fixo (8 dígitos)
  it("aceita (11) 3456-7890", () =>
    expect(isValidPhone("(11) 3456-7890")).toBe(true));
  it("aceita 1134567890 sem formatação", () =>
    expect(isValidPhone("1134567890")).toBe(true));

  // Inválidos
  it("rejeita número muito curto", () =>
    expect(isValidPhone("1234")).toBe(false));
  it("rejeita string vazia", () => expect(isValidPhone("")).toBe(false));
  it("rejeita apenas letras", () =>
    expect(isValidPhone("abc-defg-hijk")).toBe(false));
});

// ─── isValidDate ─────────────────────────────────────────────────────────────

describe("isValidDate", () => {
  it("aceita ISO date string (2024-01-15)", () =>
    expect(isValidDate("2024-01-15")).toBe(true));
  it("aceita datetime completo", () =>
    expect(isValidDate("2024-01-15T10:00:00.000Z")).toBe(true));
  it("aceita objeto Date", () => expect(isValidDate(new Date())).toBe(true));
  it("rejeita string aleatória", () =>
    expect(isValidDate("not-a-date")).toBe(false));
  it("rejeita string vazia", () => expect(isValidDate("")).toBe(false));
  // null → new Date(null) = Unix epoch (data válida) — comportamento nativo do JS
  it("aceita null (interpretado como epoch pelo Date constructor)", () =>
    expect(isValidDate(null)).toBe(true));
});

// ─── isMinLength ─────────────────────────────────────────────────────────────

describe("isMinLength", () => {
  it("retorna true quando comprimento = min", () =>
    expect(isMinLength("hello", 5)).toBe(true));
  it("retorna true quando comprimento > min", () =>
    expect(isMinLength("hello world", 5)).toBe(true));
  it("retorna false quando comprimento < min", () =>
    expect(isMinLength("hi", 5)).toBe(false));
  it("ignora espaços laterais no cálculo", () =>
    expect(isMinLength("  hi  ", 5)).toBe(false)); // "  hi  ".trim() = "hi" (2 chars)
  it("aceita string vazia com min=0", () =>
    expect(isMinLength("", 0)).toBe(true));
});

// ─── isMaxLength ─────────────────────────────────────────────────────────────

describe("isMaxLength", () => {
  it("retorna true quando comprimento = max", () =>
    expect(isMaxLength("hello", 5)).toBe(true));
  it("retorna true quando comprimento < max", () =>
    expect(isMaxLength("hi", 5)).toBe(true));
  it("retorna false quando comprimento > max", () =>
    expect(isMaxLength("hello world", 5)).toBe(false));
  it("aceita string vazia", () => expect(isMaxLength("", 10)).toBe(true));
});

// ─── isStrongPassword ────────────────────────────────────────────────────────

describe("isStrongPassword", () => {
  it("aceita senha forte com todos os requisitos", () => {
    const result = isStrongPassword("Secure@123");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("");
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = isStrongPassword("Ab1!");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/mínimo 8/i);
  });

  it("rejeita senha sem letra maiúscula", () => {
    const result = isStrongPassword("secure@123");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/maiúscula/i);
  });

  it("rejeita senha sem letra minúscula", () => {
    const result = isStrongPassword("SECURE@123");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/minúscula/i);
  });

  it("rejeita senha sem número", () => {
    const result = isStrongPassword("Secure@abc");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/número/i);
  });

  it("rejeita senha sem caractere especial", () => {
    const result = isStrongPassword("Secure123");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/especial/i);
  });

  it("rejeita string vazia", () => {
    const result = isStrongPassword("");
    expect(result.valid).toBe(false);
  });

  it("aceita senha com caracteres especiais variados", () => {
    expect(isStrongPassword("Abc123!@#").valid).toBe(true);
    expect(isStrongPassword("Minhasenha#1").valid).toBe(true);
    expect(isStrongPassword("P@$$w0rd").valid).toBe(true);
  });
});
