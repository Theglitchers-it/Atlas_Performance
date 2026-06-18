/**
 * Gamification Service
 * Gestione achievements, XP, livelli, sfide e classifiche
 */

const { query } = require('../config/database');

class GamificationService {

    // === HELPER ===

    getLevelForXP(xp) {
        return Math.floor((xp || 0) / 100) + 1;
    }

    getXPForLevel(level) {
        return (level - 1) * 100;
    }

    getXPProgress(xp) {
        const currentLevel = this.getLevelForXP(xp);
        const xpForCurrent = this.getXPForLevel(currentLevel);
        const xpForNext = this.getXPForLevel(currentLevel + 1);
        const xpInLevel = (xp || 0) - xpForCurrent;
        const xpNeeded = xpForNext - xpForCurrent;
        return {
            currentLevel,
            xpInLevel,
            xpNeeded,
            progressPct: xpNeeded > 0 ? Math.round((xpInLevel / xpNeeded) * 100) : 0
        };
    }

    // === DASHBOARD ===

    async getDashboard(tenantId, clientId) {
        const clientRows = await query(
            'SELECT xp_points, level, streak_days FROM clients WHERE id = ? AND tenant_id = ?',
            [clientId, tenantId]
        );
        const client = clientRows[0];
        if (!client) return null;

        const userId = await this._getUserIdForClient(clientId);

        const [achievementRows] = await query(
            'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?',
            [userId]
        );

        const [titleRows] = await query(
            'SELECT COUNT(*) as count FROM client_titles WHERE client_id = ? AND tenant_id = ?',
            [clientId, tenantId]
        );

        const [challengeRows] = await query(
            `SELECT COUNT(*) as count FROM challenge_participants cp
             JOIN challenges c ON cp.challenge_id = c.id
             WHERE cp.client_id = ? AND cp.status = 'active' AND c.is_active = 1
             AND c.start_date <= CURDATE() AND c.end_date >= CURDATE()`,
            [clientId]
        );

        const progress = this.getXPProgress(client.xp_points);

        return {
            xp: client.xp_points || 0,
            level: client.level || 1,
            streak: client.streak_days || 0,
            xpInLevel: progress.xpInLevel,
            xpNeeded: progress.xpNeeded,
            xpProgress: progress.progressPct,
            achievementsUnlocked: achievementRows?.count || 0,
            titlesUnlocked: titleRows?.count || 0,
            activeChallenges: challengeRows?.count || 0
        };
    }

    // === ACHIEVEMENTS ===

    async getRecentAchievements(tenantId, userId, limit = 5) {
        const rows = await query(
            `SELECT a.id, a.name, a.description, a.icon_url, a.category, a.rarity,
                    a.xp_reward, ua.unlocked_at, ua.is_notified
             FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.id
             WHERE ua.user_id = ? AND (a.tenant_id IS NULL OR a.tenant_id = ?)
             ORDER BY ua.unlocked_at DESC
             LIMIT ?`,
            [userId, tenantId, limit]
        );
        return rows;
    }

    async getAchievementsByCategory(tenantId, userId) {
        const rows = await query(
            `SELECT a.*, ua.unlocked_at, ua.progress_value,
                    CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as unlocked
             FROM achievements a
             LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
             WHERE (a.tenant_id IS NULL OR a.tenant_id = ?) AND a.is_active = 1
             ORDER BY a.category, a.requirement_value ASC`,
            [userId, tenantId]
        );

        const grouped = {};
        for (const row of rows) {
            if (!grouped[row.category]) {
                grouped[row.category] = { category: row.category, achievements: [], total: 0, unlocked: 0 };
            }
            grouped[row.category].achievements.push(row);
            grouped[row.category].total++;
            if (row.unlocked) grouped[row.category].unlocked++;
        }
        return Object.values(grouped);
    }

