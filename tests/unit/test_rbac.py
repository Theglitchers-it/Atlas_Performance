"""
CRITICAL SECURITY TESTS - Role-Based Access Control (RBAC)
Tests that enforce proper authorization for different user roles
Prevents privilege escalation and unauthorized access
"""
import pytest
from flask import url_for
from app.models import db
from app.models.shared import User
from app.models.super_admin import Tenant
from app.models.trainer import Athlete


class TestRBACAuthorization:
    """Critical tests for role-based access control"""

    def test_athlete_cannot_access_trainer_dashboard(self, client, app, test_tenant):
        """
        CRITICAL: Athletes should be blocked from trainer-only pages
        """
        with app.app_context():
            # Create athlete user
            athlete_user = User(
                email='athlete@test.com',
                first_name='Athlete',
                last_name='Test',
                role='athlete',
                tenant_id=test_tenant.id,
                is_active=True
            )
            athlete_user.set_password('password123')
            db.session.add(athlete_user)
            db.session.commit()

            # Login as athlete
            with client:
                client.post('/auth/login', data={
                    'email': 'athlete@test.com',
                    'password': 'password123'
                }, follow_redirects=True)

                # Try to access trainer dashboard
                response = client.get('/trainer/dashboard')

                # CRITICAL TEST: Should be redirected or get 403
                assert response.status_code in [302, 403]

            # Cleanup
            db.session.delete(athlete_user)
            db.session.commit()

    def test_trainer_cannot_access_super_admin_panel(self, client, app, test_tenant):
        """
        CRITICAL: Trainers should be blocked from super admin panel
        """
        with app.app_context():
            # Create trainer user
            trainer_user = User(
                email='trainer@test.com',
                first_name='Trainer',
                last_name='Test',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=True
            )
            trainer_user.set_password('password123')
            db.session.add(trainer_user)
            db.session.commit()

            # Login as trainer
            with client:
                client.post('/auth/login', data={
                    'email': 'trainer@test.com',
                    'password': 'password123'
                }, follow_redirects=True)

                # Try to access super admin panel
                response = client.get('/super-admin/dashboard')

                # CRITICAL TEST: Should be redirected or get 403
                assert response.status_code in [302, 403]

            # Cleanup
            db.session.delete(trainer_user)
            db.session.commit()

    def test_athlete_cannot_access_other_athletes_data(self, client, app, test_tenant):
        """
        CRITICAL: Athletes can only access their own data
        """
        with app.app_context():
            # Create trainer
            trainer = User(
                email='trainer@test.com',
                first_name='Trainer',
                last_name='Test',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=True
            )
            trainer.set_password('password123')
            db.session.add(trainer)
            db.session.flush()

            # Create athlete1
            athlete1_user = User(
                email='athlete1@test.com',
                first_name='Athlete',
                last_name='One',
                role='athlete',
                tenant_id=test_tenant.id,
                is_active=True
            )
            athlete1_user.set_password('password123')
            db.session.add(athlete1_user)
            db.session.flush()

            athlete1 = Athlete(
                tenant_id=test_tenant.id,
                user_id=athlete1_user.id,
                trainer_id=trainer.id,
                is_active=True
            )
            db.session.add(athlete1)

            # Create athlete2
            athlete2_user = User(
                email='athlete2@test.com',
                first_name='Athlete',
                last_name='Two',
                role='athlete',
                tenant_id=test_tenant.id,
                is_active=True
            )
            athlete2_user.set_password('password123')
            db.session.add(athlete2_user)
            db.session.flush()

            athlete2 = Athlete(
                tenant_id=test_tenant.id,
                user_id=athlete2_user.id,
                trainer_id=trainer.id,
                is_active=True
            )
            db.session.add(athlete2)
            db.session.commit()

            # Login as athlete1
            with client:
                client.post('/auth/login', data={
                    'email': 'athlete1@test.com',
                    'password': 'password123'
                }, follow_redirects=True)

                # Try to access athlete2's profile
                response = client.get(f'/athlete/profile/{athlete2.id}')

                # CRITICAL TEST: Should be denied
                assert response.status_code in [302, 403, 404]

            # Cleanup
            db.session.delete(athlete1)
            db.session.delete(athlete2)
            db.session.delete(athlete1_user)
            db.session.delete(athlete2_user)
            db.session.delete(trainer)
            db.session.commit()

    def test_user_role_methods(self, app, test_tenant):
        """
        Test User role checking methods
        """
        with app.app_context():
            # Create super admin
            super_admin = User(
                email='admin@test.com',
                first_name='Admin',
                last_name='Test',
                role='super_admin',
                is_active=True
            )
            super_admin.set_password('password123')
            db.session.add(super_admin)

            # Create trainer
            trainer = User(
                email='trainer@test.com',
                first_name='Trainer',
                last_name='Test',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=True
            )
            trainer.set_password('password123')
            db.session.add(trainer)

            # Create athlete
            athlete = User(
                email='athlete@test.com',
                first_name='Athlete',
                last_name='Test',
                role='athlete',
                tenant_id=test_tenant.id,
                is_active=True
            )
            athlete.set_password('password123')
            db.session.add(athlete)
            db.session.commit()

            # CRITICAL TEST: Super admin checks
            assert super_admin.is_super_admin() is True
            assert super_admin.is_trainer() is False
            assert super_admin.is_athlete() is False

            # CRITICAL TEST: Trainer checks
            assert trainer.is_super_admin() is False
            assert trainer.is_trainer() is True
            assert trainer.is_athlete() is False

            # CRITICAL TEST: Athlete checks
            assert athlete.is_super_admin() is False
            assert athlete.is_trainer() is False
            assert athlete.is_athlete() is True

            # Cleanup
            db.session.delete(super_admin)
            db.session.delete(trainer)
            db.session.delete(athlete)
            db.session.commit()

    def test_inactive_user_cannot_login(self, client, app, test_tenant):
        """
        CRITICAL: Inactive users should not be able to login
        """
        with app.app_context():
            # Create inactive user
            inactive_user = User(
                email='inactive@test.com',
                first_name='Inactive',
                last_name='User',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=False  # Inactive
            )
            inactive_user.set_password('password123')
            db.session.add(inactive_user)
            db.session.commit()

            # Try to login
            with client:
                response = client.post('/auth/login', data={
                    'email': 'inactive@test.com',
                    'password': 'password123'
                }, follow_redirects=True)

                # CRITICAL TEST: Should be denied
                # Check if we're still on login page or got error message
                assert b'inactive' in response.data.lower() or b'disabled' in response.data.lower() or response.request.path == '/auth/login'

            # Cleanup
            db.session.delete(inactive_user)
            db.session.commit()

    def test_super_admin_has_no_tenant(self, app):
        """
        CRITICAL: Super admins should NOT have a tenant_id
        """
        with app.app_context():
            super_admin = User(
                email='admin@test.com',
                first_name='Admin',
                last_name='Test',
                role='super_admin',
                tenant_id=None,  # Should be NULL
                is_active=True
            )
            super_admin.set_password('password123')
            db.session.add(super_admin)
            db.session.commit()

            # CRITICAL TEST: Super admin tenant_id must be None
            assert super_admin.tenant_id is None
            assert super_admin.is_super_admin() is True

            # Cleanup
            db.session.delete(super_admin)
            db.session.commit()

    def test_trainer_and_athlete_must_have_tenant(self, app, test_tenant):
        """
        CRITICAL: Trainers and athletes MUST have a tenant_id
        """
        with app.app_context():
            # Trainer with tenant
            trainer = User(
                email='trainer@test.com',
                first_name='Trainer',
                last_name='Test',
                role='trainer',
                tenant_id=test_tenant.id,
                is_active=True
            )
            trainer.set_password('password123')
            db.session.add(trainer)

            # Athlete with tenant
            athlete = User(
                email='athlete@test.com',
                first_name='Athlete',
                last_name='Test',
                role='athlete',
                tenant_id=test_tenant.id,
                is_active=True
            )
            athlete.set_password('password123')
            db.session.add(athlete)
            db.session.commit()

            # CRITICAL TEST: Trainer and athlete must have tenant
            assert trainer.tenant_id is not None
            assert athlete.tenant_id is not None
            assert trainer.tenant_id == test_tenant.id
            assert athlete.tenant_id == test_tenant.id

            # Cleanup
            db.session.delete(trainer)
            db.session.delete(athlete)
            db.session.commit()

    def test_password_hashing_is_secure(self, app):
        """
        CRITICAL: Passwords must be hashed, never stored in plain text
        """
        with app.app_context():
            user = User(
                email='test@test.com',
                first_name='Test',
                last_name='User',
                role='trainer',
                is_active=True
            )
            plaintext_password = 'SuperSecret123!'
            user.set_password(plaintext_password)
            db.session.add(user)
            db.session.commit()

            # CRITICAL TEST: Password hash should NOT equal plaintext
            assert user.password_hash != plaintext_password

            # CRITICAL TEST: Password hash should be long (hashed)
            assert len(user.password_hash) > 50

            # CRITICAL TEST: check_password should work
            assert user.check_password(plaintext_password) is True
            assert user.check_password('WrongPassword') is False

            # Cleanup
            db.session.delete(user)
            db.session.commit()
