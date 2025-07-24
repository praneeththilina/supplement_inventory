from src.models.user import db
from datetime import datetime

class GRN(db.Model):
    __tablename__ = 'grns'
    
    id = db.Column(db.Integer, primary_key=True)
    grn_number = db.Column(db.String(50), unique=True, nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    purchase_order_number = db.Column(db.String(50))
    invoice_number = db.Column(db.String(50))
    received_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.String(20), default='received')  # received, verified, completed
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    verified_date = db.Column(db.DateTime)
    
    # Relationships
    grn_items = db.relationship('GRNItem', backref='grn', lazy=True, cascade='all, delete-orphan')
    supplier = db.relationship('Supplier', backref='grns')
    creator = db.relationship('User', foreign_keys=[created_by], backref='grns_created')
    verifier = db.relationship('User', foreign_keys=[verified_by], backref='grns_verified')
    
    def to_dict(self):
        return {
            'id': self.id,
            'grn_number': self.grn_number,
            'store_id': self.store_id,
            'store_name': self.store.name if self.store else None,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'purchase_order_number': self.purchase_order_number,
            'invoice_number': self.invoice_number,
            'received_date': self.received_date.isoformat() if self.received_date else None,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'status': self.status,
            'notes': self.notes,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            'verified_by': self.verified_by,
            'verifier_name': self.verifier.username if self.verifier else None,
            'verified_date': self.verified_date.isoformat() if self.verified_date else None,
            'items': [item.to_dict() for item in self.grn_items]
        }
    
    def calculate_total(self):
        """Calculate total amount based on GRN items"""
        self.total_amount = sum(item.line_total for item in self.grn_items)
    
    def __repr__(self):
        return f'<GRN {self.grn_number}>'

class GRNItem(db.Model):
    __tablename__ = 'grn_items'
    
    id = db.Column(db.Integer, primary_key=True)
    grn_id = db.Column(db.Integer, db.ForeignKey('grns.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_flavor_id = db.Column(db.Integer, db.ForeignKey('product_flavors.id'))
    quantity_ordered = db.Column(db.Integer, default=0)
    quantity_received = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    batch_number = db.Column(db.String(50))
    expiration_date = db.Column(db.Date)
    location = db.Column(db.String(100))
    notes = db.Column(db.Text)
    
    # Relationships
    product = db.relationship('Product', backref='grn_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'grn_id': self.grn_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'product_flavor_id': self.product_flavor_id,
            'flavor_name': self.product_flavor.flavor.name if self.product_flavor and self.product_flavor.flavor else None,
            'quantity_ordered': self.quantity_ordered,
            'quantity_received': self.quantity_received,
            'unit_cost': float(self.unit_cost) if self.unit_cost else 0,
            'line_total': float(self.line_total) if self.line_total else 0,
            'batch_number': self.batch_number,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'location': self.location,
            'notes': self.notes
        }
    
    def calculate_line_total(self):
        """Calculate line total based on quantity and unit cost"""
        self.line_total = self.quantity_received * self.unit_cost
    
    def __repr__(self):
        return f'<GRNItem {self.product.name if self.product else "Unknown"} - {self.quantity_received}>'

