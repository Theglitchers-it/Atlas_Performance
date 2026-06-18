/**
 * Progress Controller
 * Gestione HTTP per foto progresso e record performance
 */

const progressService = require('../services/progress.service');
const { getFileUrl } = require('../middlewares/upload');
const { assertClientAccess, getOwnClientId } = require('../utils/clientAccess');
const { query } = require('../config/database');

class ProgressController {

    // === PROGRESS PHOTOS ===

    /**
     * GET /api/progress/:clientId/photos - Lista foto
     */
    async getPhotos(req, res, next) {
        try {
            const clientId = await assertClientAccess(req.params.clientId, req.user.tenantId, req.user);
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
     * POST /api/progress/:clientId/photos - Aggiungi foto (multipart upload)
     */
    async addPhoto(req, res, next) {
        try {
            const clientId = await assertClientAccess(req.params.clientId, req.user.tenantId, req.user);
            const files = req.files || [];
            if (files.length === 0) {
                return res.status(400).json({ success: false, message: 'Nessun file caricato' });
            }

            const { photoType, takenAt, notes, bodyWeight, bodyFatPct } = req.body;
            const baseData = {
                photoType,
                takenAt,
                notes,
                bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
                bodyFatPct: bodyFatPct ? parseFloat(bodyFatPct) : null
            };

            const created = await Promise.all(files.map(async (file) => {
                const photoUrl = getFileUrl(file.path);
                const result = await progressService.addPhoto(clientId, req.user.tenantId, {
                    ...baseData,
                    photoUrl,
                    thumbnailUrl: null
                });
                return { id: result.id, photoUrl };
            }));

            res.status(201).json({ success: true, data: { photos: created, count: created.length } });
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
            // Risolvi client_id della foto, poi verifica ownership (client non può cancellare foto di altri)
            const rows = await query(
                'SELECT client_id FROM progress_photos WHERE id = ? AND tenant_id = ?',
                [parseInt(photoId, 10), req.user.tenantId]
            );
            if (!rows[0]) {
                return res.status(404).json({ success: false, message: 'Foto non trovata' });
            }
            await assertClientAccess(rows[0].client_id, req.user.tenantId, req.user);
            await progressService.deletePhoto(photoId, req.user.tenantId);
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
            const clientId = await assertClientAccess(req.params.clientId, req.user.tenantId, req.user);
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
            let { clientId } = req.params;
            // Alias 'me': risolve al profilo cliente dell'utente loggato.
            // Staff/owner non hanno un profilo cliente → nessun record (lista vuota, non un 500).
            if (clientId === 'me') {
                const ownClientId = await getOwnClientId(req.user.id, req.user.tenantId);
                if (!ownClientId) {
                    return res.json({ success: true, data: [] });
                }
                // getOwnClientId garantisce già che il profilo è dell'utente:
                // evitiamo la seconda query ridondante di assertClientAccess.
                clientId = ownClientId;
            } else {
                clientId = await assertClientAccess(clientId, req.user.tenantId, req.user);
            }
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
            const clientId = await assertClientAccess(req.params.clientId, req.user.tenantId, req.user);
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
            const clientId = await assertClientAccess(req.params.clientId, req.user.tenantId, req.user);
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
            const { exerciseId } = req.params;
            const clientId = await assertClientAccess(req.params.clientId, req.user.tenantId, req.user);
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
            // Risolvi il client del record e verifica ownership: un client non può
            // cancellare record di performance di altri (stesso pattern di deletePhoto).
            const rows = await query(
                'SELECT client_id FROM performance_records WHERE id = ? AND tenant_id = ?',
                [parseInt(recordId, 10), req.user.tenantId]
            );
            if (!rows[0]) {
                return res.status(404).json({ success: false, message: 'Record non trovato' });
            }
            await assertClientAccess(rows[0].client_id, req.user.tenantId, req.user);
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
