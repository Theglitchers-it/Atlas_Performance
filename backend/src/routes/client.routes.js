/**
 * Client Routes
 * Endpoint per gestione clienti
 */

const express = require('express');
const router = express.Router();

const clientController = require('../controllers/client.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken, requireRole } = require('../middlewares/auth');
const {
    createClientSchema,
    updateClientSchema,
    addGoalSchema,
    addInjurySchema
} = require('../validators/client.validator');

// Tutte le route richiedono autenticazione
router.use(verifyToken);

// GET /api/clients - Lista clienti
router.get('/', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.getAll);

// GET /api/clients/:id - Dettaglio cliente
router.get('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.getById);

// POST /api/clients - Crea cliente
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createClientSchema), clientController.create);

// PUT /api/clients/:id - Aggiorna cliente
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateClientSchema), clientController.update);

// DELETE /api/clients/:id - Elimina cliente
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.delete);

// GET /api/clients/:id/stats - Statistiche cliente
router.get('/:id/stats', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.getStats);

// POST /api/clients/:id/goals - Aggiungi obiettivo
router.post('/:id/goals', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addGoalSchema), clientController.addGoal);

// POST /api/clients/:id/injuries - Aggiungi infortunio
router.post('/:id/injuries', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addInjurySchema), clientController.addInjury);

// POST /api/clients/:id/xp - Aggiungi XP
router.post('/:id/xp', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.addXP);

module.exports = router;
