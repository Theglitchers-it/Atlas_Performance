/**
 * Tests for AnthropometricService
 * Anthropometric data, skinfold (plicometry), circumference, BIA measurements,
 * body composition overview, measurement comparison, static body-fat calculations
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })
}));

const anthropometricService = require('../src/services/anthropometric.service');
const AnthropometricService = require('../src/services/anthropometric.service').constructor;

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// saveAnthropometric
// =============================================
describe('AnthropometricService.saveAnthropometric', () => {
    test('inserts anthropometric data and updates client weight', async () => {
        // INSERT into anthropometric_data
        mockQuery.mockResolvedValueOnce({ insertId: 10 });
        // UPDATE clients SET current_weight_kg
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await anthropometricService.saveAnthropometric(5, 'tenant-1', {
            measurementDate: '2025-03-01',
            heightCm: 180,
            weightKg: 85,
            ageYears: 30,
            dailyStepsAvg: 8000,
            notes: 'Buone condizioni'
        });

        expect(result.id).toBe(10);

        // INSERT query
        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain('INSERT INTO anthropometric_data');
        expect(insertCall[0]).toContain('tenant_id');
        expect(insertCall[1][0]).toBe('tenant-1');
        expect(insertCall[1][1]).toBe(5); // client_id

        // UPDATE query for weight
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('UPDATE clients SET current_weight_kg');
        expect(updateCall[0]).toContain('tenant_id');
        expect(updateCall[1]).toEqual([85, 5, 'tenant-1']);
    });

    test('does not update client weight when weightKg is not provided', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 11 });

        await anthropometricService.saveAnthropometric(5, 'tenant-1', {
            measurementDate: '2025-03-01',
            heightCm: 180
        });

        // Only one query (INSERT), no UPDATE
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});

// =============================================
// getLatest
// =============================================
describe('AnthropometricService.getLatest', () => {
    test('returns latest anthropometric data for client', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 10, weight_kg: 85, height_cm: 180, measurement_date: '2025-03-01' }
        ]);

        const result = await anthropometricService.getLatest(5, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.weight_kg).toBe(85);

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([5, 'tenant-1']);
    });

    test('returns null when no data exists', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await anthropometricService.getLatest(5, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// getHistory
// =============================================
describe('AnthropometricService.getHistory', () => {
    test('returns anthropometric history with date filters', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 10, measurement_date: '2025-03-01' },
            { id: 9, measurement_date: '2025-02-01' }
        ]);

        const result = await anthropometricService.getHistory(5, 'tenant-1', {
            startDate: '2025-01-01',
            endDate: '2025-03-31',
            limit: 20
        });

        expect(result).toHaveLength(2);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[0]).toContain('measurement_date >=');
        expect(call[0]).toContain('measurement_date <=');
        expect(call[1]).toContain('tenant-1');
        expect(call[1]).toContain('2025-01-01');
        expect(call[1]).toContain('2025-03-31');
    });

    test('uses default limit of 50 when not specified', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await anthropometricService.getHistory(5, 'tenant-1');

        const call = mockQuery.mock.calls[0];
        expect(call[1]).toEqual([5, 'tenant-1', 50]);
    });
});

// =============================================
// deleteAnthropometric
// =============================================
describe('AnthropometricService.deleteAnthropometric', () => {
    test('deletes with tenant scoping and returns true', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await anthropometricService.deleteAnthropometric(10, 'tenant-1');

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM anthropometric_data');
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1']);
    });

    test('returns false when record not found', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await anthropometricService.deleteAnthropometric(999, 'tenant-1');

        expect(result).toBe(false);
    });
});

// =============================================
// Static body fat calculation methods
// =============================================
describe('AnthropometricService static body fat calculations', () => {
    test('calculateBodyFatJP3Male returns reasonable body fat percentage', () => {
        // Chest=10mm, Abdominal=20mm, Quadriceps=15mm, Age=30
        const bf = AnthropometricService.calculateBodyFatJP3Male(10, 20, 15, 30);

        expect(typeof bf).toBe('number');
        expect(bf).toBeGreaterThan(3);
        expect(bf).toBeLessThan(40);
    });

    test('calculateBodyFatJP3Female returns reasonable body fat percentage', () => {
        // Triceps=15mm, Suprailiac=12mm, Quadriceps=20mm, Age=28
        const bf = AnthropometricService.calculateBodyFatJP3Female(15, 12, 20, 28);

        expect(typeof bf).toBe('number');
        expect(bf).toBeGreaterThan(5);
        expect(bf).toBeLessThan(45);
    });

    test('calculateBodyFatDW handles male and female with age ranges', () => {
        // Biceps=8, Triceps=12, Subscapular=14, Suprailiac=10, Age=35, male
        const bfMale = AnthropometricService.calculateBodyFatDW(8, 12, 14, 10, 35, 'male');
        expect(typeof bfMale).toBe('number');
        expect(bfMale).toBeGreaterThan(3);
        expect(bfMale).toBeLessThan(50);

        // Same measurements, female
        const bfFemale = AnthropometricService.calculateBodyFatDW(8, 12, 14, 10, 35, 'female');
        expect(typeof bfFemale).toBe('number');
        expect(bfFemale).toBeGreaterThan(3);
    });
});

// =============================================
// saveSkinfold
// =============================================
describe('AnthropometricService.saveSkinfold', () => {
    test('saves skinfold and calculates body fat using JP3 male', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 20 });

        const result = await anthropometricService.saveSkinfold(5, 'tenant-1', {
            measurementDate: '2025-03-01',
            chestMm: 10,
            abdominalMm: 20,
            quadricepsMm: 15,
            calculationMethod: 'jackson_pollock_3',
            gender: 'male',
            age: 30
        });

        expect(result.id).toBe(20);
        expect(result.bodyFatPercentage).not.toBeNull();
        expect(result.calculationMethod).toBe('jackson_pollock_3');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('INSERT INTO skinfold_measurements');
        expect(call[0]).toContain('tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });

    test('clamps body fat to 3-60 range', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 21 });

        const result = await anthropometricService.saveSkinfold(5, 'tenant-1', {
            chestMm: 1,
            abdominalMm: 1,
            quadricepsMm: 1,
            calculationMethod: 'jackson_pollock_3',
            gender: 'male',
            age: 20
        });

        // Very low skinfolds => BF should be clamped to at least 3
        expect(result.bodyFatPercentage).toBeGreaterThanOrEqual(3);
    });

    test('saves with null body fat when required measurements are missing', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 22 });

        const result = await anthropometricService.saveSkinfold(5, 'tenant-1', {
            calculationMethod: 'jackson_pollock_3',
            gender: 'male',
            age: 30
            // No skinfold measurements provided
        });

        expect(result.bodyFatPercentage).toBeNull();
    });
});

// =============================================
// getSkinfoldHistory / getLatestSkinfold
// =============================================
describe('AnthropometricService.getSkinfoldHistory', () => {
    test('returns skinfold history with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, body_fat_percentage: 15.2, measurement_date: '2025-03-01' },
            { id: 2, body_fat_percentage: 14.8, measurement_date: '2025-02-01' }
        ]);

        const result = await anthropometricService.getSkinfoldHistory(5, 'tenant-1');

        expect(result).toHaveLength(2);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([5, 'tenant-1', 50]);
    });
});

describe('AnthropometricService.getLatestSkinfold', () => {
    test('returns latest skinfold measurement', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 20, body_fat_percentage: 14.5, measurement_date: '2025-03-01' }
        ]);

        const result = await anthropometricService.getLatestSkinfold(5, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.body_fat_percentage).toBe(14.5);
    });

    test('returns null when no measurements exist', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await anthropometricService.getLatestSkinfold(5, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// saveCircumference
// =============================================
describe('AnthropometricService.saveCircumference', () => {
    test('calculates waist-hip ratio and saves circumference data', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 30 });

        const result = await anthropometricService.saveCircumference(5, 'tenant-1', {
            measurementDate: '2025-03-01',
            waistCm: 80,
            hipsCm: 100,
            bicepsCm: 35,
            chestCm: 100
        });

        expect(result.id).toBe(30);
        expect(result.waistHipRatio).toBe(0.80);

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('INSERT INTO circumference_measurements');
        expect(call[0]).toContain('tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });

    test('waistHipRatio is null when waist or hips not provided', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 31 });

        const result = await anthropometricService.saveCircumference(5, 'tenant-1', {
            bicepsCm: 35
        });

        expect(result.waistHipRatio).toBeNull();
    });
});

// =============================================
// deleteSkinfold / deleteCircumference / deleteBia
// =============================================
describe('AnthropometricService delete methods', () => {
    test('deleteSkinfold with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await anthropometricService.deleteSkinfold(20, 'tenant-1');

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM skinfold_measurements');
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([20, 'tenant-1']);
    });

    test('deleteCircumference with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await anthropometricService.deleteCircumference(30, 'tenant-1');

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM circumference_measurements');
        expect(call[0]).toContain('tenant_id');
    });

    test('deleteBia with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await anthropometricService.deleteBia(40, 'tenant-1');

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM bia_measurements');
        expect(call[0]).toContain('tenant_id');
    });
});

// =============================================
// saveBia
// =============================================
describe('AnthropometricService.saveBia', () => {
    test('saves BIA measurement with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 40 });

        const result = await anthropometricService.saveBia(5, 'tenant-1', {
            measurementDate: '2025-03-01',
            leanMassKg: 65,
            leanMassPct: 76.5,
            fatMassKg: 20,
            fatMassPct: 23.5,
            totalBodyWaterL: 45,
            muscleMassKg: 55,
            basalMetabolicRate: 1800,
            visceralFatLevel: 8,
            boneMassKg: 3.2,
            deviceModel: 'InBody 270'
        });

        expect(result.id).toBe(40);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('INSERT INTO bia_measurements');
        expect(call[0]).toContain('tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });
});

// =============================================
// getBodyCompositionOverview
// =============================================
describe('AnthropometricService.getBodyCompositionOverview', () => {
    test('returns all latest measurement types in one call', async () => {
        // The method calls 4 internal methods via Promise.all, each doing one query
        mockQuery
            .mockResolvedValueOnce([{ id: 1, weight_kg: 85 }])           // getLatest
            .mockResolvedValueOnce([{ id: 2, body_fat_percentage: 15 }]) // getLatestSkinfold
            .mockResolvedValueOnce([{ id: 3, waist_cm: 80 }])            // getLatestCircumference
            .mockResolvedValueOnce([{ id: 4, lean_mass_kg: 65 }]);       // getLatestBia

        const result = await anthropometricService.getBodyCompositionOverview(5, 'tenant-1');

        expect(result.anthropometric).not.toBeNull();
        expect(result.skinfold).not.toBeNull();
        expect(result.circumference).not.toBeNull();
        expect(result.bia).not.toBeNull();

        // All 4 queries must include tenant_id
        for (let i = 0; i < 4; i++) {
            expect(mockQuery.mock.calls[i][0]).toContain('tenant_id');
            expect(mockQuery.mock.calls[i][1]).toContain('tenant-1');
        }
    });
});

// =============================================
// getAvailableDates
// =============================================
describe('AnthropometricService.getAvailableDates', () => {
    test('returns all available measurement dates across types', async () => {
        mockQuery.mockResolvedValueOnce([
            { measurement_date: '2025-03-01', type: 'anthropometric' },
            { measurement_date: '2025-03-01', type: 'skinfold' },
            { measurement_date: '2025-02-15', type: 'circumference' }
        ]);

        const result = await anthropometricService.getAvailableDates(5, 'tenant-1');

        expect(result).toHaveLength(3);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        // The UNION query passes tenant_id 4 times (once per table)
        expect(call[1]).toEqual([5, 'tenant-1', 5, 'tenant-1', 5, 'tenant-1', 5, 'tenant-1']);
    });
});

// =============================================
// getBodyFatTrend
// =============================================
describe('AnthropometricService.getBodyFatTrend', () => {
    test('returns body fat trend data sorted ascending', async () => {
        mockQuery.mockResolvedValueOnce([
            { measurement_date: '2025-01-01', body_fat_percentage: 18.0, sum_total_mm: 80 },
            { measurement_date: '2025-02-01', body_fat_percentage: 16.5, sum_total_mm: 72 },
            { measurement_date: '2025-03-01', body_fat_percentage: 15.0, sum_total_mm: 65 }
        ]);

        const result = await anthropometricService.getBodyFatTrend(5, 'tenant-1');

        expect(result).toHaveLength(3);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[0]).toContain('ORDER BY measurement_date ASC');
        expect(call[1]).toEqual([5, 'tenant-1', 20]); // default limit 20
    });
});
