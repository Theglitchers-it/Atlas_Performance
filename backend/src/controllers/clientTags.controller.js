/**
 * Client Tags Controller
 */

const clientTagsService = require('../services/clientTags.service');
const clientService = require('../services/client.service');

class ClientTagsController {
    async getTags(req, res, next) {
        try {
            const clientId = parseInt(req.params.id);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const tags = await clientTagsService.getTagsForClient(clientId, req.user.tenantId);
            res.json({ success: true, data: { tags } });
        } catch (error) {
            next(error);
        }
    }

    async addTag(req, res, next) {
        try {
            const clientId = parseInt(req.params.id);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const tag = (req.body.tag || '').toLowerCase().trim();
            if (!tag || tag.length > 50) {
                return res.status(400).json({ success: false, message: 'Tag non valido (max 50 char)' });
            }
            await clientTagsService.addTag(clientId, req.user.tenantId, tag, false);
            res.status(201).json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    async removeTag(req, res, next) {
        try {
            const clientId = parseInt(req.params.id);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const removed = await clientTagsService.removeTag(
                clientId, req.user.tenantId, req.params.tag, true
            );
            if (!removed) {
                return res.status(404).json({ success: false, message: 'Tag non trovato o non rimovibile' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    async recomputeAll(req, res, next) {
        try {
            const result = await clientTagsService.recomputeAutoTags(req.user.tenantId);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ClientTagsController();
