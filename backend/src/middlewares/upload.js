/**
 * Upload Middleware
 * Configurazione multer per upload file (immagini, video, documenti)
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Directory base per gli upload
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Assicura che le directory esistano
const dirs = ['images', 'videos', 'avatars', 'progress', 'documents'];
dirs.forEach(dir => {
    const fullPath = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

/**
 * Storage configurato per tipo di file
 */
function createStorage(subDir) {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const tenantDir = path.join(UPLOAD_DIR, subDir, String(req.tenantId || req.user?.tenantId || 'default'));
            if (!fs.existsSync(tenantDir)) {
                fs.mkdirSync(tenantDir, { recursive: true });
            }
            cb(null, tenantDir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = `${uuidv4()}${ext}`;
            cb(null, filename);
        }
    });
}

/**
 * Filtri per tipo di file
 */
const imageFilter = (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato immagine non supportato. Usa: JPG, PNG, WebP, GIF'), false);
    }
};

const videoFilter = (req, file, cb) => {
    const allowedExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato video non supportato. Usa: MP4, MOV, AVI, WebM'), false);
    }
};

const documentFilter = (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
    const allowedMimes = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato documento non supportato'), false);
    }
};

/**
 * Middleware per upload immagini (foto profilo, progress photos)
 * Max 10MB per immagine
 */
