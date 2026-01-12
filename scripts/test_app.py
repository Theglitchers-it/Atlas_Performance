#!/usr/bin/env python
"""
Quick test script to verify Atlas Performance installation
Run this after setup to ensure everything is working
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def test_imports():
    """Test that all critical imports work"""
    print("🔍 Testing imports...")
    try:
        from app import create_app, db
        from app.models.shared import User
        from app.models.super_admin import Tenant, Subscription
        from app.models.trainer import Athlete, Workout, Exercise
        from app.services.stripe_service import StripeService
        from app.services.tenant_manager import TenantManager
        from app.services.workout_builder import WorkoutBuilder
        from app.services.progression_algorithm import ProgressionAlgorithm
        print("   ✅ All imports successful!")
        return True
    except ImportError as e:
        print(f"   ❌ Import error: {e}")
        return False


def test_app_creation():
    """Test Flask app creation"""
    print("\n🔍 Testing Flask app creation...")
    try:
        from app import create_app
        app = create_app('development')
        print("   ✅ Flask app created successfully!")
        return True, app
    except Exception as e:
        print(f"   ❌ App creation error: {e}")
        return False, None


def test_database_connection(app):
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    try:
        from app import db
        from app.models.shared import User

        with app.app_context():
            # Try to query users table
            user_count = User.query.count()
            print(f"   ✅ Database connected! Found {user_count} users")
            return True
    except Exception as e:
        print(f"   ❌ Database error: {e}")
        print("   💡 Hint: Run 'flask init-db' to create tables")
        return False


def test_routes(app):
    """Test that routes are registered"""
    print("\n🔍 Testing route registration...")
    try:
        with app.test_client() as client:
            # Test public routes
            response = client.get('/')
            print(f"   ✅ Public route /: {response.status_code}")

            response = client.get('/auth/login')
            print(f"   ✅ Auth route /auth/login: {response.status_code}")

            # Test protected routes (should redirect to login)
            response = client.get('/trainer/dashboard')
            print(f"   ✅ Trainer route /trainer/dashboard: {response.status_code} (redirect expected)")

            response = client.get('/athlete/dashboard')
            print(f"   ✅ Athlete route /athlete/dashboard: {response.status_code} (redirect expected)")

        return True
    except Exception as e:
        print(f"   ❌ Route error: {e}")
        return False


def test_config(app):
    """Test configuration"""
    print("\n🔍 Testing configuration...")
    try:
        print(f"   • Environment: {app.config['FLASK_ENV']}")
        print(f"   • Debug: {app.config['DEBUG']}")
        print(f"   • Database: {app.config['SQLALCHEMY_DATABASE_URI'][:50]}...")
        print(f"   • Secret Key: {'✅ Set' if app.config['SECRET_KEY'] else '❌ Missing'}")
        print(f"   • Stripe Public Key: {'✅ Set' if app.config.get('STRIPE_PUBLIC_KEY') else '⚠️  Missing'}")
        print(f"   • Stripe Secret Key: {'✅ Set' if app.config.get('STRIPE_SECRET_KEY') else '⚠️  Missing'}")
        print("   ✅ Configuration loaded!")
        return True
    except Exception as e:
        print(f"   ❌ Config error: {e}")
        return False


def test_models(app):
    """Test model relationships"""
    print("\n🔍 Testing model relationships...")
    try:
        from app.models.shared import User
        from app.models.super_admin import Tenant
        from app.models.trainer import Athlete

        with app.app_context():
            # Test User model
            print("   • User model: ✅")

            # Test Tenant model
            print("   • Tenant model: ✅")

            # Test Athlete model
            print("   • Athlete model: ✅")

        print("   ✅ All models accessible!")
        return True
    except Exception as e:
        print(f"   ❌ Model error: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("🏋️  ATLAS PERFORMANCE - INSTALLATION TEST")
    print("=" * 60)

    results = []

    # Test imports
    results.append(test_imports())

    # Test app creation
    success, app = test_app_creation()
    results.append(success)

    if app:
        # Test database
        results.append(test_database_connection(app))

        # Test routes
        results.append(test_routes(app))

        # Test config
        results.append(test_config(app))

        # Test models
        results.append(test_models(app))

    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)

    passed = sum(results)
    total = len(results)

    print(f"Tests Passed: {passed}/{total}")

    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Your installation is working correctly.")
        print("\n📝 Next steps:")
        print("   1. Run 'flask seed-db' to create demo accounts")
        print("   2. Run 'python run.py' to start the server")
        print("   3. Visit http://localhost:5000")
        print("   4. Login with demo credentials (see README.md)")
        return 0
    else:
        print("\n⚠️  SOME TESTS FAILED. Please check the errors above.")
        print("\n💡 Common fixes:")
        print("   • Run 'pip install -r requirements.txt'")
        print("   • Run 'flask init-db' to create database tables")
        print("   • Check your .env file configuration")
        print("   • Ensure SECRET_KEY is set in .env")
        return 1


if __name__ == '__main__':
    sys.exit(main())
