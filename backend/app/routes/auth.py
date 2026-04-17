"""
Authentication routes
"""
from flask import Blueprint, request, jsonify, session
from datetime import datetime
from app import db
from app.models import User, UserProfile

bp = Blueprint('auth', __name__)


@bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate username length
        if len(username) < 3:
            return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({'success': False, 'error': 'Invalid email format'}), 400
        
        # Validate password length
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'error': 'Username already taken'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.flush()  # Get user ID before committing
        
        # Create user profile
        profile = UserProfile(
            user_id=user.id,
            full_name=data.get('fullName', ''),
            bio=data.get('bio', ''),
            location=data.get('location', '')
        )
        
        db.session.add(profile)
        db.session.commit()
        
        # Log user in
        session['user_id'] = user.id
        session['username'] = user.username
        session.permanent = True  # Remember session
        
        print(f"✅ New user registered: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': user.to_dict(include_email=True)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Registration error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is deactivated'}), 403
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['username'] = user.username
        session.permanent = True
        
        print(f"✅ User logged in: {user.username}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict(include_email=True)
        })
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    try:
        username = session.get('username', 'Unknown')
        session.clear()
        
        print(f"✅ User logged out: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        })
        
    except Exception as e:
        print(f"❌ Logout error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current logged-in user"""
    try:
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user = User.query.get(user_id)
        
        if not user:
            session.clear()
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict(include_email=True)
        })
        
    except Exception as e:
        print(f"❌ Get user error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    user_id = session.get('user_id')
    return jsonify({
        'success': True,
        'authenticated': user_id is not None,
        'userId': user_id
    })


@bp.route('/profile', methods=['PUT'])
def update_profile():
    """Update user profile"""
    try:
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update user info
        if 'username' in data and data['username'] != user.username:
            username = data['username'].strip()
            if len(username) < 3:
                return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
            if User.query.filter_by(username=username).first():
                return jsonify({'success': False, 'error': 'Username already taken'}), 400
            user.username = username
            session['username'] = username
        
        # Update profile
        if not user.profile:
            profile = UserProfile(user_id=user.id)
            db.session.add(profile)
        else:
            profile = user.profile
        
        if 'fullName' in data:
            profile.full_name = data['fullName']
        if 'bio' in data:
            profile.bio = data['bio']
        if 'location' in data:
            profile.location = data['location']
        if 'website' in data:
            profile.website = data['website']
        if 'avatarUrl' in data:
            profile.avatar_url = data['avatarUrl']
        
        db.session.commit()
        
        print(f"✅ Profile updated: {user.username}")
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user.to_dict(include_email=True)
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Update profile error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/change-password', methods=['POST'])
def change_password():
    """Change user password"""
    try:
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        
        if not data.get('currentPassword') or not data.get('newPassword'):
            return jsonify({'success': False, 'error': 'Current and new passwords are required'}), 400
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Verify current password
        if not user.check_password(data['currentPassword']):
            return jsonify({'success': False, 'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        if len(data['newPassword']) < 6:
            return jsonify({'success': False, 'error': 'New password must be at least 6 characters'}), 400
        
        # Set new password
        user.set_password(data['newPassword'])
        db.session.commit()
        
        print(f"✅ Password changed: {user.username}")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Change password error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
