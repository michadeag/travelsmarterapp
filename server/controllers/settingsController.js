const pool = require('../config/database');

class SettingsController {
  /**
   * Initialize settings table (if not exists)
   */
  static async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT 'text',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `;

    try {
      await pool.query(query);
      console.log('✅ Settings table initialized');
    } catch (error) {
      console.error('Settings table initialization error:', error);
    }
  }

  /**
   * Get all settings
   */
  static async getAllSettings(req, res) {
    try {
      const result = await pool.query('SELECT * FROM settings ORDER BY key');

      // Convert to object format for easier frontend use
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = {
          value: row.value,
          type: row.type,
          description: row.description
        };
      });

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Settings retrieved successfully'
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve settings'
      });
    }
  }

  /**
   * Get single setting by key
   */
  static async getSetting(req, res) {
    try {
      const { key } = req.params;
      const result = await pool.query(
        'SELECT * FROM settings WHERE key = $1',
        [key]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }

      res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Get setting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve setting'
      });
    }
  }

  /**
   * Update or create setting
   */
  static async updateSetting(req, res) {
    try {
      const { key, value, type = 'text', description = '' } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Key and value are required'
        });
      }

      const result = await pool.query(
        `INSERT INTO settings (key, value, type, description, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET
         value = $2,
         type = $3,
         description = $4,
         updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [key, value, type, description]
      );

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: `Setting "${key}" updated successfully`
      });
    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update setting'
      });
    }
  }

  /**
   * Update multiple settings at once
   */
  static async updateMultipleSettings(req, res) {
    try {
      const settings = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Settings object is required'
        });
      }

      const updatedSettings = [];

      for (const [key, value] of Object.entries(settings)) {
        const result = await pool.query(
          `INSERT INTO settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET
           value = $2,
           updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [key, value]
        );
        updatedSettings.push(result.rows[0]);
      }

      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: `${updatedSettings.length} settings updated successfully`
      });
    } catch (error) {
      console.error('Update multiple settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }

  /**
   * Delete setting
   */
  static async deleteSetting(req, res) {
    try {
      const { key } = req.params;

      const result = await pool.query(
        'DELETE FROM settings WHERE key = $1 RETURNING *',
        [key]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }

      res.status(200).json({
        success: true,
        message: `Setting "${key}" deleted successfully`
      });
    } catch (error) {
      console.error('Delete setting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete setting'
      });
    }
  }

  /**
   * Initialize default settings
   */
  static async initializeDefaults() {
    const defaults = [
      { key: 'stripe_publishable_key', value: '', type: 'text', description: 'Stripe publishable key (pk_...)' },
      { key: 'stripe_secret_key', value: '', type: 'password', description: 'Stripe secret key (sk_...)' },
      { key: 'stripe_webhook_secret', value: '', type: 'password', description: 'Stripe webhook secret' },
      { key: 'sendgrid_api_key', value: '', type: 'password', description: 'SendGrid API key' },
      { key: 'sender_email', value: 'michael@reesin.com', type: 'text', description: 'Default sender email' },
      { key: 'send_email_on_signup', value: 'true', type: 'boolean', description: 'Send welcome email on signup' },
      { key: 'send_email_on_subscription', value: 'true', type: 'boolean', description: 'Send confirmation email on subscription' },
      { key: 'send_daily_digest', value: 'false', type: 'boolean', description: 'Send daily deal digest' },
      { key: 'company_address', value: '', type: 'text', description: 'Company physical address' },
      { key: 'company_phone', value: '', type: 'text', description: 'Company phone number' },
      { key: 'support_email', value: 'michael@reesin.com', type: 'text', description: 'Support email' },
    ];

    for (const setting of defaults) {
      try {
        await pool.query(
          `INSERT INTO settings (key, value, type, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (key) DO NOTHING`,
          [setting.key, setting.value, setting.type, setting.description]
        );
      } catch (error) {
        console.error(`Error initializing setting ${setting.key}:`, error);
      }
    }

    console.log('✅ Default settings initialized');
  }
}

module.exports = SettingsController;
