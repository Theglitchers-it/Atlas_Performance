from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()

# Import models after db initialization to avoid circular imports
from app.models.shared import User
from app.models.super_admin import Tenant, Subscription, GlobalAnalytics
from app.models.trainer import (
    Athlete, Workout, Exercise, WorkoutExercise, ProgressLog,
    CheckIn, MealPlan, FoodLog, Message, Machine, PersonalRecord,
    BodyMeasurement, FitnessGoal, UploadedFile
)

__all__ = [
    'db',
    'login_manager',
    'User',
    'Tenant',
    'Subscription',
    'GlobalAnalytics',
    'Athlete',
    'Workout',
    'Exercise',
    'WorkoutExercise',
    'ProgressLog',
    'CheckIn',
    'MealPlan',
    'FoodLog',
    'Message',
    'Machine',
    'PersonalRecord',
    'BodyMeasurement',
    'FitnessGoal',
    'UploadedFile'
]
