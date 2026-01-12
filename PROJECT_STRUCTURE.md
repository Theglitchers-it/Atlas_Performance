# 🏗️ Atlas Performance - Struttura Progetto

**Ultima modifica**: 9 Gennaio 2026
**Versione**: 2.0 - Riorganizzata e ottimizzata

---

## 📁 Struttura Root Directory

```
Atlas-Performance/
│
├── 📱 app/                          # Applicazione Flask principale
│   ├── models/                      # Database models (17 tabelle)
│   ├── blueprints/                  # Routes (auth, admin, trainer, athlete, public)
│   ├── services/                    # Business logic (Stripe, TenantManager, etc.)
│   ├── middleware/                  # Multi-tenant context
│   ├── templates/                   # Jinja2 HTML templates
│   └── static/                      # CSS, JS, images, uploads
│
├── 📚 docs/                         # TUTTA LA DOCUMENTAZIONE (72 file)
│   ├── mobile/                      # 📱 14 file - Mobile optimization
│   ├── frontend/                    # 🎨 8 file - Build system & UI
│   ├── security/                    # 🔐 4 file - Security & protezioni
│   ├── deployment/                  # 🚀 4 file - Deploy & config
│   ├── testing/                     # 🧪 3 file - Testing & QA
│   ├── legacy/                      # 📦 12 file - Documenti storici
│   ├── guides/                      # 📖 4 file - Guide esistenti
│   ├── setup/                       # ⚙️ 5 file - Setup guide
│   ├── summaries/                   # 📝 14 file - Changelog e riepiloghi
│   ├── INDEX.md                     # 📄 Indice completo documentazione
│   ├── REORGANIZATION_SUMMARY.md   # 📄 Riepilogo riorganizzazione
│   ├── FEATURES.md                  # 📄 Lista funzionalità complete
│   ├── PROJECT_SUMMARY.md           # 📄 Sommario architettura
│   └── QUICK_NAVIGATION.md          # 📄 Navigazione rapida
│
├── 🧪 tests/                        # Test suite (pytest)
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── conftest.py                  # Pytest configuration
│
├── 🗄️ migrations/                   # Database migrations (Alembic)
│   ├── versions/                    # Migration files
│   └── alembic.ini                  # Alembic config
│
├── 🛠️ scripts/                      # Script di utility
│   ├── verify_installation.py       # Verifica installazione
│   ├── verify_todo_fixes.py         # Verifica fix completati
│   └── test_email.py                # Test email configuration
│
├── 📦 instance/                     # Instance folder (gitignored)
│   └── atlas_performance.db         # SQLite database locale
│
├── 🎨 Frontend Build (Vite)
│   ├── node_modules/                # Node.js dependencies
│   ├── dist/                        # Build output (gitignored)
│   ├── package.json                 # Node.js config
│   ├── package-lock.json            # Lockfile
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # TailwindCSS config
│   └── postcss.config.js            # PostCSS config
│
├── 🐍 Python Environment
│   ├── venv/                        # Virtual environment (gitignored)
│   ├── requirements.txt             # Python dependencies
│   └── __pycache__/                 # Python cache (gitignored)
│
├── ⚙️ Configuration Files
│   ├── .env                         # Environment variables (gitignored)
│   ├── .env.example                 # Environment template
│   ├── config.py                    # Flask configuration
│   ├── .gitignore                   # Git ignore rules
│   ├── pytest.ini                   # Pytest configuration
│   └── .coveragerc                  # Coverage configuration
│
├── 🚀 Quick Start Scripts
│   ├── 🚀 AVVIA SERVER.bat          # ⭐ Quick start (doppio click!)
│   ├── start-dev.bat                # Start development server
│   └── build-production.bat         # Build for production
│
├── 📝 Root Documentation
│   ├── README.md                    # 📖 Main README (aggiornato)
│   ├── PROJECT_STRUCTURE.md         # 🏗️ Questo file
│   ├── LICENSE                      # MIT License
│   └── run.py                       # 🎯 Application entry point
│
└── 🔧 Git & Development
    ├── .git/                        # Git repository
    ├── .claude/                     # Claude Code config (gitignored)
    ├── .pytest_cache/              # Pytest cache (gitignored)
    └── htmlcov/                     # Coverage reports (gitignored)
```

---

## 📊 Statistiche Progetto

### 📂 Struttura Codebase
- **Applicazione**: 1 folder principale (`app/`)
- **Models**: 17 tabelle database
- **Blueprints**: 5 moduli (auth, super_admin, trainer, athlete, public)
- **Services**: 10+ servizi business logic
- **Templates**: 50+ file Jinja2
- **Static files**: CSS, JS, images, uploads

### 📚 Documentazione
- **Totale documenti**: 72 file
- **Categorie**: 9 categorie tematiche
- **Mobile docs**: 14 documenti
- **Frontend docs**: 8 documenti
- **Security docs**: 4 documenti
- **Testing docs**: 3 documenti
- **Legacy docs**: 12 documenti

### 🧪 Testing
- **Test framework**: pytest
- **Coverage**: 70%+
- **Test types**: Unit, Integration
- **Test files**: 10+ test modules

### 🎨 Frontend
- **Build system**: Vite
- **CSS framework**: TailwindCSS
- **Size reduction**: 84% (grazie a Vite)
- **Icons**: 18 SVG inline (zero dipendenze)

---

## 🗺️ Navigazione Rapida

### 🚀 Per Iniziare
1. **Avvio rapido**: Doppio click su `🚀 AVVIA SERVER.bat`
2. **Setup manuale**: Leggi [`README.md`](README.md)
3. **Documentazione**: Consulta [`docs/INDEX.md`](docs/INDEX.md)

