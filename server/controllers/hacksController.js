const pool = require('../config/database');
const { canAccessModule, filterModulesByTier, getUserTierConfig } = require('../utils/tierGating');

// @desc Save a hack
// @route POST /api/hacks/save
// @access Private
exports.saveHack = async (req, res) => {
  try {
    const { hackId } = req.body;
    const userId = req.user.id;

    console.log('💾 Save hack attempt:', { userId, hackId });

    // Validate input
    if (!hackId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide hackId',
      });
    }

    // Verify hack exists
    const hackExists = await pool.query(
      'SELECT id, title FROM hacks WHERE id = $1',
      [hackId]
    );

    console.log('🔍 Hack lookup result:', hackExists.rows);

    if (hackExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hack not found',
      });
    }

    // Check if already saved
    const existingSave = await pool.query(
      `SELECT id FROM saved_hacks
       WHERE user_id = $1 AND hack_id = $2`,
      [userId, hackId]
    );

    if (existingSave.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hack already saved',
      });
    }

    // Save hack
    const result = await pool.query(
      `INSERT INTO saved_hacks (user_id, hack_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, hackId]
    );

    console.log('✅ Hack saved:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Hack saved successfully',
      savedHack: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Save hack error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error saving hack',
      error: error.message,
    });
  }
};

// @desc Remove saved hack
// @route DELETE /api/hacks/:hackId/remove
// @access Private
exports.removeHack = async (req, res) => {
  try {
    const { hackId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM saved_hacks
       WHERE user_id = $1 AND hack_id = $2
       RETURNING id`,
      [userId, hackId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saved hack not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hack removed from saved',
    });
  } catch (error) {
    console.error('Remove hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing hack',
      error: error.message,
    });
  }
};

// @desc Get user's saved hacks
// @route GET /api/hacks/saved
// @access Private
exports.getSavedHacks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { moduleId, category } = req.query;

    let query = `
      SELECT sh.id as saved_id, h.id, h.module_id, h.title, h.description, h.category, h.difficulty, sh.saved_at
      FROM saved_hacks sh
      JOIN hacks h ON sh.hack_id = h.id
      WHERE sh.user_id = $1
    `;
    const params = [userId];

    if (moduleId) {
      query += ` AND h.module_id = $${params.length + 1}`;
      params.push(parseInt(moduleId));
    }

    if (category) {
      query += ` AND h.category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY sh.saved_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      savedHacks: result.rows,
    });
  } catch (error) {
    console.error('Get saved hacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved hacks',
      error: error.message,
    });
  }
};

// @desc Check if hack is saved
// @route GET /api/hacks/:hackId/is-saved
// @access Private
exports.isHackSaved = async (req, res) => {
  try {
    const { hackId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id FROM saved_hacks
       WHERE user_id = $1 AND hack_id = $2`,
      [userId, hackId]
    );

    res.status(200).json({
      success: true,
      isSaved: result.rows.length > 0,
    });
  } catch (error) {
    console.error('Check saved hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking saved status',
      error: error.message,
    });
  }
};

// @desc Get hacks by module
// @route GET /api/hacks/module/:moduleId
// @access Public
exports.getHacksByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleIdNum = parseInt(moduleId);

    // Get user's subscription tier (default to 'free' if not authenticated)
    let userTier = 'free';
    if (req.user) {
      userTier = req.user.subscription_tier || 'free';
    }

    // Check if user has access to this module
    if (!canAccessModule(userTier, moduleIdNum)) {
      const tierConfig = getUserTierConfig(userTier);
      return res.status(403).json({
        success: false,
        message: 'This module is locked',
        locked: true,
        currentTier: userTier,
        currentTierName: tierConfig.name,
        requiredUpgrade: moduleIdNum > 10 ? 'elite' : 'smart_traveler',
        upgradeMessage: `Upgrade to ${moduleIdNum > 10 ? 'Elite' : 'Smart Traveler'} to access this module`
      });
    }

    // Fetch hacks from database
    const result = await pool.query(
      'SELECT id, module_id, title, description, category, difficulty, is_active, created_at FROM hacks WHERE module_id = $1 AND is_active = true ORDER BY created_at DESC',
      [moduleIdNum]
    );

    const hacks = result.rows;

    res.status(200).json({
      success: true,
      moduleId: moduleIdNum,
      hackCount: hacks.length,
      hacks: hacks
    });
  } catch (error) {
    console.error('Get hacks by module error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hacks',
      error: error.message,
    });
  }
};

