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

    /**
     * Aggiorna campi pubblici del proprio profilo.
     * Whitelist rigorosa: firstName, lastName (string), bio, city (string|null).
     * Rifiuta tipi non-string per evitare coercion silenziosa (es. {bio: {a:1}} -> "[object Object]").
     */
    async updateMyProfile(userId, payload) {
        const updates = [];
        const params = [];
        if (typeof payload.firstName === 'string') {
            updates.push('first_name = ?');
            params.push(payload.firstName.trim().slice(0, 100));
        }
        if (typeof payload.lastName === 'string') {
            updates.push('last_name = ?');
            params.push(payload.lastName.trim().slice(0, 100));
        }
        if (payload.bio === null) {
            updates.push('bio = ?');
            params.push(null);
        } else if (typeof payload.bio === 'string') {
            updates.push('bio = ?');
            params.push(payload.bio.slice(0, 1000));
        }
        if (payload.city === null) {
            updates.push('city = ?');
            params.push(null);
        } else if (typeof payload.city === 'string') {
            updates.push('city = ?');
            params.push(payload.city.trim().slice(0, 120));
        }
        if (updates.length === 0) {
            return null;
        }
        params.push(userId);
        const result = await query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            params
        );
        if (result.affectedRows === 0) return null;
        const rows = await query(
            `SELECT id, first_name, last_name, email, role, avatar_url, bio, city
             FROM users WHERE id = ?`,
            [userId]
        );
        const u = rows[0];
        return {
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
            role: u.role,
            avatarUrl: u.avatar_url,
            bio: u.bio,
            city: u.city
        };
    }

    /**
     * Profilo pubblico tenant-scoped per la community.
     * - viewer normale: vede solo profili del proprio tenant
     * - super_admin (tenantId=null): vede qualsiasi profilo, stats sul tenant del target
     * - email esposta SOLO se isSelf=true (no email harvesting cross-utenti del tenant)
     * - isFollowing scoped per tenant (no leak cross-tenant)
     * - 4 COUNT consolidati in 1 sola query per ridurre RTT al DB
     */
    async getPublicProfile(targetUserId, tenantId, viewerId) {
        const isSuperAdmin = tenantId === null || tenantId === undefined;

        // Lookup target — se viewer super_admin niente filtro tenant
        const targetSql = isSuperAdmin
            ? `SELECT id, first_name, last_name, email, role, avatar_url, bio, city, tenant_id
               FROM users WHERE id = ? AND status = 'active'`
            : `SELECT id, first_name, last_name, email, role, avatar_url, bio, city, tenant_id
               FROM users WHERE id = ? AND tenant_id = ? AND status = 'active'`;
        const targetParams = isSuperAdmin ? [targetUserId] : [targetUserId, tenantId];
        const rows = await query(targetSql, targetParams);
        if (rows.length === 0) return null;
        const u = rows[0];

        // Stats sul tenant del target (per super_admin) o del viewer (per altri).
        // Tutte e 4 le COUNT in un singolo SELECT — riduce RTT da 4 a 1.
        const statsTenant = isSuperAdmin ? u.tenant_id : tenantId;
        const [statsRow] = await query(
            `SELECT
                (SELECT COUNT(*) FROM community_posts WHERE author_id = ? AND tenant_id = ? AND is_active = TRUE) AS posts,
                (SELECT COUNT(*) FROM user_follows WHERE followee_id = ? AND tenant_id = ?) AS followers,
                (SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND tenant_id = ?) AS following,
                (SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND followee_id = ? AND tenant_id = ?) AS is_following`,
            [
                targetUserId, statsTenant,
                targetUserId, statsTenant,
                targetUserId, statsTenant,
                viewerId, targetUserId, statsTenant
            ]
        );

        const isSelf = viewerId === u.id;

        return {
            user: {
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                // Email esposta SOLO al profilo del proprio utente (no harvesting cross-utenti)
                ...(isSelf ? { email: u.email } : {}),
                role: u.role,
                avatarUrl: u.avatar_url,
                bio: u.bio,
                city: u.city,
                isVerified: ['tenant_owner', 'staff', 'super_admin'].includes(u.role)
            },
            stats: {
                posts: statsRow.posts,
                followers: statsRow.followers,
                following: statsRow.following
            },
            isFollowing: statsRow.is_following > 0,
            isSelf
        };
    }

    /**
     * Segui un utente (idempotente). Restituisce { ok, followers, message?, status? }.
     */
    async followUser(followerId, followeeId, tenantId) {
        // Verifica che il followee esista nel medesimo tenant (sicurezza)
        const targetRows = await query(
            `SELECT 1 FROM users WHERE id = ? AND tenant_id = ? AND status = 'active'`,
            [followeeId, tenantId]
        );
        if (targetRows.length === 0) {
            return { ok: false, status: 404, message: 'Utente non trovato nel tenant' };
        }
        await query(
            `INSERT IGNORE INTO user_follows (tenant_id, follower_id, followee_id)
             VALUES (?, ?, ?)`,
            [tenantId, followerId, followeeId]
        );
        const [followers] = await query(
            `SELECT COUNT(*) AS c FROM user_follows WHERE followee_id = ? AND tenant_id = ?`,
            [followeeId, tenantId]
        );
        return { ok: true, followers: followers.c };
    }

    /**
     * Smetti di seguire (idempotente).
     */
    async unfollowUser(followerId, followeeId, tenantId) {
        await query(
            `DELETE FROM user_follows
             WHERE follower_id = ? AND followee_id = ? AND tenant_id = ?`,
            [followerId, followeeId, tenantId]
        );
        const [followers] = await query(
            `SELECT COUNT(*) AS c FROM user_follows WHERE followee_id = ? AND tenant_id = ?`,
            [followeeId, tenantId]
        );
        return { followers: followers.c };
    }
}

module.exports = new UserService();
