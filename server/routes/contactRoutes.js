const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');

/**
 * Contact form routes
 */

// Test endpoint - verify routes are loading
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Contact routes are loading!'
  });
});

// POST /api/contact/send - Send contact form email
router.post('/send', sendContactEmail);

module.exports = router;
