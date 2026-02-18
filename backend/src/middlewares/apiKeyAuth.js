/**
 * API Key Authentication Middleware
 * Verifica e autentica richieste tramite API key/secret
 */

const apiKeyService = require('../services/apiKey.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('API_KEY_AUTH');

/**
 * Middleware per autenticazione via API key
 * Estrae API key/secret dagli headers e valida
 */
const verifyApiKey = async (req, res, next) => {
    try {
        // Estrai API key e secret dagli headers
        const apiKey = req.header('X-API-Key');
        const apiSecret = req.header('X-API-Secret');

        if (!apiKey || !apiSecret) {
            return res.status(401).json({
                success: false,
                message: 'API key and secret are required in headers (X-API-Key, X-API-Secret)'
            });
        }

        // Valida la coppia API key/secret
        const validationResult = await apiKeyService.validate(apiKey, apiSecret);

        // Aggiungi info al request object per uso downstream
        req.apiKey = {
            id: validationResult.apiKeyId,
            name: validationResult.apiKeyName,
            tenantId: validationResult.tenantId,
            tenantName: validationResult.tenantName,
            permissions: validationResult.permissions,
            rateLimit: validationResult.rateLimit
        };

        // Per compatibilità con i controller esistenti che usano req.user.tenantId
        req.user = {
            tenantId: validationResult.tenantId,
            id: null, // API key non ha un user_id associato
            role: 'api_key',
            isApiKey: true
        };

        next();
    } catch (error) {
        logger.error('API Key authentication error', { error: error.message });
        res.status(error.status || 401).json({
            success: false,
            message: error.message || 'API key authentication failed'
        });
    }
};

/**
 * Middleware per verificare permessi specifici dell'API key
 */
const requireApiPermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key authentication required'
            });
        }

        const permissions = req.apiKey.permissions || {};

        // Check if API key has required permissions
        const hasPermission = requiredPermissions.every(perm => {
            // Support dot notation for nested permissions (e.g., 'clients.read')
            const keys = perm.split('.');
            let value = permissions;

            for (const key of keys) {
                if (!value || typeof value !== 'object') return false;
                value = value[key];
            }

            return value === true;
        });

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `API key missing required permissions: ${requiredPermissions.join(', ')}`
            });
        }

        next();
    };
};

/**
 * In-memory rate limit store per API key
 * Map<apiKeyId, { count: number, windowStart: number }>
 */
const rateLimitStore = new Map();

// Pulizia periodica ogni 10 min per evitare memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
        if ((now - entry.windowStart) > 60 * 60 * 1000) {
            rateLimitStore.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Middleware per rate limiting basato su API key
 * Sliding window in-memory (per produzione considerare Redis)
 */
const apiKeyRateLimit = async (req, res, next) => {
    if (!req.apiKey) {
        return next();
    }

    const keyId = req.apiKey.id;
    const limit = req.apiKey.rateLimit || 1000;
    const windowMs = 60 * 60 * 1000; // 1 ora
    const now = Date.now();

    let entry = rateLimitStore.get(keyId);

    if (!entry || (now - entry.windowStart) > windowMs) {
        entry = { count: 0, windowStart: now };
    }

    entry.count++;
    rateLimitStore.set(keyId, entry);

    // Informational headers
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil((entry.windowStart + windowMs) / 1000)));

    if (entry.count > limit) {
        logger.warn('API key rate limit exceeded', { apiKeyId: keyId, count: entry.count, limit });
        return res.status(429).json({
            success: false,
            message: `API key rate limit exceeded. Limit: ${limit} requests per hour.`
        });
    }

    next();
};

/**
 * Middleware per logging delle richieste API
 */
const logApiRequest = async (req, res, next) => {
    if (!req.apiKey) {
        return next();
    }

    const startTime = Date.now();

    // Intercetta la risposta
    const originalSend = res.send;
    res.send = function (data) {
        res.send = originalSend;

        const responseTime = Date.now() - startTime;

        // Log asincrono (non blocca la risposta)
        setImmediate(async () => {
            try {
                const { query } = require('../config/database');

                await query(
                    `INSERT INTO api_logs
                    (api_key_id, tenant_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        req.apiKey.id,
                        req.apiKey.tenantId,
                        req.originalUrl,
                        req.method,
                        res.statusCode,
                        responseTime,
                        req.ip || req.connection.remoteAddress,
                        req.get('user-agent')
                    ]
                );
            } catch (error) {
                logger.error('Error logging API request', { error: error.message });
            }
        });

        return originalSend.call(this, data);
    };

    next();
};

/**
 * Middleware combinato per autenticazione API completa
 */
const apiAuth = [verifyApiKey, apiKeyRateLimit, logApiRequest];

module.exports = {
    verifyApiKey,
    requireApiPermission,
    apiKeyRateLimit,
    logApiRequest,
    apiAuth
};
