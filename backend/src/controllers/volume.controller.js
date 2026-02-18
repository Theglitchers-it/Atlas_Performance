/**
 * Volume Analytics Controller
 * Gestione HTTP per volume tracking e priorita muscolari
 */

const volumeService = require('../services/volume.service');

class VolumeController {
    /**
     * GET /api/volume/:clientId - Volume analytics per cliente
     */
    async getVolume(req, res, next) {
        try {
            const { clientId } = req.params;
            const { weeks, muscleGroupId, mesocycleId } = req.query;
            const data = await volumeService.getVolumeByClient(clientId, req.user.tenantId, {
                weeks: weeks ? parseInt(weeks) : undefined,
                muscleGroupId: muscleGroupId ? parseInt(muscleGroupId) : undefined,
                mesocycleId: mesocycleId ? parseInt(mesocycleId) : undefined
            });
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/volume/:clientId/calculate - Calcola volume settimanale
     */
    async calculateWeekly(req, res, next) {
        try {
            const { clientId } = req.params;
            const { weekStart } = req.body;
            if (!weekStart) {
                return res.status(400).json({ success: false, message: 'weekStart richiesto' });
            }
            const data = await volumeService.calculateWeeklyVolume(clientId, req.user.tenantId, weekStart);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/volume/:clientId/mesocycle/:programId - Riassunto per mesociclo
     */
    async getMesocycleSummary(req, res, next) {
        try {
            const { clientId, programId } = req.params;
            const data = await volumeService.getMesocycleSummary(clientId, req.user.tenantId, programId);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/volume/:clientId/compare - Confronto tra mesocicli
     */
    async compareMesocycles(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await volumeService.compareMesocycles(clientId, req.user.tenantId);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/volume/:clientId/plateau - Rileva plateau
     */
    async detectPlateau(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await volumeService.detectVolumePlateau(clientId, req.user.tenantId);
            res.json({ success: true, data: { alerts: data } });
        } catch (error) {
            next(error);
        }
    }

    // === MUSCLE PRIORITIES ===

    /**
     * GET /api/volume/:clientId/priorities - Priorita muscolari
     */
    async getPriorities(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await volumeService.getMusclePriorities(clientId, req.user.tenantId);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/volume/:clientId/priorities - Imposta priorita muscolare
     */
    async setPriority(req, res, next) {
        try {
            const { clientId } = req.params;
            const { muscleGroupId, priority, notes } = req.body;
            if (!muscleGroupId || !priority) {
                return res.status(400).json({ success: false, message: 'muscleGroupId e priority richiesti' });
            }
            const data = await volumeService.setMusclePriority(clientId, req.user.tenantId, muscleGroupId, priority, notes);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/volume/:clientId/priorities/:muscleGroupId - Rimuovi priorita
     */
    async deletePriority(req, res, next) {
        try {
            const { clientId, muscleGroupId } = req.params;
            const deleted = await volumeService.deleteMusclePriority(clientId, req.user.tenantId, muscleGroupId);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Priorita non trovata' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VolumeController();
