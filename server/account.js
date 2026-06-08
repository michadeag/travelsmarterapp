// User Account Dashboard
// Determine API URL based on environment
let API_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = 'http://localhost:5000';
} else {
    API_URL = 'https://monkfish-app-74dif.ondigitalocean.app';
}

// Get auth token
function getAuthToken() {
    return localStorage.getItem('userToken') || localStorage.getItem('token');
}

// Check if user is logged in
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'auth.html';
        return false;
    }
    return true;
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    loadProfile();
    loadSubscription();
    loadPaymentHistory();
    loadSavedHacks();
});

// Show alert message
function showAlert(message, type = 'success') {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert show alert-${type}`;

    setTimeout(() => {
        alert.classList.remove('show');
    }, 4000);
}

// Load user profile
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load profile');

        const data = await response.json();
        const user = data.user;

        document.getElementById('profile-name').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-joined').textContent = formatDate(user.createdAt);

        document.getElementById('profile-loading').style.display = 'none';
        document.getElementById('profile-content').style.display = 'block';

        // Store user data for later use
        window.currentUser = user;
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile', 'error');
    }
}

// Load user subscription
async function loadSubscription() {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions/current`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load subscription');

        const data = await response.json();
        const subscription = data.subscription;

        const tierNames = {
            'free': 'Free',
            'smart_traveler': 'Smart Traveler',
            'elite': 'Elite'
        };

        const tierBadges = {
            'free': 'badge-free',
            'smart_traveler': 'badge-smart',
            'elite': 'badge-elite'
        };

        const tierDisplay = tierNames[subscription.tier] || subscription.tier;
        document.getElementById('subscription-tier').textContent = tierDisplay;

        const badge = document.getElementById('subscription-badge');
        badge.textContent = tierDisplay;
        badge.className = `subscription-badge ${tierBadges[subscription.tier]}`;

        document.getElementById('subscription-status').textContent = subscription.status === 'active' ? 'Active' : 'Inactive';
        document.getElementById('subscription-next-billing').textContent = subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A';

        document.getElementById('subscription-loading').style.display = 'none';
        document.getElementById('subscription-content').style.display = 'block';

        // Store subscription for later use
        window.currentSubscription = subscription;
    } catch (error) {
        console.error('Error loading subscription:', error);
        showAlert('Failed to load subscription', 'error');
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions/current`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load payment history');

        const data = await response.json();
        const subscription = data.subscription;

        // For now, show the current subscription as a recent payment
        // In a real app, you'd query a separate payment history endpoint
        const tbody = document.getElementById('payments-table-body');

        if (subscription && (subscription.currentPeriodStart || subscription.tier !== 'free')) {
            const row = document.createElement('tr');
            const paymentDate = subscription.currentPeriodStart || new Date().toISOString();
            row.innerHTML = `
                <td>${formatDate(paymentDate)}</td>
                <td>€${subscription.priceMonthly || '0.00'}</td>
                <td>${subscription.tier === 'smart_traveler' ? 'Smart Traveler' : subscription.tier === 'elite' ? 'Elite' : 'Free'}</td>
                <td><span class="status-badge status-success">Completed</span></td>
            `;
            tbody.appendChild(row);
        }

        if (tbody.children.length === 0) {
            document.getElementById('payments-empty').style.display = 'block';
        } else {
            document.getElementById('payments-content').style.display = 'block';
        }

        document.getElementById('payments-loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading payment history:', error);
        document.getElementById('payments-loading').style.display = 'none';
        document.getElementById('payments-empty').style.display = 'block';
    }
}

// Load saved hacks
async function loadSavedHacks() {
    try {
        const response = await fetch(`${API_URL}/api/hacks/saved`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load saved hacks');

        const data = await response.json();
        const hacks = data.savedHacks || [];

        const grid = document.getElementById('hacks-grid');

        if (hacks.length === 0) {
            document.getElementById('hacks-empty').style.display = 'block';
        } else {
            hacks.forEach(hack => {
                const card = document.createElement('div');
                card.className = 'hack-card';
                card.innerHTML = `
                    <h4>${hack.title || 'Hack'}</h4>
                    <p><strong>Category:</strong> ${hack.category || 'General'}</p>
                    <p><strong>Saved:</strong> ${formatDate(hack.saved_at)}</p>
                `;
                grid.appendChild(card);
            });
            document.getElementById('hacks-content').style.display = 'block';
        }

        document.getElementById('hacks-loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading saved hacks:', error);
        document.getElementById('hacks-loading').style.display = 'none';
        document.getElementById('hacks-empty').style.display = 'block';
    }
}

// Modal functions
function openEditProfileModal() {
    if (window.currentUser) {
        document.getElementById('modal-first-name').value = window.currentUser.firstName || '';
        document.getElementById('modal-last-name').value = window.currentUser.lastName || '';
    }
    document.getElementById('edit-profile-modal').classList.add('active');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.remove('active');
}

function openChangePasswordModal() {
    document.getElementById('change-password-modal').classList.add('active');
}

function closeChangePasswordModal() {
    document.getElementById('change-password-modal').classList.remove('active');
    document.getElementById('modal-current-password').value = '';
    document.getElementById('modal-new-password').value = '';
    document.getElementById('modal-confirm-password').value = '';
}

function openCancelModal() {
    document.getElementById('cancel-subscription-modal').classList.add('active');
}

function closeCancelModal() {
    document.getElementById('cancel-subscription-modal').classList.remove('active');
    document.getElementById('cancel-confirm').checked = false;
    document.getElementById('cancel-button').disabled = true;
}

// Toggle cancel button
document.addEventListener('change', (e) => {
    if (e.target.id === 'cancel-confirm') {
        document.getElementById('cancel-button').disabled = !e.target.checked;
    }
});

// Save profile changes
async function saveProfileChanges() {
    const firstName = document.getElementById('modal-first-name').value;
    const lastName = document.getElementById('modal-last-name').value;

    try {
        console.log('Updating profile with:', { firstName, lastName });
        const response = await fetch(`${API_URL}/api/auth/update-profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: firstName,
                lastName: lastName
            })
        });

        const data = await response.json();
        console.log('Profile update response:', data);

        if (response.ok) {
            showAlert('Profile updated successfully', 'success');
            closeEditProfileModal();
            loadProfile();
        } else {
            showAlert(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showAlert(error.message || 'Error updating profile', 'error');
    }
}

// Save password change
async function savePasswordChange() {
    const currentPassword = document.getElementById('modal-current-password').value;
    const newPassword = document.getElementById('modal-new-password').value;
    const confirmPassword = document.getElementById('modal-confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    try {
        console.log('Changing password...');
        const response = await fetch(`${API_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        const data = await response.json();
        console.log('Password change response:', data);

        if (response.ok) {
            showAlert('Password changed successfully', 'success');
            closeChangePasswordModal();
        } else {
            showAlert(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showAlert(error.message || 'Error changing password', 'error');
    }
}

// Cancel subscription
async function confirmCancel() {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showAlert('Subscription cancelled successfully', 'success');
            closeCancelModal();
            loadSubscription();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to cancel subscription', 'error');
        }
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        showAlert('Error cancelling subscription', 'error');
    }
}

// Go to pricing page
function goToPricing() {
    window.location.href = 'sales-page.html';
}

// Logout
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    window.location.href = 'auth.html';
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
