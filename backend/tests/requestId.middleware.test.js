/**
 * Tests for Request ID Middleware
 * Assigns a unique ID to every request for end-to-end log tracing
 */

const { requestId } = require('../src/middlewares/requestId');

// Test helpers
const mockReq = (overrides = {}) => ({
    headers: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.setHeader = jest.fn();
    return res;
};

const mockNext = () => jest.fn();

// UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('requestId', () => {
    test('generates a new UUID request ID when none is provided', () => {
        const req = mockReq({ headers: {} });
        const res = mockRes();
        const next = mockNext();

        requestId(req, res, next);

        expect(req.requestId).toBeDefined();
        expect(req.requestId).toMatch(UUID_V4_REGEX);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
        expect(next).toHaveBeenCalled();
    });

    test('uses existing X-Request-Id header when present', () => {
        const existingId = 'custom-trace-id-abc-123';
        const req = mockReq({
            headers: { 'x-request-id': existingId }
        });
        const res = mockRes();
        const next = mockNext();

        requestId(req, res, next);

        expect(req.requestId).toBe(existingId);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId);
        expect(next).toHaveBeenCalled();
    });

    test('sets X-Request-Id response header matching req.requestId', () => {
        const req = mockReq({ headers: {} });
        const res = mockRes();
        const next = mockNext();

        requestId(req, res, next);

        const generatedId = req.requestId;
        expect(res.setHeader).toHaveBeenCalledTimes(1);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', generatedId);
    });
});
