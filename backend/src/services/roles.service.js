/**
 * Roles & Team Service (Fase 1 multi-livello)
 * Gestisce:
 * - user_roles (multi-ruolo per utente)
 * - users.parent_user_id (gerarchia adjacency list)
 * - client_trainers (junction N:M cliente↔trainer)
 * - user_qualifications (badge professionali)
 */

const { query, transaction } = require('../config/database');

const ALLOWED_APP_ROLES = ['gym_admin', 'trainer', 'nutritionist', 'client', 'front_desk', 'accountant'];
const ALLOWED_RELATIONS = ['primary_trainer', 'assistant_trainer', 'nutritionist', 'observer', 'specialist'];

class RolesService {

    // ============================================================
    // USER ROLES
    // ============================================================

    /**
     * Ritorna i ruoli attivi di un utente (esclude scaduti).
     * Scoped per tenant: se tenantId fornito, verifica appartenenza + filtra ruoli del tenant.
     */
    async getUserRoles(userId, tenantId = null) {
        if (tenantId != null) {
            // Cross-tenant scope: verifica che l'utente esista nel tenant del chiamante
            const owner = await query(
                'SELECT 1 FROM users WHERE id = ? AND tenant_id = ?',
                [userId, tenantId]
            );
            if (owner.length === 0) {
                throw { status: 404, message: 'Utente non trovato' };
            }
            // Filtra ruoli al tenant scope: previene leak di ruoli cross-tenant
            // (es. user_roles granted da super_admin in tenant diverso)
            return query(
                `SELECT id, role, is_primary, granted_by, granted_at, expires_at
                 FROM user_roles
                 WHERE user_id = ? AND tenant_id = ? AND (expires_at IS NULL OR expires_at > NOW())
                 ORDER BY is_primary DESC, granted_at ASC`,
                [userId, tenantId]
            );
        }
        // Nessun tenant scope (super_admin o caller interno fidato): tutti i ruoli
        return query(
            `SELECT id, role, is_primary, granted_by, granted_at, expires_at
             FROM user_roles
             WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY is_primary DESC, granted_at ASC`,
            [userId]
        );
    }

