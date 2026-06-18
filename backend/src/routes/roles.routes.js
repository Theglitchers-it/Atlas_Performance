/**
 * Roles & Team Routes (Fase 1 multi-livello)
 * Mount in server.js: app.use('/api/roles', rolesRoutes)
 *
 * IMPORTANTE: Le rotte di assegnazione ruoli, modifica gerarchia e gestione client_trainers
 * sono limitate a gym_admin / tenant_owner / super_admin. Le qualifiche personali ("/me")
 * sono accessibili a qualsiasi utente autenticato.
 */

const express = require('express');
const router = express.Router();

const rolesController = require('../controllers/roles.controller');
const { verifyToken, requireGymAdmin, requireStaff } = require('../middlewares/auth');

router.use(verifyToken);

// ----- USER ROLES -----
router.get('/users/me/roles', rolesController.listMyRoles);
router.get('/users/:id/roles', requireGymAdmin, rolesController.listUserRoles);
router.post('/users/:id/roles', requireGymAdmin, rolesController.assignRole);
router.delete('/users/:id/roles/:role', requireGymAdmin, rolesController.removeRole);

// ----- TEAM HIERARCHY -----
router.get('/team/me', rolesController.getMyTeam);
router.put('/users/:id/parent', requireGymAdmin, rolesController.setParent);

// ----- TEAM STAFF CRUD (gym_admin / tenant_owner) -----
router.post('/team/staff', requireGymAdmin, rolesController.createTeamStaff);
router.patch('/team/staff/:userId/role', requireGymAdmin, rolesController.updateTeamStaffRole);
router.delete('/team/staff/:userId', requireGymAdmin, rolesController.removeTeamStaff);

// ----- CLIENT TRAINERS -----
router.get('/clients/:id/trainers', rolesController.getClientTrainers);
router.post('/clients/:id/trainers', requireStaff, rolesController.assignTrainerToClient);
router.delete('/clients/:id/trainers/:userId', requireStaff, rolesController.removeTrainerFromClient);

// ----- QUALIFICATIONS -----
router.get('/users/me/qualifications', rolesController.listMyQualifications);
router.post('/users/me/qualifications', rolesController.addMyQualification);
router.delete('/users/me/qualifications/:id', rolesController.deleteMyQualification);
router.get('/users/:id/qualifications', requireGymAdmin, rolesController.listUserQualifications);
router.post('/qualifications/:id/verify', requireGymAdmin, rolesController.verifyQualification);

module.exports = router;
