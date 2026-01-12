# 📧 EMAIL SETUP GUIDE - Atlas Performance

## Executive Summary

Email service is **REQUIRED** for the following features:
- ✉️ Password reset emails
- 👋 Welcome emails for new users
- 📅 Workout reminders
- 📊 Check-in notifications
- 📈 Progress update emails
- 🔔 Push notifications fallback (email)

**Current Status:** Email service code is implemented but **NOT CONFIGURED**.

---

## 🚨 WHY THIS IS CRITICAL

### Features Currently NOT Working:
- ❌ **Password Reset** - Users cannot reset forgotten passwords
- ❌ **Welcome Emails** - New users don't receive onboarding emails
- ❌ **Workout Reminders** - Athletes miss scheduled workouts
- ❌ **Check-in Notifications** - Trainers don't get reminders
- ❌ **Progress Updates** - Automated progress emails not sent
- ❌ **Push Notifications Fallback** - Email fallback for push notifications disabled

### Impact:
- **User Experience**: Poor onboarding, no password recovery
- **Engagement**: No reminders = missed workouts = lower retention
- **Support Load**: More support requests for password resets
- **Revenue**: Lower engagement = higher churn rate

---

## ⚡ QUICK START (Choose One Option)

### Option 1: Gmail (Recommended for Development/Testing)

**Best for:** Development, small-scale deployments, testing

**Limits:** 500 emails/day (Gmail free tier)

**Steps:**

1. **Enable 2-Factor Authentication on your Gmail account**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create an App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device, name it "Atlas Performance"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Update `.env` file:**
   ```bash
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USE_SSL=False
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=abcdefghijklmnop  # The 16-char app password (no spaces!)
   MAIL_DEFAULT_SENDER=your_email@gmail.com
   ```

4. **Test the configuration:**
   ```bash
   python scripts/test_email.py
   ```

**✅ Pros:**
- Free
- Easy to set up
- Works immediately
- Good for development

**❌ Cons:**
- 500 emails/day limit
- Gmail branding in email headers
- May be flagged as spam for bulk emails
- Not recommended for production

---

### Option 2: SendGrid (Recommended for Production)

**Best for:** Production deployments, high-volume email

**Limits:** 100 emails/day (free tier), paid plans available

**Steps:**

1. **Sign up for SendGrid**
   - Go to https://sendgrid.com
   - Create a free account (100 emails/day)
   - For production, consider paid plan (starts at $19.95/month for 50,000 emails)

