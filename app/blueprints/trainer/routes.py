from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime, timedelta
from app.blueprints.trainer import trainer_bp
from app.models import db
from app.models.trainer import Athlete, Workout, Exercise, WorkoutExercise, ProgressLog, CheckIn, Message
from app.models.shared import User
from app.middleware.tenant_context import get_current_tenant, require_tenant
from app.services.api_helper import APIHelper, QueryBuilder


def trainer_required(f):
    """Decorator to require trainer role"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_trainer():
            flash('Access denied. Trainer privileges required.', 'danger')
            return redirect(url_for('public.index'))
        return f(*args, **kwargs)
    return decorated_function


@trainer_bp.route('/dashboard')
@trainer_required
@require_tenant
def dashboard():
    """Trainer Dashboard - Main Hub"""
    tenant = get_current_tenant()

    # Get trainer's athletes
    athletes = Athlete.query.filter_by(
        tenant_id=tenant.id,
        trainer_id=current_user.id,
        is_active=True
    ).all()

    # Get recent check-ins (last 7 days)
    seven_days_ago = datetime.utcnow().date() - timedelta(days=7)
    recent_check_ins = CheckIn.query.filter(
        CheckIn.tenant_id == tenant.id,
        CheckIn.check_in_date >= seven_days_ago
    ).order_by(CheckIn.check_in_date.desc()).limit(10).all()

    # Get unread messages
    unread_messages = Message.query.filter_by(
        tenant_id=tenant.id,
        receiver_id=current_user.id,
        is_read=False
    ).count()

    # Get active workouts count
    active_workouts = Workout.query.filter_by(
        tenant_id=tenant.id,
        is_active=True
    ).count()

    return render_template('trainer/dashboard.html',
                          tenant=tenant,
                          athletes=athletes,
                          recent_check_ins=recent_check_ins,
                          unread_messages=unread_messages,
                          active_workouts=active_workouts)


@trainer_bp.route('/athletes')
@trainer_required
@require_tenant
def athletes_list():
    """List all athletes"""
    tenant = get_current_tenant()

    # Filter options
    goal_filter = request.args.get('goal')
    status_filter = request.args.get('status', 'active')

    query = Athlete.query.filter_by(
        tenant_id=tenant.id,
        trainer_id=current_user.id
    )

    if status_filter == 'active':
        query = query.filter_by(is_active=True)
    elif status_filter == 'inactive':
        query = query.filter_by(is_active=False)

    if goal_filter:
        query = query.filter_by(goal=goal_filter)

    athletes = query.all()

    return render_template('trainer/athletes_list.html',
                          athletes=athletes,
                          goal_filter=goal_filter,
                          status_filter=status_filter)


@trainer_bp.route('/athlete/<int:athlete_id>')
@trainer_required
@require_tenant
def athlete_profile(athlete_id):
    """View athlete profile and progress"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        id=athlete_id,
        tenant_id=tenant.id,
        trainer_id=current_user.id
    ).first_or_404()

    # Get recent workouts
    workouts = Workout.query.filter_by(
        athlete_id=athlete_id,
        tenant_id=tenant.id,
        is_active=True
    ).all()

    # Get recent check-ins
    check_ins = CheckIn.query.filter_by(
        athlete_id=athlete_id,
        tenant_id=tenant.id
    ).order_by(CheckIn.check_in_date.desc()).limit(12).all()

    # Get progress summary
    from app.services.progression_algorithm import ProgressionAlgorithm
    progress_summary = ProgressionAlgorithm.get_athlete_progress_summary(athlete_id)

    return render_template('trainer/athlete_profile.html',
                          athlete=athlete,
                          workouts=workouts,
                          check_ins=check_ins,
                          progress_summary=progress_summary)


@trainer_bp.route('/athlete/add', methods=['GET', 'POST'])
@trainer_required
@require_tenant
def add_athlete():
    """Add a new athlete"""
    tenant = get_current_tenant()

    # Check if at athlete limit
    if not tenant.can_add_athlete():
        flash(f"You have reached your athlete limit ({tenant.max_athletes}). Please upgrade your subscription.", "warning")
        return redirect(url_for("trainer.athletes_list"))

    if request.method == 'POST':
        # Create user account for athlete
        email = request.form.get('email').lower()
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        password = request.form.get('password', 'changeme123')  # Default password

        # Check if email exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('An athlete with this email already exists', 'danger')
            return redirect(url_for('trainer.add_athlete'))

        # Create athlete user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='athlete',
            tenant_id=tenant.id,
            is_active=True
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        # Create athlete profile
        athlete = Athlete(
            tenant_id=tenant.id,
            user_id=user.id,
            trainer_id=current_user.id,
            goal=request.form.get('goal'),
            experience_level=request.form.get('experience_level'),
            current_weight=request.form.get('current_weight', type=float),
            height=request.form.get('height', type=float),
            target_weight=request.form.get('target_weight', type=float),
            is_active=True
        )

        db.session.add(athlete)
        db.session.commit()

        flash(f"Athlete {first_name} {last_name} added successfully!", "success")
        return redirect(url_for("trainer.athlete_profile", athlete_id=athlete.id))

    return render_template('trainer/add_athlete.html')


