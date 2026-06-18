/**
 * Food Routes
 * /api/foods — database alimenti tenant-scoped
 */

const express = require('express');
const router = express.Router();

const foodController = require('../controllers/food.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', foodController.search.bind(foodController));
router.get('/:id', foodController.getById.bind(foodController));
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin', 'client'), foodController.create.bind(foodController));
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), foodController.update.bind(foodController));
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), foodController.delete.bind(foodController));

module.exports = router;
