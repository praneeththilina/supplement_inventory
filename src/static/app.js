// Global variables
let currentUser = null;
let currentStore = null;
let products = [];
let categories = [];
let stores = [];
let flavors = [];
let cart = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Authentication functions
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            currentUser = await response.json();
            document.getElementById('currentUser').textContent = currentUser.username;
            await loadInitialData();
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginForm();
    }
}

function showLoginForm() {
    document.body.innerHTML = `
        <div class="container-fluid vh-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="card shadow-lg" style="width: 400px; border-radius: 15px;">
                <div class="card-body p-5">
                    <div class="text-center mb-4">
                        <i class="fas fa-pills fa-3x text-primary mb-3"></i>
                        <h3 class="fw-bold">Supplement Shop</h3>
                        <p class="text-muted">Inventory Management System</p>
                    </div>
                    <form onsubmit="login(event)">
                        <div class="mb-3">
                            <label for="username" class="form-label">Username</label>
                            <input type="text" class="form-control" id="username" required>
                        </div>
                        <div class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <input type="password" class="form-control" id="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-sign-in-alt me-2"></i>Login
                        </button>
                    </form>
                    <div id="loginError" class="alert alert-danger mt-3" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;
}

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        if (response.ok) {
            location.reload();
        } else {
            const error = await response.json();
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loginError').textContent = error.error || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginError').textContent = 'Network error occurred';
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        location.reload();
    }
}

// Data loading functions
async function loadInitialData() {
    showLoading(true);
    try {
        await Promise.all([
            loadStores(),
            loadCategories(),
            loadFlavors(),
            loadProducts(),
            loadDashboardData()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('Error loading data. Please refresh the page.', 'danger');
    } finally {
        showLoading(false);
    }
}

// async function loadStores() {
//     try {
//         const response = await fetch('/api/stores');
//         if (response.ok) {
//             stores = await response.json();
//             populateStoreSelector();
//         }
//     } catch (error) {
//         console.error('Error loading stores:', error);
//     }
// }

function printReceipt(invoiceNumber) {
    // Simple print functionality
    window.print();
}

// Placeholder functions for other features
function showProductModal() {
    // Product management modal will be implemented here
}

function showStoreModal() {
    const modal = new bootstrap.Modal(document.getElementById('storeModal'));
    document.getElementById('storeForm').reset();
    modal.show();
}

document.getElementById('storeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const storeData = {
        name: document.getElementById('storeName').value,
        manager_name: document.getElementById('managerName').value,
        phone: document.getElementById('storePhone').value,
        email: document.getElementById('storeEmail').value,
        address: document.getElementById('storeAddress').value
    };

    try {
        const response = await fetch('/api/stores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(storeData)
        });

        if (response.ok) {
            const newStore = await response.json();
            bootstrap.Modal.getInstance(document.getElementById('storeModal')).hide();
            loadStores(); // Reload store list
        } else {
            const err = await response.json();
            alert('Error: ' + (err.error || 'Could not save store'));
        }
    } catch (err) {
        console.error('Error saving store:', err);
        alert('Error saving store');
    }
});


function editProduct(id) {
    showAlert('Product editing coming soon', 'info');
}

function viewProduct(id) {
    showAlert('Product details coming soon', 'info');
}

function deleteProduct(id) {
    showAlert('Product deletion coming soon', 'info');
}


// Reports Functions
async function generateSalesReport() {
    const fromDate = document.getElementById('reportDateFrom').value;
    const toDate = document.getElementById('reportDateTo').value;
    const storeId = document.getElementById('reportStoreFilter').value;
    const reportType = document.getElementById('reportType').value;
    
    try {
        const params = new URLSearchParams({
            type: 'sales',
            report_type: reportType,
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate }),
            ...(storeId && { store_id: storeId })
        });
        
        const response = await fetch(`/api/reports?${params}`);
        if (response.ok) {
            const report = await response.json();
            displayReport('Sales Report', report);
        }
    } catch (error) {
        console.error('Error generating sales report:', error);
        showAlert('Error generating sales report', 'danger');
    }
}

async function generateInventoryReport() {
    const storeId = document.getElementById('reportStoreFilter').value;
    const reportType = document.getElementById('reportType').value;
    
    try {
        const params = new URLSearchParams({
            type: 'inventory',
            report_type: reportType,
            ...(storeId && { store_id: storeId })
        });
        
        const response = await fetch(`/api/reports?${params}`);
        if (response.ok) {
            const report = await response.json();
            displayReport('Inventory Report', report);
        }
    } catch (error) {
        console.error('Error generating inventory report:', error);
        showAlert('Error generating inventory report', 'danger');
    }
}

async function generateProfitReport() {
    const fromDate = document.getElementById('reportDateFrom').value;
    const toDate = document.getElementById('reportDateTo').value;
    const storeId = document.getElementById('reportStoreFilter').value;
    
    try {
        const params = new URLSearchParams({
            type: 'profit',
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate }),
            ...(storeId && { store_id: storeId })
        });
        
        const response = await fetch(`/api/reports?${params}`);
        if (response.ok) {
            const report = await response.json();
            displayReport('Profit Report', report);
        }
    } catch (error) {
        console.error('Error generating profit report:', error);
        showAlert('Error generating profit report', 'danger');
    }
}

async function generateSupplierReport() {
    const fromDate = document.getElementById('reportDateFrom').value;
    const toDate = document.getElementById('reportDateTo').value;
    
    try {
        const params = new URLSearchParams({
            type: 'supplier',
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate })
        });
        
        const response = await fetch(`/api/reports?${params}`);
        if (response.ok) {
            const report = await response.json();
            displayReport('Supplier Report', report);
        }
    } catch (error) {
        console.error('Error generating supplier report:', error);
        showAlert('Error generating supplier report', 'danger');
    }
}



function downloadReport(title, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Modal Functions (placeholders for now)
function showInventoryModal() {
    showAlert('Inventory modal will be implemented', 'info');
}

function showSupplierModal() {
    showAlert('Supplier modal will be implemented', 'info');
}

function showFlavorModal() {
    showAlert('Flavor modal will be implemented', 'info');
}

function showSaleModal() {
    showAlert('Sale modal will be implemented', 'info');
}

function showGRNModal() {
    showAlert('GRN modal will be implemented', 'info');
}

function showTransferModal() {
    showAlert('Transfer modal will be implemented', 'info');
}

// Search and Filter Functions
function searchInventory() {
    // Implementation for inventory search
}

function filterInventory() {
    // Implementation for inventory filtering
}

function searchSuppliers() {
    // Implementation for supplier search
}

function searchSales() {
    // Implementation for sales search
}

function filterSales() {
    // Implementation for sales filtering
}

function searchGRN() {
    // Implementation for GRN search
}

function filterGRN() {
    // Implementation for GRN filtering
}

function searchTransfers() {
    // Implementation for transfer search
}

function filterTransfers() {
    // Implementation for transfer filtering
}

function searchTransactions() {
    // Implementation for transaction search
}

function filterTransactions() {
    // Implementation for transaction filtering
}

// Export Functions
function exportSales() {
    showAlert('Sales export will be implemented', 'info');
}

function exportTransactions() {
    showAlert('Transaction export will be implemented', 'info');
}

// Edit/View Functions
function editInventory(id) {
    showAlert('Inventory editing will be implemented', 'info');
}

function viewInventory(id) {
    showAlert('Inventory viewing will be implemented', 'info');
}

function editSupplier(id) {
    showAlert('Supplier editing will be implemented', 'info');
}

function viewSupplier(id) {
    showAlert('Supplier viewing will be implemented', 'info');
}

function editStore(id) {
    showAlert('Store editing will be implemented', 'info');
}

function viewStore(id) {
    showAlert('Store viewing will be implemented', 'info');
}

function editFlavor(id) {
    showAlert('Flavor editing will be implemented', 'info');
}

function deleteFlavor(id) {
    showAlert('Flavor deletion will be implemented', 'info');
}

function viewSale(id) {
    showAlert('Sale viewing will be implemented', 'info');
}

function printInvoice(invoiceNumber) {
    showAlert('Invoice printing will be implemented', 'info');
}

function viewGRN(id) {
    showAlert('GRN viewing will be implemented', 'info');
}

function printGRN(id) {
    showAlert('GRN printing will be implemented', 'info');
}

function viewTransfer(id) {
    showAlert('Transfer viewing will be implemented', 'info');
}

function completeTransfer(id) {
    showAlert('Transfer completion will be implemented', 'info');
}

function displayReport(title, reportData) {
    const container = document.getElementById('reportResults');
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">${title}</h6>
                <small class="text-muted">Generated: ${new Date().toLocaleString()}</small>
            </div>
            <div class="card-body">
                <pre class="bg-light p-3 rounded">${JSON.stringify(reportData, null, 2)}</pre>
                <div class="mt-3">
                    <button class="btn btn-primary btn-sm" onclick="downloadReport('${title}', ${JSON.stringify(reportData).replace(/"/g, '&quot;')})">
                        <i class="fas fa-download me-2"></i>Download
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function changeStore() {
    const selectedStoreId = document.getElementById('currentStore').value;
    if (!selectedStoreId) {
        console.log('No store selected');
        return;
    }

    // Store in localStorage or global app state
    localStorage.setItem('currentStoreId', selectedStoreId);

    // Optional: Load inventory, sales, etc., based on store
    console.log(`Selected Store ID: ${selectedStoreId}`);
    // loadInventoryForStore(selectedStoreId); // optional
}


// Product management
function populateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    filter.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        filter.appendChild(option);
    });
}



function displayProducts(productList) {
    const tbody = document.getElementById('productsTable');
    
    if (productList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = productList.map(product => `
        <tr>
            <td>
                <strong>${product.name}</strong>
                ${product.description ? `<br><small class="text-muted">${product.description}</small>` : ''}
            </td>
            <td><code>${product.sku}</code></td>
            <td>
                <span class="badge bg-secondary">${product.category_name || 'Uncategorized'}</span>
            </td>
            <td>$${product.cost_price.toFixed(2)}</td>
            <td>$${product.selling_price.toFixed(2)}</td>
            <td>
                <span class="badge ${product.total_quantity <= product.reorder_point ? 'bg-danger' : 'bg-success'}">
                    ${product.total_quantity}
                </span>
            </td>
            <td>
                ${product.flavors.map(flavor => 
                    `<span class="flavor-tag">${flavor.flavor_name}</span>`
                ).join('')}
                ${!product.has_flavors ? '<span class="text-muted">No flavors</span>' : ''}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${product.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewProduct(${product.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Store management
function populateStoreSelector(stores) {
    const selector = document.getElementById('currentStore');
    selector.innerHTML = '<option value="">Select Store...</option>';

    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        selector.appendChild(option);
    });

    // Auto-select first store if available and set currentStore
    if (stores.length > 0) {
        currentStore = stores[0].id;
        selector.value = currentStore;
        loadDashboardData();
    }
}

// async function loadStores() {
//     try {
//         const response = await fetch('/api/stores');
//         if (!response.ok) throw new Error('Failed to fetch stores');

//         const stores = await response.json();
//         const tbody = document.getElementById('storesTable');
//         tbody.innerHTML = '';

//         if (stores.length === 0) {
//             tbody.innerHTML = `<tr><td colspan="8" class="text-center">No stores found.</td></tr>`;
//             return;
//         }

//         for (const store of stores) {
//             const row = document.createElement('tr');
//             row.innerHTML = `
//                 <td>${store.name}</td>
//                 <td>${store.address || ''}</td>
//                 <td>${store.manager_name || ''}</td>
//                 <td>${store.phone || ''}</td>
//                 <td>-</td>
//                 <td>-</td>
//                 <td>${store.is_active ? '✅ Active' : '❌ Inactive'}</td>
//                 <td><button class="btn btn-sm btn-outline-primary">Edit</button></td>
//             `;
//             tbody.appendChild(row);
//         }

//     } catch (error) {
//         console.error('Error loading stores:', error);
//         document.getElementById('storesTable').innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error loading stores</td></tr>`;
//     }
// }


async function loadStores() {
    try {
        const response = await fetch('/api/stores');
        if (!response.ok) throw new Error('Failed to fetch stores');

        const stores = await response.json();

        // Update store selector dropdown
        const storeSelect = document.getElementById('currentStore');
        storeSelect.innerHTML = '<option value="">Select Store...</option>';
        for (const store of stores) {
            const opt = document.createElement('option');
            opt.value = store.id;
            opt.textContent = store.name;
            storeSelect.appendChild(opt);
        }

        // Update table
        const tbody = document.getElementById('storesTable');
        if (tbody) {
            tbody.innerHTML = '';
            if (stores.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center">No stores found.</td></tr>`;
                return;
            }

            for (const store of stores) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${store.name}</td>
                    <td>${store.address || ''}</td>
                    <td>${store.manager_name || ''}</td>
                    <td>${store.phone || ''}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${store.is_active ? '✅ Active' : '❌ Inactive'}</td>
                    <td><button class="btn btn-sm btn-outline-primary">Edit</button></td>
                `;
                tbody.appendChild(row);
            }
        }

    } catch (err) {
        console.error('Error loading stores:', err);
        const tbody = document.getElementById('storesTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading stores</td></tr>`;
        }
    }
}


async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (response.ok) {
            categories = await response.json();
            populateCategoryFilter();
        } else if (response.status === 401) {
            // Unauthorized, redirect or alert
            console.error('Unauthorized. Please login.');
            // window.location.href = '/login'; // optional redirect
        } else {
            console.error('Failed to load categories:', response.status);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}


async function loadFlavors() {
    try {
        const response = await fetch('/api/flavors');
        if (response.ok) {
            flavors = await response.json();
        }
    } catch (error) {
        console.error('Error loading flavors:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const data = await response.json();
            products = data.products || data; // Handle both array and object responses
            displayProducts(products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadDashboardData() {
    if (!currentStore) return;
    
    try {
        // Load dashboard statistics
        const statsResponse = await fetch(`/api/stores/${currentStore}/inventory-summary`);
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            displayDashboardStats(stats);
        }
        
        // Load low stock alerts
        const lowStockResponse = await fetch(`/api/products/low-stock?store_id=${currentStore}`);
        if (lowStockResponse.ok) {
            const lowStock = await lowStockResponse.json();
            displayLowStockAlerts(lowStock);
        }
        
        // Load expiring items
        const expiringResponse = await fetch(`/api/inventory/expiring-soon?store_id=${currentStore}`);
        if (expiringResponse.ok) {
            const expiring = await expiringResponse.json();
            displayExpiringItems(expiring);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// UI Helper functions
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'block' : 'none';
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.main-content');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function setupEventListeners() {
    // Sidebar toggle for mobile
    document.getElementById('sidebarToggle')?.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('show');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth <= 768 && 
            !sidebar.contains(event.target) && 
            !toggle.contains(event.target)) {
            sidebar.classList.remove('show');
        }
    });
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'pos':
            initializePOS();
            break;
        case 'inventory':
            loadInventoryData();
            break;
        case 'suppliers':
            loadSuppliersData();
            break;
        case 'stores':
            loadStoresData();
            break;
        case 'flavors':
            loadFlavorsData();
            break;
        case 'sales':
            loadSalesHistory();
            break;
        case 'grn':
            loadGRN();
            break;
        case 'transfers':
            loadStockTransfers();
            break;
        case 'transactions':
            loadTransactionHistory();
            break;
        case 'reports':
            // Reports section doesn't need initial loading
            break;
}




function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            product.sku.toLowerCase().includes(searchTerm) ||
                            (product.description && product.description.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !categoryFilter || product.category_id == categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    displayProducts(filteredProducts);
}

function filterProducts() {
    searchProducts(); // Reuse the search function which also handles category filtering
}

// Dashboard functions
function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboardStats');
    
    statsContainer.innerHTML = `
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number">${stats.inventory_summary.total_items}</div>
                <div class="stat-label">Total Items</div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number">$${stats.inventory_summary.total_value.toFixed(2)}</div>
                <div class="stat-label">Inventory Value</div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number text-warning">${stats.inventory_summary.low_stock_count}</div>
                <div class="stat-label">Low Stock</div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number text-danger">${stats.inventory_summary.expired_items}</div>
                <div class="stat-label">Expired Items</div>
            </div>
        </div>
    `;
}

function displayLowStockAlerts(lowStockItems) {
    const container = document.getElementById('lowStockAlerts');
    
    if (lowStockItems.length === 0) {
        container.innerHTML = '<p class="text-success"><i class="fas fa-check-circle me-2"></i>No low stock items</p>';
        return;
    }
    
    container.innerHTML = lowStockItems.map(item => `
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
            <div>
                <strong>${item.product_name}</strong>
                <br><small class="text-muted">Current: ${item.current_stock} | Reorder: ${item.reorder_point}</small>
            </div>
            <span class="badge bg-warning">Low Stock</span>
        </div>
    `).join('');
}

function displayExpiringItems(expiringItems) {
    const container = document.getElementById('expiringItems');
    
    if (expiringItems.length === 0) {
        container.innerHTML = '<p class="text-success"><i class="fas fa-check-circle me-2"></i>No items expiring soon</p>';
        return;
    }
    
    container.innerHTML = expiringItems.map(item => `
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
            <div>
                <strong>${item.product_name}</strong>
                <br><small class="text-muted">Batch: ${item.batch_number} | Expires: ${new Date(item.expiration_date).toLocaleDateString()}</small>
            </div>
            <span class="badge bg-danger">Expiring</span>
        </div>
    `).join('');
}

// Point of Sale functions
function initializePOS() {
    if (!currentStore) {
        showAlert('Please select a store first', 'warning');
        return;
    }
    
    cart = [];
    updateCartDisplay();
    document.getElementById('posProductSearch').value = '';
    document.getElementById('posProductResults').innerHTML = '';
}

function searchPOSProducts() {
    const searchTerm = document.getElementById('posProductSearch').value.toLowerCase();
    
    if (searchTerm.length < 2) {
        document.getElementById('posProductResults').innerHTML = '';
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results
    
    displayPOSProducts(filteredProducts);
}

function displayPOSProducts(productList) {
    const container = document.getElementById('posProductResults');
    
    container.innerHTML = productList.map(product => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100" style="cursor: pointer;" onclick="addToCart(${product.id})">
                <div class="card-body">
                    <h6 class="card-title">${product.name}</h6>
                    <p class="card-text">
                        <small class="text-muted">${product.sku}</small><br>
                        <strong>$${product.selling_price.toFixed(2)}</strong><br>
                        <span class="badge ${product.total_quantity > 0 ? 'bg-success' : 'bg-danger'}">
                            Stock: ${product.total_quantity}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.total_quantity <= 0) {
        showAlert('Product is out of stock', 'warning');
        return;
    }
    
    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.total_quantity) {
            existingItem.quantity++;
        } else {
            showAlert('Cannot add more items than available in stock', 'warning');
            return;
        }
    } else {
        cart.push({
            product_id: productId,
            product_name: product.name,
            product_sku: product.sku,
            unit_price: product.selling_price,
            quantity: 1,
            max_quantity: product.total_quantity
        });
    }
    
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    updateCartDisplay();
}

function updateCartQuantity(productId, newQuantity) {
    const item = cart.find(item => item.product_id === productId);
    if (!item) return;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.max_quantity) {
        showAlert('Cannot exceed available stock', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    updateCartDisplay();
}

function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Cart is empty</p>';
        subtotalEl.textContent = '$0.00';
        taxEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="flex-grow-1">
                    <strong>${item.product_name}</strong>
                    <br><small class="text-muted">${item.product_sku}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${item.product_id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div class="input-group" style="width: 100px;">
                    <button class="btn btn-outline-secondary btn-sm" onclick="updateCartQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                    <input type="number" class="form-control form-control-sm text-center" value="${item.quantity}" 
                           onchange="updateCartQuantity(${item.product_id}, parseInt(this.value))" min="1" max="${item.max_quantity}">
                    <button class="btn btn-outline-secondary btn-sm" onclick="updateCartQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                </div>
                <strong>$${(item.unit_price * item.quantity).toFixed(2)}</strong>
            </div>
        </div>
    `).join('');
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;
    
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    taxEl.textContent = `$${tax.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;
    checkoutBtn.disabled = false;
}

async function processSale() {
    if (cart.length === 0 || !currentStore) {
        showAlert('Cart is empty or no store selected', 'warning');
        return;
    }
    
    const saleData = {
        store_id: currentStore,
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price
        })),
        tax_amount: cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) * 0.1,
        payment_method: 'cash'
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(saleData),
        });
        
        if (response.ok) {
            const sale = await response.json();
            showAlert(`Sale completed successfully! Invoice: ${sale.invoice_number}`, 'success');
            
            // Reset cart and reload data
            cart = [];
            updateCartDisplay();
            await loadProducts(); // Refresh product quantities
            await loadDashboardData(); // Refresh dashboard
            
            // Optionally show receipt modal
            showReceiptModal(sale);
        } else {
            const error = await response.json();
            showAlert(`Sale failed: ${error.error}`, 'danger');
        }
    } catch (error) {
        console.error('Sale processing error:', error);
        showAlert('Network error occurred during sale processing', 'danger');
    } finally {
        showLoading(false);
    }
}

