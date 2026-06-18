/**
 * Client Saved Views Service (Fase 10)
 * CRUD preset filtri+sort per la lista clienti, per-utente.
 */

const { query } = require('../config/database');

class SavedViewsService {

    async list({ tenantId, userId }) {
        return query(
            `SELECT id, name, is_default, filters_json, created_at, updated_at
             FROM client_saved_views
             WHERE tenant_id = ? AND user_id = ?
             ORDER BY is_default DESC, name ASC`,
            [tenantId, userId]
        );
    }

    async create({ tenantId, userId, name, filtersJson, isDefault = false }) {
        if (!name || name.length < 1) throw { status: 400, message: 'Nome richiesto' };
        try {
            if (isDefault) {
                await query('UPDATE client_saved_views SET is_default = FALSE WHERE user_id = ?', [userId]);
            }
            const result = await query(
                `INSERT INTO client_saved_views (tenant_id, user_id, name, filters_json, is_default)
                 VALUES (?, ?, ?, ?, ?)`,
                [tenantId, userId, name, JSON.stringify(filtersJson || {}), isDefault]
            );
            return { id: result.insertId, success: true };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw { status: 409, message: 'Esiste già una vista con questo nome' };
            }
            throw err;
        }
    }

    async update({ tenantId, userId, viewId, name, filtersJson, isDefault }) {
        const sets = [];
        const params = [];
        if (name !== undefined) { sets.push('name = ?'); params.push(name); }
        if (filtersJson !== undefined) { sets.push('filters_json = ?'); params.push(JSON.stringify(filtersJson)); }
        if (isDefault === true) {
            await query('UPDATE client_saved_views SET is_default = FALSE WHERE user_id = ?', [userId]);
            sets.push('is_default = TRUE');
        } else if (isDefault === false) {
            sets.push('is_default = FALSE');
        }
        if (sets.length === 0) return { success: true };

        params.push(viewId, tenantId, userId);
        const result = await query(
            `UPDATE client_saved_views SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ? AND user_id = ?`,
            params
        );
        if (result.affectedRows === 0) throw { status: 404, message: 'Vista non trovata' };
        return { success: true };
    }

    async remove({ tenantId, userId, viewId }) {
        const result = await query(
            'DELETE FROM client_saved_views WHERE id = ? AND tenant_id = ? AND user_id = ?',
            [viewId, tenantId, userId]
        );
        if (result.affectedRows === 0) throw { status: 404, message: 'Vista non trovata' };
        return { success: true };
    }
}

module.exports = new SavedViewsService();
