#!/usr/bin/env python
"""
Test Email Configuration
Verifies that email service is properly configured and working
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def test_email_config():
    """Test 1: Verify email configuration is present"""
    print("\n[TEST 1] Checking email configuration...")
    try:
        from app import create_app

        app = create_app()
        with app.app_context():
            config = app.config

            # Check if email is configured
            mail_username = config.get('MAIL_USERNAME')
            mail_password = config.get('MAIL_PASSWORD')
            mail_server = config.get('MAIL_SERVER')
            mail_port = config.get('MAIL_PORT')

            print(f"  MAIL_SERVER: {mail_server}")
            print(f"  MAIL_PORT: {mail_port}")
            print(f"  MAIL_USE_TLS: {config.get('MAIL_USE_TLS')}")
            print(f"  MAIL_USE_SSL: {config.get('MAIL_USE_SSL')}")
            print(f"  MAIL_USERNAME: {'*' * 10 if mail_username and mail_username != 'your_email@gmail.com' else 'NOT CONFIGURED'}")
            print(f"  MAIL_PASSWORD: {'*' * 10 if mail_password and mail_password != 'your_app_password' else 'NOT CONFIGURED'}")
            print(f"  MAIL_DEFAULT_SENDER: {config.get('MAIL_DEFAULT_SENDER')}")

            if not mail_username or mail_username == 'your_email@gmail.com':
                print("\n[WARNING] Email not configured! Using default placeholder values.")
                print("  Email features will be DISABLED in production.")
                print("  See .env.example for configuration instructions.")
                return False

            if not mail_password or mail_password == 'your_app_password':
                print("\n[WARNING] Email password not configured!")
                print("  Email features will be DISABLED in production.")
                return False

            print("\n[OK] Email configuration present")
            return True

    except Exception as e:
        print(f"\n[FAIL] Error checking email config: {str(e)}")
        return False


def test_email_service_import():
    """Test 2: Verify EmailService can be imported"""
    print("\n[TEST 2] Testing EmailService import...")
    try:
        from app.services.email_service import EmailService

        # Check if service has required methods
        assert hasattr(EmailService, 'send_email'), "Missing send_email method"
        assert hasattr(EmailService, 'send_welcome_email'), "Missing send_welcome_email method"
        assert hasattr(EmailService, 'send_password_reset_email'), "Missing send_password_reset_email method"

        print("[OK] EmailService imported successfully")
        print("[OK] All required methods present")
        return True

    except Exception as e:
        print(f"[FAIL] Error importing EmailService: {str(e)}")
        return False


def test_send_test_email():
    """Test 3: Send a test email (only if configured)"""
    print("\n[TEST 3] Sending test email...")
    try:
        from app import create_app
        from app.services.email_service import EmailService

        app = create_app()
        with app.app_context():
            config = app.config

            # Check if email is configured
            mail_username = config.get('MAIL_USERNAME')

            if not mail_username or mail_username == 'your_email@gmail.com':
                print("[SKIP] Email not configured. Skipping test email.")
                print("  Configure .env with real email credentials to test.")
                return True  # Not a failure, just skipped

            # Ask for confirmation before sending
            print(f"\n  About to send test email to: {mail_username}")
            print("  This will use your configured SMTP settings.")

            response = input("\n  Send test email? (y/n): ").lower().strip()

            if response != 'y':
                print("[SKIP] Test email cancelled by user")
                return True

            # Send test email
            print("\n  Sending test email...")

            result = EmailService.send_email(
                subject="Atlas Performance - Test Email",
                recipient=mail_username,
                text_body="""
This is a test email from Atlas Performance.

If you received this email, your email configuration is working correctly!

Email Service Details:
- SMTP Server: {}
- SMTP Port: {}
- TLS Enabled: {}

You can now use email features like:
- Password reset
- Welcome emails
- Workout reminders
- Check-in notifications

Best regards,
Atlas Performance System
                """.format(
                    config.get('MAIL_SERVER'),
                    config.get('MAIL_PORT'),
                    config.get('MAIL_USE_TLS')
                ),
                html_body="""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #3b82f6;">Atlas Performance - Test Email</h2>

    <p>If you received this email, your email configuration is working correctly!</p>

    <h3>Email Service Details:</h3>
    <ul>
        <li><strong>SMTP Server:</strong> {}</li>
        <li><strong>SMTP Port:</strong> {}</li>
        <li><strong>TLS Enabled:</strong> {}</li>
    </ul>

    <h3>You can now use email features like:</h3>
    <ul>
        <li>Password reset</li>
        <li>Welcome emails</li>
        <li>Workout reminders</li>
        <li>Check-in notifications</li>
    </ul>

    <p style="margin-top: 30px; color: #666;">
        Best regards,<br>
        <strong>Atlas Performance System</strong>
    </p>
</body>
</html>
                """.format(
                    config.get('MAIL_SERVER'),
                    config.get('MAIL_PORT'),
                    config.get('MAIL_USE_TLS')
                )
            )

            if result:
                print("\n[OK] Test email sent successfully!")
                print(f"  Check your inbox: {mail_username}")
                print("  Note: Email may take a few seconds to arrive")
                print("  Check spam folder if not received within 1-2 minutes")
                return True
            else:
                print("\n[FAIL] Failed to send test email")
                print("  Check your SMTP credentials and try again")
                return False

    except Exception as e:
        print(f"\n[FAIL] Error sending test email: {str(e)}")
        print("  Common issues:")
        print("    - Wrong SMTP credentials")
        print("    - Gmail: Need 'App Password', not regular password")
        print("    - Firewall blocking SMTP port")
        print("    - SMTP server requires SSL instead of TLS")
        return False


def main():
    """Run all email tests"""
    print("=" * 80)
    print("  ATLAS PERFORMANCE - EMAIL SERVICE TEST")
    print("=" * 80)

    tests = [
        test_email_config,
        test_email_service_import,
        test_send_test_email,
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"[FAIL] Test crashed: {str(e)}")
            results.append(False)

    # Summary
    print("\n" + "=" * 80)
    print("  TEST SUMMARY")
    print("=" * 80)

    passed = sum(results)
    total = len(results)

    print(f"\n[OK] Tests Passed: {passed}/{total}")
    print(f"[FAIL] Tests Failed: {total - passed}/{total}")

    if passed == total:
        print("\n[SUCCESS] Email service is properly configured!")
        print("\nFeatures now available:")
        print("  [OK] Password reset emails")
        print("  [OK] Welcome emails")
        print("  [OK] Workout reminders")
        print("  [OK] Check-in notifications")
        print("  [OK] Progress updates")
        return 0
    elif passed >= 2:
        print("\n[WARNING] Email service partially configured")
        print("\nTo fully enable email features:")
        print("  1. Update .env with real SMTP credentials")
        print("  2. See .env.example for configuration instructions")
        print("  3. Run this script again to test")
        return 0
    else:
        print("\n[FAIL] Email service not configured properly")
        print("\nPlease check the errors above and:")
        print("  1. Review .env.example for setup instructions")
        print("  2. Configure your SMTP credentials in .env")
        print("  3. Run this script again")
        return 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n[CANCELLED] Test interrupted by user")
        sys.exit(1)
