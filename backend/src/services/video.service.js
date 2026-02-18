/**
 * Video Service
 * Gestione video, corsi e moduli
 */

const { query, transaction } = require('../config/database');

class VideoService {
    // =====================
    // VIDEO CRUD
    // =====================

    /**
     * Ottieni tutti i video del tenant
     */
    async getAll(tenantId, options = {}) {
        const { videoType, search, isPublic, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT v.*, u.first_name as creator_first_name, u.last_name as creator_last_name
            FROM videos v
            LEFT JOIN users u ON v.created_by = u.id
            WHERE v.tenant_id = ?
        `;
        const params = [tenantId];

        if (videoType) {
            sql += ' AND v.video_type = ?';
            params.push(videoType);
        }

        if (isPublic !== undefined) {
            sql += ' AND v.is_public = ?';
            params.push(isPublic);
        }

        if (search) {
            sql += ' AND (v.title LIKE ? OR v.description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        const countSql = sql.replace(/SELECT.*FROM/s, 'SELECT COUNT(*) as total FROM');
        const countResult = await query(countSql, params);
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const videos = await query(sql, params);

        return {
            videos,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Ottieni video per ID
     */
    async getById(id, tenantId) {
        const videos = await query(`
            SELECT v.*, u.first_name as creator_first_name, u.last_name as creator_last_name
            FROM videos v
            LEFT JOIN users u ON v.created_by = u.id
            WHERE v.id = ? AND v.tenant_id = ?
        `, [id, tenantId]);

        if (videos.length === 0) {
            throw { status: 404, message: 'Video non trovato' };
        }

        return videos[0];
    }

    /**
     * Crea un nuovo video
     */
    async create(tenantId, data, userId) {
        const result = await query(`
            INSERT INTO videos (tenant_id, title, description, file_path, thumbnail_path, duration_seconds, video_type, is_public, price, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId,
            data.title,
            data.description || null,
            data.filePath,
            data.thumbnailPath || null,
            data.durationSeconds || null,
            data.videoType || 'exercise_demo',
            data.isPublic || false,
            data.price || 0,
            userId
        ]);

        return { videoId: result.insertId };
    }

    /**
     * Aggiorna un video
     */
    async update(id, tenantId, data) {
        await this.getById(id, tenantId);

        await query(`
            UPDATE videos SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                file_path = COALESCE(?, file_path),
                thumbnail_path = COALESCE(?, thumbnail_path),
                duration_seconds = COALESCE(?, duration_seconds),
                video_type = COALESCE(?, video_type),
                is_public = COALESCE(?, is_public),
                price = COALESCE(?, price)
            WHERE id = ? AND tenant_id = ?
        `, [
            data.title || null,
            data.description || null,
            data.filePath || null,
            data.thumbnailPath || null,
            data.durationSeconds || null,
            data.videoType || null,
            data.isPublic !== undefined ? data.isPublic : null,
            data.price !== undefined ? data.price : null,
            id,
            tenantId
        ]);
    }

