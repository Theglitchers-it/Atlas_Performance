/**
 * User Routes
 * Endpoint per gestione utenti
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken, requireRole, requireTenantOwner } = require('../middlewares/auth');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');

// Tutte le route richiedono autenticazione
router.use(verifyToken);

// GET /api/users - Lista utenti
router.get('/', requireRole('tenant_owner', 'staff', 'super_admin'), userController.getAll);

// GET /api/users/:id - Dettaglio utente
router.get('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), userController.getById);

// POST /api/users - Crea utente (solo tenant owner)
router.post('/', requireTenantOwner, validate(createUserSchema), userController.create);

// PUT /api/users/:id - Aggiorna utente
router.put('/:id', requireTenantOwner, validate(updateUserSchema), userController.update);

// DELETE /api/users/:id - Elimina utente (solo tenant owner)
router.delete('/:id', requireTenantOwner, userController.delete);

// PUT /api/users/:id/avatar - Aggiorna avatar
router.put('/:id/avatar', userController.updateAvatar);

module.exports = router;
