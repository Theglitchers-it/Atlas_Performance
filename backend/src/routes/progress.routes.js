/**
 * Progress Routes
 * Foto progresso e record performance
 */

const express = require('express');
const router = express.Router();

const progressController = require('../controllers/progress.controller');
const { verifyToken } = require('../middlewares/auth');
const { uploadProgress, handleUploadError } = require('../middlewares/upload');

router.use(verifyToken);

// ============================================
// PROGRESS PHOTOS
// ============================================

/**
 * @swagger
 * /progress/{clientId}/photos:
 *   get:
 *     tags: [Progress]
 *     summary: Lista foto progresso
 *     description: Restituisce tutte le foto di progresso di un cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista foto progresso
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/photos', progressController.getPhotos.bind(progressController));

/**
 * @swagger
 * /progress/{clientId}/photos:
 *   post:
 *     tags: [Progress]
 *     summary: Aggiungi foto progresso
 *     description: Carica una o piu foto di progresso per un cliente (max 5 file).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *               category:
 *                 type: string
 *                 enum: [front, back, side_left, side_right]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Foto caricate con successo
 *       400:
 *         description: Dati non validi o file mancanti
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/photos', uploadProgress.array('photos', 5), handleUploadError, progressController.addPhoto.bind(progressController));

/**
 * @swagger
 * /progress/{clientId}/photos/compare:
 *   get:
 *     tags: [Progress]
 *     summary: Confronto foto progresso
 *     description: Confronta foto di progresso del cliente tra due date.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date1
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date2
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Foto per confronto
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/photos/compare', progressController.comparePhotos.bind(progressController));

/**
 * @swagger
 * /progress/photos/{photoId}:
 *   delete:
 *     tags: [Progress]
 *     summary: Elimina foto progresso
 *     description: Elimina una foto di progresso specifica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Foto eliminata
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Foto non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/photos/:photoId', progressController.deletePhoto.bind(progressController));

// ============================================
// PERFORMANCE RECORDS
// ============================================

/**
 * @swagger
 * /progress/{clientId}/records:
 *   get:
 *     tags: [Progress]
 *     summary: Lista record performance
 *     description: Restituisce tutti i record di performance di un cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista record
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/records', progressController.getRecords.bind(progressController));

/**
 * @swagger
 * /progress/{clientId}/records:
 *   post:
 *     tags: [Progress]
 *     summary: Aggiungi record performance
 *     description: Registra un nuovo record di performance per un cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exerciseId, value]
 *             properties:
 *               exerciseId:
 *                 type: integer
 *               value:
 *                 type: number
 *                 description: Valore del record (peso, ripetizioni, tempo)
 *               type:
 *                 type: string
 *                 enum: [weight, reps, time]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Record aggiunto
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/records', progressController.addRecord.bind(progressController));

/**
 * @swagger
 * /progress/{clientId}/personal-bests:
 *   get:
 *     tags: [Progress]
 *     summary: Personal bests cliente
 *     description: Restituisce i personal best per ogni esercizio del cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista personal bests
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/personal-bests', progressController.getPersonalBests.bind(progressController));

/**
 * @swagger
 * /progress/{clientId}/records/history/{exerciseId}:
 *   get:
 *     tags: [Progress]
 *     summary: Storico record per esercizio
 *     description: Restituisce lo storico dei record di un esercizio specifico per il cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Storico record esercizio
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/records/history/:exerciseId', progressController.getRecordHistory.bind(progressController));

/**
 * @swagger
 * /progress/records/{recordId}:
 *   delete:
 *     tags: [Progress]
 *     summary: Elimina record performance
 *     description: Elimina un record di performance specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record eliminato
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Record non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/records/:recordId', progressController.deleteRecord.bind(progressController));

module.exports = router;
