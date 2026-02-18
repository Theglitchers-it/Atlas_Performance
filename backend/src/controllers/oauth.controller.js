/**
 * OAuth Controller
 * Gestione endpoint login sociale
 */

const oauthService = require('../services/oauth.service');
const { setAuthCookies } = require('../utils/cookies');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('OAUTH');

const VALID_PROVIDERS = ['google', 'github', 'discord'];

class OAuthController {
    /**
     * GET /api/auth/oauth/:provider
     * Restituisce l'URL di autorizzazione per il provider
     */
    async getAuthUrl(req, res, next) {
        try {
            const { provider } = req.params;

            if (!VALID_PROVIDERS.includes(provider)) {
                return res.status(400).json({
                    success: false,
                    message: `Provider "${provider}" non supportato. Usa: ${VALID_PROVIDERS.join(', ')}`
                });
            }

            const result = await oauthService.getAuthUrl(provider);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/oauth/:provider/callback
     * Gestisce il callback OAuth e restituisce HTML con postMessage
     */
    async handleCallback(req, res, next) {
        try {
            const { provider } = req.params;
            const { code, state, error: oauthError, error_description } = req.query;

            if (!VALID_PROVIDERS.includes(provider)) {
                return res.send(this.buildCallbackHTML(false, null, 'Provider non supportato'));
            }

            // Handle provider-side errors (user denied, etc.)
            if (oauthError) {
                const message = oauthError === 'access_denied'
                    ? 'Accesso negato. Hai annullato il login.'
                    : `Errore da ${provider}: ${error_description || oauthError}`;
                return res.send(this.buildCallbackHTML(false, null, message));
            }

            if (!code || !state) {
                return res.send(this.buildCallbackHTML(false, null, 'Parametri mancanti dal provider'));
            }

            const result = await oauthService.handleCallback(provider, code, state);

            // Set httpOnly cookies sulla response
            setAuthCookies(res, result.accessToken, result.refreshToken);

            // PostMessage invia solo user data (no tokens — quelli sono nel cookie)
            res.send(this.buildCallbackHTML(true, { user: result.user }, null));
        } catch (error) {
            logger.error(`OAuth Callback ${req.params.provider}`, { error: error.message || error });
            const message = error.message || 'Errore durante il login sociale';
            res.send(this.buildCallbackHTML(false, null, message));
        }
    }

    /**
     * Build HTML page for popup postMessage communication
     */
    buildCallbackHTML(success, data, errorMessage) {
        const payload = success
            ? JSON.stringify({ type: 'oauth-callback', success: true, data })
            : JSON.stringify({ type: 'oauth-callback', success: false, error: errorMessage });

        return `<!DOCTYPE html>
<html>
<head>
    <title>Login in corso...</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top: 3px solid #ff4c00;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        p { opacity: 0.7; font-size: 14px; }
        .error { color: #ff6b6b; opacity: 1; }
    </style>
</head>
<body>
    <div class="container">
        ${success
            ? '<div class="spinner"></div><p>Accesso effettuato! Chiusura...</p>'
            : `<p class="error">⚠️ ${errorMessage || 'Errore sconosciuto'}</p><p>Questa finestra si chiuderà tra poco...</p>`
        }
    </div>
    <script>
        (function() {
            try {
                if (window.opener) {
                    window.opener.postMessage(${payload}, window.location.origin);
                }
            } catch(e) {
                console.error('PostMessage error:', e);
            }
            setTimeout(function() { window.close(); }, ${success ? 1000 : 3000});
        })();
    </script>
</body>
</html>`;
    }
}

module.exports = new OAuthController();
