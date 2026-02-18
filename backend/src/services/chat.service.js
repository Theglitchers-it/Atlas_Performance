/**
 * Chat Service
 * Gestione conversazioni e messaggi
 */

const { query } = require('../config/database');

class ChatService {

    // === CONVERSAZIONI ===

    async getConversations(tenantId, userId) {
        const conversations = await query(`
            SELECT c.id, c.type, c.name, c.last_message_at, c.created_at,
                   cp.last_read_at, cp.is_muted,
                   (SELECT COUNT(*) FROM messages m
                    WHERE m.conversation_id = c.id
                    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
                    AND m.sender_id != ?) AS unread_count,
                   (SELECT CONCAT('[', GROUP_CONCAT(
                       CONCAT('{"userId":', u.id, ',"firstName":"', REPLACE(u.first_name, '"', '\\\\"'), '","lastName":"', REPLACE(u.last_name, '"', '\\\\"'), '","role":"', u.role, '"}')
                       SEPARATOR ','
                   ), ']') FROM conversation_participants cp2
                    JOIN users u ON cp2.user_id = u.id
                    WHERE cp2.conversation_id = c.id AND cp2.user_id != ?) AS other_participants,
                   (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                   (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_id
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = ?
            WHERE c.tenant_id = ?
            ORDER BY c.last_message_at DESC
        `, [userId, userId, userId, tenantId]);

        // Parse JSON participants (from GROUP_CONCAT)
        return conversations.map(conv => ({
            ...conv,
            other_participants: conv.other_participants ? JSON.parse(conv.other_participants) : []
        }));
    }

    async getConversationById(tenantId, conversationId, userId) {
        const [conv] = await query(`
            SELECT c.*, cp.last_read_at, cp.is_muted
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = ?
            WHERE c.id = ? AND c.tenant_id = ?
        `, [userId, conversationId, tenantId]);

        if (!conv) return null;

        // Carica partecipanti
        const participants = await query(`
            SELECT u.id AS userId, u.first_name AS firstName, u.last_name AS lastName, u.role
            FROM conversation_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.conversation_id = ?
        `, [conversationId]);

        conv.participants = participants;
        return conv;
    }

    async createConversation(tenantId, userId, data) {
        const { type = 'direct', name, participantIds } = data;

        // Per conversazioni dirette, controlla se esiste già
        if (type === 'direct' && participantIds.length === 1) {
            const otherId = participantIds[0];
            const [existing] = await query(`
                SELECT c.id FROM conversations c
                JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
                JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
                WHERE c.tenant_id = ? AND c.type = 'direct'
            `, [userId, otherId, tenantId]);

            if (existing) {
                return this.getConversationById(tenantId, existing.id, userId);
            }
        }

        // Crea conversazione
        const result = await query(
            'INSERT INTO conversations (tenant_id, type, name) VALUES (?, ?, ?)',
            [tenantId, type, name || null]
        );
        const conversationId = result.insertId;

        // Aggiungi creatore
        await query(
            'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
            [conversationId, userId]
        );

        // Aggiungi altri partecipanti
        for (const pId of participantIds) {
            if (pId !== userId) {
                await query(
                    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
                    [conversationId, pId]
                );
            }
        }

        return this.getConversationById(tenantId, conversationId, userId);
    }

    // === MESSAGGI ===

    async getMessages(tenantId, conversationId, userId, options = {}) {
        const { page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;

        // Verifica che l'utente sia partecipante
        const [participant] = await query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );
        if (!participant) return null;

        const [countResult] = await query(
            `SELECT COUNT(*) as total FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE m.conversation_id = ? AND c.tenant_id = ?`,
            [conversationId, tenantId]
        );
        const total = countResult?.total || 0;

        const messages = await query(`
            SELECT m.*, u.first_name AS sender_first_name, u.last_name AS sender_last_name, u.role AS sender_role
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.conversation_id = ? AND c.tenant_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [conversationId, tenantId, limit, offset]);

        // Aggiorna last_read_at
        await query(
            'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );

        return {
            messages: messages.reverse(),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async sendMessage(tenantId, conversationId, userId, data) {
        const { content, messageType = 'text', attachments } = data;

        // Verifica partecipazione
        const [participant] = await query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );
        if (!participant) return null;

        const result = await query(`
            INSERT INTO messages (conversation_id, sender_id, content, message_type, attachments)
            VALUES (?, ?, ?, ?, ?)
        `, [conversationId, userId, content, messageType, attachments ? JSON.stringify(attachments) : null]);

        // Aggiorna timestamp ultima messaggio
        await query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [conversationId]);

        // Aggiorna last_read del mittente
        await query(
            'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );

        const [message] = await query(`
            SELECT m.*, u.first_name AS sender_first_name, u.last_name AS sender_last_name, u.role AS sender_role
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        return message;
    }

    async markAsRead(conversationId, userId) {
        await query(
            'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );
        return { success: true };
    }

    // === UTENTI DISPONIBILI ===

    async getAvailableUsers(tenantId, userId) {
        const users = await query(`
            SELECT id, first_name, last_name, role
            FROM users
            WHERE tenant_id = ? AND id != ? AND status = 'active'
            ORDER BY role ASC, first_name ASC
        `, [tenantId, userId]);
        return users;
    }

    async toggleMute(conversationId, userId) {
        await query(`
            UPDATE conversation_participants
            SET is_muted = NOT is_muted
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);
        const [cp] = await query(
            'SELECT is_muted FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );
        return { is_muted: cp?.is_muted || false };
    }
}

module.exports = new ChatService();
