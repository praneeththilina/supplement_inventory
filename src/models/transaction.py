from src.models.user import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'))
    # FIX: Added store_id to link each transaction directly to a store
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)
    transaction_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notes = db.Column(db.Text)
    unit_price = db.Column(db.Numeric(10, 2)) # Price per unit for this transaction
    total = db.Column(db.Numeric(10, 2)) # Total value of the transaction line
    reference = db.Column(db.String(100)) # Reference to Sale Invoice, GRN, etc.

    # Relationships
    store = db.relationship('Store', backref='transactions')
    
    def __repr__(self):
        return f'<Transaction {self.transaction_type} - {self.product.name if self.product else "Unknown"} - {self.quantity}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'inventory_id': self.inventory_id,
            'store_id': self.store_id,
            'store_name': self.store.name if self.store else None,
            'quantity': self.quantity,
            'transaction_type': self.transaction_type,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'notes': self.notes,
            'unit_price': float(self.unit_price) if self.unit_price else 0,
            'total': float(self.total) if self.total else 0,
            'reference': self.reference
        }
