/**
 * Configurazione Database MySQL
 * Connessione pool per performance ottimali
 */

const mysql = require('mysql2/promise');
const { createServiceLogger } = require('./logger');
const logger = createServiceLogger('DATABASE');

let pool = null;

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pt_saas_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 50,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

/**
 * Crea e restituisce il pool di connessioni
 */
const getPool = () => {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    return pool;
};

/**
 * Connette al database e verifica la connessione
 */
const connectDB = async () => {
    try {
        const connection = await getPool().getConnection();
        logger.info(`MySQL connesso: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        connection.release();
        return true;
    } catch (error) {
        logger.error('Errore connessione MySQL', { error: error.message });
        throw error;
    }
};

/**
 * Esegue una query con parametri
 * @param {string} sql - Query SQL
 * @param {Array} params - Parametri per prepared statement
 * @returns {Promise<Array>} Risultati query
 */
const query = async (sql, params = []) => {
    try {
        const [rows] = await getPool().execute(sql, params);
        return rows;
    } catch (error) {
        logger.error('Errore query', { error: error.message });
        if (process.env.NODE_ENV !== 'production') {
            logger.error('SQL', { sql });
        }
        throw error;
    }
};

/**
 * Esegue una transazione
 * @param {Function} callback - Funzione che riceve la connessione
 * @returns {Promise<any>} Risultato della transazione
 */
const transaction = async (callback) => {
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Chiude il pool di connessioni
 */
const closePool = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('Pool MySQL chiuso');
    }
};

module.exports = {
    getPool,
    connectDB,
    query,
    transaction,
    closePool
};
