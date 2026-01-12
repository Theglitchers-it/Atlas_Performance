# 🚀 Atlas Performance - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 🔐 Sicurezza
- [ ] Cambiato `SECRET_KEY` con valore random sicuro (min 32 caratteri)
- [ ] Impostato `FLASK_ENV=production` in `.env`
- [ ] Impostato `FLASK_DEBUG=False`
- [ ] Rimosso print/log sensibili dal codice
- [ ] Cambiato password default Super Admin
- [ ] Verificato CSRF protection attivo
- [ ] Configurato SESSION_COOKIE_SECURE=True (HTTPS)

### 💾 Database
- [ ] Migrato da SQLite a PostgreSQL
- [ ] Testato tutte le migrations (`flask db upgrade`)
- [ ] Configurato backup automatico database
- [ ] Verificato indici per performance
- [ ] Testato rollback migrations (`flask db downgrade`)

### 💳 Stripe
- [ ] Cambiato da Test Keys a **Live Keys**
- [ ] Verificato Price IDs production in `.env`
- [ ] Configurato webhook endpoint HTTPS
- [ ] Testato checkout flow in production
- [ ] Testato webhook handling
- [ ] Attivato Stripe Customer Portal

### 🌐 Server & Hosting
- [ ] SSL/TLS certificato configurato (Let's Encrypt/Cloudflare)
- [ ] HTTPS forzato (redirect HTTP → HTTPS)
- [ ] Dominio custom configurato
- [ ] DNS records configurati correttamente
- [ ] Firewall configurato (solo porte 80, 443, SSH)
- [ ] Gunicorn/uWSGI configurato con workers appropriati
- [ ] Nginx/Apache reverse proxy configurato
- [ ] Log rotation configurato
- [ ] Monitoring attivo (Sentry, New Relic, etc.)

### 📧 Email & Notifiche (Opzionale)
- [ ] SMTP server configurato
- [ ] Email di benvenuto testata
- [ ] Password reset funzionante
- [ ] Email subscription confirmation

### 🎨 Frontend
- [ ] Testato responsive su mobile/tablet/desktop
- [ ] Verificato tutti i link funzionanti
- [ ] Ottimizzato immagini/video
- [ ] Testato browser compatibility (Chrome, Firefox, Safari)
- [ ] Verificato accessibilità (WCAG)

### 🧪 Testing
- [ ] Testato registrazione nuovo trainer
- [ ] Testato creazione atleta
- [ ] Testato creazione workout
- [ ] Testato log allenamento
- [ ] Testato check-in settimanale
- [ ] Testato upgrade/downgrade subscription
- [ ] Testato cancellazione subscription
- [ ] Load testing eseguito (Apache Bench, Locust)

### 📊 Performance
- [ ] Database query ottimizzate (N+1 problem)
- [ ] CDN configurato per static files
- [ ] Caching implementato (Redis/Memcached)
- [ ] Compressione Gzip/Brotli attiva
- [ ] Static files minificati (CSS/JS)

### 📱 Mobile & PWA (Opzionale)
- [ ] Manifest.json configurato
- [ ] Service Worker per offline support
- [ ] App icons per mobile
- [ ] Meta tags Open Graph/Twitter Card

---

## 🔄 Deployment Steps

### Railway (Raccomandato)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL database
railway add postgresql

# 5. Set environment variables in Railway Dashboard
# - SECRET_KEY
# - FLASK_ENV=production
# - STRIPE_PUBLIC_KEY (live)
# - STRIPE_SECRET_KEY (live)
# - STRIPE_WEBHOOK_SECRET
# - DATABASE_URL (auto-set by Railway)

# 6. Deploy
railway up

# 7. Run migrations
railway run flask db upgrade

# 8. Seed initial data (Super Admin)
railway run flask seed-db
```

### Heroku

```bash
# 1. Create app
heroku create atlas-performance

# 2. Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# 3. Set environment variables
heroku config:set SECRET_KEY=your_secret_key_here
heroku config:set FLASK_ENV=production
heroku config:set STRIPE_PUBLIC_KEY=pk_live_xxx
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxx

# 4. Deploy
git push heroku main

# 5. Run migrations
heroku run flask db upgrade
heroku run flask seed-db

# 6. Open app
heroku open
```

### VPS (DigitalOcean, AWS, etc.)

```bash
# 1. SSH into server
ssh root@your-server-ip

# 2. Install dependencies
apt update && apt upgrade -y
apt install python3 python3-pip python3-venv postgresql nginx -y

# 3. Clone repository
cd /var/www
git clone https://github.com/your-username/atlas-performance.git
cd atlas-performance

# 4. Setup virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# 5. Create .env file
nano .env
# (paste production environment variables)

# 6. Setup PostgreSQL
sudo -u postgres createdb atlas_performance
sudo -u postgres createuser atlas_admin
sudo -u postgres psql
ALTER USER atlas_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE atlas_performance TO atlas_admin;

# 7. Run migrations
flask db upgrade
flask seed-db

# 8. Create systemd service
sudo nano /etc/systemd/system/atlas-performance.service
```

**Service file content:**
```ini
[Unit]
Description=Atlas Performance Gunicorn Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/atlas-performance
Environment="PATH=/var/www/atlas-performance/venv/bin"
ExecStart=/var/www/atlas-performance/venv/bin/gunicorn -w 4 -b 0.0.0.0:8000 run:app

[Install]
WantedBy=multi-user.target
```

```bash
# 9. Start service
sudo systemctl start atlas-performance
sudo systemctl enable atlas-performance

# 10. Configure Nginx
sudo nano /etc/nginx/sites-available/atlas-performance
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name atlasperformance.com www.atlasperformance.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/atlas-performance/app/static;
    }
}
```

```bash
# 11. Enable site & restart Nginx
sudo ln -s /etc/nginx/sites-available/atlas-performance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 12. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d atlasperformance.com -d www.atlasperformance.com
```

---

## 🔍 Post-Deployment Verification

### Functionality Tests
```bash
# Test URLs
curl -I https://atlasperformance.com  # Should return 200
curl -I https://atlasperformance.com/auth/login  # Should return 200
curl -I https://atlasperformance.com/api/health  # Should return 200
```

### Database Check
```bash
# SSH into production
flask shell
>>> from app.models.shared import User
>>> User.query.count()  # Should return at least 1 (Super Admin)
```

### Stripe Webhook Test
```bash
# Trigger test event from Stripe Dashboard
# Check application logs for webhook handling
```

---

## 📈 Monitoring & Maintenance

### Log Monitoring
```bash
# View application logs
tail -f /var/log/atlas-performance/app.log

