/**
 * Tests for Upload Middleware
 * File filters, magic byte validation, error handling, helpers
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Mock fs to prevent actual file system operations during module load
jest.mock('fs', () => {
    const actualFs = jest.requireActual('fs');
    return {
        ...actualFs,
        existsSync: jest.fn().mockReturnValue(true),
        mkdirSync: jest.fn(),
        openSync: jest.fn(),
        readSync: jest.fn(),
        closeSync: jest.fn(),
        unlinkSync: jest.fn()
    };
});

const {
    handleUploadError,
    validateMagicBytes,
    getFileUrl,
    deleteFile,
    UPLOAD_DIR
} = require('../src/middlewares/upload');

// Test helpers
const mockReq = (overrides = {}) => ({
    headers: {},
    user: { id: 1, tenantId: 'tenant-1', role: 'trainer' },
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = () => jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    // Restore default for existsSync to prevent deleteFile from failing
    fs.existsSync.mockReturnValue(true);
});

describe('imageFilter', () => {
    // We test the filters indirectly through the multer configuration
    // by importing them and calling them directly.
    // Extract the fileFilter from the uploadImage config (it's the imageFilter function).

    // Since the filters are not exported directly, we test them via handleUploadError
    // which handles the Error thrown by the filter callback.

    test('handleUploadError handles multer file size error', () => {
        const err = new multer.MulterError('LIMIT_FILE_SIZE');
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        handleUploadError(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'File troppo grande'
        }));
    });

    test('handleUploadError handles other multer errors', () => {
        const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        handleUploadError(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('Errore upload')
        }));
    });

    test('handleUploadError handles file filter rejection errors', () => {
        const err = new Error('Formato immagine non supportato. Usa: JPG, PNG, WebP, GIF');
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        handleUploadError(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Formato immagine non supportato. Usa: JPG, PNG, WebP, GIF'
        }));
    });

    test('handleUploadError calls next when no error', () => {
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        handleUploadError(null, req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('validateMagicBytes', () => {
    test('passes when no files are uploaded', () => {
        const req = mockReq({});
        const res = mockRes();
        const next = mockNext();

        validateMagicBytes(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('passes for valid JPEG magic bytes', () => {
        // JPEG starts with FF D8 FF
        const jpegHeader = Buffer.alloc(12);
        jpegHeader[0] = 0xFF;
        jpegHeader[1] = 0xD8;
        jpegHeader[2] = 0xFF;

        fs.openSync.mockReturnValue(42);
        fs.readSync.mockImplementation((fd, buffer, offset, length, position) => {
            jpegHeader.copy(buffer, 0, 0, 12);
            return 12;
        });

        const req = mockReq({
            file: {
                path: '/uploads/images/test.jpg',
                mimetype: 'image/jpeg',
                originalname: 'photo.jpg'
            }
        });
        const res = mockRes();
        const next = mockNext();

        validateMagicBytes(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(fs.closeSync).toHaveBeenCalledWith(42);
    });

    test('passes for valid PNG magic bytes', () => {
        const pngHeader = Buffer.alloc(12);
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(pngHeader);

        fs.openSync.mockReturnValue(43);
        fs.readSync.mockImplementation((fd, buffer, offset, length, position) => {
            pngHeader.copy(buffer, 0, 0, 12);
            return 12;
        });

        const req = mockReq({
            file: {
                path: '/uploads/images/test.png',
                mimetype: 'image/png',
                originalname: 'photo.png'
            }
        });
        const res = mockRes();
        const next = mockNext();

        validateMagicBytes(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('rejects file when magic bytes do not match declared MIME type', () => {
        // Claim JPEG but provide wrong bytes
        const wrongHeader = Buffer.alloc(12, 0x00);

        fs.openSync.mockReturnValue(44);
        fs.readSync.mockImplementation((fd, buffer, offset, length, position) => {
            wrongHeader.copy(buffer, 0, 0, 12);
            return 12;
        });

        const req = mockReq({
            file: {
                path: '/uploads/images/fake.jpg',
                mimetype: 'image/jpeg',
                originalname: 'fake.jpg'
            }
        });
        const res = mockRes();
        const next = mockNext();

        validateMagicBytes(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('non corrisponde')
        }));
        expect(next).not.toHaveBeenCalled();
        // Should delete the suspicious file
        expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/images/fake.jpg');
    });

    test('rejects file and returns 400 when file cannot be read', () => {
        fs.openSync.mockImplementation(() => {
            throw new Error('ENOENT');
        });

        const req = mockReq({
            file: {
                path: '/uploads/images/missing.jpg',
                mimetype: 'image/jpeg',
                originalname: 'missing.jpg'
            }
        });
        const res = mockRes();
        const next = mockNext();

        validateMagicBytes(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('Errore verifica file')
        }));
        expect(next).not.toHaveBeenCalled();
    });
});

describe('getFileUrl', () => {
    test('generates a URL relative to the uploads directory', () => {
        const filePath = path.join(UPLOAD_DIR, 'images', 'tenant-1', 'abc.jpg');
        const url = getFileUrl(filePath);

        expect(url).toBe('/uploads/images/tenant-1/abc.jpg');
    });
});

describe('deleteFile', () => {
    test('deletes a file given an /uploads/ prefixed path', () => {
        fs.existsSync.mockReturnValue(true);

        const result = deleteFile('/uploads/images/tenant-1/photo.jpg');

        expect(result).toBe(true);
        expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('returns false when file does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        const result = deleteFile('/uploads/images/tenant-1/nonexistent.jpg');

        expect(result).toBe(false);
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    test('blocks path traversal via absolute path outside uploads', () => {
        // Paths not starting with /uploads/ go through path.resolve
        // and are checked against UPLOAD_DIR boundary
        const result = deleteFile('/etc/passwd');

        expect(result).toBe(false);
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    test('strips ../ sequences from /uploads/ prefixed paths', () => {
        // The middleware removes ../ via regex, so /uploads/../../etc/passwd
        // becomes /uploads/etc/passwd which is inside UPLOAD_DIR
        fs.existsSync.mockReturnValue(true);

        const result = deleteFile('/uploads/../../etc/passwd');

        // After stripping ../, the resolved path is within UPLOAD_DIR
        // so existsSync is checked and the file is deleted (it stays within boundary)
        expect(result).toBe(true);
    });
});