// @desc Get all modules
// @route GET /api/hacks/modules
// @access Public
exports.getAllModules = async (req, res) => {
  try {
    // Get user's subscription tier (default to 'free' if not authenticated)
    let userTier = 'free';
    if (req.user) {
      userTier = req.user.subscription_tier || 'free';
    }

    const modules = [
      { id: 1, title: 'Flight Hacks', icon: '✈️', hackCount: 6 },
      { id: 2, title: 'Credit Cards', icon: '💳', hackCount: 7 },
      { id: 3, title: 'Hotel Hacks', icon: '🏨', hackCount: 7 },
      { id: 4, title: 'Timing Intelligence', icon: '⏰', hackCount: 6 },
      { id: 5, title: 'Airport & Transit', icon: '✈️', hackCount: 6 },
      { id: 6, title: 'Destinations', icon: '🌍', hackCount: 4 },
      { id: 7, title: 'Car Rentals', icon: '🚗', hackCount: 4 },
      { id: 8, title: 'Community', icon: '👥', hackCount: 7 },
      { id: 9, title: 'Travel Money', icon: '💰', hackCount: 5 },
      { id: 10, title: 'Travel Insurance', icon: '🛡️', hackCount: 5 },
      { id: 11, title: 'Visa & Immigration', icon: '🛂', hackCount: 5 },
      { id: 12, title: 'Accommodations', icon: '🏠', hackCount: 5 },
      { id: 13, title: 'Ground Transport', icon: '🚆', hackCount: 5 },
      { id: 14, title: 'Travel Bookings', icon: '🔍', hackCount: 5 },
      { id: 15, title: 'Food & Dining', icon: '🍽️', hackCount: 5 },
      { id: 16, title: 'Shopping & VAT', icon: '🛍️', hackCount: 5 },
    ];

    // Add access status to each module based on user tier
    const modulesWithAccess = modules.map(module => {
      const hasAccess = canAccessModule(userTier, module.id);
      return {
        ...module,
        accessible: hasAccess,
        locked: !hasAccess,
        message: hasAccess ? 'You have access' : 'Upgrade to unlock'
      };
    });

    const tierConfig = getUserTierConfig(userTier);

    res.status(200).json({
      success: true,
      userTier: userTier,
      userTierName: tierConfig.name,
      totalModules: modules.length,
      accessibleModules: modulesWithAccess.filter(m => m.accessible).length,
      totalHacks: modules.reduce((sum, m) => sum + m.hackCount, 0),
      modules: modulesWithAccess,
    });
  } catch (error) {
    console.error('Get all modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching modules',
      error: error.message,
    });
  }
};

// @desc Get all hacks (admin only)
// @route GET /api/hacks
// @access Private
exports.getHacks = async (req, res) => {
  try {
    // Since hacks are stored as static data in the modules, we'll need to fetch them from a hypothetical hacks table
    // For now, return a message that hacks are managed through modules
    res.status(200).json({
      success: true,
      message: 'Hacks management - hacks are managed per module',
      modules: [
        { id: 1, title: 'Flight Hacks' },
        { id: 2, title: 'Credit Cards' },
        { id: 3, title: 'Hotel Hacks' },
        { id: 4, title: 'Timing Intelligence' },
        { id: 5, title: 'Airport & Transit' },
        { id: 6, title: 'Destinations' },
        { id: 7, title: 'Car Rentals' },
        { id: 8, title: 'Community' },
        { id: 9, title: 'Travel Money' },
        { id: 10, title: 'Travel Insurance' },
        { id: 11, title: 'Visa & Immigration' },
        { id: 12, title: 'Accommodations' },
        { id: 13, title: 'Ground Transport' },
        { id: 14, title: 'Travel Bookings' },
        { id: 15, title: 'Food & Dining' },
        { id: 16, title: 'Shopping & VAT' },
      ]
    });
  } catch (error) {
    console.error('Get hacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hacks',
      error: error.message
    });
  }
};

// @desc Create hack (admin only)
// @route POST /api/hacks
// @access Private
exports.createHack = async (req, res) => {
  try {
    const { module_id, title, category, description, difficulty } = req.body;

    if (!module_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Module ID and title are required'
      });
    }

    // Validate moduleId is 1-16
    if (module_id < 1 || module_id > 16) {
      return res.status(400).json({
        success: false,
        message: 'Module ID must be between 1 and 16'
      });
    }

    // Insert hack into database
    const result = await pool.query(
      `INSERT INTO hacks (module_id, title, description, category, difficulty)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [module_id, title, description || '', category || 'General', difficulty || 'medium']
    );

    res.status(201).json({
      success: true,
      message: 'Hack created successfully',
      hack: result.rows[0]
    });
  } catch (error) {
    console.error('Create hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating hack',
      error: error.message
    });
  }
};

// @desc Update hack (admin only)
// @route PUT /api/admin/hacks/:id
// @access Private (Admin)
exports.updateHack = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, difficulty, is_active } = req.body;

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (difficulty !== undefined) {
      updates.push(`difficulty = $${paramCount++}`);
      values.push(difficulty);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    if (updates.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const result = await pool.query(
      `UPDATE hacks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hack not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hack updated successfully',
      hack: result.rows[0]
    });
  } catch (error) {
    console.error('Update hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hack',
      error: error.message
    });
  }
};

// @desc Delete hack (admin only)
// @route DELETE /api/admin/hacks/:id
// @access Private (Admin)
exports.deleteHack = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM hacks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hack not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hack deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('Delete hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting hack',
      error: error.message
    });
  }
};

// @desc List all hacks (admin only)
// @route GET /api/admin/hacks
// @access Private (Admin)
exports.listHacks = async (req, res) => {
  try {
    const { moduleId, isActive } = req.query;

    let query = 'SELECT * FROM hacks WHERE 1=1';
    const params = [];

    if (moduleId) {
      query += ` AND module_id = $${params.length + 1}`;
      params.push(parseInt(moduleId));
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(isActive === 'true');
    }

    query += ' ORDER BY module_id ASC, created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      hacks: result.rows
    });
  } catch (error) {
    console.error('List hacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing hacks',
      error: error.message
    });
  }
};
