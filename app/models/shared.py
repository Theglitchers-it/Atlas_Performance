from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import db


class User(db.Model, UserMixin):
    """
    Unified User model for all roles (Super Admin, Trainer, Athlete)
    Multi-tenant aware: trainers and athletes belong to a tenant
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)

    # Role: 'super_admin', 'trainer', 'athlete'
    role = db.Column(db.String(20), nullable=False, index=True)

    # Multi-tenant: NULL for super_admin, required for trainer/athlete
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True, index=True)

    # Profile
    avatar_url = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date)

    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    email_verified = db.Column(db.Boolean, default=False)

    # User Preferences (stored as JSON)
    preferences = db.Column(db.JSON, default=dict)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Relationships
    tenant = db.relationship('Tenant', backref='users', foreign_keys=[tenant_id])

    # Trainer-specific relationship
    athletes = db.relationship(
        'Athlete',
        backref='trainer_user',
        foreign_keys='Athlete.trainer_id',
        lazy='dynamic',
        overlaps='coached_athletes,trainer'
    )

    # Athlete-specific relationship
    athlete_profile = db.relationship(
        'Athlete',
        backref='user',
        foreign_keys='Athlete.user_id',
        uselist=False
    )

    def __repr__(self):
        return f'<User {self.email} ({self.role})>'

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self):
        """Return full name"""
        return f"{self.first_name} {self.last_name}"

    def is_super_admin(self):
        """Check if user is super admin"""
        return self.role == 'super_admin'

    def is_trainer(self):
        """Check if user is trainer"""
        return self.role == 'trainer'

    def is_athlete(self):
        """Check if user is athlete"""
        return self.role == 'athlete'

    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()
        db.session.commit()

    def get_preference(self, key, default=None):
        """Get a specific preference value"""
        if not self.preferences:
            return default
        return self.preferences.get(key, default)

    def set_preference(self, key, value):
        """Set a specific preference value"""
        if not self.preferences:
            self.preferences = {}
        self.preferences[key] = value
        # Mark as modified for SQLAlchemy to detect changes
        db.session.query(User).filter_by(id=self.id).update(
            {'preferences': self.preferences},
            synchronize_session=False
        )

    def update_preferences(self, preferences_dict):
        """Update multiple preferences at once"""
        if not self.preferences:
            self.preferences = {}
        self.preferences.update(preferences_dict)
        # Mark as modified for SQLAlchemy to detect changes
        db.session.query(User).filter_by(id=self.id).update(
            {'preferences': self.preferences},
            synchronize_session=False
        )

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'role': self.role,
            'tenant_id': self.tenant_id,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
