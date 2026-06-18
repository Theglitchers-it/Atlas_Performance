/**
 * Client Files Controller
 */

const path = require('path');
const clientFilesService = require('../services/clientFiles.service');
const clientService = require('../services/client.service');
const { getFileUrl } = require('../middlewares/upload');

class ClientFilesController {
    async list(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const files = await clientFilesService.list(
                clientId, req.user.tenantId, req.query.category || null
            );
            res.json({ success: true, data: { files } });
        } catch (error) { next(error); }
    }

    async upload(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);

            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'Nessun file caricato' });
            }

            const { category, description } = req.body;
            const result = await clientFilesService.create(
                clientId, req.user.tenantId, req.user.id,
                {
                    filename: path.basename(file.path),
                    originalName: file.originalname,
                    filePath: file.path,
                    mimeType: file.mimetype,
                    fileSizeBytes: file.size,
                    category: category || 'other',
                    description: description || null
                }
            );
            res.status(201).json({
                success: true,
                data: {
                    id: result.id,
                    url: getFileUrl(file.path)
                }
            });
        } catch (error) { next(error); }
    }

    async download(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            // Defense-in-depth: il file deve appartenere allo specifico client nell'URL
            const file = await clientFilesService.getById(
                parseInt(req.params.fileId), req.user.tenantId, clientId
            );
            if (!file) {
                return res.status(404).json({ success: false, message: 'File non trovato' });
            }
            res.download(file.file_path, file.original_name);
        } catch (error) { next(error); }
    }

    async delete(req, res, next) {
        try {
            const clientId = parseInt(req.params.clientId);
            await clientService.assertOwnership(clientId, req.user.tenantId);
            const deleted = await clientFilesService.delete(
                parseInt(req.params.fileId), req.user.tenantId, clientId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'File non trovato' });
            }
            res.json({ success: true });
        } catch (error) { next(error); }
    }
}

module.exports = new ClientFilesController();
