import re
from app.models import db
from app.models.super_admin import Tenant
from app.models.shared import User


class TenantManager:
    """
    Service for managing tenant (trainer) accounts
    Handles tenant creation, subdomain generation, and onboarding
    """

    @staticmethod
    def create_tenant(name, email, first_name, last_name, password, subdomain=None):
        """
        Create a new tenant with trainer user

        Args:
            name: Business/Trainer name
            email: Trainer email
            first_name: Trainer first name
            last_name: Trainer last name
            password: Trainer password
            subdomain: Optional custom subdomain (auto-generated if not provided)

        Returns:
            tuple: (tenant, user) objects
        """
        # Generate subdomain if not provided
        if not subdomain:
            subdomain = TenantManager.generate_subdomain(name)

        # Validate subdomain
        if not TenantManager.is_subdomain_available(subdomain):
            raise ValueError(f"Subdomain '{subdomain}' is already taken")

        # Create tenant
        tenant = Tenant(
            name=name,
            subdomain=subdomain,
            business_email=email,
            subscription_tier='starter',
            subscription_status='trial',
            max_athletes=10,
            max_storage_gb=5
        )

        db.session.add(tenant)
        db.session.flush()  # Get tenant.id without committing

        # Create trainer user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='trainer',
            tenant_id=tenant.id,
            is_active=True,
            email_verified=True
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        return tenant, user

    @staticmethod
    def generate_subdomain(name):
        """
        Generate a URL-safe subdomain from business name

        Examples:
            "John's Fitness" -> "johns-fitness"
            "Palestra Atletico" -> "palestra-atletico"
        """
        # Convert to lowercase
        subdomain = name.lower()

        # Replace spaces with hyphens
        subdomain = re.sub(r'\s+', '-', subdomain)

        # Remove non-alphanumeric characters (except hyphens)
        subdomain = re.sub(r'[^a-z0-9-]', '', subdomain)

        # Remove multiple consecutive hyphens
        subdomain = re.sub(r'-+', '-', subdomain)

        # Remove leading/trailing hyphens
        subdomain = subdomain.strip('-')

        # Ensure subdomain is not empty
        if not subdomain:
            import uuid
            subdomain = f"trainer-{uuid.uuid4().hex[:8]}"

        # Check if subdomain is taken, add suffix if necessary
        if not TenantManager.is_subdomain_available(subdomain):
            counter = 1
            while not TenantManager.is_subdomain_available(f"{subdomain}-{counter}"):
                counter += 1
            subdomain = f"{subdomain}-{counter}"

        return subdomain

    @staticmethod
    def is_subdomain_available(subdomain):
        """
        Check if subdomain is available

        Reserved subdomains: www, api, admin, app, super-admin, mail, etc.
        """
        reserved = [
            'www', 'api', 'admin', 'app', 'super-admin', 'superadmin',
            'mail', 'ftp', 'smtp', 'pop', 'imap', 'support', 'help',
            'blog', 'forum', 'shop', 'store', 'status', 'staging', 'dev'
        ]

        if subdomain.lower() in reserved:
            return False

        return not Tenant.query.filter_by(subdomain=subdomain).first()

    @staticmethod
    def update_tenant_limits(tenant, tier):
        """
        Update tenant subscription limits based on tier

        Args:
            tenant: Tenant object
            tier: 'starter', 'pro', or 'enterprise'
        """
        limits = {
            'starter': {'max_athletes': 10, 'max_storage_gb': 5},
            'pro': {'max_athletes': 50, 'max_storage_gb': 20},
            'enterprise': {'max_athletes': 999999, 'max_storage_gb': 100}
        }

        tier_limits = limits.get(tier, limits['starter'])

        tenant.subscription_tier = tier
        tenant.max_athletes = tier_limits['max_athletes']
        tenant.max_storage_gb = tier_limits['max_storage_gb']

        db.session.commit()

    @staticmethod
    def deactivate_tenant(tenant):
        """
        Deactivate a tenant account
        Used when subscription is canceled or payment fails
        """
        tenant.is_active = False
        tenant.subscription_status = 'canceled'

        # Deactivate all users in tenant
        for user in tenant.users:
            user.is_active = False

        db.session.commit()

    @staticmethod
    def reactivate_tenant(tenant):
        """
        Reactivate a tenant account
        Used when payment is restored
        """
        tenant.is_active = True
        tenant.subscription_status = 'active'

        # Reactivate trainer users (not athletes, they manage their own status)
        for user in tenant.users:
            if user.role == 'trainer':
                user.is_active = True

        db.session.commit()

    @staticmethod
    def get_tenant_stats(tenant):
        """
        Get statistics for a tenant

        Returns:
            dict: Statistics including athlete count, workouts, etc.
        """
        from app.models.trainer import Athlete, Workout, CheckIn

        stats = {
            'athlete_count': Athlete.query.filter_by(tenant_id=tenant.id, is_active=True).count(),
            'total_athletes': Athlete.query.filter_by(tenant_id=tenant.id).count(),
            'workout_count': Workout.query.filter_by(tenant_id=tenant.id, is_active=True).count(),
            'check_in_count': CheckIn.query.filter_by(tenant_id=tenant.id).count(),
            'athlete_limit': tenant.max_athletes,
            'at_limit': tenant.is_at_athlete_limit
        }

        return stats

    @staticmethod
    def delete_tenant(tenant_id):
        """
        Permanently delete a tenant and all associated data
        USE WITH CAUTION - This is irreversible

        Args:
            tenant_id: ID of tenant to delete
        """
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        # Cancel Stripe subscription if exists
        if tenant.stripe_subscription_id:
            from app.services.stripe_service import StripeService
            try:
                StripeService.cancel_subscription(tenant)
            except Exception as e:
                print(f"Error canceling Stripe subscription: {e}")

        # Delete tenant (cascade will delete related records)
        db.session.delete(tenant)
        db.session.commit()
