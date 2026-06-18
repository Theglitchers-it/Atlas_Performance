/**
 * Video Likes Service (Fase 6)
 * Like/unlike su entità "videos". Separato da community_likes per chiarezza dominio.
 */

const { query } = require('../config/database');

class VideoLikesService {

    async likeVideo({ tenantId, videoId, userId }) {
        // Verifica video appartenenza tenant
        const [video] = await query('SELECT id FROM videos WHERE id = ? AND tenant_id = ?', [videoId, tenantId]);
        if (!video) throw { status: 404, message: 'Video non trovato' };

        try {
            await query(
                'INSERT INTO video_likes (tenant_id, video_id, user_id) VALUES (?, ?, ?)',
                [tenantId, videoId, userId]
            );
            await query('UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?', [videoId]);
            return { liked: true };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return { liked: false, alreadyLiked: true };
            throw err;
        }
    }

    async unlikeVideo({ tenantId, videoId, userId }) {
        const result = await query(
            'DELETE FROM video_likes WHERE tenant_id = ? AND video_id = ? AND user_id = ?',
            [tenantId, videoId, userId]
        );
        if (result.affectedRows > 0) {
            await query('UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [videoId]);
        }
        return { unliked: result.affectedRows > 0 };
    }

    async getVideoLikes({ videoId, limit = 50, offset = 0 }) {
        const rows = await query(
            `SELECT vl.id, vl.user_id, vl.created_at,
                    u.first_name, u.last_name, u.avatar_url
             FROM video_likes vl
             INNER JOIN users u ON u.id = vl.user_id
             WHERE vl.video_id = ?
             ORDER BY vl.created_at DESC
             LIMIT ? OFFSET ?`,
            [videoId, parseInt(limit), parseInt(offset)]
        );
        const [count] = await query('SELECT COUNT(*) AS total FROM video_likes WHERE video_id = ?', [videoId]);
        return { likes: rows, total: count.total };
    }

    async hasLiked({ videoId, userId }) {
        const rows = await query('SELECT 1 FROM video_likes WHERE video_id = ? AND user_id = ?', [videoId, userId]);
        return rows.length > 0;
    }
}

module.exports = new VideoLikesService();
