"""
RoomPilot - Flagship Smart Room-Booking & Scheduling Application
DEBUG//LAB DSA Challenge
"""

import os
from flask import Flask
from database import init_db
from routes.api import api_bp
from routes.views import views_bp

def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "roompilot-dev-secret-key-2026")
    
    # Initialize SQLite database with seed data
    init_db()

    # Register Blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(api_bp)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
