# CHANGELOG - Atlas Platform

> Questo file traccia tutte le azioni di sviluppo del progetto.
> Ultimo aggiornamento: 2026-02-16

---

## [2026-02-16] - Ottimizzazione Mobile Completa + Fix PWA + Responsive Sistematico

### Round 3 — Fix Overflow Orizzontale per Tutti gli Schermi

#### R1: Safety net globale
- **`frontend/src/assets/main.css`** — Aggiunto `overflow-x: hidden` su `html` per impedire scroll orizzontale accidentale

#### R2: Grid `grid-cols-3` senza breakpoint responsive (8 istanze)
- **`MeasurementsView.vue`** — 4 grid fixate: body form (`grid-cols-1 sm:grid-cols-3`), circonferenze (`grid-cols-2 sm:grid-cols-3`), skinfold info e pliche
- **`LoginView.vue`** — 2 grid fixate: social login buttons e stats counter
- **`RegisterView.vue`** — 1 grid fixata: social login buttons + feature grid (R10)

#### R3: Stat grid tablet breakpoint
- **`AdminBillingView.vue`**, **`AdminDashboardView.vue`** — `lg:grid-cols-4` → `md:grid-cols-4`

#### R4: Admin views padding + tabelle responsive
- **`AdminAuditView.vue`**, **`AdminBillingView.vue`** — `p-6` → `p-3 sm:p-6`, celle tabella `px-6` → `px-3 sm:px-6`, colonne nascoste su mobile con `hidden sm:table-cell`

#### R5–R9: Fix vari componenti mobile
- **`GamificationView.vue`** — `min-w-[80px]` → `flex-1` (3 istanze)
- **`ProgramsView.vue`** — Filter select `min-w-[180px]` → `min-w-0 w-full sm:w-auto sm:min-w-[180px]`
- **`ClientDashboardView.vue`** — Stat card padding `p-4` → `p-3 sm:p-4`, text responsive
- **`ClientCheckinView.vue`**, **`ClientDashboardView.vue`**, **`GamificationView.vue`**, **`TimeSlotPicker.vue`** — `gap-6` → `gap-4 sm:gap-6`

### Fix Doppio Padding Mobile — 18 View
- **Problema:** Le view avevano `p-6` (24px) che si sommava al `px-3` (12px) di App.vue → 36px per lato su 390px = 18% dello schermo sprecato
- **Fix:** `p-6` → `p-2 sm:p-6` su 18 view: ClientsListView, DashboardView, CalendarView, LocationsView, MeasurementsView, AdminTenantsView, NutritionView, MealPlannerView, ProgramsView, ProgramDetailView, ReferralView, SessionDetailView, SessionsView, VolumeAnalyticsView, ExerciseLibraryView, WorkoutsView, ClientProgressView, AdminDashboardView

### Fix PWA — Service Worker e Manifest
- **`frontend/src/main.js`** — Sostituita registrazione manuale di `/sw.js` con `registerSW()` da `virtual:pwa-register` (vite-plugin-pwa). In dev mode è un no-op, in build funziona correttamente
- **`frontend/index.html`** — Rimosso `<link rel="manifest">` hardcoded (iniettato automaticamente dal plugin PWA in build)

### Fix Sidebar Drawer Mobile — Voci menu coperte
- **`App.vue`** — Aggiunto `:class="{ 'pb-20': showBottomNav }"` al drawer container per compensare la BottomNavigation
- **`AppSidebar.vue`** — `p-4` → `p-4 pb-24` sulla nav per garantire scroll fino all'ultima voce

### Fix Bottoni Arancioni Overflow Mobile — 8 View
- **Pattern:** `inline-flex` → `flex sm:inline-flex` + `justify-center w-full sm:w-auto`
- **File:** ClientsListView, DashboardView, LocationsView, ReferralView, NutritionView, SessionsView, ExerciseLibraryView, WorkoutsView
- **WorkoutsView:** Container 2 bottoni da `flex gap-3` → `flex flex-col sm:flex-row gap-3 w-full sm:w-auto`

### Round 4 — Fix Titoli Tagliati su Mobile (38 file)

#### Titoli h1 `text-2xl` → `text-xl sm:text-2xl` (35 view)
- AdminAuditView, AdminBillingView, AdminDashboardView, AdminTenantsView, AnalyticsView, CalendarView, ClassesView, ClientCheckinView, ClientWorkoutView, ClientCreateView, ClientDetailView, ClientsListView, CommunityView, ChallengesView, GamificationView, LeaderboardView, TitlesView, LocationsView, MeasurementsView, MealPlannerView, NutritionView, ProgramDetailView, ProgramsView, ReadinessView, ReferralView, SessionDetailView, SessionsView, ProfileView, SettingsView, StaffPermissionsView, VideoLibraryView, VolumeAnalyticsView, ExerciseLibraryView, WorkoutBuilderView, WorkoutsView

#### Titoli auth `text-3xl` → `text-2xl sm:text-3xl` (3 view)
- LoginView, RegisterView, ForgotPasswordView

#### ClientProgressView `text-4xl` → `text-2xl sm:text-4xl`
- Titolo "I tuoi Progressi": aggiunto breakpoint `sm:` per transizione graduale

### Riepilogo Numerico
- **~60 file frontend modificati** in totale
- **0 errori di build** verificati dopo ogni batch di modifiche
- **3 view già responsive** (skip): DashboardView, ClientDashboardView, NotificationsView

---

## [2026-02-16] - Rebranding Atlas + Sicurezza httpOnly Cookies + Test Suite + Pulizia Progetto

### Rebranding → Atlas
- **12 file modificati** — Tutti i riferimenti "PT Fitness / FitnessPro / pt-saas" rinominati in "Atlas"
- `frontend/index.html`, `vite.config.js` (PWA manifest), `LandingPage.vue`, `LoginView.vue`, `RegisterView.vue`, `ForgotPasswordView.vue`, `AppHeader.vue` — Logo e testi aggiornati
- `package.json` (root, backend, frontend) — name aggiornato a `atlas-platform`, `atlas-backend`, `atlas-frontend`
- `backend/src/server.js`, `database/schema.sql`, `reset-db.js` — Commenti e console.log aggiornati

### Sicurezza Critica — Migrazione httpOnly Cookies
- **JWT token rimossi da localStorage** — Migrazione completa a httpOnly cookies (protezione XSS)
- **`backend/src/utils/cookies.js`** — Nuova utility: `setAuthCookies()`, `clearAuthCookies()`, config Secure/SameSite per ambiente
- **`backend/src/middlewares/csrfProtection.js`** — Nuovo middleware: verifica Content-Type JSON su POST/PUT/DELETE (protezione CSRF)
- **`backend/src/server.js`** — Aggiunto `cookie-parser`, CSRF middleware, Helmet con CSP completo, rate limiting ridotto (200/15min generale, 10/15min auth), env validation bloccante in production
- **`backend/src/controllers/auth.controller.js`** — Login/register/refresh/logout settano cookies httpOnly, token rimosso dal body JSON
- **`backend/src/middlewares/auth.js`** — `extractToken()`: priorita cookie > Authorization header (backward-compatible per mobile/API)
- **`backend/src/controllers/oauth.controller.js`** — OAuth callback: cookies settati, postMessage invia solo user data
- **`backend/src/socket/socketHandler.js`** — Auth via cookie dal handshake header, fallback auth.token
- **`frontend/src/services/api.js`** — `withCredentials: true`, rimossa tutta la logica localStorage token
- **`frontend/src/store/auth.js`** — `isAuthenticated` basato su `!!user`, rimossi ref `token`/`refreshToken`, aggiunto `initialAuthChecked`
- **`frontend/src/router/index.js`** — Navigation guard usa `initialAuthChecked` invece di localStorage
- **`frontend/src/composables/useSocket.js`** — `withCredentials: true`, rimosso token manuale
- **`frontend/src/store/chat.js`** — Socket con `withCredentials: true`
- **`frontend/src/main.js`** — Cleanup legacy: rimuove token da localStorage al boot

### Fix Sicurezza Aggiuntivi
- **Rate limiting** ridotto da 500 a 200 req/15min (auth: 10/15min)
- **Helmet CSP** — Content-Security-Policy configurato (script-src, style-src, img-src, connect-src, font-src)
- **CORS** — Usa `FRONTEND_URL` da env invece di localhost hardcoded
- **`TitleLeaderboard.vue`** — Rimosso `v-html` (rischio XSS), sostituito con interpolazione `{{ }}`
- **Env validation** — Variabili mancanti causano `process.exit(1)` in production

### Bug Fix — Programma Referral
- **`backend/src/controllers/referral.controller.js`** — Fix: accetta campo `name` dal body, `listCodes` e `listConversions` restituiscono array diretto (non `{ codes }` wrapper) per allinearsi al frontend
- **`backend/src/services/referral.service.js`** — Fix: `generateCode()` accetta e salva `name` nel metadata JSON, `listCodes()` estrae e restituisce `name` dal metadata, campo `uses` rinominato per match frontend
- **`frontend/src/views/referral/ReferralView.vue`** — Fix: campi stats allineati (`totalCodes`, `totalConversions`, `pendingConversions`, `totalEarnings`), conversioni usano struttura backend corretta (`conv.referredUser`, `conv.code`, `conv.createdAt`)

### Test Suite — 358 test (181 backend + 177 frontend)
- **`backend/tests/cookies.test.js`** — 10 test: cookie config dev/prod, set/clear cookies
- **`backend/tests/csrfProtection.test.js`** — 14 test: safe methods, non-safe methods, exclude paths
- **`backend/tests/auth.middleware.test.js`** — 29 test: extractToken (cookie+header), verifyToken, requireRole, requireTenantOwner, requireSuperAdmin, optionalAuth
- **`backend/tests/validators.test.js`** — 32 test: registerSchema, loginSchema, forgotPassword, resetPassword
- **`backend/tests/gamification.service.test.js`** — 26 test: XP calculations, dashboard, addXP, leaderboard, challenges, getChallengeById, getXPHistory
- **`backend/tests/notification.service.test.js`** — 21 test: create, createBulk, getByUser, markAsRead, markAllAsRead, delete, templates, preferences
- **`frontend/src/tests/authStore.test.js`** — 40 test: login/logout flow, checkAuth, ruoli, isAuthenticated, no localStorage usage

