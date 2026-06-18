/**
 * Client Service
 * Gestione logica business clienti
 */

const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');

class ClientService {
    /**
     * Ottieni tutti i clienti del tenant
     */
    async getAll(tenantId, options = {}) {
        const { status, fitnessLevel, assignedTo, search, page = 1, limit = 20, sort = 'created_desc' } = options;
        const offset = (page - 1) * limit;

        // Sort whitelist server-side. Usa c.last_workout_at denormalizzato per evitare
        // filesort sulla colonna derivata vca.last_workout_at.
        const sortMap = {
            name_asc: 'c.last_name ASC, c.first_name ASC',
            name_desc: 'c.last_name DESC, c.first_name DESC',
            created_desc: 'c.created_at DESC',
            created_asc: 'c.created_at ASC',
            last_session_desc: 'c.last_workout_at DESC',
            last_session_asc: 'c.last_workout_at ASC',
            subscription_end_asc: 'cs.active_subscription_end_date ASC',
            subscription_end_desc: 'cs.active_subscription_end_date DESC'
        };
        const orderBy = sortMap[sort] || sortMap.created_desc;

        // Costruisci filtri dinamici WHERE (condivisi tra count e data query)
        let whereClause = 'WHERE c.tenant_id = ?';
        const filterParams = [tenantId];

        if (status) {
            whereClause += ' AND c.status = ?';
            filterParams.push(status);
        }

        if (fitnessLevel) {
            whereClause += ' AND c.fitness_level = ?';
            filterParams.push(fitnessLevel);
        }

        if (assignedTo) {
            whereClause += ' AND c.assigned_to = ?';
            filterParams.push(assignedTo);
        }

        if (search) {
            const sanitizedSearch = search.replace(/[%_]/g, '\\$&');
            whereClause += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
            const searchPattern = `%${sanitizedSearch}%`;
            filterParams.push(searchPattern, searchPattern, searchPattern);
        }

        // Count totale (senza JOIN aggiuntivi per performance)
        const countSql = `SELECT COUNT(*) as total FROM clients c ${whereClause}`;
        const countResult = await query(countSql, filterParams);
        const total = countResult[0]?.total || 0;

        // Query principale con JOIN arricchimento (abbonamento, misurazioni, lifetime, tag, activity recap).
        // Rimosso JOIN users u ON c.assigned_to: il frontend usa primary_trainer_* dalla view.
        const sql = `
            SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
                   c.date_of_birth, c.gender, c.fitness_level, c.primary_goal,
                   c.current_weight_kg, c.height_cm, c.status, c.xp_points,
                   c.level, c.streak_days, c.last_workout_at, c.created_at,
                   c.photo_url,
                   cs.active_subscription_end_date,
                   bm.last_measurement_date,
                   lt.lifetime_subscription_months,
                   lt.first_subscription_date,
                   lt.days_since_last_sub_end,
                   COALESCE(tg.tags, JSON_ARRAY()) AS tags,
                   vca.last_workout_at AS recap_last_workout_at,
                   vca.last_checkin_at AS recap_last_checkin_at,
                   vca.weight_trend_30d,
                   vca.primary_trainer_id,
                   pt.first_name AS primary_trainer_first_name,
                   pt.last_name AS primary_trainer_last_name
            FROM clients c
            LEFT JOIN (
                SELECT client_id, MAX(end_date) AS active_subscription_end_date
                FROM client_subscriptions
                WHERE tenant_id = ? AND status = 'active'
                GROUP BY client_id
            ) cs ON c.id = cs.client_id
            LEFT JOIN (
                SELECT client_id, MAX(measurement_date) AS last_measurement_date
                FROM body_measurements
                WHERE tenant_id = ?
                GROUP BY client_id
            ) bm ON c.id = bm.client_id
            LEFT JOIN (
                SELECT client_id,
                       ROUND(SUM(DATEDIFF(end_date, start_date) / 30.44), 1) AS lifetime_subscription_months,
                       MIN(start_date) AS first_subscription_date,
                       DATEDIFF(CURDATE(), MAX(end_date)) AS days_since_last_sub_end
                FROM client_subscriptions
                WHERE tenant_id = ?
                GROUP BY client_id
            ) lt ON c.id = lt.client_id
            LEFT JOIN (
                SELECT client_id, JSON_ARRAYAGG(tag) AS tags
                FROM client_tags
                WHERE tenant_id = ?
                GROUP BY client_id
            ) tg ON c.id = tg.client_id
            LEFT JOIN v_client_activity_summary vca ON vca.client_id = c.id
            LEFT JOIN users pt ON pt.id = vca.primary_trainer_id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const queryParams = [tenantId, tenantId, tenantId, tenantId, ...filterParams, limit, offset];
        const clients = await query(sql, queryParams);

        return {
            clients,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Verifica che il cliente appartenga al tenant (guard leggero, 1 sola query)
     */
    async assertOwnership(clientId, tenantId) {
        const rows = await query(
            'SELECT id FROM clients WHERE id = ? AND tenant_id = ?',
            [clientId, tenantId]
        );
        if (rows.length === 0) {
            throw { status: 404, message: 'Cliente non trovato' };
        }
    }

    /**
     * Ottieni cliente per ID
     */
    async getById(id, tenantId) {
        const clients = await query(
            `SELECT c.*,
                    u.first_name as assigned_first_name,
                    u.last_name as assigned_last_name,
                    u.email as assigned_email
             FROM clients c
             LEFT JOIN users u ON c.assigned_to = u.id
             WHERE c.id = ? AND c.tenant_id = ?`,
            [id, tenantId]
        );

        if (clients.length === 0) {
            throw { status: 404, message: 'Cliente non trovato' };
        }

        const client = clients[0];

        // Obiettivi e infortuni attivi: query indipendenti → caricate in parallelo.
        const [goals, injuries] = await Promise.all([
            query(
                `SELECT * FROM client_goals
             WHERE client_id = ? AND status = 'active'
             ORDER BY priority ASC`,
                [id]
            ),
            query(
                `SELECT * FROM injuries
             WHERE client_id = ? AND status != 'recovered'
             ORDER BY injury_date DESC`,
                [id]
            )
        ]);

        return {
            ...client,
            goals,
            injuries
        };
    }

    /**
     * Crea nuovo cliente
     */
    async create(tenantId, clientData, createdBy) {
        const {
            firstName, lastName, email, phone, dateOfBirth, gender,
            heightCm, initialWeightKg, fitnessLevel, primaryGoal,
            secondaryGoals, medicalNotes, dietaryRestrictions,
            emergencyContactName, emergencyContactPhone, notes,
            trainingLocation, assignedTo,
            sportHistory, occupationType, dailyStepsAvg, jointPainAreas,
            previousDiets, foodAllergies, currentDietPhase,
            baselineStressLevel, mealsPerDayHabit,
            createAccount, password
        } = clientData;

        // Verifica limite clienti: le due letture sono indipendenti → in parallelo.
        const [[tenantData], [clientCount]] = await Promise.all([
            query('SELECT max_clients FROM tenants WHERE id = ?', [tenantId]),
            query('SELECT COUNT(*) as count FROM clients WHERE tenant_id = ? AND status = "active"', [tenantId])
        ]);

        if (clientCount.count >= tenantData.max_clients) {
            throw { status: 403, message: 'Hai raggiunto il limite massimo di clienti per il tuo piano' };
        }

        // Verifica email se fornita
        if (email) {
            const existing = await query(
                'SELECT id FROM clients WHERE email = ? AND tenant_id = ?',
                [email, tenantId]
            );
            if (existing.length > 0) {
                throw { status: 409, message: 'Email già registrata per un altro cliente' };
            }
        }

        return await transaction(async (connection) => {
            let userId = null;

            // Crea account utente se richiesto
            if (createAccount && email && password) {
                const passwordHash = await bcrypt.hash(password, 12);

                const [userResult] = await connection.execute(
                    `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, status)
                     VALUES (?, ?, ?, 'client', ?, ?, ?, 'active')`,
                    [tenantId, email, passwordHash, firstName, lastName, phone || null]
                );
                userId = userResult.insertId;
            }

            // Crea cliente
            const [clientResult] = await connection.execute(
                `INSERT INTO clients (
                    tenant_id, user_id, first_name, last_name, email, phone,
                    date_of_birth, gender, height_cm, initial_weight_kg, current_weight_kg,
                    fitness_level, primary_goal, sport_history, occupation_type,
                    daily_steps_avg, joint_pain_areas, secondary_goals, medical_notes,
                    dietary_restrictions, emergency_contact_name, emergency_contact_phone,
                    notes, training_location, assigned_to,
                    previous_diets, food_allergies, current_diet_phase,
                    baseline_stress_level, meals_per_day_habit, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                [
                    tenantId, userId, firstName, lastName, email || null, phone || null,
                    dateOfBirth || null, gender || null, heightCm || null,
                    initialWeightKg || null, initialWeightKg || null,
                    fitnessLevel || 'beginner', primaryGoal || 'general_fitness',
                    sportHistory || null, occupationType || null,
                    dailyStepsAvg || null,
                    jointPainAreas ? JSON.stringify(jointPainAreas) : null,
                    secondaryGoals ? JSON.stringify(secondaryGoals) : null,
                    medicalNotes || null,
                    dietaryRestrictions ? JSON.stringify(dietaryRestrictions) : null,
                    emergencyContactName || null, emergencyContactPhone || null,
                    notes || null, trainingLocation || 'hybrid',
                    assignedTo || createdBy,
                    previousDiets || null, foodAllergies || null,
                    currentDietPhase || 'free',
                    baselineStressLevel || null, mealsPerDayHabit || null
                ]
            );

