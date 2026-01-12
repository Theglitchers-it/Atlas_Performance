# ⚡ Atlas Performance - Quick Start (5 minuti)

## 🚀 Avvio Rapido

### 1️⃣ Installa Dipendenze (1 min)
```bash
# Crea ambiente virtuale
python -m venv venv

# Attiva ambiente
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Installa requirements
pip install -r requirements.txt
```

### 2️⃣ Setup Database (30 secondi)
```bash
# Crea tabelle database
flask init-db

# Popola con dati demo
flask seed-db
```

### 3️⃣ Avvia Server (10 secondi)
```bash
python run.py
```

**🎉 Fatto!** Vai su **http://localhost:5000**

---

## 🔑 Login Demo

### Super Admin
```
Email: admin@atlasperformance.com
Password: admin123
```

### Trainer
```
Email: trainer@demo.com
Password: demo123
```

### Athlete
```
Email: athlete@demo.com
Password: demo123
```

---

## 🧪 Test Installazione (Opzionale)

```bash
python test_app.py
```

Questo script verifica che tutto sia configurato correttamente.

---

## 🎯 Cosa Provare Subito

### Come Trainer
1. Login con `trainer@demo.com`
2. Vai su "Athletes" → Vedi l'atleta demo
3. Vai su "Workouts" → Crea una nuova scheda
4. Vai su "Exercise Library" → Vedi gli esercizi disponibili

### Come Athlete
1. Login con `athlete@demo.com`
2. Visualizza la scheda del giorno (se assegnata)
3. Prova a loggare un allenamento
4. Fai un check-in settimanale

### Come Super Admin
1. Login con `admin@atlasperformance.com`
2. Visualizza analytics globali
3. Gestisci tenants (trainers)
4. Monitora subscriptions

---

## ⚙️ Configurazione Stripe (Opzionale)

Per testare i pagamenti:

1. Registrati su https://stripe.com
2. Attiva **Test Mode**
3. Vai su **Developers → API Keys**
4. Copia le chiavi in `.env`:
   ```env
   STRIPE_PUBLIC_KEY=pk_test_xxx
   STRIPE_SECRET_KEY=sk_test_xxx
   ```
5. Riavvia server

**Carte test Stripe:**
- Successo: `4242 4242 4242 4242`
- Fallimento: `4000 0000 0000 0002`
- Exp: qualsiasi data futura, CVC: qualsiasi 3 cifre

---

## 📚 Documentazione Completa

Per setup avanzato, deployment, e troubleshooting:
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Guida completa
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklist production
- **[README.md](README.md)** - Overview progetto

---

## 🆘 Problemi Comuni

### "No such table: users"
```bash
flask init-db
```

### "Port 5000 already in use"
```bash
flask run --port 8000
```

### "ModuleNotFoundError"
```bash
pip install -r requirements.txt
```

---

## 🎉 Hai Finito!

Ora puoi:
- ✅ Esplorare le 3 dashboard
- ✅ Creare workout personalizzati
- ✅ Testare il sistema multi-tenant
- ✅ Modificare il codice e vedere le modifiche
- ✅ Leggere la documentazione completa

**Buon divertimento con Atlas Performance!** 💪
