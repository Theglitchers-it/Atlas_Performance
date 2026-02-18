/**
 * Class Routes
 * Corsi di gruppo, sessioni e iscrizioni
 */

const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createClassSchema, updateClassSchema, createSessionSchema } = require('../validators/class.validator');

// Tutte le routes richiedono autenticazione
router.use(verifyToken);

// Classi (CRUD - solo trainer+)

/**
 * @swagger
 * /classes:
 *   get:
 *     tags: [Classes]
 *     summary: Lista corsi di gruppo
 *     description: Restituisce tutti i corsi di gruppo disponibili.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista corsi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', classController.getClasses.bind(classController));

/**
 * @swagger
 * /classes/my:
 *   get:
 *     tags: [Classes]
 *     summary: I miei corsi
 *     description: Restituisce i corsi a cui l'utente corrente e iscritto.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista corsi dell'utente
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/my', classController.getMyClasses.bind(classController));

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     tags: [Classes]
 *     summary: Dettaglio corso
 *     description: Restituisce i dettagli di un corso di gruppo specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del corso
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
router.get('/:id', classController.getClassById.bind(classController));

/**
 * @swagger
 * /classes:
 *   post:
 *     tags: [Classes]
 *     summary: Crea corso di gruppo
 *     description: Crea un nuovo corso di gruppo. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, max_participants]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               max_participants:
 *                 type: integer
 *               duration_minutes:
 *                 type: integer
 *               color:
 *                 type: string
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
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createClassSchema), classController.createClass.bind(classController));

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     tags: [Classes]
 *     summary: Aggiorna corso
 *     description: Aggiorna i dettagli di un corso di gruppo. Solo trainer e admin.
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               max_participants:
 *                 type: integer
 *               duration_minutes:
 *                 type: integer
 *               color:
 *                 type: string
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
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateClassSchema), classController.updateClass.bind(classController));

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     tags: [Classes]
 *     summary: Elimina corso
 *     description: Elimina un corso di gruppo. Solo trainer e admin.
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
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), classController.deleteClass.bind(classController));

// Sessioni

/**
 * @swagger
 * /classes/sessions/list:
 *   get:
 *     tags: [Classes]
 *     summary: Lista sessioni di gruppo
 *     description: Restituisce tutte le sessioni programmate dei corsi di gruppo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista sessioni
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/sessions/list', classController.getSessions.bind(classController));

/**
 * @swagger
 * /classes/sessions/{id}:
 *   get:
 *     tags: [Classes]
 *     summary: Dettaglio sessione di gruppo
 *     description: Restituisce i dettagli di una sessione di gruppo specifica con lista iscritti.
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
 *         description: Dettaglio sessione
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Sessione non trovata
 *       500:
 *         description: Errore server
 */
router.get('/sessions/:id', classController.getSessionById.bind(classController));

/**
 * @swagger
 * /classes/sessions:
 *   post:
 *     tags: [Classes]
 *     summary: Crea sessione di gruppo
 *     description: Programma una nuova sessione per un corso di gruppo. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, startDatetime]
 *             properties:
 *               classId:
 *                 type: integer
 *               startDatetime:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sessione creata
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/sessions', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createSessionSchema), classController.createSession.bind(classController));

/**
 * @swagger
 * /classes/sessions/{id}/status:
 *   put:
 *     tags: [Classes]
 *     summary: Aggiorna stato sessione
 *     description: Modifica lo stato di una sessione di gruppo. Solo trainer e admin.
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Sessione non trovata
 *       500:
 *         description: Errore server
 */
router.put('/sessions/:id/status', requireRole('tenant_owner', 'staff', 'super_admin'), classController.updateSessionStatus.bind(classController));

/**
 * @swagger
 * /classes/sessions/{id}:
 *   delete:
 *     tags: [Classes]
 *     summary: Elimina sessione di gruppo
 *     description: Elimina una sessione programmata. Solo trainer e admin.
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
 *         description: Sessione eliminata
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Sessione non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/sessions/:id', requireRole('tenant_owner', 'staff', 'super_admin'), classController.deleteSession.bind(classController));

// Iscrizioni

/**
 * @swagger
 * /classes/sessions/{sessionId}/enroll:
 *   post:
 *     tags: [Classes]
 *     summary: Iscrivi cliente a sessione
 *     description: Iscrive il cliente corrente a una sessione di gruppo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Iscrizione effettuata
 *       400:
 *         description: Sessione piena o gia iscritto
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Sessione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/sessions/:sessionId/enroll', classController.enrollClient.bind(classController));

/**
 * @swagger
 * /classes/sessions/{sessionId}/cancel:
 *   post:
 *     tags: [Classes]
 *     summary: Annulla iscrizione a sessione
 *     description: Annulla l'iscrizione del cliente corrente da una sessione di gruppo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Iscrizione annullata
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Iscrizione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/sessions/:sessionId/cancel', classController.cancelEnrollment.bind(classController));

/**
 * @swagger
 * /classes/sessions/{sessionId}/checkin:
 *   post:
 *     tags: [Classes]
 *     summary: Check-in cliente alla sessione
 *     description: Registra la presenza di un cliente alla sessione di gruppo. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId]
 *             properties:
 *               clientId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Check-in effettuato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Iscrizione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/sessions/:sessionId/checkin', requireRole('tenant_owner', 'staff', 'super_admin'), classController.checkInClient.bind(classController));

/**
 * @swagger
 * /classes/sessions/{sessionId}/noshow:
 *   post:
 *     tags: [Classes]
 *     summary: Segna cliente come no-show
 *     description: Segna un cliente come assente (no-show) alla sessione di gruppo. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId]
 *             properties:
 *               clientId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: No-show registrato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Iscrizione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/sessions/:sessionId/noshow', requireRole('tenant_owner', 'staff', 'super_admin'), classController.markNoShow.bind(classController));

module.exports = router;
