/**
 * Tests for Email Service
 * sendEmail, sendWelcome, sendPasswordReset, sendAppointmentReminder,
 * sendWorkoutReminder, error handling
 */

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: mockSendMail
    })
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Set SMTP env vars before requiring the service so init() succeeds
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'password123';
process.env.SMTP_FROM = '"PT SAAS Test" <noreply@test.com>';

// The module exports a singleton; we need a fresh instance per test suite.
// Clear the module cache so each require gets a fresh EmailService.
let emailService;

beforeEach(() => {
    jest.resetModules();
    // Re-apply mocks after resetModules since they get cleared
    jest.mock('nodemailer', () => ({
        createTransport: jest.fn().mockReturnValue({
            sendMail: mockSendMail
        })
    }));
    jest.mock('../src/config/logger', () => ({
        createServiceLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }));

    emailService = require('../src/services/email.service');
    // Reset the singleton state so init() runs fresh
    emailService.initialized = false;
    emailService.transporter = null;

    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
});

describe('EmailService - sendWelcome', () => {
    test('sends welcome email with correct subject and recipient', async () => {
        const result = await emailService.sendWelcome({
            to: 'mario@example.com',
            name: 'Mario Rossi',
            role: 'client',
            loginUrl: 'http://localhost:5173/login'
        });

        expect(result).toEqual({ messageId: 'test-id' });
        expect(mockSendMail).toHaveBeenCalledTimes(1);

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.to).toBe('mario@example.com');
        expect(mailOptions.subject).toBe('Benvenuto su PT SAAS!');
        expect(mailOptions.html).toContain('Mario Rossi');
        expect(mailOptions.html).toContain('http://localhost:5173/login');
    });
});

describe('EmailService - sendPasswordReset', () => {
    test('sends password reset email with reset URL in body', async () => {
        const resetUrl = 'http://localhost:5173/reset?token=abc123';

        const result = await emailService.sendPasswordReset({
            to: 'mario@example.com',
            name: 'Mario Rossi',
            resetUrl
        });

        expect(result).toEqual({ messageId: 'test-id' });
        expect(mockSendMail).toHaveBeenCalledTimes(1);

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.to).toBe('mario@example.com');
        expect(mailOptions.subject).toBe('Reset Password');
        expect(mailOptions.html).toContain(resetUrl);
        expect(mailOptions.html).toContain('Mario Rossi');
    });

    test('throws when sendMail fails (critical email)', async () => {
        mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

        await expect(
            emailService.sendPasswordReset({
                to: 'mario@example.com',
                name: 'Mario Rossi',
                resetUrl: 'http://localhost:5173/reset?token=abc123'
            })
        ).rejects.toEqual(
            expect.objectContaining({ status: 500 })
        );
    });
});

describe('EmailService - sendAppointmentReminder', () => {
    test('sends appointment reminder with date, time and type', async () => {
        const result = await emailService.sendAppointmentReminder({
            to: 'cliente@example.com',
            clientName: 'Luca Bianchi',
            date: '20/03/2025',
            time: '10:00',
            type: 'Personal Training'
        });

        expect(result).toEqual({ messageId: 'test-id' });

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.to).toBe('cliente@example.com');
        expect(mailOptions.subject).toBe('Promemoria Appuntamento');
        expect(mailOptions.html).toContain('Luca Bianchi');
        expect(mailOptions.html).toContain('20/03/2025');
        expect(mailOptions.html).toContain('10:00');
        expect(mailOptions.html).toContain('Personal Training');
    });
});

describe('EmailService - sendWorkoutReminder', () => {
    test('sends workout reminder with workout name', async () => {
        const result = await emailService.sendWorkoutReminder({
            to: 'cliente@example.com',
            clientName: 'Luca Bianchi',
            workoutName: 'Push Day A'
        });

        expect(result).toEqual({ messageId: 'test-id' });

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.to).toBe('cliente@example.com');
        expect(mailOptions.subject).toBe('Allenamento di Oggi');
        expect(mailOptions.html).toContain('Push Day A');
    });
});

describe('EmailService - error handling', () => {
    test('returns null when sendMail fails for non-critical email', async () => {
        mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

        const result = await emailService.sendWelcome({
            to: 'mario@example.com',
            name: 'Mario Rossi',
            role: 'trainer'
        });

        expect(result).toBeNull();
    });

    test('returns null when SMTP is not configured', async () => {
        // Clear SMTP env to simulate missing config
        const origHost = process.env.SMTP_HOST;
        delete process.env.SMTP_HOST;

        // Force re-init by resetting the singleton state
        emailService.initialized = false;
        emailService.transporter = null;

        const result = await emailService.sendWelcome({
            to: 'mario@example.com',
            name: 'Mario Rossi',
            role: 'client'
        });

        expect(result).toBeNull();
        expect(mockSendMail).not.toHaveBeenCalled();

        // Restore env
        process.env.SMTP_HOST = origHost;
    });
});
