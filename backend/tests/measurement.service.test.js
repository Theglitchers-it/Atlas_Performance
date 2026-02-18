/**
 * Tests for MeasurementService (unified)
 * Anthropometric, Body, Circumferences, Skinfolds, BIA + Overview/Compare/Dates
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const measurementService = require('../src/services/measurement.service');

beforeEach(() => jest.clearAllMocks());

// ====== OVERVIEW ======

describe('MeasurementService.getOverview', () => {
    test('returns overview data for client', async () => {
        mockQuery
            .mockResolvedValueOnce([{ weight_kg: 80, height_cm: 175 }])
            .mockResolvedValueOnce([{ weight_kg: 79, body_fat_percentage: 15 }])
            .mockResolvedValueOnce([{ waist_cm: 82 }])
            .mockResolvedValueOnce([{ body_fat_percentage: 14 }])
            .mockResolvedValueOnce([{ lean_mass_kg: 65, fat_mass_pct: 15 }]);

        const result = await measurementService.getOverview(1, 'tenant-1');
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalledTimes(5);
    });
});

// ====== WEIGHT CHANGE ======

describe('MeasurementService.getWeightChange', () => {
    test('calculates weight change', async () => {
        mockQuery.mockResolvedValueOnce([
            { weight_kg: 78, measurement_date: '2026-02-01' },
            { weight_kg: 80, measurement_date: '2026-01-01' }
        ]);

        const result = await measurementService.getWeightChange(1, 'tenant-1');
        expect(result).toBeDefined();
    });
});

// ====== BODY MEASUREMENTS ======

describe('MeasurementService.getBodyList', () => {
    test('returns body measurements for client', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, weight_kg: 80, body_fat_percentage: 15, measurement_date: '2026-01-01' }
        ]);

        const result = await measurementService.getBodyList(1, 'tenant-1');
        expect(result).toHaveLength(1);
        expect(result[0].weight_kg).toBe(80);
    });
});

describe('MeasurementService.createBody', () => {
    test('creates body measurement and updates client weight', async () => {
        mockQuery
            .mockResolvedValueOnce({ insertId: 5 })
            .mockResolvedValueOnce([]);

        const result = await measurementService.createBody(1, 'tenant-1', {
            measurementDate: '2026-02-01',
            weightKg: 78,
            bodyFatPercentage: 14
        });

        expect(result.id).toBe(5);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE clients'),
            expect.arrayContaining([78])
        );
    });
});

// ====== CIRCUMFERENCES ======

describe('MeasurementService.getCircumferenceList', () => {
    test('returns circumference measurements', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, waist_cm: 80, hips_cm: 95 }
        ]);

        const result = await measurementService.getCircumferenceList(1, 'tenant-1');
        expect(result[0].waist_cm).toBe(80);
    });
});

describe('MeasurementService.createCircumference', () => {
    test('creates circumference measurement', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 3 });

        const result = await measurementService.createCircumference(1, 'tenant-1', {
            measurementDate: '2026-02-01',
            waistCm: 80,
            hipsCm: 95,
            chestCm: 100
        });

        expect(result.id).toBe(3);
    });
});

// ====== SKINFOLDS ======

describe('MeasurementService.createSkinfold', () => {
    test('creates skinfold measurement', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 7 });

        const result = await measurementService.createSkinfold(1, 'tenant-1', {
            measurementDate: '2026-02-01',
            chestMm: 8,
            abdominalMm: 15,
            quadricepsMm: 12,
            gender: 'male',
            age: 30,
            calculationMethod: 'jackson_pollock_3'
        });

        expect(result.id).toBe(7);
    });
});

// ====== BIA ======

describe('MeasurementService.createBia', () => {
    test('creates BIA measurement', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 4 });

        const result = await measurementService.createBia(1, 'tenant-1', {
            measurementDate: '2026-02-01',
            leanMassKg: 65,
            fatMassKg: 15,
            totalBodyWaterL: 45,
            basalMetabolicRate: 1800
        });

        expect(result.id).toBe(4);
    });
});

// ====== ANTHROPOMETRIC ======

describe('MeasurementService.getAnthropometricList', () => {
    test('returns anthropometric measurements', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, weight_kg: 80, height_cm: 175 }
        ]);

        const result = await measurementService.getAnthropometricList(1, 'tenant-1');
        expect(result).toHaveLength(1);
        expect(result[0].height_cm).toBe(175);
    });
});

describe('MeasurementService.createAnthropometric', () => {
    test('creates anthropometric measurement and updates client weight', async () => {
        mockQuery
            .mockResolvedValueOnce({ insertId: 2 })
            .mockResolvedValueOnce([]);

        const result = await measurementService.createAnthropometric(1, 'tenant-1', {
            measurementDate: '2026-02-01',
            heightCm: 175,
            weightKg: 80,
            ageYears: 30
        });

        expect(result.id).toBe(2);
    });
});

// ====== AVAILABLE DATES ======

describe('MeasurementService.getAvailableDates', () => {
    test('returns available dates from all tables', async () => {
        mockQuery.mockResolvedValueOnce([
            { measurement_date: '2026-01-01' },
            { measurement_date: '2026-02-01' }
        ]);

        const result = await measurementService.getAvailableDates(1, 'tenant-1');
        expect(result).toHaveLength(2);
    });
});

// ====== COMPARE ======

describe('MeasurementService.compareMeasurements', () => {
    test('compares measurements between two dates', async () => {
        for (let i = 0; i < 10; i++) {
            mockQuery.mockResolvedValueOnce([]);
        }

        const result = await measurementService.compareMeasurements(1, 'tenant-1', '2026-01-01', '2026-02-01');
        expect(result).toBeDefined();
        expect(result.anthropometric).toBeDefined();
        expect(result.body).toBeDefined();
        expect(result.circumference).toBeDefined();
        expect(result.skinfold).toBeDefined();
        expect(result.bia).toBeDefined();
    });
});
