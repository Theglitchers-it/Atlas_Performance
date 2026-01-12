"""
Security Service
Provides input validation, sanitization, and security utilities
"""
import re
import bleach
import hmac
from flask import request, abort
from functools import wraps


class SecurityService:
    """Security utilities for input validation and sanitization"""

    # Allowed HTML tags for rich text (e.g., exercise descriptions)
    ALLOWED_TAGS = [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'
    ]

    ALLOWED_ATTRIBUTES = {
        'a': ['href', 'title'],
        '*': ['class']
    }

    @staticmethod
    def sanitize_html(text, allowed_tags=None, allowed_attributes=None):
        """
        Sanitize HTML content to prevent XSS attacks

        Args:
            text: HTML content to sanitize
            allowed_tags: List of allowed HTML tags (default: ALLOWED_TAGS)
            allowed_attributes: Dict of allowed attributes per tag

        Returns:
            Sanitized HTML string
        """
        if not text:
            return ''

        tags = allowed_tags or SecurityService.ALLOWED_TAGS
        attrs = allowed_attributes or SecurityService.ALLOWED_ATTRIBUTES

        return bleach.clean(
            text,
            tags=tags,
            attributes=attrs,
            strip=True
        )

    @staticmethod
    def sanitize_plain_text(text):
        """
        Remove all HTML tags from text

        Args:
            text: Text to sanitize

        Returns:
            Plain text without HTML
        """
        if not text:
            return ''

        return bleach.clean(text, tags=[], strip=True)

    @staticmethod
    def validate_email(email):
        """
        Validate email format

        Args:
            email: Email address to validate

        Returns:
            bool: True if valid email format
        """
        if not email:
            return False

        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_username(username):
        """
        Validate username format (alphanumeric, underscore, hyphen, 3-30 chars)

        Args:
            username: Username to validate

        Returns:
            bool: True if valid username
        """
        if not username:
            return False

        pattern = r'^[a-zA-Z0-9_-]{3,30}$'
        return bool(re.match(pattern, username))

    @staticmethod
    def validate_phone(phone):
        """
        Validate phone number (basic international format)

        Args:
            phone: Phone number to validate

        Returns:
            bool: True if valid phone format
        """
        if not phone:
            return False

        # Remove spaces, dashes, parentheses
        cleaned = re.sub(r'[\s\-\(\)]', '', phone)
        # Check if it's 10-15 digits with optional + prefix
        pattern = r'^\+?[0-9]{10,15}$'
        return bool(re.match(pattern, cleaned))

    @staticmethod
    def validate_url(url):
        """
        Validate URL format

        Args:
            url: URL to validate

        Returns:
            bool: True if valid URL
        """
        if not url:
            return False

        pattern = r'^https?://[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*(/.*)?$'
        return bool(re.match(pattern, url))

    @staticmethod
    def validate_integer(value, min_val=None, max_val=None):
        """
        Validate integer value with optional range

        Args:
            value: Value to validate
            min_val: Minimum allowed value
            max_val: Maximum allowed value

        Returns:
            bool: True if valid integer in range
        """
        try:
            int_val = int(value)
            if min_val is not None and int_val < min_val:
                return False
            if max_val is not None and int_val > max_val:
                return False
            return True
        except (ValueError, TypeError):
            return False

    @staticmethod
    def validate_float(value, min_val=None, max_val=None):
        """
        Validate float value with optional range

        Args:
            value: Value to validate
            min_val: Minimum allowed value
            max_val: Maximum allowed value

        Returns:
            bool: True if valid float in range
        """
        try:
            float_val = float(value)
            if min_val is not None and float_val < min_val:
                return False
            if max_val is not None and float_val > max_val:
                return False
            return True
        except (ValueError, TypeError):
            return False

    @staticmethod
    def validate_file_extension(filename, allowed_extensions):
        """
        Validate file extension

        Args:
            filename: Filename to validate
            allowed_extensions: Set of allowed extensions (without dot)

        Returns:
            bool: True if extension is allowed
        """
        if not filename or '.' not in filename:
            return False

        ext = filename.rsplit('.', 1)[1].lower()
        return ext in allowed_extensions

    @staticmethod
    def secure_filename(filename):
        """
        Make filename safe for filesystem storage

        Args:
            filename: Original filename

        Returns:
            Secure filename
        """
        # Remove path separators
        filename = filename.replace('/', '_').replace('\\', '_')
        # Keep only alphanumeric, dash, underscore, dot
        filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        # Remove leading dots (hidden files)
        filename = filename.lstrip('.')
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:255-len(ext)-1] + '.' + ext if ext else name[:255]

        return filename or 'unnamed_file'

    @staticmethod
    def validate_sql_injection(text):
        """
        Check for common SQL injection patterns (basic detection)
        Note: SQLAlchemy ORM provides the main protection

        Args:
            text: Text to check

        Returns:
            bool: True if no suspicious patterns detected
        """
        if not text:
            return True

        suspicious_patterns = [
            r"(\bUNION\b.*\bSELECT\b)",
            r"(\bDROP\b.*\bTABLE\b)",
            r"(\bINSERT\b.*\bINTO\b)",
            r"(\bDELETE\b.*\bFROM\b)",
            r"(\bUPDATE\b.*\bSET\b)",
            r"(--\s*$)",  # SQL comment
            r"(/\*.*\*/)",  # Multi-line comment
            r"(\bOR\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+)",  # OR 1=1
            r"(\bAND\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+)",  # AND 1=1
        ]

        text_upper = text.upper()
        for pattern in suspicious_patterns:
            if re.search(pattern, text_upper, re.IGNORECASE):
                return False

        return True

    @staticmethod
    def generate_csrf_token():
        """Generate CSRF token (Flask-WTF handles this automatically)"""
        from flask_wtf.csrf import generate_csrf
        return generate_csrf()

    @staticmethod
    def constant_time_compare(a, b):
        """
        Constant-time string comparison to prevent timing attacks

        Args:
            a: First string
            b: Second string

        Returns:
            bool: True if strings match
        """
        # Use hmac.compare_digest for constant-time comparison (Werkzeug 3.0+ compatible)
        # Convert to bytes for comparison
        a_bytes = str(a).encode('utf-8')
        b_bytes = str(b).encode('utf-8')
        return hmac.compare_digest(a_bytes, b_bytes)


