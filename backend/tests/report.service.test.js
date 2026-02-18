/**
 * Tests for ReportService
 * PDF report generation for client progress, payments, workout plans, meal plans
 * PDFKit is mocked to avoid actual PDF generation in tests
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

// Mock PDFKit - simulate the event-driven PDF generation
const mockDocEnd = jest.fn();
const mockDocOn = jest.fn();
const mockDocText = jest.fn();
const mockDocFontSize = jest.fn();
const mockDocFillColor = jest.fn();
const mockDocFont = jest.fn();
const mockDocMoveTo = jest.fn();
const mockDocLineTo = jest.fn();
const mockDocStrokeColor = jest.fn();
const mockDocStroke = jest.fn();
const mockDocAddPage = jest.fn();
const mockDocHeightOfString = jest.fn().mockReturnValue(15);

const createMockDoc = () => {
    const handlers = {};
    let ended = false;
    const doc = {
        fontSize: mockDocFontSize.mockReturnThis(),
        fillColor: mockDocFillColor.mockReturnThis(),
        font: mockDocFont.mockReturnThis(),
        text: mockDocText.mockReturnThis(),
        moveTo: mockDocMoveTo.mockReturnThis(),
        lineTo: mockDocLineTo.mockReturnThis(),
        strokeColor: mockDocStrokeColor.mockReturnThis(),
        stroke: mockDocStroke.mockReturnThis(),
        addPage: mockDocAddPage.mockReturnThis(),
        heightOfString: mockDocHeightOfString,
        bufferedPageRange: jest.fn().mockReturnValue({ start: 0 }),
        page: { height: 842 }, // A4 height in points
        on: jest.fn((event, cb) => {
            if (!handlers[event]) handlers[event] = [];
            handlers[event].push(cb);
            // If end() was already called and a new 'end' handler is registered, fire it async
            if (ended && event === 'end') {
                process.nextTick(() => cb());
            }
        }),
        end: jest.fn(() => {
            ended = true;
            // Simulate 'data' event with a small buffer, then 'end' asynchronously
            process.nextTick(() => {
                if (handlers['data']) {
                    handlers['data'].forEach(cb => cb(Buffer.from('mock-pdf-content')));
                }
                if (handlers['end']) {
                    handlers['end'].forEach(cb => cb());
                }
            });
        })
    };
    return doc;
};

jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => createMockDoc());
});

const reportService = require('../src/services/report.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// generateClientProgressReport
// =============================================
describe('ReportService.generateClientProgressReport', () => {
    test('generates PDF with client data, sessions, measurements, achievements', async () => {
        // Client query
        mockQuery.mockResolvedValueOnce([{
            id: 5, first_name: 'Mario', last_name: 'Rossi',
            email: 'mario@test.com', fitness_level: 'intermediate',
            primary_goal: 'muscle_gain', level: 5, xp_points: 1200,
            streak_days: 14, last_workout_at: '2025-03-01'
        }]);

        // Sessions query
        mockQuery.mockResolvedValueOnce([
            { date: '2025-03-01', status: 'completed', duration_minutes: 60, notes: 'Great session' },
            { date: '2025-02-25', status: 'completed', duration_minutes: 45, notes: null }
        ]);

        // Measurements query
        mockQuery.mockResolvedValueOnce([
            { measurement_date: '2025-03-01', weight_kg: 85, body_fat_percentage: 15, muscle_mass_kg: 65 }
        ]);

        // Achievements query
        mockQuery.mockResolvedValueOnce([
            { name: 'First Workout', earned_at: '2025-01-15' }
        ]);

        const result = await reportService.generateClientProgressReport(5, 'tenant-1');

        // Should return a Buffer
        expect(Buffer.isBuffer(result)).toBe(true);

        // Client query must scope to tenant_id
        const clientCall = mockQuery.mock.calls[0];
        expect(clientCall[0]).toContain('c.tenant_id');
        expect(clientCall[1]).toEqual([5, 'tenant-1']);

        // Sessions query must scope to tenant_id
        const sessionsCall = mockQuery.mock.calls[1];
        expect(sessionsCall[0]).toContain('tenant_id');
        expect(sessionsCall[1]).toContain('tenant-1');

        // Measurements query must scope to tenant_id
        const measurementsCall = mockQuery.mock.calls[2];
        expect(measurementsCall[0]).toContain('tenant_id');
        expect(measurementsCall[1]).toContain('tenant-1');

        // Achievements query must scope to tenant_id
        const achievementsCall = mockQuery.mock.calls[3];
        expect(achievementsCall[0]).toContain('ca.tenant_id');
        expect(achievementsCall[1]).toContain('tenant-1');
    });

    test('throws error when client not found', async () => {
        mockQuery.mockResolvedValueOnce([]); // Empty client result

        await expect(
            reportService.generateClientProgressReport(999, 'tenant-1')
        ).rejects.toThrow('Cliente non trovato');
    });

    test('applies date range filters to sessions query', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 5, first_name: 'Mario', last_name: 'Rossi',
            fitness_level: 'beginner', primary_goal: 'weight_loss',
            level: 1, xp_points: 0, streak_days: 0
        }]);
        mockQuery.mockResolvedValueOnce([]); // sessions
        mockQuery.mockResolvedValueOnce([]); // measurements
        mockQuery.mockResolvedValueOnce([]); // achievements

        await reportService.generateClientProgressReport(5, 'tenant-1', {
            startDate: '2025-01-01',
            endDate: '2025-03-31'
        });

        const sessionsCall = mockQuery.mock.calls[1];
        expect(sessionsCall[0]).toContain('created_at >=');
        expect(sessionsCall[0]).toContain('created_at <=');
        expect(sessionsCall[1]).toContain('2025-01-01');
        expect(sessionsCall[1]).toContain('2025-03-31');
    });

    test('handles client with no sessions, measurements, or achievements', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 5, first_name: 'New', last_name: 'Client',
            fitness_level: 'beginner', primary_goal: 'general_fitness',
            level: 1, xp_points: 0, streak_days: 0
        }]);
        mockQuery.mockResolvedValueOnce([]); // No sessions
        mockQuery.mockResolvedValueOnce([]); // No measurements
        mockQuery.mockResolvedValueOnce([]); // No achievements

        const result = await reportService.generateClientProgressReport(5, 'tenant-1');

        // Should still generate a valid PDF buffer
        expect(Buffer.isBuffer(result)).toBe(true);
    });
});

// =============================================
// generatePaymentReport
// =============================================
describe('ReportService.generatePaymentReport', () => {
    test('generates payment report PDF with totals', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                payment_date: '2025-03-01', amount: '150.00', currency: 'EUR',
                status: 'completed', payment_method: 'stripe',
                first_name: 'Mario', last_name: 'Rossi', email: 'mario@test.com'
            },
            {
                payment_date: '2025-03-05', amount: '50.00', currency: 'EUR',
                status: 'pending', payment_method: 'cash',
                first_name: 'Luigi', last_name: 'Verdi', email: 'luigi@test.com'
            }
        ]);

        const result = await reportService.generatePaymentReport('tenant-1', {
            startDate: '2025-03-01',
            endDate: '2025-03-31'
        });

        expect(Buffer.isBuffer(result)).toBe(true);

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('p.tenant_id');
        expect(call[1][0]).toBe('tenant-1');
        expect(call[0]).toContain('p.payment_date >=');
        expect(call[0]).toContain('p.payment_date <=');
    });

    test('applies clientId filter to payment query', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await reportService.generatePaymentReport('tenant-1', {
            clientId: 5
        });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('p.client_id = ?');
        expect(call[1]).toContain(5);
    });

    test('handles empty payment data gracefully', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await reportService.generatePaymentReport('tenant-1');

        expect(Buffer.isBuffer(result)).toBe(true);
        // Should not throw when no payments exist
    });
});

// =============================================
// generateWorkoutPlanPDF
// =============================================
describe('ReportService.generateWorkoutPlanPDF', () => {
    test('generates workout plan PDF with exercises', async () => {
        // Template query
        mockQuery.mockResolvedValueOnce([{
            id: 1, name: 'Push Day A', description: 'Upper body push focus',
            difficulty_level: 'intermediate', estimated_duration_minutes: 60
        }]);

        // Exercises query
        mockQuery.mockResolvedValueOnce([
            {
                exercise_order: 1, name: 'Bench Press', description: 'Flat barbell bench',
                category: 'chest', equipment: 'barbell',
                sets: 4, reps: 8, rest_seconds: 120, weight_kg: 80, notes: null
            },
            {
                exercise_order: 2, name: 'Incline DB Press', description: 'Incline dumbbell press',
                category: 'chest', equipment: 'dumbbell',
                sets: 3, reps: 10, rest_seconds: 90, weight_kg: 30, notes: 'Focus on contraction'
            }
        ]);

        const result = await reportService.generateWorkoutPlanPDF(1, 'tenant-1');

        expect(Buffer.isBuffer(result)).toBe(true);

        // Template query must scope to tenant_id
        const templateCall = mockQuery.mock.calls[0];
        expect(templateCall[0]).toContain('tenant_id');
        expect(templateCall[1]).toEqual([1, 'tenant-1']);

        // Exercises query uses template_id (tenant scoping via template ownership)
        const exercisesCall = mockQuery.mock.calls[1];
        expect(exercisesCall[1]).toEqual([1]);
    });

    test('throws error when template not found', async () => {
        mockQuery.mockResolvedValueOnce([]); // Empty template result

        await expect(
            reportService.generateWorkoutPlanPDF(999, 'tenant-1')
        ).rejects.toThrow('Template non trovato');
    });
});

// =============================================
// generateMealPlanPDF
// =============================================
describe('ReportService.generateMealPlanPDF', () => {
    test('generates meal plan PDF with meals grouped by day', async () => {
        // Meal plan query
        mockQuery.mockResolvedValueOnce([{
            id: 1, name: 'Dieta Iperproteica',
            first_name: 'Mario', last_name: 'Rossi', client_id: 5,
            daily_calories_target: 2500,
            protein_target_g: 200, carbs_target_g: 250, fat_target_g: 80,
            notes: 'High protein for muscle gain'
        }]);

        // Meals query
        mockQuery.mockResolvedValueOnce([
            {
                day_of_week: 1, meal_type: 'breakfast',
                food_description: 'Oatmeal with protein powder',
                calories: 450, protein_g: 35, carbs_g: 55, fat_g: 10, notes: null
            },
            {
                day_of_week: 1, meal_type: 'lunch',
                food_description: 'Chicken breast with rice',
                calories: 650, protein_g: 50, carbs_g: 70, fat_g: 15, notes: 'Add vegetables'
            }
        ]);

        const result = await reportService.generateMealPlanPDF(1, 'tenant-1');

        expect(Buffer.isBuffer(result)).toBe(true);

        // Meal plan query must scope to tenant_id
        const planCall = mockQuery.mock.calls[0];
        expect(planCall[0]).toContain('mp.tenant_id');
        expect(planCall[1]).toEqual([1, 'tenant-1']);
    });

    test('throws error when meal plan not found', async () => {
        mockQuery.mockResolvedValueOnce([]); // Empty plan result

        await expect(
            reportService.generateMealPlanPDF(999, 'tenant-1')
        ).rejects.toThrow('Piano alimentare non trovato');
    });

    test('handles meal plan with no meals', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1, name: 'Empty Plan', client_id: null,
            daily_calories_target: 2000,
            protein_target_g: 150, carbs_target_g: 200, fat_target_g: 70,
            notes: null
        }]);
        mockQuery.mockResolvedValueOnce([]); // No meals

        const result = await reportService.generateMealPlanPDF(1, 'tenant-1');

        expect(Buffer.isBuffer(result)).toBe(true);
    });
});

// =============================================
// Internal helper methods
// =============================================
describe('ReportService._createPDF', () => {
    test('creates PDF document with A4 size', () => {
        const doc = reportService._createPDF();

        expect(doc).toBeDefined();
        // PDFKit constructor was called
        const PDFDocument = require('pdfkit');
        expect(PDFDocument).toHaveBeenCalled();
    });
});

describe('ReportService._addHeader', () => {
    test('returns Y position after header', () => {
        const doc = createMockDoc();

        const y = reportService._addHeader(doc, 'Test Title', 'Subtitle');

        expect(y).toBe(145);
        expect(mockDocText).toHaveBeenCalled();
    });

    test('works without subtitle', () => {
        const doc = createMockDoc();

        const y = reportService._addHeader(doc, 'Test Title');

        expect(y).toBe(145);
    });
});
