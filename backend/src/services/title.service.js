/**
 * Title Service
 * Gestione titoli di achievement legati agli esercizi
 */

const { query } = require('../config/database');

class TitleService {

    async getTitles(tenantId, clientId, options = {}) {
        const { category, exerciseId, unlockedOnly } = options;

        let sql = `SELECT at.*, e.name as exercise_name,
                          ct.unlocked_at, ct.unlocked_value, ct.is_displayed,
                          CASE WHEN ct.id IS NOT NULL THEN 1 ELSE 0 END as unlocked
                   FROM achievement_titles at
                   LEFT JOIN exercises e ON at.exercise_id = e.id
                   LEFT JOIN client_titles ct ON at.id = ct.title_id AND ct.client_id = ?
                   WHERE (at.tenant_id IS NULL OR at.tenant_id = ?) AND at.is_active = 1`;
        const params = [clientId, tenantId];

        if (category) { sql += ' AND at.category = ?'; params.push(category); }
        if (exerciseId) { sql += ' AND at.exercise_id = ?'; params.push(exerciseId); }
        if (unlockedOnly) { sql += ' AND ct.id IS NOT NULL'; }

        sql += ' ORDER BY at.exercise_id, at.sort_order ASC, at.threshold_value ASC';
        return await query(sql, params);
    }

    async getTitleById(titleId, clientId) {
        const [title] = await query(
            `SELECT at.*, e.name as exercise_name,
                    ct.unlocked_at, ct.unlocked_value, ct.is_displayed,
                    CASE WHEN ct.id IS NOT NULL THEN 1 ELSE 0 END as unlocked
             FROM achievement_titles at
             LEFT JOIN exercises e ON at.exercise_id = e.id
             LEFT JOIN client_titles ct ON at.id = ct.title_id AND ct.client_id = ?
             WHERE at.id = ?`,
            [clientId, titleId]
        );
        return title || null;
    }

    async getDisplayedTitle(tenantId, clientId) {
        const [title] = await query(
            `SELECT at.*, ct.unlocked_at, ct.unlocked_value
             FROM client_titles ct
             JOIN achievement_titles at ON ct.title_id = at.id
             WHERE ct.client_id = ? AND ct.tenant_id = ? AND ct.is_displayed = 1`,
            [clientId, tenantId]
        );
        return title || null;
    }

    async setDisplayedTitle(tenantId, clientId, titleId) {
        // Rimuovi display corrente
        await query(
            'UPDATE client_titles SET is_displayed = 0 WHERE client_id = ? AND tenant_id = ?',
            [clientId, tenantId]
        );
        // Imposta nuovo
        if (titleId) {
            await query(
                'UPDATE client_titles SET is_displayed = 1 WHERE client_id = ? AND tenant_id = ? AND title_id = ?',
                [clientId, tenantId, titleId]
            );
        }
    }

    // === TITLE MANAGEMENT (Trainer CRUD) ===

    async getManageableTitles(tenantId) {
        return await query(
            `SELECT at.*, e.name as exercise_name
             FROM achievement_titles at
             LEFT JOIN exercises e ON at.exercise_id = e.id
             WHERE at.tenant_id = ?
             ORDER BY at.category, at.exercise_id, at.threshold_value ASC`,
            [tenantId]
        );
    }

    async createTitle(tenantId, data) {
        const {
            title_name, title_description, category, exercise_name,
            metric_type, threshold_value, rarity, sort_order
        } = data;

        // Cerca exercise_id dal nome se fornito
        let exerciseId = null;
        if (exercise_name) {
            const [exercise] = await query(
                'SELECT id FROM exercises WHERE (name = ? OR name LIKE ?) AND (tenant_id = ? OR tenant_id IS NULL) LIMIT 1',
                [exercise_name, `%${exercise_name}%`, tenantId]
            );
            exerciseId = exercise?.id || null;
        }

        const result = await query(
            `INSERT INTO achievement_titles
             (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
            [tenantId, title_name, title_description || null, category || 'custom',
             exerciseId, metric_type || 'weight_kg', threshold_value, rarity || 'common',
             sort_order || 0]
        );

        return { id: result.insertId, title_name, category, threshold_value, rarity };
    }

    async updateTitle(tenantId, titleId, data) {
        const {
            title_name, title_description, category, exercise_name,
            metric_type, threshold_value, rarity, sort_order, is_active
        } = data;

        // Verifica che il titolo appartenga al tenant
        const [existing] = await query(
            'SELECT id FROM achievement_titles WHERE id = ? AND tenant_id = ?',
            [titleId, tenantId]
        );
        if (!existing) return null;

        // Cerca exercise_id se exercise_name fornito
        let exerciseId = undefined;
        if (exercise_name !== undefined) {
            if (exercise_name) {
                const [exercise] = await query(
                    'SELECT id FROM exercises WHERE (name = ? OR name LIKE ?) AND (tenant_id = ? OR tenant_id IS NULL) LIMIT 1',
                    [exercise_name, `%${exercise_name}%`, tenantId]
                );
                exerciseId = exercise?.id || null;
            } else {
                exerciseId = null;
            }
        }

        const updates = [];
        const params = [];

        if (title_name !== undefined) { updates.push('title_name = ?'); params.push(title_name); }
        if (title_description !== undefined) { updates.push('title_description = ?'); params.push(title_description); }
        if (category !== undefined) { updates.push('category = ?'); params.push(category); }
        if (exerciseId !== undefined) { updates.push('exercise_id = ?'); params.push(exerciseId); }
        if (metric_type !== undefined) { updates.push('metric_type = ?'); params.push(metric_type); }
        if (threshold_value !== undefined) { updates.push('threshold_value = ?'); params.push(threshold_value); }
        if (rarity !== undefined) { updates.push('rarity = ?'); params.push(rarity); }
        if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

        if (updates.length === 0) return existing;

        updates.push('updated_at = NOW()');
        params.push(titleId, tenantId);

        await query(
            `UPDATE achievement_titles SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
            params
        );

        return { id: titleId, ...data };
    }

    async deleteTitle(tenantId, titleId) {
        // Verifica appartenenza al tenant
        const [existing] = await query(
            'SELECT id FROM achievement_titles WHERE id = ? AND tenant_id = ?',
            [titleId, tenantId]
        );
        if (!existing) return false;

        // Rimuovi titoli assegnati ai client
        await query(
            'DELETE FROM client_titles WHERE title_id = ? AND tenant_id = ?',
            [titleId, tenantId]
        );

        // Elimina il titolo
        await query(
            'DELETE FROM achievement_titles WHERE id = ? AND tenant_id = ?',
            [titleId, tenantId]
        );

        return true;
    }
}

module.exports = new TitleService();
