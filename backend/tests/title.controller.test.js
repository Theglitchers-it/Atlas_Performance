/**
 * Tests for Title Controller
 * getTitles, getTitleById, getDisplayedTitle, setDisplayedTitle,
 * getManageableTitles, createTitle, updateTitle, deleteTitle
 */

// Mock dependencies
jest.mock('../src/services/title.service', () => ({
    getTitles: jest.fn(),
    getTitleById: jest.fn(),
    getDisplayedTitle: jest.fn(),
    setDisplayedTitle: jest.fn(),
    getManageableTitles: jest.fn(),
    createTitle: jest.fn(),
    updateTitle: jest.fn(),
    deleteTitle: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const titleController = require('../src/controllers/title.controller');
const titleService = require('../src/services/title.service');

// Test helpers
const mockReq = (overrides = {}) => ({
    user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
    params: {},
    query: {},
    body: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('TitleController', () => {
    describe('getTitles', () => {
        test('returns titles for a client-role user', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const titles = [{ id: 1, title_name: 'Squat Master' }];
            titleService.getTitles.mockResolvedValue(titles);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                query: { category: 'strength', exerciseId: '5', unlockedOnly: 'true' }
            });
            const res = mockRes();

            await titleController.getTitles(req, res, mockNext);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM clients'),
                [1, 'tenant-1']
            );
            expect(titleService.getTitles).toHaveBeenCalledWith('tenant-1', 7, {
                category: 'strength',
                exerciseId: 5,
                unlockedOnly: true
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { titles } });
        });

        test('returns titles with null clientId for trainer without clientId query', async () => {
            const titles = [{ id: 1, title_name: 'Beginner' }];
            titleService.getTitles.mockResolvedValue(titles);

            const req = mockReq({ query: {} });
            const res = mockRes();

            await titleController.getTitles(req, res, mockNext);

            expect(titleService.getTitles).toHaveBeenCalledWith('tenant-1', null, {
                category: undefined,
                exerciseId: null,
                unlockedOnly: false
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { titles } });
        });

        test('passes clientId from query for trainer role', async () => {
            titleService.getTitles.mockResolvedValue([]);

            const req = mockReq({ query: { clientId: '12' } });
            const res = mockRes();

            await titleController.getTitles(req, res, mockNext);

            expect(titleService.getTitles).toHaveBeenCalledWith('tenant-1', 12, expect.any(Object));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            titleService.getTitles.mockRejectedValue(error);

            const req = mockReq({ query: { clientId: '5' } });
            const res = mockRes();

            await titleController.getTitles(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getTitleById', () => {
        test('returns a single title', async () => {
            const title = { id: 5, title_name: 'Deadlift King', unlocked: true };
            titleService.getTitleById.mockResolvedValue(title);

            const req = mockReq({ params: { id: '5' }, query: { clientId: '3' } });
            const res = mockRes();

            await titleController.getTitleById(req, res, mockNext);

            expect(titleService.getTitleById).toHaveBeenCalledWith('5', 3);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { title } });
        });

        test('returns 404 when title not found', async () => {
            titleService.getTitleById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' }, query: { clientId: '3' } });
            const res = mockRes();

            await titleController.getTitleById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Titolo non trovato' });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            titleService.getTitleById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, query: { clientId: '3' } });
            const res = mockRes();

            await titleController.getTitleById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getDisplayedTitle', () => {
        test('returns the displayed title for a client', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const title = { id: 2, title_name: 'Iron Will' };
            titleService.getDisplayedTitle.mockResolvedValue(title);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' }
            });
            const res = mockRes();

            await titleController.getDisplayedTitle(req, res, mockNext);

            expect(titleService.getDisplayedTitle).toHaveBeenCalledWith('tenant-1', 7);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { title } });
        });

        test('returns 400 when clientId cannot be resolved', async () => {
            const req = mockReq({ query: {} });
            const res = mockRes();

            await titleController.getDisplayedTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Client ID richiesto' });
        });
    });

    describe('setDisplayedTitle', () => {
        test('sets the displayed title for a client', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            titleService.setDisplayedTitle.mockResolvedValue();

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                body: { titleId: 5 }
            });
            const res = mockRes();

            await titleController.setDisplayedTitle(req, res, mockNext);

            expect(titleService.setDisplayedTitle).toHaveBeenCalledWith('tenant-1', 7, 5);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'Titolo aggiornato' } });
        });

        test('returns 400 when clientId cannot be resolved', async () => {
            const req = mockReq({ body: { titleId: 5 } });
            const res = mockRes();

            await titleController.setDisplayedTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Client ID richiesto' });
            expect(titleService.setDisplayedTitle).not.toHaveBeenCalled();
        });

        test('calls next(error) on service failure', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const error = new Error('Update failed');
            titleService.setDisplayedTitle.mockRejectedValue(error);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                body: { titleId: 5 }
            });
            const res = mockRes();

            await titleController.setDisplayedTitle(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // === TITLE MANAGEMENT (Trainer CRUD) ===

    describe('getManageableTitles', () => {
        test('returns all manageable titles for the tenant', async () => {
            const titles = [{ id: 1, title_name: 'Title A' }, { id: 2, title_name: 'Title B' }];
            titleService.getManageableTitles.mockResolvedValue(titles);

            const req = mockReq();
            const res = mockRes();

            await titleController.getManageableTitles(req, res, mockNext);

            expect(titleService.getManageableTitles).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { titles } });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            titleService.getManageableTitles.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await titleController.getManageableTitles(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createTitle', () => {
        test('returns 201 with created title', async () => {
            const title = { id: 10, title_name: 'New Title', threshold_value: 100 };
            titleService.createTitle.mockResolvedValue(title);

            const req = mockReq({
                body: {
                    title_name: 'New Title',
                    title_description: 'A new achievement',
                    exercise_name: 'Squat',
                    category: 'strength',
                    metric_type: 'max_weight',
                    threshold_value: 100,
                    rarity: 'rare'
                }
            });
            const res = mockRes();

            await titleController.createTitle(req, res, mockNext);

            expect(titleService.createTitle).toHaveBeenCalledWith('tenant-1', {
                title_name: 'New Title',
                title_description: 'A new achievement',
                exercise_name: 'Squat',
                category: 'strength',
                metric_type: 'max_weight',
                threshold_value: 100,
                rarity: 'rare'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { title } });
        });

        test('returns 400 when title_name is missing', async () => {
            const req = mockReq({ body: { threshold_value: 50 } });
            const res = mockRes();

            await titleController.createTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Nome titolo e soglia sono obbligatori'
            });
            expect(titleService.createTitle).not.toHaveBeenCalled();
        });

        test('returns 400 when threshold_value is missing', async () => {
            const req = mockReq({ body: { title_name: 'Test Title' } });
            const res = mockRes();

            await titleController.createTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(titleService.createTitle).not.toHaveBeenCalled();
        });

        test('allows threshold_value of 0', async () => {
            titleService.createTitle.mockResolvedValue({ id: 11, title_name: 'Zero Title', threshold_value: 0 });

            const req = mockReq({ body: { title_name: 'Zero Title', threshold_value: 0 } });
            const res = mockRes();

            await titleController.createTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(titleService.createTitle).toHaveBeenCalled();
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Creation failed');
            titleService.createTitle.mockRejectedValue(error);

            const req = mockReq({ body: { title_name: 'Fail', threshold_value: 10 } });
            const res = mockRes();

            await titleController.createTitle(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateTitle', () => {
        test('returns updated title', async () => {
            const title = { id: 5, title_name: 'Updated Title' };
            titleService.updateTitle.mockResolvedValue(title);

            const req = mockReq({ params: { id: '5' }, body: { title_name: 'Updated Title' } });
            const res = mockRes();

            await titleController.updateTitle(req, res, mockNext);

            expect(titleService.updateTitle).toHaveBeenCalledWith('tenant-1', 5, { title_name: 'Updated Title' });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { title } });
        });

        test('returns 404 when title not found', async () => {
            titleService.updateTitle.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' }, body: { title_name: 'Ghost' } });
            const res = mockRes();

            await titleController.updateTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Titolo non trovato' });
        });
    });

    describe('deleteTitle', () => {
        test('returns success on deletion', async () => {
            titleService.deleteTitle.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await titleController.deleteTitle(req, res, mockNext);

            expect(titleService.deleteTitle).toHaveBeenCalledWith('tenant-1', 5);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'Titolo eliminato' } });
        });

        test('returns 404 when title not found', async () => {
            titleService.deleteTitle.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await titleController.deleteTitle(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Titolo non trovato' });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Delete failed');
            titleService.deleteTitle.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await titleController.deleteTitle(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
