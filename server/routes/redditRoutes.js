const express = require('express');
const router = express.Router();
const redditService = require('../services/redditService');

// GET /api/reddit/status
router.get('/status', async (req, res) => {
  try {
    await redditService.loadSettings();
    res.json({ success: true, status: redditService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/reload-settings — call after saving credentials
router.post('/reload-settings', async (req, res) => {
  try {
    redditService.accessToken = null; // force token refresh
    const configured = await redditService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/post-article — generate + post immediately
router.post('/post-article', async (req, res) => {
  try {
    const { subreddit } = req.body; // optional override
    const result = await redditService.createAndPost(subreddit || null);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reddit/recent-posts
router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await redditService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/scheduler/start
router.post('/scheduler/start', async (req, res) => {
  try {
    await redditService.loadSettings();
    const result = redditService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/scheduler/stop
router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = redditService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
