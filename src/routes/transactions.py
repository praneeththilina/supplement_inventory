from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime
from src.models.user import db
from src.models.transaction import Transaction

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/transactions', methods=['GET'])
@login_required
def get_transactions():
    """Get all transactions with optional filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    product_id = request.args.get('product_id', type=int)
    transaction_type = request.args.get('transaction_type')
    user_id = request.args.get('user_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Transaction.query
    
    # Apply filters
    if product_id:
        query = query.filter(Transaction.product_id == product_id)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    if user_id:
        query = query.filter(Transaction.user_id == user_id)
    
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Transaction.transaction_date >= start_dt)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            # Add one day to include the entire end date
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
            query = query.filter(Transaction.transaction_date <= end_dt)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    # Order by most recent first
    query = query.order_by(Transaction.transaction_date.desc())
    
    transactions = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'transactions': [transaction.to_dict() for transaction in transactions.items],
        'total': transactions.total,
        'pages': transactions.pages,
        'current_page': page
    }), 200

@transactions_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
@login_required
def get_transaction(transaction_id):
    """Get specific transaction"""
    transaction = Transaction.query.get_or_404(transaction_id)
    return jsonify(transaction.to_dict()), 200

@transactions_bp.route('/transactions/summary', methods=['GET'])
@login_required
def get_transaction_summary():
    """Get transaction summary statistics"""
    from sqlalchemy import func
    from datetime import date, timedelta
    
    # Get today's transactions
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    today_sales = Transaction.query.filter(
        Transaction.transaction_type == 'sale',
        Transaction.transaction_date >= today_start,
        Transaction.transaction_date <= today_end
    ).count()
    
    # Get this week's transactions
    week_start = today - timedelta(days=today.weekday())
    week_start_dt = datetime.combine(week_start, datetime.min.time())
    
    week_sales = Transaction.query.filter(
        Transaction.transaction_type == 'sale',
        Transaction.transaction_date >= week_start_dt
    ).count()
    
    # Get this month's transactions
    month_start = today.replace(day=1)
    month_start_dt = datetime.combine(month_start, datetime.min.time())
    
    month_sales = Transaction.query.filter(
        Transaction.transaction_type == 'sale',
        Transaction.transaction_date >= month_start_dt
    ).count()
    
    # Get total quantities sold today
    today_quantity = db.session.query(func.sum(Transaction.quantity)).filter(
        Transaction.transaction_type == 'sale',
        Transaction.transaction_date >= today_start,
        Transaction.transaction_date <= today_end
    ).scalar() or 0
    
    return jsonify({
        'today_sales': today_sales,
        'week_sales': week_sales,
        'month_sales': month_sales,
        'today_quantity_sold': today_quantity
    }), 200

@transactions_bp.route('/transactions/types', methods=['GET'])
@login_required
def get_transaction_types():
    """Get available transaction types"""
    return jsonify([
        'sale',
        'restock',
        'adjustment',
        'return'
    ]), 200

