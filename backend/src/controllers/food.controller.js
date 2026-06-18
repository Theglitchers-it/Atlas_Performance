/**
 * Food Controller
 */

const foodService = require('../services/food.service');

class FoodController {
    async search(req, res, next) {
        try {
            const q = (req.query.q || '').toString();
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);
            const foods = await foodService.search(req.user.tenantId, q, limit);
            res.json({ success: true, data: { foods } });
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try {
            const food = await foodService.getById(parseInt(req.params.id), req.user.tenantId);
            if (!food) return res.status(404).json({ success: false, message: 'Alimento non trovato' });
            res.json({ success: true, data: { food } });
        } catch (error) { next(error); }
    }

    async create(req, res, next) {
        try {
            const { name } = req.body;
            if (!name || name.trim().length < 2) {
                return res.status(400).json({ success: false, message: 'Nome alimento richiesto (min 2 caratteri)' });
            }
            const result = await foodService.create(req.user.tenantId, req.user.id, req.body);
            res.status(201).json({ success: true, data: { id: result.id } });
        } catch (error) { next(error); }
    }

    async update(req, res, next) {
        try {
            const food = await foodService.update(parseInt(req.params.id), req.user.tenantId, req.body);
            if (!food) return res.status(404).json({ success: false, message: 'Alimento non trovato' });
            res.json({ success: true, data: { food } });
        } catch (error) { next(error); }
    }

    async delete(req, res, next) {
        try {
            const deleted = await foodService.delete(parseInt(req.params.id), req.user.tenantId);
            if (!deleted) return res.status(404).json({ success: false, message: 'Alimento non trovato' });
            res.json({ success: true });
        } catch (error) { next(error); }
    }
}

module.exports = new FoodController();
