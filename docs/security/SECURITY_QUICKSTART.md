# 🚀 Security & Performance - Quick Start Guide

Guida rapida per utilizzare le nuove funzionalità di sicurezza e performance in Atlas Performance.

---

## 📦 Installazione Rapida

### 1. Installa dipendenze

```bash
pip install -r requirements.txt
```

### 2. Configura variabili d'ambiente

Copia `.env.example` in `.env` e modifica:

```bash
cp .env.example .env
```

Variabili minime richieste:
```bash
SECRET_KEY=your-very-long-secret-key-min-32-characters
FLASK_ENV=development
```

Opzionali (per production):
```bash
REDIS_URL=redis://localhost:6379/0
CDN_ENABLED=true
```

### 3. Verifica installazione

```bash
# Esegui i test
pytest

# O usa lo script
scripts\run_tests.bat  # Windows
./scripts/run_tests.sh # Linux/Mac
```

---

## 🔒 Security Features - Uso Rapido

### Rate Limiting (Già Attivo)

Nessuna configurazione richiesta! Rate limiting è già attivo con limiti di default:
- 100 requests/ora
- 20 requests/minuto

Per personalizzare su specifici endpoint:

```python
from app import limiter

@app.route('/api/sensitive')
@limiter.limit("10 per minute")
def sensitive_endpoint():
    return jsonify(data)
```

### Input Validation

```python
from app.services.security_service import SecurityService

# Valida email
if SecurityService.validate_email(email):
    # OK

# Valida numero di telefono
if SecurityService.validate_phone(phone):
    # OK

# Sanitizza HTML (rimuove XSS)
safe_html = SecurityService.sanitize_html(user_content)

# Solo testo (rimuove tutti i tag HTML)
plain_text = SecurityService.sanitize_plain_text(user_input)

# Nome file sicuro
safe_name = SecurityService.secure_filename(file.filename)
```

### CSRF Protection (Già Attivo)

Tutti i form sono già protetti. Nei template:

```html
<form method="POST">
    {{ form.hidden_tag() }}  <!-- Include CSRF token -->
    <!-- Altri campi -->
</form>
```

---

## ⚡ Performance - Uso Rapido

### Caching

```python
from app.services.cache_service import cache_query

# Cache query database (5 minuti)
@cache_query('athletes', timeout='medium')
def get_athletes(tenant_id):
    return Athlete.query.filter_by(tenant_id=tenant_id).all()

# Cache API response (1 minuto)
from app.services.cache_service import cache_api_response

@app.route('/api/workouts')
@cache_api_response(timeout='short')
def get_workouts():
    return jsonify(workouts)

# Invalidare cache quando i dati cambiano
from app.services.cache_service import CacheInvalidator

# Dopo aver aggiornato un atleta
CacheInvalidator.on_athlete_update(athlete_id, tenant_id)
```

**Timeout disponibili**:
- `short`: 1 minuto
- `medium`: 5 minuti
- `long`: 30 minuti
- `very_long`: 1 ora
- `daily`: 24 ore

### Image Optimization

```python
from app.services.image_optimizer import ImageOptimizer

# Ottimizza immagine
result = ImageOptimizer.optimize_image(
    image_path='uploads/photo.jpg',
    size_name='medium',  # 600x600
    format='webp'
)

# Crea set completo (thumbnail, small, medium, large)
responsive = ImageOptimizer.create_responsive_set(
    image_path='uploads/photo.jpg',
    formats=['webp', 'jpeg']  # WebP + fallback JPEG
)

# Comprimi a dimensione target
result = ImageOptimizer.compress_to_target_size(
    image_path='large.jpg',
    target_size_kb=300,  # Max 300KB
    format='jpeg'
)
```

**Dimensioni disponibili**:
- `thumbnail`: 150x150
- `small`: 300x300
- `medium`: 600x600
- `large`: 1200x1200
- `hero`: 1920x1080

### Lazy Loading Immagini

Nei template Jinja2:

```html
<!-- Metodo 1: Component riutilizzabile (raccomandato) -->
{% include 'components/lazy_image.html' with
    src=athlete.photo_url,
    alt="Photo of athlete",
    class="rounded-lg w-full",
    sizes="(max-width: 768px) 100vw, 50vw"
%}

<!-- Metodo 2: Manuale con data-src -->
<img
    data-src="{{ athlete.photo_url }}"
    alt="Athlete photo"
    class="lazy-load"
    loading="lazy"
>

<script src="{{ url_for('static', filename='js/lazy-load.js') }}"></script>
```

---

## 🧪 Testing - Uso Rapido

### Eseguire tutti i test

```bash
pytest
```

### Test con coverage

```bash
pytest --cov=app --cov-report=html
```

Apri `htmlcov/index.html` nel browser per vedere il report.

