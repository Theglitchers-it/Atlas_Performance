/**
 * Client CSV Export/Import Service (Fase 8)
 * Export semplice (stringify), Import con preview + batch transaction.
 */

const { query, transaction } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CLIENT_CSV');

// Caratteri che Excel/Calc/Sheets interpretano come inizio formula
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    let s = String(val);
    // Neutralizza formula injection (CWE-1236): prefissa con apostrofo le celle
    // che iniziano con caratteri trigger di formula
    if (CSV_FORMULA_PREFIX.test(s)) {
        s = "'" + s;
    }
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

// Strip leading apostrophe se prefissa un formula-trigger char (decode export round-trip)
// Es: "'+39 333..." → "+39 333..." (inverso del prefix in csvEscape)
function stripFormulaPrefix(s) {
    if (s.length >= 2 && s[0] === "'" && CSV_FORMULA_PREFIX.test(s.slice(1))) {
        return s.slice(1);
    }
    return s;
}

function parseCSVLine(line) {
    const out = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
            if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQuote = false; }
            else cur += ch;
        } else {
            if (ch === ',') { out.push(stripFormulaPrefix(cur)); cur = ''; }
            else if (ch === '"') inQuote = true;
            else cur += ch;
        }
    }
    out.push(stripFormulaPrefix(cur));
    return out;
}

function parseCSV(buffer) {
    const text = buffer.toString('utf8').replace(/^﻿/, ''); // strip BOM
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    return { headers, rows };
}

class ClientCSVService {

    /**
     * Export CSV applicando gli stessi filtri di getAll.
     * Ritorna una stringa CSV completa.
     */
    async exportToCSV({ tenantId, filters = {} }) {
        const where = ['c.tenant_id = ?'];
        const params = [tenantId];
        if (filters.status) { where.push('c.status = ?'); params.push(filters.status); }
        if (filters.search) {
            const s = String(filters.search).replace(/[%_]/g, '\\$&');
            where.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)');
            params.push(`%${s}%`, `%${s}%`, `%${s}%`);
        }
        const rows = await query(
            `SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.status,
                    c.date_of_birth, c.gender, c.fitness_level, c.primary_goal,
                    c.current_weight_kg, c.height_cm,
                    pt.first_name AS trainer_first_name, pt.last_name AS trainer_last_name
             FROM clients c
             LEFT JOIN v_client_activity_summary vca ON vca.client_id = c.id
             LEFT JOIN users pt ON pt.id = vca.primary_trainer_id
             WHERE ${where.join(' AND ')}
             ORDER BY c.last_name, c.first_name`,
            params
        );

