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

// async function saveProduct(productId) {
//     const form = document.getElementById('productForm');
//     if (!form.checkValidity()) {
//         form.reportValidity();
//         return;
//     }
    
//     const productData = {
//         name: document.getElementById('productName').value,
//         sku: document.getElementById('productSKU').value,
//         category_id: document.getElementById('productCategory').value || null,
//         brand: document.getElementById('productBrand').value,
//         cost_price: parseFloat(document.getElementById('productCostPrice').value),
//         selling_price: parseFloat(document.getElementById('productSellingPrice').value),
//         reorder_point: parseInt(document.getElementById('productReorderPoint').value),
//         unit: document.getElementById('productUnit').value,
//         description: document.getElementById('productDescription').value,
//         has_flavors: document.getElementById('productHasFlavors').checked
//     };
    
//     // Get selected flavors
//     if (productData.has_flavors) {
//         const selectedFlavors = [];
//         document.querySelectorAll('#flavorCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
//             selectedFlavors.push(parseInt(checkbox.value));
//         });
//         productData.flavor_ids = selectedFlavors;
//     }
    
//     try {
//         showLoading(true);
//         const url = productId ? `/api/products/${productId}` : '/api/products';
//         const method = productId ? 'PUT' : 'POST';
        
//         const response = await fetch(url, {
//             method: method,
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(productData),
//         });
        
//         if (response.ok) {
//             const result = await response.json();
//             showAlert(`Product ${productId ? 'updated' : 'created'} successfully!`, 'success');
            
//             // Close modal
//             const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
//             modal.hide();
            
//             // Reload products
//             await loadProducts();
//         } else {
//             const error = await response.json();
//             showAlert(`Error: ${error.error || 'Failed to save product'}`, 'danger');
//         }
//     } catch (error) {
//         console.error('Error saving product:', error);
//         showAlert('Network error occurred while saving product', 'danger');
//     } finally {
//         showLoading(false);
//     }
// }

