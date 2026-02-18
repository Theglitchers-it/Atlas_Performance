/**
 * Chat Controller
 * Handler per conversazioni e messaggi
 */

const chatService = require('../services/chat.service');

class ChatController {

    async getConversations(req, res, next) {
        try {
            const conversations = await chatService.getConversations(req.user.tenantId, req.user.id);
            res.json({ success: true, data: { conversations } });
        } catch (error) {
            next(error);
        }
    }

    async getConversationById(req, res, next) {
        try {
            const conversation = await chatService.getConversationById(req.user.tenantId, req.params.id, req.user.id);
            if (!conversation) return res.status(404).json({ success: false, message: 'Conversazione non trovata' });
            res.json({ success: true, data: { conversation } });
        } catch (error) {
            next(error);
        }
    }

    async createConversation(req, res, next) {
        try {
            const { type, name, participantIds } = req.body;
            if (!participantIds || participantIds.length === 0) {
                return res.status(400).json({ success: false, message: 'Almeno un partecipante richiesto' });
            }
            const conversation = await chatService.createConversation(req.user.tenantId, req.user.id, {
                type, name, participantIds
            });
            res.status(201).json({ success: true, data: { conversation } });
        } catch (error) {
            next(error);
        }
    }

    async getMessages(req, res, next) {
        try {
            const { page, limit } = req.query;
            const result = await chatService.getMessages(req.user.tenantId, req.params.id, req.user.id, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 50
            });
            if (!result) return res.status(403).json({ success: false, message: 'Non autorizzato' });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req, res, next) {
        try {
            const { content, messageType, attachments } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Contenuto obbligatorio' });

            const message = await chatService.sendMessage(req.user.tenantId, req.params.id, req.user.id, {
                content, messageType, attachments
            });
            if (!message) return res.status(403).json({ success: false, message: 'Non autorizzato' });

            // Emit via Socket.io se disponibile
            const io = req.app.get('io');
            if (io) {
                io.to(`conversation_${req.params.id}`).emit('new_message', message);
            }

            res.status(201).json({ success: true, data: { message } });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req, res, next) {
        try {
            const result = await chatService.markAsRead(req.params.id, req.user.id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getAvailableUsers(req, res, next) {
        try {
            const users = await chatService.getAvailableUsers(req.user.tenantId, req.user.id);
            res.json({ success: true, data: { users } });
        } catch (error) {
            next(error);
        }
    }

    async getOnlineUsers(req, res, next) {
        try {
            const { getOnlineUsers } = require('../socket/socketHandler');
            const onlineUserIds = getOnlineUsers(req.user.tenantId);
            res.json({ success: true, data: { onlineUserIds } });
        } catch (error) {
            next(error);
        }
    }

    async toggleMute(req, res, next) {
        try {
            const result = await chatService.toggleMute(req.params.id, req.user.id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ChatController();
