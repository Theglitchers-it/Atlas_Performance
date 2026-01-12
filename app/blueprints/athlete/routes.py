from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime, date, timedelta
from app.blueprints.athlete import athlete_bp
from app.models import db
from app.models.trainer import (
    Athlete, Workout, WorkoutExercise, ProgressLog,
    CheckIn, MealPlan, FoodLog, Message, Machine, PersonalRecord
)
from app.middleware.tenant_context import get_current_tenant, require_tenant


def athlete_required(f):
    """Decorator to require athlete role"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_athlete():
            flash('Access denied. Athlete access required.', 'danger')
            return redirect(url_for('public.index'))
        return f(*args, **kwargs)
    return decorated_function


@athlete_bp.route('/dashboard')
@athlete_required
@require_tenant
def dashboard():
    """Athlete Dashboard - Enhanced with Stats, Charts & Calendar"""
    tenant = get_current_tenant()

    # Get athlete profile
    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    if not athlete:
        flash('Athlete profile not found', 'danger')
        return redirect(url_for('public.index'))

    # Get today's workouts
    today = date.today()
    day_of_week = today.weekday()  # 0=Monday, 6=Sunday

    todays_workouts = Workout.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id,
        is_active=True,
        day_of_week=day_of_week
    ).all()

    # Get recent progress (last 7 days)
    seven_days_ago = today - timedelta(days=7)
    recent_logs = ProgressLog.query.filter(
        ProgressLog.athlete_id == athlete.id,
        ProgressLog.date >= seven_days_ago
    ).order_by(ProgressLog.date.desc()).limit(10).all()

    # Get unread messages from trainer
    unread_messages = Message.query.filter_by(
        tenant_id=tenant.id,
        receiver_id=current_user.id,
        is_read=False
    ).count()

    # Get next check-in date
    last_check_in = CheckIn.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).order_by(CheckIn.check_in_date.desc()).first()

    next_check_in = None
    if last_check_in:
        next_check_in = last_check_in.check_in_date + timedelta(days=7)

    # Get personal records
    personal_records = PersonalRecord.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).order_by(PersonalRecord.date_achieved.desc()).limit(10).all()

    return render_template('athlete/dashboard.html',
                          athlete=athlete,
                          todays_workouts=todays_workouts,
                          recent_logs=recent_logs,
                          unread_messages=unread_messages,
                          next_check_in=next_check_in,
                          personal_records=personal_records)


@athlete_bp.route('/workout/<int:workout_id>')
@athlete_required
@require_tenant
def workout_detail(workout_id):
    """View workout details and perform workout"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    workout = Workout.query.filter_by(
        id=workout_id,
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).first_or_404()

    # Get exercises in workout
    exercises = workout.exercises.all()

    # Get last performance for each exercise (for reference)
    last_performances = {}
    for we in exercises:
        last_log = ProgressLog.query.filter_by(
            athlete_id=athlete.id,
            workout_exercise_id=we.id
        ).order_by(ProgressLog.date.desc()).first()

        if last_log:
            last_performances[we.id] = last_log.to_dict()

            # Get progression suggestion
            from app.services.progression_algorithm import ProgressionAlgorithm
            suggestion = ProgressionAlgorithm.calculate_next_weight(
                athlete.id,
                we.id
            )
            last_performances[we.id]['suggestion'] = suggestion

    return render_template('athlete/workout_detail.html',
                          workout=workout,
                          exercises=exercises,
                          last_performances=last_performances)


@athlete_bp.route('/workout/<int:workout_id>/log', methods=['POST'])
@athlete_required
@require_tenant
def log_workout(workout_id):
    """Log workout performance"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Get form data
    workout_exercise_id = request.form.get('workout_exercise_id', type=int)
    weight_used = request.form.get('weight_used', type=float)
    sets_completed = request.form.get('sets_completed', type=int)
    reps_completed_str = request.form.get('reps_completed')  # e.g., "12,10,8"
    rpe_actual = request.form.get('rpe_actual', type=float)
    notes = request.form.get('notes', '')

    # Parse reps
    reps_completed = [int(r) for r in reps_completed_str.split(',') if r.strip()]

    # Create progress log
    progress_log = ProgressLog(
        tenant_id=tenant.id,
        athlete_id=athlete.id,
        workout_exercise_id=workout_exercise_id,
        date=date.today(),
        sets_completed=sets_completed,
        reps_completed=reps_completed,
        weight_used=weight_used,
        rpe_actual=rpe_actual,
        notes=notes
    )

    db.session.add(progress_log)
    db.session.commit()

    flash('Exercise logged successfully!', 'success')
    return redirect(url_for('athlete.workout_detail', workout_id=workout_id))


@athlete_bp.route('/progress')
@athlete_required
@require_tenant
def progress():
    """View progress tracking and analytics - Enhanced with charts and comparisons"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Get check-ins history
    check_ins = CheckIn.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).order_by(CheckIn.check_in_date.desc()).all()

    # Get overall progress summary
    from app.services.progression_algorithm import ProgressionAlgorithm
    progress_summary = ProgressionAlgorithm.get_athlete_progress_summary(athlete.id)

    # Get personal records
    personal_records = PersonalRecord.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).order_by(PersonalRecord.date_achieved.desc()).all()

    return render_template('athlete/progress.html',
                          athlete=athlete,
                          check_ins=check_ins,
                          progress_summary=progress_summary,
                          personal_records=personal_records)


