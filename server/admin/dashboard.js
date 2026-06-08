// Admin Dashboard JavaScript
// Connects to backend API for data management

// Determine correct API URL based on current domain
let API_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Local development
    API_URL = 'http://localhost:5000';
} else {
    // Production - use same domain for both frontend and backend
    API_URL = window.location.origin;
}

console.log('Admin Dashboard using API:', API_URL);

// Helper function to get current auth token
function getAuthToken() {
    return localStorage.getItem('userToken') || localStorage.getItem('adminToken');
}

// Deprecated: Use getAuthToken() instead
const API_TOKEN = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupEventListeners();
});

function initDashboard() {
    // Check if logged in
    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    // Load dashboard data
    loadDashboardStats();
    loadUsers();
    loadSubscriptions();
    loadDeals();
    loadHacks();
    loadPromos();
    loadEmailTemplates();
    loadRecentActivities();
    loadSettings();

    // Set admin name
    const adminName = localStorage.getItem('adminName') || 'Admin';
    document.getElementById('admin-name').textContent = adminName;
    document.getElementById('user-avatar').textContent = adminName.charAt(0).toUpperCase();
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Search functionality
    document.getElementById('user-search')?.addEventListener('input', (e) => {
        filterUsers(e.target.value);
    });

    document.getElementById('deals-search')?.addEventListener('input', (e) => {
        filterDeals(e.target.value);
    });
}

// TAB SWITCHING
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active to clicked nav link
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        subscriptions: 'Subscriptions',
        deals: 'Deals Management',
        hacks: 'Hacks & Modules',
        promos: 'Promo Codes',
        'email-templates': 'Email Templates',
        analytics: 'Analytics',
        settings: 'Settings'
    };

    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';
}

