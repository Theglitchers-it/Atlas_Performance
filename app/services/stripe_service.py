import stripe
from flask import current_app, url_for
from datetime import datetime
from app.models import db
from app.models.super_admin import Tenant, Subscription


class StripeService:
    """
    Service class for Stripe subscription management
    Handles subscription creation, updates, cancellation, and webhooks
    """

    @staticmethod
    def init_stripe():
        """Initialize Stripe with secret key"""
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']

    @staticmethod
    def create_customer(email, name, metadata=None):
        """
        Create a Stripe customer
        """
        StripeService.init_stripe()

        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata=metadata or {}
        )
        return customer

    @staticmethod
    def create_subscription(tenant, tier='starter', return_url=None):
        """
        Create a Stripe subscription for a tenant

        Args:
            tenant: Tenant object
            tier: Subscription tier ('starter', 'pro', 'enterprise')
            return_url: URL to redirect after checkout

        Returns:
            Stripe Checkout Session
        """
        StripeService.init_stripe()

        # Get price ID based on tier
        price_map = {
            'starter': current_app.config['STRIPE_PRICE_STARTER'],
            'pro': current_app.config['STRIPE_PRICE_PRO'],
            'enterprise': current_app.config['STRIPE_PRICE_ENTERPRISE']
        }

        price_id = price_map.get(tier)
        if not price_id:
            raise ValueError(f"Invalid subscription tier: {tier}")

        # Create or get Stripe customer
        if not tenant.stripe_customer_id:
            customer = StripeService.create_customer(
                email=tenant.business_email,
                name=tenant.name,
                metadata={'tenant_id': tenant.id}
            )
            tenant.stripe_customer_id = customer.id
            db.session.commit()

        # Create Checkout Session
        success_url = return_url or url_for('trainer.dashboard', _external=True)
        cancel_url = url_for('public.pricing', _external=True)

        checkout_session = stripe.checkout.Session.create(
            customer=tenant.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=cancel_url,
            metadata={
                'tenant_id': tenant.id,
                'tier': tier
            }
        )

        return checkout_session

    @staticmethod
    def create_portal_session(tenant, return_url=None):
        """
        Create a Stripe Customer Portal session
        Allows customers to manage their subscription
        """
        StripeService.init_stripe()

        if not tenant.stripe_customer_id:
            raise ValueError("Tenant has no Stripe customer ID")

        return_url = return_url or url_for('trainer.settings', _external=True)

        portal_session = stripe.billing_portal.Session.create(
            customer=tenant.stripe_customer_id,
            return_url=return_url
        )

        return portal_session

    @staticmethod
    def cancel_subscription(tenant):
        """
        Cancel a tenant's subscription
        """
        StripeService.init_stripe()

        if not tenant.stripe_subscription_id:
            raise ValueError("Tenant has no active subscription")

        subscription = stripe.Subscription.modify(
            tenant.stripe_subscription_id,
            cancel_at_period_end=True
        )

        # Update tenant status
        tenant.subscription_status = 'canceling'
        db.session.commit()

        return subscription

    @staticmethod
    def handle_webhook(payload, sig_header):
        """
        Handle Stripe webhook events

        Args:
            payload: Request body
            sig_header: Stripe-Signature header

        Returns:
            True if handled successfully
        """
        StripeService.init_stripe()

        webhook_secret = current_app.config['STRIPE_WEBHOOK_SECRET']

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            # Invalid payload
            return False
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            return False

        # Handle different event types
        if event['type'] == 'checkout.session.completed':
            StripeService._handle_checkout_completed(event['data']['object'])

        elif event['type'] == 'customer.subscription.created':
            StripeService._handle_subscription_created(event['data']['object'])

        elif event['type'] == 'customer.subscription.updated':
            StripeService._handle_subscription_updated(event['data']['object'])

        elif event['type'] == 'customer.subscription.deleted':
            StripeService._handle_subscription_deleted(event['data']['object'])

        elif event['type'] == 'invoice.payment_succeeded':
            StripeService._handle_payment_succeeded(event['data']['object'])

        elif event['type'] == 'invoice.payment_failed':
            StripeService._handle_payment_failed(event['data']['object'])

        return True

    @staticmethod
    def _handle_checkout_completed(session):
        """Handle successful checkout"""
        tenant_id = session['metadata'].get('tenant_id')
        if not tenant_id:
            return

        tenant = Tenant.query.get(tenant_id)
        if tenant:
            tenant.subscription_status = 'active'
            tenant.stripe_subscription_id = session.get('subscription')
            db.session.commit()

    @staticmethod
    def _handle_subscription_created(subscription):
        """Handle subscription creation"""
        customer_id = subscription['customer']
        tenant = Tenant.query.filter_by(stripe_customer_id=customer_id).first()

        if not tenant:
            return

        # Get tier from price ID
        price_id = subscription['items']['data'][0]['price']['id']
        tier = StripeService._get_tier_from_price(price_id)

        # Create subscription record
        new_subscription = Subscription(
            tenant_id=tenant.id,
            stripe_subscription_id=subscription['id'],
            stripe_price_id=price_id,
            tier=tier,
            status=subscription['status'],
            amount=subscription['items']['data'][0]['price']['unit_amount'],
            currency=subscription['items']['data'][0]['price']['currency'].upper(),
            current_period_start=datetime.fromtimestamp(subscription['current_period_start']),
            current_period_end=datetime.fromtimestamp(subscription['current_period_end'])
        )

        db.session.add(new_subscription)

        # Update tenant
        tenant.subscription_tier = tier
        tenant.subscription_status = subscription['status']
        tenant.stripe_subscription_id = subscription['id']

        # Set athlete limits based on tier
        limits = {'starter': 10, 'pro': 50, 'enterprise': 999999}
        tenant.max_athletes = limits.get(tier, 10)

        db.session.commit()

    @staticmethod
    def _handle_subscription_updated(subscription):
        """Handle subscription updates"""
        sub_record = Subscription.query.filter_by(
            stripe_subscription_id=subscription['id']
        ).first()

        if sub_record:
            sub_record.status = subscription['status']
            sub_record.current_period_start = datetime.fromtimestamp(subscription['current_period_start'])
            sub_record.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])

            # Update tenant status
            sub_record.tenant.subscription_status = subscription['status']

            db.session.commit()

    @staticmethod
    def _handle_subscription_deleted(subscription):
        """Handle subscription cancellation"""
        tenant = Tenant.query.filter_by(
            stripe_subscription_id=subscription['id']
        ).first()

        if tenant:
            tenant.subscription_status = 'canceled'
            tenant.is_active = False
            db.session.commit()

    @staticmethod
    def _handle_payment_succeeded(invoice):
        """Handle successful payment"""
        subscription_id = invoice.get('subscription')
        if subscription_id:
            tenant = Tenant.query.filter_by(stripe_subscription_id=subscription_id).first()
            if tenant:
                tenant.subscription_status = 'active'
                db.session.commit()

    @staticmethod
    def _handle_payment_failed(invoice):
        """Handle failed payment"""
        subscription_id = invoice.get('subscription')
        if subscription_id:
            tenant = Tenant.query.filter_by(stripe_subscription_id=subscription_id).first()
            if tenant:
                tenant.subscription_status = 'past_due'
                db.session.commit()

    @staticmethod
    def _get_tier_from_price(price_id):
        """Get subscription tier from Stripe price ID"""
        if price_id == current_app.config['STRIPE_PRICE_STARTER']:
            return 'starter'
        elif price_id == current_app.config['STRIPE_PRICE_PRO']:
            return 'pro'
        elif price_id == current_app.config['STRIPE_PRICE_ENTERPRISE']:
            return 'enterprise'
        return 'starter'

    @staticmethod
    def upgrade_subscription(tenant, new_tier):
        """
        Upgrade a tenant's subscription to a higher tier

        Args:
            tenant: Tenant object
            new_tier: New subscription tier ('pro', 'enterprise')

        Returns:
            Updated Stripe subscription
        """
        StripeService.init_stripe()

        if not tenant.stripe_subscription_id:
            raise ValueError("Tenant has no active subscription to upgrade")

        # Get new price ID
        price_map = {
            'starter': current_app.config['STRIPE_PRICE_STARTER'],
            'pro': current_app.config['STRIPE_PRICE_PRO'],
            'enterprise': current_app.config['STRIPE_PRICE_ENTERPRISE']
        }

        new_price_id = price_map.get(new_tier)
        if not new_price_id:
            raise ValueError(f"Invalid subscription tier: {new_tier}")

        # Get current subscription
        subscription = stripe.Subscription.retrieve(tenant.stripe_subscription_id)

        # Update subscription with new price
        updated_subscription = stripe.Subscription.modify(
            tenant.stripe_subscription_id,
            items=[{
                'id': subscription['items']['data'][0]['id'],
                'price': new_price_id,
            }],
            proration_behavior='always_invoice',  # Charge immediately for upgrade
            metadata={
                'tenant_id': tenant.id,
                'tier': new_tier
            }
        )

        # Update tenant
        tenant.subscription_tier = new_tier

        # Update athlete limits based on tier
        limits = {'starter': 10, 'pro': 50, 'enterprise': 999999}
        tenant.max_athletes = limits.get(new_tier, 10)

        db.session.commit()

        return updated_subscription

    @staticmethod
    def downgrade_subscription(tenant, new_tier):
        """
        Downgrade a tenant's subscription to a lower tier

        Args:
            tenant: Tenant object
            new_tier: New subscription tier ('starter', 'pro')

        Returns:
            Updated Stripe subscription
        """
        StripeService.init_stripe()

        if not tenant.stripe_subscription_id:
            raise ValueError("Tenant has no active subscription to downgrade")

        # Get new price ID
        price_map = {
            'starter': current_app.config['STRIPE_PRICE_STARTER'],
            'pro': current_app.config['STRIPE_PRICE_PRO'],
            'enterprise': current_app.config['STRIPE_PRICE_ENTERPRISE']
        }

        new_price_id = price_map.get(new_tier)
        if not new_price_id:
            raise ValueError(f"Invalid subscription tier: {new_tier}")

        # Get current subscription
        subscription = stripe.Subscription.retrieve(tenant.stripe_subscription_id)

        # Update subscription with new price at end of period
        updated_subscription = stripe.Subscription.modify(
            tenant.stripe_subscription_id,
            items=[{
                'id': subscription['items']['data'][0]['id'],
                'price': new_price_id,
            }],
            proration_behavior='none',  # Don't prorate for downgrade
            metadata={
                'tenant_id': tenant.id,
                'tier': new_tier,
                'scheduled_downgrade': True
            }
        )

        # Update tenant (will take effect at end of billing period)
        tenant.subscription_tier = new_tier

        # Update athlete limits
        limits = {'starter': 10, 'pro': 50, 'enterprise': 999999}
        tenant.max_athletes = limits.get(new_tier, 10)

        db.session.commit()

        return updated_subscription

    @staticmethod
    def convert_trial_to_paid(tenant, tier='starter'):
        """
        Convert a trial tenant to a paid subscription

        Args:
            tenant: Tenant object on trial
            tier: Subscription tier to convert to

        Returns:
            Stripe Checkout Session
        """
        if tenant.subscription_status != 'trial':
            raise ValueError("Tenant is not on a trial")

        # Create subscription checkout
        return StripeService.create_subscription(tenant, tier)

    @staticmethod
    def reactivate_subscription(tenant):
        """
        Reactivate a canceled subscription

        Args:
            tenant: Tenant object with canceled subscription

        Returns:
            Updated Stripe subscription
        """
        StripeService.init_stripe()

        if not tenant.stripe_subscription_id:
            raise ValueError("Tenant has no subscription to reactivate")

        # Remove cancel_at_period_end flag
        subscription = stripe.Subscription.modify(
            tenant.stripe_subscription_id,
            cancel_at_period_end=False
        )

        # Update tenant status
        tenant.subscription_status = 'active'
        db.session.commit()

        return subscription

    @staticmethod
    def get_subscription_details(tenant):
        """
        Get detailed subscription information from Stripe

        Args:
            tenant: Tenant object

        Returns:
            Dict with subscription details
        """
        StripeService.init_stripe()

        if not tenant.stripe_subscription_id:
            return None

        try:
            subscription = stripe.Subscription.retrieve(tenant.stripe_subscription_id)

            return {
                'id': subscription.id,
                'status': subscription.status,
                'current_period_start': datetime.fromtimestamp(subscription.current_period_start),
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end),
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
                'trial_end': datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
                'amount': subscription['items']['data'][0]['price']['unit_amount'],
                'currency': subscription['items']['data'][0]['price']['currency'].upper(),
                'interval': subscription['items']['data'][0]['price']['recurring']['interval']
            }
        except stripe.error.StripeError:
            return None

    @staticmethod
    def get_upcoming_invoice(tenant):
        """
        Get the upcoming invoice for a tenant

        Args:
            tenant: Tenant object

        Returns:
            Stripe Invoice object or None
        """
        StripeService.init_stripe()

        if not tenant.stripe_customer_id:
            return None

        try:
            invoice = stripe.Invoice.upcoming(customer=tenant.stripe_customer_id)
            return invoice
        except stripe.error.StripeError:
            return None

    @staticmethod
    def get_payment_methods(tenant):
        """
        Get payment methods for a tenant

        Args:
            tenant: Tenant object

        Returns:
            List of payment methods
        """
        StripeService.init_stripe()

        if not tenant.stripe_customer_id:
            return []

        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=tenant.stripe_customer_id,
                type='card'
            )
            return payment_methods.data
        except stripe.error.StripeError:
            return []

    @staticmethod
    def create_trial(tenant, trial_days=14):
        """
        Start a trial period for a tenant

        Args:
            tenant: Tenant object
            trial_days: Number of trial days (default 14)
        """
        from datetime import timedelta

        tenant.subscription_status = 'trial'
        tenant.trial_ends_at = datetime.utcnow() + timedelta(days=trial_days)
        tenant.is_active = True

        db.session.commit()

    @staticmethod
    def check_trial_expiration():
        """
        Check for expired trials and update tenant status
        Should be run as a cron job

        Returns:
            Number of tenants with expired trials
        """
        from datetime import datetime

        expired_tenants = Tenant.query.filter(
            Tenant.subscription_status == 'trial',
            Tenant.trial_ends_at <= datetime.utcnow()
        ).all()

        for tenant in expired_tenants:
            tenant.subscription_status = 'trial_expired'
            tenant.is_active = False

        db.session.commit()

        return len(expired_tenants)