@trainer_bp.route('/workouts')
@trainer_required
@require_tenant
def workouts_list():
    """List all workouts"""
    tenant = get_current_tenant()

    workouts = Workout.query.filter_by(
        tenant_id=tenant.id,
        is_active=True
    ).order_by(Workout.created_at.desc()).all()

    return render_template('trainer/workouts_list.html', workouts=workouts)


@trainer_bp.route('/workout/create', methods=['GET', 'POST'])
@trainer_required
@require_tenant
def create_workout():
    """Create new workout"""
    tenant = get_current_tenant()

    if request.method == 'POST':
        athlete_id = request.form.get('athlete_id', type=int)
        name = request.form.get('name')
        description = request.form.get('description')
        workout_type = request.form.get('type')
        day_of_week = request.form.get('day_of_week', type=int)

        from app.services.workout_builder import WorkoutBuilder

        workout = WorkoutBuilder.create_workout(
            tenant_id=tenant.id,
            athlete_id=athlete_id,
            name=name,
            description=description,
            workout_type=workout_type,
            day_of_week=day_of_week
        )

        flash('Workout created successfully! Now add exercises.', 'success')
        return redirect(url_for('trainer.edit_workout', workout_id=workout.id))

    # Get athletes for dropdown
    athletes = Athlete.query.filter_by(
        tenant_id=tenant.id,
        trainer_id=current_user.id,
        is_active=True
    ).all()

    return render_template('trainer/create_workout.html', athletes=athletes)


@trainer_bp.route('/workout/<int:workout_id>/edit', methods=['GET', 'POST'])
@trainer_required
@require_tenant
def edit_workout(workout_id):
    """Edit workout and manage exercises"""
    tenant = get_current_tenant()

    workout = Workout.query.filter_by(
        id=workout_id,
        tenant_id=tenant.id
    ).first_or_404()

    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'add_exercise':
            exercise_id = request.form.get('exercise_id', type=int)
            sets = request.form.get('sets', type=int)
            reps_min = request.form.get('reps_min', type=int)
            reps_max = request.form.get('reps_max', type=int)
            rest_seconds = request.form.get('rest_seconds', type=int)
            rpe_target = request.form.get('rpe_target', type=float)
            block_name = request.form.get('block_name')

            from app.services.workout_builder import WorkoutBuilder

            WorkoutBuilder.add_exercise_to_workout(
                workout_id=workout_id,
                exercise_id=exercise_id,
                sets=sets,
                reps_min=reps_min,
                reps_max=reps_max,
                rest_seconds=rest_seconds,
                rpe_target=rpe_target,
                block_name=block_name
            )

            flash('Exercise added to workout', 'success')

        return redirect(url_for('trainer.edit_workout', workout_id=workout_id))

    # Get available exercises
    exercises = Exercise.query.filter(
        (Exercise.tenant_id == tenant.id) | (Exercise.tenant_id == None)
    ).order_by(Exercise.category, Exercise.name).all()

    return render_template('trainer/edit_workout.html',
                          workout=workout,
                          exercises=exercises)


@trainer_bp.route('/exercises')
@trainer_required
@require_tenant
def exercises_library():
    """Exercise library"""
    tenant = get_current_tenant()

    # Get global and tenant-specific exercises
    exercises = Exercise.query.filter(
        (Exercise.tenant_id == tenant.id) | (Exercise.tenant_id == None)
    ).order_by(Exercise.category, Exercise.name).all()

    # Group by category
    exercises_by_category = {}
    for exercise in exercises:
        category = exercise.category or 'Other'
        if category not in exercises_by_category:
            exercises_by_category[category] = []
        exercises_by_category[category].append(exercise)

    return render_template('trainer/exercises_library.html',
                          exercises_by_category=exercises_by_category)


