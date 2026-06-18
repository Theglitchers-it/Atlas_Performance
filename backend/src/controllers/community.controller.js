/**
 * Community Controller — post, commenti, like, visibility, moderazione, regole.
 */

const communityService = require('../services/community.service');
const { getFileUrl } = require('../middlewares/upload');
const { userHasAnyRole } = require('../middlewares/auth');

const asInt = (v) => parseInt(v, 10);

class CommunityController {
    async getPosts(req, res, next) {
        try {
            const { postType, limit, page, creatorTrainerId, from, sortBy, authorId } = req.query;
            const isAdmin = userHasAnyRole(req.user, ['gym_admin', 'tenant_owner', 'super_admin']);
            const result = await communityService.getPosts(req.user.tenantId, {
                postType, limit, page, userId: req.user.id, isAdmin, creatorTrainerId, from, sortBy, authorId
            });
            res.json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async getPostById(req, res, next) {
        try {
            const post = await communityService.getPostById(req.params.id, req.user.tenantId, req.user.id);
            if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });
            res.json({ success: true, data: { post } });
        } catch (err) { next(err); }
    }

    async createPost(req, res, next) {
        try {
            const { content, postType, visibilityType, specificClientUserIds } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Contenuto richiesto' });

            let attachments = null;
            if (req.file) {
                const imageUrl = getFileUrl(req.file.path);
                attachments = [{ type: 'image', url: imageUrl, originalName: req.file.originalname }];
            }

            // specificClientUserIds può arrivare come array JSON-stringificato (multipart) o array nativo
            let specific = specificClientUserIds;
            if (typeof specific === 'string') {
                try { specific = JSON.parse(specific); } catch { specific = []; }
            }

            const id = await communityService.createPost(
                req.user.tenantId,
                req.user.id,
                { content, postType, attachments, visibilityType, specificClientUserIds: specific },
                req.user.roles || []
            );
            res.status(201).json({ success: true, data: { id } });
        } catch (err) { next(err); }
    }

    async updatePost(req, res, next) {
        try {
            const success = await communityService.updatePost(req.params.id, req.user.tenantId, req.user.id, req.body);
            if (!success) return res.status(404).json({ success: false, message: 'Post non trovato o non autorizzato' });
            res.json({ success: true, message: 'Post aggiornato' });
        } catch (err) { next(err); }
    }

    async deletePost(req, res, next) {
        try {
            const isModerator = userHasAnyRole(req.user, ['tenant_owner', 'staff', 'gym_admin', 'super_admin']);
            const ok = await communityService.deletePost(req.params.id, req.user.tenantId, req.user.id, isModerator);
            if (!ok) {
                return res.status(403).json({ success: false, message: 'Non autorizzato o post non trovato' });
            }
            res.json({ success: true, message: 'Post eliminato' });
        } catch (err) { next(err); }
    }

    async togglePin(req, res, next) {
        try {
            await communityService.togglePin(req.params.id, req.user.tenantId);
            res.json({ success: true, message: 'Pin aggiornato' });
        } catch (err) { next(err); }
    }

    async likePost(req, res, next) {
        try {
            await communityService.likePost(req.params.id, req.user.tenantId, req.user.id);
            res.json({ success: true, message: 'Like aggiunto' });
        } catch (err) { next(err); }
    }

    async unlikePost(req, res, next) {
        try {
            await communityService.unlikePost(req.params.id, req.user.tenantId, req.user.id);
            res.json({ success: true, message: 'Like rimosso' });
        } catch (err) { next(err); }
    }

    async savePost(req, res, next) {
        try {
            const result = await communityService.savePost(req.params.id, req.user.tenantId, req.user.id);
            if (!result.ok) return res.status(result.status || 400).json({ success: false, message: 'Post non trovato' });
            res.status(201).json({ success: true, data: { isSaved: true } });
        } catch (err) { next(err); }
    }

    async unsavePost(req, res, next) {
        try {
            await communityService.unsavePost(req.params.id, req.user.tenantId, req.user.id);
            res.json({ success: true, data: { isSaved: false } });
        } catch (err) { next(err); }
    }

    async addComment(req, res, next) {
        try {
            const { content, parentId } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Contenuto richiesto' });
            const id = await communityService.addComment(req.params.id, req.user.tenantId, req.user.id, { content, parentId });
            res.status(201).json({ success: true, data: { id } });
        } catch (err) { next(err); }
    }

    async deleteComment(req, res, next) {
        try {
            const success = await communityService.deleteComment(req.params.commentId, req.user.tenantId, req.user.id);
            if (!success) return res.status(404).json({ success: false, message: 'Commento non trovato' });
            res.json({ success: true, message: 'Commento eliminato' });
        } catch (err) { next(err); }
    }

    // ===== MODERAZIONE =====

    async reportPost(req, res, next) {
        try {
            const { reason, details } = req.body;
            const result = await communityService.reportPost({
                tenantId: req.user.tenantId,
                postId: asInt(req.params.id),
                reporterId: req.user.id,
                reason, details
            });
            res.status(201).json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async listReports(req, res, next) {
        try {
            const data = await communityService.listReports(req.user.tenantId, {
                status: req.query.status || 'pending',
                limit: req.query.limit, offset: req.query.offset
            });
            res.json({ success: true, data });
        } catch (err) { next(err); }
    }

    async moderatePost(req, res, next) {
        try {
            const result = await communityService.moderatePost({
                tenantId: req.user.tenantId,
                reportId: asInt(req.params.id),
                action: req.body.action,
                moderatorId: req.user.id
            });
            res.json({ success: true, ...result });
        } catch (err) { next(err); }
    }

    // ===== RULES =====

    async listRules(req, res, next) {
        try {
            const data = await communityService.listRules(req.user.tenantId, { onlyActive: req.query.includeInactive !== 'true' });
            res.json({ success: true, data });
        } catch (err) { next(err); }
    }

    async createRule(req, res, next) {
        try {
            const result = await communityService.createRule({
                tenantId: req.user.tenantId,
                title: req.body.title,
                description: req.body.description,
                sortOrder: req.body.sortOrder,
                createdBy: req.user.id
            });
            res.status(201).json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async updateRule(req, res, next) {
        try {
            await communityService.updateRule({
                tenantId: req.user.tenantId,
                ruleId: asInt(req.params.id),
                ...req.body
            });
            res.json({ success: true, message: 'Regola aggiornata' });
        } catch (err) { next(err); }
    }

    async deleteRule(req, res, next) {
        try {
            await communityService.deleteRule({ tenantId: req.user.tenantId, ruleId: asInt(req.params.id) });
            res.json({ success: true, message: 'Regola eliminata' });
        } catch (err) { next(err); }
    }
}

module.exports = new CommunityController();