@athlete_bp.route('/check-in', methods=['GET', 'POST'])
@athlete_required
@require_tenant
def check_in():
    """Weekly check-in form"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    if request.method == 'POST':
        # Create check-in record
        check_in_record = CheckIn(
            tenant_id=tenant.id,
            athlete_id=athlete.id,
            check_in_date=date.today(),
            weight=request.form.get('weight', type=float),
            body_fat_percentage=request.form.get('body_fat_percentage', type=float),
            # Measurements
            chest=request.form.get('chest', type=float),
            waist=request.form.get('waist', type=float),
            hips=request.form.get('hips', type=float),
            thigh_left=request.form.get('thigh_left', type=float),
            arm_left=request.form.get('arm_left', type=float),
            # Subjective feedback
            energy_level=request.form.get('energy_level', type=int),
            sleep_quality=request.form.get('sleep_quality', type=int),
            stress_level=request.form.get('stress_level', type=int),
            hunger_level=request.form.get('hunger_level', type=int),
            motivation=request.form.get('motivation', type=int),
            notes=request.form.get('notes', '')
        )

        db.session.add(check_in_record)

        # Update athlete's current weight
        if check_in_record.weight:
            athlete.current_weight = check_in_record.weight

        db.session.commit()

        flash('Check-in submitted successfully!', 'success')
        return redirect(url_for('athlete.progress'))

    # Get last check-in for reference
    last_check_in = CheckIn.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).order_by(CheckIn.check_in_date.desc()).first()

    return render_template('athlete/check_in.html',
                          athlete=athlete,
                          last_check_in=last_check_in)


@athlete_bp.route('/calendar')
@athlete_required
@require_tenant
def calendar_view():
    """Calendar view for workouts and check-ins"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Get next check-in date
    last_check_in = CheckIn.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).order_by(CheckIn.check_in_date.desc()).first()

    next_check_in = None
    if last_check_in:
        next_check_in = last_check_in.check_in_date + timedelta(days=7)

    # Get current month/year
    from datetime import date
    today = date.today()
    current_month = today.strftime('%B')
    current_year = today.year

    # Italian month names
    month_names_it = {
        'January': 'Gennaio', 'February': 'Febbraio', 'March': 'Marzo',
        'April': 'Aprile', 'May': 'Maggio', 'June': 'Giugno',
        'July': 'Luglio', 'August': 'Agosto', 'September': 'Settembre',
        'October': 'Ottobre', 'November': 'Novembre', 'December': 'Dicembre'
    }
    current_month = month_names_it.get(current_month, current_month)

    return render_template('athlete/calendar.html',
                          athlete=athlete,
                          next_check_in=next_check_in,
                          current_month=current_month,
                          current_year=current_year,
                          today=today)


@athlete_bp.route('/nutrition')
@athlete_required
@require_tenant
def nutrition():
    """Nutrition tracking dashboard"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Get active meal plan
    meal_plan = MealPlan.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id,
        is_active=True
    ).first()

    # Get recent food logs (last 7 days)
    seven_days_ago = date.today() - timedelta(days=7)

    if meal_plan:
        food_logs = FoodLog.query.filter(
            FoodLog.meal_plan_id == meal_plan.id,
            FoodLog.date >= seven_days_ago
        ).order_by(FoodLog.date.desc()).all()
    else:
        food_logs = []

    return render_template('athlete/nutrition.html',
                          athlete=athlete,
                          meal_plan=meal_plan,
                          food_logs=food_logs)


@athlete_bp.route('/nutrition/log', methods=['POST'])
@athlete_required
@require_tenant
def log_nutrition():
    """Log daily nutrition"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    meal_plan = MealPlan.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id,
        is_active=True
    ).first()

    if not meal_plan:
        flash('No active meal plan found', 'warning')
        return redirect(url_for('athlete.nutrition'))

    # Create food log
    food_log = FoodLog(
        tenant_id=tenant.id,
        meal_plan_id=meal_plan.id,
        date=date.today(),
        calories_consumed=request.form.get('calories', type=int),
        protein_consumed=request.form.get('protein', type=int),
        carbs_consumed=request.form.get('carbs', type=int),
        fats_consumed=request.form.get('fats', type=int),
        notes=request.form.get('notes', '')
    )

    db.session.add(food_log)
    db.session.commit()

    flash('Nutrition logged successfully!', 'success')
    return redirect(url_for('athlete.nutrition'))


