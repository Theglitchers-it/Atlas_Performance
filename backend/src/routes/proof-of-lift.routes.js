/**
 * Proof-of-Lift + World Leaderboard + Video Likes Routes (Fase 6)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const polService = require('../services/proof-of-lift.service');
const videoLikesService = require('../services/video-likes.service');
const { verifyToken, requireStaff } = require('../middlewares/auth');

router.use(verifyToken);

const asInt = (v) => parseInt(v, 10);

// Rate limit attach video (5/h per IP — upload separato sulla route /videos/upload esistente)
const polLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Troppi proof-of-lift attach. Riprova tra un\'ora.' }
});

// ===== PROOF-OF-LIFT =====

router.post('/proof-of-lift/attach', polLimiter, async (req, res, next) => {
    try {
        const { prRecordId, videoId, bodyweightKg } = req.body;
        if (!prRecordId || !videoId) {
            return res.status(400).json({ success: false, message: 'prRecordId e videoId richiesti' });
        }
        const result = await polService.attachProofVideo({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            prRecordId: asInt(prRecordId),
            videoId: asInt(videoId),
            bodyweightKg: bodyweightKg ? parseFloat(bodyweightKg) : null
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/proof-of-lift/:prId/verify', requireStaff, async (req, res, next) => {
    try {
        await polService.verifyPR({
            tenantId: req.user.tenantId,
            prRecordId: asInt(req.params.prId),
            verifierId: req.user.id
        });
        res.json({ success: true, message: 'PR verificato' });
    } catch (err) { next(err); }
});

router.post('/proof-of-lift/world/:entryId/reject', requireStaff, async (req, res, next) => {
    try {
        await polService.rejectWorldEntry({ entryId: asInt(req.params.entryId), verifierId: req.user.id, tenantId: req.user.tenantId });
        res.json({ success: true });
    } catch (err) { next(err); }
});

router.get('/proof-of-lift/me', async (req, res, next) => {
    try {
        const data = await polService.getMyWorldEntries(req.user.id);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.put('/users/me/world-leaderboard-opt-in', async (req, res, next) => {
    try {
        await polService.setOptIn({
            userId: req.user.id,
            optIn: !!req.body.optIn,
            displayName: req.body.displayName || null
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// ===== WORLD LEADERBOARD =====

router.get('/leaderboard/world/exercises', async (req, res, next) => {
    try {
        const data = await polService.getWorldExercises();
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/leaderboard/world', async (req, res, next) => {
    try {
        const data = await polService.getWorldLeaderboard({
            exerciseId: req.query.exerciseId,
            weightClass: req.query.weightClass,
            limit: req.query.limit || 100,
            offset: req.query.offset || 0
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// ===== VIDEO LIKES =====

router.post('/videos/:id/like', async (req, res, next) => {
    try {
        const result = await videoLikesService.likeVideo({
            tenantId: req.user.tenantId,
            videoId: asInt(req.params.id),
            userId: req.user.id
        });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
});

router.delete('/videos/:id/like', async (req, res, next) => {
    try {
        const result = await videoLikesService.unlikeVideo({
            tenantId: req.user.tenantId,
            videoId: asInt(req.params.id),
            userId: req.user.id
        });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
});

router.get('/videos/:id/likes', async (req, res, next) => {
    try {
        const data = await videoLikesService.getVideoLikes({
            videoId: asInt(req.params.id),
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

module.exports = router;
