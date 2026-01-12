from flask import g, request, abort
from werkzeug.wrappers import Request
from app.models import db
from app.models.super_admin import Tenant


class TenantContextMiddleware:
    """
    WSGI Middleware for Multi-Tenant Context

    Automatically detects tenant from subdomain or request header
    and sets it in Flask's 'g' object for request-scoped access

    Examples:
    - john-fitness.atlasperformance.com -> tenant: 'john-fitness'
    - Request with X-Tenant-ID header -> tenant_id from header
    """

    def __init__(self, app, flask_app):
        self.app = app
        self.flask_app = flask_app

    def __call__(self, environ, start_response):
        """WSGI application entry point"""
        request = Request(environ)

        # Extract tenant from subdomain or header
        tenant = self._get_tenant_from_request(request)

        # Store tenant in environ for Flask's 'g' to pick up
        if tenant:
            environ['tenant_id'] = tenant.id
            environ['tenant'] = tenant

        return self.app(environ, start_response)

    def _get_tenant_from_request(self, request):
        """
        Determine tenant from request
        Priority: X-Tenant-ID header > subdomain > None
        """
        # Method 1: Check for X-Tenant-ID header (for API calls)
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            try:
                with self.flask_app.app_context():
                    tenant = Tenant.query.filter_by(id=int(tenant_id), is_active=True).first()
                    if tenant:
                        return tenant
            except (ValueError, TypeError):
                pass

        # Method 2: Extract from subdomain
        host = request.host.split(':')[0]  # Remove port if present
        parts = host.split('.')

        # Check if subdomain exists (e.g., john-fitness.atlasperformance.com)
        if len(parts) >= 3:
            subdomain = parts[0]

            # Ignore common subdomains
            if subdomain not in ['www', 'api', 'admin', 'app']:
                with self.flask_app.app_context():
                    tenant = Tenant.query.filter_by(
                        subdomain=subdomain,
                        is_active=True
                    ).first()
                    if tenant:
                        return tenant

        return None


def get_current_tenant():
    """
    Get current tenant from Flask's g object
    Should be called within request context
    """
    if 'tenant' not in g:
        # Try to get from environ (set by middleware)
        tenant_id = request.environ.get('tenant_id')
        if tenant_id:
            g.tenant = Tenant.query.get(tenant_id)
        else:
            g.tenant = None

    return g.tenant


def require_tenant(f):
    """
    Decorator to require tenant context for a route
    Returns 403 if no tenant is found

    In development (localhost/127.0.0.1), automatically assigns first active tenant
    """
    from functools import wraps
    from flask import current_app
    from flask_login import current_user

    @wraps(f)
    def decorated_function(*args, **kwargs):
        tenant = get_current_tenant()

        # Development mode: auto-assign tenant for logged-in users
        if not tenant and current_user.is_authenticated:
            # Check if running on localhost
            host = request.host.split(':')[0]
            if host in ['localhost', '127.0.0.1']:
                # For trainers/athletes, use their assigned tenant
                if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
                    tenant = Tenant.query.get(current_user.tenant_id)
                    if tenant:
                        g.tenant = tenant
                else:
                    # For super admin or users without tenant, use first active tenant
                    tenant = Tenant.query.filter_by(is_active=True).first()
                    if tenant:
                        g.tenant = tenant

        if not tenant:
            abort(403, description="Tenant context required. Please access via your subdomain.")
        return f(*args, **kwargs)

    return decorated_function


def tenant_query(model_class):
    """
    Helper to automatically filter queries by current tenant

    Usage:
        athletes = tenant_query(Athlete).filter_by(is_active=True).all()
    """
    tenant = get_current_tenant()
    if not tenant:
        # Return empty query if no tenant
        return model_class.query.filter_by(id=-1)

    return model_class.query.filter_by(tenant_id=tenant.id)
