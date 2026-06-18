/**
 * Migration Runner
 * - Applica schema.sql alla prima esecuzione
 * - Esegue migration incrementali da database/migrations/*.sql
 * - Supporta DELIMITER //...END// (workaround driver mysql2)
 * - Supporta ALTER TABLE ... ADD COLUMN IF NOT EXISTS (workaround MySQL 8)
 * - Traccia le migration applicate in schema_migrations
 * Uso: npm run migrate (da backend/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'pt_saas_db';

async function main() {
    console.log('[MIGRATE] Connessione al database...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: false,
    });

    console.log(`[MIGRATE] Creazione database "${DB_NAME}" se non esiste...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${DB_NAME}\``);

    await ensureMigrationsTable(connection);

    const schemaApplied = await applySchema(connection);
    if (schemaApplied) {
        const [tables] = await connection.query(
            `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
            [DB_NAME]
        );
        console.log(`[MIGRATE] Schema applicato. ${tables[0].count} tabelle presenti.`);
    }

    await applyMigrations(connection);

    await connection.end();
    console.log('[MIGRATE] Completato.');
    process.exit(0);
}

async function ensureMigrationsTable(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename VARCHAR(255) PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            execution_ms INT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

async function applySchema(connection) {
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.log('[MIGRATE] schema.sql non trovato, skip.');
        return false;
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const checksum = sha256(sql);

    const [rows] = await connection.query(
        'SELECT checksum FROM schema_migrations WHERE filename = ?',
        ['__schema__']
    );
    if (rows.length > 0 && rows[0].checksum === checksum) {
        console.log('[MIGRATE] schema.sql già applicato (checksum match), skip.');
        return false;
    }

    console.log('[MIGRATE] Esecuzione schema.sql...');
    const t0 = Date.now();
    const statements = splitStatements(sql);
    for (const stmt of statements) {
        await executeStatementSafe(connection, stmt, { ignoreExisting: true });
    }
    const ms = Date.now() - t0;

    if (rows.length > 0) {
        await connection.query(
            'UPDATE schema_migrations SET checksum = ?, applied_at = NOW(), execution_ms = ? WHERE filename = ?',
            [checksum, ms, '__schema__']
        );
    } else {
        await connection.query(
            'INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES (?, ?, ?)',
            ['__schema__', checksum, ms]
        );
    }
    return true;
}

async function applyMigrations(connection) {
    const migrationsDir = path.resolve(__dirname, '../../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.log('[MIGRATE] Cartella migrations non trovata, skip.');
        return;
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const [appliedRows] = await connection.query(
        'SELECT filename FROM schema_migrations WHERE filename != ?',
        ['__schema__']
    );
    const applied = new Set(appliedRows.map(r => r.filename));

    let appliedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const file of files) {
        if (applied.has(file)) {
            skippedCount++;
            continue;
        }

        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        const checksum = sha256(sql);

        process.stdout.write(`[MIGRATE] ${file} ... `);
        const t0 = Date.now();

        try {
            const statements = splitStatements(sql);
            for (const stmt of statements) {
                await executeStatementSafe(connection, stmt, { ignoreExisting: true });
            }
            const ms = Date.now() - t0;
            await connection.query(
                'INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES (?, ?, ?)',
                [file, checksum, ms]
            );
            console.log(`OK (${ms}ms)`);
            appliedCount++;
        } catch (err) {
            console.log(`FAIL: ${err.message}`);
            failedCount++;
            // Fail-fast: le migration DDL hanno dipendenze ordinate, una rotta
            // può corrompere quelle successive. Stop al primo fallimento.
            console.log(`[MIGRATE] Riepilogo parziale: ${appliedCount} applicate, ${skippedCount} già applicate, ${failedCount} fallita.`);
            throw err;
        }
    }

    console.log(`[MIGRATE] Riepilogo: ${appliedCount} applicate, ${skippedCount} già applicate, ${failedCount} fallite.`);
}

/**
 * Splitta SQL in singoli statement gestendo:
 * - Commenti -- e blocchi /* * /
 * - String literals 'foo' e "bar"
 * - Direttive DELIMITER (cambia il separatore di statement)
 */
