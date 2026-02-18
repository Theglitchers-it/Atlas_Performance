/**
 * Progress Service
 * Gestione foto progresso e record performance (PR)
 */

const { query } = require('../config/database');

class ProgressService {

    // === PROGRESS PHOTOS ===

    async getPhotos(clientId, tenantId, options = {}) {
        const { photoType, startDate, endDate, limit = 50, page = 1 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT * FROM progress_photos
            WHERE client_id = ? AND tenant_id = ?
        `;
        const params = [clientId, tenantId];

        if (photoType) {
            sql += ' AND photo_type = ?';
            params.push(photoType);
        }
        if (startDate) {
            sql += ' AND taken_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND taken_at <= ?';
            params.push(endDate);
        }

        const countSql = 'SELECT COUNT(*) as total FROM progress_photos WHERE client_id = ? AND tenant_id = ?';
        const countParams = [clientId, tenantId];
        if (photoType) { countSql.concat(' AND photo_type = ?'); countParams.push(photoType); }
        const countResult = await query(
            photoType
                ? 'SELECT COUNT(*) as total FROM progress_photos WHERE client_id = ? AND tenant_id = ? AND photo_type = ?'
                : 'SELECT COUNT(*) as total FROM progress_photos WHERE client_id = ? AND tenant_id = ?',
            photoType ? [clientId, tenantId, photoType] : [clientId, tenantId]
        );
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY taken_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const photos = await query(sql, params);

        return {
            photos,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async addPhoto(clientId, tenantId, photoData) {
        const { photoUrl, thumbnailUrl, photoType, takenAt, notes, bodyWeight, bodyFatPct } = photoData;

        const result = await query(`
            INSERT INTO progress_photos
            (tenant_id, client_id, photo_url, thumbnail_url, photo_type, taken_at, notes, body_weight, body_fat_pct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId, clientId, photoUrl, thumbnailUrl || null,
            photoType || 'front', takenAt || new Date().toISOString().split('T')[0],
            notes || null, bodyWeight || null, bodyFatPct || null
        ]);

        return { id: result.insertId };
    }

    async deletePhoto(photoId, tenantId) {
        const result = await query(
            'DELETE FROM progress_photos WHERE id = ? AND tenant_id = ?',
            [photoId, tenantId]
        );
        return result.affectedRows > 0;
    }

    async getPhotoComparison(clientId, tenantId, date1, date2, photoType = 'front') {
        const photos = await query(`
            SELECT * FROM progress_photos
            WHERE client_id = ? AND tenant_id = ? AND photo_type = ?
              AND taken_at IN (?, ?)
            ORDER BY taken_at ASC
        `, [clientId, tenantId, photoType, date1, date2]);

        return photos;
    }

    // === PERFORMANCE RECORDS (PR) ===

    async getRecords(clientId, tenantId, options = {}) {
        const { exerciseId, recordType, limit = 50 } = options;

        let sql = `
            SELECT pr.*, e.name as exercise_name, e.category as exercise_category
            FROM performance_records pr
            JOIN exercises e ON pr.exercise_id = e.id
            WHERE pr.client_id = ? AND pr.tenant_id = ?
        `;
        const params = [clientId, tenantId];

        if (exerciseId) {
            sql += ' AND pr.exercise_id = ?';
            params.push(exerciseId);
        }
        if (recordType) {
            sql += ' AND pr.record_type = ?';
            params.push(recordType);
        }

        sql += ' ORDER BY pr.recorded_at DESC LIMIT ?';
        params.push(limit);

        return await query(sql, params);
    }

    async addRecord(clientId, tenantId, recordData) {
        const { exerciseId, recordType, value, sessionId, notes } = recordData;

        // Get previous record for this exercise/type
        const prevRecords = await query(`
            SELECT value FROM performance_records
            WHERE client_id = ? AND tenant_id = ? AND exercise_id = ? AND record_type = ?
            ORDER BY recorded_at DESC LIMIT 1
        `, [clientId, tenantId, exerciseId, recordType]);

        const previousValue = prevRecords.length > 0 ? prevRecords[0].value : null;

        const result = await query(`
            INSERT INTO performance_records
            (tenant_id, client_id, exercise_id, record_type, value, previous_value, recorded_at, session_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
        `, [
            tenantId, clientId, exerciseId, recordType || '1rm',
            value, previousValue, sessionId || null, notes || null
        ]);

        return { id: result.insertId, previousValue, improvement: previousValue ? value - previousValue : null };
    }

    async getPersonalBests(clientId, tenantId) {
        const pbs = await query(`
            SELECT pr.exercise_id, e.name as exercise_name, e.category,
                   pr.record_type, pr.value, pr.recorded_at
            FROM performance_records pr
            JOIN exercises e ON pr.exercise_id = e.id
            INNER JOIN (
                SELECT exercise_id, record_type, MAX(value) as max_value
                FROM performance_records
                WHERE client_id = ? AND tenant_id = ?
                GROUP BY exercise_id, record_type
            ) best ON pr.exercise_id = best.exercise_id
                   AND pr.record_type = best.record_type
                   AND pr.value = best.max_value
            WHERE pr.client_id = ? AND pr.tenant_id = ?
            ORDER BY e.category, e.name, pr.record_type
        `, [clientId, tenantId, clientId, tenantId]);

        return pbs;
    }

    async getRecordHistory(clientId, tenantId, exerciseId, recordType = '1rm') {
        return await query(`
            SELECT pr.*, e.name as exercise_name
            FROM performance_records pr
            JOIN exercises e ON pr.exercise_id = e.id
            WHERE pr.client_id = ? AND pr.tenant_id = ?
              AND pr.exercise_id = ? AND pr.record_type = ?
            ORDER BY pr.recorded_at ASC
        `, [clientId, tenantId, exerciseId, recordType]);
    }

    async deleteRecord(recordId, tenantId) {
        const result = await query(
            'DELETE FROM performance_records WHERE id = ? AND tenant_id = ?',
            [recordId, tenantId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = new ProgressService();
