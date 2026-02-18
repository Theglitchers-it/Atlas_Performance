/**
 * Tests for PhotoAnalysisService
 * analyzePhoto, comparePhotos, generatePhotoReport, _parseAIResponse, _analyzeTrend
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const mockAnalyzeImage = jest.fn();
jest.mock('../src/config/openai', () => ({
    analyzeImage: (...args) => mockAnalyzeImage(...args)
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

const photoAnalysisService = require('../src/services/photoAnalysis.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// analyzePhoto
// =============================================
describe('PhotoAnalysisService.analyzePhoto', () => {
    test('analyzes photo with tenant_id scoping and returns structured result', async () => {
        const mockClient = {
            id: 5,
            first_name: 'Mario',
            last_name: 'Rossi',
            gender: 'M',
            height_cm: 180,
            current_weight_kg: 85,
            primary_goal: 'Ipertrofia'
        };

        const aiJsonResponse = JSON.stringify({
            bodyFatEstimate: '15-18%',
            muscleDevelopment: 'Buono sviluppo pettorali e deltoidi',
            posture: 'Leggera anteriorizzazione spalle',
            overallAssessment: 'Buoni progressi complessivi',
            recommendations: 'Focus su dorsali per bilanciamento',
            comparisonNotes: null
        });

        mockQuery
            .mockResolvedValueOnce([mockClient])     // Client lookup
            .mockResolvedValueOnce([])                 // Previous photos
            .mockResolvedValueOnce({ insertId: 42 }); // Save photo analysis

        mockAnalyzeImage.mockResolvedValue(aiJsonResponse);

        const result = await photoAnalysisService.analyzePhoto(
            'https://storage.example.com/photo.jpg',
            5,
            'tenant-1',
            { angle: 'front', notes: 'Post allenamento' }
        );

        expect(result.photoId).toBe(42);
        expect(result.analysis.bodyFatEstimate).toBe('15-18%');
        expect(result.analysis.muscleDevelopment).toContain('pettorali');
        expect(result.rawResponse).toBe(aiJsonResponse);

        // Verify tenant_id scoping in client lookup
        const clientQuery = mockQuery.mock.calls[0];
        expect(clientQuery[0]).toContain('tenant_id = ?');
        expect(clientQuery[1]).toContain('tenant-1');

        // Verify previous photos query is tenant-scoped
        const photosQuery = mockQuery.mock.calls[1];
        expect(photosQuery[0]).toContain('tenant_id = ?');
        expect(photosQuery[1]).toContain('tenant-1');
    });

    test('throws 404 when client is not found', async () => {
        mockQuery.mockResolvedValueOnce([undefined]); // No client

        await expect(
            photoAnalysisService.analyzePhoto('https://photo.jpg', 999, 'tenant-1')
        ).rejects.toEqual(
            expect.objectContaining({ status: 404, message: 'Cliente non trovato' })
        );
    });

    test('handles non-JSON AI response gracefully', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 5, first_name: 'Mario', last_name: 'Rossi' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce({ insertId: 43 });

        mockAnalyzeImage.mockResolvedValue('Questa e una risposta senza JSON');

        const result = await photoAnalysisService.analyzePhoto(
            'https://photo.jpg', 5, 'tenant-1'
        );

        expect(result.analysis.bodyFatEstimate).toBe('Non determinabile');
        expect(result.analysis.overallAssessment).toContain('risposta senza JSON');
    });
});

// =============================================
// comparePhotos
// =============================================
describe('PhotoAnalysisService.comparePhotos', () => {
    test('compares two photos with tenant_id scoping', async () => {
        const photos = [
            {
                id: 1, photo_url: 'https://old.jpg', captured_at: '2025-01-01',
                angle: 'front', ai_body_fat_estimate: '20%', ai_muscle_notes: 'Base', ai_overall_assessment: 'Start'
            },
            {
                id: 2, photo_url: 'https://new.jpg', captured_at: '2025-03-01',
                angle: 'front', ai_body_fat_estimate: '16%', ai_muscle_notes: 'Migliorato', ai_overall_assessment: 'Progress'
            }
        ];

        const comparisonJson = JSON.stringify({
            visibleChanges: 'Riduzione grasso addominale',
            bodyCompositionChange: 'Miglioramento ricomposizione',
            muscleGrowth: 'Aumento massa magra',
            fatLoss: 'Visibile riduzione grasso',
            progressRating: '8',
            recommendations: 'Continuare programma attuale'
        });

        mockQuery
            .mockResolvedValueOnce(photos)  // Fetch both photos
            .mockResolvedValue({});          // Save comparison

        mockAnalyzeImage.mockResolvedValue(comparisonJson);

        const result = await photoAnalysisService.comparePhotos(1, 2, 5, 'tenant-1');

        expect(result.daysBetween).toBeGreaterThan(0);
        expect(result.comparison.progressRating).toBe('8');
        expect(result.comparison.visibleChanges).toContain('grasso addominale');

        // Verify tenant_id scoping
        const photoQuery = mockQuery.mock.calls[0];
        expect(photoQuery[0]).toContain('tenant_id = ?');
        expect(photoQuery[1]).toContain('tenant-1');
    });

    test('throws 404 when photos are not found', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 1 }]); // Only 1 photo found instead of 2

        await expect(
            photoAnalysisService.comparePhotos(1, 999, 5, 'tenant-1')
        ).rejects.toEqual(
            expect.objectContaining({ status: 404, message: expect.stringContaining('non trovate') })
        );
    });
});

// =============================================
// _parseAIResponse (internal helper)
// =============================================
describe('PhotoAnalysisService._parseAIResponse', () => {
    test('parses valid JSON from AI response', () => {
        const response = 'Ecco la mia analisi: {"bodyFatEstimate":"12%","muscleDevelopment":"Ottimo","posture":"Corretta","overallAssessment":"Eccellente","recommendations":"Mantieni","comparisonNotes":"Migliorato"}';

        const result = photoAnalysisService._parseAIResponse(response);

        expect(result.bodyFatEstimate).toBe('12%');
        expect(result.muscleDevelopment).toBe('Ottimo');
    });

    test('returns fallback values when no JSON found', () => {
        const result = photoAnalysisService._parseAIResponse('Risposta senza JSON');

        expect(result.bodyFatEstimate).toBe('Non determinabile');
        expect(result.overallAssessment).toBe('Risposta senza JSON');
    });
});

// =============================================
// _analyzeTrend (internal helper)
// =============================================
describe('PhotoAnalysisService._analyzeTrend', () => {
    test('returns insufficient_data when less than 2 photos', () => {
        const result = photoAnalysisService._analyzeTrend([{ ai_body_fat_estimate: '15%' }]);

        expect(result.direction).toBe('insufficient_data');
        expect(result.confidence).toBe('low');
    });

    test('detects improving trend when body fat decreases', () => {
        const photos = [
            { ai_body_fat_estimate: '20-22%' },
            { ai_body_fat_estimate: '16-18%' }
        ];

        const result = photoAnalysisService._analyzeTrend(photos);

        expect(result.direction).toBe('improving');
        expect(result.bodyFatChange).toBeLessThan(0);
    });

    test('detects stable trend when body fat is unchanged', () => {
        const photos = [
            { ai_body_fat_estimate: '15-16%' },
            { ai_body_fat_estimate: '15-16%' }
        ];

        const result = photoAnalysisService._analyzeTrend(photos);

        expect(result.direction).toBe('stable');
    });
});
