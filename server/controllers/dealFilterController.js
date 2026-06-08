/**
 * Deal Filter Controller
 * Manages custom deal filters for Elite users
 */

const pool = require('../config/database');

/**
 * Get user's deal filters
 * @route GET /api/user/deal-filters
 * @access Private
 */
exports.getUserFilters = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM user_deal_filters WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    // If no filters exist, return defaults
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        filters: {
          trip_type: 'all',
          min_savings_threshold: 100
        },
        message: 'Using default filters'
      });
    }

    const filter = result.rows[0];

    res.status(200).json({
      success: true,
      filters: {
        id: filter.id,
        trip_type: filter.trip_type,
        min_savings_threshold: filter.min_savings_threshold
      }
    });
  } catch (error) {
    console.error('Get deal filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal filters',
      error: error.message
    });
  }
};

/**
 * Save or update user's deal filters
 * @route POST /api/user/deal-filters
 * @access Private
 */
exports.saveUserFilters = async (req, res) => {
  try {
    const userId = req.user.id;
    const { trip_type, min_savings_threshold } = req.body;

    // Validate input
    const validTripTypes = ['all', 'flights', 'hotels'];
    if (trip_type && !validTripTypes.includes(trip_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip_type. Must be: all, flights, or hotels'
      });
    }

    if (min_savings_threshold && (typeof min_savings_threshold !== 'number' || min_savings_threshold < 0)) {
      return res.status(400).json({
        success: false,
        message: 'min_savings_threshold must be a positive number'
      });
    }

    // Check if filter exists
    const existing = await pool.query(
      'SELECT id FROM user_deal_filters WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    let result;

    if (existing.rows.length > 0) {
      // Update existing filter
      result = await pool.query(
        `UPDATE user_deal_filters
         SET trip_type = COALESCE($1, trip_type),
             min_savings_threshold = COALESCE($2, min_savings_threshold),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND is_active = true
         RETURNING *`,
        [trip_type || null, min_savings_threshold || null, userId]
      );
    } else {
      // Create new filter with defaults
      result = await pool.query(
        `INSERT INTO user_deal_filters (user_id, trip_type, min_savings_threshold)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, trip_type || 'all', min_savings_threshold || 100]
      );
    }

    const filter = result.rows[0];

    res.status(200).json({
      success: true,
      message: 'Deal filters saved successfully',
      filters: {
        id: filter.id,
        trip_type: filter.trip_type,
        min_savings_threshold: filter.min_savings_threshold
      }
    });
  } catch (error) {
    console.error('Save deal filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving deal filters',
      error: error.message
    });
  }
};

/**
 * Check if user passes deal filters
 * Used internally to filter alerts before sending
 */
exports.passesUserFilters = async (userId, dealData) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_deal_filters WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    // If no filters, allow all deals
    if (result.rows.length === 0) {
      return true;
    }

    const filters = result.rows[0];

    // Check trip type filter
    if (filters.trip_type !== 'all') {
      const dealType = dealData.dealType || dealData.type || 'other';
      if (filters.trip_type === 'flights' && dealType !== 'flight') return false;
      if (filters.trip_type === 'hotels' && dealType !== 'hotel') return false;
    }

    // Check minimum savings threshold
    if (filters.min_savings_threshold) {
      const savings = dealData.estimatedSavings || dealData.savings || 0;
      if (savings < filters.min_savings_threshold) return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking user filters:', error);
    // On error, allow the deal to go through
    return true;
  }
};
