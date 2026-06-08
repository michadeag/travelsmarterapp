const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// @desc Get all promo codes
// @route GET /api/promos
// @access Public (Admin)
exports.getAllPromos = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, discount_percent, discount_amount, description,
              is_active, max_uses, current_uses, valid_from, valid_until,
              created_at, updated_at
       FROM promo_codes
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      message: 'Promo codes retrieved successfully'
    });
  } catch (error) {
    console.error('Get promos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promo codes',
      error: error.message
    });
  }
};

// @desc Get single promo code
// @route GET /api/promos/:code
// @access Public
exports.getPromoByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT id, code, discount_percent, discount_amount, description,
              is_active, max_uses, current_uses, valid_from, valid_until,
              created_at, updated_at
       FROM promo_codes
       WHERE code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promo code',
      error: error.message
    });
  }
};

// @desc Create promo code
// @route POST /api/promos
// @access Public (Admin)
exports.createPromo = async (req, res) => {
  try {
    const {
      code,
      discount_percent,
      discount_amount,
      description,
      is_active = true,
      max_uses,
      valid_from,
      valid_until
    } = req.body;

    // Validation
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    if (!discount_percent && !discount_amount) {
      return res.status(400).json({
        success: false,
        message: 'Either discount_percent or discount_amount must be provided'
      });
    }

    // Check if code already exists
    const existingPromo = await pool.query(
      'SELECT id FROM promo_codes WHERE code = $1',
      [code.toUpperCase()]
    );

    if (existingPromo.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }

    const promoId = uuidv4();
    const result = await pool.query(
      `INSERT INTO promo_codes (
        id, code, discount_percent, discount_amount, description,
        is_active, max_uses, current_uses, valid_from, valid_until, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        promoId,
        code.toUpperCase(),
        discount_percent || null,
        discount_amount || null,
        description || null,
        is_active,
        max_uses || null,
        0,
        valid_from || null,
        valid_until || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Promo code created successfully'
    });
  } catch (error) {
    console.error('Create promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating promo code',
      error: error.message
    });
  }
};

// @desc Update promo code
// @route PUT /api/promos/:id
// @access Public (Admin)
exports.updatePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_percent,
      discount_amount,
      description,
      is_active,
      max_uses,
      valid_from,
      valid_until
    } = req.body;

    // Check if promo exists
    const existing = await pool.query(
      'SELECT * FROM promo_codes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (code !== undefined) {
      updates.push(`code = $${paramCount++}`);
      values.push(code.toUpperCase());
    }
    if (discount_percent !== undefined) {
      updates.push(`discount_percent = $${paramCount++}`);
      values.push(discount_percent);
    }
    if (discount_amount !== undefined) {
      updates.push(`discount_amount = $${paramCount++}`);
      values.push(discount_amount);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (max_uses !== undefined) {
      updates.push(`max_uses = $${paramCount++}`);
      values.push(max_uses);
    }
    if (valid_from !== undefined) {
      updates.push(`valid_from = $${paramCount++}`);
      values.push(valid_from);
    }
    if (valid_until !== undefined) {
      updates.push(`valid_until = $${paramCount++}`);
      values.push(valid_until);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE promo_codes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Promo code updated successfully'
    });
  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating promo code',
      error: error.message
    });
  }
};

// @desc Delete promo code
// @route DELETE /api/promos/:id
// @access Public (Admin)
exports.deletePromo = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM promo_codes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promo code deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting promo code',
      error: error.message
    });
  }
};

// @desc Validate promo code
// @route GET /api/promos/:code/validate
// @access Public
exports.validatePromo = async (req, res) => {
  try {
    const { code } = req.params;
    const now = new Date();

    const result = await pool.query(
      `SELECT id, code, discount_percent, discount_amount, max_uses, current_uses,
              valid_from, valid_until, is_active
       FROM promo_codes
       WHERE code = $1 AND is_active = true`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found or inactive'
      });
    }

    const promo = result.rows[0];

    // Check if code has expired
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return res.status(400).json({
        success: false,
        message: 'Promo code has expired'
      });
    }

    // Check if code hasn't started yet
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is not yet valid'
      });
    }

    // Check if code has reached max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'Promo code has reached maximum uses'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        code: promo.code,
        discount_percent: promo.discount_percent,
        discount_amount: promo.discount_amount,
        remaining_uses: promo.max_uses ? promo.max_uses - promo.current_uses : null
      },
      message: 'Promo code is valid'
    });
  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating promo code',
      error: error.message
    });
  }
};
