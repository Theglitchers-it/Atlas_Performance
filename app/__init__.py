from flask import Flask
from flask_migrate import Migrate
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from config import config
import os

# Initialize extensions
from app.models import db, login_manager

migrate = Migrate()
mail = Mail()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour", "20 per minute"],
    storage_uri="memory://",
    strategy="fixed-window"
)
cache = Cache()


def create_app(config_name=None):
    """
    Flask Application Factory Pattern
    Creates and configures the Flask application
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Call config init_app if it exists (for validation in production)
    if hasattr(config[config_name], 'init_app'):
        config[config_name].init_app(app)

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)

    # Initialize cache
    cache_config = {
        'CACHE_TYPE': 'SimpleCache',
        'CACHE_DEFAULT_TIMEOUT': 300
    }
    if config_name == 'production':
        cache_config = {
            'CACHE_TYPE': 'RedisCache',
            'CACHE_REDIS_URL': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
            'CACHE_DEFAULT_TIMEOUT': 300
        }
    app.config.update(cache_config)
    cache.init_app(app)

    # Configure Flask-Login
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

    # User loader for Flask-Login
    from app.models.shared import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register middlewares
    register_middlewares(app)

    # Register blueprints
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)

    # Register template filters
    register_template_filters(app)

    # Initialize Vite asset helper
    from app.utils.vite_helper import init_vite
    init_vite(app)

    # Create upload directories
    create_upload_directories(app)

    # Register CLI commands
    register_cli_commands(app)

    return app


def register_middlewares(app):
    """Register application middlewares"""
    from app.middleware.tenant_context import TenantContextMiddleware

    # Multi-tenant context middleware
    app.wsgi_app = TenantContextMiddleware(app.wsgi_app, app)

    # Security headers middleware
    @app.after_request
    def set_security_headers(response):
        # XSS Protection
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # Content Security Policy
        vite_dev_server = app.config.get('VITE_DEV_SERVER_URL', '')
        vite_csp = f"{vite_dev_server} " if app.config.get('DEBUG') else ""

        csp = (
            "default-src 'self'; "
            f"script-src 'self' 'unsafe-inline' {vite_csp}https://js.stripe.com; "
            f"style-src 'self' 'unsafe-inline' {vite_csp}https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            f"font-src 'self' data: {vite_csp}https://fonts.gstatic.com; "
            f"connect-src 'self' {vite_csp}https://api.stripe.com; "
            "frame-src https://js.stripe.com https://hooks.stripe.com;"
        )
        response.headers['Content-Security-Policy'] = csp

        # HSTS (only in production with HTTPS)
        if app.config.get('SESSION_COOKIE_SECURE'):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        return response


def register_blueprints(app):
    """Register Flask blueprints"""
    # Authentication blueprint
    from app.blueprints.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    # Super Admin blueprint
    from app.blueprints.super_admin import super_admin_bp
    app.register_blueprint(super_admin_bp, url_prefix='/super-admin')

    # Trainer blueprint
    from app.blueprints.trainer import trainer_bp
    app.register_blueprint(trainer_bp, url_prefix='/trainer')

    # Athlete blueprint
    from app.blueprints.athlete import athlete_bp
    app.register_blueprint(athlete_bp, url_prefix='/athlete')

    # Billing blueprint
    from app.blueprints.billing import billing_bp
    app.register_blueprint(billing_bp, url_prefix='/billing')

    # Uploads blueprint
    from app.blueprints.uploads import uploads_bp
    app.register_blueprint(uploads_bp, url_prefix='/uploads')

    # Public/Landing page blueprint
    from app.blueprints.public import public_bp
    app.register_blueprint(public_bp)


def register_error_handlers(app):
    """Register error handlers"""
    from flask import render_template

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('errors/403.html'), 403

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('errors/500.html'), 500


def register_template_filters(app):
    """Register custom Jinja2 filters"""
    from datetime import datetime

    @app.template_filter('format_date')
    def format_date(value, format='%d/%m/%Y'):
        """Format date to string"""
        if value is None:
            return ''
        if isinstance(value, str):
            return value
        return value.strftime(format)

    @app.template_filter('format_datetime')
    def format_datetime(value, format='%d/%m/%Y %H:%M'):
        """Format datetime to string"""
        if value is None:
            return ''
        if isinstance(value, str):
            return value
        return value.strftime(format)

    @app.template_filter('time_ago')
    def time_ago(value):
        """Convert datetime to 'time ago' format"""
        if value is None:
            return ''

        now = datetime.utcnow()
        diff = now - value

        if diff.days > 365:
            return f"{diff.days // 365} year(s) ago"
        elif diff.days > 30:
            return f"{diff.days // 30} month(s) ago"
        elif diff.days > 0:
            return f"{diff.days} day(s) ago"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600} hour(s) ago"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60} minute(s) ago"
        else:
            return "just now"

    @app.template_filter('currency')
    def currency_filter(value, currency='EUR'):
        """Format number as currency"""
        if value is None:
            return ''
        return f"{currency} {value:.2f}"


def create_upload_directories(app):
    """Create upload directories if they don't exist"""
    upload_dirs = [
        os.path.join(app.config['UPLOAD_FOLDER'], 'videos'),
        os.path.join(app.config['UPLOAD_FOLDER'], 'images'),
        os.path.join(app.config['UPLOAD_FOLDER'], 'avatars'),
        os.path.join(app.config['UPLOAD_FOLDER'], 'check_ins'),
        os.path.join(app.config['UPLOAD_FOLDER'], 'form_checks')
    ]

    for directory in upload_dirs:
        os.makedirs(directory, exist_ok=True)


