from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON
from app.models import db


class Athlete(db.Model):
    """
    Athlete model - The end users who receive training programs
    Each athlete belongs to a specific tenant (trainer)
    """
    __tablename__ = 'athletes'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    trainer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Athletic goals
    goal = db.Column(db.String(50))  # mass, strength, definition, general_fitness
    experience_level = db.Column(db.String(20))  # beginner, intermediate, advanced
    training_frequency = db.Column(db.Integer)  # Days per week

    # Physical metrics
    current_weight = db.Column(db.Float)  # in kg
    height = db.Column(db.Float)  # in cm
    target_weight = db.Column(db.Float)

    # Notes
    injuries = db.Column(db.Text)
    medical_notes = db.Column(db.Text)
    trainer_notes = db.Column(db.Text)

    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = db.relationship('Tenant', backref='athletes')
    trainer = db.relationship('User', foreign_keys=[trainer_id], backref='coached_athletes', overlaps='athletes,trainer_user')
    workouts = db.relationship('Workout', backref='athlete', lazy='dynamic', cascade='all, delete-orphan')
    progress_logs = db.relationship('ProgressLog', backref='athlete', lazy='dynamic', cascade='all, delete-orphan')
    check_ins = db.relationship('CheckIn', backref='athlete', lazy='dynamic', cascade='all, delete-orphan')
    meal_plans = db.relationship('MealPlan', backref='athlete', lazy='dynamic', cascade='all, delete-orphan')
    personal_records = db.relationship('PersonalRecord', backref='athlete', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Athlete {self.user.full_name if self.user else self.id}>'

    def to_dict(self):
        """Convert athlete to dictionary"""
        return {
            'id': self.id,
            'user': self.user.to_dict() if self.user else None,
            'goal': self.goal,
            'experience_level': self.experience_level,
            'current_weight': self.current_weight,
            'target_weight': self.target_weight,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Exercise(db.Model):
    """
    Exercise library - Catalog of all exercises with video tutorials
    Shared across all tenants but can be customized per tenant
    """
    __tablename__ = 'exercises'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True, index=True)  # NULL = global

    # Exercise info
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))  # chest, back, legs, shoulders, arms, core, cardio
    equipment = db.Column(db.String(50))  # barbell, dumbbell, machine, bodyweight, cable

    # Media
    video_url = db.Column(db.String(255))
    thumbnail_url = db.Column(db.String(255))

    # Instructions
    instructions = db.Column(db.Text)
    tips = db.Column(db.Text)

    # Muscle groups (JSON array)
    primary_muscles = db.Column(JSON)  # ['chest', 'triceps']
    secondary_muscles = db.Column(JSON)  # ['shoulders']

    # Difficulty
    difficulty_level = db.Column(db.String(20))  # beginner, intermediate, advanced

    # QR Code for gym machines
    qr_code = db.Column(db.String(100), unique=True, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = db.relationship('Tenant', backref='custom_exercises')

    def __repr__(self):
        return f'<Exercise {self.name}>'

    def to_dict(self):
        """Convert exercise to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'equipment': self.equipment,
            'video_url': self.video_url,
            'thumbnail_url': self.thumbnail_url,
            'primary_muscles': self.primary_muscles,
            'difficulty_level': self.difficulty_level,
            'qr_code': self.qr_code
        }


class Workout(db.Model):
    """
    Workout program - A training plan assigned to an athlete
    Contains multiple exercises organized in blocks
    """
    __tablename__ = 'workouts'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)

    # Workout info
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String(50))  # strength, hypertrophy, endurance, circuit

    # Schedule
    day_of_week = db.Column(db.Integer)  # 0=Monday, 6=Sunday
    week_number = db.Column(db.Integer, default=1)  # For progressive programs
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Dates
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = db.relationship('Tenant', backref='workouts')
    exercises = db.relationship('WorkoutExercise', backref='workout', lazy='dynamic', cascade='all, delete-orphan', order_by='WorkoutExercise.order')

    def __repr__(self):
        return f'<Workout {self.name}>'

    def to_dict(self):
        """Convert workout to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type,
            'day_of_week': self.day_of_week,
            'exercises': [we.to_dict() for we in self.exercises],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WorkoutExercise(db.Model):
    """
    Junction table linking exercises to workouts with specific parameters
    Defines sets, reps, rest times, RPE targets
    """
    __tablename__ = 'workout_exercises'

    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.id'), nullable=False, index=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False, index=True)

    # Order in workout
    order = db.Column(db.Integer, nullable=False, default=0)
    block_name = db.Column(db.String(50))  # e.g., 'Warm-up', 'Main Set', 'Accessories'

    # Training parameters
    sets = db.Column(db.Integer, nullable=False, default=3)
    reps_min = db.Column(db.Integer)  # For rep ranges (e.g., 8-12)
    reps_max = db.Column(db.Integer)
    rest_seconds = db.Column(db.Integer, default=90)

    # Intensity
    rpe_target = db.Column(db.Float)  # Rate of Perceived Exertion (6-10 scale)
    tempo = db.Column(db.String(20))  # e.g., '3-1-1-0' (eccentric-pause-concentric-pause)
    weight_percentage = db.Column(db.Integer)  # % of 1RM

    # Notes
    notes = db.Column(db.Text)

    # Superset/circuit info
    is_superset = db.Column(db.Boolean, default=False)
    superset_group = db.Column(db.String(10))  # e.g., 'A1', 'A2', 'B1'

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    exercise = db.relationship('Exercise', backref='workout_exercises')
    progress_logs = db.relationship('ProgressLog', backref='workout_exercise', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<WorkoutExercise {self.exercise.name if self.exercise else self.id}>'

    def to_dict(self):
        """Convert workout exercise to dictionary"""
        return {
            'id': self.id,
            'exercise': self.exercise.to_dict() if self.exercise else None,
            'order': self.order,
            'block_name': self.block_name,
            'sets': self.sets,
            'reps_min': self.reps_min,
            'reps_max': self.reps_max,
            'rest_seconds': self.rest_seconds,
            'rpe_target': self.rpe_target,
            'notes': self.notes
        }


class ProgressLog(db.Model):
    """
    Training log - Records actual performance for each exercise
    Used for progression algorithm and analytics
    """
    __tablename__ = 'progress_logs'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)
    workout_exercise_id = db.Column(db.Integer, db.ForeignKey('workout_exercises.id'), nullable=False, index=True)

    # Performance data
    date = db.Column(db.Date, nullable=False, index=True)
    sets_completed = db.Column(db.Integer)
    reps_completed = db.Column(JSON)  # Array: [12, 10, 8] for each set
    weight_used = db.Column(db.Float)  # in kg
    rpe_actual = db.Column(db.Float)  # Actual RPE reported by athlete

    # Athlete feedback
    difficulty_rating = db.Column(db.Integer)  # 1-5 scale
    notes = db.Column(db.Text)
    form_check_video_url = db.Column(db.String(255))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = db.relationship('Tenant', backref='progress_logs')

    def __repr__(self):
        return f'<ProgressLog {self.date} - {self.workout_exercise_id}>'

    @property
    def total_volume(self):
        """Calculate total volume (sets × reps × weight)"""
        if self.reps_completed and self.weight_used:
            total_reps = sum(self.reps_completed) if isinstance(self.reps_completed, list) else self.reps_completed
            return total_reps * self.weight_used
        return 0

    def to_dict(self):
        """Convert progress log to dictionary"""
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'sets_completed': self.sets_completed,
            'reps_completed': self.reps_completed,
            'weight_used': self.weight_used,
            'rpe_actual': self.rpe_actual,
            'total_volume': self.total_volume,
            'notes': self.notes
        }


