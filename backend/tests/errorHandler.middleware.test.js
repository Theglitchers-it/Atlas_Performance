/**
 * Tests for Error Handler Middleware
 * errorHandler: error formatting, status codes, production vs dev messages, SQL error hiding
 */

// Mock logger to prevent console output during tests
jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    })
}));

const { errorHandler } = require('../src/middlewares/errorHandler');

// Test helpers
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.statusCode = 200;
    return res;
};
const mockReq = (overrides = {}) => ({
    requestId: 'req-123',
    ...overrides
});
const mockNext = jest.fn();

describe('errorHandler middleware', () => {
    beforeEach(() => {
        mockNext.mockClear();
    });

    describe('Joi validation errors', () => {
        test('returns 400 with formatted field errors for Joi errors', () => {
            const err = new Error('Validation failed');
            err.isJoi = true;
            err.details = [
                { path: ['email'], message: '"email" is required' },
                { path: ['name', 'first'], message: '"name.first" must be a string' }
            ];
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dati non validi',
                errors: [
                    { field: 'email', message: '"email" is required' },
                    { field: 'name.first', message: '"name.first" must be a string' }
                ]
            });
        });
    });

    describe('MySQL errors', () => {
        test('returns 409 for duplicate entry error (ER_DUP_ENTRY)', () => {
            const err = new Error('Duplicate entry');
            err.code = 'ER_DUP_ENTRY';
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dato già esistente nel sistema'
            });
        });

        test('returns 400 for foreign key constraint error (ER_NO_REFERENCED_ROW_2)', () => {
            const err = new Error('FK constraint');
            err.code = 'ER_NO_REFERENCED_ROW_2';
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Riferimento a dato non esistente'
            });
        });

        test('returns 500 for generic DB error and hides details in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const err = new Error('Some SQL error details');
            err.code = 'ER_BAD_FIELD_ERROR';
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.success).toBe(false);
            expect(jsonArg.message).toBe('Errore database');
            // Should NOT include detail/code in production
            expect(jsonArg.detail).toBeUndefined();
            expect(jsonArg.code).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });

        test('includes detail and code for generic DB error in non-production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';

            const err = new Error('Some SQL error details');
            err.code = 'ER_BAD_FIELD_ERROR';
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.detail).toBe('Some SQL error details');
            expect(jsonArg.code).toBe('ER_BAD_FIELD_ERROR');

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Multer file upload errors', () => {
        test('returns 400 for LIMIT_FILE_SIZE', () => {
            const err = new Error('File too large');
            err.code = 'LIMIT_FILE_SIZE';
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'File troppo grande'
            });
        });

        test('returns 400 for LIMIT_UNEXPECTED_FILE', () => {
            const err = new Error('Unexpected file');
            err.code = 'LIMIT_UNEXPECTED_FILE';
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Tipo di file non permesso'
            });
        });
    });

    describe('Custom status code errors', () => {
        test('uses err.status if set', () => {
            const err = new Error('Not Found');
            err.status = 404;
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Not Found'
            });
        });

        test('uses err.statusCode if set', () => {
            const err = new Error('Forbidden');
            err.statusCode = 403;
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Forbidden'
            });
        });
    });

    describe('Generic errors', () => {
        test('returns 500 with generic message in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const err = new Error('Internal implementation detail');
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.success).toBe(false);
            expect(jsonArg.message).toBe('Errore interno del server');
            // Should NOT include stack in production
            expect(jsonArg.stack).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });

        test('returns detailed error message and stack in non-production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';

            const err = new Error('Something broke');
            const req = mockReq();
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.success).toBe(false);
            expect(jsonArg.message).toBe('Something broke');
            expect(jsonArg.stack).toBeDefined();

            process.env.NODE_ENV = originalEnv;
        });

        test('includes requestId in generic error response', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';

            const err = new Error('Some error');
            const req = mockReq({ requestId: 'abc-456' });
            const res = mockRes();

            errorHandler(err, req, res, mockNext);

            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.requestId).toBe('abc-456');

            process.env.NODE_ENV = originalEnv;
        });

        test('uses res.statusCode if not 200', () => {
            const err = new Error('Bad gateway');
            const req = mockReq();
            const res = mockRes();
            res.statusCode = 502;

            errorHandler(err, req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(502);
        });
    });
});
