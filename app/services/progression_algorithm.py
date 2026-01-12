from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import db
from app.models.trainer import ProgressLog, WorkoutExercise


class ProgressionAlgorithm:
    """
    Intelligent progression algorithm
    Analyzes athlete performance and suggests weight increases
    """

    @staticmethod
    def calculate_next_weight(athlete_id, workout_exercise_id, weeks_to_analyze=4):
        """
        Calculate suggested weight for next workout based on recent performance

        Algorithm Logic:
        1. If athlete completed all sets with target reps and RPE < 8: increase by 2.5%
        2. If athlete completed all sets but RPE = 9-10: maintain weight
        3. If athlete failed to complete target reps: decrease by 2.5%
        4. If no recent data: suggest starting with last known weight

        Args:
            athlete_id: Athlete ID
            workout_exercise_id: WorkoutExercise ID
            weeks_to_analyze: Number of weeks of history to consider

        Returns:
            dict with suggested weight and reasoning
        """
        workout_exercise = WorkoutExercise.query.get(workout_exercise_id)
        if not workout_exercise:
            return {'suggested_weight': None, 'reason': 'Exercise not found'}

        # Get recent progress logs
        cutoff_date = datetime.now() - timedelta(weeks=weeks_to_analyze)

        recent_logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.workout_exercise_id == workout_exercise_id,
            ProgressLog.date >= cutoff_date.date()
        ).order_by(ProgressLog.date.desc()).all()

        if not recent_logs:
            return {
                'suggested_weight': None,
                'reason': 'No recent performance data. Start with a comfortable weight.'
            }

        # Analyze most recent performance
        last_log = recent_logs[0]
        target_reps_min = workout_exercise.reps_min or 0
        target_reps_max = workout_exercise.reps_max or target_reps_min

        # Calculate average reps completed per set
        if isinstance(last_log.reps_completed, list):
            avg_reps = sum(last_log.reps_completed) / len(last_log.reps_completed)
            min_reps = min(last_log.reps_completed)
        else:
            avg_reps = last_log.reps_completed or 0
            min_reps = last_log.reps_completed or 0

        # Decision tree for progression
        last_weight = last_log.weight_used or 0
        rpe_actual = last_log.rpe_actual or 7

        # Case 1: Crushed it - increase weight
        if (min_reps >= target_reps_max and
            rpe_actual <= 8 and
            last_log.sets_completed >= workout_exercise.sets):

            suggested_weight = last_weight * 1.025  # 2.5% increase
            reason = f"Great performance! Completed {int(avg_reps)} reps with RPE {rpe_actual}. Increase weight."

        # Case 2: Perfect execution but high effort - maintain
        elif (min_reps >= target_reps_min and
              rpe_actual >= 9):

            suggested_weight = last_weight
            reason = f"Solid performance but high RPE ({rpe_actual}). Maintain weight to build strength."

        # Case 3: Failed to hit target - decrease or maintain
        elif min_reps < target_reps_min:
            if rpe_actual >= 9:
                suggested_weight = last_weight * 0.975  # 2.5% decrease
                reason = f"Couldn't hit target reps ({int(min_reps)}/{target_reps_min}) with high effort. Reduce weight slightly."
            else:
                suggested_weight = last_weight
                reason = f"Couldn't hit target reps ({int(min_reps)}/{target_reps_min}). Maintain weight and focus on form."

        # Case 4: Good performance, moderate effort - small increase
        elif avg_reps >= target_reps_min and rpe_actual <= 8:
            suggested_weight = last_weight * 1.0125  # 1.25% increase (conservative)
            reason = f"Consistent performance with RPE {rpe_actual}. Small weight increase."

        # Case 5: Default - maintain
        else:
            suggested_weight = last_weight
            reason = "Continue with current weight."

        # Round to nearest 2.5kg (standard weight plate increment)
        suggested_weight = round(suggested_weight / 2.5) * 2.5

        return {
            'suggested_weight': suggested_weight,
            'last_weight': last_weight,
            'reason': reason,
            'last_performance': {
                'date': last_log.date.isoformat(),
                'weight': last_weight,
                'reps': last_log.reps_completed,
                'rpe': rpe_actual
            }
        }

    @staticmethod
    def analyze_performance_trend(athlete_id, workout_exercise_id, weeks=8):
        """
        Analyze performance trend over time

        Returns:
            dict with trend analysis (improving, plateaued, declining)
        """
        cutoff_date = datetime.now() - timedelta(weeks=weeks)

        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.workout_exercise_id == workout_exercise_id,
            ProgressLog.date >= cutoff_date.date()
        ).order_by(ProgressLog.date.asc()).all()

        if len(logs) < 3:
            return {'trend': 'insufficient_data', 'message': 'Need more workout logs to analyze trend'}

        # Calculate total volume (sets × reps × weight) for each session
        volumes = [log.total_volume for log in logs]

        # Simple linear trend detection
        first_half_avg = sum(volumes[:len(volumes)//2]) / (len(volumes)//2)
        second_half_avg = sum(volumes[len(volumes)//2:]) / (len(volumes) - len(volumes)//2)

        improvement_percentage = ((second_half_avg - first_half_avg) / first_half_avg * 100) if first_half_avg > 0 else 0

        if improvement_percentage > 10:
            trend = 'improving'
            message = f"Excellent progress! Volume increased by {improvement_percentage:.1f}%"
        elif improvement_percentage > 0:
            trend = 'steady_progress'
            message = f"Steady progress. Volume increased by {improvement_percentage:.1f}%"
        elif improvement_percentage > -5:
            trend = 'plateaued'
            message = "Performance has plateaued. Consider changing rep ranges or exercises."
        else:
            trend = 'declining'
            message = f"Performance declining ({improvement_percentage:.1f}%). Check for overtraining or nutrition issues."

        return {
            'trend': trend,
            'message': message,
            'improvement_percentage': improvement_percentage,
            'total_sessions': len(logs),
            'average_volume': sum(volumes) / len(volumes)
        }

    @staticmethod
    def estimate_1rm(weight, reps):
        """
        Estimate 1 Rep Max using Epley formula
        1RM = weight × (1 + reps/30)

        Args:
            weight: Weight lifted
            reps: Number of reps completed

        Returns:
            Estimated 1RM
        """
        if reps <= 0 or weight <= 0:
            return 0

        estimated_1rm = weight * (1 + reps / 30)
        return round(estimated_1rm, 2)

    @staticmethod
    def calculate_training_weight(one_rm, percentage):
        """
        Calculate training weight based on percentage of 1RM

        Args:
            one_rm: One rep max
            percentage: Percentage of 1RM (e.g., 75 for 75%)

        Returns:
            Training weight rounded to nearest 2.5kg
        """
        if one_rm <= 0 or percentage <= 0:
            return 0

        training_weight = one_rm * (percentage / 100)
        return round(training_weight / 2.5) * 2.5

    @staticmethod
    def get_athlete_progress_summary(athlete_id, weeks=12):
        """
        Get comprehensive progress summary for an athlete

        Returns:
            dict with overall performance metrics
        """
        cutoff_date = datetime.now() - timedelta(weeks=weeks)

        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.date >= cutoff_date.date()
        ).all()

        if not logs:
            return {'total_workouts': 0, 'message': 'No workout data available'}

        total_volume = sum(log.total_volume for log in logs)
        avg_rpe = sum(log.rpe_actual for log in logs if log.rpe_actual) / len([l for l in logs if l.rpe_actual])

        # Count unique workout days
        unique_days = len(set(log.date for log in logs))

        return {
            'total_workouts': unique_days,
            'total_volume': total_volume,
            'average_rpe': round(avg_rpe, 1),
            'total_sets_completed': sum(log.sets_completed or 0 for log in logs),
            'period_weeks': weeks
        }

    @staticmethod
    def suggest_deload_week(athlete_id, weeks_to_check=4):
        """
        Analyze if athlete needs a deload week based on fatigue indicators

        Indicators:
        - Consistently high RPE (>8.5)
        - Declining performance
        - High training frequency without rest

        Returns:
            dict with recommendation
        """
        cutoff_date = datetime.now() - timedelta(weeks=weeks_to_check)

        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.date >= cutoff_date.date()
        ).order_by(ProgressLog.date.desc()).all()

        if len(logs) < 8:  # Need at least 8 sessions to analyze
            return {'needs_deload': False, 'reason': 'Insufficient data'}

        # Calculate average RPE for recent sessions
        recent_rpe = [log.rpe_actual for log in logs[:8] if log.rpe_actual]
        avg_rpe = sum(recent_rpe) / len(recent_rpe) if recent_rpe else 7

        # Check volume trend
        recent_volumes = [log.total_volume for log in logs[:8]]
        older_volumes = [log.total_volume for log in logs[8:16]] if len(logs) >= 16 else recent_volumes

        avg_recent = sum(recent_volumes) / len(recent_volumes)
        avg_older = sum(older_volumes) / len(older_volumes)

        volume_change = ((avg_recent - avg_older) / avg_older * 100) if avg_older > 0 else 0

        # Decision logic
        needs_deload = False
        reason = ""

        if avg_rpe >= 9:
            needs_deload = True
            reason = f"High fatigue detected. Average RPE is {avg_rpe:.1f}. Recommend deload week."
        elif volume_change < -15:
            needs_deload = True
            reason = f"Performance declining ({volume_change:.1f}%). Consider deload week."
        elif len(logs) >= 20 and all(log.rpe_actual and log.rpe_actual >= 8 for log in logs[:20] if log.rpe_actual):
            needs_deload = True
            reason = "Consistently high effort for extended period. Deload recommended."

        return {
            'needs_deload': needs_deload,
            'reason': reason if needs_deload else "No deload needed. Keep training!",
            'avg_rpe': avg_rpe,
            'volume_change_percentage': volume_change
        }
