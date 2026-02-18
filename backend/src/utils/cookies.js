/**
 * Cookie Utility
 * Configurazione centralizzata per httpOnly cookies (access + refresh token)
 */

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Opzioni cookie per access token
 */
const accessTokenOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'strict' : 'lax',
    path: '/api',
    maxAge: 15 * 60 * 1000 // 15 minuti
});

/**
 * Opzioni cookie per refresh token
 */
const refreshTokenOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
});

/**
 * Imposta i cookie di autenticazione sulla response
 * @param {Object} res - Express response
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, accessTokenOptions());
    res.cookie('refresh_token', refreshToken, refreshTokenOptions());
};

/**
 * Rimuove i cookie di autenticazione dalla response
 * @param {Object} res - Express response
 */
const clearAuthCookies = (res) => {
    res.clearCookie('access_token', { path: '/api' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
};

module.exports = {
    accessTokenOptions,
    refreshTokenOptions,
    setAuthCookies,
    clearAuthCookies
};
