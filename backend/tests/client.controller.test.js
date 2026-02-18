/**
 * Tests for Client Controller
 * getAll, getById, create, update, delete, getMyProfile, addGoal, getStats
 */

// Mock dependencies
jest.mock('../src/services/client.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addGoal: jest.fn(),
    addInjury: jest.fn(),
    getStats: jest.fn(),
    addXP: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const clientController = require('../src/controllers/client.controller');
const clientService = require('../src/services/client.service');

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

describe('ClientController', () => {
    describe('getAll', () => {
        test('returns paginated list of clients', async () => {
            const result = {
                clients: [{ id: 1, name: 'Mario' }],
                total: 1,
                page: 1,
                limit: 20
            };
            clientService.getAll.mockResolvedValue(result);

            const req = mockReq({ query: { page: '1', limit: '20' } });
            const res = mockRes();

            await clientController.getAll(req, res, mockNext);

            expect(clientService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 1,
                limit: 20
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes filter options to service', async () => {
            clientService.getAll.mockResolvedValue({ clients: [], total: 0 });

            const req = mockReq({
                query: { status: 'active', search: 'Mario', assignedTo: '5', fitnessLevel: 'beginner' }
            });
            const res = mockRes();

            await clientController.getAll(req, res, mockNext);

            expect(clientService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                status: 'active',
                search: 'Mario',
                assignedTo: 5,
                fitnessLevel: 'beginner'
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            clientService.getAll.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await clientController.getAll(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single client', async () => {
            const client = { id: 5, name: 'Luigi', email: 'luigi@test.com' };
            clientService.getById.mockResolvedValue(client);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await clientController.getById(req, res, mockNext);

            expect(clientService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { client }
            });
        });

        test('calls next(error) when client not found', async () => {
            const error = new Error('Client not found');
            clientService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await clientController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        test('returns 201 with created client', async () => {
            clientService.create.mockResolvedValue({ clientId: 10 });
            const createdClient = { id: 10, name: 'New Client' };
            clientService.getById.mockResolvedValue(createdClient);

            const req = mockReq({
                body: { firstName: 'New', lastName: 'Client', email: 'new@test.com' }
            });
            const res = mockRes();

            await clientController.create(req, res, mockNext);

            expect(clientService.create).toHaveBeenCalledWith('tenant-1', req.body, 1);
            expect(clientService.getById).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Cliente creato con successo',
                data: { client: createdClient }
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            clientService.create.mockRejectedValue(error);

            const req = mockReq({ body: { firstName: '' } });
            const res = mockRes();

            await clientController.create(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        test('returns updated client data', async () => {
            const updatedClient = { id: 5, name: 'Updated Name' };
            clientService.update.mockResolvedValue(updatedClient);

            const req = mockReq({
                params: { id: '5' },
                body: { firstName: 'Updated', lastName: 'Name' }
            });
            const res = mockRes();

            await clientController.update(req, res, mockNext);

            expect(clientService.update).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Cliente aggiornato con successo',
                data: { client: updatedClient }
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Not found');
            clientService.update.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: {} });
            const res = mockRes();

            await clientController.update(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('delete', () => {
        test('returns success message on deletion', async () => {
            clientService.delete.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await clientController.delete(req, res, mockNext);

            expect(clientService.delete).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Cliente eliminato con successo'
            });
        });

        test('calls next(error) when deletion fails', async () => {
            const error = new Error('Cannot delete');
            clientService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await clientController.delete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getMyProfile', () => {
        test('returns client profile for logged-in user', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const clientData = { id: 7, name: 'My Profile' };
            clientService.getById.mockResolvedValue(clientData);

            const req = mockReq();
            const res = mockRes();

            await clientController.getMyProfile(req, res, mockNext);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM clients'),
                [1, 'tenant-1']
            );
            expect(clientService.getById).toHaveBeenCalledWith(7, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { client: clientData }
            });
        });

        test('returns 404 when no client profile found', async () => {
            mockQuery.mockResolvedValue([]);

            const req = mockReq();
            const res = mockRes();

            await clientController.getMyProfile(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Profilo cliente non trovato'
            });
        });
    });

    describe('getStats', () => {
        test('returns client statistics', async () => {
            const stats = { totalWorkouts: 10, streak: 5 };
            clientService.getStats.mockResolvedValue(stats);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await clientController.getStats(req, res, mockNext);

            expect(clientService.getStats).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { stats }
            });
        });
    });
});
