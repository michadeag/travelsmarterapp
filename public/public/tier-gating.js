/**
 * Tier Gating System
 * Shared component for displaying tier-locked content across the site
 */

const TIER_LIMITS = {
  free: {
    name: 'Free',
    color: '#6b7280',
    modules: 4,
    features: ['Flight Hacks', 'Credit Cards', 'Hotel Hacks', 'Timing Intelligence']
  },
  smart_traveler: {
    name: 'Smart Traveler',
    color: '#3b82f6',
    modules: 10,
    features: ['First 10 modules', 'Email sequences', 'Deal alerts', 'Saved hacks']
  },
  elite: {
    name: 'Elite',
    color: '#10b981',
    modules: 16,
    features: ['All 16 modules', 'Premium sequences', 'Priority support', 'Exclusive content']
  }
};

const API_URL = 'https://monkfish-app-74dif.ondigitalocean.app';

/**
 * Get current user's tier from API or localStorage
 */
async function getCurrentUserTier() {
  const token = localStorage.getItem('userToken');
  if (!token) return 'free';

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      return data.user.subscriptionTier || 'free';
    }
  } catch (error) {
    console.error('Failed to get user tier:', error);
  }

  return 'free';
}

/**
 * Check if content should be visible for user's tier
 */
function isContentAvailable(requiredTier, userTier) {
  const tierHierarchy = { free: 0, smart_traveler: 1, elite: 2 };
  const requiredLevel = tierHierarchy[requiredTier] || 0;
  const userLevel = tierHierarchy[userTier] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Show tier upgrade prompt
 */
function showUpgradePrompt(element, requiredTier) {
  const tier = TIER_LIMITS[requiredTier];
  const html = `
    <div style="
      background: linear-gradient(135deg, ${tier.color}22 0%, ${tier.color}11 100%);
      border: 2px solid ${tier.color};
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    ">
      <div style="font-size: 40px; margin-bottom: 10px;">🔒</div>
      <h3 style="color: ${tier.color}; margin-bottom: 10px;">
        Unlock with ${tier.name}
      </h3>
      <p style="color: #6b7280; margin-bottom: 15px; font-size: 0.95em;">
        This content is available for ${tier.name} subscribers
      </p>
      <a href="/pricing" style="
        display: inline-block;
        background: ${tier.color};
        color: white;
        padding: 12px 30px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s;
      " onmouseover="this.style.filter='brightness(0.9)'" onmouseout="this.style.filter='brightness(1)'">
        See Pricing
      </a>
    </div>
  `;
  element.innerHTML = html;
}

/**
 * Create tier comparison matrix
 */
function createTierMatrix() {
  const html = `
    <div style="
      background: white;
      border-radius: 15px;
      padding: 40px;
      margin: 40px 0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    ">
      <h2 style="text-align: center; margin-bottom: 40px; font-size: 2em;">
        Choose Your Plan
      </h2>

      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 30px;
        max-width: 1200px;
        margin: 0 auto;
      ">
        <!-- FREE TIER -->
        <div style="
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          background: #f9fafb;
          transition: all 0.3s;
        ">
          <h3 style="margin-bottom: 10px; font-size: 1.5em;">📱 Free</h3>
          <p style="color: #6b7280; margin-bottom: 20px;">Perfect for beginners</p>
          <p style="font-size: 2em; font-weight: bold; margin-bottom: 20px;">$0</p>
          <ul style="text-align: left; list-style: none; margin-bottom: 20px;">
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✅ 4 modules</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✅ 22 hacks</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">❌ Email sequences</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">❌ Premium content</li>
          </ul>
          <a href="/auth" style="
            display: block;
            background: #6b7280;
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
          ">Get Started</a>
        </div>

        <!-- SMART TRAVELER TIER -->
        <div style="
          border: 3px solid #3b82f6;
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          background: #eff6ff;
          position: relative;
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.2);
        ">
          <div style="
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: #3b82f6;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85em;
          ">MOST POPULAR</div>
          <h3 style="margin-bottom: 10px; font-size: 1.5em; color: #3b82f6;">✈️ Smart Traveler</h3>
          <p style="color: #6b7280; margin-bottom: 20px;">For serious travelers</p>
          <p style="font-size: 2em; font-weight: bold; margin-bottom: 5px; color: #3b82f6;">$19<span style="font-size: 0.5em;">/month</span></p>
          <p style="color: #6b7280; margin-bottom: 20px; font-size: 0.9em;">Or €190/year (Save 17%)</p>
          <ul style="text-align: left; list-style: none; margin-bottom: 20px;">
            <li style="padding: 10px 0; border-bottom: 1px solid #dbeafe;">✅ 10 modules</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #dbeafe;">✅ 50+ hacks</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #dbeafe;">✅ Email sequences</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #dbeafe;">❌ Exclusive content</li>
          </ul>
          <a href="/pricing" style="
            display: block;
            background: #3b82f6;
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
          ">Start Free Trial</a>
        </div>

        <!-- ELITE TIER -->
        <div style="
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          background: #f0fdf4;
          transition: all 0.3s;
        ">
          <h3 style="margin-bottom: 10px; font-size: 1.5em; color: #10b981;">👑 Elite</h3>
          <p style="color: #6b7280; margin-bottom: 20px;">For master travelers</p>
          <p style="font-size: 2em; font-weight: bold; margin-bottom: 5px; color: #10b981;">$49<span style="font-size: 0.5em;">/month</span></p>
          <p style="color: #6b7280; margin-bottom: 20px; font-size: 0.9em;">Or €490/year (Save 17%)</p>
          <ul style="text-align: left; list-style: none; margin-bottom: 20px;">
            <li style="padding: 10px 0; border-bottom: 1px solid #dcfce7;">✅ All 16 modules</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #dcfce7;">✅ 80+ hacks</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #dcfce7;">✅ Premium sequences</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #dcfce7;">✅ Priority support</li>
          </ul>
          <a href="/pricing" style="
            display: block;
            background: #10b981;
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
          ">Start Free Trial</a>
        </div>
      </div>
    </div>
  `;

  return html;
}

/**
 * Add tier badge to element
 */
function addTierBadge(element, tier) {
  const tierConfig = TIER_LIMITS[tier];
  if (!tierConfig) return;

  const badge = document.createElement('span');
  badge.style.cssText = `
    display: inline-block;
    background: ${tierConfig.color};
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.75em;
    margin-left: 8px;
  `;
  badge.textContent = `${tierConfig.name} Only`;

  element.appendChild(badge);
}

/**
 * Apply tier-gating to module buttons on index page
 */
async function applyModuleGating() {
  const userTier = await getCurrentUserTier();
  const moduleButtons = document.querySelectorAll('.tab-button');

  // Map modules to their required tier
  const moduleRequiredTier = {
    'flight-hacks': 'free',      // Module 1
    'credit-cards': 'free',      // Module 2
    'hotels': 'free',            // Module 3
    'timing': 'free',            // Module 4
    'airport': 'smart_traveler', // Module 5
    'destinations': 'smart_traveler', // Module 6
    'rentacar': 'smart_traveler', // Module 7
    'community': 'smart_traveler', // Module 8
    'money': 'smart_traveler',   // Module 9
    'insurance': 'smart_traveler', // Module 10
    'visa': 'elite',             // Module 11
    'accommodation': 'elite',    // Module 12
    'transport': 'elite',        // Module 13
    'bookings': 'elite',         // Module 14
    'food': 'elite',             // Module 15
    'shopping': 'elite'          // Module 16
  };

  moduleButtons.forEach(button => {
    // Find the tab this button controls
    const tabName = button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (!tabName) return;

    const requiredTier = moduleRequiredTier[tabName];
    if (!requiredTier) return;

    const hasAccess = isContentAvailable(requiredTier, userTier);

    if (!hasAccess) {
      // Disable the button
      button.style.opacity = '0.5';
      button.style.filter = 'grayscale(100%)';
      button.style.cursor = 'not-allowed';
      button.disabled = true;

      // Remove the onclick handler
      button.removeAttribute('onclick');

      // Add click handler to show upgrade prompt
      button.addEventListener('click', (e) => {
        e.preventDefault();
        alert(`This module requires a ${TIER_LIMITS[requiredTier].name} subscription. Click "Upgrade" in the header to unlock all modules.`);
      });

      // Add lock icon
      button.innerHTML += ' 🔒';
    }
  });
}

/**
 * Process tier-locked content on page load
 */
async function initTierGating() {
  const userTier = await getCurrentUserTier();

  // Process tier-locked sections
  document.querySelectorAll('[data-tier-lock]').forEach(element => {
    const requiredTier = element.getAttribute('data-tier-lock');
    if (!isContentAvailable(requiredTier, userTier)) {
      showUpgradePrompt(element, requiredTier);
    }
  });

  // Add tier info to title
  const tierDisplay = document.getElementById('user-tier-display');
  if (tierDisplay) {
    const tierConfig = TIER_LIMITS[userTier];
    tierDisplay.innerHTML = `
      <span style="color: ${tierConfig.color}; font-weight: 600;">
        ${tierConfig.name}
      </span>
    `;
  }

  // Apply module gating on index page
  if (document.querySelectorAll('.tab-button').length > 0) {
    applyModuleGating();
  }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTierGating);
} else {
  initTierGating();
}