    async getAllAchievements(tenantId, userId, options = {}) {
        const { category, rarity, unlockedOnly, sort } = options;
        let sql = `SELECT a.*, ua.unlocked_at, ua.progress_value,
                          CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
                          ROUND(COALESCE(ua.progress_value, 0) / NULLIF(a.requirement_value, 0) * 100, 1) AS progress_pct
                   FROM achievements a
                   LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
                   WHERE (a.tenant_id IS NULL OR a.tenant_id = ?) AND a.is_active = 1`;
        const params = [userId, tenantId];

        if (category) { sql += ' AND a.category = ?'; params.push(category); }
        if (rarity) { sql += ' AND a.rarity = ?'; params.push(rarity); }
        if (unlockedOnly) { sql += ' AND ua.id IS NOT NULL'; }

        const rarityOrder = "FIELD(a.rarity,'legendary','epic','rare','uncommon','common')";
        switch (sort) {
            case 'recent':
                sql += ' ORDER BY ua.unlocked_at IS NULL ASC, ua.unlocked_at DESC, a.requirement_value ASC';
                break;
            case 'progress':
                sql += ' ORDER BY unlocked ASC, progress_pct DESC, a.requirement_value ASC';
                break;
            case 'rarity_desc':
                sql += ` ORDER BY ${rarityOrder}, a.category, a.requirement_value ASC`;
                break;
            default:
                sql += ' ORDER BY a.category, a.rarity DESC, a.requirement_value ASC';
        }
        return await query(sql, params);
    }

    // === XP ===

    async getRecentXPActivity(tenantId, clientId, limit = 10) {
        const rows = await query(
            `SELECT id, points, transaction_type, reference_type, reference_id, description, created_at
             FROM points_transactions
             WHERE tenant_id = ? AND client_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [tenantId, clientId, limit]
        );
        return rows;
    }

    async getXPHistory(tenantId, clientId, options = {}) {
        const { limit = 20, page = 1, type } = options;
        const offset = (page - 1) * limit;

        let countSql = 'SELECT COUNT(*) as total FROM points_transactions WHERE tenant_id = ? AND client_id = ?';
        let dataSql = `SELECT id, points, transaction_type, reference_type, reference_id, description, created_at
                       FROM points_transactions WHERE tenant_id = ? AND client_id = ?`;
        const countParams = [tenantId, clientId];
        const dataParams = [tenantId, clientId];

        if (type) {
            countSql += ' AND transaction_type = ?';
            dataSql += ' AND transaction_type = ?';
            countParams.push(type);
            dataParams.push(type);
        }

        dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        dataParams.push(limit, offset);

        const [countResult] = await query(countSql, countParams);
        const rows = await query(dataSql, dataParams);

        return {
            transactions: rows,
            pagination: {
                page, limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    async addXP(tenantId, clientId, points, transactionType, referenceType = null, referenceId = null, description = '') {
        await query(
            `INSERT INTO points_transactions (tenant_id, client_id, points, transaction_type, reference_type, reference_id, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, clientId, points, transactionType, referenceType, referenceId, description]
        );

        await query(
            'UPDATE clients SET xp_points = xp_points + ? WHERE id = ? AND tenant_id = ?',
            [points, clientId, tenantId]
        );

        const [updated] = await query('SELECT xp_points FROM clients WHERE id = ?', [clientId]);
        const newXP = updated.xp_points;
        const newLevel = this.getLevelForXP(newXP);

        await query('UPDATE clients SET level = ? WHERE id = ?', [newLevel, clientId]);

        return { xp: newXP, level: newLevel };
    }

    // === CHALLENGES ===

    async getActiveChallengesPreview(tenantId, clientId, limit = 3) {
        const rows = await query(
            `SELECT c.id, c.name, c.description, c.challenge_type, c.target_value,
                    c.start_date, c.end_date, c.xp_reward,
                    cp.current_value, cp.status as participant_status,
                    ROUND((cp.current_value / c.target_value) * 100) as progress_pct,
                    DATEDIFF(c.end_date, CURDATE()) as days_remaining
             FROM challenges c
             JOIN challenge_participants cp ON c.id = cp.challenge_id
             WHERE c.tenant_id = ? AND cp.client_id = ? AND cp.status = 'active'
             AND c.is_active = 1 AND c.end_date >= CURDATE()
             ORDER BY c.end_date ASC
             LIMIT ?`,
            [tenantId, clientId, limit]
        );
        return rows;
    }

