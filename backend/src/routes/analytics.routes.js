/**
 * Analytics Routes
 * Endpoint per statistiche e reportistica
 */

const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const exportService = require('../services/export.service');
const reportService = require('../services/report.service');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Tutte le route richiedono autenticazione e ruolo staff+
router.use(verifyToken);
router.use(requireRole('tenant_owner', 'staff', 'super_admin'));

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Overview generale delle statistiche
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Periodo di analisi
 *     responses:
 *       200:
 *         description: Overview con metriche principali
 *       401:
 *         description: Non autenticato
 */
router.get('/overview', analyticsController.getOverview);

/**
 * @swagger
 * /analytics/quick-stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Statistiche rapide
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats rapide (clienti totali, sessioni, revenue)
 */
router.get('/quick-stats', analyticsController.getQuickStats);

/**
 * @swagger
 * /analytics/sessions-trend:
 *   get:
 *     tags: [Analytics]
 *     summary: Trend sessioni nel tempo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Dati trend sessioni per grafico
 */
router.get('/sessions-trend', analyticsController.getSessionTrend);

/**
 * @swagger
 * /analytics/top-clients:
 *   get:
 *     tags: [Analytics]
 *     summary: Clienti piu attivi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Lista clienti ordinati per attivita
 */
router.get('/top-clients', analyticsController.getTopClients);

/**
 * @swagger
 * /analytics/appointments-distribution:
 *   get:
 *     tags: [Analytics]
 *     summary: Distribuzione appuntamenti per giorno/ora
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribuzione appuntamenti
 */
router.get('/appointments-distribution', analyticsController.getAppointmentDistribution);

/**
 * @swagger
 * /analytics/readiness-trend:
 *   get:
 *     tags: [Analytics]
 *     summary: Trend readiness dei clienti
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: Dati trend readiness
 */
router.get('/readiness-trend', analyticsController.getReadinessTrend);

/**
 * @swagger
 * /analytics/program-completion:
 *   get:
 *     tags: [Analytics]
 *     summary: Tasso completamento programmi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche completamento programmi
 */
router.get('/program-completion', analyticsController.getProgramCompletion);

// ============================================
// EXPORT CSV
// ============================================

/**
 * @swagger
 * /analytics/export/payments:
 *   get:
 *     tags: [Analytics]
 *     summary: Export pagamenti in formato CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File CSV pagamenti
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/payments', async (req, res) => {
    try {
        const result = await exportService.exportPaymentsCSV(req.user.tenantId, req.query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/export/clients:
 *   get:
 *     tags: [Analytics]
 *     summary: Export clienti in formato CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File CSV clienti
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/clients', async (req, res) => {
    try {
        const result = await exportService.exportClientsCSV(req.user.tenantId, req.query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/export/analytics:
 *   get:
 *     tags: [Analytics]
 *     summary: Export analytics in formato CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: File CSV analytics
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/analytics', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const result = await exportService.exportAnalyticsCSV(req.user.tenantId, period);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/export/sessions:
 *   get:
 *     tags: [Analytics]
 *     summary: Export sessioni workout in formato CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File CSV sessioni
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/sessions', async (req, res) => {
    try {
        const result = await exportService.exportWorkoutSessionsCSV(req.user.tenantId, req.query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/export/measurements:
 *   get:
 *     tags: [Analytics]
 *     summary: Export misurazioni in formato CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File CSV misurazioni
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/measurements', async (req, res) => {
    try {
        const result = await exportService.exportMeasurementsCSV(req.user.tenantId, req.query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// EXPORT EXCEL (XLSX)
// ============================================

/**
 * @swagger
 * /analytics/export/payments/excel:
 *   get:
 *     tags: [Analytics]
 *     summary: Export pagamenti in formato Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel pagamenti
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/payments/excel', async (req, res) => {
    try {
        const result = await exportService.exportPaymentsExcel(req.user.tenantId, req.query);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/export/clients/excel:
 *   get:
 *     tags: [Analytics]
 *     summary: Export clienti in formato Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel clienti
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/clients/excel', async (req, res) => {
    try {
        const result = await exportService.exportClientsExcel(req.user.tenantId, req.query);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/export/analytics/excel:
 *   get:
 *     tags: [Analytics]
 *     summary: Export analytics in formato Excel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: File Excel analytics
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/analytics/excel', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const result = await exportService.exportAnalyticsExcel(req.user.tenantId, period);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// REPORT PDF
// ============================================

/**
 * @swagger
 * /analytics/report/client/{clientId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Report progresso cliente in PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: File PDF report cliente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Cliente non trovato
 */
router.get('/report/client/:clientId', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const buffer = await reportService.generateClientProgressReport(
            req.params.clientId,
            req.user.tenantId,
            { startDate, endDate }
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report_cliente_${req.params.clientId}.pdf"`);
        res.send(buffer);
    } catch (error) {
        res.status(error.message === 'Cliente non trovato' ? 404 : 500)
           .json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/report/payments:
 *   get:
 *     tags: [Analytics]
 *     summary: Report pagamenti in PDF
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
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File PDF report pagamenti
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/report/payments', async (req, res) => {
    try {
        const { startDate, endDate, clientId } = req.query;
        const buffer = await reportService.generatePaymentReport(
            req.user.tenantId,
            { startDate, endDate, clientId }
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report_pagamenti.pdf"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/report/workout/{templateId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Scheda allenamento in PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File PDF scheda allenamento
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Template non trovato
 */
router.get('/report/workout/:templateId', async (req, res) => {
    try {
        const buffer = await reportService.generateWorkoutPlanPDF(
            req.params.templateId,
            req.user.tenantId
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="scheda_allenamento_${req.params.templateId}.pdf"`);
        res.send(buffer);
    } catch (error) {
        res.status(error.message === 'Template non trovato' ? 404 : 500)
           .json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /analytics/report/meal-plan/{planId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Piano alimentare in PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File PDF piano alimentare
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Piano alimentare non trovato
 */
router.get('/report/meal-plan/:planId', async (req, res) => {
    try {
        const buffer = await reportService.generateMealPlanPDF(
            req.params.planId,
            req.user.tenantId
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="piano_alimentare_${req.params.planId}.pdf"`);
        res.send(buffer);
    } catch (error) {
        res.status(error.message === 'Piano alimentare non trovato' ? 404 : 500)
           .json({ success: false, message: error.message });
    }
});

module.exports = router;
