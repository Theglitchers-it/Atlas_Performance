/**
 * Audit Service
 * Centralized audit logging for critical operations.
 * Fire-and-forget: audit failures never break business logic.
 */

const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request');
const logger = createServiceLogger('AUDIT');

/**
 * Auditable action types
 */
const AUDIT_ACTIONS = {
    // Auth
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',

    // User management
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',

    // Client management
    CLIENT_CREATE: 'CLIENT_CREATE',
    CLIENT_UPDATE: 'CLIENT_UPDATE',
    CLIENT_DELETE: 'CLIENT_DELETE',

    // Admin / tenant management
    TENANT_STATUS_CHANGE: 'TENANT_STATUS_CHANGE',
    TENANT_PLAN_CHANGE: 'TENANT_PLAN_CHANGE',
};

/**
 * Default resource type per action — avoids repeating resourceType at every call site.
 */
const ACTION_RESOURCE_MAP = {
    LOGIN_SUCCESS: 'user',
    LOGOUT: 'user',
    REGISTER: 'user',
    PASSWORD_CHANGE: 'user',
    USER_CREATE: 'user',
    USER_UPDATE: 'user',
    USER_DELETE: 'user',
    CLIENT_CREATE: 'client',
    CLIENT_UPDATE: 'client',
    CLIENT_DELETE: 'client',
    TENANT_STATUS_CHANGE: 'tenant',
    TENANT_PLAN_CHANGE: 'tenant',
};

/**
 * Log an auditable action.
 *
 * @param {object}  opts
 * @param {object}  opts.req           - Express request (used for ip/user-agent/user)
 * @param {string}  opts.action        - One of AUDIT_ACTIONS
 * @param {string}  [opts.resourceType]- Override entity type (derived from action by default)
 * @param {string}  [opts.resourceId]  - Entity id
 * @param {object}  [opts.details]     - Arbitrary JSON payload (old/new values, reason, etc.)
 * @param {number}  [opts.userId]      - Override user id (useful when req.user is not yet set, e.g. registration)
 * @param {string}  [opts.tenantId]    - Override tenant id
 */
const log = async ({ req, action, resourceType, resourceId = null, details = null, userId = null, tenantId = null }) => {
    try {
        const resolvedUserId = userId ?? req?.user?.id ?? null;
        const resolvedTenantId = tenantId ?? req?.user?.tenantId ?? null;
        const resolvedResourceType = resourceType ?? ACTION_RESOURCE_MAP[action] ?? null;

        await query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                resolvedTenantId,
                resolvedUserId,
                action,
                resolvedResourceType,
                resourceId != null ? String(resourceId) : null,
                details ? JSON.stringify(details) : null,
                getClientIp(req),
                getUserAgent(req)
            ]
        );
    } catch (err) {
        logger.error('Failed to write audit log', { action, error: err.message });
    }
};

module.exports = { log, AUDIT_ACTIONS };
