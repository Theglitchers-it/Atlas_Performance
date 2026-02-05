/**
 * Client Controller
 * Gestione richieste HTTP clienti
 */

const clientService = require('../services/client.service');

class ClientController {
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
                limit: parseInt(req.query.limit) || 20
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
}

module.exports = new ClientController();
