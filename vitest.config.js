// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Ambiente Node.js: os testes cobrem funções puras (validators, utils)
    // que não dependem de DOM nem Firebase.
    environment: "node",

    // Garante timezone UTC em todos os workers para testes de datas serem
    // determinísticos independente do sistema operacional do desenvolvedor.
    env: { TZ: "UTC" },

    // Padrão de arquivos de teste
    include: ["tests/**/*.test.js"],

    // Cobertura de código — apenas módulos com lógica pura e testável
    coverage: {
      provider: "v8",
      include: ["public/assets/js/validators.js", "public/assets/js/utils.js"],
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
