const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const emailSequenceService = require('../services/emailSequenceService');

// @desc Register user
// @route POST /api/auth/signup
// @access Public
exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, subscription_tier, created_at`,
      [email.toLowerCase(), hashedPassword, firstName || '', lastName || '', 'free']
    );

    const user = newUser.rows[0];

    // Create JWT token
    const token = generateToken(user.id);

    // Create user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)`,
      [user.id]
    );

    // Send welcome email and initialize 10-day email sequence (non-blocking)
    console.log(`🎉 User registered: ${user.email}`);
    console.log(`📨 Sending welcome email to ${user.email}...`);

    emailService.sendWelcomeEmail({
      email: user.email,
      firstName: user.first_name
    }).catch(err => {
      console.error('Failed to send welcome email:', err.message || err);
    });

    console.log(`📬 Initializing email sequence for ${user.email}...`);
    emailSequenceService.initializeEmailSequence(
      user.id,
      user.email,
      user.first_name
    ).catch(err => {
      console.error('Failed to initialize email sequence:', err.message || err);
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc Create user (admin only)
// @route POST /api/auth/users
// @access Private
exports.createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, subscriptionTier = 'free' } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create a temporary password (user can change it later)
    const tempPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, subscription_tier, created_at`,
      [email.toLowerCase(), hashedPassword, firstName || '', lastName || '', subscriptionTier]
    );

    const user = newUser.rows[0];

    // Create user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)`,
      [user.id]
    );

    // Initialize email sequence and send welcome email (non-blocking)
    console.log(`📬 Initializing email sequence for admin-created user ${user.email}...`);
    emailSequenceService.initializeEmailSequence(
      user.id,
      user.email,
      user.first_name
    ).catch(err => {
      console.error('Failed to initialize email sequence:', err.message || err);
    });

    // Also send welcome email
    emailService.sendWelcomeEmail({
      email: user.email,
      firstName: user.first_name
    }).catch(err => {
      console.error('Failed to send welcome email:', err.message || err);
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @desc Login user
// @route POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
// @access Private
exports.getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, subscription_tier, subscription_status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc Update user profile
// @route PUT /api/auth/update-profile
// @access Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const updatedUser = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, first_name, last_name, subscription_tier`,
      [firstName, lastName, req.user.id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = updatedUser.rows[0];

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc Change password
// @route POST /api/auth/change-password
// @access Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// @desc Get all users (admin only)
// @route GET /api/auth/users
// @access Private
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, subscription_tier, created_at, last_login
       FROM users
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at,
        last_login: user.last_login
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc Get user count (admin only)
// @route GET /api/auth/users/count
// @access Private
exports.getUserCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(result.rows[0].count);

    res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Get user count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user count',
      error: error.message
    });
  }
};

// @desc Update user (admin only)
// @route PUT /api/auth/users/:id
// @access Private
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, subscriptionTier } = req.body;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           subscription_tier = COALESCE($3, subscription_tier),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, subscription_tier, created_at`,
      [firstName, lastName, subscriptionTier, id]
    );

    const user = updatedUser.rows[0];

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc Delete user (admin only)
// @route DELETE /api/auth/users/:id
// @access Private
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user (cascade deletes related data due to FK constraints)
    const deletedUser = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, first_name, last_name',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      user: {
        id: deletedUser.rows[0].id,
        email: deletedUser.rows[0].email,
        firstName: deletedUser.rows[0].first_name,
        lastName: deletedUser.rows[0].last_name
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};
