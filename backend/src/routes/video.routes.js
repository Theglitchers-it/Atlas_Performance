/**
 * Video Routes
 * Gestione video, corsi, moduli e progresso
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const videoController = require('../controllers/video.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { uploadVideo, handleUploadError } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');
const { createCourseSchema, updateCourseSchema, createVideoSchema, updateVideoSchema } = require('../validators/video.validator');

// Rate limit on video upload (3 uploads / 5 min per IP)
const videoUploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Troppi upload video, riprova tra qualche minuto'
    }
});

router.use(verifyToken);

// =====================
// STATISTICHE
// =====================

/**
 * @swagger
 * /videos/stats:
 *   get:
 *     tags: [Videos]
 *     summary: Statistiche video e corsi
 *     description: Restituisce statistiche aggregate su video e corsi del tenant. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche video/corsi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/stats', requireRole('tenant_owner', 'staff', 'super_admin'), videoController.getStats);

// =====================
// CORSI
// =====================

/**
 * @swagger
 * /videos/courses:
 *   get:
 *     tags: [Videos]
 *     summary: Lista corsi
 *     description: Restituisce tutti i corsi video disponibili.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista corsi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/courses', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.getAllCourses);

/**
 * @swagger
 * /videos/courses:
 *   post:
 *     tags: [Videos]
 *     summary: Crea corso
 *     description: Crea un nuovo corso video. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               is_published:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Corso creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/courses', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createCourseSchema), videoController.createCourse);

/**
 * @swagger
 * /videos/courses/{id}:
 *   get:
 *     tags: [Videos]
 *     summary: Dettaglio corso
 *     description: Restituisce i dettagli di un corso con i moduli e video associati.
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
 *         description: Dettaglio corso
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Corso non trovato
 *       500:
 *         description: Errore server
 */
router.get('/courses/:id', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.getCourseById);

/**
 * @swagger
 * /videos/courses/{id}:
 *   put:
 *     tags: [Videos]
 *     summary: Aggiorna corso
 *     description: Aggiorna i dettagli di un corso. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               is_published:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Corso aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Corso non trovato
 *       500:
 *         description: Errore server
 */
router.put('/courses/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateCourseSchema), videoController.updateCourse);

/**
 * @swagger
 * /videos/courses/{id}:
 *   delete:
 *     tags: [Videos]
 *     summary: Elimina corso
 *     description: Elimina un corso e i moduli associati. Solo trainer e admin.
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
 *         description: Corso eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Corso non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/courses/:id', requireRole('tenant_owner', 'staff', 'super_admin'), videoController.deleteCourse);

/**
 * @swagger
 * /videos/courses/{id}/progress:
 *   get:
 *     tags: [Videos]
 *     summary: Progresso corso utente
 *     description: Restituisce il progresso dell'utente corrente in un corso specifico.
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
 *         description: Progresso corso
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Corso non trovato
 *       500:
 *         description: Errore server
 */
router.get('/courses/:id/progress', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.getCourseProgress);

/**
 * @swagger
 * /videos/courses/{courseId}/modules/{moduleId}/progress:
 *   put:
 *     tags: [Videos]
 *     summary: Aggiorna progresso modulo
 *     description: Aggiorna il progresso dell'utente per un modulo specifico di un corso.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed:
 *                 type: boolean
 *               progress_seconds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Progresso aggiornato
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Corso o modulo non trovato
 *       500:
 *         description: Errore server
 */
router.put('/courses/:courseId/modules/:moduleId/progress', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.updateModuleProgress);

// =====================
// VIDEO
// =====================

/**
 * @swagger
 * /videos:
 *   get:
 *     tags: [Videos]
 *     summary: Lista video
 *     description: Restituisce tutti i video disponibili con paginazione e filtri.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista video
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.getAll);

/**
 * @swagger
 * /videos:
 *   post:
 *     tags: [Videos]
 *     summary: Crea video
 *     description: Crea un nuovo video nella libreria. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, url]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               duration_seconds:
 *                 type: integer
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createVideoSchema), videoController.create);

/**
 * @swagger
 * /videos/{id}:
 *   get:
 *     tags: [Videos]
 *     summary: Dettaglio video
 *     description: Restituisce i dettagli completi di un video.
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
 *         description: Dettaglio video
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Video non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.getById);

/**
 * @swagger
 * /videos/{id}:
 *   put:
 *     tags: [Videos]
 *     summary: Aggiorna video
 *     description: Aggiorna i dettagli di un video. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               duration_seconds:
 *                 type: integer
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Video non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateVideoSchema), videoController.update);

/**
 * @swagger
 * /videos/{id}:
 *   delete:
 *     tags: [Videos]
 *     summary: Elimina video
 *     description: Elimina un video dalla libreria. Solo trainer e admin.
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
 *         description: Video eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Video non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), videoController.delete);

/**
 * @swagger
 * /videos/{id}/view:
 *   post:
 *     tags: [Videos]
 *     summary: Incrementa visualizzazioni video
 *     description: Incrementa il contatore delle visualizzazioni di un video.
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
 *         description: Visualizzazione registrata
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Video non trovato
 *       500:
 *         description: Errore server
 */
router.post('/:id/view', requireRole('tenant_owner', 'staff', 'client', 'super_admin'), videoController.incrementViews);

/**
 * @swagger
 * /videos/upload:
 *   post:
 *     tags: [Videos]
 *     summary: Upload file video
 *     description: Carica un file video sulla piattaforma. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [video]
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video caricato con successo
 *       400:
 *         description: File non valido
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/upload', videoUploadLimiter, requireRole('tenant_owner', 'staff', 'super_admin'), uploadVideo.single('video'), handleUploadError, videoController.uploadFile);

module.exports = router;
