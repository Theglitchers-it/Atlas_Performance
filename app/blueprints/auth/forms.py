from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError, Regexp
import re


class LoginForm(FlaskForm):
    """Login form for all users"""
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Invalid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required')
    ])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Login')


class RegisterForm(FlaskForm):
    """Trainer registration form"""
    business_name = StringField('Business/Trainer Name', validators=[
        DataRequired(message='Business name is required'),
        Length(min=3, max=100, message='Business name must be between 3 and 100 characters')
    ])

    first_name = StringField('First Name', validators=[
        DataRequired(message='First name is required'),
        Length(min=2, max=50, message='First name must be between 2 and 50 characters')
    ])

    last_name = StringField('Last Name', validators=[
        DataRequired(message='Last name is required'),
        Length(min=2, max=50, message='Last name must be between 2 and 50 characters')
    ])

    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Invalid email address')
    ])

    subdomain = StringField('Subdomain (optional)', validators=[
        Length(max=50, message='Subdomain must be less than 50 characters'),
        Regexp(r'^[a-z0-9-]*$', message='Subdomain can only contain lowercase letters, numbers, and hyphens')
    ])

    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=8, message='Password must be at least 8 characters')
    ])

    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])

    terms = BooleanField('I agree to the Terms of Service', validators=[
        DataRequired(message='You must agree to the terms')
    ])

    submit = SubmitField('Create Account')

    def validate_subdomain(self, subdomain):
        """Custom validator for subdomain"""
        if subdomain.data:
            from app.services.tenant_manager import TenantManager

            if not TenantManager.is_subdomain_available(subdomain.data):
                raise ValidationError('This subdomain is already taken or reserved')


class PasswordResetRequestForm(FlaskForm):
    """Password reset request form"""
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Invalid email address')
    ])
    submit = SubmitField('Request Password Reset')


class PasswordResetForm(FlaskForm):
    """Password reset form"""
    password = PasswordField('New Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=8, message='Password must be at least 8 characters')
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Reset Password')
