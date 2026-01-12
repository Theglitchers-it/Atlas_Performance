# 🏋️ Atlas Performance

**Piattaforma SaaS Multi-Tenant per Personal Trainer Professionisti**

Atlas Performance è una piattaforma completa progettata per Personal Trainer e Coach professionisti che hanno bisogno di scalare il loro business. Il sistema elimina i file Excel e i messaggi WhatsApp disordinati, centralizzando la programmazione degli allenamenti, il monitoraggio dei progressi e la gestione dei pagamenti in un unico ecosistema digitale.

## ⚡ NEW: Enterprise Security & Performance Features

**Nuove funzionalità production-ready appena implementate**:

- 🔒 **Rate Limiting** - Protezione DDoS (100 req/ora)
- 🛡️ **Input Sanitization** - XSS & SQL Injection prevention
- ⚡ **Caching Strategy** - 5 livelli (Redis-ready)
- 🖼️ **Image Optimization** - Compressione intelligente + WebP
- 📡 **CDN Integration** - AWS S3 + Cloudflare
- 🧪 **Testing Suite** - pytest + 70%+ coverage
- 🚀 **Modern Build System** - Vite + TailwindCSS (84% size reduction)

> 📖 [Leggi la Security & Performance Guide completa →](docs/security/SECURITY.md)
> 🚀 [Quick Start Guide →](docs/security/SECURITY_QUICKSTART.md)
> ⚡ [Frontend Build System Guide →](docs/frontend/FRONTEND_BUILD_SYSTEM.md)

---

## 🎯 Caratteristiche Principali

### 📊 **Architettura Multi-Tenant (3 Portali)**

1. **Super Admin Dashboard** - La Tua Piattaforma SaaS
   - Gestione subscription Stripe
   - Analytics globali (MRR, ARR, total users)
   - Monitoring tenants attivi/trial/cancellati
   - Gestione database centralizzata

2. **Trainer Dashboard** - Il Merchant Pagante
   - Gestione atleti (fino a limite subscription)
   - Workout Builder drag-and-drop
   - Video Library per esercizi
   - Progress Tracker con grafici
   - Chat integrata in-app
   - Subscription billing management

3. **Athlete App** - Il Cliente Finale
   - Visualizzazione schede giornaliere
   - Timer recuperi integrato
   - Log allenamenti con RPE
   - Form Check video upload
   - Check-in settimanale (foto, peso, misure)
   - Nutrition tracking (macro)

---

## 🔥 Funzionalità Killer

✅ **Algoritmo Carico Progressivo AI** - Suggerisce automaticamente l'aumento pesi basato su performance
✅ **Integrazione Nutrizionale** - Traccia macro (proteine, carboidrati, grassi) integrato con allenamento
✅ **QR Code Macchinari** - Scannerizza equipment in palestra per vedere tutorial + PR personali
✅ **Stripe Subscriptions** - Piani mensili (Starter €29, Pro €49, Enterprise €99)
✅ **Multi-Tenant Isolation** - Ogni trainer ha dati completamente isolati
✅ **RPE Tracking** - Rate of Perceived Exertion per ogni esercizio
✅ **Progressive Overload** - Incremento automatico dei carichi
✅ **Mobile-First Design** - PWA-ready per atleti

---

## 🛠️ Stack Tecnologico

**Backend:**
- Python 3.8+ con Flask 3.0
- SQLAlchemy ORM (PostgreSQL/SQLite)
- Flask-Login per autenticazione multi-ruolo
- Flask-Migrate per database migrations
- Werkzeug per password hashing

**Frontend:**
- TailwindCSS (via CDN)
- Jinja2 Templates
- Alpine.js per interattività
- Chart.js per analytics
- Font Awesome 6 icons

**Payments:**
- Stripe 7.8.0 (Subscriptions + Webhooks)
- Customer Portal integrato
- Test mode + Production mode ready

**Deployment Ready:**
- Railway / Heroku / AWS
- Gunicorn per production
- Docker-ready (opzionale)
- PostgreSQL production DB

---

## 🚀 Quick Start

