const express = require('express');
const router = express.Router();
const {
  getAllPromos,
  getPromoByCode,
  createPromo,
  updatePromo,
  deletePromo,
  validatePromo
} = require('../controllers/promoController');

// Routes with specific paths FIRST (before parameter routes)
router.get('/:code/validate', validatePromo);

// Public routes
router.get('/', getAllPromos);
router.get('/:code', getPromoByCode);

// Admin routes (create, update, delete)
// Specific paths before parameter routes
router.post('/', createPromo);
router.put('/:id', updatePromo);
router.delete('/:id', deletePromo);

module.exports = router;
