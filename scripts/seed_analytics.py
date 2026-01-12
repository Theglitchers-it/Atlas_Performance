"""
Script per popolare i dati analytics nel database
Genera dati degli ultimi 30 giorni per testing
"""
from datetime import datetime, timedelta
from decimal import Decimal
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models.super_admin import GlobalAnalytics, Tenant
from app.models.shared import User

def seed_analytics():
    app = create_app()

    with app.app_context():
        print("Seeding analytics data...")

        # Delete existing analytics
        GlobalAnalytics.query.delete()

        # Get current counts
        total_tenants = Tenant.query.count()
        active_tenants = Tenant.query.filter_by(is_active=True, subscription_status='active').count()
        trial_tenants = Tenant.query.filter_by(subscription_status='trial').count()
        total_athletes = User.query.filter_by(role='athlete').count()

        # Generate data for last 30 days
        today = datetime.utcnow().date()

        for i in range(30, -1, -1):
            date = today - timedelta(days=i)

            # Simulate growth over time
            growth_factor = (30 - i) / 30.0

            analytics = GlobalAnalytics(
                date=date,
                total_tenants=max(1, int(total_tenants * growth_factor)),
                active_tenants=max(1, int(active_tenants * growth_factor)),
                trial_tenants=max(0, int(trial_tenants * growth_factor)),
                canceled_tenants=0,
                total_trainers=max(1, int(total_tenants * growth_factor)),
                total_athletes=max(0, int(total_athletes * growth_factor)),
                workouts_created_today=int(5 * growth_factor) + (i % 3),
                mrr=int(100 + (i * 10)),  # Crescita MRR in cents
                arr=int((100 + (i * 10)) * 12),  # ARR = MRR * 12
                check_ins_today=int(3 * growth_factor),
                messages_sent_today=int(10 * growth_factor)
            )

            db.session.add(analytics)
            print(f"[OK] Added analytics for {date}: {analytics.total_tenants} tenants, EUR{analytics.mrr_decimal:.2f} MRR")

        db.session.commit()
        print("\n[SUCCESS] Analytics data seeded successfully!")
        print(f"[INFO] Created 31 days of analytics data")

if __name__ == '__main__':
    seed_analytics()