            return { clientId: clientResult.insertId, userId };
        });
    }

    /**
     * Aggiorna cliente
     */
    async update(id, tenantId, clientData) {
        // Verifica esistenza e snapshot fase dieta prima dell'update
        const previous = await this.getById(id, tenantId);
        const oldDietPhase = previous.current_diet_phase;

        const {
            firstName, lastName, email, phone, dateOfBirth, gender,
            heightCm, currentWeightKg, fitnessLevel, primaryGoal,
            secondaryGoals, medicalNotes, dietaryRestrictions,
            emergencyContactName, emergencyContactPhone, notes,
            trainingLocation, assignedTo, status,
            sportHistory, occupationType, dailyStepsAvg, jointPainAreas,
            previousDiets, foodAllergies, currentDietPhase,
            baselineStressLevel, mealsPerDayHabit
        } = clientData;

        await query(
            `UPDATE clients SET
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                date_of_birth = COALESCE(?, date_of_birth),
                gender = COALESCE(?, gender),
                height_cm = COALESCE(?, height_cm),
                current_weight_kg = COALESCE(?, current_weight_kg),
                fitness_level = COALESCE(?, fitness_level),
                primary_goal = COALESCE(?, primary_goal),
                sport_history = COALESCE(?, sport_history),
                occupation_type = COALESCE(?, occupation_type),
                daily_steps_avg = COALESCE(?, daily_steps_avg),
                joint_pain_areas = COALESCE(?, joint_pain_areas),
                secondary_goals = COALESCE(?, secondary_goals),
                medical_notes = COALESCE(?, medical_notes),
                dietary_restrictions = COALESCE(?, dietary_restrictions),
                emergency_contact_name = COALESCE(?, emergency_contact_name),
                emergency_contact_phone = COALESCE(?, emergency_contact_phone),
                notes = COALESCE(?, notes),
                training_location = COALESCE(?, training_location),
                assigned_to = COALESCE(?, assigned_to),
                previous_diets = COALESCE(?, previous_diets),
                food_allergies = COALESCE(?, food_allergies),
                current_diet_phase = COALESCE(?, current_diet_phase),
                baseline_stress_level = COALESCE(?, baseline_stress_level),
                meals_per_day_habit = COALESCE(?, meals_per_day_habit),
                status = COALESCE(?, status),
                updated_at = NOW()
             WHERE id = ? AND tenant_id = ?`,
            [
                firstName, lastName, email, phone, dateOfBirth, gender,
                heightCm, currentWeightKg, fitnessLevel, primaryGoal,
                sportHistory, occupationType, dailyStepsAvg,
                jointPainAreas ? JSON.stringify(jointPainAreas) : null,
                secondaryGoals ? JSON.stringify(secondaryGoals) : null,
                medicalNotes,
                dietaryRestrictions ? JSON.stringify(dietaryRestrictions) : null,
                emergencyContactName, emergencyContactPhone, notes,
                trainingLocation, assignedTo,
                previousDiets, foodAllergies, currentDietPhase,
                baselineStressLevel, mealsPerDayHabit,
                status, id, tenantId
            ]
        );

        if (currentDietPhase && currentDietPhase !== oldDietPhase) {
            try {
                const alertService = require('./alert.service');
                await alertService.onDietPhaseChanged(id, tenantId, currentDietPhase, oldDietPhase);
            } catch (err) {
                // Best-effort: non fa fallire l'update se l'alert va in errore
            }
        }

        return this.getById(id, tenantId);
    }

    /**
     * Elimina cliente (soft delete - cambia status)
     */
    async delete(id, tenantId) {
        await this.getById(id, tenantId);

        await query(
            'UPDATE clients SET status = "cancelled", updated_at = NOW() WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );

        return { success: true };
    }

    /**
     * Aggiungi obiettivo cliente
     */
    async addGoal(clientId, tenantId, goalData) {
        await this.assertOwnership(clientId, tenantId);

        const { goalType, targetValue, currentValue, unit, deadline, priority, notes } = goalData;

        const result = await query(
            `INSERT INTO client_goals (tenant_id, client_id, goal_type, target_value, current_value, unit, deadline, priority, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, clientId, goalType, targetValue, currentValue || 0, unit, deadline || null, priority || 1, notes || null]
        );

        return { id: result.insertId };
    }

    /**
     * Aggiungi infortunio
     */
    async addInjury(clientId, tenantId, injuryData) {
        await this.assertOwnership(clientId, tenantId);

        const { bodyPart, description, severity, injuryDate, restrictions, notes } = injuryData;

        const result = await query(
            `INSERT INTO injuries (tenant_id, client_id, body_part, description, severity, injury_date, restrictions, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, clientId, bodyPart, description || null, severity || 'mild',
             injuryDate || null, restrictions ? JSON.stringify(restrictions) : null, notes || null]
        );

        return { id: result.insertId };
    }

    /**
     * Rimuovi infortunio (hard delete)
     */
    async deleteInjury(injuryId, tenantId) {
        const result = await query(
            'DELETE FROM injuries WHERE id = ? AND tenant_id = ?',
            [injuryId, tenantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Aggiorna stato infortunio (active/recovering/recovered)
     */
    async updateInjuryStatus(injuryId, tenantId, status) {
        const result = await query(
            'UPDATE injuries SET status = ? WHERE id = ? AND tenant_id = ?',
            [status, injuryId, tenantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Aggiorna XP e livello
     */
    async addXP(clientId, tenantId, points, transactionType, description) {
        await transaction(async (connection) => {
            // Aggiungi XP
            await connection.execute(
                'UPDATE clients SET xp_points = xp_points + ? WHERE id = ? AND tenant_id = ?',
                [points, clientId, tenantId]
            );

            // Calcola nuovo livello (ogni 1000 XP = 1 livello)
            const [client] = await connection.execute(
                'SELECT xp_points FROM clients WHERE id = ?',
                [clientId]
            );
            const newLevel = Math.floor(client[0].xp_points / 1000) + 1;

            await connection.execute(
                'UPDATE clients SET level = ? WHERE id = ?',
                [newLevel, clientId]
            );

            // Log transazione
            await connection.execute(
                `INSERT INTO points_transactions (tenant_id, client_id, points, transaction_type, description)
                 VALUES (?, ?, ?, ?, ?)`,
                [tenantId, clientId, points, transactionType, description]
            );
        });

        return this.getById(clientId, tenantId);
    }

    /**
     * Aggiorna streak
     */
    async updateStreak(clientId, tenantId) {
        // Verifica se ha fatto workout oggi o ieri
        const [lastWorkout] = await query(
            `SELECT last_workout_at, streak_days FROM clients WHERE id = ? AND tenant_id = ?`,
            [clientId, tenantId]
        );

        if (!lastWorkout) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastDate = lastWorkout.last_workout_at ? new Date(lastWorkout.last_workout_at) : null;
        if (lastDate) lastDate.setHours(0, 0, 0, 0);

        let newStreak = lastWorkout.streak_days;

        if (!lastDate || lastDate < yesterday) {
            // Streak perso
            newStreak = 1;
        } else if (lastDate.getTime() === yesterday.getTime()) {
            // Continua streak
            newStreak++;
        }
        // Se stesso giorno, streak resta uguale

        await query(
            'UPDATE clients SET streak_days = ?, last_workout_at = NOW() WHERE id = ? AND tenant_id = ?',
            [newStreak, clientId, tenantId]
        );

        // Bonus XP per streak
        if (newStreak > 0 && newStreak % 7 === 0) {
            await this.addXP(clientId, tenantId, 100, 'streak', `Streak di ${newStreak} giorni!`);
        }

        return newStreak;
    }

    /**
     * Sommario programmi per tutti i clienti del tenant (lookup O(1) per client_id)
     */
    async getProgramSummaries(tenantId) {
        const rows = await query(`
            SELECT
                cp.client_id,
                COUNT(*) as program_count,
                MAX(CASE WHEN cp.status = 'active' THEN cp.name END) as active_program_name,
                MAX(CASE WHEN cp.status = 'active' THEN cp.weeks END) as active_program_weeks,
                MAX(CASE WHEN cp.status = 'active' THEN cp.start_date END) as active_program_start,
                MAX(CASE WHEN cp.status = 'active' THEN cp.end_date END) as active_program_end,
                CASE
                    WHEN SUM(cp.status = 'active') > 0 THEN 'has_active'
                    WHEN SUM(cp.status = 'draft') > 0 THEN 'has_draft'
                    ELSE 'none'
                END as program_badge
            FROM client_programs cp
            WHERE cp.tenant_id = ?
            GROUP BY cp.client_id
        `, [tenantId]);

        const summaries = {};
        for (const row of rows) {
            summaries[row.client_id] = row;
        }
        return summaries;
    }

    /**
     * Statistiche cliente
     */
    async getStats(clientId, tenantId) {
        await this.assertOwnership(clientId, tenantId);

        // Workout completati
        const [workoutStats] = await query(
            `SELECT
                COUNT(*) as total_workouts,
                SUM(duration_minutes) as total_minutes,
                AVG(duration_minutes) as avg_duration
             FROM workout_sessions
             WHERE client_id = ? AND status = 'completed'`,
            [clientId]
        );

        // Ultima settimana
        const [weekStats] = await query(
            `SELECT COUNT(*) as workouts_this_week
             FROM workout_sessions
             WHERE client_id = ? AND status = 'completed'
               AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            [clientId]
        );

        // Progressi peso
        const weightHistory = await query(
            `SELECT measurement_date, weight_kg
             FROM body_measurements
             WHERE client_id = ?
             ORDER BY measurement_date DESC
             LIMIT 10`,
            [clientId]
        );

        return {
            totalWorkouts: workoutStats.total_workouts || 0,
            totalMinutes: workoutStats.total_minutes || 0,
            avgDuration: Math.round(workoutStats.avg_duration || 0),
            workoutsThisWeek: weekStats.workouts_this_week || 0,
            weightHistory
        };
    }

    async getAIContext(clientId, tenantId, { includeInjuries = false, includeLifetime = false } = {}) {
        const baseSelect = includeLifetime
            ? `SELECT c.first_name, c.fitness_level, c.primary_goal, c.joint_pain_areas,
                      c.last_workout_at,
                      lt.lifetime_months, lt.days_since_last_end
               FROM clients c
               LEFT JOIN (
                   SELECT client_id,
                          ROUND(SUM(DATEDIFF(end_date, start_date) / 30.44), 1) AS lifetime_months,
                          DATEDIFF(CURDATE(), MAX(end_date)) AS days_since_last_end
                   FROM client_subscriptions
                   WHERE tenant_id = ?
                   GROUP BY client_id
               ) lt ON c.id = lt.client_id
               WHERE c.id = ? AND c.tenant_id = ?`
            : `SELECT c.first_name, c.fitness_level, c.primary_goal, c.joint_pain_areas,
                      c.last_workout_at
               FROM clients c
               WHERE c.id = ? AND c.tenant_id = ?`;

        const params = includeLifetime
            ? [tenantId, clientId, tenantId]
            : [clientId, tenantId];

        const [rows, injuries] = await Promise.all([
            query(baseSelect, params),
            includeInjuries
                ? query(
                    `SELECT body_part, severity FROM injuries
                     WHERE client_id = ? AND tenant_id = ? AND status != 'recovered'`,
                    [clientId, tenantId]
                  )
                : Promise.resolve(null)
        ]);

        const client = rows[0];
        if (!client) return null;

        let parsedPainAreas = [];
        try {
            parsedPainAreas = typeof client.joint_pain_areas === 'string'
                ? JSON.parse(client.joint_pain_areas)
                : (client.joint_pain_areas || []);
        } catch { parsedPainAreas = []; }

        const result = {
            firstName: client.first_name,
            fitnessLevel: client.fitness_level,
            primaryGoal: client.primary_goal,
            lastWorkoutAt: client.last_workout_at,
            jointPainAreas: parsedPainAreas
        };

        if (includeLifetime) {
            result.lifetimeMonths = client.lifetime_months;
            result.daysSinceLastSubEnd = client.days_since_last_end;
        }

        if (injuries !== null) {
            result.injuries = injuries;
        }

        return result;
    }
}

module.exports = new ClientService();
