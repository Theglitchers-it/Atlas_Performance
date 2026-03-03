# Atlas - Piattaforma SaaS per Personal Trainer

Piattaforma multi-tenant Node.js/Vue.js per Personal Trainer. Include motore di calcolo antropometrico (Jackson-Pollock 3/7 pliche), tracking biometrico, gamification dinamica, chat real-time, gestione prenotazioni, pagamenti Stripe e app mobile nativa con Capacitor.

---

## Funzionalità

- **Multi-tenant** — Isolamento dati rigoroso via `tenant_id`, piani abbonamento (free/starter/professional/enterprise)
- **Autenticazione** — JWT con refresh token + OAuth social (Google, GitHub, Discord, Microsoft)
- **Gestione clienti** — Profili, progressi, check-in, dashboard dedicata per ogni cliente
- **Misurazioni corporee** — Calcolo antropometrico Jackson-Pollock (3/7 pliche), composizione corporea, storico e confronti
- **Programmi e workout** — Libreria esercizi, creazione programmi, assegnazione clienti, tracking sessioni
- **Prenotazioni** — Calendario interattivo, classi, integrazione Google Calendar e Outlook
- **Pagamenti** — Stripe integration con webhook per abbonamenti e fatturazione
- **Chat real-time** — Messaggistica trainer-cliente via WebSocket (Socket.io)
- **Gamification** — Achievement, titoli, leaderboard, sfide e badge
- **Analytics** — Dashboard con grafici, report esportabili (Excel/PDF), analisi volume allenamento
- **Nutrizione** — Piani alimentari e meal planner
- **Notifiche** — Push notification (Web Push + Firebase), email (SMTP), alert in-app
- **Community** — Funzionalità social tra utenti
- **Referral** — Programma referral con codici e tracking conversioni
- **AI** — Funzionalità potenziate da OpenAI (analisi foto, suggerimenti)
- **API Keys** — Gestione chiavi API per integrazioni di terze parti
- **PWA** — Installabile come app, funzionamento offline
- **App mobile** — Build nativa Android/iOS con Capacitor

---

## Tech Stack

| Livello | Tecnologie |
|---------|-----------|
| **Backend** | Node.js, Express.js, Socket.io, MySQL 8, JWT, Joi, Helmet, Winston |
| **Frontend** | Vue.js 3, Vite, TypeScript, Pinia, Tailwind CSS, Headless UI |
| **Database** | MySQL 8.0+ (UTF8MB4), schema multi-tenant |
| **Mobile** | Capacitor 5 (Android), PWA |
| **Pagamenti** | Stripe |
| **AI** | OpenAI API |
| **Email** | Nodemailer (SMTP) |
| **Push** | Web Push (VAPID), Firebase Cloud Messaging |
| **Calendari** | Google Calendar API, Microsoft Graph (Outlook) |
| **Testing** | Jest (backend), Vitest (frontend), Playwright (E2E) |
| **CI/CD** | GitHub Actions |
| **Deploy** | PM2 (cluster mode) |

---

## Prerequisiti

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **Git**

---

## Installazione

```bash
# 1. Clona il repository
git clone https://github.com/tuouser/Piattaforma-SaaS-Personal-Trainer.git
cd Piattaforma-SaaS-Personal-Trainer

# 2. Installa tutte le dipendenze (root + backend + frontend)
npm run install:all
```

---

## Configurazione ambiente

### Backend

Copia il file di esempio e personalizza i valori:

```bash
cp backend/.env.example backend/.env
```

Variabili principali:

```env
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug

# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=la_tua_password
DB_NAME=pt_saas_db
DB_POOL_SIZE=50

# JWT (genera chiavi sicure per produzione)
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=genera_una_chiave_sicura
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=genera_una_chiave_diversa
JWT_REFRESH_EXPIRES_IN=3d

# OAuth (opzionali - per login social)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=password-app-gmail
EMAIL_FROM=noreply@tuodominio.com

# Web Push (genera con: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@tuodominio.com

# Firebase (opzionale - per push notification mobile)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# OpenAI (opzionale - per funzionalita AI)
OPENAI_API_KEY=sk-...

# Stripe (opzionale - per pagamenti)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Upload file
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

### Frontend

Per lo sviluppo locale non serve configurazione aggiuntiva (il proxy Vite redirige automaticamente le richieste API al backend).

Per produzione, crea `frontend/.env.local`:

```env
VITE_API_URL=https://api.tuodominio.com/api
VITE_SOCKET_URL=https://api.tuodominio.com
```

---

## Setup Database

```bash
# 1. Crea il database MySQL
mysql -u root -p -e "CREATE DATABASE pt_saas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Importa lo schema
mysql -u root -p pt_saas_db < database/schema.sql

