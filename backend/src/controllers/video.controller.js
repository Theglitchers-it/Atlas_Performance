/**
 * Video Controller
 * Gestione video, corsi e progresso
 */

const videoService = require('../services/video.service');

class VideoController {
    // =====================
    // VIDEO
    // =====================

    async getAll(req, res, next) {
        try {
            const options = {
                videoType: req.query.videoType,
                search: req.query.search,
                isPublic: req.query.isPublic !== undefined ? req.query.isPublic === 'true' : undefined,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await videoService.getAll(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const video = await videoService.getById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, data: { video } });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const result = await videoService.create(req.user.tenantId, req.body, req.user.id);
            const video = await videoService.getById(result.videoId, req.user.tenantId);
            res.status(201).json({ success: true, message: 'Video creato', data: { video } });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            await videoService.update(parseInt(req.params.id), req.user.tenantId, req.body);
            const video = await videoService.getById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Video aggiornato', data: { video } });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await videoService.delete(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Video eliminato' });
        } catch (error) {
            next(error);
        }
    }

    async incrementViews(req, res, next) {
        try {
            await videoService.incrementViews(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    // =====================
    // CORSI
    // =====================

    async getAllCourses(req, res, next) {
        try {
            const options = {
                difficulty: req.query.difficulty,
                category: req.query.category,
                search: req.query.search,
                isPublished: req.query.isPublished !== undefined ? req.query.isPublished === 'true' : undefined,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await videoService.getAllCourses(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getCourseById(req, res, next) {
        try {
            const course = await videoService.getCourseById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, data: { course } });
        } catch (error) {
            next(error);
        }
    }

    async createCourse(req, res, next) {
        try {
            const result = await videoService.createCourse(req.user.tenantId, req.body, req.user.id);
            const course = await videoService.getCourseById(result.courseId, req.user.tenantId);
            res.status(201).json({ success: true, message: 'Corso creato', data: { course } });
        } catch (error) {
            next(error);
        }
    }

    async updateCourse(req, res, next) {
        try {
            await videoService.updateCourse(parseInt(req.params.id), req.user.tenantId, req.body);
            const course = await videoService.getCourseById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Corso aggiornato', data: { course } });
        } catch (error) {
            next(error);
        }
    }

    async deleteCourse(req, res, next) {
        try {
            await videoService.deleteCourse(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Corso eliminato' });
        } catch (error) {
            next(error);
        }
    }

    // =====================
    // PROGRESSO CORSO
    // =====================

    async getCourseProgress(req, res, next) {
        try {
            const progress = await videoService.getCourseProgress(
                parseInt(req.params.id),
                req.user.id
            );
            res.json({ success: true, data: { progress } });
        } catch (error) {
            next(error);
        }
    }

    async updateModuleProgress(req, res, next) {
        try {
            await videoService.updateModuleProgress(
                parseInt(req.params.courseId),
                parseInt(req.params.moduleId),
                req.user.id,
                req.body
            );
            res.json({ success: true, message: 'Progresso aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    // =====================
    // STATISTICHE
    // =====================

    async getStats(req, res, next) {
        try {
            const stats = await videoService.getStats(req.user.tenantId);
            res.json({ success: true, data: { stats } });
        } catch (error) {
            next(error);
        }
    }

    // =====================
    // UPLOAD
    // =====================

    async uploadFile(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Nessun file caricato' });
            }

            const { getFileUrl } = require('../middlewares/upload');
            const fileUrl = getFileUrl(req.file.path);

            res.json({
                success: true,
                data: {
                    url: fileUrl,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimetype: req.file.mimetype
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VideoController();
