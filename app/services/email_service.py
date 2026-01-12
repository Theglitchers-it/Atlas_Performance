from flask import current_app, render_template
from flask_mail import Message
from app import mail
from threading import Thread


class EmailService:
    """
    Service class for sending emails
    Handles transactional emails, notifications, and bulk emails
    """

    @staticmethod
    def send_async_email(app, msg):
        """Send email asynchronously in a background thread"""
        with app.app_context():
            try:
                mail.send(msg)
            except Exception as e:
                current_app.logger.error(f"Failed to send email: {str(e)}")

    @staticmethod
    def send_email(subject, recipient, text_body, html_body=None, sender=None):
        """
        Send an email

        Args:
            subject: Email subject
            recipient: Recipient email address
            text_body: Plain text body
            html_body: HTML body (optional)
            sender: Sender email address (defaults to MAIL_DEFAULT_SENDER)

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not current_app.config.get('MAIL_USERNAME'):
            current_app.logger.warning("Email service not configured. Skipping email.")
            return False

        sender = sender or current_app.config['MAIL_DEFAULT_SENDER']

        msg = Message(
            subject=subject,
            sender=sender,
            recipients=[recipient] if isinstance(recipient, str) else recipient
        )
        msg.body = text_body
        if html_body:
            msg.html = html_body

        # Send asynchronously
        Thread(
            target=EmailService.send_async_email,
            args=(current_app._get_current_object(), msg)
        ).start()

        return True

    @staticmethod
    def send_welcome_email(user):
        """
        Send welcome email to new user

        Args:
            user: User object
        """
        subject = "Welcome to Atlas Performance!"
        text_body = f"""
Hello {user.first_name},

Welcome to Atlas Performance! We're excited to have you on board.

Your account has been successfully created. You can now log in and start using our platform.

If you have any questions, feel free to reach out to our support team.

Best regards,
The Atlas Performance Team
        """

        html_body = f"""
<html>
<body>
    <h2>Welcome to Atlas Performance!</h2>
    <p>Hello <strong>{user.first_name}</strong>,</p>
    <p>Welcome to Atlas Performance! We're excited to have you on board.</p>
    <p>Your account has been successfully created. You can now log in and start using our platform.</p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <br>
    <p>Best regards,<br>The Atlas Performance Team</p>
</body>
</html>
        """

        return EmailService.send_email(subject, user.email, text_body, html_body)

    @staticmethod
    def send_password_reset_email(user, reset_token):
        """
        Send password reset email

        Args:
            user: User object
            reset_token: Password reset token
        """
        from flask import url_for

        reset_url = url_for('auth.reset_password', token=reset_token, _external=True)

        subject = "Reset Your Password - Atlas Performance"
        text_body = f"""
Hello {user.first_name},

You have requested to reset your password for your Atlas Performance account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Best regards,
The Atlas Performance Team
        """

        html_body = f"""
<html>
<body>
    <h2>Password Reset Request</h2>
    <p>Hello <strong>{user.first_name}</strong>,</p>
    <p>You have requested to reset your password for your Atlas Performance account.</p>
    <p>Click the button below to reset your password:</p>
    <p style="margin: 20px 0;">
        <a href="{reset_url}"
           style="background-color: #007bff; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
        </a>
    </p>
    <p>Or copy and paste this link into your browser:<br>
    <a href="{reset_url}">{reset_url}</a></p>
    <p><small>This link will expire in 1 hour.</small></p>
    <p>If you did not request a password reset, please ignore this email.</p>
    <br>
    <p>Best regards,<br>The Atlas Performance Team</p>
</body>
</html>
        """

        return EmailService.send_email(subject, user.email, text_body, html_body)

    @staticmethod
    def send_email_verification(user, verification_token):
        """
        Send email verification email

        Args:
            user: User object
            verification_token: Email verification token
        """
        from flask import url_for

        verify_url = url_for('auth.verify_email', token=verification_token, _external=True)

        subject = "Verify Your Email - Atlas Performance"
        text_body = f"""
Hello {user.first_name},

Thank you for signing up for Atlas Performance!

Please verify your email address by clicking the link below:
{verify_url}

This link will expire in 24 hours.

Best regards,
The Atlas Performance Team
        """

        html_body = f"""
<html>
<body>
    <h2>Verify Your Email Address</h2>
    <p>Hello <strong>{user.first_name}</strong>,</p>
    <p>Thank you for signing up for Atlas Performance!</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p style="margin: 20px 0;">
        <a href="{verify_url}"
           style="background-color: #28a745; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
        </a>
    </p>
    <p>Or copy and paste this link into your browser:<br>
    <a href="{verify_url}">{verify_url}</a></p>
    <p><small>This link will expire in 24 hours.</small></p>
    <br>
    <p>Best regards,<br>The Atlas Performance Team</p>
</body>
</html>
        """

        return EmailService.send_email(subject, user.email, text_body, html_body)

    @staticmethod
    def send_subscription_confirmation(tenant, subscription_tier, amount):
        """
        Send subscription confirmation email

        Args:
            tenant: Tenant object
            subscription_tier: Subscription tier (starter, pro, enterprise)
            amount: Subscription amount
        """
        trainer = tenant.users.filter_by(role='trainer').first()
        if not trainer:
            return False

        tier_names = {
            'starter': 'Starter',
            'pro': 'Pro',
            'enterprise': 'Enterprise'
        }

        subject = f"Subscription Confirmed - {tier_names.get(subscription_tier, 'Unknown')} Plan"
        text_body = f"""