# View Nginx logs
tail -f /var/nginx/access.log
tail -f /var/nginx/error.log

# View systemd service logs
journalctl -u atlas-performance -f
```

### Database Backup
```bash
# Manual backup
pg_dump -U atlas_admin atlas_performance > backup_$(date +%Y%m%d).sql

# Automated daily backup (crontab)
0 2 * * * pg_dump -U atlas_admin atlas_performance > /backups/atlas_$(date +\%Y\%m\%d).sql
```

### Performance Monitoring
- [ ] Setup Sentry for error tracking
- [ ] Configure New Relic/DataDog for APM
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerts for 500 errors
- [ ] Monitor database query performance

---

## 🆘 Rollback Plan

### Quick Rollback
```bash
# Railway/Heroku
railway rollback  # or heroku rollback

# Manual VPS
cd /var/www/atlas-performance
git reset --hard previous_commit_hash
sudo systemctl restart atlas-performance

# Database rollback
flask db downgrade  # Rollback last migration
```

---

## 📞 Emergency Contacts

- **Hosting Support**: [Railway/Heroku/VPS support]
- **Stripe Support**: https://support.stripe.com
- **Database Admin**: [Your DB admin contact]
- **DevOps Team**: [Your DevOps contact]

---

## ✅ Post-Launch Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Check Stripe dashboard for transactions
- [ ] Verify email deliverability
- [ ] Monitor server resources (CPU, RAM, Disk)
- [ ] Collect user feedback

### Week 2-4
- [ ] Optimize slow queries
- [ ] Review security headers (SecurityHeaders.com)
- [ ] Setup automated backups
- [ ] Configure CDN if needed
- [ ] Review and optimize costs

### Monthly
- [ ] Security updates (apt upgrade, pip upgrade)
- [ ] SSL certificate renewal check
- [ ] Database optimization (VACUUM, REINDEX)
- [ ] Review analytics and metrics
- [ ] Plan feature updates

---

**🎉 Congratulations! Atlas Performance is LIVE!**

*Remember: Monitor your application closely in the first 48 hours after deployment.*
