/**
 * Logger Strutturato - Winston
 * Logging centralizzato con livelli, timestamp e output su file + console
 */

const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato custom per console (leggibile)
const consoleFormat = printf(({ level, message, timestamp, service, ...meta }) => {
    const svc = service ? `[${service}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${svc} ${message}${metaStr}`;
});

// Formato JSON per file (strutturato, facile da parsare)
const fileFormat = printf(({ level, message, timestamp, service, ...meta }) => {
    return JSON.stringify({ timestamp, level, service, message, ...meta });
});

const isProduction = process.env.NODE_ENV === 'production';
const logDir = path.join(__dirname, '../../logs');

const transports = [
    // Console - sempre attivo
    new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'HH:mm:ss' }),
            consoleFormat
        ),
        level: isProduction ? 'info' : 'debug'
    })
];

// File logging solo in production (o se LOG_TO_FILE=true)
if (isProduction || process.env.LOG_TO_FILE === 'true') {
    transports.push(
        // Tutti i log
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: combine(timestamp(), fileFormat),
            level: 'info',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5
        }),
        // Solo errori
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            format: combine(timestamp(), fileFormat),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: combine(
        errors({ stack: true }),
        timestamp()
    ),
    defaultMeta: {},
    transports,
    // Non uscire su eccezioni non gestite (lasciamo che il process handler lo gestisca)
    exitOnError: false
});

/**
 * Crea un child logger con service name
 * @param {string} service - Nome del servizio (es. 'AUTH', 'STRIPE', 'CHAT')
 * @returns {winston.Logger}
 */
const createServiceLogger = (service) => {
    return logger.child({ service });
};

module.exports = { logger, createServiceLogger };
