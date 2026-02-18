/**
 * Tests for ChatService
 * Conversations, messages, participants
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const chatService = require('../src/services/chat.service');

beforeEach(() => jest.clearAllMocks());

describe('ChatService.getConversations', () => {
    test('returns user conversations', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, type: 'direct', last_message: 'Ciao!', other_participants: null },
            { id: 2, type: 'group', last_message: 'Allenamento domani', other_participants: null }
        ]);

        const result = await chatService.getConversations('tenant-1', 1);
        expect(result).toHaveLength(2);
    });
});

describe('ChatService.createConversation', () => {
    test('creates direct conversation', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // No existing conversation (destructured [existing] = [] -> undefined)
            .mockResolvedValueOnce({ insertId: 10 }) // INSERT conversation
            .mockResolvedValueOnce([]) // INSERT participant (creator)
            .mockResolvedValueOnce([]) // INSERT participant (other)
            // getConversationById called internally:
            .mockResolvedValueOnce([{ id: 10, type: 'direct', name: null }]) // SELECT conversation
            .mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }]); // SELECT participants

        const result = await chatService.createConversation('tenant-1', 1, {
            type: 'direct',
            participantIds: [2]
        });

        expect(result.id).toBe(10);
    });

    test('returns existing direct conversation', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 5 }]) // Existing conversation found
            // getConversationById called internally:
            .mockResolvedValueOnce([{ id: 5, type: 'direct', name: null }]) // SELECT conversation
            .mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }]); // SELECT participants

        const result = await chatService.createConversation('tenant-1', 1, {
            type: 'direct',
            participantIds: [2]
        });

        expect(result.id).toBe(5);
    });
});

describe('ChatService.sendMessage', () => {
    test('sends message and updates conversation', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1 }]) // verify participant
            .mockResolvedValueOnce({ insertId: 100 }) // INSERT message
            .mockResolvedValueOnce([]) // UPDATE conversation last_message_at
            .mockResolvedValueOnce([]) // UPDATE participant last_read_at
            .mockResolvedValueOnce([{ id: 100, content: 'Ciao, come stai?', sender_id: 1, sender_first_name: 'Mario', sender_last_name: 'Rossi', sender_role: 'trainer' }]); // SELECT message

        const result = await chatService.sendMessage('tenant-1', 1, 1, {
            content: 'Ciao, come stai?',
            messageType: 'text'
        });

        expect(result.id).toBe(100);
    });

    test('returns null for non-participant', async () => {
        mockQuery.mockResolvedValueOnce([]); // Not a participant

        const result = await chatService.sendMessage('tenant-1', 1, 99, {
            content: 'test',
            messageType: 'text'
        });

        expect(result).toBeNull();
    });
});

describe('ChatService.getMessages', () => {
    test('returns paginated messages', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1 }]) // verify participant
            .mockResolvedValueOnce([{ total: 2 }]) // COUNT
            .mockResolvedValueOnce([
                { id: 2, content: 'Hi!', sender_id: 2 },
                { id: 1, content: 'Hello', sender_id: 1 }
            ]) // SELECT messages (DESC order, will be reversed)
            .mockResolvedValueOnce([]); // UPDATE last_read_at

        const result = await chatService.getMessages('tenant-1', 1, 1);
        expect(result.messages).toHaveLength(2);
        expect(result.pagination).toBeDefined();
    });
});

describe('ChatService.markAsRead', () => {
    test('marks conversation as read', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await chatService.markAsRead(1, 1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE'),
            expect.arrayContaining([1, 1])
        );
    });
});