        const headers = [
            'id', 'nome', 'cognome', 'email', 'telefono', 'status',
            'data_nascita', 'genere', 'livello', 'obiettivo',
            'peso_kg', 'altezza_cm', 'trainer_principale'
        ];
        const lines = [headers.join(',')];
        for (const r of rows) {
            lines.push([
                r.id, r.first_name, r.last_name, r.email, r.phone, r.status,
                r.date_of_birth, r.gender, r.fitness_level, r.primary_goal,
                r.current_weight_kg, r.height_cm,
                r.trainer_first_name ? `${r.trainer_first_name} ${r.trainer_last_name || ''}`.trim() : ''
            ].map(csvEscape).join(','));
        }
        return lines.join('\n');
    }

    /**
     * Preview CSV: parse + ritorna headers + prime 5 righe + suggerimento mapping
     */
    async previewImport(csvBuffer) {
        const { headers, rows } = parseCSV(csvBuffer);
        if (headers.length === 0) throw { status: 400, message: 'CSV vuoto o malformato' };

        // Auto-suggest mapping basato su header name match
        const dbFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'fitness_level', 'primary_goal'];
        const aliases = {
            first_name: ['nome', 'firstname', 'first_name', 'name', 'first'],
            last_name: ['cognome', 'lastname', 'last_name', 'surname', 'last'],
            email: ['email', 'mail', 'e-mail', 'e_mail'],
            phone: ['telefono', 'tel', 'phone', 'mobile', 'cellulare'],
            date_of_birth: ['data_nascita', 'date_of_birth', 'birthday', 'dob', 'nascita'],
            gender: ['genere', 'sesso', 'gender', 'sex'],
            fitness_level: ['livello', 'fitness_level', 'level'],
            primary_goal: ['obiettivo', 'primary_goal', 'goal']
        };
        const suggestedMapping = {};
        for (const field of dbFields) {
            const found = headers.findIndex(h => aliases[field].includes(h));
            if (found !== -1) suggestedMapping[field] = headers[found];
        }

        return {
            headers,
            preview: rows.slice(0, 5).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] || '']))),
            totalRows: rows.length,
            suggestedMapping,
            dbFields
        };
    }

    /**
     * Import: parse + validazione + batch INSERT in transaction.
     * columnMapping: { db_field: csv_header_name }
     * Rollback se errori > 5% delle righe.
     */
    async importFromCSV({ tenantId, actorId, csvBuffer, columnMapping }) {
        const { headers, rows } = parseCSV(csvBuffer);
        if (rows.length === 0) throw { status: 400, message: 'CSV senza dati' };
        if (!columnMapping || !columnMapping.first_name || !columnMapping.email) {
            throw { status: 400, message: 'columnMapping richiede almeno first_name e email' };
        }

        const headerIdx = (csvHeader) => headers.indexOf(String(csvHeader).toLowerCase());
        const fields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'fitness_level', 'primary_goal'];
        const indices = Object.fromEntries(fields.map(f => [f, columnMapping[f] ? headerIdx(columnMapping[f]) : -1]));

        // Pre-validazione: email duplicate nel CSV stesso + email già presenti nel DB
        const csvEmails = rows.map(r => (indices.email >= 0 ? (r[indices.email] || '').trim().toLowerCase() : '')).filter(Boolean);
        const dupesInCsv = csvEmails.filter((e, i) => csvEmails.indexOf(e) !== i);
        let existingSet = new Set();
        if (csvEmails.length > 0) {
            // Placeholder dinamici per IN (?,?,?...): evita CSV-stringification e match fallaci
            const placeholders = csvEmails.map(() => '?').join(',');
            const existing = await query(
                `SELECT email FROM clients WHERE tenant_id = ? AND email IN (${placeholders})`,
                [tenantId, ...csvEmails]
            );
            existingSet = new Set(existing.map(r => r.email.toLowerCase()));
        }

        const logId = await query(
            `INSERT INTO bulk_operation_log (tenant_id, actor_user_id, operation_type, target_count)
             VALUES (?, ?, 'import', ?)`,
            [tenantId, actorId, rows.length]
        ).then(r => r.insertId);

        let imported = 0;
        let skipped = 0;
        const errors = [];

        try {
            await transaction(async (conn) => {
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    try {
                        const email = indices.email >= 0 ? (r[indices.email] || '').trim().toLowerCase() : '';
                        const firstName = indices.first_name >= 0 ? (r[indices.first_name] || '').trim() : '';
                        if (!firstName) { skipped++; errors.push({ row: i + 2, error: 'first_name mancante' }); continue; }
                        if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { skipped++; errors.push({ row: i + 2, error: 'email mancante/invalida' }); continue; }
                        if (existingSet.has(email) || dupesInCsv.includes(email)) { skipped++; errors.push({ row: i + 2, error: `email duplicata: ${email}` }); continue; }

                        await conn.execute(
                            `INSERT INTO clients (tenant_id, first_name, last_name, email, phone, date_of_birth, gender, fitness_level, primary_goal, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                            [
                                tenantId,
                                firstName,
                                indices.last_name >= 0 ? (r[indices.last_name] || '').trim() : '',
                                email,
                                indices.phone >= 0 ? (r[indices.phone] || null) : null,
                                indices.date_of_birth >= 0 ? (r[indices.date_of_birth] || null) : null,
                                indices.gender >= 0 ? (r[indices.gender] || null) : null,
                                indices.fitness_level >= 0 ? (r[indices.fitness_level] || null) : null,
                                indices.primary_goal >= 0 ? (r[indices.primary_goal] || null) : null,
                            ]
                        );
                        existingSet.add(email);
                        imported++;
                    } catch (e) {
                        skipped++;
                        errors.push({ row: i + 2, error: e.message || String(e) });
                    }
                }

                // Rollback se >5% errori
                const errRate = errors.length / rows.length;
                if (errRate > 0.05) {
                    throw new Error(`Troppi errori (${(errRate * 100).toFixed(1)}% > 5%): rollback. Correggi il CSV e riprova.`);
                }
            });
        } catch (txErr) {
            // Mark log row as rolled-back per evitare orphan 'started, never finished'
            await query(
                `UPDATE bulk_operation_log
                 SET success_count = 0, failed_count = ?, errors_summary = ?, finished_at = NOW()
                 WHERE id = ?`,
                [rows.length, JSON.stringify({ rolledBack: true, reason: txErr.message || String(txErr) }), logId]
            ).catch(() => { /* best effort: non bloccare il rethrow per errore di log */ });
            throw txErr;
        }

        await query(
            `UPDATE bulk_operation_log
             SET success_count = ?, failed_count = ?, errors_summary = ?, finished_at = NOW()
             WHERE id = ?`,
            [imported, skipped, JSON.stringify(errors.slice(0, 20)), logId]
        );

        return { imported, skipped, errors: errors.slice(0, 50) };
    }
}

module.exports = new ClientCSVService();
