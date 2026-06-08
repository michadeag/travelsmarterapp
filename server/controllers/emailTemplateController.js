const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// @desc Get all email templates (across all sequences)
// @route GET /api/email-templates/templates
// @access Private (Admin)
exports.getTemplates = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT et.id, et.sequence_id, et.day, et.subject, et.is_active,
              es.name as sequence_name, et.created_at, et.updated_at
       FROM email_templates et
       LEFT JOIN email_sequences es ON et.sequence_id = es.id
       ORDER BY es.name, et.day ASC`
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error.message
    });
  }
};

// @desc Get single email template by ID
// @route GET /api/email-templates/templates/:templateId
// @access Private (Admin)
exports.getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;

    const result = await pool.query(
      `SELECT et.id, et.sequence_id, et.day, et.subject, et.html_content, et.content,
              et.is_active, es.name as sequence_name, et.created_at, et.updated_at
       FROM email_templates et
       LEFT JOIN email_sequences es ON et.sequence_id = es.id
       WHERE et.id = $1`,
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error.message
    });
  }
};

// @desc Get all email sequences
// @route GET /api/email-templates/sequences
// @access Private (Admin)
exports.getSequences = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active, trigger_event,
              (SELECT COUNT(*) FROM email_templates WHERE sequence_id = email_sequences.id) as template_count,
              created_at, updated_at
       FROM email_sequences
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get sequences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sequences',
      error: error.message
    });
  }
};

// @desc Get sequence with all templates
// @route GET /api/email-templates/sequences/:sequenceId
// @access Private (Admin)
exports.getSequenceWithTemplates = async (req, res) => {
  try {
    const { sequenceId } = req.params;

    // Get sequence
    const sequenceResult = await pool.query(
      `SELECT * FROM email_sequences WHERE id = $1`,
      [sequenceId]
    );

    if (sequenceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
    }

    // Get all templates for this sequence
    const templatesResult = await pool.query(
      `SELECT id, day, subject, html_content, is_active, created_at, updated_at
       FROM email_templates
       WHERE sequence_id = $1
       ORDER BY day ASC`,
      [sequenceId]
    );

    res.status(200).json({
      success: true,
      sequence: sequenceResult.rows[0],
      templates: templatesResult.rows
    });
  } catch (error) {
    console.error('Get sequence with templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sequence',
      error: error.message
    });
  }
};

// @desc Create email sequence
// @route POST /api/email-templates/sequences
// @access Private (Admin)
exports.createSequence = async (req, res) => {
  try {
    const { name, description, trigger_event = 'signup' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Sequence name is required'
      });
    }

    const result = await pool.query(
      `INSERT INTO email_sequences (id, name, description, trigger_event, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [uuidv4(), name, description || null, trigger_event]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Sequence created successfully'
    });
  } catch (error) {
    console.error('Create sequence error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sequence',
      error: error.message
    });
  }
};

// @desc Update email sequence
// @route PUT /api/email-templates/sequences/:sequenceId
// @access Private (Admin)
exports.updateSequence = async (req, res) => {
  try {
    const { sequenceId } = req.params;
    const { name, description, is_active } = req.body;

    const result = await pool.query(
      `UPDATE email_sequences
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, is_active, sequenceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Sequence updated successfully'
    });
  } catch (error) {
    console.error('Update sequence error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sequence',
      error: error.message
    });
  }
};

// @desc Create or update email template
// @route POST /api/email-templates/templates
// @access Private (Admin)
exports.createTemplate = async (req, res) => {
  try {
    const { sequence_id, day, subject, html_content } = req.body;

    if (!sequence_id || day === undefined || !subject || !html_content) {
      return res.status(400).json({
        success: false,
        message: 'sequence_id, day, subject, and html_content are required'
      });
    }

    // Check if template for this day already exists
    const existing = await pool.query(
      `SELECT id FROM email_templates WHERE sequence_id = $1 AND day = $2`,
      [sequence_id, day]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE email_templates
         SET subject = $1, html_content = $2, updated_at = CURRENT_TIMESTAMP
         WHERE sequence_id = $3 AND day = $4
         RETURNING *`,
        [subject, html_content, sequence_id, day]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO email_templates (id, sequence_id, day, subject, html_content, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [uuidv4(), sequence_id, day, subject, html_content]
      );
    }

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: existing.rows.length > 0 ? 'Template updated' : 'Template created'
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving template',
      error: error.message
    });
  }
};

// @desc Update email template
// @route PUT /api/email-templates/templates/:templateId
// @access Private (Admin)
exports.updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { subject, html_content, is_active } = req.body;

    const result = await pool.query(
      `UPDATE email_templates
       SET subject = COALESCE($1, subject),
           html_content = COALESCE($2, html_content),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [subject, html_content, is_active, templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
};

// @desc Delete email template
// @route DELETE /api/email-templates/templates/:templateId
// @access Private (Admin)
exports.deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const result = await pool.query(
      `DELETE FROM email_templates WHERE id = $1 RETURNING *`,
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
};

// @desc Get scheduled emails for admin view
// @route GET /api/email-templates/scheduled
// @access Private (Admin)
exports.getScheduledEmails = async (req, res) => {
  try {
    const { status, user_id } = req.query;

    let query = `
      SELECT se.id, se.user_id, u.email, se.template_id, et.day, et.subject,
             se.scheduled_at, se.sent_at, se.status, se.created_at
      FROM scheduled_emails se
      JOIN users u ON se.user_id = u.id
      JOIN email_templates et ON se.template_id = et.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND se.status = $${params.length + 1}`;
      params.push(status);
    }

    if (user_id) {
      query += ` AND se.user_id = $${params.length + 1}`;
      params.push(user_id);
    }

    query += ` ORDER BY se.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get scheduled emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduled emails',
      error: error.message
    });
  }
};