function showReceiptModal(sale) {
    // Create and show receipt modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Sale Receipt</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3">
                        <h6>Supplement Shop</h6>
                        <p class="mb-1">Invoice: ${sale.invoice_number}</p>
                        <p class="mb-1">Date: ${new Date(sale.sale_date).toLocaleString()}</p>
                        <p class="mb-1">Store: ${stores.find(s => s.id === sale.store_id)?.name || 'Unknown'}</p>
                    </div>
                    <hr>
                    <div class="mb-3">
                        ${sale.items.map(item => `
                            <div class="d-flex justify-content-between">
                                <span>${item.product_name} x${item.quantity}</span>
                                <span>$${item.line_total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between mb-1">
                        <span>Subtotal:</span>
                        <span>$${sale.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span>Tax:</span>
                        <span>$${sale.tax_amount.toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between fw-bold">
                        <span>Total:</span>
                        <span>$${sale.total_amount.toFixed(2)}</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="printReceipt('${sale.invoice_number}')">
                        <i class="fas fa-print me-2"></i>Print
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Remove modal from DOM when hidden
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}



function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}




// Inventory Management Functions
async function loadInventoryData() {
    if (!currentStore) {
        showAlert('Please select a store first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/inventory?store_id=${currentStore}`);
        if (response.ok) {
            const inventory = await response.json();
            displayInventory(inventory);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showAlert('Error loading inventory data', 'danger');
    }
}

function displayInventory(inventoryList) {
    const tbody = document.getElementById('inventoryTable');
    
    if (inventoryList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No inventory found</td></tr>';
        return;
    }
    
    tbody.innerHTML = inventoryList.map(item => `
        <tr>
            <td>
                <strong>${item.product_name}</strong>
                <br><small class="text-muted">${item.product_sku}</small>
            </td>
            <td>${item.store_name}</td>
            <td><code>${item.batch_number}</code></td>
            <td>
                <span class="badge ${item.quantity <= item.reorder_point ? 'bg-danger' : 'bg-success'}">
                    ${item.quantity}
                </span>
            </td>
            <td>$${item.cost_price.toFixed(2)}</td>
            <td>
                ${item.expiration_date ? 
                    `<span class="badge ${new Date(item.expiration_date) < new Date() ? 'bg-danger' : 'bg-warning'}">
                        ${formatDate(item.expiration_date)}
                    </span>` : 
                    '<span class="text-muted">No expiry</span>'
                }
            </td>
            <td>
                <span class="badge ${item.quantity > 0 ? 'bg-success' : 'bg-danger'}">
                    ${item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editInventory(${item.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewInventory(${item.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadSuppliersData() {
    try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
            const data = await response.json();
            displaySuppliers(data.suppliers);  // pass the array, not the whole object
        } else {
            showAlert('Failed to load suppliers: ' + response.status, 'danger');
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showAlert('Error loading suppliers data', 'danger');
    }
}


function displaySuppliers(suppliersList) {
    const tbody = document.getElementById('suppliersTable');
    
    if (suppliersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No suppliers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = suppliersList.map(supplier => `
        <tr>
            <td>
                <strong>${supplier.name}</strong>
                <br><small class="text-muted">${supplier.company || 'Individual'}</small>
            </td>
            <td>${supplier.contact_person || 'N/A'}</td>
            <td>${supplier.phone || 'N/A'}</td>
            <td>${supplier.email || 'N/A'}</td>
            <td>
                <span class="badge bg-info">${supplier.product_count || 0} products</span>
            </td>
            <td>
                <span class="badge bg-success">Active</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editSupplier(${supplier.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewSupplier(${supplier.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Store Management Functions
async function loadStoresData() {
    try {
        const response = await fetch('/api/stores');
        if (response.ok) {
            const storesList = await response.json();
            displayStores(storesList);
        }
    } catch (error) {
        console.error('Error loading stores:', error);
        showAlert('Error loading stores data', 'danger');
    }
}

function displayStores(storesList) {
    const tbody = document.getElementById('storesTable');
    
    if (storesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No stores found</td></tr>';
        return;
    }
    
    tbody.innerHTML = storesList.map(store => `
        <tr>
            <td>
                <strong>${store.name}</strong>
                <br><small class="text-muted">ID: ${store.id}</small>
            </td>
            <td>${store.location || 'N/A'}</td>
            <td>${store.manager || 'N/A'}</td>
            <td>${store.phone || 'N/A'}</td>
            <td>
                <span class="badge bg-info">${store.product_count || 0}</span>
            </td>
            <td>
                <span class="text-success">$${(store.inventory_value || 0).toFixed(2)}</span>
            </td>
            <td>
                <span class="badge bg-success">Active</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editStore(${store.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewStore(${store.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Flavor Management Functions
async function loadFlavorsData() {
    try {
        const response = await fetch('/api/flavors');
        if (response.ok) {
            const flavorsList = await response.json();
            displayFlavors(flavorsList);
        }
    } catch (error) {
        console.error('Error loading flavors:', error);
        showAlert('Error loading flavors data', 'danger');
    }
}

function displayFlavors(flavorsList) {
    const tbody = document.getElementById('flavorsTable');
    
    if (flavorsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No flavors found</td></tr>';
        return;
    }
    
    tbody.innerHTML = flavorsList.map(flavor => `
        <tr>
            <td>
                <strong>${flavor.name}</strong>
            </td>
            <td>${flavor.description || 'N/A'}</td>
            <td>
                <span class="badge bg-info">${flavor.product_count || 0} products</span>
            </td>
            <td>
                <span class="badge bg-success">Active</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editFlavor(${flavor.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFlavor(${flavor.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Sales History Functions
async function loadSalesHistory() {
    try {
        const response = await fetch('/api/sales');
        if (response.ok) {
            const salesList = await response.json();
            displaySales(salesList);
        }
    } catch (error) {
        console.error('Error loading sales:', error);
        showAlert('Error loading sales data', 'danger');
    }
}

function displaySales(salesList) {
    const tbody = document.getElementById('salesTable');
    
    if (salesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No sales found</td></tr>';
        return;
    }
    
    tbody.innerHTML = salesList.map(sale => `
        <tr>
            <td><code>${sale.invoice_number}</code></td>
            <td>${formatDateTime(sale.sale_date)}</td>
            <td>${sale.store_name}</td>
            <td>
                <span class="badge bg-info">${sale.item_count || 0} items</span>
            </td>
            <td>$${sale.subtotal.toFixed(2)}</td>
            <td>$${sale.tax_amount.toFixed(2)}</td>
            <td><strong>$${sale.total_amount.toFixed(2)}</strong></td>
            <td>
                <span class="badge bg-success">${sale.payment_method || 'Cash'}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewSale(${sale.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="printInvoice('${sale.invoice_number}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// GRN Management Functions
async function loadGRN() {
    try {
        const response = await fetch('/api/grn');
        if (response.ok) {
            const grnList = await response.json();
            displayGRN(grnList);
        }
    } catch (error) {
        console.error('Error loading GRN:', error);
        showAlert('Error loading GRN data', 'danger');
    }
}

function displayGRN(grnList) {
    const tbody = document.getElementById('grnTable');
    
    if (grnList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No GRN found</td></tr>';
        return;
    }
    
    tbody.innerHTML = grnList.map(grn => `
        <tr>
            <td><code>${grn.grn_number}</code></td>
            <td>${formatDate(grn.received_date)}</td>
            <td>${grn.supplier_name}</td>
            <td>${grn.store_name}</td>
            <td>
                <span class="badge bg-info">${grn.item_count || 0} items</span>
            </td>
            <td>$${grn.total_value.toFixed(2)}</td>
            <td>
                <span class="badge ${grn.status === 'received' ? 'bg-success' : grn.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                    ${grn.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewGRN(${grn.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="printGRN(${grn.id})" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Stock Transfer Functions
async function loadStockTransfers() {
    try {
        const response = await fetch('/api/stock-transfers');
        if (response.ok) {
            const transfersList = await response.json();
            displayTransfers(transfersList);
        }
    } catch (error) {
        console.error('Error loading transfers:', error);
        showAlert('Error loading transfer data', 'danger');
    }
}

function displayTransfers(transfersList) {
    const tbody = document.getElementById('transfersTable');
    
    if (transfersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No transfers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transfersList.map(transfer => `
        <tr>
            <td><code>${transfer.transfer_number}</code></td>
            <td>${formatDate(transfer.transfer_date)}</td>
            <td>${transfer.from_store_name}</td>
            <td>${transfer.to_store_name}</td>
            <td>${transfer.product_name}</td>
            <td>
                <span class="badge bg-info">${transfer.quantity}</span>
            </td>
            <td>
                <span class="badge ${transfer.status === 'completed' ? 'bg-success' : transfer.status === 'pending' ? 'bg-warning' : 'bg-info'}">
                    ${transfer.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewTransfer(${transfer.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${transfer.status === 'pending' ? 
                        `<button class="btn btn-sm btn-outline-success" onclick="completeTransfer(${transfer.id})" title="Complete">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Transaction History Functions
async function loadTransactionHistory() {
    try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
            const transactionsList = await response.json();
            displayTransactions(transactionsList);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showAlert('Error loading transaction data', 'danger');
    }
}

function displayTransactions(transactionsList) {
    const tbody = document.getElementById('transactionsTable');
    
    if (transactionsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactionsList.map(transaction => `
        <tr>
            <td>${formatDateTime(transaction.transaction_date)}</td>
            <td>
                <span class="badge ${transaction.transaction_type === 'sale' ? 'bg-success' : transaction.transaction_type === 'purchase' ? 'bg-primary' : 'bg-info'}">
                    ${transaction.transaction_type}
                </span>
            </td>
            <td><code>${transaction.reference_number}</code></td>
            <td>${transaction.product_name}</td>
            <td>
                <span class="${transaction.quantity_change > 0 ? 'text-success' : 'text-danger'}">
                    ${transaction.quantity_change > 0 ? '+' : ''}${transaction.quantity_change}
                </span>
            </td>
            <td>$${transaction.unit_price.toFixed(2)}</td>
            <td>$${transaction.total_amount.toFixed(2)}</td>
            <td>${transaction.store_name}</td>
            <td>${transaction.notes || 'N/A'}</td>
        </tr>
    `).join('');
}


}