@athlete_bp.route('/media')
@athlete_required
@require_tenant
def media():
    """Media library with videos and photos"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Fetch videos and photos from database
    from app.models.trainer import UploadedFile

    # Get videos (exercise videos, form check videos, etc.)
    videos = UploadedFile.query.filter_by(
        tenant_id=tenant.id,
        user_id=current_user.id,
        file_type='video',
        is_deleted=False
    ).order_by(UploadedFile.created_at.desc()).all()

    # Get photos (progress photos, profile pictures, etc.)
    photos = UploadedFile.query.filter_by(
        tenant_id=tenant.id,
        user_id=current_user.id,
        file_type='image',
        is_deleted=False
    ).order_by(UploadedFile.created_at.desc()).all()

    return render_template('athlete/media.html',
                          athlete=athlete,
                          videos=videos,
                          photos=photos)


@athlete_bp.route('/scan/<qr_code>')
@athlete_required
@require_tenant
def scan_machine(qr_code):
    """
    QR Code scan endpoint
    Shows machine video tutorial and athlete's PR
    """
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Find machine by QR code
    machine = Machine.query.filter_by(qr_code=qr_code).first()

    if not machine:
        flash('Machine not found', 'danger')
        return redirect(url_for('athlete.dashboard'))

    # Get athlete's PR on this machine
    personal_record = PersonalRecord.query.filter_by(
        athlete_id=athlete.id,
        machine_id=machine.id
    ).order_by(PersonalRecord.date_achieved.desc()).first()

    return render_template('athlete/machine_scan.html',
                          machine=machine,
                          personal_record=personal_record,
                          athlete=athlete)


@athlete_bp.route('/messages')
@athlete_required
@require_tenant
def messages():
    """View messages from trainer"""
    tenant = get_current_tenant()

    # Get all messages
    received = Message.query.filter_by(
        tenant_id=tenant.id,
        receiver_id=current_user.id
    ).order_by(Message.created_at.desc()).all()

    # Convert messages to dict for JSON serialization
    messages_data = []
    for msg in received:
        msg_dict = {
            'id': msg.id,
            'subject': msg.subject,
            'body': msg.body,
            'is_read': msg.is_read,
            'created_at': msg.created_at.isoformat() if msg.created_at else None,
            'attachment_url': msg.attachment_url,
            'sender': {
                'first_name': msg.sender.first_name if msg.sender else '',
                'last_name': msg.sender.last_name if msg.sender else ''
            } if msg.sender else None
        }
        messages_data.append(msg_dict)

    return render_template('athlete/messages.html', messages=messages_data)


@athlete_bp.route('/messages/<int:message_id>/read', methods=['POST'])
@athlete_required
@require_tenant
def mark_message_read(message_id):
    """Mark a message as read"""
    try:
        tenant = get_current_tenant()

        message = Message.query.filter_by(
            id=message_id,
            tenant_id=tenant.id,
            receiver_id=current_user.id
        ).first()

        if not message:
            return jsonify({'success': False, 'message': 'Messaggio non trovato'}), 404

        message.is_read = True
        db.session.commit()

        return jsonify({'success': True, 'message': 'Messaggio segnato come letto'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/messages/send', methods=['POST'])
@athlete_required
@require_tenant
def send_message():
    """Send a new message or reply to trainer"""
    try:
        tenant = get_current_tenant()

        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Profilo atleta non trovato'}), 404

        # Get trainer (assuming trainer_id is stored in athlete record)
        # If not, you may need to adjust this logic
        trainer_id = athlete.trainer_id if hasattr(athlete, 'trainer_id') else None

        if not trainer_id:
            # Try to find any trainer in the tenant
            from app.models.user import User
            trainer = User.query.filter_by(
                tenant_id=tenant.id,
                role='trainer'
            ).first()
            if trainer:
                trainer_id = trainer.id
            else:
                return jsonify({'success': False, 'message': 'Nessun trainer trovato'}), 404

        # Create message
        new_message = Message(
            tenant_id=tenant.id,
            sender_id=current_user.id,
            receiver_id=trainer_id,
            subject=request.form.get('subject', ''),
            body=request.form.get('message') or request.form.get('body'),
            is_read=False
        )

        # Handle attachment if present
        if 'attachment' in request.files:
            file = request.files['attachment']
            if file and file.filename:
                # Save attachment (implement proper file storage)
                import os
                from werkzeug.utils import secure_filename

                filename = secure_filename(file.filename)
                upload_folder = os.path.join('app', 'static', 'uploads', 'attachments')
                os.makedirs(upload_folder, exist_ok=True)

                filepath = os.path.join(upload_folder, f"{current_user.id}_{filename}")
                file.save(filepath)

                new_message.attachment_url = f"/static/uploads/attachments/{current_user.id}_{filename}"

        db.session.add(new_message)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Messaggio inviato con successo'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/profile')
@athlete_required
@require_tenant
def profile():
    """Athlete profile and settings"""
    tenant = get_current_tenant()

    athlete = Athlete.query.filter_by(
        user_id=current_user.id,
        tenant_id=tenant.id
    ).first()

    # Get statistics
    workout_count = Workout.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).count()

    checkin_count = CheckIn.query.filter_by(
        athlete_id=athlete.id,
        tenant_id=tenant.id
    ).count()

    # Calculate days active (days since registration)
    if current_user.created_at:
        days_active = (date.today() - current_user.created_at.date()).days
    else:
        days_active = 0

    return render_template('athlete/profile.html',
                          athlete=athlete,
                          workout_count=workout_count,
                          checkin_count=checkin_count,
                          days_active=days_active)


@athlete_bp.route('/profile/update', methods=['POST'])
@athlete_required
@require_tenant
def update_profile():
    """Update athlete profile information"""
    try:
        # Update user information
        current_user.first_name = request.form.get('first_name')
        current_user.last_name = request.form.get('last_name')
        current_user.email = request.form.get('email')
        current_user.phone = request.form.get('phone')

        # Update date of birth if provided
        dob_str = request.form.get('date_of_birth')
        if dob_str:
            current_user.date_of_birth = datetime.strptime(dob_str, '%Y-%m-%d').date()

        # Update gender
        gender = request.form.get('gender')
        if gender:
            current_user.gender = gender

        # Update address fields
        current_user.address = request.form.get('address')
        current_user.city = request.form.get('city')
        current_user.postal_code = request.form.get('postal_code')
        current_user.country = request.form.get('country')

        db.session.commit()

        return jsonify({'success': True, 'message': 'Profilo aggiornato con successo'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/profile/upload-avatar', methods=['POST'])
@athlete_required
@require_tenant
def upload_avatar():
    """Upload athlete avatar"""
    try:
        if 'avatar' not in request.files:
            return jsonify({'success': False, 'message': 'Nessun file caricato'}), 400

        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nessun file selezionato'}), 400

        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'success': False, 'message': 'Formato file non valido'}), 400

        # Save file (you would implement actual file storage here)
        # For now, we'll just update the avatar_url field
        # In production, you'd upload to S3 or local storage
        import os
        from werkzeug.utils import secure_filename

        filename = secure_filename(file.filename)
        upload_folder = os.path.join('app', 'static', 'uploads', 'avatars')
        os.makedirs(upload_folder, exist_ok=True)

        filepath = os.path.join(upload_folder, f"{current_user.id}_{filename}")
        file.save(filepath)

        # Update user avatar URL
        current_user.avatar_url = f"/static/uploads/avatars/{current_user.id}_{filename}"
        db.session.commit()

        return jsonify({'success': True, 'message': 'Avatar caricato con successo'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/profile/change-password', methods=['POST'])
@athlete_required
@require_tenant
def change_password():
    """Change athlete password"""
    try:
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')

        # Verify current password
        if not current_user.check_password(current_password):
            return jsonify({'success': False, 'message': 'Password attuale non corretta'}), 400

        # Update password
        current_user.set_password(new_password)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Password aggiornata con successo'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/profile/update-preferences', methods=['POST'])
@athlete_required
@require_tenant
def update_preferences():
    """Update athlete preferences"""
    try:
        # Collect preferences from form
        preferences = {
            'email_notifications': request.form.get('email_notifications') == 'on',
            'workout_reminders': request.form.get('workout_reminders') == 'on',
            'push_notifications': request.form.get('push_notifications') == 'on',
            'language': request.form.get('language'),
            'timezone': request.form.get('timezone'),
            'public_profile': request.form.get('public_profile') == 'on',
            'share_progress': request.form.get('share_progress') == 'on'
        }

        # Store preferences in database
        current_user.update_preferences(preferences)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Preferenze aggiornate con successo'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/weight-data')
@athlete_required
@require_tenant
def get_weight_data():
    """API endpoint for weight chart data"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Get days parameter (default 30)
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)

        # Get check-ins with weight data
        check_ins = CheckIn.query.filter(
            CheckIn.athlete_id == athlete.id,
            CheckIn.tenant_id == tenant.id,
            CheckIn.check_in_date >= start_date,
            CheckIn.weight.isnot(None)
        ).order_by(CheckIn.check_in_date.asc()).all()

        # Format data for chart
        labels = [ci.check_in_date.strftime('%d %b') for ci in check_ins]
        weights = [float(ci.weight) for ci in check_ins]

        return jsonify({
            'success': True,
            'labels': labels,
            'data': weights,
            'target': float(athlete.target_weight) if athlete.target_weight else None
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/volume-data')
@athlete_required
@require_tenant
def get_volume_data():
    """API endpoint for workout volume chart data"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Get last 7 days of workout volume
        days_labels = []
        volumes = []

        for i in range(6, -1, -1):
            target_date = date.today() - timedelta(days=i)
            days_labels.append(target_date.strftime('%a'))

            # Calculate total volume for the day
            day_logs = ProgressLog.query.filter(
                ProgressLog.athlete_id == athlete.id,
                ProgressLog.date == target_date
            ).all()

            total_volume = 0
            for log in day_logs:
                if log.weight_used and log.sets_completed:
                    # Volume = weight × reps × sets
                    total_reps = sum(log.reps_completed) if log.reps_completed else 0
                    total_volume += log.weight_used * total_reps

            volumes.append(int(total_volume))

        return jsonify({
            'success': True,
            'labels': days_labels,
            'data': volumes
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/calendar-data')
@athlete_required
@require_tenant
def get_calendar_data():
    """API endpoint for workout calendar data"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Get month and year parameters
        year = request.args.get('year', date.today().year, type=int)
        month = request.args.get('month', date.today().month, type=int)

        # Get all workouts for the athlete
        workouts = Workout.query.filter_by(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            is_active=True
        ).all()

        # Get workout days (day_of_week: 0=Monday, 6=Sunday)
        workout_days = set(w.day_of_week for w in workouts)

        # Get completed workout logs for the month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)

        completed_logs = ProgressLog.query.filter(
            ProgressLog.athlete_id == athlete.id,
            ProgressLog.date >= first_day,
            ProgressLog.date <= last_day
        ).all()

        completed_dates = set(log.date.strftime('%Y-%m-%d') for log in completed_logs)

        # Build calendar data
        calendar_data = []
        current_date = first_day

        while current_date <= last_day:
            day_of_week = current_date.weekday()
            date_str = current_date.strftime('%Y-%m-%d')

            day_data = {
                'date': date_str,
                'day': current_date.day,
                'has_workout': day_of_week in workout_days,
                'completed': date_str in completed_dates,
                'is_today': current_date == date.today()
            }

            calendar_data.append(day_data)
            current_date += timedelta(days=1)

        return jsonify({
            'success': True,
            'month': month,
            'year': year,
            'days': calendar_data
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/measurements-data')
@athlete_required
@require_tenant
def get_measurements_data():
    """API endpoint for body measurements chart data"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Get measurement parameter
        measurement_type = request.args.get('type', 'chest')

        # Get check-ins with measurements
        check_ins = CheckIn.query.filter_by(
            athlete_id=athlete.id,
            tenant_id=tenant.id
        ).order_by(CheckIn.check_in_date.asc()).all()

        labels = []
        values = []

        for ci in check_ins:
            measurement_value = None

            if measurement_type == 'chest' and ci.chest:
                measurement_value = float(ci.chest)
            elif measurement_type == 'waist' and ci.waist:
                measurement_value = float(ci.waist)
            elif measurement_type == 'arm' and ci.arm_left:
                measurement_value = float(ci.arm_left)
            elif measurement_type == 'thigh' and ci.thigh_left:
                measurement_value = float(ci.thigh_left)
            elif measurement_type == 'hips' and ci.hips:
                measurement_value = float(ci.hips)

            if measurement_value:
                labels.append(ci.check_in_date.strftime('%d %b'))
                values.append(measurement_value)

        return jsonify({
            'success': True,
            'labels': labels,
            'data': values,
            'type': measurement_type
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/strength-data')
@athlete_required
@require_tenant
def get_strength_data():
    """API endpoint for strength progression data"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Get personal records grouped by exercise
        personal_records = PersonalRecord.query.filter_by(
            athlete_id=athlete.id,
            tenant_id=tenant.id
        ).order_by(PersonalRecord.date_achieved.asc()).all()

        # Group by exercise
        exercises_data = {}
        for pr in personal_records:
            exercise_name = pr.exercise_name or 'Unknown'
            if exercise_name not in exercises_data:
                exercises_data[exercise_name] = {
                    'labels': [],
                    'data': []
                }

            # Calculate estimated 1RM: weight × (1 + reps / 30)
            estimated_1rm = pr.weight_lifted * (1 + pr.reps / 30)

            exercises_data[exercise_name]['labels'].append(pr.date_achieved.strftime('%d %b'))
            exercises_data[exercise_name]['data'].append(round(estimated_1rm, 1))

        return jsonify({
            'success': True,
            'exercises': exercises_data
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/upload-progress-photo', methods=['POST'])
@athlete_required
@require_tenant
def upload_progress_photo():
    """API endpoint to upload progress photos"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        if 'photo' not in request.files:
            return jsonify({'success': False, 'message': 'No photo provided'}), 400

        file = request.files['photo']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400

        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'success': False, 'message': 'Invalid file format'}), 400

        # Save file
        import os
        from werkzeug.utils import secure_filename

        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_filename = f"{athlete.id}_{timestamp}_{filename}"

        upload_folder = os.path.join('app', 'static', 'uploads', 'progress_photos')
        os.makedirs(upload_folder, exist_ok=True)

        filepath = os.path.join(upload_folder, new_filename)
        file.save(filepath)

        photo_url = f"/static/uploads/progress_photos/{new_filename}"

        # Store photo reference in database using UploadedFile model
        from app.models.trainer import UploadedFile

        uploaded_file = UploadedFile(
            tenant_id=tenant.id,
            user_id=current_user.id,
            filename=new_filename,
            original_filename=file.filename,
            file_path=photo_url,
            file_size=os.path.getsize(filepath),
            mime_type=file.content_type,
            file_type='image',
            category='progress_photo',
            related_entity_type='athlete',
            related_entity_id=athlete.id,
            storage_type='local',
            is_public=False
        )

        db.session.add(uploaded_file)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Foto caricata con successo',
            'photo_url': photo_url,
            'photo_id': uploaded_file.id,
            'upload_date': uploaded_file.created_at.isoformat()
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/measurements', methods=['GET', 'POST'])
@athlete_required
@require_tenant
def measurements_api():
    """API endpoint to manage body measurements"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        if request.method == 'POST':
            # Save new measurement
            from app.models.trainer import BodyMeasurement

            measurement = BodyMeasurement(
                athlete_id=athlete.id,
                tenant_id=tenant.id,
                weight=request.form.get('weight'),
                height=request.form.get('height'),
                body_fat=request.form.get('body_fat'),
                muscle_mass=request.form.get('muscle_mass'),
                chest=request.form.get('chest'),
                waist=request.form.get('waist'),
                hips=request.form.get('hips'),
                arms=request.form.get('arms'),
                thighs=request.form.get('thighs'),
                calves=request.form.get('calves'),
                measurement_date=datetime.strptime(request.form.get('measurement_date'), '%Y-%m-%d').date() if request.form.get('measurement_date') else date.today(),
                notes=request.form.get('notes')
            )

            db.session.add(measurement)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Misurazione salvata con successo',
                'measurement_id': measurement.id
            })

        else:
            # Get measurements history
            from app.models.trainer import BodyMeasurement

            measurements = BodyMeasurement.query.filter_by(
                athlete_id=athlete.id,
                tenant_id=tenant.id
            ).order_by(BodyMeasurement.measurement_date.desc()).limit(50).all()

            measurements_data = []
            for m in measurements:
                bmi = None
                if m.weight and m.height:
                    bmi = round(m.weight / ((m.height / 100) ** 2), 1)

                measurements_data.append({
                    'id': m.id,
                    'date': m.measurement_date.strftime('%d/%m/%Y'),
                    'weight': m.weight if m.weight else '--',
                    'bmi': bmi if bmi else '--',
                    'body_fat': m.body_fat if m.body_fat else '--',
                    'chest': m.chest,
                    'waist': m.waist,
                    'hips': m.hips,
                    'arms': m.arms,
                    'thighs': m.thighs,
                    'calves': m.calves
                })

            return jsonify({
                'success': True,
                'measurements': measurements_data
            })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/measurements/<int:measurement_id>', methods=['DELETE'])
@athlete_required
@require_tenant
def delete_measurement(measurement_id):
    """API endpoint to delete a measurement"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.models.trainer import BodyMeasurement

        measurement = BodyMeasurement.query.filter_by(
            id=measurement_id,
            athlete_id=athlete.id,
            tenant_id=tenant.id
        ).first()

        if not measurement:
            return jsonify({'success': False, 'message': 'Measurement not found'}), 404

        db.session.delete(measurement)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Misurazione eliminata con successo'
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/goals', methods=['GET', 'POST'])
@athlete_required
@require_tenant
def goals_api():
    """API endpoint to manage fitness goals"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        if request.method == 'POST':
            # Create new goal
            from app.models.trainer import FitnessGoal

            target_date = None
            if request.form.get('target_date'):
                target_date = datetime.strptime(request.form.get('target_date'), '%Y-%m-%d').date()

            goal = FitnessGoal(
                athlete_id=athlete.id,
                tenant_id=tenant.id,
                goal_type=request.form.get('goal_type'),
                title=request.form.get('goal_title'),
                description=request.form.get('goal_description'),
                current_value=float(request.form.get('current_value')) if request.form.get('current_value') else None,
                target_value=float(request.form.get('target_value')),
                unit=request.form.get('unit'),
                target_date=target_date,
                priority=request.form.get('priority', 'medium'),
                status='active'
            )

            db.session.add(goal)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Obiettivo aggiunto con successo',
                'goal_id': goal.id
            })

        else:
            # Get all goals
            from app.models.trainer import FitnessGoal

            goals = FitnessGoal.query.filter_by(
                athlete_id=athlete.id,
                tenant_id=tenant.id
            ).order_by(FitnessGoal.created_at.desc()).all()

            goals_data = []
            completed_count = 0
            active_count = 0
            total_progress = 0

            for g in goals:
                # Calculate progress
                progress = 0
                if g.current_value and g.target_value:
                    progress = min(int((g.current_value / g.target_value) * 100), 100)

                if g.status == 'completed':
                    completed_count += 1
                    progress = 100
                elif g.status == 'active':
                    active_count += 1

                total_progress += progress

                priority_labels = {
                    'low': 'Bassa Priorità',
                    'medium': 'Media Priorità',
                    'high': 'Alta Priorità'
                }

                goals_data.append({
                    'id': g.id,
                    'type': g.goal_type,
                    'title': g.title,
                    'description': g.description,
                    'current_value': g.current_value if g.current_value else 0,
                    'target_value': g.target_value,
                    'unit': g.unit if g.unit else '',
                    'target_date': g.target_date.strftime('%d/%m/%Y') if g.target_date else None,
                    'priority': g.priority,
                    'priority_label': priority_labels.get(g.priority, 'Media Priorità'),
                    'progress': progress,
                    'status': g.status
                })

            avg_progress = int(total_progress / len(goals)) if len(goals) > 0 else 0

            return jsonify({
                'success': True,
                'goals': goals_data,
                'stats': {
                    'completed': completed_count,
                    'active': active_count,
                    'progress': avg_progress
                }
            })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/goals/<int:goal_id>', methods=['DELETE', 'PUT'])
@athlete_required
@require_tenant
def manage_goal(goal_id):
    """API endpoint to delete or update a goal"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.models.trainer import FitnessGoal

        goal = FitnessGoal.query.filter_by(
            id=goal_id,
            athlete_id=athlete.id,
            tenant_id=tenant.id
        ).first()

        if not goal:
            return jsonify({'success': False, 'message': 'Goal not found'}), 404

        if request.method == 'DELETE':
            db.session.delete(goal)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Obiettivo eliminato con successo'
            })

        elif request.method == 'PUT':
            # Update goal
            data = request.get_json()

            if 'current_value' in data:
                goal.current_value = data['current_value']
            if 'status' in data:
                goal.status = data['status']

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Obiettivo aggiornato con successo'
            })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


# ========================================
# NOTIFICATIONS API
# ========================================

@athlete_bp.route('/api/notifications', methods=['GET'])
@athlete_required
@require_tenant
def get_notifications():
    """API: Get user notifications"""
    try:
        from app.services.notification_service import NotificationService

        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = request.args.get('limit', 50, type=int)

        notifications = NotificationService.get_user_notifications(
            user_id=current_user.id,
            unread_only=unread_only,
            limit=limit
        )

        unread_count = NotificationService.get_unread_count(current_user.id)

        return jsonify({
            'success': True,
            'notifications': notifications,
            'unread_count': unread_count
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@athlete_required
@require_tenant
def mark_notification_read(notification_id):
    """API: Mark notification as read"""
    try:
        from app.services.notification_service import NotificationService

        success = NotificationService.mark_as_read(notification_id, current_user.id)

        if success:
            return jsonify({'success': True, 'message': 'Notification marked as read'})
        else:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/notifications/read-all', methods=['POST'])
@athlete_required
@require_tenant
def mark_all_notifications_read():
    """API: Mark all notifications as read"""
    try:
        from app.services.notification_service import NotificationService

        NotificationService.mark_all_as_read(current_user.id)

        return jsonify({'success': True, 'message': 'All notifications marked as read'})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@athlete_required
@require_tenant
def delete_notification(notification_id):
    """API: Delete notification"""
    try:
        from app.services.notification_service import NotificationService

        success = NotificationService.delete_notification(notification_id, current_user.id)

        if success:
            return jsonify({'success': True, 'message': 'Notification deleted'})
        else:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


# ========================================
# ANALYTICS API
# ========================================

@athlete_bp.route('/api/analytics/progress', methods=['GET'])
@athlete_required
@require_tenant
def get_progress_analytics():
    """API: Get comprehensive progress analytics"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.services.analytics_service import AnalyticsService

        weeks = request.args.get('weeks', 12, type=int)

        metrics = AnalyticsService.calculate_progress_metrics(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            weeks=weeks
        )

        return jsonify({
            'success': True,
            'metrics': metrics
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/analytics/prs', methods=['GET'])
@athlete_required
@require_tenant
def get_personal_records():
    """API: Get all personal records"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.services.analytics_service import AnalyticsService

        exercise_id = request.args.get('exercise_id', type=int)

        prs = AnalyticsService.get_athlete_prs(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            exercise_id=exercise_id
        )

        return jsonify({
            'success': True,
            'personal_records': prs
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/analytics/volume', methods=['GET'])
@athlete_required
@require_tenant
def get_volume_analytics():
    """API: Get volume tracking data"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.services.analytics_service import AnalyticsService

        weeks = request.args.get('weeks', 12, type=int)
        group_by = request.args.get('group_by', 'week')

        volume_data = AnalyticsService.get_volume_tracking(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            weeks=weeks,
            group_by=group_by
        )

        return jsonify({
            'success': True,
            'volume_data': volume_data
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/analytics/volume-by-muscle', methods=['GET'])
@athlete_required
@require_tenant
def get_volume_by_muscle():
    """API: Get volume distribution by muscle group"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.services.analytics_service import AnalyticsService

        weeks = request.args.get('weeks', 4, type=int)

        volume_by_muscle = AnalyticsService.get_volume_by_muscle_group(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            weeks=weeks
        )

        return jsonify({
            'success': True,
            'volume_by_muscle': volume_by_muscle
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/analytics/intensity', methods=['GET'])
@athlete_required
@require_tenant
def get_intensity_analytics():
    """API: Get intensity metrics"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.services.analytics_service import AnalyticsService

        weeks = request.args.get('weeks', 4, type=int)

        intensity_metrics = AnalyticsService.calculate_intensity_metrics(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            weeks=weeks
        )

        return jsonify({
            'success': True,
            'intensity_metrics': intensity_metrics
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/analytics/training-load', methods=['GET'])
@athlete_required
@require_tenant
def get_training_load():
    """API: Get weekly training load"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        from app.services.analytics_service import AnalyticsService

        weeks = request.args.get('weeks', 8, type=int)

        training_load = AnalyticsService.get_weekly_training_load(
            athlete_id=athlete.id,
            tenant_id=tenant.id,
            weeks=weeks
        )

        return jsonify({
            'success': True,
            'training_load': training_load
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@athlete_bp.route('/api/weight-data', methods=['GET'])
@athlete_required
@require_tenant
def api_get_weight_data():
    """API: Get weight progress data for charts"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'labels': [], 'data': []}), 200

        days = request.args.get('days', 90, type=int)
        from datetime import datetime, timedelta

        start_date = datetime.now() - timedelta(days=days)

        check_ins = CheckIn.query.filter(
            CheckIn.athlete_id == athlete.id,
            CheckIn.tenant_id == tenant.id,
            CheckIn.check_in_date >= start_date,
            CheckIn.weight.isnot(None)
        ).order_by(CheckIn.check_in_date.asc()).all()

        labels = []
        data = []

        for checkin in check_ins:
            labels.append(checkin.check_in_date.strftime('%d/%m'))
            data.append(float(checkin.weight))

        return jsonify({
            'labels': labels,
            'data': data
        })

    except Exception as e:
        return jsonify({'labels': [], 'data': []}), 200


@athlete_bp.route('/api/volume-data', methods=['GET'])
@athlete_required
@require_tenant
def api_get_volume_data():
    """API: Get weekly volume data for charts"""
    try:
        tenant = get_current_tenant()
        athlete = Athlete.query.filter_by(
            user_id=current_user.id,
            tenant_id=tenant.id
        ).first()

        if not athlete:
            return jsonify({'labels': [], 'data': []}), 200

        from datetime import datetime, timedelta

        # Get last 8 weeks of data
        weeks_data = []
        labels = []
        data = []

        for i in range(7, -1, -1):
            week_start = datetime.now() - timedelta(weeks=i+1)
            week_end = datetime.now() - timedelta(weeks=i)

            # Calculate volume for this week (sum of all sets * reps * weight)
            logs = WorkoutLog.query.filter(
                WorkoutLog.athlete_id == athlete.id,
                WorkoutLog.tenant_id == tenant.id,
                WorkoutLog.log_date >= week_start,
                WorkoutLog.log_date < week_end
            ).all()

            week_volume = 0
            for log in logs:
                if log.sets_completed and log.reps_completed and log.weight_used:
                    week_volume += log.sets_completed * log.reps_completed * log.weight_used

            week_label = f"W{week_start.isocalendar()[1]}"
            labels.append(week_label)
            data.append(round(week_volume, 2))

        return jsonify({
            'labels': labels,
            'data': data
        })

    except Exception as e:
        return jsonify({'labels': [], 'data': []}), 200
