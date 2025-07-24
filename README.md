# Supplement Shop Inventory Management System

A comprehensive Flask-based inventory management system specifically designed for supplement shops, featuring advanced tracking capabilities for expiration dates, batch numbers, and supplier management.

## Features

### Core Functionality
- **Product Management**: Complete CRUD operations for supplement products
- **Inventory Tracking**: Real-time stock level monitoring with batch/lot tracking
- **Supplier Management**: Comprehensive supplier database with contact information
- **Transaction Logging**: Complete audit trail of all inventory movements
- **User Authentication**: Secure login system with role-based access control

### Supplement-Specific Features
- **Expiration Date Tracking**: Critical for supplement safety and compliance
- **Batch/Lot Number Management**: Essential for product recalls and quality control
- **Low Stock Alerts**: Automated notifications when products reach reorder points
- **Expired Item Tracking**: Identify and manage expired inventory
- **Category Management**: Organize products by supplement types (Vitamins, Minerals, etc.)

### Reporting & Analytics
- **Dashboard Overview**: Real-time statistics and key metrics
- **Inventory Reports**: Comprehensive stock analysis and summaries
- **Sales Tracking**: Monitor product movement and sales patterns
- **Expiration Reports**: Track items expiring soon or already expired
- **Supplier Performance**: Analyze supplier delivery patterns and reliability

### User Interface
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface built with Bootstrap
- **Search & Filtering**: Advanced product search and category filtering
- **Real-time Updates**: Dynamic content updates without page refreshes

## Technology Stack

- **Backend**: Flask (Python web framework)
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Authentication**: Flask-Login
- **CORS**: Flask-CORS for API access

## Installation & Setup

### Prerequisites
- Python 3.11+
- Virtual environment support

### Quick Start
1. **Clone or extract the project**:
   ```bash
   cd supplement_inventory
   ```

2. **Activate the virtual environment**:
   ```bash
   source venv/bin/activate
   ```

3. **Install dependencies** (already installed in venv):
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python src/main.py
   ```

5. **Access the application**:
   - Open your browser to `http://localhost:5000`
   - Default admin credentials: `admin` / `admin123`

### Database Setup
The application automatically creates the SQLite database on first run. The database includes:
- User management tables
- Product and category tables
- Inventory tracking tables
- Supplier management tables
- Transaction logging tables

## Usage Guide

### Initial Setup
1. **Login** with the default admin credentials
2. **Seed sample data** by calling the `/api/seed-data` endpoint (POST request)
3. **Explore the dashboard** to see inventory statistics

### Managing Products
1. Navigate to the **Products** section
2. Use **Add Product** to create new supplement entries
3. Include essential information:
   - Product name and SKU
   - Category (Vitamins, Minerals, etc.)
   - Price and description
   - Weight/volume information
   - Reorder point for low stock alerts

### Inventory Management
1. Access the **Inventory** section for stock tracking
2. Monitor batch numbers and expiration dates
3. Track supplier information for each batch
4. View location information for warehouse management

### Supplier Management
1. Use the **Suppliers** section to manage vendor information
2. Track contact details and delivery performance
3. Associate inventory batches with specific suppliers

### Reporting
1. Visit the **Reports** section for analytics
2. Generate inventory summaries and sales reports
3. Monitor expiration dates and low stock items
4. Analyze supplier performance metrics

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `GET /api/products/{id}` - Get specific product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product
- `GET /api/products/low-stock` - Get low stock products

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add inventory batch
- `GET /api/inventory/summary` - Get inventory statistics
- `GET /api/inventory/expiring-soon` - Get items expiring soon

### Suppliers
- `GET /api/suppliers` - List all suppliers
- `POST /api/suppliers` - Create new supplier
- `GET /api/suppliers/{id}` - Get specific supplier
- `PUT /api/suppliers/{id}` - Update supplier
- `DELETE /api/suppliers/{id}` - Delete supplier

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/summary` - Get transaction statistics

### Reports
- `GET /api/reports/inventory-summary` - Comprehensive inventory report
- `GET /api/reports/sales-summary` - Sales analysis report
- `GET /api/reports/expiration-report` - Expiration tracking report
- `GET /api/reports/supplier-report` - Supplier performance report
- `GET /api/reports/category-analysis` - Category-wise analysis

### Utilities
- `POST /api/seed-data` - Populate database with sample data (Admin only)

## Database Schema

### Core Tables
- **users**: User authentication and role management
- **categories**: Product categorization (Vitamins, Minerals, etc.)
- **products**: Supplement product information
- **suppliers**: Vendor and supplier details
- **inventory**: Batch/lot tracking with expiration dates
- **transactions**: Complete audit trail of inventory movements

### Key Relationships
- Products belong to categories
- Inventory items link to products and suppliers
- Transactions track all inventory changes
- Users are associated with all transaction records

## Security Features

- **Password Hashing**: Secure password storage using Werkzeug
- **Session Management**: Flask-Login for secure user sessions
- **Role-Based Access**: Admin and user role differentiation
- **CSRF Protection**: Built-in Flask security features
- **Input Validation**: Server-side validation for all inputs

## Supplement Industry Compliance

### Expiration Date Management
- Mandatory expiration date tracking for all inventory
- Automated alerts for items approaching expiration
- Expired item identification and reporting

### Batch/Lot Tracking
- Complete traceability for product recalls
- Supplier association for quality control
- Date received tracking for inventory aging

### Regulatory Reporting
- Transaction audit trails for compliance
- Supplier documentation and tracking
- Category-based reporting for different supplement types

## Customization

### Adding New Categories
1. Use the admin interface to add supplement categories
2. Categories automatically appear in product creation forms
3. Reporting adapts to include new categories

### Extending User Roles
1. Modify the User model in `src/models/user.py`
2. Update authentication logic in `src/routes/auth.py`
3. Adjust frontend permissions in `src/static/app.js`

### Custom Reports
1. Add new report endpoints in `src/routes/reports.py`
2. Create corresponding frontend interfaces
3. Utilize the existing database models for data access

## Troubleshooting

### Common Issues
1. **Database not found**: Ensure the `src/database/` directory exists
2. **Permission errors**: Check file permissions for the database directory
3. **Port conflicts**: Modify the port in `src/main.py` if 5000 is in use

### Development Mode
- The application runs in debug mode by default
- Database changes are automatically detected
- Frontend changes require browser refresh

### Production Deployment
- Use a production WSGI server (Gunicorn, uWSGI)
- Configure environment variables for security
- Use PostgreSQL or MySQL for production databases
- Implement proper backup strategies

## Support

For technical support or feature requests, refer to the development documentation or contact the development team.

## License

This inventory management system is developed for supplement shop operations and includes industry-specific features for compliance and safety management.

