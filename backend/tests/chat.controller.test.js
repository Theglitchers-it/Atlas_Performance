/**
 * Tests for Chat Controller
 * getConversations, getConversationById, createConversation, getMessages,
 * sendMessage, markAsRead, getAvailableUsers, getOnlineUsers, toggleMute
 */

// Mock dependencies
jest.mock('../src/services/chat.service', () => ({
    getConversations: jest.fn(),
    getConversationById: jest.fn(),
    createConversation: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    getAvailableUsers: jest.fn(),
    toggleMute: jest.fn()
}));

jest.mock('../src/socket/socketHandler', () => ({
    getOnlineUsers: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const chatController = require('../src/controllers/chat.controller');
const chatService = require('../src/services/chat.service');
const { getOnlineUsers } = require('../src/socket/socketHandler');

// Test helpers
const mockReq = (overrides = {}) => ({
    user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
    params: {},
    query: {},
    body: {},
    app: { get: jest.fn() },
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ChatController', () => {
    describe('getConversations', () => {
        test('returns list of conversations', async () => {
            const conversations = [
                { id: 1, name: 'Chat with Mario', lastMessage: 'Ciao' },
                { id: 2, name: 'Group Chat', lastMessage: 'Hello' }
            ];
            chatService.getConversations.mockResolvedValue(conversations);

            const req = mockReq();
            const res = mockRes();

            await chatController.getConversations(req, res, mockNext);

            expect(chatService.getConversations).toHaveBeenCalledWith('tenant-1', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { conversations }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            chatService.getConversations.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await chatController.getConversations(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getConversationById', () => {
        test('returns a single conversation', async () => {
            const conversation = { id: 5, name: 'Direct Chat', participants: [1, 2] };
            chatService.getConversationById.mockResolvedValue(conversation);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.getConversationById(req, res, mockNext);

            expect(chatService.getConversationById).toHaveBeenCalledWith('tenant-1', '5', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { conversation }
            });
        });

        test('returns 404 when conversation not found', async () => {
            chatService.getConversationById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await chatController.getConversationById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Conversazione non trovata'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Service error');
            chatService.getConversationById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.getConversationById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createConversation', () => {
        test('returns 201 with created conversation', async () => {
            const conversation = { id: 10, type: 'direct', participants: [1, 2] };
            chatService.createConversation.mockResolvedValue(conversation);

            const req = mockReq({
                body: { type: 'direct', name: 'Chat', participantIds: [2] }
            });
            const res = mockRes();

            await chatController.createConversation(req, res, mockNext);

            expect(chatService.createConversation).toHaveBeenCalledWith('tenant-1', 1, {
                type: 'direct',
                name: 'Chat',
                participantIds: [2]
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { conversation }
            });
        });

        test('returns 400 when participantIds is missing', async () => {
            const req = mockReq({ body: { type: 'direct' } });
            const res = mockRes();

            await chatController.createConversation(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Almeno un partecipante richiesto'
            });
        });

        test('returns 400 when participantIds is empty array', async () => {
            const req = mockReq({ body: { type: 'direct', participantIds: [] } });
            const res = mockRes();

            await chatController.createConversation(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Almeno un partecipante richiesto'
            });
        });

        test('calls next(error) on creation failure', async () => {
            const error = new Error('Create failed');
            chatService.createConversation.mockRejectedValue(error);

            const req = mockReq({ body: { type: 'direct', participantIds: [2] } });
            const res = mockRes();

            await chatController.createConversation(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getMessages', () => {
        test('returns paginated messages with default pagination', async () => {
            const result = { messages: [{ id: 1, content: 'Hello' }], total: 1 };
            chatService.getMessages.mockResolvedValue(result);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.getMessages(req, res, mockNext);

            expect(chatService.getMessages).toHaveBeenCalledWith('tenant-1', '5', 1, {
                page: 1,
                limit: 50
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('parses custom pagination from query', async () => {
            chatService.getMessages.mockResolvedValue({ messages: [], total: 0 });

            const req = mockReq({ params: { id: '5' }, query: { page: '3', limit: '25' } });
            const res = mockRes();

            await chatController.getMessages(req, res, mockNext);

            expect(chatService.getMessages).toHaveBeenCalledWith('tenant-1', '5', 1, {
                page: 3,
                limit: 25
            });
        });

        test('returns 403 when user is not authorized', async () => {
            chatService.getMessages.mockResolvedValue(null);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.getMessages(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non autorizzato'
            });
        });
    });

    describe('sendMessage', () => {
        test('returns 201 with sent message and emits socket event', async () => {
            const message = { id: 100, content: 'Hi there', senderId: 1 };
            chatService.sendMessage.mockResolvedValue(message);

            const mockEmit = jest.fn();
            const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
            const mockIo = { to: mockTo };

            const req = mockReq({
                params: { id: '5' },
                body: { content: 'Hi there', messageType: 'text' },
                app: { get: jest.fn().mockReturnValue(mockIo) }
            });
            const res = mockRes();

            await chatController.sendMessage(req, res, mockNext);

            expect(chatService.sendMessage).toHaveBeenCalledWith('tenant-1', '5', 1, {
                content: 'Hi there',
                messageType: 'text',
                attachments: undefined
            });
            expect(mockTo).toHaveBeenCalledWith('conversation_5');
            expect(mockEmit).toHaveBeenCalledWith('new_message', message);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message }
            });
        });

        test('returns 400 when content is missing', async () => {
            const req = mockReq({ params: { id: '5' }, body: {} });
            const res = mockRes();

            await chatController.sendMessage(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Contenuto obbligatorio'
            });
        });

        test('returns 403 when user is not authorized to send', async () => {
            chatService.sendMessage.mockResolvedValue(null);

            const req = mockReq({
                params: { id: '5' },
                body: { content: 'Hello' }
            });
            const res = mockRes();

            await chatController.sendMessage(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non autorizzato'
            });
        });

        test('works without socket.io configured', async () => {
            const message = { id: 100, content: 'Hello' };
            chatService.sendMessage.mockResolvedValue(message);

            const req = mockReq({
                params: { id: '5' },
                body: { content: 'Hello' },
                app: { get: jest.fn().mockReturnValue(null) }
            });
            const res = mockRes();

            await chatController.sendMessage(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message }
            });
        });
    });

    describe('markAsRead', () => {
        test('marks conversation as read', async () => {
            const result = { markedCount: 3 };
            chatService.markAsRead.mockResolvedValue(result);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.markAsRead(req, res, mockNext);

            expect(chatService.markAsRead).toHaveBeenCalledWith('5', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Mark read failed');
            chatService.markAsRead.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.markAsRead(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAvailableUsers', () => {
        test('returns list of available users', async () => {
            const users = [{ id: 2, name: 'Mario' }, { id: 3, name: 'Luigi' }];
            chatService.getAvailableUsers.mockResolvedValue(users);

            const req = mockReq();
            const res = mockRes();

            await chatController.getAvailableUsers(req, res, mockNext);

            expect(chatService.getAvailableUsers).toHaveBeenCalledWith('tenant-1', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { users }
            });
        });
    });

    describe('getOnlineUsers', () => {
        test('returns list of online user ids', async () => {
            getOnlineUsers.mockReturnValue([2, 3, 5]);

            const req = mockReq();
            const res = mockRes();

            await chatController.getOnlineUsers(req, res, mockNext);

            expect(getOnlineUsers).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { onlineUserIds: [2, 3, 5] }
            });
        });
    });

    describe('toggleMute', () => {
        test('toggles mute for a conversation', async () => {
            const result = { muted: true };
            chatService.toggleMute.mockResolvedValue(result);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.toggleMute(req, res, mockNext);

            expect(chatService.toggleMute).toHaveBeenCalledWith('5', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Toggle failed');
            chatService.toggleMute.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await chatController.toggleMute(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
