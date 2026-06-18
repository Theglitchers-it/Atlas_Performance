/**
 * Key Exercise Controller
 */

const keyExerciseService = require('../services/keyExercise.service');
const clientService = require('../services/client.service');

class KeyExerciseController {
    async list(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const items = await keyExerciseService.list(req.user.tenantId, clientId);
            res.json({ success: true, data: { items } });
        } catch (error) { next(error); }
    }

    async add(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const { exerciseId, note } = req.body;
            if (!exerciseId) {
                return res.status(400).json({ success: false, message: 'exerciseId richiesto' });
            }
            const item = await keyExerciseService.add(
                req.user.tenantId, clientId,
                parseInt(exerciseId), note, req.user.id
            );
            res.status(201).json({ success: true, data: { item } });
        } catch (error) { next(error); }
    }

    async remove(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const removed = await keyExerciseService.remove(
                req.user.tenantId, clientId, parseInt(req.params.exerciseId)
            );
            if (!removed) {
                return res.status(404).json({ success: false, message: 'Esercizio fondamentale non trovato' });
            }
            res.json({ success: true });
        } catch (error) { next(error); }
    }

    async progression(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const { from, to } = req.query;
            const points = await keyExerciseService.getProgression(
                req.user.tenantId, clientId,
                parseInt(req.params.exerciseId),
                from || null, to || null
            );
            res.json({ success: true, data: { points } });
        } catch (error) { next(error); }
    }
}

module.exports = new KeyExerciseController();
