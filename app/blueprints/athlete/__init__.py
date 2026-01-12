from flask import Blueprint

athlete_bp = Blueprint('athlete', __name__, template_folder='templates')

from app.blueprints.athlete import routes
