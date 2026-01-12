# Guida: Aggiornamento Cache Browser

## Problema
Le modifiche CSS/HTML non sono visibili nel browser anche se salvate correttamente.

## Causa
Il browser sta mostrando una **versione cached** della pagina.

## Soluzione: Hard Refresh

### Windows/Linux
- **Chrome/Edge**: `Ctrl + Shift + R` oppure `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R` oppure `Ctrl + F5`

### Mac
- **Chrome/Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + E` (svuota cache) poi `Cmd + R`

## Soluzione Alternativa: DevTools

1. Apri DevTools: `F12` o `Ctrl + Shift + I`
2. Clicca destro sul pulsante refresh del browser
3. Seleziona **"Empty Cache and Hard Reload"** (Chrome/Edge)

## Verifiche Implementate

### 1. File profile.html - Modifiche CSS

Cerca nel file `app/templates/athlete/profile.html` alle linee:

**Linea 272-274** (Mobile CSS):
```css
.tab-button .tab-text-short {
    display: inline;
}
```

**Linea 351-353** (Desktop CSS):
```css
.tab-button .tab-text-short {
    display: none;
}
```

### 2. File profile.html - Modifiche HTML

Cerca nel file `app/templates/athlete/profile.html` alle linee **420-449**:

```html
<button class="tab-button active" onclick="switchTab('overview')" id="tab-overview">
    <i class="fas fa-chart-line"></i>
    <span class="tab-text-short">Graf</span>
    <span class="tab-text-full">Panoramica</span>
</button>
```

## Test delle Modifiche

### Mobile (≤640px)
Dovresti vedere:
- ✅ Graf
- ✅ Info
- ✅ Sicur.
- ✅ Pref.
- ✅ Misur.
- ✅ Obiett.

### Desktop (>640px)
Dovresti vedere:
- ✅ Panoramica
- ✅ Informazioni Personali
- ✅ Sicurezza
- ✅ Preferenze
- ✅ Misurazioni
- ✅ Obiettivi

## Riavvio Server Flask

Se il problema persiste dopo hard refresh:

1. **Ferma il server** (Ctrl + C nel terminale)
2. **Riavvia**:
   ```bash
   venv\Scripts\python.exe run.py
   ```
3. **Hard refresh** nel browser

## DevTools - Disabilita Cache

Per sviluppo, disabilita completamente la cache:

1. Apri DevTools (`F12`)
2. Vai su **Network** tab
3. ✅ Spunta **"Disable cache"**
4. Tieni DevTools aperto mentre sviluppi

## Verifica Cambio in Tempo Reale

Apri DevTools → Elements → Styles, e controlla:

### Mobile View (width ≤640px)
```css
.tab-button .tab-text-short {
    display: inline; /* ✅ Dovrebbe essere inline */
}

.tab-button .tab-text-full {
    display: none; /* ✅ Dovrebbe essere none */
}
```

### Desktop View (width >640px)
```css
.tab-button .tab-text-short {
    display: none; /* ✅ Dovrebbe essere none */
}

.tab-button .tab-text-full {
    display: inline; /* ✅ Dovrebbe essere inline */
}
```

## Modalità Incognito

Test veloce in finestra privata/incognito:
- **Chrome**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`

La modalità incognito non usa cache, quindi vedrai subito le modifiche.

## Comandi Verifica File

Verifica che le modifiche siano nel file:

```bash
# Cerca tab-text-short nel file
grep -n "tab-text-short" app/templates/athlete/profile.html

# Output atteso:
# 275:        .tab-text-short {
# 354:        .tab-text-short {
# 422:    <span class="tab-text-short">Graf</span>
# 427:    <span class="tab-text-short">Info</span>
# 432:    <span class="tab-text-short">Sicur.</span>
# 437:    <span class="tab-text-short">Pref.</span>
# 442:    <span class="tab-text-short">Misur.</span>
# 447:    <span class="tab-text-short">Obiett.</span>
```

## Checklist Debug

- [ ] Hard refresh fatto (`Ctrl + Shift + R`)
- [ ] Cache browser svuotata (DevTools)
- [ ] Server Flask riavviato
- [ ] File salvato correttamente
- [ ] Modifiche verificate nel codice sorgente
- [ ] DevTools ispezionato per vedere CSS attivo
- [ ] Testato in modalità incognito

## Se Ancora Non Funziona

1. **Verifica dimensione finestra**:
   - Mobile view = width ≤640px
   - Usa DevTools responsive mode

2. **Ispeziona elemento**:
   - Clicca destro sul tab
   - Seleziona "Inspect"
   - Verifica che `<span class="tab-text-short">` sia presente

3. **Console Errors**:
   - Apri Console in DevTools
   - Cerca errori JavaScript che potrebbero bloccare rendering

---

**Le modifiche sono state CORRETTAMENTE salvate nel file!**
Il problema è quasi certamente la cache del browser.

**Soluzione Rapida**: `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)
