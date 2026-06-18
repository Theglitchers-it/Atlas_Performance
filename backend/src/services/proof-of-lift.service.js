/**
 * Proof-of-Lift Service (Fase 6)
 * - Collega video upload a un performance_record
 * - Auto-crea world_leaderboard_entries se PR su esercizio whitelist + utente opt-in
 * - Verifica trainer del cliente per approvare leaderboard mondiale
 * - Query world leaderboard
 */

const { query, transaction } = require('../config/database');

const WEIGHT_CLASSES = [
    { max: 59, label: '-59' },
    { max: 66, label: '59-66' },
    { max: 74, label: '66-74' },
    { max: 83, label: '74-83' },
    { max: 93, label: '83-93' },
    { max: 105, label: '93-105' },
    { max: 120, label: '105-120' },
    { max: 999, label: '+120' }
];

function deriveWeightClass(bodyweightKg) {
    if (!bodyweightKg) return null;
    const wc = WEIGHT_CLASSES.find(c => bodyweightKg <= c.max);
    return wc ? wc.label : null;
}

class ProofOfLiftService {

    /**
     * Associa un video (già uploadato in tabella videos) a un performance_record.
     * Se l'esercizio è whitelist + user opt-in, crea entry world_leaderboard pending_review.
     */
    async attachProofVideo({ tenantId, userId, prRecordId, videoId, bodyweightKg = null }) {
        return transaction(async (conn) => {
            // Verifica PR + ownership tramite client.user_id
            const [prs] = await conn.execute(
                `SELECT pr.*, c.user_id AS client_user_id, e.name AS exercise_name
                 FROM performance_records pr
                 INNER JOIN clients c ON c.id = pr.client_id
                 INNER JOIN exercises e ON e.id = pr.exercise_id
                 WHERE pr.id = ? AND pr.tenant_id = ?
                 FOR UPDATE`,
                [prRecordId, tenantId]
            );
            if (prs.length === 0) throw { status: 404, message: 'Performance record non trovato' };
            const pr = prs[0];
            if (pr.client_user_id !== userId) {
                throw { status: 403, message: 'Puoi associare video solo ai tuoi PR' };
            }

            // Verifica video appartenenza
            const [videos] = await conn.execute(
                'SELECT id, video_type FROM videos WHERE id = ? AND tenant_id = ?',
                [videoId, tenantId]
            );
            if (videos.length === 0) throw { status: 404, message: 'Video non trovato' };

            // Forza video_type='proof_of_lift' + disabilita commenti
            await conn.execute(
                `UPDATE videos SET video_type = 'proof_of_lift', comments_enabled = FALSE
                 WHERE id = ? AND tenant_id = ?`,
                [videoId, tenantId]
            );

            await conn.execute(
                'UPDATE performance_records SET proof_video_id = ? WHERE id = ?',
                [videoId, prRecordId]
            );

            // Check whitelist + opt-in → crea world entry
            const canonical = canonicalizeExerciseName(pr.exercise_name);
            const [wceRows] = await conn.execute(
                'SELECT id FROM world_competition_exercises WHERE exercise_canonical_name = ? AND active = TRUE',
                [canonical]
            );
            const [userRows] = await conn.execute(
                'SELECT world_leaderboard_opt_in FROM users WHERE id = ?',
                [userId]
            );

            let worldEntryId = null;
            if (wceRows.length > 0 && userRows[0]?.world_leaderboard_opt_in) {
                const [result] = await conn.execute(
                    `INSERT INTO world_leaderboard_entries
                     (user_id, exercise_id, performance_record_id, value, bodyweight_kg, weight_class, proof_video_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [userId, wceRows[0].id, prRecordId, pr.value, bodyweightKg, deriveWeightClass(bodyweightKg), videoId]
                );
                worldEntryId = result.insertId;
            }

            return { success: true, prRecordId, videoId, worldEntryId };
        });
    }

    /**
     * Verifica un PR (trainer del cliente). Cambia anche status leaderboard mondiale a 'approved'.
     */
    async verifyPR({ tenantId, prRecordId, verifierId }) {
        return transaction(async (conn) => {
            const [prs] = await conn.execute(
                'SELECT client_id FROM performance_records WHERE id = ? AND tenant_id = ? FOR UPDATE',
                [prRecordId, tenantId]
            );
            if (prs.length === 0) throw { status: 404, message: 'PR non trovato' };

            // Verifica che il verifier sia trainer del cliente (tenant-scoped)
            const [trainerCheck] = await conn.execute(
                `SELECT 1 FROM client_trainers
                 WHERE client_id = ? AND user_id = ? AND tenant_id = ? AND ended_at IS NULL`,
                [prs[0].client_id, verifierId, tenantId]
            );
            if (trainerCheck.length === 0) {
                throw { status: 403, message: 'Non sei trainer di questo cliente' };
            }

            await conn.execute(
                'UPDATE performance_records SET verified = TRUE, verified_by = ?, verified_at = NOW() WHERE id = ?',
                [verifierId, prRecordId]
            );

            await conn.execute(
                `UPDATE world_leaderboard_entries
                 SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
                 WHERE performance_record_id = ? AND status = 'pending_review'`,
                [verifierId, prRecordId]
            );

            return { success: true };
        });
    }

    async rejectWorldEntry({ entryId, verifierId, tenantId }) {
        return transaction(async (conn) => {
            // SELECT con tenant filter integrato: 404 uniforme per
            // (entry non esiste, di altro tenant, già revisionata) — evita info leak
            // enumerazione cross-tenant via response status differentiation.
            const [entries] = await conn.execute(
                `SELECT wle.id, pr.tenant_id, pr.client_id
                 FROM world_leaderboard_entries wle
                 JOIN performance_records pr ON pr.id = wle.performance_record_id
                 WHERE wle.id = ? AND pr.tenant_id = ? AND wle.status = 'pending_review'
                 FOR UPDATE`,
                [entryId, tenantId]
            );
            if (entries.length === 0) {
                throw { status: 404, message: 'Entry non trovata o già revisionata' };
            }
            const entry = entries[0];

            // Verifica che il verifier sia trainer assegnato al cliente (tenant-scoped)
            const [trainerCheck] = await conn.execute(
                `SELECT 1 FROM client_trainers
                 WHERE client_id = ? AND user_id = ? AND tenant_id = ? AND ended_at IS NULL`,
                [entry.client_id, verifierId, tenantId]
            );
            if (trainerCheck.length === 0) {
                throw { status: 403, message: 'Non sei trainer di questo cliente' };
            }

            await conn.execute(
                `UPDATE world_leaderboard_entries
                 SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW()
                 WHERE id = ? AND status = 'pending_review'`,
                [verifierId, entryId]
            );
            return { success: true };
        });
    }

    async getWorldLeaderboard({ exerciseId, weightClass, limit = 100, offset = 0 }) {
        const conditions = ['1=1'];
        const params = [];
        if (exerciseId) {
            conditions.push('exercise_id = ?');
            params.push(parseInt(exerciseId, 10));
        }
        if (weightClass) {
            conditions.push('weight_class = ?');
            params.push(weightClass);
        }
        params.push(parseInt(limit), parseInt(offset));
        return query(
            `SELECT entry_id, exercise_id, exercise_canonical_name, display_label,
                    value, weight_class, bodyweight_kg, user_id, display_name, avatar_url,
                    proof_video_id, submitted_at, world_rank
             FROM v_world_leaderboard
             WHERE ${conditions.join(' AND ')}
             ORDER BY exercise_id, world_rank
             LIMIT ? OFFSET ?`,
            params
        );
    }

    async getWorldExercises() {
        return query('SELECT id, exercise_canonical_name, display_label, record_type FROM world_competition_exercises WHERE active = TRUE');
    }

    async getMyWorldEntries(userId) {
        return query(
            `SELECT wle.id, wle.exercise_id, wce.display_label, wle.value, wle.weight_class,
                    wle.status, wle.submitted_at, wle.proof_video_id
             FROM world_leaderboard_entries wle
             INNER JOIN world_competition_exercises wce ON wce.id = wle.exercise_id
             WHERE wle.user_id = ?
             ORDER BY wle.submitted_at DESC`,
            [userId]
        );
    }

    async setOptIn({ userId, optIn, displayName = null }) {
        await query(
            'UPDATE users SET world_leaderboard_opt_in = ?, world_leaderboard_display_name = ? WHERE id = ?',
            [!!optIn, displayName, userId]
        );
        return { success: true };
    }
}

/**
 * Mappa nome esercizio "free-form" a chiave canonica della whitelist.
 * Match approssimato (case-insensitive, accenti normalizzati, spazi → underscore).
 */
function canonicalizeExerciseName(name) {
    if (!name) return null;
    const cleaned = name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accenti
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    // Aliases
    const aliases = {
        'panca': 'panca_piana',
        'bench_press': 'panca_piana',
        'bench': 'panca_piana',
        'panca_piana': 'panca_piana',
        'back_squat': 'squat',
        'squat': 'squat',
        'deadlift': 'stacco_da_terra',
        'stacco': 'stacco_da_terra',
        'stacco_da_terra': 'stacco_da_terra',
        'incline_bench': 'panca_inclinata',
        'panca_inclinata': 'panca_inclinata',
        'overhead_press': 'military_press',
        'ohp': 'military_press',
        'military_press': 'military_press',
        'weighted_pullup': 'trazioni_zavorrate',
        'trazioni_zavorrate': 'trazioni_zavorrate'
    };
    return aliases[cleaned] || cleaned;
}

module.exports = new ProofOfLiftService();
module.exports.canonicalizeExerciseName = canonicalizeExerciseName;
module.exports.WEIGHT_CLASSES = WEIGHT_CLASSES;
