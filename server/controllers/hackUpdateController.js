/**
 * Hack Update Controller
 * Handles admin endpoints for viewing hack update logs and manually triggering updates
 */

const hackUpdateService = require('../services/hackUpdateService');

/**
 * Get hack update logs
 * @route GET /api/admin/hack-updates
 * @access Private (Admin)
 */
exports.getUpdateLogs = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const logs = await hackUpdateService.getUpdateLogs(limit);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs: logs
    });
  } catch (error) {
    console.error('Get hack update logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hack update logs',
      error: error.message
    });
  }
};

/**
 * Manually trigger hack update cycle
 * @route POST /api/admin/hack-updates/trigger
 * @access Private (Admin)
 */
exports.triggerUpdateCycle = async (req, res) => {
  try {
    // Run the update in the background (non-blocking)
    const updatePromise = hackUpdateService.runHackUpdateCycle();

    // Send response immediately
    res.status(202).json({
      success: true,
      message: 'Hack update cycle triggered. Check logs for progress.',
      note: 'This process runs asynchronously. It may take several minutes to complete.'
    });

    // Log the result when it completes (fire and forget)
    updatePromise.catch(err => {
      console.error('Hack update cycle failed:', err);
    });
  } catch (error) {
    console.error('Trigger hack update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering hack update',
      error: error.message
    });
  }
};

/**
 * Get hack statistics
 * @route GET /api/admin/hack-stats
 * @access Private (Admin)
 */
exports.getHackStats = async (req, res) => {
  try {
    const pool = require('../config/database');

    const totalResult = await pool.query('SELECT COUNT(*) as count FROM hacks WHERE is_active = true');
    const moduleResult = await pool.query(
      'SELECT module_id, COUNT(*) as count FROM hacks WHERE is_active = true GROUP BY module_id ORDER BY module_id'
    );
    const recentResult = await pool.query(
      'SELECT DATE(created_at) as date, COUNT(*) as count FROM hacks WHERE is_active = true GROUP BY DATE(created_at) ORDER BY DATE(created_at) DESC LIMIT 7'
    );

    res.status(200).json({
      success: true,
      stats: {
        total_hacks: parseInt(totalResult.rows[0].count),
        hacks_by_module: moduleResult.rows,
        recent_additions: recentResult.rows
      }
    });
  } catch (error) {
    console.error('Get hack stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hack statistics',
      error: error.message
    });
  }
};
