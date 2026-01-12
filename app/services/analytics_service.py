from datetime import datetime, timedelta
from sqlalchemy import func, and_, desc
from app.models import db
from app.models.trainer import (
    ProgressLog, WorkoutExercise, PersonalRecord,
    Exercise, Athlete, CheckIn, BodyMeasurement
)


class AnalyticsService:
    """
    Comprehensive analytics service for tracking and analyzing athlete performance
    Includes PR calculation, progress metrics, volume tracking, and intensity calculations
    """

    # ==================== PERSONAL RECORDS (PRs) ====================

    @staticmethod
    def calculate_and_update_pr(athlete_id, exercise_id, weight, reps, date_achieved, tenant_id):
        """
        Calculate if performance is a new PR and update database

        Checks for multiple PR types:
        - 1RM (estimated)
        - 3RM, 5RM, 10RM (actual)
        - Max reps at given weight

        Returns:
            dict with PR information and whether it's a new record
        """
        from app.services.progression_algorithm import ProgressionAlgorithm

        # Estimate 1RM
        estimated_1rm = ProgressionAlgorithm.estimate_1rm(weight, reps)

        # Determine record type based on reps
        if reps == 1:
            record_type = '1RM'
        elif reps <= 3:
            record_type = '3RM'
        elif reps <= 5:
            record_type = '5RM'
        elif reps <= 10:
            record_type = '10RM'
        else:
            record_type = 'max_reps'

        # Check for existing PR
        existing_pr = PersonalRecord.query.filter_by(
            athlete_id=athlete_id,
            exercise_id=exercise_id,
            record_type=record_type,
            tenant_id=tenant_id
        ).first()

        is_new_pr = False

        if record_type == 'max_reps':
            # For max reps, compare reps at similar weight (within 5%)
            if existing_pr:
                weight_diff_percentage = abs(existing_pr.weight - weight) / weight * 100
                if weight_diff_percentage <= 5 and reps > existing_pr.reps:
                    is_new_pr = True
            else:
                is_new_pr = True
        else:
            # For RM types, compare weight
            if existing_pr:
                if weight > existing_pr.weight:
                    is_new_pr = True
            else:
                is_new_pr = True

        # Update or create PR record
        if is_new_pr:
            if existing_pr:
                existing_pr.weight = weight
                existing_pr.reps = reps
                existing_pr.date_achieved = date_achieved
            else:
                new_pr = PersonalRecord(
                    tenant_id=tenant_id,
                    athlete_id=athlete_id,
                    exercise_id=exercise_id,
                    record_type=record_type,
                    weight=weight,
                    reps=reps,
                    date_achieved=date_achieved
                )
                db.session.add(new_pr)

            db.session.commit()

        return {
            'is_new_pr': is_new_pr,
            'record_type': record_type,
            'weight': weight,
            'reps': reps,
            'estimated_1rm': estimated_1rm,
            'previous_pr': existing_pr.to_dict() if existing_pr and is_new_pr else None
        }

    @staticmethod
    def get_athlete_prs(athlete_id, tenant_id, exercise_id=None):
        """
        Get all personal records for an athlete

        Args:
            athlete_id: Athlete ID
            tenant_id: Tenant ID
            exercise_id: Optional filter by specific exercise

        Returns:
            List of PR records grouped by exercise
        """
        query = PersonalRecord.query.filter_by(
            athlete_id=athlete_id,
            tenant_id=tenant_id
        )

        if exercise_id:
            query = query.filter_by(exercise_id=exercise_id)

        prs = query.order_by(desc(PersonalRecord.date_achieved)).all()

        # Group by exercise
        prs_by_exercise = {}
        for pr in prs:
            ex_id = pr.exercise_id
            if ex_id not in prs_by_exercise:
                prs_by_exercise[ex_id] = {
                    'exercise_name': pr.exercise.name,
                    'exercise_id': ex_id,
                    'records': []
                }
            prs_by_exercise[ex_id]['records'].append(pr.to_dict())

        return list(prs_by_exercise.values())

    # ==================== PROGRESS METRICS ====================

    @staticmethod
    def calculate_progress_metrics(athlete_id, tenant_id, weeks=12):
        """
        Calculate comprehensive progress metrics for an athlete

        Metrics include:
        - Total volume lifted
        - Average intensity (RPE)
        - Workout adherence
        - Body composition changes
        - Strength gains

        Returns:
            dict with detailed progress metrics
        """
        cutoff_date = datetime.now().date() - timedelta(weeks=weeks)

        # Get progress logs
        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.tenant_id == tenant_id,
            ProgressLog.date >= cutoff_date
        ).all()

        # Get check-ins for body metrics
        check_ins = CheckIn.query.filter(
            CheckIn.athlete_id == athlete_id,
            CheckIn.tenant_id == tenant_id,
            CheckIn.check_in_date >= cutoff_date
        ).order_by(CheckIn.check_in_date.asc()).all()

        # Get body measurements
        measurements = BodyMeasurement.query.filter(
            BodyMeasurement.athlete_id == athlete_id,
            BodyMeasurement.tenant_id == tenant_id,
            BodyMeasurement.measurement_date >= cutoff_date
        ).order_by(BodyMeasurement.measurement_date.asc()).all()

        # Calculate volume metrics
        total_volume = sum(log.total_volume for log in logs)
        total_sets = sum(log.sets_completed or 0 for log in logs)
        unique_workout_days = len(set(log.date for log in logs))

        # Calculate intensity metrics
        rpe_values = [log.rpe_actual for log in logs if log.rpe_actual]
        avg_rpe = sum(rpe_values) / len(rpe_values) if rpe_values else 0

        # Body composition changes
        body_comp_change = {}
        if check_ins and len(check_ins) >= 2:
            first_checkin = check_ins[0]
            last_checkin = check_ins[-1]

            if first_checkin.weight and last_checkin.weight:
                body_comp_change['weight_change'] = last_checkin.weight - first_checkin.weight
            if first_checkin.body_fat_percentage and last_checkin.body_fat_percentage:
                body_comp_change['body_fat_change'] = last_checkin.body_fat_percentage - first_checkin.body_fat_percentage

        # Calculate strength gains (compare first vs last 4 weeks)
        mid_point = cutoff_date + timedelta(weeks=weeks//2)
        first_half_logs = [l for l in logs if l.date < mid_point]
        second_half_logs = [l for l in logs if l.date >= mid_point]

        strength_gain_percentage = 0
        if first_half_logs and second_half_logs:
            first_avg_volume = sum(l.total_volume for l in first_half_logs) / len(first_half_logs)
            second_avg_volume = sum(l.total_volume for l in second_half_logs) / len(second_half_logs)

            if first_avg_volume > 0:
                strength_gain_percentage = ((second_avg_volume - first_avg_volume) / first_avg_volume) * 100

        return {
            'period_weeks': weeks,
            'workout_adherence': {
                'total_workouts': unique_workout_days,
                'expected_workouts': weeks * 4,  # Assuming 4 workouts per week target
                'adherence_rate': (unique_workout_days / (weeks * 4)) * 100 if weeks > 0 else 0
            },
            'volume_metrics': {
                'total_volume_kg': round(total_volume, 2),
                'total_sets': total_sets,
                'avg_volume_per_workout': round(total_volume / unique_workout_days, 2) if unique_workout_days > 0 else 0
            },
            'intensity_metrics': {
                'average_rpe': round(avg_rpe, 1),
                'total_sessions_logged': len(logs)
            },
            'body_composition': body_comp_change,
            'strength_progress': {
                'improvement_percentage': round(strength_gain_percentage, 1),
                'trend': 'improving' if strength_gain_percentage > 5 else 'steady' if strength_gain_percentage > -5 else 'declining'
            }
        }

    # ==================== VOLUME TRACKING ====================

    @staticmethod
    def get_volume_tracking(athlete_id, tenant_id, weeks=12, group_by='week'):
        """
        Get volume tracking data over time

        Args:
            athlete_id: Athlete ID
            tenant_id: Tenant ID
            weeks: Number of weeks to analyze
            group_by: 'day', 'week', or 'month'

        Returns:
            dict with volume data points over time
        """
        cutoff_date = datetime.now().date() - timedelta(weeks=weeks)

        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.tenant_id == tenant_id,
            ProgressLog.date >= cutoff_date
        ).order_by(ProgressLog.date.asc()).all()

        # Group volume by time period
        volume_by_period = {}

        for log in logs:
            if group_by == 'day':
                period_key = log.date.isoformat()
            elif group_by == 'week':
                # ISO week number
                period_key = f"{log.date.isocalendar()[0]}-W{log.date.isocalendar()[1]:02d}"
            else:  # month
                period_key = f"{log.date.year}-{log.date.month:02d}"

            if period_key not in volume_by_period:
                volume_by_period[period_key] = {
                    'period': period_key,
                    'total_volume': 0,
                    'total_sets': 0,
                    'workout_count': 0,
                    'dates': set()
                }

            volume_by_period[period_key]['total_volume'] += log.total_volume
            volume_by_period[period_key]['total_sets'] += log.sets_completed or 0
            volume_by_period[period_key]['dates'].add(log.date)

        # Calculate workout count per period
        for period in volume_by_period.values():
            period['workout_count'] = len(period['dates'])
            del period['dates']  # Remove set before returning

        # Convert to sorted list
        volume_data = sorted(volume_by_period.values(), key=lambda x: x['period'])

        return {
            'period_type': group_by,
            'data_points': volume_data,
            'total_volume': sum(p['total_volume'] for p in volume_data),
            'avg_volume_per_period': sum(p['total_volume'] for p in volume_data) / len(volume_data) if volume_data else 0
        }

    @staticmethod
    def get_volume_by_muscle_group(athlete_id, tenant_id, weeks=4):
        """
        Calculate volume distribution across muscle groups

        Returns:
            dict with volume per muscle group
        """
        cutoff_date = datetime.now().date() - timedelta(weeks=weeks)

        logs = ProgressLog.query.join(WorkoutExercise).join(Exercise).filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.tenant_id == tenant_id,
            ProgressLog.date >= cutoff_date
        ).all()

        volume_by_muscle = {}

        for log in logs:
            exercise = log.workout_exercise.exercise
            primary_muscles = exercise.primary_muscles or []

            for muscle in primary_muscles:
                if muscle not in volume_by_muscle:
                    volume_by_muscle[muscle] = {
                        'muscle_group': muscle,
                        'total_volume': 0,
                        'total_sets': 0
                    }

                volume_by_muscle[muscle]['total_volume'] += log.total_volume
                volume_by_muscle[muscle]['total_sets'] += log.sets_completed or 0

        return {
            'muscle_groups': list(volume_by_muscle.values()),
            'period_weeks': weeks
        }

    # ==================== INTENSITY CALCULATIONS ====================

    @staticmethod
    def calculate_intensity_metrics(athlete_id, tenant_id, weeks=4):
        """
        Calculate intensity metrics including RPE analysis and relative intensity

        Returns:
            dict with intensity analysis
        """
        cutoff_date = datetime.now().date() - timedelta(weeks=weeks)

        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.tenant_id == tenant_id,
            ProgressLog.date >= cutoff_date
        ).all()

        if not logs:
            return {'message': 'No data available'}

        # RPE analysis
        rpe_values = [log.rpe_actual for log in logs if log.rpe_actual]
        rpe_distribution = {
            'light': sum(1 for r in rpe_values if r <= 6),
            'moderate': sum(1 for r in rpe_values if 6 < r <= 8),
            'hard': sum(1 for r in rpe_values if 8 < r <= 9),
            'maximal': sum(1 for r in rpe_values if r > 9)
        }

        avg_rpe = sum(rpe_values) / len(rpe_values) if rpe_values else 0

        # Relative intensity (based on estimated % of 1RM)
        from app.services.progression_algorithm import ProgressionAlgorithm

        intensity_zones = []
        for log in logs:
            if log.weight_used and log.reps_completed:
                max_reps = max(log.reps_completed) if isinstance(log.reps_completed, list) else log.reps_completed
                estimated_1rm = ProgressionAlgorithm.estimate_1rm(log.weight_used, max_reps)

                if estimated_1rm > 0:
                    relative_intensity = (log.weight_used / estimated_1rm) * 100
                    intensity_zones.append(relative_intensity)

        avg_relative_intensity = sum(intensity_zones) / len(intensity_zones) if intensity_zones else 0

        return {
            'period_weeks': weeks,
            'rpe_metrics': {
                'average_rpe': round(avg_rpe, 1),
                'rpe_distribution': rpe_distribution,
                'total_sessions': len(rpe_values)
            },
            'relative_intensity': {
                'average_percentage_1rm': round(avg_relative_intensity, 1),
                'sessions_analyzed': len(intensity_zones)
            },
            'fatigue_indicator': {
                'status': 'high' if avg_rpe > 8.5 else 'moderate' if avg_rpe > 7 else 'low',
                'recommendation': 'Consider deload' if avg_rpe > 8.5 else 'Training intensity is manageable'
            }
        }

    @staticmethod
    def get_weekly_training_load(athlete_id, tenant_id, weeks=8):
        """
        Calculate weekly training load (volume × RPE) for monitoring fatigue

        Returns:
            dict with weekly load data
        """
        cutoff_date = datetime.now().date() - timedelta(weeks=weeks)

        logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.tenant_id == tenant_id,
            ProgressLog.date >= cutoff_date
        ).order_by(ProgressLog.date.asc()).all()

        weekly_loads = {}

        for log in logs:
            week_key = f"{log.date.isocalendar()[0]}-W{log.date.isocalendar()[1]:02d}"

            if week_key not in weekly_loads:
                weekly_loads[week_key] = {
                    'week': week_key,
                    'total_load': 0,
                    'volume': 0,
                    'avg_rpe': 0,
                    'rpe_values': []
                }

            rpe = log.rpe_actual or 7
            load = log.total_volume * rpe

            weekly_loads[week_key]['total_load'] += load
            weekly_loads[week_key]['volume'] += log.total_volume
            weekly_loads[week_key]['rpe_values'].append(rpe)

        # Calculate average RPE per week
        for week_data in weekly_loads.values():
            week_data['avg_rpe'] = sum(week_data['rpe_values']) / len(week_data['rpe_values'])
            del week_data['rpe_values']

        load_data = sorted(weekly_loads.values(), key=lambda x: x['week'])

        # Calculate acute:chronic ratio (last week vs 4-week average)
        acr = None
        if len(load_data) >= 4:
            acute_load = load_data[-1]['total_load']  # Last week
            chronic_load = sum(w['total_load'] for w in load_data[-4:]) / 4  # 4-week average

            if chronic_load > 0:
                acr = acute_load / chronic_load

        return {
            'weekly_loads': load_data,
            'acute_chronic_ratio': round(acr, 2) if acr else None,
            'injury_risk': 'high' if acr and acr > 1.5 else 'moderate' if acr and acr > 1.3 else 'low' if acr else 'insufficient_data'
        }
