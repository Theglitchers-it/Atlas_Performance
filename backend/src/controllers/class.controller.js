/**
 * Class Controller
 * Handler per classi, sessioni e iscrizioni
 */

const classService = require('../services/class.service');
const { query } = require('../config/database');

class ClassController {

    // Helper: risolvi clientId dal ruolo utente
    async _resolveClientId(req) {
        if (req.user.role === 'client') {
            const [client] = await query('SELECT id FROM clients WHERE user_id = ? AND tenant_id = ?', [req.user.id, req.user.tenantId]);
            return client?.id || null;
        }
        return req.query.clientId ? parseInt(req.query.clientId) : null;
    }

    // === CLASSI ===

    async getClasses(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { page, limit, activeOnly, instructorId } = req.query;
            const result = await classService.getClasses(tenantId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                activeOnly: activeOnly === 'true',
                instructorId: instructorId ? parseInt(instructorId) : null
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getClassById(req, res, next) {
        try {
            const cls = await classService.getClassById(req.user.tenantId, req.params.id);
            if (!cls) return res.status(404).json({ success: false, message: 'Classe non trovata' });
            res.json({ success: true, data: { class: cls } });
        } catch (error) {
            next(error);
        }
    }

    async createClass(req, res, next) {
        try {
            const { name, description, instructorId, maxParticipants, durationMin, location, recurringPattern } = req.body;
            if (!name) return res.status(400).json({ success: false, message: 'Nome obbligatorio' });
            const cls = await classService.createClass(req.user.tenantId, {
                name, description,
                instructorId: instructorId || req.user.id,
                maxParticipants, durationMin, location, recurringPattern
            });
            res.status(201).json({ success: true, data: { class: cls } });
        } catch (error) {
            next(error);
        }
    }

    async updateClass(req, res, next) {
        try {
            const cls = await classService.updateClass(req.user.tenantId, req.params.id, req.body);
            if (!cls) return res.status(404).json({ success: false, message: 'Classe non trovata' });
            res.json({ success: true, data: { class: cls } });
        } catch (error) {
            next(error);
        }
    }

    async deleteClass(req, res, next) {
        try {
            const deleted = await classService.deleteClass(req.user.tenantId, req.params.id);
            if (!deleted) return res.status(404).json({ success: false, message: 'Classe non trovata' });
            res.json({ success: true, message: 'Classe eliminata' });
        } catch (error) {
            next(error);
        }
    }

    // === SESSIONI ===

    async getSessions(req, res, next) {
        try {
            const { classId, status, from, to, page, limit } = req.query;
            const result = await classService.getSessions(req.user.tenantId, {
                classId: classId ? parseInt(classId) : null,
                status, from, to,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getSessionById(req, res, next) {
        try {
            const session = await classService.getSessionById(req.user.tenantId, req.params.id);
            if (!session) return res.status(404).json({ success: false, message: 'Sessione non trovata' });
            res.json({ success: true, data: { session } });
        } catch (error) {
            next(error);
        }
    }

    async createSession(req, res, next) {
        try {
            const { classId, startDatetime, endDatetime, notes } = req.body;
            if (!classId || !startDatetime || !endDatetime) {
                return res.status(400).json({ success: false, message: 'classId, startDatetime e endDatetime obbligatori' });
            }
            const session = await classService.createSession(req.user.tenantId, { classId, startDatetime, endDatetime, notes });
            if (!session) return res.status(404).json({ success: false, message: 'Classe non trovata' });
            res.status(201).json({ success: true, data: { session } });
        } catch (error) {
            next(error);
        }
    }

    async updateSessionStatus(req, res, next) {
        try {
            const { status } = req.body;
            if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Stato non valido' });
            }
            const session = await classService.updateSessionStatus(req.user.tenantId, req.params.id, status);
            if (!session) return res.status(404).json({ success: false, message: 'Sessione non trovata' });
            res.json({ success: true, data: { session } });
        } catch (error) {
            next(error);
        }
    }

    async deleteSession(req, res, next) {
        try {
            const deleted = await classService.deleteSession(req.user.tenantId, req.params.id);
            if (!deleted) return res.status(404).json({ success: false, message: 'Sessione non trovata' });
            res.json({ success: true, message: 'Sessione eliminata' });
        } catch (error) {
            next(error);
        }
    }

    // === ISCRIZIONI ===

    async enrollClient(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const result = await classService.enrollClient(req.user.tenantId, req.params.sessionId, clientId);
            if (!result.success) return res.status(400).json(result);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async cancelEnrollment(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const result = await classService.cancelEnrollment(req.user.tenantId, req.params.sessionId, clientId);
            if (!result.success) return res.status(400).json(result);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async checkInClient(req, res, next) {
        try {
            const { clientId } = req.body;
            if (!clientId) return res.status(400).json({ success: false, message: 'clientId obbligatorio' });
            const result = await classService.checkInClient(req.user.tenantId, req.params.sessionId, clientId);
            if (!result.success) return res.status(400).json(result);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async markNoShow(req, res, next) {
        try {
            const { clientId } = req.body;
            if (!clientId) return res.status(400).json({ success: false, message: 'clientId obbligatorio' });
            const result = await classService.markNoShow(req.user.tenantId, req.params.sessionId, clientId);
            if (!result.success) return res.status(400).json(result);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    // === CLIENT SESSIONS ===

    async getMyClasses(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const { status, page, limit } = req.query;
            const result = await classService.getClientSessions(req.user.tenantId, clientId, {
                status, page: parseInt(page) || 1, limit: parseInt(limit) || 20
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ClassController();
