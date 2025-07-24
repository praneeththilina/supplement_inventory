from src.models.user import db
from datetime import datetime

class Sale(db.Model):
    __tablename__ = 'sales'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(20))
    customer_email = db.Column(db.String(100))
    sale_date = db.Column(db.DateTime, default=datetime.utcnow)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    discount_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    payment_method = db.Column(db.String(20), default='cash')  # cash, card, online, etc.
    payment_status = db.Column(db.String(20), default='paid')  # paid, pending, partial
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    sale_items = db.relationship('SaleItem', backref='sale', lazy=True, cascade='all, delete-orphan')
    creator = db.relationship('User', backref='sales_created')
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'store_id': self.store_id,
            'store_name': self.store.name if self.store else None,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'customer_email': self.customer_email,
            'sale_date': self.sale_date.isoformat() if self.sale_date else None,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'tax_amount': float(self.tax_amount) if self.tax_amount else 0,
            'discount_amount': float(self.discount_amount) if self.discount_amount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'notes': self.notes,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            'items': [item.to_dict() for item in self.sale_items]
        }
    
    def calculate_totals(self):
        """Calculate and update sale totals based on items"""
        self.subtotal = sum(item.line_total for item in self.sale_items)
        self.total_amount = self.subtotal + (self.tax_amount or 0) - (self.discount_amount or 0)
    
    def __repr__(self):
        return f'<Sale {self.invoice_number}>'

class SaleItem(db.Model):
    __tablename__ = 'sale_items'
    
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sales.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_flavor_id = db.Column(db.Integer, db.ForeignKey('product_flavors.id'))
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'))  # Source inventory batch
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2))  # For profit calculation
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    discount_amount = db.Column(db.Numeric(10, 2), default=0)
    
    # Relationships
    product = db.relationship('Product', backref='sale_items')
    inventory = db.relationship('Inventory', backref='sale_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'sale_id': self.sale_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'product_flavor_id': self.product_flavor_id,
            'flavor_name': self.product_flavor.flavor.name if self.product_flavor and self.product_flavor.flavor else None,
            'inventory_id': self.inventory_id,
            'batch_number': self.inventory.batch_number if self.inventory else None,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price) if self.unit_price else 0,
            'unit_cost': float(self.unit_cost) if self.unit_cost else 0,
            'line_total': float(self.line_total) if self.line_total else 0,
            'discount_amount': float(self.discount_amount) if self.discount_amount else 0,
            'profit': float(self.line_total - (self.unit_cost * self.quantity)) if self.unit_cost and self.line_total else 0
        }
    
    def calculate_line_total(self):
        """Calculate line total based on quantity and unit price"""
        self.line_total = (self.quantity * self.unit_price) - (self.discount_amount or 0)
    
    def __repr__(self):
        return f'<SaleItem {self.product.name if self.product else "Unknown"} - {self.quantity}>'

