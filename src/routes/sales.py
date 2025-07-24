from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import db
from src.models.sale import Sale, SaleItem
from src.models.inventory import Inventory
from src.models.product import Product
from src.models.store import Store
from datetime import datetime, date
from decimal import Decimal

sales_bp = Blueprint('sales', __name__)

@sales_bp.route('/sales', methods=['GET'])
@login_required
def get_sales():
    """Get all sales with filtering"""
    try:
        # Get query parameters
        store_id = request.args.get('store_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        payment_status = request.args.get('payment_status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = Sale.query
        
        # Apply filters
        if store_id:
            query = query.filter(Sale.store_id == store_id)
        if start_date:
            query = query.filter(Sale.sale_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Sale.sale_date <= datetime.fromisoformat(end_date))
        if payment_status:
            query = query.filter(Sale.payment_status == payment_status)
        
        # Paginate results
        sales = query.order_by(Sale.sale_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'sales': [sale.to_dict() for sale in sales.items],
            'pagination': {
                'page': page,
                'pages': sales.pages,
                'per_page': per_page,
                'total': sales.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales', methods=['POST'])
@login_required
def create_sale():
    """Create a new sale"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('store_id'):
            return jsonify({'error': 'Store ID is required'}), 400
        
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'error': 'At least one item is required'}), 400
        
        # Verify store exists
        store = Store.query.get(data['store_id'])
        if not store:
            return jsonify({'error': 'Invalid store ID'}), 400
        
        # Generate invoice number
        invoice_number = f"INV{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create sale
        sale = Sale(
            invoice_number=invoice_number,
            store_id=data['store_id'],
            customer_name=data.get('customer_name'),
            customer_phone=data.get('customer_phone'),
            customer_email=data.get('customer_email'),
            tax_amount=Decimal(str(data.get('tax_amount', 0))),
            discount_amount=Decimal(str(data.get('discount_amount', 0))),
            payment_method=data.get('payment_method', 'cash'),
            payment_status=data.get('payment_status', 'paid'),
            notes=data.get('notes'),
            created_by=current_user.id
        )
        
        db.session.add(sale)
        db.session.flush()  # Get the sale ID
        
        # Add sale items and update inventory
        for item_data in data['items']:
            if not item_data.get('product_id') or not item_data.get('quantity') or not item_data.get('unit_price'):
                return jsonify({'error': 'Product ID, quantity, and unit price are required for all items'}), 400
            
            # Verify product exists
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'error': f'Invalid product ID: {item_data["product_id"]}'}), 400
            
            # Check inventory availability
            if item_data.get('inventory_id'):
                # Sell from specific inventory batch
                inventory = Inventory.query.get(item_data['inventory_id'])
                if not inventory or inventory.store_id != data['store_id']:
                    return jsonify({'error': 'Invalid inventory batch for this store'}), 400
                if inventory.quantity < item_data['quantity']:
                    return jsonify({'error': f'Insufficient quantity in batch {inventory.batch_number}'}), 400
                
                unit_cost = inventory.unit_cost
            else:
                # Check total available quantity for product in store
                total_available = product.get_total_quantity(data['store_id'])
                if total_available < item_data['quantity']:
                    return jsonify({'error': f'Insufficient quantity for {product.name} in store'}), 400
                
                # Get average cost for profit calculation
                store_inventory = Inventory.query.filter_by(
                    product_id=item_data['product_id'],
                    store_id=data['store_id'],
                    is_active=True
                ).filter(Inventory.quantity > 0).all()
                
                if store_inventory:
                    total_cost = sum(inv.unit_cost * inv.quantity for inv in store_inventory if inv.unit_cost)
                    total_qty = sum(inv.quantity for inv in store_inventory)
                    unit_cost = total_cost / total_qty if total_qty > 0 else 0
                else:
                    unit_cost = 0
            
            # Calculate line total
            line_total = Decimal(str(item_data['quantity'])) * Decimal(str(item_data['unit_price']))
            if item_data.get('discount_amount'):
                line_total -= Decimal(str(item_data['discount_amount']))
            
            # Create sale item
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data['product_id'],
                product_flavor_id=item_data.get('product_flavor_id'),
                inventory_id=item_data.get('inventory_id'),
                quantity=item_data['quantity'],
                unit_price=Decimal(str(item_data['unit_price'])),
                unit_cost=unit_cost,
                line_total=line_total,
                discount_amount=Decimal(str(item_data.get('discount_amount', 0)))
            )
            
            db.session.add(sale_item)
        
        # Calculate sale totals
        sale.calculate_totals()
        
        # Update inventory quantities
        for item in sale.sale_items:
            if item.inventory_id:
                # Reduce from specific inventory batch
                inventory = Inventory.query.get(item.inventory_id)
                inventory.quantity -= item.quantity
            else:
                # Reduce from available inventory (FIFO)
                available_inventory = Inventory.query.filter_by(
                    product_id=item.product_id,
                    store_id=sale.store_id,
                    is_active=True
                ).filter(Inventory.quantity > 0).order_by(Inventory.date_received).all()
                
                remaining_qty = item.quantity
                for inv in available_inventory:
                    if remaining_qty <= 0:
                        break
                    
                    reduce_qty = min(inv.quantity, remaining_qty)
                    inv.quantity -= reduce_qty
                    remaining_qty -= reduce_qty
        
        db.session.commit()
        return jsonify(sale.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/<int:sale_id>', methods=['GET'])
@login_required
def get_sale(sale_id):
    """Get a specific sale"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        return jsonify(sale.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/<int:sale_id>', methods=['PUT'])
@login_required
def update_sale(sale_id):
    """Update a sale (limited fields)"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        data = request.get_json()
        
        # Only allow updating certain fields
        if 'customer_name' in data:
            sale.customer_name = data['customer_name']
        if 'customer_phone' in data:
            sale.customer_phone = data['customer_phone']
        if 'customer_email' in data:
            sale.customer_email = data['customer_email']
        if 'payment_status' in data:
            sale.payment_status = data['payment_status']
        if 'notes' in data:
            sale.notes = data['notes']
        
        db.session.commit()
        return jsonify(sale.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/<int:sale_id>/void', methods=['POST'])
@login_required
def void_sale(sale_id):
    """Void a sale and restore inventory"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        
        if sale.payment_status == 'voided':
            return jsonify({'error': 'Sale is already voided'}), 400
        
        # Restore inventory quantities
        for item in sale.sale_items:
            if item.inventory_id:
                # Restore to specific inventory batch
                inventory = Inventory.query.get(item.inventory_id)
                if inventory:
                    inventory.quantity += item.quantity
            else:
                # Create new inventory entry or add to existing
                # Find most recent inventory for this product in the store
                recent_inventory = Inventory.query.filter_by(
                    product_id=item.product_id,
                    store_id=sale.store_id,
                    is_active=True
                ).order_by(Inventory.date_received.desc()).first()
                
                if recent_inventory:
                    recent_inventory.quantity += item.quantity
                else:
                    # Create new inventory entry
                    new_inventory = Inventory(
                        product_id=item.product_id,
                        product_flavor_id=item.product_flavor_id,
                        store_id=sale.store_id,
                        batch_number=f"VOID-{sale.invoice_number}",
                        quantity=item.quantity,
                        unit_cost=item.unit_cost,
                        notes=f"Restored from voided sale {sale.invoice_number}"
                    )
                    db.session.add(new_inventory)
        
        # Update sale status
        sale.payment_status = 'voided'
        sale.notes = (sale.notes or '') + f"\nVoided on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        db.session.commit()
        return jsonify(sale.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/summary', methods=['GET'])
@login_required
def get_sales_summary():
    """Get sales summary statistics"""
    try:
        store_id = request.args.get('store_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Sale.query
        
        # Apply filters
        if store_id:
            query = query.filter(Sale.store_id == store_id)
        if start_date:
            query = query.filter(Sale.sale_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Sale.sale_date <= datetime.fromisoformat(end_date))
        
        sales = query.all()
        
        # Calculate summary statistics
        total_sales = len(sales)
        total_revenue = sum(sale.total_amount for sale in sales)
        total_cost = sum(
            sum(item.unit_cost * item.quantity for item in sale.sale_items if item.unit_cost)
            for sale in sales
        )
        total_profit = total_revenue - total_cost
        
        # Group by payment method
        payment_methods = {}
        for sale in sales:
            method = sale.payment_method
            if method not in payment_methods:
                payment_methods[method] = {'count': 0, 'amount': 0}
            payment_methods[method]['count'] += 1
            payment_methods[method]['amount'] += float(sale.total_amount)
        
        # Top selling products
        product_sales = {}
        for sale in sales:
            for item in sale.sale_items:
                product_name = item.product.name if item.product else 'Unknown'
                if product_name not in product_sales:
                    product_sales[product_name] = {'quantity': 0, 'revenue': 0}
                product_sales[product_name]['quantity'] += item.quantity
                product_sales[product_name]['revenue'] += float(item.line_total)
        
        top_products = sorted(
            product_sales.items(),
            key=lambda x: x[1]['quantity'],
            reverse=True
        )[:10]
        
        return jsonify({
            'summary': {
                'total_sales': total_sales,
                'total_revenue': float(total_revenue),
                'total_cost': float(total_cost),
                'total_profit': float(total_profit),
                'profit_margin': (float(total_profit) / float(total_revenue) * 100) if total_revenue > 0 else 0
            },
            'payment_methods': payment_methods,
            'top_products': [{'name': name, **stats} for name, stats in top_products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

