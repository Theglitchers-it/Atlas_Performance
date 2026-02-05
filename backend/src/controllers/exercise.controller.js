/**
 * Exercise Controller
 */

const exerciseService = require('../services/exercise.service');

class ExerciseController {
    async getAll(req, res, next) {
        try {
            const options = {
                category: req.query.category,
                difficulty: req.query.difficulty,
                muscleGroup: req.query.muscleGroup ? parseInt(req.query.muscleGroup) : null,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await exerciseService.getAll(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const exercise = await exerciseService.getById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, data: { exercise } });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const exercise = await exerciseService.create(req.user.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Esercizio creato', data: { exercise } });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const exercise = await exerciseService.update(parseInt(req.params.id), req.user.tenantId, req.body);
            res.json({ success: true, message: 'Esercizio aggiornato', data: { exercise } });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await exerciseService.delete(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Esercizio eliminato' });
        } catch (error) {
            next(error);
        }
    }

    async getMuscleGroups(req, res, next) {
        try {
            const muscleGroups = await exerciseService.getMuscleGroups();
            res.json({ success: true, data: { muscleGroups } });
        } catch (error) {
            next(error);
        }
    }

    async getCategories(req, res, next) {
        try {
            const categories = exerciseService.getCategories();
            res.json({ success: true, data: { categories } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ExerciseController();
