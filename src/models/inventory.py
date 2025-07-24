from src.models.user import db
from datetime import datetime, date

class Inventory(db.Model):
    __tablename__ = 'inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_flavor_id = db.Column(db.Integer, db.ForeignKey('product_flavors.id'))
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'))
    batch_number = db.Column(db.String(50), nullable=False)
    expiration_date = db.Column(db.Date)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    unit_cost = db.Column(db.Numeric(10, 2))  # Cost per unit for this batch
    location = db.Column(db.String(100))  # Warehouse location
    date_received = db.Column(db.Date, default=date.today)
    grn_id = db.Column(db.Integer, db.ForeignKey('grns.id'))  # Link to GRN
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = db.relationship('Supplier')
    grn = db.relationship('GRN')
    transactions = db.relationship('Transaction', backref='inventory', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'product_flavor_id': self.product_flavor_id,
            'flavor_name': self.product_flavor.flavor.name if self.product_flavor and self.product_flavor.flavor else None,
            'store_id': self.store_id,
            'store_name': self.store.name if self.store else None,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'batch_number': self.batch_number,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'quantity': self.quantity,
            'unit_cost': float(self.unit_cost) if self.unit_cost else 0,
            'location': self.location,
            'date_received': self.date_received.isoformat() if self.date_received else None,
            'grn_id': self.grn_id,
            'grn_number': self.grn.grn_number if self.grn else None,
            'notes': self.notes,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'days_until_expiry': self.days_until_expiry(),
            'is_expired': self.is_expired(),
            'is_expiring_soon': self.is_expiring_soon()
        }
    
    def days_until_expiry(self):
        """Calculate days until expiration"""
        if self.expiration_date:
            delta = self.expiration_date - date.today()
            return delta.days
        return None
    
    def is_expired(self):
        """Check if item is expired"""
        if self.expiration_date:
            return self.expiration_date < date.today()
        return False
    
    def is_expiring_soon(self, days=30):
        """Check if item is expiring within specified days"""
        if self.expiration_date:
            days_until = self.days_until_expiry()
            return days_until is not None and 0 <= days_until <= days
        return False
    
    def get_total_value(self):
        """Calculate total value of this inventory item"""
        if self.unit_cost and self.quantity:
            return float(self.unit_cost) * self.quantity
        return 0
    
    def __repr__(self):
        return f'<Inventory {self.product.name if self.product else "Unknown"} - Batch: {self.batch_number}>'

