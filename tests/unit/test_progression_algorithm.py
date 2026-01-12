"""
CRITICAL UNIT TESTS - Progression Algorithm
Tests that ensure weight calculations are accurate
Wrong calculations could cause injuries or poor results
"""
import pytest
from datetime import datetime, timedelta, date
from app.models import db
from app.models.shared import User
from app.models.super_admin import Tenant
from app.models.trainer import Athlete, Exercise, Workout, WorkoutExercise, ProgressLog
from app.services.progression_algorithm import ProgressionAlgorithm


class TestProgressionAlgorithm:
    """Critical tests for workout progression calculations"""

    @pytest.fixture
    def test_athlete(self, app, test_tenant):
        """Create test athlete with user"""
        with app.app_context():
            user = User(
                email='athlete@progresstest.com',
                first_name='Test',
                last_name='Athlete',
                role='athlete',
                tenant_id=test_tenant.id,
                is_active=True
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.flush()

            athlete = Athlete(
                tenant_id=test_tenant.id,
                user_id=user.id,
                trainer_id=user.id,  # Self for testing
                is_active=True
            )
            db.session.add(athlete)
            db.session.commit()
            yield athlete

            db.session.delete(athlete)
            db.session.delete(user)
            db.session.commit()

    @pytest.fixture
    def test_exercise(self, app, test_tenant):
        """Create test exercise"""
        with app.app_context():
            exercise = Exercise(
                tenant_id=test_tenant.id,
                name='Bench Press',
                category='chest',
                equipment='barbell',
                difficulty_level='intermediate'
            )
            db.session.add(exercise)
            db.session.commit()
            yield exercise

            db.session.delete(exercise)
            db.session.commit()

    @pytest.fixture
    def test_workout_exercise(self, app, test_tenant, test_athlete, test_exercise):
        """Create test workout with exercise"""
        with app.app_context():
            workout = Workout(
                tenant_id=test_tenant.id,
                athlete_id=test_athlete.id,
                name='Upper Body',
                is_active=True
            )
            db.session.add(workout)
            db.session.flush()

            workout_exercise = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=test_exercise.id,
                order=1,
                sets=3,
                reps_min=8,
                reps_max=10,
                rest_seconds=120
            )
            db.session.add(workout_exercise)
            db.session.commit()
            yield workout_exercise

            db.session.delete(workout_exercise)
            db.session.delete(workout)
            db.session.commit()

    def test_weight_increase_on_perfect_performance(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: When athlete crushes the workout (all reps, low RPE),
        should increase weight by 2.5%
        """
        with app.app_context():
            # Create progress log: completed all reps with low RPE
            log = ProgressLog(
                tenant_id=test_athlete.tenant_id,
                athlete_id=test_athlete.id,
                workout_exercise_id=test_workout_exercise.id,
                date=date.today(),
                sets_completed=3,
                reps_completed=[10, 10, 10],  # All sets completed max reps
                weight_used=100.0,
                rpe_actual=7.0,  # Low RPE = room to grow
            )
            db.session.add(log)
            db.session.commit()

            # Calculate next weight
            result = ProgressionAlgorithm.calculate_next_weight(
                test_athlete.id,
                test_workout_exercise.id
            )

            # CRITICAL TEST: Should increase by 2.5% → 102.5kg
            assert result['suggested_weight'] == 102.5
            assert result['last_weight'] == 100.0
            assert 'increase' in result['reason'].lower()

            db.session.delete(log)
            db.session.commit()

    def test_weight_maintain_on_high_rpe(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: When athlete completes reps but with high RPE (9-10),
        should maintain weight to build strength
        """
        with app.app_context():
            log = ProgressLog(
                tenant_id=test_athlete.tenant_id,
                athlete_id=test_athlete.id,
                workout_exercise_id=test_workout_exercise.id,
                date=date.today(),
                sets_completed=3,
                reps_completed=[10, 10, 9],
                weight_used=100.0,
                rpe_actual=9.5,  # Very hard
            )
            db.session.add(log)
            db.session.commit()

            result = ProgressionAlgorithm.calculate_next_weight(
                test_athlete.id,
                test_workout_exercise.id
            )

            # CRITICAL TEST: Should maintain weight
            assert result['suggested_weight'] == 100.0
            assert 'maintain' in result['reason'].lower()

            db.session.delete(log)
            db.session.commit()

    def test_weight_decrease_on_failed_reps(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: When athlete can't hit target reps with high RPE,
        should decrease weight by 2.5%
        """
        with app.app_context():
            log = ProgressLog(
                tenant_id=test_athlete.tenant_id,
                athlete_id=test_athlete.id,
                workout_exercise_id=test_workout_exercise.id,
                date=date.today(),
                sets_completed=3,
                reps_completed=[6, 5, 4],  # Failed to hit min target of 8
                weight_used=100.0,
                rpe_actual=10.0,  # Maxed out
            )
            db.session.add(log)
            db.session.commit()

            result = ProgressionAlgorithm.calculate_next_weight(
                test_athlete.id,
                test_workout_exercise.id
            )

            # CRITICAL TEST: Should decrease by 2.5% → 97.5kg
            assert result['suggested_weight'] == 97.5
            assert 'reduce' in result['reason'].lower()

            db.session.delete(log)
            db.session.commit()

    def test_weight_rounding_to_plate_increment(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: Weights should be rounded to 2.5kg increments
        (standard weight plate)
        """
        with app.app_context():
            log = ProgressLog(
                tenant_id=test_athlete.tenant_id,
                athlete_id=test_athlete.id,
                workout_exercise_id=test_workout_exercise.id,
                date=date.today(),
                sets_completed=3,
                reps_completed=[10, 10, 10],
                weight_used=83.0,  # Weird number
                rpe_actual=7.0,
            )
            db.session.add(log)
            db.session.commit()

            result = ProgressionAlgorithm.calculate_next_weight(
                test_athlete.id,
                test_workout_exercise.id
            )

            # 83 * 1.025 = 85.075 → should round to 85.0
            # CRITICAL TEST: Should be divisible by 2.5
            assert result['suggested_weight'] % 2.5 == 0
            assert result['suggested_weight'] == 85.0

            db.session.delete(log)
            db.session.commit()

    def test_no_data_returns_none(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: When no progress data exists, should return None
        and helpful message
        """
        with app.app_context():
            result = ProgressionAlgorithm.calculate_next_weight(
                test_athlete.id,
                test_workout_exercise.id
            )

            # CRITICAL TEST: No data = no suggestion
            assert result['suggested_weight'] is None
            assert 'no recent' in result['reason'].lower()

    def test_1rm_estimation_accuracy(self, app):
        """
        CRITICAL: 1RM estimation using Epley formula
        Must be mathematically correct
        """
        with app.app_context():
            # Test known values
            # If someone lifts 100kg for 10 reps, estimated 1RM ≈ 133kg
            estimated = ProgressionAlgorithm.estimate_1rm(100, 10)
            assert 130 <= estimated <= 135  # Allow small margin

            # Edge case: 1 rep = weight itself
            estimated = ProgressionAlgorithm.estimate_1rm(100, 1)
            assert 100 <= estimated <= 104

            # Edge case: invalid input
            estimated = ProgressionAlgorithm.estimate_1rm(0, 10)
            assert estimated == 0

            estimated = ProgressionAlgorithm.estimate_1rm(100, 0)
            assert estimated == 0

    def test_training_weight_calculation(self, app):
        """
        CRITICAL: Training weight based on % of 1RM
        Must be accurate for program design
        """
        with app.app_context():
            # If 1RM is 100kg, 80% should be 80kg
            weight = ProgressionAlgorithm.calculate_training_weight(100, 80)
            assert weight == 80.0

            # Should round to nearest 2.5kg
            # 75% of 103kg = 77.25 → should be 77.5
            weight = ProgressionAlgorithm.calculate_training_weight(103, 75)
            assert weight % 2.5 == 0
            assert weight == 77.5

            # Edge case: invalid input
            weight = ProgressionAlgorithm.calculate_training_weight(0, 80)
            assert weight == 0

            weight = ProgressionAlgorithm.calculate_training_weight(100, 0)
            assert weight == 0

    def test_performance_trend_improving(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: Should correctly identify improving trend
        """
        with app.app_context():
            # Create logs showing improvement over time
            base_date = date.today() - timedelta(weeks=8)

            # Early sessions: lower volume
            for i in range(4):
                log = ProgressLog(
                    tenant_id=test_athlete.tenant_id,
                    athlete_id=test_athlete.id,
                    workout_exercise_id=test_workout_exercise.id,
                    date=base_date + timedelta(weeks=i),
                    sets_completed=3,
                    reps_completed=[8, 8, 8],
                    weight_used=80.0,
                    rpe_actual=7.0
                )
                db.session.add(log)

            # Recent sessions: higher volume
            for i in range(4, 8):
                log = ProgressLog(
                    tenant_id=test_athlete.tenant_id,
                    athlete_id=test_athlete.id,
                    workout_exercise_id=test_workout_exercise.id,
                    date=base_date + timedelta(weeks=i),
                    sets_completed=3,
                    reps_completed=[10, 10, 10],
                    weight_used=90.0,
                    rpe_actual=7.0
                )
                db.session.add(log)

            db.session.commit()

            result = ProgressionAlgorithm.analyze_performance_trend(
                test_athlete.id,
                test_workout_exercise.id
            )

            # CRITICAL TEST: Should detect improvement
            assert result['trend'] in ['improving', 'steady_progress']
            assert result['improvement_percentage'] > 0

            # Cleanup
            ProgressLog.query.filter_by(athlete_id=test_athlete.id).delete()
            db.session.commit()

    def test_deload_recommendation_on_high_fatigue(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: Should recommend deload when athlete is fatigued
        Prevents overtraining and injuries
        """
        with app.app_context():
            # Create logs showing high RPE for extended period
            base_date = date.today() - timedelta(weeks=4)

            for i in range(10):
                log = ProgressLog(
                    tenant_id=test_athlete.tenant_id,
                    athlete_id=test_athlete.id,
                    workout_exercise_id=test_workout_exercise.id,
                    date=base_date + timedelta(days=i*3),
                    sets_completed=3,
                    reps_completed=[8, 8, 7],
                    weight_used=100.0,
                    rpe_actual=9.5  # Consistently high RPE = fatigue
                )
                db.session.add(log)

            db.session.commit()

            result = ProgressionAlgorithm.suggest_deload_week(test_athlete.id)

            # CRITICAL TEST: Should recommend deload
            assert result['needs_deload'] is True
            assert result['avg_rpe'] >= 9.0
            assert 'fatigue' in result['reason'].lower() or 'deload' in result['reason'].lower()

            # Cleanup
            ProgressLog.query.filter_by(athlete_id=test_athlete.id).delete()
            db.session.commit()

    def test_insufficient_data_handling(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: Should handle cases with insufficient data gracefully
        """
        with app.app_context():
            # Create only 2 logs (need 3+ for trend analysis)
            for i in range(2):
                log = ProgressLog(
                    tenant_id=test_athlete.tenant_id,
                    athlete_id=test_athlete.id,
                    workout_exercise_id=test_workout_exercise.id,
                    date=date.today() - timedelta(days=i*7),
                    sets_completed=3,
                    reps_completed=[8, 8, 8],
                    weight_used=100.0,
                    rpe_actual=7.0
                )
                db.session.add(log)

            db.session.commit()

            result = ProgressionAlgorithm.analyze_performance_trend(
                test_athlete.id,
                test_workout_exercise.id
            )

            # CRITICAL TEST: Should indicate insufficient data
            assert result['trend'] == 'insufficient_data'

            # Cleanup
            ProgressLog.query.filter_by(athlete_id=test_athlete.id).delete()
            db.session.commit()

    def test_progress_summary_calculations(self, app, test_athlete, test_workout_exercise):
        """
        CRITICAL: Overall progress summary must be accurate
        """
        with app.app_context():
            # Create 5 workout logs
            for i in range(5):
                log = ProgressLog(
                    tenant_id=test_athlete.tenant_id,
                    athlete_id=test_athlete.id,
                    workout_exercise_id=test_workout_exercise.id,
                    date=date.today() - timedelta(days=i*3),
                    sets_completed=3,
                    reps_completed=[10, 10, 10],
                    weight_used=100.0,
                    rpe_actual=8.0
                )
                db.session.add(log)

            db.session.commit()

            result = ProgressionAlgorithm.get_athlete_progress_summary(
                test_athlete.id,
                weeks=12
            )

            # CRITICAL TEST: Should have correct counts
            assert result['total_workouts'] == 5
            assert result['average_rpe'] == 8.0
            assert result['total_sets_completed'] == 15  # 3 sets × 5 workouts

            # Cleanup
            ProgressLog.query.filter_by(athlete_id=test_athlete.id).delete()
            db.session.commit()
