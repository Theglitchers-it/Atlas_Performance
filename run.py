#!/usr/bin/env python
"""
Atlas Performance - Main Entry Point
Run this file to start the Flask development server
"""
import os
from app import create_app, db
from app.models.shared import User
from app.models.super_admin import Tenant, Subscription, GlobalAnalytics
from app.models.trainer import (
    Athlete, Workout, Exercise, WorkoutExercise,
    ProgressLog, CheckIn, MealPlan, Message, Machine, PersonalRecord
)

# Create Flask app
app = create_app()


@app.shell_context_processor
def make_shell_context():
    """
    Make database and models available in Flask shell
    Usage: flask shell
    """
    return {
        'db': db,
        'User': User,
        'Tenant': Tenant,
        'Subscription': Subscription,
        'GlobalAnalytics': GlobalAnalytics,
        'Athlete': Athlete,
        'Workout': Workout,
        'Exercise': Exercise,
        'WorkoutExercise': WorkoutExercise,
        'ProgressLog': ProgressLog,
        'CheckIn': CheckIn,
        'MealPlan': MealPlan,
        'Message': Message,
        'Machine': Machine,
        'PersonalRecord': PersonalRecord
    }


@app.cli.command()
def init_db():
    """Initialize the database (create tables)"""
    db.create_all()
    print("✅ Database tables created successfully!")


@app.cli.command()
def seed_db():
    """Seed database with initial data"""
    from datetime import date, timedelta

    print("[SEED] Seeding database...")

    # Create Super Admin user
    super_admin = User.query.filter_by(email='admin@atlasperformance.com').first()
    if not super_admin:
        super_admin = User(
            email='admin@atlasperformance.com',
            first_name='Super',
            last_name='Admin',
            role='super_admin',
            is_active=True,
            email_verified=True
        )
        super_admin.set_password('admin123')
        db.session.add(super_admin)
        print("[OK] Super Admin created: admin@atlasperformance.com / admin123")

    # Create Demo Tenant + Trainer
    demo_tenant = Tenant.query.filter_by(subdomain='demo').first()
    if not demo_tenant:
        from app.services.tenant_manager import TenantManager

        demo_tenant, demo_trainer = TenantManager.create_tenant(
            name='Demo Fitness Studio',
            email='trainer@demo.com',
            first_name='Marco',
            last_name='Rossi',
            password='demo123',
            subdomain='demo'
        )
        print("[OK] Demo Trainer created: trainer@demo.com / demo123")
        print("     Subdomain: demo.localhost:5000")

        # Create demo athlete
        athlete_user = User(
            email='athlete@demo.com',
            first_name='Luca',
            last_name='Bianchi',
            role='athlete',
            tenant_id=demo_tenant.id,
            is_active=True
        )
        athlete_user.set_password('demo123')
        db.session.add(athlete_user)
        db.session.flush()

        athlete = Athlete(
            tenant_id=demo_tenant.id,
            user_id=athlete_user.id,
            trainer_id=demo_trainer.id,
            goal='mass',
            experience_level='intermediate',
            current_weight=75.0,
            height=180.0,
            target_weight=80.0,
            is_active=True
        )
        db.session.add(athlete)
        print("[OK] Demo Athlete created: athlete@demo.com / demo123")

    # Create global exercises library
    exercise_data = [
        {'name': 'Bench Press', 'category': 'chest', 'equipment': 'barbell', 'difficulty_level': 'intermediate'},
        {'name': 'Squat', 'category': 'legs', 'equipment': 'barbell', 'difficulty_level': 'intermediate'},
        {'name': 'Deadlift', 'category': 'back', 'equipment': 'barbell', 'difficulty_level': 'advanced'},
        {'name': 'Overhead Press', 'category': 'shoulders', 'equipment': 'barbell', 'difficulty_level': 'intermediate'},
        {'name': 'Pull-ups', 'category': 'back', 'equipment': 'bodyweight', 'difficulty_level': 'intermediate'},
        {'name': 'Barbell Rows', 'category': 'back', 'equipment': 'barbell', 'difficulty_level': 'intermediate'},
        {'name': 'Dumbbell Curls', 'category': 'arms', 'equipment': 'dumbbell', 'difficulty_level': 'beginner'},
        {'name': 'Tricep Dips', 'category': 'arms', 'equipment': 'bodyweight', 'difficulty_level': 'intermediate'},
        {'name': 'Leg Press', 'category': 'legs', 'equipment': 'machine', 'difficulty_level': 'beginner'},
        {'name': 'Plank', 'category': 'core', 'equipment': 'bodyweight', 'difficulty_level': 'beginner'}
    ]

    for ex_data in exercise_data:
        exists = Exercise.query.filter_by(name=ex_data['name'], tenant_id=None).first()
        if not exists:
            exercise = Exercise(**ex_data, primary_muscles=[ex_data['category']])
            db.session.add(exercise)

    print("[OK] Global exercises library created")

    # Create initial analytics record
    analytics = GlobalAnalytics.query.filter_by(date=date.today()).first()
    if not analytics:
        analytics = GlobalAnalytics(
            date=date.today(),
            total_tenants=Tenant.query.count(),
            active_tenants=Tenant.query.filter_by(is_active=True).count(),
            total_trainers=User.query.filter_by(role='trainer').count(),
            total_athletes=User.query.filter_by(role='athlete').count(),
            mrr=0,
            arr=0
        )
        db.session.add(analytics)

    db.session.commit()
    print("\n[SUCCESS] Database seeded successfully!")
    print("\n[INFO] Login Credentials:")
    print("   Super Admin: admin@atlasperformance.com / admin123")
    print("   Trainer: trainer@demo.com / demo123")
    print("   Athlete: athlete@demo.com / demo123")


if __name__ == '__main__':
    # Run development server
    app.run(debug=True, host='0.0.0.0', port=5000)
