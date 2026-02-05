/**
 * Workout Service
 * Gestione template workout
 */

const { query, transaction } = require('../config/database');

class WorkoutService {
    /**
     * Ottieni tutti i template workout del tenant
     */
    async getAll(tenantId, options = {}) {
        const { category, difficulty, search, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT wt.*, u.first_name as creator_first_name, u.last_name as creator_last_name
            FROM workout_templates wt
            LEFT JOIN users u ON wt.created_by = u.id
            WHERE wt.tenant_id = ? AND wt.is_active = TRUE
        `;
        const params = [tenantId];

        if (category) {
            sql += ' AND wt.category = ?';
            params.push(category);
        }

        if (difficulty) {
            sql += ' AND wt.difficulty = ?';
            params.push(difficulty);
        }

        if (search) {
            sql += ' AND (wt.name LIKE ? OR wt.description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        const countSql = sql.replace(/SELECT.*FROM/s, 'SELECT COUNT(*) as total FROM');
        const countResult = await query(countSql, params);
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY wt.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const workouts = await query(sql, params);

        return {
            workouts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Ottieni template per ID
     */
    async getById(id, tenantId) {
        const templates = await query(`
            SELECT wt.*, u.first_name as creator_first_name, u.last_name as creator_last_name
            FROM workout_templates wt
            LEFT JOIN users u ON wt.created_by = u.id
            WHERE wt.id = ? AND wt.tenant_id = ? AND wt.is_active = TRUE
        `, [id, tenantId]);

        if (templates.length === 0) {
            throw { status: 404, message: 'Template workout non trovato' };
        }

        const template = templates[0];

        // Load exercises
        const exercises = await query(`
            SELECT wte.*, e.name as exercise_name, e.category as exercise_category,
                   e.video_url, e.image_url, e.difficulty as exercise_difficulty
            FROM workout_template_exercises wte
            JOIN exercises e ON wte.exercise_id = e.id
            WHERE wte.template_id = ?
            ORDER BY wte.order_index ASC
        `, [id]);

        template.exercises = exercises;

        return template;
    }

    /**
     * Crea template workout
     */
    async create(tenantId, workoutData, createdBy) {
        const {
            name, description, category, difficulty,
            estimatedDurationMin, targetMuscles, exercises
        } = workoutData;

        return await transaction(async (connection) => {
            // Create template
            const [result] = await connection.execute(`
                INSERT INTO workout_templates (tenant_id, name, description, category, difficulty,
                                               estimated_duration_min, target_muscles, is_template, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)
            `, [
                tenantId, name, description || null, category || 'custom',
                difficulty || 'intermediate', estimatedDurationMin || null,
                targetMuscles ? JSON.stringify(targetMuscles) : null, createdBy
            ]);

            const templateId = result.insertId;

            // Add exercises
            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    await connection.execute(`
                        INSERT INTO workout_template_exercises
                        (template_id, exercise_id, order_index, sets, reps_min, reps_max,
                         weight_type, weight_value, rest_seconds, tempo, notes, superset_group, is_warmup)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        templateId, ex.exerciseId, i + 1, ex.sets || 3,
                        ex.repsMin || null, ex.repsMax || null,
                        ex.weightType || 'fixed', ex.weightValue || null,
                        ex.restSeconds || 90, ex.tempo || null, ex.notes || null,
                        ex.supersetGroup || null, ex.isWarmup || false
                    ]);
                }
            }

            return { templateId };
        });
    }

    /**
     * Aggiorna template
     */
    async update(id, tenantId, workoutData) {
        await this.getById(id, tenantId);

        const {
            name, description, category, difficulty,
            estimatedDurationMin, targetMuscles, exercises
        } = workoutData;

        return await transaction(async (connection) => {
            await connection.execute(`
                UPDATE workout_templates SET
                    name = COALESCE(?, name),
                    description = COALESCE(?, description),
                    category = COALESCE(?, category),
                    difficulty = COALESCE(?, difficulty),
                    estimated_duration_min = COALESCE(?, estimated_duration_min),
                    target_muscles = COALESCE(?, target_muscles),
                    updated_at = NOW()
                WHERE id = ? AND tenant_id = ?
            `, [
                name, description, category, difficulty, estimatedDurationMin,
                targetMuscles ? JSON.stringify(targetMuscles) : null, id, tenantId
            ]);

            // Update exercises if provided
            if (exercises) {
                await connection.execute('DELETE FROM workout_template_exercises WHERE template_id = ?', [id]);

                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    await connection.execute(`
                        INSERT INTO workout_template_exercises
                        (template_id, exercise_id, order_index, sets, reps_min, reps_max,
                         weight_type, weight_value, rest_seconds, tempo, notes, superset_group, is_warmup)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        id, ex.exerciseId, i + 1, ex.sets || 3,
                        ex.repsMin || null, ex.repsMax || null,
                        ex.weightType || 'fixed', ex.weightValue || null,
                        ex.restSeconds || 90, ex.tempo || null, ex.notes || null,
                        ex.supersetGroup || null, ex.isWarmup || false
                    ]);
                }
            }

            return { success: true };
        });
    }

    /**
     * Elimina template
     */
    async delete(id, tenantId) {
        await this.getById(id, tenantId);
        await query('UPDATE workout_templates SET is_active = FALSE WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return { success: true };
    }

    /**
     * Duplica template
     */
    async duplicate(id, tenantId, newName, createdBy) {
        const original = await this.getById(id, tenantId);

        const exercises = original.exercises.map(ex => ({
            exerciseId: ex.exercise_id,
            sets: ex.sets,
            repsMin: ex.reps_min,
            repsMax: ex.reps_max,
            weightType: ex.weight_type,
            weightValue: ex.weight_value,
            restSeconds: ex.rest_seconds,
            tempo: ex.tempo,
            notes: ex.notes,
            supersetGroup: ex.superset_group,
            isWarmup: ex.is_warmup
        }));

        return this.create(tenantId, {
            name: newName || `${original.name} (copia)`,
            description: original.description,
            category: original.category,
            difficulty: original.difficulty,
            estimatedDurationMin: original.estimated_duration_min,
            targetMuscles: original.target_muscles,
            exercises
        }, createdBy);
    }
}

module.exports = new WorkoutService();
