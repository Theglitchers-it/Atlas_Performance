/**
 * Tests for Not Found Middleware
 * Catches unmatched routes and returns 404
 */

const { notFound } = require('../src/middlewares/notFound');

// Test helpers
const mockReq = (overrides = {}) => ({
    method: 'GET',
    originalUrl: '/api/nonexistent',
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = () => jest.fn();

describe('notFound', () => {
    test('returns 404 with method and URL in message', () => {
        const req = mockReq({
            method: 'GET',
            originalUrl: '/api/v1/unknown-endpoint'
        });
        const res = mockRes();
        const next = mockNext();

        notFound(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Endpoint non trovato: GET /api/v1/unknown-endpoint'
        });
    });

    test('includes POST method and path in message', () => {
        const req = mockReq({
            method: 'POST',
            originalUrl: '/api/v1/missing-resource'
        });
        const res = mockRes();
        const next = mockNext();

        notFound(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('POST /api/v1/missing-resource')
        }));
    });
});
