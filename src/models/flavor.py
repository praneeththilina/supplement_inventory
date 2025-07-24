from src.models.user import db
from datetime import datetime

class Flavor(db.Model):
    __tablename__ = 'flavors'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    product_flavors = db.relationship('ProductFlavor', backref='flavor', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Flavor {self.name}>'

class ProductFlavor(db.Model):
    __tablename__ = 'product_flavors'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    flavor_id = db.Column(db.Integer, db.ForeignKey('flavors.id'), nullable=False)
    sku_suffix = db.Column(db.String(20))  # e.g., "-VAN" for vanilla
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    inventory_items = db.relationship('Inventory', backref='product_flavor', lazy=True)
    sale_items = db.relationship('SaleItem', backref='product_flavor', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'flavor_id': self.flavor_id,
            'flavor_name': self.flavor.name if self.flavor else None,
            'sku_suffix': self.sku_suffix,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @property
    def full_sku(self):
        """Generate full SKU including flavor suffix"""
        base_sku = self.product.sku if self.product else ''
        return f"{base_sku}{self.sku_suffix}" if self.sku_suffix else base_sku
    
    def __repr__(self):
        return f'<ProductFlavor {self.product.name if self.product else "Unknown"} - {self.flavor.name if self.flavor else "Unknown"}>'

