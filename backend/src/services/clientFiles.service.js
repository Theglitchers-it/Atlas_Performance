/**
 * Client Files Service
 * Archivio documenti/file nella Cartella Cliente Digitale.
 */

const fs = require('fs');
const { query } = require('../config/database');

class ClientFilesService {
    async list(clientId, tenantId, category = null) {
        const params = [tenantId, clientId];
        let sql = `SELECT cf.*, u.first_name as uploader_first_name, u.last_name as uploader_last_name
                   FROM client_files cf
                   LEFT JOIN users u ON cf.uploaded_by = u.id
                   WHERE cf.tenant_id = ? AND cf.client_id = ?`;
        if (category) {
            sql += ' AND cf.category = ?';
            params.push(category);
        }
        sql += ' ORDER BY cf.created_at DESC';
        return await query(sql, params);
    }

    async create(clientId, tenantId, uploadedBy, fileData) {
        const { filename, originalName, filePath, mimeType, fileSizeBytes, category, description } = fileData;
        const result = await query(
            `INSERT INTO client_files
             (tenant_id, client_id, filename, original_name, file_path, mime_type, file_size_bytes, category, description, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, clientId, filename, originalName, filePath, mimeType || null,
             fileSizeBytes || null, category || 'other', description || null, uploadedBy]
        );
        return { id: result.insertId };
    }

    /**
     * Carica un file verificando tenant + (opzionale) client_id.
     * Se clientId fornito, il file deve appartenere a quel client specifico
     * (defense-in-depth contro IDOR via URL param mismatch).
     */
    async getById(fileId, tenantId, clientId = null) {
        const sql = clientId !== null
            ? `SELECT * FROM client_files WHERE id = ? AND tenant_id = ? AND client_id = ?`
            : `SELECT * FROM client_files WHERE id = ? AND tenant_id = ?`;
        const params = clientId !== null ? [fileId, tenantId, clientId] : [fileId, tenantId];
        const rows = await query(sql, params);
        return rows[0] || null;
    }

    async delete(fileId, tenantId, clientId = null) {
        const file = await this.getById(fileId, tenantId, clientId);
        if (!file) return false;

        // Rimuovi file fisico (best-effort)
        try {
            if (file.file_path && fs.existsSync(file.file_path)) {
                fs.unlinkSync(file.file_path);
            }
        } catch (err) {
            // Log ma non fallire: DB delete avviene comunque
        }

        const sql = clientId !== null
            ? `DELETE FROM client_files WHERE id = ? AND tenant_id = ? AND client_id = ?`
            : `DELETE FROM client_files WHERE id = ? AND tenant_id = ?`;
        const params = clientId !== null ? [fileId, tenantId, clientId] : [fileId, tenantId];
        await query(sql, params);
        return true;
    }
}

module.exports = new ClientFilesService();
