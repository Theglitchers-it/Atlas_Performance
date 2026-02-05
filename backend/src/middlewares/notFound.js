/**
 * Middleware 404 Not Found
 */

const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint non trovato: ${req.method} ${req.originalUrl}`
    });
};

module.exports = { notFound };
