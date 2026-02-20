/**
 * Tests for AlertService
 * Smart Training Alerts: low_readiness, volume_plateau, recovery_low,
 * overtraining_risk, fatigue_accumulation, deload_suggested,
 * createAlert, getAlerts, dismissAlert, dismissAllForClient
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const alertService = require('../src/services/alert.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// checkLowReadiness
// =============================================
describe('AlertService.checkLowReadiness', () => {
    test('creates alert when avg readiness < 50 for 3 days', async () => {
        // Query 1: daily_checkins for readiness
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 30, checkin_date: '2026-02-17' },
            { readiness_score: 40, checkin_date: '2026-02-16' },
            { readiness_score: 35, checkin_date: '2026-02-15' }
        ]);
        // Query 2: check for duplicate alert (createAlert)
        mockQuery.mockResolvedValueOnce([]);
        // Query 3: INSERT alert
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await alertService.checkLowReadiness(1, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('low_readiness');
        expect(result.severity).toBe('medium');

        // Verify tenant_id in readiness query
        const readinessCall = mockQuery.mock.calls[0];
        expect(readinessCall[0]).toContain('tenant_id = ?');
        expect(readinessCall[1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when readiness is above threshold', async () => {
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 80, checkin_date: '2026-02-17' },
            { readiness_score: 75, checkin_date: '2026-02-16' },
            { readiness_score: 85, checkin_date: '2026-02-15' }
        ]);

        const result = await alertService.checkLowReadiness(1, 'tenant-1');

        expect(result).toBeNull();
    });

    test('returns null when fewer than 3 checkins available', async () => {
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 20, checkin_date: '2026-02-17' },
            { readiness_score: 25, checkin_date: '2026-02-16' }
        ]);

        const result = await alertService.checkLowReadiness(1, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// checkVolumePlateau
// =============================================
describe('AlertService.checkVolumePlateau', () => {
    test('creates alert when volume is stagnant for 3+ weeks', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                muscle_group_id: 1,
                name: 'Chest',
                name_it: 'Petto',
                volume_trend: '1000,1000,1000',
                weeks_count: 3
            }
        ]);
        // createAlert: duplicate check
        mockQuery.mockResolvedValueOnce([]);
        // createAlert: INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 2 });

        const result = await alertService.checkVolumePlateau(1, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('volume_plateau');
        expect(result.severity).toBe('low');

        // Verify tenant_id scoping
        expect(mockQuery.mock.calls[0][0]).toContain('wva.tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when volume varies significantly', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                muscle_group_id: 1,
                name: 'Chest',
                name_it: 'Petto',
                volume_trend: '500,1000,1500',
                weeks_count: 3
            }
        ]);

        const result = await alertService.checkVolumePlateau(1, 'tenant-1');

        expect(result).toBeNull();
    });

    test('returns null when no plateau data exists', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await alertService.checkVolumePlateau(1, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// checkRecoveryLow
// =============================================
describe('AlertService.checkRecoveryLow', () => {
    test('creates alert when high soreness and low sleep quality', async () => {
        mockQuery.mockResolvedValueOnce([
            { soreness_level: 8, sleep_quality: 3, sleep_hours: 5, checkin_date: '2026-02-17' },
            { soreness_level: 9, sleep_quality: 4, sleep_hours: 5.5, checkin_date: '2026-02-16' },
            { soreness_level: 8, sleep_quality: 3, sleep_hours: 5, checkin_date: '2026-02-15' }
        ]);
        // createAlert: duplicate check
        mockQuery.mockResolvedValueOnce([]);
        // createAlert: INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 3 });

        const result = await alertService.checkRecoveryLow(1, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('recovery_low');
        expect(result.severity).toBe('medium');

        // Verify tenant_id
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when recovery metrics are acceptable', async () => {
        mockQuery.mockResolvedValueOnce([
            { soreness_level: 3, sleep_quality: 8, sleep_hours: 8, checkin_date: '2026-02-17' },
            { soreness_level: 4, sleep_quality: 7, sleep_hours: 7.5, checkin_date: '2026-02-16' }
        ]);

        const result = await alertService.checkRecoveryLow(1, 'tenant-1');

        expect(result).toBeNull();
    });

    test('returns null when fewer than 2 checkins', async () => {
        mockQuery.mockResolvedValueOnce([
            { soreness_level: 9, sleep_quality: 2, sleep_hours: 4, checkin_date: '2026-02-17' }
        ]);

        const result = await alertService.checkRecoveryLow(1, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// checkOvertrainingRisk
// =============================================
describe('AlertService.checkOvertrainingRisk', () => {
    test('creates critical alert when overtraining risk detected', async () => {
        // Session count (4+ sessions in 7 days)
        mockQuery.mockResolvedValueOnce([{ cnt: 5 }]);
        // Checkins with low readiness and high soreness
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 30, soreness_level: 9 },
            { readiness_score: 35, soreness_level: 8 },
            { readiness_score: 40, soreness_level: 8 },
            { readiness_score: 38, soreness_level: 9 },
            { readiness_score: 32, soreness_level: 8 }
        ]);
        // createAlert: duplicate check
        mockQuery.mockResolvedValueOnce([]);
        // createAlert: INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 4 });

        const result = await alertService.checkOvertrainingRisk(1, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('overtraining_risk');
        expect(result.severity).toBe('high');

        // Verify tenant_id in session count query
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);

        // Verify tenant_id in checkins query
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when sessions are few', async () => {
        mockQuery.mockResolvedValueOnce([{ cnt: 2 }]); // Only 2 sessions
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 30, soreness_level: 9 },
            { readiness_score: 35, soreness_level: 8 },
            { readiness_score: 40, soreness_level: 8 }
        ]);

        const result = await alertService.checkOvertrainingRisk(1, 'tenant-1');

        expect(result).toBeNull();
    });

    test('returns null when readiness is acceptable despite many sessions', async () => {
        mockQuery.mockResolvedValueOnce([{ cnt: 6 }]);
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 70, soreness_level: 4 },
            { readiness_score: 75, soreness_level: 3 },
            { readiness_score: 80, soreness_level: 3 }
        ]);

        const result = await alertService.checkOvertrainingRisk(1, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// checkFatigueAccumulation
// =============================================
describe('AlertService.checkFatigueAccumulation', () => {
    test('creates alert when readiness declining for 4+ consecutive days', async () => {
        // Returned DESC from DB, service reverses to chronological
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 30, checkin_date: '2026-02-18' },
            { readiness_score: 40, checkin_date: '2026-02-17' },
            { readiness_score: 50, checkin_date: '2026-02-16' },
            { readiness_score: 60, checkin_date: '2026-02-15' },
            { readiness_score: 70, checkin_date: '2026-02-14' }
        ]);
        // createAlert: duplicate check
        mockQuery.mockResolvedValueOnce([]);
        // createAlert: INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 5 });

        const result = await alertService.checkFatigueAccumulation(1, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('fatigue_accumulation');
        expect(result.severity).toBe('medium');

        // Verify tenant_id
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when readiness is stable or improving', async () => {
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 80, checkin_date: '2026-02-18' },
            { readiness_score: 75, checkin_date: '2026-02-17' },
            { readiness_score: 70, checkin_date: '2026-02-16' },
            { readiness_score: 80, checkin_date: '2026-02-15' },
            { readiness_score: 75, checkin_date: '2026-02-14' }
        ]);

        const result = await alertService.checkFatigueAccumulation(1, 'tenant-1');

        expect(result).toBeNull();
    });

    test('returns null when fewer than 5 checkins', async () => {
        mockQuery.mockResolvedValueOnce([
            { readiness_score: 20, checkin_date: '2026-02-18' },
            { readiness_score: 30, checkin_date: '2026-02-17' }
        ]);

        const result = await alertService.checkFatigueAccumulation(1, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// checkDeloadSuggested
// =============================================
describe('AlertService.checkDeloadSuggested', () => {
    test('creates alert when 4+ consecutive high intensity weeks', async () => {
        mockQuery.mockResolvedValueOnce([
            { week_start: '2026-02-10', weekly_sets: 20, weekly_avg_rpe: 8.5 },
            { week_start: '2026-02-03', weekly_sets: 22, weekly_avg_rpe: 8.0 },
            { week_start: '2026-01-27', weekly_sets: 18, weekly_avg_rpe: 7.8 },
            { week_start: '2026-01-20', weekly_sets: 25, weekly_avg_rpe: 8.2 }
        ]);
        // createAlert: duplicate check
        mockQuery.mockResolvedValueOnce([]);
        // createAlert: INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 6 });

        const result = await alertService.checkDeloadSuggested(1, 'tenant-1');

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('deload_suggested');
        expect(result.severity).toBe('low');

        // Verify tenant_id
        expect(mockQuery.mock.calls[0][0]).toContain('wva.tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when fewer than 4 weeks of data', async () => {
        mockQuery.mockResolvedValueOnce([
            { week_start: '2026-02-10', weekly_sets: 20, weekly_avg_rpe: 8.5 },
            { week_start: '2026-02-03', weekly_sets: 22, weekly_avg_rpe: 8.0 }
        ]);

        const result = await alertService.checkDeloadSuggested(1, 'tenant-1');

        expect(result).toBeNull();
    });

    test('returns null when RPE is below threshold', async () => {
        mockQuery.mockResolvedValueOnce([
            { week_start: '2026-02-10', weekly_sets: 20, weekly_avg_rpe: 6.0 },
            { week_start: '2026-02-03', weekly_sets: 22, weekly_avg_rpe: 6.5 },
            { week_start: '2026-01-27', weekly_sets: 18, weekly_avg_rpe: 6.0 },
            { week_start: '2026-01-20', weekly_sets: 25, weekly_avg_rpe: 5.5 }
        ]);

        const result = await alertService.checkDeloadSuggested(1, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// createAlert (deduplication)
// =============================================
describe('AlertService.createAlert', () => {
    test('skips creation when duplicate alert exists within 24h', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 99 }]); // Duplicate found

        const result = await alertService.createAlert('tenant-1', 1, {
            alertType: 'low_readiness',
            severity: 'warning',
            title: 'Test',
            message: 'Test message',
            data: {}
        });

        expect(result).toBeNull();
        // Should NOT have called INSERT
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('creates alert when no duplicate exists', async () => {
        mockQuery
            .mockResolvedValueOnce([])  // No duplicate
            .mockResolvedValueOnce({ insertId: 10 }); // INSERT

        const result = await alertService.createAlert('tenant-1', 1, {
            alertType: 'low_readiness',
            severity: 'warning',
            title: 'Test Alert',
            message: 'Test message',
            data: { avgReadiness: 30 }
        });

        expect(result).not.toBeNull();
        expect(result.alertType).toBe('low_readiness');

        // Verify tenant_id in duplicate check
        const dupCheck = mockQuery.mock.calls[0];
        expect(dupCheck[0]).toContain('tenant_id = ?');
        expect(dupCheck[1][0]).toBe('tenant-1');

        // Verify tenant_id in INSERT
        const insertCall = mockQuery.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO training_alerts');
        expect(insertCall[1][0]).toBe('tenant-1');
    });
});

// =============================================
// getAlerts
// =============================================
describe('AlertService.getAlerts', () => {
    test('returns active alerts for a tenant', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1,
                tenant_id: 'tenant-1',
                client_id: 1,
                alert_type: 'low_readiness',
                severity: 'warning',
                title: 'Readiness basso',
                message: 'Test',
                data: '{"avgReadiness":30}',
                is_dismissed: 0,
                first_name: 'Mario',
                last_name: 'Rossi'
            }
        ]);

        const result = await alertService.getAlerts('tenant-1');

        expect(result).toHaveLength(1);
        expect(result[0].data).toEqual({ avgReadiness: 30 });
        expect(result[0].first_name).toBe('Mario');

        // Verify tenant_id in query
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('ta.tenant_id = ?'),
            expect.arrayContaining(['tenant-1'])
        );
    });

    test('filters by clientId and severity', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await alertService.getAlerts('tenant-1', { clientId: 5, severity: 'high' });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ta.client_id = ?');
        expect(call[0]).toContain('ta.severity = ?');
        expect(call[1]).toContain(5);
        expect(call[1]).toContain('high');
    });

    test('returns dismissed alerts when dismissed option is true', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await alertService.getAlerts('tenant-1', { dismissed: true });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ta.is_resolved = ?');
        expect(call[1]).toContain(1); // dismissed = true => 1
    });
});

// =============================================
// dismissAlert
// =============================================
describe('AlertService.dismissAlert', () => {
    test('dismisses an alert owned by the tenant', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await alertService.dismissAlert(1, 'tenant-1');

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            [1, 'tenant-1']
        );
    });

    test('returns false when alert not found or wrong tenant', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await alertService.dismissAlert(999, 'wrong-tenant');

        expect(result).toBe(false);
    });
});

// =============================================
// dismissAllForClient
// =============================================
describe('AlertService.dismissAllForClient', () => {
    test('dismisses all alerts for a client within tenant', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 5 });

        const result = await alertService.dismissAllForClient(1, 'tenant-1');

        expect(result).toEqual({ success: true });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('client_id = ? AND tenant_id = ?'),
            [1, 'tenant-1']
        );
    });
});

// =============================================
// runAllChecks
// =============================================
describe('AlertService.runAllChecks', () => {
    test('runs all 6 checks and collects results', async () => {
        // We spy on the individual check methods and mock their returns
        jest.spyOn(alertService, 'checkLowReadiness').mockResolvedValue({
            alertType: 'low_readiness', severity: 'medium', title: 'LR', message: 'msg', data: {}
        });
        jest.spyOn(alertService, 'checkVolumePlateau').mockResolvedValue(null);
        jest.spyOn(alertService, 'checkRecoveryLow').mockResolvedValue({
            alertType: 'recovery_low', severity: 'medium', title: 'RL', message: 'msg', data: {}
        });
        jest.spyOn(alertService, 'checkOvertrainingRisk').mockResolvedValue(null);
        jest.spyOn(alertService, 'checkFatigueAccumulation').mockResolvedValue(null);
        jest.spyOn(alertService, 'checkDeloadSuggested').mockResolvedValue(null);

        const results = await alertService.runAllChecks(1, 'tenant-1');

        expect(results).toHaveLength(2);
        expect(results[0].alertType).toBe('low_readiness');
        expect(results[1].alertType).toBe('recovery_low');

        // Verify all checks were called with correct args
        expect(alertService.checkLowReadiness).toHaveBeenCalledWith(1, 'tenant-1');
        expect(alertService.checkVolumePlateau).toHaveBeenCalledWith(1, 'tenant-1');
    });

    test('handles individual check failures gracefully', async () => {
        jest.spyOn(alertService, 'checkLowReadiness').mockRejectedValue(new Error('DB error'));
        jest.spyOn(alertService, 'checkVolumePlateau').mockResolvedValue(null);
        jest.spyOn(alertService, 'checkRecoveryLow').mockResolvedValue({
            alertType: 'recovery_low', severity: 'medium', title: 'RL', message: 'msg', data: {}
        });
        jest.spyOn(alertService, 'checkOvertrainingRisk').mockRejectedValue(new Error('DB error'));
        jest.spyOn(alertService, 'checkFatigueAccumulation').mockResolvedValue(null);
        jest.spyOn(alertService, 'checkDeloadSuggested').mockResolvedValue(null);

        const results = await alertService.runAllChecks(1, 'tenant-1');

        // Should still return the one successful alert, ignoring failures
        expect(results).toHaveLength(1);
        expect(results[0].alertType).toBe('recovery_low');
    });
});
