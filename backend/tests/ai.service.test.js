/**
 * Tests for AIService
 * chatCompletion, suggestAlternativeExercises, answerClientQuestion,
 * generateMealPlanDraft, analyzeProgress, logInteraction, checkUsageLimit
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// We need to require after env setup so constructor picks up the key
let aiService;

beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
});

// =============================================
// isConfigured
// =============================================
describe('AIService.isConfigured', () => {
    test('returns false when OPENAI_API_KEY is not set', () => {
        jest.resetModules();
        delete process.env.OPENAI_API_KEY;
        aiService = require('../src/services/ai.service');
        expect(aiService.isConfigured()).toBe(false);
    });

    test('returns true when OPENAI_API_KEY is set', () => {
        jest.resetModules();
        process.env.OPENAI_API_KEY = 'sk-test-key-123';
        aiService = require('../src/services/ai.service');
        expect(aiService.isConfigured()).toBe(true);
    });
});

// =============================================
// chatCompletion
// =============================================
describe('AIService.chatCompletion', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.OPENAI_API_KEY = 'sk-test-key-123';
        // Re-mock database after resetModules
        jest.mock('../src/config/database', () => ({
            query: (...args) => mockQuery(...args)
        }));
        jest.mock('../src/config/logger', () => ({
            createServiceLogger: () => ({
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            })
        }));
        aiService = require('../src/services/ai.service');
    });

    test('throws error when API key is not configured', async () => {
        aiService.apiKey = null;

        await expect(
            aiService.chatCompletion([{ role: 'user', content: 'Ciao' }])
        ).rejects.toThrow('OpenAI API key non configurata');
    });

    test('returns AI response content on success', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Ecco la risposta AI' } }]
            })
        });

        const result = await aiService.chatCompletion([
            { role: 'user', content: 'Suggeriscimi un esercizio' }
        ]);

        expect(result).toBe('Ecco la risposta AI');
        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.openai.com/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer sk-test-key-123'
                })
            })
        );
    });

    test('throws on API error response', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 429,
            json: async () => ({ error: { message: 'Rate limit exceeded' } })
        });

        await expect(
            aiService.chatCompletion([{ role: 'user', content: 'test' }])
        ).rejects.toThrow('OpenAI API error: 429');
    });

    test('passes custom temperature and maxTokens', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'ok' } }]
            })
        });

        await aiService.chatCompletion(
            [{ role: 'user', content: 'test' }],
            { temperature: 0.3, maxTokens: 500 }
        );

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.temperature).toBe(0.3);
        expect(callBody.max_tokens).toBe(500);
    });
});

// =============================================
// suggestAlternativeExercises
// =============================================
describe('AIService.suggestAlternativeExercises', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.OPENAI_API_KEY = 'sk-test-key-123';
        jest.mock('../src/config/database', () => ({
            query: (...args) => mockQuery(...args)
        }));
        jest.mock('../src/config/logger', () => ({
            createServiceLogger: () => ({
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            })
        }));
        aiService = require('../src/services/ai.service');
    });

    test('parses JSON response with exercises array', async () => {
        const mockExercises = {
            exercises: [
                { name: 'Leg Press', reason: 'Meno stress sulle ginocchia', precautions: 'Angolo ridotto' }
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: JSON.stringify(mockExercises) } }]
            })
        });

        const result = await aiService.suggestAlternativeExercises({
            exerciseName: 'Squat',
            injuryDescription: 'Dolore al ginocchio',
            muscleGroup: 'Gambe',
            clientLevel: 'intermedio'
        });

        expect(result.exercises).toHaveLength(1);
        expect(result.exercises[0].name).toBe('Leg Press');
    });

    test('returns rawResponse when AI does not return valid JSON', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Ecco alcuni esercizi alternativi senza JSON' } }]
            })
        });

        const result = await aiService.suggestAlternativeExercises({
            exerciseName: 'Bench Press',
            injuryDescription: 'Spalla dolorante',
            muscleGroup: 'Petto'
        });

        expect(result.exercises).toEqual([]);
        expect(result.rawResponse).toContain('Ecco alcuni esercizi');
    });
});

// =============================================
// logInteraction
// =============================================
describe('AIService.logInteraction', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.OPENAI_API_KEY = 'sk-test-key-123';
        jest.mock('../src/config/database', () => ({
            query: (...args) => mockQuery(...args)
        }));
        jest.mock('../src/config/logger', () => ({
            createServiceLogger: () => ({
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            })
        }));
        aiService = require('../src/services/ai.service');
    });

    test('inserts interaction log with tenant_id scoping', async () => {
        mockQuery.mockResolvedValue({});

        await aiService.logInteraction('tenant-1', 42, {
            type: 'exercise_suggestion',
            prompt: 'Suggerisci esercizi',
            response: 'Ecco gli esercizi',
            tokensUsed: 150
        });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO ai_interaction_logs');
        expect(params[0]).toBe('tenant-1');
        expect(params[1]).toBe(42);
        expect(params[2]).toBe('exercise_suggestion');
    });

    test('does not throw when table does not exist', async () => {
        mockQuery.mockRejectedValue(new Error('Table does not exist'));

        // Should not throw
        await aiService.logInteraction('tenant-1', 1, { type: 'test' });
    });
});

// =============================================
// checkUsageLimit
// =============================================
describe('AIService.checkUsageLimit', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.OPENAI_API_KEY = 'sk-test-key-123';
        jest.mock('../src/config/database', () => ({
            query: (...args) => mockQuery(...args)
        }));
        jest.mock('../src/config/logger', () => ({
            createServiceLogger: () => ({
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            })
        }));
        aiService = require('../src/services/ai.service');
    });

    test('returns usage stats scoped to tenant_id', async () => {
        mockQuery.mockResolvedValue([{ count: 120 }]);

        const result = await aiService.checkUsageLimit('tenant-1');

        expect(result.used).toBe(120);
        expect(result.limit).toBe(500);
        expect(result.remaining).toBe(380);
        expect(result.withinLimit).toBe(true);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('tenant_id = ?');
        expect(params[0]).toBe('tenant-1');
    });

    test('returns withinLimit false when limit exceeded', async () => {
        mockQuery.mockResolvedValue([{ count: 501 }]);

        const result = await aiService.checkUsageLimit('tenant-1');

        expect(result.withinLimit).toBe(false);
        expect(result.remaining).toBe(0);
    });

    test('returns default values when query fails', async () => {
        mockQuery.mockRejectedValue(new Error('Table not found'));

        const result = await aiService.checkUsageLimit('tenant-1');

        expect(result.used).toBe(0);
        expect(result.withinLimit).toBe(true);
    });
});