# 3. Esegui le migrazioni
cd backend && npm run migrate

# 4. Popola con dati demo (opzionale)
npm run seed
```

Per resettare il database (cancella tutti i dati):

```bash
cd backend && npm run db:reset
```

---

## Avvio sviluppo

```bash
# Avvia backend + frontend insieme (dalla root)
npm run dev

# Oppure separatamente:
npm run dev:backend    # Backend su http://localhost:3000
npm run dev:frontend   # Frontend su http://localhost:5173
```

Il frontend Vite proxya automaticamente `/api` e `/socket.io` verso il backend sulla porta 3000.

---

## Avvio produzione

### Build frontend

```bash
npm run build    # Genera frontend/dist/
```

### Avvio con PM2

```bash
# Installa PM2 globalmente
npm install -g pm2

# Avvia in modalita produzione (cluster mode, usa tutti i CPU)
cd backend && pm2 start pm2.config.js --env production

# Comandi utili PM2
pm2 status          # Stato processi
pm2 logs            # Visualizza log
pm2 restart all     # Riavvia
pm2 stop all        # Ferma
pm2 monit           # Monitor real-time
```

Configurazione PM2 (`backend/pm2.config.js`):
- Cluster mode con auto-detect CPU
- Max memory: 512MB per istanza
- Auto-restart con limite 10 tentativi
- Graceful shutdown (5s timeout)
- Log separati: `pm2-error.log`, `pm2-out.log`

### Nginx Reverse Proxy

Il progetto include configurazioni nginx pronte in `nginx/`:

```bash
# Produzione (HTTPS + SSL + security headers)
sudo cp nginx/atlas.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/atlas.conf /etc/nginx/sites-enabled/

# Sviluppo (solo HTTP, senza SSL)
sudo cp nginx/atlas-dev.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/atlas-dev.conf /etc/nginx/sites-enabled/
```

Modifica i percorsi e il dominio nel file, poi:

```bash
sudo nginx -t                    # Testa la configurazione
sudo systemctl reload nginx      # Applica
```

La configurazione gestisce:
- Reverse proxy API (`/api`) e Swagger (`/api-docs`) verso Node.js
- WebSocket upgrade per Socket.io (`/socket.io`)
- File statici frontend con cache 1 anno per asset con hash
- Service Worker e manifest PWA senza cache
- Upload file serviti direttamente da nginx
- Security headers (HSTS, X-Frame-Options, CSP)
- Gzip compression
- SSL/TLS con Let's Encrypt (produzione)

---

## Testing

### Backend (Jest)

```bash
cd backend
npm test              # Esegui tutti i test
```

### Frontend (Vitest + Playwright)

```bash
cd frontend
npm run test          # Unit test con Vitest
npm run test:watch    # Watch mode
npm run test:e2e      # Test end-to-end con Playwright
npm run test:e2e:ui   # E2E con interfaccia grafica
npm run typecheck     # Controllo tipi TypeScript
npm run lint          # ESLint con auto-fix
```

### CI/CD

I test vengono eseguiti automaticamente su ogni push/PR verso `main` e `develop` tramite GitHub Actions:
- Backend: Jest con MySQL 8.0 di servizio
- Frontend: Type-check + build di produzione

---

## Health Check & Monitoring

### Health Check Endpoint

L'applicazione espone un endpoint di health check senza autenticazione:

```
GET /health
```

Risposta (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-02-24T14:30:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

Se il database non risponde, restituisce **503 Service Unavailable** con `"database": "disconnected"`. Utile per load balancer e monitoring esterni.

### Sentry (Error Tracking)

Il progetto include la configurazione Sentry pronta in `backend/src/config/sentry.js`:

```bash
# 1. Installa la dipendenza
cd backend && npm install @sentry/node

# 2. Configura il DSN nel .env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

Sentry cattura automaticamente errori, eccezioni non gestite e performance delle API. Nessuna modifica al codice necessaria — basta configurare il DSN.

