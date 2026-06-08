const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const communityController = require('../controllers/communityController');

// All routes require authentication
// GET posts for a module
router.get('/posts/:moduleId', protect, communityController.getPostsByModule);

// CREATE a new post (Elite only)
router.post('/posts', protect, communityController.createPost);

// DELETE a post (owner only)
router.delete('/posts/:postId', protect, communityController.deletePost);

// UPVOTE a post
router.post('/posts/:postId/upvote', protect, communityController.upvotePost);

// GET replies for a post
router.get('/posts/:postId/replies', protect, communityController.getReplies);

// CREATE a reply
router.post('/posts/:postId/replies', protect, communityController.createReply);

// DELETE a reply (owner only)
router.delete('/replies/:replyId', protect, communityController.deleteReply);

// UPVOTE a reply
router.post('/replies/:replyId/upvote', protect, communityController.upvoteReply);

module.exports = router;
