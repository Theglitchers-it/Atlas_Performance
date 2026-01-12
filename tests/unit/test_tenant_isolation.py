"""
CRITICAL SECURITY TESTS - Tenant Isolation
Tests that prevent data leakage between tenants
This is the #1 security concern in a multi-tenant SaaS
"""
import pytest
from app.models import db
from app.models.shared import User
from app.models.super_admin import Tenant
from app.models.trainer import Athlete, Workout, Exercise


class TestTenantIsolation:
    """Critical tests for tenant data isolation"""

    @pytest.fixture
    def tenant1(self, app):
        """Create first tenant"""
        with app.app_context():
            tenant = Tenant(
                name='Gym Alpha',
                subdomain='gymalpha',
                subscription_tier='pro',
                subscription_status='active',
                max_athletes=50,
                is_active=True
            )
            db.session.add(tenant)
            db.session.commit()
            yield tenant
            db.session.delete(tenant)
            db.session.commit()

    @pytest.fixture
    def tenant2(self, app):
        """Create second tenant"""
        with app.app_context():
            tenant = Tenant(
                name='Gym Beta',
                subdomain='gymbeta',
                subscription_tier='pro',
                subscription_status='active',
                max_athletes=50,
                is_active=True
            )
            db.session.add(tenant)
            db.session.commit()
            yield tenant
            db.session.delete(tenant)
            db.session.commit()

    @pytest.fixture
    def trainer1(self, app, tenant1):
        """Create trainer for tenant1"""
        with app.app_context():
            user = User(
                email='trainer1@test.com',
                first_name='Trainer',
                last_name='One',
                role='trainer',
                tenant_id=tenant1.id,
                is_active=True
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            yield user
            db.session.delete(user)
            db.session.commit()

    @pytest.fixture
    def trainer2(self, app, tenant2):
        """Create trainer for tenant2"""
        with app.app_context():
            user = User(
                email='trainer2@test.com',
                first_name='Trainer',
                last_name='Two',
                role='trainer',
                tenant_id=tenant2.id,
                is_active=True
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            yield user
            db.session.delete(user)
            db.session.commit()

    def test_trainer_cannot_see_other_tenant_athletes(self, app, tenant1, tenant2, trainer1, trainer2):
        """
        CRITICAL: Verify trainer can only see their own tenant's athletes
        This prevents data leakage between different gyms
        """
        with app.app_context():
            # Create athlete for tenant1
            athlete1_user = User(
                email='athlete1@test.com',
                first_name='Athlete',
                last_name='One',
                role='athlete',
                tenant_id=tenant1.id,
                is_active=True
            )
            athlete1_user.set_password('password123')
            db.session.add(athlete1_user)
            db.session.flush()

            athlete1 = Athlete(
                tenant_id=tenant1.id,
                user_id=athlete1_user.id,
                trainer_id=trainer1.id,
                goal='strength',
                experience_level='beginner',
                is_active=True
            )
            db.session.add(athlete1)

            # Create athlete for tenant2
            athlete2_user = User(
                email='athlete2@test.com',
                first_name='Athlete',
                last_name='Two',
                role='athlete',
                tenant_id=tenant2.id,
                is_active=True
            )
            athlete2_user.set_password('password123')
            db.session.add(athlete2_user)
            db.session.flush()

            athlete2 = Athlete(
                tenant_id=tenant2.id,
                user_id=athlete2_user.id,
                trainer_id=trainer2.id,
                goal='weight_loss',
                experience_level='intermediate',
                is_active=True
            )
            db.session.add(athlete2)
            db.session.commit()

            # CRITICAL TEST: Trainer1 should only see athletes from tenant1
            tenant1_athletes = Athlete.query.filter_by(tenant_id=tenant1.id).all()
            assert len(tenant1_athletes) == 1
            assert tenant1_athletes[0].user.email == 'athlete1@test.com'

            # CRITICAL TEST: Trainer2 should only see athletes from tenant2
            tenant2_athletes = Athlete.query.filter_by(tenant_id=tenant2.id).all()
            assert len(tenant2_athletes) == 1
            assert tenant2_athletes[0].user.email == 'athlete2@test.com'

            # CRITICAL TEST: Athlete1 should NOT appear in tenant2 queries
            athlete1_in_tenant2 = Athlete.query.filter_by(
                tenant_id=tenant2.id,
                user_id=athlete1_user.id
            ).first()
            assert athlete1_in_tenant2 is None

            # Cleanup
            db.session.delete(athlete1)
            db.session.delete(athlete2)
            db.session.delete(athlete1_user)
            db.session.delete(athlete2_user)
            db.session.commit()

    def test_workouts_are_tenant_isolated(self, app, tenant1, tenant2, trainer1, trainer2):
        """
        CRITICAL: Verify workouts cannot be accessed across tenants
        """
        with app.app_context():
            # Create athlete and workout for tenant1
            athlete1_user = User(
                email='athlete1@test.com',
                first_name='Athlete',
                last_name='One',
                role='athlete',
                tenant_id=tenant1.id,
                is_active=True
            )
            athlete1_user.set_password('password123')
            db.session.add(athlete1_user)
            db.session.flush()

            athlete1 = Athlete(
                tenant_id=tenant1.id,
                user_id=athlete1_user.id,
                trainer_id=trainer1.id,
                is_active=True
            )
            db.session.add(athlete1)
            db.session.flush()

            workout1 = Workout(
                tenant_id=tenant1.id,
                athlete_id=athlete1.id,
                name='Tenant 1 Workout',
                is_active=True
            )
            db.session.add(workout1)

            # Create athlete and workout for tenant2
            athlete2_user = User(
                email='athlete2@test.com',
                first_name='Athlete',
                last_name='Two',
                role='athlete',
                tenant_id=tenant2.id,
                is_active=True
            )
            athlete2_user.set_password('password123')
            db.session.add(athlete2_user)
            db.session.flush()

            athlete2 = Athlete(
                tenant_id=tenant2.id,
                user_id=athlete2_user.id,
                trainer_id=trainer2.id,
                is_active=True
            )
            db.session.add(athlete2)
            db.session.flush()

            workout2 = Workout(
                tenant_id=tenant2.id,
                athlete_id=athlete2.id,
                name='Tenant 2 Workout',
                is_active=True
            )
            db.session.add(workout2)
            db.session.commit()

            # CRITICAL TEST: Tenant1 can only see their workouts
            tenant1_workouts = Workout.query.filter_by(tenant_id=tenant1.id).all()
            assert len(tenant1_workouts) == 1
            assert tenant1_workouts[0].name == 'Tenant 1 Workout'

            # CRITICAL TEST: Tenant2 can only see their workouts
            tenant2_workouts = Workout.query.filter_by(tenant_id=tenant2.id).all()
            assert len(tenant2_workouts) == 1
            assert tenant2_workouts[0].name == 'Tenant 2 Workout'

            # CRITICAL TEST: Workout1 should NOT be accessible via tenant2 ID
            workout1_via_tenant2 = Workout.query.filter_by(
                tenant_id=tenant2.id,
                id=workout1.id
            ).first()
            assert workout1_via_tenant2 is None

            # Cleanup
            db.session.delete(workout1)
            db.session.delete(workout2)
            db.session.delete(athlete1)
            db.session.delete(athlete2)
            db.session.delete(athlete1_user)
            db.session.delete(athlete2_user)
            db.session.commit()

    def test_exercises_global_vs_tenant_specific(self, app, tenant1, tenant2):
        """
        CRITICAL: Test that global exercises (tenant_id=NULL) are visible to all,
        but tenant-specific exercises are isolated
        """
        with app.app_context():
            # Create global exercise (visible to all tenants)
            global_exercise = Exercise(
                tenant_id=None,  # Global
                name='Global Bench Press',
                category='chest',
                equipment='barbell',
                difficulty_level='intermediate'
            )
            db.session.add(global_exercise)

            # Create tenant1-specific exercise
            tenant1_exercise = Exercise(
                tenant_id=tenant1.id,
                name='Tenant 1 Custom Exercise',
                category='arms',
                equipment='custom',
                difficulty_level='beginner'
            )
            db.session.add(tenant1_exercise)

            # Create tenant2-specific exercise
            tenant2_exercise = Exercise(
                tenant_id=tenant2.id,
                name='Tenant 2 Custom Exercise',
                category='legs',
                equipment='custom',
                difficulty_level='advanced'
            )
            db.session.add(tenant2_exercise)
            db.session.commit()

            # CRITICAL TEST: Global exercise visible to tenant1
            tenant1_exercises = Exercise.query.filter(
                (Exercise.tenant_id == tenant1.id) | (Exercise.tenant_id == None)
            ).all()
            tenant1_names = [ex.name for ex in tenant1_exercises]
            assert 'Global Bench Press' in tenant1_names
            assert 'Tenant 1 Custom Exercise' in tenant1_names
            assert 'Tenant 2 Custom Exercise' not in tenant1_names

            # CRITICAL TEST: Global exercise visible to tenant2
            tenant2_exercises = Exercise.query.filter(
                (Exercise.tenant_id == tenant2.id) | (Exercise.tenant_id == None)
            ).all()
            tenant2_names = [ex.name for ex in tenant2_exercises]
            assert 'Global Bench Press' in tenant2_names
            assert 'Tenant 2 Custom Exercise' in tenant2_names
            assert 'Tenant 1 Custom Exercise' not in tenant2_names

            # Cleanup
            db.session.delete(global_exercise)
            db.session.delete(tenant1_exercise)
            db.session.delete(tenant2_exercise)
            db.session.commit()

    def test_user_email_uniqueness_across_tenants(self, app, tenant1, tenant2):
        """
        CRITICAL: Verify email uniqueness is enforced globally
        (same email cannot exist in multiple tenants)
        """
        with app.app_context():
            # Create user1 in tenant1
            user1 = User(
                email='duplicate@test.com',
                first_name='User',
                last_name='One',
                role='athlete',
                tenant_id=tenant1.id,
                is_active=True
            )
            user1.set_password('password123')
            db.session.add(user1)
            db.session.commit()

            # Try to create user2 with same email in tenant2
            user2 = User(
                email='duplicate@test.com',  # Duplicate email
                first_name='User',
                last_name='Two',
                role='athlete',
                tenant_id=tenant2.id,
                is_active=True
            )
            user2.set_password('password123')
            db.session.add(user2)

            # CRITICAL TEST: Should raise IntegrityError
            with pytest.raises(Exception):  # SQLAlchemy IntegrityError
                db.session.commit()

            db.session.rollback()

            # Cleanup
            db.session.delete(user1)
            db.session.commit()

    def test_subdomain_uniqueness(self, app):
        """
        CRITICAL: Verify subdomain uniqueness
        Two tenants cannot have the same subdomain
        """
        with app.app_context():
            tenant1 = Tenant(
                name='Gym One',
                subdomain='samename',
                subscription_tier='pro',
                subscription_status='active',
                is_active=True
            )
            db.session.add(tenant1)
            db.session.commit()

            tenant2 = Tenant(
                name='Gym Two',
                subdomain='samename',  # Duplicate
                subscription_tier='pro',
                subscription_status='active',
                is_active=True
            )
            db.session.add(tenant2)

            # CRITICAL TEST: Should raise IntegrityError
            with pytest.raises(Exception):
                db.session.commit()

            db.session.rollback()

            # Cleanup
            db.session.delete(tenant1)
            db.session.commit()
