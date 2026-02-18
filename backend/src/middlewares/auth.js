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
                message: 'Token di autenticazione mancante'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verifica che l'utente esista ancora
        const users = await query(
            'SELECT id, tenant_id, email, role, status FROM users WHERE id = ? AND status = "active"',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato o disattivato'
            });
        }

        // Aggiungi info utente alla request
        req.user = {
            id: users[0].id,
            tenantId: users[0].tenant_id,
            email: users[0].email,
            role: users[0].role
        };

        // Validate tenant is active (skip for super_admin)
        if (users[0].role !== 'super_admin' && users[0].tenant_id) {
            const tenants = await query(
                'SELECT id, subscription_status FROM tenants WHERE id = ?',
                [users[0].tenant_id]
            );
            if (tenants.length === 0 || tenants[0].subscription_status === 'cancelled') {
                return res.status(403).json({
                    success: false,
                    message: 'Tenant non attivo o sospeso'
                });
            }
        }

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
 * Verifica ruoli specifici
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

        if (!roles.includes(req.user.role)) {
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

            const users = await query(
                'SELECT id, tenant_id, email, role FROM users WHERE id = ? AND status = "active"',
                [decoded.userId]
            );

            if (users.length > 0) {
                req.user = {
                    id: users[0].id,
                    tenantId: users[0].tenant_id,
                    email: users[0].email,
                    role: users[0].role
                };
            }
        }
    } catch (error) {
        // Ignora errori - autenticazione opzionale
    }

    next();
};

// Costanti ruoli
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    TENANT_OWNER: 'tenant_owner',
    STAFF: 'staff',
    CLIENT: 'client'
};

module.exports = {
    verifyToken,
    requireRole,
    requireTenantOwner,
    requireSuperAdmin,
    optionalAuth,
    extractToken,
    ROLES
};
