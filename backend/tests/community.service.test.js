/**
 * Tests for CommunityService
 * Posts, comments, likes
 */

const mockQuery = jest.fn();
const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (cb) => cb({ execute: mockExecute }));
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (...args) => mockTransaction(...args)
}));

const communityService = require('../src/services/community.service');

beforeEach(() => {
    mockQuery.mockReset();
    mockExecute.mockReset();
    mockTransaction.mockClear();
});

describe('CommunityService.getPosts', () => {
    test('returns paginated posts', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 5 }])
            .mockResolvedValueOnce([
                { id: 1, content: 'First post!', likes_count: 3 },
                { id: 2, content: 'Workout done!', likes_count: 10 }
            ]);

        const result = await communityService.getPosts('tenant-1');
        expect(result.posts).toHaveLength(2);

        // Pagination metadata must be present and consistent with mock data
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBe(5);
        expect(result.pagination.page).toBe(1);

        // Both queries (count + data) must scope to the correct tenant
        const allParams = mockQuery.mock.calls.flatMap(([, params]) => params);
        expect(allParams).toContain('tenant-1');

        // The count query must include tenant_id in its WHERE clause
        const countSql = mockQuery.mock.calls[0][0];
        expect(countSql).toMatch(/tenant_id\s*=\s*\?/i);
    });

    test('filters by post type', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await communityService.getPosts('tenant-1', { postType: 'achievement' });
        expect(mockQuery.mock.calls[0][0]).toContain('post_type = ?');
    });
});

describe('CommunityService.createPost', () => {
    test('creates new post', async () => {
        mockExecute.mockResolvedValueOnce([{ insertId: 15 }]);

        const result = await communityService.createPost('tenant-1', 1, {
            content: 'Just finished my workout!',
            postType: 'general'
        }, []);

        expect(result).toBe(15);
        expect(mockTransaction).toHaveBeenCalled();
    });
});

describe('CommunityService.likePost', () => {
    test('likes a post', async () => {
        mockQuery
            .mockResolvedValueOnce({}) // INSERT like
            .mockResolvedValueOnce([]); // UPDATE count

        await communityService.likePost(1, 5);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO community_likes'),
            expect.arrayContaining([1, 5])
        );
    });
});

describe('CommunityService.unlikePost', () => {
    test('unlikes a post', async () => {
        mockQuery
            .mockResolvedValueOnce({}) // DELETE like
            .mockResolvedValueOnce([]); // UPDATE count

        await communityService.unlikePost(1, 5);
        expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM community_likes');
    });
});

describe('CommunityService.addComment', () => {
    test('adds comment to post', async () => {
        mockQuery
            .mockResolvedValueOnce({ insertId: 20 }) // INSERT comment
            .mockResolvedValueOnce([]); // UPDATE comment count

        const result = await communityService.addComment(1, 'tenant-1', 5, {
            content: 'Great job!'
        });

        expect(result).toBe(20);
    });
});

describe('CommunityService.deletePost', () => {
    test('moderator deletes any post in tenant', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const ok = await communityService.deletePost(1, 'tenant-1', 99, true);

        expect(ok).toBe(true);
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toContain('DELETE');
        // Moderator path: WHERE id AND tenant_id (no author_id check)
        expect(sql).not.toMatch(/author_id/i);
    });

    test('non-moderator can delete only own posts (author_id in WHERE)', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const ok = await communityService.deletePost(1, 'tenant-1', 5, false);

        expect(ok).toBe(true);
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toMatch(/author_id\s*=\s*\?/i);
        const params = mockQuery.mock.calls[0][1];
        expect(params).toContain(5);
    });

    test('super_admin (tenantId=null) deletes by post id only', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const ok = await communityService.deletePost(42, null, 2, true);

        expect(ok).toBe(true);
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).not.toMatch(/tenant_id/i);
        expect(sql).not.toMatch(/author_id/i);
    });

    test('returns false when no row matched (unauthorized or not found)', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });
        const ok = await communityService.deletePost(1, 'tenant-1', 5, false);
        expect(ok).toBe(false);
    });
});

describe('CommunityService.savePost / unsavePost', () => {
    test('save returns ok=true and inserts row', async () => {
        mockQuery
            .mockResolvedValueOnce([{ exist: 1 }]) // post exists check
            .mockResolvedValueOnce({}); // INSERT IGNORE

        const result = await communityService.savePost(5, 'tenant-1', 1);

        expect(result.ok).toBe(true);
        const insertSql = mockQuery.mock.calls[1][0];
        expect(insertSql).toMatch(/INSERT\s+IGNORE\s+INTO\s+community_saves/i);
    });

    test('save returns 404 when post not in tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // post does not exist

        const result = await communityService.savePost(5, 'tenant-other', 1);

        expect(result.ok).toBe(false);
        expect(result.status).toBe(404);
    });

    test('unsave deletes by post+user+tenant', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await communityService.unsavePost(5, 'tenant-1', 1);

        expect(result.ok).toBe(true);
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toMatch(/DELETE\s+FROM\s+community_saves/i);
        expect(sql).toMatch(/tenant_id\s*=\s*\?/i);
        expect(sql).toMatch(/user_id\s*=\s*\?/i);
    });
});

describe('CommunityService.getPosts — security clamps', () => {
    test('clamps limit > 100 to 100', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        const result = await communityService.getPosts('tenant-1', { limit: '99999999' });
        expect(result.pagination.limit).toBe(100);
    });

    test('clamps page < 1 to 1', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        const result = await communityService.getPosts('tenant-1', { page: '-5' });
        expect(result.pagination.page).toBe(1);
    });

    test('clamps non-numeric limit to default 20', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        const result = await communityService.getPosts('tenant-1', { limit: 'abc' });
        expect(result.pagination.limit).toBe(20);
    });
});

describe('CommunityService.togglePin', () => {
    test('toggles pin state', async () => {
        mockQuery.mockResolvedValueOnce([]);
        await communityService.togglePin(1, 'tenant-1');

        // Must issue exactly one UPDATE scoped to the correct post and tenant
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE community_posts/i),
            expect.arrayContaining([1, 'tenant-1'])
        );

        // The SQL must flip the boolean pin column rather than hard-coding a value
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toMatch(/is_pinned/i);
    });
});
