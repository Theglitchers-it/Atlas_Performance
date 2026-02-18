/**
 * Search Routes
 * Endpoint per ricerca globale
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { verifyToken } = require('../middlewares/auth');

/**
 * @swagger
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Ricerca globale
 *     description: Esegue una ricerca globale su clienti, esercizi, programmi, workout e altri contenuti della piattaforma.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Termine di ricerca
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [clients, exercises, programs, workouts, all]
 *         description: Filtra per tipo di contenuto
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Risultati di ricerca
 *       400:
 *         description: Parametro di ricerca mancante
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', verifyToken, searchController.globalSearch.bind(searchController));

module.exports = router;
