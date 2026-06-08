const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const emailTemplateController = require('../controllers/emailTemplateController');

// All routes require authentication and admin access
// In a full app, add an isAdmin middleware check

// Sequence routes
router.get('/sequences', protect, emailTemplateController.getSequences);
router.get('/sequences/:sequenceId', protect, emailTemplateController.getSequenceWithTemplates);
router.post('/sequences', protect, emailTemplateController.createSequence);
router.put('/sequences/:sequenceId', protect, emailTemplateController.updateSequence);

// Template routes
router.get('/templates', protect, emailTemplateController.getTemplates);
router.get('/templates/:templateId', protect, emailTemplateController.getTemplateById);
router.post('/templates', protect, emailTemplateController.createTemplate);
router.put('/templates/:templateId', protect, emailTemplateController.updateTemplate);
router.delete('/templates/:templateId', protect, emailTemplateController.deleteTemplate);

// Scheduled emails view
router.get('/scheduled', protect, emailTemplateController.getScheduledEmails);

module.exports = router;