    async getChallenges(tenantId, options = {}) {
        const { status, clientId, limit = 20, page = 1 } = options;
        const offset = (page - 1) * limit;

        let countSql = 'SELECT COUNT(*) as total FROM challenges c WHERE c.tenant_id = ?';
        let dataSql = `SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name,
                              (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participants_count`;
        const countParams = [tenantId];
        const dataParams = [];

        if (clientId) {
            dataSql += `, cp.current_value, cp.status as participant_status, cp.joined_at`;
        }

        dataSql += ` FROM challenges c
                     LEFT JOIN users u ON c.created_by = u.id`;

        if (clientId) {
            dataSql += ` LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id AND cp.client_id = ?`;
            dataParams.push(clientId);
        }

        dataSql += ' WHERE c.tenant_id = ?';
        dataParams.push(tenantId);

        if (status === 'active') {
            const dateFilter = ' AND c.is_active = 1 AND c.start_date <= CURDATE() AND c.end_date >= CURDATE()';
            countSql += dateFilter;
            dataSql += dateFilter;
        } else if (status === 'upcoming') {
            const dateFilter = ' AND c.is_active = 1 AND c.start_date > CURDATE()';
            countSql += dateFilter;
            dataSql += dateFilter;
        } else if (status === 'past') {
            const dateFilter = ' AND c.end_date < CURDATE()';
            countSql += dateFilter;
            dataSql += dateFilter;
        }

        dataSql += ' ORDER BY c.start_date DESC LIMIT ? OFFSET ?';
        dataParams.push(limit, offset);

        const [countResult] = await query(countSql, countParams);
        const rows = await query(dataSql, dataParams);

        return {
            challenges: rows,
            pagination: {
                page, limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    async getChallengeById(challengeId, tenantId, clientId = null) {
        const [challenge] = await query(
            `SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
             FROM challenges c
             LEFT JOIN users u ON c.created_by = u.id
             WHERE c.id = ? AND c.tenant_id = ?`,
            [challengeId, tenantId]
        );
        if (!challenge) return null;

        const participants = await query(
            `SELECT cp.*, cl.first_name, cl.last_name, cl.xp_points, cl.level
             FROM challenge_participants cp
             JOIN clients cl ON cp.client_id = cl.id
             WHERE cp.challenge_id = ?
             ORDER BY cp.current_value DESC`,
            [challengeId]
        );

        challenge.participants = participants;

        if (clientId) {
            challenge.userParticipation = participants.find(p => p.client_id === parseInt(clientId)) || null;
        }

        return challenge;
    }

    async createChallenge(tenantId, createdBy, data) {
        // Il middleware Joi (stripUnknown:true) usa il campo `type` → mappiamo a challenge_type del DB.
        const { name, description, type: challengeType, targetValue, startDate, endDate, xpReward } = data;
        const result = await query(
            `INSERT INTO challenges (tenant_id, name, description, challenge_type, target_value, start_date, end_date, xp_reward, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, name, description, challengeType, targetValue, startDate, endDate, xpReward || 0, createdBy]
        );
        return result.insertId;
    }

    async joinChallenge(challengeId, clientId) {
        await query(
            `INSERT INTO challenge_participants (challenge_id, client_id, status) VALUES (?, ?, 'active')`,
            [challengeId, clientId]
        );
    }

    async withdrawFromChallenge(challengeId, clientId) {
        await query(
            `UPDATE challenge_participants SET status = 'withdrawn' WHERE challenge_id = ? AND client_id = ?`,
            [challengeId, clientId]
        );
    }

    // === LEADERBOARD ===

    async getLeaderboard(tenantId, options = {}) {
        const { limit = 20, page = 1, locationId = null } = options;
        const offset = (page - 1) * limit;

        // Filtro opzionale per sede preferita: ranking ristretto agli atleti che hanno
        // scelto quella sede come preferred_location_id.
        let where = "WHERE c.tenant_id = ? AND c.status = 'active'";
        const baseParams = [tenantId];
        if (locationId !== null && locationId !== undefined && locationId !== '') {
            where += ' AND c.preferred_location_id = ?';
            baseParams.push(Number(locationId));
        }

        const [countResult] = await query(
            `SELECT COUNT(*) as total FROM clients c ${where}`,
            baseParams
        );

        const rows = await query(
            `SELECT c.id, c.first_name, c.last_name, c.xp_points, c.level, c.streak_days,
                    c.preferred_location_id,
                    u.email,
                    l.name AS preferred_location_name,
                    (SELECT COUNT(*) FROM user_achievements WHERE user_id = c.user_id) as achievements_count
             FROM clients c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN locations l ON c.preferred_location_id = l.id
             ${where}
             ORDER BY c.xp_points DESC, c.level DESC
             LIMIT ? OFFSET ?`,
            [...baseParams, limit, offset]
        );

        // Aggiungi rank
        const ranked = rows.map((row, i) => ({ ...row, rank: offset + i + 1 }));

        return {
            leaderboard: ranked,
            pagination: {
                page, limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    // === XP SPARKLINE / HEATMAP / NEXT ACHIEVEMENT / RANKING / WEEKLY / GOALS ===

    /**
     * Sparkline XP giornaliero: somma points raggruppata per data, ultimi N giorni.
     * Restituisce array contiguo: ogni giorno presente anche se 0 XP.
     */
    async getXPSparkline(tenantId, clientId, days = 30) {
        const rows = await query(
            `SELECT DATE(created_at) AS day, COALESCE(SUM(points), 0) AS xp
             FROM points_transactions
             WHERE tenant_id = ? AND client_id = ?
               AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY day ASC`,
            [tenantId, clientId, days]
        );
        const map = new Map(rows.map(r => [String(r.day).slice(0, 10), Number(r.xp)]));
        const out = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            out.push({ date: key, xp: map.get(key) || 0 });
        }
        return out;
    }

    /**
     * Heatmap stile GitHub: per ogni giorno dell'anno, intensita 0-4
     * basata su workout_sessions completati + gym_checkins.
     */
    async getStreakHeatmap(tenantId, clientId, year) {
        const y = year || new Date().getFullYear();
        const start = `${y}-01-01`;
        const end = `${y}-12-31`;
        const rows = await query(
            `SELECT day, SUM(activities) AS activities FROM (
               SELECT DATE(started_at) AS day, COUNT(*) AS activities
               FROM workout_sessions
               WHERE tenant_id = ? AND client_id = ?
                 AND status IN ('completed','in_progress')
                 AND started_at BETWEEN ? AND ?
               GROUP BY DATE(started_at)
               UNION ALL
               SELECT DATE(check_in_at) AS day, COUNT(*) AS activities
               FROM gym_checkins
               WHERE tenant_id = ? AND client_id = ?
                 AND check_in_at BETWEEN ? AND ?
               GROUP BY DATE(check_in_at)
             ) t GROUP BY day ORDER BY day ASC`,
            [tenantId, clientId, start, end + ' 23:59:59',
             tenantId, clientId, start, end + ' 23:59:59']
        );
        return rows.map(r => ({
            date: String(r.day).slice(0, 10),
            activities: Number(r.activities),
            intensity: Math.min(4, Number(r.activities))
        }));
    }

    /**
     * "Prossimo achievement": achievement non sbloccato con la % di progresso piu alta.
     */
    async getNextAchievement(tenantId, userId) {
        const rows = await query(
            `SELECT a.id, a.name, a.description, a.icon_url, a.category, a.rarity,
                    a.xp_reward, a.requirement_type, a.requirement_value,
                    COALESCE(ua.progress_value, 0) AS progress_value,
                    ROUND(COALESCE(ua.progress_value, 0) / NULLIF(a.requirement_value, 0) * 100, 1) AS progress_pct
             FROM achievements a
             LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
             WHERE (a.tenant_id IS NULL OR a.tenant_id = ?)
               AND a.is_active = 1
               AND (ua.unlocked_at IS NULL)
               AND a.requirement_value > 0
             ORDER BY progress_pct DESC, a.requirement_value ASC
             LIMIT 1`,
            [userId, tenantId]
        );
        if (!rows.length) return null;
        const a = rows[0];
        return {
            ...a,
            progress_pct: Math.min(100, Number(a.progress_pct) || 0),
            xp_remaining: Math.max(0, (a.requirement_value || 0) - (a.progress_value || 0))
        };
    }

    /**
     * Ranking: posizione user nel tenant per XP.
     */
    async getRanking(tenantId, clientId) {
        const [me] = await query(
            'SELECT xp_points FROM clients WHERE id = ? AND tenant_id = ?',
            [clientId, tenantId]
        );
        if (!me) return null;
        const myXP = me.xp_points || 0;

        const [totalRows, aboveRows, nextUserRows] = await Promise.all([
            query(
                `SELECT COUNT(*) AS total FROM clients
                 WHERE tenant_id = ? AND status = 'active'`,
                [tenantId]
            ),
            query(
                `SELECT COUNT(*) AS above FROM clients
                 WHERE tenant_id = ? AND status = 'active' AND xp_points > ?`,
                [tenantId, myXP]
            ),
            query(
                `SELECT first_name, last_name, xp_points FROM clients
                 WHERE tenant_id = ? AND status = 'active' AND xp_points > ?
                 ORDER BY xp_points ASC LIMIT 1`,
                [tenantId, myXP]
            )
        ]);

        const total = totalRows[0];
        const above = aboveRows[0];
        const nextUser = nextUserRows[0];

        const position = (Number(above?.above) || 0) + 1;
        const totalUsers = Number(total?.total) || 1;
        const percentile = Math.round(((totalUsers - position + 1) / totalUsers) * 100);

        return {
            position,
            total: totalUsers,
            percentile,
            xp: myXP,
            xp_to_next: nextUser ? Math.max(0, (nextUser.xp_points || 0) - myXP + 1) : 0,
            next_user_name: nextUser ? `${nextUser.first_name} ${nextUser.last_name || ''}`.trim() : null
        };
    }

    /**
     * Weekly recap: questa settimana vs settimana precedente.
     */
    async getWeeklyRecap(tenantId, clientId) {
        const weekStart = this._getMondayOfWeek(new Date());
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const fmt = d => d.toISOString().slice(0, 10);
        const ws = fmt(weekStart);
        const pws = fmt(prevWeekStart);

        // Esecuzione parallela delle 3 query
        const [thisWeekRows, lastWeekRows, streakRows] = await Promise.all([
            query(
                `SELECT
                   COALESCE((SELECT SUM(points) FROM points_transactions
                             WHERE tenant_id=? AND client_id=? AND DATE(created_at) >= ?), 0) AS xp,
                   (SELECT COUNT(*) FROM workout_sessions
                    WHERE tenant_id=? AND client_id=? AND status='completed' AND DATE(completed_at) >= ?) AS workouts,
                   (SELECT COUNT(*) FROM user_achievements ua
                    WHERE ua.user_id = (SELECT user_id FROM clients WHERE id=?)
                      AND DATE(ua.unlocked_at) >= ?) AS achievements`,
                [tenantId, clientId, ws,
                 tenantId, clientId, ws,
                 clientId, ws]
            ),
            query(
                `SELECT
                   COALESCE((SELECT SUM(points) FROM points_transactions
                             WHERE tenant_id=? AND client_id=?
                               AND DATE(created_at) >= ? AND DATE(created_at) < ?), 0) AS xp,
                   (SELECT COUNT(*) FROM workout_sessions
                    WHERE tenant_id=? AND client_id=? AND status='completed'
                      AND DATE(completed_at) >= ? AND DATE(completed_at) < ?) AS workouts,
                   (SELECT COUNT(*) FROM user_achievements ua
                    WHERE ua.user_id = (SELECT user_id FROM clients WHERE id=?)
                      AND DATE(ua.unlocked_at) >= ? AND DATE(ua.unlocked_at) < ?) AS achievements`,
                [tenantId, clientId, pws, ws,
                 tenantId, clientId, pws, ws,
                 clientId, pws, ws]
            ),
            query('SELECT streak_days FROM clients WHERE id=?', [clientId])
        ]);

        const thisWeek = thisWeekRows[0] || { xp: 0, workouts: 0, achievements: 0 };
        const lastWeek = lastWeekRows[0] || { xp: 0, workouts: 0, achievements: 0 };
        const streakRow = streakRows[0];

        const xpThis = Number(thisWeek.xp) || 0;
        const xpLast = Number(lastWeek.xp) || 0;

        return {
            week_start: ws,
            this_week: {
                xp: xpThis,
                workouts: Number(thisWeek.workouts) || 0,
                achievements: Number(thisWeek.achievements) || 0
            },
            last_week: {
                xp: xpLast,
                workouts: Number(lastWeek.workouts) || 0,
                achievements: Number(lastWeek.achievements) || 0
            },
            xp_delta_pct: xpLast > 0 ? Math.round(((xpThis - xpLast) / xpLast) * 100) : (xpThis > 0 ? 100 : 0),
            streak_current: streakRow?.streak_days || 0
        };
    }

    /**
     * Weekly goals: lista goal della settimana corrente con current_value calcolato runtime.
     */
    async getWeeklyGoals(tenantId, clientId) {
        const weekStart = this._getMondayOfWeek(new Date());
        const ws = weekStart.toISOString().slice(0, 10);

        const [goals, currentValues] = await Promise.all([
            query(
                `SELECT id, goal_type, target_value, status, week_start
                 FROM client_weekly_goals
                 WHERE tenant_id=? AND client_id=? AND week_start=?
                 ORDER BY goal_type`,
                [tenantId, clientId, ws]
            ),
            // Aggregati per tutti i tipi in una sola roundtrip
            query(
                `SELECT 'xp' AS goal_type, COALESCE(SUM(points), 0) AS v
                 FROM points_transactions
                 WHERE tenant_id=? AND client_id=? AND DATE(created_at) >= ?
                 UNION ALL
                 SELECT 'workouts' AS goal_type, COUNT(*) AS v
                 FROM workout_sessions
                 WHERE tenant_id=? AND client_id=? AND status='completed' AND DATE(completed_at) >= ?
                 UNION ALL
                 SELECT 'challenges' AS goal_type, COUNT(*) AS v
                 FROM challenge_participants
                 WHERE client_id=? AND status='completed' AND DATE(completed_at) >= ?
                 UNION ALL
                 SELECT 'streak' AS goal_type, COALESCE(streak_days, 0) AS v
                 FROM clients WHERE id=?`,
                [tenantId, clientId, ws,
                 tenantId, clientId, ws,
                 clientId, ws,
                 clientId]
            )
        ]);

        const currentMap = new Map(currentValues.map(r => [r.goal_type, Number(r.v) || 0]));

        const out = goals.map(g => {
            const current = currentMap.get(g.goal_type) || 0;
            return {
                ...g,
                current_value: current,
                progress_pct: g.target_value > 0 ? Math.min(100, Math.round((current / g.target_value) * 100)) : 0,
                achieved: current >= g.target_value
            };
        });

        return { week_start: ws, goals: out };
    }

    async upsertWeeklyGoal(tenantId, clientId, goalType, targetValue) {
        const weekStart = this._getMondayOfWeek(new Date()).toISOString().slice(0, 10);
        await query(
            `INSERT INTO client_weekly_goals (tenant_id, client_id, goal_type, target_value, week_start)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE target_value = VALUES(target_value), status = 'active'`,
            [tenantId, clientId, goalType, targetValue, weekStart]
        );
        return { week_start: weekStart, goal_type: goalType, target_value: targetValue };
    }

    async deleteWeeklyGoal(tenantId, clientId, goalId) {
        const result = await query(
            'DELETE FROM client_weekly_goals WHERE id=? AND tenant_id=? AND client_id=?',
            [goalId, tenantId, clientId]
        );
        return result.affectedRows > 0;
    }

    // === HELPER PRIVATI ===

    async _getUserIdForClient(clientId) {
        const [row] = await query('SELECT user_id FROM clients WHERE id = ?', [clientId]);
        return row?.user_id || null;
    }

    /**
     * Restituisce il lunedi della settimana corrente (giorno della settimana ISO).
     */
    _getMondayOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
}

module.exports = new GamificationService();
