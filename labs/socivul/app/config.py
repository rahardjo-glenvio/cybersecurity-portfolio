import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Config:
    SECRET_KEY = "secret"
    JWT_SECRET = "secret"
    TEMPLATE_DB  = os.path.join(BASE_DIR, 'socivul_template.db')
    SESSIONS_DIR = os.path.join(BASE_DIR, 'sessions')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
    DEBUG = True
    TESTING = False
