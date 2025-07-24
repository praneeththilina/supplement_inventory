from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, date
from src.models.user import db
from src.models.product import Product
from src.models.supplier import Supplier
from src.models.inventory import Inventory
from src.models.transaction import Transaction

inventory_bp = Blueprint('inventory', __name__)

def admin_required(f):
    """Decorator to require admin access"""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@inventory_bp.route('/inventory', methods=['GET'])
@login_required
def get_inventory():
    """Get all inventory items with optional filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    product_id = request.args.get('product_id', type=int)
    expired = request.args.get('expired', type=bool)
    expiring_soon = request.args.get('expiring_soon', type=bool)  # within 30 days
    
    query = Inventory.query
    
    # Apply filters
    if product_id:
        query = query.filter(Inventory.product_id == product_id)
    
    if expired:
        query = query.filter(Inventory.expiration_date < date.today())
    
    if expiring_soon:
        from datetime import timedelta
        thirty_days_from_now = date.today() + timedelta(days=30)
        query = query.filter(Inventory.expiration_date <= thirty_days_from_now)
    
    inventory_items = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'inventory': [item.to_dict() for item in inventory_items.items],
        'total': inventory_items.total,
        'pages': inventory_items.pages,
        'current_page': page
    }), 200

@inventory_bp.route('/inventory/<int:inventory_id>', methods=['GET'])
@login_required
def get_inventory_item(inventory_id):
    """Get specific inventory item"""
    inventory_item = Inventory.query.get_or_404(inventory_id)
    return jsonify(inventory_item.to_dict()), 200

@inventory_bp.route('/inventory', methods=['POST'])
@login_required
@admin_required
def add_inventory():
    """Add new inventory batch"""
    data = request.get_json()
    
    required_fields = ['product_id', 'batch_number', 'expiration_date', 'quantity']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Product_id, batch_number, expiration_date, and quantity are required'}), 400
    
    # Verify product exists
    product = Product.query.get(data['product_id'])
    if not product:
        return jsonify({'error': 'Product not found'}), 400
    
    # Verify supplier exists if provided
    supplier_id = data.get('supplier_id')
    if supplier_id and not Supplier.query.get(supplier_id):
        return jsonify({'error': 'Supplier not found'}), 400
    
    # Parse expiration date
    try:
        expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid expiration date format. Use YYYY-MM-DD'}), 400
    
    inventory_item = Inventory(
        product_id=data['product_id'],
        batch_number=data['batch_number'],
        expiration_date=expiration_date,
        quantity=int(data['quantity']),
        location=data.get('location', ''),
        supplier_id=supplier_id
    )
    
    db.session.add(inventory_item)
    
    # Create restock transaction
    transaction = Transaction(
        product_id=data['product_id'],
        inventory_id=inventory_item.id,
        quantity=int(data['quantity']),
        transaction_type='restock',
        user_id=current_user.id,
        notes=f"Added new batch: {data['batch_number']}"
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'message': 'Inventory added successfully',
        'inventory': inventory_item.to_dict()
    }), 201

@inventory_bp.route('/inventory/<int:inventory_id>', methods=['PUT'])
@login_required
@admin_required
def update_inventory(inventory_id):
    """Update inventory item"""
    inventory_item = Inventory.query.get_or_404(inventory_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    old_quantity = inventory_item.quantity
    
    # Update fields
    if 'batch_number' in data:
        inventory_item.batch_number = data['batch_number']
    if 'expiration_date' in data:
        try:
            inventory_item.expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid expiration date format. Use YYYY-MM-DD'}), 400
    if 'quantity' in data:
        new_quantity = int(data['quantity'])
        quantity_change = new_quantity - old_quantity
        inventory_item.quantity = new_quantity
        
        # Create adjustment transaction if quantity changed
        if quantity_change != 0:
            transaction = Transaction(
                product_id=inventory_item.product_id,
                inventory_id=inventory_item.id,
                quantity=abs(quantity_change),
                transaction_type='adjustment',
                user_id=current_user.id,
                notes=f"Quantity adjusted from {old_quantity} to {new_quantity}"
            )
            db.session.add(transaction)
    
    if 'location' in data:
        inventory_item.location = data['location']
    if 'supplier_id' in data:
        if data['supplier_id'] and not Supplier.query.get(data['supplier_id']):
            return jsonify({'error': 'Supplier not found'}), 400
        inventory_item.supplier_id = data['supplier_id']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Inventory updated successfully',
        'inventory': inventory_item.to_dict()
    }), 200

@inventory_bp.route('/inventory/<int:inventory_id>/sale', methods=['POST'])
@login_required
def record_sale(inventory_id):
    """Record a sale from specific inventory batch"""
    inventory_item = Inventory.query.get_or_404(inventory_id)
    data = request.get_json()
    
    if not data or 'quantity' not in data:
        return jsonify({'error': 'Quantity required'}), 400
    
    quantity_sold = int(data['quantity'])
    
    if quantity_sold <= 0:
        return jsonify({'error': 'Quantity must be positive'}), 400
    
    if quantity_sold > inventory_item.quantity:
        return jsonify({'error': 'Insufficient stock'}), 400
    
    # Update inventory
    inventory_item.quantity -= quantity_sold
    
    # Create sale transaction
    transaction = Transaction(
        product_id=inventory_item.product_id,
        inventory_id=inventory_item.id,
        quantity=quantity_sold,
        transaction_type='sale',
        user_id=current_user.id,
        notes=data.get('notes', '')
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'message': 'Sale recorded successfully',
        'inventory': inventory_item.to_dict(),
        'transaction': transaction.to_dict()
    }), 200

@inventory_bp.route('/inventory/expired', methods=['GET'])
@login_required
def get_expired_inventory():
    """Get expired inventory items"""
    expired_items = Inventory.query.filter(Inventory.expiration_date < date.today()).all()
    return jsonify([item.to_dict() for item in expired_items]), 200

@inventory_bp.route('/inventory/expiring-soon', methods=['GET'])
@login_required
def get_expiring_soon():
    """Get inventory items expiring within 30 days"""
    from datetime import timedelta
    thirty_days_from_now = date.today() + timedelta(days=30)
    expiring_items = Inventory.query.filter(
        Inventory.expiration_date <= thirty_days_from_now,
        Inventory.expiration_date >= date.today()
    ).all()
    return jsonify([item.to_dict() for item in expiring_items]), 200

@inventory_bp.route('/inventory/summary', methods=['GET'])
@login_required
def get_inventory_summary():
    """Get inventory summary statistics"""
    total_products = Product.query.count()
    total_inventory_items = Inventory.query.count()
    expired_count = Inventory.query.filter(Inventory.expiration_date < date.today()).count()
    
    from datetime import timedelta
    thirty_days_from_now = date.today() + timedelta(days=30)
    expiring_soon_count = Inventory.query.filter(
        Inventory.expiration_date <= thirty_days_from_now,
        Inventory.expiration_date >= date.today()
    ).count()
    
    low_stock_products = [p for p in Product.query.all() if p.is_low_stock()]
    
    return jsonify({
        'total_products': total_products,
        'total_inventory_items': total_inventory_items,
        'expired_items': expired_count,
        'expiring_soon': expiring_soon_count,
        'low_stock_products': len(low_stock_products)
    }), 200

