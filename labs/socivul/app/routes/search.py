import jwt
from flask import Blueprint, request, render_template, redirect, url_for
from app.database import get_db
from app.config import Config

search_bp = Blueprint('search', __name__)

def get_current_user(req):
    token = req.cookies.get('token')
    if not token:
        return None
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE id = ?', [payload['user_id']]).fetchone()
        conn.close()
        return user
    except Exception:
        return None

@search_bp.route('/search')
def search():
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    search_term = request.args.get('q', '')
    results = []
    post_results = []

    if search_term:
        conn = get_db()
        query = "SELECT * FROM users WHERE username LIKE '%" + search_term + "%'"
        results = conn.execute(query).fetchall()

        post_query = "SELECT p.*, u.username, u.profile_pic FROM posts p JOIN users u ON p.user_id = u.id WHERE p.caption LIKE '%" + search_term + "%'"
        post_results = conn.execute(post_query).fetchall()
        conn.close()

    return render_template('search.html', user=user, q=search_term, results=results, post_results=post_results)
