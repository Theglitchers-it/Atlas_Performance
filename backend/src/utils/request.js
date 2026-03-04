/**
 * Request Utilities
 * Shared helpers for extracting client info from Express requests.
 */

/**
 * Extract client IP from request, handling proxies.
 * @param {object} req - Express request
 * @returns {string}
 */
const getClientIp = (req) =>
    req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.connection?.remoteAddress || 'unknown';

/**
 * Extract and truncate user-agent from request.
 * @param {object} req - Express request
 * @param {number} [maxLen=255] - Max length (matches VARCHAR(255) columns)
 * @returns {string}
 */
const getUserAgent = (req, maxLen = 255) =>
    (req?.headers?.['user-agent'] || '').substring(0, maxLen);

module.exports = { getClientIp, getUserAgent };