    /**
     * Aggiunge un ruolo a un utente. Solo gym_admin/tenant_owner del tenant può farlo.
     * Guardrail anti-escalation: solo tenant_owner/super_admin possono assegnare 'gym_admin'.
     */
    async assignRole({ tenantId, targetUserId, role, grantedBy, expiresAt = null, isPrimary = false, granterRole = null }) {
        if (!ALLOWED_APP_ROLES.includes(role)) {
            throw { status: 400, message: `Ruolo non valido. Permessi: ${ALLOWED_APP_ROLES.join(', ')}` };
        }

        // Guardrail privilegio (fail-closed): per assegnare 'gym_admin' il chiamante
        // DEVE essere tenant_owner o super_admin. null/undefined/'' tutti bloccati.
        if (role === 'gym_admin' && !['tenant_owner', 'super_admin'].includes(granterRole)) {
            throw { status: 403, message: 'Solo tenant_owner o super_admin possono assegnare il ruolo gym_admin' };
        }

        // Verifica che il target user appartenga al tenant
        const targetRows = await query('SELECT id, tenant_id FROM users WHERE id = ?', [targetUserId]);
        if (targetRows.length === 0) {
            throw { status: 404, message: 'Utente non trovato' };
        }
        if (targetRows[0].tenant_id !== tenantId) {
            throw { status: 403, message: 'Utente di un altro tenant' };
        }

        try {
            await transaction(async (conn) => {
                if (isPrimary) {
                    await conn.execute('UPDATE user_roles SET is_primary = FALSE WHERE user_id = ? AND tenant_id = ?', [targetUserId, tenantId]);
                }
                await conn.execute(
                    `INSERT INTO user_roles (tenant_id, user_id, role, granted_by, expires_at, is_primary)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [tenantId, targetUserId, role, grantedBy, expiresAt, isPrimary]
                );
            });
            return { success: true };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw { status: 409, message: `L'utente ha già il ruolo "${role}"` };
            }
            throw err;
        }
    }

    /**
     * Rimuove un ruolo da un utente. Impedisce di rimuovere l'ultimo ruolo.
     * Tenant scoping obbligatorio: previene cross-tenant role tampering.
     */
    async removeRole({ tenantId, targetUserId, role }) {
        // Conta ruoli scoped al tenant (NO cross-tenant: il guardrail deve preservare
        // la funzionalita dell'utente in QUESTO tenant, non globalmente)
        const tenantRolesCount = await query(
            `SELECT COUNT(*) as cnt FROM user_roles
             WHERE user_id = ? AND tenant_id = ?
             AND (expires_at IS NULL OR expires_at > NOW())`,
            [targetUserId, tenantId]
        );
        if ((tenantRolesCount[0]?.cnt || 0) <= 1) {
            throw { status: 400, message: 'Impossibile rimuovere l\'ultimo ruolo. Assegna prima un altro ruolo.' };
        }
        const result = await query(
            'DELETE FROM user_roles WHERE user_id = ? AND role = ? AND tenant_id = ?',
            [targetUserId, role, tenantId]
        );
        if (result.affectedRows === 0) {
            throw { status: 404, message: 'Ruolo non trovato per questo utente' };
        }
        return { success: true };
    }

    // ============================================================
    // TEAM HIERARCHY (parent_user_id)
    // ============================================================

    /**
     * Ritorna l'albero discendente del trainer corrente usando recursive CTE.
     * Cap a 10 livelli di profondità per evitare runaway su gerarchie patologiche.
     */
    async getDescendantTeam(rootUserId, tenantId) {
        return query(
            `WITH RECURSIVE team_tree AS (
                SELECT id, parent_user_id, first_name, last_name, email, role, 0 AS depth
                FROM users
                WHERE id = ? AND tenant_id = ?
                UNION ALL
                SELECT u.id, u.parent_user_id, u.first_name, u.last_name, u.email, u.role, t.depth + 1
                FROM users u
                INNER JOIN team_tree t ON u.parent_user_id = t.id
                WHERE u.tenant_id = ? AND t.depth < 10
            )
            SELECT id, parent_user_id, first_name, last_name, email, role, depth
            FROM team_tree
            WHERE depth > 0
            ORDER BY depth, last_name, first_name`,
            [rootUserId, tenantId, tenantId]
        );
    }

    /**
     * Verifica se descendantId è discendente (anche indiretto) di ancestorId.
     * Usato per autorizzare un gym_admin a modificare risorse di trainer della sua gerarchia.
     */
    async isDescendantOf(ancestorId, descendantId) {
        if (ancestorId === descendantId) return true;
        const rows = await query(
            `WITH RECURSIVE chain AS (
                SELECT id, parent_user_id FROM users WHERE id = ?
                UNION ALL
                SELECT u.id, u.parent_user_id
                FROM users u
                INNER JOIN chain c ON u.id = c.parent_user_id
            )
            SELECT 1 FROM chain WHERE id = ? LIMIT 1`,
            [descendantId, ancestorId]
        );
        return rows.length > 0;
    }

    /**
     * Imposta il parent di un utente (lo aggancia sotto un altro trainer).
     * Verifica che non si crei un loop.
     */
    async setParent({ tenantId, userId, parentUserId, actorId }) {
        if (userId === parentUserId) {
            throw { status: 400, message: 'Un utente non può essere parent di sé stesso' };
        }

        // No-op se vuole rimuovere il parent
        if (parentUserId === null) {
            await query(
                'UPDATE users SET parent_user_id = NULL WHERE id = ? AND tenant_id = ?',
                [userId, tenantId]
            );
            return { success: true };
        }

        // Verifica esistenza/tenant di entrambi
        const rows = await query(
            'SELECT id, tenant_id FROM users WHERE id IN (?, ?)',
            [userId, parentUserId]
        );
        if (rows.length !== 2 || rows.some(r => r.tenant_id !== tenantId)) {
            throw { status: 404, message: 'Utente o parent non trovato nel tenant' };
        }

        // Verifica no loop: parentUserId non deve essere già discendente di userId
        if (await this.isDescendantOf(userId, parentUserId)) {
            throw { status: 400, message: 'Operazione crea un loop nella gerarchia' };
        }

        // Transazione: ricontrolla il loop dentro lock per evitare race tra check e update.
        await transaction(async (conn) => {
            const [check] = await conn.execute(
                `WITH RECURSIVE chain AS (
                    SELECT id, parent_user_id FROM users WHERE id = ? FOR UPDATE
                    UNION ALL
                    SELECT u.id, u.parent_user_id FROM users u INNER JOIN chain c ON u.id = c.parent_user_id
                )
                SELECT 1 FROM chain WHERE id = ? LIMIT 1`,
                [parentUserId, userId]
            );
            if (check.length > 0) {
                throw { status: 400, message: 'Operazione crea un loop nella gerarchia' };
            }
            await conn.execute(
                'UPDATE users SET parent_user_id = ? WHERE id = ? AND tenant_id = ?',
                [parentUserId, userId, tenantId]
            );
        });
        return { success: true };
    }

    // ============================================================
    // CLIENT TRAINERS JUNCTION
    // ============================================================

    /**
     * Trainer/nutritionist assegnati a un cliente.
     */
    async getClientTrainers(clientId, tenantId) {
        return query(
            `SELECT ct.id, ct.user_id, ct.relation_role, ct.assigned_at, ct.ended_at, ct.notes,
                    u.first_name, u.last_name, u.email
             FROM client_trainers ct
             INNER JOIN users u ON u.id = ct.user_id
             WHERE ct.client_id = ? AND ct.tenant_id = ? AND ct.ended_at IS NULL
             ORDER BY FIELD(ct.relation_role,'primary_trainer','nutritionist','assistant_trainer','specialist','observer'), ct.assigned_at`,
            [clientId, tenantId]
        );
    }

    /**
     * Clienti seguiti da un trainer (via junction). Include tutti i ruoli relazione.
     * Se il chiamante è gym_admin con team, vede anche clienti dei trainer subordinati.
     */
    async getClientsForUser({ userId, tenantId, includeTeam = false, relationRoles = null }) {
        let userIds = [userId];

        if (includeTeam) {
            const team = await this.getDescendantTeam(userId, tenantId);
            userIds = userIds.concat(team.map(t => t.id));
        }

        const placeholders = userIds.map(() => '?').join(',');
        const roleFilter = relationRoles && relationRoles.length > 0
            ? `AND ct.relation_role IN (${relationRoles.map(() => '?').join(',')})`
            : '';

        const params = [tenantId, ...userIds];
        if (relationRoles) params.push(...relationRoles);

        // GROUP BY su c.id: un cliente seguito da più trainer del team appare 1 volta,
        // con liste aggregate dei trainer e dei ruoli relazione.
        return query(
            `SELECT c.id, c.first_name, c.last_name, c.email, c.status, c.assigned_to,
                    GROUP_CONCAT(DISTINCT ct.user_id) AS via_user_ids,
                    GROUP_CONCAT(DISTINCT ct.relation_role) AS relation_roles
             FROM clients c
             INNER JOIN client_trainers ct ON ct.client_id = c.id
             WHERE ct.tenant_id = ?
               AND ct.user_id IN (${placeholders})
               AND ct.ended_at IS NULL
               ${roleFilter}
             GROUP BY c.id, c.first_name, c.last_name, c.email, c.status, c.assigned_to
             ORDER BY c.last_name, c.first_name`,
            params
        );
    }

    /**
     * Assegna un trainer/nutrizionista a un cliente con un ruolo relazionale.
     */
    async assignTrainerToClient({ tenantId, clientId, userId, relationRole, assignedBy, notes = null }) {
        if (!ALLOWED_RELATIONS.includes(relationRole)) {
            throw { status: 400, message: `relation_role non valido` };
        }
        // Verifica appartenenza tenant
        const checks = await query(
            'SELECT (SELECT COUNT(*) FROM clients WHERE id = ? AND tenant_id = ?) AS c, (SELECT COUNT(*) FROM users WHERE id = ? AND tenant_id = ?) AS u',
            [clientId, tenantId, userId, tenantId]
        );
        if (checks[0].c === 0 || checks[0].u === 0) {
            throw { status: 404, message: 'Cliente o utente non nel tenant' };
        }
        try {
            await query(
                `INSERT INTO client_trainers (tenant_id, client_id, user_id, relation_role, assigned_by, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [tenantId, clientId, userId, relationRole, assignedBy, notes]
            );
            // Se primary_trainer, sincronizza il legacy clients.assigned_to
            if (relationRole === 'primary_trainer') {
                await query('UPDATE clients SET assigned_to = ? WHERE id = ?', [userId, clientId]);
            }
            return { success: true };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw { status: 409, message: 'Trainer già assegnato con questo ruolo' };
            }
            throw err;
        }
    }

    /**
     * Termina l'assegnazione di un trainer a un cliente (soft delete: imposta ended_at).
     */
    async removeTrainerFromClient({ tenantId, clientId, userId, relationRole = null }) {
        const params = [tenantId, clientId, userId];
        let roleFilter = '';
        if (relationRole) {
            roleFilter = ' AND relation_role = ?';
            params.push(relationRole);
        }
        const result = await query(
            `UPDATE client_trainers SET ended_at = NOW()
             WHERE tenant_id = ? AND client_id = ? AND user_id = ? AND ended_at IS NULL${roleFilter}`,
            params
        );
        return { success: true, affected: result.affectedRows };
    }

    // ============================================================
    // QUALIFICATIONS
    // ============================================================

    async getQualifications(userId, tenantId = null) {
        if (tenantId != null) {
            const owner = await query(
                'SELECT 1 FROM users WHERE id = ? AND tenant_id = ?',
                [userId, tenantId]
            );
            if (owner.length === 0) {
                throw { status: 404, message: 'Utente non trovato' };
            }
        }
        // user_qualifications non ha tenant_id (qualifiche personali dell'utente,
        // valide cross-tenant). La verifica di appartenenza al tenant sopra basta.
        return query(
            `SELECT id, qualification, issued_by, issued_at, expires_at, certificate_url,
                    verified, verified_by, verified_at, notes, created_at
             FROM user_qualifications
             WHERE user_id = ?
             ORDER BY verified DESC, issued_at DESC`,
            [userId]
        );
    }

    async addQualification({ userId, qualification, issuedBy, issuedAt, expiresAt, certificateUrl, notes }) {
        const result = await query(
            `INSERT INTO user_qualifications (user_id, qualification, issued_by, issued_at, expires_at, certificate_url, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, qualification, issuedBy || null, issuedAt || null, expiresAt || null, certificateUrl || null, notes || null]
        );
        return { id: result.insertId, success: true };
    }

    async verifyQualification({ tenantId, qualificationId, verifierId }) {
        // JOIN su users per scopare al tenant: previene cross-tenant verification fraudolenta
        const result = await query(
            `UPDATE user_qualifications uq
             INNER JOIN users u ON u.id = uq.user_id
             SET uq.verified = TRUE, uq.verified_by = ?, uq.verified_at = NOW()
             WHERE uq.id = ? AND u.tenant_id = ?`,
            [verifierId, qualificationId, tenantId]
        );
        if (result.affectedRows === 0) {
            throw { status: 404, message: 'Qualifica non trovata' };
        }
        return { success: true };
    }

    async deleteQualification({ qualificationId, userId }) {
        const result = await query(
            'DELETE FROM user_qualifications WHERE id = ? AND user_id = ?',
            [qualificationId, userId]
        );
        if (result.affectedRows === 0) {
            throw { status: 404, message: 'Qualifica non trovata' };
        }
        return { success: true };
    }

    // ============================================================
    // TEAM STAFF CRUD (tenant_owner / gym_admin)
    // ============================================================

    /**
     * Crea un nuovo membro del team con password temporanea.
     * Restituisce { userId, email, tempPassword } per consegnare credenziali iniziali.
     */
    async createTeamStaff({ tenantId, parentUserId, email, firstName, lastName, role }) {
        const bcrypt = require('bcryptjs');
        const crypto = require('crypto');

        // Limite anti-abuso: max 50 staff per tenant
        const [countRow] = await query(
            "SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND role IN ('staff','tenant_owner') AND status = 'active'",
            [tenantId]
        );
        if (countRow.n >= 50) {
            throw { status: 400, message: 'Limite massimo 50 membri team raggiunto' };
        }

        // Check email univoca globalmente
        const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (existing.length > 0) {
            throw { status: 409, message: 'Email gia in uso' };
        }

        // Genera password temporanea sicura (12 char alfanumerici + simboli)
        const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + '!9';
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Insert user (role mappato a 'staff' come LegacyRole + il role specifico via user_roles)
        const result = await query(
            `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, parent_user_id, status, email_verified_at)
             VALUES (?, ?, ?, ?, ?, 'staff', ?, 'active', NOW())`,
            [tenantId, email, passwordHash, firstName, lastName, parentUserId]
        );

        const userId = result.insertId;

        // Aggiungi anche al user_roles (multi-role) se la tabella esiste
        try {
            await query(
                'INSERT INTO user_roles (user_id, tenant_id, role, granted_by) VALUES (?, ?, ?, ?)',
                [userId, tenantId, role, parentUserId]
            );
        } catch (err) {
            // Se la tabella user_roles non esiste o constraint fallisce, log ma non bloccare
            if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
        }

        return { userId, email, tempPassword, role };
    }

    /**
     * Aggiorna il ruolo principale di un membro del team (deve appartenere allo stesso tenant).
     */
    async updateTeamStaffRole({ tenantId, targetUserId, role, actorId }) {
        // Verifica che il target appartenga al tenant del chiamante e non sia il tenant_owner
        const rows = await query(
            "SELECT id, role FROM users WHERE id = ? AND tenant_id = ? LIMIT 1",
            [targetUserId, tenantId]
        );
        if (rows.length === 0) {
            throw { status: 404, message: 'Membro del team non trovato' };
        }
        if (rows[0].role === 'tenant_owner') {
            throw { status: 403, message: 'Non puoi modificare il ruolo del titolare' };
        }

        // Aggiorna user_roles (rimuove vecchi + inserisce nuovo)
        try {
            await transaction(async (conn) => {
                await conn.execute('DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?', [targetUserId, tenantId]);
                await conn.execute(
                    'INSERT INTO user_roles (user_id, tenant_id, role, granted_by) VALUES (?, ?, ?, ?)',
                    [targetUserId, tenantId, role, actorId]
                );
            });
        } catch (err) {
            if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
        }

        return { success: true };
    }

    /**
     * Rimuove un membro del team (soft delete: status='inactive').
     */
    async removeTeamStaff({ tenantId, targetUserId }) {
        const rows = await query(
            "SELECT id, role FROM users WHERE id = ? AND tenant_id = ? LIMIT 1",
            [targetUserId, tenantId]
        );
        if (rows.length === 0) {
            throw { status: 404, message: 'Membro del team non trovato' };
        }
        if (rows[0].role === 'tenant_owner') {
            throw { status: 403, message: 'Non puoi rimuovere il titolare' };
        }

        await query("UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = ?", [targetUserId]);
        return { success: true };
    }
}

module.exports = new RolesService();
module.exports.ALLOWED_APP_ROLES = ALLOWED_APP_ROLES;
module.exports.ALLOWED_RELATIONS = ALLOWED_RELATIONS;
