/**
 * Community Service
 * Gestione post, commenti, like, visibility per-trainer, moderazione, regole.
 */

const { query, transaction } = require('../config/database');

const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'off_topic', 'other'];

class CommunityService {

    /**
     * Feed post con filtro visibility:
     * - visibility_type='global' → tutti i membri del tenant lo vedono
     * - visibility_type='my_clients' → solo i clienti seguiti dal creator_trainer (via client_trainers)
     * - visibility_type='specific_clients' → solo gli user listati in post_visibility
     * - il creator_trainer vede sempre i propri post
     * - gym_admin/super_admin vedono tutto del proprio tenant (override implicito)
     */
    async getPosts(tenantId, options = {}) {
        const { postType, userId, isAdmin = false, creatorTrainerId, from, sortBy = 'recent', authorId } = options;
        // Clamp limit (1-100) e page (>=1) per evitare DoS via row-count amplification e OFFSET negativi
        const lim = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
        const page = Math.max(parseInt(options.page, 10) || 1, 1);
        const offset = (page - 1) * lim;

        const baseSelect = `
            SELECT cp.*,
                   u.first_name as author_first_name, u.last_name as author_last_name, u.role as author_role, u.avatar_url as author_avatar_url,
                   ct.first_name as creator_trainer_first_name, ct.last_name as creator_trainer_last_name
                   ${userId ? ', (SELECT COUNT(*) FROM community_likes cl WHERE cl.post_id = cp.id AND cl.user_id = ?) as user_liked' : ''}
                   ${userId ? ', (SELECT COUNT(*) FROM community_saves cs WHERE cs.post_id = cp.id AND cs.user_id = ?) as user_saved' : ''}
            FROM community_posts cp
            LEFT JOIN users u ON cp.author_id = u.id
            LEFT JOIN users ct ON cp.creator_trainer_id = ct.id
        `;

        const where = ['cp.tenant_id = ?', 'cp.is_active = TRUE'];
        const params = [];
        if (userId) {
            params.push(userId); // per user_liked subquery
            params.push(userId); // per user_saved subquery
        }
        params.push(tenantId);

        if (postType) {
            where.push('cp.post_type = ?');
            params.push(postType);
        }

        if (creatorTrainerId) {
            where.push('cp.creator_trainer_id = ?');
            params.push(parseInt(creatorTrainerId, 10));
        }

        if (authorId) {
            where.push('cp.author_id = ?');
            params.push(parseInt(authorId, 10));
        }

        if (from) {
            const d = new Date(from);
            if (!isNaN(d.getTime())) {
                where.push('cp.created_at >= ?');
                params.push(d.toISOString().slice(0, 19).replace('T', ' '));
            }
        }

        // Visibility filter (skip per admin)
        if (!isAdmin && userId) {
            where.push(`(
                cp.visibility_type = 'global'
                OR cp.creator_trainer_id = ?
                OR (cp.visibility_type = 'my_clients' AND EXISTS (
                    SELECT 1 FROM client_trainers ct2
                    INNER JOIN clients c ON c.id = ct2.client_id
                    WHERE ct2.user_id = cp.creator_trainer_id
                      AND c.user_id = ?
                      AND ct2.ended_at IS NULL
                ))
                OR (cp.visibility_type = 'specific_clients' AND EXISTS (
                    SELECT 1 FROM post_visibility pv WHERE pv.post_id = cp.id AND pv.user_id = ?
                ))
            )`);
            params.push(userId, userId, userId);
        }

        const whereSql = 'WHERE ' + where.join(' AND ');

        const countParams = params.slice(userId ? 2 : 0); // rimuove i 2 userId iniziali (user_liked + user_saved subquery)
        const [countResult] = await query(
            `SELECT COUNT(*) as total FROM community_posts cp ${whereSql}`,
            countParams
        );

        const orderBy = sortBy === 'trending'
            ? 'cp.is_pinned DESC, (cp.likes_count + cp.comments_count) DESC, cp.created_at DESC'
            : 'cp.is_pinned DESC, cp.created_at DESC';

        params.push(lim, offset);
        const posts = await query(
            `${baseSelect} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            params
        );

        return {
            posts,
            pagination: { page: parseInt(page), limit: lim, total: countResult.total, totalPages: Math.ceil(countResult.total / lim) }
        };
    }

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
            WHERE cp.id = ? AND cp.tenant_id = ? AND cp.is_active = TRUE
        `;
        params.push(postId, tenantId);

        const rows = await query(sql, params);
        if (rows.length === 0) return null;

        const post = rows[0];
        post.comments = await query(
            `SELECT cc.*, u.first_name as author_first_name, u.last_name as author_last_name, u.role as author_role
             FROM community_comments cc
             LEFT JOIN users u ON cc.author_id = u.id
             WHERE cc.post_id = ? AND cc.tenant_id = ?
             ORDER BY cc.created_at ASC`,
            [postId, tenantId]
        );
        return post;
    }

    /**
     * Crea post. Se l'autore è trainer/gym_admin, auto-imposta creator_trainer_id=authorId.
     * specificClientUserIds è array di user_id (clients) se visibility_type='specific_clients'.
     */
    async createPost(tenantId, authorId, data, authorRoles = []) {
        const visibility = ['global', 'my_clients', 'specific_clients'].includes(data.visibilityType)
            ? data.visibilityType : 'global';
        const isStaff = authorRoles.some(r => ['trainer', 'gym_admin', 'nutritionist'].includes(r));
        const creatorTrainerId = isStaff ? authorId : null;

        return transaction(async (conn) => {
            const [result] = await conn.execute(
                `INSERT INTO community_posts
                 (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenantId, authorId, creatorTrainerId, data.content,
                    data.postType || 'announcement',
                    data.attachments ? JSON.stringify(data.attachments) : null,
                    visibility
                ]
            );

            if (visibility === 'specific_clients' && Array.isArray(data.specificClientUserIds)) {
                for (const uid of data.specificClientUserIds) {
                    await conn.execute(
                        'INSERT IGNORE INTO post_visibility (post_id, user_id) VALUES (?, ?)',
                        [result.insertId, parseInt(uid, 10)]
                    );
                }
            }
            return result.insertId;
        });
    }

    async updatePost(postId, tenantId, authorId, data) {
        const sql = `
            UPDATE community_posts SET
                content = COALESCE(?, content),
                post_type = COALESCE(?, post_type),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ? AND author_id = ?
        `;
        const result = await query(sql, [data.content || null, data.postType || null, postId, tenantId, authorId]);
        return result.affectedRows > 0;
    }

    async deletePost(postId, tenantId, userId, isModerator = false) {
        // super_admin (tenantId=null): può eliminare qualsiasi post di qualsiasi tenant
        // trainer/staff/gym_admin (isModerator): eliminano qualsiasi post del proprio tenant
        // altri (client): solo i propri post nel proprio tenant
        let result;
        if (isModerator && (tenantId === null || tenantId === undefined)) {
            // super_admin path
            result = await query(
                'DELETE FROM community_posts WHERE id = ?',
                [postId]
            );
        } else if (isModerator) {
            result = await query(
                'DELETE FROM community_posts WHERE id = ? AND tenant_id = ?',
                [postId, tenantId]
            );
        } else {
            result = await query(
                'DELETE FROM community_posts WHERE id = ? AND tenant_id = ? AND author_id = ?',
                [postId, tenantId, userId]
            );
        }
        return result.affectedRows > 0;
    }

    async togglePin(postId, tenantId) {
        await query('UPDATE community_posts SET is_pinned = NOT is_pinned WHERE id = ? AND tenant_id = ?', [postId, tenantId]);
    }

    async likePost(postId, tenantId, userId) {
        try {
            await query('INSERT INTO community_likes (tenant_id, post_id, user_id) VALUES (?, ?, ?)', [tenantId, postId, userId]);
            await query('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ? AND tenant_id = ?', [postId, tenantId]);
            return true;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return false;
            throw err;
        }
    }

    async unlikePost(postId, tenantId, userId) {
        const result = await query('DELETE FROM community_likes WHERE post_id = ? AND user_id = ? AND tenant_id = ?', [postId, userId, tenantId]);
        if (result.affectedRows > 0) {
            await query('UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ? AND tenant_id = ?', [postId, tenantId]);
        }
        return result.affectedRows > 0;
    }

    async savePost(postId, tenantId, userId) {
        // Verifica che il post esista nel tenant (sicurezza)
        const post = await query(
            'SELECT 1 FROM community_posts WHERE id = ? AND tenant_id = ? AND is_active = TRUE',
            [postId, tenantId]
        );
        if (post.length === 0) return { ok: false, status: 404 };
        await query(
            'INSERT IGNORE INTO community_saves (tenant_id, post_id, user_id) VALUES (?, ?, ?)',
            [tenantId, postId, userId]
        );
        return { ok: true };
    }

    async unsavePost(postId, tenantId, userId) {
        await query(
            'DELETE FROM community_saves WHERE post_id = ? AND user_id = ? AND tenant_id = ?',
            [postId, userId, tenantId]
        );
        return { ok: true };
    }

    async addComment(postId, tenantId, authorId, data) {
        const sql = `INSERT INTO community_comments (tenant_id, post_id, author_id, content, parent_id) VALUES (?, ?, ?, ?, ?)`;
        const result = await query(sql, [tenantId, postId, authorId, data.content, data.parentId || null]);
        await query('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ? AND tenant_id = ?', [postId, tenantId]);
        return result.insertId;
    }

    async deleteComment(commentId, tenantId, authorId) {
        const [comment] = await query('SELECT post_id FROM community_comments WHERE id = ? AND tenant_id = ?', [commentId, tenantId]);
        if (!comment) return false;

        const result = await query('DELETE FROM community_comments WHERE id = ? AND author_id = ? AND tenant_id = ?', [commentId, authorId, tenantId]);
        if (result.affectedRows > 0) {
            await query('UPDATE community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ? AND tenant_id = ?', [comment.post_id, tenantId]);
        }
        return result.affectedRows > 0;
    }

    // ============================================================
    // MODERAZIONE
    // ============================================================

    async reportPost({ tenantId, postId, reporterId, reason, details }) {
        if (!REPORT_REASONS.includes(reason)) {
            throw { status: 400, message: `Reason non valido. Permessi: ${REPORT_REASONS.join(', ')}` };
        }
        // Verifica che il post appartenga al tenant
        const [post] = await query('SELECT id FROM community_posts WHERE id = ? AND tenant_id = ?', [postId, tenantId]);
        if (!post) throw { status: 404, message: 'Post non trovato' };

        const result = await query(
            `INSERT INTO post_reports (tenant_id, post_id, reporter_id, reason, details)
             VALUES (?, ?, ?, ?, ?)`,
            [tenantId, postId, reporterId, reason, details || null]
        );
        return { id: result.insertId, success: true };
    }

    async listReports(tenantId, { status = 'pending', limit = 50, offset = 0 } = {}) {
        return query(
            `SELECT pr.*, cp.content as post_content, cp.author_id as post_author_id,
                    u.first_name as reporter_first_name, u.last_name as reporter_last_name,
                    mu.first_name as moderator_first_name, mu.last_name as moderator_last_name
             FROM post_reports pr
             INNER JOIN community_posts cp ON cp.id = pr.post_id
             INNER JOIN users u ON u.id = pr.reporter_id
             LEFT JOIN users mu ON mu.id = pr.moderated_by
             WHERE pr.tenant_id = ? AND pr.status = ?
             ORDER BY pr.created_at DESC
             LIMIT ? OFFSET ?`,
            [tenantId, status, parseInt(limit), parseInt(offset)]
        );
    }

    async moderatePost({ tenantId, reportId, action, moderatorId }) {
        if (!['dismiss', 'remove'].includes(action)) {
            throw { status: 400, message: 'action deve essere "dismiss" o "remove"' };
        }
        return transaction(async (conn) => {
            const [reports] = await conn.execute(
                'SELECT post_id, status FROM post_reports WHERE id = ? AND tenant_id = ? FOR UPDATE',
                [reportId, tenantId]
            );
            if (reports.length === 0) throw { status: 404, message: 'Report non trovato' };
            if (reports[0].status !== 'pending') throw { status: 409, message: 'Report già moderato' };

            const newStatus = action === 'remove' ? 'removed' : 'dismissed';
            await conn.execute(
                'UPDATE post_reports SET status = ?, moderated_by = ?, moderated_at = NOW() WHERE id = ?',
                [newStatus, moderatorId, reportId]
            );

            if (action === 'remove') {
                await conn.execute(
                    'UPDATE community_posts SET is_active = FALSE WHERE id = ? AND tenant_id = ?',
                    [reports[0].post_id, tenantId]
                );
            }
            return { success: true, action };
        });
    }

    // ============================================================
    // RULES
    // ============================================================

    async listRules(tenantId, { onlyActive = true } = {}) {
        const sql = `SELECT id, title, description, sort_order, active, created_at
                     FROM community_rules
                     WHERE tenant_id = ? ${onlyActive ? 'AND active = TRUE' : ''}
                     ORDER BY sort_order, id`;
        return query(sql, [tenantId]);
    }

    async createRule({ tenantId, title, description, sortOrder = 0, createdBy }) {
        if (!title || title.length < 2) throw { status: 400, message: 'title richiesto' };
        const result = await query(
            `INSERT INTO community_rules (tenant_id, title, description, sort_order, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [tenantId, title, description || null, sortOrder, createdBy]
        );
        return { id: result.insertId, success: true };
    }

    async updateRule({ tenantId, ruleId, title, description, sortOrder, active }) {
        const sets = [];
        const params = [];
        if (title !== undefined) { sets.push('title = ?'); params.push(title); }
        if (description !== undefined) { sets.push('description = ?'); params.push(description); }
        if (sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(sortOrder); }
        if (active !== undefined) { sets.push('active = ?'); params.push(!!active); }
        if (sets.length === 0) return { success: true };

        params.push(ruleId, tenantId);
        const result = await query(
            `UPDATE community_rules SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`,
            params
        );
        if (result.affectedRows === 0) throw { status: 404, message: 'Regola non trovata' };
        return { success: true };
    }

    async deleteRule({ tenantId, ruleId }) {
        const result = await query('DELETE FROM community_rules WHERE id = ? AND tenant_id = ?', [ruleId, tenantId]);
        if (result.affectedRows === 0) throw { status: 404, message: 'Regola non trovata' };
        return { success: true };
    }
}

module.exports = new CommunityService();
module.exports.REPORT_REASONS = REPORT_REASONS;