class CheckIn(db.Model):
    """
    Weekly check-in from athlete
    Tracks weight, photos, measurements, and subjective feedback
    """
    __tablename__ = 'check_ins'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)

    # Date
    check_in_date = db.Column(db.Date, nullable=False, index=True)

    # Body metrics
    weight = db.Column(db.Float)
    body_fat_percentage = db.Column(db.Float)

    # Measurements (in cm)
    chest = db.Column(db.Float)
    waist = db.Column(db.Float)
    hips = db.Column(db.Float)
    thigh_left = db.Column(db.Float)
    thigh_right = db.Column(db.Float)
    arm_left = db.Column(db.Float)
    arm_right = db.Column(db.Float)

    # Photos
    photo_front_url = db.Column(db.String(255))
    photo_side_url = db.Column(db.String(255))
    photo_back_url = db.Column(db.String(255))

    # Subjective feedback (1-5 scale)
    energy_level = db.Column(db.Integer)
    sleep_quality = db.Column(db.Integer)
    stress_level = db.Column(db.Integer)
    hunger_level = db.Column(db.Integer)
    motivation = db.Column(db.Integer)

    # Notes
    notes = db.Column(db.Text)
    trainer_feedback = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = db.relationship('Tenant', backref='check_ins')

    def __repr__(self):
        return f'<CheckIn {self.athlete_id} - {self.check_in_date}>'

    def to_dict(self):
        """Convert check-in to dictionary"""
        return {
            'id': self.id,
            'check_in_date': self.check_in_date.isoformat(),
            'weight': self.weight,
            'body_fat_percentage': self.body_fat_percentage,
            'energy_level': self.energy_level,
            'sleep_quality': self.sleep_quality,
            'notes': self.notes
        }


