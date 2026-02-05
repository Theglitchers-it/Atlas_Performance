/**
 * Nutrition Service
 */

const db = require('../config/database');

class NutritionService {
    // ==================== MEAL PLANS ====================

    async getMealPlans(tenantId, options = {}) {
        const { clientId, status, limit = 20, offset = 0 } = options;

        let query = `
            SELECT mp.*,
                   c.first_name AS client_first_name,
                   c.last_name AS client_last_name,
                   u.first_name AS created_by_first_name,
                   u.last_name AS created_by_last_name
            FROM meal_plans mp
            JOIN clients c ON mp.client_id = c.id
            LEFT JOIN users u ON mp.created_by = u.id
            WHERE mp.tenant_id = ?
        `;
        const params = [tenantId];

        if (clientId) {
            query += ' AND mp.client_id = ?';
            params.push(clientId);
        }

        if (status) {
            query += ' AND mp.status = ?';
            params.push(status);
        }

        query += ' ORDER BY mp.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [plans] = await db.execute(query, params);
        return plans;
    }

    async getMealPlanById(planId, tenantId) {
        const [plans] = await db.execute(
            `SELECT mp.*,
                    c.first_name AS client_first_name,
                    c.last_name AS client_last_name
             FROM meal_plans mp
             JOIN clients c ON mp.client_id = c.id
             WHERE mp.id = ? AND mp.tenant_id = ?`,
            [planId, tenantId]
        );

        if (plans.length === 0) return null;

        const plan = plans[0];

        // Get days with meals and items
        const [days] = await db.execute(
            `SELECT * FROM meal_plan_days WHERE meal_plan_id = ? ORDER BY day_number`,
            [planId]
        );

        for (const day of days) {
            const [meals] = await db.execute(
                `SELECT * FROM meals WHERE plan_day_id = ? ORDER BY order_index`,
                [day.id]
            );

            for (const meal of meals) {
                const [items] = await db.execute(
                    `SELECT * FROM meal_items WHERE meal_id = ? ORDER BY id`,
                    [meal.id]
                );
                meal.items = items;
            }

            day.meals = meals;
        }

        plan.days = days;
        return plan;
    }

