/**
 * Community Service
 * Gestione post, commenti e like della community
 */

const { query } = require('../config/database');

class CommunityService {
    /**
     * Ottieni feed post con paginazione
     */
    async getPosts(tenantId, options = {}) {
        const { postType, limit = 20, page = 1, userId } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT cp.*,
                   u.first_name as author_first_name, u.last_name as author_last_name, u.role as author_role
        `;

        if (userId) {
            sql += `, (SELECT COUNT(*) FROM community_likes cl WHERE cl.post_id = cp.id AND cl.user_id = ?) as user_liked`;
        }

        sql += `
            FROM community_posts cp
            LEFT JOIN users u ON cp.author_id = u.id
            WHERE cp.tenant_id = ?
        `;

        const params = userId ? [userId, tenantId] : [tenantId];

        if (postType) {
            sql += ' AND cp.post_type = ?';
            params.push(postType);
        }

        // Count
        const countSql = `SELECT COUNT(*) as total FROM community_posts cp WHERE cp.tenant_id = ?` +
            (postType ? ' AND cp.post_type = ?' : '');
        const countParams = postType ? [tenantId, postType] : [tenantId];
        const [countResult] = await query(countSql, countParams);
        const total = countResult.total;

        sql += ' ORDER BY cp.is_pinned DESC, cp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const posts = await query(sql, params);

        return {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottieni singolo post con commenti
     */
    async getPostById(postId, tenantId, userId = null) {
        let sql = `
            SELECT cp.*,
                   u.first_name as author_first_name, u.last_name as author_last_name, u.role as author_role
        `;
        const params = [];

        if (userId) {
            sql += `, (SELECT COUNT(*) FROM community_likes cl WHERE cl.post_id = cp.id AND cl.user_id = ?) as user_liked`;
            params.push(userId);
        }

        sql += `
            FROM community_posts cp
            LEFT JOIN users u ON cp.author_id = u.id
            WHERE cp.id = ? AND cp.tenant_id = ?
        `;
        params.push(postId, tenantId);

        const rows = await query(sql, params);
        if (rows.length === 0) return null;

        const post = rows[0];

        // Carica commenti
        post.comments = await query(
            `SELECT cc.*, u.first_name as author_first_name, u.last_name as author_last_name, u.role as author_role
             FROM community_comments cc
             LEFT JOIN users u ON cc.author_id = u.id
             WHERE cc.post_id = ?
             ORDER BY cc.created_at ASC`,
            [postId]
        );

        return post;
    }

    /**
     * Crea post
     */
    async createPost(tenantId, authorId, data) {
        const sql = `
            INSERT INTO community_posts (tenant_id, author_id, content, post_type, attachments)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await query(sql, [
            tenantId,
            authorId,
            data.content,
            data.postType || 'announcement',
            data.attachments ? JSON.stringify(data.attachments) : null
        ]);
        return result.insertId;
    }

    /**
     * Aggiorna post
     */
    async updatePost(postId, tenantId, authorId, data) {
        const sql = `
            UPDATE community_posts SET
                content = COALESCE(?, content),
                post_type = COALESCE(?, post_type),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ? AND author_id = ?
        `;
        const result = await query(sql, [
            data.content || null,
            data.postType || null,
            postId, tenantId, authorId
        ]);
        return result.affectedRows > 0;
    }

    /**
     * Elimina post
     */
    async deletePost(postId, tenantId) {
        await query('DELETE FROM community_posts WHERE id = ? AND tenant_id = ?', [postId, tenantId]);
    }

    /**
     * Pin/Unpin post
     */
    async togglePin(postId, tenantId) {
        await query(
            'UPDATE community_posts SET is_pinned = NOT is_pinned WHERE id = ? AND tenant_id = ?',
            [postId, tenantId]
        );
    }

    /**
     * Like post
     */
    async likePost(postId, userId) {
        try {
            await query('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
            await query('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
            return true;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return false;
            throw err;
        }
    }

    /**
     * Unlike post
     */
    async unlikePost(postId, userId) {
        const result = await query('DELETE FROM community_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
        if (result.affectedRows > 0) {
            await query('UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [postId]);
        }
        return result.affectedRows > 0;
    }

    /**
     * Aggiungi commento
     */
    async addComment(postId, authorId, data) {
        const sql = `INSERT INTO community_comments (post_id, author_id, content, parent_id) VALUES (?, ?, ?, ?)`;
        const result = await query(sql, [postId, authorId, data.content, data.parentId || null]);
        await query('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);
        return result.insertId;
    }

    /**
     * Elimina commento
     */
    async deleteComment(commentId, authorId) {
        const [comment] = await query('SELECT post_id FROM community_comments WHERE id = ?', [commentId]);
        if (!comment) return false;

        const result = await query('DELETE FROM community_comments WHERE id = ? AND author_id = ?', [commentId, authorId]);
        if (result.affectedRows > 0) {
            await query('UPDATE community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?', [comment.post_id]);
        }
        return result.affectedRows > 0;
    }
}

module.exports = new CommunityService();
