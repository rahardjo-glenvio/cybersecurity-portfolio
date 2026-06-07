import hashlib
import time
import jwt
from collections import defaultdict
from flask import Blueprint, request, render_template, redirect, url_for, make_response, flash
from app.database import query_db, execute_db, reset_session
from app.config import Config

auth_bp = Blueprint('auth', __name__)

# In-memory rate limiter: {ip: [timestamp, ...]}
_reg_timestamps = defaultdict(list)
_REG_MAX   = 3     # max registrations per window
_REG_WIN   = 3600  # window in seconds (1 hour)

def _reg_allowed(ip):
    now = time.time()
    _reg_timestamps[ip] = [t for t in _reg_timestamps[ip] if now - t < _REG_WIN]
    if len(_reg_timestamps[ip]) >= _REG_MAX:
        return False, int(_REG_WIN - (now - _reg_timestamps[ip][0]))
    _reg_timestamps[ip].append(now)
    return True, 0

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

def get_current_user(request):
    token = request.cookies.get('token')
    if not token:
        return None
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        user = query_db('SELECT * FROM users WHERE id = ?', [payload['user_id']], one=True)
        return user
    except Exception:
        return None

@auth_bp.route('/')
def index():
    user = get_current_user(request)
    if user:
        return redirect(url_for('feed.feed_home'))
    return redirect(url_for('auth.login'))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # <!-- dev credentials: admin / admin123 -->
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        pw_hash = hash_password(password)

        user = query_db(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, pw_hash],
            one=True
        )

        if user:
            payload = {
                'user_id': user['id'],
                'username': user['username'],
                'role': user['role']
            }
            token = jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')
            resp = make_response(redirect(url_for('feed.feed_home')))
            resp.set_cookie('token', token)
            return resp
        else:
            error = 'Invalid username or password.'

    return render_template('auth/login.html', error=error)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        ip = request.headers.get('X-Forwarded-For', request.remote_addr).split(',')[0].strip()
        allowed, wait_secs = _reg_allowed(ip)
        if not allowed:
            mins = (wait_secs + 59) // 60
            error = f'Too many registrations. Please wait {mins} minute{"s" if mins != 1 else ""} and try again.'
            return render_template('auth/register.html', error=error)

        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        if not username or not email or not password:
            error = 'All fields are required.'
        else:
            existing = query_db('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], one=True)
            if existing:
                error = 'Username or email already taken.'
            else:
                pw_hash = hash_password(password)
                execute_db(
                    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                    [username, email, pw_hash]
                )
                return redirect(url_for('auth.login'))

    return render_template('auth/register.html', error=error)

@auth_bp.route('/logout')
def logout():
    resp = make_response(redirect(url_for('auth.login')))
    resp.delete_cookie('token')
    return resp

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    message = None
    token_val = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        user = query_db('SELECT * FROM users WHERE username = ?', [username], one=True)
        if user:
            reset_token = hashlib.md5((username + 'reset').encode()).hexdigest()
            execute_db('UPDATE users SET reset_token = ? WHERE username = ?', [reset_token, username])
            token_val = reset_token
            message = f'Password reset link generated. Use token: {reset_token}'
        else:
            message = 'If that username exists, a reset token has been sent.'

    return render_template('auth/forgot_password.html', message=message, token_val=token_val)

@auth_bp.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    message = None
    if request.method == 'POST':
        token_val = request.form.get('token', '').strip()
        new_password = request.form.get('password', '')
        user = query_db('SELECT * FROM users WHERE reset_token = ?', [token_val], one=True)
        if user:
            pw_hash = hash_password(new_password)
            execute_db('UPDATE users SET password = ?, reset_token = NULL WHERE id = ?', [pw_hash, user['id']])
            message = 'Password updated successfully. You can now log in.'
        else:
            message = 'Invalid or expired token.'

    token_param = request.args.get('token', '')
    return render_template('auth/reset_password.html', message=message, token_param=token_param)

@auth_bp.route('/reset-lab', methods=['GET', 'POST'])
def reset_lab():
    session_id = request.cookies.get('lab_session')
    if session_id:
        reset_session(session_id)
    resp = make_response(redirect(url_for('auth.login')))
    resp.delete_cookie('token')
    return resp

@auth_bp.route('/robots.txt')
def robots():
    content = (
        "User-agent: *\n"
        "Disallow: /admin\n"
        "Disallow: /api/\n"
        "Disallow: /reset-password\n"
        "Disallow: /static/logs/\n"
    )
    return content, 200, {'Content-Type': 'text/plain'}
