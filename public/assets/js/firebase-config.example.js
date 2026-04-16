// ============================================================
// firebase-config.example.js
// Copie este arquivo como firebase-config.js e preencha
// com as credenciais do seu projeto Firebase.
// NUNCA versione firebase-config.js no Git!
// ============================================================

export const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
};

// Onde encontrar essas informações:
// 1. Acesse console.firebase.google.com
// 2. Selecione seu projeto
// 3. Vá em Configurações do projeto (ícone de engrenagem)
// 4. Em "Seus apps", copie o objeto firebaseConfig
