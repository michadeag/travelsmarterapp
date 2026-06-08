const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  signup,
  login,
  createUser,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserCount,
  updateUser,
  deleteUser,
} = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Admin routes (require authentication)
router.get('/users', protect, getAllUsers);
router.get('/users/count', protect, getUserCount);
router.post('/users', protect, createUser);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

// Private routes
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

module.exports = router;
