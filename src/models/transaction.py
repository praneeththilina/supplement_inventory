from src.models.user import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'))  # Optional, for specific batch tracking
    quantity = db.Column(db.Integer, nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'sale', 'restock', 'adjustment', 'return'
    transaction_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notes = db.Column(db.Text)  # Optional notes for the transaction
    
    def __repr__(self):
        return f'<Transaction {self.transaction_type} - {self.product.name if self.product else "Unknown"} - {self.quantity}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'inventory_id': self.inventory_id,
            'batch_number': self.inventory_item.batch_number if self.inventory_item else None,
            'quantity': self.quantity,
            'transaction_type': self.transaction_type,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'notes': self.notes
        }