Hello {trainer.first_name},

Your subscription to the {tier_names.get(subscription_tier, 'Unknown')} plan has been confirmed!

Plan: {tier_names.get(subscription_tier, 'Unknown')}
Amount: EUR {amount/100:.2f}/month

Your subscription is now active and you have full access to all features.

Thank you for choosing Atlas Performance!

Best regards,
The Atlas Performance Team
        """

        html_body = f"""
<html>
<body>
    <h2>Subscription Confirmed!</h2>
    <p>Hello <strong>{trainer.first_name}</strong>,</p>
    <p>Your subscription to the <strong>{tier_names.get(subscription_tier, 'Unknown')} plan</strong> has been confirmed!</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p><strong>Plan:</strong> {tier_names.get(subscription_tier, 'Unknown')}</p>
        <p><strong>Amount:</strong> EUR {amount/100:.2f}/month</p>
    </div>
    <p>Your subscription is now active and you have full access to all features.</p>
    <p>Thank you for choosing Atlas Performance!</p>
    <br>
    <p>Best regards,<br>The Atlas Performance Team</p>
</body>
</html>
        """

        return EmailService.send_email(subject, trainer.email, text_body, html_body)

    @staticmethod
    def send_trial_expiry_reminder(tenant, days_remaining):
        """
        Send trial expiry reminder email

        Args:
            tenant: Tenant object
            days_remaining: Days remaining in trial
        """
        trainer = tenant.users.filter_by(role='trainer').first()
        if not trainer:
            return False

        subject = f"Your trial expires in {days_remaining} days - Atlas Performance"
        text_body = f"""
Hello {trainer.first_name},

Your Atlas Performance trial will expire in {days_remaining} days.

To continue using Atlas Performance without interruption, please subscribe to one of our plans.

Visit your dashboard to choose a plan that works for you.

Best regards,
The Atlas Performance Team
        """

        html_body = f"""
<html>
<body>
    <h2>Trial Expiring Soon</h2>
    <p>Hello <strong>{trainer.first_name}</strong>,</p>
    <p>Your Atlas Performance trial will expire in <strong>{days_remaining} days</strong>.</p>
    <p>To continue using Atlas Performance without interruption, please subscribe to one of our plans.</p>
    <p style="margin: 20px 0;">
        <a href="{current_app.config.get('BASE_URL', '')}/billing/subscribe"
           style="background-color: #007bff; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Choose a Plan
        </a>
    </p>
    <br>
    <p>Best regards,<br>The Atlas Performance Team</p>
</body>
</html>
        """

        return EmailService.send_email(subject, trainer.email, text_body, html_body)

    @staticmethod
    def send_workout_assignment_notification(athlete, workout):
        """
        Send notification when a workout is assigned to an athlete

        Args:
            athlete: Athlete object
            workout: Workout object
        """
        user = athlete.user

        subject = "New Workout Assigned - Atlas Performance"
        text_body = f"""
Hello {user.first_name},

Your trainer has assigned you a new workout!

Workout: {workout.name}
{f"Description: {workout.description}" if workout.description else ""}

Log in to your dashboard to view the details and start your workout.

Good luck!

Best regards,
Your Trainer
        """

        html_body = f"""
<html>
<body>
    <h2>New Workout Assigned!</h2>
    <p>Hello <strong>{user.first_name}</strong>,</p>
    <p>Your trainer has assigned you a new workout!</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p><strong>Workout:</strong> {workout.name}</p>
        {f"<p><strong>Description:</strong> {workout.description}</p>" if workout.description else ""}
    </div>
    <p>Log in to your dashboard to view the details and start your workout.</p>
    <p>Good luck!</p>
    <br>
    <p>Best regards,<br>Your Trainer</p>
</body>
</html>
        """

        return EmailService.send_email(subject, user.email, text_body, html_body)

    @staticmethod
    def send_check_in_reminder(athlete):
        """
        Send reminder for weekly check-in

        Args:
            athlete: Athlete object
        """
        user = athlete.user

        subject = "Weekly Check-In Reminder - Atlas Performance"
        text_body = f"""
Hello {user.first_name},

It's time for your weekly check-in!

Please take a few minutes to:
- Update your weight and measurements
- Upload progress photos
- Share how you're feeling about your progress

Your trainer is waiting to review your progress and adjust your program if needed.

Best regards,
The Atlas Performance Team
        """

        html_body = f"""
<html>
<body>
    <h2>Weekly Check-In Reminder</h2>
    <p>Hello <strong>{user.first_name}</strong>,</p>
    <p>It's time for your weekly check-in!</p>
    <p>Please take a few minutes to:</p>
    <ul>
        <li>Update your weight and measurements</li>
        <li>Upload progress photos</li>
        <li>Share how you're feeling about your progress</li>
    </ul>
    <p>Your trainer is waiting to review your progress and adjust your program if needed.</p>
    <br>
    <p>Best regards,<br>The Atlas Performance Team</p>
</body>
</html>
        """

        return EmailService.send_email(subject, user.email, text_body, html_body)
