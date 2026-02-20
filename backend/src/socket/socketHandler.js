/**
 * Socket.io Handler
 * Gestione connessioni WebSocket per chat real-time
 */

const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('SOCKET');

// Mappa utenti connessi: userId -> { socketId, tenantId }
const connectedUsers = new Map();

/**
 * Per-socket rate limiter — previene flood di eventi
 * Limita a maxEvents per windowMs per socket
 */
const socketRateLimits = new Map(); // socketId -> { count, resetAt }
const SOCKET_RATE_LIMIT = { maxEvents: 60, windowMs: 60000 }; // 60 eventi/min

const checkSocketRateLimit = (socketId) => {
    const now = Date.now();
    let entry = socketRateLimits.get(socketId);
    if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + SOCKET_RATE_LIMIT.windowMs };
        socketRateLimits.set(socketId, entry);
    }
    entry.count++;
    return entry.count <= SOCKET_RATE_LIMIT.maxEvents;
};

// Cleanup rate limit entries ogni 5 minuti
const rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of socketRateLimits) {
        if (entry.resetAt < now) socketRateLimits.delete(id);
    }
}, 5 * 60 * 1000);
rateLimitCleanupInterval.unref();

/**
 * Sanitizza e valida una stringa — previene XSS injection nei messaggi
 */
const sanitizeString = (str, maxLength = 5000) => {
    if (typeof str !== 'string') return null;
    return str.slice(0, maxLength).replace(/[<>]/g, '');
};

/**
 * Valida un ID numerico positivo
 */
const isValidId = (val) => {
    const n = Number(val);
    return Number.isInteger(n) && n > 0;
};

/**
 * Inizializza gli handler Socket.io
 * @param {Server} io - Istanza Socket.io
 */
const initSocket = (io) => {
    // Middleware autenticazione socket
    // Supporta cookie httpOnly (browser) e auth.token (mobile/API)
    io.use(async (socket, next) => {
        try {
            // 1. Prova dal cookie httpOnly nel handshake
            let token = null;
            const cookieHeader = socket.handshake.headers?.cookie;
            if (cookieHeader) {
                const cookies = cookie.parse(cookieHeader);
                token = cookies.access_token;
            }

            // 2. Fallback: auth.token (mobile/API)
            if (!token) {
                token = socket.handshake.auth?.token;
            }

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
            logger.error('Errore auth socket', { error: error.message });
            next(new Error('Autenticazione fallita'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Socket connesso: ${socket.user.email} (${socket.id})`);

        // Registra utente connesso
        connectedUsers.set(socket.user.id, {
            socketId: socket.id,
            tenantId: socket.user.tenantId
        });

        // Join alla room del tenant
        socket.join(`tenant_${socket.user.tenantId}`);

        // Join alla room personale
        socket.join(`user_${socket.user.id}`);

        // Notifica stato online agli altri utenti del tenant
        socket.to(`tenant_${socket.user.tenantId}`).emit('user_online', {
            userId: socket.user.id
        });

        // Rate limit wrapper per tutti gli eventi
        const rateLimitedHandler = (eventName, handler) => {
            socket.on(eventName, (...args) => {
                if (!checkSocketRateLimit(socket.id)) {
                    logger.warn(`Socket rate limit exceeded: ${socket.user.email} on ${eventName}`);
                    socket.emit('error', { message: 'Troppe richieste, rallenta' });
                    return;
                }
                handler(...args);
            });
        };

        // === CHAT EVENTS ===

        // Join a una conversazione specifica
        rateLimitedHandler('join_conversation', (conversationId) => {
            if (!isValidId(conversationId)) return;
            socket.join(`conversation_${conversationId}`);
            logger.info(`${socket.user.email} joined conversation ${conversationId}`);
        });

        // Lascia una conversazione
        rateLimitedHandler('leave_conversation', (conversationId) => {
            if (!isValidId(conversationId)) return;
            socket.leave(`conversation_${conversationId}`);
        });

        // Nuovo messaggio
        rateLimitedHandler('send_message', async (data) => {
            try {
                if (!data || typeof data !== 'object') return;
                const conversationId = Number(data.conversationId);
                if (!isValidId(conversationId)) {
                    return socket.emit('error', { message: 'conversationId non valido' });
                }
                const content = sanitizeString(data.content);
                if (!content || content.trim().length === 0) {
                    return socket.emit('error', { message: 'Contenuto messaggio vuoto' });
                }
                const attachments = Array.isArray(data.attachments) ? data.attachments.slice(0, 10) : [];

                // Salva messaggio nel database
                const result = await query(
                    `INSERT INTO messages (conversation_id, sender_id, content, attachments, created_at)
                     VALUES (?, ?, ?, ?, NOW())`,
                    [conversationId, socket.user.id, content, JSON.stringify(attachments)]
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
                logger.error('Errore invio messaggio', { error: error.message });
                socket.emit('error', { message: 'Errore invio messaggio' });
            }
        });

        // Typing indicator
        rateLimitedHandler('typing_start', (conversationId) => {
            if (!isValidId(conversationId)) return;
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                userId: socket.user.id,
                conversationId
            });
        });

        rateLimitedHandler('typing_stop', (conversationId) => {
            if (!isValidId(conversationId)) return;
            socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
                userId: socket.user.id,
                conversationId
            });
        });

        // Messaggio letto
        rateLimitedHandler('message_read', async (data) => {
            try {
                if (!data || typeof data !== 'object') return;
                const conversationId = Number(data.conversationId);
                const messageId = Number(data.messageId);
                if (!isValidId(conversationId) || !isValidId(messageId)) return;

                await query(
                    `UPDATE messages SET read_at = NOW()
                     WHERE conversation_id = ? AND id <= ? AND sender_id != ?`,
                    [conversationId, messageId, socket.user.id]
                );

                socket.to(`conversation_${conversationId}`).emit('messages_read', {
                    userId: socket.user.id,
                    conversationId,
                    upToMessageId: messageId
                });
            } catch (error) {
                logger.error('Errore message_read', { error: error.message });
            }
        });

        // === NOTIFICATION EVENTS ===

        // Subscribe a notifiche
        rateLimitedHandler('subscribe_notifications', () => {
            socket.join(`notifications_${socket.user.id}`);
        });

        // === DISCONNECTION ===

        socket.on('disconnect', () => {
            logger.info(`Socket disconnesso: ${socket.user.email}`);

            connectedUsers.delete(socket.user.id);
            socketRateLimits.delete(socket.id);

            // Notifica stato offline
            socket.to(`tenant_${socket.user.tenantId}`).emit('user_offline', {
                userId: socket.user.id
            });
        });
    });

    logger.info('Socket.io inizializzato');
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
