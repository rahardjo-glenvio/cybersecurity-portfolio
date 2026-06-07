import jwt
from flask import Blueprint, request, render_template, redirect, url_for, jsonify
from app.database import query_db, execute_db, get_db
from app.config import Config

admin_bp = Blueprint('admin', __name__)

def get_current_user(req):
    token = req.cookies.get('token')
    if not token:
        return None
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        user = query_db('SELECT * FROM users WHERE id = ?', [payload['user_id']], one=True)
        return user
    except Exception:
        return None

@admin_bp.route('/admin/dashboard')
def admin_dashboard():
    token = request.cookies.get('token')
    if not token:
        return redirect('/login')

    users = query_db('SELECT * FROM users ORDER BY created_at DESC')
    posts = query_db('SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC')
    user_count = len(users)
    post_count = len(posts)

    current_user = get_current_user(request)

    return render_template(
        'admin/dashboard.html',
        user=current_user,
        users=users,
        posts=posts,
        user_count=user_count,
        post_count=post_count
    )

@admin_bp.route('/admin/users/<user_id>')
def admin_get_user(user_id):
    token = request.cookies.get('token')
    if not token:
        return redirect('/login')

    conn = get_db()
    query = "SELECT * FROM users WHERE id = " + user_id
    try:
        user_data = conn.execute(query).fetchone()
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 400
    conn.close()

    if not user_data:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(dict(user_data))

@admin_bp.route('/admin/users/<int:user_id>/delete', methods=['POST'])
def admin_delete_user(user_id):
    token = request.cookies.get('token')
    if not token:
        return redirect('/login')

    execute_db('DELETE FROM users WHERE id = ?', [user_id])
    return redirect(url_for('admin.admin_dashboard'))

@admin_bp.route('/admin/users/<int:user_id>/promote', methods=['POST'])
def admin_promote_user(user_id):
    token = request.cookies.get('token')
    if not token:
        return redirect('/login')

    execute_db("UPDATE users SET role = 'admin' WHERE id = ?", [user_id])
    return redirect(url_for('admin.admin_dashboard'))

@admin_bp.route('/admin/posts/<int:post_id>/delete', methods=['POST'])
def admin_delete_post(post_id):
    token = request.cookies.get('token')
    if not token:
        return redirect('/login')

    execute_db('DELETE FROM comments WHERE post_id = ?', [post_id])
    execute_db('DELETE FROM likes WHERE post_id = ?', [post_id])
    execute_db('DELETE FROM posts WHERE id = ?', [post_id])
    return redirect(url_for('admin.admin_dashboard'))
