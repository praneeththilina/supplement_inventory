from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.supplier import Supplier

suppliers_bp = Blueprint('suppliers', __name__)

def admin_required(f):
    """Decorator to require admin access"""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@suppliers_bp.route('/suppliers', methods=['GET'])
@login_required
def get_suppliers():
    """Get all suppliers"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = Supplier.query
    
    if search:
        query = query.filter(Supplier.name.contains(search))
    
    suppliers = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'suppliers': [supplier.to_dict() for supplier in suppliers.items],
        'total': suppliers.total,
        'pages': suppliers.pages,
        'current_page': page
    }), 200

@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
@login_required
def get_supplier(supplier_id):
    """Get specific supplier"""
    supplier = Supplier.query.get_or_404(supplier_id)
    return jsonify(supplier.to_dict()), 200

@suppliers_bp.route('/suppliers', methods=['POST'])
@login_required
@admin_required
def create_supplier():
    """Create new supplier"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Supplier name required'}), 400
    
    # Check if supplier already exists
    if Supplier.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Supplier already exists'}), 400
    
    supplier = Supplier(
        name=data['name'],
        contact_person=data.get('contact_person', ''),
        email=data.get('email', ''),
        phone=data.get('phone', '')
    )
    
    db.session.add(supplier)
    db.session.commit()
    
    return jsonify({
        'message': 'Supplier created successfully',
        'supplier': supplier.to_dict()
    }), 201

@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
@login_required
@admin_required
def update_supplier(supplier_id):
    """Update existing supplier"""
    supplier = Supplier.query.get_or_404(supplier_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Check for duplicate name if being changed
    if 'name' in data and data['name'] != supplier.name:
        if Supplier.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Supplier name already exists'}), 400
        supplier.name = data['name']
    
    # Update other fields
    if 'contact_person' in data:
        supplier.contact_person = data['contact_person']
    if 'email' in data:
        supplier.email = data['email']
    if 'phone' in data:
        supplier.phone = data['phone']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Supplier updated successfully',
        'supplier': supplier.to_dict()
    }), 200

@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_supplier(supplier_id):
    """Delete supplier"""
    supplier = Supplier.query.get_or_404(supplier_id)
    
    # Check if supplier has inventory items
    if supplier.inventory_items:
        return jsonify({'error': 'Cannot delete supplier with existing inventory items'}), 400
    
    db.session.delete(supplier)
    db.session.commit()
    
    return jsonify({'message': 'Supplier deleted successfully'}), 200

