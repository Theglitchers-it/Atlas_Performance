/**
 * Tests for Community Controller
 * getPosts, getPostById, createPost, updatePost, deletePost,
 * togglePin, likePost, unlikePost, addComment, deleteComment
 */

// Mock dependencies
jest.mock('../src/services/community.service', () => ({
    getPosts: jest.fn(),
    getPostById: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    togglePin: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    addComment: jest.fn(),
    deleteComment: jest.fn()
}));

jest.mock('../src/middlewares/upload', () => ({
    getFileUrl: jest.fn((path) => `https://cdn.example.com/${path}`)
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const communityController = require('../src/controllers/community.controller');
const communityService = require('../src/services/community.service');

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

describe('CommunityController', () => {
    describe('getPosts', () => {
        test('returns paginated posts', async () => {
            const result = { posts: [{ id: 1, content: 'Hello community' }], total: 1 };
            communityService.getPosts.mockResolvedValue(result);

            const req = mockReq({ query: { postType: 'discussion', limit: '10', page: '1' } });
            const res = mockRes();

            await communityController.getPosts(req, res, mockNext);

            expect(communityService.getPosts).toHaveBeenCalledWith('tenant-1', {
                postType: 'discussion',
                limit: '10',
                page: '1',
                userId: 1
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            communityService.getPosts.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await communityController.getPosts(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getPostById', () => {
        test('returns a single post', async () => {
            const post = { id: 5, content: 'Test post', author: 'Mario' };
            communityService.getPostById.mockResolvedValue(post);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.getPostById(req, res, mockNext);

            expect(communityService.getPostById).toHaveBeenCalledWith('5', 'tenant-1', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { post }
            });
        });

        test('returns 404 when post not found', async () => {
            communityService.getPostById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await communityController.getPostById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Post non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Service error');
            communityService.getPostById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.getPostById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createPost', () => {
        test('returns 201 with created post id', async () => {
            communityService.createPost.mockResolvedValue(10);

            const req = mockReq({ body: { content: 'New post content', postType: 'discussion' } });
            const res = mockRes();

            await communityController.createPost(req, res, mockNext);

            expect(communityService.createPost).toHaveBeenCalledWith('tenant-1', 1, {
                content: 'New post content',
                postType: 'discussion',
                attachments: null
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { id: 10 }
            });
        });

        test('returns 400 when content is missing', async () => {
            const req = mockReq({ body: {} });
            const res = mockRes();

            await communityController.createPost(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Contenuto richiesto'
            });
        });

        test('handles file upload attachment', async () => {
            communityService.createPost.mockResolvedValue(11);

            const req = mockReq({
                body: { content: 'Post with image' },
                file: { path: 'uploads/image.jpg', originalname: 'photo.jpg' }
            });
            const res = mockRes();

            await communityController.createPost(req, res, mockNext);

            expect(communityService.createPost).toHaveBeenCalledWith('tenant-1', 1, {
                content: 'Post with image',
                postType: undefined,
                attachments: expect.any(String)
            });

            // Verify the attachments JSON structure
            const callArgs = communityService.createPost.mock.calls[0][2];
            const attachments = JSON.parse(callArgs.attachments);
            expect(attachments).toEqual([{
                type: 'image',
                url: expect.stringContaining('uploads/image.jpg'),
                originalName: 'photo.jpg'
            }]);
        });

        test('calls next(error) on creation failure', async () => {
            const error = new Error('Insert failed');
            communityService.createPost.mockRejectedValue(error);

            const req = mockReq({ body: { content: 'Valid content' } });
            const res = mockRes();

            await communityController.createPost(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updatePost', () => {
        test('returns success on update', async () => {
            communityService.updatePost.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' }, body: { content: 'Updated content' } });
            const res = mockRes();

            await communityController.updatePost(req, res, mockNext);

            expect(communityService.updatePost).toHaveBeenCalledWith('5', 'tenant-1', 1, { content: 'Updated content' });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Post aggiornato'
            });
        });

        test('returns 404 when post not found or not authorized', async () => {
            communityService.updatePost.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' }, body: { content: 'Updated' } });
            const res = mockRes();

            await communityController.updatePost(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Post non trovato o non autorizzato'
            });
        });
    });

    describe('deletePost', () => {
        test('returns success on deletion', async () => {
            communityService.deletePost.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.deletePost(req, res, mockNext);

            expect(communityService.deletePost).toHaveBeenCalledWith('5', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Post eliminato'
            });
        });

        test('calls next(error) on deletion failure', async () => {
            const error = new Error('Delete failed');
            communityService.deletePost.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.deletePost(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('togglePin', () => {
        test('toggles pin status on a post', async () => {
            communityService.togglePin.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.togglePin(req, res, mockNext);

            expect(communityService.togglePin).toHaveBeenCalledWith('5', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Pin aggiornato'
            });
        });
    });

    describe('likePost', () => {
        test('adds like to a post', async () => {
            communityService.likePost.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.likePost(req, res, mockNext);

            expect(communityService.likePost).toHaveBeenCalledWith('5', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Like aggiunto'
            });
        });

        test('calls next(error) on like failure', async () => {
            const error = new Error('Like failed');
            communityService.likePost.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.likePost(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('unlikePost', () => {
        test('removes like from a post', async () => {
            communityService.unlikePost.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await communityController.unlikePost(req, res, mockNext);

            expect(communityService.unlikePost).toHaveBeenCalledWith('5', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Like rimosso'
            });
        });
    });

    describe('addComment', () => {
        test('returns 201 with created comment id', async () => {
            communityService.addComment.mockResolvedValue(20);

            const req = mockReq({
                params: { id: '5' },
                body: { content: 'Great post!', parentId: null }
            });
            const res = mockRes();

            await communityController.addComment(req, res, mockNext);

            expect(communityService.addComment).toHaveBeenCalledWith('5', 1, {
                content: 'Great post!',
                parentId: null
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { id: 20 }
            });
        });

        test('returns 400 when comment content is missing', async () => {
            const req = mockReq({ params: { id: '5' }, body: {} });
            const res = mockRes();

            await communityController.addComment(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Contenuto richiesto'
            });
        });
    });

    describe('deleteComment', () => {
        test('returns success on comment deletion', async () => {
            communityService.deleteComment.mockResolvedValue(true);

            const req = mockReq({ params: { commentId: '20' } });
            const res = mockRes();

            await communityController.deleteComment(req, res, mockNext);

            expect(communityService.deleteComment).toHaveBeenCalledWith('20', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Commento eliminato'
            });
        });

        test('returns 404 when comment not found', async () => {
            communityService.deleteComment.mockResolvedValue(false);

            const req = mockReq({ params: { commentId: '999' } });
            const res = mockRes();

            await communityController.deleteComment(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Commento non trovato'
            });
        });
    });
});
