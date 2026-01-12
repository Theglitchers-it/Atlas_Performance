import os
from datetime import timedelta
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'atlas_performance.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = False  # Set True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # CSRF Protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None

    # File Upload
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 52428800))  # 50MB
    UPLOAD_FOLDER = os.path.join(basedir, 'app', 'static', 'uploads')
    ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm'}
    ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

    # Stripe
    STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY')
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

    # Stripe Subscription Price IDs
    STRIPE_PRICE_STARTER = os.environ.get('STRIPE_PRICE_STARTER')  # €29/month
    STRIPE_PRICE_PRO = os.environ.get('STRIPE_PRICE_PRO')          # €49/month
    STRIPE_PRICE_ENTERPRISE = os.environ.get('STRIPE_PRICE_ENTERPRISE')  # €99/month

    # Email Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() in ['true', '1', 't']
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() in ['true', '1', 't']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@atlasperformance.com')

    # AWS S3 (Optional)
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.environ.get('AWS_S3_BUCKET')
    AWS_REGION = os.environ.get('AWS_REGION', 'eu-west-1')

    # CDN Configuration
    CDN_ENABLED = os.environ.get('CDN_ENABLED', 'False').lower() in ['true', '1', 't']
    CLOUDFLARE_CDN_DOMAIN = os.environ.get('CLOUDFLARE_CDN_DOMAIN')  # e.g., cdn.atlasperformance.com
    CLOUDFLARE_ZONE_ID = os.environ.get('CLOUDFLARE_ZONE_ID')
    CLOUDFLARE_API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN')

    # Pagination
    ITEMS_PER_PAGE = 20

    # Rate Limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URL = "memory://"

    # Multi-Tenant Settings
    DEFAULT_TENANT_SCHEMA = 'public'
    TENANT_SCHEMA_PREFIX = 'tenant_'

    # Vite Frontend Build System
    VITE_DEV_SERVER_URL = os.environ.get('VITE_DEV_SERVER_URL', 'http://localhost:5173')
    VITE_MANIFEST_PATH = os.path.join(basedir, 'dist', 'manifest.json')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    SQLALCHEMY_ECHO = False  # Set True to see SQL queries


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True

    # Force HTTPS in production
    PREFERRED_URL_SCHEME = 'https'

    # Stronger security headers
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'

    # CRITICAL SECURITY: Validate SECRET_KEY in production
    @classmethod
    def init_app(cls, app):
        """Validate production configuration"""
        secret_key = app.config.get('SECRET_KEY')

        # Check if SECRET_KEY is the default weak value
        if not secret_key or secret_key == 'dev-secret-key-change-in-production':
            raise RuntimeError(
                "CRITICAL SECURITY ERROR: SECRET_KEY is not set or using default value!\n"
                "Generate a strong key with: python -c \"import secrets; print(secrets.token_hex(32))\"\n"
                "Then set it in your environment variables or .env file."
            )

        # Check if SECRET_KEY is strong enough (at least 32 characters)
        if len(secret_key) < 32:
            raise RuntimeError(
                f"CRITICAL SECURITY ERROR: SECRET_KEY is too short ({len(secret_key)} chars, minimum 32)!\n"
                "Generate a strong key with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
