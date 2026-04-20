// tests/utils.test.js
// Testes unitários das funções puras de utils.js
// Não dependem de DOM, Firebase nem network — executam em ambiente Node.js.
// TZ=UTC configurado em vitest.config.js para consistência de datas.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  toDate,
  addDays,
  daysUntil,
  urgencyClass,
  relativeTime,
  maskCPF,
  maskCNPJ,
  maskPhone,
  maskDate,
  maskCEP,
} from "../public/assets/js/utils.js";

// ─── formatDate ──────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it('retorna "—" para null', () => expect(formatDate(null)).toBe("—"));
  it('retorna "—" para undefined', () =>
    expect(formatDate(undefined)).toBe("—"));
  it('retorna "—" para string vazia', () => expect(formatDate("")).toBe("—"));
  it('retorna "—" para data inválida', () =>
    expect(formatDate("invalid")).toBe("—"));
  it("retorna string no formato DD/MM/AAAA para data válida", () => {
    const result = formatDate("2024-06-15");
    // Valida formato DD/MM/AAAA — independente de timezone (resultado UTC)
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
  it("aceita objeto Date", () => {
    const result = formatDate(new Date("2024-06-15T12:00:00Z"));
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

// ─── formatDateTime ──────────────────────────────────────────────────────────

describe("formatDateTime", () => {
  it('retorna "—" para null', () => expect(formatDateTime(null)).toBe("—"));
  it('retorna "—" para data inválida', () =>
    expect(formatDateTime("invalid")).toBe("—"));
  it("retorna string com data e hora para datetime válido", () => {
    const result = formatDateTime("2024-06-15T12:30:00Z");
    // Deve conter / e : para data e hora
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

// ─── toDate ──────────────────────────────────────────────────────────────────

describe("toDate", () => {
  it("retorna null para null", () => expect(toDate(null)).toBeNull());
  it("retorna null para undefined", () => expect(toDate(undefined)).toBeNull());
  it("retorna null para string vazia", () => expect(toDate("")).toBeNull());
  it("retorna a mesma instância de Date", () => {
    const d = new Date("2024-01-01T00:00:00Z");
    expect(toDate(d)).toBe(d);
  });
  it("converte string ISO para Date", () => {
    const d = toDate("2024-01-15T00:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0); // Janeiro
    expect(d.getUTCDate()).toBe(15);
  });
});

// ─── addDays ─────────────────────────────────────────────────────────────────

describe("addDays", () => {
  // TZ=UTC configurado — new Date('YYYY-MM-DD') = meia-noite UTC
  it("retorna string no formato ISO YYYY-MM-DD", () => {
    expect(addDays("2024-06-15", 10)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("avança 10 dias dentro do mesmo mês", () => {
    expect(addDays("2024-06-01", 10)).toBe("2024-06-11");
  });
  it("atravessa mês corretamente", () => {
    expect(addDays("2024-06-25", 10)).toBe("2024-07-05");
  });
  it("atravessa ano corretamente", () => {
    expect(addDays("2024-12-25", 10)).toBe("2025-01-04");
  });
  it("retorna a mesma data com 0 dias", () => {
    expect(addDays("2024-06-15", 0)).toBe("2024-06-15");
  });
  it("subtrai dias com valor negativo", () => {
    expect(addDays("2024-06-15", -5)).toBe("2024-06-10");
  });
  it("lida com ano bissexto (fev 2024)", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
  });
});

// ─── daysUntil ───────────────────────────────────────────────────────────────

describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Simula hoje = 15 de junho de 2024 ao meio-dia UTC
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna null para string vazia", () => expect(daysUntil("")).toBeNull());
  it("retorna null para null", () => expect(daysUntil(null)).toBeNull());
  it("retorna 0 para hoje", () => expect(daysUntil("2024-06-15")).toBe(0));
  it("retorna positivo para data futura", () =>
    expect(daysUntil("2024-06-20")).toBe(5));
  it("retorna 1 para amanhã", () => expect(daysUntil("2024-06-16")).toBe(1));
  it("retorna negativo para data passada", () =>
    expect(daysUntil("2024-06-10")).toBe(-5));
  it("retorna -1 para ontem", () => expect(daysUntil("2024-06-14")).toBe(-1));
});

// ─── urgencyClass ────────────────────────────────────────────────────────────

describe("urgencyClass", () => {
  it('retorna "" para null', () => expect(urgencyClass(null)).toBe(""));
  it('retorna "badge-danger" para dias negativos (vencido)', () =>
    expect(urgencyClass(-1)).toBe("badge-danger"));
  it('retorna "badge-danger" para -100', () =>
    expect(urgencyClass(-100)).toBe("badge-danger"));
  it('retorna "badge-warning" para 0 dias', () =>
    expect(urgencyClass(0)).toBe("badge-warning"));
  it('retorna "badge-warning" para 15 dias', () =>
    expect(urgencyClass(15)).toBe("badge-warning"));
  it('retorna "badge-warning" para exatamente 30 dias', () =>
    expect(urgencyClass(30)).toBe("badge-warning"));
  it('retorna "badge-success" para 31 dias', () =>
    expect(urgencyClass(31)).toBe("badge-success"));
  it('retorna "badge-success" para 365 dias', () =>
    expect(urgencyClass(365)).toBe("badge-success"));
});

// ─── relativeTime ────────────────────────────────────────────────────────────

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna "—" para null', () => expect(relativeTime(null)).toBe("—"));
  it('retorna "—" para string vazia', () => expect(relativeTime("")).toBe("—"));
  it('retorna "Hoje" para a data atual', () =>
    expect(relativeTime("2024-06-15")).toBe("Hoje"));
  it('retorna "Em 1 dia" (singular) para amanhã', () =>
    expect(relativeTime("2024-06-16")).toBe("Em 1 dia"));
  it('retorna "Em 5 dias" (plural) para 5 dias no futuro', () =>
    expect(relativeTime("2024-06-20")).toBe("Em 5 dias"));
  it('retorna "Há 1 dia" (singular) para ontem', () =>
    expect(relativeTime("2024-06-14")).toBe("Há 1 dia"));
  it('retorna "Há 5 dias" (plural) para 5 dias no passado', () =>
    expect(relativeTime("2024-06-10")).toBe("Há 5 dias"));
});

// ─── maskCPF ─────────────────────────────────────────────────────────────────

describe("maskCPF", () => {
  it("formata CPF completo corretamente", () =>
    expect(maskCPF("11144477735")).toBe("111.444.777-35"));
  it("formata CPF com pontuação existente (idempotente)", () =>
    expect(maskCPF("111.444.777-35")).toBe("111.444.777-35"));
  it("trunca além de 14 caracteres", () => {
    expect(maskCPF("11144477735999").length).toBeLessThanOrEqual(14);
  });
  it("lida com entrada parcial", () => {
    expect(maskCPF("111")).toBe("111");
    expect(maskCPF("111444")).toBe("111.444");
    expect(maskCPF("111444777")).toBe("111.444.777");
  });
  it("ignora caracteres não numéricos", () =>
    expect(maskCPF("aaa111bbb444ccc777ddd35")).toBe("111.444.777-35"));
});

// ─── maskCNPJ ────────────────────────────────────────────────────────────────

describe("maskCNPJ", () => {
  it("formata CNPJ completo corretamente", () =>
    expect(maskCNPJ("11222333000181")).toBe("11.222.333/0001-81"));
  it("formata CNPJ com pontuação existente (idempotente)", () =>
    expect(maskCNPJ("11.222.333/0001-81")).toBe("11.222.333/0001-81"));
  it("trunca além de 18 caracteres", () => {
    expect(maskCNPJ("11222333000181999").length).toBeLessThanOrEqual(18);
  });
  it("lida com entrada parcial", () => {
    expect(maskCNPJ("11")).toBe("11");
    expect(maskCNPJ("11222")).toBe("11.222");
  });
});

// ─── maskPhone ───────────────────────────────────────────────────────────────

describe("maskPhone", () => {
  it("formata celular com 9 dígitos (11 dígitos totais)", () =>
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321"));
  it("formata fixo com 8 dígitos (10 dígitos totais)", () =>
    expect(maskPhone("1134567890")).toBe("(11) 3456-7890"));
  it("remove caracteres não numéricos antes de formatar", () =>
    expect(maskPhone("(11)98765-4321")).toBe("(11) 98765-4321"));
  it("retorna dígitos sem formatação quando insuficientes para o padrão", () => {
    // Com apenas 2 dígitos a regex não captura — retorna os dígitos como estão
    expect(maskPhone("11")).toBe("11");
  });
});

// ─── maskDate ────────────────────────────────────────────────────────────────

describe("maskDate", () => {
  it("formata data no formato DD/MM/AAAA", () =>
    expect(maskDate("15062024")).toBe("15/06/2024"));
  it("lida com entrada parcial", () => {
    expect(maskDate("15")).toBe("15");
    expect(maskDate("1506")).toBe("15/06");
  });
  it("trunca além de 10 caracteres", () => {
    expect(maskDate("150620241234").length).toBeLessThanOrEqual(10);
  });
});

// ─── maskCEP ─────────────────────────────────────────────────────────────────

describe("maskCEP", () => {
  it("formata CEP completo corretamente", () =>
    expect(maskCEP("01310100")).toBe("01310-100"));
  it("formata CEP com hífen existente (idempotente)", () =>
    expect(maskCEP("01310-100")).toBe("01310-100"));
  it("lida com entrada parcial", () => {
    expect(maskCEP("01310")).toBe("01310-");
    expect(maskCEP("013")).toBe("013");
  });
  it("trunca além de 9 caracteres", () => {
    expect(maskCEP("013101009").length).toBeLessThanOrEqual(9);
  });
});