### Pulizia Progetto
- **Rimossi file orfani**: `nul`, `t2.id`, `backend/nul` (file vuoti da 0 bytes)
- **Rimosso schema duplicato**: `backend/src/database/schema.sql` (181 righe piu vecchio dell'originale in `database/schema.sql`)
- **Rimossa directory vuota**: `backend/src/models/` (pattern non utilizzato)
- **Rimossa worktree obsoleta**: `.claude/worktrees/relaxed-khorana/` (duplicato completo del progetto)
- **Spostato seed file**: `backend/src/database/seeds/seed_titles.sql` → `database/seeds/007_seed_titles.sql` (posizione standard)
- **Aggiornati path**: `reset-db.js`, `migrate.js`, `seed.js` — puntano a `../../database/` invece di `../src/database/`
- **Rimossa directory**: `backend/src/database/` (non piu necessaria, tutto centralizzato in `database/`)

---

## [2026-02-16] - UI/UX Improvements Desktop

### Micro-interazioni & Animazioni
- **`frontend/src/composables/useAnimatedNumber.js`** — Nuovo composable: contatore animato con easing easeOutExpo, si integra in StatsCard per effetto countUp
- **`frontend/src/composables/useIntersectionObserver.js`** — Nuovo composable: attiva animazioni quando l'elemento entra nel viewport (IntersectionObserver API)
- **`frontend/src/assets/main.css`** — Aggiunte animazioni CSS: `counterPulse`, `hover-lift`, `card-tilt` (effetto 3D su hover), `stat-accent-bar` (barra gradient colorata in alto alle stat cards)

### Tooltip Component
- **`frontend/src/components/ui/AppTooltip.vue`** — Nuovo componente tooltip con animazione fade+scale, auto-posizionamento, glassmorphism style
- **`frontend/src/directives/tooltip.js`** — Nuova direttiva globale `v-tooltip="'Testo'"` per tooltip rapidi su qualsiasi elemento
- **`frontend/src/main.js`** — Registrata direttiva tooltip globalmente

### Toast & Feedback Migliorati
- **`frontend/src/main.js`** — Transizione toast cambiata da bounce a slide per fluidita
- **`frontend/src/assets/main.css`** — Toast con bordo colorato per tipo (verde success, rosso error, arancione warning, blu info), border-radius 16px

### Dashboard KPI Cards
- **`frontend/src/components/ui/StatsCard.vue`** — Migliorato con: contatore animato (useAnimatedNumber), barra accent gradient in alto, effetto 3D tilt su hover, animazione cardAppear con delay staggerato
- **`frontend/src/views/DashboardView.vue`** — Sostituite 4 inline stat cards con componente `<StatsCard>` riusabile con emoji icons e colori per tipo

### DataTable Component Riusabile
- **`frontend/src/components/ui/DataTable.vue`** — Nuovo componente tabella con:
  - Sorting client-side e server-side
  - Ricerca integrata con debounce 300ms
  - Paginazione (client e server-side)
  - Selezione righe con checkbox
  - Skeleton loading animato
  - Empty state integrato con EmptyState component
  - Slot per celle custom (`#cell-{key}`) e azioni (`#actions`)
  - Slot toolbar per filtri aggiuntivi
  - Responsive con `hideBelow` per colonne
- **`frontend/src/views/clients/ClientsListView.vue`** — Migrata da tabella HTML inline a DataTable component con server-side pagination

### Auth Pages Improvements
- **`frontend/src/views/auth/LoginView.vue`** — Social buttons con brand colors (Google bianco, GitHub grigio scuro, Discord indigo), error shake su login fallito, success flash verde su login riuscito
- **`frontend/src/views/auth/RegisterView.vue`** — Social buttons con brand colors, error shake su registrazione fallita, password strength labels migliorate (Debole/Media/Forte/Ottima con colori graduali)

### CSS Aggiuntivo
- **`frontend/src/assets/main.css`** — Aggiunti stili per: tooltip (v-tooltip), toast customization, social buttons brand colors, auth-form-shake, auth-success-flash, DataTable (header, sorting, hover, striped, skeleton)

---

## [2026-02-16] - Fix Chat System + Badge Unread + Online Status + Seed Chat Demo

### Bug Fix Critici
- **`backend/src/validators/chat.validator.js`** — Fix 2 bug di validazione che impedivano il funzionamento della chat:
  - `createConversationSchema`: campo `participantId` (singolo) corretto in `participantIds` (array) per allinearsi a frontend e controller
  - `sendMessageSchema`: campo `type` corretto in `messageType`, `attachmentUrl` corretto in `attachments` per allinearsi a frontend e controller
  - Il middleware `stripUnknown: true` eliminava i campi con nomi diversi, causando errore "Dati non validi"
- **`backend/src/services/chat.service.js`** — Fix compatibilita MariaDB 10.4: sostituito `JSON_ARRAYAGG(JSON_OBJECT(...))` con `CONCAT('[', GROUP_CONCAT(CONCAT(...)), ']')` nella query `getConversations`. La funzione `JSON_ARRAYAGG` non esiste in MariaDB 10.4, causando errore "Errore database"

### Nuove Funzionalita
- **Badge messaggi non letti nella sidebar** — L'icona Chat nel menu sidebar mostra un badge rosso con il conteggio messaggi non letti, aggiornato in real-time via Socket.io (`frontend/src/components/layout/AppSidebar.vue`)
- **Sender preview nelle anteprime** — La lista conversazioni mostra "Tu: messaggio" per i propri messaggi e il nome del mittente nelle chat di gruppo (`frontend/src/views/chat/ChatView.vue`)
- **Stato online/offline utenti** — Pallino verde sugli avatar degli utenti connessi, con testo "Online" nell'header conversazione. Indicatore nella modale nuova conversazione (`frontend/src/views/chat/ChatView.vue`)

### Backend
- **`backend/src/routes/chat.routes.js`** — Aggiunto endpoint `GET /chat/online-users` per stato iniziale utenti online
- **`backend/src/controllers/chat.controller.js`** — Aggiunto handler `getOnlineUsers` che riusa `getOnlineUsers()` dal socketHandler

### Frontend
- **`frontend/src/store/chat.js`** — Aggiunto state `onlineUsers` (Set), `fetchOnlineUsers()`, `isOnline()`, listener socket per `user_online`/`user_offline`
- **`frontend/src/components/layout/AppSidebar.vue`** — Import `useChatStore`, init socket+conversazioni su mount, `menuItems` computed reattivo a `totalUnread`
- **`frontend/src/views/chat/ChatView.vue`** — Funzioni `getLastMessagePreview()`, `getOnlineStatus()`, `getHeaderOnlineStatus()`, pallino emerald su avatar, testo "Online" in header

### Seed Dati Demo
- **`backend/database/seed.js`** — Aggiunta sezione 7: seed conversazioni chat demo con 4 conversazioni e 15 messaggi
  - Conv 1: Trainer ↔ Client (5 messaggi, chat diretta)
  - Conv 2: Staff ↔ Client (3 messaggi, chat diretta)
  - Conv 3: Trainer ↔ Staff (4 messaggi, chat diretta)
  - Conv 4: Gruppo "Team Palestra" con trainer + staff + client (3 messaggi)
  - Helper `insertMsg()` per inserimento singolo con prepared statements (evita problemi escape SQL)
  - Idempotente: controlla `conversations.count === 0` prima di inserire

### Verifica Tutti i Profili
Chat verificata e funzionante per tutti i 4 ruoli:
| Profilo | Ruolo | Conversazioni | Stato |
|---------|-------|---------------|-------|
| admin@demo.local | tenant_owner | 4 (2 direct + 1 gruppo + create) | ✅ OK |
| staff@demo.local | staff | 4 (2 direct + 1 gruppo + create) | ✅ OK |
| client@demo.local | client | 4 (2 direct + 1 gruppo + create) | ✅ OK |
| superadmin@demo.local | super_admin | 3 (create dall'utente) | ✅ OK |

---

## [2026-02-15] - Redesign Sidebar Profile Card + Migliorie UI/UX Globali

### Sidebar Profile Card (NUOVO)
- **`frontend/src/composables/useSidebarStats.js`** (NUOVO ~190 righe) — Composable per fetch stats sidebar role-specific con cache localStorage 5 min. Riusa store esistenti (clientStore, gamificationStore, notificationStore) per evitare API call duplicate. Rileva ruolo e fornisce: stats reattive, roleLabel, avatarGradient, userInitials, xpProgress
- **`frontend/src/components/layout/AppSidebar.vue`** (MODIFICA righe 119-208) — Redesign completo profile card per tutti e 4 i profili:

| Ruolo | Avatar Gradient | Label | Stat 1 | Stat 2 | Extra |
|-------|----------------|-------|--------|--------|-------|
| **tenant_owner** | arancione → cyan | Titolare | Clienti (reale) | Piano (Pro/Free/etc) | Badge piano colorato |
| **staff** | blu → cyan | Collaboratore | Clienti (reale) | Notifiche (reale) | — |
| **client** | emerald → cyan | Atleta | Streak 🔥 (reale) | Livello ⭐ (reale) | Barra XP progress |
| **super_admin** | viola → rosa | Super Admin | Tenant (reale) | Utenti (reale) | — |

**Migliorie visive:**
- Avatar con gradiente per ruolo + due iniziali (nome+cognome)
- Card clickabile → naviga a /profile
- Skeleton loading durante fetch stats
- Tooltip hover in stato collapsed con nome + ruolo
- Hover effects (scale avatar, bordo cyan)
- Cache localStorage 5 min per performance
- Watch reattivo su notifiche (aggiornamento real-time per staff)

### Migliorie UI/UX Globali (sessione precedente)

**6 nuovi componenti riutilizzabili:**
- **`components/ui/ConfirmDialog.vue`** — Dialog modale accessibile (@headlessui/vue) per conferme azioni distruttive, con varianti danger/warning/info, loading state, focus trap, ESC
- **`components/ui/EmptyState.vue`** — Componente per liste vuote con icona, titolo, descrizione, CTA opzionale
- **`components/ui/KeyboardShortcutsHelp.vue`** — Overlay modale con lista keyboard shortcuts
- **`components/layout/AppBreadcrumb.vue`** — Breadcrumb dinamico da route.meta.breadcrumb
- **`composables/useKeyboardShortcuts.js`** — Shortcuts globali (`/` ricerca, `?` help, `Esc` chiudi, `N` nuovo)
- **`composables/useUnsavedChanges.js`** — Avviso modifiche non salvate (beforeunload + onBeforeRouteLeave)

**Integrazioni globali (App.vue, router, sidebar):**
- Sidebar: stato collapsed persistito in localStorage (`useLocalStorage`)
- Router: smooth scroll behavior, breadcrumb meta su tutte le ~40 route protette
- App.vue: page transitions slide-up + fade (200ms), breadcrumb, keyboard shortcuts
- Barrel export aggiornato (`components/ui/index.js`)

**Integrazioni nelle views (~15 file modificati):**
- ConfirmDialog sostituisce `confirm()` e Teleport inline in: WorkoutsView, ProgramsView, NutritionView, CalendarView, CommunityView, LocationsView, MealPlannerView
- Toast notifications (vue-toastification) aggiunti a tutte le operazioni CRUD
- useUnsavedChanges aggiunto a: ProfileView, WorkoutBuilderView, MealPlannerView
- EmptyState in: LocationsView

---

## [2026-02-15] - Verifica Piano Antropometria/Plicometria/Gamification

### Verifica completata
- Letto e analizzato il PDF "Piano Integrazione - Antropometria, Plicometria, Circonferenze e Titoli Gamification"
- **Risultato: 100% gia implementato** — tutte le funzionalita richieste dal piano sono gia presenti nel codebase

### Stato verificato
| Componente | Stato |
|------------|-------|
| DB: `anthropometric_data` (altezza, peso, eta, passi) | Presente |
| DB: `skinfold_measurements` (9 pliche + formule JP) | Presente |
| DB: `circumference_measurements` (9 misure + WHR) | Presente |
| DB: `bia_measurements` (massa magra/grassa, acqua, BMR, viscerale) | Presente |
| DB: `achievement_titles` + `client_titles` | Presente |
| Backend: `anthropometric.service.js` (JP 3/7-site M/F + Durnin-Womersley 4-site) | Presente |
| Backend: `title.service.js` (CRUD titoli + display + custom PT) | Presente |
| Backend: `gamification.service.js` (XP, livelli, streak, leaderboard) | Presente |
| Backend: `checkTitleUnlocks.js` cron (strength/consistency/transformation) | Presente |
| Seed: 36+ titoli pre-configurati (Iron Man, Sayan, Kratos, Thor, ecc.) | Presente |
| Frontend: `MeasurementsView.vue` (6 tab: Panoramica/Antropometria/Peso/Circonferenze/Plicometria/BIA) | Presente |
| Frontend: `TitleShowcase.vue`, `TitleUnlockAnimation.vue`, `TitleProgress.vue`, `TitleManager.vue`, `TitleLeaderboard.vue` | Presente |
| Frontend: `BodyCompositionChart.vue`, `MeasurementComparison.vue`, `MeasurementHistory.vue` | Presente |

---

## [2026-02-15] - OAuth Social Login — Google, GitHub, Discord

### Backend
- **`backend/src/services/oauth.service.js`** (NUOVO ~260 righe) — OAuth completo per 3 provider: getAuthUrl (genera URL + CSRF state in DB), handleCallback (valida state, scambia code, fetch profilo), exchangeCode (GitHub JSON, Discord form-urlencoded), fetchProfile (normalizza dati da ogni provider), findOrCreateOAuthUser (cerca per provider_id -> email -> crea nuovo tenant+user), generateLoginResponse (JWT access+refresh)
- **`backend/src/controllers/oauth.controller.js`** (NUOVO ~120 righe) — getAuthUrl (GET /api/auth/oauth/:provider -> {url}), handleCallback (GET callback -> HTML con postMessage tokens al parent popup)
- **`backend/database/migrations/add_oauth_columns.js`** (NUOVO) — ALTER TABLE users ADD oauth_provider VARCHAR(20), oauth_provider_id VARCHAR(255); CREATE TABLE oauth_states (state, provider, expires_at)
- **`backend/src/routes/auth.routes.js`** (MODIFICA) — +2 route OAuth: GET /oauth/:provider, GET /oauth/:provider/callback
- **`backend/src/services/auth.service.js`** (MODIFICA) — login(): se password_hash NULL -> "Questo account usa login sociale"; changePassword(): se password_hash NULL -> permette impostare senza verifica vecchia
- **`backend/.env`** (MODIFICA) — Aggiunte variabili: GOOGLE_AUTH_REDIRECT_URI, GITHUB_CLIENT_ID/SECRET/REDIRECT_URI, DISCORD_CLIENT_ID/SECRET/REDIRECT_URI
- **`backend/src/database/schema.sql`** + **`database/schema.sql`** (MODIFICA) — Aggiunti oauth_provider, oauth_provider_id nella tabella users + INDEX + tabella oauth_states

### Frontend
- **`frontend/src/store/auth.js`** (MODIFICA) — Nuova action socialLogin(provider): GET url backend -> popup centrato 600x700 -> postMessage listener con origin check -> store tokens in localStorage -> poll popup chiuso (annullamento)
- **`frontend/src/views/auth/LoginView.vue`** (MODIFICA) — socialLogin reale con authStore.socialLogin(), grid da 2 a 3 colonne, rimosso Apple, aggiunti bottoni Google (SVG multicolor), GitHub (fill currentColor), Discord (fill #5865F2)
- **`frontend/src/views/auth/RegisterView.vue`** (MODIFICA) — Stesse modifiche: socialLogin reale + grid-cols-3 + 3 bottoni (Google, GitHub, Discord)

### Flow OAuth
1. Click bottone -> GET `/api/auth/oauth/:provider` -> riceve URL autorizzazione
2. Apre popup centrato -> utente autorizza sul provider
3. Provider redirect a callback -> backend scambia code per token -> fetch profilo
4. Backend genera JWT -> restituisce HTML con `postMessage(tokens)` al parent
5. Frontend riceve tokens -> salva in localStorage -> redirect a dashboard

### Note
- Nessuna nuova dipendenza npm: Google usa `googleapis` (gia installato), GitHub/Discord usano `fetch` nativo
- CSRF protection con tabella `oauth_states` (scadenza 5 min)
- Per attivare: configurare credenziali reali nel .env (Google Cloud Console, GitHub Developer Settings, Discord Developer Portal)

---

## [2026-02-14] - Fix Login "Dati non validi" + Redesign Auth Pages

### Bug Fix
- **`backend/src/validators/auth.validator.js`** (MODIFICA) — Aggiunto `{ tlds: { allow: false } }` a tutti i 3 validatori email Joi (register, login, forgotPassword) per accettare domini .local usati dagli account demo
- **`backend/src/middlewares/errorHandler.js`** (MODIFICA) — Corretto check `err.statusCode` -> supporta sia `err.status` che `err.statusCode`

### Database
- **`backend/database/reset-db.js`** (NUOVO) — Script all-in-one: drop DB, ricrea con schema corretto, seed demo data (4 account demo con password `demo1234`: superadmin/admin/staff/client @demo.local)

### Verificato
- Tutti 4 account demo funzionanti dopo fix
- Login email/password operativo

---

## [Step 30/35] - ChatView — Messaggistica real-time con Socket.io

### Backend
- **`backend/src/services/chat.service.js`** (NUOVO ~180 righe) — Service con: getConversations (con unread count, last message, altri partecipanti), getConversationById (con lista partecipanti), createConversation (dedup conversazioni dirette), getMessages (paginato, auto-mark read), sendMessage (con broadcast Socket.io), markAsRead, getAvailableUsers, toggleMute
- **`backend/src/controllers/chat.controller.js`** (NUOVO ~110 righe) — 8 handler con emit Socket.io su sendMessage
- **`backend/src/routes/chat.routes.js`** (MODIFICA da placeholder) — 8 endpoints: GET users, GET/POST conversations, GET/POST messages, POST read/mute

### Frontend
- **`frontend/src/store/chat.js`** (NUOVO ~230 righe) — Pinia store con connessione Socket.io (token JWT auth), gestione real-time (new_message, typing indicators, read receipts), conversation management (open/close/join/leave rooms), optimistic message updates, totalUnread computed
- **`frontend/src/views/chat/ChatView.vue`** (MODIFICA ~390 righe) — UI stile WhatsApp/Telegram: sidebar conversazioni con ricerca + badge unread + avatar + preview last message, area chat con header conversazione + mute toggle, messaggi con bolle colorate (cyan inviate, card ricevute) + separatori giorno + typing dots animati + auto-scroll, input con Enter per inviare, deep linking /chat/:conversationId, layout responsive (sidebar nascosta su mobile quando chat aperta), modale nuova conversazione

### Note
- Socket.io handler GIA' implementato in `backend/src/socket/socketHandler.js` (autenticazione JWT, join/leave rooms, send_message, typing, read receipts)
- Supporta conversazioni dirette e di gruppo
- socket.io-client gia presente in package.json

### Prossimo: VideoLibraryView (step 31/35)

## [Step 29/35] - ClassesView — Gestione classi di gruppo, sessioni e iscrizioni

### Backend
- **`backend/src/services/class.service.js`** (NUOVO ~250 righe) — Service con metodi: getClasses (paginato), getClassById, createClass, updateClass, deleteClass, getSessions (filtri status/data/classe), getSessionById (con enrollments), createSession, updateSessionStatus, deleteSession, enrollClient (con logica waitlist automatica), cancelEnrollment (con promozione waitlist), checkInClient, markNoShow, getClientSessions
- **`backend/src/controllers/class.controller.js`** (NUOVO ~200 righe) — Controller con _resolveClientId helper, 14 handler (CRUD classi + CRUD sessioni + gestione iscrizioni + check-in/no-show + le mie classi)
- **`backend/src/routes/class.routes.js`** (MODIFICA da placeholder) — 14 endpoints: GET/POST/PUT/DELETE classi, GET/POST/PUT/DELETE sessioni, POST enroll/cancel/checkin/noshow, GET /my

### Frontend
- **`frontend/src/store/classes.js`** (NUOVO ~220 righe) — Pinia store con state per classes, sessions, currentSession, myClasses (ognuno con paginazione), actions per CRUD classi/sessioni, iscrizioni, check-in
- **`frontend/src/views/booking/ClassesView.vue`** (MODIFICA ~600 righe) — 3 tab (Sessioni/Gestione Classi/Le Mie), filtri status sessione, lista sessioni con date-box + posti disponibili + waitlist count, gestione classi con grid card (trainer), le mie iscrizioni con enrollment status, 3 modali Teleport (crea classe, crea sessione, dettaglio sessione con iscritti + azioni check-in/no-show/stato)

### Prossimo: ChatView (step 30/35)

---

## [2026-02-07] - Implementazione TitlesView (Titoli)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | TitlesView.vue | Implementata vista titoli (~250 righe) con raggruppamento per esercizio, filtri, titolo attivo, sblocco |

### Dettaglio TitlesView.vue

- **Titolo attivo**: card evidenziata con bordo oro, nome/descrizione, bottone rimuovi
- **Filtri**: pill buttons per categoria (Forza/Costanza/Trasformazione/Personalizzato) + toggle "Solo sbloccati"
- **Raggruppamento**: titoli raggruppati per esercizio con progress bar (sbloccati/totali)
- **Griglia titoli**: card con badge rarita (5 livelli), nome, descrizione, soglia (threshold + metric_type)
- **Stato sblocco**: titoli sbloccati con bordo colorato, non sbloccati con lucchetto e opacita ridotta
- **Azione "Mostra"**: imposta titolo come attivo (SET displayed)
- **Client selector**: per trainer, con reload dati al cambio

### Stato Progresso

- **Viste implementate**: 28/35
- **Prossimo step**: ClassesView

---

## [2026-02-07] - Implementazione ChallengesView (Sfide)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | ChallengesView.vue | Implementata vista sfide (~400 righe) con lista filtrata, creazione, dettaglio modale, join/withdraw |

### Dettaglio ChallengesView.vue

- **Filtri status**: pill buttons Attive/In arrivo/Passate/Tutte
- **Lista sfide**: card con nome, tipo badge (5 tipi con emoji), descrizione, date, giorni rimanenti, XP reward, partecipanti
- **Barra progresso**: per partecipanti attivi (current/target con %)
- **Badge partecipazione**: Iscritto (verde), Completato (blu), Non riuscito (rosso), Ritirato (grigio)
- **Modale Crea Sfida** (trainer+): form con nome, descrizione, tipo (select), obiettivo, date inizio/fine, XP reward
- **Modale Dettaglio**: info sfida completa, griglia stats (obiettivo/XP/date), bottone Join/Withdraw, lista partecipanti con ranking e progresso
- **Paginazione**, loading skeleton, empty state contestuale

### Nota

Backend e store gia implementati nello step GamificationView

### Stato Progresso

- **Viste implementate**: 27/35
- **Prossimo step**: TitlesView

---

## [2026-02-07] - Implementazione LeaderboardView (Classifica)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | LeaderboardView.vue | Implementata vista classifica (~180 righe) con podio top 3, tabella ranking, paginazione |

### Dettaglio LeaderboardView.vue

- **Podio Top 3**: layout visivo con medaglie oro/argento/bronzo, avatar, livello, XP
- **Tabella ranking**: griglia 12 colonne con rank, avatar+nome, livello (colore per tier), badge count, XP
- **Stile rank**: medaglie emoji per top 3, sfondo colorato per posizioni podio
- **Livello colorato**: grigio (<5), blu (5-9), viola (10-19), oro (20+)
- **Streak badge**: indicatore giorni consecutivi per ogni cliente
- **Paginazione**: navigazione pagine
- **Loading skeleton**: 5 righe animate
- **Empty state**: messaggio quando non ci sono dati
- **Link back**: ritorno a /gamification

### Nota

Backend e store gia implementati nello step GamificationView (GET /gamification/leaderboard + fetchLeaderboard)

### Stato Progresso

- **Viste implementate**: 26/35
- **Prossimo step**: ChallengesView

---

## [2026-02-07] - Implementazione GamificationView (Dashboard Gamification)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Backend gamification | Creato gamification.service.js (~300 righe, 17 metodi), gamification.controller.js (~190 righe, 14 handler), aggiornato gamification.routes.js con 14 endpoint |
| 2 | Backend title | Creato title.service.js (~80 righe, 4 metodi), title.controller.js (~80 righe, 4 handler), aggiornato title.routes.js con 4 endpoint |
| 3 | Store gamification.js | Nuovo Pinia store (~250 righe) con dashboard, achievements, XP, challenges, titles, leaderboard |
| 4 | GamificationView.vue | Implementata dashboard gamification (~350 righe) con 7 sezioni: hero stats, achievements, categorie, sfide, XP log, navigazione |

### Dettaglio Backend

**gamification.service.js (17 metodi):**
- getDashboard: XP, livello, streak, conteggi badge/titoli/sfide attive
- getRecentAchievements/getAchievementsByCategory/getAllAchievements: gestione achievements con filtri e progresso
- getRecentXPActivity/getXPHistory/addXP: transazioni XP con paginazione, formula livello (XP/100+1)
- getActiveChallengesPreview/getChallenges/getChallengeById: sfide con progresso e partecipanti
- createChallenge/joinChallenge/withdrawFromChallenge: gestione sfide
- getLeaderboard: classifica clienti per XP con ranking

**title.service.js (4 metodi):**
- getTitles: lista titoli con stato sblocco (LEFT JOIN client_titles + exercises)
- getTitleById/getDisplayedTitle/setDisplayedTitle: gestione titolo mostrato

**gamification.routes.js (14 endpoint):**
- GET /dashboard, /achievements, /achievements/categories, /achievements/recent
- GET /xp/recent, /xp/history, POST /xp/bonus (requireRole)
- GET /leaderboard
- GET /challenges, /challenges/active, /challenges/:id, POST /challenges (requireRole), /challenges/:id/join, /challenges/:id/withdraw

**title.routes.js (4 endpoint):**
- GET /, /displayed, PUT /displayed, GET /:id

### Dettaglio GamificationView.vue

- **Stats Hero Card**: badge livello circolare con gradient, barra XP progress, streak badge, 3 mini stat (badge/titoli/sfide)
- **Ultimi Obiettivi Sbloccati**: scroll orizzontale di card con bordo colorato per rarita (5 livelli)
- **Obiettivi per Categoria**: grid 2x3 con progress bar per 6 categorie (workout, consistency, strength, progress, social, special)
- **Sfide in Corso**: max 3 card con barra progresso, giorni rimanenti, XP reward
- **Attivita XP Recente**: lista timeline con dot colorati, emoji tipo, descrizione, punti +/- colorati
- **Navigazione Rapida**: 3 card link a Classifica, Sfide, Titoli
- **Client selector**: per trainer, con auto-reload dati al cambio cliente
- **Loading skeleton**: stato caricamento animato

### Stato Progresso

- **Viste implementate**: 25/35
- **Prossimo step**: LeaderboardView

---

## [2026-02-06] - Implementazione CommunityView (Social Feed)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Backend community | Creato community.service.js (9 metodi CRUD), community.controller.js (10 handler), aggiornato community.routes.js con 10 endpoint |
| 2 | Store community.js | Nuovo Pinia store (~190 righe) con gestione post, commenti, like, filtri tipo, paginazione |
| 3 | CommunityView.vue | Implementato social feed (~440 righe) con feed post, like/unlike, commenti, creazione post, filtri tipo |

### Dettaglio Backend

**community.service.js (9 metodi):**
- getPosts: feed paginato con user_liked, post pinnati in cima, filtro per tipo
- getPostById: dettaglio post con array commenti e info autore
- createPost/updatePost/deletePost: CRUD completo
- togglePin: pin/unpin post (trainer+)
- likePost/unlikePost: gestione like con contatore
- addComment/deleteComment: gestione commenti con contatore

**community.routes.js (10 endpoint):**
- GET/POST /posts, GET/PUT/DELETE /posts/:id
- PUT /posts/:id/pin (requireRole)
- POST/DELETE /posts/:id/like
- POST /posts/:id/comments
- DELETE /comments/:commentId

### Dettaglio CommunityView.vue

- **Feed post**: cards con avatar autore, badge tipo (5 tipi con colori), timestamp relativo, contenuto, azioni
- **5 tipi post**: Annunci (blu), Consigli (verde), Motivazione (giallo), Traguardi (viola), Domande (cyan)
- **Pin**: post fissati in alto con bordo cyan, toggle pin per trainer+
- **Like/Unlike**: cuore con toggle, aggiornamento locale immediato
- **Commenti**: modale dettaglio con lista commenti, input inline con invio Enter
- **Filtri**: pill buttons per tipo post con contatore
- **Crea post**: modale con selezione tipo e textarea contenuto
- **Elimina**: conferma modale per post (trainer+) e commenti (autore o trainer)
- **Paginazione**: navigazione pagine per feed lungo
- **Loading skeleton**: 3 card placeholder animate
- **Badge Trainer**: etichetta per post di tenant_owner/staff

### Stato Progresso

- **Viste implementate**: 24/35
- **Prossimo step**: GamificationView

---

## [2026-02-06] - Implementazione AnalyticsView (Dashboard Statistiche)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Backend analytics | Creato analytics.service.js (7 query aggregate), analytics.controller.js (7 handler), aggiornato analytics.routes.js con 7 endpoint |
| 2 | Store analytics.js | Nuovo Pinia store (~130 righe) con 7 fetch paralleli, toggle trend groupBy |
| 3 | AnalyticsView.vue | Implementata dashboard analytics (~330 righe) con 6 sezioni dati, grafici CSS |

### Dettaglio Backend

**analytics.service.js (7 metodi aggregate):**
- getOverview: clienti (attivi, nuovi 30gg), sessioni (totali, completate, media durata), appuntamenti, programmi
- getSessionTrend: trend sessioni per giorno/settimana/mese (ultimi 12 periodi)
- getTopClients: top 10 clienti per sessioni completate (30gg)
- getAppointmentDistribution: distribuzione per tipo appuntamento (30gg)
- getReadinessTrend: media readiness giornaliera (30gg)
- getProgramCompletion: distribuzione stati programmi
- getQuickStats: statistiche rapide odierne

### Dettaglio AnalyticsView.vue

**Sezioni implementate:**
1. 4 Stat Cards: Clienti attivi, Sessioni completate, Tasso completamento (%), Programmi attivi
2. Trend Sessioni: Grafico barre CSS con toggle Giorno/Settimana/Mese, barre sovrapposte
3. Distribuzione Appuntamenti: Progress bar per tipo con colori
4. Top 10 Clienti: Classifica con avatar, livello/XP, sessioni, minuti
5. Stato Programmi: Progress bar per stato con colori
6. Trend Readiness (30gg): Barre colorate per score (verde/giallo/rosso)
7. Riepilogo Oggi: 4 metriche odierne

**Stato progetto aggiornato:** 23/35 views implementate
- [x] analytics/AnalyticsView.vue (NUOVO - sostituito placeholder)

---

## [2026-02-06] - Implementazione CalendarView (Calendario Appuntamenti)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Backend booking | Creato booking.service.js (CRUD appuntamenti + disponibilita + slot), booking.controller.js (10 handler), aggiornato booking.routes.js con 10 endpoint |
| 2 | Store booking.js | Nuovo Pinia store (~200 righe, Composition API) con navigazione calendario, computed weekDates/monthDates, filtri, 14 actions |
| 3 | CalendarView.vue | Implementata vista calendario (~530 righe) con vista settimana/mese, appuntamenti colorati per tipo, 3 modali |

### Dettaglio Backend

**booking.service.js:**
- getAppointments: lista paginata con JOIN a clients e users, filtri clientId/trainerId/status/startDate/endDate
- getAppointmentById: dettaglio con dati client/trainer
- createAppointment/updateAppointment/deleteAppointment: CRUD completo
- updateAppointmentStatus: cambio stato (scheduled/confirmed/completed/cancelled/no_show)
- getAvailability/setAvailability: gestione pattern disponibilita trainer per giorno settimana
- getAvailableSlots: calcolo slot liberi per trainer/data (incrocia disponibilita con appuntamenti esistenti)
- getTodayAppointments: appuntamenti odierni per dashboard

**booking.routes.js (10 endpoint):**
- GET /api/booking/today - Appuntamenti odierni
- GET /api/booking/slots - Slot disponibili (trainerId + date)
- GET/POST /api/booking/appointments - Lista/Crea appuntamenti
- GET/PUT/DELETE /api/booking/appointments/:id - Dettaglio/Aggiorna/Elimina
- PUT /api/booking/appointments/:id/status - Cambio stato
- GET /api/booking/availability/:userId - Disponibilita trainer
- POST /api/booking/availability - Imposta disponibilita

### Dettaglio CalendarView.vue

**Funzionalita implementate:**
- Toolbar con navigazione (prev/next/oggi), label periodo, toggle Settimana/Mese
- Filtri: select cliente, select trainer
- Vista Settimana: griglia 7 colonne, header con giorno/numero, appuntamenti colorati per tipo (bordo sinistro), pulsante "+" per ogni giorno
- Vista Mese: griglia calendar con dot colorati, max 3 appuntamenti visibili + "+N altri"
- Highlight giorno corrente (sfondo cyan)
- Appuntamenti colorati per tipo: Allenamento (cyan), Valutazione (viola), Consulenza (verde)
- Modale Creazione: cliente, trainer, data, ora inizio/fine, tipo, luogo, note
- Modale Dettaglio: tutte le info + azioni stato (Conferma, Completato, Annulla, Elimina)
- Modale Eliminazione con conferma
- Legenda colori sotto il calendario
- Skeleton loading animato

**Stato progetto aggiornato:** 22/35 views implementate
- [x] booking/CalendarView.vue (NUOVO - sostituito placeholder)

---

## [2026-02-06] - Implementazione ProgramsView e ProgramDetailView

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Backend programmi | Creato program.service.js (CRUD completo + workout management), program.controller.js (8 handler), aggiornato program.routes.js con 8 endpoint |
| 2 | Store program.js | Nuovo Pinia store (195 righe, Composition API) con 15 actions: fetchClients, fetchPrograms, fetchProgramById, createProgram, updateProgram, deleteProgram, updateStatus, fetchWorkoutTemplates, addWorkout, removeWorkout, setFilter, resetFilters, setPage, clearCurrentProgram, initialize |
| 3 | ProgramsView.vue | Implementata lista programmi (~390 righe) con filtri client/status, card list, create/delete modali, azioni stato, paginazione |
| 4 | ProgramDetailView.vue | Implementato dettaglio programma (~493 righe) con info card editabile, workout organizzati per settimana, add/remove workout modali |

### Dettaglio Backend

**program.service.js:**
- getAll: lista paginata con JOIN a clients e users, filtri clientId/status
- getById: dettaglio con array workouts (JOIN program_workouts + workouts)
- create/update/delete: CRUD completo con tenant isolation
- addWorkout/removeWorkout: gestione workout nel programma
- updateStatus: cambio stato (draft/active/completed/cancelled)

**program.routes.js (8 endpoint):**
- GET /api/programs - Lista programmi (paginata, filtri)
- GET /api/programs/:id - Dettaglio con workouts
- POST /api/programs - Crea programma
- PUT /api/programs/:id - Aggiorna programma
- DELETE /api/programs/:id - Elimina programma
- PUT /api/programs/:id/status - Cambio stato
- POST /api/programs/:id/workouts - Aggiungi workout
- DELETE /api/programs/:id/workouts/:workoutId - Rimuovi workout

### Dettaglio ProgramsView.vue

**Funzionalita implementate:**
- Header con titolo e pulsante "Nuovo Programma"
- Filtri: select cliente, select stato, reset filtri
- Lista programmi: icona, nome (link a dettaglio), nome cliente, settimane, giorni/sett, date
- Badge stato colorati: Bozza (giallo), Attivo (verde), Completato (blu), Annullato (rosso)
- Azioni rapide: attiva (da bozza), completa (da attivo), dettaglio, elimina
- Skeleton loading con 4 card animate
- Empty state con messaggio contestuale (filtri attivi o nessun programma)
- Modale creazione: nome, cliente, descrizione, data inizio, settimane, giorni/sett
- Modale eliminazione con conferma
- Paginazione con contatore pagine
- Navigazione automatica al dettaglio dopo creazione

### Dettaglio ProgramDetailView.vue

**Funzionalita implementate:**
- Header con back button, nome programma, nome cliente, badge stato
- Pulsanti azione stato: Attiva (da bozza), Completa (da attivo)
- Card Informazioni: nome, cliente, stato, settimane, giorni/sett, periodo, descrizione
- Modifica inline: form editabile con salvataggio via store
- Sezione Schede Allenamento: workout raggruppati per settimana
- Ogni workout mostra: giorno settimana (badge), nome template, giorno, data, note
- Empty state per nessuna scheda con CTA
- Modale Aggiungi Workout: select template, settimana, giorno (Lun-Dom), note
- Modale Rimuovi Workout con conferma
- Messaggi successo con auto-hide 3 secondi
- Watch su route.params.id per navigazione tra programmi

**Stato progetto aggiornato:** 21/35 views implementate
- [x] programs/ProgramsView.vue (NUOVO - sostituito placeholder)
- [x] programs/ProgramDetailView.vue (NUOVO - sostituito placeholder)

---

## [2026-02-06] - Implementazione SettingsView e ProfileView

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi backend user/auth | Letto user.service.js, user.routes.js, auth.routes.js, auth.service.js - endpoint PUT /users/:id, POST /auth/change-password, GET /users |
| 2 | ProfileView.vue | Implementata vista profilo utente (~287 righe) con display info, edit inline, cambio password, zona pericolosa |
| 3 | SettingsView.vue | Implementata vista impostazioni (~265 righe) con info account, abbonamento, lista team, link rapidi |

### Dettaglio ProfileView.vue

**Funzionalita implementate:**
- Card Informazioni Personali con avatar iniziali (gradient), nome, badge ruolo colorato
- Display: email, telefono, stato (badge colorato), ultimo accesso, membro dal
- Modifica inline: form con nome, cognome, telefono (email non modificabile)
- Salvataggio via PUT /api/users/:id con aggiornamento locale auth store
- Card Cambio Password: password attuale, nuova, conferma
- Validazione: minimo 8 caratteri, match conferma, tutti obbligatori
- Cambio password via POST /api/auth/change-password
- Messaggi successo/errore con auto-hide 3 secondi
- Zona Pericolosa: pulsante disconnetti tutti i dispositivi
- Badge ruolo: Titolare (cyan), Collaboratore (blu), Cliente (verde), Super Admin (viola)

### Dettaglio SettingsView.vue

**Funzionalita implementate:**
- Card Info Account: nome, email, ruolo (badge), data registrazione
- Card Abbonamento: piano (badge colorato: Free/Starter/Pro/Enterprise), stato (attivo/prova/scaduto), max clienti
- Avviso trial con data scadenza (se in prova)
- Card Team (solo tenant_owner/super_admin): lista membri con avatar, nome, email, badge stato e ruolo
- Fetch team via GET /api/users con skeleton loading
- Card Link Rapidi (griglia 2x2): Modifica Profilo, Dashboard, Gestisci Clienti, Esci
- Icone SVG per ogni link rapido
- Pulsante header "Modifica Profilo" per navigazione rapida

**Stato progetto aggiornato:** 19/35 views implementate
- [x] settings/ProfileView.vue (NUOVO - sostituito placeholder)
- [x] settings/SettingsView.vue (NUOVO - sostituito placeholder)

---

## [2026-02-06] - Implementazione ReadinessView (Check-in Giornaliero Readiness)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi backend readiness | Letto readiness.service.js (calcolo readiness score pesato, upsert check-in, medie, alert bassa readiness), readiness.controller.js, readiness.routes.js - 4 endpoint: today, history, average, save |
| 2 | Creazione store/readiness.js | Nuovo Pinia store (148 righe, Composition API) con gestione check-in oggi, storico, medie 7 giorni |
| 3 | ReadinessView.vue | Implementata vista completa readiness (~465 righe) con 2 tab, form inline con slider, display readiness score |

### Dettaglio ReadinessView.vue

**Funzionalita implementate:**
- Selettore cliente prominente con auto-selezione primo cliente
- 2 Tab navigabili: Check-in Oggi, Storico
- Lazy loading dati per tab (storico caricato solo al click)

**Tab Check-in Oggi:**
- 4 Stats Cards medie 7 giorni: Readiness Score (colorato per livello), Sonno, Energia, Stress
- Display check-in esistente con:
  - Badge circolare readiness score (0-100) con bordo colorato per livello
  - Etichette: Critico (<40, rosso), Basso (40-60, arancione), Moderato (60-75, giallo), Ottimo (>75, verde)
  - Griglia 6 metriche: Qualita Sonno, Ore Sonno, Energia, Stress, Indolenzimento, Motivazione
  - Umore con emoji + label
  - Note opzionali
  - Pulsante "Modifica" per aggiornare check-in esistente
- Form inline (non modal) per nuovo check-in o modifica:
  - 5 Range Slider (1-10): Qualita Sonno, Energia, Stress, Indolenzimento, Motivazione
  - Slider con accent color personalizzato (cyan per metriche positive, amber per negative)
  - Labels descrittivi agli estremi (es: "Rilassato" / "Molto stressato")
  - Valore corrente mostrato in tempo reale
  - Input numerico Ore Sonno (step 0.5)
  - Selettore Umore: 5 pill buttons con emoji (Terribile/Male/Neutrale/Bene/Ottimo)
  - Textarea Note opzionale
  - Pre-fill form dai dati esistenti in modalita modifica

**Tab Storico:**
- Filtro per data (range start/end) con pulsante "Filtra"
- Tabella: Data, Readiness (colorato), Sonno, Ore, Energia, Stress, Indolenzimento, Motivazione, Umore (emoji)
- Limite 30 record
- Empty state

**UX/UI:**
- Readiness score auto-calcolato dal backend (formula pesata: sonno 25%, ore sonno 15%, energia 20%, stress 15% invertito, indolenzimento 15% invertito, motivazione 10%)
- Upsert: POST su stessa data aggiorna il check-in esistente (UNIQUE constraint client_id + checkin_date)
- Alert automatico se media readiness < 50 negli ultimi 3 giorni (backend)
- Saving state con button disabled
- Error banner inline
- Skeleton loading animato
- Stile coerente tema dark (classi habit-*)

**Nuovo store creato:**
- `store/readiness.js` - Pinia store Composition API
- State: clients, selectedClientId, loading, error, todayCheckin, history, averages, activeTab
- 7 Actions: fetchClients, fetchTodayCheckin, fetchAverages, fetchHistory, saveCheckin, setClient, initialize
- setClient carica in parallelo: today + averages (Promise.all)

**Stato progetto aggiornato:** 17/35 views implementate
- [x] readiness/ReadinessView.vue (NUOVO - sostituito placeholder)

---

## [2026-02-06] - Implementazione MeasurementsView (Misurazioni Corporee)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi backend measurements | Letto measurement.service.js (232 righe), measurement.controller.js (144 righe), measurement.routes.js - API completa CRUD body, circumferences, skinfolds, BIA + weight-change + getAllProgress |
| 2 | Creazione store/measurement.js | Nuovo Pinia store (268 righe, Composition API) con gestione 4 tipi misurazioni, clienti, overview, weight change |
| 3 | MeasurementsView.vue | Implementata vista completa misurazioni corporee (~500 righe) con 5 tab, 4 modali form, overview cards, tabelle dati |

### Dettaglio MeasurementsView.vue

**Funzionalita implementate:**
- Selettore cliente prominente con auto-selezione primo cliente
- 5 Tab navigabili: Panoramica, Peso & Body, Circonferenze, Plicometria, BIA
- Lazy loading dati per tab (carica solo al click)

**Tab Panoramica (Overview):**
- Weight Change Card: peso attuale, variazione kg/%, indicatori colore (verde calo, rosso aumento)
- 4 Summary Cards (griglia 2x2): ultima misurazione body, circonferenze, plicometria, BIA
- Pulsante "+ Aggiungi" su ogni card per inserimento rapido
- Valori formattati (kg, %, cm) con fallback "-"

**Tab Peso & Body:**
- Tabella: Data, Peso (kg), % Grasso, Massa Muscolare (kg), Note
- Pulsante "+ Misurazione" per aggiunta

**Tab Circonferenze:**
- Tabella: Data, Vita, Fianchi, Spalle, Petto, Bicipite, Coscia, Rapporto V/F
- Rapporto V/F evidenziato in cyan

**Tab Plicometria:**
- Tabella: Data, Petto, Addominale, Coscia, Tricipite, Somma Totale, % BF
- Somma e BF% calcolati automaticamente dal backend

**Tab BIA (Bioimpedenza):**
- Tabella: Data, Massa Magra (kg), Massa Grassa (%), Acqua (%), Muscolo (kg), BMR, Grasso Viscerale
- Acqua in blu, grasso in arancione

**4 Modali Form (Teleport to body):**
- Body: data, peso, % grasso, massa muscolare, note
- Circonferenze: data, 9 misure in cm (vita, fianchi, spalle, petto, bicipite, bic. flesso, coscia sup/inf, glutei), note
- Plicometria: data, 9 pliche in mm (petto, sottoscapolare, soprailiacale, addominale, coscia, bicipite, tricipite, guancia, polpaccio), note
- BIA: data, dispositivo, 10 valori (massa magra kg/%, grassa kg/%, acqua L/%, muscolo, BMR, viscerale, massa ossea), note

**UX/UI:**
- Reset form ad ogni apertura modal
- Saving state con button disabled
- Chiusura modal su click overlay o "Annulla"
- Error banner inline
- Skeleton loading animato
- Empty state per ogni tab
- Stile coerente tema dark (classi habit-*)

**Nuovo store creato:**
- `store/measurement.js` - Pinia store Composition API
- State: clients, selectedClientId, loading, error, progress, weightChange, bodyMeasurements, circumferences, skinfolds, biaMeasurements, activeTab
- 12 Actions: fetchClients, fetchAllProgress, fetchBodyMeasurements, addBodyMeasurement, fetchCircumferences, addCircumferences, fetchSkinfolds, addSkinfolds, fetchBia, addBia, setClient, initialize
- Dopo ogni add: refetch overview (fetchAllProgress) + refetch lista specifica

**Stato progetto aggiornato:** 16/35 views implementate
- [x] measurements/MeasurementsView.vue (NUOVO)

---

## [2026-02-06] - Implementazione MealPlannerView (Builder Piani Alimentari)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Modifica store/nutrition.js | Aggiunto currentPlan, planLoading, dayTotals + 13 nuove actions per CRUD giorni, pasti, alimenti |
| 2 | MealPlannerView.vue | Implementata vista completa builder piani alimentari (~850 righe) con struttura gerarchica giorni > pasti > alimenti |
| 3 | Aggiornamento router | Corretto path route MealPlanner da /:clientId? a /:planId |

### Dettaglio MealPlannerView.vue

**Funzionalita implementate:**
- Header con back button, nome piano, badge status, nome cliente
- Pulsante "Modifica Info" e "Attiva Piano" (per bozze)
- Info Card piano con: date inizio/fine, numero giorni, status, target macro (kcal, P, C, F con badge colorati), note
- Form edit inline per info piano: nome, date, target macro, note
- **Struttura gerarchica Giorni > Pasti > Alimenti:**

**Giorni (accordion espandibili):**
- Header cliccabile con chevron rotante, numero/nome giorno, conteggio pasti
- Badge macro totali giorno (calcolati localmente): kcal, P, C, F con colori semantici
- Badge macro anche su mobile (riga separata)
- Pulsante elimina giorno con conferma
- Form "Aggiungi Giorno": numero, nome opzionale, note

**Pasti (dentro ogni giorno):**
- Header pasto: tipo (7 opzioni: Colazione, Spuntino Mattina, Pranzo, ecc.), nome opzionale, totale kcal
- Pulsante "+ Alimento" per aggiungere inline
- Pulsante elimina pasto con conferma
- Form "Aggiungi Pasto": tipo pasto, nome, note

**Alimenti (tabella per ogni pasto):**
- Tabella compatta: Alimento, Quantita+unita, Kcal, P, C, F + pulsante elimina
- Riga totale pasto con somme macro
- Unita disponibili: g, ml, pz, cucchiaio, tazza
- Form "Aggiungi Alimento": nome, quantita, unita, calorie, proteine, carboidrati, grassi, fibre
- Pulsante elimina alimento con conferma

**Altre feature:**
- Calcolo totali macro giorno e pasto lato frontend (real-time)
- Editabilita condizionata: solo piani draft/active sono modificabili
- Modal conferma eliminazione unificato (giorno/pasto/alimento) con messaggi specifici
- Primo giorno espanso di default
- Auto-incremento dayNumber per nuovo giorno
- Skeleton loading, error state, error banner
- clearCurrentPlan su unmount

**Modifiche allo store:**
- `store/nutrition.js` +180 righe: currentPlan, planLoading, dayTotals
- 13 nuove actions: fetchPlanById, updatePlan, addDay, updateDay, deleteDay, addMeal, updateMeal, deleteMeal, addMealItem, updateMealItem, deleteMealItem, fetchDayTotals, clearCurrentPlan

**Modifiche al router:**
- Route MealPlanner: path aggiornato a `/nutrition/planner/:planId` (era `/:clientId?`)

---

## [2026-02-06] - Implementazione SessionDetailView (Dettaglio Sessione Allenamento)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Modifica store/session.js | Aggiunto currentSession, detailLoading + 4 nuove actions: fetchSessionById, logSet, completeSession, clearCurrentSession |
| 2 | SessionDetailView.vue | Implementata vista completa dettaglio sessione (~730 righe) con log set inline, completamento, skip |

### Dettaglio SessionDetailView.vue

**Funzionalita implementate:**
- Header con back button, nome scheda (template_name), badge status colorato, nome cliente
- Info Card adattiva per status:
  - **In Progress**: data inizio, durata attuale (timer live aggiornato ogni 30s), status badge
  - **Completed**: data inizio/fine, durata, XP guadagnati (con icona stella), sensazione con emoji, note
  - **Skipped**: status badge rosso, data, motivo skip
- Progress Bar animata: set completati / set totali prescritti con percentuale
- Lista Esercizi con per ogni esercizio:
  - Header: numero ordinale, nome esercizio, prescrizione (es: "3 x 6-8 @ 80kg"), badge set counter
  - Note esercizio (se presenti)
  - Tabella Set con colonne: Set#, Reps, Peso (kg), RPE (colorato per intensita), Warmup (emoji fuoco), Failure (emoji warning), Note
  - Form inline per nuovo set (solo in_progress): inputs compatti + pulsante "Salva"
  - Auto-incremento set number dopo ogni log
- RPE colorato: verde (<7), giallo (7-8), rosso (9-10)
- Azioni footer ridondanti per accessibilita mobile
- Modal "Completa Sessione":
  - Feeling selector: 5 pill buttons con emoji (Terribile/Male/Ok/Bene/Ottimo)
  - Note opzionali (textarea)
  - Riepilogo: n. esercizi, set completati, durata attuale
  - POST /api/sessions/:id/complete con overallFeeling + notes
- Modal "Salta Sessione":
  - Motivo opzionale (textarea)
  - POST /api/sessions/:id/skip con reason
- Skeleton loading (4 blocchi animati)
- Error state con back button
- Error banner inline per errori durante log set
- Timer live pulito su unmount (clearInterval)
- clearCurrentSession su unmount per evitare stale data

**Modifiche allo store:**
- `store/session.js` +65 righe: currentSession (ref), detailLoading (ref)
- Nuove actions: fetchSessionById (GET /sessions/:id), logSet (POST /sessions/:id/set), completeSession (POST /sessions/:id/complete), clearCurrentSession (reset)

---

## [2026-02-06] - Implementazione NutritionView (Gestione Piani Alimentari)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi backend nutrition | Letto nutrition.service.js (414 righe), nutrition.controller.js, nutrition.routes.js - API completa CRUD piani, giorni, pasti, alimenti + summary cliente |
| 2 | Creazione store/nutrition.js | Nuovo Pinia store con gestione piani, clienti, summary, filtri, paginazione offset-based |
| 3 | NutritionView.vue | Implementata vista completa gestione piani alimentari (~800 righe) con filtri, summary cards, CRUD inline, modal creazione/eliminazione |

### Dettaglio NutritionView.vue

**Funzionalita implementate:**
- Lista piani alimentari di tutti i clienti del tenant (filtro cliente opzionale)
- Filtro per cliente con summary cards macro quando selezionato
- Filtro per status (Bozza / Attivo / Completato / Archiviato)
- Reset filtri button
- 4 Summary Cards (visibili con cliente selezionato):
  - Piani Totali, Calorie Target (kcal), Proteine Target (g), Macro Split Carbo/Grassi
- Avviso "Nessun piano attivo" con stile warning giallo
- Card list piani con:
  - Nome piano + badge status colorato
  - Nome cliente (se vista "tutti i clienti")
  - Date inizio/fine, nome creatore, data creazione
  - Badge macro target (kcal, P, C, F) con colori distinti
  - Azione "Attiva" (per bozze) -> PUT status=active
  - Azione "Archivia" (per attivi/completati) -> PUT status=archived
  - Azione "Elimina" -> modal conferma
  - Click card -> navigazione a /nutrition/planner/:planId
- Modal "Nuovo Piano Alimentare":
  - Selezione cliente, nome piano (obbligatori)
  - Date inizio/fine (opzionali)
  - Target macro giornalieri: calorie, proteine, carboidrati, grassi
  - Note
  - Creazione come "Bozza" -> POST /api/nutrition/plans
- Modal "Elimina Piano" con conferma
- Paginazione offset-based (hasMore detection)
- Empty state con CTA "Crea il primo piano"
- Skeleton loading (6 card animate)
- Error banner

**Nuovo store creato:**
- `store/nutrition.js` - Pinia store con: plans, clients, summary, filters (clientId, status), pagination (offset-based)
- Actions: fetchClients, fetchPlans, fetchSummary, createPlan, updatePlanStatus, deletePlan, setClientFilter, setFilter, resetFilters, setPage, initialize

---

## [2026-02-06] - Implementazione SessionsView (Gestione Sessioni Allenamento)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi backend session | Letto session.service.js, session.controller.js, session.routes.js - API completa con getByClient, getStats, start, logSet, complete, skip |
| 2 | Creazione store/session.js | Nuovo Pinia store (Composition API) con gestione sessioni, clienti, stats, filtri, paginazione |
| 3 | Creazione SessionDetailView.vue | Placeholder per evitare errore router |
| 4 | SessionsView.vue | Implementata vista completa gestione sessioni (~580 righe) con selettore cliente, stats, filtri, lista sessioni, modal avvio/salta |
| 5 | Aggiornamento router/index.js | Aggiunte route /sessions e /sessions/:id con lazy loading e role guard |

### Dettaglio SessionsView.vue

**Funzionalita implementate:**
- Selettore cliente prominente con auto-selezione primo cliente
- 4 Stats Cards: Sessioni Totali, Completate (con tasso %), Durata Media, XP Guadagnati
- Toggle periodo statistiche (Settimana / Mese / Anno) con pill buttons
- Filtri: stato sessione (Pianificata/In Corso/Completata/Saltata), data da, data a
- Reset filtri button
- Lista sessioni come card list (non grid):
  - Nome scheda, categoria badge, data/ora, durata, XP guadagnati
  - Badge status con colori (grigio=pianificata, cyan=in corso, verde=completata, rosso=saltata)
  - Azione "Salta" per sessioni attive/pianificate
  - Click su card naviga a /sessions/:id
- Modal "Avvia Sessione": selezione cliente + scheda allenamento -> POST /api/sessions
- Modal "Salta Sessione": textarea motivo opzionale -> POST /api/sessions/:id/skip
- Paginazione completa
- Empty state con CTA "Avvia prima sessione"
- Skeleton loading (6 card animate)
- Error banner con messaggio
- Stile coerente con tema dark (classi habit-*)

**Nuovo store creato:**
- `store/session.js` - Pinia store con: sessions, clients, workoutTemplates, stats, filters, pagination, statsPeriod
- Actions: fetchClients, fetchSessions, fetchStats, fetchWorkoutTemplates, startSession, skipSession, setClient, setFilter, resetFilters, setPage, setStatsPeriod, initialize
- Getters: hasFilters, statusOptions, completionRate

**Modifiche al router:**
- Aggiunto import lazy SessionsView e SessionDetailView
- Aggiunte 2 route: /sessions (lista) e /sessions/:id (dettaglio)
- Role guard: tenant_owner, staff, super_admin

---

## [2026-02-06] - Implementazione WorkoutBuilderView (Builder Schede Allenamento)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi backend workout | Letto workout.service.js, workout.controller.js, workout.routes.js per capire API e payload attesi |
| 2 | Analisi componenti riusabili | Letto ExerciseCard.vue, ExerciseModal.vue, exercise.js store per integrazione nel builder |
| 3 | Piano implementazione | Pianificata architettura: form info + lista esercizi inline + pannello laterale exercise picker |
| 4 | WorkoutBuilderView.vue | Implementata vista completa builder schede (~794 righe) con modalita create/edit, exercise picker, parametri inline |

### Dettaglio WorkoutBuilderView.vue

**Funzionalita implementate:**
- Doppia modalita: Create (`/workouts/builder`) ed Edit (`/workouts/builder/:id`)
- Form info scheda: nome, descrizione, categoria (7 opzioni), difficolta (3 livelli), durata stimata
- Lista esercizi con parametri inline editabili:
  - Serie, Rep Min, Rep Max
  - Tipo Peso (Fisso kg / % 1RM / RPE / Corpo libero) con campo peso nascosto per "corpo libero"
  - Recupero (secondi)
  - Tempo (es. 3-1-2-0)
  - Gruppo Superset (lettera A-E)
  - Toggle Riscaldamento
  - Note testuali
- Riordinamento esercizi con pulsanti su/giu
- Rimozione esercizi con conferma visiva
- Pannello laterale Exercise Picker (slide-in da destra, z-40):
  - Ricerca testuale con debounce 300ms
  - Filtro per gruppo muscolare (dal Pinia store)
  - Filtro per categoria (dal Pinia store)
  - Griglia ExerciseCard responsive
  - Click su card apre ExerciseModal (z-50)
  - Click "Seleziona" aggiunge esercizio alla lista con valori default
  - Paginazione interna al pannello
- Validazione: nome obbligatorio, almeno 1 esercizio
- Salvataggio: POST /api/workouts (create) o PUT /api/workouts/:id (edit)
- Payload camelCase come atteso dal backend
- Redirect a /workouts dopo salvataggio
- Banner errori con messaggio descrittivo
- Skeleton loading per modalita edit
- Stile coerente con tema dark (classi habit-*)

**Componenti riutilizzati (non modificati):**
- `ExerciseCard.vue` - card esercizio nel picker
- `ExerciseModal.vue` - modal dettaglio esercizio (z-50)
- `store/exercise.js` - Pinia store per esercizi, gruppi muscolari, categorie

---

## [2026-02-06] - Implementazione WorkoutsView (Lista Schede Allenamento)

### Azioni Completate

| # | Azione | Dettaglio |
|---|--------|-----------|
| 1 | Analisi stato progetto | Letti i 3 PDF (Piano Completo, Piano Integrazione, Piano Mobile) e verificato stato implementazione |
| 2 | Analisi codebase | Verificato: 9 moduli backend completi (auth, users, clients, exercises, workouts, sessions, nutrition, measurements, readiness), 16 routes placeholder |
| 3 | WorkoutsView.vue | Implementata vista completa lista schede allenamento con: ricerca, filtri (categoria + difficolta), griglia card responsive, paginazione, modal duplicazione, modal eliminazione |

### Dettaglio WorkoutsView.vue

**Funzionalita implementate:**
- Lista schede con layout card grid (1/2/3 colonne responsive)
- Ricerca testuale per nome scheda
- Filtro per categoria (Forza, Ipertrofia, Resistenza, Cardio, HIIT, Funzionale, Personalizzato)
- Filtro per difficolta (Principiante, Intermedio, Avanzato, Elite)
- Badge colorati per categoria e difficolta
- Durata stimata e data creazione
- Nome creatore scheda
- Azione Duplica con modal per scegliere nome
- Azione Elimina con modal di conferma
- Click su card -> navigazione a WorkoutBuilder per modifica
- Link a Libreria Esercizi e Nuova Scheda nell'header
- Skeleton loading animato
- Empty state con CTA
- Paginazione completa
- Stile coerente con ClientsListView e DashboardView (tema dark, classi habit-*)

### Stato Progetto Aggiornato

**Frontend Views implementate:** 15/35
- [x] LandingPage.vue
- [x] auth/LoginView.vue
- [x] auth/RegisterView.vue
- [x] auth/ForgotPasswordView.vue
- [x] DashboardView.vue
- [x] clients/ClientsListView.vue
- [x] clients/ClientDetailView.vue
- [x] clients/ClientCreateView.vue
- [x] workouts/WorkoutsView.vue
- [x] workouts/WorkoutBuilderView.vue
- [x] workouts/ExerciseLibraryView.vue
- [x] sessions/SessionsView.vue
- [x] sessions/SessionDetailView.vue
- [x] nutrition/NutritionView.vue
- [x] **nutrition/MealPlannerView.vue** (NUOVO)

**Prossimi step suggeriti (in ordine di priorita):**
- [ ] measurements/MeasurementsView.vue - Dashboard misurazioni corpo (backend pronto)
- [ ] readiness/ReadinessView.vue - Check-in giornaliero readiness (backend pronto)
- [ ] settings/SettingsView.vue - Impostazioni tenant/profilo
- [ ] settings/ProfileView.vue - Profilo utente
- [ ] programs/ProgramsView.vue - Gestione programmi multi-settimana (richiede backend)
- [ ] booking/CalendarView.vue - Calendario appuntamenti

---

## [2024-02-03] - Inizializzazione Progetto Completa

### Azioni Completate

| # | Ora | Azione | Dettaglio |
|---|-----|--------|-----------|
| 1 | 00:15 | Lettura progetto | Verificato stato attuale: progetto vuoto |
| 2 | 00:15 | Creazione CHANGELOG.md | Questo file per tracciare tutte le azioni |
| 3 | 00:20 | Struttura Backend | Creata struttura cartelle completa |
| 4 | 00:22 | package.json Backend | Configurazione dipendenze Node.js |
| 5 | 00:23 | .env.example | Template variabili ambiente |
| 6 | 00:25 | server.js | Entry point Express con Socket.io |
| 7 | 00:27 | config/database.js | Pool MySQL con query helper |
| 8 | 00:28 | config/openai.js | Integrazione GPT-4 API |
| 9 | 00:30 | middlewares/auth.js | JWT verification e RBAC |
| 10 | 00:32 | middlewares/tenantContext.js | Multi-tenant isolation |
| 11 | 00:33 | middlewares/errorHandler.js | Gestione errori centralizzata |
| 12 | 00:34 | middlewares/validate.js | Validazione Joi |
| 13 | 00:35 | socket/socketHandler.js | WebSocket per chat real-time |
| 14 | 00:36 | Routes placeholder | 21 file routes creati |
| 15 | 00:40 | Struttura Frontend | Creata struttura Vue.js 3 |
| 16 | 00:42 | package.json Frontend | Dipendenze Vue/Tailwind/Capacitor |
| 17 | 00:43 | vite.config.js | Configurazione Vite + PWA |
| 18 | 00:44 | tailwind.config.js | Theme customizzato |
| 19 | 00:45 | index.html | Entry point HTML |
| 20 | 00:46 | main.js | Vue app initialization |
| 21 | 00:47 | App.vue | Root component con layout |
| 22 | 00:48 | main.css | Stili globali Tailwind |
| 23 | 00:50 | store/auth.js | Pinia auth store |
| 24 | 00:51 | store/theme.js | Dark/light mode store |
| 25 | 00:53 | router/index.js | Vue Router con guards |
| 26 | 00:54 | services/api.js | Axios instance con interceptors |
| 27 | 00:55 | composables/useNative.js | Capacitor detection |
| 28 | 00:56 | components/layout/AppHeader.vue | Header responsive |
| 29 | 00:57 | components/layout/AppSidebar.vue | Sidebar desktop |
| 30 | 00:58 | components/mobile/BottomNavigation.vue | Nav mobile |
| 31 | 01:00 | database/schema.sql | Schema completo 50+ tabelle |
| 32 | 01:05 | seeds/001_muscle_groups.sql | 18 gruppi muscolari |
| 33 | 01:06 | seeds/002_achievement_titles.sql | 35 titoli nerd/pop |
| 34 | 01:07 | seeds/003_achievements.sql | 28 badge base |
| 35 | 01:08 | seeds/004_exercises.sql | 80+ esercizi predefiniti |

---

## Struttura Progetto Attuale

```
Piattaforma-SaaS-Personal-Trainer/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js         ✅
│   │   │   └── openai.js           ✅
│   │   ├── middlewares/
│   │   │   ├── auth.js             ✅
│   │   │   ├── tenantContext.js    ✅
│   │   │   ├── errorHandler.js     ✅
│   │   │   ├── notFound.js         ✅
│   │   │   └── validate.js         ✅
│   │   ├── models/                 📁 (da creare)
│   │   ├── services/               📁 (da creare)
│   │   │   └── ai/                 📁 (da creare)
│   │   ├── controllers/            📁 (da creare)
│   │   ├── routes/
│   │   │   ├── auth.routes.js      ✅ (placeholder)
│   │   │   ├── user.routes.js      ✅ (placeholder)
│   │   │   ├── client.routes.js    ✅ (placeholder)
│   │   │   └── ... (21 file)       ✅ (placeholder)
│   │   ├── validators/             📁 (da creare)
│   │   ├── socket/
│   │   │   └── socketHandler.js    ✅
│   │   ├── jobs/                   📁 (da creare)
│   │   ├── utils/                  📁 (da creare)
│   │   └── server.js               ✅
│   ├── uploads/                    📁
│   ├── tests/                      📁 (da creare)
│   ├── package.json                ✅
│   └── .env.example                ✅
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             📁 (da creare)
│   │   │   ├── layout/
│   │   │   │   ├── AppHeader.vue   ✅
│   │   │   │   └── AppSidebar.vue  ✅
│   │   │   ├── mobile/
│   │   │   │   └── BottomNavigation.vue ✅
│   │   │   └── ... (altre cartelle) 📁
│   │   ├── views/                  📁 (da creare)
│   │   ├── store/
│   │   │   ├── auth.js             ✅
│   │   │   └── theme.js            ✅
│   │   ├── services/
│   │   │   └── api.js              ✅
│   │   ├── composables/
│   │   │   └── useNative.js        ✅
│   │   ├── router/
│   │   │   └── index.js            ✅
│   │   ├── assets/
│   │   │   └── main.css            ✅
│   │   ├── App.vue                 ✅
│   │   └── main.js                 ✅
│   ├── public/                     📁
│   ├── index.html                  ✅
│   ├── package.json                ✅
│   ├── vite.config.js              ✅
│   ├── tailwind.config.js          ✅
│   └── postcss.config.js           ✅
│
├── database/
│   ├── migrations/                 📁 (da creare)
│   ├── seeds/
│   │   ├── 001_muscle_groups.sql   ✅
│   │   ├── 002_achievement_titles.sql ✅
│   │   ├── 003_achievements.sql    ✅
│   │   └── 004_exercises.sql       ✅
│   └── schema.sql                  ✅
│
├── CHANGELOG.md                    ✅
├── README.md                       ✅
└── LICENSE                         ✅
```

---

## Database - Tabelle Create (50+)

### Multi-tenancy & Utenti
- [x] tenants
- [x] users
- [x] refresh_tokens
- [x] clients
- [x] client_goals
- [x] injuries

### Workout System
- [x] muscle_groups
- [x] exercises
- [x] exercise_muscle_groups
- [x] workout_templates
- [x] workout_template_exercises
- [x] mesocycles
- [x] client_programs
- [x] program_workouts
- [x] workout_sessions
- [x] workout_session_exercises
- [x] exercise_set_logs

### Progress & Body Composition
- [x] body_measurements
- [x] anthropometric_data
- [x] skinfold_measurements
- [x] circumference_measurements
- [x] bia_measurements
- [x] progress_photos
- [x] performance_records

### Readiness & Volume
- [x] daily_checkins
- [x] weekly_volume_analytics
- [x] client_muscle_priorities
- [x] training_alerts

### Nutrizione
- [x] meal_plans
- [x] meal_plan_days
- [x] meals
- [x] meal_items

### Comunicazione
- [x] conversations
- [x] conversation_participants
- [x] messages
- [x] community_posts
- [x] community_comments
- [x] community_likes

### Booking & Classi
- [x] availability_slots
- [x] appointments
- [x] classes
- [x] class_sessions
- [x] class_enrollments

### Video & Corsi
- [x] videos
- [x] courses
- [x] course_modules
- [x] video_purchases
- [x] course_progress

### Gamification
- [x] achievements
- [x] user_achievements
- [x] achievement_titles
- [x] client_titles
- [x] challenges
- [x] challenge_participants
- [x] points_transactions

### Pagamenti
- [x] client_subscriptions
- [x] payments
- [x] platform_invoices

### Sistema
- [x] notifications
- [x] notification_templates
- [x] audit_logs
- [x] api_keys
- [x] referral_codes
- [x] referral_conversions
- [x] locations

---

## Prossimi Step

### Priorita Alta
- [ ] Creare file .env da .env.example
- [ ] Installare dipendenze (npm install)
- [ ] Creare database MySQL
- [ ] Eseguire schema.sql
- [ ] Eseguire seed files
- [ ] Implementare auth routes complete
- [ ] Implementare CRUD clienti
- [ ] Creare views Vue principali

### Priorita Media
- [ ] Implementare workout system
- [ ] Implementare session logging
- [ ] Creare componenti form
- [ ] Implementare chat WebSocket

### Priorita Bassa
- [ ] Integrazione OpenAI
- [ ] Sistema notifiche
- [ ] Gamification completa
- [ ] Video upload/streaming

---

## Note Tecniche

### Stack Confermato
- **Backend**: Node.js 18+, Express 4.x, MySQL 8.0+
- **Frontend**: Vue.js 3.4, Pinia 2.x, Tailwind 3.4
- **Real-time**: Socket.io 4.x
- **AI**: OpenAI GPT-4 API
- **Mobile**: Capacitor 5.x (da configurare)
- **Auth**: JWT con refresh token rotation
- **Validazione**: Joi

### Comandi Utili

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Database
mysql -u root -p < database/schema.sql
mysql -u root -p pt_saas_db < database/seeds/001_muscle_groups.sql
mysql -u root -p pt_saas_db < database/seeds/002_achievement_titles.sql
mysql -u root -p pt_saas_db < database/seeds/003_achievements.sql
mysql -u root -p pt_saas_db < database/seeds/004_exercises.sql
```

---

## Legenda

- ✅ = Completato
- 📁 = Cartella creata (contenuto da implementare)
- [ ] = Da fare
- [x] = Fatto

---

*File generato automaticamente. Aggiornato ad ogni azione di sviluppo.*
