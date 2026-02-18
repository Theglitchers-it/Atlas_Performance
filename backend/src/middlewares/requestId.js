/**
 * Request ID Middleware
 * Assegna un ID univoco a ogni richiesta per tracciamento end-to-end nei log
 */

const crypto = require('crypto');

const requestId = (req, res, next) => {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
};

module.exports = { requestId };
