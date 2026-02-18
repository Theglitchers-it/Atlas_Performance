/**
 * Staff Permission Middleware
 * Controlla permessi granulari per utenti con ruolo 'staff'
 * I tenant_owner e super_admin bypassano tutti i controlli
 */

const { query } = require('../config/database');

/**
 * Cache permessi in memoria per evitare query ripetute (TTL 5 min)
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(userId, tenantId) {
    return `${tenantId}:${userId}`;
}

/**
 * Middleware factory: verifica un permesso specifico
 * @param {string} permission - Nome del permesso (es. 'can_manage_clients')
 */
function checkStaffPermission(permission) {
    return async (req, res, next) => {
        try {
            const { role, id: userId, tenantId } = req.user;

            // Owner e super_admin hanno tutti i permessi
            if (role === 'tenant_owner' || role === 'super_admin') {
                return next();
            }

            // Solo staff ha permessi granulari
            if (role !== 'staff') {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso non autorizzato'
                });
            }

            // Controlla cache
            const cacheKey = getCacheKey(userId, tenantId);
            let permissions = permissionCache.get(cacheKey);

            if (!permissions || permissions._expiry < Date.now()) {
                // Query DB
                const rows = await query(
                    'SELECT * FROM staff_permissions WHERE user_id = ? AND tenant_id = ?',
                    [userId, tenantId]
                );

                if (rows.length === 0) {
                    // Se non ci sono permessi configurati, nega tutto
                    return res.status(403).json({
                        success: false,
                        message: 'Permessi non configurati. Contatta il tuo trainer.'
                    });
                }

                permissions = { ...rows[0], _expiry: Date.now() + CACHE_TTL };
                permissionCache.set(cacheKey, permissions);
            }

            // Verifica permesso specifico
            if (!permissions[permission]) {
                return res.status(403).json({
                    success: false,
                    message: 'Non hai il permesso per questa operazione'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Invalida cache per un utente (da chiamare quando si aggiornano i permessi)
 */
function invalidatePermissionCache(userId, tenantId) {
    permissionCache.delete(getCacheKey(userId, tenantId));
}

module.exports = { checkStaffPermission, invalidatePermissionCache };
