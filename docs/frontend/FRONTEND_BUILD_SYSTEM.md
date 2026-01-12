# Frontend Build System - Atlas Performance

## Overview

Atlas Performance ora utilizza **Vite** come build system moderno per gestire tutti gli asset frontend. Questo elimina le dipendenze CDN esterne, migliora le performance e abilita funzionalità avanzate come tree-shaking, code splitting e hot module replacement.

## Caratteristiche

### Vantaggi del Nuovo Sistema

- **Nessuna dipendenza CDN**: Tutti gli asset sono serviti localmente
- **Build ottimizzato**: Minificazione, tree-shaking, code splitting automatici
- **Performance migliorate**: Bundle più piccoli e caricamento più veloce
- **Sviluppo moderno**: Hot Module Replacement (HMR) durante lo sviluppo
- **TypeScript Ready**: Pronto per aggiungere TypeScript in futuro
- **TailwindCSS locale**: Build completo con purging dei CSS non utilizzati

### Stack Tecnologico

- **Build Tool**: Vite 5.x
- **CSS Framework**: TailwindCSS 3.4.x (locale)
- **JavaScript Framework**: Alpine.js 3.x (bundled)
- **Charts**: Chart.js 4.4.x (bundled)
- **PostCSS**: Autoprefixer per compatibilità browser

## Struttura File

```
Atlas-Performance/
├── app/
│   └── static/
│       ├── src/                    # File sorgente (non serviti direttamente)
│       │   ├── css/
│       │   │   └── main.css        # Entry point CSS principale
│       │   └── js/
│       │       └── main.js         # Entry point JavaScript principale
│       ├── css/                    # CSS custom esistenti (importati in main.css)
│       └── js/                     # JS custom esistenti (integrati in main.js)
├── dist/                           # Asset buildati (generati da Vite)
│   ├── css/
│   ├── js/
│   └── manifest.json               # Manifest per Flask integration
├── node_modules/                   # Dipendenze npm (gitignored)
├── package.json                    # Configurazione npm
├── vite.config.js                  # Configurazione Vite
├── tailwind.config.js              # Configurazione TailwindCSS
└── postcss.config.js               # Configurazione PostCSS
```

## Comandi Disponibili

### Sviluppo

```bash
# Avvia il dev server Vite con HMR
npm run dev

# Avvia Flask in development mode
python run.py
```

**Nota**: Durante lo sviluppo, assicurati che entrambi i server siano in esecuzione:
- Flask: `http://localhost:5000`
- Vite Dev Server: `http://localhost:5173`

### Produzione

```bash
# Build asset per produzione
npm run build

# Preview build di produzione (opzionale)
npm run preview

# Build in watch mode (rebuilds automaticamente)
npm run watch
```

## Integrazione con Flask

### Template Helper

Il sistema utilizza helper Flask per caricare automaticamente gli asset corretti:

```jinja
{# Nuovo template base con Vite #}
{% extends "base_vite.html" %}

{# Gli asset vengono caricati automaticamente #}
{# In development: dal dev server Vite #}
{# In production: dal manifest buildato #}
```

### Funzioni Template Disponibili

```jinja
{# Carica asset JavaScript/CSS #}
<script src="{{ vite_asset('main.js') }}"></script>
<link rel="stylesheet" href="{{ vite_asset('styles.css') }}">

{# Hot Module Replacement (solo in dev) #}
{{ vite_hmr()|safe }}
```

### Configurazione Flask

In `config.py`:

```python
# Vite Frontend Build System
VITE_DEV_SERVER_URL = os.environ.get('VITE_DEV_SERVER_URL', 'http://localhost:5173')
VITE_MANIFEST_PATH = os.path.join(basedir, 'dist', 'manifest.json')
```

## Migrazione Template

### Prima (CDN)