def validate_api_key(f):
    """
    Decorator to validate API key for API endpoints

    Usage:
        @app.route('/api/endpoint')
        @validate_api_key
        def endpoint():
            return jsonify({'data': 'value'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            abort(401, description="API key required")

        # Validate API key (implement your logic here)
        # For now, this is a placeholder
        from flask import current_app
        expected_key = current_app.config.get('API_KEY')

        if not expected_key or not SecurityService.constant_time_compare(api_key, expected_key):
            abort(401, description="Invalid API key")

        return f(*args, **kwargs)

    return decorated_function


def require_https(f):
    """
    Decorator to require HTTPS for sensitive endpoints

    Usage:
        @app.route('/sensitive')
        @require_https
        def sensitive_endpoint():
            return "Secure data"
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import current_app

        if current_app.config.get('ENV') == 'production':
            if not request.is_secure:
                abort(403, description="HTTPS required")

        return f(*args, **kwargs)

    return decorated_function


def sanitize_request_data(data, allowed_keys=None):
    """
    Sanitize request data dictionary

    Args:
        data: Dictionary to sanitize
        allowed_keys: List of allowed keys (optional whitelist)

    Returns:
        Sanitized dictionary
    """
    if not data:
        return {}

    sanitized = {}

    for key, value in data.items():
        # Skip if not in whitelist
        if allowed_keys and key not in allowed_keys:
            continue

        # Sanitize string values
        if isinstance(value, str):
            sanitized[key] = SecurityService.sanitize_plain_text(value)
        else:
            sanitized[key] = value

    return sanitized