@trainer_bp.route('/messages')
@trainer_required
@require_tenant
def messages():
    """Inbox - Messages with athletes"""
    tenant = get_current_tenant()

    # Get all messages
    received = Message.query.filter_by(
        tenant_id=tenant.id,
        receiver_id=current_user.id
    ).order_by(Message.created_at.desc()).all()

    sent = Message.query.filter_by(
        tenant_id=tenant.id,
        sender_id=current_user.id
    ).order_by(Message.created_at.desc()).all()

    return render_template('trainer/messages.html',
                          received=received,
                          sent=sent)


@trainer_bp.route('/profile', methods=['GET', 'POST'])
@trainer_required
@require_tenant
def profile():
    """Trainer profile and settings management"""
    tenant = get_current_tenant()

    if request.method == 'POST':
        # Check which form was submitted based on the fields
        if 'first_name' in request.form:
            # Profile update
            current_user.first_name = request.form.get('first_name')
            current_user.last_name = request.form.get('last_name')
            current_user.phone = request.form.get('phone')

            db.session.commit()
            flash('Profilo aggiornato con successo!', 'success')

        elif 'current_password' in request.form:
            # Password change
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')

            if not current_user.check_password(current_password):
                flash('Password corrente non corretta.', 'danger')
            elif new_password != confirm_password:
                flash('Le nuove password non corrispondono.', 'danger')
            elif len(new_password) < 6:
                flash('La password deve essere di almeno 6 caratteri.', 'danger')
            else:
                current_user.set_password(new_password)
                db.session.commit()
                flash('Password aggiornata con successo!', 'success')

        elif 'business_name' in request.form:
            # Business info update
            tenant.name = request.form.get('business_name')
            db.session.commit()
            flash('Informazioni aziendali aggiornate con successo!', 'success')

        return redirect(url_for('trainer.profile'))

    return render_template('trainer/profile.html', tenant=tenant)


@trainer_bp.route('/onboarding')
@trainer_required
def onboarding():
    """Onboarding flow for new trainers"""
    return render_template('trainer/onboarding.html')


@trainer_bp.route('/billing')
@trainer_required
@require_tenant
def billing():
    """Subscription and billing management"""
    tenant = get_current_tenant()

    from app.services.stripe_service import StripeService

    # Create Stripe Customer Portal session
    try:
        portal_session = StripeService.create_portal_session(tenant)
        portal_url = portal_session.url
    except Exception as e:
        portal_url = None
        flash('Unable to access billing portal. Please contact support.', 'warning')

    return render_template('trainer/billing.html',
                          tenant=tenant,
                          portal_url=portal_url)


# ========================================
# WORKOUT BUILDER - CRUD ENDPOINTS
# ========================================

# -------------------- EXERCISES --------------------