### 👨‍💻 Per Sviluppatori
```
app/                      → Codice applicazione
docs/INDEX.md            → Indice documentazione completa
docs/FEATURES.md         → Lista funzionalità
docs/PROJECT_SUMMARY.md  → Architettura progetto
```

### 📱 Mobile Development
```
docs/mobile/MOBILE_FIRST_OPTIMIZATION.md  → Strategia mobile-first
docs/mobile/NAVBAR_MOBILE_FIX.md         → Fix navbar mobile
app/templates/           → Template HTML da ottimizzare
app/static/css/          → CSS mobile styles
```

### 🎨 Frontend Development
```
docs/frontend/FRONTEND_BUILD_SYSTEM.md   → Build system Vite
docs/frontend/LANDING_PAGE_PREMIUM_REDESIGN.md → Landing page
vite.config.js           → Configurazione Vite
tailwind.config.js       → Configurazione TailwindCSS
```

### 🔐 Security & Deploy
```
docs/security/SECURITY.md                → Security guide completa
docs/security/PRODUCTION_SECURITY_CHECKLIST.md → Checklist
docs/deployment/DEPLOYMENT_CHECKLIST.md  → Deploy checklist
config.py                → Configurazione Flask
```

### 🧪 Testing
```
tests/                   → Test suite completa
docs/testing/TESTING_IMPLEMENTATION_REPORT.md → Report testing
pytest.ini               → Configurazione pytest
.coveragerc              → Configurazione coverage
```

---

## 🎯 Entry Points Principali

### 🚀 Avvio Applicazione
```python
# File: run.py
# Descrizione: Entry point principale dell'applicazione
# Uso: python run.py
```

### 📦 Gestione Dipendenze
```bash
# Python
pip install -r requirements.txt

# Node.js (Frontend)
npm install
```

### 🗄️ Database
```bash
# Setup database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Seed con dati demo
flask seed-db
```

### 🏗️ Build Frontend
```bash
# Development
npm run dev

# Production
npm run build
```

---

## 📖 File Importanti

| File | Descrizione | Priorità |
|------|-------------|----------|
| `README.md` | Documentazione principale | ⭐⭐⭐⭐⭐ |
| `docs/INDEX.md` | Indice completo docs | ⭐⭐⭐⭐⭐ |
| `run.py` | Entry point applicazione | ⭐⭐⭐⭐⭐ |
| `config.py` | Configurazione Flask | ⭐⭐⭐⭐⭐ |
| `.env.example` | Template environment | ⭐⭐⭐⭐ |
| `requirements.txt` | Dipendenze Python | ⭐⭐⭐⭐ |
| `package.json` | Dipendenze Node.js | ⭐⭐⭐⭐ |
| `docs/FEATURES.md` | Lista funzionalità | ⭐⭐⭐⭐ |
| `docs/PROJECT_SUMMARY.md` | Architettura | ⭐⭐⭐⭐ |
| `docs/security/SECURITY.md` | Security guide | ⭐⭐⭐⭐ |

---

## 🔍 Come Trovare Cosa

### "Voglio capire l'architettura del progetto"
→ `docs/PROJECT_SUMMARY.md`

### "Voglio vedere tutte le funzionalità"
→ `docs/FEATURES.md`

### "Voglio ottimizzare per mobile"
→ `docs/mobile/MOBILE_FIRST_OPTIMIZATION.md`

### "Voglio configurare il build system"
→ `docs/frontend/FRONTEND_BUILD_SYSTEM.md`

### "Voglio implementare security best practices"
→ `docs/security/SECURITY.md`

### "Voglio fare il deploy in production"
→ `docs/deployment/DEPLOYMENT_CHECKLIST.md`

### "Voglio scrivere test"
→ `docs/testing/TESTING_IMPLEMENTATION_REPORT.md`

### "Voglio sapere la storia del progetto"
→ `docs/legacy/` (documenti storici)

---

## 📊 Metriche Progetto

### Codice
- **Linguaggio principale**: Python 3.8+
- **Framework**: Flask 3.0
- **ORM**: SQLAlchemy
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Frontend**: Vite + TailwindCSS

### Architettura
- **Pattern**: Multi-Tenant SaaS
- **Autenticazione**: Flask-Login
- **Payments**: Stripe
- **Migrations**: Alembic
- **Testing**: pytest

### Performance
- **Bundle size reduction**: 84% (grazie a Vite)
- **Mobile-first**: ✅ Completamente ottimizzato
- **PWA-ready**: ✅ Service workers ready
- **Cache strategy**: 5 livelli implementati

---

## 🎉 Highlights

### ✅ Completato
- ✅ Architettura Multi-Tenant completa
- ✅ Stripe Subscriptions integration
- ✅ 17 tabelle database con migrations
- ✅ Mobile-first optimization completa
- ✅ Build system Vite moderno
- ✅ Security enterprise-grade
- ✅ Testing suite 70%+ coverage
- ✅ 72 documenti organizzati e categorizzati

### 🚀 In Sviluppo
- [ ] Mobile app (React Native / Flutter)
- [ ] Email notifications
- [ ] Template marketplace
- [ ] API REST pubblica
- [ ] Multi-language support
- [ ] Dark mode

---

## 📞 Support

- **Documentazione**: [`docs/INDEX.md`](docs/INDEX.md)
- **README**: [`README.md`](README.md)
- **Issues**: GitHub Issues
- **Quick Start**: `🚀 AVVIA SERVER.bat`

---

**✨ Struttura pulita, organizzata e pronta per lo sviluppo professionale!**
