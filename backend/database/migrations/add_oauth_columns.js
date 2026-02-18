/**
 * Migration: Add OAuth columns to users table + create oauth_states table
 * Run: node database/migrations/add_oauth_columns.js (from backend/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    console.log('[OAUTH MIGRATION] Connessione al database...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pt_saas_db',
        multipleStatements: true
    });

    console.log('[OAUTH MIGRATION] Connesso.');

    // 1. Add oauth columns to users (if not exists)
    try {
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'oauth_provider'`,
            [process.env.DB_NAME || 'pt_saas_db']
        );

        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE users
                    ADD COLUMN oauth_provider VARCHAR(20) DEFAULT NULL AFTER password_hash,
                    ADD COLUMN oauth_provider_id VARCHAR(255) DEFAULT NULL AFTER oauth_provider,
                    ADD INDEX idx_users_oauth (oauth_provider, oauth_provider_id)
            `);
            console.log('[OAUTH MIGRATION] ✓ Colonne oauth_provider e oauth_provider_id aggiunte a users');
        } else {
            console.log('[OAUTH MIGRATION] ⏭ Colonne OAuth già presenti in users');
        }
    } catch (err) {
        console.error('[OAUTH MIGRATION] Errore aggiunta colonne:', err.message);
    }

    // 2. Create oauth_states table
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS oauth_states (
                id INT AUTO_INCREMENT PRIMARY KEY,
                state VARCHAR(128) NOT NULL,
                provider VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                UNIQUE KEY uq_oauth_state (state),
                INDEX idx_oauth_expires (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[OAUTH MIGRATION] ✓ Tabella oauth_states creata');
    } catch (err) {
        console.error('[OAUTH MIGRATION] Errore creazione oauth_states:', err.message);
    }

    console.log('[OAUTH MIGRATION] ✅ Migration completata!');
    await connection.end();
    process.exit(0);
}

migrate().catch(err => {
    console.error('[OAUTH MIGRATION] ❌ ERRORE:', err.message);
    process.exit(1);
});