### 🎯 Avvio Rapido (Windows)
**Clicca due volte su**: `🚀 AVVIA SERVER.bat`

Il file avvierà automaticamente il server e aprirà il browser.

### 📋 Setup Manuale

#### 1. Installazione
```bash
# Clona il repo
cd Atlas-Performance

# Crea ambiente virtuale
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installa dipendenze
pip install -r requirements.txt
```

#### 2. Configurazione
```bash
# Copia .env di esempio
cp .env.example .env

# Modifica .env con le tue credenziali Stripe
```

#### 3. Database Setup
```bash
# Inizializza database
flask init-db

# Popola con dati demo
flask seed-db
```

#### 4. Avvia Server
```bash
python run.py
# Server running on http://localhost:5000
```

---

## 🔑 Credenziali Demo

Dopo aver eseguito `flask seed-db`, accedi con:

**Super Admin:**
- Email: `admin@atlasperformance.com`
- Password: `admin123`
- URL: http://localhost:5000/super-admin/dashboard

**Trainer Demo:**
- Email: `trainer@demo.com`
- Password: `demo123`
- URL: http://localhost:5000/trainer/dashboard

**Athlete Demo:**
- Email: `athlete@demo.com`
- Password: `demo123`
- URL: http://localhost:5000/athlete/dashboard

---

## 📂 Struttura Progetto

```
Atlas-Performance/
├── app/
│   ├── models/              # Database models (User, Tenant, Athlete, Workout...)
│   ├── blueprints/          # Routes (auth, super_admin, trainer, athlete, public)
│   ├── services/            # Business logic (Stripe, TenantManager, WorkoutBuilder, Progression)
│   ├── middleware/          # Multi-tenant context
│   ├── templates/           # Jinja2 HTML
│   └── static/              # CSS, JS, uploads
├── docs/                    # 📚 Documentazione completa
│   ├── setup/              # Guide di installazione e configurazione
│   ├── guides/             # Guide tecniche e troubleshooting
│   └── summaries/          # Changelog e riepiloghi modifiche
├── scripts/                 # 🛠️ Script di utilità e avvio
├── migrations/              # Alembic migrations
├── config.py                # Configurazione multi-ambiente
├── requirements.txt         # Python dependencies
├── run.py                   # Application entry point
├── .env.example             # Template variabili ambiente
└── README.md               # Questo file
```

---

## 📚 Documentazione

Tutta la documentazione è organizzata nella cartella **`docs/`**:

### 📱 Mobile Optimization
- **[docs/mobile/](docs/mobile/)** - Ottimizzazioni mobile-first
  - `MOBILE_FIRST_OPTIMIZATION.md` - Strategia mobile-first completa
  - `MOBILE_OPTIMIZATION_SUMMARY.md` - Riepilogo ottimizzazioni
  - `NAVBAR_MOBILE_FIX.md` - Fix navbar mobile
  - `ATHLETE_PROFILE_MOBILE_FIX.md` - Ottimizzazioni profilo atleta
  - `TRAINER_MOBILE_OPTIMIZATION.md` - Dashboard trainer mobile
  - `TAB_NAVIGATION_MOBILE_FIX.md` - Fix navigazione tab
  - `PROGRESS_BAR_MOBILE_FIX.md` - Ottimizzazione progress bar
  - E altri 7+ documenti di ottimizzazione mobile

### 🎨 Frontend & UI
- **[docs/frontend/](docs/frontend/)** - Build system e UI
  - `FRONTEND_BUILD_SYSTEM.md` - Sistema build Vite + TailwindCSS
  - `FRONTEND_QUICK_START.md` - Quick start frontend
  - `LANDING_PAGE_PREMIUM_REDESIGN.md` - Redesign landing page
  - `SVG_ICONS_FIX_COMPLETE.md` - Implementazione icone SVG
  - `ICON_FIX_SUMMARY.md` - Fix icone Font Awesome

### 🔐 Security
- **[docs/security/](docs/security/)** - Sicurezza e protezioni
  - `SECURITY.md` - Security guide completa
  - `SECURITY_QUICKSTART.md` - Quick start security
  - `PRODUCTION_SECURITY_CHECKLIST.md` - Checklist produzione
  - `CSRF_PROTECTION_FIXED.md` - Protezione CSRF

