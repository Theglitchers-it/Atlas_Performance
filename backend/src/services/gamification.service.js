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
        const { category, rarity, unlockedOnly } = options;
        let sql = `SELECT a.*, ua.unlocked_at, ua.progress_value,
                          CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as unlocked
                   FROM achievements a
                   LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
                   WHERE (a.tenant_id IS NULL OR a.tenant_id = ?) AND a.is_active = 1`;
        const params = [userId, tenantId];

        if (category) { sql += ' AND a.category = ?'; params.push(category); }
        if (rarity) { sql += ' AND a.rarity = ?'; params.push(rarity); }
        if (unlockedOnly) { sql += ' AND ua.id IS NOT NULL'; }

        sql += ' ORDER BY a.category, a.rarity DESC, a.requirement_value ASC';
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

        let countSql = 'SELECT COUNT(*) as total FROM challenges WHERE tenant_id = ?';
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
        const { name, description, challengeType, targetValue, startDate, endDate, xpReward } = data;
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
        const { limit = 20, page = 1 } = options;
        const offset = (page - 1) * limit;

        const [countResult] = await query(
            'SELECT COUNT(*) as total FROM clients WHERE tenant_id = ? AND status = \'active\'',
            [tenantId]
        );

        const rows = await query(
            `SELECT c.id, c.first_name, c.last_name, c.xp_points, c.level, c.streak_days,
                    u.email,
                    (SELECT COUNT(*) FROM user_achievements WHERE user_id = c.user_id) as achievements_count
             FROM clients c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.tenant_id = ? AND c.status = 'active'
             ORDER BY c.xp_points DESC, c.level DESC
             LIMIT ? OFFSET ?`,
            [tenantId, limit, offset]
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

    // === HELPER PRIVATI ===

    async _getUserIdForClient(clientId) {
        const [row] = await query('SELECT user_id FROM clients WHERE id = ?', [clientId]);
        return row?.user_id || null;
    }
}

module.exports = new GamificationService();
