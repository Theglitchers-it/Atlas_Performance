/**
 * Roles & Team Controller — gestione user_roles, gerarchia, client_trainers, qualifiche
 */

const rolesService = require('../services/roles.service');

const asInt = (v) => parseInt(v, 10);

class RolesController {

    async listMyRoles(req, res, next) {
        try { res.json({ success: true, data: await rolesService.getUserRoles(req.user.id) }); }
        catch (err) { next(err); }
    }

    async listUserRoles(req, res, next) {
        try {
            const targetId = asInt(req.params.id);
            // super_admin può leggere cross-tenant; altri ruoli restano nel proprio tenant
            const scope = req.user.role === 'super_admin' ? null : req.user.tenantId;
            res.json({ success: true, data: await rolesService.getUserRoles(targetId, scope) });
        }
        catch (err) { next(err); }
    }

    async assignRole(req, res, next) {
        try {
            const { role, expiresAt, isPrimary } = req.body;
            await rolesService.assignRole({
                tenantId: req.user.tenantId,
                targetUserId: asInt(req.params.id),
                role,
                grantedBy: req.user.id,
                granterRole: req.user.role,
                expiresAt: expiresAt || null,
                isPrimary: !!isPrimary
            });
            res.json({ success: true, message: 'Ruolo assegnato' });
        } catch (err) { next(err); }
    }

    async removeRole(req, res, next) {
        try {
            await rolesService.removeRole({
                tenantId: req.user.tenantId,
                targetUserId: asInt(req.params.id),
                role: req.params.role
            });
            res.json({ success: true, message: 'Ruolo rimosso' });
        } catch (err) { next(err); }
    }

    async getMyTeam(req, res, next) {
        try { res.json({ success: true, data: await rolesService.getDescendantTeam(req.user.id, req.user.tenantId) }); }
        catch (err) { next(err); }
    }

    async setParent(req, res, next) {
        try {
            await rolesService.setParent({
                tenantId: req.user.tenantId,
                userId: asInt(req.params.id),
                parentUserId: req.body.parentUserId === null ? null : asInt(req.body.parentUserId),
                actorId: req.user.id
            });
            res.json({ success: true, message: 'Gerarchia aggiornata' });
        } catch (err) { next(err); }
    }

    async getClientTrainers(req, res, next) {
        try { res.json({ success: true, data: await rolesService.getClientTrainers(asInt(req.params.id), req.user.tenantId) }); }
        catch (err) { next(err); }
    }

    async assignTrainerToClient(req, res, next) {
        try {
            const { userId, relationRole, notes } = req.body;
            await rolesService.assignTrainerToClient({
                tenantId: req.user.tenantId,
                clientId: asInt(req.params.id),
                userId: asInt(userId),
                relationRole: relationRole || 'primary_trainer',
                assignedBy: req.user.id,
                notes: notes || null
            });
            res.status(201).json({ success: true, message: 'Trainer assegnato' });
        } catch (err) { next(err); }
    }

    async removeTrainerFromClient(req, res, next) {
        try {
            const result = await rolesService.removeTrainerFromClient({
                tenantId: req.user.tenantId,
                clientId: asInt(req.params.id),
                userId: asInt(req.params.userId),
                relationRole: req.query.relationRole || null
            });
            res.json({ success: true, message: 'Assegnazione terminata', affected: result.affected });
        } catch (err) { next(err); }
    }

    async listMyQualifications(req, res, next) {
        try { res.json({ success: true, data: await rolesService.getQualifications(req.user.id) }); }
        catch (err) { next(err); }
    }

    async listUserQualifications(req, res, next) {
        try {
            const targetId = asInt(req.params.id);
            const scope = req.user.role === 'super_admin' ? null : req.user.tenantId;
            res.json({ success: true, data: await rolesService.getQualifications(targetId, scope) });
        }
        catch (err) { next(err); }
    }

    async addMyQualification(req, res, next) {
        try {
            const { qualification, issuedBy, issuedAt, expiresAt, certificateUrl, notes } = req.body;
            if (!qualification || qualification.length < 2) {
                throw { status: 400, message: 'qualification richiesto' };
            }
            const result = await rolesService.addQualification({
                userId: req.user.id,
                qualification, issuedBy, issuedAt, expiresAt, certificateUrl, notes
            });
            res.status(201).json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async verifyQualification(req, res, next) {
        try {
            await rolesService.verifyQualification({
                tenantId: req.user.tenantId,
                qualificationId: asInt(req.params.id),
                verifierId: req.user.id
            });
            res.json({ success: true, message: 'Qualifica verificata' });
        } catch (err) { next(err); }
    }

    async deleteMyQualification(req, res, next) {
        try {
            await rolesService.deleteQualification({ qualificationId: asInt(req.params.id), userId: req.user.id });
            res.json({ success: true, message: 'Qualifica eliminata' });
        } catch (err) { next(err); }
    }

    // ===== TEAM STAFF CRUD =====

    async createTeamStaff(req, res, next) {
        try {
            const { email, firstName, lastName, role } = req.body;
            if (!email || !firstName || !lastName || !role) {
                return res.status(400).json({ success: false, message: 'Campi obbligatori: email, firstName, lastName, role' });
            }
            const validRoles = ['staff', 'trainer', 'nutritionist', 'front_desk', 'accountant'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, message: `Ruolo non valido. Ammessi: ${validRoles.join(', ')}` });
            }
            const result = await rolesService.createTeamStaff({
                tenantId: req.user.tenantId,
                parentUserId: req.user.id,
                email, firstName, lastName, role
            });
            res.status(201).json({ success: true, data: result, message: 'Membro aggiunto al team' });
        } catch (err) { next(err); }
    }

    async updateTeamStaffRole(req, res, next) {
        try {
            const targetId = asInt(req.params.userId);
            if (targetId === req.user.id) {
                return res.status(403).json({ success: false, message: 'Non puoi modificare il tuo stesso ruolo' });
            }
            const { role } = req.body;
            const validRoles = ['staff', 'trainer', 'nutritionist', 'front_desk', 'accountant'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, message: `Ruolo non valido. Ammessi: ${validRoles.join(', ')}` });
            }
            await rolesService.updateTeamStaffRole({
                tenantId: req.user.tenantId,
                targetUserId: targetId,
                role,
                actorId: req.user.id
            });
            res.json({ success: true, message: 'Ruolo aggiornato' });
        } catch (err) { next(err); }
    }

    async removeTeamStaff(req, res, next) {
        try {
            const targetId = asInt(req.params.userId);
            if (targetId === req.user.id) {
                return res.status(403).json({ success: false, message: 'Non puoi rimuovere te stesso dal team' });
            }
            await rolesService.removeTeamStaff({
                tenantId: req.user.tenantId,
                targetUserId: targetId,
                actorId: req.user.id
            });
            res.json({ success: true, message: 'Membro rimosso dal team' });
        } catch (err) { next(err); }
    }
}

module.exports = new RolesController();
