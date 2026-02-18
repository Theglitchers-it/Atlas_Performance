/**
 * Tests for Validate Middleware
 * validate: Joi validation success/failure, error format, different targets (body, query, params)
 */

const Joi = require('joi');
const { validate } = require('../src/middlewares/validate');

// Test helpers
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockNext = jest.fn();

beforeEach(() => {
    mockNext.mockClear();
});

describe('validate middleware', () => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().min(2).required()
    });

    describe('successful validation', () => {
        test('calls next() when body is valid', () => {
            const req = { body: { email: 'test@example.com', name: 'John' } };
            const res = mockRes();

            validate(schema)(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('strips unknown fields from validated data', () => {
            const req = { body: { email: 'test@example.com', name: 'John', unknown: 'field' } };
            const res = mockRes();

            validate(schema)(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(req.body.unknown).toBeUndefined();
            expect(req.body.email).toBe('test@example.com');
        });

        test('replaces req property with sanitized values', () => {
            const req = { body: { email: 'TEST@Example.COM', name: 'John', extraField: 'removed' } };
            const res = mockRes();

            // stripUnknown removes unknown fields and value replaces req[property]
            validate(schema)(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(req.body.email).toBe('TEST@Example.COM');
            expect(req.body.extraField).toBeUndefined(); // stripped by stripUnknown
        });
    });

    describe('failed validation', () => {
        test('returns 400 with error details when validation fails', () => {
            const req = { body: { email: 'not-an-email' } };
            const res = mockRes();

            validate(schema)(req, res, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Dati non validi',
                errors: expect.any(Array)
            }));
        });

        test('returns all validation errors (abortEarly: false)', () => {
            const req = { body: {} }; // missing both required fields
            const res = mockRes();

            validate(schema)(req, res, mockNext);

            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.errors.length).toBeGreaterThanOrEqual(2);
        });

        test('formats error objects with field and message', () => {
            const req = { body: { email: 'bad' } };
            const res = mockRes();

            validate(schema)(req, res, mockNext);

            const jsonArg = res.json.mock.calls[0][0];
            jsonArg.errors.forEach(err => {
                expect(err).toHaveProperty('field');
                expect(err).toHaveProperty('message');
                // Quotes should be stripped from messages
                expect(err.message).not.toMatch(/^"/);
            });
        });
    });

    describe('different validation targets', () => {
        test('validates query parameters when property is "query"', () => {
            const querySchema = Joi.object({
                page: Joi.number().integer().min(1).required()
            });
            const req = { query: { page: 1 } };
            const res = mockRes();

            validate(querySchema, 'query')(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(req.query.page).toBe(1);
        });

        test('returns 400 for invalid query parameters', () => {
            const querySchema = Joi.object({
                page: Joi.number().integer().min(1).required()
            });
            const req = { query: { page: -5 } };
            const res = mockRes();

            validate(querySchema, 'query')(req, res, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('validates params when property is "params"', () => {
            const paramsSchema = Joi.object({
                id: Joi.number().integer().required()
            });
            const req = { params: { id: 42 } };
            const res = mockRes();

            validate(paramsSchema, 'params')(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        test('returns 400 for invalid params', () => {
            const paramsSchema = Joi.object({
                id: Joi.number().integer().required()
            });
            const req = { params: { id: 'not-a-number' } };
            const res = mockRes();

            validate(paramsSchema, 'params')(req, res, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
