from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.stock_transfer import StockTransfer, StockTransferItem
from src.models.transaction import Transaction
from src.models.inventory import Inventory
from src.models.product import Product
from src.models.store import Store
from datetime import datetime

stock_transfers_bp = Blueprint('stock_transfers', __name__)

@stock_transfers_bp.route('/stock-transfers', methods=['GET'])
@login_required
def get_stock_transfers():
    """Get all stock transfers with filtering"""
    try:
        # Get query parameters
        status = request.args.get('status')
        from_store_id = request.args.get('from_store_id', type=int)
        to_store_id = request.args.get('to_store_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = StockTransfer.query
        
        # Apply filters
        if status:
            query = query.filter(StockTransfer.status == status)
        if from_store_id:
            query = query.filter(StockTransfer.from_store_id == from_store_id)
        if to_store_id:
            query = query.filter(StockTransfer.to_store_id == to_store_id)
        
        # Paginate results
        transfers = query.order_by(StockTransfer.transfer_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'transfers': [transfer.to_dict() for transfer in transfers.items],
            'pagination': {
                'page': page,
                'pages': transfers.pages,
                'per_page': per_page,
                'total': transfers.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_transfers_bp.route('/stock-transfers', methods=['POST'])
@login_required
def create_stock_transfer():
    """Create a new stock transfer"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('from_store_id') or not data.get('to_store_id'):
            return jsonify({'error': 'From store and to store are required'}), 400
        
        if data['from_store_id'] == data['to_store_id']:
            return jsonify({'error': 'Cannot transfer to the same store'}), 400
        
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'error': 'At least one item is required'}), 400
        
        # Verify stores exist
        from_store = Store.query.get(data['from_store_id'])
        to_store = Store.query.get(data['to_store_id'])
        if not from_store or not to_store:
            return jsonify({'error': 'Invalid store ID'}), 400
        
        # Generate transfer number
        transfer_number = f"ST{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create transfer
        transfer = StockTransfer(
            transfer_number=transfer_number,
            from_store_id=data['from_store_id'],
            to_store_id=data['to_store_id'],
            notes=data.get('notes'),
            created_by=current_user.id
        )
        
        db.session.add(transfer)
        db.session.flush()  # Get the transfer ID
        
        # Add transfer items and validate inventory
        for item_data in data['items']:
            if not item_data.get('product_id') or not item_data.get('quantity'):
                return jsonify({'error': 'Product ID and quantity are required for all items'}), 400
            
            # Verify product exists
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'error': f'Invalid product ID: {item_data["product_id"]}'}), 400
            
            # Check if enough inventory is available in source store
            if item_data.get('inventory_id'):
                inventory = Inventory.query.get(item_data['inventory_id'])
                if not inventory or inventory.store_id != data['from_store_id']:
                    return jsonify({'error': 'Invalid inventory batch for source store'}), 400
                if inventory.quantity < item_data['quantity']:
                    return jsonify({'error': f'Insufficient quantity in batch {inventory.batch_number}'}), 400
            else:
                # Check total available quantity for product in source store
                total_available = product.get_total_quantity(data['from_store_id'])
                if total_available < item_data['quantity']:
                    return jsonify({'error': f'Insufficient quantity for {product.name} in source store'}), 400
            
            # Create transfer item
            transfer_item = StockTransferItem(
                transfer_id=transfer.id,
                product_id=item_data['product_id'],
                product_flavor_id=item_data.get('product_flavor_id'),
                inventory_id=item_data.get('inventory_id'),
                quantity=item_data['quantity'],
                unit_cost=item_data.get('unit_cost'),
                notes=item_data.get('notes')
            )
            
            db.session.add(transfer_item)
        
        db.session.commit()
        return jsonify(transfer.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stock_transfers_bp.route('/stock-transfers/<int:transfer_id>', methods=['GET'])
@login_required
def get_stock_transfer(transfer_id):
    """Get a specific stock transfer"""
    try:
        transfer = StockTransfer.query.get_or_404(transfer_id)
        return jsonify(transfer.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_transfers_bp.route('/stock-transfers/<int:transfer_id>/approve', methods=['POST'])
@login_required
def approve_stock_transfer(transfer_id):
    """Approve and execute a stock transfer"""
    try:
        transfer = StockTransfer.query.get_or_404(transfer_id)
        
        if transfer.status != 'pending':
            return jsonify({'error': 'Transfer is not in pending status'}), 400
        
        # Process each transfer item
        for item in transfer.transfer_items:
            # Reduce from any available inventory (FIFO)
            available_inventory = Inventory.query.filter_by(
                product_id=item.product_id,
                store_id=transfer.from_store_id,
                is_active=True
            ).filter(Inventory.quantity > 0).order_by(Inventory.date_received).all()
            
            remaining_qty_to_transfer = item.quantity
            for inv in available_inventory:
                if remaining_qty_to_transfer <= 0:
                    break
                
                transfer_qty = min(inv.quantity, remaining_qty_to_transfer)
                
                # Reduce from source
                inv.quantity -= transfer_qty
                remaining_qty_to_transfer -= transfer_qty
                
                # FIX: Added the 'store_id' argument for the outgoing transaction
                out_transaction = Transaction(
                    product_id=item.product_id,
                    inventory_id=inv.id,
                    store_id=transfer.from_store_id,
                    quantity=-transfer_qty,
                    transaction_type='transfer-out',
                    reference=f"To {transfer.to_store.name}: {transfer.transfer_number}",
                    user_id=current_user.id
                )
                db.session.add(out_transaction)

                # Create or update in destination
                dest_inventory = Inventory(
                    product_id=item.product_id,
                    product_flavor_id=item.product_flavor_id,
                    store_id=transfer.to_store_id,
                    supplier_id=inv.supplier_id,
                    batch_number=inv.batch_number,
                    expiration_date=inv.expiration_date,
                    quantity=transfer_qty,
                    unit_cost=item.unit_cost or inv.unit_cost,
                    location=inv.location,
                    date_received=inv.date_received,
                    notes=f"Transferred from {transfer.from_store.name}"
                )
                db.session.add(dest_inventory)
                db.session.flush()

                # FIX: Added the 'store_id' argument for the incoming transaction
                in_transaction = Transaction(
                    product_id=item.product_id,
                    inventory_id=dest_inventory.id,
                    store_id=transfer.to_store_id,
                    quantity=transfer_qty,
                    transaction_type='transfer-in',
                    reference=f"From {transfer.from_store.name}: {transfer.transfer_number}",
                    user_id=current_user.id
                )
                db.session.add(in_transaction)

            if remaining_qty_to_transfer > 0:
                return jsonify({'error': f'Insufficient inventory for {item.product.name}'}), 400
        
        # Update transfer status
        transfer.status = 'completed'
        transfer.completed_date = datetime.utcnow()
        transfer.approved_by = current_user.id
        
        db.session.commit()
        return jsonify(transfer.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@stock_transfers_bp.route('/stock-transfers/<int:transfer_id>/cancel', methods=['POST'])
@login_required
def cancel_stock_transfer(transfer_id):
    """Cancel a stock transfer"""
    try:
        transfer = StockTransfer.query.get_or_404(transfer_id)
        
        if transfer.status not in ['pending', 'in_transit']:
            return jsonify({'error': 'Cannot cancel completed transfer'}), 400
        
        transfer.status = 'cancelled'
        db.session.commit()
        
        return jsonify(transfer.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stock_transfers_bp.route('/stock-transfers/<int:transfer_id>', methods=['PUT'])
@login_required
def update_stock_transfer(transfer_id):
    """Update a stock transfer (only if pending)"""
    try:
        transfer = StockTransfer.query.get_or_404(transfer_id)
        
        if transfer.status != 'pending':
            return jsonify({'error': 'Can only update pending transfers'}), 400
        
        data = request.get_json()
        
        # Update basic fields
        if 'notes' in data:
            transfer.notes = data['notes']
        
        db.session.commit()
        return jsonify(transfer.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

