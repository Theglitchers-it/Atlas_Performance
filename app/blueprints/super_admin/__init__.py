from flask import Blueprint

super_admin_bp = Blueprint('super_admin', __name__, template_folder='templates')

from app.blueprints.super_admin import routes
