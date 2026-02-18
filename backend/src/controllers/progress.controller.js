/**
 * Progress Controller
 * Gestione HTTP per foto progresso e record performance
 */

const progressService = require('../services/progress.service');

class ProgressController {

    // === PROGRESS PHOTOS ===

    /**
     * GET /api/progress/:clientId/photos - Lista foto
     */
    async getPhotos(req, res, next) {
        try {
            const { clientId } = req.params;
            const { photoType, startDate, endDate, limit, page } = req.query;
            const data = await progressService.getPhotos(clientId, req.user.tenantId, {
                photoType, startDate, endDate,
                limit: limit ? parseInt(limit) : undefined,
                page: page ? parseInt(page) : undefined
            });
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/progress/:clientId/photos - Aggiungi foto
     */
    async addPhoto(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await progressService.addPhoto(clientId, req.user.tenantId, req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/progress/photos/:photoId - Elimina foto
     */
    async deletePhoto(req, res, next) {
        try {
            const { photoId } = req.params;
            const deleted = await progressService.deletePhoto(photoId, req.user.tenantId);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Foto non trovata' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/progress/:clientId/photos/compare - Confronto foto
     */
    async comparePhotos(req, res, next) {
        try {
            const { clientId } = req.params;
            const { date1, date2, photoType } = req.query;
            if (!date1 || !date2) {
                return res.status(400).json({ success: false, message: 'date1 e date2 richiesti' });
            }
            const data = await progressService.getPhotoComparison(clientId, req.user.tenantId, date1, date2, photoType);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    // === PERFORMANCE RECORDS ===

    /**
     * GET /api/progress/:clientId/records - Lista record
     */
    async getRecords(req, res, next) {
        try {
            const { clientId } = req.params;
            const { exerciseId, recordType, limit } = req.query;
            const data = await progressService.getRecords(clientId, req.user.tenantId, {
                exerciseId: exerciseId ? parseInt(exerciseId) : undefined,
                recordType,
                limit: limit ? parseInt(limit) : undefined
            });
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/progress/:clientId/records - Aggiungi record
     */
    async addRecord(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await progressService.addRecord(clientId, req.user.tenantId, req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/progress/:clientId/personal-bests - Personal bests
     */
    async getPersonalBests(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await progressService.getPersonalBests(clientId, req.user.tenantId);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/progress/:clientId/records/history/:exerciseId - Storico record per esercizio
     */
    async getRecordHistory(req, res, next) {
        try {
            const { clientId, exerciseId } = req.params;
            const { recordType } = req.query;
            const data = await progressService.getRecordHistory(clientId, req.user.tenantId, exerciseId, recordType);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/progress/records/:recordId - Elimina record
     */
    async deleteRecord(req, res, next) {
        try {
            const { recordId } = req.params;
            const deleted = await progressService.deleteRecord(recordId, req.user.tenantId);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Record non trovato' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProgressController();