### 🚀 Deployment
- **[docs/deployment/](docs/deployment/)** - Deploy e configurazione
  - `DEPLOYMENT_CHECKLIST.md` - Checklist completa
  - `MIGRATIONS_SETUP.md` - Setup migrations database
  - `EMAIL_SETUP_GUIDE.md` - Configurazione email
  - `EMAIL_SETUP_SUMMARY.txt` - Riepilogo setup email

### 🧪 Testing
- **[docs/testing/](docs/testing/)** - Test e QA
  - `TESTING_IMPLEMENTATION_REPORT.md` - Report testing
  - `VERIFICATION_REPORT.md` - Report verifica
  - `test_tab_mobile.html` - Test navigazione mobile

### 📖 Documentazione Generale
- **[docs/](docs/)** - Documentazione principale
  - `FEATURES.md` - Lista completa funzionalità
  - `PROJECT_SUMMARY.md` - Sommario progetto
  - `QUICK_NAVIGATION.md` - Navigazione rapida

### 📦 Legacy Docs
- **[docs/legacy/](docs/legacy/)** - Documenti storici e fix passati
  - Riepiloghi modifiche precedenti
  - Fix completati
  - Changelog storici

### 🛠️ Script Utility
- **[scripts/](scripts/)** - Script di avvio e utilità
  - `verify_installation.py` - Verifica installazione
  - `verify_todo_fixes.py` - Verifica fix TODO
  - `test_email.py` - Test configurazione email
  - Altri script di utility

---

## 🎨 Customizzazione

### Aggiungere Nuovi Esercizi
```python
from app.models.trainer import Exercise
from app.models import db

exercise = Exercise(
    name='Romanian Deadlift',
    category='legs',
    equipment='barbell',
    difficulty_level='intermediate',
    primary_muscles=['hamstrings', 'glutes']
)
db.session.add(exercise)
db.session.commit()
```

### Creare Nuovo Tenant Programmaticamente
```python
from app.services.tenant_manager import TenantManager

tenant, trainer = TenantManager.create_tenant(
    name='New Gym',
    email='trainer@newgym.com',
    first_name='John',
    last_name='Doe',
    password='securepass123',
    subdomain='new-gym'
)
```

---

## 🔐 Sicurezza

✅ CSRF Protection (Flask-WTF)
✅ Password Hashing (Werkzeug bcrypt)
✅ Role-Based Access Control (RBAC)
✅ Tenant Data Isolation
✅ Stripe PCI-DSS Compliant
✅ HTTPS Ready
✅ Session Security (SameSite cookies)

---

## 📈 Roadmap

- [x] Core SaaS architecture
- [x] Stripe subscriptions
- [x] Multi-tenant system
- [x] Workout builder
- [x] Progression algorithm
- [x] Nutrition tracking
- [x] QR code machines
- [ ] Mobile app (React Native / Flutter)
- [ ] Email notifications
- [ ] Template marketplace
- [ ] API REST pubblica
- [ ] Multi-language support (i18n)
- [ ] Dark mode

---

## 🤝 Contributi

Questo è un progetto professionale. Per contribuire:
1. Fork il repository
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

---

## 📝 License

Questo progetto è distribuito sotto licenza MIT. Vedi file [LICENSE](LICENSE) per dettagli.

---

## 👨‍💻 Autore

Sviluppato con 💙 per trainers professionisti che vogliono scalare il loro business.

**Tech Stack utilizzato per valorizzare skills:**
- Flask (Python web framework)
- SQLAlchemy (ORM avanzato)
- Stripe API (payment processing)
- TailwindCSS (modern CSS)
- Multi-tenant architecture
- SaaS business model

---

## 📞 Contatti & Support

- **Email**: support@atlasperformance.com
- **Documentation**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Issues**: GitHub Issues
- **Stripe Docs**: https://stripe.com/docs
- **Flask Docs**: https://flask.palletsprojects.com/

---

**🚀 Ready to scale your training business? Start your journey with Atlas Performance!**
