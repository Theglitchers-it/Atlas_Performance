/**
 * Client Controller
 * Gestione richieste HTTP clienti
 */

const clientService = require('../services/client.service');
const { query } = require('../config/database');
const audit = require('../services/audit.service');
const { getFileUrl } = require('../middlewares/upload');
const { assertClientAccess } = require('../utils/clientAccess');

class ClientController {
    /**
     * GET /api/clients/me - Profilo del client corrente
     */
    async getMyProfile(req, res, next) {
        try {
            const clients = await query(
                'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1',
                [req.user.id, req.user.tenantId]
            );

            if (clients.length === 0) {
                return res.status(404).json({ success: false, message: 'Profilo cliente non trovato' });
            }

            const client = await clientService.getById(clients[0].id, req.user.tenantId);
            res.json({ success: true, data: { client } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/clients/me/preferred-location - L'atleta aggiorna la propria sede preferita
     */
    async updateMyPreferredLocation(req, res, next) {
        try {
            const { locationId } = req.body;
            // locationId puo essere null (rimuove preferenza) o un numero
            if (locationId !== null && locationId !== undefined && !Number.isInteger(Number(locationId))) {
                return res.status(400).json({ success: false, message: 'locationId deve essere un intero o null' });
            }

            // Trova il record clients dell'utente corrente
            const clients = await query(
                'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1',
                [req.user.id, req.user.tenantId]
            );
            if (clients.length === 0) {
                return res.status(404).json({ success: false, message: 'Profilo cliente non trovato' });
            }

            const clientId = clients[0].id;
            const normalizedLocationId = (locationId === null || locationId === undefined || locationId === '') ? null : Number(locationId);

            // Verifica che la location appartenga al tenant
            if (normalizedLocationId !== null) {
                const locs = await query(
                    'SELECT id FROM locations WHERE id = ? AND tenant_id = ? AND status = ? LIMIT 1',
                    [normalizedLocationId, req.user.tenantId, 'active']
                );
                if (locs.length === 0) {
                    return res.status(404).json({ success: false, message: 'Sede non trovata o non attiva' });
                }
            }

            await query(
                'UPDATE clients SET preferred_location_id = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
                [normalizedLocationId, clientId, req.user.tenantId]
            );

            res.json({ success: true, data: { preferred_location_id: normalizedLocationId } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/clients
     */
    async getAll(req, res, next) {
        try {
            const options = {
                status: req.query.status,
                fitnessLevel: req.query.fitnessLevel,
                assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : null,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sort: req.query.sort || 'created_desc'
            };

            const result = await clientService.getAll(req.user.tenantId, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/clients/:id
     */
    async getById(req, res, next) {
        try {
            const client = await clientService.getById(
                parseInt(req.params.id),
                req.user.tenantId
            );

            res.json({
                success: true,
                data: { client }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/clients
     */
    async create(req, res, next) {
        try {
            const result = await clientService.create(
                req.user.tenantId,
                req.body,
                req.user.id
            );

            const client = await clientService.getById(result.clientId, req.user.tenantId);

            audit.log({ req, action: audit.AUDIT_ACTIONS.CLIENT_CREATE, resourceId: result.clientId, details: { email: req.body.email, firstName: req.body.firstName, lastName: req.body.lastName } });

            res.status(201).json({
                success: true,
                message: 'Cliente creato con successo',
                data: { client }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/clients/:id
     */
    async update(req, res, next) {
        try {
            const client = await clientService.update(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );

            audit.log({ req, action: audit.AUDIT_ACTIONS.CLIENT_UPDATE, resourceId: req.params.id, details: { fields: Object.keys(req.body) } });

            res.json({
                success: true,
                message: 'Cliente aggiornato con successo',
                data: { client }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/clients/:id
     */
    async delete(req, res, next) {
        try {
            await clientService.delete(
                parseInt(req.params.id),
                req.user.tenantId
            );

            audit.log({ req, action: audit.AUDIT_ACTIONS.CLIENT_DELETE, resourceId: req.params.id });

            res.json({
                success: true,
                message: 'Cliente eliminato con successo'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/clients/:id/goals
     */
    async addGoal(req, res, next) {
        try {
            const result = await clientService.addGoal(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Obiettivo aggiunto',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/clients/:id/injuries
     */
    async addInjury(req, res, next) {
        try {
            const result = await clientService.addInjury(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Infortunio registrato',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/clients/:id/injuries/:injuryId
     */
    async deleteInjury(req, res, next) {
        try {
            await clientService.assertOwnership(parseInt(req.params.id), req.user.tenantId);
            const deleted = await clientService.deleteInjury(
                parseInt(req.params.injuryId), req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Infortunio non trovato' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/clients/:id/injuries/:injuryId/status
     */
    async updateInjuryStatus(req, res, next) {
        try {
            await clientService.assertOwnership(parseInt(req.params.id), req.user.tenantId);
            const { status } = req.body;
            if (!['active','recovering','recovered'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Status non valido' });
            }
            await clientService.updateInjuryStatus(
                parseInt(req.params.injuryId), req.user.tenantId, status
            );
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/clients/:id/stats
     */
    async getStats(req, res, next) {
        try {
            const stats = await clientService.getStats(
                parseInt(req.params.id),
                req.user.tenantId
            );

            res.json({
                success: true,
                data: { stats }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/clients/program-summaries
     */
    async getProgramSummaries(req, res, next) {
        try {
            const summaries = await clientService.getProgramSummaries(req.user.tenantId);
            res.json({
                success: true,
                data: { summaries }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/clients/:id/xp
     */
    async addXP(req, res, next) {
        try {
            const { points, transactionType, description } = req.body;

            const client = await clientService.addXP(
                parseInt(req.params.id),
                req.user.tenantId,
                points,
                transactionType,
                description
            );

            res.json({
                success: true,
                data: { client }
            });
        } catch (error) {
            next(error);
        }
    }

    async uploadPhoto(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'File richiesto' });
            }
            const clientId = parseInt(req.params.id, 10);
            await assertClientAccess(clientId, req.user.tenantId, req.user);
            const photoUrl = getFileUrl(req.file.path);
            await query(
                'UPDATE clients SET photo_url = ? WHERE id = ? AND tenant_id = ?',
                [photoUrl, clientId, req.user.tenantId]
            );
            res.json({ success: true, data: { photo_url: photoUrl } });
        } catch (err) { next(err); }
    }

    async deletePhoto(req, res, next) {
        try {
            const clientId = parseInt(req.params.id, 10);
            await assertClientAccess(clientId, req.user.tenantId, req.user);
            await query(
                'UPDATE clients SET photo_url = NULL WHERE id = ? AND tenant_id = ?',
                [clientId, req.user.tenantId]
            );
            res.json({ success: true });
        } catch (err) { next(err); }
    }
}

module.exports = new ClientController();
