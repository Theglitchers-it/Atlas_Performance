/**
 * Auth Routes
 * Endpoint per autenticazione
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken } = require('../middlewares/auth');
const {
    registerSchema,
    loginSchema,
    refreshTokenSchema
} = require('../validators/auth.validator');

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', verifyToken, authController.me);
router.post('/logout-all', verifyToken, authController.logoutAll);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
