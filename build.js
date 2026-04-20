// build.js — Gera public/assets/js/firebase-config.js a partir das
// variáveis de ambiente do Vercel (configuradas no painel do projeto).
// Executado automaticamente pelo Vercel antes do deploy.

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const required = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_DATABASE_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("❌ Variáveis de ambiente ausentes:", missing.join(", "));
  console.error(
    "Configure-as no painel do Vercel: Settings → Environment Variables",
  );
  process.exit(1);
}

const val = (key) => process.env[key].trim();

const config = `// Arquivo gerado automaticamente pelo build.js — NÃO edite manualmente.
export const firebaseConfig = {
  apiKey: "${val("FIREBASE_API_KEY")}",
  authDomain: "${val("FIREBASE_AUTH_DOMAIN")}",
  databaseURL: "${val("FIREBASE_DATABASE_URL")}",
  projectId: "${val("FIREBASE_PROJECT_ID")}",
  storageBucket: "${val("FIREBASE_STORAGE_BUCKET")}",
  messagingSenderId: "${val("FIREBASE_MESSAGING_SENDER_ID")}",
  appId: "${val("FIREBASE_APP_ID")}",
};
`;

const outPath = join(__dirname, "public", "assets", "js", "firebase-config.js");
writeFileSync(outPath, config, "utf8");
console.log("✅ firebase-config.js gerado com sucesso em", outPath);
