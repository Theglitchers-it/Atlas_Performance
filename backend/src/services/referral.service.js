/**
 * Referral Service
 * Gestione programma referral e codici invito
 */

const crypto = require('crypto');
const { query } = require('../config/database');

class ReferralService {
    /**
     * Genera un nuovo codice referral
     */
    async generateCode(userId, tenantId, type = 'general', customCode = null, name = null) {
        // Validate type
        const validTypes = ['general', 'trainer', 'client', 'promotion'];
        if (!validTypes.includes(type)) {
            const error = new Error('Invalid referral code type');
            error.status = 400;
            throw error;
        }

        // Generate or validate custom code
        let code;
        if (customCode) {
            // Validate custom code format
            if (!/^[A-Z0-9]{6,12}$/.test(customCode)) {
                const error = new Error('Custom code must be 6-12 uppercase alphanumeric characters');
                error.status = 400;
                throw error;
            }
            code = customCode;
        } else {
            code = this._generateCode();
        }

        // Check if code already exists
        const existing = await query(
            'SELECT id FROM referral_codes WHERE code = ?',
            [code]
        );

        if (existing.length > 0) {
            const error = new Error('This referral code already exists. Please try a different code.');
            error.status = 409;
            throw error;
        }

        // Get user info for metadata
        const userRows = await query(
            'SELECT first_name, last_name, email, role FROM users WHERE id = ? AND tenant_id = ?',
            [userId, tenantId]
        );

        if (userRows.length === 0) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        const user = userRows[0];

        // Set rewards based on type
        const rewards = this._getRewardsByType(type);

        // Insert referral code
        const result = await query(
            `INSERT INTO referral_codes
            (code, user_id, tenant_id, type, referrer_reward, referee_reward, max_uses, status, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())`,
            [
                code,
                userId,
                tenantId,
                type,
                rewards.referrer,
                rewards.referee,
                type === 'promotion' ? 100 : null, // Promotion codes can have limited uses
                JSON.stringify({
                    name: name || null,
                    createdBy: `${user.first_name} ${user.last_name}`,
                    createdByEmail: user.email,
                    createdByRole: user.role
                })
            ]
        );

        return {
            id: result.insertId,
            code,
            name: name || null,
            type,
            referrerReward: rewards.referrer,
            refereeReward: rewards.referee,
            maxUses: type === 'promotion' ? 100 : null,
            usesCount: 0,
            status: 'active',
            createdAt: new Date()
        };
    }

    /**
     * Applica un codice referral durante la registrazione
     */
    async applyCode(code, referredUserId) {
        if (!code) {
            const error = new Error('Referral code is required');
            error.status = 400;
            throw error;
        }

        // Find the referral code
        const codeRows = await query(
            `SELECT rc.*, u.first_name, u.last_name, u.email
            FROM referral_codes rc
            JOIN users u ON rc.user_id = u.id
            WHERE rc.code = ? AND rc.status = 'active'`,
            [code.trim().toUpperCase()]
        );

        if (codeRows.length === 0) {
            const error = new Error('Invalid or inactive referral code');
            error.status = 404;
            throw error;
        }

        const referralCode = codeRows[0];

        // Check if code has expired
        if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
            await query(
                'UPDATE referral_codes SET status = "expired" WHERE id = ?',
                [referralCode.id]
            );

            const error = new Error('This referral code has expired');
            error.status = 400;
            throw error;
        }

        // Check max uses
        if (referralCode.max_uses) {
            const usageCount = await query(
                'SELECT COUNT(*) as count FROM referral_conversions WHERE referral_code_id = ?',
                [referralCode.id]
            );

            if (usageCount[0].count >= referralCode.max_uses) {
                const error = new Error('This referral code has reached its maximum number of uses');
                error.status = 400;
                throw error;
            }
        }

        // Prevent self-referral
        if (referralCode.user_id === referredUserId) {
            const error = new Error('You cannot use your own referral code');
            error.status = 400;
            throw error;
        }

        // Check if user has already used a referral code
        const existingConversion = await query(
            'SELECT id FROM referral_conversions WHERE referred_user_id = ?',
            [referredUserId]
        );

        if (existingConversion.length > 0) {
            const error = new Error('You have already used a referral code');
            error.status = 400;
            throw error;
        }

        // Get referred user info
        const referredUserRows = await query(
            'SELECT first_name, last_name, email, tenant_id FROM users WHERE id = ?',
            [referredUserId]
        );