function splitStatements(sql) {
    const statements = [];
    let current = '';
    let delimiter = ';';
    let i = 0;

    while (i < sql.length) {
        const ch = sql[i];
        const next = sql[i + 1];

        // Commenti single-line --
        if (ch === '-' && next === '-') {
            const eol = sql.indexOf('\n', i);
            i = eol === -1 ? sql.length : eol;
            continue;
        }
        // Commenti block /* */
        if (ch === '/' && next === '*') {
            const end = sql.indexOf('*/', i + 2);
            i = end === -1 ? sql.length : end + 2;
            continue;
        }
        // String literals
        if (ch === "'" || ch === '"' || ch === '`') {
            const quote = ch;
            current += ch;
            i++;
            while (i < sql.length) {
                const c = sql[i];
                current += c;
                if (c === '\\' && i + 1 < sql.length) {
                    current += sql[i + 1];
                    i += 2;
                    continue;
                }
                i++;
                if (c === quote) break;
            }
            continue;
        }
        // DELIMITER direttiva: deve stare a inizio riga (eventuali spazi a sinistra ok)
        const lineStart = current.length === 0 || current.endsWith('\n');
        if (lineStart) {
            const rest = sql.substring(i);
            const m = rest.match(/^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(\r?\n|$)/i);
            if (m) {
                // Flush current
                const trimmed = current.trim();
                if (trimmed) statements.push(trimmed);
                current = '';
                delimiter = m[1];
                i += m[0].length;
                continue;
            }
        }
        // Check end-of-statement
        if (sql.substring(i, i + delimiter.length) === delimiter) {
            const trimmed = current.trim();
            if (trimmed) statements.push(trimmed);
            current = '';
            i += delimiter.length;
            continue;
        }
        current += ch;
        i++;
    }
    const tail = current.trim();
    if (tail) statements.push(tail);

    return statements;
}

/**
 * Esegue uno statement, applicando pre-processing per:
 * - ALTER TABLE ... ADD COLUMN IF NOT EXISTS (non supportato da MySQL 8)
 * Con ignoreExisting=true ignora errori di duplicato (già applicato).
 */
async function executeStatementSafe(connection, stmt, opts = {}) {
    if (!stmt || !stmt.trim()) return;

    const preprocessed = await preprocessIfNotExists(connection, stmt);
    if (preprocessed === null) {
        // Skipped (colonna già esistente)
        return;
    }

    try {
        if (process.env.MIGRATE_DEBUG === '1') {
            console.log('  >>', preprocessed.substring(0, 120).replace(/\s+/g, ' '));
        }
        await connection.query(preprocessed);
    } catch (err) {
        if (opts.ignoreExisting && isAlreadyExistsError(err)) {
            return;
        }
        throw err;
    }
}

/**
 * Riscrive "ALTER TABLE x ADD COLUMN IF NOT EXISTS col definition"
 * in "ALTER TABLE x ADD COLUMN col definition" se la colonna non esiste,
 * o ritorna null se già esiste.
 * Altre forme (CREATE TABLE IF NOT EXISTS, CREATE INDEX, ecc.) sono passate as-is.
 */
async function preprocessIfNotExists(connection, stmt) {
    const regex = /^\s*ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+`?(\w+)`?\s+([\s\S]+)$/i;
    const m = stmt.match(regex);
    if (!m) return stmt;

    const [, table, column, definition] = m;
    const [rows] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [DB_NAME, table, column]
    );
    if (rows.length > 0) {
        return null; // skip
    }
    return `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`;
}

function isAlreadyExistsError(err) {
    // Solo errori "questo oggetto esisteva gia", NON conflitti di naming con altri oggetti.
    // ER_FK_DUP_NAME è escluso: è quasi sempre un bug (FK name collide tra tabelle diverse).
    const code = err.code || '';
    return (
        code === 'ER_DUP_FIELDNAME' ||      // duplicate column on ALTER ADD
        code === 'ER_DUP_KEYNAME' ||        // duplicate index name
        code === 'ER_TABLE_EXISTS_ERROR'    // CREATE TABLE without IF NOT EXISTS on existing
    );
}

function sha256(s) {
    return crypto.createHash('sha256').update(s).digest('hex');
}

main().catch(err => {
    console.error('[MIGRATE] Errore fatale:', err);
    process.exit(1);
});
