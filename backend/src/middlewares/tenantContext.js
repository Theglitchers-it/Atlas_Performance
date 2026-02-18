/**
 * Middleware Tenant Context
 * Verifica e valida il contesto tenant per ogni richiesta autenticata
 */

const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('TENANT');

/**
 * Verifica che il tenant dell'utente sia attivo e valido
 * Da usare dopo verifyToken per aggiungere info tenant alla request
 */
const validateTenant = async (req, res, next) => {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Contesto tenant mancante'
            });
        }

        const tenants = await query(
            'SELECT id, name, plan, status FROM tenants WHERE id = ? AND status = "active"',
            [req.user.tenantId]
        );

        if (tenants.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Tenant non trovato o disattivato'
            });
        }

        req.tenant = {
            id: tenants[0].id,
            name: tenants[0].name,
            plan: tenants[0].plan,
            status: tenants[0].status
        };

        next();
    } catch (error) {
        logger.error('Errore validazione tenant', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Errore interno validazione tenant'
        });
    }
};

/**
 * Verifica limiti del piano del tenant (es. numero clienti)
 */
const checkPlanLimits = (resource) => {
    const PLAN_LIMITS = {
        free: { clients: 5, videos: 0, api: false, ai_advanced: false },
        starter: { clients: 20, videos: 50, api: true, ai_advanced: false },
        pro: { clients: 50, videos: -1, api: true, ai_advanced: true },
        enterprise: { clients: 200, videos: -1, api: true, ai_advanced: true }
    };

    return async (req, res, next) => {
        try {
            if (!req.tenant) {
                return next();
            }

            const limits = PLAN_LIMITS[req.tenant.plan] || PLAN_LIMITS.free;

            if (resource === 'clients' && limits.clients > 0) {
                const [count] = await query(
                    'SELECT COUNT(*) as total FROM clients WHERE tenant_id = ? AND status != "cancelled"',
                    [req.user.tenantId]
                );
                if (count.total >= limits.clients) {
                    return res.status(403).json({
                        success: false,
                        message: `Limite clienti raggiunto per il piano ${req.tenant.plan}. Upgrade necessario.`,
                        limit: limits.clients,
                        current: count.total
                    });
                }
            }

            if (resource === 'videos' && limits.videos === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'I corsi video non sono disponibili nel piano Free. Upgrade necessario.'
                });
            }

            if (resource === 'api' && !limits.api) {
                return res.status(403).json({
                    success: false,
                    message: 'Le API pubbliche non sono disponibili nel piano Free. Upgrade necessario.'
                });
            }

            if (resource === 'ai_advanced' && !limits.ai_advanced) {
                return res.status(403).json({
                    success: false,
                    message: 'Le funzionalita AI avanzate non sono disponibili nel tuo piano. Upgrade necessario.'
                });
            }

            next();
        } catch (error) {
            logger.error('Errore verifica limiti piano', { error: error.message });
            next();
        }
    };
};

module.exports = {
    validateTenant,
    checkPlanLimits
};
