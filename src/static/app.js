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
        loadCurrentStoreFromLocalStorage();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('Error loading data. Please refresh the page.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Enhanced print functionality with receipt formatting
function printReceipt(invoiceNumber) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Receipt - ${invoiceNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .receipt { max-width: 300px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .line-item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <h2>Supplement Shop</h2>
                        <p>Invoice: ${invoiceNumber}</p>
                        <p>Date: ${new Date().toLocaleString()}</p>
                    </div>
                    <div id="receipt-content">
                        <!-- Receipt content will be populated here -->
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

// Product Management Modal
function showProductModal(productId = null) {
    const isEdit = productId !== null;
    const modalTitle = isEdit ? 'Edit Product' : 'Add New Product';
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="productModal" tabindex="-1" aria-labelledby="productModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="productModalLabel">
                            <i class="fas fa-pills me-2"></i>${modalTitle}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="productForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="productName" class="form-label">Product Name *</label>
                                    <input type="text" class="form-control" id="productName" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="productSKU" class="form-label">SKU *</label>
                                    <input type="text" class="form-control" id="productSKU" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="productCategory" class="form-label">Category</label>
                                    <select class="form-select" id="productCategory">
                                        <option value="">Select Category</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="productBrand" class="form-label">Brand</label>
                                    <input type="text" class="form-control" id="productBrand">
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="productCostPrice" class="form-label">Cost Price *</label>
                                    <input type="number" class="form-control" id="productCostPrice" step="0.01" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="productSellingPrice" class="form-label">Selling Price *</label>
                                    <input type="number" class="form-control" id="productSellingPrice" step="0.01" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="productReorderPoint" class="form-label">Reorder Point</label>
                                    <input type="number" class="form-control" id="productReorderPoint" value="10">
                                </div>
                                <div class="col-md-6">
                                    <label for="productUnit" class="form-label">Unit</label>
                                    <select class="form-select" id="productUnit">
                                        <option value="piece">Piece</option>
                                        <option value="bottle">Bottle</option>
                                        <option value="box">Box</option>
                                        <option value="kg">Kilogram</option>
                                        <option value="gram">Gram</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="productDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="productDescription" rows="3"></textarea>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="productHasFlavors">
                                    <label class="form-check-label" for="productHasFlavors">
                                        This product has flavors
                                    </label>
                                </div>
                            </div>
                            <div id="flavorSelection" class="mb-3" style="display: none;">
                                <label class="form-label">Available Flavors</label>
                                <div id="flavorCheckboxes">
                                    <!-- Flavor checkboxes will be populated here -->
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveProduct(${productId})">
                            <i class="fas fa-save me-2"></i>${isEdit ? 'Update' : 'Save'} Product
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('productModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate categories
    populateProductCategories();
    
    // Populate flavors
    populateProductFlavors();
    
    // Setup flavor toggle
    document.getElementById('productHasFlavors').addEventListener('change', function() {
        document.getElementById('flavorSelection').style.display = this.checked ? 'block' : 'none';
    });
    
    // If editing, load product data
    if (isEdit) {
        loadProductData(productId);
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// Helper functions for product modal
function populateProductCategories() {
    const categorySelect = document.getElementById('productCategory');
    if (categorySelect && categories) {
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }
}

function populateProductFlavors() {
    const flavorContainer = document.getElementById('flavorCheckboxes');
    if (flavorContainer && flavors) {
        flavorContainer.innerHTML = '';
        flavors.forEach(flavor => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${flavor.id}" id="flavor_${flavor.id}">
                <label class="form-check-label" for="flavor_${flavor.id}">
                    ${flavor.name}
                </label>
            `;
            flavorContainer.appendChild(div);
        });
    }
}

async function loadProductData(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            
            // Populate form fields
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productSKU').value = product.sku || '';
            document.getElementById('productCategory').value = product.category_id || '';
            document.getElementById('productBrand').value = product.brand || '';
            document.getElementById('productCostPrice').value = product.cost_price || '';
            document.getElementById('productSellingPrice').value = product.selling_price || '';
            document.getElementById('productReorderPoint').value = product.reorder_point || 10;
            document.getElementById('productUnit').value = product.unit || 'piece';
            document.getElementById('productDescription').value = product.description || '';
            
            // Handle flavors
            if (product.has_flavors) {
                document.getElementById('productHasFlavors').checked = true;
                document.getElementById('flavorSelection').style.display = 'block';
                
                // Check selected flavors
                if (product.flavors) {
                    product.flavors.forEach(flavor => {
                        const checkbox = document.getElementById(`flavor_${flavor.flavor_id}`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading product data:', error);
        showAlert('Error loading product data', 'danger');
    }
}

async function saveProduct(productId) {
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const productData = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSKU').value,
        category_id: document.getElementById('productCategory').value || null,
        brand: document.getElementById('productBrand').value,
        cost_price: parseFloat(document.getElementById('productCostPrice').value),
        selling_price: parseFloat(document.getElementById('productSellingPrice').value),
        reorder_point: parseInt(document.getElementById('productReorderPoint').value),
        unit: document.getElementById('productUnit').value,
        description: document.getElementById('productDescription').value,
        has_flavors: document.getElementById('productHasFlavors').checked
    };
    
    // Get selected flavors
    if (productData.has_flavors) {
        const selectedFlavors = [];
        document.querySelectorAll('#flavorCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedFlavors.push(parseInt(checkbox.value));
        });
        productData.flavor_ids = selectedFlavors;
    }
    
    try {
        showLoading(true);
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert(`Product ${productId ? 'updated' : 'created'} successfully!`, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();
            
            // Reload products
            await loadProducts();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save product'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showAlert('Network error occurred while saving product', 'danger');
    } finally {
        showLoading(false);
    }
}

function editProduct(id) {
    showProductModal(id);
}

function viewProduct(id) {
    showAlert('Product details coming soon', 'info');
}

function deleteProduct(id) {
    showAlert('Product deletion coming soon', 'info');
}

// Populate inventory products dropdown
async function populateInventoryProducts() {
    const selectElement = document.getElementById("inventoryProduct");
    if (!selectElement) return;

    selectElement.innerHTML = `
        <option value="">Select Product</option>
    `;
    try {
        const response = await fetch("/api/products");
        if (response.ok) {
            const products = await response.json();
            products.forEach(product => {
                const option = document.createElement("option");
                option.value = product.id;
                option.textContent = product.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error populating inventory products:", error);
    }
}

// Populate inventory stores dropdown
async function populateInventoryStores() {
    const selectElement = document.getElementById("inventoryStore");
    if (!selectElement) return;

    selectElement.innerHTML = `
        <option value="">Select Store</option>
    `;
    try {
        const response = await fetch("/api/stores");
        if (response.ok) {
            const stores = await response.json();
            stores.forEach(store => {
                const option = document.createElement("option");
                option.value = store.id;
                option.textContent = store.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error populating inventory stores:", error);
    }
}

// Search products function
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

// Filter products function
function filterProducts() {
    searchProducts(); // Reuse the search function which also handles category filtering
}

// Load inventory data function
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

// Load suppliers data function
async function loadSuppliersData() {
    try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
            const data = await response.json();
            displaySuppliers(data.suppliers || data);
        } else {
            showAlert('Failed to load suppliers: ' + response.status, 'danger');
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showAlert('Error loading suppliers data', 'danger');
    }
}

// Function to load the current store from local storage
function loadCurrentStoreFromLocalStorage() {
    const storedStoreId = localStorage.getItem("currentStoreId");
    if (storedStoreId) {
        currentStore = parseInt(storedStoreId);
        const storeSelect = document.getElementById("currentStore");
        if (storeSelect) {
            storeSelect.value = currentStore;
        }
    }
}

// Store change function
function changeStore() {
    const selectedStoreId = document.getElementById('currentStore').value;
    if (!selectedStoreId) {
        console.log('No store selected');
        return;
    }

    // Store in localStorage
    localStorage.setItem('currentStoreId', selectedStoreId);
    currentStore = parseInt(selectedStoreId);

    console.log(`Selected Store ID: ${selectedStoreId}`);
    // Reload data for the selected store
    loadDashboardData();
}

// Load stores function
async function loadStores() {
    try {
        const response = await fetch('/api/stores');
        if (!response.ok) throw new Error('Failed to fetch stores');

        const stores = await response.json();

        // Update store selector dropdown
        const storeSelect = document.getElementById('currentStore');
        if (storeSelect) {
            storeSelect.innerHTML = '<option value="">Select Store...</option>';
            for (const store of stores) {
                const opt = document.createElement('option');
                opt.value = store.id;
                opt.textContent = store.name;
                storeSelect.appendChild(opt);
            }
        }

        // Update table if exists
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

// Load categories function
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (response.ok) {
            categories = await response.json();
            populateCategoryFilter();
        } else if (response.status === 401) {
            console.error('Unauthorized. Please login.');
        } else {
            console.error('Failed to load categories:', response.status);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load flavors function
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

// Load products function
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const data = await response.json();
            products = data.products || data;
            displayProducts(products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load dashboard data function
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
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'block' : 'none';
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function setupEventListeners() {
    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('show');
            }
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth <= 768 && sidebar && toggle &&
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
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
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
}

// Product management
function populateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    if (filter && categories) {
        filter.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            filter.appendChild(option);
        });
    }
}

function displayProducts(productList) {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    
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
            <td>$${product.cost_price ? product.cost_price.toFixed(2) : '0.00'}</td>
            <td>$${product.selling_price ? product.selling_price.toFixed(2) : '0.00'}</td>
            <td>
                <span class="badge ${(product.total_quantity || 0) <= (product.reorder_point || 0) ? 'bg-danger' : 'bg-success'}">
                    ${product.total_quantity || 0}
                </span>
            </td>
            <td>
                ${product.flavors && product.flavors.length > 0 ? 
                    product.flavors.map(flavor => 
                        `<span class="flavor-tag">${flavor.flavor_name}</span>`
                    ).join('') : 
                    '<span class="text-muted">No flavors</span>'
                }
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

// Dashboard functions
function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboardStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number">${stats.inventory_summary?.total_items || 0}</div>
                <div class="stat-label">Total Items</div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number">$${(stats.inventory_summary?.total_value || 0).toFixed(2)}</div>
                <div class="stat-label">Inventory Value</div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number text-warning">${stats.inventory_summary?.low_stock_count || 0}</div>
                <div class="stat-label">Low Stock</div>
            </div>
        </div>
        <div class="card stat-card">
            <div class="card-body text-center">
                <div class="stat-number text-danger">${stats.inventory_summary?.expired_items || 0}</div>
                <div class="stat-label">Expired Items</div>
            </div>
        </div>
    `;
}

function displayLowStockAlerts(lowStockItems) {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;
    
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
    if (!container) return;
    
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

// Inventory Modal
function showInventoryModal() {
    const modalHTML = `
        <div class="modal fade" id="inventoryModal" tabindex="-1" aria-labelledby="inventoryModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="inventoryModalLabel">
                            <i class="fas fa-boxes me-2"></i>Add Inventory
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="inventoryForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="inventoryProduct" class="form-label">Product *</label>
                                    <select class="form-select" id="inventoryProduct" required>
                                        <option value="">Select Product</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="inventoryStore" class="form-label">Store *</label>
                                    <select class="form-select" id="inventoryStore" required>
                                        <option value="">Select Store</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="inventoryQuantity" class="form-label">Quantity *</label>
                                    <input type="number" class="form-control" id="inventoryQuantity" required min="1">
                                </div>
                                <div class="col-md-6">
                                    <label for="inventoryBatch" class="form-label">Batch Number</label>
                                    <input type="text" class="form-control" id="inventoryBatch">
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="inventoryExpiry" class="form-label">Expiry Date</label>
                                    <input type="date" class="form-control" id="inventoryExpiry">
                                </div>
                                <div class="col-md-6">
                                    <label for="inventoryLocation" class="form-label">Location</label>
                                    <input type="text" class="form-control" id="inventoryLocation" placeholder="Shelf/Aisle">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveInventory()">
                            <i class="fas fa-save me-2"></i>Save Inventory
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('inventoryModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate dropdowns
    populateInventoryProducts();
    populateInventoryStores();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('inventoryModal'));
    modal.show();
}

// Supplier Modal
function showSupplierModal() {
    const modalHTML = `
        <div class="modal fade" id="supplierModal" tabindex="-1" aria-labelledby="supplierModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="supplierModalLabel">
                            <i class="fas fa-truck me-2"></i>Add Supplier
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="supplierForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="supplierName" class="form-label">Supplier Name *</label>
                                    <input type="text" class="form-control" id="supplierName" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="supplierCode" class="form-label">Supplier Code</label>
                                    <input type="text" class="form-control" id="supplierCode">
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="supplierContact" class="form-label">Contact Person</label>
                                    <input type="text" class="form-control" id="supplierContact">
                                </div>
                                <div class="col-md-6">
                                    <label for="supplierPhone" class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="supplierPhone">
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="supplierEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="supplierEmail">
                                </div>
                                <div class="col-md-6">
                                    <label for="supplierPaymentTerms" class="form-label">Payment Terms</label>
                                    <select class="form-select" id="supplierPaymentTerms">
                                        <option value="net30">Net 30</option>
                                        <option value="net15">Net 15</option>
                                        <option value="cod">Cash on Delivery</option>
                                        <option value="prepaid">Prepaid</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="supplierAddress" class="form-label">Address</label>
                                <textarea class="form-control" id="supplierAddress" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveSupplier()">
                            <i class="fas fa-save me-2"></i>Save Supplier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('supplierModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('supplierModal'));
    modal.show();
}

// Flavor Modal
function showFlavorModal() {
    const modalHTML = `
        <div class="modal fade" id="flavorModal" tabindex="-1" aria-labelledby="flavorModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="flavorModalLabel">
                            <i class="fas fa-palette me-2"></i>Add Flavor
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="flavorForm">
                            <div class="mb-3">
                                <label for="flavorName" class="form-label">Flavor Name *</label>
                                <input type="text" class="form-control" id="flavorName" required>
                            </div>
                            <div class="mb-3">
                                <label for="flavorDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="flavorDescription" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveFlavor()">
                            <i class="fas fa-save me-2"></i>Save Flavor
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('flavorModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('flavorModal'));
    modal.show();
}

// Sale Modal
function showSaleModal() {
    const modalHTML = `
        <div class="modal fade" id="saleModal" tabindex="-1" aria-labelledby="saleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="saleModalLabel">
                            <i class="fas fa-cash-register me-2"></i>Manual Sale Entry
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="saleForm">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label for="saleCustomer" class="form-label">Customer Name</label>
                                    <input type="text" class="form-control" id="saleCustomer">
                                </div>
                                <div class="col-md-4">
                                    <label for="saleDate" class="form-label">Sale Date *</label>
                                    <input type="datetime-local" class="form-control" id="saleDate" required>
                                </div>
                                <div class="col-md-4">
                                    <label for="salePaymentMethod" class="form-label">Payment Method</label>
                                    <select class="form-select" id="salePaymentMethod">
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="transfer">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>
                            <hr>
                            <h6>Sale Items</h6>
                            <div id="saleItems">
                                <div class="sale-item-row row mb-2">
                                    <div class="col-md-4">
                                        <select class="form-select sale-product" required>
                                            <option value="">Select Product</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control sale-quantity" placeholder="Qty" min="1" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control sale-price" placeholder="Price" step="0.01" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="text" class="form-control sale-total" placeholder="Total" readonly>
                                    </div>
                                    <div class="col-md-2">
                                        <button type="button" class="btn btn-success btn-sm" onclick="addSaleItem()">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-md-8"></div>
                                <div class="col-md-4">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <strong>Total: </strong>
                                                <strong id="saleGrandTotal">$0.00</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveSale()">
                            <i class="fas fa-save me-2"></i>Save Sale
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('saleModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate product dropdown
    populateSaleProducts();
    
    // Set current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('saleDate').value = now.toISOString().slice(0, 16);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('saleModal'));
    modal.show();
}

// GRN Modal
function showGRNModal() {
    const modalHTML = `
        <div class="modal fade" id="grnModal" tabindex="-1" aria-labelledby="grnModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="grnModalLabel">
                            <i class="fas fa-clipboard-list me-2"></i>Goods Received Note
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="grnForm">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label for="grnSupplier" class="form-label">Supplier *</label>
                                    <select class="form-select" id="grnSupplier" required>
                                        <option value="">Select Supplier</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label for="grnDate" class="form-label">Received Date *</label>
                                    <input type="date" class="form-control" id="grnDate" required>
                                </div>
                                <div class="col-md-4">
                                    <label for="grnInvoice" class="form-label">Supplier Invoice</label>
                                    <input type="text" class="form-control" id="grnInvoice">
                                </div>
                            </div>
                            <hr>
                            <h6>Received Items</h6>
                            <div id="grnItems">
                                <div class="grn-item-row row mb-2">
                                    <div class="col-md-3">
                                        <select class="form-select grn-product" required>
                                            <option value="">Select Product</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control grn-quantity" placeholder="Qty" min="1" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="text" class="form-control grn-batch" placeholder="Batch">
                                    </div>
                                    <div class="col-md-2">
                                        <input type="date" class="form-control grn-expiry" placeholder="Expiry">
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control grn-cost" placeholder="Cost" step="0.01">
                                    </div>
                                    <div class="col-md-1">
                                        <button type="button" class="btn btn-success btn-sm" onclick="addGRNItem()">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveGRN()">
                            <i class="fas fa-save me-2"></i>Save GRN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('grnModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate dropdowns
    populateGRNSuppliers();
    populateGRNProducts();
    
    // Set current date
    document.getElementById('grnDate').value = new Date().toISOString().split('T')[0];
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('grnModal'));
    modal.show();
}

// Transfer Modal
function showTransferModal() {
    const modalHTML = `
        <div class="modal fade" id="transferModal" tabindex="-1" aria-labelledby="transferModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="transferModalLabel">
                            <i class="fas fa-exchange-alt me-2"></i>Stock Transfer
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="transferForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="transferFromStore" class="form-label">From Store *</label>
                                    <select class="form-select" id="transferFromStore" required>
                                        <option value="">Select Store</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="transferToStore" class="form-label">To Store *</label>
                                    <select class="form-select" id="transferToStore" required>
                                        <option value="">Select Store</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="transferProduct" class="form-label">Product *</label>
                                    <select class="form-select" id="transferProduct" required>
                                        <option value="">Select Product</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="transferQuantity" class="form-label">Quantity *</label>
                                    <input type="number" class="form-control" id="transferQuantity" required min="1">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="transferReason" class="form-label">Transfer Reason</label>
                                <textarea class="form-control" id="transferReason" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveTransfer()">
                            <i class="fas fa-save me-2"></i>Save Transfer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('transferModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate dropdowns
    populateTransferStores();
    populateTransferProducts();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('transferModal'));
    modal.show();
}

// Search and filter functions
function searchInventory() {
    showAlert('Inventory search will be implemented', 'info');
}

function filterInventory() {
    showAlert('Inventory filter will be implemented', 'info');
}

function searchSuppliers() {
    showAlert('Supplier search will be implemented', 'info');
}

function searchSales() {
    showAlert('Sales search will be implemented', 'info');
}

function filterSales() {
    showAlert('Sales filter will be implemented', 'info');
}

function searchGRN() {
    showAlert('GRN search will be implemented', 'info');
}

function filterGRN() {
    showAlert('GRN filter will be implemented', 'info');
}

function searchTransfers() {
    showAlert('Transfer search will be implemented', 'info');
}

function filterTransfers() {
    showAlert('Transfer filter will be implemented', 'info');
}

function searchTransactions() {
    showAlert('Transaction search will be implemented', 'info');
}

function filterTransactions() {
    showAlert('Transaction filter will be implemented', 'info');
}

// Export functions
function exportSales() {
    showAlert('Sales export will be implemented', 'info');
}

function exportTransactions() {
    showAlert('Transaction export will be implemented', 'info');
}

function exportInventory() {
    showAlert('Inventory export will be implemented', 'info');
}

// Edit/View functions
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

// Placeholder data loading functions
async function loadStoresData() {
    showAlert('Store data loading will be implemented', 'info');
}

async function loadFlavorsData() {
    showAlert('Flavor data loading will be implemented', 'info');
}

async function loadSalesHistory() {
    showAlert('Sales history loading will be implemented', 'info');
}

async function loadGRN() {
    showAlert('GRN data loading will be implemented', 'info');
}

async function loadStockTransfers() {
    showAlert('Stock transfer data loading will be implemented', 'info');
}

async function loadTransactionHistory() {
    showAlert('Transaction history loading will be implemented', 'info');
}

// POS functions
function initializePOS() {
    showAlert('POS initialization will be implemented', 'info');
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

function displayInventory(inventoryList) {
    showAlert('Inventory display will be implemented', 'info');
}

function displaySuppliers(suppliersList) {
    showAlert('Supplier display will be implemented', 'info');
}



// Helper functions for modal population
async function populateSaleProducts() {
    const productSelects = document.querySelectorAll('.sale-product');
    if (!productSelects.length) return;
    
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const products = await response.json();
            productSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Product</option>';
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.name} - $${product.selling_price}`;
                    option.dataset.price = product.selling_price;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Error populating sale products:', error);
    }
}

async function populateGRNSuppliers() {
    const supplierSelect = document.getElementById('grnSupplier');
    if (!supplierSelect) return;
    
    try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
            const suppliers = await response.json();
            supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                supplierSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating GRN suppliers:', error);
    }
}

async function populateGRNProducts() {
    const productSelects = document.querySelectorAll('.grn-product');
    if (!productSelects.length) return;
    
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const products = await response.json();
            productSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Product</option>';
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Error populating GRN products:', error);
    }
}

async function populateTransferStores() {
    const storeSelects = document.querySelectorAll('#transferFromStore, #transferToStore');
    if (!storeSelects.length) return;
    
    try {
        const response = await fetch('/api/stores');
        if (response.ok) {
            const stores = await response.json();
            storeSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Store</option>';
                stores.forEach(store => {
                    const option = document.createElement('option');
                    option.value = store.id;
                    option.textContent = store.name;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Error populating transfer stores:', error);
    }
}

async function populateTransferProducts() {
    const productSelect = document.getElementById('transferProduct');
    if (!productSelect) return;
    
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const products = await response.json();
            productSelect.innerHTML = '<option value="">Select Product</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                productSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating transfer products:', error);
    }
}

// Save functions for modals
async function saveInventory() {
    const form = document.getElementById('inventoryForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const inventoryData = {
        product_id: parseInt(document.getElementById('inventoryProduct').value),
        store_id: parseInt(document.getElementById('inventoryStore').value),
        quantity: parseInt(document.getElementById('inventoryQuantity').value),
        batch_number: document.getElementById('inventoryBatch').value,
        expiration_date: document.getElementById('inventoryExpiry').value || null,
        location: document.getElementById('inventoryLocation').value
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventoryData),
        });
        
        if (response.ok) {
            showAlert('Inventory added successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
            modal.hide();
            loadInventoryData();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save inventory'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving inventory:', error);
        showAlert('Network error occurred while saving inventory', 'danger');
    } finally {
        showLoading(false);
    }
}

async function saveSupplier() {
    const form = document.getElementById('supplierForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const supplierData = {
        name: document.getElementById('supplierName').value,
        code: document.getElementById('supplierCode').value,
        contact_person: document.getElementById('supplierContact').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        payment_terms: document.getElementById('supplierPaymentTerms').value,
        address: document.getElementById('supplierAddress').value
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/suppliers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(supplierData),
        });
        
        if (response.ok) {
            showAlert('Supplier added successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('supplierModal'));
            modal.hide();
            loadSuppliersData();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save supplier'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving supplier:', error);
        showAlert('Network error occurred while saving supplier', 'danger');
    } finally {
        showLoading(false);
    }
}

async function saveFlavor() {
    const form = document.getElementById('flavorForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const flavorData = {
        name: document.getElementById('flavorName').value,
        description: document.getElementById('flavorDescription').value
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/flavors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(flavorData),
        });
        
        if (response.ok) {
            showAlert('Flavor added successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('flavorModal'));
            modal.hide();
            loadFlavors();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save flavor'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving flavor:', error);
        showAlert('Network error occurred while saving flavor', 'danger');
    } finally {
        showLoading(false);
    }
}

async function saveSale() {
    const form = document.getElementById('saleForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collect sale items
    const saleItems = [];
    document.querySelectorAll('.sale-item-row').forEach(row => {
        const productId = row.querySelector('.sale-product').value;
        const quantity = row.querySelector('.sale-quantity').value;
        const price = row.querySelector('.sale-price').value;
        
        if (productId && quantity && price) {
            saleItems.push({
                product_id: parseInt(productId),
                quantity: parseInt(quantity),
                unit_price: parseFloat(price)
            });
        }
    });
    
    if (saleItems.length === 0) {
        showAlert('Please add at least one sale item', 'warning');
        return;
    }
    
    const saleData = {
        customer_name: document.getElementById('saleCustomer').value,
        sale_date: document.getElementById('saleDate').value,
        payment_method: document.getElementById('salePaymentMethod').value,
        store_id: currentStore,
        items: saleItems
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
            const result = await response.json();
            showAlert('Sale recorded successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('saleModal'));
            modal.hide();
            loadSalesHistory();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save sale'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving sale:', error);
        showAlert('Network error occurred while saving sale', 'danger');
    } finally {
        showLoading(false);
    }
}

async function saveGRN() {
    const form = document.getElementById('grnForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collect GRN items
    const grnItems = [];
    document.querySelectorAll('.grn-item-row').forEach(row => {
        const productId = row.querySelector('.grn-product').value;
        const quantity = row.querySelector('.grn-quantity').value;
        const batch = row.querySelector('.grn-batch').value;
        const expiry = row.querySelector('.grn-expiry').value;
        const cost = row.querySelector('.grn-cost').value;
        
        if (productId && quantity) {
            grnItems.push({
                product_id: parseInt(productId),
                quantity: parseInt(quantity),
                batch_number: batch,
                expiration_date: expiry || null,
                cost_price: cost ? parseFloat(cost) : null
            });
        }
    });
    
    if (grnItems.length === 0) {
        showAlert('Please add at least one GRN item', 'warning');
        return;
    }
    
    const grnData = {
        supplier_id: parseInt(document.getElementById('grnSupplier').value),
        received_date: document.getElementById('grnDate').value,
        supplier_invoice: document.getElementById('grnInvoice').value,
        store_id: currentStore,
        items: grnItems
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/grn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(grnData),
        });
        
        if (response.ok) {
            showAlert('GRN saved successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('grnModal'));
            modal.hide();
            loadGRN();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save GRN'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving GRN:', error);
        showAlert('Network error occurred while saving GRN', 'danger');
    } finally {
        showLoading(false);
    }
}

async function saveTransfer() {
    const form = document.getElementById('transferForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const transferData = {
        from_store_id: parseInt(document.getElementById('transferFromStore').value),
        to_store_id: parseInt(document.getElementById('transferToStore').value),
        product_id: parseInt(document.getElementById('transferProduct').value),
        quantity: parseInt(document.getElementById('transferQuantity').value),
        reason: document.getElementById('transferReason').value
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/transfers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transferData),
        });
        
        if (response.ok) {
            showAlert('Transfer created successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('transferModal'));
            modal.hide();
            loadStockTransfers();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save transfer'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving transfer:', error);
        showAlert('Network error occurred while saving transfer', 'danger');
    } finally {
        showLoading(false);
    }
}

// Dynamic item addition functions
function addSaleItem() {
    const saleItemsContainer = document.getElementById('saleItems');
    const newRow = document.createElement('div');
    newRow.className = 'sale-item-row row mb-2';
    newRow.innerHTML = `
        <div class="col-md-4">
            <select class="form-select sale-product" required>
                <option value="">Select Product</option>
            </select>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control sale-quantity" placeholder="Qty" min="1" required>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control sale-price" placeholder="Price" step="0.01" required>
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control sale-total" placeholder="Total" readonly>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeSaleItem(this)">
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `;
    saleItemsContainer.appendChild(newRow);
    populateSaleProducts();
}

function removeSaleItem(button) {
    button.closest('.sale-item-row').remove();
    calculateSaleTotal();
}

function addGRNItem() {
    const grnItemsContainer = document.getElementById('grnItems');
    const newRow = document.createElement('div');
    newRow.className = 'grn-item-row row mb-2';
    newRow.innerHTML = `
        <div class="col-md-3">
            <select class="form-select grn-product" required>
                <option value="">Select Product</option>
            </select>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control grn-quantity" placeholder="Qty" min="1" required>
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control grn-batch" placeholder="Batch">
        </div>
        <div class="col-md-2">
            <input type="date" class="form-control grn-expiry" placeholder="Expiry">
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control grn-cost" placeholder="Cost" step="0.01">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeGRNItem(this)">
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `;
    grnItemsContainer.appendChild(newRow);
    populateGRNProducts();
}

function removeGRNItem(button) {
    button.closest('.grn-item-row').remove();
}

function calculateSaleTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.sale-item-row').forEach(row => {
        const quantity = parseFloat(row.querySelector('.sale-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.sale-price').value) || 0;
        const total = quantity * price;
        row.querySelector('.sale-total').value = total.toFixed(2);
        grandTotal += total;
    });
    document.getElementById('saleGrandTotal').textContent = `$${grandTotal.toFixed(2)}`;
}

// Event listeners for sale calculations
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('sale-quantity') || e.target.classList.contains('sale-price')) {
        calculateSaleTotal();
    }
});

document.addEventListener('change', function(e) {
    if (e.target.classList.contains('sale-product')) {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const price = selectedOption.dataset.price;
        if (price) {
            const row = e.target.closest('.sale-item-row');
            row.querySelector('.sale-price').value = price;
            calculateSaleTotal();
        }
    }
});

