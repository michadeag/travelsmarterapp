/**
 * Module Tier Gating UI
 * Displays modules with access status and upgrade prompts
 */

// Determine API URL based on environment
let API_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = 'http://localhost:5000';
} else {
    API_URL = 'https://api.travelsmarterapp.com';
}

// Get auth token
function getAuthToken() {
  return localStorage.getItem('userToken');
}

/**
 * Load all modules with tier access info
 */
async function loadModules() {
  try {
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    console.log('Loading modules with token:', token ? 'YES' : 'NO');
    const response = await fetch(`${API_URL}/api/hacks/modules`, { headers });

    if (!response.ok) {
      console.error('Failed to load modules:', response.status);
      return;
    }

    const data = await response.json();
    console.log('API Response:', data);
    console.log('User Tier:', data.userTier);
    displayModules(data);
  } catch (error) {
    console.error('Error loading modules:', error);
  }
}

/**
 * Display modules with lock status
 */
function displayModules(data) {
  const container = document.getElementById('modules-container');
  if (!container) return;

  const { userTier, userTierName, modules } = data;

  // Display current tier info
  const tierInfo = document.getElementById('tier-info');
  if (tierInfo) {
    tierInfo.innerHTML = `
      <div style="padding: 15px; background: #e3f2fd; border-radius: 8px; margin-bottom: 20px;">
        <strong>Current Tier:</strong> ${userTierName}
        ${userTier !== 'elite' ? `<br><a href="sales-page.html" style="color: #1976d2; text-decoration: none;">Upgrade for more modules →</a>` : ''}
      </div>
    `;
  }

  // Create module grid
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  `;

  modules.forEach(module => {
    const card = createModuleCard(module);
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

/**
 * Create a module card with lock state
 */
function createModuleCard(module) {
  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    cursor: ${module.accessible ? 'pointer' : 'default'};
    position: relative;
    overflow: hidden;
  `;

  if (!module.accessible) {
    card.style.cssText += `
      opacity: 0.6;
      filter: grayscale(100%);
      background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    `;
  } else {
    card.style.cssText += `
      cursor: pointer;
    `;
    card.onmouseover = () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
    };
    card.onmouseout = () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    };
  }

  const lockIcon = module.locked ? `
    <div style="position: absolute; top: 10px; right: 10px; font-size: 24px;">🔒</div>
  ` : '';

  const upgradeButton = module.locked ? `
    <button onclick="goToPricing()" style="
      width: 100%;
      padding: 10px;
      margin-top: 15px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.3s;
    " onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">
      Upgrade to Unlock
    </button>
  ` : '';

  const unlockInfo = module.locked ? `
    <p style="color: #ef4444; font-size: 0.9em; margin-top: 10px; font-weight: 500;">
      ${module.message}
    </p>
  ` : '';

  card.innerHTML = `
    ${lockIcon}
    <div style="font-size: 32px; margin-bottom: 10px;">${module.icon}</div>
    <h3 style="margin-bottom: 8px; color: #1f2937; font-size: 1.1em;">${module.title}</h3>
    <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 10px;">
      ${module.hackCount} hacks
    </p>
    ${unlockInfo}
    ${upgradeButton}
  `;

  if (module.accessible) {
    card.onclick = () => viewModule(module.id);
  }

  return card;
}

/**
 * Navigate to module details
 */
function viewModule(moduleId) {
  window.location.href = `module.html?id=${moduleId}`;
}

/**
 * Navigate to pricing page
 */
function goToPricing() {
  window.location.href = 'sales-page.html';
}

// Load modules when page loads
document.addEventListener('DOMContentLoaded', loadModules);
