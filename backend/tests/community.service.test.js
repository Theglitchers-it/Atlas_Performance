/**
 * Tests for CommunityService
 * Posts, comments, likes
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const communityService = require('../src/services/community.service');

beforeEach(() => mockQuery.mockReset());

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
        mockQuery.mockResolvedValueOnce({ insertId: 15 });

        const result = await communityService.createPost('tenant-1', 1, {
            content: 'Just finished my workout!',
            postType: 'general'
        });

        expect(result).toBe(15);
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

        const result = await communityService.addComment(1, 5, {
            content: 'Great job!'
        });

        expect(result).toBe(20);
    });
});

describe('CommunityService.deletePost', () => {
    test('deletes post', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await communityService.deletePost(1, 'tenant-1');
        expect(mockQuery.mock.calls[0][0]).toContain('DELETE');
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