```html
<!-- TailwindCSS CDN -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Alpine.js CDN -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- Chart.js CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

### Dopo (Vite)

```html
{% if config.DEBUG %}
    {# Development mode - Vite HMR #}
    {{ vite_hmr()|safe }}
    <script type="module" src="{{ vite_asset('js/main.js') }}"></script>
{% else %}
    {# Production mode - Bundled assets #}
    <link rel="stylesheet" href="{{ vite_asset('styles.css') }}">
    <script type="module" src="{{ vite_asset('main.js') }}" defer></script>
{% endif %}
```

## Workflow di Sviluppo

### Setup Iniziale

```bash
# 1. Installa dipendenze Node.js
npm install

# 2. Installa dipendenze Python
pip install -r requirements.txt

# 3. Build asset iniziale (opzionale)
npm run build
```

### Durante lo Sviluppo

```bash
# Terminal 1 - Vite Dev Server (con HMR)
npm run dev

# Terminal 2 - Flask Application
python run.py
```

Apri `http://localhost:5000` nel browser. Le modifiche CSS/JS verranno applicate istantaneamente grazie a Vite HMR.

### Prima del Deploy

```bash
# Build asset ottimizzati per produzione
npm run build

# Verifica che dist/ sia stato generato
ls dist/

# Deploy includendo la cartella dist/
```

## Ottimizzazioni Applicate

### CSS

- **Purging**: TailwindCSS rimuove classi non utilizzate
- **Minificazione**: CSS minificato e compresso
- **Autoprefixer**: Compatibilità cross-browser automatica
- **Import consolidati**: Tutti i CSS custom importati in un unico bundle

### JavaScript

- **Tree Shaking**: Rimuove codice non utilizzato
- **Code Splitting**: Split automatico per chunk più piccoli
- **Minificazione**: Terser minification con compression
- **Source Maps**: Disponibili per debugging in produzione
- **ES Modules**: Formato moderno con lazy loading

### Asset Statici

- **Hash nei nomi file**: Cache busting automatico (`main.DExju6db.js`)
- **Gzip**: Compressione gzip per file buildati
- **Manifest JSON**: Mapping asset per Flask integration

## Performance Metrics

### Prima (CDN)

- **TailwindCSS CDN**: ~350 KB (non minified, non purged)
- **Alpine.js CDN**: ~50 KB
- **Chart.js CDN**: ~200 KB
- **Total**: ~600 KB + latenza CDN

### Dopo (Vite Build)

- **CSS Bundle**: 71.16 KB (10.80 KB gzipped)
- **JS Bundle**: 253.44 KB (85.55 KB gzipped)
- **Total**: 324.6 KB (96.35 KB gzipped)

**Miglioramento**: ~45% di riduzione dimensioni + nessuna latenza CDN

## Troubleshooting

### Problema: Vite manifest not found

**Causa**: Asset non buildati per produzione

**Soluzione**:
```bash
npm run build
```

### Problema: CORS errors in development

**Causa**: Vite dev server non in esecuzione

**Soluzione**:
```bash
npm run dev
```

### Problema: CSS non applicato

**Causa**: TailwindCSS content paths non configurati

**Verifica**: `tailwind.config.js` deve includere tutti i template:
```javascript
content: [
  './app/templates/**/*.html',
  './app/static/src/**/*.{js,jsx,ts,tsx}',
]
```

### Problema: JavaScript non funziona

**Causa**: Alpine.js non inizializzato correttamente

**Verifica**: Il bundle include l'inizializzazione Alpine:
```javascript
window.Alpine = Alpine;
Alpine.start();
```

## Best Practices

### 1. Non Modificare `dist/` Manualmente

La cartella `dist/` viene rigenerata ad ogni build. Modifica sempre i file in `app/static/src/`.

### 2. Importa CSS Custom in main.css

```css
/* app/static/src/css/main.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Aggiungi qui i tuoi CSS custom */
```

### 3. Estendi main.js per Nuovi Moduli

```javascript
// app/static/src/js/main.js
import Alpine from 'alpinejs';
import { Chart } from 'chart.js';

// Aggiungi nuovi moduli qui
import MyNewModule from './my-module.js';

// Esporta globalmente se necessario
window.Alpine = Alpine;
window.Chart = Chart;
window.MyModule = MyNewModule;
```

### 4. Usa TailwindCSS @apply per Componenti

```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700;
  }
}
```

### 5. Build Prima di Ogni Deploy

```bash
# Nel CI/CD pipeline
npm install
npm run build
# ... deploy dist/ insieme all'app
```

## Compatibilità Browser

Target browsers configurati in `package.json`:

- Chrome/Edge: ultime 2 versioni
- Firefox: ultime 2 versioni
- Safari: ultime 2 versioni
- iOS Safari: ultime 2 versioni

Per modificare i target:

```json
{
  "browserslist": [
    "last 2 Chrome versions",
    "last 2 Firefox versions"
  ]
}
```

## Prossimi Passi (Opzionale)

1. **TypeScript**: Aggiungi TypeScript per type safety
2. **Vue/React Components**: Integra framework UI se necessario
3. **PWA**: Service worker per funzionalità offline
4. **Image Optimization**: Vite plugin per ottimizzazione immagini
5. **CSS Modules**: Scoped CSS per componenti

## Supporto

Per problemi o domande:
- Documentazione Vite: https://vitejs.dev
- Documentazione TailwindCSS: https://tailwindcss.com
- Documentazione Alpine.js: https://alpinejs.dev
- Documentazione Chart.js: https://www.chartjs.org

---

**Implementato da**: Claude Code Assistant
**Data**: 2026-01-08
**Versione**: 1.0.0
