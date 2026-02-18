/**
 * Exercise Service
 * Gestione libreria esercizi
 */

const { query } = require('../config/database');

class ExerciseService {
    /**
     * Ottieni tutti gli esercizi (globali + tenant)
     */
    async getAll(tenantId, options = {}) {
        const { category, difficulty, muscleGroup, search, page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT DISTINCT e.id, e.name, e.description, e.instructions, e.video_url, e.image_url,
                   e.category, e.equipment, e.difficulty, e.is_compound, e.is_custom,
                   e.tenant_id, e.created_at
            FROM exercises e
            LEFT JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
            WHERE e.is_active = TRUE AND (e.tenant_id IS NULL OR e.tenant_id = ?)
        `;
        const params = [tenantId];

        if (category) {
            sql += ' AND e.category = ?';
            params.push(category);
        }

        if (difficulty) {
            sql += ' AND e.difficulty = ?';
            params.push(difficulty);
        }

        if (muscleGroup) {
            sql += ' AND emg.muscle_group_id = ?';
            params.push(muscleGroup);
        }

        if (search) {
            sql += ' AND (e.name LIKE ? OR e.description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        // Count
        const countSql = sql.replace(/SELECT DISTINCT.*FROM/s, 'SELECT COUNT(DISTINCT e.id) as total FROM');
        const countResult = await query(countSql, params);
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY e.name ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const exercises = await query(sql, params);

        // Load muscle groups for each exercise
        for (const exercise of exercises) {
            const muscles = await query(`
                SELECT mg.id, mg.name, mg.name_it, mg.category, emg.is_primary
                FROM exercise_muscle_groups emg
                JOIN muscle_groups mg ON emg.muscle_group_id = mg.id
                WHERE emg.exercise_id = ?
            `, [exercise.id]);
            exercise.muscleGroups = muscles;
        }

        return {
            exercises,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Ottieni esercizio per ID
     */
    async getById(id, tenantId) {
        const exercises = await query(`
            SELECT e.*
            FROM exercises e
            WHERE e.id = ? AND e.is_active = TRUE
              AND (e.tenant_id IS NULL OR e.tenant_id = ?)
        `, [id, tenantId]);

        if (exercises.length === 0) {
            throw { status: 404, message: 'Esercizio non trovato' };
        }

        const exercise = exercises[0];

        // Load muscle groups
        const muscles = await query(`
            SELECT mg.id, mg.name, mg.name_it, mg.category, emg.is_primary, emg.activation_percentage
            FROM exercise_muscle_groups emg
            JOIN muscle_groups mg ON emg.muscle_group_id = mg.id
            WHERE emg.exercise_id = ?
        `, [id]);
        exercise.muscleGroups = muscles;

        return exercise;
    }

    /**
     * Crea esercizio personalizzato
     */
    async create(tenantId, exerciseData) {
        const {
            name, description, instructions, videoUrl, imageUrl,
            category, equipment, difficulty, isCompound, muscleGroups
        } = exerciseData;

        const result = await query(`
            INSERT INTO exercises (tenant_id, name, description, instructions, video_url, image_url,
                                   category, equipment, difficulty, is_compound, is_custom, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
        `, [
            tenantId, name, description || null, instructions || null,
            videoUrl || null, imageUrl || null, category,
            equipment ? JSON.stringify(equipment) : null,
            difficulty || 'intermediate', isCompound || false
        ]);

        const exerciseId = result.insertId;

        // Add muscle groups
        if (muscleGroups && muscleGroups.length > 0) {
            for (const mg of muscleGroups) {
                await query(`
                    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
                    VALUES (?, ?, ?, ?)
                `, [exerciseId, mg.id, mg.isPrimary || true, mg.activationPercentage || 100]);
            }
        }

        return this.getById(exerciseId, tenantId);
    }

    /**
     * Aggiorna esercizio (solo custom)
     */
    async update(id, tenantId, exerciseData) {
        const exercise = await this.getById(id, tenantId);

        if (!exercise.is_custom || exercise.tenant_id !== tenantId) {
            throw { status: 403, message: 'Non puoi modificare esercizi predefiniti' };
        }

        const {
            name, description, instructions, videoUrl, imageUrl,
            category, equipment, difficulty, isCompound, muscleGroups
        } = exerciseData;

        await query(`
            UPDATE exercises SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                instructions = COALESCE(?, instructions),
                video_url = COALESCE(?, video_url),
                image_url = COALESCE(?, image_url),
                category = COALESCE(?, category),
                equipment = COALESCE(?, equipment),
                difficulty = COALESCE(?, difficulty),
                is_compound = COALESCE(?, is_compound),
                updated_at = NOW()
            WHERE id = ?
        `, [
            name, description, instructions, videoUrl, imageUrl,
            category, equipment ? JSON.stringify(equipment) : null,
            difficulty, isCompound, id
        ]);

        // Update muscle groups if provided
        if (muscleGroups) {
            await query('DELETE FROM exercise_muscle_groups WHERE exercise_id = ?', [id]);
            for (const mg of muscleGroups) {
                await query(`
                    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
                    VALUES (?, ?, ?, ?)
                `, [id, mg.id, mg.isPrimary || true, mg.activationPercentage || 100]);
            }
        }

        return this.getById(id, tenantId);
    }

    /**
     * Elimina esercizio (solo custom)
     */
    async delete(id, tenantId) {
        const exercise = await this.getById(id, tenantId);

        if (!exercise.is_custom || exercise.tenant_id !== tenantId) {
            throw { status: 403, message: 'Non puoi eliminare esercizi predefiniti' };
        }

        await query('UPDATE exercises SET is_active = FALSE WHERE id = ?', [id]);
        return { success: true };
    }

    /**
     * Ottieni gruppi muscolari
     */
    async getMuscleGroups() {
        return await query('SELECT * FROM muscle_groups ORDER BY category, name');
    }

    /**
     * Categorie esercizi
     */
    getCategories() {
        return [
            { value: 'strength', label: 'Forza' },
            { value: 'cardio', label: 'Cardio' },
            { value: 'flexibility', label: 'Flessibilita' },
            { value: 'balance', label: 'Equilibrio' },
            { value: 'plyometric', label: 'Pliometrico' },
            { value: 'compound', label: 'Composto' },
            { value: 'isolation', label: 'Isolamento' }
        ];
    }
}

module.exports = new ExerciseService();
