from flask import Flask, render_template, request, redirect, url_for, session, flash
from database import db, User, Transaction
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'vulnerable_secret_key_12345'  # Weak secret key
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///securebank.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()
    # Create admin user if not exists
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(username='admin', password='admin123', email='admin@securebank.com', balance=1000000.0, is_admin=True)
        db.session.add(admin)
        db.session.commit()

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
        flash('Please login first!', 'warning')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        to_username = request.form.get('to_username')
        amount = request.form.get('amount')
        description = request.form.get('description', 'Transfer')
        
        # VULNERABILITY: SQL Injection in transfer query
        query = f"SELECT * FROM user WHERE username = '{to_username}'"
        recipient = db.session.execute(db.text(query)).first()
        
        if not recipient:
            flash('Recipient not found!', 'danger')
            return redirect(url_for('transfer'))
        
        sender = User.query.get(session['user_id'])
        recipient_user = User.query.get(recipient[0])
        
        # VULNERABILITY: No balance check!
        # VULNERABILITY: No amount validation (bisa negative!)
        transfer_amount = float(amount)
        
        sender.balance -= transfer_amount
        recipient_user.balance += transfer_amount
        
        # Log transaction (vulnerable - no validation)
        transaction = Transaction(
            sender_id=sender.id,
            recipient_id=recipient_user.id,
            amount=transfer_amount,
            description=description
        )
        db.session.add(transaction)
        db.session.commit()
        
        flash(f'Successfully transferred ${transfer_amount} to {to_username}!', 'success')
        return redirect(url_for('dashboard'))
    
    # Get all users for selection
    users = User.query.filter(User.id != session['user_id']).all()
    return render_template('transfer.html', users=users)

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

if __name__ == '__main__':
    # Only bind to localhost - not accessible from outside
    app.run(host='127.0.0.1', port=5000, debug=True)