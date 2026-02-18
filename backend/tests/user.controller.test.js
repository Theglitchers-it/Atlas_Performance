/**
 * Tests for User Controller
 * getAll, getById, create, update, delete, updateAvatar, getBusinessInfo, updateBusinessInfo
 */

// Mock dependencies
jest.mock('../src/services/user.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateAvatar: jest.fn(),
    getBusinessInfo: jest.fn(),
    updateBusinessInfo: jest.fn()
}));

jest.mock('../src/middlewares/upload', () => ({
    getFileUrl: jest.fn((path) => `https://cdn.example.com/${path}`)
}));

const userController = require('../src/controllers/user.controller');
const userService = require('../src/services/user.service');

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

describe('UserController', () => {
    describe('getAll', () => {
        test('returns paginated list of users', async () => {
            const result = {
                users: [{ id: 1, email: 'user@test.com' }],
                total: 1,
                page: 1,
                limit: 20
            };
            userService.getAll.mockResolvedValue(result);

            const req = mockReq({ query: { page: '1', limit: '20', role: 'staff' } });
            const res = mockRes();

            await userController.getAll(req, res, mockNext);

            expect(userService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 1,
                limit: 20,
                role: 'staff'
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes search and status filters', async () => {
            userService.getAll.mockResolvedValue({ users: [], total: 0 });

            const req = mockReq({
                query: { search: 'mario', status: 'active' }
            });
            const res = mockRes();

            await userController.getAll(req, res, mockNext);

            expect(userService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                search: 'mario',
                status: 'active'
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            userService.getAll.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await userController.getAll(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single user', async () => {
            const user = { id: 5, email: 'user5@test.com', role: 'staff' };
            userService.getById.mockResolvedValue(user);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await userController.getById(req, res, mockNext);

            expect(userService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { user }
            });
        });

        test('calls next(error) when user not found', async () => {
            const error = new Error('User not found');
            userService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await userController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        test('returns 201 with created user', async () => {
            const newUser = { id: 10, email: 'new@test.com', role: 'staff' };
            userService.create.mockResolvedValue(newUser);

            const req = mockReq({
                body: { email: 'new@test.com', firstName: 'New', lastName: 'User', role: 'staff' }
            });
            const res = mockRes();

            await userController.create(req, res, mockNext);

            expect(userService.create).toHaveBeenCalledWith('tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Utente creato con successo',
                data: { user: newUser }
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Email already in use');
            userService.create.mockRejectedValue(error);

            const req = mockReq({ body: { email: 'dup@test.com' } });
            const res = mockRes();

            await userController.create(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        test('returns updated user data', async () => {
            const updatedUser = { id: 5, email: 'updated@test.com', firstName: 'Updated' };
            userService.update.mockResolvedValue(updatedUser);

            const req = mockReq({
                params: { id: '5' },
                body: { firstName: 'Updated' }
            });
            const res = mockRes();

            await userController.update(req, res, mockNext);

            expect(userService.update).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Utente aggiornato con successo',
                data: { user: updatedUser }
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Not found');
            userService.update.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: {} });
            const res = mockRes();

            await userController.update(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('delete', () => {
        test('returns success message on deletion', async () => {
            userService.delete.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await userController.delete(req, res, mockNext);

            expect(userService.delete).toHaveBeenCalledWith(5, 'tenant-1', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Utente eliminato con successo'
            });
        });

        test('passes current user id to prevent self-deletion', async () => {
            userService.delete.mockResolvedValue();

            const req = mockReq({
                params: { id: '5' },
                user: { id: 99, tenantId: 'tenant-1', role: 'tenant_owner' }
            });
            const res = mockRes();

            await userController.delete(req, res, mockNext);

            // Third argument is the current user's id (to prevent self-deletion)
            expect(userService.delete).toHaveBeenCalledWith(5, 'tenant-1', 99);
        });

        test('calls next(error) when deletion fails', async () => {
            const error = new Error('Cannot delete self');
            userService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '1' } });
            const res = mockRes();

            await userController.delete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getBusinessInfo', () => {
        test('returns business info for tenant_owner', async () => {
            const info = { businessName: 'FitGym', vat: '12345' };
            userService.getBusinessInfo.mockResolvedValue(info);

            const req = mockReq({ user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' } });
            const res = mockRes();

            await userController.getBusinessInfo(req, res, mockNext);

            expect(userService.getBusinessInfo).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: info
            });
        });

        test('returns business info for super_admin', async () => {
            const info = { businessName: 'FitGym' };
            userService.getBusinessInfo.mockResolvedValue(info);

            const req = mockReq({ user: { id: 1, tenantId: 'tenant-1', role: 'super_admin' } });
            const res = mockRes();

            await userController.getBusinessInfo(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: info
            });
        });

        test('returns 403 for non-owner roles', async () => {
            const req = mockReq({ user: { id: 1, tenantId: 'tenant-1', role: 'staff' } });
            const res = mockRes();

            await userController.getBusinessInfo(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Accesso negato'
            });
            expect(userService.getBusinessInfo).not.toHaveBeenCalled();
        });

        test('returns 403 for client role', async () => {
            const req = mockReq({ user: { id: 1, tenantId: 'tenant-1', role: 'client' } });
            const res = mockRes();

            await userController.getBusinessInfo(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('updateBusinessInfo', () => {
        test('updates business info for tenant_owner', async () => {
            const updatedInfo = { businessName: 'New Gym' };
            userService.updateBusinessInfo.mockResolvedValue(updatedInfo);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
                body: { businessName: 'New Gym' }
            });
            const res = mockRes();

            await userController.updateBusinessInfo(req, res, mockNext);

            expect(userService.updateBusinessInfo).toHaveBeenCalledWith('tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Info business aggiornate',
                data: updatedInfo
            });
        });

        test('returns 403 for non-owner roles', async () => {
            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'staff' },
                body: { businessName: 'Hack' }
            });
            const res = mockRes();

            await userController.updateBusinessInfo(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(userService.updateBusinessInfo).not.toHaveBeenCalled();
        });
    });

    describe('uploadMyAvatar', () => {
        test('returns 400 when no file uploaded', async () => {
            const req = mockReq(); // no req.file
            const res = mockRes();

            await userController.uploadMyAvatar(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Nessun file caricato'
            });
        });

        test('updates avatar when file is provided', async () => {
            const updatedUser = { id: 1, avatarUrl: 'https://cdn.example.com/uploads/avatar.jpg' };
            userService.updateAvatar.mockResolvedValue(updatedUser);

            const req = mockReq({
                file: { path: 'uploads/avatar.jpg' }
            });
            const res = mockRes();

            await userController.uploadMyAvatar(req, res, mockNext);

            expect(userService.updateAvatar).toHaveBeenCalledWith(
                1,
                'tenant-1',
                'https://cdn.example.com/uploads/avatar.jpg'
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Avatar aggiornato'
            }));
        });
    });
});
