from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.product import Product, Category
from src.models.inventory import Inventory

products_bp = Blueprint('products', __name__)

def admin_required(f):
    """Decorator to require admin access"""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# # Category routes
# @products_bp.route('/categories', methods=['GET'])
# @login_required
# def get_categories():
#     """Get all categories"""
#     categories = Category.query.all()
#     return jsonify([category.to_dict() for category in categories]), 200

# @products_bp.route('/categories', methods=['POST'])
# @login_required
# @admin_required
# def create_category():
#     """Create new category"""
#     data = request.get_json()
    
#     if not data or not data.get('name'):
#         return jsonify({'error': 'Category name required'}), 400
    
#     # Check if category already exists
#     if Category.query.filter_by(name=data['name']).first():
#         return jsonify({'error': 'Category already exists'}), 400
    
#     category = Category(name=data['name'])
#     db.session.add(category)
#     db.session.commit()
    
#     return jsonify({
#         'message': 'Category created successfully',
#         'category': category.to_dict()
#     }), 201

# Product routes
@products_bp.route('/products', methods=['GET'])
@login_required
def get_products():
    """Get all products with optional filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    category_id = request.args.get('category_id', type=int)
    low_stock = request.args.get('low_stock', type=bool)
    
    query = Product.query
    
    # Apply filters
    if search:
        query = query.filter(Product.name.contains(search) | Product.sku.contains(search))
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    products = query.paginate(page=page, per_page=per_page, error_out=False)
    
    result = []
    for product in products.items:
        product_dict = product.to_dict()
        if low_stock and not product.is_low_stock():
            continue
        result.append(product_dict)
    
    return jsonify({
        'products': result,
        'total': products.total,
        'pages': products.pages,
        'current_page': page
    }), 200

@products_bp.route('/products/<int:product_id>', methods=['GET'])
@login_required
def get_product(product_id):
    """Get specific product"""
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict()), 200

@products_bp.route('/products', methods=['POST'])
@login_required
@admin_required
def create_product():
    """Create new product"""
    data = request.get_json()
    
    required_fields = ['name', 'category_id', 'sku', 'price']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Name, category_id, sku, and price are required'}), 400
    
    # Check if product already exists
    if Product.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Product name already exists'}), 400
    
    if Product.query.filter_by(sku=data['sku']).first():
        return jsonify({'error': 'SKU already exists'}), 400
    
    # Verify category exists
    if not Category.query.get(data['category_id']):
        return jsonify({'error': 'Category not found'}), 400
    
    product = Product(
        name=data['name'],
        description=data.get('description', ''),
        category_id=data['category_id'],
        sku=data['sku'],
        price=float(data['price']),
        weight_volume=data.get('weight_volume', ''),
        reorder_point=data.get('reorder_point', 10),
        image_url=data.get('image_url', '')
    )
    
    db.session.add(product)
    db.session.commit()
    
    return jsonify({
        'message': 'Product created successfully',
        'product': product.to_dict()
    }), 201

@products_bp.route('/products/<int:product_id>', methods=['PUT'])
@login_required
@admin_required
def update_product(product_id):
    """Update existing product"""
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Check for duplicate name/sku if being changed
    if 'name' in data and data['name'] != product.name:
        if Product.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Product name already exists'}), 400
        product.name = data['name']
    
    if 'sku' in data and data['sku'] != product.sku:
        if Product.query.filter_by(sku=data['sku']).first():
            return jsonify({'error': 'SKU already exists'}), 400
        product.sku = data['sku']
    
    # Update other fields
    if 'description' in data:
        product.description = data['description']
    if 'category_id' in data:
        if not Category.query.get(data['category_id']):
            return jsonify({'error': 'Category not found'}), 400
        product.category_id = data['category_id']
    if 'price' in data:
        product.price = float(data['price'])
    if 'weight_volume' in data:
        product.weight_volume = data['weight_volume']
    if 'reorder_point' in data:
        product.reorder_point = int(data['reorder_point'])
    if 'image_url' in data:
        product.image_url = data['image_url']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Product updated successfully',
        'product': product.to_dict()
    }), 200

@products_bp.route('/products/<int:product_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_product(product_id):
    """Delete product"""
    product = Product.query.get_or_404(product_id)
    
    # Check if product has inventory
    if product.inventory_items:
        return jsonify({'error': 'Cannot delete product with existing inventory'}), 400
    
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({'message': 'Product deleted successfully'}), 200

@products_bp.route('/products/low-stock', methods=['GET'])
@login_required
def get_low_stock_products():
    """Get products with low stock"""
    products = Product.query.all()
    low_stock_products = [product.to_dict() for product in products if product.is_low_stock()]
    
    return jsonify(low_stock_products), 200

