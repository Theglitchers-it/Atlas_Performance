/**
 * Cron Job: checkTitleUnlocks
 * Controlla automaticamente se i clienti hanno raggiunto soglie per sbloccare titoli
 * Da eseguire periodicamente (es. ogni ora o dopo ogni PR registrato)
 *
 * Categorie titoli:
 * - strength: Basato su PR di peso negli esercizi (Panca Piana, Squat, Stacco, etc.)
 * - consistency: Basato su giorni consecutivi di allenamento
 * - transformation: Basato su variazione peso corporeo
 */

const { query, transaction } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CRON_TITLES');

/**
 * Controlla e sblocca titoli per tutti i tenant attivi
 */
async function checkAllTitleUnlocks() {
    logger.info('checkTitleUnlocks: avvio controllo...');
    const startTime = Date.now();

    try {
        // Ottieni tutti i tenant attivi
        const tenants = await query('SELECT id FROM tenants WHERE status = ? OR status IS NULL', ['active']);

        let totalUnlocked = 0;

        for (const tenant of tenants) {
            const unlocked = await checkTenantTitleUnlocks(tenant.id);
            totalUnlocked += unlocked;
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`checkTitleUnlocks: completato in ${elapsed}s`, { totalUnlocked });
        return totalUnlocked;
    } catch (error) {
        logger.error('checkTitleUnlocks errore', { error: error.message });
        return 0;
    }
}

/**
 * Controlla i titoli per un singolo tenant
 */
async function checkTenantTitleUnlocks(tenantId) {
    let unlockedCount = 0;

    // Ottieni tutti i titoli disponibili per questo tenant
    const titles = await query(`
        SELECT t.*, e.name as exercise_name FROM achievement_titles t
        LEFT JOIN exercises e ON t.exercise_id = e.id
        WHERE t.tenant_id = ? AND t.is_active = 1
        ORDER BY t.threshold_value ASC
    `, [tenantId]);

    if (titles.length === 0) return 0;

    // Ottieni tutti i client di questo tenant
    const clients = await query(`
        SELECT id, user_id FROM clients
        WHERE tenant_id = ? AND (status = 'active' OR status IS NULL)
    `, [tenantId]);

    for (const client of clients) {
        for (const title of titles) {
            // Controlla se gia sbloccato
            const [existing] = await query(`
                SELECT id FROM client_titles
                WHERE client_id = ? AND title_id = ? AND tenant_id = ?
            `, [client.id, title.id, tenantId]);

            if (existing) continue;

            // Verifica se la soglia e stata raggiunta
            const reached = await checkThresholdReached(client.user_id, client.id, tenantId, title);

            if (reached.unlocked) {
                await unlockTitle(client.id, client.user_id, tenantId, title.id, reached.value);
                unlockedCount++;
            }
        }
    }

    return unlockedCount;
}

/**
 * Verifica se il client ha raggiunto la soglia di un titolo
 */
async function checkThresholdReached(userId, clientId, tenantId, title) {
    const { category, metric_type, threshold_value, exercise_name } = title;

    try {
        // === STRENGTH: PR su peso esercizio ===
        if (category === 'strength' && metric_type === 'weight_kg' && exercise_name) {
            const rows = await query(`
                SELECT MAX(esl.weight_used) as max_weight
                FROM exercise_set_logs esl
                JOIN workout_session_exercises wse ON esl.session_exercise_id = wse.id
                JOIN workout_sessions ws ON wse.session_id = ws.id
                JOIN exercises e ON wse.exercise_id = e.id
                WHERE ws.client_id = ? AND ws.tenant_id = ?
                    AND ws.status = 'completed'
                    AND (e.name LIKE ? OR e.name = ?)
                    AND esl.weight_used IS NOT NULL
            `, [clientId, tenantId, `%${exercise_name}%`, exercise_name]);

            const maxWeight = rows[0]?.max_weight;
            if (maxWeight && parseFloat(maxWeight) >= threshold_value) {
                return { unlocked: true, value: parseFloat(maxWeight) };
            }
        }

        // === STRENGTH: PR su reps ===
        if (category === 'strength' && metric_type === 'reps' && exercise_name) {
            const rows = await query(`
                SELECT MAX(esl.reps_completed) as max_reps
                FROM exercise_set_logs esl
                JOIN workout_session_exercises wse ON esl.session_exercise_id = wse.id
                JOIN workout_sessions ws ON wse.session_id = ws.id
                JOIN exercises e ON wse.exercise_id = e.id
                WHERE ws.client_id = ? AND ws.tenant_id = ?
                    AND ws.status = 'completed'
                    AND (e.name LIKE ? OR e.name = ?)
                    AND esl.reps_completed IS NOT NULL
            `, [clientId, tenantId, `%${exercise_name}%`, exercise_name]);

            const maxReps = rows[0]?.max_reps;
            if (maxReps && parseInt(maxReps) >= threshold_value) {
                return { unlocked: true, value: parseInt(maxReps) };
            }
        }

        // === CONSISTENCY: Giorni consecutivi di allenamento ===
        if (category === 'consistency' && metric_type === 'consecutive_days') {
            const sessions = await query(`
                SELECT DISTINCT DATE(completed_at) as session_date
                FROM workout_sessions
                WHERE client_id = ? AND tenant_id = ? AND status = 'completed'
                ORDER BY session_date DESC
            `, [clientId, tenantId]);

            if (sessions.length > 0) {
                let maxStreak = 1;
                let currentStreak = 1;

                for (let i = 1; i < sessions.length; i++) {
                    const prevDate = new Date(sessions[i - 1].session_date);
                    const currDate = new Date(sessions[i].session_date);
                    const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);

                    if (diffDays === 1) {
                        currentStreak++;
                        maxStreak = Math.max(maxStreak, currentStreak);
                    } else {
                        currentStreak = 1;
                    }
                }

                if (maxStreak >= threshold_value) {
                    return { unlocked: true, value: maxStreak };
                }
            }
        }

        // === TRANSFORMATION: Perdita peso ===
        if (category === 'transformation' && metric_type === 'weight_loss') {
            const measurements = await query(`
                SELECT weight_kg, measurement_date
                FROM body_measurements
                WHERE client_id = ? AND tenant_id = ? AND weight_kg IS NOT NULL
                ORDER BY measurement_date ASC
            `, [clientId, tenantId]);

            if (measurements.length >= 2) {
                const maxWeight = Math.max(...measurements.map(m => parseFloat(m.weight_kg)));
                const minWeight = Math.min(...measurements.map(m => parseFloat(m.weight_kg)));
                const loss = maxWeight - minWeight;

                if (loss >= threshold_value) {
                    return { unlocked: true, value: parseFloat(loss.toFixed(1)) };
                }
            }
        }

        // === TRANSFORMATION: Aumento peso (massa) ===
        if (category === 'transformation' && metric_type === 'weight_gain') {
            const measurements = await query(`
                SELECT weight_kg, measurement_date
                FROM body_measurements
                WHERE client_id = ? AND tenant_id = ? AND weight_kg IS NOT NULL
                ORDER BY measurement_date ASC
            `, [clientId, tenantId]);

            if (measurements.length >= 2) {
                const first = parseFloat(measurements[0].weight_kg);
                const last = parseFloat(measurements[measurements.length - 1].weight_kg);
                const gain = last - first;

                if (gain >= threshold_value) {
                    return { unlocked: true, value: parseFloat(gain.toFixed(1)) };
                }
            }
        }
    } catch (err) {
        logger.error(`checkThreshold error for title ${title.id}`, { error: err.message });
    }

    return { unlocked: false, value: 0 };
}

