/**
 * Middleware Tenant Context
 * Inietta tenant_id in tutte le query per isolamento dati multi-tenant
 */

const { query } = require('../config/database');

/**
 * Inietta il contesto tenant nella request
 * Tutte le query devono filtrare per tenant_id
 */
const injectTenantContext = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta per accedere ai dati del tenant'
            });
        }

        // Super admin può accedere a tutti i tenant (opzionale via query param)
        if (req.user.role === 'super_admin') {
            // Se specificato un tenant_id nel query param, usa quello
            if (req.query.tenant_id) {
                req.tenantId = req.query.tenant_id;
            }
            // Altrimenti non filtra per tenant (accesso globale)
            req.isSuperAdmin = true;
        } else {
            // Utenti normali: usa sempre il loro tenant_id
            req.tenantId = req.user.tenantId;
        }

        // Helper per aggiungere filtro tenant alle query
        req.tenantFilter = (alias = '') => {
            if (req.isSuperAdmin && !req.tenantId) {
                return '1=1'; // Nessun filtro per super admin senza tenant specificato
            }
            const prefix = alias ? `${alias}.` : '';
            return `${prefix}tenant_id = '${req.tenantId}'`;
        };

        // Helper per preparare dati con tenant_id
        req.withTenant = (data) => {
            if (req.isSuperAdmin && !req.tenantId) {
                return data; // Super admin può omettere tenant_id
            }
            return {
                ...data,
                tenant_id: req.tenantId
            };
        };

        next();
    } catch (error) {
        console.error('Errore tenant context:', error);
        return res.status(500).json({
            success: false,
            message: 'Errore nel contesto tenant'
        });
    }
};

/**
 * Verifica che una risorsa appartenga al tenant corrente
 * @param {string} table - Nome tabella
 * @param {string} idField - Nome campo ID (default: 'id')
 */
const verifyTenantResource = (table, idField = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params.id || req.params[idField];

            if (!resourceId) {
                return next(); // Nessun ID da verificare
            }

            // Super admin può accedere a tutto
            if (req.isSuperAdmin && !req.tenantId) {
                return next();
            }

            const result = await query(
                `SELECT tenant_id FROM ${table} WHERE ${idField} = ?`,
                [resourceId]
            );

            if (result.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Risorsa non trovata'
                });
            }

            if (result[0].tenant_id !== req.tenantId) {
                return res.status(403).json({
                    success: false,
                    message: 'Non hai accesso a questa risorsa'
                });
            }

            next();
        } catch (error) {
            console.error('Errore verifica tenant resource:', error);
            return res.status(500).json({
                success: false,
                message: 'Errore nella verifica dei permessi'
            });
        }
    };
};

/**
 * Verifica che il cliente appartenga al tenant corrente
 */
const verifyClientBelongsToTenant = async (req, res, next) => {
    try {
        const clientId = req.params.clientId || req.body.client_id;

        if (!clientId) {
            return next();
        }

        // Super admin può accedere a tutto
        if (req.isSuperAdmin && !req.tenantId) {
            return next();
        }

        const result = await query(
            'SELECT tenant_id FROM clients WHERE id = ?',
            [clientId]
        );

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente non trovato'
            });
        }

        if (result[0].tenant_id !== req.tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Questo cliente non appartiene al tuo account'
            });
        }

        req.clientId = clientId;
        next();
    } catch (error) {
        console.error('Errore verifica cliente:', error);
        return res.status(500).json({
            success: false,
            message: 'Errore nella verifica del cliente'
        });
    }
};

module.exports = {
    injectTenantContext,
    verifyTenantResource,
    verifyClientBelongsToTenant
};
