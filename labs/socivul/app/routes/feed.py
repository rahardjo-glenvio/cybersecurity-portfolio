import os
import re
import jwt
from flask import Blueprint, request, render_template, redirect, url_for, jsonify, flash
from app.database import query_db, execute_db, get_db
from app.config import Config

feed_bp = Blueprint('feed', __name__)

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

@feed_bp.route('/feed')
def feed_home():
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    conn = get_db()

    posts = conn.execute("""
        SELECT p.*, u.username, u.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY RANDOM()
        LIMIT 30
    """, [user['id']]).fetchall()

    # Preview comments (up to 2 per post, latest first)
    preview_comments = {}
    post_ids = [p['id'] for p in posts]
    if post_ids:
        placeholders = ','.join('?' * len(post_ids))
        raw_comments = conn.execute(
            f"SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id "
            f"WHERE c.post_id IN ({placeholders}) ORDER BY c.post_id, c.created_at DESC",
            post_ids
        ).fetchall()
        for c in raw_comments:
            pid = c['post_id']
            if pid not in preview_comments:
                preview_comments[pid] = []
            if len(preview_comments[pid]) < 2:
                preview_comments[pid].append(c)

    # Stories — users with recent posts (excluding self)
    stories = conn.execute("""
        SELECT DISTINCT u.id, u.username, u.profile_pic
        FROM users u JOIN posts p ON u.id = p.user_id
        WHERE u.id != ?
        ORDER BY p.created_at DESC LIMIT 8
    """, [user['id']]).fetchall()

    # Suggestions — users not yet followed
    suggestions = conn.execute("""
        SELECT u.id, u.username, u.profile_pic, u.bio
        FROM users u
        WHERE u.id != ?
          AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
        ORDER BY u.id LIMIT 5
    """, [user['id'], user['id']]).fetchall()

    conn.close()

    # Trending hashtags from recent post captions
    tag_counts = {}
    for post in posts:
        caption = post['caption'] or ''
        for tag in re.findall(r'#(\w+)', caption):
            key = tag.lower()
            tag_counts[key] = tag_counts.get(key, 0) + 1
    trending_tags = sorted(tag_counts.items(), key=lambda x: -x[1])[:6]

    notifications_count = query_db(
        'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0',
        [user['id']], one=True
    )
    unread = notifications_count['cnt'] if notifications_count else 0

    return render_template('feed/index.html', user=user, posts=posts, unread=unread,
                           preview_comments=preview_comments, stories=stories,
                           suggestions=suggestions, trending_tags=trending_tags)

@feed_bp.route('/post/<int:post_id>')
def view_post(post_id):
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    conn = get_db()
    post = conn.execute("""
        SELECT p.*, u.username, u.profile_pic,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
    """, [post_id]).fetchone()
    conn.close()

    if not post:
        return redirect(url_for('feed.feed_home'))

    comments = query_db("""
        SELECT c.*, u.username, u.profile_pic
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    """, [post_id])

    liked = query_db('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [post_id, user['id']], one=True)

    return render_template('feed/post.html', user=user, post=post, comments=comments, liked=liked)

@feed_bp.route('/post/new', methods=['GET', 'POST'])
def new_post():
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    if request.method == 'POST':
        caption = request.form.get('caption', '')
        file = request.files.get('image')

        if file and file.filename:
            filename = file.filename
            save_path = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(save_path)
            image_path = filename
        else:
            image_path = 'default_post.jpg'

        execute_db(
            'INSERT INTO posts (user_id, image_path, caption) VALUES (?, ?, ?)',
            [user['id'], image_path, caption]
        )
        return redirect(url_for('feed.feed_home'))

    return render_template('feed/new_post.html', user=user)

@feed_bp.route('/post/<int:post_id>/comment', methods=['POST'])
def add_comment(post_id):
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    content = request.form.get('content', '').strip()
    if content:
        execute_db(
            'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [post_id, user['id'], content]
        )

        post = query_db('SELECT * FROM posts WHERE id = ?', [post_id], one=True)
        if post and post['user_id'] != user['id']:
            execute_db(
                'INSERT INTO notifications (user_id, content) VALUES (?, ?)',
                [post['user_id'], f'<a href="/profile/{user["username"]}">@{user["username"]}</a> commented on your post.']
            )

    return redirect(url_for('feed.view_post', post_id=post_id))

@feed_bp.route('/post/<int:post_id>/like', methods=['POST'])
def like_post(post_id):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    user = get_current_user(request)
    if not user:
        if is_ajax:
            return jsonify({'error': 'unauthorized'}), 401
        return redirect(url_for('auth.login'))

    existing = query_db('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [post_id, user['id']], one=True)
    if existing:
        execute_db('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post_id, user['id']])
        liked = False
    else:
        execute_db('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [post_id, user['id']])
        liked = True
        post = query_db('SELECT * FROM posts WHERE id = ?', [post_id], one=True)
        if post and post['user_id'] != user['id']:
            execute_db(
                'INSERT INTO notifications (user_id, content) VALUES (?, ?)',
                [post['user_id'], f'<a href="/profile/{user["username"]}">@{user["username"]}</a> liked your post.']
            )

    if is_ajax:
        count_row = query_db('SELECT COUNT(*) as cnt FROM likes WHERE post_id = ?', [post_id], one=True)
        return jsonify({'liked': liked, 'count': count_row['cnt']})

    # fallback: non-AJAX (e.g. JS disabled)
    return redirect(request.referrer or url_for('feed.feed_home'))

@feed_bp.route('/follow/<int:target_id>', methods=['POST'])
def follow_user(target_id):
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    existing = query_db(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [user['id'], target_id], one=True
    )
    if existing:
        execute_db('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [user['id'], target_id])
    else:
        execute_db('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [user['id'], target_id])
        target = query_db('SELECT * FROM users WHERE id = ?', [target_id], one=True)
        if target:
            execute_db(
                'INSERT INTO notifications (user_id, content) VALUES (?, ?)',
                [target_id, f'<a href="/profile/{user["username"]}">@{user["username"]}</a> started following you.']
            )

    ref = request.referrer or url_for('feed.feed_home')
    return redirect(ref)

@feed_bp.route('/notifications')
def notifications():
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    notifs = query_db(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [user['id']]
    )
    execute_db('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user['id']])

    return render_template('notifications.html', user=user, notifications=notifs)