def register_cli_commands(app):
    """Register custom Flask CLI commands"""
    from app.models.shared import User
    from werkzeug.security import generate_password_hash

    @app.cli.command('create-default-users')
    def create_default_users():
        """Create default super admin and trainer users"""
        # Check if users already exist
        admin_exists = User.query.filter_by(email='admin@atlas.com').first()
        trainer_exists = User.query.filter_by(email='trainer@atlas.com').first()

        if not admin_exists:
            admin = User(
                email='admin@atlas.com',
                password_hash=generate_password_hash('Admin123!'),
                first_name='Super',
                last_name='Admin',
                role='super_admin',
                is_active=True,
                tenant_id=None
            )
            db.session.add(admin)
            print("✅ Super Admin created: admin@atlas.com / Admin123!")
        else:
            print("⚠️  Super Admin already exists")

        if not trainer_exists:
            trainer = User(
                email='trainer@atlas.com',
                password_hash=generate_password_hash('Trainer123!'),
                first_name='Demo',
                last_name='Trainer',
                role='trainer',
                is_active=True,
                tenant_id=None
            )
            db.session.add(trainer)
            print("✅ Trainer created: trainer@atlas.com / Trainer123!")
        else:
            print("⚠️  Trainer already exists")

        db.session.commit()
        print("\n🎉 Default users setup complete!")

    @app.cli.command('init-db')
    def init_db():
        """Initialize database with tables and default users"""
        print("Creating database tables...")
        db.create_all()
        print("✅ Database tables created!")

        print("\nCreating default users...")
        # Check if users already exist
        admin_exists = User.query.filter_by(email='admin@atlas.com').first()
        trainer_exists = User.query.filter_by(email='trainer@atlas.com').first()

        if not admin_exists:
            admin = User(
                email='admin@atlas.com',
                password_hash=generate_password_hash('Admin123!'),
                first_name='Super',
                last_name='Admin',
                role='super_admin',
                is_active=True,
                tenant_id=None
            )
            db.session.add(admin)
            print("✅ Super Admin created: admin@atlas.com / Admin123!")
        else:
            print("⚠️  Super Admin already exists")

        if not trainer_exists:
            trainer = User(
                email='trainer@atlas.com',
                password_hash=generate_password_hash('Trainer123!'),
                first_name='Demo',
                last_name='Trainer',
                role='trainer',
                is_active=True,
                tenant_id=None
            )
            db.session.add(trainer)
            print("✅ Trainer created: trainer@atlas.com / Trainer123!")
        else:
            print("⚠️  Trainer already exists")

        db.session.commit()
        print("\n🎉 Database initialization complete!")
        print("\n📝 Login credentials:")
        print("   Super Admin: admin@atlas.com / Admin123!")
        print("   Trainer:     trainer@atlas.com / Trainer123!")
