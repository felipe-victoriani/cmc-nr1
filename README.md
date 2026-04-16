# SST NR-1 — Sistema de Gestão de Segurança e Saúde do Trabalho

Sistema web completo para gestão de conformidade com a **NR-1** e demais normas regulamentadoras, desenvolvido com HTML5, CSS3, JavaScript puro (Vanilla JS ES Modules) e Firebase.

---

## Funcionalidades

| Módulo                  | Descrição                            |
| ----------------------- | ------------------------------------ |
| Dashboard               | KPIs e visão geral da empresa        |
| Empresas                | Cadastro de empresas e filiais       |
| Estabelecimentos        | Unidades físicas da empresa          |
| Setores                 | Departamentos/setores                |
| Cargos                  | Cargos e funções                     |
| Trabalhadores           | Cadastro completo de colaboradores   |
| Riscos                  | Inventário de riscos (GRO/PGR)       |
| Plano de Ação           | Gerenciamento de medidas de controle |
| Ergonomia/Psicossociais | Avaliações NR-17                     |
| Treinamentos            | Controle de treinamentos e validade  |
| Comunicados             | Alertas e comunicações internas      |
| Incidentes              | Registro e investigação de acidentes |
| Terceiros               | Gestão de contratados/fornecedores   |
| Documentos              | Repositório de documentos SST        |
| Relatórios              | Painel consolidado de conformidade   |
| Usuários                | Gestão de acesso (admin only)        |
| Perfil                  | Auto-serviço do usuário logado       |

---

## Pré-requisitos

- Conta no [Firebase](https://firebase.google.com) (plano gratuito Spark funciona)
- Navegador moderno com suporte a ES Modules
- Servidor HTTP local (VS Code Live Server, `npx serve`, Python `http.server`, etc.)

> **Importante:** Não abra os arquivos diretamente com `file://`. ES Modules exigem HTTP.

---

## Configuração do Firebase

### 1. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Habilite **Google Analytics** (opcional)

### 2. Habilitar serviços

- **Authentication** → Entrar com provedores → **E-mail/senha** → Ativar
- **Realtime Database** → Criar banco de dados → Iniciar no modo de **bloqueio**
- **Storage** → Começar → modo de produção

### 3. Obter configuração

1. No console Firebase, clique na engrenagem ⚙ → **Configurações do projeto**
2. Na aba **Geral**, role até **"Seus apps"** → adicione um app Web (`</>`)
3. Copie o objeto `firebaseConfig`

### 4. Criar `firebase-config.js`

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp public/assets/js/firebase-config.example.js public/assets/js/firebase-config.js
```

Edite `firebase-config.js` substituindo os valores pelo seu projeto:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "meu-projeto.firebaseapp.com",
  databaseURL: "https://meu-projeto-default-rtdb.firebaseio.com",
  projectId: "meu-projeto",
  storageBucket: "meu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc...",
};
```

### 5. Configurar regras do banco de dados

No console Firebase → Realtime Database → Regras, cole o conteúdo de `database.rules.json`.

### 6. Configurar regras de Storage

No console Firebase → Storage → Regras, cole o conteúdo de `storage.rules`.

---

## Criar o primeiro usuário Admin

1. Abra `public/setup-admin.html` no servidor HTTP local
2. Preencha e-mail, senha e nome
3. Clique em **"Criar Admin"**
4. **Delete o arquivo `setup-admin.html`** após o uso

---

## Rodando localmente

### Via VS Code Live Server

1. Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clique com o botão direito em `public/login.html` → **"Open with Live Server"**

### Via terminal (Node.js)

```bash
cd public
npx serve .
```

### Via Python

```bash
cd public
python -m http.server 8080
```

Acesse `http://localhost:8080/login.html`

---

## Deploy no Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar (escolha "Hosting" e aponte para a pasta "public")
firebase init

# Deploy
firebase deploy
```

---

## Estrutura de arquivos

```
SaAS_NR1/
├── firebase.json
├── database.rules.json
├── storage.rules
├── .gitignore
└── public/
    ├── login.html
    ├── forgot-password.html
    ├── index.html               # Dashboard
    ├── empresas.html
    ├── estabelecimentos.html
    ├── setores.html
    ├── cargos.html
    ├── trabalhadores.html
    ├── riscos.html
    ├── plano-acao.html
    ├── ergonomia-psicossociais.html
    ├── treinamentos.html
    ├── comunicados.html
    ├── incidentes.html
    ├── terceiros.html
    ├── documentos.html
    ├── relatorios.html
    ├── usuarios.html
    ├── perfil.html
    ├── setup-admin.html         ← deletar após uso
    └── assets/
        ├── css/
        │   ├── variables.css
        │   ├── reset.css
        │   ├── base.css
        │   ├── layout.css
        │   ├── components.css
        │   └── pages.css
        └── js/
            ├── firebase-config.js      ← criar a partir do .example
            ├── firebase-config.example.js
            ├── firebase-init.js
            ├── auth.js
            ├── guards.js
            ├── ui.js
            ├── utils.js
            ├── validators.js
            ├── services.database.js
            ├── services.auth.js
            ├── services.storage.js
            ├── dashboard.js
            └── [demais módulos].js
```

---

## Perfis de acesso

| Perfil           | Acesso                                           |
| ---------------- | ------------------------------------------------ |
| `admin_master`   | Acesso total, incluindo usuários                 |
| `gestor_rh`      | RH, trabalhadores, treinamentos                  |
| `gestor_unidade` | Módulos operacionais do seu estabelecimento      |
| `tecnico_sst`    | Riscos, planos de ação, incidentes, treinamentos |
| `colaborador`    | Somente consulta (pode ser adaptado)             |

---

## Segurança

- `firebase-config.js` está no `.gitignore` — **nunca faça commit das suas credenciais**
- As regras do Realtime Database isolam dados por `companyId`
- Regras de Storage exigem autenticação para upload/download

---

## Licença

Projeto proprietário — uso interno. Adapte conforme necessário.
