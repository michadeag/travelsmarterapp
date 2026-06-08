/**
 * Subscription Tier Gating Logic
 * Defines which features/content is available at each tier
 */

const TIER_LIMITS = {
  free: {
    name: 'Free',
    maxModules: 4,
    allowedModules: [1, 2, 3, 4],
    description: 'Access to basic travel hacks'
  },
  smart_traveler: {
    name: 'Smart Traveler',
    maxModules: 10,
    allowedModules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    description: 'Access to 10 comprehensive modules'
  },
  elite: {
    name: 'Elite',
    maxModules: 16,
    allowedModules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    description: 'Access to all 16 exclusive modules'
  }
};

/**
 * Get user's subscription tier
 * @param {string} userTier - User's subscription tier from database
 * @returns {object} Tier configuration
 */
function getUserTierConfig(userTier) {
  return TIER_LIMITS[userTier] || TIER_LIMITS.free;
}

/**
 * Check if module is accessible for user tier
 * @param {string} userTier - User's subscription tier
 * @param {number} moduleId - Module ID to check
 * @returns {boolean} True if user can access module
 */
function canAccessModule(userTier, moduleId) {
  const tierConfig = getUserTierConfig(userTier);
  return tierConfig.allowedModules.includes(moduleId);
}

/**
 * Get module access status for user
 * @param {string} userTier - User's subscription tier
 * @param {number} moduleId - Module ID to check
 * @returns {object} Access status with unlock tier info
 */
function getModuleAccessStatus(userTier, moduleId) {
  const tierConfig = getUserTierConfig(userTier);
  const isAccessible = tierConfig.allowedModules.includes(moduleId);

  if (isAccessible) {
    return {
      accessible: true,
      locked: false,
      message: 'You have access to this module'
    };
  }

  // Determine which tier unlocks this module
  let unlockedAt = 'elite';
  if (TIER_LIMITS.smart_traveler.allowedModules.includes(moduleId)) {
    unlockedAt = 'smart_traveler';
  }

  return {
    accessible: false,
    locked: true,
    unlockedAt: unlockedAt,
    message: `Upgrade to ${TIER_LIMITS[unlockedAt].name} to access this module`
  };
}

/**
 * Filter modules by user tier
 * @param {string} userTier - User's subscription tier
 * @param {object} allModules - All module definitions
 * @returns {object} Modules with access status
 */
function filterModulesByTier(userTier, allModules) {
  const filtered = {};

  Object.keys(allModules).forEach(moduleId => {
    const moduleIdNum = parseInt(moduleId);
    const access = getModuleAccessStatus(userTier, moduleIdNum);

    filtered[moduleId] = {
      ...allModules[moduleId],
      accessible: access.accessible,
      locked: access.locked,
      accessMessage: access.message,
      unlockedAt: access.unlockedAt
    };
  });

  return filtered;
}

module.exports = {
  TIER_LIMITS,
  getUserTierConfig,
  canAccessModule,
  getModuleAccessStatus,
  filterModulesByTier
};
