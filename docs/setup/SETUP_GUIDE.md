# 🏋️ Atlas Performance - Setup Guide

## 📋 Indice
1. [Requisiti](#requisiti)
2. [Installazione](#installazione)
3. [Configurazione Database](#configurazione-database)
4. [Configurazione Stripe](#configurazione-stripe)
5. [Avvio Applicazione](#avvio-applicazione)
6. [Credenziali Demo](#credenziali-demo)
7. [Deployment Production](#deployment-production)

---

## 🔧 Requisiti

- **Python**: 3.8 o superiore
- **Database**: SQLite (dev) o PostgreSQL (production)
- **Account Stripe**: Per gestire i pagamenti (testmode gratuito)

---

## 📦 Installazione

### 1. Clona/Apri il progetto
```bash
cd Atlas-Performance
```

### 2. Crea ambiente virtuale Python
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Installa le dipendenze
```bash
pip install -r requirements.txt
```

---

## 🗄️ Configurazione Database

### 1. Crea file `.env` dalla template
```bash
cp .env.example .env
```

### 2. Modifica `.env` con le tue credenziali
```env
SECRET_KEY=genera-una-chiave-sicura-qui
FLASK_ENV=development
FLASK_DEBUG=True

# Database (SQLite per sviluppo)
DATABASE_URL=sqlite:///atlas_performance.db

# Stripe (test keys - ottieni da https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLIC_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3. Inizializza il database
```bash
# Opzione 1: Usando Flask-Migrate (raccomandato)
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Opzione 2: Creazione diretta tabelle
python run.py
>>> from app import db
>>> db.create_all()
>>> exit()

# O usa il comando CLI custom:
flask init-db
```

### 4. Popola il database con dati demo
```bash
flask seed-db
```

Questo comando crea:
- ✅ Super Admin: `admin@atlasperformance.com` / `admin123`
- ✅ Trainer Demo: `trainer@demo.com` / `demo123`
- ✅ Athlete Demo: `athlete@demo.com` / `demo123`
- ✅ 10 Esercizi globali (Bench Press, Squat, ecc.)
- ✅ Tenant "demo" con subdomain `demo.localhost`

---

## 💳 Configurazione Stripe

### 1. Crea account Stripe
1. Vai su [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Attiva la **Test Mode** (interruttore in alto a destra)

### 2. Ottieni API Keys
1. Vai su **Developers → API keys**
2. Copia:
   - `Publishable key` → `STRIPE_PUBLIC_KEY` in `.env`
   - `Secret key` → `STRIPE_SECRET_KEY` in `.env`

### 3. Crea Subscription Products
1. Vai su **Products → Add Product**
2. Crea 3 piani mensili:

   **Starter Plan**
   - Nome: `Starter`
   - Prezzo: €29/mese
   - ID Price: Copia e incolla in `STRIPE_PRICE_STARTER`

   **Pro Plan**
   - Nome: `Pro`
   - Prezzo: €49/mese
   - ID Price: Copia e incolla in `STRIPE_PRICE_PRO`

   **Enterprise Plan**
   - Nome: `Enterprise`
   - Prezzo: €99/mese
   - ID Price: Copia e incolla in `STRIPE_PRICE_ENTERPRISE`

### 4. Configura Webhook (Opzionale per sviluppo)
```bash
# Installa Stripe CLI
# Windows: scoop install stripe
# macOS: brew install stripe/stripe-cli/stripe
# Linux: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhook in locale
stripe listen --forward-to localhost:5000/webhooks/stripe

# Copia il webhook signing secret e aggiungilo a .env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 🚀 Avvio Applicazione

### Modalità Development
```bash
# Attiva ambiente virtuale
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Avvia Flask
python run.py

# Oppure con Flask CLI
export FLASK_APP=run.py  # Windows: set FLASK_APP=run.py
flask run
```

L'app sarà disponibile su:
- **Homepage**: http://localhost:5000
- **Login**: http://localhost:5000/auth/login
- **Super Admin**: http://localhost:5000/super-admin/dashboard
- **Trainer Dashboard**: http://localhost:5000/trainer/dashboard
- **Athlete Dashboard**: http://localhost:5000/athlete/dashboard

---

## 🔑 Credenziali Demo

### Super Admin (Gestione Piattaforma SaaS)
```
Email: admin@atlasperformance.com
Password: admin123
URL: http://localhost:5000/super-admin/dashboard
```

### Trainer (Il tuo "cliente pagante")
```
Email: trainer@demo.com
Password: demo123
URL: http://localhost:5000/trainer/dashboard
Tenant: demo.localhost
```

### Athlete (Cliente finale del trainer)
```
Email: athlete@demo.com
Password: demo123
URL: http://localhost:5000/athlete/dashboard
```

---

## 🏗️ Struttura Progetto

```
Atlas-Performance/
├── app/
│   ├── models/              # Database models (SQLAlchemy)
│   │   ├── shared.py        # User model (multi-ruolo)
│   │   ├── super_admin.py   # Tenant, Subscription, Analytics
│   │   └── trainer.py       # Athlete, Workout, Exercise, ecc.
│   ├── blueprints/          # Routes (controllers)
│   │   ├── auth/            # Login, Register
│   │   ├── super_admin/     # Dashboard SaaS
│   │   ├── trainer/         # Dashboard Trainer
│   │   ├── athlete/         # App Atleta
│   │   └── public/          # Landing page
│   ├── services/            # Business logic
│   │   ├── stripe_service.py         # Subscription Stripe
│   │   ├── tenant_manager.py         # Gestione tenants
│   │   ├── workout_builder.py        # Creazione schede
│   │   └── progression_algorithm.py  # Carico progressivo AI
│   ├── middleware/          # Multi-tenant context
│   ├── templates/           # Jinja2 HTML templates
│   ├── static/              # CSS, JS, uploads
│   └── __init__.py          # Flask factory pattern
├── migrations/              # Database migrations (Alembic)
├── config.py                # Configurazione multi-ambiente
├── requirements.txt         # Dipendenze Python
├── run.py                   # Entry point applicazione
└── .env                     # Variabili d'ambiente (SECRET!)
```

---

## 🌐 Deployment Production

### Opzione 1: Railway (Raccomandato - Facile)
```bash
# Installa Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up

# Aggiungi PostgreSQL
railway add postgresql

# Imposta variabili d'ambiente in Railway Dashboard
# DATABASE_URL, STRIPE keys, SECRET_KEY, ecc.
```

### Opzione 2: Heroku
```bash
# Crea app Heroku
heroku create atlas-performance

# Aggiungi PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Imposta variabili
heroku config:set SECRET_KEY=your_secret_key
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
# ... (tutte le altre variabili)

# Deploy
git push heroku main

# Migra database
heroku run flask db upgrade
heroku run flask seed-db
```

### Opzione 3: VPS (AWS, DigitalOcean, ecc.)
```bash
# Server requirements
# - Python 3.8+
# - PostgreSQL 12+
# - Nginx + Gunicorn

# Installa dipendenze
pip install -r requirements.txt
pip install gunicorn

# Avvia con Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 run:app

# Nginx config (reverse proxy)
server {
    listen 80;
    server_name atlasperformance.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔐 Sicurezza Production

### Checklist prima del deploy:
- [ ] Cambia `SECRET_KEY` con valore random sicuro
- [ ] Usa `FLASK_ENV=production`
- [ ] Imposta `FLASK_DEBUG=False`
- [ ] Usa PostgreSQL invece di SQLite
- [ ] Attiva HTTPS (certificato SSL)
- [ ] Cambia password Super Admin
- [ ] Usa Stripe **Live Keys** (non test)
- [ ] Configura webhook Stripe con URL HTTPS
- [ ] Abilita CORS se necessario
- [ ] Backup automatico database

---

## 📚 Comandi Utili

```bash
# Accedi a Flask shell interattivo
flask shell

# Crea nuovo super admin
>>> from app.models.shared import User
>>> from app.models import db
>>> admin = User(email='nuovoadmin@example.com', first_name='Admin', last_name='User', role='super_admin')
>>> admin.set_password('password123')
>>> db.session.add(admin)
>>> db.session.commit()

# Reset database (ATTENZIONE: Cancella tutti i dati!)
flask db downgrade base
flask db upgrade
flask seed-db

# Crea migration dopo modifica models
flask db migrate -m "Descrizione modifica"
flask db upgrade
```

---

## 🐛 Troubleshooting

### Errore: "No such table: users"
```bash
# Ricrea database
flask init-db
flask seed-db
```

### Errore: "CSRF token missing"
```bash
# Verifica che SECRET_KEY sia impostata in .env
# Riavvia Flask dopo modifica .env
```

### Errore Stripe: "No such price"
```bash
# Verifica che i Price IDs in .env corrispondano a Stripe Dashboard
# Usa test mode per sviluppo
```

### Porta 5000 già in uso
```bash
# Cambia porta
flask run --port 8000
```

---

## 📞 Supporto

Per domande o problemi:
- **Email**: support@atlasperformance.com
- **GitHub Issues**: Apri un issue su GitHub
- **Documentazione Flask**: https://flask.palletsprojects.com/
- **Documentazione Stripe**: https://stripe.com/docs

---

## 🎯 Prossimi Passi

1. ✅ Avvia l'app in locale
2. ✅ Esplora le 3 dashboard (Super Admin, Trainer, Athlete)
3. ✅ Crea un workout di prova
4. ✅ Configura Stripe test mode
5. ✅ Personalizza il design (TailwindCSS in templates)
6. 🚀 Deploy in production!

**Buon lavoro con Atlas Performance!** 💪
