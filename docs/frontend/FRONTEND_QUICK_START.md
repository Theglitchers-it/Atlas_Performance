# Frontend Build System - Quick Start Guide

## Setup Iniziale (Una Tantum)

```bash
# Installa dipendenze
npm install
```

## Sviluppo

### Opzione 1: Script Automatico (Windows)

```bash
# Avvia entrambi i server automaticamente
start-dev.bat
```

### Opzione 2: Manuale

```bash
# Terminal 1 - Vite Dev Server
npm run dev

# Terminal 2 - Flask
python run.py
```

Poi apri: http://localhost:5000

## Produzione

### Opzione 1: Script Automatico (Windows)

```bash
build-production.bat
```

### Opzione 2: Manuale

```bash
npm run build
```

## Comandi Rapidi

| Comando | Descrizione |
|---------|-------------|
| `npm install` | Installa dipendenze |
| `npm run dev` | Dev server con HMR |
| `npm run build` | Build produzione |
| `npm run watch` | Build automatico al salvataggio |
| `npm run preview` | Preview build produzione |

## File Importanti

- `app/static/src/css/main.css` - CSS principale (modifica questo)
- `app/static/src/js/main.js` - JS principale (modifica questo)
- `app/templates/base_vite.html` - Template base con Vite
- `vite.config.js` - Configurazione Vite
- `tailwind.config.js` - Configurazione TailwindCSS
- `dist/` - Asset buildati (NON modificare manualmente)

## Migrazione Template

### Cambia da:
```html
{% extends "base.html" %}
```

### A:
```html
{% extends "base_vite.html" %}
```

## Risoluzione Problemi

### Asset non trovati in produzione
```bash
npm run build
```

### CORS errors in development
```bash
npm run dev
```

### CSS non applicato
Verifica che `tailwind.config.js` includa i tuoi template:
```javascript
content: ['./app/templates/**/*.html']
```

## Performance

### Prima (CDN)
- ~600 KB + latenza CDN

### Dopo (Vite)
- 96.35 KB (gzipped)
- **84% di miglioramento!**

---

Per la documentazione completa, vedi `FRONTEND_BUILD_SYSTEM.md`
