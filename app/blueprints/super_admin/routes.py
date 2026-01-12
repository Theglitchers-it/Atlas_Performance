from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func
from app.blueprints.super_admin import super_admin_bp
from app.models import db
from app.models.super_admin import Tenant, Subscription, GlobalAnalytics
from app.models.shared import User
from app.models.trainer import Athlete, Workout


def super_admin_required(f):
    """Decorator to require super admin access"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_super_admin():
            flash('Access denied. Super admin privileges required.', 'danger')
            return redirect(url_for('public.index'))
        return f(*args, **kwargs)
    return decorated_function


@super_admin_bp.route('/dashboard')
@super_admin_required
def dashboard():
    """Super Admin Dashboard - Platform Overview"""

    # Get key metrics
    total_tenants = Tenant.query.count()
    active_tenants = Tenant.query.filter_by(is_active=True, subscription_status='active').count()
    trial_tenants = Tenant.query.filter_by(subscription_status='trial').count()

    total_trainers = User.query.filter_by(role='trainer').count()
    total_athletes = User.query.filter_by(role='athlete').count()

    # Calculate MRR (Monthly Recurring Revenue)
    active_subscriptions = Subscription.query.filter_by(status='active').all()
    mrr = sum(sub.amount for sub in active_subscriptions)
    mrr_decimal = mrr / 100  # Convert cents to dollars/euros

    # Recent signups (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_signups = Tenant.query.filter(Tenant.created_at >= thirty_days_ago).count()

    # Get recent tenants
    recent_tenants = Tenant.query.order_by(Tenant.created_at.desc()).limit(10).all()

    # Subscription distribution
    subscription_distribution = db.session.query(
        Tenant.subscription_tier,
        func.count(Tenant.id)
    ).filter(
        Tenant.is_active == True
    ).group_by(Tenant.subscription_tier).all()

    return render_template('super_admin/dashboard.html',
                          total_tenants=total_tenants,
                          active_tenants=active_tenants,
                          trial_tenants=trial_tenants,
                          total_trainers=total_trainers,
                          total_athletes=total_athletes,
                          mrr=mrr_decimal,
                          recent_signups=recent_signups,
                          recent_tenants=recent_tenants,
                          subscription_distribution=dict(subscription_distribution))


@super_admin_bp.route('/tenants')
@super_admin_required
def tenants():
    """List all tenants"""
    page = request.args.get('page', 1, type=int)
    per_page = 20

    tenants_query = Tenant.query.order_by(Tenant.created_at.desc())

    # Filter by status
    status_filter = request.args.get('status')
    if status_filter == 'active':
        tenants_query = tenants_query.filter_by(is_active=True, subscription_status='active')
    elif status_filter == 'trial':
        tenants_query = tenants_query.filter_by(subscription_status='trial')
    elif status_filter == 'canceled':
        tenants_query = tenants_query.filter_by(subscription_status='canceled')

    tenants_paginated = tenants_query.paginate(page=page, per_page=per_page, error_out=False)

    return render_template('super_admin/tenants.html',
                          tenants=tenants_paginated.items,
                          pagination=tenants_paginated,
                          status_filter=status_filter)


@super_admin_bp.route('/tenant/<int:tenant_id>')
@super_admin_required
def tenant_detail(tenant_id):
    """View detailed tenant information"""
    tenant = Tenant.query.get_or_404(tenant_id)

    # Get tenant users
    users = User.query.filter_by(tenant_id=tenant_id).all()

    # Get subscription history
    subscriptions = Subscription.query.filter_by(tenant_id=tenant_id).order_by(
        Subscription.created_at.desc()
    ).all()

    # Get counts
    athletes_count = User.query.filter_by(tenant_id=tenant_id, role='athlete').count()
    workouts_count = Workout.query.join(User).filter(User.tenant_id == tenant_id).count()

    return render_template('super_admin/tenant_detail.html',
                          tenant=tenant,
                          users=users,
                          subscriptions=subscriptions,
                          athletes_count=athletes_count,
                          workouts_count=workouts_count)


@super_admin_bp.route('/tenant/<int:tenant_id>/deactivate', methods=['POST'])
@super_admin_required
def deactivate_tenant(tenant_id):
    """Deactivate a tenant"""
    tenant = Tenant.query.get_or_404(tenant_id)

    from app.services.tenant_manager import TenantManager
    TenantManager.deactivate_tenant(tenant)

    flash(f'Tenant "{tenant.name}" has been deactivated', 'success')
    return redirect(url_for('super_admin.tenant_detail', tenant_id=tenant_id))


@super_admin_bp.route('/tenant/<int:tenant_id>/reactivate', methods=['POST'])
@super_admin_required
def reactivate_tenant(tenant_id):
    """Reactivate a tenant"""
    tenant = Tenant.query.get_or_404(tenant_id)

    from app.services.tenant_manager import TenantManager
    TenantManager.reactivate_tenant(tenant)

    flash(f'Tenant "{tenant.name}" has been reactivated', 'success')
    return redirect(url_for('super_admin.tenant_detail', tenant_id=tenant_id))


@super_admin_bp.route('/analytics')
@super_admin_required
def analytics():
    """Global analytics dashboard"""

    # Get last 30 days of analytics
    thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)

    daily_analytics = GlobalAnalytics.query.filter(
        GlobalAnalytics.date >= thirty_days_ago
    ).order_by(GlobalAnalytics.date.asc()).all()

    return render_template('super_admin/analytics.html',
                          daily_analytics=daily_analytics)


@super_admin_bp.route('/api/metrics', methods=['GET'])
@super_admin_required
def api_metrics():
    """API endpoint for real-time metrics (for charts)"""
    days = request.args.get('days', 30, type=int)
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)

    analytics = GlobalAnalytics.query.filter(
        GlobalAnalytics.date >= cutoff_date
    ).order_by(GlobalAnalytics.date.asc()).all()

    return jsonify({
        'dates': [a.date.isoformat() for a in analytics],
        'total_tenants': [a.total_tenants for a in analytics],
        'active_tenants': [a.active_tenants for a in analytics],
        'total_athletes': [a.total_athletes for a in analytics],
        'mrr': [a.mrr_decimal for a in analytics]
    })


@super_admin_bp.route('/subscriptions')
@super_admin_required
def subscriptions():
    """Subscription management overview"""

    # Get all active subscriptions
    active_subscriptions = Subscription.query.filter_by(status='active').all()

    # Calculate MRR
    total_mrr = sum(sub.amount for sub in active_subscriptions) / 100

    # Get subscription count by tier
    subscription_by_tier = db.session.query(
        Tenant.subscription_tier,
        func.count(Tenant.id)
    ).filter(
        Tenant.is_active == True,
        Tenant.subscription_status == 'active'
    ).group_by(Tenant.subscription_tier).all()

    return render_template('super_admin/subscriptions.html',
                          active_subscriptions=active_subscriptions,
                          total_mrr=total_mrr,
                          subscription_by_tier=dict(subscription_by_tier))


@super_admin_bp.route('/users')
@super_admin_required
def users():
    """Platform-wide user management"""

    # Get filter
    role_filter = request.args.get('role')

    # Get all users
    if role_filter:
        trainers = User.query.filter_by(role='trainer').all() if role_filter == 'trainer' else []
        athletes = User.query.filter_by(role='athlete').all() if role_filter == 'athlete' else []
    else:
        trainers = User.query.filter_by(role='trainer').all()
        athletes = User.query.filter_by(role='athlete').all()

    return render_template('super_admin/users.html',
                          trainers=trainers,
                          athletes=athletes,
                          role_filter=role_filter)


@super_admin_bp.route('/profile')
@super_admin_required
def profile():
    """Super Admin Profile Page"""

    # Get platform statistics
    total_tenants = Tenant.query.count()
    active_tenants = Tenant.query.filter_by(is_active=True, subscription_status='active').count()
    total_users = User.query.count()
    total_revenue = db.session.query(func.sum(Subscription.amount)).filter_by(status='active').scalar() or 0
    total_revenue_decimal = total_revenue / 100

    # Get recent activity
    recent_tenants = Tenant.query.order_by(Tenant.created_at.desc()).limit(5).all()

    return render_template('super_admin/profile.html',
                          total_tenants=total_tenants,
                          active_tenants=active_tenants,
                          total_users=total_users,
                          total_revenue=total_revenue_decimal,
                          recent_tenants=recent_tenants)


@super_admin_bp.route('/profile/update', methods=['POST'])
@super_admin_required
def update_profile():
    """Update Super Admin Profile Information"""
    try:
        # Get form data
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        date_of_birth = request.form.get('date_of_birth')

        # Validate required fields
        if not all([first_name, last_name, email]):
            return jsonify({'success': False, 'message': 'Campi obbligatori mancanti'}), 400

        # Check if email is already taken by another user
        if email != current_user.email:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return jsonify({'success': False, 'message': 'Email già in uso'}), 400

        # Update user
        current_user.first_name = first_name
        current_user.last_name = last_name
        current_user.email = email
        current_user.phone = phone

        if date_of_birth:
            from datetime import datetime as dt
            current_user.date_of_birth = dt.strptime(date_of_birth, '%Y-%m-%d').date()

        db.session.commit()

        return jsonify({'success': True, 'message': 'Profilo aggiornato con successo'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Errore: {str(e)}'}), 500


@super_admin_bp.route('/profile/change-password', methods=['POST'])
@super_admin_required
def change_password():
    """Change Super Admin Password"""
    try:
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        # Validate required fields
        if not all([current_password, new_password, confirm_password]):
            return jsonify({'success': False, 'message': 'Tutti i campi sono obbligatori'}), 400

        # Check current password
        if not current_user.check_password(current_password):
            return jsonify({'success': False, 'message': 'Password attuale non corretta'}), 400

        # Check if new passwords match
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'Le nuove password non corrispondono'}), 400

        # Validate password strength
        if len(new_password) < 8:
            return jsonify({'success': False, 'message': 'La password deve essere di almeno 8 caratteri'}), 400

        # Update password
        current_user.set_password(new_password)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Password aggiornata con successo'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Errore: {str(e)}'}), 500


@super_admin_bp.route('/profile/upload-avatar', methods=['POST'])
@super_admin_required
def upload_avatar():
    """Upload Super Admin Avatar"""
    try:
        if 'avatar' not in request.files:
            return jsonify({'success': False, 'message': 'Nessun file caricato'}), 400

        file = request.files['avatar']

        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nessun file selezionato'}), 400

        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'message': 'Formato file non supportato. Usa PNG, JPG o GIF'}), 400

        # Import upload service
        from app.services.upload_service import upload_file

        # Upload file
        file_url = upload_file(file, 'avatars', f'super_admin_{current_user.id}')

        # Update user avatar
        current_user.avatar_url = file_url
        db.session.commit()

        return jsonify({'success': True, 'message': 'Avatar aggiornato con successo', 'avatar_url': file_url})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Errore: {str(e)}'}), 500
