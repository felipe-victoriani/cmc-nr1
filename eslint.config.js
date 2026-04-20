// eslint.config.js — ESLint 9 flat config
import js from "@eslint/js";
import globals from "globals";

export default [
  // ── Ignorar arquivos gerados e dependências ─────────────────────────────
  {
    ignores: [
      "node_modules/**",
      "public/assets/js/firebase-config.js", // arquivo gerado — nunca versionar
      "coverage/**",
    ],
  },

  // ── Arquivos JS do browser (public/) ────────────────────────────────────
  {
    files: ["public/assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Qualidade geral
      eqeqeq: ["error", "always"],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "warn",
      // Segurança (OWASP)
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      // Console — warn em produção (erros são permitidos conforme padrão do projeto)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // ── build.js (Node.js ESM) ───────────────────────────────────────────────
  {
    files: ["build.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off", // console.log/error são intencionais no build
      "no-eval": "error",
    },
  },

  // ── Arquivos de teste ────────────────────────────────────────────────────
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
