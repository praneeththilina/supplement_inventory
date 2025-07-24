from flask import Blueprint, request, jsonify
from flask_login import login_required
from src.models.user import db
from src.models.flavor import Flavor, ProductFlavor
from src.models.product import Product

flavors_bp = Blueprint('flavors', __name__)

@flavors_bp.route('/flavors', methods=['GET'])
@login_required
def get_flavors():
    """Get all flavors"""
    try:
        flavors = Flavor.query.filter_by(is_active=True).all()
        return jsonify([flavor.to_dict() for flavor in flavors]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/flavors', methods=['POST'])
@login_required
def create_flavor():
    """Create a new flavor"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Flavor name is required'}), 400
        
        # Check if flavor name already exists
        existing_flavor = Flavor.query.filter_by(name=data['name']).first()
        if existing_flavor:
            return jsonify({'error': 'Flavor name already exists'}), 400
        
        flavor = Flavor(
            name=data['name'],
            description=data.get('description')
        )
        
        db.session.add(flavor)
        db.session.commit()
        
        return jsonify(flavor.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/flavors/<int:flavor_id>', methods=['PUT'])
@login_required
def update_flavor(flavor_id):
    """Update a flavor"""
    try:
        flavor = Flavor.query.get_or_404(flavor_id)
        data = request.get_json()
        
        # Check if new name conflicts with existing flavor
        if data.get('name') and data['name'] != flavor.name:
            existing_flavor = Flavor.query.filter_by(name=data['name']).first()
            if existing_flavor:
                return jsonify({'error': 'Flavor name already exists'}), 400
        
        # Update fields
        if 'name' in data:
            flavor.name = data['name']
        if 'description' in data:
            flavor.description = data['description']
        if 'is_active' in data:
            flavor.is_active = data['is_active']
        
        db.session.commit()
        return jsonify(flavor.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/flavors/<int:flavor_id>', methods=['DELETE'])
@login_required
def delete_flavor(flavor_id):
    """Soft delete a flavor"""
    try:
        flavor = Flavor.query.get_or_404(flavor_id)
        
        # Check if flavor is used in products
        if flavor.product_flavors:
            # Soft delete instead of hard delete
            flavor.is_active = False
            db.session.commit()
            return jsonify({'message': 'Flavor deactivated successfully'}), 200
        else:
            # Hard delete if no related data
            db.session.delete(flavor)
            db.session.commit()
            return jsonify({'message': 'Flavor deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/product-flavors', methods=['GET'])
@login_required
def get_product_flavors():
    """Get all product-flavor combinations"""
    try:
        product_id = request.args.get('product_id', type=int)
        
        query = ProductFlavor.query.filter_by(is_active=True)
        if product_id:
            query = query.filter_by(product_id=product_id)
        
        product_flavors = query.all()
        return jsonify([pf.to_dict() for pf in product_flavors]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/product-flavors', methods=['POST'])
@login_required
def create_product_flavor():
    """Create a new product-flavor combination"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('product_id') or not data.get('flavor_id'):
            return jsonify({'error': 'Product ID and Flavor ID are required'}), 400
        
        # Check if combination already exists
        existing_pf = ProductFlavor.query.filter_by(
            product_id=data['product_id'],
            flavor_id=data['flavor_id']
        ).first()
        if existing_pf:
            return jsonify({'error': 'Product-flavor combination already exists'}), 400
        
        # Verify product and flavor exist
        product = Product.query.get(data['product_id'])
        flavor = Flavor.query.get(data['flavor_id'])
        if not product or not flavor:
            return jsonify({'error': 'Invalid product or flavor ID'}), 400
        
        product_flavor = ProductFlavor(
            product_id=data['product_id'],
            flavor_id=data['flavor_id'],
            sku_suffix=data.get('sku_suffix')
        )
        
        # Update product to indicate it has flavors
        product.has_flavors = True
        
        db.session.add(product_flavor)
        db.session.commit()
        
        return jsonify(product_flavor.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/product-flavors/<int:pf_id>', methods=['PUT'])
@login_required
def update_product_flavor(pf_id):
    """Update a product-flavor combination"""
    try:
        product_flavor = ProductFlavor.query.get_or_404(pf_id)
        data = request.get_json()
        
        # Update fields
        if 'sku_suffix' in data:
            product_flavor.sku_suffix = data['sku_suffix']
        if 'is_active' in data:
            product_flavor.is_active = data['is_active']
        
        db.session.commit()
        return jsonify(product_flavor.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/product-flavors/<int:pf_id>', methods=['DELETE'])
@login_required
def delete_product_flavor(pf_id):
    """Delete a product-flavor combination"""
    try:
        product_flavor = ProductFlavor.query.get_or_404(pf_id)
        
        # Check if used in inventory or sales
        if product_flavor.inventory_items or product_flavor.sale_items:
            # Soft delete
            product_flavor.is_active = False
            db.session.commit()
            return jsonify({'message': 'Product-flavor combination deactivated'}), 200
        else:
            # Hard delete
            product_id = product_flavor.product_id
            db.session.delete(product_flavor)
            
            # Check if product still has other flavors
            remaining_flavors = ProductFlavor.query.filter_by(
                product_id=product_id, is_active=True
            ).count()
            if remaining_flavors == 0:
                product = Product.query.get(product_id)
                if product:
                    product.has_flavors = False
            
            db.session.commit()
            return jsonify({'message': 'Product-flavor combination deleted'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flavors_bp.route('/products/<int:product_id>/flavors', methods=['GET'])
@login_required
def get_product_flavors_by_product(product_id):
    """Get all flavors for a specific product"""
    try:
        product = Product.query.get_or_404(product_id)
        product_flavors = ProductFlavor.query.filter_by(
            product_id=product_id, is_active=True
        ).all()
        
        return jsonify({
            'product': product.to_dict(),
            'flavors': [pf.to_dict() for pf in product_flavors]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

