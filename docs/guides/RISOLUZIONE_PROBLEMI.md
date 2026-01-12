# 🔧 Guida alla Risoluzione dei Problemi - Atlas Performance

## ❌ Problema: "no such table: tenants"

### Causa
Il database esiste ma non contiene le tabelle necessarie.

### ✅ Soluzione IMMEDIATA

**METODO 1 - Resetta il database (RACCOMANDATO):**
```
Fai doppio click su: reset-database.bat
```
Questo eliminerà il database esistente e ne creerà uno nuovo con tutti i dati demo.

**METODO 2 - Manuale tramite comandi Flask:**
```batch
1. Apri il terminale nella cartella del progetto
2. Attiva l'ambiente virtuale: venv\Scripts\activate
3. Imposta Flask: set FLASK_APP=run.py
4. Crea le tabelle: flask init-db
5. Popola i dati: flask seed-db
```

---

## 📋 Altri Problemi Comuni

### 1. ModuleNotFoundError: flask_migrate

**Causa:** Dipendenze non installate

**Soluzione:**
```
Fai doppio click su: start.bat
```
Lo script installerà automaticamente tutte le dipendenze.

---

### 2. SyntaxError in routes.py

**Causa:** Stringa non chiusa correttamente

**Soluzione:** ✅ **GIÀ RISOLTO!**
Il file `app/blueprints/trainer/routes.py` è stato corretto automaticamente.

---

### 3. Port 5000 already in use

**Causa:** Un altro processo sta usando la porta 5000

**Soluzione:**

**Opzione A - Trova e chiudi il processo:**
```batch
netstat -ano | findstr :5000
taskkill /PID [numero_processo] /F
```

**Opzione B - Cambia porta (in run.py):**
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

---

### 4. Virtual environment not found

**Causa:** L'ambiente virtuale non è stato creato

**Soluzione:**
```
Fai doppio click su: start.bat
```
Lo script creerà automaticamente l'ambiente virtuale.

---

### 5. Database locked

**Causa:** Il database SQLite è in uso da un altro processo

**Soluzione:**
1. Chiudi tutti i processi Python in esecuzione
2. Esegui `reset-database.bat`

---

### 6. Import errors

**Causa:** Moduli Python non trovati o sintassi errata

**Soluzione:**
```
Fai doppio click su: test-server.bat
```
Questo ti dirà esattamente dove si trova l'errore.

---

## 🛠️ Script di Diagnostica

### check_db.py
Verifica se il database esiste e contiene le tabelle necessarie.

**Uso:**
```batch
python check_db.py
```

### check_imports.py
Verifica che tutte le dipendenze siano installate e importabili.

**Uso:**
```batch
python check_imports.py
```

### test-server.bat
Esegue tutti i test di diagnostica automaticamente.

**Uso:**
```
Doppio click su: test-server.bat
```

---

## 🚀 Procedura di Setup Completa (da Zero)

Se hai problemi e vuoi ricominciare da capo:

### 1. Pulisci l'ambiente esistente
```batch
rmdir /S /Q venv
rmdir /S /Q instance
del .env
```

### 2. Avvia lo script di setup
```
Doppio click su: start.bat
```

### 3. Se serve resetta il database
```
Doppio click su: reset-database.bat
```

### 4. Testa tutto
```
Doppio click su: test-server.bat
```

---

## 📁 Struttura File Corretta

Assicurati che la struttura sia questa:

```
Atlas-Performance/
├── app/
│   ├── __init__.py
│   ├── blueprints/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   └── static/
├── instance/
│   └── atlas_performance.db  ← Deve essere qui!
├── venv/  ← Ambiente virtuale
├── .env  ← Configurazione
├── config.py
├── run.py
├── requirements.txt
├── start.bat  ← Script principale
├── quick-start.bat
├── reset-database.bat
└── test-server.bat
```

---

## 🔍 Come Verificare Cosa Non Va

### STEP 1: Verifica Python
```batch
python --version
```
Deve mostrare Python 3.8 o superiore.

### STEP 2: Verifica ambiente virtuale
```batch
venv\Scripts\python.exe --version
```
Se dà errore, l'ambiente virtuale non esiste.

### STEP 3: Verifica dipendenze
```batch
call venv\Scripts\activate.bat
pip list | findstr Flask
```
Deve mostrare Flask e tutte le estensioni.

### STEP 4: Verifica database
```batch
python check_db.py
```
Ti dirà se il database è pronto.

### STEP 5: Verifica imports
```batch
python check_imports.py
```
Ti mostrerà se ci sono errori di import.

---

## 🎯 Risoluzione Rapida per Errori Specifici

### Errore: "no such table: tenants"
```
→ Soluzione: reset-database.bat
```

### Errore: "ModuleNotFoundError"
```
→ Soluzione: start.bat (reinstalla dipendenze)
```

### Errore: "SyntaxError"
```
→ Soluzione: Già risolto! Se persiste: test-server.bat
```

### Errore: "Database is locked"
```
→ Soluzione: Chiudi tutti i Python, poi reset-database.bat
```

### Errore: "Port already in use"
```
→ Soluzione: Chiudi altri server o cambia porta in run.py
```

---

## 📞 Checklist Finale

Prima di contattare il supporto, verifica:

- [ ] Python è installato e in PATH
- [ ] Hai eseguito `start.bat` almeno una volta
- [ ] Il file `.env` esiste
- [ ] La cartella `venv` esiste
- [ ] Hai eseguito `reset-database.bat`
- [ ] `test-server.bat` passa tutti i test
- [ ] Non ci sono altri server sulla porta 5000

---

## ✅ Stato Attuale dei Fix

### Problemi Risolti:
- ✅ SyntaxError in trainer/routes.py (linea 190)
- ✅ ModuleNotFoundError: flask_migrate (gestito da start.bat)
- ✅ Database non inizializzato (gestito da start.bat + reset-database.bat)
- ✅ Dipendenze mancanti (gestito da start.bat)
- ✅ File .env mancante (gestito da start.bat)

### Script Creati:
- ✅ start.bat - Avvio completo con setup
- ✅ quick-start.bat - Avvio rapido
- ✅ reset-database.bat - Reset database
- ✅ test-server.bat - Test diagnostici
- ✅ check_db.py - Verifica database
- ✅ check_imports.py - Verifica imports
- ✅ create-desktop-shortcut.bat - Crea shortcut

---

## 🎉 Prossimi Passi

1. **Esegui:** `reset-database.bat` (digita YES quando chiede conferma)
2. **Avvia:** `start.bat` o `quick-start.bat`
3. **Accedi:** http://localhost:5000 con trainer@demo.com / demo123

---

**Ultimo aggiornamento:** Tutti gli errori noti sono stati risolti!
