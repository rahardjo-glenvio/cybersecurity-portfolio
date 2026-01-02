from flask import Flask, render_template, request, redirect, url_for, session, flash
from database import db, User, Transaction, SupportTicket
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'vulnerable_secret_key_12345'  # Weak secret key
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///securebank.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        
        # VULNERABILITY: SQL Injection in registration
        query = f"SELECT * FROM user WHERE username = '{username}'"
        existing_user = db.session.execute(db.text(query)).first()
        
        if existing_user:
            flash('Username already exists!', 'danger')
            return redirect(url_for('register'))
        
        new_user = User(username=username, password=password, email=email, balance=10000.0)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # VULNERABILITY: SQL Injection in login
        query = f"SELECT * FROM user WHERE username = '{username}' AND password = '{password}'"
        
        try:
            result = db.session.execute(db.text(query)).first()
            
            if result:
                session['user_id'] = result[0]
                session['username'] = result[1]
                session['is_admin'] = result[5]
                flash(f'Welcome back, {username}!', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid username or password!', 'danger')
        except Exception as e:
            flash(f'Database error: {str(e)}', 'danger')
    
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('Please login first!', 'warning')
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    return render_template('dashboard.html', user=user)

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/transfer', methods=['GET', 'POST'])
def transfer():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Get current user object
    user = User.query.get(session['user_id'])
    
    if request.method == 'POST':
        to_username = request.form['to_username']
        amount = float(request.form['amount'])
        description = request.form.get('description', '')
        
        # Get sender and recipient
        sender = User.query.get(session['user_id'])
        recipient = User.query.filter_by(username=to_username).first()
        
        if not recipient:
            flash('Recipient not found!', 'danger')
            return redirect(url_for('transfer'))
        
        if sender.balance < amount:
            flash('Insufficient balance!', 'danger')
            return redirect(url_for('transfer'))
        
        # Perform transfer
        sender.balance -= amount
        recipient.balance += amount
        
        # Create transaction record
        transaction = Transaction(
            sender_id=sender.id,
            recipient_id=recipient.id,
            amount=amount,
            description=description
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        # Update session balance
        session['balance'] = sender.balance
        
        flash(f'Successfully transferred ${amount:.2f} to {to_username}!', 'success')
        return redirect(url_for('dashboard'))
    
    # Get all users except current user
    users = User.query.filter(User.id != session['user_id']).all()
    
    return render_template('transfer.html', users=users, user=user)
    #                                                      ^^^^^^^^ ADD THIS!

@app.route('/transactions')
def transactions():
    if 'user_id' not in session:
        flash('Please login first!', 'warning')
        return redirect(url_for('login'))
    
    # VULNERABILITY: IDOR - bisa akses transaction orang lain dengan manipulasi URL
    user_id = request.args.get('user_id', session['user_id'])
    
    sent = Transaction.query.filter_by(sender_id=user_id).all()
    received = Transaction.query.filter_by(recipient_id=user_id).all()
    
    return render_template('transactions.html', sent=sent, received=received)

# Profile Settings Route
@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'change_password':
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')
            
            # Vulnerability: Plain text password comparison (intentional!)
            if user.password != current_password:
                flash('Current password is incorrect!', 'error')
            elif new_password != confirm_password:
                flash('New passwords do not match!', 'error')
            elif len(new_password) < 4:
                flash('Password must be at least 4 characters!', 'error')
            else:
                # Vulnerability: Store plain text password (intentional!)
                user.password = new_password
                db.session.commit()
                flash('Password changed successfully!', 'success')
        
        elif action == 'update_email':
            new_email = request.form.get('email')
            
            # Vulnerability: No email validation (intentional!)
            user.email = new_email
            db.session.commit()
            flash('Email updated successfully!', 'success')
    
    return render_template('profile.html', user=user)


# Support Route
@app.route('/support', methods=['GET', 'POST'])
def support():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Vulnerability: No input sanitization (XSS possible!)
        ticket = SupportTicket(
            user_id=session['user_id'],
            subject=subject,
            message=message
        )
        db.session.add(ticket)
        db.session.commit()
        
        flash('Support ticket submitted successfully!', 'success')
        return redirect(url_for('support'))
    
    # Get user's tickets
    tickets = SupportTicket.query.filter_by(
        user_id=session['user_id']
    ).order_by(SupportTicket.created_at.desc()).all()
    
    return render_template('support.html', tickets=tickets)


# View Support Ticket
@app.route('/ticket/<int:ticket_id>')
def view_ticket(ticket_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Vulnerability: IDOR - No authorization check! (intentional!)
    ticket = SupportTicket.query.get_or_404(ticket_id)
    
    return render_template('ticket_detail.html', ticket=ticket)

if __name__ == '__main__':
    # Only bind to localhost - not accessible from outside
    app.run(host='0.0.0.0', port=5000, debug=True)
