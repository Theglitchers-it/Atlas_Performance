# Guida Deployment — Atlas Platform

Guida step-by-step per mettere in produzione Atlas su un server VPS Linux (Ubuntu/Debian).

---

## Prerequisiti Server

- **Ubuntu** 22.04+ o Debian 12+
- **Node.js** >= 18.0.0 (consigliato: installa via [nvm](https://github.com/nvm-sh/nvm))
- **MySQL** >= 8.0
- **nginx** (reverse proxy)
- **PM2** (process manager)
- **Certbot** (certificato SSL Let's Encrypt)
- **Git**

```bash
# Installa Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20

# Installa PM2 globalmente
npm install -g pm2

# Installa nginx e certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx mysql-server

# Verifica
node -v    # >= 18.0.0
npm -v     # >= 9.0.0
pm2 -v     # installato
nginx -v   # installato
mysql -V   # >= 8.0
```

---

## 1. Setup Utente e Permessi

```bash
# Crea utente dedicato (non usare root)
sudo adduser atlas
sudo usermod -aG sudo atlas
su - atlas
```

---

## 2. Clone e Installazione

```bash
# Clone del repository
cd /var/www
sudo mkdir atlas
sudo chown atlas:atlas atlas
git clone https://github.com/tuouser/Piattaforma-SaaS-Personal-Trainer.git atlas
cd atlas

# Installa dipendenze
npm run install:all
```

---

## 3. Configurazione Ambiente

```bash
# Copia il template e modifica
cp backend/.env.example backend/.env
nano backend/.env
```

Valori critici da configurare per produzione:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://tuodominio.com

# Database (usa password sicura)
DB_HOST=localhost
DB_USER=atlas_user
DB_PASSWORD=password_sicura_generata
DB_NAME=pt_saas_db

# JWT (genera chiavi uniche)
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=chiave_generata_64_bytes
JWT_REFRESH_SECRET=altra_chiave_generata_64_bytes

# Sentry (opzionale ma consigliato)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Configura anche: SMTP, Stripe, OAuth, VAPID, Firebase...
```

**Genera chiavi JWT sicure:**
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

---

## 4. Setup Database

```bash
# Accedi a MySQL
sudo mysql

# Crea database e utente dedicato
CREATE DATABASE pt_saas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'atlas_user'@'localhost' IDENTIFIED BY 'password_sicura_generata';
GRANT ALL PRIVILEGES ON pt_saas_db.* TO 'atlas_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Importa schema
mysql -u atlas_user -p pt_saas_db < database/schema.sql

# Esegui migrazioni
cd backend && npm run migrate

# Popola dati iniziali (esercizi, titoli, template notifiche)
npm run seed

cd ..
```

---

## 5. Build Frontend

```bash
npm run build
# Output: frontend/dist/
```

---

## 6. Configurazione Nginx

```bash
# Copia la configurazione di produzione
sudo cp nginx/atlas.conf /etc/nginx/sites-available/atlas.conf

# Modifica dominio e percorsi
sudo nano /etc/nginx/sites-available/atlas.conf
# Sostituisci:
#   tuodominio.com → il tuo dominio reale
#   /var/www/atlas → il percorso della tua installazione

# Attiva il sito
sudo ln -s /etc/nginx/sites-available/atlas.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # Rimuovi config default

# Testa e ricarica
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Certificato SSL (Let's Encrypt)

```bash
# Genera certificato (nginx deve essere attivo)
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com

# Verifica rinnovo automatico
sudo certbot renew --dry-run
```

Certbot configura automaticamente il rinnovo via cron/systemd timer.

---

## 8. Avvio con PM2

```bash
cd /var/www/atlas/backend

# Avvia in produzione (cluster mode)
pm2 start pm2.config.js --env production

# Salva la configurazione (auto-start al reboot)
pm2 save
pm2 startup
# Esegui il comando suggerito da pm2 startup

# Installa log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 9. Verifica Deployment

```bash
# Health check
curl -s http://localhost:3000/health | python3 -m json.tool

# Risposta attesa:
# {
#     "status": "ok",
#     "timestamp": "2026-02-24T...",
#     "environment": "production",
#     "database": "connected"
# }

# Verifica nginx
curl -I https://tuodominio.com

# Verifica API
curl -s https://tuodominio.com/api/health | python3 -m json.tool

# Stato PM2
pm2 status
pm2 monit    # Monitor real-time
```

Se il health check restituisce `503` con `"database": "disconnected"`, verifica le credenziali MySQL nel file `.env`.

---

## 10. Comandi Utili Produzione

```bash
# Stato applicazione
pm2 status
pm2 monit

# Log in tempo reale
pm2 logs
pm2 logs atlas-api --lines 100

# Restart (zero-downtime con cluster mode)
pm2 reload atlas-api

# Restart forzato
pm2 restart atlas-api

# Stop
pm2 stop atlas-api
```

---

## 11. Aggiornamenti Futuri

Procedura per aggiornare il codice in produzione:

```bash
cd /var/www/atlas

# 1. Pull ultimi cambiamenti
git pull origin main

# 2. Installa eventuali nuove dipendenze
npm run install:all

# 3. Esegui migrazioni database (se presenti)
cd backend && npm run migrate && cd ..

# 4. Rebuild frontend
npm run build

# 5. Reload backend (zero-downtime)
pm2 reload atlas-api

# 6. Verifica
curl -s http://localhost:3000/health
```

Oppure usa il workflow CI/CD automatico (vedi `.github/workflows/deploy.yml`).

---

## 12. Troubleshooting

### L'app non si avvia
```bash
pm2 logs atlas-api --err --lines 50   # Controlla errori
cat backend/.env                        # Verifica configurazione
```

### Database connection refused
```bash
sudo systemctl status mysql             # MySQL attivo?
mysql -u atlas_user -p -e "SELECT 1"   # Credenziali corrette?
```

### Nginx 502 Bad Gateway
```bash
pm2 status                              # Backend attivo?
curl http://localhost:3000/health       # Backend risponde?
sudo tail -f /var/log/nginx/atlas_error.log
```

### Certificato SSL scaduto
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Memoria piena
```bash
pm2 monit                               # Controlla uso RAM
pm2 restart atlas-api                   # Restart libera memoria
```

---

## Checklist Pre-Launch

- [ ] `NODE_ENV=production` nel `.env`
- [ ] JWT secrets generati con crypto (non valori di default)
- [ ] Password MySQL sicura (non vuota)
- [ ] Certificato SSL attivo e rinnovo automatico verificato
- [ ] PM2 configurato con `pm2 startup` e `pm2 save`
- [ ] Log rotation attiva (`pm2-logrotate`)
- [ ] Firewall configurato (porte 80, 443 aperte; 3000, 3306 solo localhost)
- [ ] Backup database configurato (vedi `docs/BACKUP.md`)
- [ ] Health check risponde `200 OK` su `/health`
- [ ] Sentry DSN configurato (opzionale ma consigliato)
- [ ] SMTP configurato per email transazionali