    async createMealPlan(tenantId, data, createdBy) {
        const {
            clientId, name, startDate, endDate,
            targetCalories, targetProteinG, targetCarbsG, targetFatG,
            notes, days = []
        } = data;

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Create meal plan
            const [result] = await connection.execute(
                `INSERT INTO meal_plans
                 (tenant_id, client_id, name, start_date, end_date,
                  target_calories, target_protein_g, target_carbs_g, target_fat_g,
                  notes, created_by, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
                [tenantId, clientId, name, startDate || null, endDate || null,
                 targetCalories || null, targetProteinG || null, targetCarbsG || null, targetFatG || null,
                 notes || null, createdBy]
            );

            const planId = result.insertId;

            // Create days with meals and items
            for (const day of days) {
                const [dayResult] = await connection.execute(
                    `INSERT INTO meal_plan_days (meal_plan_id, day_number, day_name, notes)
                     VALUES (?, ?, ?, ?)`,
                    [planId, day.dayNumber, day.dayName || null, day.notes || null]
                );

                const dayId = dayResult.insertId;

                if (day.meals) {
                    for (let i = 0; i < day.meals.length; i++) {
                        const meal = day.meals[i];
                        const [mealResult] = await connection.execute(
                            `INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes)
                             VALUES (?, ?, ?, ?, ?)`,
                            [dayId, meal.mealType, meal.name || null, i, meal.notes || null]
                        );

                        const mealId = mealResult.insertId;

                        if (meal.items) {
                            for (const item of meal.items) {
                                await connection.execute(
                                    `INSERT INTO meal_items
                                     (meal_id, food_name, quantity, unit, calories,
                                      protein_g, carbs_g, fat_g, fiber_g, notes)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [mealId, item.foodName, item.quantity, item.unit || 'g',
                                     item.calories || null, item.proteinG || null,
                                     item.carbsG || null, item.fatG || null,
                                     item.fiberG || null, item.notes || null]
                                );
                            }
                        }
                    }
                }
            }

            await connection.commit();
            return { id: planId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateMealPlan(planId, tenantId, data) {
        const {
            name, startDate, endDate,
            targetCalories, targetProteinG, targetCarbsG, targetFatG,
            status, notes
        } = data;

        await db.execute(
            `UPDATE meal_plans
             SET name = COALESCE(?, name),
                 start_date = COALESCE(?, start_date),
                 end_date = COALESCE(?, end_date),
                 target_calories = COALESCE(?, target_calories),
                 target_protein_g = COALESCE(?, target_protein_g),
                 target_carbs_g = COALESCE(?, target_carbs_g),
                 target_fat_g = COALESCE(?, target_fat_g),
                 status = COALESCE(?, status),
                 notes = COALESCE(?, notes)
             WHERE id = ? AND tenant_id = ?`,
            [name, startDate, endDate, targetCalories, targetProteinG,
             targetCarbsG, targetFatG, status, notes, planId, tenantId]
        );

        return { id: planId };
    }

    async deleteMealPlan(planId, tenantId) {
        const [result] = await db.execute(
            'DELETE FROM meal_plans WHERE id = ? AND tenant_id = ?',
            [planId, tenantId]
        );
        return result.affectedRows > 0;
    }

    // ==================== MEAL PLAN DAYS ====================

    async addPlanDay(planId, tenantId, data) {
        // Verify plan ownership
        const [plans] = await db.execute(
            'SELECT id FROM meal_plans WHERE id = ? AND tenant_id = ?',
            [planId, tenantId]
        );

        if (plans.length === 0) {
            throw new Error('Piano non trovato');
        }

        const { dayNumber, dayName, notes } = data;

        const [result] = await db.execute(
            `INSERT INTO meal_plan_days (meal_plan_id, day_number, day_name, notes)
             VALUES (?, ?, ?, ?)`,
            [planId, dayNumber, dayName || null, notes || null]
        );

        return { id: result.insertId };
    }

    async updatePlanDay(dayId, tenantId, data) {
        const { dayNumber, dayName, notes } = data;

        await db.execute(
            `UPDATE meal_plan_days mpd
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             SET mpd.day_number = COALESCE(?, mpd.day_number),
                 mpd.day_name = COALESCE(?, mpd.day_name),
                 mpd.notes = COALESCE(?, mpd.notes)
             WHERE mpd.id = ? AND mp.tenant_id = ?`,
            [dayNumber, dayName, notes, dayId, tenantId]
        );

        return { id: dayId };
    }

    async deletePlanDay(dayId, tenantId) {
        const [result] = await db.execute(
            `DELETE mpd FROM meal_plan_days mpd
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             WHERE mpd.id = ? AND mp.tenant_id = ?`,
            [dayId, tenantId]
        );
        return result.affectedRows > 0;
    }

    // ==================== MEALS ====================

    async addMeal(dayId, tenantId, data) {
        // Verify ownership through join
        const [days] = await db.execute(
            `SELECT mpd.id FROM meal_plan_days mpd
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             WHERE mpd.id = ? AND mp.tenant_id = ?`,
            [dayId, tenantId]
        );

        if (days.length === 0) {
            throw new Error('Giorno non trovato');
        }

        const { mealType, name, orderIndex, notes } = data;

        const [result] = await db.execute(
            `INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [dayId, mealType, name || null, orderIndex || 0, notes || null]
        );

        return { id: result.insertId };
    }

    async updateMeal(mealId, tenantId, data) {
        const { mealType, name, orderIndex, notes } = data;

        await db.execute(
            `UPDATE meals m
             JOIN meal_plan_days mpd ON m.plan_day_id = mpd.id
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             SET m.meal_type = COALESCE(?, m.meal_type),
                 m.name = COALESCE(?, m.name),
                 m.order_index = COALESCE(?, m.order_index),
                 m.notes = COALESCE(?, m.notes)
             WHERE m.id = ? AND mp.tenant_id = ?`,
            [mealType, name, orderIndex, notes, mealId, tenantId]
        );

        return { id: mealId };
    }

    async deleteMeal(mealId, tenantId) {
        const [result] = await db.execute(
            `DELETE m FROM meals m
             JOIN meal_plan_days mpd ON m.plan_day_id = mpd.id
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             WHERE m.id = ? AND mp.tenant_id = ?`,
            [mealId, tenantId]
        );
        return result.affectedRows > 0;
    }

    // ==================== MEAL ITEMS ====================

    async addMealItem(mealId, tenantId, data) {
        // Verify ownership
        const [meals] = await db.execute(
            `SELECT m.id FROM meals m
             JOIN meal_plan_days mpd ON m.plan_day_id = mpd.id
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             WHERE m.id = ? AND mp.tenant_id = ?`,
            [mealId, tenantId]
        );

        if (meals.length === 0) {
            throw new Error('Pasto non trovato');
        }

        const { foodName, quantity, unit, calories, proteinG, carbsG, fatG, fiberG, notes } = data;

        const [result] = await db.execute(
            `INSERT INTO meal_items
             (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [mealId, foodName, quantity, unit || 'g', calories || null,
             proteinG || null, carbsG || null, fatG || null, fiberG || null, notes || null]
        );

        return { id: result.insertId };
    }

    async updateMealItem(itemId, tenantId, data) {
        const { foodName, quantity, unit, calories, proteinG, carbsG, fatG, fiberG, notes } = data;

        await db.execute(
            `UPDATE meal_items mi
             JOIN meals m ON mi.meal_id = m.id
             JOIN meal_plan_days mpd ON m.plan_day_id = mpd.id
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             SET mi.food_name = COALESCE(?, mi.food_name),
                 mi.quantity = COALESCE(?, mi.quantity),
                 mi.unit = COALESCE(?, mi.unit),
                 mi.calories = COALESCE(?, mi.calories),
                 mi.protein_g = COALESCE(?, mi.protein_g),
                 mi.carbs_g = COALESCE(?, mi.carbs_g),
                 mi.fat_g = COALESCE(?, mi.fat_g),
                 mi.fiber_g = COALESCE(?, mi.fiber_g),
                 mi.notes = COALESCE(?, mi.notes)
             WHERE mi.id = ? AND mp.tenant_id = ?`,
            [foodName, quantity, unit, calories, proteinG, carbsG, fatG, fiberG, notes, itemId, tenantId]
        );

        return { id: itemId };
    }

    async deleteMealItem(itemId, tenantId) {
        const [result] = await db.execute(
            `DELETE mi FROM meal_items mi
             JOIN meals m ON mi.meal_id = m.id
             JOIN meal_plan_days mpd ON m.plan_day_id = mpd.id
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             WHERE mi.id = ? AND mp.tenant_id = ?`,
            [itemId, tenantId]
        );
        return result.affectedRows > 0;
    }

    // ==================== NUTRITION STATS ====================

    async getClientNutritionSummary(clientId, tenantId) {
        // Get active meal plan
        const [activePlans] = await db.execute(
            `SELECT * FROM meal_plans
             WHERE client_id = ? AND tenant_id = ? AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [clientId, tenantId]
        );

        // Get all meal plans count
        const [planCount] = await db.execute(
            `SELECT COUNT(*) as total FROM meal_plans
             WHERE client_id = ? AND tenant_id = ?`,
            [clientId, tenantId]
        );

        return {
            activePlan: activePlans[0] || null,
            totalPlans: planCount[0].total,
            targets: activePlans[0] ? {
                calories: activePlans[0].target_calories,
                protein: activePlans[0].target_protein_g,
                carbs: activePlans[0].target_carbs_g,
                fat: activePlans[0].target_fat_g
            } : null
        };
    }

    async calculateDayNutrition(dayId, tenantId) {
        const [items] = await db.execute(
            `SELECT mi.calories, mi.protein_g, mi.carbs_g, mi.fat_g, mi.fiber_g
             FROM meal_items mi
             JOIN meals m ON mi.meal_id = m.id
             JOIN meal_plan_days mpd ON m.plan_day_id = mpd.id
             JOIN meal_plans mp ON mpd.meal_plan_id = mp.id
             WHERE mpd.id = ? AND mp.tenant_id = ?`,
            [dayId, tenantId]
        );

        return items.reduce((acc, item) => ({
            calories: acc.calories + (item.calories || 0),
            protein: acc.protein + (parseFloat(item.protein_g) || 0),
            carbs: acc.carbs + (parseFloat(item.carbs_g) || 0),
            fat: acc.fat + (parseFloat(item.fat_g) || 0),
            fiber: acc.fiber + (parseFloat(item.fiber_g) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    }
}

module.exports = new NutritionService();
