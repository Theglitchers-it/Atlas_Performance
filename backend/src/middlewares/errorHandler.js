/**
 * Middleware Gestione Errori
 */

/**
 * Handler errori centralizzato
 */
const errorHandler = (err, req, res, next) => {
    console.error('Errore:', err);

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
            message: 'Errore database'
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

    // Errore con status code personalizzato
    if (err.statusCode) {
        return res.status(err.statusCode).json({
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
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