### Test specifici

```bash
# Solo unit test
pytest tests/unit/

# Solo integration test
pytest tests/integration/

# Test specifico
pytest tests/unit/test_models.py::TestUserModel::test_create_user

# Test con marker
pytest -m security  # Solo test di sicurezza
```

### Scrivere nuovo test

```python
# tests/unit/test_my_feature.py
import pytest

class TestMyFeature:
    def test_something(self, app):
        """Test description"""
        with app.app_context():
            result = do_something()
            assert result == expected
```

---

## 🌐 CDN Setup (Opzionale - Production)

### 1. Configura AWS S3

```bash
# .env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=atlas-performance-assets
AWS_REGION=eu-west-1
```

### 2. Upload assets a S3

```python
from app.services.cdn_service import CDNService

# Upload singolo file
result = CDNService.upload_to_s3(
    file_path='app/static/css/style.css',
    s3_key='static/css/style.css'
)

# Sync intera directory
result = CDNService.sync_directory_to_s3(
    local_dir='app/static',
    s3_prefix='static'
)
```

### 3. Configura Cloudflare CDN

```bash
# .env
CDN_ENABLED=true
CLOUDFLARE_CDN_DOMAIN=cdn.atlasperformance.com
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### 4. Usa CDN URLs nei template

```python
# Template helper
from app.services.cdn_service import static_url, upload_url

# In template
<link rel="stylesheet" href="{{ static_url('css/style.css') }}">
<img src="{{ upload_url(athlete.avatar) }}">
```

---

## 📊 Monitoring & Debug

### Controllare cache hit rate

```python
from app import cache

# Statistiche cache (se Redis configurato)
stats = cache.get_stats()
```

### Controllare rate limiting

```bash
# Prova a fare troppe richieste
for i in range(150; do
    curl http://localhost:5000/
done

# Dopo 100 richieste dovresti ricevere 429 Too Many Requests
```

### Debug test falliti

```bash
# Con debugger
pytest --pdb  # Drop in debugger on failure

# Con output verbose
pytest -vv  # Very verbose

# Con print statements
pytest -s  # Show print output
```

---

## 🚀 Deployment Checklist

Prima di andare in production:

### Development → Production

1. **Environment**:
```bash
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=<generate-strong-random-key>
```

2. **Database**:
```bash
DATABASE_URL=postgresql://user:pass@host/db
```

3. **Redis** (raccomandato):
```bash
REDIS_URL=redis://localhost:6379/0
```

4. **CDN** (opzionale ma raccomandato):
```bash
CDN_ENABLED=true
# Configura S3 e Cloudflare
```

5. **HTTPS**: Assicurati che sia configurato

6. **Test finale**:
```bash
# In ambiente di staging
pytest
```

---

## ❓ FAQ & Troubleshooting

### Q: I test falliscono con "Module not found"

```bash
# Installa dipendenze test
pip install pytest pytest-cov pytest-flask
```

### Q: Rate limiting non funziona

Verifica in `.env`:
```bash
RATELIMIT_ENABLED=True
```

Per production usa Redis invece di memory:
```bash
REDIS_URL=redis://localhost:6379/0
```

### Q: Le immagini non vengono ottimizzate

Verifica che Pillow sia installato:
```bash
pip install Pillow==10.1.0
```

### Q: Cache non invalida quando aggiorno dati

Usa i metodi di invalidazione:
```python
from app.services.cache_service import CacheInvalidator

# Dopo update
CacheInvalidator.on_athlete_update(athlete_id, tenant_id)
CacheInvalidator.on_workout_update(workout_id, tenant_id)
```

### Q: CDN upload fallisce

Verifica credenziali AWS:
```bash
aws s3 ls s3://your-bucket  # Test AWS CLI
```

Verifica configurazione:
```python
from app.services.cdn_service import CDNService
result = CDNService.upload_to_s3(...)
print(result)  # Check error message
```

---

## 📚 Documentazione Completa

Per maggiori dettagli:

- **Security completa**: Leggi `SECURITY.md`
- **Testing guide**: Leggi `tests/README.md`
- **Implementation details**: Leggi `IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Quick Wins

Usa questi subito per miglioramenti immediati:

1. ✅ **Rate Limiting**: Già attivo, niente da fare
2. ✅ **CSRF Protection**: Già attivo, usa `{{ form.hidden_tag() }}`
3. ✅ **Input Validation**: Usa `SecurityService.sanitize_html()`
4. ✅ **Caching**: Aggiungi `@cache_query()` alle query lente
5. ✅ **Lazy Loading**: Usa `components/lazy_image.html`
6. ✅ **Image Optimization**: Chiama `ImageOptimizer.optimize_image()`

---

**Happy Coding! 🚀**

Per domande: Controlla la documentazione completa o i file di esempio nei test.
