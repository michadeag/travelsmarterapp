const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createCheckoutSession,
  handleWebhook,
  getCurrentSubscription,
  cancelSubscription,
  getPricing,
  getSubscriptionStats,
  getSubscriptions,
  updateSubscription,
  deleteSubscription,
} = require('../controllers/subscriptionController');

// Public routes
router.get('/pricing', getPricing);

// Webhook route (should be handled specially - no body parsing)
router.post('/webhook', handleWebhook);

// Private routes - SPECIFIC routes BEFORE parameter routes
router.get('/stats', protect, getSubscriptionStats);
router.post('/checkout', protect, createCheckoutSession);
router.get('/current', protect, getCurrentSubscription);
router.post('/cancel', protect, cancelSubscription);

// Admin routes (require authentication)
router.get('/', protect, getSubscriptions);
router.put('/:id', protect, updateSubscription);
router.delete('/:id', protect, deleteSubscription);

module.exports = router;
