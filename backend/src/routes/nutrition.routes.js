/**
 * Nutrition Routes
 */

const express = require('express');
const router = express.Router();

const nutritionController = require('../controllers/nutrition.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createMealPlanSchema, updateMealPlanSchema, addPlanDaySchema, addMealSchema, addMealItemSchema } = require('../validators/nutrition.validator');

router.use(verifyToken);

// ==================== MEAL PLANS ====================

/**
 * @swagger
 * /nutrition/plans:
 *   get:
 *     tags: [Nutrition]
 *     summary: Lista piani alimentari
 *     description: Restituisce tutti i piani alimentari del tenant con paginazione.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *         description: Filtra per cliente
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
 *         description: Lista piani alimentari
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/plans', nutritionController.getMealPlans);

/**
 * @swagger
 * /nutrition/plans/{planId}:
 *   get:
 *     tags: [Nutrition]
 *     summary: Dettaglio piano alimentare
 *     description: Restituisce il dettaglio completo di un piano alimentare con giorni, pasti e alimenti.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dettaglio piano alimentare
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Piano non trovato
 *       500:
 *         description: Errore server
 */
router.get('/plans/:planId', nutritionController.getMealPlanById);

/**
 * @swagger
 * /nutrition/plans:
 *   post:
 *     tags: [Nutrition]
 *     summary: Crea piano alimentare
 *     description: Crea un nuovo piano alimentare. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, clientId]
 *             properties:
 *               name:
 *                 type: string
 *               clientId:
 *                 type: integer
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               targetCalories:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Piano alimentare creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/plans', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createMealPlanSchema), nutritionController.createMealPlan);

/**
 * @swagger
 * /nutrition/plans/{planId}:
 *   put:
 *     tags: [Nutrition]
 *     summary: Aggiorna piano alimentare
 *     description: Aggiorna i dettagli di un piano alimentare. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
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
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               targetCalories:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed]
 *     responses:
 *       200:
 *         description: Piano aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Piano non trovato
 *       500:
 *         description: Errore server
 */
router.put('/plans/:planId', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateMealPlanSchema), nutritionController.updateMealPlan);

/**
 * @swagger
 * /nutrition/plans/{planId}:
 *   delete:
 *     tags: [Nutrition]
 *     summary: Elimina piano alimentare
 *     description: Elimina un piano alimentare e tutti i dati associati. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Piano eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Piano non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/plans/:planId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deleteMealPlan);

// ==================== PLAN DAYS ====================

/**
 * @swagger
 * /nutrition/plans/{planId}/days:
 *   post:
 *     tags: [Nutrition]
 *     summary: Aggiungi giorno al piano
 *     description: Aggiunge un nuovo giorno a un piano alimentare. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayName]
 *             properties:
 *               dayName:
 *                 type: string
 *               dayNumber:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Giorno aggiunto
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/plans/:planId/days', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addPlanDaySchema), nutritionController.addPlanDay);

/**
 * @swagger
 * /nutrition/days/{dayId}:
 *   put:
 *     tags: [Nutrition]
 *     summary: Aggiorna giorno del piano
 *     description: Aggiorna un giorno di un piano alimentare. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dayName:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giorno aggiornato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Giorno non trovato
 *       500:
 *         description: Errore server
 */
router.put('/days/:dayId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updatePlanDay);

/**
 * @swagger
 * /nutrition/days/{dayId}:
 *   delete:
 *     tags: [Nutrition]
 *     summary: Elimina giorno del piano
 *     description: Elimina un giorno da un piano alimentare. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Giorno eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Giorno non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/days/:dayId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deletePlanDay);

/**
 * @swagger
 * /nutrition/days/{dayId}/totals:
 *   get:
 *     tags: [Nutrition]
 *     summary: Calcola nutrienti giorno
 *     description: Calcola i totali dei macronutrienti e calorie per un giorno specifico del piano.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Totali nutrienti del giorno
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Giorno non trovato
 *       500:
 *         description: Errore server
 */
router.get('/days/:dayId/totals', nutritionController.calculateDayNutrition);

// ==================== MEALS ====================

/**
 * @swagger
 * /nutrition/days/{dayId}/meals:
 *   post:
 *     tags: [Nutrition]
 *     summary: Aggiungi pasto
 *     description: Aggiunge un nuovo pasto a un giorno del piano. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayId
 *         required: true
 *         schema:
 *           type: integer
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
 *                 description: Nome del pasto (es. Colazione, Pranzo)
 *               time:
 *                 type: string
 *                 description: Orario del pasto
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pasto aggiunto
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/days/:dayId/meals', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addMealSchema), nutritionController.addMeal);

/**
 * @swagger
 * /nutrition/meals/{mealId}:
 *   put:
 *     tags: [Nutrition]
 *     summary: Aggiorna pasto
 *     description: Aggiorna un pasto esistente. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               time:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pasto aggiornato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Pasto non trovato
 *       500:
 *         description: Errore server
 */
router.put('/meals/:mealId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updateMeal);

/**
 * @swagger
 * /nutrition/meals/{mealId}:
 *   delete:
 *     tags: [Nutrition]
 *     summary: Elimina pasto
 *     description: Elimina un pasto e tutti gli alimenti associati. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pasto eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Pasto non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/meals/:mealId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deleteMeal);

// ==================== MEAL ITEMS ====================

/**
 * @swagger
 * /nutrition/meals/{mealId}/items:
 *   post:
 *     tags: [Nutrition]
 *     summary: Aggiungi alimento al pasto
 *     description: Aggiunge un alimento a un pasto. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, quantity]
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               calories:
 *                 type: number
 *               protein:
 *                 type: number
 *               carbs:
 *                 type: number
 *               fat:
 *                 type: number
 *     responses:
 *       201:
 *         description: Alimento aggiunto
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/meals/:mealId/items', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addMealItemSchema), nutritionController.addMealItem);

/**
 * @swagger
 * /nutrition/items/{itemId}:
 *   put:
 *     tags: [Nutrition]
 *     summary: Aggiorna alimento
 *     description: Aggiorna i dettagli di un alimento in un pasto. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               calories:
 *                 type: number
 *               protein:
 *                 type: number
 *               carbs:
 *                 type: number
 *               fat:
 *                 type: number
 *     responses:
 *       200:
 *         description: Alimento aggiornato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Alimento non trovato
 *       500:
 *         description: Errore server
 */
router.put('/items/:itemId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updateMealItem);

/**
 * @swagger
 * /nutrition/items/{itemId}:
 *   delete:
 *     tags: [Nutrition]
 *     summary: Elimina alimento
 *     description: Rimuove un alimento da un pasto. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alimento eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Alimento non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/items/:itemId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deleteMealItem);

// ==================== CLIENT SUMMARY ====================

/**
 * @swagger
 * /nutrition/clients/{clientId}/summary:
 *   get:
 *     tags: [Nutrition]
 *     summary: Riepilogo nutrizione cliente
 *     description: Restituisce un riepilogo della nutrizione del cliente con piani attivi e statistiche.
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
 *         description: Riepilogo nutrizione
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/clients/:clientId/summary', nutritionController.getClientNutritionSummary);

module.exports = router;
