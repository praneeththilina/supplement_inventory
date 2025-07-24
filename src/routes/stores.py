from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.store import Store

stores_bp = Blueprint('stores', __name__)

@stores_bp.route('/stores', methods=['GET'])
@login_required
def get_stores():
    """Get all stores"""
    try:
        stores = Store.query.filter_by(is_active=True).all()
        return jsonify([store.to_dict() for store in stores]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stores_bp.route('/stores', methods=['POST'])
@login_required
def create_store():
    """Create a new store"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Store name is required'}), 400
        
        # Check if store name already exists
        existing_store = Store.query.filter_by(name=data['name']).first()
        if existing_store:
            return jsonify({'error': 'Store name already exists'}), 400
        
        store = Store(
            name=data['name'],
            address=data.get('address'),
            phone=data.get('phone'),
            email=data.get('email'),
            manager_name=data.get('manager_name')
        )
        
        db.session.add(store)
        db.session.commit()
        
        return jsonify(store.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stores_bp.route('/stores/<int:store_id>', methods=['GET'])
@login_required
def get_store(store_id):
    """Get a specific store"""
    try:
        store = Store.query.get_or_404(store_id)
        return jsonify(store.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stores_bp.route('/stores/<int:store_id>', methods=['PUT'])
@login_required
def update_store(store_id):
    """Update a store"""
    try:
        store = Store.query.get_or_404(store_id)
        data = request.get_json()
        
        # Check if new name conflicts with existing store
        if data.get('name') and data['name'] != store.name:
            existing_store = Store.query.filter_by(name=data['name']).first()
            if existing_store:
                return jsonify({'error': 'Store name already exists'}), 400
        
        # Update fields
        if 'name' in data:
            store.name = data['name']
        if 'address' in data:
            store.address = data['address']
        if 'phone' in data:
            store.phone = data['phone']
        if 'email' in data:
            store.email = data['email']
        if 'manager_name' in data:
            store.manager_name = data['manager_name']
        if 'is_active' in data:
            store.is_active = data['is_active']
        
        db.session.commit()
        return jsonify(store.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stores_bp.route('/stores/<int:store_id>', methods=['DELETE'])
@login_required
def delete_store(store_id):
    """Soft delete a store"""
    try:
        store = Store.query.get_or_404(store_id)
        
        # Check if store has inventory or sales
        if store.inventory_items or store.sales:
            # Soft delete instead of hard delete
            store.is_active = False
            db.session.commit()
            return jsonify({'message': 'Store deactivated successfully'}), 200
        else:
            # Hard delete if no related data
            db.session.delete(store)
            db.session.commit()
            return jsonify({'message': 'Store deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stores_bp.route('/stores/<int:store_id>/inventory-summary', methods=['GET'])
@login_required
def get_store_inventory_summary(store_id):
    """Get inventory summary for a specific store"""
    try:
        store = Store.query.get_or_404(store_id)
        
        # Get inventory statistics for this store
        from src.models.inventory import Inventory
        from src.models.product import Product
        from sqlalchemy import func
        
        total_items = Inventory.query.filter_by(store_id=store_id, is_active=True).count()
        total_value = db.session.query(func.sum(Inventory.quantity * Inventory.unit_cost)).filter_by(
            store_id=store_id, is_active=True
        ).scalar() or 0
        
        # Low stock products for this store
        low_stock_products = []
        products = Product.query.filter_by(is_active=True).all()
        for product in products:
            store_quantity = product.get_total_quantity(store_id)
            if store_quantity <= product.reorder_point:
                low_stock_products.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'current_stock': store_quantity,
                    'reorder_point': product.reorder_point
                })
        
        # Expired items for this store
        from datetime import date
        expired_items = Inventory.query.filter(
            Inventory.store_id == store_id,
            Inventory.expiration_date < date.today(),
            Inventory.is_active == True
        ).count()
        
        return jsonify({
            'store': store.to_dict(),
            'inventory_summary': {
                'total_items': total_items,
                'total_value': float(total_value),
                'low_stock_count': len(low_stock_products),
                'expired_items': expired_items
            },
            'low_stock_products': low_stock_products
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

