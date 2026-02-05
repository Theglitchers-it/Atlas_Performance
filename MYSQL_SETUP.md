# 🗄️ MySQL Setup con XAMPP

Guida rapida per configurare Atlas Performance con MySQL usando XAMPP.

---

## 📋 Prerequisiti

- **XAMPP** installato (include MySQL 5.7+)
- **Python 3.8+** con virtual environment
- Il progetto Atlas Performance clonato

---

## 🚀 Setup Rapido (5 minuti)

### 1️⃣ Avvia MySQL in XAMPP

1. Apri **XAMPP Control Panel**
2. Clicca **Start** accanto a **MySQL**
3. Verifica che lo status diventi verde

### 2️⃣ Crea il Database

**Opzione A: Da phpMyAdmin (GUI)**
1. Clicca su **Admin** accanto a MySQL in XAMPP
2. Vai su **Databases**
3. Crea database: `atlas_performance`
4. Collation: `utf8mb4_unicode_ci` (raccomandato)

**Opzione B: Da Terminale/Shell**
```bash
# Accedi a MySQL (XAMPP default: no password)
mysql -u root -p
# Premi invio quando chiede la password (è vuota di default)

# Crea database
CREATE DATABASE atlas_performance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verifica
SHOW DATABASES;

# Esci
EXIT;
```

### 3️⃣ Configura il Progetto

**Crea/Modifica il file `.env`** nella root del progetto:

```bash
# Database MySQL (XAMPP Default)
DATABASE_URL=mysql+pymysql://root:@localhost:3306/atlas_performance

# NOTA: Se hai impostato una password per MySQL:
# DATABASE_URL=mysql+pymysql://root:TUA_PASSWORD@localhost:3306/atlas_performance
```

### 4️⃣ Installa le Dipendenze Python

```bash
# Attiva virtual environment
.\venv\Scripts\activate  # Windows
# oppure
source venv/bin/activate  # Linux/Mac

# Installa dipendenze (include pymysql)
pip install -r requirements.txt
```

### 5️⃣ Esegui le Migrations

```bash
# Inizializza Alembic (solo prima volta, già fatto se esiste cartella migrations/)
# flask db init

# Esegui le migrations per creare le tabelle
flask db upgrade

# Verifica che le tabelle siano state create
# Torna in phpMyAdmin e controlla il database atlas_performance
```

### 6️⃣ Avvia l'Applicazione

```bash
# Avvia Flask
python run.py

# Oppure usa lo script rapido
.\AVVIA SERVER.bat
```

---

## ✅ Verifica Installazione

Controlla che tutto funzioni:

```bash
# Test connessione database
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); print('✅ Database connesso!') if db.engine.connect() else print('❌ Errore')"
```

Oppure vai su **phpMyAdmin** e verifica che il database `atlas_performance` contenga **17 tabelle**:

- athletes
- body_measurements
- check_ins
- exercises
- fitness_goals
- food_logs
- global_analytics
- machines
- meal_plans
- messages
- personal_records
- progress_logs
- subscriptions
- tenants
- uploaded_files
- users
- workout_exercises
- workouts

---

## 🔧 Troubleshooting

### ❌ Errore: "Can't connect to MySQL server"

**Soluzione:**
1. Verifica che MySQL sia **avviato in XAMPP** (status verde)
2. Controlla che la porta sia **3306** (default XAMPP)
3. Prova: `mysql -u root -p` da terminale per verificare accesso

### ❌ Errore: "Access denied for user 'root'@'localhost'"

**Soluzione:**
1. XAMPP default: **no password**
   ```
   DATABASE_URL=mysql+pymysql://root:@localhost:3306/atlas_performance
   ```
2. Se hai impostato una password, aggiungila:
   ```
   DATABASE_URL=mysql+pymysql://root:TUA_PASSWORD@localhost:3306/atlas_performance
   ```

### ❌ Errore: "Unknown database 'atlas_performance'"

**Soluzione:**
1. Crea il database manualmente (vedi Step 2)
2. Verifica nome database: deve essere esattamente `atlas_performance` (minuscolo)

### ❌ Errore: "No module named 'pymysql'"

**Soluzione:**
```bash
pip install pymysql cryptography
```

### ❌ Errore: "JSON type not supported"

**Problema:** MySQL versione troppo vecchia (< 5.7)

**Soluzione:**
1. Verifica versione MySQL:
   ```bash
   mysql --version
   ```
2. Se < 5.7, aggiorna XAMPP alla versione più recente
3. Oppure scarica MySQL 8.0+ standalone

---

## 🔐 Security - Password MySQL

**IMPORTANTE per Production:**

XAMPP di default **non ha password** per l'utente root. Questo va bene per sviluppo locale, ma **NON per production**.

### Imposta password MySQL (Production):

```bash
# Metodo 1: Da terminale
mysql -u root -p
# Premi invio (no password)

SET PASSWORD FOR 'root'@'localhost' = PASSWORD('TuaPasswordSicura123!');
FLUSH PRIVILEGES;
EXIT;

# Metodo 2: Da XAMPP Shell
mysqladmin -u root password TuaPasswordSicura123!
```

Poi aggiorna `.env`:
```bash
DATABASE_URL=mysql+pymysql://root:TuaPasswordSicura123!@localhost:3306/atlas_performance
```

---

## 📊 Performance Tips

### Ottimizzazione MySQL per Development

Modifica `my.ini` in XAMPP (di solito: `C:\xampp\mysql\bin\my.ini`):

```ini
[mysqld]
innodb_buffer_pool_size = 256M
max_connections = 100
query_cache_size = 32M
```

Riavvia MySQL in XAMPP dopo le modifiche.

---

## 🔄 Migrazione da SQLite a MySQL

Se hai già dati in SQLite e vuoi migrarli:

1. **Backup SQLite:**
   ```bash
   cp atlas_performance.db atlas_performance.db.backup
   ```

2. **Export/Import manuale** (per pochi dati):
   - Usa uno script Python per leggere da SQLite e scrivere in MySQL

3. **Oppure ricomincia da zero** (raccomandato per dev):
   ```bash
   # Usa il nuovo MySQL database
   flask db upgrade
   # Ricrea utenti e dati di test
   ```

---

## 📚 Risorse

- [XAMPP Official Docs](https://www.apachefriends.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQLAlchemy MySQL Docs](https://docs.sqlalchemy.org/en/20/dialects/mysql.html)
- [PyMySQL GitHub](https://github.com/PyMySQL/PyMySQL)

---

## ✨ Pronto!

Il database MySQL è configurato e funzionante con XAMPP! 🎉

Per qualsiasi problema, consulta la sezione **Troubleshooting** o apri una issue su GitHub.