        if (referredUserRows.length === 0) {
            const error = new Error('Referred user not found');
            error.status = 404;
            throw error;
        }

        const referredUser = referredUserRows[0];

        // Create conversion record
        const conversionResult = await query(
            `INSERT INTO referral_conversions
            (referral_code_id, referrer_user_id, referred_user_id, tenant_id, status, metadata, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
            [
                referralCode.id,
                referralCode.user_id,
                referredUserId,
                referredUser.tenant_id,
                JSON.stringify({
                    referredUserName: `${referredUser.first_name} ${referredUser.last_name}`,
                    referredUserEmail: referredUser.email,
                    referralCodeType: referralCode.type
                })
            ]
        );

        // Award initial rewards (can be marked as pending until certain conditions are met)
        await this._awardRewards(
            conversionResult.insertId,
            referralCode.user_id,
            referredUserId,
            referralCode.referrer_reward,
            referralCode.referee_reward
        );

        return {
            conversionId: conversionResult.insertId,
            code: referralCode.code,
            referrerName: `${referralCode.first_name} ${referralCode.last_name}`,
            refereeReward: referralCode.referee_reward,
            status: 'pending',
            message: 'Referral code applied successfully! Rewards will be credited once conditions are met.'
        };
    }

    /**
     * Ottieni statistiche referral per un utente
     */
    async getStats(userId) {
        // Count codes
        const codeCountRows = await query(
            'SELECT COUNT(*) as total_codes FROM referral_codes WHERE user_id = ?',
            [userId]
        );

        // Count conversions (may fail if table doesn't exist)
        let totalConversions = 0;
        let completedConversions = 0;
        let totalEarnings = 0;
        let recentConversions = [];

        try {
            const convRows = await query(
                `SELECT
                    COUNT(*) as total_conversions,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_conversions,
                    SUM(CASE WHEN status = 'completed' THEN referrer_reward_value ELSE 0 END) as total_earnings
                FROM referral_conversions
                WHERE referrer_user_id = ?`,
                [userId]
            );
            if (convRows[0]) {
                totalConversions = convRows[0].total_conversions || 0;
                completedConversions = convRows[0].completed_conversions || 0;
                totalEarnings = parseFloat(convRows[0].total_earnings || 0);
            }

            recentConversions = await query(
                `SELECT
                    rcv.id,
                    rcv.created_at,
                    rcv.status,
                    rcv.referrer_reward_value,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM referral_conversions rcv
                JOIN users u ON rcv.referred_user_id = u.id
                WHERE rcv.referrer_user_id = ?
                ORDER BY rcv.created_at DESC
                LIMIT 10`,
                [userId]
            );
        } catch (err) {
            console.error('getStats conversions query failed:', err.message);
        }

        return {
            totalCodes: codeCountRows[0]?.total_codes || 0,
            totalConversions,
            completedConversions,
            pendingConversions: totalConversions - completedConversions,
            totalEarnings,
            conversionRate: totalConversions > 0
                ? ((completedConversions / totalConversions) * 100).toFixed(2)
                : 0,
            recentConversions: recentConversions.map(conv => ({
                id: conv.id,
                referredUser: `${conv.first_name} ${conv.last_name}`,
                email: conv.email,
                status: conv.status,
                reward: parseFloat(conv.referrer_reward_value || 0),
                date: conv.created_at
            }))
        };
    }

    /**
     * Lista tutti i codici referral di un utente
     */
    async listCodes(userId) {
        // Get codes first (simple query that always works)
        const rows = await query(
            `SELECT id, code, type, referrer_reward, referee_reward, max_uses, status, expires_at, metadata, created_at
            FROM referral_codes
            WHERE user_id = ?
            ORDER BY created_at DESC`,
            [userId]
        );

        // Try to get usage counts from conversions table
        let usageMap = {};
        try {
            const usageRows = await query(
                `SELECT referral_code_id,
                    COUNT(*) as uses_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
                FROM referral_conversions
                WHERE referral_code_id IN (SELECT id FROM referral_codes WHERE user_id = ?)
                GROUP BY referral_code_id`,
                [userId]
            );
            for (const u of usageRows) {
                usageMap[u.referral_code_id] = { uses: u.uses_count || 0, completed: u.completed_count || 0 };
            }
        } catch (err) {
            console.error('listCodes usage query failed:', err.message);
        }

        // Merge usage data
        for (const row of rows) {
            row.uses_count = usageMap[row.id]?.uses || 0;
            row.completed_count = usageMap[row.id]?.completed || 0;
        }

        return rows.map(row => {
            let meta = {};
            try { meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}); } catch (_) {}
            return {
                id: row.id,
                code: row.code,
                name: meta.name || null,
                type: row.type,
                referrerReward: row.referrer_reward,
                refereeReward: row.referee_reward,
                maxUses: row.max_uses,
                uses: row.uses_count || 0,
                completedCount: row.completed_count || 0,
                status: row.status,
                expiresAt: row.expires_at,
                created_at: row.created_at,
                isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
                isMaxedOut: row.max_uses && (row.uses_count >= row.max_uses)
            };
        });
    }

    /**
     * Lista tutte le conversioni (referrals completati) di un utente
     */
    async listConversions(userId, status = null) {
        try {
            let whereClause = 'WHERE rcv.referrer_user_id = ?';
            let params = [userId];

            if (status) {
                whereClause += ' AND rcv.status = ?';
                params.push(status);
            }

            const rows = await query(
                `SELECT
                    rcv.id,
                    rcv.status,
                    rcv.referrer_reward_value,
                    rcv.referee_reward_value,
                    rcv.created_at,
                    rcv.completed_at,
                    rc.code,
                    rc.type,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.created_at as user_joined_at
                FROM referral_conversions rcv
                JOIN referral_codes rc ON rcv.referral_code_id = rc.id
                JOIN users u ON rcv.referred_user_id = u.id
                ${whereClause}
                ORDER BY rcv.created_at DESC`,
                params
            );

            return rows.map(row => ({
                id: row.id,
                code: row.code,
                codeType: row.type,
                status: row.status,
                referredUser: {
                    name: `${row.first_name} ${row.last_name}`,
                    email: row.email,
                    joinedAt: row.user_joined_at
                },
                rewards: {
                    referrer: parseFloat(row.referrer_reward_value || 0),
                    referee: parseFloat(row.referee_reward_value || 0)
                },
                createdAt: row.created_at,
                completedAt: row.completed_at
            }));
        } catch (err) {
            console.error('listConversions query failed:', err.message);
            return [];
        }
    }

    /**
     * Marca una conversione come completata (es. dopo pagamento primo mese)
     */
    async completeConversion(conversionId, tenantId) {
        const rows = await query(
            'SELECT id, status, referrer_user_id, referred_user_id FROM referral_conversions WHERE id = ? AND tenant_id = ?',
            [conversionId, tenantId]
        );

        if (rows.length === 0) {
            const error = new Error('Conversion not found');
            error.status = 404;
            throw error;
        }

        const conversion = rows[0];

        if (conversion.status === 'completed') {
            const error = new Error('Conversion already completed');
            error.status = 400;
            throw error;
        }

        // Update conversion status
        await query(
            'UPDATE referral_conversions SET status = "completed", completed_at = NOW() WHERE id = ?',
            [conversionId]
        );

        // Award XP or other rewards to both users
        // This could trigger additional reward logic

        return {
            id: conversionId,
            status: 'completed',
            completedAt: new Date()
        };
    }

    /**
     * Genera un codice referral univoco
     */
    _generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        const bytes = crypto.randomBytes(8);

        for (let i = 0; i < 8; i++) {
            code += chars[bytes[i] % chars.length];
        }

        return code;
    }

    /**
     * Ottieni i rewards in base al tipo di referral
     */
    _getRewardsByType(type) {
        const rewardMap = {
            general: { referrer: 10.00, referee: 10.00 },
            trainer: { referrer: 25.00, referee: 15.00 },
            client: { referrer: 5.00, referee: 5.00 },
            promotion: { referrer: 0.00, referee: 20.00 }
        };

        return rewardMap[type] || rewardMap.general;
    }

    /**
     * Assegna i rewards a referrer e referee
     */
    async _awardRewards(conversionId, referrerUserId, refereeUserId, referrerReward, refereeReward) {
        // Update conversion with reward values
        await query(
            `UPDATE referral_conversions
            SET referrer_reward_value = ?, referee_reward_value = ?
            WHERE id = ?`,
            [referrerReward, refereeReward, conversionId]
        );

        // Here you could also:
        // - Add credits to user accounts
        // - Award XP points
        // - Send notification emails
        // - Create wallet transactions

        // For now, we just record the values
        // The actual crediting can happen when conversion is completed
    }
}

module.exports = new ReferralService();
