from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.grn import GRN, GRNItem
from src.models.inventory import Inventory
from src.models.product import Product
from src.models.supplier import Supplier
from src.models.store import Store
from datetime import datetime, date
from decimal import Decimal

grn_bp = Blueprint('grn', __name__)

@grn_bp.route('/grns', methods=['GET'])
@login_required
def get_grns():
    """Get all GRNs with filtering"""
    try:
        # Get query parameters
        store_id = request.args.get('store_id', type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = GRN.query
        
        # Apply filters
        if store_id:
            query = query.filter(GRN.store_id == store_id)
        if supplier_id:
            query = query.filter(GRN.supplier_id == supplier_id)
        if status:
            query = query.filter(GRN.status == status)
        if start_date:
            query = query.filter(GRN.received_date >= datetime.fromisoformat(start_date).date())
        if end_date:
            query = query.filter(GRN.received_date <= datetime.fromisoformat(end_date).date())
        
        # Paginate results
        grns = query.order_by(GRN.received_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'grns': [grn.to_dict() for grn in grns.items],
            'pagination': {
                'page': page,
                'pages': grns.pages,
                'per_page': per_page,
                'total': grns.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns', methods=['POST'])
@login_required
def create_grn():
    """Create a new GRN"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('store_id') or not data.get('supplier_id'):
            return jsonify({'error': 'Store ID and Supplier ID are required'}), 400
        
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'error': 'At least one item is required'}), 400
        
        # Verify store and supplier exist
        store = Store.query.get(data['store_id'])
        supplier = Supplier.query.get(data['supplier_id'])
        if not store or not supplier:
            return jsonify({'error': 'Invalid store or supplier ID'}), 400
        
        # Generate GRN number
        grn_number = f"GRN{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create GRN
        grn = GRN(
            grn_number=grn_number,
            store_id=data['store_id'],
            supplier_id=data['supplier_id'],
            purchase_order_number=data.get('purchase_order_number'),
            invoice_number=data.get('invoice_number'),
            received_date=datetime.fromisoformat(data['received_date']).date() if data.get('received_date') else date.today(),
            notes=data.get('notes'),
            created_by=current_user.id
        )
        
        db.session.add(grn)
        db.session.flush()  # Get the GRN ID
        
        # Add GRN items
        for item_data in data['items']:
            if not item_data.get('product_id') or not item_data.get('quantity_received') or not item_data.get('unit_cost'):
                return jsonify({'error': 'Product ID, quantity received, and unit cost are required for all items'}), 400
            
            # Verify product exists
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'error': f'Invalid product ID: {item_data["product_id"]}'}), 400
            
            # Calculate line total
            line_total = Decimal(str(item_data['quantity_received'])) * Decimal(str(item_data['unit_cost']))
            
            # Create GRN item
            grn_item = GRNItem(
                grn_id=grn.id,
                product_id=item_data['product_id'],
                product_flavor_id=item_data.get('product_flavor_id'),
                quantity_ordered=item_data.get('quantity_ordered', 0),
                quantity_received=item_data['quantity_received'],
                unit_cost=Decimal(str(item_data['unit_cost'])),
                line_total=line_total,
                batch_number=item_data.get('batch_number', f"BATCH-{grn_number}-{item_data['product_id']}"),
                expiration_date=datetime.fromisoformat(item_data['expiration_date']).date() if item_data.get('expiration_date') else None,
                location=item_data.get('location'),
                notes=item_data.get('notes')
            )
            
            db.session.add(grn_item)
        
        # Calculate GRN total
        grn.calculate_total()
        
        db.session.commit()
        return jsonify(grn.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns/<int:grn_id>', methods=['GET'])
@login_required
def get_grn(grn_id):
    """Get a specific GRN"""
    try:
        grn = GRN.query.get_or_404(grn_id)
        return jsonify(grn.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns/<int:grn_id>/verify', methods=['POST'])
@login_required
def verify_grn(grn_id):
    """Verify a GRN and add items to inventory"""
    try:
        grn = GRN.query.get_or_404(grn_id)
        
        if grn.status != 'received':
            return jsonify({'error': 'GRN is not in received status'}), 400
        
        # Add each GRN item to inventory
        for item in grn.grn_items:
            # Check if inventory already exists for this batch
            existing_inventory = Inventory.query.filter_by(
                product_id=item.product_id,
                store_id=grn.store_id,
                batch_number=item.batch_number,
                grn_id=grn.id
            ).first()
            
            if existing_inventory:
                # Update existing inventory
                existing_inventory.quantity += item.quantity_received
                existing_inventory.unit_cost = item.unit_cost  # Update with latest cost
            else:
                # Create new inventory entry
                inventory = Inventory(
                    product_id=item.product_id,
                    product_flavor_id=item.product_flavor_id,
                    store_id=grn.store_id,
                    supplier_id=grn.supplier_id,
                    batch_number=item.batch_number,
                    expiration_date=item.expiration_date,
                    quantity=item.quantity_received,
                    unit_cost=item.unit_cost,
                    location=item.location,
                    date_received=grn.received_date,
                    grn_id=grn.id,
                    notes=f"Received via GRN {grn.grn_number}"
                )
                db.session.add(inventory)
        
        # Update GRN status
        grn.status = 'verified'
        grn.verified_by = current_user.id
        grn.verified_date = datetime.utcnow()
        
        db.session.commit()
        return jsonify(grn.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns/<int:grn_id>/complete', methods=['POST'])
@login_required
def complete_grn(grn_id):
    """Mark GRN as completed"""
    try:
        grn = GRN.query.get_or_404(grn_id)
        
        if grn.status != 'verified':
            return jsonify({'error': 'GRN must be verified before completion'}), 400
        
        grn.status = 'completed'
        db.session.commit()
        
        return jsonify(grn.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns/<int:grn_id>', methods=['PUT'])
@login_required
def update_grn(grn_id):
    """Update a GRN (only if not verified)"""
    try:
        grn = GRN.query.get_or_404(grn_id)
        
        if grn.status not in ['received']:
            return jsonify({'error': 'Can only update GRNs in received status'}), 400
        
        data = request.get_json()
        
        # Update basic fields
        if 'purchase_order_number' in data:
            grn.purchase_order_number = data['purchase_order_number']
        if 'invoice_number' in data:
            grn.invoice_number = data['invoice_number']
        if 'notes' in data:
            grn.notes = data['notes']
        if 'received_date' in data:
            grn.received_date = datetime.fromisoformat(data['received_date']).date()
        
        db.session.commit()
        return jsonify(grn.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns/<int:grn_id>', methods=['DELETE'])
@login_required
def delete_grn(grn_id):
    """Delete a GRN (only if not verified)"""
    try:
        grn = GRN.query.get_or_404(grn_id)
        
        if grn.status != 'received':
            return jsonify({'error': 'Can only delete GRNs in received status'}), 400
        
        # Delete GRN items first
        for item in grn.grn_items:
            db.session.delete(item)
        
        # Delete GRN
        db.session.delete(grn)
        db.session.commit()
        
        return jsonify({'message': 'GRN deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@grn_bp.route('/grns/summary', methods=['GET'])
@login_required
def get_grn_summary():
    """Get GRN summary statistics"""
    try:
        store_id = request.args.get('store_id', type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = GRN.query
        
        # Apply filters
        if store_id:
            query = query.filter(GRN.store_id == store_id)
        if supplier_id:
            query = query.filter(GRN.supplier_id == supplier_id)
        if start_date:
            query = query.filter(GRN.received_date >= datetime.fromisoformat(start_date).date())
        if end_date:
            query = query.filter(GRN.received_date <= datetime.fromisoformat(end_date).date())
        
        grns = query.all()
        
        # Calculate summary statistics
        total_grns = len(grns)
        total_value = sum(grn.total_amount for grn in grns)
        
        # Group by status
        status_counts = {}
        for grn in grns:
            status = grn.status
            if status not in status_counts:
                status_counts[status] = 0
            status_counts[status] += 1
        
        # Group by supplier
        supplier_stats = {}
        for grn in grns:
            supplier_name = grn.supplier.name if grn.supplier else 'Unknown'
            if supplier_name not in supplier_stats:
                supplier_stats[supplier_name] = {'count': 0, 'value': 0}
            supplier_stats[supplier_name]['count'] += 1
            supplier_stats[supplier_name]['value'] += float(grn.total_amount)
        
        return jsonify({
            'summary': {
                'total_grns': total_grns,
                'total_value': float(total_value)
            },
            'status_counts': status_counts,
            'supplier_stats': supplier_stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

