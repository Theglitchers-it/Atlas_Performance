/**
 * Program Controller
 */

const programService = require('../services/program.service');
const { query } = require('../config/database');

class ProgramController {
    async getAll(req, res, next) {
        try {
            const options = {
                clientId: req.query.clientId ? parseInt(req.query.clientId) : null,
                status: req.query.status || null,
                limit: parseInt(req.query.limit) || 20,
                page: parseInt(req.query.page) || 1
            };

            // Client users can only see their own programs
            if (req.user.role === 'client') {
                const clients = await query(
                    'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1',
                    [req.user.id, req.user.tenantId]
                );
                if (clients.length === 0) {
                    return res.json({ success: true, data: { programs: [], pagination: { page: 1, limit: options.limit, total: 0, totalPages: 0 } } });
                }
                options.clientId = clients[0].id;
            }

            const result = await programService.getAll(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const program = await programService.getById(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!program) {
                return res.status(404).json({ success: false, message: 'Programma non trovato' });
            }

            // Client users can only see their own programs
            if (req.user.role === 'client') {
                const clients = await query(
                    'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1',
                    [req.user.id, req.user.tenantId]
                );
                if (clients.length === 0 || program.client_id !== clients[0].id) {
                    return res.status(403).json({ success: false, message: 'Non hai i permessi per questa azione' });
                }
            }

            res.json({ success: true, data: { program } });
        } catch (error) {
            next(error);
        }
    }

    async getByIdFull(req, res, next) {
        try {
            const program = await programService.getByIdWithExercises(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!program) {
                return res.status(404).json({ success: false, message: 'Programma non trovato' });
            }

            // Client users can only see their own programs
            if (req.user.role === 'client') {
                const clients = await query(
                    'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1',
                    [req.user.id, req.user.tenantId]
                );
                if (clients.length === 0 || program.client_id !== clients[0].id) {
                    return res.status(403).json({ success: false, message: 'Non hai i permessi per questa azione' });
                }
            }

            res.json({ success: true, data: { program } });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const result = await programService.create(
                req.user.tenantId,
                req.user.id,
                req.body
            );
            res.status(201).json({ success: true, message: 'Programma creato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const program = await programService.update(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, message: 'Programma aggiornato', data: { program } });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const deleted = await programService.delete(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Programma non trovato' });
            }
            res.json({ success: true, message: 'Programma eliminato' });
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const program = await programService.updateStatus(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body.status
            );
            res.json({ success: true, message: 'Stato aggiornato', data: { program } });
        } catch (error) {
            next(error);
        }
    }

    async addWorkout(req, res, next) {
        try {
            const result = await programService.addWorkout(
                parseInt(req.params.id),
                req.body
            );
            res.status(201).json({ success: true, message: 'Workout aggiunto', data: result });
        } catch (error) {
            next(error);
        }
    }

    async removeWorkout(req, res, next) {
        try {
            const deleted = await programService.removeWorkout(
                parseInt(req.params.workoutId),
                parseInt(req.params.id)
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Workout non trovato' });
            }
            res.json({ success: true, message: 'Workout rimosso' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProgramController();
