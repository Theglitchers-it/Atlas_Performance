from flask import render_template, redirect, url_for, flash, request, jsonify, current_app
from flask_login import login_required, current_user
from functools import wraps
from app.blueprints.billing import billing_bp
from app.services.stripe_service import StripeService
from app.models import db
from app.models.super_admin import Tenant
from app.middleware.tenant_context import get_current_tenant
import stripe


def tenant_required(f):
    """Decorator to require tenant context (trainers only)"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if current_user.role != 'trainer':
            flash('Access denied. Trainer access required.', 'danger')
            return redirect(url_for('public.index'))

        tenant = get_current_tenant()
        if not tenant:
            flash('No tenant found for your account.', 'danger')
            return redirect(url_for('public.index'))

        return f(tenant=tenant, *args, **kwargs)
    return decorated_function


@billing_bp.route('/subscription')
@tenant_required
def subscription_overview(tenant):
    """View current subscription details"""

    # Get subscription details from Stripe
    subscription_details = StripeService.get_subscription_details(tenant)

    # Get upcoming invoice
    upcoming_invoice = StripeService.get_upcoming_invoice(tenant)

    # Get payment methods
    payment_methods = StripeService.get_payment_methods(tenant)

    # Calculate days until trial ends
    days_until_trial_end = None
    if tenant.subscription_status == 'trial' and tenant.trial_ends_at:
        from datetime import datetime
        delta = tenant.trial_ends_at - datetime.utcnow()
        days_until_trial_end = max(0, delta.days)

    return render_template('billing/subscription.html',
                          tenant=tenant,
                          subscription=subscription_details,
                          upcoming_invoice=upcoming_invoice,
                          payment_methods=payment_methods,
                          days_until_trial_end=days_until_trial_end,
                          stripe_public_key=current_app.config['STRIPE_PUBLIC_KEY'])


@billing_bp.route('/checkout/<tier>')
@tenant_required
def checkout(tenant, tier):
    """Create a Stripe Checkout session for subscription"""

    if tier not in ['starter', 'pro', 'enterprise']:
        flash('Invalid subscription tier selected.', 'danger')
        return redirect(url_for('billing.subscription_overview'))

    try:
        # Create checkout session
        checkout_session = StripeService.create_subscription(
            tenant,
            tier,
            return_url=url_for('billing.checkout_success', _external=True)
        )

        return redirect(checkout_session.url, code=303)

    except Exception as e:
        current_app.logger.error(f"Checkout error: {str(e)}")
        flash('Failed to create checkout session. Please try again.', 'danger')
        return redirect(url_for('billing.subscription_overview'))


@billing_bp.route('/checkout/success')
@tenant_required
def checkout_success(tenant):
    """Handle successful checkout"""
    session_id = request.args.get('session_id')

    if session_id:
        flash('Subscription activated successfully! Welcome aboard!', 'success')

    return redirect(url_for('trainer.dashboard'))


@billing_bp.route('/portal')
@tenant_required
def customer_portal(tenant):
    """Redirect to Stripe Customer Portal for subscription management"""

    try:
        portal_session = StripeService.create_portal_session(
            tenant,
            return_url=url_for('billing.subscription_overview', _external=True)
        )

        return redirect(portal_session.url, code=303)

    except Exception as e:
        current_app.logger.error(f"Portal error: {str(e)}")
        flash('Failed to open billing portal. Please try again.', 'danger')
        return redirect(url_for('billing.subscription_overview'))


@billing_bp.route('/upgrade/<tier>', methods=['POST'])
@tenant_required
def upgrade(tenant, tier):
    """Upgrade subscription to a higher tier"""

    if tier not in ['pro', 'enterprise']:
        flash('Invalid upgrade tier.', 'danger')
        return redirect(url_for('billing.subscription_overview'))

    # Check current tier
    tier_order = {'starter': 1, 'pro': 2, 'enterprise': 3}
    current_tier_rank = tier_order.get(tenant.subscription_tier, 0)
    new_tier_rank = tier_order.get(tier, 0)

    if new_tier_rank <= current_tier_rank:
        flash('You can only upgrade to a higher tier.', 'warning')
        return redirect(url_for('billing.subscription_overview'))

    try:
        StripeService.upgrade_subscription(tenant, tier)
        flash(f'Successfully upgraded to {tier.capitalize()} plan!', 'success')

    except Exception as e:
        current_app.logger.error(f"Upgrade error: {str(e)}")
        flash('Failed to upgrade subscription. Please try again.', 'danger')

    return redirect(url_for('billing.subscription_overview'))


@billing_bp.route('/downgrade/<tier>', methods=['POST'])
@tenant_required
def downgrade(tenant, tier):
    """Downgrade subscription to a lower tier"""

    if tier not in ['starter', 'pro']:
        flash('Invalid downgrade tier.', 'danger')
        return redirect(url_for('billing.subscription_overview'))

    # Check current tier
    tier_order = {'starter': 1, 'pro': 2, 'enterprise': 3}
    current_tier_rank = tier_order.get(tenant.subscription_tier, 0)
    new_tier_rank = tier_order.get(tier, 0)

    if new_tier_rank >= current_tier_rank:
        flash('You can only downgrade to a lower tier.', 'warning')
        return redirect(url_for('billing.subscription_overview'))

    try:
        StripeService.downgrade_subscription(tenant, tier)
        flash(f'Subscription will downgrade to {tier.capitalize()} plan at the end of your billing period.', 'success')

    except Exception as e:
        current_app.logger.error(f"Downgrade error: {str(e)}")
        flash('Failed to downgrade subscription. Please try again.', 'danger')

    return redirect(url_for('billing.subscription_overview'))


@billing_bp.route('/cancel', methods=['POST'])
@tenant_required
def cancel_subscription(tenant):
    """Cancel subscription at end of billing period"""

    try:
        StripeService.cancel_subscription(tenant)
        flash('Your subscription will be canceled at the end of the billing period.', 'success')

    except Exception as e:
        current_app.logger.error(f"Cancellation error: {str(e)}")
        flash('Failed to cancel subscription. Please try again.', 'danger')

    return redirect(url_for('billing.subscription_overview'))


@billing_bp.route('/reactivate', methods=['POST'])
@tenant_required
def reactivate_subscription(tenant):
    """Reactivate a canceled subscription"""

    try:
        StripeService.reactivate_subscription(tenant)
        flash('Your subscription has been reactivated!', 'success')

    except Exception as e:
        current_app.logger.error(f"Reactivation error: {str(e)}")
        flash('Failed to reactivate subscription. Please try again.', 'danger')

    return redirect(url_for('billing.subscription_overview'))


@billing_bp.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhook events"""

    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')

    try:
        success = StripeService.handle_webhook(payload, sig_header)

        if success:
            return jsonify({'status': 'success'}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Invalid payload or signature'}), 400

    except Exception as e:
        current_app.logger.error(f"Webhook error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 400


@billing_bp.route('/convert-trial/<tier>')
@tenant_required
def convert_trial(tenant, tier):
    """Convert trial to paid subscription"""

    if tenant.subscription_status != 'trial':
        flash('You are not on a trial period.', 'warning')
        return redirect(url_for('billing.subscription_overview'))

    if tier not in ['starter', 'pro', 'enterprise']:
        flash('Invalid subscription tier.', 'danger')
        return redirect(url_for('billing.subscription_overview'))

    try:
        checkout_session = StripeService.convert_trial_to_paid(tenant, tier)
        return redirect(checkout_session.url, code=303)

    except Exception as e:
        current_app.logger.error(f"Trial conversion error: {str(e)}")
        flash('Failed to convert trial. Please try again.', 'danger')
        return redirect(url_for('billing.subscription_overview'))
