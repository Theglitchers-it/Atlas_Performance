# Deployment Checklist - Atlas Performance

## Pre-Deploy Checklist

### 1. Frontend Build System

- [ ] Esegui `npm install` per installare dipendenze
- [ ] Esegui `npm run build` per generare asset produzione
- [ ] Verifica che `dist/manifest.json` sia stato generato
- [ ] Verifica dimensioni bundle (dovrebbero essere ~96 KB gzipped)
- [ ] Testa l'app in modalità produzione locale:
  ```bash
  FLASK_ENV=production python run.py
  ```

### 2. Variabili d'Ambiente

- [ ] Configura `SECRET_KEY` (min 32 caratteri)
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- [ ] Configura `DATABASE_URL` per database produzione
- [ ] Configura `MAIL_SERVER`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- [ ] Configura chiavi Stripe:
  - `STRIPE_PUBLIC_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- [ ] (Opzionale) Configura AWS S3:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
- [ ] (Opzionale) Configura Redis:
  - `REDIS_URL`

### 3. Database

- [ ] Esegui migrations:
  ```bash
  flask db upgrade
  ```
- [ ] (Opzionale) Esegui seed per dati iniziali:
  ```bash
  flask seed-db
  ```
- [ ] Verifica connessione database
- [ ] Backup database esistente (se applicabile)

### 4. File Statici

- [ ] Includi cartella `dist/` nel deploy
- [ ] Verifica permessi cartella uploads:
  ```bash
  chmod -R 755 app/static/uploads
  ```
- [ ] (Opzionale) Configura CDN per servire asset da `dist/`

### 5. Security

- [ ] HTTPS abilitato e certificato SSL valido
- [ ] `SESSION_COOKIE_SECURE=True` in produzione
- [ ] Firewall configurato (porta 80/443 aperte, 5000 chiusa)
- [ ] Rate limiting abilitato (verifica `RATELIMIT_ENABLED=True`)
- [ ] CSP headers verificati in `app/__init__.py`
- [ ] Verifica che debug mode sia disabilitato:
  ```bash
  # In .env o variabili ambiente
  FLASK_ENV=production
  DEBUG=False
  ```

### 6. Performance

- [ ] Gzip compression abilitato sul web server
- [ ] Browser caching configurato per asset statici
- [ ] Redis configurato per caching (se disponibile)
- [ ] CDN configurato per asset (se disponibile)
- [ ] Verifica tempi di risposta con `curl -w "@curl-format.txt"`

### 7. Monitoring & Logging

- [ ] Configura log rotation
- [ ] Setup monitoring (es. Sentry, New Relic)
- [ ] Configura alerting per errori critici
- [ ] Verifica che i log non contengano dati sensibili

### 8. Backup Strategy

- [ ] Backup database automatico configurato
- [ ] Backup uploads configurato (S3 o backup locale)
- [ ] Test restore procedure
- [ ] Documenta recovery time objective (RTO)

## Deploy Commands

### Opzione 1: Deploy Manuale

```bash
# 1. Pull latest code
git pull origin main

# 2. Activate venv
source venv/bin/activate  # Linux/Mac
# oppure
venv\Scripts\activate  # Windows

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Install Node dependencies
npm install

# 5. Build frontend assets
npm run build

# 6. Run database migrations
flask db upgrade

# 7. Restart application
sudo systemctl restart atlas-performance  # systemd
# oppure
pm2 restart atlas-performance  # pm2
```

### Opzione 2: Docker Deploy

```bash
# 1. Build image
docker build -t atlas-performance:latest .

# 2. Run container
docker-compose up -d

# 3. Run migrations
docker-compose exec web flask db upgrade
```

### Opzione 3: Script Automatico (Windows)

```bash
build-production.bat
# Poi deploy manualmente i file
```

## Post-Deploy Verification

### 1. Smoke Tests

- [ ] Homepage carica correttamente
- [ ] Login funziona
- [ ] Dashboard carica senza errori
- [ ] Asset statici caricano (verifica Network tab)
- [ ] JavaScript funziona (Alpine.js, Chart.js)
- [ ] CSS corretto (TailwindCSS)

### 2. Performance Tests

```bash
# Test velocità homepage
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com

# Lighthouse score
lighthouse https://your-domain.com --view
```

- [ ] Time to First Byte (TTFB) < 200ms
- [ ] First Contentful Paint (FCP) < 1.5s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Total page size < 1MB
- [ ] Lighthouse score > 90

### 3. Security Tests

```bash
# SSL Labs test
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Security headers
curl -I https://your-domain.com
```

- [ ] SSL rating A o superiore
- [ ] Security headers presenti (CSP, HSTS, etc.)
- [ ] Nessun warning nel browser console
- [ ] CSRF protection funzionante

### 4. Functionality Tests

- [ ] User registration funziona
- [ ] Email sending funziona
- [ ] File upload funziona
- [ ] Stripe payments funzionano (test mode)
- [ ] Database queries performano bene
- [ ] Rate limiting funziona

## Rollback Procedure

Se qualcosa va storto:

```bash
# 1. Revert to previous version
git checkout [previous-commit-hash]

# 2. Rebuild assets
npm run build

# 3. Rollback database (se necessario)
flask db downgrade

# 4. Restart application
sudo systemctl restart atlas-performance
```

## Emergency Contacts

- **Developer**: [Your contact]
- **DevOps**: [DevOps contact]
- **Database Admin**: [DBA contact]
- **Hosting Provider**: [Provider support]

## Common Issues & Solutions

### Issue: CSS not loading

**Solution**:
```bash
# Rebuild assets
npm run build

# Clear browser cache
Ctrl+Shift+R (hard reload)
```

### Issue: 500 Internal Server Error

**Check**:
1. Application logs: `tail -f /var/log/atlas-performance/error.log`
2. Database connection: `flask shell` → test query
3. Environment variables: verify all required vars are set

### Issue: Slow performance

**Check**:
1. Database indexes: run `EXPLAIN` on slow queries
2. Redis connection: verify caching is working
3. Asset sizes: verify gzip is enabled
4. CDN: verify assets are being served from CDN

## Maintenance Windows

Schedule regular maintenance windows for:
- Database optimization
- Log rotation
- Dependency updates
- Security patches

Recommended: **Sunday 2-4 AM local time** (low traffic)

## Success Criteria

Deploy is considered successful when:

- ✅ All smoke tests pass
- ✅ Performance metrics meet targets
- ✅ Security tests pass
- ✅ No errors in logs for 1 hour post-deploy
- ✅ User feedback is positive

---

**Last Updated**: 2026-01-08
**Version**: 1.0.0
