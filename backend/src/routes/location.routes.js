/**
 * Location Routes
 * Gestione sedi multi-location
 */

const express = require('express');
const router = express.Router();

const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('LOCATION_ROUTES');

router.use(verifyToken);
router.use(requireRole('tenant_owner', 'staff', 'super_admin'));

/**
 * @swagger
 * /locations:
 *   get:
 *     tags: [Locations]
 *     summary: Lista sedi
 *     description: Restituisce tutte le sedi del tenant. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista sedi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/', async (req, res) => {
    try {
        const locations = await query(
            'SELECT * FROM locations WHERE tenant_id = ? ORDER BY name',
            [req.user.tenantId]
        );
        res.json({ success: true, data: { locations } });
    } catch (error) {
        // Se la tabella non esiste, ritorna array vuoto
        if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
            return res.json({ success: true, data: { locations: [] } });
        }
        logger.error('Error getting locations', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nel recupero sedi' });
    }
});

/**
 * @swagger
 * /locations:
 *   post:
 *     tags: [Locations]
 *     summary: Crea sede
 *     description: Crea una nuova sede per il tenant. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Sede creata
 *       400:
 *         description: Nome sede obbligatorio
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/', async (req, res) => {
    try {
        const { name, address, city, phone, notes, is_active } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Nome sede obbligatorio' });
        }
        const result = await query(
            'INSERT INTO locations (tenant_id, name, address, city, phone, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.tenantId, name.trim(), address || null, city || null, phone || null, notes || null, is_active !== false ? 1 : 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, message: 'Sede creata' } });
    } catch (error) {
        logger.error('Error creating location', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nella creazione sede' });
    }
});

/**
 * @swagger
 * /locations/{id}:
 *   put:
 *     tags: [Locations]
 *     summary: Aggiorna sede
 *     description: Aggiorna i dettagli di una sede. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della sede
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Sede aggiornata
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Sede non trovata
 *       500:
 *         description: Errore server
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, address, city, phone, notes, is_active } = req.body;
        await query(
            'UPDATE locations SET name = ?, address = ?, city = ?, phone = ?, notes = ?, is_active = ? WHERE id = ? AND tenant_id = ?',
            [name, address || null, city || null, phone || null, notes || null, is_active !== false ? 1 : 0, req.params.id, req.user.tenantId]
        );
        res.json({ success: true, message: 'Sede aggiornata' });
    } catch (error) {
        logger.error('Error updating location', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore aggiornamento sede' });
    }
});

/**
 * @swagger
 * /locations/{id}:
 *   delete:
 *     tags: [Locations]
 *     summary: Elimina sede
 *     description: Elimina una sede del tenant. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della sede
 *     responses:
 *       200:
 *         description: Sede eliminata
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Sede non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/:id', async (req, res) => {
    try {
        await query(
            'DELETE FROM locations WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.user.tenantId]
        );
        res.json({ success: true, message: 'Sede eliminata' });
    } catch (error) {
        logger.error('Error deleting location', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore eliminazione sede' });
    }
});

module.exports = router;
