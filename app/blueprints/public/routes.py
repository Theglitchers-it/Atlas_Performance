from flask import render_template, redirect, url_for
from flask_login import current_user
from app.blueprints.public import public_bp


@public_bp.route('/')
def index():
    """Landing page"""
    if current_user.is_authenticated:
        # Redirect logged-in users to their dashboard
        if current_user.is_super_admin():
            return redirect(url_for('super_admin.dashboard'))
        elif current_user.is_trainer():
            return redirect(url_for('trainer.dashboard'))
        elif current_user.is_athlete():
            return redirect(url_for('athlete.dashboard'))

    return render_template('public/index.html')


@public_bp.route('/pricing')
def pricing():
    """Pricing page"""
    pricing_tiers = [
        {
            'name': 'Starter',
            'price': 29,
            'features': [
                'Up to 10 athletes',
                '5GB video storage',
                'Workout builder',
                'Progress tracking',
                'In-app messaging',
                'Email support'
            ]
        },
        {
            'name': 'Pro',
            'price': 49,
            'features': [
                'Up to 50 athletes',
                '20GB video storage',
                'Advanced analytics',
                'Nutrition tracking',
                'Form check videos',
                'QR code gym equipment',
                'Priority support',
                'Custom branding'
            ],
            'popular': True
        },
        {
            'name': 'Enterprise',
            'price': 99,
            'features': [
                'Unlimited athletes',
                '100GB video storage',
                'Multi-trainer support',
                'API access',
                'White-label solution',
                'Dedicated account manager',
                'Custom integrations'
            ]
        }
    ]

    return render_template('public/pricing.html', pricing_tiers=pricing_tiers)


@public_bp.route('/features')
def features():
    """Features page"""
    return render_template('public/features.html')


@public_bp.route('/about')
def about():
    """About page"""
    return render_template('public/about.html')


@public_bp.route('/contact')
def contact():
    """Contact page"""
    return render_template('public/contact.html')
