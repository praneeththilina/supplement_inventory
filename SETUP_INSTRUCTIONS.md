# Supplement Shop Inventory Management System - Setup Instructions

## 📦 Quick Setup Guide

This is a complete, ready-to-run supplement shop inventory management system built with Flask (Python) and modern web technologies.

## 🚀 **Live Demo Available**
**URL:** https://5000-itsr1aw66j3zn776cfhnm-f9dd5bc3.manusvm.computer
**Login:** admin / admin123

## 💻 Local Installation

### Prerequisites
- Python 3.11 or higher
- pip (Python package installer)

### Step 1: Extract the Files
```bash
# Extract the downloaded zip file
unzip supplement_shop_app.zip
cd supplement_shop
```

### Step 2: Create Virtual Environment
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies
```bash
# Install required packages
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
# Start the application
python src/main.py
```

### Step 5: Access the Application
- Open your web browser
- Go to: http://localhost:5000
- Login with: **admin** / **admin123**

## 🎯 First Time Setup

1. **Login** with the default credentials (admin/admin123)
2. **Add Sample Data** by clicking the "Seed Data" button or calling `/api/seed-data` endpoint
3. **Select a Store** from the dropdown to enable all features
4. **Explore** the different sections: Dashboard, Products, POS, etc.

## ✅ Features Included

### Core Functionality
- ✅ **Dashboard** - Real-time inventory statistics
- ✅ **Product Management** - Complete CRUD operations
- ✅ **Point of Sale (POS)** - Fast checkout system
- ✅ **Inventory Tracking** - Real-time stock levels
- ✅ **Multi-Store Management** - Multiple locations
- ✅ **Supplier Management** - Vendor tracking
- ✅ **Flavor Management** - Product variants
- ✅ **Sales Processing** - Complete sales workflow
- ✅ **GRN Management** - Goods received notes
- ✅ **Stock Transfers** - Inter-store transfers
- ✅ **Transaction History** - Complete audit trail
- ✅ **Reports & Analytics** - Business intelligence

### Sample Data Included
- 12 Products (Vitamins, Minerals, Protein Supplements, etc.)
- 3 Store locations
- 4 Suppliers
- 8 Flavor variants
- Historical sales and inventory data

## 🔧 Configuration

### Database
- Uses SQLite by default (no setup required)
- Database file: `src/database/app.db`
- Automatically created on first run

### Admin User
- Default username: `admin`
- Default password: `admin123`
- Can be changed in the user management section

### Environment Variables
You can set these environment variables for production:
```bash
export FLASK_ENV=production
export SECRET_KEY=your-secret-key-here
```

## 📱 Usage Guide

### Point of Sale (POS)
1. Click "Point of Sale" in the sidebar
2. Search for products by name or SKU
3. Click products to add to cart
4. Adjust quantities as needed
5. Click "Checkout" to complete sale
6. Print receipt if needed

### Inventory Management
1. Go to "Inventory" section
2. View stock levels by store
3. Track batch numbers and expiration dates
4. Monitor low stock alerts

### Product Management
1. Click "Products" in the sidebar
2. Add new products with "Add Product"
3. Set cost and selling prices
4. Configure reorder points
5. Manage product categories

## 🔒 Security Features

- Password hashing with Werkzeug
- Session-based authentication
- CSRF protection
- Input validation
- Role-based access control

## 📊 Database Schema

The application includes a complete relational database with:
- Users and authentication
- Products and categories
- Inventory with batch tracking
- Suppliers and stores
- Sales and transactions
- GRN and stock transfers

## 🛠️ Customization

### Adding Your Products
1. Go to Products section
2. Click "Add Product"
3. Fill in product details
4. Set pricing and reorder points

### Setting Up Your Stores
1. Go to Stores section
2. Add your actual store locations
3. Configure store-specific settings

### Configuring Suppliers
1. Go to Suppliers section
2. Add your vendor information
3. Link suppliers to products

## 📈 Production Deployment

For production use:
1. Use PostgreSQL or MySQL instead of SQLite
2. Set up proper backup procedures
3. Configure SSL certificates
4. Use a production WSGI server (Gunicorn, uWSGI)
5. Set up monitoring and logging

## 🆘 Troubleshooting

### Common Issues

**Database not found:**
- Ensure the `src/database/` directory exists
- The database will be created automatically on first run

**Permission errors:**
- Check file permissions for the database directory
- Run with appropriate user permissions

**Port already in use:**
- Change the port in `src/main.py` (line with `app.run`)
- Or stop other services using port 5000

**Dependencies not installing:**
- Ensure you're using Python 3.11+
- Try upgrading pip: `pip install --upgrade pip`

### Getting Help

1. Check the console output for error messages
2. Ensure all dependencies are installed correctly
3. Verify Python version compatibility
4. Check file permissions and paths

## 📋 File Structure

```
supplement_shop/
├── src/
│   ├── main.py              # Application entry point
│   ├── models/              # Database models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   └── ...
│   ├── routes/              # API endpoints
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── sales.py
│   │   └── ...
│   ├── static/              # Frontend files
│   │   ├── index.html
│   │   ├── app.js
│   │   └── favicon.ico
│   └── database/            # SQLite database (created automatically)
├── requirements.txt         # Python dependencies
├── README.md               # Project documentation
├── FEATURES.md             # Feature list
└── SETUP_INSTRUCTIONS.md   # This file
```

## 🎉 You're Ready!

Your supplement shop inventory management system is now ready to use. Start by logging in with admin/admin123 and exploring the features. The system includes comprehensive sample data to help you get started quickly.

**Happy inventory managing!** 📦✨

