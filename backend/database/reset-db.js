/**
 * Reset Database
 * Droppa e ricrea il database da zero, poi esegue migrate + seed.
 * Uso: node database/reset-db.js (da backend/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function resetDB() {
    const dbName = process.env.DB_NAME || 'pt_saas_db';

    console.log('='.repeat(60));
    console.log('  Atlas - RESET DATABASE COMPLETO');
    console.log('='.repeat(60));

    // ── Step 1: Connessione senza database ──
    console.log('\n[1/4] Connessione a MySQL...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });
    console.log('  ✓ Connesso a MySQL');

    // ── Step 2: Drop e ricrea database ──
    console.log(`\n[2/4] Drop e ricreazione database "${dbName}"...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`  ✓ Database "${dbName}" eliminato`);

    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);
    console.log(`  ✓ Database "${dbName}" ricreato`);

    // ── Step 3: Esegui schema ──
    console.log('\n[3/4] Applicazione schema (tabelle)...');
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(sql);

    const [tables] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
        [dbName]
    );
    console.log(`  ✓ ${tables[0].count} tabelle create`);

    // ── Step 4: Seed dati demo ──
    console.log('\n[4/4] Inserimento dati demo...');

    // 4a. Tenant demo
    await connection.query(`
        INSERT INTO tenants (id, business_name, owner_email, subscription_plan, subscription_status, max_clients, status)
        VALUES (?, 'Demo PT Studio', 'personaltrainer@demo.local', 'professional', 'active', 9999, 'active')
    `, [DEMO_TENANT_ID]);
    console.log('  ✓ Tenant demo creato');

    // 4b. Utenti demo (password: demo1234)
    const passwordHash = await bcrypt.hash('demo1234', 12);

    const demoUsers = [
        ['superadmin@demo.local', 'super_admin', 'Super', 'Admin'],
        ['personaltrainer@demo.local', 'tenant_owner', 'Personal', 'Trainer'],
        ['staff@demo.local', 'staff', 'Marco', 'Staff'],
        ['client@demo.local', 'client', 'Luca', 'Cliente']
    ];

    for (const [email, role, firstName, lastName] of demoUsers) {
        await connection.query(`
            INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, status, email_verified_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
        `, [DEMO_TENANT_ID, email, passwordHash, role, firstName, lastName]);
    }
    console.log('  ✓ 4 utenti demo creati');

    // 4c. Gruppi muscolari
    const muscleGroups = [
        ['Chest', 'Petto', 'upper_body'], ['Back', 'Schiena', 'upper_body'],
        ['Shoulders', 'Spalle', 'upper_body'], ['Biceps', 'Bicipiti', 'upper_body'],
        ['Triceps', 'Tricipiti', 'upper_body'], ['Forearms', 'Avambracci', 'upper_body'],
        ['Quadriceps', 'Quadricipiti', 'lower_body'], ['Hamstrings', 'Femorali', 'lower_body'],
        ['Glutes', 'Glutei', 'lower_body'], ['Calves', 'Polpacci', 'lower_body'],
        ['Hip Flexors', 'Flessori dell\'anca', 'lower_body'],
        ['Abdominals', 'Addominali', 'core'], ['Obliques', 'Obliqui', 'core'],
        ['Lower Back', 'Lombare', 'core'], ['Traps', 'Trapezio', 'upper_body'],
        ['Lats', 'Dorsali', 'upper_body'], ['Rotator Cuff', 'Cuffia dei rotatori', 'upper_body'],
        ['Adductors', 'Adduttori', 'lower_body'], ['Abductors', 'Abduttori', 'lower_body']
    ];

    for (const [name, nameIt, category] of muscleGroups) {
        await connection.query(
            `INSERT INTO muscle_groups (name, name_it, category) VALUES (?, ?, ?)`,
            [name, nameIt, category]
        );
    }
    console.log(`  ✓ ${muscleGroups.length} gruppi muscolari creati`);

    // 4d. Mesocicli
    const mesocycles = [
        ['Forza Massimale', 'strength', 'linear'], ['Forza Esplosiva', 'power', 'undulating'],
        ['Forza Resistente', 'strength_endurance', 'linear'], ['Ipertrofia Volume', 'hypertrophy', 'linear'],
        ['Ipertrofia Intensiva', 'hypertrophy', 'undulating'], ['Ipertrofia Metabolica', 'hypertrophy', 'block'],
        ['Dimagrimento Base', 'fat_loss', 'linear'], ['Ricomposizione Corporea', 'body_recomp', 'undulating'],
        ['Resistenza Aerobica', 'endurance', 'linear'], ['Condizionamento Metabolico', 'conditioning', 'undulating'],
        ['Preparazione Generale (GPP)', 'general', 'linear'], ['Peaking / Tapering', 'peaking', 'block'],
        ['Deload / Scarico', 'recovery', 'linear'], ['Preparazione Atletica', 'athletic', 'block'],
        ['Pre-Gara', 'competition', 'undulating']
    ];

    for (const [name, focus, periodization] of mesocycles) {
        await connection.query(
            `INSERT INTO mesocycles (name, focus, periodization_type) VALUES (?, ?, ?)`,
            [name, focus, periodization]
        );
    }
    console.log(`  ✓ ${mesocycles.length} mesocicli creati`);

    // 4e. Template notifiche
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
        ['subscription_expiring', 'Abbonamento in scadenza', 'Il tuo abbonamento scade tra {{days}} giorni.', 'warning', '/settings', 'high']
    ];

    for (const [key, title, message, type, actionUrl, priority] of templates) {
        await connection.query(
            `INSERT INTO notification_templates (template_key, title, message, type, action_url, priority) VALUES (?, ?, ?, ?, ?, ?)`,
            [key, title, message, type, actionUrl, priority]
        );
    }
    console.log(`  ✓ ${templates.length} template notifiche creati`);

    // 4f. Titoli gamification
    try {
        const titlesSeedPath = path.resolve(__dirname, '../../database/seeds/007_seed_titles.sql');
        if (fs.existsSync(titlesSeedPath)) {
            let titlesSql = fs.readFileSync(titlesSeedPath, 'utf8');
            titlesSql = titlesSql.replace(/^--.*$/gm, '');
            titlesSql = titlesSql.replace(/INSERT INTO achievement_titles/g, 'INSERT IGNORE INTO achievement_titles');
            titlesSql = titlesSql.replace(/\(1, '/g, `('${DEMO_TENANT_ID}', '`);
            await connection.query(titlesSql);
            console.log('  ✓ Titoli gamification caricati');
        }
    } catch (err) {
        console.log('  ⚠ Titoli gamification saltati:', err.message);
    }

    // ── Riepilogo ──
    console.log('\n' + '='.repeat(60));
    console.log('  ✅ RESET COMPLETATO CON SUCCESSO!');
    console.log('='.repeat(60));
    console.log('\n  Account demo (password: demo1234 per tutti):');
    console.log('  ┌──────────────────┬─────────────────────────┐');
    console.log('  │ Ruolo            │ Email                   │');
    console.log('  ├──────────────────┼─────────────────────────┤');
    console.log('  │ 🛡️  Super Admin   │ superadmin@demo.local   │');
    console.log('  │ 💪 PT Owner      │ personaltrainer@demo.local │');
    console.log('  │ 👤 Staff         │ staff@demo.local        │');
    console.log('  │ 🏃 Client        │ client@demo.local       │');
    console.log('  └──────────────────┴─────────────────────────┘');
    console.log('\n  Ora puoi avviare il backend: npm run dev\n');

    await connection.end();
    process.exit(0);
}

resetDB().catch(err => {
    console.error('\n❌ ERRORE:', err.message);
    if (err.code === 'ECONNREFUSED') {
        console.error('   MySQL non è in esecuzione! Avvia MySQL e riprova.');
    }
    process.exit(1);
});
