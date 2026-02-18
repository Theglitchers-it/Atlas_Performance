/**
 * Middleware Gestione Errori
 */

const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('ERROR_HANDLER');

/**
 * Handler errori centralizzato
 */
const errorHandler = (err, req, res, next) => {
    const reqId = req.requestId;
    if (process.env.NODE_ENV !== 'production') {
        logger.error('Errore', { requestId: reqId, error: err.message, stack: err.stack });
    } else {
        logger.error('Errore', { requestId: reqId, error: err.message });
    }

    // Errori di validazione Joi
    if (err.isJoi) {
        return res.status(400).json({
            success: false,
            message: 'Dati non validi',
            errors: err.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }))
        });
    }

    // Errori MySQL
    if (err.code && err.code.startsWith('ER_')) {
        // Duplicate entry
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Dato già esistente nel sistema'
            });
        }
        // Foreign key constraint
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Riferimento a dato non esistente'
            });
        }
        // Generic database error
        return res.status(500).json({
            success: false,
            message: 'Errore database',
            ...(process.env.NODE_ENV !== 'production' && {
                detail: err.message,
                code: err.code
            })
        });
    }

    // Errori Multer (upload file)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File troppo grande'
        });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Tipo di file non permesso'
        });
    }

    // Errore con status code personalizzato (supporta sia .status che .statusCode)
    const customStatus = err.status || err.statusCode;
    if (customStatus) {
        return res.status(customStatus).json({
            success: false,
            message: err.message
        });
    }

    // Errore generico
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Errore interno del server'
            : err.message,
        ...(reqId && { requestId: reqId }),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