class MealPlan(db.Model):
    """
    Nutritional plan for athlete
    Tracks daily macro targets
    """
    __tablename__ = 'meal_plans'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)

    # Plan info
    name = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)

    # Daily macro targets
    calories = db.Column(db.Integer)
    protein_g = db.Column(db.Integer)
    carbs_g = db.Column(db.Integer)
    fats_g = db.Column(db.Integer)

    # Meal timing
    meal_count = db.Column(db.Integer, default=3)  # Number of meals per day

    # Notes
    notes = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = db.relationship('Tenant', backref='meal_plans')
    food_logs = db.relationship('FoodLog', backref='meal_plan', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<MealPlan {self.name}>'

    def to_dict(self):
        """Convert meal plan to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'calories': self.calories,
            'protein_g': self.protein_g,
            'carbs_g': self.carbs_g,
            'fats_g': self.fats_g,
            'is_active': self.is_active
        }


class FoodLog(db.Model):
    """
    Daily food tracking by athlete
    """
    __tablename__ = 'food_logs'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    meal_plan_id = db.Column(db.Integer, db.ForeignKey('meal_plans.id'), nullable=False, index=True)

    # Date
    date = db.Column(db.Date, nullable=False, index=True)

    # Actual intake
    calories_consumed = db.Column(db.Integer)
    protein_consumed = db.Column(db.Integer)
    carbs_consumed = db.Column(db.Integer)
    fats_consumed = db.Column(db.Integer)

    # Notes
    notes = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = db.relationship('Tenant', backref='food_logs')

    def __repr__(self):
        return f'<FoodLog {self.date}>'


class Message(db.Model):
    """
    In-app messaging between trainer and athlete
    Replaces WhatsApp communication
    """
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)

    # Participants
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Message content
    subject = db.Column(db.String(200))
    body = db.Column(db.Text, nullable=False)
    attachment_url = db.Column(db.String(255))

    # Status
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    read_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    tenant = db.relationship('Tenant', backref='messages')
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')

    def __repr__(self):
        return f'<Message from {self.sender_id} to {self.receiver_id}>'

    def mark_as_read(self):
        """Mark message as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()
        db.session.commit()


class Machine(db.Model):
    """
    Gym equipment with QR codes
    Athletes scan QR to see exercise tutorial and their PR
    """
    __tablename__ = 'machines'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True, index=True)  # NULL = global

    # Machine info
    name = db.Column(db.String(100), nullable=False)
    brand = db.Column(db.String(50))
    model = db.Column(db.String(50))

    # QR Code
    qr_code = db.Column(db.String(100), unique=True, nullable=False, index=True)

    # Linked exercise
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'))

    # Location
    gym_location = db.Column(db.String(100))  # e.g., 'Area Pesi - Zona 2'

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = db.relationship('Tenant', backref='machines')
    exercise = db.relationship('Exercise', backref='machines')
    personal_records = db.relationship('PersonalRecord', backref='machine', lazy='dynamic')

    def __repr__(self):
        return f'<Machine {self.name}>'


class PersonalRecord(db.Model):
    """
    Personal records (PRs) for athletes on specific machines/exercises
    """
    __tablename__ = 'personal_records'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=True, index=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False, index=True)

    # PR data
    record_type = db.Column(db.String(20), nullable=False)  # '1RM', '3RM', '5RM', 'max_reps'
    weight = db.Column(db.Float)  # in kg
    reps = db.Column(db.Integer)
    date_achieved = db.Column(db.Date, nullable=False, index=True)

    # Video proof
    video_url = db.Column(db.String(255))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = db.relationship('Tenant', backref='personal_records')
    exercise = db.relationship('Exercise', backref='personal_records')

    def __repr__(self):
        return f'<PersonalRecord {self.athlete_id} - {self.record_type}>'

    def to_dict(self):
        """Convert PR to dictionary"""
        return {
            'id': self.id,
            'record_type': self.record_type,
            'weight': self.weight,
            'reps': self.reps,
            'date_achieved': self.date_achieved.isoformat(),
            'exercise': self.exercise.to_dict() if self.exercise else None
        }