const uploadImage = multer({
    storage: createStorage('images'),
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * Middleware per upload avatar
 * Max 5MB
 */
const uploadAvatar = multer({
    storage: createStorage('avatars'),
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * Middleware per upload foto progressi
 * Max 10MB, multipli file
 */
const uploadProgress = multer({
    storage: createStorage('progress'),
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * Middleware per upload video
 * Max 500MB
 */
const uploadVideo = multer({
    storage: createStorage('videos'),
    fileFilter: videoFilter,
    limits: { fileSize: 500 * 1024 * 1024 }
});

/**
 * Middleware per upload documenti
 * Max 20MB
 */
const uploadDocument = multer({
    storage: createStorage('documents'),
    fileFilter: documentFilter,
    limits: { fileSize: 20 * 1024 * 1024 }
});

/**
 * Magic byte signatures for file type verification
 */
const MAGIC_BYTES = {
    'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
    'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
    'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
    'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')], // RIFF at 0, WEBP at 8
    'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    'video/mp4': [Buffer.from('ftyp')], // at offset 4
};

/**
 * Middleware post-upload: verifica magic bytes del file
 * Elimina file se la firma non corrisponde al MIME dichiarato
 */
const validateMagicBytes = (req, res, next) => {
    const files = req.file ? [req.file] : (req.files || []);
    if (files.length === 0) return next();

    for (const file of files) {
        try {
            const fd = fs.openSync(file.path, 'r');
            const header = Buffer.alloc(12);
            fs.readSync(fd, header, 0, 12, 0);
            fs.closeSync(fd);

            const mime = file.mimetype;
            let valid = false;

            if (mime === 'image/jpeg') {
                valid = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
            } else if (mime === 'image/png') {
                valid = header.slice(0, 8).equals(MAGIC_BYTES['image/png'][0]);
            } else if (mime === 'image/gif') {
                valid = header.slice(0, 4).equals(MAGIC_BYTES['image/gif'][0]);
            } else if (mime === 'image/webp') {
                valid = header.slice(0, 4).toString() === 'RIFF' && header.slice(8, 12).toString() === 'WEBP';
            } else if (mime === 'application/pdf') {
                valid = header.slice(0, 4).equals(MAGIC_BYTES['application/pdf'][0]);
            } else if (mime.startsWith('video/')) {
                // MP4 family: 'ftyp' at offset 4
                valid = header.slice(4, 8).toString() === 'ftyp' ||
                        header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3; // MKV/WebM
            } else if (mime === 'application/msword') {
                // DOC: OLE2 Compound Document (D0 CF 11 E0)
                valid = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
            } else if (
                mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ) {
                // DOCX/XLSX: ZIP archive (PK header 50 4B 03 04)
                valid = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04;
            } else if (mime === 'application/vnd.ms-excel') {
                // XLS: OLE2 Compound Document (D0 CF 11 E0)
                valid = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
            } else if (mime === 'text/csv') {
                // CSV: plain text — verify it's printable ASCII/UTF-8 (no binary/executable content)
                valid = true;
                for (let i = 0; i < Math.min(12, header.length); i++) {
                    const b = header[i];
                    if (b === 0x00) { valid = false; break; } // null byte = binary
                    // Allow printable ASCII, tabs, newlines, carriage returns, and UTF-8 multibyte lead bytes (0xC0+)
                    if (b < 0x09 || (b > 0x0D && b < 0x20 && b !== 0x1B)) {
                        // Control chars (except tab, LF, CR, ESC) suggest binary content
                        valid = false;
                        break;
                    }
                }
            } else {
                // Unknown MIME — reject by default
                valid = false;
            }

            if (!valid) {
                // Delete the suspicious file
                try { fs.unlinkSync(file.path); } catch {}
                return res.status(400).json({
                    success: false,
                    message: 'Il contenuto del file non corrisponde al formato dichiarato'
                });
            }
        } catch (err) {
            // If we can't read the file, reject it
            try { fs.unlinkSync(file.path); } catch {}
            return res.status(400).json({
                success: false,
                message: 'Errore verifica file caricato'
            });
        }
    }

    next();
};

/**
 * Sanitizza CSV per prevenire formula injection (=CMD(), +cmd, -exec, @SUM)
 * Prefissa con apostrofo le celle che iniziano con caratteri pericolosi
 */
const sanitizeCsvContent = (filePath) => {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        // Prefissa con apostrofo le celle che iniziano con =, +, -, @, \t, \r
        // Gestisce sia celle non quotate che quotate
        content = content.replace(/(^|,)\s*([=+\-@\t\r])/gm, "$1'$2");
        fs.writeFileSync(filePath, content, 'utf-8');
    } catch {
        // Se non riesce a sanitizzare, elimina il file per sicurezza
        try { fs.unlinkSync(filePath); } catch {}
        throw new Error('Errore sanitizzazione file CSV');
    }
};

/**
 * Middleware post-upload: sanitizza CSV per formula injection
 */
const sanitizeCsvUpload = (req, res, next) => {
    const files = req.file ? [req.file] : (req.files || []);
    for (const file of files) {
        if (file.mimetype === 'text/csv' || file.originalname?.toLowerCase().endsWith('.csv')) {
            try {
                sanitizeCsvContent(file.path);
            } catch (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Errore elaborazione file CSV'
                });
            }
        }
    }
    next();
};

/**
 * Gestione errori multer
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File troppo grande'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Errore upload: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

/**
 * Helper: genera URL pubblica per un file caricato
 */
function getFileUrl(filePath) {
    const relativePath = path.relative(UPLOAD_DIR, filePath).replace(/\\/g, '/');
    return `/uploads/${relativePath}`;
}

/**
 * Helper: elimina file
 */
function deleteFile(filePath) {
    let fullPath;

    if (filePath.startsWith('/uploads/')) {
        // Normalizza e rimuovi qualsiasi ../ dal path
        const relativePath = filePath.replace('/uploads/', '').replace(/\.\./g, '');
        fullPath = path.join(UPLOAD_DIR, relativePath);
    } else {
        fullPath = path.resolve(filePath);
    }

    // Verifica che il path risolto sia all'interno della directory uploads
    if (!fullPath.startsWith(path.resolve(UPLOAD_DIR))) {
        console.error('[Upload] Path traversal attempt blocked:', filePath);
        return false;
    }

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
    }
    return false;
}

module.exports = {
    uploadImage,
    uploadAvatar,
    uploadProgress,
    uploadVideo,
    uploadDocument,
    handleUploadError,
    validateMagicBytes,
    sanitizeCsvUpload,
    getFileUrl,
    deleteFile,
    UPLOAD_DIR
};
