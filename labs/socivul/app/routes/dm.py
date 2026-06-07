import jwt
from flask import Blueprint, request, render_template, redirect, url_for
from app.database import query_db, execute_db, get_db
from app.config import Config

dm_bp = Blueprint('dm', __name__)

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

@dm_bp.route('/messages')
def inbox():
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    conn = get_db()
    threads = conn.execute("""
        SELECT DISTINCT
            CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_id,
            u.username, u.profile_pic,
            (SELECT content FROM messages
             WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM messages
             WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1) as last_time,
            (SELECT COUNT(*) FROM messages
             WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
        FROM messages m
        JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY other_id
        ORDER BY last_time DESC
    """, [user['id']] * 9).fetchall()
    conn.close()

    return render_template('dm/inbox.html', user=user, threads=threads)

@dm_bp.route('/messages/<int:other_id>', methods=['GET', 'POST'])
def thread(other_id):
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    other = query_db('SELECT * FROM users WHERE id = ?', [other_id], one=True)
    if not other:
        return redirect(url_for('dm.inbox'))

    if request.method == 'POST':
        content = request.form.get('content', '').strip()
        if content:
            execute_db(
                'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                [user['id'], other_id, content]
            )
        return redirect(url_for('dm.thread', other_id=other_id))

    messages = query_db("""
        SELECT m.*, u.username, u.profile_pic
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
    """, [user['id'], other_id, other_id, user['id']])

    execute_db(
        'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
        [other_id, user['id']]
    )

    return render_template('dm/thread.html', user=user, other=other, messages=messages)

@dm_bp.route('/messages/new/<username>')
def new_dm(username):
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    other = query_db('SELECT * FROM users WHERE username = ?', [username], one=True)
    if not other:
        return redirect(url_for('dm.inbox'))

    return redirect(url_for('dm.thread', other_id=other['id']))
