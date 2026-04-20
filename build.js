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

const config = `// Arquivo gerado automaticamente pelo build.js — NÃO edite manualmente.
export const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
  databaseURL: "${process.env.FIREBASE_DATABASE_URL}",
  projectId: "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.FIREBASE_APP_ID}",
};
`;

const outPath = join(__dirname, "public", "assets", "js", "firebase-config.js");
writeFileSync(outPath, config, "utf8");
console.log("✅ firebase-config.js gerado com sucesso em", outPath);
