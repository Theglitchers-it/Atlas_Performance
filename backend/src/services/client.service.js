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
        const { status, fitnessLevel, assignedTo, search, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
                   c.date_of_birth, c.gender, c.fitness_level, c.primary_goal,
                   c.current_weight_kg, c.height_cm, c.status, c.xp_points,
                   c.level, c.streak_days, c.last_workout_at, c.created_at,
                   u.first_name as assigned_first_name, u.last_name as assigned_last_name
            FROM clients c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.tenant_id = ?
        `;
        const params = [tenantId];

        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }

        if (fitnessLevel) {
            sql += ' AND c.fitness_level = ?';
            params.push(fitnessLevel);
        }

        if (assignedTo) {
            sql += ' AND c.assigned_to = ?';
            params.push(assignedTo);
        }

        if (search) {
            sql += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Count totale
        const countSql = sql.replace(/SELECT.*FROM/s, 'SELECT COUNT(*) as total FROM');
        const countResult = await query(countSql, params);
        const total = countResult[0]?.total || 0;

        // Aggiungi paginazione
        sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const clients = await query(sql, params);

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

        // Ottieni obiettivi attivi
        const goals = await query(
            `SELECT * FROM client_goals
             WHERE client_id = ? AND status = 'active'
             ORDER BY priority ASC`,
            [id]
        );

        // Ottieni infortuni attivi
        const injuries = await query(
            `SELECT * FROM injuries
             WHERE client_id = ? AND status != 'recovered'
             ORDER BY injury_date DESC`,
            [id]
        );

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
            trainingLocation, assignedTo, createAccount, password
        } = clientData;

        // Verifica limite clienti
        const [tenantData] = await query(
            'SELECT max_clients FROM tenants WHERE id = ?',
            [tenantId]
        );

        const [clientCount] = await query(
            'SELECT COUNT(*) as count FROM clients WHERE tenant_id = ? AND status = "active"',
            [tenantId]
        );

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
                    fitness_level, primary_goal, secondary_goals, medical_notes,
                    dietary_restrictions, emergency_contact_name, emergency_contact_phone,
                    notes, training_location, assigned_to, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                [
                    tenantId, userId, firstName, lastName, email || null, phone || null,
                    dateOfBirth || null, gender || null, heightCm || null,
                    initialWeightKg || null, initialWeightKg || null,
                    fitnessLevel || 'beginner', primaryGoal || 'general_fitness',
                    secondaryGoals ? JSON.stringify(secondaryGoals) : null,
                    medicalNotes || null,
                    dietaryRestrictions ? JSON.stringify(dietaryRestrictions) : null,
                    emergencyContactName || null, emergencyContactPhone || null,
                    notes || null, trainingLocation || 'hybrid',
                    assignedTo || createdBy
                ]
            );

            return { clientId: clientResult.insertId, userId };
        });
    }

    /**
     * Aggiorna cliente
     */
    async update(id, tenantId, clientData) {
        // Verifica esistenza
        await this.getById(id, tenantId);

        const {
            firstName, lastName, email, phone, dateOfBirth, gender,
            heightCm, currentWeightKg, fitnessLevel, primaryGoal,
            secondaryGoals, medicalNotes, dietaryRestrictions,
            emergencyContactName, emergencyContactPhone, notes,
            trainingLocation, assignedTo, status
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
                secondary_goals = COALESCE(?, secondary_goals),
                medical_notes = COALESCE(?, medical_notes),
                dietary_restrictions = COALESCE(?, dietary_restrictions),
                emergency_contact_name = COALESCE(?, emergency_contact_name),
                emergency_contact_phone = COALESCE(?, emergency_contact_phone),
                notes = COALESCE(?, notes),
                training_location = COALESCE(?, training_location),
                assigned_to = COALESCE(?, assigned_to),
                status = COALESCE(?, status),
                updated_at = NOW()
             WHERE id = ? AND tenant_id = ?`,
            [
                firstName, lastName, email, phone, dateOfBirth, gender,
                heightCm, currentWeightKg, fitnessLevel, primaryGoal,
                secondaryGoals ? JSON.stringify(secondaryGoals) : null,
                medicalNotes,
                dietaryRestrictions ? JSON.stringify(dietaryRestrictions) : null,
                emergencyContactName, emergencyContactPhone, notes,
                trainingLocation, assignedTo, status, id, tenantId
            ]
        );

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
        const { goalType, targetValue, currentValue, unit, deadline, priority, notes } = goalData;

        const [result] = await query(
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
        const { bodyPart, description, severity, injuryDate, restrictions, notes } = injuryData;

        const [result] = await query(
            `INSERT INTO injuries (tenant_id, client_id, body_part, description, severity, injury_date, restrictions, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, clientId, bodyPart, description || null, severity || 'mild',
             injuryDate || null, restrictions ? JSON.stringify(restrictions) : null, notes || null]
        );

        return { id: result.insertId };
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
     * Statistiche cliente
     */
    async getStats(clientId, tenantId) {
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
}

module.exports = new ClientService();
