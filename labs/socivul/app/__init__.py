import os
import uuid
import shutil
from flask import Flask, request, g
from app.config import Config
from app.database import init_db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(Config.SESSIONS_DIR, exist_ok=True)
    init_db()

    @app.before_request
    def assign_lab_session():
        if not request.cookies.get('lab_session'):
            g.new_session_id = str(uuid.uuid4())
        else:
            g.new_session_id = None

    @app.after_request
    def set_lab_session_cookie(response):
        new_sid = getattr(g, 'new_session_id', None)
        if new_sid:
            db_path = os.path.join(Config.SESSIONS_DIR, f'{new_sid}.db')
            if os.path.exists(Config.TEMPLATE_DB):
                shutil.copy2(Config.TEMPLATE_DB, db_path)
            response.set_cookie(
                'lab_session', new_sid,
                max_age=86400 * 7,
                httponly=True,
                samesite='Lax'
            )
        return response

    from app.routes.auth import auth_bp
    from app.routes.feed import feed_bp
    from app.routes.profile import profile_bp
    from app.routes.search import search_bp
    from app.routes.dm import dm_bp
    from app.routes.api import api_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(feed_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(dm_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(admin_bp)

    return app
