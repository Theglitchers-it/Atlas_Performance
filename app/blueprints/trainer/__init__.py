from flask import Blueprint

trainer_bp = Blueprint('trainer', __name__, template_folder='templates')

from app.blueprints.trainer import routes