// ALERTS
function showAlert(message, type = 'success') {
    const alertEl = document.getElementById('alert');
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type} show`;

    setTimeout(() => {
        alertEl.classList.remove('show');
    }, 4000);
}

// DASHBOARD STATS
async function loadDashboardStats() {
    try {
        // Fetch stats from API
        const [usersRes, subsRes, dealsRes] = await Promise.all([
            fetch(`${API_URL}/api/auth/users/count`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            }),
            fetch(`${API_URL}/api/subscriptions/stats`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            }),
            fetch(`${API_URL}/api/deals/count`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
        ]);

        if (usersRes.ok) {
            const data = await usersRes.json();
            document.getElementById('stat-users').textContent = data.count || '0';
        }

        if (dealsRes.ok) {
            const data = await dealsRes.json();
            document.getElementById('stat-deals').textContent = data.count || '0';
        }

        // Load subscription breakdown
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSubscriptionStats() {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions/stats`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-subscriptions').textContent = data.active || '0';

            // Update counts
            document.getElementById('count-free').textContent = data.free || '0';
            document.getElementById('count-smart').textContent = data.smartTraveler || '0';
            document.getElementById('count-elite').textContent = data.elite || '0';

            // Calculate MRR
            const smartMRR = (data.smartTraveler || 0) * 19;
            const eliteMRR = (data.elite || 0) * 49;
            const totalMRR = smartMRR + eliteMRR;

            document.getElementById('total-mrr').textContent = `€${totalMRR.toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading subscription stats:', error);
    }
}

// USERS MANAGEMENT
async function loadUsers() {
    try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await fetch(`${API_URL}/api/auth/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users || []);
        } else {
            console.error('Failed to load users:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        displayError('users-table', 'Failed to load users');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-table');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.email}</td>
            <td>${user.first_name || ''} ${user.last_name || ''}</td>
            <td><span class="badge badge-${user.subscription_tier === 'free' ? 'info' : 'success'}">${user.subscription_tier}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterUsers(query) {
    const rows = document.querySelectorAll('#users-table tr');
    rows.forEach(row => {
        const email = row.querySelector('td')?.textContent.toLowerCase();
        if (email?.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// USER MODALS
function openUserModal() {
    document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('active');
    document.getElementById('modal-user-email').value = '';
    document.getElementById('modal-user-first').value = '';
    document.getElementById('modal-user-last').value = '';
    document.getElementById('modal-user-tier').value = 'free';
    // Reset edit mode
    modal.dataset.isEditing = 'false';
    modal.dataset.userId = '';
    // Reset modal title
    const modalTitle = document.querySelector('#user-modal .modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = 'Add New User';
    }
}

async function saveUser() {
    const email = document.getElementById('modal-user-email').value;
    const firstName = document.getElementById('modal-user-first').value;
    const lastName = document.getElementById('modal-user-last').value;
    const tier = document.getElementById('modal-user-tier').value;
    const modal = document.getElementById('user-modal');
    const isEditing = modal.dataset.isEditing === 'true';
    const userId = modal.dataset.userId;

    if (!email) {
        showAlert('Email is required', 'error');
        return;
    }

    try {
        let url = `${API_URL}/api/auth/users`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/auth/users/${userId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                firstName,
                lastName,
                subscriptionTier: tier
            })
        });

        if (response.ok) {
            showAlert('User saved successfully', 'success');
            closeUserModal();
            // Reset edit mode
            modal.dataset.isEditing = 'false';
            modal.dataset.userId = '';
            loadUsers();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to save user', 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showAlert('Error saving user', 'error');
    }
}

async function editUser(userId) {
    try {
        // Fetch user data
        const response = await fetch(`${API_URL}/api/auth/users`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) {
            showAlert('Failed to load user data', 'error');
            return;
        }

        const data = await response.json();
        const user = data.users.find(u => u.id === userId);

        if (!user) {
            showAlert('User not found', 'error');
            return;
        }

        // Populate modal with user data
        document.getElementById('modal-user-email').value = user.email;
        document.getElementById('modal-user-first').value = user.first_name || '';
        document.getElementById('modal-user-last').value = user.last_name || '';
        document.getElementById('modal-user-tier').value = user.subscription_tier || 'free';

        // Store userId for save operation
        document.getElementById('user-modal').dataset.userId = userId;
        document.getElementById('user-modal').dataset.isEditing = 'true';

        // Update modal title
        const modalTitle = document.querySelector('#user-modal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit User';
        }

        // Open modal
        openUserModal();
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showAlert('Error loading user data', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            showAlert('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Error deleting user', 'error');
    }
}

// SUBSCRIPTIONS
async function loadSubscriptions() {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Subscriptions data:', data);
            displaySubscriptions(data.subscriptions || []);
        } else {
            console.error('Subscriptions API error:', response.status, response.statusText);
            displayError('subscriptions-table', `Failed to load subscriptions: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        displayError('subscriptions-table', 'Failed to load subscriptions');
    }
}

function displaySubscriptions(subscriptions) {
    console.log('displaySubscriptions called with:', subscriptions.length, 'items');
    const tbody = document.getElementById('subscriptions-table');

    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No subscriptions found</td></tr>';
        return;
    }

    tbody.innerHTML = subscriptions.map(sub => `
        <tr>
            <td>${sub.email || 'N/A'}</td>
            <td>${sub.tier}</td>
            <td><span class="badge badge-${sub.status === 'active' ? 'success' : 'danger'}">${sub.status}</span></td>
            <td>${formatDate(sub.created_at)}</td>
            <td>${formatDate(sub.current_period_end)}</td>
            <td>€${sub.price_monthly || '0'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editSubscription('${sub.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSubscription('${sub.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// SUBSCRIPTION MODALS & CRUD
function openSubscriptionModal() {
    document.getElementById('subscription-modal').classList.add('active');
}

function closeSubscriptionModal() {
    document.getElementById('subscription-modal').classList.remove('active');
    document.getElementById('modal-subscription-tier').value = '';
    document.getElementById('modal-subscription-status').value = 'active';
}

async function editSubscription(subId) {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) {
            showAlert('Failed to load subscription data', 'error');
            return;
        }

        const data = await response.json();
        const sub = data.subscriptions.find(s => s.id === subId);

        if (!sub) {
            showAlert('Subscription not found', 'error');
            return;
        }

        document.getElementById('modal-subscription-tier').value = sub.tier;
        document.getElementById('modal-subscription-status').value = sub.status;
        document.getElementById('subscription-modal').dataset.subId = subId;
        openSubscriptionModal();
    } catch (error) {
        console.error('Error loading subscription for edit:', error);
        showAlert('Error loading subscription data', 'error');
    }
}

async function deleteSubscription(subId) {
    if (!confirm('Are you sure you want to delete this subscription?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            showAlert('Subscription deleted successfully', 'success');
            loadSubscriptions();
        } else {
            showAlert('Failed to delete subscription', 'error');
        }
    } catch (error) {
        console.error('Error deleting subscription:', error);
        showAlert('Error deleting subscription', 'error');
    }
}

async function saveSubscription() {
    const subId = document.getElementById('subscription-modal').dataset.subId;
    const tier = document.getElementById('modal-subscription-tier').value;
    const status = document.getElementById('modal-subscription-status').value;

    if (!tier || !status) {
        showAlert('All fields are required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier, status })
        });

        if (response.ok) {
            showAlert('Subscription updated successfully', 'success');
            closeSubscriptionModal();
            loadSubscriptions();
        } else {
            showAlert('Failed to update subscription', 'error');
        }
    } catch (error) {
        console.error('Error updating subscription:', error);
        showAlert('Error updating subscription', 'error');
    }
}

// DEALS
async function loadDeals() {
    try {
        const response = await fetch(`${API_URL}/api/deals?limit=50`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Deals data:', data);
            displayDeals(data.deals || []);
        } else {
            console.error('Deals API error:', response.status, response.statusText);
            displayError('deals-table', `Failed to load deals: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading deals:', error);
        displayError('deals-table', 'Failed to load deals');
    }
}

function displayDeals(deals) {
    const tbody = document.getElementById('deals-table');

    if (deals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No deals found</td></tr>';
        return;
    }

    tbody.innerHTML = deals.map(deal => `
        <tr>
            <td>${deal.title}</td>
            <td>${deal.category}</td>
            <td>€${deal.value_amount}</td>
            <td><span class="badge badge-${deal.verified ? 'success' : 'pending'}">${deal.verified ? 'Yes' : 'No'}</span></td>
            <td>${deal.upvote_count}</td>
            <td>${deal.expires_at ? formatDate(deal.expires_at) : 'No expiry'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editDeal('${deal.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDeal('${deal.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterDeals(query) {
    const rows = document.querySelectorAll('#deals-table tr');
    rows.forEach(row => {
        const title = row.querySelector('td')?.textContent.toLowerCase();
        if (title?.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// DEAL MODALS
function openDealModal() {
    document.getElementById('deal-modal').classList.add('active');
}

function closeDealModal() {
    const modal = document.getElementById('deal-modal');
    modal.classList.remove('active');
    document.getElementById('modal-deal-title').value = '';
    document.getElementById('modal-deal-description').value = '';
    document.getElementById('modal-deal-value').value = '';
    document.getElementById('modal-deal-category').value = '';
    modal.dataset.isEditing = 'false';
    modal.dataset.dealId = '';
    const modalTitle = document.querySelector('#deal-modal .modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = 'Add New Deal';
    }
}

async function saveDeal() {
    const modal = document.getElementById('deal-modal');
    const isEditing = modal.dataset.isEditing === 'true';
    const dealId = modal.dataset.dealId;

    const title = document.getElementById('modal-deal-title').value;
    const description = document.getElementById('modal-deal-description').value;
    const category = document.getElementById('modal-deal-category').value;
    const value = document.getElementById('modal-deal-value').value;

    if (!title || !value) {
        showAlert('Title and value are required', 'error');
        return;
    }

    try {
        let url = `${API_URL}/api/deals`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/deals/${dealId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                category,
                deal_type: 'featured',
                value_amount: parseFloat(value),
                value_currency: 'EUR'
            })
        });

        if (response.ok) {
            showAlert(isEditing ? 'Deal updated successfully' : 'Deal created successfully', 'success');
            closeDealModal();
            loadDeals();
        } else {
            showAlert('Failed to save deal', 'error');
        }
    } catch (error) {
        console.error('Error saving deal:', error);
        showAlert('Error saving deal', 'error');
    }
}

async function editDeal(dealId) {
    try {
        const response = await fetch(`${API_URL}/api/deals/${dealId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) {
            showAlert('Failed to load deal data', 'error');
            return;
        }

        const data = await response.json();
        const deal = data.deal;

        document.getElementById('modal-deal-title').value = deal.title;
        document.getElementById('modal-deal-description').value = deal.description || '';
        document.getElementById('modal-deal-category').value = deal.category || '';
        document.getElementById('modal-deal-value').value = deal.value_amount || '';

        const modal = document.getElementById('deal-modal');
        modal.dataset.dealId = dealId;
        modal.dataset.isEditing = 'true';

        const modalTitle = document.querySelector('#deal-modal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Deal';
        }

        openDealModal();
    } catch (error) {
        console.error('Error loading deal for edit:', error);
        showAlert('Error loading deal data', 'error');
    }
}

async function deleteDeal(dealId) {
    if (!confirm('Are you sure you want to delete this deal?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/deals/${dealId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            showAlert('Deal deleted successfully', 'success');
            loadDeals();
        } else {
            showAlert('Failed to delete deal', 'error');
        }
    } catch (error) {
        console.error('Error deleting deal:', error);
        showAlert('Error deleting deal', 'error');
    }
}

// PROMO CODES
function openPromoModal() {
    document.getElementById('promo-modal').classList.add('active');
    // Set default date to 90 days from now
    const date = new Date();
    date.setDate(date.getDate() + 90);
    document.getElementById('modal-promo-until').value = date.toISOString().split('T')[0];
}

function closePromoModal() {
    const modal = document.getElementById('promo-modal');
    modal.classList.remove('active');
    document.getElementById('modal-promo-code').value = '';
    document.getElementById('modal-promo-percent').value = '';
    document.getElementById('modal-promo-max').value = '';
    modal.dataset.isEditing = 'false';
    modal.dataset.promoId = '';
}

async function loadPromos() {
    try {
        const response = await fetch(`${API_URL}/api/promos`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Promos data:', data);
            displayPromos(data.data || []);
        } else {
            console.error('Promos API error:', response.status, response.statusText);
            displayError('promos-table', `Failed to load promo codes: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading promos:', error);
        displayError('promos-table', 'Failed to load promo codes');
    }
}

function displayPromos(promos) {
    const tbody = document.getElementById('promos-table');

    if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No promo codes found</td></tr>';
        return;
    }

    tbody.innerHTML = promos.map(promo => `
        <tr>
            <td><strong>${promo.code}</strong></td>
            <td>${promo.discount_percent || promo.discount_amount}${promo.discount_percent ? '%' : '€'}</td>
            <td>${promo.current_uses || '0'}</td>
            <td>${promo.max_uses || '∞'}</td>
            <td>${promo.valid_until ? formatDate(promo.valid_until) : 'No expiry'}</td>
            <td><span class="badge badge-${promo.is_active ? 'success' : 'danger'}">${promo.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editPromo('${promo.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePromo('${promo.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function savePromo() {
    const modal = document.getElementById('promo-modal');
    const isEditing = modal.dataset.isEditing === 'true';
    const promoId = modal.dataset.promoId;

    const code = document.getElementById('modal-promo-code').value.toUpperCase();
    const percent = document.getElementById('modal-promo-percent').value;
    const maxUses = document.getElementById('modal-promo-max').value;
    const validUntil = document.getElementById('modal-promo-until').value;

    if (!code || !percent) {
        showAlert('Code and percentage are required', 'error');
        return;
    }

    try {
        let url = `${API_URL}/api/promos`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/promos/${promoId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code,
                discount_percent: parseFloat(percent),
                discount_amount: null,
                max_uses: parseInt(maxUses) || null,
                valid_until: validUntil ? new Date(validUntil).toISOString() : null
            })
        });

        if (response.ok) {
            showAlert(isEditing ? 'Promo code updated successfully' : 'Promo code created successfully', 'success');
            closePromoModal();
            loadPromos();
        } else {
            showAlert('Failed to save promo code', 'error');
        }
    } catch (error) {
        console.error('Error saving promo:', error);
        showAlert('Error saving promo code', 'error');
    }
}

async function editPromo(promoId) {
    try {
        const response = await fetch(`${API_URL}/api/promos`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) {
            showAlert('Failed to load promo data', 'error');
            return;
        }

        const data = await response.json();
        const promo = data.data.find(p => p.id === promoId);

        if (!promo) {
            showAlert('Promo not found', 'error');
            return;
        }

        document.getElementById('modal-promo-code').value = promo.code;
        document.getElementById('modal-promo-percent').value = promo.discount_percent;
        document.getElementById('modal-promo-max').value = promo.max_uses || '';
        if (promo.valid_until) {
            document.getElementById('modal-promo-until').value = promo.valid_until.split('T')[0];
        }

        const modal = document.getElementById('promo-modal');
        modal.dataset.promoId = promoId;
        modal.dataset.isEditing = 'true';

        openPromoModal();
    } catch (error) {
        console.error('Error loading promo for edit:', error);
        showAlert('Error loading promo data', 'error');
    }
}

async function deletePromo(promoId) {
    if (!confirm('Are you sure you want to delete this promo code?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/promos/${promoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            showAlert('Promo code deleted successfully', 'success');
            loadPromos();
        } else {
            showAlert('Failed to delete promo code', 'error');
        }
    } catch (error) {
        console.error('Error deleting promo:', error);
        showAlert('Error deleting promo code', 'error');
    }
}

// HACKS - Load admin hack management interface
function loadHacks() {
    // Call the hack management list loader
    loadHacksList();
}

// RECENT ACTIVITIES
async function loadRecentActivities() {
    try {
        const response = await fetch(`${API_URL}/api/admin/activities?limit=10`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayActivities(data.activities || []);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function displayActivities(activities) {
    const tbody = document.getElementById('recent-activities');

    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No recent activities</td></tr>';
        return;
    }

    tbody.innerHTML = activities.map(activity => `
        <tr>
            <td>${activity.user_email}</td>
            <td>${activity.action}</td>
            <td>${formatTime(activity.created_at)}</td>
            <td><span class="badge badge-${activity.status === 'success' ? 'success' : 'danger'}">${activity.status}</span></td>
        </tr>
    `).join('');
}

// SETTINGS
async function loadSettings() {
    try {
        // Try to fetch from backend API
        console.log('🔍 Loading settings from:', `${API_URL}/api/admin/settings`);
        const response = await fetch(`${API_URL}/api/admin/settings`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        console.log('📡 Settings API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('📊 Settings API response data:', data);
            const settings = data.data || {};

            console.log('🔧 Found settings:', Object.keys(settings));

            // Populate form fields with settings values
            if (settings.sendgrid_api_key?.value) {
                console.log('✅ Setting SendGrid key');
                document.getElementById('sendgrid-key').value = settings.sendgrid_api_key.value;
            } else {
                console.warn('⚠️ No SendGrid API key value found');
            }

            if (settings.sender_email?.value) {
                console.log('✅ Setting sender email');
                document.getElementById('sender-email').value = settings.sender_email.value;
            }
            if (settings.stripe_secret_key?.value) {
                console.log('✅ Setting Stripe secret key');
                document.getElementById('stripe-key').value = settings.stripe_secret_key.value;
            }
            if (settings.stripe_publishable_key?.value) {
                console.log('✅ Setting Stripe publishable key');
                const pubKeyField = document.getElementById('stripe-pub-key');
                if (pubKeyField) {
                    pubKeyField.value = settings.stripe_publishable_key.value;
                }
            }
            if (settings.stripe_webhook_secret?.value) {
                console.log('✅ Setting webhook secret');
                document.getElementById('webhook-secret').value = settings.stripe_webhook_secret.value;
            }

            // Load checkboxes
            const sendSignupEmail = document.getElementById('send-signup');
            const sendSubEmail = document.getElementById('send-sub');
            const sendDigest = document.getElementById('send-digest');

            if (sendSignupEmail) {
                sendSignupEmail.checked = settings.send_email_on_signup?.value === 'true';
            }
            if (sendSubEmail) {
                sendSubEmail.checked = settings.send_email_on_subscription?.value === 'true';
            }
            if (sendDigest) {
                sendDigest.checked = settings.send_daily_digest?.value === 'true';
            }

            console.log('✅ Settings loaded successfully from backend database');
            return; // Success, don't need localStorage fallback
        } else {
            console.warn('⚠️ Settings API returned status:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.warn('Error details:', errorData);
        }
    } catch (error) {
        console.warn('Backend API unavailable, trying localStorage fallback:', error.message);
    }

    // Fallback: Load from localStorage
    try {
        const stripePubKey = localStorage.getItem('stripePublishableKey');
        const stripeSecret = localStorage.getItem('admin_stripe_secret');
        const sendgridKey = localStorage.getItem('admin_sendgrid_key');
        const senderEmail = localStorage.getItem('admin_sender_email');
        const webhookSecret = localStorage.getItem('admin_webhook_secret');

        if (stripePubKey) {
            const pubKeyField = document.getElementById('stripe-pub-key');
            if (pubKeyField) pubKeyField.value = stripePubKey;
        }
        if (stripeSecret) {
            document.getElementById('stripe-key').value = stripeSecret;
        }
        if (sendgridKey) {
            document.getElementById('sendgrid-key').value = sendgridKey;
        }
        if (senderEmail) {
            document.getElementById('sender-email').value = senderEmail;
        }
        if (webhookSecret) {
            document.getElementById('webhook-secret').value = webhookSecret;
        }

        // Load checkboxes from localStorage
        const sendSignupEmail = document.getElementById('send-signup');
        const sendSubEmail = document.getElementById('send-sub');
        const sendDigest = document.getElementById('send-digest');

        if (sendSignupEmail) {
            sendSignupEmail.checked = localStorage.getItem('admin_send_signup_email') === 'true';
        }
        if (sendSubEmail) {
            sendSubEmail.checked = localStorage.getItem('admin_send_sub_email') === 'true';
        }
        if (sendDigest) {
            sendDigest.checked = localStorage.getItem('admin_send_digest') === 'true';
        }

        console.log('✅ Settings loaded from localStorage');
    } catch (localStorageError) {
        console.error('Error loading settings from localStorage:', localStorageError);
    }
}

async function saveSettings() {
    const sendgridKey = document.getElementById('sendgrid-key').value;
    const senderEmail = document.getElementById('sender-email').value;
    const stripeKey = document.getElementById('stripe-key').value;
    const stripePubKey = document.getElementById('stripe-pub-key')?.value || '';
    const webhookSecret = document.getElementById('webhook-secret').value;

    // Checkbox values
    const sendSignupEmail = document.getElementById('send-signup').checked;
    const sendSubEmail = document.getElementById('send-sub').checked;
    const sendDigest = document.getElementById('send-digest').checked;

    // Validate required fields
    if (!stripeKey || !sendgridKey) {
        showAlert('Stripe Secret Key and SendGrid API Key are required', 'error');
        return;
    }

    try {
        // Save all settings to localStorage (works reliably, survives page refresh)
        localStorage.setItem('admin_sendgrid_key', sendgridKey);
        localStorage.setItem('admin_sender_email', senderEmail);
        localStorage.setItem('admin_stripe_secret', stripeKey);
        localStorage.setItem('stripePublishableKey', stripePubKey); // Used by checkout page
        localStorage.setItem('admin_webhook_secret', webhookSecret);
        localStorage.setItem('admin_send_signup_email', sendSignupEmail.toString());
        localStorage.setItem('admin_send_sub_email', sendSubEmail.toString());
        localStorage.setItem('admin_send_digest', sendDigest.toString());

        console.log('✅ Settings saved to localStorage');
        showAlert('Settings saved successfully! Stripe key is ready for checkout.', 'success');

        // Optional: Try to sync to backend (non-blocking)
        try {
            await fetch(`${API_URL}/api/admin/settings/batch/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'sendgrid_api_key': sendgridKey,
                    'sender_email': senderEmail,
                    'stripe_secret_key': stripeKey,
                    'stripe_publishable_key': stripePubKey,
                    'stripe_webhook_secret': webhookSecret,
                    'send_email_on_signup': sendSignupEmail.toString(),
                    'send_email_on_subscription': sendSubEmail.toString(),
                    'send_daily_digest': sendDigest.toString()
                })
            });
            console.log('✅ Settings also synced to backend database');
        } catch (backendError) {
            console.warn('⚠️ Backend sync failed (non-blocking):', backendError.message);
            // This is OK - localStorage is our primary storage now
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('Error saving settings to localStorage', 'error');
    }
}

// AUTHENTICATION
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    localStorage.removeItem('apiUrl');
    redirectToLogin();
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// UTILITIES
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';

    return date.toLocaleDateString();
}

function displayError(elementId, message) {
    const tbody = document.getElementById(elementId);
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">${message}</td></tr>`;
}

// EMAIL TEMPLATES MANAGEMENT
async function loadEmailTemplates() {
    try {
        // Load sequences
        const sequencesResponse = await fetch(`${API_URL}/api/email-templates/sequences`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (sequencesResponse.ok) {
            const sequencesData = await sequencesResponse.json();
            renderSequences(sequencesData.data || []);
        } else {
            console.error('Failed to load sequences');
        }

        // Load templates
        const templatesResponse = await fetch(`${API_URL}/api/email-templates/templates`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (templatesResponse.ok) {
            const templatesData = await templatesResponse.json();
            // For now, just show loading - we'll render after getting sequence info
        }
    } catch (error) {
        console.error('Error loading email templates:', error);
    }
}

function renderSequences(sequences) {
    const tbody = document.getElementById('sequences-table');

    if (!sequences || sequences.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sequences yet</td></tr>';
        return;
    }

    tbody.innerHTML = sequences.map(seq => `
        <tr>
            <td><strong>${seq.name}</strong></td>
            <td>${seq.description || '-'}</td>
            <td>${seq.template_count || 0} templates</td>
            <td><span class="badge ${seq.is_active ? 'badge-success' : 'badge-danger'}">${seq.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewSequence('${seq.id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSequence('${seq.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function viewSequence(sequenceId) {
    try {
        const response = await fetch(`${API_URL}/api/email-templates/sequences/${sequenceId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderTemplatesForSequence(data.templates);
        }
    } catch (error) {
        console.error('Error loading sequence details:', error);
    }
}

function renderTemplatesForSequence(templates) {
    const tbody = document.getElementById('templates-table');

    if (!templates || templates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No templates in this sequence</td></tr>';
        return;
    }

    tbody.innerHTML = templates.map(template => `
        <tr>
            <td>Day ${template.day}</td>
            <td>${template.subject}</td>
            <td>${template.sequence_id}</td>
            <td><span class="badge ${template.is_active ? 'badge-success' : 'badge-danger'}">${template.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTemplate('${template.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${template.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openEmailSequenceModal() {
    document.getElementById('email-sequence-modal').classList.add('active');
}

function closeEmailSequenceModal() {
    document.getElementById('email-sequence-modal').classList.remove('active');
    document.getElementById('modal-sequence-name').value = '';
    document.getElementById('modal-sequence-description').value = '';
}

function openTemplateModal() {
    document.getElementById('template-modal').classList.add('active');
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.remove('active');
    document.getElementById('modal-template-id').value = '';
    document.getElementById('modal-template-day').value = '';
    document.getElementById('modal-template-subject').value = '';
    document.getElementById('modal-template-content').value = '';
    document.getElementById('template-modal-title').textContent = 'Create Email Template';
    document.getElementById('template-save-btn').textContent = 'Create Template';
}

async function saveEmailSequence() {
    const name = document.getElementById('modal-sequence-name').value;
    const description = document.getElementById('modal-sequence-description').value;

    if (!name) {
        showAlert('Sequence name is required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/email-templates/sequences`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });

        if (response.ok) {
            showAlert('Sequence created successfully', 'success');
            closeEmailSequenceModal();
            loadEmailTemplates();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to create sequence', 'error');
            console.error('API error:', error);
        }
    } catch (error) {
        console.error('Error creating sequence:', error);
        showAlert('Error creating sequence: ' + error.message, 'error');
    }
}

async function saveEmailTemplate() {
    const templateId = document.getElementById('modal-template-id').value;
    const sequenceId = document.getElementById('modal-template-sequence').value;
    const day = document.getElementById('modal-template-day').value;
    const subject = document.getElementById('modal-template-subject').value;
    const content = document.getElementById('modal-template-content').value;

    if (!sequenceId || !subject) {
        showAlert('Sequence and subject are required', 'error');
        return;
    }

    const isEdit = !!templateId;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/api/email-templates/templates/${templateId}` : `${API_URL}/api/email-templates/templates`;

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sequence_id: sequenceId,
                day: parseInt(day) || 0,
                subject,
                html_content: content,
                content: content
            })
        });

        if (response.ok) {
            const action = isEdit ? 'updated' : 'created';
            showAlert(`Template ${action} successfully`, 'success');
            closeTemplateModal();
            loadEmailTemplates();
        } else {
            const error = await response.json();
            showAlert(error.message || `Failed to ${isEdit ? 'update' : 'create'} template`, 'error');
            console.error('API error:', error);
        }
    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'creating'} template:`, error);
        showAlert(`Error ${isEdit ? 'updating' : 'creating'} template: ` + error.message, 'error');
    }
}

async function createSequence(name) {
    try {
        const response = await fetch(`${API_URL}/api/email-templates/sequences`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description: '' })
        });

        if (response.ok) {
            showAlert('Sequence created successfully', 'success');
            loadEmailTemplates();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to create sequence', 'error');
        }
    } catch (error) {
        console.error('Error creating sequence:', error);
        showAlert('Error creating sequence', 'error');
    }
}

async function deleteSequence(sequenceId) {
    if (confirm('Are you sure you want to delete this sequence?')) {
        try {
            const response = await fetch(`${API_URL}/api/email-templates/sequences/${sequenceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                showAlert('Sequence deleted', 'success');
                loadEmailTemplates();
            }
        } catch (error) {
            console.error('Error deleting sequence:', error);
            showAlert('Error deleting sequence', 'error');
        }
    }
}

async function deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
        try {
            const response = await fetch(`${API_URL}/api/email-templates/templates/${templateId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                showAlert('Template deleted', 'success');
                loadEmailTemplates();
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            showAlert('Error deleting template', 'error');
        }
    }
}

async function editTemplate(templateId) {
    try {
        // Fetch the template data
        const response = await fetch(`${API_URL}/api/email-templates/templates/${templateId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) {
            showAlert('Failed to load template', 'error');
            return;
        }

        const data = await response.json();
        const template = data.data;

        // Populate form fields
        document.getElementById('modal-template-day').value = template.day || 0;
        document.getElementById('modal-template-subject').value = template.subject || '';
        document.getElementById('modal-template-content').value = template.html_content || template.content || '';
        document.getElementById('modal-template-sequence').value = template.sequence_id || '';

        // Change modal title and button to Edit
        document.getElementById('template-modal-title').textContent = 'Edit Email Template';
        document.getElementById('template-save-btn').textContent = 'Update Template';

        // Store the template ID for saving
        document.getElementById('modal-template-id').value = templateId;

        // Open the modal
        document.getElementById('template-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading template:', error);
        showAlert('Error loading template: ' + error.message, 'error');
    }
}

// ============================================
// HACK MANAGEMENT FUNCTIONS
// ============================================

let currentEditingHackId = null;

// Load and display all hacks
async function loadHacksList() {
    try {
        const response = await fetch(`${API_URL}/api/hacks/admin/hacks`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load hacks');

        const data = await response.json();
        const tbody = document.getElementById('hacks-tbody');
        tbody.innerHTML = '';

        const moduleNames = {
            1: 'Flight Hacks', 2: 'Credit Cards', 3: 'Hotel Hacks', 4: 'Timing Intelligence',
            5: 'Airport & Transit', 6: 'Destinations', 7: 'Car Rentals', 8: 'Community',
            9: 'Travel Money', 10: 'Travel Insurance', 11: 'Visa & Immigration',
            12: 'Accommodations', 13: 'Ground Transport', 14: 'Travel Bookings',
            15: 'Food & Dining', 16: 'Shopping & VAT'
        };

        if (data.hacks && data.hacks.length > 0) {
            data.hacks.forEach(hack => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${moduleNames[hack.module_id] || `Module ${hack.module_id}`}</td>
                    <td>${hack.title}</td>
                    <td>${hack.category}</td>
                    <td><span class="badge badge-${hack.difficulty}">${hack.difficulty}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editHack('${hack.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteHack('${hack.id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hacks found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading hacks:', error);
        showAlert('Failed to load hacks', 'error');
    }
}

// Open add hack modal
function openAddHackModal() {
    currentEditingHackId = null;
    document.getElementById('hack-modal-title').textContent = 'Add New Hack';
    document.getElementById('modal-hack-module-id').value = '';
    document.getElementById('modal-hack-title-new').value = '';
    document.getElementById('modal-hack-description').value = '';
    document.getElementById('modal-hack-category').value = '';
    document.getElementById('modal-hack-difficulty').value = 'medium';

    // Populate module dropdown
    const select = document.getElementById('modal-hack-module-id');
    select.innerHTML = '<option value="">Select a module (1-16)</option>';
    for (let i = 1; i <= 16; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `Module ${i}`;
        select.appendChild(option);
    }

    document.getElementById('hack-management-modal').classList.add('active');
}

// Edit hack
async function editHack(hackId) {
    try {
        // Get all hacks and find this one
        const response = await fetch(`${API_URL}/api/hacks/admin/hacks`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        const data = await response.json();
        const hack = data.hacks.find(h => h.id === hackId);

        if (!hack) {
            showAlert('Hack not found', 'error');
            return;
        }

        currentEditingHackId = hackId;
        document.getElementById('hack-modal-title').textContent = 'Edit Hack';
        document.getElementById('modal-hack-module-id').value = hack.module_id;
        document.getElementById('modal-hack-title-new').value = hack.title;
        document.getElementById('modal-hack-description').value = hack.description;
        document.getElementById('modal-hack-category').value = hack.category;
        document.getElementById('modal-hack-difficulty').value = hack.difficulty;

        // Populate module dropdown
        const select = document.getElementById('modal-hack-module-id');
        select.innerHTML = '<option value="">Select a module (1-16)</option>';
        for (let i = 1; i <= 16; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = `Module ${i}`;
            select.appendChild(option);
        }

        document.getElementById('hack-management-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading hack for edit:', error);
        showAlert('Failed to load hack', 'error');
    }
}

// Save hack (create or update)
async function saveHackManagement() {
    const moduleId = document.getElementById('modal-hack-module-id').value;
    const title = document.getElementById('modal-hack-title-new').value;
    const description = document.getElementById('modal-hack-description').value;
    const category = document.getElementById('modal-hack-category').value;
    const difficulty = document.getElementById('modal-hack-difficulty').value;

    if (!moduleId || !title || !description || !category) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    try {
        const url = currentEditingHackId
            ? `${API_URL}/api/hacks/admin/hacks/${currentEditingHackId}`
            : `${API_URL}/api/hacks/admin/hacks`;

        const method = currentEditingHackId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                module_id: parseInt(moduleId),
                title,
                description,
                category,
                difficulty
            })
        });

        if (response.ok) {
            showAlert(currentEditingHackId ? 'Hack updated' : 'Hack created', 'success');
            closeHackManagementModal();
            loadHacksList();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to save hack', 'error');
        }
    } catch (error) {
        console.error('Error saving hack:', error);
        showAlert('Error saving hack', 'error');
    }
}

// Delete hack
async function deleteHack(hackId) {
    if (!confirm('Are you sure you want to delete this hack?')) return;

    try {
        const response = await fetch(`${API_URL}/api/hacks/admin/hacks/${hackId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            showAlert('Hack deleted', 'success');
            loadHacksList();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to delete hack', 'error');
        }
    } catch (error) {
        console.error('Error deleting hack:', error);
        showAlert('Error deleting hack', 'error');
    }
}

// Close hack management modal
function closeHackManagementModal() {
    document.getElementById('hack-management-modal').classList.remove('active');
    currentEditingHackId = null;
}
