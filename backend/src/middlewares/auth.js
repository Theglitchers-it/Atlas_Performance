/**
 * Middleware Autenticazione JWT
 * Verifica token e gestione ruoli
 * Supporta httpOnly cookies (priorita) e Authorization header (fallback per API/mobile)
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('AUTH');

/**
 * In-memory token blacklist with TTL auto-cleanup.
 * Stores JTI (JWT ID) of revoked access tokens until they expire.
 * For single-instance deployments this is sufficient; for multi-instance
 * use Redis or a shared store.
 */
const _tokenBlacklist = new Map(); // jti -> expiresAt (epoch ms)

const blacklistToken = (jti, expiresAt) => {
    if (!jti) return;
    _tokenBlacklist.set(jti, expiresAt);
};

const isTokenBlacklisted = (jti) => {
    if (!jti) return false;
    return _tokenBlacklist.has(jti);
};

// Cleanup expired entries every 5 minutes
const _blacklistCleanup = setInterval(() => {
    const now = Date.now();
    for (const [jti, exp] of _tokenBlacklist) {
        if (exp < now) _tokenBlacklist.delete(jti);
    }
}, 5 * 60 * 1000);
_blacklistCleanup.unref();

/**
 * Estrai token JWT dalla request
 * Priorita: cookie httpOnly > Authorization header
 */
const extractToken = (req) => {
    // 1. Cookie httpOnly (browser)
    if (req.cookies?.access_token) {
        return req.cookies.access_token;
    }

    // 2. Authorization header (API/mobile)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return null;
};

/**
 * Verifica il token JWT
 */
const verifyToken = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token di autenticazione mancante',
                code: 'TOKEN_MISSING'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check token blacklist (revoked on logout)
        if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
            return res.status(401).json({
                success: false,
                message: 'Token revocato'
            });
        }

        // Un solo JOIN per validare user + tenant in una query (era 2 sequenziali).
        const rows = await query(
            `SELECT u.id, u.tenant_id, u.email, u.role, u.parent_user_id,
                    t.subscription_status
             FROM users u
             LEFT JOIN tenants t ON t.id = u.tenant_id
             WHERE u.id = ? AND u.status = 'active'`,
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato o disattivato'
            });
        }

        const user = rows[0];

        if (user.role !== 'super_admin' && user.tenant_id) {
            if (!user.subscription_status || user.subscription_status === 'cancelled') {
                return res.status(403).json({
                    success: false,
                    message: 'Tenant non attivo o sospeso'
                });
            }
        }

        req.user = {
            id: user.id,
            tenantId: user.tenant_id,
            email: user.email,
            role: user.role,
            roles: Array.isArray(decoded.roles) ? decoded.roles : [],
            parentUserId: user.parent_user_id || null
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token scaduto',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token non valido'
            });
        }
        logger.error('Errore verifica token', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Errore interno di autenticazione'
        });
    }
};

/**
 * Helper: verifica se l'utente ha uno dei ruoli passati.
 * Matcha sia il ruolo primario (legacy users.role) sia i ruoli multipli (user_roles).
 */
const userHasAnyRole = (user, allowedRoles) => {
    if (!user) return false;
    if (allowedRoles.includes(user.role)) return true;
    if (Array.isArray(user.roles)) {
        return user.roles.some(r => allowedRoles.includes(r));
    }
    return false;
};

/**
 * Verifica ruoli specifici (array-aware: matcha sia users.role legacy sia user_roles[]).
 * @param {...string} roles - Ruoli permessi
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Non autenticato'
            });
        }

        if (!userHasAnyRole(req.user, roles)) {
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per questa azione'
            });
        }

        next();
    };
};

/**
 * Verifica che l'utente sia il proprietario del tenant o super admin
 */
const requireTenantOwner = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Non autenticato'
        });
    }

    if (req.user.role !== 'tenant_owner' && req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Solo il proprietario del tenant può eseguire questa azione'
        });
    }

    next();
};

/**
 * Verifica che l'utente sia super admin
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Non autenticato'
        });
    }

    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Accesso riservato agli amministratori'
        });
    }

    next();
};

/**
 * Middleware opzionale - non blocca se non autenticato
 * Supporta cookie httpOnly e Authorization header
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check blacklist for optional auth too
            if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
                // Token revoked — treat as unauthenticated
            } else {
                const users = await query(
                    'SELECT id, tenant_id, email, role, status FROM users WHERE id = ?',
                    [decoded.userId]
                );

                if (users.length > 0 && users[0].status === 'active') {
                    req.user = {
                        id: users[0].id,
                        tenantId: users[0].tenant_id,
                        email: users[0].email,
                        role: users[0].role,
                        roles: Array.isArray(decoded.roles) ? decoded.roles : []
                    };
                }
            }
        }
    } catch (error) {
        // Ignora errori - autenticazione opzionale
    }

    next();
};

// Costanti ruoli legacy (users.role ENUM)
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    TENANT_OWNER: 'tenant_owner',
    STAFF: 'staff',
    CLIENT: 'client'
};

// Costanti ruoli Fase 1 (user_roles.role ENUM, multi-ruolo)
const ROLES_V2 = {
    GYM_ADMIN: 'gym_admin',
    TRAINER: 'trainer',
    NUTRITIONIST: 'nutritionist',
    CLIENT: 'client',
    FRONT_DESK: 'front_desk',
    ACCOUNTANT: 'accountant'
};

// Helper preconfezionati per evitare requireRole(...) ripetuto nelle routes
const requireGymAdmin = requireRole('gym_admin', 'tenant_owner', 'super_admin');
const requireStaff = requireRole('gym_admin', 'tenant_owner', 'super_admin', 'trainer', 'staff');

module.exports = {
    verifyToken,
    requireRole,
    requireTenantOwner,
    requireSuperAdmin,
    requireGymAdmin,
    requireStaff,
    optionalAuth,
    extractToken,
    blacklistToken,
    userHasAnyRole,
    ROLES,
    ROLES_V2
};
