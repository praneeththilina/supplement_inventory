from flask import Blueprint, request, jsonify
from flask_login import login_required
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_
from src.models.user import db
from src.models.product import Product, Category
from src.models.inventory import Inventory
from src.models.transaction import Transaction
from src.models.supplier import Supplier

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports/inventory-summary', methods=['GET'])
@login_required
def inventory_summary_report():
    """Get comprehensive inventory summary report"""
    try:
        # Total products and categories
        total_products = Product.query.count()
        total_categories = Category.query.count()
        total_suppliers = Supplier.query.count()
        
        # Inventory statistics
        total_inventory_items = Inventory.query.count()
        total_stock_value = db.session.query(
            func.sum(Inventory.quantity * Product.price)
        ).join(Product).scalar() or 0
        
        # Low stock products
        low_stock_products = []
        for product in Product.query.all():
            if product.is_low_stock():
                low_stock_products.append({
                    'id': product.id,
                    'name': product.name,
                    'current_stock': product.get_total_quantity(),
                    'reorder_point': product.reorder_point
                })
        
        # Expired items
        expired_items = Inventory.query.filter(
            Inventory.expiration_date < date.today()
        ).count()
        
        # Expiring soon (within 30 days)
        thirty_days_from_now = date.today() + timedelta(days=30)
        expiring_soon = Inventory.query.filter(
            and_(
                Inventory.expiration_date <= thirty_days_from_now,
                Inventory.expiration_date >= date.today()
            )
        ).count()
        
        return jsonify({
            'summary': {
                'total_products': total_products,
                'total_categories': total_categories,
                'total_suppliers': total_suppliers,
                'total_inventory_items': total_inventory_items,
                'total_stock_value': round(total_stock_value, 2),
                'low_stock_count': len(low_stock_products),
                'expired_items': expired_items,
                'expiring_soon': expiring_soon
            },
            'low_stock_products': low_stock_products
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/reports/sales-summary', methods=['GET'])
@login_required
def sales_summary_report():
    """Get sales summary report with time periods"""
    try:
        today = date.today()
        
        # Today's sales
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_sales = Transaction.query.filter(
            and_(
                Transaction.transaction_type == 'sale',
                Transaction.transaction_date >= today_start,
                Transaction.transaction_date <= today_end
            )
        ).count()
        
        today_quantity = db.session.query(func.sum(Transaction.quantity)).filter(
            and_(
                Transaction.transaction_type == 'sale',
                Transaction.transaction_date >= today_start,
                Transaction.transaction_date <= today_end
            )
        ).scalar() or 0
        
        # This week's sales
        week_start = today - timedelta(days=today.weekday())
        week_start_dt = datetime.combine(week_start, datetime.min.time())
        
        week_sales = Transaction.query.filter(
            and_(
                Transaction.transaction_type == 'sale',
                Transaction.transaction_date >= week_start_dt
            )
        ).count()
        
        # This month's sales
        month_start = today.replace(day=1)
        month_start_dt = datetime.combine(month_start, datetime.min.time())
        
        month_sales = Transaction.query.filter(
            and_(
                Transaction.transaction_type == 'sale',
                Transaction.transaction_date >= month_start_dt
            )
        ).count()
        
        # Top selling products (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        thirty_days_ago_dt = datetime.combine(thirty_days_ago, datetime.min.time())
        
        top_products = db.session.query(
            Product.name,
            func.sum(Transaction.quantity).label('total_sold')
        ).join(Transaction).filter(
            and_(
                Transaction.transaction_type == 'sale',
                Transaction.transaction_date >= thirty_days_ago_dt
            )
        ).group_by(Product.id).order_by(func.sum(Transaction.quantity).desc()).limit(10).all()
        
        return jsonify({
            'sales_summary': {
                'today_sales': today_sales,
                'today_quantity': today_quantity,
                'week_sales': week_sales,
                'month_sales': month_sales
            },
            'top_products': [
                {'name': product.name, 'quantity_sold': int(quantity)}
                for product, quantity in top_products
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/reports/expiration-report', methods=['GET'])
@login_required
def expiration_report():
    """Get detailed expiration report"""
    try:
        today = date.today()
        
        # Expired items
        expired_items = db.session.query(
            Inventory, Product
        ).join(Product).filter(
            Inventory.expiration_date < today
        ).all()
        
        # Expiring within 7 days
        seven_days_from_now = today + timedelta(days=7)
        expiring_week = db.session.query(
            Inventory, Product
        ).join(Product).filter(
            and_(
                Inventory.expiration_date <= seven_days_from_now,
                Inventory.expiration_date >= today
            )
        ).all()
        
        # Expiring within 30 days
        thirty_days_from_now = today + timedelta(days=30)
        expiring_month = db.session.query(
            Inventory, Product
        ).join(Product).filter(
            and_(
                Inventory.expiration_date <= thirty_days_from_now,
                Inventory.expiration_date > seven_days_from_now
            )
        ).all()
        
        def format_expiration_items(items):
            return [
                {
                    'inventory_id': inventory.id,
                    'product_name': product.name,
                    'batch_number': inventory.batch_number,
                    'expiration_date': inventory.expiration_date.isoformat(),
                    'quantity': inventory.quantity,
                    'days_until_expiry': (inventory.expiration_date - today).days,
                    'location': inventory.location
                }
                for inventory, product in items
            ]
        
        return jsonify({
            'expired_items': format_expiration_items(expired_items),
            'expiring_this_week': format_expiration_items(expiring_week),
            'expiring_this_month': format_expiration_items(expiring_month)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/reports/supplier-report', methods=['GET'])
@login_required
def supplier_report():
    """Get supplier performance report"""
    try:
        # Get all suppliers with their inventory statistics
        suppliers_data = []
        
        for supplier in Supplier.query.all():
            # Count inventory items from this supplier
            inventory_count = Inventory.query.filter_by(supplier_id=supplier.id).count()
            
            # Total quantity received from this supplier
            total_quantity = db.session.query(func.sum(Inventory.quantity)).filter_by(
                supplier_id=supplier.id
            ).scalar() or 0
            
            # Count of different products from this supplier
            unique_products = db.session.query(func.count(func.distinct(Inventory.product_id))).filter_by(
                supplier_id=supplier.id
            ).scalar() or 0
            
            # Recent deliveries (last 30 days)
            thirty_days_ago = date.today() - timedelta(days=30)
            recent_deliveries = Inventory.query.filter(
                and_(
                    Inventory.supplier_id == supplier.id,
                    Inventory.date_received >= thirty_days_ago
                )
            ).count()
            
            suppliers_data.append({
                'supplier': supplier.to_dict(),
                'statistics': {
                    'total_inventory_items': inventory_count,
                    'total_quantity_received': total_quantity,
                    'unique_products': unique_products,
                    'recent_deliveries': recent_deliveries
                }
            })
        
        return jsonify({'suppliers': suppliers_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/reports/category-analysis', methods=['GET'])
@login_required
def category_analysis():
    """Get category-wise analysis"""
    try:
        categories_data = []
        
        for category in Category.query.all():
            # Count products in this category
            product_count = Product.query.filter_by(category_id=category.id).count()
            
            # Total stock value for this category
            total_value = db.session.query(
                func.sum(Inventory.quantity * Product.price)
            ).join(Product).filter(Product.category_id == category.id).scalar() or 0
            
            # Total quantity in stock
            total_quantity = db.session.query(
                func.sum(Inventory.quantity)
            ).join(Product).filter(Product.category_id == category.id).scalar() or 0
            
            # Sales in last 30 days
            thirty_days_ago = date.today() - timedelta(days=30)
            thirty_days_ago_dt = datetime.combine(thirty_days_ago, datetime.min.time())
            
            sales_quantity = db.session.query(
                func.sum(Transaction.quantity)
            ).join(Product).filter(
                and_(
                    Product.category_id == category.id,
                    Transaction.transaction_type == 'sale',
                    Transaction.transaction_date >= thirty_days_ago_dt
                )
            ).scalar() or 0
            
            categories_data.append({
                'category': category.to_dict(),
                'statistics': {
                    'product_count': product_count,
                    'total_stock_value': round(total_value, 2),
                    'total_quantity': total_quantity,
                    'sales_last_30_days': sales_quantity
                }
            })
        
        return jsonify({'categories': categories_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/reports/transaction-history', methods=['GET'])
@login_required
def transaction_history_report():
    """Get transaction history with filtering"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        transaction_type = request.args.get('transaction_type')
        
        query = Transaction.query
        
        # Apply date filters
        if start_date:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Transaction.transaction_date >= start_dt)
        
        if end_date:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
            query = query.filter(Transaction.transaction_date <= end_dt)
        
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        # Get transactions with pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        transactions = query.order_by(Transaction.transaction_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Calculate summary statistics for the filtered data
        total_transactions = query.count()
        
        # Group by transaction type
        type_summary = db.session.query(
            Transaction.transaction_type,
            func.count(Transaction.id).label('count'),
            func.sum(Transaction.quantity).label('total_quantity')
        ).filter(
            Transaction.id.in_([t.id for t in query.all()])
        ).group_by(Transaction.transaction_type).all()
        
        return jsonify({
            'transactions': [t.to_dict() for t in transactions.items],
            'pagination': {
                'page': page,
                'pages': transactions.pages,
                'per_page': per_page,
                'total': transactions.total
            },
            'summary': {
                'total_transactions': total_transactions,
                'by_type': [
                    {
                        'type': t_type,
                        'count': count,
                        'total_quantity': total_quantity
                    }
                    for t_type, count, total_quantity in type_summary
                ]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

