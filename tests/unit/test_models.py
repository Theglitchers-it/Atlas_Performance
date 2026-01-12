"""
Unit Tests for Database Models
Tests model validation, relationships, and business logic
"""
import pytest
from datetime import datetime, timedelta
from app.models.shared import User, Tenant
from app.models.trainer import Athlete, Exercise, Workout, WorkoutExercise


class TestUserModel:
    """Tests for User model"""

    def test_create_user(self, app):
        """Test user creation"""
        with app.app_context():
            user = User(
                email='test@example.com',
                username='testuser',
                role='trainer'
            )
            user.set_password('password123')

            assert user.email == 'test@example.com'
            assert user.username == 'testuser'
            assert user.role == 'trainer'
            assert user.check_password('password123')

    def test_password_hashing(self, app):
        """Test password hashing"""
        with app.app_context():
            user = User(email='test@example.com', username='test')
            user.set_password('securepassword')

            assert user.password_hash != 'securepassword'
            assert user.check_password('securepassword')
            assert not user.check_password('wrongpassword')

    def test_user_roles(self, app):
        """Test user role validation"""
        with app.app_context():
            admin = User(email='admin@test.com', username='admin', role='super_admin')
            trainer = User(email='trainer@test.com', username='trainer', role='trainer')
            athlete = User(email='athlete@test.com', username='athlete', role='athlete')

            assert admin.role == 'super_admin'
            assert trainer.role == 'trainer'
            assert athlete.role == 'athlete'

    def test_email_validation(self, app):
        """Test email validation"""
        from app.services.security_service import SecurityService

        assert SecurityService.validate_email('valid@example.com')
        assert SecurityService.validate_email('user.name+tag@example.co.uk')
        assert not SecurityService.validate_email('invalid.email')
        assert not SecurityService.validate_email('@example.com')
        assert not SecurityService.validate_email('user@')


class TestTenantModel:
    """Tests for Tenant model"""

    def test_create_tenant(self, app):
        """Test tenant creation"""
        with app.app_context():
            from app.models import db

            tenant = Tenant(
                business_name='Test Gym',
                subscription_tier='pro',
                subscription_status='active',
                max_athletes=50
            )
            db.session.add(tenant)
            db.session.commit()

            assert tenant.business_name == 'Test Gym'
            assert tenant.subscription_tier == 'pro'
            assert tenant.max_athletes == 50

    def test_subscription_tiers(self, app):
        """Test different subscription tiers"""
        with app.app_context():
            from app.models import db

            starter = Tenant(
                business_name='Starter Gym',
                subscription_tier='starter',
                max_athletes=10
            )
            pro = Tenant(
                business_name='Pro Gym',
                subscription_tier='pro',
                max_athletes=50
            )
            enterprise = Tenant(
                business_name='Enterprise Gym',
                subscription_tier='enterprise',
                max_athletes=999
            )

            db.session.add_all([starter, pro, enterprise])
            db.session.commit()

            assert starter.max_athletes == 10
            assert pro.max_athletes == 50
            assert enterprise.max_athletes == 999


class TestAthleteModel:
    """Tests for Athlete model"""

    def test_create_athlete(self, app, test_tenant):
        """Test athlete creation"""
        with app.app_context():
            from app.models import db

            athlete = Athlete(
                first_name='John',
                last_name='Doe',
                email='john@example.com',
                tenant_id=test_tenant.id
            )
            db.session.add(athlete)
            db.session.commit()

            assert athlete.first_name == 'John'
            assert athlete.full_name == 'John Doe'
            assert athlete.tenant_id == test_tenant.id

    def test_athlete_full_name(self, app):
        """Test full name property"""
        with app.app_context():
            athlete = Athlete(first_name='Jane', last_name='Smith')
            assert athlete.full_name == 'Jane Smith'


class TestExerciseModel:
    """Tests for Exercise model"""

    def test_create_exercise(self, app, test_tenant):
        """Test exercise creation"""
        with app.app_context():
            from app.models import db

            exercise = Exercise(
                name='Bench Press',
                category='chest',
                equipment='barbell',
                difficulty='intermediate',
                tenant_id=test_tenant.id
            )
            db.session.add(exercise)
            db.session.commit()

            assert exercise.name == 'Bench Press'
            assert exercise.category == 'chest'
            assert exercise.difficulty == 'intermediate'


class TestWorkoutModel:
    """Tests for Workout model"""

    def test_create_workout(self, app, test_tenant, athlete_user):
        """Test workout creation"""
        with app.app_context():
            from app.models import db
            from app.models.trainer import Athlete

            athlete = Athlete(
                first_name='Test',
                last_name='Athlete',
                email='athlete@test.com',
                tenant_id=test_tenant.id
            )
            db.session.add(athlete)
            db.session.commit()

            workout = Workout(
                name='Upper Body Day',
                athlete_id=athlete.id,
                tenant_id=test_tenant.id,
                scheduled_date=datetime.utcnow()
            )
            db.session.add(workout)
            db.session.commit()

            assert workout.name == 'Upper Body Day'
            assert workout.athlete_id == athlete.id


class TestProgressionAlgorithm:
    """Tests for progression algorithm logic"""

    def test_weight_progression_increase(self, app):
        """Test weight increase when athlete performs well"""
        from app.services.progression_algorithm import ProgressionAlgorithm

        result = ProgressionAlgorithm.calculate_next_weight(
            current_weight=100,
            reps_completed=10,
            reps_target=10,
            rpe=7  # Low RPE = can increase
        )

        # Should increase by ~2.5%
        assert result['next_weight'] > 100
        assert result['recommendation'] == 'increase'

    def test_weight_progression_maintain(self, app):
        """Test weight maintenance when athlete struggles"""
        from app.services.progression_algorithm import ProgressionAlgorithm

        result = ProgressionAlgorithm.calculate_next_weight(
            current_weight=100,
            reps_completed=8,
            reps_target=10,
            rpe=9  # High RPE = too hard
        )

        # Should maintain or decrease
        assert result['next_weight'] <= 100
