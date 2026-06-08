const pool = require('../config/database');

// @desc Get total count of deals
// @route GET /api/deals/count
// @access Public
exports.getDealCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM deals WHERE is_active = true');
    const count = parseInt(result.rows[0].count);

    res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Get deal count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal count',
      error: error.message
    });
  }
};

// @desc Get all active deals
// @route GET /api/deals
// @access Public
exports.getDeals = async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT id, title, description, category, deal_type, value_amount, value_currency,
             image_url, verified, verification_count, upvote_count, expires_at, created_at
      FROM deals
      WHERE is_active = true
    `;
    const params = [];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      deals: result.rows,
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deals',
      error: error.message,
    });
  }
};

// @desc Get single deal
// @route GET /api/deals/:id
// @access Public
exports.getDeal = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM deals WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    res.status(200).json({
      success: true,
      deal: result.rows[0],
    });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal',
      error: error.message,
    });
  }
};

// @desc Create deal (admin/community)
// @route POST /api/deals
// @access Private
exports.createDeal = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      dealType,
      valueAmount,
      valueCurrency = 'EUR',
      imageUrl,
      source,
      expiresAt,
    } = req.body;

    // Validate required fields
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and category',
      });
    }

    const result = await pool.query(
      `INSERT INTO deals (title, description, category, deal_type, value_amount, value_currency, image_url, source, expires_at, created_by, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [title, description, category, dealType, valueAmount, valueCurrency, imageUrl, source, expiresAt, req.user.id, false]
    );

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      deal: result.rows[0],
    });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating deal',
      error: error.message,
    });
  }
};

// @desc Upvote deal
// @route POST /api/deals/:id/upvote
// @access Private
exports.upvoteDeal = async (req, res) => {
  try {
    const dealId = req.params.id;
    const userId = req.user.id;

    // Check if deal exists
    const dealResult = await pool.query(
      'SELECT id FROM deals WHERE id = $1',
      [dealId]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    // Check if user already upvoted
    const existingVote = await pool.query(
      `SELECT id FROM deal_interactions
       WHERE user_id = $1 AND deal_id = $2 AND interaction_type = 'upvote'`,
      [userId, dealId]
    );

    if (existingVote.rows.length > 0) {
      // Remove upvote
      await pool.query(
        `DELETE FROM deal_interactions
         WHERE user_id = $1 AND deal_id = $2 AND interaction_type = 'upvote'`,
        [userId, dealId]
      );

      await pool.query(
        'UPDATE deals SET upvote_count = upvote_count - 1 WHERE id = $1',
        [dealId]
      );

      return res.status(200).json({
        success: true,
        message: 'Upvote removed',
        action: 'removed',
      });
    }

    // Add upvote
    await pool.query(
      `INSERT INTO deal_interactions (user_id, deal_id, interaction_type)
       VALUES ($1, $2, 'upvote')`,
      [userId, dealId]
    );

    await pool.query(
      'UPDATE deals SET upvote_count = upvote_count + 1 WHERE id = $1',
      [dealId]
    );

    res.status(200).json({
      success: true,
      message: 'Deal upvoted successfully',
      action: 'added',
    });
  } catch (error) {
    console.error('Upvote deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error upvoting deal',
      error: error.message,
    });
  }
};

// @desc Save deal
// @route POST /api/deals/:id/save
// @access Private
exports.saveDeal = async (req, res) => {
  try {
    const dealId = req.params.id;
    const userId = req.user.id;

    // Get deal info
    const dealResult = await pool.query(
      'SELECT title, category FROM deals WHERE id = $1',
      [dealId]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    const deal = dealResult.rows[0];

    // Check if already saved
    const existingSave = await pool.query(
      `SELECT id FROM deal_interactions
       WHERE user_id = $1 AND deal_id = $2 AND interaction_type = 'save'`,
      [userId, dealId]
    );

    if (existingSave.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Deal already saved',
      });
    }

    // Save deal
    await pool.query(
      `INSERT INTO deal_interactions (user_id, deal_id, interaction_type)
       VALUES ($1, $2, 'save')`,
      [userId, dealId]
    );

    res.status(200).json({
      success: true,
      message: 'Deal saved successfully',
    });
  } catch (error) {
    console.error('Save deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving deal',
      error: error.message,
    });
  }
};

// @desc Get user's saved deals
// @route GET /api/users/saved-deals
// @access Private
exports.getSavedDeals = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT d.* FROM deals d
       INNER JOIN deal_interactions di ON d.id = di.deal_id
       WHERE di.user_id = $1 AND di.interaction_type = 'save' AND d.is_active = true
       ORDER BY di.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      deals: result.rows,
    });
  } catch (error) {
    console.error('Get saved deals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved deals',
      error: error.message,
    });
  }
};

// @desc Get deals by category with stats
// @route GET /api/deals/stats/by-category
// @access Public
exports.getDealsByCategory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count, SUM(upvote_count) as total_upvotes
       FROM deals
       WHERE is_active = true
       GROUP BY category
       ORDER BY count DESC`
    );

    res.status(200).json({
      success: true,
      categories: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};

// @desc Get trending deals (most upvoted recently)
// @route GET /api/deals/trending
// @access Public
exports.getTrendingDeals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM deals
       WHERE is_active = true
       AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY upvote_count DESC
       LIMIT 10`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      deals: result.rows,
    });
  } catch (error) {
    console.error('Get trending deals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending deals',
      error: error.message,
    });
  }
};

// @desc Search deals
// @route GET /api/deals/search
// @access Public
exports.searchDeals = async (req, res) => {
  try {
    const { q, category } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    let query = `
      SELECT * FROM deals
      WHERE is_active = true
      AND (title ILIKE $1 OR description ILIKE $1)
    `;
    const params = [`%${q}%`];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY upvote_count DESC LIMIT 20`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      deals: result.rows,
    });
  } catch (error) {
    console.error('Search deals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching deals',
      error: error.message,
    });
  }
};

// @desc Update deal (admin only)
// @route PUT /api/deals/:id
// @access Private
exports.updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, deal_type, value_amount, image_url, verified, is_active } = req.body;

    // Check if deal exists
    const existing = await pool.query(
      'SELECT * FROM deals WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    const result = await pool.query(
      `UPDATE deals
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           deal_type = COALESCE($4, deal_type),
           value_amount = COALESCE($5, value_amount),
           image_url = COALESCE($6, image_url),
           verified = COALESCE($7, verified),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [title, description, category, deal_type, value_amount, image_url, verified, is_active, id]
    );

    res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      deal: result.rows[0]
    });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating deal',
      error: error.message
    });
  }
};

// @desc Delete deal (admin only)
// @route DELETE /api/deals/:id
// @access Private
exports.deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if deal exists
    const existing = await pool.query(
      'SELECT * FROM deals WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Delete deal
    const result = await pool.query(
      'DELETE FROM deals WHERE id = $1 RETURNING *',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully',
      deal: result.rows[0]
    });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting deal',
      error: error.message
    });
  }
};
