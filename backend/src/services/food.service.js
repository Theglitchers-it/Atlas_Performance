/**
 * Food Service
 * Database alimenti tenant-scoped, popolato organicamente.
 */

const { query } = require('../config/database');

class FoodService {
    async search(tenantId, searchText = '', limit = 20) {
        const term = `%${searchText}%`;
        return await query(
            `SELECT id, name, brand, default_unit, default_quantity,
                    calories_per_100, protein_per_100, carbs_per_100,
                    fat_per_100, fiber_per_100, is_preset
             FROM foods
             WHERE tenant_id = ?
               AND (name LIKE ? OR brand LIKE ?)
             ORDER BY is_preset DESC, name ASC
             LIMIT ?`,
            [tenantId, term, term, limit]
        );
    }

    async getById(id, tenantId) {
        const rows = await query(
            `SELECT * FROM foods WHERE id = ? AND tenant_id = ?`,
            [id, tenantId]
        );
        return rows[0] || null;
    }

    async create(tenantId, createdBy, data) {
        const {
            name, brand, defaultUnit, defaultQuantity,
            caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100,
            isPreset
        } = data;
        const result = await query(
            `INSERT INTO foods (
                tenant_id, name, brand, default_unit, default_quantity,
                calories_per_100, protein_per_100, carbs_per_100,
                fat_per_100, fiber_per_100, is_preset, created_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, name, brand || null,
                defaultUnit || 'g', defaultQuantity || 100,
                caloriesPer100 ?? null, proteinPer100 ?? null,
                carbsPer100 ?? null, fatPer100 ?? null, fiberPer100 ?? null,
                isPreset ? 1 : 0, createdBy
            ]
        );
        return { id: result.insertId };
    }

    async update(id, tenantId, data) {
        const {
            name, brand, defaultUnit, defaultQuantity,
            caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100,
            isPreset
        } = data;
        await query(
            `UPDATE foods SET
                name = COALESCE(?, name),
                brand = COALESCE(?, brand),
                default_unit = COALESCE(?, default_unit),
                default_quantity = COALESCE(?, default_quantity),
                calories_per_100 = COALESCE(?, calories_per_100),
                protein_per_100 = COALESCE(?, protein_per_100),
                carbs_per_100 = COALESCE(?, carbs_per_100),
                fat_per_100 = COALESCE(?, fat_per_100),
                fiber_per_100 = COALESCE(?, fiber_per_100),
                is_preset = COALESCE(?, is_preset)
             WHERE id = ? AND tenant_id = ?`,
            [
                name, brand, defaultUnit, defaultQuantity,
                caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100,
                isPreset === undefined ? null : (isPreset ? 1 : 0),
                id, tenantId
            ]
        );
        return this.getById(id, tenantId);
    }

    async delete(id, tenantId) {
        const result = await query(
            `DELETE FROM foods WHERE id = ? AND tenant_id = ?`,
            [id, tenantId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = new FoodService();
