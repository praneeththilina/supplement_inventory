from src.models.user import db
from datetime import datetime

class Store(db.Model):
    __tablename__ = 'stores'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    manager_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    inventory_items = db.relationship('Inventory', backref='store', lazy=True)
    sales = db.relationship('Sale', backref='store', lazy=True)
    transfers_from = db.relationship('StockTransfer', foreign_keys='StockTransfer.from_store_id', backref='from_store', lazy=True)
    transfers_to = db.relationship('StockTransfer', foreign_keys='StockTransfer.to_store_id', backref='to_store', lazy=True)
    grns = db.relationship('GRN', backref='store', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            'manager_name': self.manager_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Store {self.name}>'

