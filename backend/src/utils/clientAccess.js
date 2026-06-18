/**
 * Client access ownership guards.
 * - Trusted roles (staff/admin/owner) hanno accesso a tutti i clienti del proprio tenant
 * - Ruolo 'client' (legacy + multi-role) può accedere SOLO al proprio profilo client (clients.user_id == user.id)
 * - Whitelist (vs blacklist) per safety: ruoli futuri non bypassano per default
 */

const { query } = require('../config/database');
const { userHasAnyRole } = require('../middlewares/auth');

const TRUSTED_ROLES = ['tenant_owner', 'staff', 'super_admin', 'gym_admin', 'trainer', 'nutritionist', 'front_desk', 'accountant'];

function isTrusted(user) {
    if (!user) return false;
    return TRUSTED_ROLES.includes(user.role) || userHasAnyRole(user, TRUSTED_ROLES);
}

/**
 * Normalizza e valida un clientId grezzo (params/body). Accetta interi e stringhe
 * puramente numeriche ("42"), rifiuta NaN, decimali, valori <= 0 e stringhe "sporche"
 * ("1 OR 1=1", "1abc" → NaN, non più troncate a 1 come faceva parseInt). Throw 404
 * se non valido, così non raggiunge mai mysql2 come NaN (500 "Unknown column 'NaN'").
 */
function parseClientId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        const err = new Error('Cliente non trovato');
        err.status = 404;
        throw err;
    }
    return id;
}

/**
 * Verifica che user possa accedere a clientId nel tenant indicato.
 * Throw 403 se non autorizzato, 404 se cliente inesistente/non valido nel tenant.
 * Ritorna l'id normalizzato (intero) così i chiamanti possono riusarlo.
 */
async function assertClientAccess(clientId, tenantId, user) {
    const id = parseClientId(clientId);
    if (isTrusted(user)) {
        const rows = await query('SELECT 1 FROM clients WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        if (rows.length === 0) {
            const err = new Error('Cliente non trovato');
            err.status = 404;
            throw err;
        }
        return id;
    }
    // Ruolo non-trusted (client + futuri): deve essere il proprio profilo
    const rows = await query(
        'SELECT user_id FROM clients WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
    );
    if (!rows[0]) {
        const err = new Error('Cliente non trovato');
        err.status = 404;
        throw err;
    }
    if (rows[0].user_id !== user.id) {
        const err = new Error('Non autorizzato ad accedere a questo cliente');
        err.status = 403;
        throw err;
    }
    return id;
}

/**
 * Param handler Express per `:clientId`. Centralizza validazione + ownership check
 * su TUTTE le route client-scoped del router su cui è registrato, così nessun endpoint
 * può dimenticare il controllo (prevenzione IDOR). Espone req.clientId (intero validato).
 * Richiede che verifyToken sia già stato eseguito (req.user popolato).
 */
async function requireClientAccess(req, res, next, value) {
    try {
        req.clientId = await assertClientAccess(value, req.user.tenantId, req.user);
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Ritorna il clientId associato a user.id (proprio profilo client) o null se non ne ha.
 */
async function getOwnClientId(userId, tenantId) {
    const rows = await query(
        'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ?',
        [userId, tenantId]
    );
    return rows[0]?.id || null;
}

module.exports = { assertClientAccess, requireClientAccess, parseClientId, getOwnClientId, isTrusted, TRUSTED_ROLES };
