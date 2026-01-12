"""
Unit Tests for Services
Tests business logic in service layer
"""
import pytest
from app.services.security_service import SecurityService
from app.services.image_optimizer import ImageOptimizer
from app.services.cache_service import CacheService


class TestSecurityService:
    """Tests for Security Service"""

    def test_sanitize_html(self):
        """Test HTML sanitization"""
        dirty_html = '<script>alert("XSS")</script><p>Safe content</p>'
        clean = SecurityService.sanitize_html(dirty_html)

        assert '<script>' not in clean
        assert '<p>Safe content</p>' in clean

    def test_sanitize_plain_text(self):
        """Test plain text sanitization"""
        html = '<p>This is <strong>bold</strong> text</p>'
        plain = SecurityService.sanitize_plain_text(html)

        assert '<p>' not in plain
        assert '<strong>' not in plain
        assert 'This is bold text' in plain

    def test_validate_email(self):
        """Test email validation"""
        assert SecurityService.validate_email('user@example.com')
        assert SecurityService.validate_email('test.user+tag@example.co.uk')
        assert not SecurityService.validate_email('invalid')
        assert not SecurityService.validate_email('@example.com')
        assert not SecurityService.validate_email('user@')

    def test_validate_username(self):
        """Test username validation"""
        assert SecurityService.validate_username('john_doe')
        assert SecurityService.validate_username('user123')
        assert SecurityService.validate_username('test-user')
        assert not SecurityService.validate_username('ab')  # Too short
        assert not SecurityService.validate_username('user@name')  # Invalid char

    def test_validate_phone(self):
        """Test phone number validation"""
        assert SecurityService.validate_phone('+393401234567')
        assert SecurityService.validate_phone('3401234567')
        assert SecurityService.validate_phone('+1 (555) 123-4567')
        assert not SecurityService.validate_phone('123')  # Too short
        assert not SecurityService.validate_phone('abcdefghij')  # Not a number

    def test_validate_integer(self):
        """Test integer validation"""
        assert SecurityService.validate_integer(10)
        assert SecurityService.validate_integer('25')
        assert SecurityService.validate_integer(50, min_val=0, max_val=100)
        assert not SecurityService.validate_integer(150, min_val=0, max_val=100)
        assert not SecurityService.validate_integer('abc')

    def test_validate_float(self):
        """Test float validation"""
        assert SecurityService.validate_float(10.5)
        assert SecurityService.validate_float('25.75')
        assert SecurityService.validate_float(50.0, min_val=0.0, max_val=100.0)
        assert not SecurityService.validate_float(150.5, min_val=0.0, max_val=100.0)

    def test_validate_file_extension(self):
        """Test file extension validation"""
        allowed = {'jpg', 'png', 'gif'}

        assert SecurityService.validate_file_extension('photo.jpg', allowed)
        assert SecurityService.validate_file_extension('image.PNG', allowed)
        assert not SecurityService.validate_file_extension('document.pdf', allowed)
        assert not SecurityService.validate_file_extension('noextension', allowed)

    def test_secure_filename(self):
        """Test filename sanitization"""
        assert SecurityService.secure_filename('my file.txt') == 'my_file.txt'
        assert SecurityService.secure_filename('../../../etc/passwd') == '______etc_passwd'
        assert SecurityService.secure_filename('user@photo.jpg') == 'user_photo.jpg'

    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection"""
        assert SecurityService.validate_sql_injection('Normal text')
        assert SecurityService.validate_sql_injection('User input 123')
        assert not SecurityService.validate_sql_injection("' OR '1'='1")
        assert not SecurityService.validate_sql_injection('DROP TABLE users')
        assert not SecurityService.validate_sql_injection('UNION SELECT * FROM users')

    def test_constant_time_compare(self):
        """Test constant-time string comparison"""
        assert SecurityService.constant_time_compare('secret', 'secret')
        assert not SecurityService.constant_time_compare('secret', 'wrong')
        assert SecurityService.constant_time_compare('123', '123')


class TestCacheService:
    """Tests for Cache Service"""

    def test_get_cache_key(self):
        """Test cache key generation"""
        key = CacheService.get_cache_key('user', 123, action='view')

        assert 'user' in key
        assert '123' in key
        assert 'action:view' in key

    def test_cache_key_consistency(self):
        """Test that same inputs produce same cache key"""
        key1 = CacheService.get_cache_key('workout', 456, tenant_id=1)
        key2 = CacheService.get_cache_key('workout', 456, tenant_id=1)

        assert key1 == key2


class TestImageOptimizer:
    """Tests for Image Optimizer"""

    def test_asset_type_detection(self):
        """Test detecting asset type from filename"""
        from app.services.cdn_service import CDNService

        assert CDNService.get_asset_type('photo.jpg') == 'images'
        assert CDNService.get_asset_type('style.css') == 'css'
        assert CDNService.get_asset_type('script.js') == 'js'
        assert CDNService.get_asset_type('video.mp4') == 'videos'
        assert CDNService.get_asset_type('font.woff2') == 'fonts'

    def test_image_size_presets(self):
        """Test image size presets"""
        sizes = ImageOptimizer.IMAGE_SIZES

        assert 'thumbnail' in sizes
        assert 'small' in sizes
        assert 'medium' in sizes
        assert 'large' in sizes
        assert sizes['thumbnail'] == (150, 150)
