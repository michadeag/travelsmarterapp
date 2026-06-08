const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUserFilters,
  saveUserFilters,
} = require('../controllers/dealFilterController');

// All routes require authentication
router.get('/', protect, getUserFilters);
router.post('/', protect, saveUserFilters);

module.exports = router;
