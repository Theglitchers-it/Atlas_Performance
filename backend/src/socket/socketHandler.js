/**
 * Socket.io Handler
 * Gestione connessioni WebSocket per chat real-time
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Mappa utenti connessi: { odId: { odId, odId } }
const connectedUsers = new Map();

/**
 * Inizializza gli handler Socket.io
 * @param {Server} io - Istanza Socket.io
 */
const initSocket = (io) => {
    // Middleware autenticazione socket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Token mancante'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const users = await query(
                'SELECT id, tenant_id, email, role FROM users WHERE id = ? AND status = "active"',
                [decoded.userId]
            );

            if (users.length === 0) {
                return next(new Error('Utente non trovato'));
            }

            socket.user = {
                id: users[0].id,
                tenantId: users[0].tenant_id,
                email: users[0].email,
                role: users[0].role
            };

            next();
        } catch (error) {
            console.error('Errore auth socket:', error.message);
            next(new Error('Autenticazione fallita'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connesso: ${socket.user.email} (${socket.id})`);

        // Registra utente connesso
        connectedUsers.set(socket.user.id, {
            odId: socket.id,
            odId: socket.user.tenantId
        });

        // Join alla room del tenant
        socket.join(`tenant_${socket.user.tenantId}`);

        // Join alla room personale
        socket.join(`user_${socket.user.id}`);

        // Notifica stato online agli altri utenti del tenant
        socket.to(`tenant_${socket.user.tenantId}`).emit('user_online', {
            userId: socket.user.id
        });

        // === CHAT EVENTS ===

        // Join a una conversazione specifica
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`${socket.user.email} joined conversation ${conversationId}`);
        });

        // Lascia una conversazione
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
        });

        // Nuovo messaggio
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, content, attachments } = data;

                // Salva messaggio nel database
                const result = await query(
                    `INSERT INTO messages (conversation_id, sender_id, content, attachments, created_at)
                     VALUES (?, ?, ?, ?, NOW())`,
                    [conversationId, socket.user.id, content, JSON.stringify(attachments || [])]
                );

                const messageId = result.insertId;

                // Recupera messaggio completo
                const messages = await query(
                    `SELECT m.*, u.email as sender_email,
                            CONCAT(u.first_name, ' ', u.last_name) as sender_name
                     FROM messages m
                     JOIN users u ON m.sender_id = u.id
                     WHERE m.id = ?`,
                    [messageId]
                );

                const message = messages[0];

                // Invia a tutti nella conversazione
                io.to(`conversation_${conversationId}`).emit('new_message', message);

                // Aggiorna ultimo messaggio conversazione
                await query(
                    'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
                    [conversationId]
                );

            } catch (error) {
                console.error('Errore invio messaggio:', error);
                socket.emit('error', { message: 'Errore invio messaggio' });
            }
        });

        // Typing indicator
        socket.on('typing_start', (conversationId) => {
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                odId: socket.user.id,
                conversationId
            });
        });

        socket.on('typing_stop', (conversationId) => {
            socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
                odId: socket.user.id,
                conversationId
            });
        });

        // Messaggio letto
        socket.on('message_read', async (data) => {
            const { conversationId, messageId } = data;

            await query(
                `UPDATE messages SET read_at = NOW()
                 WHERE conversation_id = ? AND id <= ? AND sender_id != ?`,
                [conversationId, messageId, socket.user.id]
            );

            socket.to(`conversation_${conversationId}`).emit('messages_read', {
                odId: socket.user.id,
                conversationId,
                upToMessageId: messageId
            });
        });

        // === NOTIFICATION EVENTS ===

        // Subscribe a notifiche
        socket.on('subscribe_notifications', () => {
            socket.join(`notifications_${socket.user.id}`);
        });

        // === DISCONNECTION ===

        socket.on('disconnect', () => {
            console.log(`Socket disconnesso: ${socket.user.email}`);

            connectedUsers.delete(socket.user.id);

            // Notifica stato offline
            socket.to(`tenant_${socket.user.tenantId}`).emit('user_offline', {
                userId: socket.user.id
            });
        });
    });

    console.log('Socket.io inizializzato');
};

/**
 * Invia notifica a un utente specifico
 * @param {Server} io - Istanza Socket.io
 * @param {number} userId - ID utente destinatario
 * @param {Object} notification - Dati notifica
 */
const sendNotificationToUser = (io, userId, notification) => {
    io.to(`user_${userId}`).emit('notification', notification);
};

/**
 * Invia notifica a tutti gli utenti di un tenant
 * @param {Server} io - Istanza Socket.io
 * @param {string} tenantId - ID tenant
 * @param {Object} notification - Dati notifica
 */
const sendNotificationToTenant = (io, tenantId, notification) => {
    io.to(`tenant_${tenantId}`).emit('notification', notification);
};

/**
 * Verifica se un utente è online
 * @param {number} userId - ID utente
 * @returns {boolean}
 */
const isUserOnline = (userId) => {
    return connectedUsers.has(userId);
};

/**
 * Ottieni utenti online di un tenant
 * @param {string} tenantId - ID tenant
 * @returns {Array} Lista ID utenti online
 */
const getOnlineUsers = (tenantId) => {
    const online = [];
    for (const [userId, data] of connectedUsers) {
        if (data.tenantId === tenantId) {
            online.push(userId);
        }
    }
    return online;
};

module.exports = {
    initSocket,
    sendNotificationToUser,
    sendNotificationToTenant,
    isUserOnline,
    getOnlineUsers
};