async function saveProduct(productId) {
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const sellingPrice = parseFloat(document.getElementById('productSellingPrice').value);

    const productData = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSKU').value,
        category_id: document.getElementById('productCategory').value || null,
        brand: document.getElementById('productBrand').value,
        cost_price: parseFloat(document.getElementById('productCostPrice').value),
        selling_price: sellingPrice,
        price: sellingPrice, // FIX: Add the 'price' field for backend validation
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

// function viewProduct(id) {
//     showAlert('Product details coming soon', 'info');
// }

// function deleteProduct(id) {
//     showAlert('Product deletion coming soon', 'info');
// }


async function viewProduct(id) {
    try {
        showLoading(true);
        // Fetch both product details and inventory details concurrently
        const [productResponse, inventoryResponse] = await Promise.all([
            fetch(`/api/products/${id}`),
            fetch(`/api/inventory?product_id=${id}`)
        ]);

        if (!productResponse.ok) {
            throw new Error('Failed to load product details.');
        }
        if (!inventoryResponse.ok) {
            throw new Error('Failed to load product inventory.');
        }

        const product = await productResponse.json();
        const inventory = await inventoryResponse.json();
        
        const modalHTML = `
            <div class="modal fade" id="viewProductModal" tabindex="-1" aria-labelledby="viewProductModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="viewProductModalLabel">
                                <i class="fas fa-eye me-2"></i>Product Details: ${product.name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>General Information</h6>
                                    <p><strong>SKU:</strong> <code>${product.sku}</code></p>
                                    <p><strong>Category:</strong> ${product.category_name || 'N/A'}</p>
                                    <p><strong>Description:</strong> ${product.description || 'No description provided.'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Pricing & Stock</h6>
                                    <p><strong>Cost Price:</strong> ${formatCurrency(product.cost_price)}</p>
                                    <p><strong>Selling Price:</strong> ${formatCurrency(product.selling_price)}</p>
                                    <p><strong>Total Stock:</strong> <span class="badge bg-info">${product.total_quantity} units</span></p>
                                    <p><strong>Reorder Point:</strong> ${product.reorder_point} units</p>
                                </div>
                            </div>
                            <hr>
                            <h6>Flavors</h6>
                            <p>
                                ${product.flavors && product.flavors.length > 0 ? 
                                    product.flavors.map(f => `<span class="flavor-tag">${f.flavor_name}</span>`).join(' ') : 
                                    'No flavors for this product.'}
                            </p>
                            <hr>
                            <h6>Inventory Breakdown by Store</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-striped">
                                    <thead>
                                        <tr>
                                            <th>Store</th>
                                            <th>Batch</th>
                                            <th>Quantity</th>
                                            <th>Expiry Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${inventory.length > 0 ? inventory.map(item => `
                                            <tr>
                                                <td>${item.store_name}</td>
                                                <td><code>${item.batch_number}</code></td>
                                                <td>${item.quantity}</td>
                                                <td>${item.expiration_date ? formatDate(item.expiration_date) : 'N/A'}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="4" class="text-center">No inventory records found.</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="editProduct(${id})">
                                <i class="fas fa-edit me-2"></i>Edit Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Clean up previous modals and add the new one
        const existingModal = document.getElementById('viewProductModal');
        if (existingModal) {
            existingModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('viewProductModal'));
        modal.show();

    } catch (error) {
        console.error('Error viewing product:', error);
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function showDeleteConfirmModal(id, productName) {
    const modalHTML = `
        <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="deleteConfirmModalLabel">
                           <i class="fas fa-exclamation-triangle text-danger me-2"></i>Confirm Deletion
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete the product: <strong>${productName}</strong>?</p>
                        <p class="text-danger"><small>This action cannot be undone. You can only delete products that have no inventory.</small></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="executeDeleteProduct(${id})">
                            <i class="fas fa-trash me-2"></i>Delete Product
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('deleteConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}


function deleteProduct(id) {
    // Find the product name from the global products array to show in the confirmation
    const product = products.find(p => p.id === id);
    const productName = product ? product.name : `Product ID ${id}`;
    showDeleteConfirmModal(id, productName);
}

async function executeDeleteProduct(id) {
    // Hide the confirmation modal first
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
    if (modal) {
        modal.hide();
    }

    try {
        showLoading(true);
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            showAlert('Product deleted successfully!', 'success');
            await loadProducts(); // Refresh the product list
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete product.');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}


// Populate inventory products dropdown
// async function populateInventoryProducts() {
//     const selectElement = document.getElementById("inventoryProduct");
//     if (!selectElement) return;

//     selectElement.innerHTML = `
//         <option value="">Select Product</option>
//     `;
//     try {
//         const response = await fetch("/api/products");
//         if (response.ok) {
//             const products = await response.json();
//             products.forEach(product => {
//                 const option = document.createElement("option");
//                 option.value = product.id;
//                 option.textContent = product.name;
//                 selectElement.appendChild(option);
//             });
//         }
//     } catch (error) {
//         console.error("Error populating inventory products:", error);
//     }
// }


// Populate inventory products dropdown
async function populateInventoryProducts() {
    const selectElement = document.getElementById("inventoryProduct");
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">Loading Products...</option>`;
    try {
        const response = await fetch("/api/products");
        if (response.ok) {
            const data = await response.json();
            const productList = data.products || [];
            selectElement.innerHTML = `<option value="">Select Product</option>`;
            productList.forEach(product => {
                const option = document.createElement("option");
                option.value = product.id;
                option.textContent = product.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error populating inventory products:", error);
        selectElement.innerHTML = `<option value="">Error loading products</option>`;
    }
}


function handleProductSelectionChange() {
    const productId = document.getElementById('inventoryProduct').value;
    const product = products.find(p => p.id == productId);
    
    const costInput = document.getElementById('inventoryUnitCost');
    if (costInput && product) {
        costInput.value = product.cost_price || '';
    }

    const flavorRow = document.getElementById('flavorRow');
    const flavorSelect = document.getElementById('inventoryFlavor');
    if (flavorRow && flavorSelect && product) {
        if (product.has_flavors && product.flavors.length > 0) {
            flavorSelect.innerHTML = '<option value="">Select Flavor...</option>';
            product.flavors.forEach(flavorAssoc => {
                const option = document.createElement('option');
                option.value = flavorAssoc.id; // Use product_flavor_id
                option.textContent = flavorAssoc.flavor_name;
                flavorSelect.appendChild(option);
            });
            flavorRow.style.display = '';
            flavorSelect.required = true;
        } else {
            flavorRow.style.display = 'none';
            flavorSelect.innerHTML = '';
            flavorSelect.required = false;
        }
    }
}


async function populateInventorySuppliers() {
    const selectElement = document.getElementById("inventorySupplier");
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">Loading Suppliers...</option>`;
    try {
        const response = await fetch("/api/suppliers");
        if (response.ok) {
            const data = await response.json();
            const supplierList = data.suppliers || [];
            selectElement.innerHTML = `<option value="">Select Supplier (Optional)</option>`;
            supplierList.forEach(supplier => {
                const option = document.createElement("option");
                option.value = supplier.id;
                option.textContent = supplier.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error populating inventory suppliers:", error);
        selectElement.innerHTML = `<option value="">Error loading suppliers</option>`;
    }
}



// Populate inventory stores dropdown
async function populateInventoryStores() {
    const selectElement = document.getElementById("inventoryStore");
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">Loading Stores...</option>`;
    try {
        const response = await fetch("/api/stores");
        if (response.ok) {
            const stores = await response.json();
            selectElement.innerHTML = `<option value="">Select Store</option>`;
            stores.forEach(store => {
                const option = document.createElement("option");
                option.value = store.id;
                option.textContent = store.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error populating inventory stores:", error);
        selectElement.innerHTML = `<option value="">Error loading stores</option>`;
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
// async function loadInventoryData() {
//     if (!currentStore) {
//         showAlert('Please select a store first', 'warning');
//         return;
//     }
    
//     try {
//         const response = await fetch(`/api/inventory?store_id=${currentStore}`);
//         if (response.ok) {
//             const inventory = await response.json();
//             displayInventory(inventory);
//         }
//     } catch (error) {
//         console.error('Error loading inventory:', error);
//         showAlert('Error loading inventory data', 'danger');
//     }
// }
// FIX: Corrected the data handling in all functions that call displayInventory
async function loadInventoryData() {
    if (!currentStore) {
        showAlert('Please select a store first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/inventory?store_id=${currentStore}`);
        if (response.ok) {
            const inventoryList = await response.json();
            displayInventory(inventoryList); 
        } else {
             showAlert('Error loading inventory data', 'danger');
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
// function showInventoryModal() {
//     const modalHTML = `
//         <div class="modal fade" id="inventoryModal" tabindex="-1" aria-labelledby="inventoryModalLabel" aria-hidden="true">
//             <div class="modal-dialog modal-lg">
//                 <div class="modal-content">
//                     <div class="modal-header">
//                         <h5 class="modal-title" id="inventoryModalLabel">
//                             <i class="fas fa-boxes me-2"></i>Add Inventory
//                         </h5>
//                         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                     </div>
//                     <div class="modal-body">
//                         <form id="inventoryForm">
//                             <div class="row mb-3">
//                                 <div class="col-md-6">
//                                     <label for="inventoryProduct" class="form-label">Product *</label>
//                                     <select class="form-select" id="inventoryProduct" required>
//                                         <option value="">Select Product</option>
//                                     </select>
//                                 </div>
//                                 <div class="col-md-6">
//                                     <label for="inventoryStore" class="form-label">Store *</label>
//                                     <select class="form-select" id="inventoryStore" required>
//                                         <option value="">Select Store</option>
//                                     </select>
//                                 </div>
//                             </div>
//                             <div class="row mb-3">
//                                 <div class="col-md-6">
//                                     <label for="inventoryQuantity" class="form-label">Quantity *</label>
//                                     <input type="number" class="form-control" id="inventoryQuantity" required min="1">
//                                 </div>
//                                 <div class="col-md-6">
//                                     <label for="inventoryBatch" class="form-label">Batch Number</label>
//                                     <input type="text" class="form-control" id="inventoryBatch">
//                                 </div>
//                             </div>
//                             <div class="row mb-3">
//                                 <div class="col-md-6">
//                                     <label for="inventoryExpiry" class="form-label">Expiry Date</label>
//                                     <input type="date" class="form-control" id="inventoryExpiry">
//                                 </div>
//                                 <div class="col-md-6">
//                                     <label for="inventoryLocation" class="form-label">Location</label>
//                                     <input type="text" class="form-control" id="inventoryLocation" placeholder="Shelf/Aisle">
//                                 </div>
//                             </div>
//                         </form>
//                     </div>
//                     <div class="modal-footer">
//                         <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                         <button type="button" class="btn btn-primary" onclick="saveInventory()">
//                             <i class="fas fa-save me-2"></i>Save Inventory
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     `;
    
//     // Remove existing modal if any
//     const existingModal = document.getElementById('inventoryModal');
//     if (existingModal) {
//         existingModal.remove();
//     }
    
//     // Add modal to DOM
//     document.body.insertAdjacentHTML('beforeend', modalHTML);
    
//     // Populate dropdowns
//     populateInventoryProducts();
//     populateInventoryStores();
    
//     // Show modal
//     const modal = new bootstrap.Modal(document.getElementById('inventoryModal'));
//     modal.show();
// }


async function showInventoryModal(inventoryId = null) {
    const isEdit = inventoryId !== null;
    const modalTitle = isEdit ? 'Edit Inventory' : 'Add Inventory';

    const modalHTML = `
        <div class="modal fade" id="inventoryModal" tabindex="-1" aria-labelledby="inventoryModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="inventoryModalLabel">
                            <i class="fas fa-boxes me-2"></i>${modalTitle}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="inventoryForm">
                            <input type="hidden" id="inventoryId" value="${inventoryId || ''}">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="inventoryProduct" class="form-label">Product *</label>
                                    <select class="form-select" id="inventoryProduct" required></select>
                                </div>
                                <div class="col-md-6" id="flavorRow" style="display: none;">
                                    <label for="inventoryFlavor" class="form-label">Flavor *</label>
                                    <select class="form-select" id="inventoryFlavor" required></select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="inventoryStore" class="form-label">Store *</label>
                                    <select class="form-select" id="inventoryStore" required></select>
                                </div>
                                <div class="col-md-6">
                                    <label for="inventorySupplier" class="form-label">Supplier</label>
                                    <select class="form-select" id="inventorySupplier"></select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label for="inventoryQuantity" class="form-label">Quantity *</label>
                                    <input type="number" class="form-control" id="inventoryQuantity" required min="1">
                                </div>
                                <div class="col-md-4">
                                    <label for="inventoryUnitCost" class="form-label">Unit Cost</label>
                                    <input type="number" class="form-control" id="inventoryUnitCost" step="0.01" placeholder="e.g., 15.50">
                                </div>
                                <div class="col-md-4">
                                    <label for="inventoryBatch" class="form-label">Batch Number</label>
                                    <input type="text" class="form-control" id="inventoryBatch" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="inventoryExpiry" class="form-label">Expiry Date</label>
                                    <input type="date" class="form-control" id="inventoryExpiry">
                                </div>
                                <div class="col-md-6">
                                    <label for="inventoryLocation" class="form-label">Location</label>
                                    <input type="text" class="form-control" id="inventoryLocation" placeholder="e.g., Aisle 3, Shelf B">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="inventoryNotes" class="form-label">Notes</label>
                                <textarea class="form-control" id="inventoryNotes" rows="2"></textarea>
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
    
    const existingModal = document.getElementById('inventoryModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const productSelect = document.getElementById('inventoryProduct');
    productSelect.addEventListener('change', handleProductSelectionChange);

    await Promise.all([
        populateInventoryProducts(),
        populateInventoryStores(),
        populateInventorySuppliers()
    ]);

    if (currentStore) {
        document.getElementById('inventoryStore').value = currentStore;
    }
    
    if (isEdit) {
        await loadInventoryItemForEdit(inventoryId);
    }

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
async function showSaleModal() {
    const modalHTML = `
        <div class="modal fade" id="saleModal" tabindex="-1" aria-labelledby="saleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="saleModalLabel">
                            <i class="fas fa-cash-register me-2"></i>New Sale
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="saleForm" onsubmit="event.preventDefault(); saveSale();">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label for="saleCustomer" class="form-label">Customer Name</label>
                                    <input type="text" class="form-control" id="saleCustomer" placeholder="Optional">
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
                                <!-- Sale item rows will be dynamically added here -->
                            </div>
                            <button type="button" class="btn btn-success btn-sm mt-2" onclick="addSaleItem()">
                                <i class="fas fa-plus me-2"></i>Add Another Item
                            </button>
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
                        <button type="submit" class="btn btn-primary" form="saleForm">
                            <i class="fas fa-save me-2"></i>Save Sale
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('saleModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add the first sale item row automatically
    addSaleItem();
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('saleDate').value = now.toISOString().slice(0, 16);
    
    const modal = new bootstrap.Modal(document.getElementById('saleModal'));
    modal.show();
}


// GRN Modal
async function showGRNModal() {
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
                                    <select class="form-select" id="grnSupplier" required></select>
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
                                <!-- FIX: Updated the GRN item row to include a flavor dropdown -->
                                <div class="grn-item-row row mb-2 align-items-center">
                                    <div class="col-md-3">
                                        <select class="form-select grn-product" required>
                                            <option value="">Select Product</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <select class="form-select grn-flavor" style="display: none;" required></select>
                                    </div>
                                    <div class="col-md-1">
                                        <input type="number" class="form-control grn-quantity" placeholder="Qty" min="1" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="text" class="form-control grn-batch" placeholder="Batch">
                                    </div>
                                    <div class="col-md-2">
                                        <input type="date" class="form-control grn-expiry" placeholder="Expiry">
                                    </div>
                                    <div class="col-md-1">
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
    
    const existingModal = document.getElementById('grnModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // FIX: Attach the event listener to the first product dropdown
    document.querySelector('#grnItems .grn-product').addEventListener('change', handleGRNProductChange);

    await populateGRNSuppliers();
    await populateGRNProducts();
    
    document.getElementById('grnDate').value = new Date().toISOString().split('T')[0];
    
    const modal = new bootstrap.Modal(document.getElementById('grnModal'));
    modal.show();
}

async function handleTransferProductChange(event) {
    const productSelect = event.target;
    const productId = productSelect.value;
    const fromStoreId = document.getElementById('transferFromStore').value;
    const row = productSelect.closest('.transfer-item-row');
    const qtyLabel = row.querySelector('#available-qty-transfer');

    if (!productId) {
        qtyLabel.textContent = '';
        return;
    }

    if (!fromStoreId) {
        qtyLabel.textContent = 'Select a "From" store first.';
        return;
    }

    qtyLabel.textContent = 'Loading qty...';
    try {
        const response = await fetch(`/api/inventory?product_id=${productId}&store_id=${fromStoreId}`);
        if (response.ok) {
            const storeInventory = await response.json();
            const storeSpecificQty = storeInventory.reduce((sum, item) => sum + item.quantity, 0);
            qtyLabel.textContent = `Available: ${storeSpecificQty}`;
        } else {
            qtyLabel.textContent = 'Qty unavailable';
        }
    } catch (error) {
        console.error('Error fetching store-specific quantity:', error);
        qtyLabel.textContent = 'Qty error';
    }
}


function addTransferItem() {
    const container = document.getElementById('transferItems');
    const newRow = document.createElement('div');
    newRow.className = 'transfer-item-row row mb-2 align-items-center';
    newRow.innerHTML = `
        <div class="col-md-6">
            <select class="form-select transfer-product" required onchange="handleTransferProductChange(event)"></select>
            <small class="form-text text-muted ms-2" id="available-qty-transfer"></small>
        </div>
        <div class="col-md-4">
            <input type="number" class="form-control transfer-quantity" placeholder="Quantity" min="1" required>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.transfer-item-row').remove()">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(newRow);
    populateTransferProducts(newRow.querySelector('.transfer-product'));
}



// Transfer Modal
async function showTransferModal() {
    const modalHTML = `
        <div class="modal fade" id="transferModal" tabindex="-1" aria-labelledby="transferModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="transferModalLabel">
                            <i class="fas fa-exchange-alt me-2"></i>New Stock Transfer
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="transferForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="transferFromStore" class="form-label">From Store *</label>
                                    <select class="form-select" id="transferFromStore" required></select>
                                </div>
                                <div class="col-md-6">
                                    <label for="transferToStore" class="form-label">To Store *</label>
                                    <select class="form-select" id="transferToStore" required></select>
                                </div>
                            </div>
                            <hr>
                            <h6>Items to Transfer</h6>
                            <div id="transferItems">
                                <!-- Transfer item rows will be added here -->
                            </div>
                             <button type="button" class="btn btn-success btn-sm mt-2" onclick="addTransferItem()">
                                <i class="fas fa-plus me-2"></i>Add Item
                            </button>
                            <div class="mt-3">
                                <label for="transferNotes" class="form-label">Notes / Reason</label>
                                <textarea class="form-control" id="transferNotes" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveTransfer()">
                            <i class="fas fa-save me-2"></i>Create Transfer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('transferModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    addTransferItem(); // Add the first item row
    await populateTransferStores();
    
    const modal = new bootstrap.Modal(document.getElementById('transferModal'));
    modal.show();
}

// Search and filter functions
// function searchInventory() {
//     const searchTerm = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
//     const storeFilter = document.getElementById('inventoryStoreFilter')?.value || '';
    
//     if (!currentStore && !storeFilter) {
//         showAlert('Please select a store first', 'warning');
//         return;
//     }
    
//     const storeId = storeFilter || currentStore;
    
//     fetch(`/api/inventory?store_id=${storeId}&search=${encodeURIComponent(searchTerm)}`)
//         .then(response => response.json())
//         .then(inventory => {
//             const filteredInventory = inventory.filter(item => {
//                 return item.product_name.toLowerCase().includes(searchTerm) ||
//                        item.batch_number?.toLowerCase().includes(searchTerm) ||
//                        item.location?.toLowerCase().includes(searchTerm);
//             });
//             displayInventory(filteredInventory);
//         })
//         .catch(error => {
//             console.error('Error searching inventory:', error);
//             showAlert('Error searching inventory', 'danger');
//         });
// }

// function filterInventory() {
//     const statusFilter = document.getElementById('inventoryStatusFilter')?.value || '';
//     const expiryFilter = document.getElementById('inventoryExpiryFilter')?.value || '';
    
//     if (!currentStore) {
//         showAlert('Please select a store first', 'warning');
//         return;
//     }
    
//     fetch(`/api/inventory?store_id=${currentStore}`)
//         .then(response => response.json())
//         .then(inventory => {
//             let filteredInventory = inventory;
            
//             // Filter by status (low stock, expired, etc.)
//             if (statusFilter === 'low_stock') {
//                 filteredInventory = filteredInventory.filter(item => 
//                     item.quantity <= (item.reorder_point || 10)
//                 );
//             } else if (statusFilter === 'expired') {
//                 const today = new Date();
//                 filteredInventory = filteredInventory.filter(item => 
//                     item.expiration_date && new Date(item.expiration_date) < today
//                 );
//             } else if (statusFilter === 'expiring_soon') {
//                 const nextWeek = new Date();
//                 nextWeek.setDate(nextWeek.getDate() + 7);
//                 filteredInventory = filteredInventory.filter(item => 
//                     item.expiration_date && 
//                     new Date(item.expiration_date) <= nextWeek &&
//                     new Date(item.expiration_date) >= new Date()
//                 );
//             }
            
//             // Filter by expiry date range
//             if (expiryFilter) {
//                 const filterDate = new Date(expiryFilter);
//                 filteredInventory = filteredInventory.filter(item => 
//                     item.expiration_date && new Date(item.expiration_date) <= filterDate
//                 );
//             }
            
//             displayInventory(filteredInventory);
//         })
//         .catch(error => {
//             console.error('Error filtering inventory:', error);
//             showAlert('Error filtering inventory', 'danger');
//         });
// }
function searchInventory() {
    const searchTerm = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
    const storeFilter = document.getElementById('inventoryStoreFilter')?.value || '';
    
    if (!currentStore && !storeFilter) {
        showAlert('Please select a store first', 'warning');
        return;
    }
    
    const storeId = storeFilter || currentStore;
    
    fetch(`/api/inventory?store_id=${storeId}&search=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(inventoryList => {
            displayInventory(inventoryList);
        })
        .catch(error => {
            console.error('Error searching inventory:', error);
            showAlert('Error searching inventory', 'danger');
        });
}

function filterInventory() {
    const statusFilter = document.getElementById('inventoryStatusFilter')?.value || '';
    const expiryFilter = document.getElementById('inventoryExpiryFilter')?.value || '';
    
    if (!currentStore) {
        showAlert('Please select a store first', 'warning');
        return;
    }
    
    let url = `/api/inventory?store_id=${currentStore}`;
    if (statusFilter === 'expired') {
        url += '&expired=true';
    } else if (statusFilter === 'expiring_soon') {
        url += '&expiring_soon=true';
    }
    
    fetch(url)
        .then(response => response.json())
        .then(inventoryList => {
            let filteredList = inventoryList;
            
            if (statusFilter === 'low_stock') {
                filteredList = inventoryList.filter(item => 
                    item.quantity <= (item.reorder_point || 10)
                );
            }
            
            if (expiryFilter) {
                const filterDate = new Date(expiryFilter);
                filteredList = inventoryList.filter(item => 
                    item.expiration_date && new Date(item.expiration_date) <= filterDate
                );
            }
            
            displayInventory(filteredList);
        })
        .catch(error => {
            console.error('Error filtering inventory:', error);
            showAlert('Error filtering inventory', 'danger');
        });
}




function searchSuppliers() {
    const searchTerm = document.getElementById('supplierSearch')?.value.toLowerCase() || '';
    
    fetch('/api/suppliers')
        .then(response => response.json())
        .then(suppliers => {
            const filteredSuppliers = suppliers.filter(supplier => {
                return supplier.name.toLowerCase().includes(searchTerm) ||
                       supplier.code?.toLowerCase().includes(searchTerm) ||
                       supplier.contact_person?.toLowerCase().includes(searchTerm) ||
                       supplier.email?.toLowerCase().includes(searchTerm);
            });
            displaySuppliers(filteredSuppliers);
        })
        .catch(error => {
            console.error('Error searching suppliers:', error);
            showAlert('Error searching suppliers', 'danger');
        });
}

function searchSales() {
    const searchTerm = document.getElementById('salesSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('salesDateFrom')?.value || '';
    const dateTo = document.getElementById('salesDateTo')?.value || '';
    
    let url = '/api/sales?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            displaySales(data.sales); // FIX: Extract sales array from response object
        })
        .catch(error => {
            console.error('Error searching sales:', error);
            showAlert('Error searching sales', 'danger');
        });
}

function filterSales() {
    const paymentMethodFilter = document.getElementById('salesPaymentFilter')?.value || '';
    const amountFilter = document.getElementById('salesAmountFilter')?.value || '';
    
    let url = '/api/sales?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (paymentMethodFilter) url += `payment_method=${paymentMethodFilter}&`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let salesList = data.sales; // FIX: Extract sales array from response object
            
            // Client-side filtering for amount range
            if (amountFilter === 'under_50') {
                salesList = salesList.filter(sale => sale.total_amount < 50);
            } else if (amountFilter === '50_100') {
                salesList = salesList.filter(sale => 
                    sale.total_amount >= 50 && sale.total_amount <= 100
                );
            } else if (amountFilter === 'over_100') {
                salesList = salesList.filter(sale => sale.total_amount > 100);
            }
            
            displaySales(salesList);
        })
        .catch(error => {
            console.error('Error filtering sales:', error);
            showAlert('Error filtering sales', 'danger');
        });
}


async function searchGRN() {
    const searchTerm = document.getElementById('grnSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('grnDateFrom')?.value || '';
    const dateTo = document.getElementById('grnDateTo')?.value || '';
    
    // FIX: Changed URL from '/api/grn?' to '/api/grns?'
    let url = '/api/grns?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            displayGRNs(data.grns || data);
        } else {
            const errorText = await response.text();
            console.error("Server Response (not JSON):", errorText);
            showAlert('A server error occurred while searching GRNs.', 'danger');
        }
    } catch (error) {
        console.error('Error searching GRNs:', error);
        showAlert('Error searching GRNs', 'danger');
    }
}


async function filterGRN() {
    const supplierFilter = document.getElementById('grnSupplierFilter')?.value || '';
    const statusFilter = document.getElementById('grnStatusFilter')?.value || '';
    
    // FIX: Changed URL from '/api/grn?' to '/api/grns?'
    let url = '/api/grns?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (supplierFilter) url += `supplier_id=${supplierFilter}&`;
    if (statusFilter) url += `status=${statusFilter}&`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            displayGRNs(data.grns || data);
        } else {
            const errorText = await response.text();
            console.error("Server Response (not JSON):", errorText);
            showAlert('A server error occurred while filtering GRNs.', 'danger');
        }
    } catch (error) {
        console.error('Error filtering GRNs:', error);
        showAlert('Error filtering GRNs', 'danger');
    }
}

function searchTransfers() {
    const searchTerm = document.getElementById('transferSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('transferDateFrom')?.value || '';
    const dateTo = document.getElementById('transferDateTo')?.value || '';
    
    let url = '/api/stock_transfers?';
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(transfers => {
            const filteredTransfers = transfers.filter(transfer => {
                return transfer.product_name?.toLowerCase().includes(searchTerm) ||
                       transfer.from_store_name?.toLowerCase().includes(searchTerm) ||
                       transfer.to_store_name?.toLowerCase().includes(searchTerm) ||
                       transfer.reason?.toLowerCase().includes(searchTerm);
            });
            displayTransfers(filteredTransfers);
        })
        .catch(error => {
            console.error('Error searching transfers:', error);
            showAlert('Error searching transfers', 'danger');
        });
}

function filterTransfers() {
    const statusFilter = document.getElementById('transferStatusFilter')?.value || '';
    const storeFilter = document.getElementById('transferStoreFilter')?.value || '';
    
    let url = '/api/stock_transfers?';
    if (statusFilter) url += `status=${statusFilter}&`;
    if (storeFilter) url += `store_id=${storeFilter}&`;
    
    fetch(url)
        .then(response => response.json())
        .then(transfers => {
            displayTransfers(transfers);
        })
        .catch(error => {
            console.error('Error filtering transfers:', error);
            showAlert('Error filtering transfers', 'danger');
        });
}

function searchTransactions() {
    const searchTerm = document.getElementById('transactionSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('transactionDateFrom')?.value || '';
    const dateTo = document.getElementById('transactionDateTo')?.value || '';
    const typeFilter = document.getElementById('transactionTypeFilter')?.value || '';
    
    let url = '/api/transactions?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}&`;
    if (typeFilter) url += `type=${typeFilter}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // FIX: The API returns a paginated object with a 'transactions' array.
            displayTransactions(data.transactions);
        })
        .catch(error => {
            console.error('Error searching transactions:', error);
            showAlert('Error searching transactions', 'danger');
        });
}

function filterTransactions() {
    const amountFilter = document.getElementById('transactionAmountFilter')?.value || '';
    const categoryFilter = document.getElementById('transactionCategoryFilter')?.value || '';
    
    let url = '/api/transactions?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (categoryFilter) url += `category=${categoryFilter}&`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // FIX: The API returns a paginated object with a 'transactions' array.
            let transactions = data.transactions;
            
            // Client-side filtering for amount (if needed)
            if (amountFilter === 'under_100') {
                transactions = transactions.filter(t => Math.abs(t.amount) < 100);
            } else if (amountFilter === '100_500') {
                transactions = transactions.filter(t => 
                    Math.abs(t.amount) >= 100 && Math.abs(t.amount) <= 500
                );
            } else if (amountFilter === 'over_500') {
                transactions = transactions.filter(t => Math.abs(t.amount) > 500);
            }
            
            displayTransactions(transactions);
        })
        .catch(error => {
            console.error('Error filtering transactions:', error);
            showAlert('Error filtering transactions', 'danger');
        });
}

// Export functions
function exportSales() {
    const dateFrom = document.getElementById('salesDateFrom')?.value || '';
    const dateTo = document.getElementById('salesDateTo')?.value || '';
    
    let url = '/api/sales?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}`;
    
    fetch(url)
        .then(response => response.json())
        .then(sales => {
            if (sales.length === 0) {
                showAlert('No sales data to export', 'warning');
                return;
            }
            
            // Prepare CSV data
            const headers = ['Date', 'Invoice Number', 'Customer', 'Payment Method', 'Total Amount', 'Items'];
            const csvData = [headers];
            
            sales.forEach(sale => {
                const items = sale.items ? sale.items.map(item => 
                    `${item.product_name} (${item.quantity}x$${item.unit_price})`
                ).join('; ') : '';
                
                csvData.push([
                    formatDate(sale.sale_date),
                    sale.invoice_number || '',
                    sale.customer_name || 'Walk-in Customer',
                    sale.payment_method || '',
                    `$${sale.total_amount?.toFixed(2) || '0.00'}`,
                    items
                ]);
            });
            
            downloadCSV(csvData, `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
            showAlert('Sales data exported successfully!', 'success');
        })
        .catch(error => {
            console.error('Error exporting sales:', error);
            showAlert('Error exporting sales data', 'danger');
        });
}

function exportTransactions() {
    const dateFrom = document.getElementById('transactionDateFrom')?.value || '';
    const dateTo = document.getElementById('transactionDateTo')?.value || '';
    const typeFilter = document.getElementById('transactionTypeFilter')?.value || '';
    
    let url = '/api/transactions?';
    if (currentStore) url += `store_id=${currentStore}&`;
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}&`;
    if (typeFilter) url += `type=${typeFilter}`;
    
    fetch(url)
        .then(response => response.json())
        .then(transactions => {
            if (transactions.length === 0) {
                showAlert('No transaction data to export', 'warning');
                return;
            }
            
            // Prepare CSV data
            const headers = ['Date', 'Type', 'Description', 'Reference', 'Amount', 'Product', 'Quantity'];
            const csvData = [headers];
            
            transactions.forEach(transaction => {
                csvData.push([
                    formatDateTime(transaction.transaction_date),
                    transaction.transaction_type || '',
                    transaction.description || '',
                    transaction.reference || '',
                    `$${transaction.amount?.toFixed(2) || '0.00'}`,
                    transaction.product_name || '',
                    transaction.quantity || ''
                ]);
            });
            
            downloadCSV(csvData, `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
            showAlert('Transaction data exported successfully!', 'success');
        })
        .catch(error => {
            console.error('Error exporting transactions:', error);
            showAlert('Error exporting transaction data', 'danger');
        });
}

function exportInventory() {
    if (!currentStore) {
        showAlert('Please select a store first', 'warning');
        return;
    }
    
    fetch(`/api/inventory?store_id=${currentStore}`)
        .then(response => response.json())
        .then(inventory => {
            if (inventory.length === 0) {
                showAlert('No inventory data to export', 'warning');
                return;
            }
            
            // Prepare CSV data
            const headers = ['Product Name', 'SKU', 'Quantity', 'Batch Number', 'Expiry Date', 'Location', 'Cost Price', 'Selling Price', 'Status'];
            const csvData = [headers];
            
            inventory.forEach(item => {
                const status = item.quantity <= (item.reorder_point || 10) ? 'Low Stock' : 
                              (item.expiration_date && new Date(item.expiration_date) < new Date()) ? 'Expired' :
                              (item.expiration_date && new Date(item.expiration_date) <= new Date(Date.now() + 7*24*60*60*1000)) ? 'Expiring Soon' : 'Good';
                
                csvData.push([
                    item.product_name || '',
                    item.sku || '',
                    item.quantity || 0,
                    item.batch_number || '',
                    item.expiration_date ? formatDate(item.expiration_date) : '',
                    item.location || '',
                    `$${item.cost_price?.toFixed(2) || '0.00'}`,
                    `$${item.selling_price?.toFixed(2) || '0.00'}`,
                    status
                ]);
            });
            
            downloadCSV(csvData, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
            showAlert('Inventory data exported successfully!', 'success');
        })
        .catch(error => {
            console.error('Error exporting inventory:', error);
            showAlert('Error exporting inventory data', 'danger');
        });
}

// Helper function to download CSV
function downloadCSV(data, filename) {
    const csvContent = data.map(row => 
        row.map(field => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const escaped = String(field).replace(/"/g, '""');
            return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Edit/View functions
function editInventory(id) {
    fetch(`/api/inventory/${id}`)
        .then(response => response.json())
        .then(inventory => {
            // Pre-populate the inventory modal with existing data
            showInventoryModal();
            
            // Wait for modal to be created, then populate
            setTimeout(() => {
                document.getElementById('inventoryProduct').value = inventory.product_id;
                document.getElementById('inventoryStore').value = inventory.store_id;
                document.getElementById('inventoryQuantity').value = inventory.quantity;
                document.getElementById('inventoryBatch').value = inventory.batch_number || '';
                document.getElementById('inventoryExpiry').value = inventory.expiration_date || '';
                document.getElementById('inventoryLocation').value = inventory.location || '';
                
                // Update modal title and save function
                document.getElementById('inventoryModalLabel').innerHTML = 
                    '<i class="fas fa-boxes me-2"></i>Edit Inventory';
                
                // Replace save button onclick
                const saveBtn = document.querySelector('#inventoryModal .btn-primary');
                saveBtn.onclick = () => updateInventory(id);
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Inventory';
            }, 100);
        })
        .catch(error => {
            console.error('Error loading inventory:', error);
            showAlert('Error loading inventory data', 'danger');
        });
}

function viewInventory(id) {
    fetch(`/api/inventory/${id}`)
        .then(response => response.json())
        .then(inventory => {
            const modalHTML = `
                <div class="modal fade" id="viewInventoryModal" tabindex="-1" aria-labelledby="viewInventoryModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="viewInventoryModalLabel">
                                    <i class="fas fa-eye me-2"></i>Inventory Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Product Information</h6>
                                        <p><strong>Product:</strong> ${inventory.product_name}</p>
                                        <p><strong>SKU:</strong> ${inventory.sku || 'N/A'}</p>
                                        <p><strong>Store:</strong> ${inventory.store_name}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Inventory Details</h6>
                                        <p><strong>Quantity:</strong> ${inventory.quantity}</p>
                                        <p><strong>Batch Number:</strong> ${inventory.batch_number || 'N/A'}</p>
                                        <p><strong>Location:</strong> ${inventory.location || 'N/A'}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Dates</h6>
                                        <p><strong>Added:</strong> ${formatDateTime(inventory.created_at)}</p>
                                        <p><strong>Last Updated:</strong> ${formatDateTime(inventory.updated_at)}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Expiry Information</h6>
                                        <p><strong>Expiry Date:</strong> ${inventory.expiration_date ? formatDate(inventory.expiration_date) : 'N/A'}</p>
                                        <p><strong>Status:</strong> 
                                            <span class="badge ${inventory.quantity <= (inventory.reorder_point || 10) ? 'bg-danger' : 'bg-success'}">
                                                ${inventory.quantity <= (inventory.reorder_point || 10) ? 'Low Stock' : 'In Stock'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="editInventory(${id})">
                                    <i class="fas fa-edit me-2"></i>Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('viewInventoryModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to DOM and show
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('viewInventoryModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading inventory:', error);
            showAlert('Error loading inventory data', 'danger');
        });
}

function editSupplier(id) {
    fetch(`/api/suppliers/${id}`)
        .then(response => response.json())
        .then(supplier => {
            // Pre-populate the supplier modal with existing data
            showSupplierModal();
            
            // Wait for modal to be created, then populate
            setTimeout(() => {
                document.getElementById('supplierName').value = supplier.name || '';
                document.getElementById('supplierCode').value = supplier.code || '';
                document.getElementById('supplierContact').value = supplier.contact_person || '';
                document.getElementById('supplierPhone').value = supplier.phone || '';
                document.getElementById('supplierEmail').value = supplier.email || '';
                document.getElementById('supplierPaymentTerms').value = supplier.payment_terms || 'net30';
                document.getElementById('supplierAddress').value = supplier.address || '';
                
                // Update modal title and save function
                document.getElementById('supplierModalLabel').innerHTML = 
                    '<i class="fas fa-truck me-2"></i>Edit Supplier';
                
                // Replace save button onclick
                const saveBtn = document.querySelector('#supplierModal .btn-primary');
                saveBtn.onclick = () => updateSupplier(id);
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Supplier';
            }, 100);
        })
        .catch(error => {
            console.error('Error loading supplier:', error);
            showAlert('Error loading supplier data', 'danger');
        });
}

function viewSupplier(id) {
    fetch(`/api/suppliers/${id}`)
        .then(response => response.json())
        .then(supplier => {
            const modalHTML = `
                <div class="modal fade" id="viewSupplierModal" tabindex="-1" aria-labelledby="viewSupplierModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="viewSupplierModalLabel">
                                    <i class="fas fa-eye me-2"></i>Supplier Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Basic Information</h6>
                                        <p><strong>Name:</strong> ${supplier.name}</p>
                                        <p><strong>Code:</strong> ${supplier.code || 'N/A'}</p>
                                        <p><strong>Contact Person:</strong> ${supplier.contact_person || 'N/A'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Contact Information</h6>
                                        <p><strong>Phone:</strong> ${supplier.phone || 'N/A'}</p>
                                        <p><strong>Email:</strong> ${supplier.email || 'N/A'}</p>
                                        <p><strong>Payment Terms:</strong> ${supplier.payment_terms || 'N/A'}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12">
                                        <h6>Address</h6>
                                        <p>${supplier.address || 'No address provided'}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Status</h6>
                                        <p><strong>Active:</strong> 
                                            <span class="badge ${supplier.is_active ? 'bg-success' : 'bg-danger'}">
                                                ${supplier.is_active ? 'Yes' : 'No'}
                                            </span>
                                        </p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Dates</h6>
                                        <p><strong>Added:</strong> ${formatDateTime(supplier.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="editSupplier(${id})">
                                    <i class="fas fa-edit me-2"></i>Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('viewSupplierModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to DOM and show
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('viewSupplierModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading supplier:', error);
            showAlert('Error loading supplier data', 'danger');
        });
}

function editStore(id) {
    fetch(`/api/stores/${id}`)
        .then(response => response.json())
        .then(store => {
            const modalHTML = `
                <div class="modal fade" id="editStoreModal" tabindex="-1" aria-labelledby="editStoreModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editStoreModalLabel">
                                    <i class="fas fa-store me-2"></i>Edit Store
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editStoreForm">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="editStoreName" class="form-label">Store Name *</label>
                                            <input type="text" class="form-control" id="editStoreName" value="${store.name || ''}" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="editStoreManager" class="form-label">Manager Name</label>
                                            <input type="text" class="form-control" id="editStoreManager" value="${store.manager_name || ''}">
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="editStorePhone" class="form-label">Phone</label>
                                            <input type="tel" class="form-control" id="editStorePhone" value="${store.phone || ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="editStoreEmail" class="form-label">Email</label>
                                            <input type="email" class="form-control" id="editStoreEmail" value="${store.email || ''}">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editStoreAddress" class="form-label">Address</label>
                                        <textarea class="form-control" id="editStoreAddress" rows="3">${store.address || ''}</textarea>
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="editStoreActive" ${store.is_active ? 'checked' : ''}>
                                            <label class="form-check-label" for="editStoreActive">
                                                Store is active
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="updateStore(${id})">
                                    <i class="fas fa-save me-2"></i>Update Store
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('editStoreModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to DOM and show
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('editStoreModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading store:', error);
            showAlert('Error loading store data', 'danger');
        });
}

function showStoreModal(storeId = null) {
    const isEdit = storeId !== null;
    const modalTitle = isEdit ? 'Edit Store' : 'Add New Store';

    const modalHTML = `
        <div class="modal fade" id="storeModal" tabindex="-1" aria-labelledby="storeModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="storeModalLabel">${modalTitle}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="storeForm">
                            <input type="hidden" id="storeId" value="${storeId || ''}">
                            <div class="mb-3">
                                <label for="storeName" class="form-label">Store Name *</label>
                                <input type="text" class="form-control" id="storeName" required>
                            </div>
                            <div class="mb-3">
                                <label for="storeAddress" class="form-label">Address</label>
                                <textarea class="form-control" id="storeAddress" rows="2"></textarea>
                            </div>
                             <div class="mb-3">
                                <label for="storePhone" class="form-label">Phone</label>
                                <input type="tel" class="form-control" id="storePhone">
                            </div>
                             <div class="mb-3">
                                <label for="storeEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="storeEmail">
                            </div>
                            <div class="mb-3">
                                <label for="managerName" class="form-label">Manager Name</label>
                                <input type="text" class="form-control" id="managerName">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveStore()">Save Store</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('storeModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    if (isEdit) {
        // You would typically fetch the store data here and populate the form
    }

    const modal = new bootstrap.Modal(document.getElementById('storeModal'));
    modal.show();
}


async function saveStore() {
    const storeId = document.getElementById('storeId').value;
    const isEdit = !!storeId;

    const storeData = {
        name: document.getElementById('storeName').value,
        address: document.getElementById('storeAddress').value,
        phone: document.getElementById('storePhone').value,
        email: document.getElementById('storeEmail').value,
        manager_name: document.getElementById('managerName').value,
    };

    if (!storeData.name) {
        showAlert('Store Name is required.', 'warning');
        return;
    }

    const url = isEdit ? `/api/stores/${storeId}` : '/api/stores';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        showLoading(true);
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storeData)
        });

        if (response.ok) {
            showAlert(`Store ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('storeModal'));
            modal.hide();
            await loadStores(); // Refresh the main store dropdown
            await loadStoresData(); // Refresh the stores table if on that page
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to save store.'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving store:', error);
        showAlert('A network error occurred while saving the store.', 'danger');
    } finally {
        showLoading(false);
    }
}


function viewStore(id) {
    fetch(`/api/stores/${id}`)
        .then(response => response.json())
        .then(store => {
            const modalHTML = `
                <div class="modal fade" id="viewStoreModal" tabindex="-1" aria-labelledby="viewStoreModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="viewStoreModalLabel">
                                    <i class="fas fa-eye me-2"></i>Store Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Basic Information</h6>
                                        <p><strong>Name:</strong> ${store.name}</p>
                                        <p><strong>Manager:</strong> ${store.manager_name || 'N/A'}</p>
                                        <p><strong>Status:</strong> 
                                            <span class="badge ${store.is_active ? 'bg-success' : 'bg-danger'}">
                                                ${store.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Contact Information</h6>
                                        <p><strong>Phone:</strong> ${store.phone || 'N/A'}</p>
                                        <p><strong>Email:</strong> ${store.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12">
                                        <h6>Address</h6>
                                        <p>${store.address || 'No address provided'}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="editStore(${id})">
                                    <i class="fas fa-edit me-2"></i>Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('viewStoreModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to DOM and show
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('viewStoreModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading store:', error);
            showAlert('Error loading store data', 'danger');
        });
}

function editFlavor(id) {
    fetch(`/api/flavors/${id}`)
        .then(response => response.json())
        .then(flavor => {
            // Pre-populate the flavor modal with existing data
            showFlavorModal();
            
            // Wait for modal to be created, then populate
            setTimeout(() => {
                document.getElementById('flavorName').value = flavor.name || '';
                document.getElementById('flavorDescription').value = flavor.description || '';
                
                // Update modal title and save function
                document.getElementById('flavorModalLabel').innerHTML = 
                    '<i class="fas fa-palette me-2"></i>Edit Flavor';
                
                // Replace save button onclick
                const saveBtn = document.querySelector('#flavorModal .btn-primary');
                saveBtn.onclick = () => updateFlavor(id);
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Flavor';
            }, 100);
        })
        .catch(error => {
            console.error('Error loading flavor:', error);
            showAlert('Error loading flavor data', 'danger');
        });
}

function deleteFlavor(id) {
    if (confirm('Are you sure you want to delete this flavor? This action cannot be undone.')) {
        fetch(`/api/flavors/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                showAlert('Flavor deleted successfully!', 'success');
                loadFlavors();
            } else {
                return response.json().then(error => {
                    throw new Error(error.error || 'Failed to delete flavor');
                });
            }
        })
        .catch(error => {
            console.error('Error deleting flavor:', error);
            showAlert(`Error: ${error.message}`, 'danger');
        });
    }
}

function viewSale(id) {
    fetch(`/api/sales/${id}`)
        .then(response => response.json())
        .then(sale => {
            const modalHTML = `
                <div class="modal fade" id="viewSaleModal" tabindex="-1" aria-labelledby="viewSaleModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="viewSaleModalLabel">
                                    <i class="fas fa-eye me-2"></i>Sale Details - ${sale.invoice_number || 'N/A'}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <h6>Sale Information</h6>
                                        <p><strong>Invoice Number:</strong> ${sale.invoice_number || 'N/A'}</p>
                                        <p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
                                        <p><strong>Date:</strong> ${formatDateTime(sale.sale_date)}</p>
                                        <p><strong>Payment Method:</strong> ${sale.payment_method || 'N/A'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Store & Total</h6>
                                        <p><strong>Store:</strong> ${sale.store_name || 'N/A'}</p>
                                        <p><strong>Total Amount:</strong> <span class="h5 text-success">$${sale.total_amount?.toFixed(2) || '0.00'}</span></p>
                                        <p><strong>Status:</strong> 
                                            <span class="badge bg-success">Completed</span>
                                        </p>
                                    </div>
                                </div>
                                <h6>Sale Items</h6>
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Quantity</th>
                                                <th>Unit Price</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${sale.items ? sale.items.map(item => `
                                                <tr>
                                                    <td>${item.product_name}</td>
                                                    <td>${item.quantity}</td>
                                                    <td>$${item.unit_price?.toFixed(2) || '0.00'}</td>
                                                    <td>$${(item.quantity * item.unit_price)?.toFixed(2) || '0.00'}</td>
                                                </tr>
                                            `).join('') : '<tr><td colspan="4" class="text-center">No items found</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="printInvoice('${sale.invoice_number}')">
                                    <i class="fas fa-print me-2"></i>Print Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('viewSaleModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to DOM and show
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('viewSaleModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading sale:', error);
            showAlert('Error loading sale data', 'danger');
        });
}

async function printInvoice(saleId) {
    if (!saleId) {
        showAlert('Invalid Sale ID for printing.', 'danger');
        return;
    }
    try {
        const response = await fetch(`/api/sales/${saleId}/invoice`);
        if (!response.ok) {
            throw new Error('Failed to generate the invoice PDF.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        // Open the PDF in a new tab
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error printing invoice:', error);
        showAlert('Could not generate or display the invoice PDF.', 'danger');
    }
}

async function viewGRN(id) {
    try {
        showLoading(true);
        const response = await fetch(`/api/grns/${id}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to load GRN details. Server response: ${errorText}`);
        }
        
        const grn = await response.json();
        
        const modalHTML = `
            <div class="modal fade" id="viewGRNModal" tabindex="-1" aria-labelledby="viewGRNModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="viewGRNModalLabel">
                                <i class="fas fa-eye me-2"></i>GRN Details - ${grn.grn_number || 'N/A'}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6>GRN Information</h6>
                                    <p><strong>GRN Number:</strong> ${grn.grn_number || 'N/A'}</p>
                                    <p><strong>Supplier:</strong> ${grn.supplier_name || 'N/A'}</p>
                                    <p><strong>Received Date:</strong> ${formatDate(grn.received_date)}</p>
                                    <p><strong>Supplier Invoice:</strong> ${grn.invoice_number || 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Store & Status</h6>
                                    <p><strong>Store:</strong> ${grn.store_name || 'N/A'}</p>
                                    <p><strong>Created By:</strong> ${grn.creator_name || 'N/A'}</p>
                                    <p><strong>Status:</strong> 
                                        <span class="badge bg-success">${grn.status || 'N/A'}</span>
                                    </p>
                                </div>
                            </div>
                            <h6>Received Items</h6>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Flavor</th>
                                            <th>Quantity Received</th>
                                            <th>Batch Number</th>
                                            <th>Expiry Date</th>
                                            <th>Unit Cost</th>
                                            <th>Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${grn.items && grn.items.length > 0 ? grn.items.map(item => `
                                            <tr>
                                                <td>${item.product_name || 'N/A'}</td>
                                                <td>${item.flavor_name || 'N/A'}</td>
                                                <td>${item.quantity_received}</td>
                                                <td><code>${item.batch_number || 'N/A'}</code></td>
                                                <td>${item.expiration_date ? formatDate(item.expiration_date) : 'N/A'}</td>
                                                <td>${formatCurrency(item.unit_cost)}</td>
                                                <td>${formatCurrency(item.line_total)}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="7" class="text-center">No items found</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="printGRN(${id})">
                                <i class="fas fa-print me-2"></i>Print GRN
                            </button>
                            <!-- FIX: Added a conditional "Verify" button -->
                            ${grn.status === 'received' ? `
                                <button type="button" class="btn btn-success" onclick="verifyGRN(${grn.id})">
                                    <i class="fas fa-check-circle me-2"></i>Verify & Add to Stock
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('viewGRNModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('viewGRNModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading GRN:', error);
        showAlert('Error loading GRN data', 'danger');
    } finally {
        showLoading(false);
    }
}


async function printGRN(id) {
    try {
        const response = await fetch(`/api/grns/${id}/document`);
        if (!response.ok) {
            throw new Error('Failed to generate GRN document.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grn_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showAlert('GRN document downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error printing GRN:', error);
        showAlert('Could not print or download the GRN document.', 'danger');
    }
}



// FIX: New function to view transfer details
async function viewTransfer(id) {
    try {
        showLoading(true);
        const response = await fetch(`/api/stock-transfers/${id}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to load transfer details. Server response: ${errorText}`);
        }
        
        const transfer = await response.json();
        
        const modalHTML = `
            <div class="modal fade" id="viewTransferModal" tabindex="-1" aria-labelledby="viewTransferModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="viewTransferModalLabel">
                                <i class="fas fa-eye me-2"></i>Transfer Details - ${transfer.transfer_number || 'N/A'}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                           <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6>Transfer Information</h6>
                                    <p><strong>From:</strong> ${transfer.from_store_name}</p>
                                    <p><strong>To:</strong> ${transfer.to_store_name}</p>
                                    <p><strong>Date:</strong> ${formatDate(transfer.transfer_date)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Status & Notes</h6>
                                    <p><strong>Status:</strong> <span class="badge bg-info">${transfer.status}</span></p>
                                    <p><strong>Notes:</strong> ${transfer.notes || 'N/A'}</p>
                                </div>
                            </div>
                            <h6>Transferred Items</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-striped">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${transfer.items.map(item => `
                                            <tr>
                                                <td>${item.product_name}</td>
                                                <td>${item.quantity}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            ${transfer.status === 'pending' ? `
                                <button type="button" class="btn btn-success" onclick="completeTransfer(${transfer.id})">
                                    <i class="fas fa-check-circle me-2"></i>Approve & Complete Transfer
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('viewTransferModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('viewTransferModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading transfer:', error);
        showAlert('Error loading transfer data', 'danger');
    } finally {
        showLoading(false);
    }
}

async function completeTransfer(id) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewTransferModal'));
    if (modal) {
        modal.hide();
    }

    if (!confirm('Are you sure you want to approve this transfer? This will move the inventory and cannot be undone.')) {
        return;
    }

    try {
        showLoading(true);
        const response = await fetch(`/api/stock-transfers/${id}/approve`, {
            method: 'POST',
        });

        if (response.ok) {
            showAlert('Transfer approved and completed successfully!', 'success');
            await loadStockTransfers();
            await loadInventoryData(); // Refresh inventory as it has changed
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to complete transfer.'}`, 'danger');
        }
    } catch (error) {
        console.error('Error completing transfer:', error);
        showAlert('A network error occurred while completing the transfer.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Data loading functions for different sections
async function loadStoresData() {
    try {
        const response = await fetch('/api/stores');
        if (response.ok) {
            const stores = await response.json();
            displayStoresTable(stores);
        } else {
            showAlert('Failed to load stores data', 'danger');
        }
    } catch (error) {
        console.error('Error loading stores:', error);
        showAlert('Error loading stores data', 'danger');
    }
}

async function loadFlavorsData() {
    try {
        const response = await fetch('/api/flavors');
        if (response.ok) {
            const flavors = await response.json();
            displayFlavorsTable(flavors);
        } else {
            showAlert('Failed to load flavors data', 'danger');
        }
    } catch (error) {
        console.error('Error loading flavors:', error);
        showAlert('Error loading flavors data', 'danger');
    }
}

async function loadSalesHistory() {
    try {
        let url = '/api/sales?';
        if (currentStore) url += `store_id=${currentStore}`;
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            displaySales(data.sales); // FIX: Extract sales array from response object
        } else {
            showAlert('Failed to load sales history', 'danger');
        }
    } catch (error) {
        console.error('Error loading sales:', error);
        showAlert('Error loading sales history', 'danger');
    }
}

// async function loadGRN() {
//     try {
//         let url = '/api/grn?';
//         if (currentStore) url += `store_id=${currentStore}`;
        
//         const response = await fetch(url);
//         if (response.ok) {
//             const grns = await response.json();
//             displayGRNs(grns);
//         } else {
//             showAlert('Failed to load GRN data', 'danger');
//         }
//     } catch (error) {
//         console.error('Error loading GRN:', error);
//         showAlert('Error loading GRN data', 'danger');
//     }
// }

async function loadGRN() {
    try {
        // FIX: Changed URL from '/api/grn?' to '/api/grns?'
        let url = '/api/grns?';
        if (currentStore) url += `store_id=${currentStore}`;
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            displayGRNs(data.grns || data); 
        } else {
            const errorText = await response.text();
            console.error("Server Response (not JSON):", errorText);
            showAlert('A server error occurred while loading GRN data.', 'danger');
        }
    } catch (error) {
        console.error('Error loading GRN:', error);
        showAlert('Error loading GRN data', 'danger');
    }
}



async function loadStockTransfers() {
    try {
        const response = await fetch('/api/stock-transfers');
        if (response.ok) {
            const data = await response.json();
            displayTransfers(data.transfers);
        } else {
            showAlert('Failed to load stock transfers', 'danger');
        }
    } catch (error) {
        console.error('Error loading transfers:', error);
        showAlert('Error loading stock transfers', 'danger');
    }
}



async function loadTransactionHistory() {
    try {
        let url = '/api/transactions?';
        if (currentStore) url += `store_id=${currentStore}`;
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // FIX: The API returns a paginated object with a 'transactions' array.
            displayTransactions(data.transactions);
        } else {
            showAlert('Failed to load transaction history', 'danger');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showAlert('Error loading transaction history', 'danger');
    }
}

// Display functions for data tables
function displayStoresTable(stores) {
    const tbody = document.getElementById('storesTable');
    if (!tbody) return;
    
    if (stores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No stores found</td></tr>';
        return;
    }
    
    tbody.innerHTML = stores.map(store => `
        <tr>
            <td><strong>${store.name}</strong></td>
            <td>${store.address || 'N/A'}</td>
            <td>${store.manager_name || 'N/A'}</td>
            <td>${store.phone || 'N/A'}</td>
            <td>${store.email || 'N/A'}</td>
            <td>
                <span class="badge ${store.is_active ? 'bg-success' : 'bg-danger'}">
                    ${store.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${formatDate(store.created_at)}</td>
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

function displayFlavorsTable(flavors) {
    const tbody = document.getElementById('flavorsTable');
    if (!tbody) return;
    
    if (flavors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No flavors found</td></tr>';
        return;
    }
    
    tbody.innerHTML = flavors.map(flavor => `
        <tr>
            <td><strong>${flavor.name}</strong></td>
            <td>${flavor.description || 'No description'}</td>
            <td>${formatDate(flavor.created_at)}</td>
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

function displaySales(salesList) {
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;
    
    if (!salesList || salesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No sales found</td></tr>';
        return;
    }
    
    // FIX: Correctly map data to the table columns
    tbody.innerHTML = salesList.map(sale => `
        <tr>
            <td><code>${sale.invoice_number || 'N/A'}</code></td>
            <td>${formatDateTime(sale.sale_date)}</td>
            <td>${sale.store_name || 'N/A'}</td>
            <td>${sale.items ? sale.items.length : 0}</td>
            <td>${formatCurrency(sale.subtotal)}</td>
            <td>${formatCurrency(sale.tax_amount)}</td>
            <td><strong>${formatCurrency(sale.total_amount)}</strong></td>
            <td>
                <span class="badge bg-info">${sale.payment_method || 'N/A'}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-info" onclick="viewSale(${sale.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="printInvoice('${sale.invoice_number}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}


// FIX: New function to handle the GRN verification process
async function verifyGRN(id) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewGRNModal'));
    if (modal) {
        modal.hide();
    }

    if (!confirm('Are you sure you want to verify this GRN and add its items to your inventory? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading(true);
        const response = await fetch(`/api/grns/${id}/verify`, {
            method: 'POST',
        });

        if (response.ok) {
            showAlert('GRN verified successfully! Inventory has been updated.', 'success');
            await loadGRN(); // Refresh the GRN list
            await loadInventoryData(); // Refresh the main inventory list
        } else {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                showAlert(`Error: ${errorJson.error || 'Failed to verify GRN.'}`, 'danger');
            } catch (e) {
                showAlert('A server error occurred during verification.', 'danger');
                console.error("Server Response (not JSON):", errorText);
            }
        }
    } catch (error) {
        console.error('Error verifying GRN:', error);
        showAlert('A network error occurred during verification.', 'danger');
    } finally {
        showLoading(false);
    }
}


function displayGRNs(grns) {
    const tbody = document.getElementById('grnTable');
    if (!tbody) return;

    if (!grns || grns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No GRNs found</td></tr>';
        return;
    }

    tbody.innerHTML = grns.map(grn => {
        const receivedDate = grn.received_date ? new Date(grn.received_date).toLocaleDateString() : 'N/A';
        const totalValue = grn.total_amount ? formatCurrency(grn.total_amount) : formatCurrency(0);
        const itemCount = grn.items ? grn.items.length : 0;

        let statusBadge = '';
        switch (grn.status) {
            case 'received':
                statusBadge = '<span class="badge bg-info">Received</span>';
                break;
            case 'verified':
                statusBadge = '<span class="badge bg-primary">Verified</span>';
                break;
            case 'completed':
                statusBadge = '<span class="badge bg-success">Completed</span>';
                break;
            default:
                statusBadge = `<span class="badge bg-secondary">${grn.status || 'Unknown'}</span>`;
        }

        return `
            <tr>
                <td><code>${grn.grn_number || 'N/A'}</code></td>
                <td>${receivedDate}</td>
                <td>${grn.supplier_name || 'N/A'}</td>
                <td>${grn.store_name || 'N/A'}</td>
                <td>${itemCount}</td>
                <td>${totalValue}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-info" onclick="viewGRN(${grn.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="printGRN(${grn.id})" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function displayTransfers(transfers) {
    const tbody = document.getElementById('transfersTable');
    if (!tbody) return;

    if (!transfers || transfers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No stock transfers found.</td></tr>';
        return;
    }

    tbody.innerHTML = transfers.map(transfer => {
        const transferDate = transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : 'N/A';
        const itemCount = transfer.items ? transfer.items.length : 0;

        let statusBadge = '';
        switch (transfer.status) {
            case 'pending':
                statusBadge = '<span class="badge bg-warning">Pending</span>';
                break;
            case 'completed':
                statusBadge = '<span class="badge bg-success">Completed</span>';
                break;
            case 'in_transit':
                statusBadge = '<span class="badge bg-info">In Transit</span>';
                break;
            case 'cancelled':
                statusBadge = '<span class="badge bg-secondary">Cancelled</span>';
                break;
            default:
                statusBadge = `<span class="badge bg-light text-dark">${transfer.status || 'Unknown'}</span>`;
        }

        const firstItemName = transfer.items && transfer.items.length > 0 ? transfer.items[0].product_name : 'N/A';
        const firstItemQty = transfer.items && transfer.items.length > 0 ? transfer.items[0].quantity : 'N/A';

        return `
            <tr>
                <td><code>${transfer.transfer_number || 'N/A'}</code></td>
                <td>${transferDate}</td>
                <td>${transfer.from_store_name || 'N/A'}</td>
                <td>${transfer.to_store_name || 'N/A'}</td>
                <td>${firstItemName} ${itemCount > 1 ? `(+${itemCount - 1} more)` : ''}</td>
                <td>${firstItemQty}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-info" onclick="viewTransfer(${transfer.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsTable');
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(transaction => {
        let typeBadge = '';
        switch (transaction.transaction_type) {
            case 'sale':
                typeBadge = '<span class="badge bg-success">Sale</span>';
                break;
            case 'restock':
                typeBadge = '<span class="badge bg-primary">Restock</span>';
                break;
            case 'adjustment':
                typeBadge = '<span class="badge bg-warning">Adjustment</span>';
                break;
             case 'return':
                typeBadge = '<span class="badge bg-danger">Return</span>';
                break;
            default:
                typeBadge = `<span class="badge bg-secondary">${transaction.transaction_type}</span>`;
        }

        const quantity = transaction.quantity;
        const quantityClass = quantity > 0 ? 'text-success' : 'text-danger';

        return `
            <tr>
                <td>${formatDateTime(transaction.transaction_date)}</td>
                <td>${typeBadge}</td>
                <td>${transaction.reference || 'N/A'}</td>
                <td>${transaction.product_name || 'N/A'}</td>
                <td class="${quantityClass}">${quantity}</td>
                <td>${transaction.unit_price ? formatCurrency(transaction.unit_price) : 'N/A'}</td>
                <td>${transaction.total ? formatCurrency(transaction.total) : 'N/A'}</td>
                <td>${transaction.store_name || 'N/A'}</td>
                <td>${transaction.notes || ''}</td>
            </tr>
        `;
    }).join('');
}

// Update functions for edit operations
// async function updateInventory(id) {
//     const form = document.getElementById('inventoryForm');
//     if (!form.checkValidity()) {
//         form.reportValidity();
//         return;
//     }
    
//     const inventoryData = {
//         product_id: parseInt(document.getElementById('inventoryProduct').value),
//         store_id: parseInt(document.getElementById('inventoryStore').value),
//         quantity: parseInt(document.getElementById('inventoryQuantity').value),
//         batch_number: document.getElementById('inventoryBatch').value,
//         expiration_date: document.getElementById('inventoryExpiry').value || null,
//         location: document.getElementById('inventoryLocation').value
//     };
    
//     try {
//         showLoading(true);
//         const response = await fetch(`/api/inventory/${id}`, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(inventoryData),
//         });
        
//         if (response.ok) {
//             showAlert('Inventory updated successfully!', 'success');
//             const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
//             modal.hide();
//             loadInventoryData();
//         } else {
//             const error = await response.json();
//             showAlert(`Error: ${error.error || 'Failed to update inventory'}`, 'danger');
//         }
//     } catch (error) {
//         console.error('Error updating inventory:', error);
//         showAlert('Network error occurred while updating inventory', 'danger');
//     } finally {
//         showLoading(false);
//     }
// }

async function updateInventory(id) {
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
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventoryData),
        });
        
        if (response.ok) {
            showAlert('Inventory updated successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
            modal.hide();
            loadInventoryData();
        } else {
            // FIX: Handle non-JSON error responses from the server
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                showAlert(`Error: ${errorJson.error || 'Failed to update inventory'}`, 'danger');
            } catch (e) {
                showAlert('A server error occurred. The server did not return a valid JSON response.', 'danger');
                console.error("Server Response (not JSON):", errorText);
            }
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
        showAlert('A network error occurred while updating inventory. Please check your connection.', 'danger');
    } finally {
        showLoading(false);
    }
}



async function updateSupplier(id) {
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
        const response = await fetch(`/api/suppliers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(supplierData),
        });
        
        if (response.ok) {
            showAlert('Supplier updated successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('supplierModal'));
            modal.hide();
            loadSuppliersData();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to update supplier'}`, 'danger');
        }
    } catch (error) {
        console.error('Error updating supplier:', error);
        showAlert('Network error occurred while updating supplier', 'danger');
    } finally {
        showLoading(false);
    }
}

async function updateStore(id) {
    const form = document.getElementById('editStoreForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const storeData = {
        name: document.getElementById('editStoreName').value,
        manager_name: document.getElementById('editStoreManager').value,
        phone: document.getElementById('editStorePhone').value,
        email: document.getElementById('editStoreEmail').value,
        address: document.getElementById('editStoreAddress').value,
        is_active: document.getElementById('editStoreActive').checked
    };
    
    try {
        showLoading(true);
        const response = await fetch(`/api/stores/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(storeData),
        });
        
        if (response.ok) {
            showAlert('Store updated successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editStoreModal'));
            modal.hide();
            loadStoresData();
            loadStores(); // Refresh store dropdown
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to update store'}`, 'danger');
        }
    } catch (error) {
        console.error('Error updating store:', error);
        showAlert('Network error occurred while updating store', 'danger');
    } finally {
        showLoading(false);
    }
}

async function updateFlavor(id) {
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
        const response = await fetch(`/api/flavors/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(flavorData),
        });
        
        if (response.ok) {
            showAlert('Flavor updated successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('flavorModal'));
            modal.hide();
            loadFlavors();
            loadFlavorsData();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to update flavor'}`, 'danger');
        }
    } catch (error) {
        console.error('Error updating flavor:', error);
        showAlert('Network error occurred while updating flavor', 'danger');
    } finally {
        showLoading(false);
    }
}

// POS functions
async function initializePOS() {
    // This function now loads recent sales instead of just opening the sale modal.
    if (!currentStore) {
        const posContent = document.getElementById('posContent');
        if(posContent) {
             posContent.innerHTML = `<div class="alert alert-warning">Please select a store to view point of sale information.</div>`;
        }
        return;
    }
    await loadRecentSales();
}

async function loadRecentSales() {
    const tbody = document.getElementById('posRecentSalesTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading recent sales...</td></tr>';

    try {
        const response = await fetch(`/api/sales?store_id=${currentStore}&per_page=10`);
        if (response.ok) {
            const data = await response.json();
            displayRecentSales(data.sales);
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load recent sales.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading recent sales:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading recent sales.</td></tr>';
    }
}

// New function to render the recent sales data into the POS table.
function displayRecentSales(salesList) {
    const tbody = document.getElementById('posRecentSalesTable');
    if (!tbody) return;

    if (!salesList || salesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent sales found for this store.</td></tr>';
        return;
    }

    tbody.innerHTML = salesList.map(sale => `
        <tr>
            <td><code>${sale.invoice_number || 'N/A'}</code></td>
            <td>${formatDateTime(sale.sale_date)}</td>
            <td>${sale.customer_name || 'Walk-in Customer'}</td>
            <td>${sale.items ? sale.items.length : 0}</td>
            <td><strong>${formatCurrency(sale.total_amount)}</strong></td>
        </tr>
    `).join('');
}


// Utility functions
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = 0;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // Create a new Date object and account for timezone offset to prevent date shifts
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
}



function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}


// function displayInventory(inventoryList) {
//     showAlert('Inventory display will be implemented', 'info');
// }

// function displaySuppliers(suppliersList) {
//     showAlert('Supplier display will be implemented', 'info');
// }


function displayInventory(inventoryList) {
    const tbody = document.getElementById('inventoryTable');
    if (!tbody) return;

    if (!inventoryList || inventoryList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No inventory found for this store.</td></tr>';
        return;
    }

    // Group inventory by a unique key: product name + flavor name
    const groupedInventory = inventoryList.reduce((acc, item) => {
        const key = `${item.product_name}-${item.flavor_name || 'N/A'}`;
        if (!acc[key]) {
            acc[key] = {
                product_id: item.product_id,
                product_name: item.product_name,
                flavor_name: item.flavor_name,
                // Use reorder_point directly from the item data
                reorder_point: item.reorder_point || 10, 
                batches: [],
                total_quantity: 0
            };
        }
        acc[key].batches.push(item);
        acc[key].total_quantity += item.quantity;
        return acc;
    }, {});

    let html = '';
    // Generate HTML for each product group
    Object.values(groupedInventory).forEach((group, index) => {
        const isLowStock = group.total_quantity <= group.reorder_point;
        const collapseId = `inventory-group-${group.product_id}-${index}`;

        // Main, clickable row for the product group
        html += `
            <tr class="inventory-group-header" data-bs-toggle="collapse" href="#${collapseId}" role="button" aria-expanded="false" aria-controls="${collapseId}" style="cursor: pointer;">
                <td>
                    <i class="fas fa-chevron-down me-2"></i>
                    <strong>${group.product_name}</strong>
                    ${group.flavor_name ? `<br><small class="text-muted">${group.flavor_name}</small>` : ''}
                </td>
                <td></td> <!-- Empty cell for Store -->
                <td></td> <!-- Empty cell for Batch Number -->
                <td><strong>${group.total_quantity}</strong></td>
                <td></td> <!-- Empty cell for Cost Price -->
                <td></td> <!-- Empty cell for Expiration Date -->
                <td>
                    ${isLowStock ? '<span class="badge bg-danger">Low Stock</span>' : '<span class="badge bg-success">In Stock</span>'}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); viewProduct(${group.product_id});" title="View Product Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;

        // Collapsible row containing a nested table with batch details
        html += `
            <tr>
                <td colspan="8" class="p-0" style="border: none;">
                    <div class="collapse" id="${collapseId}">
                        <div class="p-3" style="background-color: #f8f9fa;">
                            <table class="table table-sm table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Store</th>
                                        <th>Batch Number</th>
                                        <th>Quantity</th>
                                        <th>Unit Cost</th>
                                        <th>Expiration Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${group.batches.map(item => {
                                        const expirationDate = item.expiration_date ? new Date(item.expiration_date) : null;
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        let statusBadge = '';
                                        if (expirationDate && expirationDate < today) {
                                            statusBadge = '<span class="badge bg-danger">Expired</span>';
                                        } else if (item.is_expiring_soon) {
                                            statusBadge = `<span class="badge bg-warning">Expiring soon</span>`;
                                        } else {
                                            statusBadge = '<span class="badge bg-light text-dark">Good</span>';
                                        }

                                        return `
                                            <tr>
                                                <td>${item.store_name || 'N/A'}</td>
                                                <td><code>${item.batch_number || 'N/A'}</code></td>
                                                <td>${item.quantity}</td>
                                                <td>${formatCurrency(item.unit_cost || 0)}</td>
                                                <td>${expirationDate ? expirationDate.toLocaleDateString() : 'N/A'}</td>
                                                <td>${statusBadge}</td>
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
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}


function displaySuppliers(suppliersList) {
    const tbody = document.getElementById('suppliersTable');
    if (!tbody) return;

    if (!suppliersList || suppliersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No suppliers found.</td></tr>';
        return;
    }

    tbody.innerHTML = suppliersList.map(supplier => `
        <tr>
            <td><strong>${supplier.name}</strong></td>
            <td>${supplier.contact_person || 'N/A'}</td>
            <td>${supplier.phone || 'N/A'}</td>
            <td>${supplier.email || 'N/A'}</td>
            <td>${supplier.products_count || 0}</td>
            <td>
                <span class="badge ${supplier.is_active ? 'bg-success' : 'bg-danger'}">
                    ${supplier.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editSupplier(${supplier.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewSupplier(${supplier.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier(${supplier.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}



// Helper functions for modal population
// async function populateSaleProducts() {
//     const productSelects = document.querySelectorAll('.sale-product');
//     if (!productSelects.length) return;
    
//     try {
//         const response = await fetch('/api/products');
//         if (response.ok) {
//             const products = await response.json();
//             productSelects.forEach(select => {
//                 select.innerHTML = '<option value="">Select Product</option>';
//                 products.forEach(product => {
//                     const option = document.createElement('option');
//                     option.value = product.id;
//                     option.textContent = `${product.name} - $${product.selling_price}`;
//                     option.dataset.price = product.selling_price;
//                     select.appendChild(option);
//                 });
//             });
//         }
//     } catch (error) {
//         console.error('Error populating sale products:', error);
//     }
// }
async function populateSaleProducts(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Loading Products...</option>';
    
    try {
        if (products && products.length > 0) {
            selectElement.innerHTML = '<option value="">Select Product</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                selectElement.appendChild(option);
            });
        } else {
            const response = await fetch('/api/products');
            if (response.ok) {
                const data = await response.json();
                const productList = data.products || [];
                selectElement.innerHTML = '<option value="">Select Product</option>';
                productList.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    selectElement.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error populating sale products:', error);
        selectElement.innerHTML = '<option value="">Error loading</option>';
    }
}



async function populateGRNSuppliers() {
    const supplierSelect = document.getElementById('grnSupplier');
    if (!supplierSelect) return;
    supplierSelect.innerHTML = `<option value="">Loading Suppliers...</option>`;
    
    try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
            const data = await response.json();
            // FIX: The API returns an object with a 'suppliers' array.
            const supplierList = data.suppliers || []; 
            supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
            supplierList.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                supplierSelect.appendChild(option);
            });
        } else {
            // FIX: Handle non-JSON error responses from the server
            const errorText = await response.text();
            console.error("Server Response (not JSON):", errorText);
            showAlert('A server error occurred while loading suppliers.', 'danger');
            supplierSelect.innerHTML = `<option value="">Error loading suppliers</option>`;
        }
    } catch (error) {
        console.error('Error populating GRN suppliers:', error);
        showAlert('Error populating GRN suppliers', 'danger');
        supplierSelect.innerHTML = `<option value="">Error loading suppliers</option>`;
    }
}


// async function populateGRNProducts() {
//     const productSelects = document.querySelectorAll('.grn-product');
//     if (!productSelects.length) return;
    
//     try {
//         const response = await fetch('/api/products');
//         if (response.ok) {
//             const products = await response.json();
//             productSelects.forEach(select => {
//                 select.innerHTML = '<option value="">Select Product</option>';
//                 products.forEach(product => {
//                     const option = document.createElement('option');
//                     option.value = product.id;
//                     option.textContent = product.name;
//                     select.appendChild(option);
//                 });
//             });
//         }
//     } catch (error) {
//         console.error('Error populating GRN products:', error);
//     }
// }
async function populateGRNProducts() {
    const productSelects = document.querySelectorAll('.grn-product');
    if (!productSelects.length) return;
    
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const data = await response.json();
            // FIX: The API returns an object with a 'products' array.
            const productList = data.products || [];
            productSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Product</option>';
                productList.forEach(product => {
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

// async function populateTransferProducts() {
//     const productSelect = document.getElementById('transferProduct');
//     if (!productSelect) return;
    
//     try {
//         const response = await fetch('/api/products');
//         if (response.ok) {
//             const products = await response.json();
//             productSelect.innerHTML = '<option value="">Select Product</option>';
//             products.forEach(product => {
//                 const option = document.createElement('option');
//                 option.value = product.id;
//                 option.textContent = product.name;
//                 productSelect.appendChild(option);
//             });
//         }
//     } catch (error) {
//         console.error('Error populating transfer products:', error);
//     }
// }

// Save functions for modals

async function populateTransferProducts(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Loading Products...</option>';
    try {
        if (products && products.length > 0) {
            selectElement.innerHTML = '<option value="">Select Product</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating transfer products:', error);
    }
}


// async function saveInventory() {
//     const form = document.getElementById('inventoryForm');
//     if (!form.checkValidity()) {
//         form.reportValidity();
//         return;
//     }
    
//     const inventoryData = {
//         product_id: parseInt(document.getElementById('inventoryProduct').value),
//         store_id: parseInt(document.getElementById('inventoryStore').value),
//         quantity: parseInt(document.getElementById('inventoryQuantity').value),
//         batch_number: document.getElementById('inventoryBatch').value,
//         expiration_date: document.getElementById('inventoryExpiry').value || null,
//         location: document.getElementById('inventoryLocation').value
//     };
    
//     try {
//         showLoading(true);
//         const response = await fetch('/api/inventory', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(inventoryData),
//         });
        
//         if (response.ok) {
//             showAlert('Inventory added successfully!', 'success');
//             const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
//             modal.hide();
//             loadInventoryData();
//         } else {
//             const error = await response.json();
//             showAlert(`Error: ${error.error || 'Failed to save inventory'}`, 'danger');
//         }
//     } catch (error) {
//         console.error('Error saving inventory:', error);
//         showAlert('Network error occurred while saving inventory', 'danger');
//     } finally {
//         showLoading(false);
//     }
// }

async function saveInventory() {
    const form = document.getElementById('inventoryForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const inventoryId = document.getElementById('inventoryId').value;
    const isEdit = !!inventoryId;

    const storeIdValue = document.getElementById('inventoryStore').value;
    if (!storeIdValue) {
        showAlert('Error: You must select a store before saving.', 'danger');
        return; 
    }

    const inventoryData = {
        product_id: parseInt(document.getElementById('inventoryProduct').value),
        store_id: parseInt(storeIdValue), 
        quantity: parseInt(document.getElementById('inventoryQuantity').value),
        batch_number: document.getElementById('inventoryBatch').value,
        expiration_date: document.getElementById('inventoryExpiry').value || null,
        location: document.getElementById('inventoryLocation').value,
        supplier_id: document.getElementById('inventorySupplier').value ? parseInt(document.getElementById('inventorySupplier').value) : null,
        unit_cost: document.getElementById('inventoryUnitCost').value ? parseFloat(document.getElementById('inventoryUnitCost').value) : null,
        product_flavor_id: document.getElementById('inventoryFlavor').value ? parseInt(document.getElementById('inventoryFlavor').value) : null,
        notes: document.getElementById('inventoryNotes').value
    };

    const url = isEdit ? `/api/inventory/${inventoryId}` : '/api/inventory';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        showLoading(true);
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inventoryData),
        });
        
        if (response.ok) {
            showAlert(`Inventory ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
            modal.hide();
            loadInventoryData();
        } else {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                showAlert(`Error: ${errorJson.error || 'Failed to save inventory'}`, 'danger');
            } catch (e) {
                showAlert('A server error occurred. The server did not return a valid JSON response.', 'danger');
                console.error("Server Response (not JSON):", errorText);
            }
        }
    } catch (error) {
        console.error(`Error saving inventory:`, error);
        showAlert(`A network error occurred. Please check your connection.`, 'danger');
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
    
    let formIsValid = true;
    const saleItems = [];
    document.querySelectorAll('.sale-item-row').forEach(row => {
        const productId = row.querySelector('.sale-product').value;
        const quantity = row.querySelector('.sale-quantity').value;
        const price = row.querySelector('.sale-price').value;
        const flavorSelect = row.querySelector('.sale-flavor');
        
        if (productId && quantity && price) {
            const product = products.find(p => p.id == productId);
            let productFlavorId = null;

            if (product && product.has_flavors) {
                if (!flavorSelect.value) {
                    showAlert(`Please select a flavor for ${product.name}.`, 'warning');
                    formIsValid = false;
                    return;
                }
                productFlavorId = parseInt(flavorSelect.value);
            }

            saleItems.push({
                product_id: parseInt(productId),
                quantity: parseInt(quantity),
                unit_price: parseFloat(price),
                product_flavor_id: productFlavorId
            });
        }
    });
    
    if (!formIsValid) return;

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData),
        });
        
        if (response.ok) {
            showAlert('Sale recorded successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('saleModal'));
            modal.hide();
            await loadSalesHistory();
            await loadRecentSales(); // Refresh POS screen
        } else {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                showAlert(`Error: ${errorJson.error || 'Failed to save sale'}`, 'danger');
            } catch (e) {
                showAlert('A server error occurred while saving the sale.', 'danger');
                console.error("Server Response (not JSON):", errorText);
            }
        }
    } catch (error) {
        console.error('Error saving sale:', error);
        showAlert('Network error occurred while saving sale', 'danger');
    } finally {
        showLoading(false);
    }
}


// FIX: New event handler for product changes within the GRN modal
function handleGRNProductChange(event) {
    const productSelect = event.target;
    const productId = productSelect.value;
    const product = products.find(p => p.id == productId);
    const row = productSelect.closest('.grn-item-row');

    const costInput = row.querySelector('.grn-cost');
    if (costInput && product) {
        costInput.value = product.cost_price || '';
    }

    const flavorSelect = row.querySelector('.grn-flavor');
    if (flavorSelect && product) {
        if (product.has_flavors && product.flavors.length > 0) {
            flavorSelect.innerHTML = '<option value="">Select Flavor...</option>';
            product.flavors.forEach(flavorAssoc => {
                const option = document.createElement('option');
                option.value = flavorAssoc.id;
                option.textContent = flavorAssoc.flavor_name;
                flavorSelect.appendChild(option);
            });
            flavorSelect.style.display = 'block';
            flavorSelect.required = true;
        } else {
            flavorSelect.style.display = 'none';
            flavorSelect.innerHTML = '';
            flavorSelect.required = false;
        }
    }
}

async function saveGRN() {
    const form = document.getElementById('grnForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (!currentStore) {
        showAlert('Please select a store before creating a GRN.', 'danger');
        return;
    }
    
    const grnItems = [];
    let formIsValid = true;
    document.querySelectorAll('.grn-item-row').forEach(row => {
        const productId = row.querySelector('.grn-product').value;
        const quantity = row.querySelector('.grn-quantity').value;
        const flavorSelect = row.querySelector('.grn-flavor');
        
        if (productId && quantity) {
            const product = products.find(p => p.id == productId);
            let productFlavorId = null;
            if (product && product.has_flavors) {
                if (!flavorSelect.value) {
                    showAlert(`Please select a flavor for ${product.name}.`, 'warning');
                    formIsValid = false;
                    return; 
                }
                productFlavorId = parseInt(flavorSelect.value);
            }

            grnItems.push({
                product_id: parseInt(productId),
                quantity_received: parseInt(quantity),
                batch_number: row.querySelector('.grn-batch').value,
                expiration_date: row.querySelector('.grn-expiry').value || null,
                unit_cost: row.querySelector('.grn-cost').value ? parseFloat(row.querySelector('.grn-cost').value) : null,
                product_flavor_id: productFlavorId
            });
        }
    });
    
    if (!formIsValid) return;

    if (grnItems.length === 0) {
        showAlert('Please add at least one item to the GRN.', 'warning');
        return;
    }
    
    const grnData = {
        supplier_id: parseInt(document.getElementById('grnSupplier').value),
        received_date: document.getElementById('grnDate').value,
        invoice_number: document.getElementById('grnInvoice').value,
        store_id: currentStore,
        items: grnItems
    };
    
    try {
        showLoading(true);
        // FIX: Changed URL from '/api/grn' to '/api/grns' to match the backend route
        const response = await fetch('/api/grns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(grnData),
        });
        
        if (response.ok) {
            showAlert('GRN saved successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('grnModal'));
            modal.hide();
            loadGRN();
        } else {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                showAlert(`Error: ${errorJson.error || 'Failed to save GRN'}`, 'danger');
            } catch (e) {
                showAlert('A server error occurred while saving the GRN.', 'danger');
                console.error("Server Response (not JSON):", errorText);
            }
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

    const fromStoreId = document.getElementById('transferFromStore').value;
    const toStoreId = document.getElementById('transferToStore').value;

    if (fromStoreId === toStoreId) {
        showAlert('Cannot transfer items to the same store.', 'warning');
        return;
    }
    
    const transferItems = [];
    document.querySelectorAll('.transfer-item-row').forEach(row => {
        const productId = row.querySelector('.transfer-product').value;
        const quantity = row.querySelector('.transfer-quantity').value;
        if (productId && quantity) {
            transferItems.push({
                product_id: parseInt(productId),
                quantity: parseInt(quantity)
            });
        }
    });

    if (transferItems.length === 0) {
        showAlert('Please add at least one item to the transfer.', 'warning');
        return;
    }

    const transferData = {
        from_store_id: parseInt(fromStoreId),
        to_store_id: parseInt(toStoreId),
        notes: document.getElementById('transferNotes').value,
        items: transferItems
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/stock-transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transferData),
        });
        
        if (response.ok) {
            showAlert('Stock transfer created successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('transferModal'));
            modal.hide();
            await loadStockTransfers();
        } else {
            const error = await response.json();
            showAlert(`Error: ${error.error || 'Failed to create transfer'}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving transfer:', error);
        showAlert('A network error occurred while creating the transfer.', 'danger');
    } finally {
        showLoading(false);
    }
}


async function handleSaleProductChange(event) {
    const productSelect = event.target;
    const productId = productSelect.value;
    const row = productSelect.closest('.sale-item-row');

    const priceInput = row.querySelector('.sale-price');
    const qtyLabel = row.querySelector('#available-qty');
    const flavorSelect = row.querySelector('.sale-flavor');

    // Clear fields if no product is selected
    if (!productId) {
        priceInput.value = '';
        qtyLabel.textContent = '';
        flavorSelect.style.display = 'none';
        flavorSelect.innerHTML = '';
        flavorSelect.required = false;
        calculateSaleTotal();
        return;
    }

    const product = products.find(p => p.id == productId);

    if (product) {
        priceInput.value = product.selling_price || '';
        
        // Fetch and display store-specific quantity
        qtyLabel.textContent = 'Loading qty...';
        if (currentStore) {
            try {
                const response = await fetch(`/api/inventory?product_id=${productId}&store_id=${currentStore}`);
                if (response.ok) {
                    const storeInventory = await response.json();
                    const storeSpecificQty = storeInventory.reduce((sum, item) => sum + item.quantity, 0);
                    qtyLabel.textContent = `Available: ${storeSpecificQty}`;
                } else {
                    qtyLabel.textContent = 'Qty unavailable';
                }
            } catch (error) {
                console.error('Error fetching store-specific quantity:', error);
                qtyLabel.textContent = 'Qty error';
            }
        } else {
            qtyLabel.textContent = 'Select a store first';
        }

        // Handle flavor selection
        if (product.has_flavors && product.flavors.length > 0) {
            flavorSelect.innerHTML = '<option value="">Select Flavor...</option>';
            product.flavors.forEach(f => {
                const option = document.createElement('option');
                option.value = f.id;
                option.textContent = f.flavor_name;
                flavorSelect.appendChild(option);
            });
            flavorSelect.style.display = 'block';
            flavorSelect.required = true;
        } else {
            flavorSelect.style.display = 'none';
            flavorSelect.innerHTML = '';
            flavorSelect.required = false;
        }
    } else {
        // Fallback if product not found
        priceInput.value = '';
        qtyLabel.textContent = '';
        flavorSelect.style.display = 'none';
        flavorSelect.innerHTML = '';
        flavorSelect.required = false;
    }
    calculateSaleTotal();
}

// Dynamic item addition functions
function addSaleItem() {
    const saleItemsContainer = document.getElementById('saleItems');
    const newRow = document.createElement('div');
    newRow.className = 'sale-item-row row mb-2 align-items-center';
    newRow.innerHTML = `
        <div class="col-md-4">
            <select class="form-select sale-product" required onchange="handleSaleProductChange(event)"></select>
            <small class="form-text text-muted ms-2" id="available-qty"></small>
        </div>
        <div class="col-md-2">
            <select class="form-select sale-flavor" style="display: none;"></select>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control sale-quantity" placeholder="Qty" min="1" required oninput="calculateSaleTotal()">
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control sale-price" placeholder="Price" step="0.01" required oninput="calculateSaleTotal()">
        </div>
        <div class="col-md-1">
            <input type="text" class="form-control-plaintext sale-total text-end" value="$0.00" readonly>
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeSaleItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    saleItemsContainer.appendChild(newRow);
    populateSaleProducts(newRow.querySelector('.sale-product'));
}

function removeSaleItem(button) {
    button.closest('.sale-item-row').remove();
    calculateSaleTotal();
}

function addGRNItem() {
    const grnItemsContainer = document.getElementById('grnItems');
    const newRow = document.createElement('div');
    newRow.className = 'grn-item-row row mb-2 align-items-center';
    // FIX: Updated the HTML for new rows to include the flavor dropdown
    newRow.innerHTML = `
        <div class="col-md-3">
            <select class="form-select grn-product" required>
                <option value="">Select Product</option>
            </select>
        </div>
        <div class="col-md-2">
            <select class="form-select grn-flavor" style="display: none;" required></select>
        </div>
        <div class="col-md-1">
            <input type="number" class="form-control grn-quantity" placeholder="Qty" min="1" required>
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control grn-batch" placeholder="Batch">
        </div>
        <div class="col-md-2">
            <input type="date" class="form-control grn-expiry" placeholder="Expiry">
        </div>
        <div class="col-md-1">
            <input type="number" class="form-control grn-cost" placeholder="Cost" step="0.01">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeGRNItem(this)">
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `;
    grnItemsContainer.appendChild(newRow);
    
    // FIX: Attach event listener to the newly added product dropdown
    newRow.querySelector('.grn-product').addEventListener('change', handleGRNProductChange);
    populateGRNProducts(newRow.querySelector('.grn-product'));
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

async function seedData() {
    if (!confirm("Are you sure you want to seed demo data? This may overwrite existing entries.")) return;

    try {
        const response = await fetch('/api/seed-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Seeding failed');
        const result = await response.json();
        alert(result.message || 'Seeding successful!');
        // Optional: reload page or refresh lists
        loadStores();
        loadCategories();  // if you have this
    } catch (err) {
        console.error('Seed error:', err);
        alert("Failed to seed data.");
    }
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

