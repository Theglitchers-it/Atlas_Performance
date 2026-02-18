const { csrfProtection } = require('../src/middlewares/csrfProtection');

describe('CSRF Protection Middleware', () => {
    let middleware;
    let req, res, next;

    beforeEach(() => {
        process.env.FRONTEND_URL = 'http://localhost:5173';
        middleware = csrfProtection();
        req = {
            method: 'POST',
            path: '/api/test',
            headers: {
                'content-type': 'application/json',
                'origin': 'http://localhost:5173'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('safe methods (GET, HEAD, OPTIONS)', () => {
        test('GET requests pass through without checks', () => {
            req.method = 'GET';
            req.headers = {};
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('HEAD requests pass through', () => {
            req.method = 'HEAD';
            req.headers = {};
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('OPTIONS requests pass through', () => {
            req.method = 'OPTIONS';
            req.headers = {};
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Origin/Referer validation', () => {
        test('POST with valid Origin passes', () => {
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('POST with invalid Origin returns 403', () => {
            req.headers['origin'] = 'https://evil.com';
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Origine non consentita'
            }));
            expect(next).not.toHaveBeenCalled();
        });

        test('POST with valid Referer (no Origin) passes', () => {
            delete req.headers['origin'];
            req.headers['referer'] = 'http://localhost:5173/some/page';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('POST with invalid Referer (no Origin) returns 403', () => {
            delete req.headers['origin'];
            req.headers['referer'] = 'https://evil.com/attack';
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('POST with malformed Referer returns 403', () => {
            delete req.headers['origin'];
            req.headers['referer'] = 'not-a-valid-url';
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('POST with no Origin and no Referer falls through to Content-Type check', () => {
            delete req.headers['origin'];
            // No referer, valid content-type — should pass (server-to-server, curl)
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('POST with no Origin/Referer and bad Content-Type returns 403', () => {
            delete req.headers['origin'];
            req.headers['content-type'] = 'text/html';
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('supports multiple allowed origins via FRONTEND_URL', () => {
            process.env.FRONTEND_URL = 'http://localhost:5173,https://app.example.com';
            middleware = csrfProtection();
            req.headers['origin'] = 'https://app.example.com';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Content-Type validation', () => {
        test('POST with application/json passes', () => {
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('PUT with application/json passes', () => {
            req.method = 'PUT';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('DELETE with application/json passes', () => {
            req.method = 'DELETE';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('POST without content-type returns 403', () => {
            req.headers = { 'origin': 'http://localhost:5173' };
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('POST with text/html returns 403', () => {
            req.headers['content-type'] = 'text/html';
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('POST with multipart/form-data passes (upload support)', () => {
            req.headers['content-type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('POST with application/x-www-form-urlencoded returns 403', () => {
            req.headers['content-type'] = 'application/x-www-form-urlencoded';
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('POST with application/json; charset=utf-8 passes', () => {
            req.headers['content-type'] = 'application/json; charset=utf-8';
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('exclude paths', () => {
        test('excluded path bypasses CSRF check', () => {
            middleware = csrfProtection({ excludePaths: ['/webhooks'] });
            req.method = 'POST';
            req.path = '/webhooks/stripe';
            req.headers = { 'content-type': 'application/x-www-form-urlencoded' };
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('non-excluded path still requires validation', () => {
            middleware = csrfProtection({ excludePaths: ['/webhooks'] });
            req.method = 'POST';
            req.path = '/api/test';
            req.headers = { 'content-type': 'text/html', 'origin': 'http://localhost:5173' };
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('multiple exclude paths work', () => {
            middleware = csrfProtection({ excludePaths: ['/webhooks', '/uploads'] });
            req.method = 'POST';
            req.path = '/uploads/image';
            req.headers = {};
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('cross-origin multipart attack prevention', () => {
        test('multipart from evil origin is blocked', () => {
            req.headers = {
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
                'origin': 'https://evil.com'
            };
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Origine non consentita'
            }));
            expect(next).not.toHaveBeenCalled();
        });

        test('multipart from allowed origin passes', () => {
            req.headers = {
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
                'origin': 'http://localhost:5173'
            };
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
