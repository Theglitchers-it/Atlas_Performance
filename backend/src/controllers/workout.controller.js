/**
 * Workout Controller
 */

const workoutService = require('../services/workout.service');

class WorkoutController {
    async getAll(req, res, next) {
        try {
            const options = {
                category: req.query.category,
                difficulty: req.query.difficulty,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await workoutService.getAll(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const workout = await workoutService.getById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, data: { workout } });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const result = await workoutService.create(req.user.tenantId, req.body, req.user.id);
            const workout = await workoutService.getById(result.templateId, req.user.tenantId);
            res.status(201).json({ success: true, message: 'Scheda creata', data: { workout } });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            await workoutService.update(parseInt(req.params.id), req.user.tenantId, req.body);
            const workout = await workoutService.getById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Scheda aggiornata', data: { workout } });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await workoutService.delete(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Scheda eliminata' });
        } catch (error) {
            next(error);
        }
    }

    async duplicate(req, res, next) {
        try {
            const result = await workoutService.duplicate(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body.name,
                req.user.id
            );
            const workout = await workoutService.getById(result.templateId, req.user.tenantId);
            res.status(201).json({ success: true, message: 'Scheda duplicata', data: { workout } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WorkoutController();