2. **Create an API Key**
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Name: "Atlas Performance"
   - Permissions: Select "Restricted Access"
   - Enable: "Mail Send" (Full Access)
   - Copy the API key (save it immediately - you won't see it again!)

3. **Verify Sender Identity**
   - Go to Settings > Sender Authentication
   - Choose "Single Sender Verification" (free) or "Domain Authentication" (better)
   - For Single Sender: Verify your email address
   - For Domain: Add DNS records to your domain

4. **Update `.env` file:**
   ```bash
   MAIL_SERVER=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USE_SSL=False
   MAIL_USERNAME=apikey  # Literally the word "apikey"
   MAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your API key
   MAIL_DEFAULT_SENDER=noreply@yourdomain.com  # Must match verified sender
   ```

5. **Test the configuration:**
   ```bash
   python scripts/test_email.py
   ```

**✅ Pros:**
- Professional email service
- High deliverability
- Detailed analytics
- Scalable (millions of emails)
- Custom domain support
- Advanced features (templates, webhooks)

**❌ Cons:**
- Free tier limited to 100 emails/day
- Requires account setup
- Requires domain verification for best deliverability

---

### Option 3: Other SMTP Providers

#### Office 365 / Outlook.com

```bash
MAIL_SERVER=smtp.office365.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your_email@outlook.com
MAIL_PASSWORD=your_password
MAIL_DEFAULT_SENDER=your_email@outlook.com
```

#### Mailgun

```bash
MAIL_SERVER=smtp.mailgun.org
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=postmaster@yourdomain.mailgun.org
MAIL_PASSWORD=your_mailgun_smtp_password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

#### AWS SES (Simple Email Service)

```bash
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your_aws_smtp_username
MAIL_PASSWORD=your_aws_smtp_password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

**Note:** AWS SES requires domain verification and may start in "sandbox mode"

---

## 🧪 TESTING YOUR CONFIGURATION

### Step 1: Run the Test Script

```bash
python scripts/test_email.py
```

**Expected Output (Success):**
```
================================================================================
  ATLAS PERFORMANCE - EMAIL SERVICE TEST
================================================================================

[TEST 1] Checking email configuration...
  MAIL_SERVER: smtp.gmail.com
  MAIL_PORT: 587
  MAIL_USE_TLS: True
  MAIL_USERNAME: **********
  MAIL_PASSWORD: **********
  [OK] Email configuration present

[TEST 2] Testing EmailService import...
  [OK] EmailService imported successfully
  [OK] All required methods present

[TEST 3] Sending test email...
  About to send test email to: your_email@gmail.com
  Send test email? (y/n): y

  Sending test email...
  [OK] Test email sent successfully!
  Check your inbox: your_email@gmail.com

================================================================================
  TEST SUMMARY
================================================================================

[OK] Tests Passed: 3/3

[SUCCESS] Email service is properly configured!
```

### Step 2: Check Your Inbox

- Check the inbox of the email you configured
- Look for email with subject: "Atlas Performance - Test Email"
- If not in inbox, check spam/junk folder
- Email should arrive within 1-2 minutes

### Step 3: Verify Email Content

The test email should show:
- SMTP server used
- Port and TLS settings
- List of features now available

---

## 🔧 TROUBLESHOOTING

### Problem: "MAIL_USERNAME: NOT CONFIGURED"

**Solution:**
- You haven't updated `.env` file yet
- Copy `.env.example` to `.env` and update email settings
- Make sure to remove placeholder values like `your_email@gmail.com`

---

### Problem: "Authentication failed"

**Gmail Specific:**
- ❌ **Don't use** your regular Gmail password
- ✅ **Do use** an App Password (16 characters, no spaces)
- Make sure 2-Factor Authentication is enabled first
- App Password format: `abcdefghijklmnop` (all lowercase, no spaces)

**SendGrid Specific:**
- Username MUST be exactly `apikey` (not your email)
- Password is the API Key (starts with `SG.`)
- API Key needs "Mail Send" permission

**General:**
- Check username and password have no extra spaces
- Check credentials are correct (try logging in to provider's website)

---

### Problem: "Connection refused" or "Timeout"

**Solution:**
- Check your firewall isn't blocking port 587
- Try port 465 with `MAIL_USE_SSL=True` instead
- Check if your network/ISP blocks SMTP
- Try from a different network

---

### Problem: "Email sent but not received"

**Solution:**
1. **Check Spam Folder** - Most common issue
2. **Check Sender Verification:**
   - Gmail: Use same email for USERNAME and DEFAULT_SENDER
   - SendGrid: DEFAULT_SENDER must match verified sender
3. **Wait 5 minutes** - Some providers have delays
4. **Check Provider Dashboard:**
   - SendGrid: Check Activity Feed for delivery status
   - Check for bounce/spam reports

---

### Problem: "SSL/TLS errors"

**Solution:**
- For Gmail: Use `MAIL_USE_TLS=True` and `MAIL_USE_SSL=False`
- For port 465: Use `MAIL_USE_TLS=False` and `MAIL_USE_SSL=True`
- For port 587: Use `MAIL_USE_TLS=True` and `MAIL_USE_SSL=False`

---

## 📋 PRODUCTION CHECKLIST

Before deploying to production:

- [ ] Email service configured and tested
- [ ] Using production-ready provider (SendGrid, AWS SES, etc.)
- [ ] Domain verified (for better deliverability)
- [ ] SPF, DKIM, DMARC records configured (reduces spam)
- [ ] `MAIL_DEFAULT_SENDER` uses your domain (not Gmail)
- [ ] Tested password reset flow
- [ ] Tested welcome email
- [ ] Tested all notification types
- [ ] Monitoring/logging enabled for failed emails
- [ ] Rate limits understood and sufficient
- [ ] Email templates reviewed and branded

---

## 🎯 RECOMMENDED SETUP BY ENVIRONMENT

### Development / Testing
**Recommended:** Gmail with App Password
- **Why:** Free, easy, immediate
- **Setup Time:** 5 minutes
- **Cost:** Free
- **Limit:** 500 emails/day (sufficient for dev)

### Staging
**Recommended:** SendGrid Free Tier
- **Why:** Production-like, good testing
- **Setup Time:** 15 minutes
- **Cost:** Free
- **Limit:** 100 emails/day

### Production (Small Scale)
**Recommended:** SendGrid Essentials ($19.95/month)
- **Why:** Professional, reliable, analytics
- **Setup Time:** 30 minutes (including domain verification)
- **Cost:** $19.95/month for 50,000 emails
- **Limit:** 50,000 emails/month

### Production (Large Scale)
**Recommended:** SendGrid Pro ($89.95/month) or AWS SES
- **Why:** High volume, advanced features
- **Setup Time:** 1-2 hours
- **Cost:** $89.95/month or pay-per-email (AWS SES)
- **Limit:** 1.5M emails/month (SendGrid) or unlimited (AWS SES)

---

## 📚 EMAIL FEATURES DOCUMENTATION

### Password Reset Emails

**Trigger:** User clicks "Forgot Password"

**Implementation:** `app/services/email_service.py` - `send_password_reset_email()`

**Template:** Plain text + HTML

**Test:** Try password reset flow on login page

---

### Welcome Emails

**Trigger:** New user registration

**Implementation:** `app/services/email_service.py` - `send_welcome_email()`

**Sent When:** User account created by trainer or self-registration

**Test:** Create a new user account

---

### Workout Reminders

**Trigger:** Scheduled workout approaching

**Implementation:** `app/services/notification_service.py`

**Fallback:** Email sent if push notifications disabled

**Test:** Schedule a workout and wait for reminder time

---

### Check-in Notifications

**Trigger:** Athlete completes check-in

**Implementation:** `app/services/notification_service.py`

**Recipient:** Trainer receives notification

**Test:** Athlete submits weekly check-in

---

## 🔐 SECURITY BEST PRACTICES

1. **Never commit `.env` to git** - Already in `.gitignore`
2. **Use App Passwords for Gmail** - Not your main password
3. **Rotate API keys regularly** - Every 90 days recommended
4. **Restrict API key permissions** - Only "Mail Send" needed
5. **Use environment variables** - Never hardcode credentials
6. **Monitor email logs** - Watch for suspicious activity
7. **Enable 2FA on email provider** - Extra security layer

---

## 📞 SUPPORT

### Gmail Issues
- Help: https://support.google.com/accounts/answer/185833
- App Passwords: https://myaccount.google.com/apppasswords

### SendGrid Issues
- Docs: https://docs.sendgrid.com
- Support: https://support.sendgrid.com
- Status: https://status.sendgrid.com

### Atlas Performance Issues
- Check logs: `tail -f logs/app.log`
- Run test: `python scripts/test_email.py`
- Review code: `app/services/email_service.py`

---

## ✅ VERIFICATION COMPLETE

Once configured, verify the following work:

```bash
# 1. Run test script
python scripts/test_email.py

# 2. Test in browser
#    - Go to login page
#    - Click "Forgot Password"
#    - Enter your email
#    - Check inbox for reset email

# 3. Test welcome email
#    - Create a new user (as trainer)
#    - Check new user's inbox for welcome email

# 4. Check logs
#    - Review app logs for email sending confirmation
#    - No errors should appear
```

---

## 🎉 CONCLUSION

**Status after configuration:**
- ✅ Password reset functional
- ✅ Welcome emails sent
- ✅ Workout reminders working
- ✅ Check-in notifications active
- ✅ Progress updates automated
- ✅ Email fallback for push notifications enabled

**The application is now PRODUCTION-READY for email features!** 🚀
