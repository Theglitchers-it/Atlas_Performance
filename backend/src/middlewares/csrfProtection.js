/**
 * CSRF Protection Middleware
 * Due livelli di protezione:
 * 1. Origin/Referer validation — blocca richieste cross-origin
 * 2. Content-Type check — blocca form HTML standard
 *
 * Quando si usano httpOnly cookies, i cookie vengono inviati automaticamente
 * dal browser. La protezione CSRF si basa su:
 * - Il browser invia sempre Origin/Referer su richieste cross-origin
 * - Un form HTML standard non puo impostare Content-Type: application/json
 */

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const ALLOWED_CONTENT_TYPES = ['application/json', 'multipart/form-data'];

/**
 * Valida che Origin o Referer corrispondano ai domini consentiti.
 * Se entrambi sono assenti (richieste server-to-server, curl, etc.),
 * fallback su Content-Type check.
 */
function isOriginAllowed(req, allowedOrigins) {
    const origin = req.headers['origin'];
    const referer = req.headers['referer'];

    if (origin) {
        return allowedOrigins.some(allowed => origin === allowed);
    }

    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            return allowedOrigins.some(allowed => refererOrigin === allowed);
        } catch {
            return false;
        }
    }

    // Nessun Origin/Referer: richiesta non dal browser (curl, Postman, server-to-server)
    // Il Content-Type check successivo proteggera comunque
    return null;
}

/**
 * Middleware CSRF con doppia protezione:
 * - Origin/Referer validation per bloccare richieste cross-origin
 * - Content-Type validation come secondo layer
 */
const csrfProtection = (options = {}) => {
    const { excludePaths = [] } = options;

    // Calcola origini consentite da FRONTEND_URL
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(url => url.trim());

    return (req, res, next) => {
        // Metodi safe non richiedono protezione
        if (SAFE_METHODS.includes(req.method)) {
            return next();
        }

        // Path esclusi (webhooks, ecc.)
        for (const path of excludePaths) {
            if (req.path.startsWith(path)) {
                return next();
            }
        }

        // Layer 1: Origin/Referer validation
        const originCheck = isOriginAllowed(req, allowedOrigins);
        if (originCheck === false) {
            return res.status(403).json({
                success: false,
                message: 'Origine non consentita'
            });
        }

        // Layer 2: Content-Type validation
        // Necessario anche quando Origin e valido (defense in depth)
        const contentType = req.headers['content-type'] || '';
        const isAllowed = ALLOWED_CONTENT_TYPES.some(type => contentType.includes(type));
        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: 'Content-Type non valido. Usa application/json o multipart/form-data'
            });
        }

        next();
    };
};

module.exports = { csrfProtection };
