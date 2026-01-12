from datetime import datetime
from app.models import db


class Tenant(db.Model):
    """
    Tenant model - Represents a Trainer's account (the paying customer)
    Each tenant has their own isolated data space
    """
    __tablename__ = 'tenants'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Business/Trainer name
    subdomain = db.Column(db.String(50), unique=True, nullable=False, index=True)  # e.g., 'john-fitness'

    # Subscription
    subscription_tier = db.Column(db.String(20), default='starter')  # starter, pro, enterprise
    subscription_status = db.Column(db.String(20), default='trial')  # trial, active, past_due, canceled

    # Stripe
    stripe_customer_id = db.Column(db.String(100), unique=True)
    stripe_subscription_id = db.Column(db.String(100), unique=True)

    # Limits based on subscription tier
    max_athletes = db.Column(db.Integer, default=10)  # Starter: 10, Pro: 50, Enterprise: unlimited
    max_storage_gb = db.Column(db.Integer, default=5)  # Storage for videos/images

    # Settings
    business_email = db.Column(db.String(120))
    business_phone = db.Column(db.String(20))
    logo_url = db.Column(db.String(255))
    custom_domain = db.Column(db.String(100))  # Optional custom domain

    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    trial_ends_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subscriptions = db.relationship('Subscription', backref='tenant', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Tenant {self.name} ({self.subdomain})>'

    @property
    def athlete_count(self):
        """Get current number of athletes"""
        from app.models.trainer import Athlete
        return Athlete.query.filter_by(tenant_id=self.id).count()

    @property
    def is_at_athlete_limit(self):
        """Check if tenant has reached athlete limit"""
        if self.subscription_tier == 'enterprise':
            return False  # Unlimited
        return self.athlete_count >= self.max_athletes

    def can_add_athlete(self):
        """Check if tenant can add more athletes"""
        return not self.is_at_athlete_limit

    def to_dict(self):
        """Convert tenant to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'subdomain': self.subdomain,
            'subscription_tier': self.subscription_tier,
            'subscription_status': self.subscription_status,
            'athlete_count': self.athlete_count,
            'max_athletes': self.max_athletes,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Subscription(db.Model):
    """
    Subscription history and billing records
    Tracks all subscription events for a tenant
    """
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)

    # Stripe details
    stripe_subscription_id = db.Column(db.String(100))
    stripe_price_id = db.Column(db.String(100))

    # Subscription info
    tier = db.Column(db.String(20), nullable=False)  # starter, pro, enterprise
    status = db.Column(db.String(20), nullable=False)  # active, past_due, canceled, trialing

    # Billing
    amount = db.Column(db.Integer, nullable=False)  # Amount in cents (e.g., 2900 for €29.00)
    currency = db.Column(db.String(3), default='EUR')
    billing_cycle = db.Column(db.String(20), default='monthly')  # monthly, yearly

    # Periods
    current_period_start = db.Column(db.DateTime)
    current_period_end = db.Column(db.DateTime)
    trial_start = db.Column(db.DateTime)
    trial_end = db.Column(db.DateTime)
    canceled_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Subscription {self.tier} - {self.status}>'

    @property
    def amount_decimal(self):
        """Get amount in decimal format (e.g., 29.00)"""
        return self.amount / 100

    def to_dict(self):
        """Convert subscription to dictionary"""
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'tier': self.tier,
            'status': self.status,
            'amount': self.amount_decimal,
            'currency': self.currency,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class GlobalAnalytics(db.Model):
    """
    Daily snapshot of global platform metrics
    Used by Super Admin to track platform growth
    """
    __tablename__ = 'global_analytics'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True, index=True)

    # Tenant metrics
    total_tenants = db.Column(db.Integer, default=0)
    active_tenants = db.Column(db.Integer, default=0)
    trial_tenants = db.Column(db.Integer, default=0)
    canceled_tenants = db.Column(db.Integer, default=0)

    # User metrics
    total_trainers = db.Column(db.Integer, default=0)
    total_athletes = db.Column(db.Integer, default=0)

    # Revenue metrics (in cents)
    mrr = db.Column(db.Integer, default=0)  # Monthly Recurring Revenue
    arr = db.Column(db.Integer, default=0)  # Annual Recurring Revenue

    # Engagement metrics
    workouts_created_today = db.Column(db.Integer, default=0)
    check_ins_today = db.Column(db.Integer, default=0)
    messages_sent_today = db.Column(db.Integer, default=0)

    # Storage metrics
    total_storage_used_gb = db.Column(db.Float, default=0.0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<GlobalAnalytics {self.date}>'

    @property
    def mrr_decimal(self):
        """Get MRR in decimal format"""
        return self.mrr / 100

    @property
    def arr_decimal(self):
        """Get ARR in decimal format"""
        return self.arr / 100

    def to_dict(self):
        """Convert analytics to dictionary"""
        return {
            'date': self.date.isoformat(),
            'total_tenants': self.total_tenants,
            'active_tenants': self.active_tenants,
            'total_trainers': self.total_trainers,
            'total_athletes': self.total_athletes,
            'mrr': self.mrr_decimal,
            'arr': self.arr_decimal,
            'workouts_created_today': self.workouts_created_today
        }