/**
 * Sblocca un titolo per un client
 */
async function unlockTitle(clientId, userId, tenantId, titleId, unlockedValue) {
    try {
        await transaction(async (conn) => {
            // Inserisci nella tabella client_titles
            await conn.execute(`
                INSERT INTO client_titles (client_id, title_id, tenant_id, unlocked_value, unlocked_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE unlocked_value = VALUES(unlocked_value)
            `, [clientId, titleId, tenantId, unlockedValue]);

            // Bonus XP per sblocco titolo
            try {
                const [rows] = await conn.execute(
                    'SELECT title_name, rarity FROM achievement_titles WHERE id = ?',
                    [titleId]
                );
                const title = rows[0];
                const xpReward = getXPForRarity(title?.rarity || 'common');

                await conn.execute(`
                    INSERT INTO points_transactions (tenant_id, client_id, points, transaction_type, description)
                    VALUES (?, ?, ?, 'achievement', ?)
                `, [tenantId, clientId, xpReward, `Titolo sbloccato: ${title?.title_name || 'Nuovo titolo'}`]);

                // Aggiorna XP totali del client
                await conn.execute(
                    'UPDATE clients SET xp_points = xp_points + ? WHERE id = ?',
                    [xpReward, clientId]
                );
            } catch (xpErr) {
                // Ignora errori XP
            }

            // Crea notifica per l'utente
            if (userId) {
                try {
                    const [rows] = await conn.execute(
                        'SELECT title_name FROM achievement_titles WHERE id = ?',
                        [titleId]
                    );
                    const title = rows[0];
                    await conn.execute(`
                        INSERT INTO notifications (user_id, tenant_id, type, title, message, created_at)
                        VALUES (?, ?, 'title_unlock', 'Nuovo Titolo Sbloccato!', ?, NOW())
                    `, [userId, tenantId, `Hai sbloccato il titolo "${title?.title_name || 'Nuovo'}"! Vai ai titoli per equipaggiarlo.`]);
                } catch (notifErr) {
                    // Ignora se la tabella notifiche non esiste
                }
            }
        });

        logger.info(`Titolo ${titleId} sbloccato per client ${clientId}`, { unlockedValue });
    } catch (error) {
        logger.error(`Errore sblocco titolo ${titleId} per client ${clientId}`, { error: error.message });
    }
}

/**
 * XP reward per rarita titolo
 */
function getXPForRarity(rarity) {
    const rewards = {
        common: 25,
        uncommon: 50,
        rare: 100,
        epic: 200,
        legendary: 500
    };
    return rewards[rarity] || 25;
}

/**
 * Controlla sblocco titoli per un singolo utente (chiamata on-demand dopo PR)
 */
async function checkUserTitleUnlocks(userId, clientId, tenantId) {
    const titles = await query(`
        SELECT t.*, e.name as exercise_name FROM achievement_titles t
        LEFT JOIN exercises e ON t.exercise_id = e.id
        WHERE t.tenant_id = ? AND t.is_active = 1
        ORDER BY t.threshold_value ASC
    `, [tenantId]);

    let unlockedCount = 0;

    for (const title of titles) {
        const [existing] = await query(`
            SELECT id FROM client_titles
            WHERE client_id = ? AND title_id = ? AND tenant_id = ?
        `, [clientId, title.id, tenantId]);

        if (existing) continue;

        const reached = await checkThresholdReached(userId, clientId, tenantId, title);
        if (reached.unlocked) {
            await unlockTitle(clientId, userId, tenantId, title.id, reached.value);
            unlockedCount++;
        }
    }

    return unlockedCount;
}

module.exports = {
    checkAllTitleUnlocks,
    checkTenantTitleUnlocks,
    checkUserTitleUnlocks
};
