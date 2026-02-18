/**
 * Migration Runner
 * Esegue lo schema SQL completo per creare tutte le tabelle del database.
 * Uso: npm run migrate (da backend/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const mysql = require('mysql2/promise');

async function migrate() {
    console.log('[MIGRATE] Connessione al database...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'pt_saas_db';

    // Crea il database se non esiste
    console.log(`[MIGRATE] Creazione database "${dbName}" se non esiste...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);

    // Leggi ed esegui lo schema
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[MIGRATE] Esecuzione schema.sql...');
    await connection.query(sql);

    // Conta le tabelle create
    const [tables] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
        [dbName]
    );
    console.log(`[MIGRATE] Schema applicato con successo! ${tables[0].count} tabelle presenti.`);

    // Esegui migration files in ordine
    const migrationsDir = path.resolve(__dirname, '../../database/migrations');
    if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`[MIGRATE] Esecuzione migration: ${file}...`);
            try {
                const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await connection.query(migrationSql);
                console.log(`[MIGRATE] ${file} applicata con successo.`);
            } catch (err) {
                // Ignora errori di migration gia applicata (es. colonna gia esiste)
                console.log(`[MIGRATE] ${file} - ${err.message.includes('Duplicate') || err.message.includes('already exists') ? 'gia applicata, skip.' : 'ERRORE: ' + err.message}`);
            }
        }
    }

    await connection.end();
    process.exit(0);
}

migrate().catch(err => {
    console.error('[MIGRATE] Errore:', err.message);
    process.exit(1);
});