@trainer_bp.route('/api/exercises', methods=['GET'])
@trainer_required
@require_tenant
def get_exercises():
    """API: Get all exercises (global + custom)"""
    try:
        tenant = get_current_tenant()

        # Get filter parameters
        category = request.args.get('category')
        equipment = request.args.get('equipment')
        difficulty = request.args.get('difficulty')
        search = request.args.get('search')

        # Query global exercises + trainer's custom exercises
        query = Exercise.query.filter(
            db.or_(
                Exercise.tenant_id == None,  # Global exercises
                Exercise.tenant_id == tenant.id  # Custom exercises
            )
        )

        # Apply filters
        if category:
            query = query.filter_by(category=category)
        if equipment:
            query = query.filter_by(equipment=equipment)
        if difficulty:
            query = query.filter_by(difficulty_level=difficulty)
        if search:
            query = query.filter(Exercise.name.ilike(f'%{search}%'))

        exercises = query.order_by(Exercise.name).all()

        return jsonify({
            'success': True,
            'exercises': [ex.to_dict() for ex in exercises],
            'count': len(exercises)
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/exercises/<int:exercise_id>', methods=['GET'])
@trainer_required
@require_tenant
def get_exercise(exercise_id):
    """API: Get single exercise details"""
    try:
        tenant = get_current_tenant()

        exercise = Exercise.query.filter(
            Exercise.id == exercise_id,
            db.or_(
                Exercise.tenant_id == None,
                Exercise.tenant_id == tenant.id
            )
        ).first()

        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404

        return jsonify({
            'success': True,
            'exercise': exercise.to_dict()
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/exercises', methods=['POST'])
@trainer_required
@require_tenant
def create_exercise():
    """API: Create new custom exercise"""
    try:
        tenant = get_current_tenant()
        data = request.get_json()

        # Validate required fields
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'Exercise name is required'}), 400

        # Create exercise
        exercise = Exercise(
            tenant_id=tenant.id,
            name=data['name'],
            description=data.get('description'),
            category=data.get('category'),
            equipment=data.get('equipment'),
            video_url=data.get('video_url'),
            thumbnail_url=data.get('thumbnail_url'),
            instructions=data.get('instructions'),
            tips=data.get('tips'),
            primary_muscles=data.get('primary_muscles', []),
            secondary_muscles=data.get('secondary_muscles', []),
            difficulty_level=data.get('difficulty_level', 'intermediate')
        )

        db.session.add(exercise)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': exercise.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/exercises/<int:exercise_id>', methods=['PUT'])
@trainer_required
@require_tenant
def update_exercise(exercise_id):
    """API: Update custom exercise"""
    try:
        tenant = get_current_tenant()
        data = request.get_json()

        # Only custom exercises can be edited
        exercise = Exercise.query.filter_by(
            id=exercise_id,
            tenant_id=tenant.id
        ).first()

        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found or not editable'}), 404

        # Update fields
        if 'name' in data:
            exercise.name = data['name']
        if 'description' in data:
            exercise.description = data['description']
        if 'category' in data:
            exercise.category = data['category']
        if 'equipment' in data:
            exercise.equipment = data['equipment']
        if 'video_url' in data:
            exercise.video_url = data['video_url']
        if 'thumbnail_url' in data:
            exercise.thumbnail_url = data['thumbnail_url']
        if 'instructions' in data:
            exercise.instructions = data['instructions']
        if 'tips' in data:
            exercise.tips = data['tips']
        if 'primary_muscles' in data:
            exercise.primary_muscles = data['primary_muscles']
        if 'secondary_muscles' in data:
            exercise.secondary_muscles = data['secondary_muscles']
        if 'difficulty_level' in data:
            exercise.difficulty_level = data['difficulty_level']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Exercise updated successfully',
            'exercise': exercise.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/exercises/<int:exercise_id>', methods=['DELETE'])
@trainer_required
@require_tenant
def delete_exercise(exercise_id):
    """API: Delete custom exercise"""
    try:
        tenant = get_current_tenant()

        # Only custom exercises can be deleted
        exercise = Exercise.query.filter_by(
            id=exercise_id,
            tenant_id=tenant.id
        ).first()

        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found or not deletable'}), 404

        # Check if exercise is used in any workouts
        used_in_workouts = WorkoutExercise.query.filter_by(exercise_id=exercise_id).count()
        if used_in_workouts > 0:
            return jsonify({
                'success': False,
                'message': f'Cannot delete exercise. It is used in {used_in_workouts} workout(s).'
            }), 400

        db.session.delete(exercise)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Exercise deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


# -------------------- WORKOUT TEMPLATES --------------------

@trainer_bp.route('/api/workouts', methods=['GET'])
@trainer_required
@require_tenant
def get_workouts():
    """API: Get all workouts/templates"""
    try:
        tenant = get_current_tenant()

        # Get filter parameters
        athlete_id = request.args.get('athlete_id', type=int)
        workout_type = request.args.get('type')
        is_active = request.args.get('is_active')

        query = Workout.query.filter_by(tenant_id=tenant.id)

        # Apply filters
        if athlete_id:
            query = query.filter_by(athlete_id=athlete_id)
        if workout_type:
            query = query.filter_by(type=workout_type)
        if is_active is not None:
            query = query.filter_by(is_active=(is_active.lower() == 'true'))

        workouts = query.order_by(Workout.created_at.desc()).all()

        return jsonify({
            'success': True,
            'workouts': [w.to_dict() for w in workouts],
            'count': len(workouts)
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/workouts/<int:workout_id>', methods=['GET'])
@trainer_required
@require_tenant
def get_workout(workout_id):
    """API: Get single workout with exercises"""
    try:
        tenant = get_current_tenant()

        workout = Workout.query.filter_by(
            id=workout_id,
            tenant_id=tenant.id
        ).first()

        if not workout:
            return jsonify({'success': False, 'message': 'Workout not found'}), 404

        return jsonify({
            'success': True,
            'workout': workout.to_dict()
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/workouts', methods=['POST'])
@trainer_required
@require_tenant
def create_workout_api():
    """API: Create new workout template"""
    try:
        tenant = get_current_tenant()
        data = request.get_json()

        # Validate required fields
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'Workout name is required'}), 400
        if not data.get('athlete_id'):
            return jsonify({'success': False, 'message': 'Athlete ID is required'}), 400

        # Verify athlete belongs to trainer
        athlete = Athlete.query.filter_by(
            id=data['athlete_id'],
            tenant_id=tenant.id,
            trainer_id=current_user.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Create workout
        workout = Workout(
            tenant_id=tenant.id,
            athlete_id=data['athlete_id'],
            name=data['name'],
            description=data.get('description'),
            type=data.get('type', 'strength'),
            day_of_week=data.get('day_of_week'),
            week_number=data.get('week_number', 1),
            is_active=data.get('is_active', True),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None
        )

        db.session.add(workout)
        db.session.flush()  # Get workout.id

        # Add exercises if provided
        if 'exercises' in data and data['exercises']:
            for ex_data in data['exercises']:
                workout_exercise = WorkoutExercise(
                    workout_id=workout.id,
                    exercise_id=ex_data['exercise_id'],
                    order=ex_data.get('order', 0),
                    block_name=ex_data.get('block_name'),
                    sets=ex_data.get('sets', 3),
                    reps_min=ex_data.get('reps_min'),
                    reps_max=ex_data.get('reps_max'),
                    rest_seconds=ex_data.get('rest_seconds', 90),
                    rpe_target=ex_data.get('rpe_target'),
                    tempo=ex_data.get('tempo'),
                    weight_percentage=ex_data.get('weight_percentage'),
                    notes=ex_data.get('notes'),
                    is_superset=ex_data.get('is_superset', False),
                    superset_group=ex_data.get('superset_group')
                )
                db.session.add(workout_exercise)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Workout created successfully',
            'workout': workout.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/workouts/<int:workout_id>', methods=['PUT'])
@trainer_required
@require_tenant
def update_workout(workout_id):
    """API: Update workout template"""
    try:
        tenant = get_current_tenant()
        data = request.get_json()

        workout = Workout.query.filter_by(
            id=workout_id,
            tenant_id=tenant.id
        ).first()

        if not workout:
            return jsonify({'success': False, 'message': 'Workout not found'}), 404

        # Update basic fields
        if 'name' in data:
            workout.name = data['name']
        if 'description' in data:
            workout.description = data['description']
        if 'type' in data:
            workout.type = data['type']
        if 'day_of_week' in data:
            workout.day_of_week = data['day_of_week']
        if 'week_number' in data:
            workout.week_number = data['week_number']
        if 'is_active' in data:
            workout.is_active = data['is_active']
        if 'start_date' in data and data['start_date']:
            workout.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data and data['end_date']:
            workout.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()

        # Update exercises if provided
        if 'exercises' in data:
            # Remove existing exercises
            WorkoutExercise.query.filter_by(workout_id=workout.id).delete()

            # Add updated exercises
            for ex_data in data['exercises']:
                workout_exercise = WorkoutExercise(
                    workout_id=workout.id,
                    exercise_id=ex_data['exercise_id'],
                    order=ex_data.get('order', 0),
                    block_name=ex_data.get('block_name'),
                    sets=ex_data.get('sets', 3),
                    reps_min=ex_data.get('reps_min'),
                    reps_max=ex_data.get('reps_max'),
                    rest_seconds=ex_data.get('rest_seconds', 90),
                    rpe_target=ex_data.get('rpe_target'),
                    tempo=ex_data.get('tempo'),
                    weight_percentage=ex_data.get('weight_percentage'),
                    notes=ex_data.get('notes'),
                    is_superset=ex_data.get('is_superset', False),
                    superset_group=ex_data.get('superset_group')
                )
                db.session.add(workout_exercise)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Workout updated successfully',
            'workout': workout.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/workouts/<int:workout_id>', methods=['DELETE'])
@trainer_required
@require_tenant
def delete_workout(workout_id):
    """API: Delete workout"""
    try:
        tenant = get_current_tenant()

        workout = Workout.query.filter_by(
            id=workout_id,
            tenant_id=tenant.id
        ).first()

        if not workout:
            return jsonify({'success': False, 'message': 'Workout not found'}), 404

        db.session.delete(workout)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Workout deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


# -------------------- WORKOUT ASSIGNMENT --------------------

@trainer_bp.route('/api/workouts/<int:workout_id>/clone', methods=['POST'])
@trainer_required
@require_tenant
def clone_workout(workout_id):
    """API: Clone workout to another athlete or same athlete"""
    try:
        tenant = get_current_tenant()
        data = request.get_json()

        # Get source workout
        source_workout = Workout.query.filter_by(
            id=workout_id,
            tenant_id=tenant.id
        ).first()

        if not source_workout:
            return jsonify({'success': False, 'message': 'Source workout not found'}), 404

        # Validate target athlete
        target_athlete_id = data.get('athlete_id')
        if not target_athlete_id:
            return jsonify({'success': False, 'message': 'Target athlete ID is required'}), 400

        target_athlete = Athlete.query.filter_by(
            id=target_athlete_id,
            tenant_id=tenant.id,
            trainer_id=current_user.id
        ).first()

        if not target_athlete:
            return jsonify({'success': False, 'message': 'Target athlete not found'}), 404

        # Clone workout
        new_workout = Workout(
            tenant_id=tenant.id,
            athlete_id=target_athlete_id,
            name=data.get('name', f"{source_workout.name} (Copy)"),
            description=source_workout.description,
            type=source_workout.type,
            day_of_week=data.get('day_of_week', source_workout.day_of_week),
            week_number=data.get('week_number', source_workout.week_number),
            is_active=data.get('is_active', True),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None
        )

        db.session.add(new_workout)
        db.session.flush()

        # Clone exercises
        for source_ex in source_workout.exercises:
            new_exercise = WorkoutExercise(
                workout_id=new_workout.id,
                exercise_id=source_ex.exercise_id,
                order=source_ex.order,
                block_name=source_ex.block_name,
                sets=source_ex.sets,
                reps_min=source_ex.reps_min,
                reps_max=source_ex.reps_max,
                rest_seconds=source_ex.rest_seconds,
                rpe_target=source_ex.rpe_target,
                tempo=source_ex.tempo,
                weight_percentage=source_ex.weight_percentage,
                notes=source_ex.notes,
                is_superset=source_ex.is_superset,
                superset_group=source_ex.superset_group
            )
            db.session.add(new_exercise)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Workout cloned successfully',
            'workout': new_workout.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


# -------------------- PROGRESS TRACKING --------------------

@trainer_bp.route('/api/progress/<int:athlete_id>', methods=['GET'])
@trainer_required
@require_tenant
def get_athlete_progress(athlete_id):
    """API: Get athlete's progress data"""
    try:
        tenant = get_current_tenant()

        # Verify athlete
        athlete = Athlete.query.filter_by(
            id=athlete_id,
            tenant_id=tenant.id,
            trainer_id=current_user.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Get date range
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow().date() - timedelta(days=days)

        # Get progress logs
        progress_logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete_id,
            ProgressLog.tenant_id == tenant.id,
            ProgressLog.date >= start_date
        ).order_by(ProgressLog.date.desc()).all()

        # Calculate statistics
        total_volume = sum([log.total_volume for log in progress_logs])
        total_workouts = len(set([log.date for log in progress_logs]))

        # Group by exercise for progression analysis
        exercise_progress = {}
        for log in progress_logs:
            ex_id = log.workout_exercise.exercise_id
            if ex_id not in exercise_progress:
                exercise_progress[ex_id] = {
                    'exercise_name': log.workout_exercise.exercise.name,
                    'logs': []
                }
            exercise_progress[ex_id]['logs'].append(log.to_dict())

        return jsonify({
            'success': True,
            'stats': {
                'total_volume': total_volume,
                'total_workouts': total_workouts,
                'days_tracked': days
            },
            'progress_logs': [log.to_dict() for log in progress_logs],
            'exercise_progress': exercise_progress
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@trainer_bp.route('/api/progress/log', methods=['POST'])
@trainer_required
@require_tenant
def create_progress_log():
    """API: Create progress log (trainer can log on behalf of athlete)"""
    try:
        tenant = get_current_tenant()
        data = request.get_json()

        # Validate required fields
        if not all(k in data for k in ['athlete_id', 'workout_exercise_id', 'date']):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Verify athlete
        athlete = Athlete.query.filter_by(
            id=data['athlete_id'],
            tenant_id=tenant.id,
            trainer_id=current_user.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Create progress log
        progress_log = ProgressLog(
            tenant_id=tenant.id,
            athlete_id=data['athlete_id'],
            workout_exercise_id=data['workout_exercise_id'],
            date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
            sets_completed=data.get('sets_completed'),
            reps_completed=data.get('reps_completed', []),
            weight_used=data.get('weight_used'),
            rpe_actual=data.get('rpe_actual'),
            difficulty_rating=data.get('difficulty_rating'),
            notes=data.get('notes'),
            form_check_video_url=data.get('form_check_video_url')
        )

        db.session.add(progress_log)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Progress logged successfully',
            'log': progress_log.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


# ============================================================================
# ENHANCED API ENDPOINTS WITH PAGINATION, FILTERING, SORTING, SEARCH
# ============================================================================

@trainer_bp.route('/api/v2/athletes', methods=['GET'])
@trainer_required
@require_tenant
def get_athletes_enhanced():
    """Enhanced athletes list with full API capabilities"""
    tenant = get_current_tenant()

    # Build base query
    query_builder = QueryBuilder(Athlete)
    query_builder.filter_by_tenant(tenant.id).filter_by_user(current_user.id, 'trainer_id')

    # Apply filters
    status = request.args.get('status')  # active, inactive
    goal = request.args.get('goal')  # mass, cut, performance, health
    experience_level = request.args.get('experience_level')  # beginner, intermediate, advanced

    if status == 'active':
        query_builder.filter_active_only()
    elif status == 'inactive':
        query_builder.query = query_builder.query.filter_by(is_active=False)

    if goal:
        query_builder.query = query_builder.query.filter_by(goal=goal)
    if experience_level:
        query_builder.query = query_builder.query.filter_by(experience_level=experience_level)

    # Apply search
    search_term = request.args.get('search', '')
    if search_term:
        query_builder.search(search_term, 'first_name', 'last_name', 'email')

    # Apply sorting
    sort_field = request.args.get('sort', 'created_at')
    sort_order = request.args.get('order', 'desc')
    query_builder.sort(sort_field, sort_order)

    # Paginate
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = query_builder.paginate(page, per_page)

    # Serialize athletes with user info
    athletes_data = []
    for athlete in result['items']:
        athlete_dict = athlete.to_dict()
        if athlete.user:
            athlete_dict['user'] = {
                'email': athlete.user.email,
                'first_name': athlete.user.first_name,
                'last_name': athlete.user.last_name,
                'avatar_url': athlete.user.avatar_url
            }
        athletes_data.append(athlete_dict)

    return jsonify({
        'success': True,
        'athletes': athletes_data,
        'pagination': result['pagination']
    })


@trainer_bp.route('/api/v2/exercises', methods=['GET'])
@trainer_required
@require_tenant
def get_exercises_enhanced():
    """Enhanced exercises list with filtering, search, and pagination"""
    tenant = get_current_tenant()

    # Build query - global exercises + trainer's custom exercises
    from sqlalchemy import or_
    base_query = Exercise.query.filter(
        or_(Exercise.tenant_id == None, Exercise.tenant_id == tenant.id)
    )

    # Apply filters
    category = request.args.get('category')
    equipment = request.args.get('equipment')
    difficulty = request.args.get('difficulty')
    muscle_group = request.args.get('muscle_group')

    if category:
        base_query = base_query.filter_by(category=category)
    if equipment:
        base_query = base_query.filter_by(equipment=equipment)
    if difficulty:
        base_query = base_query.filter_by(difficulty_level=difficulty)
    if muscle_group:
        # Search in JSON array primary_muscles
        base_query = base_query.filter(Exercise.primary_muscles.contains([muscle_group]))

    # Apply search
    search_term = request.args.get('search', '')
    if search_term:
        base_query = base_query.filter(
            or_(
                Exercise.name.ilike(f'%{search_term}%'),
                Exercise.description.ilike(f'%{search_term}%')
            )
        )

    # Apply sorting
    sort_field = request.args.get('sort', 'name')
    sort_order = request.args.get('order', 'asc')

    if hasattr(Exercise, sort_field):
        column = getattr(Exercise, sort_field)
        if sort_order == 'asc':
            base_query = base_query.order_by(column.asc())
        else:
            base_query = base_query.order_by(column.desc())

    # Paginate
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    pagination = base_query.paginate(page=page, per_page=min(per_page, 100), error_out=False)

    return jsonify({
        'success': True,
        'exercises': [ex.to_dict() for ex in pagination.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@trainer_bp.route('/api/v2/workouts', methods=['GET'])
@trainer_required
@require_tenant
def get_workouts_enhanced():
    """Enhanced workouts list with filtering and pagination"""
    tenant = get_current_tenant()

    # Build query
    query_builder = QueryBuilder(Workout)
    query_builder.filter_by_tenant(tenant.id)

    # Filter by athlete
    athlete_id = request.args.get('athlete_id', type=int)
    if athlete_id:
        # Verify athlete belongs to trainer
        athlete = Athlete.query.filter_by(
            id=athlete_id,
            tenant_id=tenant.id,
            trainer_id=current_user.id
        ).first()
        if athlete:
            query_builder.query = query_builder.query.filter_by(athlete_id=athlete_id)

    # Filter by type
    workout_type = request.args.get('type')
    if workout_type:
        query_builder.filter_by_type(workout_type, 'type')

    # Filter by status
    status = request.args.get('status')
    if status == 'active':
        query_builder.filter_active_only()
    elif status == 'inactive':
        query_builder.query = query_builder.query.filter_by(is_active=False)

    # Filter by date range
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    if start_date_str or end_date_str:
        from datetime import datetime
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        query_builder.filter_date_range('start_date', start_date, end_date)

    # Search
    search_term = request.args.get('search', '')
    if search_term:
        query_builder.search(search_term, 'name', 'description')

    # Sort
    sort_field = request.args.get('sort', 'created_at')
    sort_order = request.args.get('order', 'desc')
    query_builder.sort(sort_field, sort_order)

    # Paginate
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = query_builder.paginate(page, per_page)

    # Serialize with athlete info
    workouts_data = []
    for workout in result['items']:
        workout_dict = workout.to_dict()
        if workout.athlete:
            workout_dict['athlete_name'] = f"{workout.athlete.user.first_name} {workout.athlete.user.last_name}"
        workouts_data.append(workout_dict)

    return jsonify({
        'success': True,
        'workouts': workouts_data,
        'pagination': result['pagination']
    })


@trainer_bp.route('/api/v2/check-ins', methods=['GET'])
@trainer_required
@require_tenant
def get_check_ins_enhanced():
    """Enhanced check-ins list with filtering and pagination"""
    tenant = get_current_tenant()

    # Build query for check-ins from trainer's athletes
    base_query = CheckIn.query.join(Athlete).filter(
        Athlete.tenant_id == tenant.id,
        Athlete.trainer_id == current_user.id
    )

    # Filter by athlete
    athlete_id = request.args.get('athlete_id', type=int)
    if athlete_id:
        base_query = base_query.filter(CheckIn.athlete_id == athlete_id)

    # Filter by date range
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    if start_date_str or end_date_str:
        from datetime import datetime
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            base_query = base_query.filter(CheckIn.check_in_date >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            base_query = base_query.filter(CheckIn.check_in_date <= end_date)

    # Sort
    sort_field = request.args.get('sort', 'check_in_date')
    sort_order = request.args.get('order', 'desc')

    if hasattr(CheckIn, sort_field):
        column = getattr(CheckIn, sort_field)
        if sort_order == 'asc':
            base_query = base_query.order_by(column.asc())
        else:
            base_query = base_query.order_by(column.desc())

    # Paginate
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    pagination = base_query.paginate(page=page, per_page=min(per_page, 100), error_out=False)

    # Serialize
    check_ins_data = []
    for check_in in pagination.items:
        check_in_dict = check_in.to_dict()
        check_in_dict['athlete_name'] = f"{check_in.athlete.user.first_name} {check_in.athlete.user.last_name}"
        check_ins_data.append(check_in_dict)

    return jsonify({
        'success': True,
        'check_ins': check_ins_data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@trainer_bp.route('/api/v2/progress-logs', methods=['GET'])
@trainer_required
@require_tenant
def get_progress_logs_enhanced():
    """Enhanced progress logs with filtering and pagination"""
    tenant = get_current_tenant()

    # Required: athlete_id
    athlete_id = request.args.get('athlete_id', type=int)
    if not athlete_id:
        return jsonify({'success': False, 'message': 'athlete_id is required'}), 400

    # Verify athlete
    athlete = Athlete.query.filter_by(
        id=athlete_id,
        tenant_id=tenant.id,
        trainer_id=current_user.id
    ).first_or_404()

    # Build query
    base_query = ProgressLog.query.filter_by(athlete_id=athlete_id)

    # Filter by exercise
    exercise_id = request.args.get('exercise_id', type=int)
    if exercise_id:
        base_query = base_query.filter_by(exercise_id=exercise_id)

    # Filter by date range
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    if start_date_str or end_date_str:
        from datetime import datetime
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            base_query = base_query.filter(ProgressLog.logged_at >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            base_query = base_query.filter(ProgressLog.logged_at <= end_date)

    # Sort
    sort_field = request.args.get('sort', 'logged_at')
    sort_order = request.args.get('order', 'desc')

    if hasattr(ProgressLog, sort_field):
        column = getattr(ProgressLog, sort_field)
        if sort_order == 'asc':
            base_query = base_query.order_by(column.asc())
        else:
            base_query = base_query.order_by(column.desc())

    # Paginate
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    pagination = base_query.paginate(page=page, per_page=min(per_page, 100), error_out=False)

    return jsonify({
        'success': True,
        'logs': [log.to_dict() for log in pagination.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })
