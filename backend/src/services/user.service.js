/**
 * User Service
 * Gestione logica business utenti
 */

const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');

class UserService {
    /**
     * Ottieni tutti gli utenti del tenant
     */
    async getAll(tenantId, options = {}) {
        const { role, status, search, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT u.id, u.email, u.role, u.first_name, u.last_name,
                   u.phone, u.avatar_url, u.status, u.last_login_at,
                   u.created_at
            FROM users u
            WHERE u.tenant_id = ?
        `;
        const params = [tenantId];

        if (role) {
            sql += ' AND u.role = ?';
            params.push(role);
        }

        if (status) {
            sql += ' AND u.status = ?';
            params.push(status);
        }

        if (search) {
            const sanitizedSearch = search.replace(/[%_]/g, '\\$&');
            sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
            const searchPattern = `%${sanitizedSearch}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Count totale
        const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await query(countSql, params);
        const total = countResult?.total || 0;

        // Aggiungi paginazione
        sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const users = await query(sql, params);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottieni utente per ID
     */
    async getById(id, tenantId) {
        const users = await query(
            `SELECT u.id, u.tenant_id, u.email, u.role, u.first_name, u.last_name,
                    u.phone, u.avatar_url, u.status, u.email_verified_at,
                    u.last_login_at, u.preferences, u.created_at, u.updated_at
             FROM users u
             WHERE u.id = ? AND u.tenant_id = ?`,
            [id, tenantId]
        );

        if (users.length === 0) {
            throw { status: 404, message: 'Utente non trovato' };
        }

        return users[0];
    }

    /**
     * Crea nuovo utente (staff)
     */
    async create(tenantId, userData) {
        const { email, password, role, firstName, lastName, phone } = userData;

        // Verifica email non esistente
        const existing = await query(
            'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
            [email, tenantId]
        );

        if (existing.length > 0) {
            throw { status: 409, message: 'Email già registrata' };
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await query(
            `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [tenantId, email, passwordHash, role || 'staff', firstName, lastName, phone || null]
        );

        return this.getById(result.insertId, tenantId);
    }

    /**
     * Aggiorna utente
     */
    async update(id, tenantId, userData) {
        // Verifica esistenza
        await this.getById(id, tenantId);

        const { firstName, lastName, phone, avatarUrl, status, preferences } = userData;

        await query(
            `UPDATE users
             SET first_name = COALESCE(?, first_name),
                 last_name = COALESCE(?, last_name),
                 phone = COALESCE(?, phone),
                 avatar_url = COALESCE(?, avatar_url),
                 status = COALESCE(?, status),
                 preferences = COALESCE(?, preferences),
                 updated_at = NOW()
             WHERE id = ? AND tenant_id = ?`,
            [firstName, lastName, phone, avatarUrl, status,
             preferences ? JSON.stringify(preferences) : null, id, tenantId]
        );

        return this.getById(id, tenantId);
    }

    /**
     * Elimina utente
     */
    async delete(id, tenantId, currentUserId) {
        // Non puoi eliminare te stesso
        if (id === currentUserId) {
            throw { status: 400, message: 'Non puoi eliminare il tuo account' };
        }

        const user = await this.getById(id, tenantId);

        // Non eliminare tenant_owner
        if (user.role === 'tenant_owner') {
            throw { status: 400, message: 'Non puoi eliminare il proprietario del tenant' };
        }

        await query('DELETE FROM users WHERE id = ? AND tenant_id = ?', [id, tenantId]);

        return { success: true };
    }

    /**
     * Aggiorna avatar
     */
    async updateAvatar(id, tenantId, avatarUrl) {
        await query(
            'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
            [avatarUrl, id, tenantId]
        );

        return this.getById(id, tenantId);
    }

    /**
     * Ottieni info business del tenant
     */
    async getBusinessInfo(tenantId) {
        const rows = await query(
            'SELECT business_name, phone FROM tenants WHERE id = ?',
            [tenantId]
        );
        if (rows.length === 0) {
            throw { status: 404, message: 'Tenant non trovato' };
        }
        return rows[0];
    }

    /**
     * Aggiorna info business del tenant
     */
    async updateBusinessInfo(tenantId, data) {
        const { businessName, phone } = data;
        await query(
            `UPDATE tenants SET business_name = COALESCE(?, business_name), phone = ?, updated_at = NOW() WHERE id = ?`,
            [businessName, phone || null, tenantId]
        );
        return this.getBusinessInfo(tenantId);
    }
}

module.exports = new UserService();
