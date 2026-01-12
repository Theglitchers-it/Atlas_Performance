from datetime import datetime, date
from app.models import db
from app.models.trainer import Workout, WorkoutExercise, Exercise


class WorkoutBuilder:
    """
    Service for building and managing workout programs
    Provides methods to create, clone, and organize workouts
    """

    @staticmethod
    def create_workout(tenant_id, athlete_id, name, description='', workout_type='strength', day_of_week=None):
        """
        Create a new workout template

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
            name: Workout name
            description: Workout description
            workout_type: Type of workout (strength, hypertrophy, endurance, circuit)
            day_of_week: Day of week (0=Monday, 6=Sunday)

        Returns:
            Workout object
        """
        workout = Workout(
            tenant_id=tenant_id,
            athlete_id=athlete_id,
            name=name,
            description=description,
            type=workout_type,
            day_of_week=day_of_week,
            is_active=True
        )

        db.session.add(workout)
        db.session.commit()

        return workout

    @staticmethod
    def add_exercise_to_workout(workout_id, exercise_id, sets=3, reps_min=8, reps_max=12,
                                rest_seconds=90, rpe_target=None, notes='', order=None, block_name='Main Set'):
        """
        Add an exercise to a workout

        Args:
            workout_id: Workout ID
            exercise_id: Exercise ID
            sets: Number of sets
            reps_min: Minimum reps in range
            reps_max: Maximum reps in range
            rest_seconds: Rest time between sets
            rpe_target: Target RPE (Rate of Perceived Exertion)
            notes: Exercise-specific notes
            order: Order in workout (auto-assigned if None)
            block_name: Block name (e.g., 'Warm-up', 'Main Set', 'Accessories')

        Returns:
            WorkoutExercise object
        """
        workout = Workout.query.get(workout_id)
        if not workout:
            raise ValueError(f"Workout {workout_id} not found")

        # Auto-assign order if not provided
        if order is None:
            max_order = db.session.query(db.func.max(WorkoutExercise.order)).filter_by(
                workout_id=workout_id
            ).scalar() or 0
            order = max_order + 1

        workout_exercise = WorkoutExercise(
            workout_id=workout_id,
            exercise_id=exercise_id,
            order=order,
            block_name=block_name,
            sets=sets,
            reps_min=reps_min,
            reps_max=reps_max,
            rest_seconds=rest_seconds,
            rpe_target=rpe_target,
            notes=notes
        )

        db.session.add(workout_exercise)
        db.session.commit()

        return workout_exercise

    @staticmethod
    def create_superset(workout_id, exercises, sets=3, rest_seconds=120, block_name='Superset'):
        """
        Create a superset (multiple exercises performed back-to-back)

        Args:
            workout_id: Workout ID
            exercises: List of dicts with exercise parameters
                Example: [
                    {'exercise_id': 1, 'reps_min': 8, 'reps_max': 12},
                    {'exercise_id': 2, 'reps_min': 10, 'reps_max': 15}
                ]
            sets: Number of superset rounds
            rest_seconds: Rest after completing all exercises in superset
            block_name: Block name

        Returns:
            List of WorkoutExercise objects
        """
        # Generate superset group identifier
        max_order = db.session.query(db.func.max(WorkoutExercise.order)).filter_by(
            workout_id=workout_id
        ).scalar() or 0

        # Generate unique superset group (A, B, C, etc.)
        existing_groups = db.session.query(WorkoutExercise.superset_group).filter_by(
            workout_id=workout_id,
            is_superset=True
        ).distinct().all()

        group_letter = chr(65 + len(existing_groups))  # 65 = 'A'

        workout_exercises = []
        for idx, exercise_data in enumerate(exercises):
            order = max_order + idx + 1
            superset_label = f"{group_letter}{idx + 1}"

            we = WorkoutExercise(
                workout_id=workout_id,
                exercise_id=exercise_data['exercise_id'],
                order=order,
                block_name=block_name,
                sets=sets,
                reps_min=exercise_data.get('reps_min', 8),
                reps_max=exercise_data.get('reps_max', 12),
                rest_seconds=rest_seconds if idx == len(exercises) - 1 else 0,  # Only rest after last exercise
                is_superset=True,
                superset_group=superset_label,
                notes=exercise_data.get('notes', '')
            )

            db.session.add(we)
            workout_exercises.append(we)

        db.session.commit()

        return workout_exercises

    @staticmethod
    def clone_workout(workout_id, new_athlete_id=None, new_name=None):
        """
        Clone a workout template for reuse

        Args:
            workout_id: ID of workout to clone
            new_athlete_id: Athlete to assign cloned workout to (same athlete if None)
            new_name: Name for cloned workout (appends "Copy" if None)

        Returns:
            New Workout object
        """
        original = Workout.query.get(workout_id)
        if not original:
            raise ValueError(f"Workout {workout_id} not found")

        # Create new workout
        new_workout = Workout(
            tenant_id=original.tenant_id,
            athlete_id=new_athlete_id or original.athlete_id,
            name=new_name or f"{original.name} (Copy)",
            description=original.description,
            type=original.type,
            day_of_week=original.day_of_week,
            is_active=True
        )

        db.session.add(new_workout)
        db.session.flush()  # Get new_workout.id

        # Clone all exercises
        for we in original.exercises:
            new_we = WorkoutExercise(
                workout_id=new_workout.id,
                exercise_id=we.exercise_id,
                order=we.order,
                block_name=we.block_name,
                sets=we.sets,
                reps_min=we.reps_min,
                reps_max=we.reps_max,
                rest_seconds=we.rest_seconds,
                rpe_target=we.rpe_target,
                tempo=we.tempo,
                weight_percentage=we.weight_percentage,
                notes=we.notes,
                is_superset=we.is_superset,
                superset_group=we.superset_group
            )
            db.session.add(new_we)

        db.session.commit()

        return new_workout

    @staticmethod
    def reorder_exercises(workout_id, exercise_order):
        """
        Reorder exercises in a workout

        Args:
            workout_id: Workout ID
            exercise_order: List of workout_exercise IDs in desired order
        """
        for idx, we_id in enumerate(exercise_order):
            we = WorkoutExercise.query.get(we_id)
            if we and we.workout_id == workout_id:
                we.order = idx
            else:
                raise ValueError(f"WorkoutExercise {we_id} not found or doesn't belong to workout {workout_id}")

        db.session.commit()

    @staticmethod
    def delete_exercise_from_workout(workout_exercise_id):
        """
        Remove an exercise from a workout
        """
        we = WorkoutExercise.query.get(workout_exercise_id)
        if not we:
            raise ValueError(f"WorkoutExercise {workout_exercise_id} not found")

        workout_id = we.workout_id
        db.session.delete(we)
        db.session.commit()

        # Reorder remaining exercises
        remaining = WorkoutExercise.query.filter_by(workout_id=workout_id).order_by(WorkoutExercise.order).all()
        for idx, exercise in enumerate(remaining):
            exercise.order = idx

        db.session.commit()

    @staticmethod
    def get_workout_summary(workout_id):
        """
        Get a detailed summary of a workout

        Returns:
            dict with workout details and statistics
        """
        workout = Workout.query.get(workout_id)
        if not workout:
            return None

        exercises = workout.exercises.all()

        total_exercises = len(exercises)
        total_sets = sum(we.sets for we in exercises)
        estimated_duration = sum(
            we.sets * (30 + we.rest_seconds)  # Assume 30 seconds per set + rest
            for we in exercises
        ) // 60  # Convert to minutes

        return {
            'id': workout.id,
            'name': workout.name,
            'type': workout.type,
            'total_exercises': total_exercises,
            'total_sets': total_sets,
            'estimated_duration_minutes': estimated_duration,
            'exercises': [we.to_dict() for we in exercises],
            'athlete': workout.athlete.to_dict() if workout.athlete else None
        }

    @staticmethod
    def assign_workout_to_date(workout_id, start_date, week_number=1):
        """
        Assign a workout to a specific date range

        Args:
            workout_id: Workout ID
            start_date: Start date for workout
            week_number: Week number in program (for progressive overload)
        """
        workout = Workout.query.get(workout_id)
        if not workout:
            raise ValueError(f"Workout {workout_id} not found")

        workout.start_date = start_date
        workout.week_number = week_number
        workout.is_active = True

        db.session.commit()

        return workout
