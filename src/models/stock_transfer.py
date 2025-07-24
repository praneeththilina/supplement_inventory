from src.models.user import db
from datetime import datetime

class StockTransfer(db.Model):
    __tablename__ = 'stock_transfers'
    
    id = db.Column(db.Integer, primary_key=True)
    transfer_number = db.Column(db.String(50), unique=True, nullable=False)
    from_store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    to_store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, in_transit, completed, cancelled
    transfer_date = db.Column(db.DateTime, default=datetime.utcnow)
    completed_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    transfer_items = db.relationship('StockTransferItem', backref='transfer', lazy=True, cascade='all, delete-orphan')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_transfers')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_transfers')
    
    def to_dict(self):
        return {
            'id': self.id,
            'transfer_number': self.transfer_number,
            'from_store_id': self.from_store_id,
            'from_store_name': self.from_store.name if self.from_store else None,
            'to_store_id': self.to_store_id,
            'to_store_name': self.to_store.name if self.to_store else None,
            'status': self.status,
            'transfer_date': self.transfer_date.isoformat() if self.transfer_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'notes': self.notes,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            'approved_by': self.approved_by,
            'approver_name': self.approver.username if self.approver else None,
            'items': [item.to_dict() for item in self.transfer_items]
        }
    
    def __repr__(self):
        return f'<StockTransfer {self.transfer_number}>'

class StockTransferItem(db.Model):
    __tablename__ = 'stock_transfer_items'
    
    id = db.Column(db.Integer, primary_key=True)
    transfer_id = db.Column(db.Integer, db.ForeignKey('stock_transfers.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_flavor_id = db.Column(db.Integer, db.ForeignKey('product_flavors.id'))
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'))  # Source inventory batch
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2))
    notes = db.Column(db.Text)
    
    # Relationships
    product = db.relationship('Product', backref='transfer_items')
    inventory = db.relationship('Inventory', backref='transfer_items')
    product_flavor = db.relationship('ProductFlavor', back_populates='transfer_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'transfer_id': self.transfer_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_flavor_id': self.product_flavor_id,
            'flavor_name': self.product_flavor.flavor.name if self.product_flavor and self.product_flavor.flavor else None,
            'inventory_id': self.inventory_id,
            'batch_number': self.inventory.batch_number if self.inventory else None,
            'quantity': self.quantity,
            'unit_cost': float(self.unit_cost) if self.unit_cost else None,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<StockTransferItem {self.product.name if self.product else "Unknown"} - {self.quantity}>'