class BodyMeasurement(db.Model):
    """
    Body measurements tracking for athletes
    Records physical measurements over time
    """
    __tablename__ = 'body_measurements'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)

    # Date
    measurement_date = db.Column(db.Date, nullable=False, index=True)

    # Body metrics
    weight = db.Column(db.Float)  # in kg
    height = db.Column(db.Float)  # in cm
    body_fat = db.Column(db.Float)  # percentage
    muscle_mass = db.Column(db.Float)  # in kg

    # Circumference measurements (in cm)
    chest = db.Column(db.Float)
    waist = db.Column(db.Float)
    hips = db.Column(db.Float)
    arms = db.Column(db.Float)
    thighs = db.Column(db.Float)
    calves = db.Column(db.Float)

    # Notes
    notes = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = db.relationship('Tenant', backref='body_measurements')
    athlete = db.relationship('Athlete', backref='body_measurements', foreign_keys=[athlete_id])

    def __repr__(self):
        return f'<BodyMeasurement {self.athlete_id} - {self.measurement_date}>'

    @property
    def bmi(self):
        """Calculate BMI"""
        if self.weight and self.height:
            return round(self.weight / ((self.height / 100) ** 2), 1)
        return None

    def to_dict(self):
        """Convert body measurement to dictionary"""
        return {
            'id': self.id,
            'measurement_date': self.measurement_date.isoformat(),
            'weight': self.weight,
            'height': self.height,
            'body_fat': self.body_fat,
            'muscle_mass': self.muscle_mass,
            'chest': self.chest,
            'waist': self.waist,
            'hips': self.hips,
            'arms': self.arms,
            'thighs': self.thighs,
            'calves': self.calves,
            'bmi': self.bmi,
            'notes': self.notes
        }


class FitnessGoal(db.Model):
    """
    Fitness goals tracking for athletes
    Defines and tracks progress towards specific fitness objectives
    """
    __tablename__ = 'fitness_goals'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    athlete_id = db.Column(db.Integer, db.ForeignKey('athletes.id'), nullable=False, index=True)

    # Goal info
    goal_type = db.Column(db.String(50))  # weight, strength, body_composition, endurance, flexibility, habit, custom
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    # Target values
    current_value = db.Column(db.Float)
    target_value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20))  # kg, cm, reps, %, etc.

    # Timeline
    target_date = db.Column(db.Date)

    # Priority and status
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    status = db.Column(db.String(20), default='active')  # active, completed, abandoned

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    # Relationships
    tenant = db.relationship('Tenant', backref='fitness_goals')
    athlete = db.relationship('Athlete', backref='fitness_goals', foreign_keys=[athlete_id])

    def __repr__(self):
        return f'<FitnessGoal {self.title}>'

    @property
    def progress_percentage(self):
        """Calculate progress percentage"""
        if self.current_value and self.target_value:
            return min(int((self.current_value / self.target_value) * 100), 100)
        return 0

    def to_dict(self):
        """Convert fitness goal to dictionary"""
        return {
            'id': self.id,
            'goal_type': self.goal_type,
            'title': self.title,
            'description': self.description,
            'current_value': self.current_value,
            'target_value': self.target_value,
            'unit': self.unit,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'priority': self.priority,
            'status': self.status,
            'progress': self.progress_percentage,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class UploadedFile(db.Model):
    """Model for tracking uploaded files"""
    __tablename__ = 'uploaded_files'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # File information
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)  # Relative path or S3 URL
    file_size = db.Column(db.Integer, nullable=False)  # Size in bytes
    mime_type = db.Column(db.String(100))

    # File categorization
    file_type = db.Column(db.String(50), nullable=False)  # image, video, document
    category = db.Column(db.String(100))  # profile_picture, progress_photo, exercise_video, document, etc.

    # Related entity (optional)
    related_entity_type = db.Column(db.String(50))  # athlete, exercise, workout, etc.
    related_entity_id = db.Column(db.Integer)

    # File metadata (renamed from 'metadata' to avoid SQLAlchemy conflict)
    file_metadata = db.Column(db.JSON)  # Additional metadata (dimensions, duration, etc.)

    # Storage
    storage_type = db.Column(db.String(20), default='local')  # local, s3
    is_public = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Soft delete
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)

    # Relationships
    tenant = db.relationship('Tenant', backref='uploaded_files')
    user = db.relationship('User', backref='uploaded_files')

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'file_size_mb': round(self.file_size / (1024 * 1024), 2),
            'mime_type': self.mime_type,
            'file_type': self.file_type,
            'category': self.category,
            'related_entity_type': self.related_entity_type,
            'related_entity_id': self.related_entity_id,
            'metadata': self.file_metadata,
            'storage_type': self.storage_type,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'uploaded_by': self.user_id
        }
