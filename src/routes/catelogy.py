from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.product import Product, Category
from src.models.inventory import Inventory

category_bp = Blueprint('categories', __name__)

def admin_required(f):
    """Decorator to require admin access"""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Category routes
@category_bp.route('/categories', methods=['GET'])
@login_required
def get_categories():
    """Get all categories"""
    categories = Category.query.all()
    return jsonify([category.to_dict() for category in categories]), 200

@category_bp.route('/categories', methods=['POST'])
@login_required
@admin_required
def create_category():
    """Create new category"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Category name required'}), 400
    
    # Check if category already exists
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Category already exists'}), 400
    
    category = Category(name=data['name'])
    db.session.add(category)
    db.session.commit()
    
    return jsonify({
        'message': 'Category created successfully',
        'category': category.to_dict()
    }), 201
