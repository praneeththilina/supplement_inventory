import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_login import LoginManager
from flask_cors import CORS
from src.models.user import User, db
from src.models.product import Product, Category
from src.models.supplier import Supplier
from src.models.inventory import Inventory
from src.models.transaction import Transaction
from src.models.store import Store
from src.models.flavor import Flavor, ProductFlavor
from src.models.stock_transfer import StockTransfer, StockTransferItem
from src.models.sale import Sale, SaleItem
from src.models.grn import GRN, GRNItem
from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.products import products_bp
from src.routes.catelogy import category_bp
from src.routes.inventory import inventory_bp
from src.routes.suppliers import suppliers_bp
from src.routes.transactions import transactions_bp
from src.routes.reports import reports_bp
from src.routes.seed_data import seed_bp
from src.routes.stores import stores_bp
from src.routes.flavors import flavors_bp
from src.routes.stock_transfers import stock_transfers_bp
from src.routes.sales import sales_bp
from src.routes.grn import grn_bp
from src.routes.invoices import invoices_bp
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(products_bp, url_prefix='/api')
app.register_blueprint(category_bp, url_prefix='/api')
app.register_blueprint(inventory_bp, url_prefix='/api')
app.register_blueprint(suppliers_bp, url_prefix='/api')
app.register_blueprint(transactions_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')
app.register_blueprint(seed_bp, url_prefix='/api')
app.register_blueprint(stores_bp, url_prefix='/api')
app.register_blueprint(flavors_bp, url_prefix='/api')
app.register_blueprint(stock_transfers_bp, url_prefix='/api')
app.register_blueprint(sales_bp, url_prefix='/api')
app.register_blueprint(grn_bp, url_prefix='/api')
app.register_blueprint(invoices_bp, url_prefix='/api')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create tables and initial admin user
with app.app_context():
    db.create_all()
    
    # Create initial admin user if no users exist
    if User.query.count() == 0:
        admin_user = User(
            username='admin',
            email='admin@supplementshop.com',
            role='admin'
        )
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        db.session.commit()
        print("Created initial admin user: admin / admin123")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)