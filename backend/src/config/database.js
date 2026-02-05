/**
 * Configurazione Database MySQL
 * Connessione pool per performance ottimali
 */

const mysql = require('mysql2/promise');

let pool = null;

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pt_saas_db',
    waitForConnections: true,
    connectionLimit: 10,
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
        console.log(`MySQL connesso: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('Errore connessione MySQL:', error.message);
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
        console.error('Errore query:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
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
        console.log('Pool MySQL chiuso');
    }
};

module.exports = {
    getPool,
    connectDB,
    query,
    transaction,
    closePool
};
