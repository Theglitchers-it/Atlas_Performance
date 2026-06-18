/**
 * Food Log Service
 * Diario alimentare cliente: entries giornaliere, totali, summary periodo.
 */

const { query } = require('../config/database');

function computeMacrosFromFood(food, quantity) {
    if (!food || !quantity) return { calories: null, protein: null, carbs: null, fat: null, fiber: null };
    const factor = Number(quantity) / 100;
    const round = (v) => v == null ? null : Math.round(Number(v) * factor * 10) / 10;
    return {
        calories: round(food.calories_per_100),
        protein: round(food.protein_per_100),
        carbs: round(food.carbs_per_100),
        fat: round(food.fat_per_100),
        fiber: round(food.fiber_per_100)
    };
}

class FoodLogService {
    async listByDay(tenantId, clientId, dateISO) {
        return await query(
            `SELECT id, food_id, food_name, quantity, unit, meal_type,
                    calories, protein, carbs, fat, fiber, logged_at, notes, photo_url, entered_by
             FROM food_log_entries
             WHERE tenant_id = ? AND client_id = ?
               AND logged_at >= ? AND logged_at < DATE_ADD(?, INTERVAL 1 DAY)
             ORDER BY logged_at ASC`,
            [tenantId, clientId, dateISO, dateISO]
        );
    }

    async listByRange(tenantId, clientId, startDate, endDate) {
        return await query(
            `SELECT id, food_id, food_name, quantity, unit, meal_type,
                    calories, protein, carbs, fat, fiber, logged_at, notes
             FROM food_log_entries
             WHERE tenant_id = ? AND client_id = ?
               AND logged_at >= ? AND logged_at < DATE_ADD(?, INTERVAL 1 DAY)
             ORDER BY logged_at ASC`,
            [tenantId, clientId, startDate, endDate, endDate]
        );
    }

    async getDayTotals(tenantId, clientId, dateISO) {
        const rows = await query(
            `SELECT
                COALESCE(SUM(calories), 0) AS calories,
                COALESCE(SUM(protein), 0) AS protein,
                COALESCE(SUM(carbs), 0) AS carbs,
                COALESCE(SUM(fat), 0) AS fat,
                COALESCE(SUM(fiber), 0) AS fiber,
                COUNT(*) AS entries_count
             FROM food_log_entries
             WHERE tenant_id = ? AND client_id = ?
               AND logged_at >= ? AND logged_at < DATE_ADD(?, INTERVAL 1 DAY)`,
            [tenantId, clientId, dateISO, dateISO]
        );
        return rows[0];
    }

    async getRangeSummary(tenantId, clientId, startDate, endDate) {
        const rows = await query(
            `SELECT
                DATE(logged_at) AS day,
                COALESCE(SUM(calories), 0) AS calories,
                COALESCE(SUM(protein), 0) AS protein,
                COALESCE(SUM(carbs), 0) AS carbs,
                COALESCE(SUM(fat), 0) AS fat,
                COALESCE(SUM(fiber), 0) AS fiber,
                COUNT(*) AS entries_count
             FROM food_log_entries
             WHERE tenant_id = ? AND client_id = ?
               AND logged_at >= ? AND logged_at < DATE_ADD(?, INTERVAL 1 DAY)
             GROUP BY DATE(logged_at)
             ORDER BY day ASC`,
            [tenantId, clientId, startDate, endDate, endDate]
        );

        const days = rows.length;
        const aggregate = rows.reduce((acc, r) => {
            acc.calories += Number(r.calories);
            acc.protein += Number(r.protein);
            acc.carbs += Number(r.carbs);
            acc.fat += Number(r.fat);
            acc.fiber += Number(r.fiber);
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

        const averages = days > 0 ? {
            calories: Math.round(aggregate.calories / days),
            protein: Math.round((aggregate.protein / days) * 10) / 10,
            carbs: Math.round((aggregate.carbs / days) * 10) / 10,
            fat: Math.round((aggregate.fat / days) * 10) / 10,
            fiber: Math.round((aggregate.fiber / days) * 10) / 10,
        } : null;

        return { days: rows, daysCount: days, totals: aggregate, averages };
    }

    async create(tenantId, clientId, enteredBy, data) {
        const {
            foodId, foodName, quantity, unit, mealType, loggedAt, notes,
            calories, protein, carbs, fat, fiber, photoUrl
        } = data;

        let computed = { calories, protein, carbs, fat, fiber };

        if (foodId && (calories == null || protein == null || carbs == null || fat == null)) {
            const foodRows = await query(
                `SELECT calories_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100
                 FROM foods WHERE id = ? AND tenant_id = ?`,
                [foodId, tenantId]
            );
            if (foodRows[0]) {
                const auto = computeMacrosFromFood(foodRows[0], quantity);
                computed = {
                    calories: calories ?? auto.calories,
                    protein: protein ?? auto.protein,
                    carbs: carbs ?? auto.carbs,
                    fat: fat ?? auto.fat,
                    fiber: fiber ?? auto.fiber
                };
            }
        }

        const result = await query(
            `INSERT INTO food_log_entries (
                tenant_id, client_id, food_id, food_name, quantity, unit,
                meal_type, calories, protein, carbs, fat, fiber,
                logged_at, notes, photo_url, entered_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, clientId, foodId || null, foodName,
                quantity, unit || 'g', mealType || 'other',
                computed.calories, computed.protein, computed.carbs,
                computed.fat, computed.fiber,
                loggedAt, notes || null, photoUrl || null, enteredBy
            ]
        );
        return { id: result.insertId };
    }

    async update(id, tenantId, clientId, data) {
        const {
            quantity, unit, mealType, loggedAt, notes,
            calories, protein, carbs, fat, fiber
        } = data;
        await query(
            `UPDATE food_log_entries SET
                quantity = COALESCE(?, quantity),
                unit = COALESCE(?, unit),
                meal_type = COALESCE(?, meal_type),
                logged_at = COALESCE(?, logged_at),
                notes = COALESCE(?, notes),
                calories = COALESCE(?, calories),
                protein = COALESCE(?, protein),
                carbs = COALESCE(?, carbs),
                fat = COALESCE(?, fat),
                fiber = COALESCE(?, fiber)
             WHERE id = ? AND tenant_id = ? AND client_id = ?`,
            [
                quantity, unit, mealType, loggedAt, notes,
                calories, protein, carbs, fat, fiber,
                id, tenantId, clientId
            ]
        );
        return id;
    }

    async delete(id, tenantId, clientId) {
        const result = await query(
            `DELETE FROM food_log_entries
             WHERE id = ? AND tenant_id = ? AND client_id = ?`,
            [id, tenantId, clientId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = new FoodLogService();
