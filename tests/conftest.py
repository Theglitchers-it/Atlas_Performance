"""
Pytest configuration and fixtures
Shared test fixtures for all test modules
"""
import pytest
import os
import tempfile
from app import create_app
from app.models import db
from app.models.shared import User
from app.models.super_admin import Tenant


@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    # Create temporary database
    db_fd, db_path = tempfile.mkstemp()

    # Configure app for testing
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key'
    })

    # Create database tables
    with app.app_context():
        db.create_all()

    yield app

    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create CLI test runner"""
    return app.test_cli_runner()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for testing"""
    with app.app_context():
        # Begin transaction
        connection = db.engine.connect()
        transaction = connection.begin()

        # Bind session to connection
        session = db.session
        session.begin_nested()

        yield session

        # Rollback transaction
        session.remove()
        transaction.rollback()
        connection.close()


@pytest.fixture
def super_admin_user(app):
    """Create super admin user for testing"""
    with app.app_context():
        user = User(
            email='admin@test.com',
            first_name='Admin',
            last_name='Test',
            role='super_admin',
            is_active=True,
            email_verified=True
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

        yield user

        # Cleanup
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def trainer_user(app, test_tenant):
    """Create trainer user for testing"""
    with app.app_context():
        user = User(
            email='trainer@test.com',
            first_name='Trainer',
            last_name='Test',
            role='trainer',
            tenant_id=test_tenant.id,
            is_active=True,
            email_verified=True
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

        yield user

        # Cleanup
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def athlete_user(app, test_tenant):
    """Create athlete user for testing"""
    with app.app_context():
        user = User(
            email='athlete@test.com',
            first_name='Athlete',
            last_name='Test',
            role='athlete',
            tenant_id=test_tenant.id,
            is_active=True,
            email_verified=True
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

        yield user

        # Cleanup
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def test_tenant(app):
    """Create test tenant"""
    with app.app_context():
        tenant = Tenant(
            name='Test Gym',
            subdomain='testgym',
            subscription_tier='pro',
            subscription_status='active',
            max_athletes=50,
            is_active=True
        )
        db.session.add(tenant)
        db.session.commit()

        yield tenant

        # Cleanup
        db.session.delete(tenant)
        db.session.commit()


@pytest.fixture
def authenticated_client(client, trainer_user):
    """Create authenticated client for trainer"""
    with client:
        # Login
        client.post('/auth/login', data={
            'email': 'trainer@test.com',
            'password': 'password123'
        })

        yield client


@pytest.fixture
def auth_headers(trainer_user):
    """Get authentication headers for API requests"""
    # For token-based auth (if implemented)
    return {
        'Authorization': f'Bearer {trainer_user.id}',
        'Content-Type': 'application/json'
    }


# Utility fixtures

@pytest.fixture
def temp_upload_dir(app):
    """Create temporary upload directory"""
    with tempfile.TemporaryDirectory() as tmpdir:
        app.config['UPLOAD_FOLDER'] = tmpdir
        yield tmpdir


@pytest.fixture
def mock_stripe(monkeypatch):
    """Mock Stripe API calls"""
    class MockStripe:
        @staticmethod
        def Customer(*args, **kwargs):
            return type('obj', (object,), {'id': 'cus_test123'})

        @staticmethod
        def Subscription(*args, **kwargs):
            return type('obj', (object,), {
                'id': 'sub_test123',
                'status': 'active'
            })

    monkeypatch.setattr('stripe.Customer', MockStripe.Customer)
    monkeypatch.setattr('stripe.Subscription', MockStripe.Subscription)

    yield MockStripe


# Performance testing fixtures

@pytest.fixture
def performance_timer():
    """Timer for performance testing"""
    import time

    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None

        def start(self):
            self.start_time = time.time()

        def stop(self):
            self.end_time = time.time()

        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None

    return Timer()