---

## Deployment

Consulta la guida completa: **[DEPLOYMENT.md](DEPLOYMENT.md)**

Include: setup server, database, nginx, SSL, PM2, checklist pre-launch e troubleshooting.

Il deploy automatico via GitHub Actions e configurato in `.github/workflows/deploy.yml` — si attiva dopo merge su `main` e deploya via SSH.

---

## App Mobile (Capacitor)

**App ID:** `com.theglitchers.atlas`

```bash
cd frontend

# Build per mobile (disabilita PWA per WebView)
npm run build:mobile

# Sincronizza con progetto nativo
npm run cap:sync

# Apri in Android Studio
npm run cap:open:android

# Esegui su dispositivo/emulatore con live reload
npm run cap:run:android
```

Plugin Capacitor disponibili: Camera, Filesystem, Push Notifications, Network, Keyboard, Status Bar, Splash Screen, Haptics.

---

## Documentazione API

Con il server avviato, la documentazione Swagger e disponibile su:

```
http://localhost:3000/api-docs
```

Include tutti gli endpoint con schema request/response, autenticazione richiesta e codici di errore.

---

## Struttura Progetto

```
Piattaforma-SaaS-Personal-Trainer/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurazioni (database, firebase, logger, swagger)
│   │   ├── controllers/     # Handler richieste HTTP (32 controller)
│   │   ├── services/        # Logica di business (41 service)
│   │   ├── routes/          # Definizioni route API (32 moduli)
│   │   ├── middlewares/     # Auth, upload, error handling, CSRF
│   │   ├── validators/      # Validazione input con Joi (19 validator)
│   │   ├── socket/          # WebSocket handler (Socket.io)
│   │   ├── cron/            # Task schedulati (alert, reminder, gamification)
│   │   └── utils/           # Utility (cookies, helper)
│   ├── tests/               # Test Jest (85 file)
│   ├── pm2.config.js        # Configurazione PM2 produzione
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/           # Pagine Vue (46 view)
│   │   ├── components/      # Componenti riutilizzabili (~80)
│   │   ├── store/           # State management Pinia (19 store)
│   │   ├── composables/     # Vue 3 Composition API (20 composable)
│   │   ├── services/        # API client (Axios)
│   │   ├── router/          # Vue Router con guard
│   │   ├── types/           # Definizioni TypeScript
│   │   ├── assets/          # CSS, font, icone, immagini
│   │   ├── directives/      # Direttive Vue custom
│   │   └── plugins/         # Plugin Vue
│   ├── dist/                # Build output (gitignored)
│   ├── capacitor.config.ts  # Configurazione app mobile
│   └── package.json
├── database/
│   ├── schema.sql           # Schema completo DB (1454 righe)
│   ├── migrations/          # Migrazioni SQL (12 file)
│   ├── seeds/               # Dati iniziali (8 file)
│   ├── migrate.js           # Runner migrazioni
│   ├── seed.js              # Runner seed
│   └── reset-db.js          # Reset database
├── nginx/
│   ├── atlas.conf           # Configurazione nginx produzione (HTTPS)
│   └── atlas-dev.conf       # Configurazione nginx sviluppo (HTTP)
├── docs/
│   └── BACKUP.md            # Procedura backup/restore database
├── .github/workflows/       # GitHub Actions CI/CD + Deploy automatico
├── .husky/                  # Git hooks (pre-commit, commit-msg)
├── commitlint.config.js     # Regole commit convenzionali
├── package.json             # Monorepo root
└── README.md
```

---

## Convenzioni Commit

Il progetto usa [Conventional Commits](https://www.conventionalcommits.org/) con commitlint:

| Tipo | Uso |
|------|-----|
| `feat` | Nuova funzionalità |
| `fix` | Correzione bug |
| `refactor` | Refactoring codice |
| `test` | Aggiunta/modifica test |
| `chore` | Build, dipendenze, tooling |
| `docs` | Documentazione |
| `style` | Formattazione codice |
| `perf` | Miglioramento performance |
| `ci` | Modifiche CI/CD |

Esempio: `feat: add real-time chat notifications`

I hook Git (Husky) verificano automaticamente il formato del commit e formattano il codice con Prettier.

---

## Licenza

Questo progetto e distribuito con licenza [MIT](LICENSE).

Sviluppato da **The Glitchers**.
