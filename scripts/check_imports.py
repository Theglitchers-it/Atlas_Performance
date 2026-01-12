#!/usr/bin/env python
"""
Check all imports and application initialization
"""
import sys

print("Checking imports...")

try:
    print("✓ Importing Flask...")
    from flask import Flask

    print("✓ Importing Flask extensions...")
    from flask_sqlalchemy import SQLAlchemy
    from flask_login import LoginManager
    from flask_migrate import Migrate
    from flask_wtf import FlaskForm

    print("✓ Importing config...")
    from config import config

    print("✓ Importing models...")
    from app.models import db, login_manager
    from app.models.shared import User
    from app.models.super_admin import Tenant, Subscription, GlobalAnalytics
    from app.models.trainer import (
        Athlete, Workout, Exercise, WorkoutExercise,
        ProgressLog, CheckIn, MealPlan, Message, Machine, PersonalRecord
    )

    print("✓ Importing blueprints...")
    from app.blueprints.auth import auth_bp
    from app.blueprints.super_admin import super_admin_bp
    from app.blueprints.trainer import trainer_bp
    from app.blueprints.athlete import athlete_bp
    from app.blueprints.public import public_bp

    print("✓ Importing middleware...")
    from app.middleware.tenant_context import TenantContextMiddleware

    print("✓ Importing services...")
    from app.services.tenant_manager import TenantManager
    from app.services.stripe_service import StripeService
    from app.services.workout_builder import WorkoutBuilder
    from app.services.progression_algorithm import ProgressionAlgorithm

    print("✓ Creating Flask app...")
    from app import create_app
    app = create_app()

    print("\n" + "="*50)
    print("✅ ALL IMPORTS SUCCESSFUL!")
    print("="*50)
    sys.exit(0)

except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)
