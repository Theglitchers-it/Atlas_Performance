/**
 * Anthropometric Routes
 * Gestione parametri antropometrici, plicometria, circonferenze e BIA
 */

const express = require('express');
const router = express.Router();

const anthropometricController = require('../controllers/anthropometric.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// ============================================
// PANORAMICA COMPOSIZIONE CORPOREA
// ============================================

/**
 * @swagger
 * /anthropometric/{clientId}/overview:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Dashboard composizione corporea
 *     description: Restituisce una panoramica completa della composizione corporea del cliente (antropometria, plicometria, circonferenze, BIA).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Panoramica composizione corporea
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/overview', anthropometricController.getOverview.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/compare:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Confronto misurazioni tra due date
 *     description: Confronta i dati antropometrici del cliente tra due date specifiche.
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
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Prima data di confronto
 *       - in: query
 *         name: date2
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Seconda data di confronto
 *     responses:
 *       200:
 *         description: Confronto misurazioni
 *       400:
 *         description: Date non valide
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/compare', anthropometricController.compareMeasurements.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/dates:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Date disponibili per confronto
 *     description: Restituisce le date per cui sono disponibili misurazioni del cliente.
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
 *         description: Lista date disponibili
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/dates', anthropometricController.getAvailableDates.bind(anthropometricController));

// ============================================
// PARAMETRI ANTROPOMETRICI BASE
// ============================================

/**
 * @swagger
 * /anthropometric/{clientId}:
 *   post:
 *     tags: [Anthropometric]
 *     summary: Salva dati antropometrici
 *     description: Salva una nuova misurazione antropometrica per il cliente (peso, altezza, BMI, ecc.).
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
 *             properties:
 *               weight_kg:
 *                 type: number
 *               height_cm:
 *                 type: number
 *               bmi:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dati antropometrici salvati
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId', anthropometricController.saveAnthropometric.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Ultimo dato antropometrico
 *     description: Restituisce l'ultima misurazione antropometrica del cliente.
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
 *         description: Ultimo dato antropometrico
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Nessun dato trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId', anthropometricController.getLatest.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/history:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Storico dati antropometrici
 *     description: Restituisce lo storico delle misurazioni antropometriche del cliente.
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
 *         description: Storico misurazioni
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/history', anthropometricController.getHistory.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/record/{id}:
 *   delete:
 *     tags: [Anthropometric]
 *     summary: Elimina misurazione antropometrica
 *     description: Elimina un record antropometrico specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del record
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
router.delete('/record/:id', anthropometricController.deleteAnthropometric.bind(anthropometricController));

// ============================================
// PLICOMETRIA
// ============================================

/**
 * @swagger
 * /anthropometric/{clientId}/skinfold:
 *   post:
 *     tags: [Anthropometric]
 *     summary: Salva plicometria
 *     description: Salva una nuova misurazione plicometrica (pliche cutanee) per il cliente.
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
 *             properties:
 *               chest:
 *                 type: number
 *               abdominal:
 *                 type: number
 *               thigh:
 *                 type: number
 *               tricep:
 *                 type: number
 *               subscapular:
 *                 type: number
 *               suprailiac:
 *                 type: number
 *               midaxillary:
 *                 type: number
 *               formula:
 *                 type: string
 *     responses:
 *       201:
 *         description: Plicometria salvata
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/skinfold', anthropometricController.saveSkinfold.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/skinfold:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Ultimo dato plicometria
 *     description: Restituisce l'ultima misurazione plicometrica del cliente.
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
 *         description: Ultimo dato plicometria
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Nessun dato trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/skinfold', anthropometricController.getLatestSkinfold.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/skinfold/history:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Storico plicometria
 *     description: Restituisce lo storico delle misurazioni plicometriche del cliente.
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
 *         description: Storico plicometria
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/skinfold/history', anthropometricController.getSkinfoldHistory.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/skinfold/body-fat-trend:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Trend percentuale grasso corporeo
 *     description: Restituisce il trend della percentuale di grasso corporeo calcolata dalla plicometria.
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
 *         description: Trend body fat
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/skinfold/body-fat-trend', anthropometricController.getBodyFatTrend.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/skinfold/{id}:
 *   delete:
 *     tags: [Anthropometric]
 *     summary: Elimina misurazione plicometrica
 *     description: Elimina un record di plicometria specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
router.delete('/skinfold/:id', anthropometricController.deleteSkinfold.bind(anthropometricController));

// ============================================
// CIRCONFERENZE
// ============================================

/**
 * @swagger
 * /anthropometric/{clientId}/circumference:
 *   post:
 *     tags: [Anthropometric]
 *     summary: Salva circonferenze
 *     description: Salva nuove misurazioni delle circonferenze corporee per il cliente.
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
 *             properties:
 *               neck:
 *                 type: number
 *               chest:
 *                 type: number
 *               waist:
 *                 type: number
 *               hips:
 *                 type: number
 *               bicep_left:
 *                 type: number
 *               bicep_right:
 *                 type: number
 *               thigh_left:
 *                 type: number
 *               thigh_right:
 *                 type: number
 *               calf_left:
 *                 type: number
 *               calf_right:
 *                 type: number
 *     responses:
 *       201:
 *         description: Circonferenze salvate
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/circumference', anthropometricController.saveCircumference.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/circumference:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Ultimo dato circonferenze
 *     description: Restituisce l'ultima misurazione delle circonferenze del cliente.
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
 *         description: Ultimo dato circonferenze
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Nessun dato trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/circumference', anthropometricController.getLatestCircumference.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/circumference/history:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Storico circonferenze
 *     description: Restituisce lo storico delle misurazioni delle circonferenze del cliente.
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
 *         description: Storico circonferenze
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/circumference/history', anthropometricController.getCircumferenceHistory.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/circumference/{id}:
 *   delete:
 *     tags: [Anthropometric]
 *     summary: Elimina misurazione circonferenze
 *     description: Elimina un record di circonferenze specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
router.delete('/circumference/:id', anthropometricController.deleteCircumference.bind(anthropometricController));

// ============================================
// BIA - BIOIMPEDENZA
// ============================================

/**
 * @swagger
 * /anthropometric/{clientId}/bia:
 *   post:
 *     tags: [Anthropometric]
 *     summary: Salva dati BIA
 *     description: Salva una nuova misurazione BIA (bioimpedenza) per il cliente.
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
 *             properties:
 *               fat_mass_kg:
 *                 type: number
 *               lean_mass_kg:
 *                 type: number
 *               water_percentage:
 *                 type: number
 *               muscle_mass_kg:
 *                 type: number
 *               bone_mass_kg:
 *                 type: number
 *               visceral_fat:
 *                 type: number
 *               basal_metabolic_rate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Dati BIA salvati
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/bia', anthropometricController.saveBia.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/bia:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Ultimo dato BIA
 *     description: Restituisce l'ultima misurazione BIA del cliente.
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
 *         description: Ultimo dato BIA
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Nessun dato trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/bia', anthropometricController.getLatestBia.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/{clientId}/bia/history:
 *   get:
 *     tags: [Anthropometric]
 *     summary: Storico BIA
 *     description: Restituisce lo storico delle misurazioni BIA del cliente.
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
 *         description: Storico BIA
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/bia/history', anthropometricController.getBiaHistory.bind(anthropometricController));

/**
 * @swagger
 * /anthropometric/bia/{id}:
 *   delete:
 *     tags: [Anthropometric]
 *     summary: Elimina misurazione BIA
 *     description: Elimina un record BIA specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
router.delete('/bia/:id', anthropometricController.deleteBia.bind(anthropometricController));

module.exports = router;
