/**
 * Seed Runner
 * Inserisce dati demo: tenant, utente admin, titoli gamification, gruppi muscolari.
 * Uso: npm run seed (da backend/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
    console.log('[SEED] Connessione al database...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pt_saas_db',
        multipleStatements: true
    });

    // =========================================================
    // 1. Demo Tenant
    // =========================================================
    console.log('[SEED] Inserimento tenant demo...');
    await connection.query(`
        INSERT IGNORE INTO tenants (id, business_name, owner_email, subscription_plan, subscription_status, max_clients, status)
        VALUES (?, 'Demo PT Studio', 'personaltrainer@demo.local', 'professional', 'active', 9999, 'active')
    `, [DEMO_TENANT_ID]);

    // =========================================================
    // 2. Demo Users (password: demo1234 per tutti)
    // =========================================================
    console.log('[SEED] Inserimento utenti demo...');
    const passwordHash = await bcrypt.hash('demo1234', 12);

    // Super Admin
    await connection.query(`
        INSERT IGNORE INTO users (tenant_id, email, password_hash, role, first_name, last_name, status, email_verified_at)
        VALUES (?, 'superadmin@demo.local', ?, 'super_admin', 'Super', 'Admin', 'active', NOW())
    `, [DEMO_TENANT_ID, passwordHash]);

    // Tenant Owner (Personal Trainer)
    await connection.query(`
        INSERT IGNORE INTO users (tenant_id, email, password_hash, role, first_name, last_name, status, email_verified_at)
        VALUES (?, 'personaltrainer@demo.local', ?, 'tenant_owner', 'Personal', 'Trainer', 'active', NOW())
    `, [DEMO_TENANT_ID, passwordHash]);

    // Staff
    await connection.query(`
        INSERT IGNORE INTO users (tenant_id, email, password_hash, role, first_name, last_name, status, email_verified_at)
        VALUES (?, 'staff@demo.local', ?, 'staff', 'Marco', 'Staff', 'active', NOW())
    `, [DEMO_TENANT_ID, passwordHash]);

    // Client
    await connection.query(`
        INSERT IGNORE INTO users (tenant_id, email, password_hash, role, first_name, last_name, status, email_verified_at)
        VALUES (?, 'client@demo.local', ?, 'client', 'Luca', 'Cliente', 'active', NOW())
    `, [DEMO_TENANT_ID, passwordHash]);

    // =========================================================
    // 2b. Migration: Espandi category ENUM (se non gia applicata)
    // =========================================================
    console.log('[SEED] Applicazione migration categorie esercizi...');
    const migrationPath = path.resolve(__dirname, '../../database/migrations/012_expand_exercise_categories.sql');
    if (fs.existsSync(migrationPath)) {
        try {
            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
            await connection.query(migrationSql);
            console.log('[SEED] Migration 012 applicata con successo.');
        } catch (err) {
            console.log(`[SEED] Migration 012: ${err.message.includes('Duplicate') ? 'gia applicata.' : err.message}`);
        }
    }

    // =========================================================
    // 3. Gruppi Muscolari
    // =========================================================
    console.log('[SEED] Inserimento gruppi muscolari...');
    const [existingMg] = await connection.query('SELECT COUNT(*) as count FROM muscle_groups');
    if (existingMg[0].count > 0) {
        console.log('[SEED] Gruppi muscolari gia presenti, skip.');
    }
    const muscleGroups = existingMg[0].count > 0 ? [] : [
        ['Chest', 'Petto', 'upper_body'],
        ['Back', 'Schiena', 'upper_body'],
        ['Shoulders', 'Spalle', 'upper_body'],
        ['Biceps', 'Bicipiti', 'upper_body'],
        ['Triceps', 'Tricipiti', 'upper_body'],
        ['Forearms', 'Avambracci', 'upper_body'],
        ['Quadriceps', 'Quadricipiti', 'lower_body'],
        ['Hamstrings', 'Femorali', 'lower_body'],
        ['Glutes', 'Glutei', 'lower_body'],
        ['Calves', 'Polpacci', 'lower_body'],
        ['Hip Flexors', 'Flessori dell\'anca', 'lower_body'],
        ['Abdominals', 'Addominali', 'core'],
        ['Obliques', 'Obliqui', 'core'],
        ['Lower Back', 'Lombare', 'core'],
        ['Traps', 'Trapezio', 'upper_body'],
        ['Lats', 'Dorsali', 'upper_body'],
        ['Rotator Cuff', 'Cuffia dei rotatori', 'upper_body'],
        ['Adductors', 'Adduttori', 'lower_body'],
        ['Abductors', 'Abduttori', 'lower_body']
    ];

    for (const [name, nameIt, category] of muscleGroups) {
        await connection.query(
            `INSERT IGNORE INTO muscle_groups (name, name_it, category) VALUES (?, ?, ?)`,
            [name, nameIt, category]
        );
    }

    // =========================================================
    // 3b. Esercizi (da seed 004 + 008)
    // =========================================================
    console.log('[SEED] Inserimento esercizi...');
    const [existingEx] = await connection.query('SELECT COUNT(*) as count FROM exercises');

    if (existingEx[0].count === 0) {
        const exercisesSeedPath = path.resolve(__dirname, '../../database/seeds/004_exercises.sql');
        if (fs.existsSync(exercisesSeedPath)) {
            let exercisesSql = fs.readFileSync(exercisesSeedPath, 'utf8');
            exercisesSql = exercisesSql.replace(/^--.*$/gm, '');
            await connection.query(exercisesSql);
            console.log('[SEED] Esercizi base inseriti.');
        }

        const muscleGroupsSeedPath = path.resolve(__dirname, '../../database/seeds/008_exercise_muscle_groups.sql');
        if (fs.existsSync(muscleGroupsSeedPath)) {
            let mgSql = fs.readFileSync(muscleGroupsSeedPath, 'utf8');
            mgSql = mgSql.replace(/^--.*$/gm, '');
            await connection.query(mgSql);
            console.log('[SEED] Associazioni esercizi-muscoli inserite.');
        }
    } else {
        console.log(`[SEED] Esercizi gia presenti (${existingEx[0].count}), skip.`);

        // Prova ad aggiungere solo i nuovi esercizi (INSERT usa INTO non IGNORE, quindi ignora errori duplicati)
        const exercisesSeedPath = path.resolve(__dirname, '../../database/seeds/004_exercises.sql');
        if (fs.existsSync(exercisesSeedPath)) {
            try {
                let exercisesSql = fs.readFileSync(exercisesSeedPath, 'utf8');
                exercisesSql = exercisesSql.replace(/^--.*$/gm, '');
                // Converti INSERT INTO in INSERT IGNORE INTO per idempotenza
                exercisesSql = exercisesSql.replace(/INSERT INTO exercises/g, 'INSERT IGNORE INTO exercises');
                await connection.query(exercisesSql);

                let mgSql = fs.readFileSync(path.resolve(__dirname, '../../database/seeds/008_exercise_muscle_groups.sql'), 'utf8');
                mgSql = mgSql.replace(/^--.*$/gm, '');
                await connection.query(mgSql);

                console.log('[SEED] Nuovi esercizi aggiunti (se presenti).');
            } catch (err) {
                console.log(`[SEED] Aggiunta nuovi esercizi: ${err.message}`);
            }
        }
    }

    // =========================================================
    // 4. Titoli Gamification (da seed_titles.sql)
    // =========================================================
    console.log('[SEED] Inserimento titoli gamification...');
    const [existingTitles] = await connection.query(
        `SELECT COUNT(*) as count FROM achievement_titles WHERE tenant_id = ?`, [DEMO_TENANT_ID]
    );

    if (existingTitles[0].count === 0) {
        const titlesSeedPath = path.resolve(__dirname, '../../database/seeds/007_seed_titles.sql');
        let titlesSql = fs.readFileSync(titlesSeedPath, 'utf8');

        // Rimuovi commenti SQL
        titlesSql = titlesSql.replace(/^--.*$/gm, '');

        // Converti INSERT in INSERT IGNORE per idempotenza
        titlesSql = titlesSql.replace(/INSERT INTO achievement_titles/g, 'INSERT IGNORE INTO achievement_titles');

        // Sostituisci tenant_id = 1 (intero) con UUID del demo tenant
        // Pattern: (1, 'testo...' all'inizio di ogni riga VALUES
        titlesSql = titlesSql.replace(/\(1, '/g, `('${DEMO_TENANT_ID}', '`);

        await connection.query(titlesSql);
    } else {
        console.log('[SEED] Titoli gamification gia presenti, skip.');
    }

    // =========================================================
    // 5. Mesocicli
    // =========================================================
    console.log('[SEED] Inserimento mesocicli...');
    const [existingMc] = await connection.query('SELECT COUNT(*) as count FROM mesocycles');
    if (existingMc[0].count > 0) {
        console.log('[SEED] Mesocicli gia presenti, skip.');
    }
    const mesocycles = existingMc[0].count > 0 ? [] : [
        ['Forza Massimale', 'strength', 'linear'],
        ['Forza Esplosiva', 'power', 'undulating'],
        ['Forza Resistente', 'strength_endurance', 'linear'],
        ['Ipertrofia Volume', 'hypertrophy', 'linear'],
        ['Ipertrofia Intensiva', 'hypertrophy', 'undulating'],
        ['Ipertrofia Metabolica', 'hypertrophy', 'block'],
        ['Dimagrimento Base', 'fat_loss', 'linear'],
        ['Ricomposizione Corporea', 'body_recomp', 'undulating'],
        ['Resistenza Aerobica', 'endurance', 'linear'],
        ['Condizionamento Metabolico', 'conditioning', 'undulating'],
        ['Preparazione Generale (GPP)', 'general', 'linear'],
        ['Peaking / Tapering', 'peaking', 'block'],
        ['Deload / Scarico', 'recovery', 'linear'],
        ['Preparazione Atletica', 'athletic', 'block'],
        ['Pre-Gara', 'competition', 'undulating']
    ];

    for (const [name, focus, periodization] of mesocycles) {
        await connection.query(
            `INSERT IGNORE INTO mesocycles (name, focus, periodization_type) VALUES (?, ?, ?)`,
            [name, focus, periodization]
        );
    }

    // =========================================================
    // 6. Template Notifiche
    // =========================================================
    console.log('[SEED] Inserimento template notifiche...');
    const templates = [
        ['workout_reminder', 'Allenamento oggi!', 'Ciao {{clientName}}, hai un allenamento programmato per oggi.', 'reminder', '/my-workout', 'normal'],
        ['session_completed', 'Sessione completata!', 'Complimenti {{clientName}}! Hai completato la sessione. +{{xp}} XP!', 'achievement', '/my-workout', 'normal'],
        ['checkin_reminder', 'Check-in giornaliero', 'Buongiorno {{clientName}}! Ricorda il tuo check-in giornaliero.', 'reminder', '/checkin', 'normal'],
        ['program_assigned', 'Nuovo programma assegnato', '{{trainerName}} ti ha assegnato il programma "{{programName}}".', 'info', '/my-workout', 'high'],
        ['achievement_unlocked', 'Nuovo achievement!', 'Hai sbloccato "{{achievementName}}"! +{{xp}} XP!', 'achievement', '/gamification', 'normal'],
        ['title_unlocked', 'Nuovo titolo sbloccato!', 'Hai sbloccato il titolo "{{titleName}}"!', 'achievement', '/titles', 'high'],
        ['level_up', 'Level Up!', 'Complimenti {{clientName}}! Sei salito al livello {{level}}!', 'achievement', '/gamification', 'high'],
        ['appointment_created', 'Appuntamento confermato', 'Appuntamento con {{trainerName}} confermato per {{date}} alle {{time}}.', 'info', '/calendar', 'normal'],
        ['appointment_reminder', 'Appuntamento tra poco', 'Hai un appuntamento con {{trainerName}} tra 1 ora.', 'reminder', '/calendar', 'high'],
        ['subscription_expiring', 'Abbonamento in scadenza', 'Il tuo abbonamento scade tra {{days}} giorni.', 'warning', '/settings', 'high'],
        ['dormant_reengagement_discount', 'Ti riprendiamo con uno sconto', 'Ciao {{clientName}}, ci manchi! Torna con uno sconto del 20% sul tuo prossimo mesociclo.', 'info', '/my-workout', 'normal'],
        ['dormant_reengagement_check', 'Check gratuito di ritorno', 'Ciao {{clientName}}, ti offro un check gratuito per ripartire insieme. Mi confermi una data?', 'info', '/calendar', 'normal'],
        ['dormant_reengagement_program', 'Nuovo programma per te', 'Ho preparato una nuova programmazione pensata per te, {{clientName}}. Vuoi vederla?', 'info', '/my-workout', 'normal'],
        ['dormant_reengagement_custom', 'Messaggio personalizzato', '', 'info', null, 'normal']
    ];

    for (const [key, title, message, type, actionUrl, priority] of templates) {
        await connection.query(
            `INSERT IGNORE INTO notification_templates (template_key, title, message, type, action_url, priority) VALUES (?, ?, ?, ?, ?, ?)`,
            [key, title, message, type, actionUrl, priority]
        );
    }

    // =========================================================
    // 7. Conversazioni Chat Demo
    // =========================================================
    console.log('[SEED] Inserimento conversazioni chat demo...');

    // Recupera ID utenti demo
    const [users] = await connection.query(
        `SELECT id, role, first_name FROM users WHERE tenant_id = ? AND email IN ('personaltrainer@demo.local','staff@demo.local','client@demo.local','superadmin@demo.local')`,
        [DEMO_TENANT_ID]
    );
    const userMap = {};
    for (const u of users) userMap[u.role] = u.id;

    const ownerId = userMap['tenant_owner'];
    const staffId = userMap['staff'];
    const clientId = userMap['client'];
    const adminId = userMap['super_admin'];

    // Verifica se ci sono gia conversazioni (per idempotenza)
    const [existingConvs] = await connection.query(
        `SELECT COUNT(*) as count FROM conversations WHERE tenant_id = ?`, [DEMO_TENANT_ID]
    );

    // Helper per inserire messaggi uno alla volta (evita problemi escape)
    const insertMsg = async (convId, senderId, content, interval) => {
        await connection.query(
            `INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at) VALUES (?, ?, ?, 'text', NOW() - INTERVAL ${interval})`,
            [convId, senderId, content]
        );
    };

    if (existingConvs[0].count === 0 && ownerId && staffId && clientId) {
        // --- Conv 1: Trainer <-> Client (direct) ---
        const [conv1] = await connection.query(
            `INSERT INTO conversations (tenant_id, type, name, last_message_at) VALUES (?, 'direct', NULL, NOW() - INTERVAL 10 MINUTE)`,
            [DEMO_TENANT_ID]
        );
        await connection.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, NOW()), (?, ?, NOW() - INTERVAL 1 HOUR)`,
            [conv1.insertId, ownerId, conv1.insertId, clientId]
        );
        await insertMsg(conv1.insertId, ownerId, 'Ciao Luca! Come procede l\'allenamento di questa settimana?', '3 HOUR');
        await insertMsg(conv1.insertId, clientId, 'Tutto bene! Ho completato 4 sessioni su 5. Mi manca solo quella di domani.', '2 HOUR');
        await insertMsg(conv1.insertId, ownerId, 'Ottimo lavoro! Ricorda di fare stretching dopo ogni sessione.', '1 HOUR');
        await insertMsg(conv1.insertId, clientId, 'Si lo faccio sempre! Grazie per il programma, mi trovo benissimo.', '30 MINUTE');
        await insertMsg(conv1.insertId, ownerId, 'Perfetto! La prossima settimana aumentiamo un po\' i carichi. Preparati!', '10 MINUTE');

        // --- Conv 2: Staff <-> Client (direct) ---
        const [conv2] = await connection.query(
            `INSERT INTO conversations (tenant_id, type, name, last_message_at) VALUES (?, 'direct', NULL, NOW() - INTERVAL 4 HOUR)`,
            [DEMO_TENANT_ID]
        );
        await connection.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, NOW()), (?, ?, NOW())`,
            [conv2.insertId, staffId, conv2.insertId, clientId]
        );
        await insertMsg(conv2.insertId, staffId, 'Ciao Luca, ti ricordo l\'appuntamento di giovedi alle 18:00', '1 DAY');
        await insertMsg(conv2.insertId, clientId, 'Grazie Marco! Confermo, ci saro!', '23 HOUR');
        await insertMsg(conv2.insertId, staffId, 'Perfetto. Porta anche il diario alimentare cosi lo rivediamo insieme.', '4 HOUR');

        // --- Conv 3: Trainer <-> Staff (direct) ---
        const [conv3] = await connection.query(
            `INSERT INTO conversations (tenant_id, type, name, last_message_at) VALUES (?, 'direct', NULL, NOW() - INTERVAL 2 HOUR)`,
            [DEMO_TENANT_ID]
        );
        await connection.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, NOW()), (?, ?, NOW())`,
            [conv3.insertId, ownerId, conv3.insertId, staffId]
        );
        await insertMsg(conv3.insertId, ownerId, 'Marco, puoi seguire il nuovo cliente che arriva domani?', '5 HOUR');
        await insertMsg(conv3.insertId, staffId, 'Certo! A che ora ha l\'appuntamento?', '4 HOUR');
        await insertMsg(conv3.insertId, ownerId, 'Alle 10:00. Ti mando i dettagli del suo profilo.', '3 HOUR');
        await insertMsg(conv3.insertId, staffId, 'Ricevuto, mi preparo!', '2 HOUR');

        // --- Conv 4: Gruppo "Team Palestra" (trainer + staff + client) ---
        const [conv4] = await connection.query(
            `INSERT INTO conversations (tenant_id, type, name, last_message_at) VALUES (?, 'group', 'Team Palestra', NOW() - INTERVAL 6 HOUR)`,
            [DEMO_TENANT_ID]
        );
        await connection.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, NOW()), (?, ?, NOW()), (?, ?, NOW())`,
            [conv4.insertId, ownerId, conv4.insertId, staffId, conv4.insertId, clientId]
        );
        await insertMsg(conv4.insertId, ownerId, 'Buongiorno team! Ricordo che sabato la palestra chiude alle 14:00.', '1 DAY');
        await insertMsg(conv4.insertId, staffId, 'Grazie per l\'avviso!', '23 HOUR');
        await insertMsg(conv4.insertId, clientId, 'Ok, sposto il mio allenamento alla mattina allora.', '6 HOUR');

        console.log('[SEED] 4 conversazioni chat create con messaggi demo.');
    } else if (existingConvs[0].count > 0) {
        console.log('[SEED] Conversazioni chat gia presenti, skip.');
    }

    // =========================================================
    // 8. Demo Clients (record nella tabella clients)
    // =========================================================
    console.log('[SEED] Inserimento clienti demo...');

    const [existingClients] = await connection.query(
        `SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?`, [DEMO_TENANT_ID]
    );

    if (existingClients[0].count === 0 && ownerId && staffId && clientId) {
        // Client 1: Luca Cliente (linked to client@demo.local user)
        await connection.query(`
            INSERT INTO clients (tenant_id, user_id, first_name, last_name, email, phone, date_of_birth, gender,
                height_cm, initial_weight_kg, current_weight_kg, fitness_level, primary_goal, training_location,
                assigned_to, status, xp_points, level, streak_days, last_workout_at)
            VALUES (?, ?, 'Luca', 'Cliente', 'client@demo.local', '+39 333 1234567', '1995-06-15', 'male',
                178.00, 82.00, 78.50, 'intermediate', 'muscle_gain', 'gym',
                ?, 'active', 1250, 13, 12, NOW() - INTERVAL 1 DAY)
        `, [DEMO_TENANT_ID, clientId, ownerId]);

        // Client 2: Sofia Rossi (no linked user — manual client)
        await connection.query(`
            INSERT INTO clients (tenant_id, user_id, first_name, last_name, email, phone, date_of_birth, gender,
                height_cm, initial_weight_kg, current_weight_kg, fitness_level, primary_goal, training_location,
                assigned_to, status, xp_points, level, streak_days, last_workout_at)
            VALUES (?, NULL, 'Sofia', 'Rossi', 'sofia.rossi@email.it', '+39 340 9876543', '1998-03-22', 'female',
                165.00, 62.00, 58.00, 'advanced', 'weight_loss', 'hybrid',
                ?, 'active', 2100, 22, 25, NOW() - INTERVAL 2 DAY)
        `, [DEMO_TENANT_ID, ownerId]);

        // Client 3: Marco Bianchi (no linked user — manual client)
        await connection.query(`
            INSERT INTO clients (tenant_id, user_id, first_name, last_name, email, phone, date_of_birth, gender,
                height_cm, initial_weight_kg, current_weight_kg, fitness_level, primary_goal, training_location,
                assigned_to, status, xp_points, level, streak_days, last_workout_at)
            VALUES (?, NULL, 'Marco', 'Bianchi', 'marco.bianchi@email.it', '+39 347 5551234', '1990-11-08', 'male',
                182.00, 90.00, 85.00, 'beginner', 'general_fitness', 'gym',
                ?, 'active', 450, 5, 3, NOW() - INTERVAL 5 DAY)
        `, [DEMO_TENANT_ID, staffId]);

        // Client 4: Giulia Verdi (no linked user — manual client)
        await connection.query(`
            INSERT INTO clients (tenant_id, user_id, first_name, last_name, email, phone, date_of_birth, gender,
                height_cm, initial_weight_kg, current_weight_kg, fitness_level, primary_goal, training_location,
                assigned_to, status, xp_points, level, streak_days, last_workout_at)
            VALUES (?, NULL, 'Giulia', 'Verdi', 'giulia.verdi@email.it', '+39 345 7778899', '1992-07-30', 'female',
                170.00, 55.00, 55.00, 'elite', 'performance', 'gym',
                ?, 'active', 3500, 36, 45, NOW() - INTERVAL 1 DAY)
        `, [DEMO_TENANT_ID, ownerId]);

        // Client 5: Andrea Neri (inactive)
        await connection.query(`
            INSERT INTO clients (tenant_id, user_id, first_name, last_name, email, phone, date_of_birth, gender,
                height_cm, initial_weight_kg, current_weight_kg, fitness_level, primary_goal, training_location,
                assigned_to, status, xp_points, level, streak_days)
            VALUES (?, NULL, 'Andrea', 'Neri', 'andrea.neri@email.it', '+39 320 1112233', '1988-01-12', 'male',
                175.00, 95.00, 92.00, 'beginner', 'weight_loss', 'home',
                ?, 'inactive', 100, 2, 0)
        `, [DEMO_TENANT_ID, ownerId]);

        console.log('[SEED] 5 clienti demo creati (4 attivi + 1 inattivo).');
    } else if (existingClients[0].count > 0) {
        console.log('[SEED] Clienti demo gia presenti, skip.');
    }

    // =========================================================
    // 8b. Demo Subscriptions (per card Azioni Richieste / Scadenze)
    // =========================================================
    console.log('[SEED] Inserimento abbonamenti demo...');
    const [existingSubs] = await connection.query(
        `SELECT COUNT(*) as count FROM client_subscriptions WHERE tenant_id = ?`, [DEMO_TENANT_ID]
    );

    if (existingSubs[0].count === 0) {
        const [subClients] = await connection.query(
            `SELECT id, first_name FROM clients WHERE tenant_id = ? ORDER BY id ASC`,
            [DEMO_TENANT_ID]
        );
        const subMap = {};
        for (const c of subClients) subMap[c.first_name] = c.id;

        // Mix di scadenze per popolare la card "In Scadenza" e gli action items
        const subsData = [
            // [first_name, plan_type, billing, days_to_end, status]
            ['Luca',   'Premium',  'monthly',   10, 'active'],   // scade tra 10gg
            ['Sofia',  'Premium',  'monthly',    5, 'active'],   // urgente: 5gg
            ['Marco',  'Base',     'monthly',   45, 'active'],   // non in finestra 14gg
            ['Giulia', 'Elite',    'quarterly',  2, 'active'],   // molto urgente: 2gg
        ];

        for (const [name, planType, cycle, daysToEnd, status] of subsData) {
            const cid = subMap[name];
            if (!cid) continue;
            await connection.query(
                `INSERT INTO client_subscriptions
                    (tenant_id, client_id, plan_type, billing_cycle, start_date, end_date, status)
                 VALUES (?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)`,
                [DEMO_TENANT_ID, cid, planType, cycle, daysToEnd, status]
            );
        }

console.log(`[SEED] ${subsData.length} abbonamenti attivi demo creati.`);
    } else {
        console.log('[SEED] Abbonamenti demo gia presenti, skip active.');
    }

    // Sub storiche (idempotente): assicura che Giulia abbia storia >12 mesi e Andrea sia dormiente
    const [subClientsHist] = await connection.query(
        `SELECT id, first_name FROM clients WHERE tenant_id = ? AND first_name IN ('Giulia','Andrea')`,
        [DEMO_TENANT_ID]
    );
    for (const c of subClientsHist) {
        const [existing] = await connection.query(
            `SELECT COUNT(*) as cnt FROM client_subscriptions
             WHERE client_id = ? AND status = 'expired'`,
            [c.id]
        );
        if (existing[0].cnt > 0) continue;

        if (c.first_name === 'Giulia') {
            await connection.query(
                `INSERT INTO client_subscriptions
                    (tenant_id, client_id, plan_type, billing_cycle, start_date, end_date, status)
                 VALUES (?, ?, 'Elite', 'quarterly',
                         DATE_SUB(CURDATE(), INTERVAL 450 DAY),
                         DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'expired')`,
                [DEMO_TENANT_ID, c.id]
            );
        } else if (c.first_name === 'Andrea') {
            await connection.query(
                `INSERT INTO client_subscriptions
                    (tenant_id, client_id, plan_type, billing_cycle, start_date, end_date, status)
                 VALUES (?, ?, 'Base', 'monthly',
                         DATE_SUB(CURDATE(), INTERVAL 180 DAY),
                         DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'expired')`,
                [DEMO_TENANT_ID, c.id]
            );
        }
    }
    console.log('[SEED] Sub storiche (top/vecchio/dormiente) verificate.');

    // =========================================================
    // 8c. Demo body measurements (per check corporei scaduti / primo check mancante)
    // =========================================================
    console.log('[SEED] Inserimento misurazioni corporee demo...');
    const [existingBm] = await connection.query(
        `SELECT COUNT(*) as count FROM body_measurements WHERE tenant_id = ?`, [DEMO_TENANT_ID]
    );

    if (existingBm[0].count === 0) {
        const [bmClients] = await connection.query(
            `SELECT id, first_name FROM clients WHERE tenant_id = ? ORDER BY id ASC`,
            [DEMO_TENANT_ID]
        );
        const bmMap = {};
        for (const c of bmClients) bmMap[c.first_name] = c.id;

        // Sofia e Giulia: ultima misurazione > 30gg fa (trigger "checkin_overdue")
        // Luca e Marco: nessuna misurazione (trigger "new_no_check")
        const bmData = [
            ['Sofia',  45, 58.0, 22.5, 24.0],  // 45gg fa
            ['Giulia', 38, 55.0, 18.0, 26.5],  // 38gg fa
        ];

        for (const [name, daysAgo, weight, bodyFat, muscle] of bmData) {
            const cid = bmMap[name];
            if (!cid) continue;
            await connection.query(
                `INSERT INTO body_measurements
                    (tenant_id, client_id, measurement_date, weight_kg, body_fat_percentage, muscle_mass_kg, notes)
                 VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?, ?, ?)`,
                [DEMO_TENANT_ID, cid, daysAgo, weight, bodyFat, muscle, 'Misurazione demo']
            );
        }
        console.log(`[SEED] ${bmData.length} misurazioni demo create (Sofia e Giulia > 30gg).`);
    } else {
        console.log('[SEED] Misurazioni corporee demo gia presenti, skip.');
    }

    // Get client IDs (needed for subsequent sections)
    const [insertedClients] = await connection.query(
        `SELECT id, first_name, user_id FROM clients WHERE tenant_id = ? ORDER BY id ASC`,
        [DEMO_TENANT_ID]
    );
    const clientMap = {};
    for (const c of insertedClients) {
        clientMap[c.first_name] = c.id;
    }

    if (insertedClients.length > 0) {
        // =========================================================
        // 9. Demo Achievements
        // =========================================================
        const [existingAch] = await connection.query(
            `SELECT COUNT(*) as count FROM achievements WHERE tenant_id = ?`, [DEMO_TENANT_ID]
        );
        console.log('[SEED] Inserimento achievements demo...');

        const achievements = existingAch[0].count > 0 ? [] : [
            // Workout category
            [DEMO_TENANT_ID, 'Prima Sessione', 'Completa il tuo primo allenamento', null, 'workout', 'common', 50, 1],
            [DEMO_TENANT_ID, '10 Sessioni', 'Completa 10 allenamenti', null, 'workout', 'uncommon', 100, 10],
            [DEMO_TENANT_ID, '50 Sessioni', 'Completa 50 allenamenti', null, 'workout', 'rare', 250, 50],
            [DEMO_TENANT_ID, '100 Sessioni', 'Completa 100 allenamenti', null, 'workout', 'epic', 500, 100],
            [DEMO_TENANT_ID, 'Maratoneta', 'Completa 250 allenamenti', null, 'workout', 'legendary', 1000, 250],
            // Streak category
            [DEMO_TENANT_ID, 'Costanza', 'Mantieni una streak di 7 giorni', null, 'streak', 'common', 75, 7],
            [DEMO_TENANT_ID, 'Determinato', 'Mantieni una streak di 14 giorni', null, 'streak', 'uncommon', 150, 14],
            [DEMO_TENANT_ID, 'Inarrestabile', 'Mantieni una streak di 30 giorni', null, 'streak', 'rare', 300, 30],
            [DEMO_TENANT_ID, 'Leggenda', 'Mantieni una streak di 60 giorni', null, 'streak', 'epic', 600, 60],
            // Level category
            [DEMO_TENANT_ID, 'Livello 5', 'Raggiungi il livello 5', null, 'level', 'common', 50, 5],
            [DEMO_TENANT_ID, 'Livello 10', 'Raggiungi il livello 10', null, 'level', 'uncommon', 100, 10],
            [DEMO_TENANT_ID, 'Livello 20', 'Raggiungi il livello 20', null, 'level', 'rare', 200, 20],
            [DEMO_TENANT_ID, 'Livello 30', 'Raggiungi il livello 30', null, 'level', 'epic', 400, 30],
            // Social category
            [DEMO_TENANT_ID, 'Primo Check-in', 'Completa il tuo primo check-in giornaliero', null, 'social', 'common', 25, 1],
            [DEMO_TENANT_ID, 'Social Butterfly', 'Partecipa a 3 sfide', null, 'social', 'uncommon', 100, 3],
        ];

        for (const [tid, name, desc, icon, category, rarity, xpReward, reqValue] of achievements) {
            await connection.query(
                `INSERT IGNORE INTO achievements (tenant_id, name, description, icon_url, category, rarity, xp_reward, requirement_value, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [tid, name, desc, icon, category, rarity, xpReward, reqValue]
            );
        }

        // Get achievement IDs
        const [achievementRows] = await connection.query(
            `SELECT id, name FROM achievements WHERE tenant_id = ?`,
            [DEMO_TENANT_ID]
        );
        const achievementMap = {};
        for (const a of achievementRows) {
            achievementMap[a.name] = a.id;
        }

        // =========================================================
        // 10. User Achievements (sbloccati)
        // =========================================================
        console.log('[SEED] Inserimento user achievements demo...');

        // Luca (client user) — unlocked some achievements
        if (clientId && achievementMap['Prima Sessione']) {
            const lucaAchievements = [
                [clientId, achievementMap['Prima Sessione'], 1, 'NOW() - INTERVAL 30 DAY'],
                [clientId, achievementMap['10 Sessioni'], 10, 'NOW() - INTERVAL 15 DAY'],
                [clientId, achievementMap['Costanza'], 7, 'NOW() - INTERVAL 10 DAY'],
                [clientId, achievementMap['Determinato'], 14, 'NOW() - INTERVAL 3 DAY'],
                [clientId, achievementMap['Livello 5'], 5, 'NOW() - INTERVAL 20 DAY'],
                [clientId, achievementMap['Livello 10'], 10, 'NOW() - INTERVAL 7 DAY'],
                [clientId, achievementMap['Primo Check-in'], 1, 'NOW() - INTERVAL 25 DAY'],
            ];

            for (const [userId, achId, progValue, dateExpr] of lucaAchievements) {
                await connection.query(
                    `INSERT IGNORE INTO user_achievements (user_id, achievement_id, progress_value, unlocked_at, is_notified)
                     VALUES (?, ?, ?, ${dateExpr}, 1)`,
                    [userId, achId, progValue]
                );
            }
        }

        // =========================================================
        // 11. XP Transactions (points_transactions)
        // =========================================================
        console.log('[SEED] Inserimento transazioni XP demo...');

        const [existingTx] = await connection.query(
            `SELECT COUNT(*) as count FROM points_transactions WHERE tenant_id = ?`, [DEMO_TENANT_ID]
        );

        if (existingTx[0].count === 0) {
            const lucaClientId = clientMap['Luca'];
            const sofiaClientId = clientMap['Sofia'];
            const marcoClientId = clientMap['Marco'];
            const giuliaClientId = clientMap['Giulia'];

            const xpTransactions = [
                // Luca — 1250 XP total
                [lucaClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Push Day', '30 DAY'],
                [lucaClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Pull Day', '28 DAY'],
                [lucaClientId, 75, 'streak', 'streak', null, 'Streak 7 giorni raggiunta!', '25 DAY'],
                [lucaClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Leg Day', '22 DAY'],
                [lucaClientId, 100, 'achievement', 'achievement', null, '10 sessioni completate!', '20 DAY'],
                [lucaClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Full Body', '18 DAY'],
                [lucaClientId, 50, 'checkin', 'checkin', null, 'Check-in giornaliero', '15 DAY'],
                [lucaClientId, 150, 'streak', 'streak', null, 'Streak 14 giorni!', '10 DAY'],
                [lucaClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Upper Body', '7 DAY'],
                [lucaClientId, 100, 'bonus', null, null, 'Bonus XP dal trainer', '5 DAY'],
                [lucaClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Push Day', '3 DAY'],
                [lucaClientId, 200, 'level_up', null, null, 'Level Up! Livello 13', '2 DAY'],
                [lucaClientId, 225, 'workout', 'workout', null, 'Allenamento completato + bonus streak', '1 DAY'],
                // Sofia — 2100 XP total
                [sofiaClientId, 100, 'workout', 'workout', null, 'Sessione HIIT completata', '20 DAY'],
                [sofiaClientId, 200, 'streak', 'streak', null, 'Streak 14 giorni!', '15 DAY'],
                [sofiaClientId, 300, 'challenge', 'challenge', null, 'Sfida completata: 10km Run', '10 DAY'],
                [sofiaClientId, 500, 'achievement', 'achievement', null, '50 sessioni completate!', '7 DAY'],
                [sofiaClientId, 300, 'streak', 'streak', null, 'Streak 30 giorni!', '5 DAY'],
                [sofiaClientId, 200, 'bonus', null, null, 'Bonus XP obiettivo peso raggiunto', '3 DAY'],
                [sofiaClientId, 500, 'workout', 'workout', null, 'Serie di 5 allenamenti questa settimana', '2 DAY'],
                // Marco — 450 XP total
                [marcoClientId, 50, 'workout', 'workout', null, 'Primo allenamento completato!', '15 DAY'],
                [marcoClientId, 50, 'checkin', 'checkin', null, 'Primo check-in!', '14 DAY'],
                [marcoClientId, 100, 'achievement', 'achievement', null, 'Achievement: Prima Sessione', '13 DAY'],
                [marcoClientId, 50, 'workout', 'workout', null, 'Allenamento completato - Intro', '10 DAY'],
                [marcoClientId, 100, 'bonus', null, null, 'Bonus benvenuto dal trainer', '8 DAY'],
                [marcoClientId, 100, 'workout', 'workout', null, 'Allenamento completato - Base', '5 DAY'],
                // Giulia — 3500 XP total
                [giuliaClientId, 500, 'workout', 'workout', null, 'Settimana perfetta - 6 sessioni', '20 DAY'],
                [giuliaClientId, 600, 'streak', 'streak', null, 'Streak 30 giorni!', '15 DAY'],
                [giuliaClientId, 400, 'challenge', 'challenge', null, 'Sfida completata: Squat Challenge', '12 DAY'],
                [giuliaClientId, 500, 'achievement', 'achievement', null, '100 sessioni completate!', '10 DAY'],
                [giuliaClientId, 600, 'streak', 'streak', null, 'Streak 45 giorni!', '7 DAY'],
                [giuliaClientId, 400, 'bonus', null, null, 'Bonus eccellenza dal trainer', '5 DAY'],
                [giuliaClientId, 500, 'workout', 'workout', null, 'Record personale Deadlift!', '2 DAY'],
            ];

            for (const [cId, points, txType, refType, refId, desc, interval] of xpTransactions) {
                if (cId) {
                    await connection.query(
                        `INSERT INTO points_transactions (tenant_id, client_id, points, transaction_type, reference_type, reference_id, description, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ${interval})`,
                        [DEMO_TENANT_ID, cId, points, txType, refType, refId, desc]
                    );
                }
            }

            console.log('[SEED] Transazioni XP demo create.');
        }

        // =========================================================
        // 12. Demo Challenges
        // =========================================================
        console.log('[SEED] Inserimento sfide demo...');

        const [existingChallenges] = await connection.query(
            `SELECT COUNT(*) as count FROM challenges WHERE tenant_id = ?`, [DEMO_TENANT_ID]
        );

        if (existingChallenges[0].count === 0 && ownerId) {
            const challengesData = [
                // Active challenge (ongoing)
                ['Sfida 30 Giorni di Costanza', 'Completa almeno un allenamento al giorno per 30 giorni consecutivi. Chi resiste vince!', 'streak', 30, -15, 30, 500, ownerId],
                // Active challenge (ongoing)
                ['100 Push-up Challenge', 'Raggiungi 100 push-up in una singola sessione. Allenati ogni giorno per arrivarci!', 'reps', 100, -10, 20, 200, ownerId],
                // Upcoming challenge
                ['Maratona di Febbraio', 'Corri un totale di 42km durante il mese. Ogni corsa conta!', 'distance_km', 42, 5, 35, 350, ownerId],
                // Past challenge (completed)
                ['Sfida Natalizia', 'Completa 20 allenamenti durante le feste natalizie. Non mollare!', 'workouts', 20, -60, -30, 300, ownerId],
            ];

            const challengeIds = [];
            for (const [name, desc, type, target, startOffset, endOffset, xpReward, createdBy] of challengesData) {
                const [result] = await connection.query(
                    `INSERT INTO challenges (tenant_id, name, description, challenge_type, target_value, start_date, end_date, xp_reward, created_by, is_active)
                     VALUES (?, ?, ?, ?, ?, CURDATE() + INTERVAL ? DAY, CURDATE() + INTERVAL ? DAY, ?, ?, 1)`,
                    [DEMO_TENANT_ID, name, desc, type, target, startOffset, endOffset, xpReward, createdBy]
                );
                challengeIds.push(result.insertId);
            }

            // Add participants to challenges
            const lucaClientId = clientMap['Luca'];
            const sofiaClientId = clientMap['Sofia'];
            const marcoClientId = clientMap['Marco'];
            const giuliaClientId = clientMap['Giulia'];

            // Challenge 1 (30 giorni costanza) — all active clients join
            if (challengeIds[0]) {
                if (lucaClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 12, 'active')`, [challengeIds[0], lucaClientId]);
                if (sofiaClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 25, 'active')`, [challengeIds[0], sofiaClientId]);
                if (giuliaClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 15, 'active')`, [challengeIds[0], giuliaClientId]);
            }

            // Challenge 2 (100 push-up) — Luca and Marco
            if (challengeIds[1]) {
                if (lucaClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 65, 'active')`, [challengeIds[1], lucaClientId]);
                if (marcoClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 30, 'active')`, [challengeIds[1], marcoClientId]);
            }

            // Challenge 4 (Natalizia — past, completed) — Giulia completed, Sofia abandoned
            if (challengeIds[3]) {
                if (giuliaClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 20, 'completed')`, [challengeIds[3], giuliaClientId]);
                if (sofiaClientId) await connection.query(`INSERT IGNORE INTO challenge_participants (challenge_id, client_id, current_value, status) VALUES (?, ?, 14, 'abandoned')`, [challengeIds[3], sofiaClientId]);
            }

            console.log('[SEED] 4 sfide demo create con partecipanti.');
        }

        // =========================================================
        // 13. Client Titles (titoli sbloccati)
        // =========================================================
        console.log('[SEED] Inserimento titoli sbloccati demo...');

        const [existingClientTitles] = await connection.query(
            `SELECT COUNT(*) as count FROM client_titles WHERE tenant_id = ?`, [DEMO_TENANT_ID]
        );

        if (existingClientTitles[0].count === 0) {
            // Get some title IDs from achievement_titles
            const [availableTitles] = await connection.query(
                `SELECT id, title_name FROM achievement_titles WHERE tenant_id = ? LIMIT 10`,
                [DEMO_TENANT_ID]
            );

            if (availableTitles.length >= 3) {
                const lucaClientId = clientMap['Luca'];
                const sofiaClientId = clientMap['Sofia'];
                const giuliaClientId = clientMap['Giulia'];

                // Luca: 2 titles unlocked, first one displayed
                if (lucaClientId) {
                    await connection.query(
                        `INSERT IGNORE INTO client_titles (tenant_id, client_id, title_id, unlocked_at, is_displayed)
                         VALUES (?, ?, ?, NOW() - INTERVAL 10 DAY, 1)`,
                        [DEMO_TENANT_ID, lucaClientId, availableTitles[0].id]
                    );
                    if (availableTitles.length > 1) {
                        await connection.query(
                            `INSERT IGNORE INTO client_titles (tenant_id, client_id, title_id, unlocked_at, is_displayed)
                             VALUES (?, ?, ?, NOW() - INTERVAL 5 DAY, 0)`,
                            [DEMO_TENANT_ID, lucaClientId, availableTitles[1].id]
                        );
                    }
                }

                // Sofia: 3 titles
                if (sofiaClientId) {
                    await connection.query(
                        `INSERT IGNORE INTO client_titles (tenant_id, client_id, title_id, unlocked_at, is_displayed)
                         VALUES (?, ?, ?, NOW() - INTERVAL 15 DAY, 0)`,
                        [DEMO_TENANT_ID, sofiaClientId, availableTitles[0].id]
                    );
                    if (availableTitles.length > 1) {
                        await connection.query(
                            `INSERT IGNORE INTO client_titles (tenant_id, client_id, title_id, unlocked_at, is_displayed)
                             VALUES (?, ?, ?, NOW() - INTERVAL 10 DAY, 1)`,
                            [DEMO_TENANT_ID, sofiaClientId, availableTitles[1].id]
                        );
                    }
                    if (availableTitles.length > 2) {
                        await connection.query(
                            `INSERT IGNORE INTO client_titles (tenant_id, client_id, title_id, unlocked_at, is_displayed)
                             VALUES (?, ?, ?, NOW() - INTERVAL 3 DAY, 0)`,
                            [DEMO_TENANT_ID, sofiaClientId, availableTitles[2].id]
                        );
                    }
                }

                // Giulia: 5 titles (she's the most advanced)
                if (giuliaClientId) {
                    for (let i = 0; i < Math.min(5, availableTitles.length); i++) {
                        await connection.query(
                            `INSERT IGNORE INTO client_titles (tenant_id, client_id, title_id, unlocked_at, is_displayed)
                             VALUES (?, ?, ?, NOW() - INTERVAL ? DAY, ?)`,
                            [DEMO_TENANT_ID, giuliaClientId, availableTitles[i].id, 20 - (i * 3), i === 2 ? 1 : 0]
                        );
                    }
                }

                console.log('[SEED] Titoli sbloccati demo creati.');
            }
        }
    }

    // =========================================================
    // 14. Ricalcolo tag automatici (fidelizzazione)
    // =========================================================
    console.log('[SEED] Ricalcolo tag clienti (nuovo/medio/top/vecchio/dormiente)...');
    try {
        const clientTagsService = require('../src/services/clientTags.service');
        const result = await clientTagsService.recomputeAutoTags(DEMO_TENANT_ID);
        console.log(`[SEED] ${result.assignments} tag auto assegnati a ${result.clients} clienti.`);
    } catch (err) {
        console.log(`[SEED] Ricalcolo tag: ${err.message}`);
    }

    // =========================================================
    // 15. File demo cartella cliente (Luca)
    // =========================================================
    const [clientFileCount] = await connection.query(
        `SELECT COUNT(*) as count FROM client_files WHERE tenant_id = ?`, [DEMO_TENANT_ID]
    );
    if (clientFileCount[0].count === 0) {
        console.log('[SEED] Generazione file demo per la Cartella Cliente...');
        try {
            const PDFDocument = require('pdfkit');
            const { v4: uuidv4 } = require('uuid');

            const lucaRow = await connection.query(
                `SELECT id FROM clients WHERE tenant_id = ? AND first_name = 'Luca' LIMIT 1`,
                [DEMO_TENANT_ID]
            );
            const lucaId = lucaRow[0]?.[0]?.id;
            const [ownerUser] = await connection.query(
                `SELECT id FROM users WHERE tenant_id = ? AND email = 'personaltrainer@demo.local' LIMIT 1`,
                [DEMO_TENANT_ID]
            );
            const ownerId = ownerUser[0]?.id;

            if (lucaId && ownerId) {
                const docsDir = path.join(__dirname, '..', 'uploads', 'documents', DEMO_TENANT_ID);
                fs.mkdirSync(docsDir, { recursive: true });

                const buildPdf = (title, lines) => new Promise((resolve, reject) => {
                    const filename = `${uuidv4()}.pdf`;
                    const fullPath = path.join(docsDir, filename);
                    const doc = new PDFDocument({ size: 'A4', margin: 50 });
                    const stream = fs.createWriteStream(fullPath);
                    stream.on('finish', () => resolve({ fullPath, filename, size: stream.bytesWritten }));
                    stream.on('error', reject);
                    doc.pipe(stream);
                    doc.fontSize(20).text(title, { align: 'center' });
                    doc.moveDown(2);
                    doc.fontSize(11);
                    lines.forEach(l => { doc.text(l); doc.moveDown(0.3); });
                    doc.moveDown(2);
                    doc.fontSize(9).fillColor('#888')
                        .text('File demo generato automaticamente - Atlas Performance', { align: 'center' });
                    doc.end();
                });

                const files = [
                    {
                        category: 'medical',
                        originalName: 'certificato_medico.pdf',
                        description: 'Certificato medico sportivo agonistico',
                        title: 'Certificato Medico',
                        lines: [
                            'Cliente: Luca Cliente',
                            'Tipo visita: Idoneita sportiva agonistica',
                            'Validita: 12 mesi',
                            '',
                            'Risultati esami:',
                            '- ECG a riposo: nella norma',
                            '- ECG sotto sforzo: nella norma',
                            '- Spirometria: valori standard',
                            '- Pressione arteriosa: 120/80 mmHg'
                        ]
                    },
                    {
                        category: 'contract',
                        originalName: 'contratto_abbonamento.pdf',
                        description: 'Contratto di abbonamento personal training',
                        title: 'Contratto Personal Training',
                        lines: [
                            'Cliente: Luca Cliente',
                            'Piano: Premium Mensile',
                            'Sessioni incluse: 8 al mese',
                            'Durata: 1 mese rinnovabile',
                            '',
                            'Il cliente dichiara di aver letto e accettato',
                            'le condizioni generali di servizio.'
                        ]
                    },
                    {
                        category: 'nutrition',
                        originalName: 'piano_nutrizionale.pdf',
                        description: 'Piano alimentare bilanciato personalizzato',
                        title: 'Piano Nutrizionale',
                        lines: [
                            'Cliente: Luca Cliente',
                            'Obiettivo: Ricomposizione corporea',
                            'Kcal totali: 2400 kcal/giorno',
                            'Macro: P 180g | C 280g | F 70g',
                            '',
                            'Colazione: avena + frutta + yogurt greco',
                            'Pranzo: riso basmati + pollo + verdure',
                            'Spuntino: frutta secca + frutta',
                            'Cena: pesce azzurro + patate + insalata'
                        ]
                    }
                ];

                for (const f of files) {
                    const { fullPath, size } = await buildPdf(f.title, f.lines);
                    await connection.query(
                        `INSERT INTO client_files
                         (tenant_id, client_id, filename, original_name, file_path, mime_type,
                          file_size_bytes, category, description, uploaded_by)
                         VALUES (?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?)`,
                        [DEMO_TENANT_ID, lucaId, path.basename(fullPath), f.originalName,
                         fullPath, size, f.category, f.description, ownerId]
                    );
                }
                console.log(`[SEED] ${files.length} file demo generati per Luca Cliente.`);
            }
        } catch (err) {
            console.log(`[SEED] File demo: ${err.message}`);
        }
    }

    // =========================================================
    // Riepilogo
    // =========================================================
    const [titleCount] = await connection.query('SELECT COUNT(*) as count FROM achievement_titles');
    const [mgCount] = await connection.query('SELECT COUNT(*) as count FROM muscle_groups');
    const [mcCount] = await connection.query('SELECT COUNT(*) as count FROM mesocycles');
    const [ntCount] = await connection.query('SELECT COUNT(*) as count FROM notification_templates');
    const [chatCount] = await connection.query('SELECT COUNT(*) as count FROM conversations WHERE tenant_id = ?', [DEMO_TENANT_ID]);
    const [msgCount] = await connection.query('SELECT COUNT(*) as count FROM messages');
    const [clCount] = await connection.query('SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?', [DEMO_TENANT_ID]);
    const [achCount] = await connection.query('SELECT COUNT(*) as count FROM achievements WHERE tenant_id = ?', [DEMO_TENANT_ID]);
    const [chCount] = await connection.query('SELECT COUNT(*) as count FROM challenges WHERE tenant_id = ?', [DEMO_TENANT_ID]);
    const [xpCount] = await connection.query('SELECT COUNT(*) as count FROM points_transactions WHERE tenant_id = ?', [DEMO_TENANT_ID]);
    const [exCount] = await connection.query('SELECT COUNT(*) as count FROM exercises');
    const [emgCount] = await connection.query('SELECT COUNT(*) as count FROM exercise_muscle_groups');
    const [cfCount] = await connection.query('SELECT COUNT(*) as count FROM client_files WHERE tenant_id = ?', [DEMO_TENANT_ID]);
    console.log(`[SEED] Completato!`);
    console.log(`  ${exCount[0].count} esercizi, ${emgCount[0].count} associazioni muscoli`);
    console.log(`  ${titleCount[0].count} titoli, ${mgCount[0].count} gruppi muscolari, ${mcCount[0].count} mesocicli`);
    console.log(`  ${ntCount[0].count} template notifiche, ${chatCount[0].count} conversazioni, ${msgCount[0].count} messaggi`);
    console.log(`  ${clCount[0].count} clienti, ${achCount[0].count} achievements, ${chCount[0].count} sfide, ${xpCount[0].count} transazioni XP`);
    console.log(`  ${cfCount[0].count} file demo cartella cliente`);
    console.log(`[SEED] Credenziali demo (password: demo1234 per tutti):`);
    console.log(`  Super Admin:  superadmin@demo.local`);
    console.log(`  PT Owner:     personaltrainer@demo.local`);
    console.log(`  Staff:        staff@demo.local`);
    console.log(`  Client:       client@demo.local`);

    await connection.end();
    process.exit(0);
}

seed().catch(err => {
    console.error('[SEED] Errore:', err.message);
    process.exit(1);
});
