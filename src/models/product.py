from src.models.user import db
from datetime import datetime

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    products = db.relationship('Product', backref='category', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Category {self.name}>'

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    description = db.Column(db.Text)
    weight_volume = db.Column(db.String(50))
    cost_price = db.Column(db.Numeric(10, 2), default=0)  # Purchase cost
    selling_price = db.Column(db.Numeric(10, 2), default=0)  # Selling price
    price = db.Column(db.Numeric(10, 2), default=0)  # Legacy field for compatibility
    reorder_point = db.Column(db.Integer, default=10)
    is_active = db.Column(db.Boolean, default=True)
    has_flavors = db.Column(db.Boolean, default=False)  # Whether this product has flavor variants
    image_url = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    inventory_items = db.relationship('Inventory', backref='product', lazy=True)
    product_flavors = db.relationship('ProductFlavor', backref='product', lazy=True)
    transactions = db.relationship('Transaction', backref='product', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'description': self.description,
            'weight_volume': self.weight_volume,
            'cost_price': float(self.cost_price) if self.cost_price else 0,
            'selling_price': float(self.selling_price) if self.selling_price else 0,
            'price': float(self.price) if self.price else 0,
            'reorder_point': self.reorder_point,
            'is_active': self.is_active,
            'has_flavors': self.has_flavors,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'total_quantity': self.get_total_quantity(),
            'flavors': [pf.to_dict() for pf in self.product_flavors if pf.is_active] if self.has_flavors else []
        }
    
    def get_total_quantity(self, store_id=None):
        """Get total quantity across all inventory items"""
        query = self.inventory_items
        if store_id:
            query = [item for item in query if item.store_id == store_id]
        return sum(item.quantity for item in query)
    
    def get_quantity_by_flavor(self, flavor_id, store_id=None):
        """Get quantity for a specific flavor"""
        from src.models.inventory import Inventory
        from src.models.flavor import ProductFlavor
        query = Inventory.query.join(ProductFlavor).filter(
            Inventory.product_id == self.id,
            ProductFlavor.flavor_id == flavor_id
        )
        if store_id:
            query = query.filter(Inventory.store_id == store_id)
        return sum(item.quantity for item in query)
    
    def is_low_stock(self, store_id=None):
        """Check if product is below reorder point"""
        return self.get_total_quantity(store_id) <= self.reorder_point
    
    def get_profit_margin(self):
        """Calculate profit margin percentage"""
        if self.cost_price and self.selling_price and self.cost_price > 0:
            return ((self.selling_price - self.cost_price) / self.cost_price) * 100
        return 0
    
    def __repr__(self):
        return f'<Product {self.name}>'

