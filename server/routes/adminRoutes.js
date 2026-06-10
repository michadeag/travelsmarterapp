const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');

/**
 * Admin Settings Routes
 * All routes are public for now (add authentication middleware if needed)
 */

// Health check for admin routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin routes are working'
  });
});

// Debug endpoint - check all settings in database
router.get('/debug/settings', async (req, res) => {
  try {
    const pool = require('../config/database');
    const result = await pool.query('SELECT key, value, type, description FROM settings ORDER BY key');

    res.status(200).json({
      success: true,
      message: `Found ${result.rows.length} settings in database`,
      settings: result.rows.map(row => ({
        key: row.key,
        value: row.value ? `${row.value.substring(0, 20)}...` : '(empty)',
        type: row.type,
        description: row.description
      })),
      allSettings: result.rows // Full data for debugging
    });
  } catch (error) {
    console.error('Debug settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all settings
router.get('/settings', SettingsController.getAllSettings);

// Get single setting
router.get('/settings/:key', SettingsController.getSetting);

// Update single setting
router.post('/settings', SettingsController.updateSetting);

// Update multiple settings at once
router.post('/settings/batch/update', SettingsController.updateMultipleSettings);

// Delete setting
router.delete('/settings/:key', SettingsController.deleteSetting);

// Get recent activities for dashboard
router.get('/activities', async (req, res) => {
  try {
    const pool = require('../config/database');
    const { limit = 10 } = req.query;

    // Get recent user signups and activities
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.first_name,
        u.created_at,
        'signup' as activity_type
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT $1`,
      [parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      activities: result.rows.map(row => ({
        id: row.id,
        user: row.first_name || row.email,
        email: row.email,
        activity: 'New user signup',
        timestamp: row.created_at
      }))
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
});

// Analytics summary — user metrics + all social media platform stats
router.get('/analytics/summary', async (req, res) => {
  try {
    const pool = require('../config/database');

    // User stats
    const usersResult = await pool.query(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS signups_this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
                           AND created_at <  date_trunc('month', NOW())) AS signups_last_month,
        COUNT(*) FILTER (WHERE subscription_tier IN ('smart_traveler','elite')) AS paid_users,
        COUNT(*) FILTER (WHERE subscription_tier = 'elite') AS elite_users
      FROM users
    `);
    const u = usersResult.rows[0];

    // Social media stats per platform
    const platforms = [
      { key: 'reddit',    table: 'reddit_posts',    dateCol: 'posted_at' },
      { key: 'linkedin',  table: 'linkedin_posts',  dateCol: 'posted_at' },
      { key: 'pinterest', table: 'pinterest_posts', dateCol: 'posted_at' },
      { key: 'instagram', table: 'instagram_posts', dateCol: 'posted_at' },
      { key: 'medium',    table: 'medium_posts',    dateCol: 'posted_at' },
      { key: 'blogger',   table: 'blogger_posts',   dateCol: 'posted_at' },
      { key: 'quora',     table: 'quora_answers',   dateCol: 'posted_at' },
    ];

    const socialStats = {};
    let totalPosts = 0;
    let totalCTA = 0;

    for (const p of platforms) {
      try {
        const r = await pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE ${p.dateCol} >= date_trunc('month', NOW())) AS this_month,
            COUNT(*) FILTER (WHERE included_cta = true) AS with_cta
          FROM ${p.table}
        `);
        const row = r.rows[0];
        socialStats[p.key] = {
          total: parseInt(row.total) || 0,
          thisMonth: parseInt(row.this_month) || 0,
          withCTA: parseInt(row.with_cta) || 0
        };
        totalPosts += parseInt(row.total) || 0;
        totalCTA += parseInt(row.with_cta) || 0;
      } catch {
        socialStats[p.key] = { total: 0, thisMonth: 0, withCTA: 0 };
      }
    }

    const signupsThisMonth = parseInt(u.signups_this_month) || 0;
    const signupsLastMonth = parseInt(u.signups_last_month) || 0;
    const signupChange = signupsLastMonth > 0
      ? Math.round(((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100)
      : null;

    res.json({
      success: true,
      users: {
        total: parseInt(u.total_users) || 0,
        signupsThisMonth,
        signupsLastMonth,
        signupChange,
        paid: parseInt(u.paid_users) || 0,
        elite: parseInt(u.elite_users) || 0
      },
      social: {
        totalPosts,
        totalCTA,
        platforms: socialStats
      }
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public endpoint to get Stripe publishable key (for checkout page)
router.get('/config/stripe-key', async (req, res) => {
  try {
    const pool = require('../config/database');

    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['stripe_publishable_key']
    );

    console.log('Stripe key query result:', result.rows);

    if (!result.rows || result.rows.length === 0) {
      console.warn('Stripe key not found in database');
      return res.status(200).json({
        success: false,
        stripepublishableKey: null,
        error: 'Stripe key not configured in database'
      });
    }

    const stripeKey = result.rows[0].value;

    if (!stripeKey) {
      console.warn('Stripe key value is empty');
      return res.status(200).json({
        success: false,
        stripepublishableKey: null,
        error: 'Stripe key is empty'
      });
    }

    res.status(200).json({
      success: true,
      stripepublishableKey: stripeKey
    });
  } catch (error) {
    console.error('Get Stripe key error:', error);
    res.status(200).json({
      success: false,
      stripepublishableKey: null,
      error: 'Failed to retrieve Stripe key: ' + error.message
    });
  }
});

// Public endpoint to get SendGrid key
router.get('/config/sendgrid-key', async (req, res) => {
  try {
    const result = await require('../config/database').query(
      'SELECT value FROM settings WHERE key = $1',
      ['sendgrid_api_key']
    );

    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.status(404).json({
        success: false,
        error: 'SendGrid key not configured'
      });
    }

    res.status(200).json({
      success: true,
      sendgridApiKey: result.rows[0].value
    });
  } catch (error) {
    console.error('Get SendGrid key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve SendGrid configuration'
    });
  }
});

module.exports = router;
