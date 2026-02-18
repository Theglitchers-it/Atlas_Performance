/**
 * Community Controller
 * Gestione HTTP per post, commenti e like
 */

const communityService = require('../services/community.service');
const { getFileUrl } = require('../middlewares/upload');

class CommunityController {
    async getPosts(req, res, next) {
        try {
            const { postType, limit, page } = req.query;
            const result = await communityService.getPosts(req.user.tenantId, {
                postType, limit, page, userId: req.user.id
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getPostById(req, res, next) {
        try {
            const post = await communityService.getPostById(req.params.id, req.user.tenantId, req.user.id);
            if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });
            res.json({ success: true, data: { post } });
        } catch (error) {
            next(error);
        }
    }

    async createPost(req, res, next) {
        try {
            const { content, postType } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Contenuto richiesto' });

            // Gestione immagine caricata
            let attachments = null;
            if (req.file) {
                const imageUrl = getFileUrl(req.file.path);
                attachments = JSON.stringify([{ type: 'image', url: imageUrl, originalName: req.file.originalname }]);
            }

            const id = await communityService.createPost(req.user.tenantId, req.user.id, {
                content, postType, attachments
            });
            res.status(201).json({ success: true, data: { id } });
        } catch (error) {
            next(error);
        }
    }

    async updatePost(req, res, next) {
        try {
            const success = await communityService.updatePost(req.params.id, req.user.tenantId, req.user.id, req.body);
            if (!success) return res.status(404).json({ success: false, message: 'Post non trovato o non autorizzato' });
            res.json({ success: true, message: 'Post aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    async deletePost(req, res, next) {
        try {
            await communityService.deletePost(req.params.id, req.user.tenantId);
            res.json({ success: true, message: 'Post eliminato' });
        } catch (error) {
            next(error);
        }
    }

    async togglePin(req, res, next) {
        try {
            await communityService.togglePin(req.params.id, req.user.tenantId);
            res.json({ success: true, message: 'Pin aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    async likePost(req, res, next) {
        try {
            await communityService.likePost(req.params.id, req.user.id);
            res.json({ success: true, message: 'Like aggiunto' });
        } catch (error) {
            next(error);
        }
    }

    async unlikePost(req, res, next) {
        try {
            await communityService.unlikePost(req.params.id, req.user.id);
            res.json({ success: true, message: 'Like rimosso' });
        } catch (error) {
            next(error);
        }
    }

    async addComment(req, res, next) {
        try {
            const { content, parentId } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Contenuto richiesto' });
            const id = await communityService.addComment(req.params.id, req.user.id, { content, parentId });
            res.status(201).json({ success: true, data: { id } });
        } catch (error) {
            next(error);
        }
    }

    async deleteComment(req, res, next) {
        try {
            const success = await communityService.deleteComment(req.params.commentId, req.user.id);
            if (!success) return res.status(404).json({ success: false, message: 'Commento non trovato' });
            res.json({ success: true, message: 'Commento eliminato' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommunityController();
