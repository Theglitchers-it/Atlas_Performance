from flask import render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, current_user
from app.blueprints.auth import auth_bp
from app.models import db
from app.models.shared import User
from app.blueprints.auth.forms import LoginForm, RegisterForm


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login page - Flip effect with CSRF protection"""
    if current_user.is_authenticated:
        return _redirect_based_on_role()

    login_form = LoginForm()
    register_form = RegisterForm()  # Needed for template rendering

    if login_form.validate_on_submit():
        email = login_form.email.data.lower().strip()
        password = login_form.password.data

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            if not user.is_active:
                flash('Your account has been deactivated. Please contact support.', 'danger')
                return render_template('auth/flip_login.html', login_form=login_form, register_form=register_form)

            # Login user
            remember = login_form.remember_me.data if hasattr(login_form, 'remember_me') else True
            login_user(user, remember=remember)
            user.update_last_login()

            # Redirect based on role
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)

            return _redirect_based_on_role()
        else:
            flash('Invalid email or password', 'danger')

    return render_template('auth/flip_login.html', login_form=login_form, register_form=register_form)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register page - Flip effect with CSRF protection"""
    if current_user.is_authenticated:
        return _redirect_based_on_role()

    login_form = LoginForm()  # Needed for template rendering
    register_form = RegisterForm()

    if register_form.validate_on_submit():
        business_name = register_form.business_name.data.strip()
        first_name = register_form.first_name.data.strip()
        last_name = register_form.last_name.data.strip()
        email = register_form.email.data.lower().strip()
        password = register_form.password.data
        subdomain = register_form.subdomain.data.strip() if register_form.subdomain.data else None

        # Check if email exists (additional check beyond form validation)
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already registered', 'danger')
            return render_template('auth/flip_login.html', login_form=login_form, register_form=register_form)

        try:
            # Create tenant and trainer user
            from app.services.tenant_manager import TenantManager

            tenant, user = TenantManager.create_tenant(
                name=business_name,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password,
                subdomain=subdomain
            )

            # Auto-login
            login_user(user)

            flash(f'Welcome to Atlas Performance, {user.first_name}! Your account has been created.', 'success')
            return redirect(url_for('trainer.onboarding'))

        except ValueError as e:
            flash(str(e), 'danger')
            return render_template('auth/flip_login.html', login_form=login_form, register_form=register_form)

    return render_template('auth/flip_login.html', login_form=login_form, register_form=register_form)


@auth_bp.route('/logout')
def logout():
    """Logout current user"""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('public.index'))


def _redirect_based_on_role():
    """Helper to redirect user based on their role"""
    if current_user.is_super_admin():
        return redirect(url_for('super_admin.dashboard'))
    elif current_user.is_trainer():
        return redirect(url_for('trainer.dashboard'))
    elif current_user.is_athlete():
        return redirect(url_for('athlete.dashboard'))
    else:
        return redirect(url_for('public.index'))
