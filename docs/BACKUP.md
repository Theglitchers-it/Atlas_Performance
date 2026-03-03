# Backup & Restore Database — Atlas Platform

Procedura per backup, restore e disaster recovery del database MySQL.

---

## Backup Manuale

```bash
# Backup completo con struttura e dati
mysqldump -u atlas_user -p \
  --single-transaction \
  --routines \
  --triggers \
  --databases pt_saas_db \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Verifica dimensione
ls -lh backup_*.sql.gz
```

Opzioni usate:
- `--single-transaction` — Backup consistente senza lock (InnoDB)
- `--routines` — Include stored procedure
- `--triggers` — Include trigger
- `gzip` — Compressione (riduce ~80% la dimensione)

---

## Backup Automatico (Cron)

### 1. Crea lo script di backup

```bash
sudo nano /opt/atlas-backup.sh
```

Contenuto:

```bash
#!/bin/bash
# =============================================================================
# Atlas Platform — Backup automatico database
# =============================================================================

# Configurazione
DB_USER="atlas_user"
DB_PASS="la_tua_password"
DB_NAME="pt_saas_db"
BACKUP_DIR="/var/backups/atlas"
RETENTION_DAYS=7
RETENTION_WEEKS=4

# Crea directory se non esiste
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

# Nome file con data
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
FILENAME="atlas_${DATE}.sql.gz"

# Esegui backup
mysqldump -u "$DB_USER" -p"$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "$DB_NAME" \
  2>/dev/null | gzip > "$BACKUP_DIR/daily/$FILENAME"

# Verifica che il backup non sia vuoto
if [ ! -s "$BACKUP_DIR/daily/$FILENAME" ]; then
  echo "[ERRORE] Backup fallito: file vuoto" >&2
  rm -f "$BACKUP_DIR/daily/$FILENAME"
  exit 1
fi

SIZE=$(du -h "$BACKUP_DIR/daily/$FILENAME" | cut -f1)
echo "[OK] Backup giornaliero: $FILENAME ($SIZE)"

# Copia settimanale (ogni domenica)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  cp "$BACKUP_DIR/daily/$FILENAME" "$BACKUP_DIR/weekly/"
  echo "[OK] Copia settimanale creata"
fi

# Rotazione: elimina backup giornalieri > 7 giorni
find "$BACKUP_DIR/daily" -name "atlas_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[OK] Backup giornalieri > ${RETENTION_DAYS} giorni eliminati"

# Rotazione: elimina backup settimanali > 4 settimane
find "$BACKUP_DIR/weekly" -name "atlas_*.sql.gz" -mtime +$((RETENTION_WEEKS * 7)) -delete
echo "[OK] Backup settimanali > ${RETENTION_WEEKS} settimane eliminati"
```

### 2. Rendi eseguibile

```bash
sudo chmod +x /opt/atlas-backup.sh
```

### 3. Configura cron (ogni notte alle 2:00)

```bash
sudo crontab -e
```

Aggiungi:

```
# Backup giornaliero Atlas DB — ogni notte alle 2:00
0 2 * * * /opt/atlas-backup.sh >> /var/log/atlas-backup.log 2>&1
```

### 4. Test

```bash
# Esegui manualmente per verificare
sudo /opt/atlas-backup.sh

# Controlla i file creati
ls -lh /var/backups/atlas/daily/
```

---

## Restore

### Restore completo

```bash
# 1. Decomprimi il backup
gunzip -k /var/backups/atlas/daily/atlas_20260224_020000.sql.gz

# 2. Importa nel database
mysql -u atlas_user -p < /var/backups/atlas/daily/atlas_20260224_020000.sql
```

### Restore su database diverso (test prima del restore)

```bash
# 1. Crea database temporaneo
mysql -u root -p -e "CREATE DATABASE pt_saas_db_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Importa nel database temporaneo
gunzip -c backup_file.sql.gz | sed 's/pt_saas_db/pt_saas_db_restore/g' | mysql -u root -p

# 3. Verifica i dati
mysql -u root -p pt_saas_db_restore -e "SELECT COUNT(*) FROM users;"

# 4. Se tutto ok, sostituisci il database originale
mysql -u root -p -e "DROP DATABASE pt_saas_db; RENAME DATABASE pt_saas_db_restore TO pt_saas_db;"
```

---

## Backup Prima di Migrazioni

**Sempre** fare un backup prima di eseguire migrazioni:

```bash
# 1. Backup pre-migrazione
mysqldump -u atlas_user -p --single-transaction pt_saas_db \
  | gzip > pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Esegui migrazione
cd backend && npm run migrate

# 3. Se la migrazione fallisce, restore
gunzip -c pre_migration_*.sql.gz | mysql -u atlas_user -p pt_saas_db
```

---

## Struttura Backup

```
/var/backups/atlas/
├── daily/                  # Ultimi 7 giorni
│   ├── atlas_20260224_020000.sql.gz
│   ├── atlas_20260223_020000.sql.gz
│   └── ...
└── weekly/                 # Ultime 4 settimane (domenica)
    ├── atlas_20260223_020000.sql.gz
    └── ...
```

---

## Backup Remoto (Opzionale)

Per sicurezza aggiuntiva, copia i backup su storage esterno:

```bash
# Copia su server remoto via rsync
rsync -avz /var/backups/atlas/ user@backup-server:/backups/atlas/

# Oppure su S3
aws s3 sync /var/backups/atlas/ s3://my-bucket/atlas-backups/
```

Aggiungi al cron dopo il backup locale:

```
# Sync backup su remoto — ogni notte alle 3:00
0 3 * * * rsync -avz /var/backups/atlas/ user@backup-server:/backups/atlas/ >> /var/log/atlas-backup-sync.log 2>&1
```

---

## Checklist Disaster Recovery

1. [ ] Backup automatico attivo (cron ogni notte)
2. [ ] Backup remoto configurato (rsync/S3)
3. [ ] Test restore eseguito almeno una volta
4. [ ] Script backup testato manualmente
5. [ ] Log backup monitorati (`/var/log/atlas-backup.log`)
6. [ ] Retention policy attiva (7 giorni + 4 settimanali)
