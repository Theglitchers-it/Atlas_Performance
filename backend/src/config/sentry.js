/**
 * Sentry — Error Tracking & Performance Monitoring
 *
 * Setup:
 *   1. Crea un progetto su https://sentry.io
 *   2. Copia il DSN nel file .env: SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
 *   3. Installa: cd backend && npm install @sentry/node
 *
 * Uso in server.js:
 *   const { initSentry, sentryErrorHandler } = require('./config/sentry');
 *   initSentry(app);           // PRIMA di tutte le route
 *   // ... route ...
 *   app.use(sentryErrorHandler());  // DOPO tutte le route, PRIMA dell'error handler
 */

let Sentry;

try {
  Sentry = require('@sentry/node');
} catch {
  Sentry = null;
}

/**
 * Inizializza Sentry se il DSN e configurato.
 * Chiamare PRIMA di registrare le route Express.
 */
function initSentry(app) {
  if (!process.env.SENTRY_DSN || !Sentry) {
    if (!Sentry) {
      console.log('[Sentry] @sentry/node non installato. Installa con: npm install @sentry/node');
    } else {
      console.log('[Sentry] SENTRY_DSN non configurato. Monitoring disabilitato.');
    }
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance: traccia il 20% delle transazioni in produzione
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Cattura breadcrumbs per debug
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app }),
    ],

    // Non inviare dati sensibili
    beforeSend(event) {
      // Rimuovi header di autenticazione dai breadcrumbs
      if (event.request && event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  console.log(`[Sentry] Inizializzato (env: ${process.env.NODE_ENV})`);
}

/**
 * Middleware error handler di Sentry.
 * Chiamare DOPO tutte le route, PRIMA dell'error handler custom.
 */
function sentryErrorHandler() {
  if (!Sentry) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.expressErrorHandler();
}

/**
 * Cattura manualmente un errore (per catch custom).
 * Uso: captureException(error, { extra: { userId: 123 } })
 */
function captureException(error, context = {}) {
  if (Sentry) {
    Sentry.captureException(error, context);
  }
}

/**
 * Cattura un messaggio informativo.
 * Uso: captureMessage('Operazione completata', 'info')
 */
function captureMessage(message, level = 'info') {
  if (Sentry) {
    Sentry.captureMessage(message, level);
  }
}

module.exports = {
  initSentry,
  sentryErrorHandler,
  captureException,
  captureMessage,
};
