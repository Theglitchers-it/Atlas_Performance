/**
 * Bulk operations + CSV import/export routes (Fase 8)
 * Mount: app.use('/api/clients', clientBulkCsvRoutes) — prefisso comune
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const bulkSvc = require('../services/client-bulk.service');
const csvSvc = require('../services/client-csv.service');
const savedViewsSvc = require('../services/client-saved-views.service');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);
const requireStaff = requireRole('tenant_owner', 'staff', 'super_admin');

// CSV upload: in memory (no filesystem), 5MB max
const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) cb(null, true);
        else cb(new Error('Solo file CSV ammessi'));
    }
});

const bulkLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { success: false, message: 'Troppe operazioni bulk' } });

// ===== BULK =====
router.post('/bulk/notify', requireStaff, bulkLimiter, async (req, res, next) => {
    try {
        const result = await bulkSvc.bulkNotify({
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            clientIds: req.body.clientIds,
            channel: req.body.channel,
            message: req.body.message
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/bulk/activate', requireStaff, bulkLimiter, async (req, res, next) => {
    try {
        const result = await bulkSvc.bulkActivate({
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            clientIds: req.body.clientIds,
            reason: req.body.reason
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/bulk/deactivate', requireStaff, bulkLimiter, async (req, res, next) => {
    try {
        const result = await bulkSvc.bulkDeactivate({
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            clientIds: req.body.clientIds,
            reason: req.body.reason
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/bulk/change-status', requireStaff, bulkLimiter, async (req, res, next) => {
    try {
        const result = await bulkSvc.bulkChangeStatus({
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            clientIds: req.body.clientIds,
            newStatus: req.body.newStatus
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/bulk/assign-program', requireStaff, bulkLimiter, async (req, res, next) => {
    try {
        const result = await bulkSvc.bulkAssignProgram({
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            clientIds: req.body.clientIds,
            programId: req.body.programId,
            startDate: req.body.startDate
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

// ===== CSV EXPORT =====
router.get('/export.csv', requireStaff, async (req, res, next) => {
    try {
        const csv = await csvSvc.exportToCSV({
            tenantId: req.user.tenantId,
            filters: { status: req.query.status, search: req.query.search }
        });
        const filename = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('﻿' + csv); // BOM per Excel
    } catch (err) { next(err); }
});

// ===== CSV IMPORT =====
router.post('/import/preview', requireStaff, csvUpload.single('csv'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File CSV richiesto' });
        const data = await csvSvc.previewImport(req.file.buffer);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/import', requireStaff, csvUpload.single('csv'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File CSV richiesto' });
        let mapping = req.body.columnMapping;
        if (typeof mapping === 'string') {
            try { mapping = JSON.parse(mapping); } catch { mapping = {}; }
        }
        const result = await csvSvc.importFromCSV({
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            csvBuffer: req.file.buffer,
            columnMapping: mapping
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

// ===== Fase 10: Saved Views =====
router.get('/saved-views', async (req, res, next) => {
    try {
        const data = await savedViewsSvc.list({ tenantId: req.user.tenantId, userId: req.user.id });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/saved-views', async (req, res, next) => {
    try {
        const result = await savedViewsSvc.create({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            name: req.body.name,
            filtersJson: req.body.filters,
            isDefault: !!req.body.isDefault
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.put('/saved-views/:id', async (req, res, next) => {
    try {
        await savedViewsSvc.update({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            viewId: parseInt(req.params.id, 10),
            name: req.body.name,
            filtersJson: req.body.filters,
            isDefault: req.body.isDefault
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

router.delete('/saved-views/:id', async (req, res, next) => {
    try {
        await savedViewsSvc.remove({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            viewId: parseInt(req.params.id, 10)
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
