from app import create_app, db
from app.models.shared import User
from werkzeug.security import generate_password_hash

def create_default_users():
    """Create default super admin and trainer user"""
    app = create_app()

    with app.app_context():
        # Check if users already exist
        admin_exists = User.query.filter_by(email='admin@atlas.com').first()
        trainer_exists = User.query.filter_by(email='trainer@atlas.com').first()

        if not admin_exists:
            admin = User(
                email='admin@atlas.com',
                password_hash=generate_password_hash('Admin123!'),
                first_name='Super',
                last_name='Admin',
                role='super_admin',
                is_active=True,
                tenant_id=None  # Super admin has no tenant
            )
            db.session.add(admin)
            print("✅ Super Admin created: admin@atlas.com / Admin123!")
        else:
            print("⚠️  Super Admin already exists")

        if not trainer_exists:
            trainer = User(
                email='trainer@atlas.com',
                password_hash=generate_password_hash('Trainer123!'),
                first_name='Demo',
                last_name='Trainer',
                role='trainer',
                is_active=True,
                tenant_id=None  # Will be assigned when tenant is created
            )
            db.session.add(trainer)
            print("✅ Trainer created: trainer@atlas.com / Trainer123!")
        else:
            print("⚠️  Trainer already exists")

        db.session.commit()
        print("\n🎉 Default users setup complete!")
        print("\n📝 Login credentials:")
        print("   Super Admin: admin@atlas.com / Admin123!")
        print("   Trainer:     trainer@atlas.com / Trainer123!")

if __name__ == '__main__':
    create_default_users()
