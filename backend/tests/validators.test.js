/**
 * Tests for Auth Validators
 * Joi schemas: registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema
 */

const {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} = require('../src/validators/auth.validator');

describe('Auth Validators', () => {

    describe('registerSchema', () => {
        const validData = {
            email: 'test@example.com',
            password: 'Password1!',
            firstName: 'Mario',
            lastName: 'Rossi',
            phone: '+39 333 1234567',
            businessName: 'Palestra Fit'
        };

        test('valid registration data passes', () => {
            const { error } = registerSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        test('email is required', () => {
            const { error } = registerSchema.validate({ ...validData, email: undefined });
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('email');
        });

        test('invalid email rejected', () => {
            const { error } = registerSchema.validate({ ...validData, email: 'not-an-email' });
            expect(error).toBeDefined();
        });

        test('password is required', () => {
            const { error } = registerSchema.validate({ ...validData, password: undefined });
            expect(error).toBeDefined();
        });

        test('password min 8 chars', () => {
            const { error } = registerSchema.validate({ ...validData, password: 'Ab1' });
            expect(error).toBeDefined();
        });

        test('password requires uppercase', () => {
            const { error } = registerSchema.validate({ ...validData, password: 'password1' });
            expect(error).toBeDefined();
        });

        test('password requires lowercase', () => {
            const { error } = registerSchema.validate({ ...validData, password: 'PASSWORD1' });
            expect(error).toBeDefined();
        });

        test('password requires number', () => {
            const { error } = registerSchema.validate({ ...validData, password: 'PasswordABC' });
            expect(error).toBeDefined();
        });

        test('password requires special character', () => {
            const { error } = registerSchema.validate({ ...validData, password: 'Password1' });
            expect(error).toBeDefined();
        });

        test('strong password passes', () => {
            const { error } = registerSchema.validate({ ...validData, password: 'Str0ngP@ss' });
            expect(error).toBeUndefined();
        });

        test('firstName is required', () => {
            const { error } = registerSchema.validate({ ...validData, firstName: undefined });
            expect(error).toBeDefined();
        });

        test('firstName min 2 chars', () => {
            const { error } = registerSchema.validate({ ...validData, firstName: 'A' });
            expect(error).toBeDefined();
        });

        test('lastName is required', () => {
            const { error } = registerSchema.validate({ ...validData, lastName: undefined });
            expect(error).toBeDefined();
        });

        test('phone is optional', () => {
            const { error } = registerSchema.validate({ ...validData, phone: undefined });
            expect(error).toBeUndefined();
        });

        test('phone allows empty string', () => {
            const { error } = registerSchema.validate({ ...validData, phone: '' });
            expect(error).toBeUndefined();
        });

        test('phone rejects invalid characters', () => {
            const { error } = registerSchema.validate({ ...validData, phone: 'abc-phone' });
            expect(error).toBeDefined();
        });

        test('businessName is required', () => {
            const { error } = registerSchema.validate({ ...validData, businessName: undefined });
            expect(error).toBeDefined();
        });

        test('businessName min 2 chars', () => {
            const { error } = registerSchema.validate({ ...validData, businessName: 'A' });
            expect(error).toBeDefined();
        });

        test('role defaults to tenant_owner', () => {
            const { value } = registerSchema.validate(validData);
            expect(value.role).toBe('tenant_owner');
        });

        test('role can be client', () => {
            const { error, value } = registerSchema.validate({ ...validData, role: 'client' });
            expect(error).toBeUndefined();
            expect(value.role).toBe('client');
        });

        test('role rejects invalid values', () => {
            const { error } = registerSchema.validate({ ...validData, role: 'super_admin' });
            expect(error).toBeDefined();
        });
    });

    describe('loginSchema', () => {
        test('valid login passes', () => {
            const { error } = loginSchema.validate({
                email: 'test@example.com',
                password: 'Password1'
            });
            expect(error).toBeUndefined();
        });

        test('email is required', () => {
            const { error } = loginSchema.validate({ password: 'test' });
            expect(error).toBeDefined();
        });

        test('password is required', () => {
            const { error } = loginSchema.validate({ email: 'test@example.com' });
            expect(error).toBeDefined();
        });

        test('invalid email rejected', () => {
            const { error } = loginSchema.validate({ email: 'bad', password: 'test' });
            expect(error).toBeDefined();
        });

        test('empty email rejected', () => {
            const { error } = loginSchema.validate({ email: '', password: 'test' });
            expect(error).toBeDefined();
        });
    });

    describe('forgotPasswordSchema', () => {
        test('valid email passes', () => {
            const { error } = forgotPasswordSchema.validate({ email: 'test@example.com' });
            expect(error).toBeUndefined();
        });

        test('email is required', () => {
            const { error } = forgotPasswordSchema.validate({});
            expect(error).toBeDefined();
        });

        test('invalid email rejected', () => {
            const { error } = forgotPasswordSchema.validate({ email: 'not-email' });
            expect(error).toBeDefined();
        });
    });

    describe('resetPasswordSchema', () => {
        test('valid data passes', () => {
            const { error } = resetPasswordSchema.validate({
                token: 'abc123',
                password: 'NewPass1!'
            });
            expect(error).toBeUndefined();
        });

        test('token is required', () => {
            const { error } = resetPasswordSchema.validate({ password: 'NewPass1!' });
            expect(error).toBeDefined();
        });

        test('password is required', () => {
            const { error } = resetPasswordSchema.validate({ token: 'abc' });
            expect(error).toBeDefined();
        });

        test('password validation same as register', () => {
            // Too short
            const { error: e1 } = resetPasswordSchema.validate({ token: 'abc', password: 'Ab1' });
            expect(e1).toBeDefined();

            // No uppercase
            const { error: e2 } = resetPasswordSchema.validate({ token: 'abc', password: 'password1' });
            expect(e2).toBeDefined();

            // No number
            const { error: e3 } = resetPasswordSchema.validate({ token: 'abc', password: 'PasswordABC' });
            expect(e3).toBeDefined();
        });
    });
});
