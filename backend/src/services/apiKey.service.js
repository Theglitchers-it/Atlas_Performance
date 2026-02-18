/**
 * API Key Service
 * Gestione API keys per integrazione programmatica
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class ApiKeyService {
    /**
     * Genera una nuova API key per un tenant
     */
    async generate(tenantId, name, permissions = {}, expiresInDays = null) {
        // Validate input
        if (!name || name.trim().length === 0) {
            const error = new Error('API key name is required');
            error.status = 400;
            throw error;
        }

        // Check if name already exists for this tenant
        const existing = await query(
            'SELECT id FROM api_keys WHERE tenant_id = ? AND name = ? AND status = "active"',
            [tenantId, name.trim()]
        );

        if (existing.length > 0) {
            const error = new Error('An API key with this name already exists');
            error.status = 409;
            throw error;
        }

        // Generate unique API key and secret
        const apiKey = this._generateApiKey();
        const apiSecret = this._generateApiSecret();

        // Hash the secret for storage
        const secretHash = await bcrypt.hash(apiSecret, 10);

        // Calculate expiration date if specified
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        // Store in database
        const result = await query(
            `INSERT INTO api_keys
            (tenant_id, name, api_key, api_secret_hash, permissions, rate_limit, expires_at, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
            [
                tenantId,
                name.trim(),
                apiKey,
                secretHash,
                JSON.stringify(permissions),
                permissions.rateLimit || 1000, // Default 1000 requests per hour
                expiresAt
            ]
        );

        // Return the API key and secret (secret is only shown once)
        return {
            id: result.insertId,
            name: name.trim(),
            apiKey,
            apiSecret, // This is the only time the secret is shown in plaintext
            permissions,
            rateLimit: permissions.rateLimit || 1000,
            expiresAt,
            createdAt: new Date(),
            warning: 'Store the API secret securely. It will not be shown again.'
        };
    }

    /**
     * Valida una coppia API key/secret
     */
    async validate(apiKey, apiSecret) {
        if (!apiKey || !apiSecret) {
            const error = new Error('API key and secret are required');
            error.status = 401;
            throw error;
        }

        // Fetch the API key record
        const rows = await query(
            `SELECT ak.*, t.name as tenant_name, t.status as tenant_status
            FROM api_keys ak
            JOIN tenants t ON ak.tenant_id = t.id
            WHERE ak.api_key = ? AND ak.status = 'active'`,
            [apiKey]
        );

        if (rows.length === 0) {
            const error = new Error('Invalid API key');
            error.status = 401;
            throw error;
        }

        const keyRecord = rows[0];

        // Check if key has expired
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
            // Auto-revoke expired key
            await query(
                'UPDATE api_keys SET status = "expired" WHERE id = ?',
                [keyRecord.id]
            );

            const error = new Error('API key has expired');
            error.status = 401;
            throw error;
        }

        // Check if tenant is active
        if (keyRecord.tenant_status !== 'active') {
            const error = new Error('Tenant account is not active');
            error.status = 403;
            throw error;
        }

        // Validate secret
        const isValid = await bcrypt.compare(apiSecret, keyRecord.api_secret_hash);

        if (!isValid) {
            const error = new Error('Invalid API secret');
            error.status = 401;
            throw error;
        }

        // Update last_used_at timestamp
        await query(
            'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
            [keyRecord.id]
        );

        // Return tenant and permission info
        return {
            tenantId: keyRecord.tenant_id,
            tenantName: keyRecord.tenant_name,
            apiKeyId: keyRecord.id,
            apiKeyName: keyRecord.name,
            permissions: (() => { try { return JSON.parse(keyRecord.permissions || '{}') } catch { return {} } })(),
            rateLimit: keyRecord.rate_limit
        };
    }

    /**
     * Lista tutte le API keys di un tenant
     */
    async list(tenantId) {
        const rows = await query(
            `SELECT
                id,
                name,
                api_key,
                permissions,
                rate_limit,
                last_used_at,
                expires_at,
                status,
                created_at
            FROM api_keys
            WHERE tenant_id = ?
            ORDER BY created_at DESC`,
            [tenantId]
        );

        // Parse permissions JSON and mask API key
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            apiKey: this._maskApiKey(row.api_key),
            // apiKeyFull removed for security - full key only shown on creation
            permissions: JSON.parse(row.permissions || '{}'),
            rateLimit: row.rate_limit,
            lastUsedAt: row.last_used_at,
            expiresAt: row.expires_at,
            status: row.status,
            createdAt: row.created_at
        }));
    }

    /**
     * Revoca (disattiva) una API key
     */
    async revoke(apiKeyId, tenantId) {
        // Check ownership
        const rows = await query(
            'SELECT id, name FROM api_keys WHERE id = ? AND tenant_id = ?',
            [apiKeyId, tenantId]
        );

        if (rows.length === 0) {
            const error = new Error('API key not found');
            error.status = 404;
            throw error;
        }

        // Revoke the key
        await query(
            'UPDATE api_keys SET status = "revoked", updated_at = NOW() WHERE id = ?',
            [apiKeyId]
        );

        return {
            id: apiKeyId,
            name: rows[0].name,
            status: 'revoked',
            revokedAt: new Date()
        };
    }

    /**
     * Ottieni statistiche di utilizzo API key
     */
    async getUsageStats(tenantId, apiKeyId = null) {
        let whereClause = 'WHERE ak.tenant_id = ?';
        let params = [tenantId];

        if (apiKeyId) {
            whereClause += ' AND ak.id = ?';
            params.push(apiKeyId);
        }

        const rows = await query(
            `SELECT
                ak.id,
                ak.name,
                ak.api_key,
                COUNT(al.id) as total_requests,
                SUM(CASE WHEN al.status_code >= 200 AND al.status_code < 300 THEN 1 ELSE 0 END) as successful_requests,
                SUM(CASE WHEN al.status_code >= 400 THEN 1 ELSE 0 END) as failed_requests,
                MAX(al.created_at) as last_request_at
            FROM api_keys ak
            LEFT JOIN api_logs al ON ak.id = al.api_key_id AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ${whereClause}
            GROUP BY ak.id
            ORDER BY total_requests DESC`,
            params
        );

        return rows.map(row => ({
            id: row.id,
            name: row.name,
            apiKey: this._maskApiKey(row.api_key),
            totalRequests: row.total_requests || 0,
            successfulRequests: row.successful_requests || 0,
            failedRequests: row.failed_requests || 0,
            lastRequestAt: row.last_request_at
        }));
    }

    /**
     * Genera una stringa API key univoca
     */
    _generateApiKey() {
        const prefix = 'ptk'; // Personal Trainer Key
        const randomBytes = crypto.randomBytes(24).toString('hex');
        return `${prefix}_${randomBytes}`;
    }

    /**
     * Genera un API secret univoco
     */
    _generateApiSecret() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Maschera una API key per visualizzazione
     */
    _maskApiKey(apiKey) {
        if (!apiKey || apiKey.length < 12) return apiKey;
        const visible = 8;
        const start = apiKey.substring(0, visible);
        const masked = '*'.repeat(apiKey.length - visible);
        return `${start}${masked}`;
    }
}

module.exports = new ApiKeyService();
