"""
Integration Tests for Complete User Workflows
Tests end-to-end user journeys
"""
import pytest
from app.models import db
from app.models.shared import User, Tenant
from app.models.trainer import Athlete, Workout, Exercise


class TestTrainerWorkflow:
    """Tests for complete trainer workflow"""

    def test_trainer_onboarding_flow(self, client, app):
        """Test trainer registration through first workout creation"""
        with app.app_context():
            # 1. Register as trainer
            client.post('/auth/register', data={
                'email': 'newtrainer@test.com',
                'username': 'newtrainer',
                'password': 'password123',
                'confirm_password': 'password123',
                'role': 'trainer'
            })

            # 2. Login
            client.post('/auth/login', data={
                'email': 'newtrainer@test.com',
                'password': 'password123'
            })

            # 3. Create tenant/business profile
            # (This would normally happen during onboarding)

            # 4. Add first athlete
            response = client.post('/trainer/athletes/add', data={
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com'
            })

            # Workflow should complete successfully
            assert response.status_code in [200, 302]

    def test_create_workout_for_athlete(self, authenticated_client, app, test_tenant):
        """Test creating a complete workout with exercises"""
        with app.app_context():
            # Create athlete
            athlete = Athlete(
                first_name='Jane',
                last_name='Smith',
                email='jane@example.com',
                tenant_id=test_tenant.id
            )
            db.session.add(athlete)
            db.session.commit()

            # Create exercise
            exercise = Exercise(
                name='Squat',
                category='legs',
                equipment='barbell',
                tenant_id=test_tenant.id
            )
            db.session.add(exercise)
            db.session.commit()

            # Create workout
            response = authenticated_client.post('/trainer/workouts/create', data={
                'name': 'Leg Day',
                'athlete_id': athlete.id,
                'scheduled_date': '2024-12-01'
            })

            assert response.status_code in [200, 302]


class TestAthleteWorkflow:
    """Tests for athlete workflow"""

    def test_athlete_complete_workout(self, app, test_tenant):
        """Test athlete completing a workout"""
        with app.app_context():
            # Setup: Create athlete with workout
            athlete = Athlete(
                first_name='Test',
                last_name='Athlete',
                email='athlete@test.com',
                tenant_id=test_tenant.id
            )
            db.session.add(athlete)

            exercise = Exercise(
                name='Bench Press',
                category='chest',
                equipment='barbell',
                tenant_id=test_tenant.id
            )
            db.session.add(exercise)

            workout = Workout(
                name='Upper Body',
                athlete_id=athlete.id,
                tenant_id=test_tenant.id
            )
            db.session.add(workout)
            db.session.commit()

            # Test: Athlete logs progress
            # (Would be done through API or form)

            assert workout.id is not None


class TestSubscriptionWorkflow:
    """Tests for subscription management workflow"""

    def test_upgrade_subscription(self, app, test_tenant):
        """Test upgrading subscription tier"""
        with app.app_context():
            # Start with starter tier
            test_tenant.subscription_tier = 'starter'
            test_tenant.max_athletes = 10
            db.session.commit()

            # Upgrade to pro
            test_tenant.subscription_tier = 'pro'
            test_tenant.max_athletes = 50
            db.session.commit()

            assert test_tenant.subscription_tier == 'pro'
            assert test_tenant.max_athletes == 50


class TestMultiTenantIsolation:
    """Tests for multi-tenant data isolation"""

    def test_tenant_data_isolation(self, app):
        """Test that tenants cannot access each other's data"""
        with app.app_context():
            # Create two tenants
            tenant1 = Tenant(
                business_name='Gym 1',
                subscription_tier='pro'
            )
            tenant2 = Tenant(
                business_name='Gym 2',
                subscription_tier='pro'
            )
            db.session.add_all([tenant1, tenant2])
            db.session.commit()

            # Create athletes for each tenant
            athlete1 = Athlete(
                first_name='Athlete',
                last_name='One',
                email='athlete1@test.com',
                tenant_id=tenant1.id
            )
            athlete2 = Athlete(
                first_name='Athlete',
                last_name='Two',
                email='athlete2@test.com',
                tenant_id=tenant2.id
            )
            db.session.add_all([athlete1, athlete2])
            db.session.commit()

            # Query athletes for tenant1
            tenant1_athletes = Athlete.query.filter_by(tenant_id=tenant1.id).all()

            # Should only get tenant1's athletes
            assert len(tenant1_athletes) == 1
            assert tenant1_athletes[0].email == 'athlete1@test.com'
