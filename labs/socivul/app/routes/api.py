import jwt
from flask import Blueprint, request, jsonify
from app.database import query_db, execute_db
from app.config import Config

api_bp = Blueprint('api', __name__, url_prefix='/api')

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

def row_to_dict(row):
    if row is None:
        return None
    return dict(row)

@api_bp.route('/user/<int:user_id>')
def get_user(user_id):
    user = query_db('SELECT * FROM users WHERE id = ?', [user_id], one=True)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(row_to_dict(user))

@api_bp.route('/users')
def list_users():
    users = query_db('SELECT * FROM users')
    return jsonify([row_to_dict(u) for u in users])

@api_bp.route('/posts')
def list_posts():
    posts = query_db("""
        SELECT p.*, u.username, u.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count
        FROM posts p JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
    """)
    return jsonify([row_to_dict(p) for p in posts])

@api_bp.route('/posts/<int:post_id>')
def get_post(post_id):
    post = query_db('SELECT * FROM posts WHERE id = ?', [post_id], one=True)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    return jsonify(row_to_dict(post))

@api_bp.route('/posts/<int:post_id>/delete', methods=['POST', 'DELETE'])
def delete_post(post_id):
    current_user = get_current_user(request)
    if not current_user:
        return jsonify({'error': 'Not authenticated'}), 401

    post = query_db('SELECT * FROM posts WHERE id = ?', [post_id], one=True)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    execute_db('DELETE FROM comments WHERE post_id = ?', [post_id])
    execute_db('DELETE FROM likes WHERE post_id = ?', [post_id])
    execute_db('DELETE FROM posts WHERE id = ?', [post_id])
    return jsonify({'success': True})

@api_bp.route('/messages/<int:message_id>')
def get_message(message_id):
    message = query_db('SELECT * FROM messages WHERE id = ?', [message_id], one=True)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    return jsonify(row_to_dict(message))

@api_bp.route('/messages', methods=['POST'])
def send_message():
    current_user = get_current_user(request)
    if not current_user:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json() or {}
    receiver_id = data.get('receiver_id')
    content = data.get('content', '')

    if not receiver_id or not content:
        return jsonify({'error': 'receiver_id and content required'}), 400

    msg_id = execute_db(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [current_user['id'], receiver_id, content]
    )
    return jsonify({'success': True, 'message_id': msg_id})

@api_bp.route('/follow/<int:target_id>', methods=['POST'])
def api_follow(target_id):
    current_user = get_current_user(request)
    if not current_user:
        return jsonify({'error': 'Not authenticated'}), 401

    existing = query_db(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [current_user['id'], target_id], one=True
    )
    if existing:
        execute_db('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [current_user['id'], target_id])
        return jsonify({'following': False})
    else:
        execute_db('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [current_user['id'], target_id])
        return jsonify({'following': True})

@api_bp.route('/search')
def api_search():
    q = request.args.get('q', '')
    from app.database import get_db
    conn = get_db()
    users = conn.execute("SELECT id, username, profile_pic FROM users WHERE username LIKE '%" + q + "%'").fetchall()
    conn.close()
    return jsonify([row_to_dict(u) for u in users])

@api_bp.route('/me')
def api_me():
    current_user = get_current_user(request)
    if not current_user:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify(row_to_dict(current_user))
