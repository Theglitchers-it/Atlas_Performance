from datetime import datetime, timedelta
from flask import current_app
from app.models import db
from app.models.trainer import Message, Athlete, Workout, CheckIn
from app.models.shared import User
from app.services.email_service import EmailService


class Notification(db.Model):
    """
    In-app notification model for real-time notifications
    """
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Notification details
    type = db.Column(db.String(50), nullable=False)  # workout_assigned, pr_achieved, check_in_reminder, etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    action_url = db.Column(db.String(500))  # Optional link to relevant page

    # Status
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    is_email_sent = db.Column(db.Boolean, default=False)

    # Priority
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent

    # Metadata (JSON)
    metadata = db.Column(db.JSON)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = db.Column(db.DateTime)

    # Relationships
    tenant = db.relationship('Tenant', backref='notifications')
    user = db.relationship('User', backref='notifications')

    def __repr__(self):
        return f'<Notification {self.type} - {self.user_id}>'

    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'action_url': self.action_url,
            'is_read': self.is_read,
            'priority': self.priority,
            'created_at': self.created_at.isoformat(),
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'metadata': self.metadata
        }


class NotificationService:
    """
    Comprehensive notification service
    Handles in-app notifications, email notifications, and push notifications (PWA)
    """

    # ==================== IN-APP NOTIFICATIONS ====================

    @staticmethod
    def create_notification(tenant_id, user_id, notification_type, title, message,
                          action_url=None, priority='normal', metadata=None, send_email=False):
        """
        Create a new in-app notification

        Args:
            tenant_id: Tenant ID
            user_id: User ID to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            action_url: Optional URL to link to
            priority: Notification priority (low, normal, high, urgent)
            metadata: Optional metadata dict
            send_email: Whether to also send email notification

        Returns:
            Notification object
        """
        notification = Notification(
            tenant_id=tenant_id,
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
            priority=priority,
            metadata=metadata or {}
        )

        db.session.add(notification)
        db.session.commit()

        # Send email if requested
        if send_email:
            user = User.query.get(user_id)
            if user:
                NotificationService.send_email_notification(user, title, message, action_url)
                notification.is_email_sent = True
                db.session.commit()

        return notification

    @staticmethod
    def get_user_notifications(user_id, unread_only=False, limit=50):
        """
        Get notifications for a user

        Args:
            user_id: User ID
            unread_only: Only return unread notifications
            limit: Maximum number of notifications to return

        Returns:
            List of notifications
        """
        query = Notification.query.filter_by(user_id=user_id)

        if unread_only:
            query = query.filter_by(is_read=False)

        notifications = query.order_by(
            Notification.created_at.desc()
        ).limit(limit).all()

        return [n.to_dict() for n in notifications]

    @staticmethod
    def mark_as_read(notification_id, user_id):
        """
        Mark notification as read

        Args:
            notification_id: Notification ID
            user_id: User ID (for security check)

        Returns:
            bool: Success status
        """
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id
        ).first()

        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
            return True

        return False

    @staticmethod
    def mark_all_as_read(user_id):
        """Mark all notifications as read for a user"""
        Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow()
        })
        db.session.commit()

    @staticmethod
    def get_unread_count(user_id):
        """Get count of unread notifications"""
        return Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).count()

    @staticmethod
    def delete_notification(notification_id, user_id):
        """Delete a notification"""
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id
        ).first()

        if notification:
            db.session.delete(notification)
            db.session.commit()
            return True

        return False

    # ==================== EMAIL NOTIFICATIONS ====================

    @staticmethod
    def send_email_notification(user, title, message, action_url=None):
        """
        Send email notification to user

        Args:
            user: User object
            title: Email subject/title
            message: Email message
            action_url: Optional action URL
        """
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #667eea;">{title}</h2>
                <p>{message}</p>
                {f'<p><a href="{action_url}" style="display: inline-block; padding: 10px 20px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Details</a></p>' if action_url else ''}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    You're receiving this email because you're subscribed to notifications from Atlas Performance.
                    <br>You can manage your notification preferences in your account settings.
                </p>
            </div>
        </body>
        </html>
        """

        text_body = f"{title}\n\n{message}\n\n{f'View details: {action_url}' if action_url else ''}"

        return EmailService.send_email(title, user.email, text_body, html_body)

    # ==================== WORKOUT NOTIFICATIONS ====================

    @staticmethod
    def notify_workout_assigned(tenant_id, athlete_id, workout_id, trainer_name):
        """
        Notify athlete when new workout is assigned

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
            workout_id: Workout ID
            trainer_name: Name of trainer who assigned workout
        """
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return

        workout = Workout.query.get(workout_id)
        if not workout:
            return

        title = "New Workout Assigned"
        message = f"{trainer_name} has assigned you a new workout: {workout.name}"
        action_url = f"/athlete/workout/{workout_id}"

        return NotificationService.create_notification(
            tenant_id=tenant_id,
            user_id=athlete.user_id,
            notification_type='workout_assigned',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal',
            metadata={'workout_id': workout_id, 'trainer_name': trainer_name},
            send_email=True
        )

    @staticmethod
    def notify_workout_reminder(tenant_id, athlete_id, workout_id):
        """
        Send workout reminder notification

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
            workout_id: Workout ID
        """
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return

        workout = Workout.query.get(workout_id)
        if not workout:
            return

        title = "Workout Reminder"
        message = f"Don't forget your workout today: {workout.name}"
        action_url = f"/athlete/workout/{workout_id}"

        return NotificationService.create_notification(
            tenant_id=tenant_id,
            user_id=athlete.user_id,
            notification_type='workout_reminder',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal',
            metadata={'workout_id': workout_id}
        )

    # ==================== PROGRESS NOTIFICATIONS ====================

    @staticmethod
    def notify_pr_achieved(tenant_id, athlete_id, exercise_name, record_type, weight, reps):
        """
        Notify athlete when they achieve a new personal record

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
            exercise_name: Exercise name
            record_type: Type of PR (1RM, 3RM, etc.)
            weight: Weight achieved
            reps: Reps achieved
        """
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return

        title = "New Personal Record!"
        message = f"Congratulations! You've achieved a new {record_type} on {exercise_name}: {weight}kg for {reps} reps!"
        action_url = "/athlete/progress"

        return NotificationService.create_notification(
            tenant_id=tenant_id,
            user_id=athlete.user_id,
            notification_type='pr_achieved',
            title=title,
            message=message,
            action_url=action_url,
            priority='high',
            metadata={
                'exercise_name': exercise_name,
                'record_type': record_type,
                'weight': weight,
                'reps': reps
            },
            send_email=True
        )

    @staticmethod
    def notify_milestone_reached(tenant_id, athlete_id, milestone_type, milestone_value):
        """
        Notify athlete when they reach a milestone

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
            milestone_type: Type of milestone (total_workouts, total_volume, etc.)
            milestone_value: Value achieved
        """
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return

        milestone_messages = {
            'total_workouts': f"You've completed {milestone_value} workouts!",
            'total_volume': f"You've lifted a total of {milestone_value}kg!",
            'workout_streak': f"You're on a {milestone_value}-day workout streak!",
            'weight_goal': f"You've reached your weight goal of {milestone_value}kg!"
        }

        message = milestone_messages.get(milestone_type, f"Milestone reached: {milestone_value}")
        title = "Milestone Reached!"

        return NotificationService.create_notification(
            tenant_id=tenant_id,
            user_id=athlete.user_id,
            notification_type='milestone_reached',
            title=title,
            message=message,
            action_url="/athlete/progress",
            priority='normal',
            metadata={'milestone_type': milestone_type, 'value': milestone_value},
            send_email=False  # Don't spam email for milestones
        )

    # ==================== CHECK-IN NOTIFICATIONS ====================

    @staticmethod
    def notify_check_in_reminder(tenant_id, athlete_id):
        """
        Remind athlete to complete their check-in

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
        """
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return

        title = "Check-In Reminder"
        message = "It's time for your weekly check-in! Update your progress photos and measurements."
        action_url = "/athlete/check-in"

        return NotificationService.create_notification(
            tenant_id=tenant_id,
            user_id=athlete.user_id,
            notification_type='check_in_reminder',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal',
            send_email=True
        )

    @staticmethod
    def notify_trainer_feedback(tenant_id, athlete_id, trainer_name, check_in_id):
        """
        Notify athlete when trainer provides feedback on check-in

        Args:
            tenant_id: Tenant ID
            athlete_id: Athlete ID
            trainer_name: Trainer's name
            check_in_id: Check-in ID
        """
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return

        title = "New Trainer Feedback"
        message = f"{trainer_name} has provided feedback on your check-in!"
        action_url = f"/athlete/check-in/{check_in_id}"

        return NotificationService.create_notification(
            tenant_id=tenant_id,
            user_id=athlete.user_id,
            notification_type='trainer_feedback',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal',
            metadata={'trainer_name': trainer_name, 'check_in_id': check_in_id},
            send_email=True
        )

    # ==================== SCHEDULED NOTIFICATION TASKS ====================

    @staticmethod
    def send_daily_reminders():
        """
        Send daily workout reminders to athletes
        This should be called by a scheduler (e.g., APScheduler or Celery)
        """
        from datetime import date

        today = date.today()
        day_of_week = today.weekday()

        # Find all active workouts scheduled for today
        workouts_today = Workout.query.filter_by(
            day_of_week=day_of_week,
            is_active=True
        ).all()

        for workout in workouts_today:
            NotificationService.notify_workout_reminder(
                tenant_id=workout.tenant_id,
                athlete_id=workout.athlete_id,
                workout_id=workout.id
            )

    @staticmethod
    def send_weekly_check_in_reminders():
        """
        Send weekly check-in reminders
        This should be called weekly by a scheduler
        """
        # Find athletes who haven't checked in this week
        week_ago = datetime.now().date() - timedelta(days=7)

        athletes = Athlete.query.filter_by(is_active=True).all()

        for athlete in athletes:
            last_check_in = CheckIn.query.filter_by(
                athlete_id=athlete.id
            ).order_by(CheckIn.check_in_date.desc()).first()

            # Send reminder if no check-in in last 7 days
            if not last_check_in or last_check_in.check_in_date < week_ago:
                NotificationService.notify_check_in_reminder(
                    tenant_id=athlete.tenant_id,
                    athlete_id=athlete.id
                )

    # ==================== PUSH NOTIFICATIONS (PWA) ====================

    @staticmethod
    def send_push_notification(user_id, title, message, data=None):
        """
        Send push notification to user's devices
        Placeholder for PWA push notifications implementation

        Args:
            user_id: User ID
            title: Notification title
            message: Notification message
            data: Optional data payload

        Note:
            This requires:
            1. Service worker registration
            2. Web Push API setup
            3. VAPID keys configuration
            4. User subscription to push notifications

        For full implementation, integrate with:
        - pywebpush library
        - Firebase Cloud Messaging (FCM)
        - OneSignal or similar service
        """
        try:
            from app.models.shared import User

            # Get user
            user = User.query.get(user_id)
            if not user:
                current_app.logger.warning(f"Push notification: User {user_id} not found")
                return False

            # Check if user has push notifications enabled in preferences
            push_enabled = user.get_preference('push_notifications', False)

            if not push_enabled:
                current_app.logger.info(f"Push notifications disabled for user {user_id}")
                return False

            # Log push notification (for now, until external service is integrated)
            current_app.logger.info(
                f"Push notification for user {user_id} ({user.email}): "
                f"Title='{title}', Message='{message}', Data={data}"
            )

            # TODO: When ready to integrate external push service, add here:
            #
            # Option 1: Firebase Cloud Messaging (FCM)
            # from firebase_admin import messaging
            # message = messaging.Message(
            #     notification=messaging.Notification(title=title, body=message),
            #     data=data or {},
            #     token=user.fcm_token  # Store in user model
            # )
            # messaging.send(message)
            #
            # Option 2: OneSignal
            # import onesignal_sdk
            # client = onesignal_sdk.Client(...)
            # client.send_notification(
            #     contents={'en': message},
            #     headings={'en': title},
            #     include_player_ids=[user.onesignal_id]
            # )
            #
            # Option 3: pywebpush (for PWA)
            # from pywebpush import webpush
            # subscription_info = user.get_preference('push_subscription')
            # if subscription_info:
            #     webpush(
            #         subscription_info=subscription_info,
            #         data=json.dumps({'title': title, 'body': message, 'data': data}),
            #         vapid_private_key=current_app.config['VAPID_PRIVATE_KEY'],
            #         vapid_claims={'sub': 'mailto:' + current_app.config['VAPID_EMAIL']}
            #     )

            # Fallback: Send email notification if push fails or not configured
            if user.get_preference('email_notifications', True):
                NotificationService.send_email_notification(
                    user.email,
                    title,
                    message,
                    data
                )

            return True

        except Exception as e:
            current_app.logger.error(f"Error sending push notification: {str(e)}")
            return False
