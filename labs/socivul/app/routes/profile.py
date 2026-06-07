import os
import jwt
import requests
from flask import Blueprint, request, render_template, redirect, url_for, jsonify
from app.database import query_db, execute_db
from app.config import Config

profile_bp = Blueprint('profile', __name__)

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

@profile_bp.route('/profile/<username>')
def view_profile(username):
    user = get_current_user(request)
    if not user:
        return redirect(url_for('auth.login'))

    profile = query_db('SELECT * FROM users WHERE username = ?', [username], one=True)
    if not profile:
        return redirect(url_for('feed.feed_home'))

    posts = query_db(
        'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
        [profile['id']]
    )

    followers_count = query_db(
        'SELECT COUNT(*) as cnt FROM follows WHERE following_id = ?',
        [profile['id']], one=True
    )
    following_count = query_db(
        'SELECT COUNT(*) as cnt FROM follows WHERE follower_id = ?',
        [profile['id']], one=True
    )
    is_following = query_db(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [user['id'], profile['id']], one=True
    )

    return render_template(
        'profile/view.html',
        user=user,
        profile=profile,
        posts=posts,
        followers=followers_count['cnt'] if followers_count else 0,
        following=following_count['cnt'] if following_count else 0,
        is_following=is_following
    )

@profile_bp.route('/profile/<int:user_id>/edit', methods=['GET', 'POST'])
def edit_profile(user_id):
    current_user = get_current_user(request)
    if not current_user:
        return redirect(url_for('auth.login'))

    profile = query_db('SELECT * FROM users WHERE id = ?', [user_id], one=True)
    if not profile:
        return redirect(url_for('feed.feed_home'))

    if request.method == 'POST':
        bio = request.form.get('bio', '')
        website = request.form.get('website', '')
        email = request.form.get('email', '')

        file = request.files.get('profile_pic')
        if file and file.filename:
            filename = file.filename
            save_path = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(save_path)
            execute_db(
                'UPDATE users SET bio = ?, website = ?, email = ?, profile_pic = ? WHERE id = ?',
                [bio, website, email, filename, user_id]
            )
        else:
            execute_db(
                'UPDATE users SET bio = ?, website = ?, email = ? WHERE id = ?',
                [bio, website, email, user_id]
            )

        return redirect(url_for('profile.view_profile', username=profile['username']))

    return render_template('profile/edit.html', user=current_user, profile=profile)

@profile_bp.route('/api/preview')
def preview_url():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    try:
        response = requests.get(url, timeout=5)
        return jsonify({'preview': response.text[:500], 'status': response.status_code})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
