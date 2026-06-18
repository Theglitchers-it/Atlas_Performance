/**
 * Food Log Controller
 * Autorizzazione: trainer/staff/owner full CRUD su diario cliente.
 * Un cliente ('role: client') può operare solo sul proprio diario — check aggiuntivo.
 */

const fs = require('fs').promises;
const foodLogService = require('../services/foodLog.service');
const aiService = require('../services/ai.service');
const { getFileUrl } = require('../middlewares/upload');
const { assertClientAccess } = require('../utils/clientAccess');

class FoodLogController {
    async listDay(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await assertClientAccess(clientId, req.user.tenantId, req.user);
            const date = req.query.date || new Date().toISOString().slice(0, 10);
            const [entries, totals] = await Promise.all([
                foodLogService.listByDay(req.user.tenantId, clientId, date),
                foodLogService.getDayTotals(req.user.tenantId, clientId, date)
            ]);
            res.json({ success: true, data: { date, entries, totals } });
        } catch (error) { next(error); }
    }

    async summary(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await assertClientAccess(clientId, req.user.tenantId, req.user);
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: 'startDate e endDate richiesti' });
            }
            const summary = await foodLogService.getRangeSummary(
                req.user.tenantId, clientId, startDate, endDate
            );
            res.json({ success: true, data: summary });
        } catch (error) { next(error); }
    }

    async create(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await assertClientAccess(clientId, req.user.tenantId, req.user);

            const { foodName, quantity, loggedAt } = req.body;
            if (!foodName || !quantity || !loggedAt) {
                return res.status(400).json({
                    success: false,
                    message: 'foodName, quantity e loggedAt sono richiesti'
                });
            }

            const result = await foodLogService.create(
                req.user.tenantId, clientId, req.user.id, req.body
            );
            res.status(201).json({ success: true, data: { id: result.id } });
        } catch (error) { next(error); }
    }

    async update(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await assertClientAccess(clientId, req.user.tenantId, req.user);
            await foodLogService.update(
                parseInt(req.params.entryId), req.user.tenantId, clientId, req.body
            );
            res.json({ success: true });
        } catch (error) { next(error); }
    }

    async delete(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await assertClientAccess(clientId, req.user.tenantId, req.user);
            const deleted = await foodLogService.delete(
                parseInt(req.params.entryId), req.user.tenantId, clientId
            );
            if (!deleted) return res.status(404).json({ success: false, message: 'Entry non trovata' });
            res.json({ success: true });
        } catch (error) { next(error); }
    }

    async analyzePhoto(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await assertClientAccess(clientId, req.user.tenantId, req.user);

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Nessuna foto caricata' });
            }

            const buffer = await fs.readFile(req.file.path);
            const base64 = buffer.toString('base64');
            const hint = req.body.hint || null;

            const analysis = await aiService.analyzeMealPhoto(base64, req.file.mimetype, hint);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'meal_photo',
                prompt: hint ? `hint: ${hint}` : `client ${clientId}`,
                response: JSON.stringify(analysis).substring(0, 500)
            });

            res.json({
                success: true,
                data: {
                    photoUrl: getFileUrl(req.file.path),
                    analysis
                }
            });
        } catch (error) { next(error); }
    }
}

module.exports = new FoodLogController();