    /**
     * Elimina un video
     */
    async delete(id, tenantId) {
        await this.getById(id, tenantId);
        await query('DELETE FROM videos WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    }

    /**
     * Incrementa contatore visualizzazioni
     */
    async incrementViews(id, tenantId) {
        await query('UPDATE videos SET views_count = views_count + 1 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    }

    // =====================
    // CORSI CRUD
    // =====================

    /**
     * Ottieni tutti i corsi del tenant
     */
    async getAllCourses(tenantId, options = {}) {
        const { difficulty, category, search, isPublished, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name,
                   COUNT(DISTINCT cm.id) as modules_count
            FROM courses c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN course_modules cm ON cm.course_id = c.id
            WHERE c.tenant_id = ?
        `;
        const params = [tenantId];

        if (difficulty) {
            sql += ' AND c.difficulty = ?';
            params.push(difficulty);
        }

        if (category) {
            sql += ' AND c.category = ?';
            params.push(category);
        }

        if (isPublished !== undefined) {
            sql += ' AND c.is_published = ?';
            params.push(isPublished);
        }

        if (search) {
            sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        sql += ' GROUP BY c.id';

        const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
        const countResult = await query(countSql, params);
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const courses = await query(sql, params);

        return {
            courses,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Ottieni corso per ID con moduli
     */
    async getCourseById(id, tenantId) {
        const courses = await query(`
            SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
            FROM courses c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = ? AND c.tenant_id = ?
        `, [id, tenantId]);

        if (courses.length === 0) {
            throw { status: 404, message: 'Corso non trovato' };
        }

        const course = courses[0];

        // Carica moduli con info video
        course.modules = await query(`
            SELECT cm.*, v.title as video_title, v.duration_seconds, v.thumbnail_path, v.file_path
            FROM course_modules cm
            LEFT JOIN videos v ON cm.video_id = v.id
            WHERE cm.course_id = ?
            ORDER BY cm.order_index ASC
        `, [id]);

        return course;
    }

    /**
     * Crea un nuovo corso
     */
    async createCourse(tenantId, data, userId) {
        return await transaction(async (connection) => {
            const result = await connection.query(`
                INSERT INTO courses (tenant_id, title, description, thumbnail_url, price, sale_price, difficulty, category, duration_total_min, is_published, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                data.title,
                data.description || null,
                data.thumbnailUrl || null,
                data.price || 0,
                data.salePrice || null,
                data.difficulty || 'intermediate',
                data.category || null,
                data.durationTotalMin || null,
                data.isPublished || false,
                userId
            ]);

            const courseId = result.insertId;

            // Inserisci moduli se presenti
            if (data.modules && data.modules.length > 0) {
                for (let i = 0; i < data.modules.length; i++) {
                    const mod = data.modules[i];
                    await connection.query(`
                        INSERT INTO course_modules (course_id, video_id, title, description, order_index, is_preview)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [courseId, mod.videoId, mod.title, mod.description || null, i, mod.isPreview || false]);
                }
            }

            return { courseId };
        });
    }

    /**
     * Aggiorna un corso
     */
    async updateCourse(id, tenantId, data) {
        await this.getCourseById(id, tenantId);

        return await transaction(async (connection) => {
            await connection.query(`
                UPDATE courses SET
                    title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    thumbnail_url = COALESCE(?, thumbnail_url),
                    price = COALESCE(?, price),
                    sale_price = COALESCE(?, sale_price),
                    difficulty = COALESCE(?, difficulty),
                    category = COALESCE(?, category),
                    duration_total_min = COALESCE(?, duration_total_min),
                    is_published = COALESCE(?, is_published)
                WHERE id = ? AND tenant_id = ?
            `, [
                data.title || null,
                data.description || null,
                data.thumbnailUrl || null,
                data.price !== undefined ? data.price : null,
                data.salePrice !== undefined ? data.salePrice : null,
                data.difficulty || null,
                data.category || null,
                data.durationTotalMin || null,
                data.isPublished !== undefined ? data.isPublished : null,
                id,
                tenantId
            ]);

            // Aggiorna moduli se forniti
            if (data.modules !== undefined) {
                await connection.query('DELETE FROM course_modules WHERE course_id = ?', [id]);
                if (data.modules.length > 0) {
                    for (let i = 0; i < data.modules.length; i++) {
                        const mod = data.modules[i];
                        await connection.query(`
                            INSERT INTO course_modules (course_id, video_id, title, description, order_index, is_preview)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [id, mod.videoId, mod.title, mod.description || null, i, mod.isPreview || false]);
                    }
                }
            }
        });
    }

    /**
     * Elimina un corso
     */
    async deleteCourse(id, tenantId) {
        await this.getCourseById(id, tenantId);
        await query('DELETE FROM courses WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    }

    // =====================
    // PROGRESSO CORSO
    // =====================

    /**
     * Ottieni progresso utente per un corso
     */
    async getCourseProgress(courseId, userId) {
        const progress = await query(`
            SELECT cp.*, cm.title as module_title, cm.order_index
            FROM course_progress cp
            JOIN course_modules cm ON cp.module_id = cm.id
            WHERE cp.course_id = ? AND cp.user_id = ?
            ORDER BY cm.order_index ASC
        `, [courseId, userId]);

        return progress;
    }

    /**
     * Aggiorna progresso modulo
     */
    async updateModuleProgress(courseId, moduleId, userId, data) {
        const existing = await query(
            'SELECT id FROM course_progress WHERE user_id = ? AND module_id = ?',
            [userId, moduleId]
        );

        if (existing.length > 0) {
            await query(`
                UPDATE course_progress SET
                    watched_seconds = COALESCE(?, watched_seconds),
                    is_completed = COALESCE(?, is_completed),
                    completed_at = CASE WHEN ? = TRUE AND completed_at IS NULL THEN NOW() ELSE completed_at END,
                    last_watched_at = NOW()
                WHERE user_id = ? AND module_id = ?
            `, [
                data.watchedSeconds || null,
                data.isCompleted !== undefined ? data.isCompleted : null,
                data.isCompleted || false,
                userId,
                moduleId
            ]);
        } else {
            await query(`
                INSERT INTO course_progress (user_id, course_id, module_id, watched_seconds, is_completed, completed_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                userId,
                courseId,
                moduleId,
                data.watchedSeconds || 0,
                data.isCompleted || false,
                data.isCompleted ? new Date() : null
            ]);
        }
    }

    // =====================
    // STATISTICHE
    // =====================

    /**
     * Ottieni statistiche video del tenant
     */
    async getStats(tenantId) {
        const videoStats = await query(`
            SELECT
                COUNT(*) as total_videos,
                SUM(views_count) as total_views,
                SUM(CASE WHEN video_type = 'course_content' THEN 1 ELSE 0 END) as course_videos,
                SUM(CASE WHEN video_type = 'exercise_demo' THEN 1 ELSE 0 END) as demo_videos,
                SUM(CASE WHEN video_type = 'free_content' THEN 1 ELSE 0 END) as free_videos
            FROM videos WHERE tenant_id = ?
        `, [tenantId]);

        const courseStats = await query(`
            SELECT
                COUNT(*) as total_courses,
                SUM(CASE WHEN is_published = TRUE THEN 1 ELSE 0 END) as published_courses
            FROM courses WHERE tenant_id = ?
        `, [tenantId]);

        return {
            videos: videoStats[0],
            courses: courseStats[0]
        };
    }
}

module.exports = new VideoService();
