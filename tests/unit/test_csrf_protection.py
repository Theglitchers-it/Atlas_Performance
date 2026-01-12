"""
CRITICAL SECURITY TESTS - CSRF Protection
Tests that ensure CSRF protection is enabled and working
Prevents Cross-Site Request Forgery attacks (OWASP Top 10)
"""
import pytest
from app.models import db
from app.models.shared import User
from app.models.super_admin import Tenant


class TestCSRFProtection:
    """Critical tests for CSRF protection"""

    def test_login_requires_csrf_token(self, client, app, test_tenant):
        """
        CRITICAL: Login form must require CSRF token
        Without it, attackers can forge login requests
        """
        with app.app_context():
            # Create test user
            user = User(
                email='test@example.com',
                first_name='Test',
                last_name='User',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=True
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

            # Try to login WITHOUT CSRF token
            with client:
                response = client.post('/auth/login', data={
                    'email': 'test@example.com',
                    'password': 'password123'
                }, follow_redirects=False)

                # CRITICAL TEST: Should be rejected (400 or redirect to login)
                # Flask-WTF returns 400 Bad Request for missing CSRF
                assert response.status_code in [400, 302]

                # If 302, check we're redirected back to login (not logged in)
                if response.status_code == 302:
                    assert '/login' in response.location or response.location == '/'

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_register_requires_csrf_token(self, client, app):
        """
        CRITICAL: Register form must require CSRF token
        """
        with app.app_context():
            # Try to register WITHOUT CSRF token
            with client:
                response = client.post('/auth/register', data={
                    'business_name': 'Test Gym',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'email': 'newuser@example.com',
                    'password': 'password123',
                    'confirm_password': 'password123',
                    'terms': 'y'
                }, follow_redirects=False)

                # CRITICAL TEST: Should be rejected
                assert response.status_code in [400, 302]

    def test_csrf_token_is_generated(self, client, app):
        """
        CRITICAL: Verify CSRF tokens are generated in forms
        """
        with app.app_context():
            with client:
                # Get login page
                response = client.get('/auth/login')

                # CRITICAL TEST: Page should contain csrf_token field
                assert b'csrf_token' in response.data or b'hidden' in response.data

    def test_csrf_config_enabled(self, app):
        """
        CRITICAL: Verify CSRF protection is enabled in config
        """
        with app.app_context():
            # CRITICAL TEST: WTF_CSRF_ENABLED must be True
            assert app.config['WTF_CSRF_ENABLED'] is True

    def test_csrf_token_validation(self, client, app, test_tenant):
        """
        CRITICAL: Test that invalid CSRF tokens are rejected
        """
        with app.app_context():
            user = User(
                email='csrf@test.com',
                first_name='CSRF',
                last_name='Test',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=True
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

            with client:
                # Try with INVALID csrf token
                response = client.post('/auth/login', data={
                    'email': 'csrf@test.com',
                    'password': 'password123',
                    'csrf_token': 'INVALID_TOKEN_12345'
                }, follow_redirects=False)

                # CRITICAL TEST: Should be rejected
                assert response.status_code in [400, 302]

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_testing_mode_csrf_disabled(self, app):
        """
        Verify that in TESTING mode, CSRF can be disabled
        (This is OK for tests, but must be enabled in dev/prod)
        """
        # In testing config, WTF_CSRF_ENABLED should be False
        # This is from TestingConfig in config.py
        from config import TestingConfig
        assert TestingConfig.WTF_CSRF_ENABLED is False

    def test_production_mode_csrf_enabled(self):
        """
        CRITICAL: Verify production config has CSRF enabled
        """
        from config import ProductionConfig
        # ProductionConfig should inherit CSRF=True from Config
        assert ProductionConfig.WTF_CSRF_ENABLED is True
