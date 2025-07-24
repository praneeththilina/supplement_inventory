from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from datetime import date, timedelta
from src.models.user import db
from src.models.product import Product, Category
from src.models.supplier import Supplier
from src.models.inventory import Inventory
from src.models.transaction import Transaction
from src.models.store import Store
from src.models.flavor import Flavor, ProductFlavor
from src.models.sale import Sale, SaleItem
from src.models.grn import GRN, GRNItem
from decimal import Decimal

seed_bp = Blueprint('seed', __name__)

@seed_bp.route('/seed-data', methods=['POST'])
@login_required
def seed_data():
    """Populate the database with comprehensive sample data"""
    try:
        # Clear existing data
        db.session.query(SaleItem).delete()
        db.session.query(Sale).delete()
        db.session.query(GRNItem).delete()
        db.session.query(GRN).delete()
        db.session.query(Transaction).delete()
        db.session.query(Inventory).delete()
        db.session.query(ProductFlavor).delete()
        db.session.query(Product).delete()
        db.session.query(Category).delete()
        db.session.query(Supplier).delete()
        db.session.query(Store).delete()
        db.session.query(Flavor).delete()
        
        # Create stores
        stores_data = [
            {'name': 'Main Store', 'address': '123 Health St, Wellness City', 'phone': '555-0101', 'email': 'main@supplementshop.com', 'manager_name': 'John Smith'},
            {'name': 'Downtown Branch', 'address': '456 Fitness Ave, Downtown', 'phone': '555-0102', 'email': 'downtown@supplementshop.com', 'manager_name': 'Sarah Johnson'},
            {'name': 'Mall Location', 'address': '789 Shopping Mall, Level 2', 'phone': '555-0103', 'email': 'mall@supplementshop.com', 'manager_name': 'Mike Wilson'},
        ]
        
        stores = []
        for store_data in stores_data:
            store = Store(**store_data)
            db.session.add(store)
            stores.append(store)
        
        db.session.flush()
        
        # Create flavors
        flavors_data = [
            {'name': 'Vanilla', 'description': 'Classic vanilla flavor'},
            {'name': 'Chocolate', 'description': 'Rich chocolate flavor'},
            {'name': 'Strawberry', 'description': 'Sweet strawberry flavor'},
            {'name': 'Banana', 'description': 'Natural banana flavor'},
            {'name': 'Cookies & Cream', 'description': 'Cookies and cream flavor'},
            {'name': 'Mint', 'description': 'Refreshing mint flavor'},
            {'name': 'Berry', 'description': 'Mixed berry flavor'},
            {'name': 'Unflavored', 'description': 'No added flavor'},
        ]
        
        flavors = []
        for flavor_data in flavors_data:
            flavor = Flavor(**flavor_data)
            db.session.add(flavor)
            flavors.append(flavor)
        
        db.session.flush()
        
        # Create categories
        categories_data = [
            {'name': 'Vitamins', 'description': 'Essential vitamins and vitamin complexes'},
            {'name': 'Minerals', 'description': 'Essential minerals and trace elements'},
            {'name': 'Protein Supplements', 'description': 'Protein powders and amino acids'},
            {'name': 'Herbal Supplements', 'description': 'Natural herbal extracts and compounds'},
            {'name': 'Probiotics', 'description': 'Beneficial bacteria and digestive health'},
            {'name': 'Omega-3 & Fish Oil', 'description': 'Essential fatty acids and fish oils'},
            {'name': 'Sports Nutrition', 'description': 'Pre-workout, post-workout, and performance supplements'},
            {'name': 'Weight Management', 'description': 'Weight loss and metabolism support'},
        ]
        
        categories = []
        for cat_data in categories_data:
            category = Category(**cat_data)
            db.session.add(category)
            categories.append(category)
        
        db.session.flush()
        
        # Create suppliers
        suppliers_data = [
            {'name': 'VitaMax Distributors', 'contact_person': 'Robert Chen', 'email': 'orders@vitamax.com', 'phone': '555-1001'},
            {'name': 'HealthPro Supply Co', 'contact_person': 'Lisa Martinez', 'email': 'sales@healthpro.com', 'phone': '555-1002'},
            {'name': 'NutriSource International', 'contact_person': 'David Kim', 'email': 'info@nutrisource.com', 'phone': '555-1003'},
            {'name': 'Pure Supplements Ltd', 'contact_person': 'Emma Thompson', 'email': 'orders@puresupplements.com', 'phone': '555-1004'},
        ]
        
        suppliers = []
        for supplier_data in suppliers_data:
            supplier = Supplier(**supplier_data)
            db.session.add(supplier)
            suppliers.append(supplier)
        
        db.session.flush()
        
        # Create products with enhanced data
        products_data = [
            {'name': 'Vitamin D3 1000 IU', 'sku': 'VD3-1000', 'category_id': categories[0].id, 'description': 'High-quality Vitamin D3 for bone health', 'weight_volume': '60 capsules', 'cost_price': Decimal('8.50'), 'selling_price': Decimal('19.99'), 'reorder_point': 50, 'has_flavors': False},
            {'name': 'Vitamin C 500mg', 'sku': 'VC-500', 'category_id': categories[0].id, 'description': 'Immune support vitamin C', 'weight_volume': '100 tablets', 'cost_price': Decimal('6.75'), 'selling_price': Decimal('15.99'), 'reorder_point': 30, 'has_flavors': False},
            {'name': 'Magnesium Glycinate', 'sku': 'MG-GLY', 'category_id': categories[1].id, 'description': 'Highly absorbable magnesium', 'weight_volume': '90 capsules', 'cost_price': Decimal('12.00'), 'selling_price': Decimal('24.99'), 'reorder_point': 25, 'has_flavors': False},
            {'name': 'Whey Protein Isolate', 'sku': 'WP-ISO-2LB', 'category_id': categories[2].id, 'description': 'Premium whey protein isolate', 'weight_volume': '2 lbs', 'cost_price': Decimal('18.50'), 'selling_price': Decimal('39.99'), 'reorder_point': 20, 'has_flavors': True},
            {'name': 'Omega-3 Fish Oil', 'sku': 'O3-FO-1000', 'category_id': categories[5].id, 'description': 'High-potency omega-3 fatty acids', 'weight_volume': '120 softgels', 'cost_price': Decimal('14.25'), 'selling_price': Decimal('29.99'), 'reorder_point': 35, 'has_flavors': False},
            {'name': 'Turmeric Curcumin', 'sku': 'TUR-CUR', 'category_id': categories[3].id, 'description': 'Anti-inflammatory turmeric extract', 'weight_volume': '60 capsules', 'cost_price': Decimal('10.50'), 'selling_price': Decimal('22.99'), 'reorder_point': 40, 'has_flavors': False},
            {'name': 'Probiotic Complex', 'sku': 'PROB-50B', 'category_id': categories[4].id, 'description': '50 billion CFU probiotic blend', 'weight_volume': '30 capsules', 'cost_price': Decimal('16.75'), 'selling_price': Decimal('34.99'), 'reorder_point': 15, 'has_flavors': False},
            {'name': 'BCAA Powder', 'sku': 'BCAA-PWD', 'category_id': categories[6].id, 'description': 'Branched-chain amino acids', 'weight_volume': '300g', 'cost_price': Decimal('13.25'), 'selling_price': Decimal('27.99'), 'reorder_point': 30, 'has_flavors': True},
            {'name': 'Green Tea Extract', 'sku': 'GTE-500', 'category_id': categories[7].id, 'description': 'Standardized green tea extract', 'weight_volume': '90 capsules', 'cost_price': Decimal('9.00'), 'selling_price': Decimal('18.99'), 'reorder_point': 45, 'has_flavors': False},
            {'name': 'Zinc Picolinate', 'sku': 'ZN-PIC-30', 'category_id': categories[1].id, 'description': 'Highly bioavailable zinc', 'weight_volume': '60 tablets', 'cost_price': Decimal('5.50'), 'selling_price': Decimal('12.99'), 'reorder_point': 50, 'has_flavors': False},
            {'name': 'Creatine Monohydrate', 'sku': 'CREAT-MONO', 'category_id': categories[6].id, 'description': 'Pure creatine monohydrate powder', 'weight_volume': '500g', 'cost_price': Decimal('11.00'), 'selling_price': Decimal('24.99'), 'reorder_point': 25, 'has_flavors': True},
            {'name': 'Multivitamin Complex', 'sku': 'MULTI-COMP', 'category_id': categories[0].id, 'description': 'Complete daily multivitamin', 'weight_volume': '90 tablets', 'cost_price': Decimal('15.50'), 'selling_price': Decimal('32.99'), 'reorder_point': 30, 'has_flavors': False},
        ]
        
        products = []
        for product_data in products_data:
            product = Product(**product_data)
            db.session.add(product)
            products.append(product)
        
        db.session.flush()
        
        # Create product flavors for products that have flavors
        flavor_products = [p for p in products if p.has_flavors]
        
        # Whey Protein flavors
        whey_protein = next(p for p in products if p.sku == 'WP-ISO-2LB')
        whey_flavors = [
            {'product_id': whey_protein.id, 'flavor_id': flavors[0].id, 'sku_suffix': '-VAN'},  # Vanilla
            {'product_id': whey_protein.id, 'flavor_id': flavors[1].id, 'sku_suffix': '-CHOC'},  # Chocolate
            {'product_id': whey_protein.id, 'flavor_id': flavors[2].id, 'sku_suffix': '-STRAW'},  # Strawberry
            {'product_id': whey_protein.id, 'flavor_id': flavors[4].id, 'sku_suffix': '-CC'},  # Cookies & Cream
        ]
        
        # BCAA flavors
        bcaa = next(p for p in products if p.sku == 'BCAA-PWD')
        bcaa_flavors = [
            {'product_id': bcaa.id, 'flavor_id': flavors[6].id, 'sku_suffix': '-BERRY'},  # Berry
            {'product_id': bcaa.id, 'flavor_id': flavors[7].id, 'sku_suffix': '-UF'},  # Unflavored
            {'product_id': bcaa.id, 'flavor_id': flavors[0].id, 'sku_suffix': '-VAN'},  # Vanilla
        ]
        
        # Creatine flavors
        creatine = next(p for p in products if p.sku == 'CREAT-MONO')
        creatine_flavors = [
            {'product_id': creatine.id, 'flavor_id': flavors[7].id, 'sku_suffix': '-UF'},  # Unflavored
            {'product_id': creatine.id, 'flavor_id': flavors[6].id, 'sku_suffix': '-BERRY'},  # Berry
        ]
        
        all_product_flavors = whey_flavors + bcaa_flavors + creatine_flavors
        
        for pf_data in all_product_flavors:
            product_flavor = ProductFlavor(**pf_data)
            db.session.add(product_flavor)
        
        db.session.flush()
        
        # Create GRNs and inventory
        import random
        from datetime import datetime
        
        for i, store in enumerate(stores):
            # Create 2-3 GRNs per store
            for grn_num in range(2 + i):
                grn = GRN(
                    grn_number=f"GRN{datetime.now().strftime('%Y%m%d')}{store.id:02d}{grn_num:02d}",
                    store_id=store.id,
                    supplier_id=suppliers[grn_num % len(suppliers)].id,
                    purchase_order_number=f"PO{random.randint(1000, 9999)}",
                    invoice_number=f"INV{random.randint(10000, 99999)}",
                    received_date=date.today() - timedelta(days=random.randint(1, 30)),
                    status='verified',
                    created_by=current_user.id,
                    verified_by=current_user.id,
                    verified_date=datetime.utcnow()
                )
                db.session.add(grn)
                db.session.flush()
                
                # Add items to GRN and create inventory
                selected_products = random.sample(products, random.randint(3, 6))
                
                for product in selected_products:
                    quantity = random.randint(50, 200)
                    unit_cost = product.cost_price
                    
                    grn_item = GRNItem(
                        grn_id=grn.id,
                        product_id=product.id,
                        quantity_ordered=quantity,
                        quantity_received=quantity,
                        unit_cost=unit_cost,
                        line_total=quantity * unit_cost,
                        batch_number=f"BATCH{random.randint(1000, 9999)}",
                        expiration_date=date.today() + timedelta(days=random.randint(365, 1095)),
                        location=f"A{random.randint(1, 5)}-{random.randint(1, 10)}"
                    )
                    db.session.add(grn_item)
                    
                    # Create inventory from GRN
                    inventory = Inventory(
                        product_id=product.id,
                        store_id=store.id,
                        supplier_id=grn.supplier_id,
                        batch_number=grn_item.batch_number,
                        expiration_date=grn_item.expiration_date,
                        quantity=quantity,
                        unit_cost=unit_cost,
                        location=grn_item.location,
                        date_received=grn.received_date,
                        grn_id=grn.id
                    )
                    db.session.add(inventory)
                
                grn.calculate_total()
        
        # Create some sales
        for store in stores:
            for sale_num in range(random.randint(5, 10)):
                sale = Sale(
                    invoice_number=f"INV{datetime.now().strftime('%Y%m%d')}{store.id:02d}{sale_num:03d}",
                    store_id=store.id,
                    customer_name=random.choice(['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', None]),
                    sale_date=datetime.now() - timedelta(days=random.randint(0, 30)),
                    tax_amount=Decimal('0'),
                    discount_amount=Decimal('0'),
                    payment_method=random.choice(['cash', 'card', 'online']),
                    created_by=current_user.id
                )
                db.session.add(sale)
                db.session.flush()
                
                # Add items to sale
                num_items = random.randint(1, 4)
                store_inventory = Inventory.query.filter_by(store_id=store.id).filter(Inventory.quantity > 0).all()
                
                if store_inventory:
                    selected_inventory = random.sample(store_inventory, min(num_items, len(store_inventory)))
                    
                    for inv in selected_inventory:
                        quantity = random.randint(1, min(5, inv.quantity))
                        unit_price = inv.product.selling_price
                        
                        sale_item = SaleItem(
                            sale_id=sale.id,
                            product_id=inv.product_id,
                            inventory_id=inv.id,
                            quantity=quantity,
                            unit_price=unit_price,
                            unit_cost=inv.unit_cost,
                            line_total=quantity * unit_price
                        )
                        db.session.add(sale_item)
                        
                        # Reduce inventory
                        inv.quantity -= quantity
                
                sale.calculate_totals()
                # Add 10% tax
                sale.tax_amount = sale.subtotal * Decimal('0.1')
                sale.total_amount = sale.subtotal + sale.tax_amount
        
        db.session.commit()
        
        return jsonify({
            'message': 'Sample data created successfully',
            'data': {
                'stores': len(stores),
                'flavors': len(flavors),
                'categories': len(categories),
                'suppliers': len(suppliers),
                'products': len(products),
                'product_flavors': len(all_product_flavors),
                'grns': GRN.query.count(),
                'inventory_items': Inventory.query.count(),
                'sales': Sale.query.count()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

