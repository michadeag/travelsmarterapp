const express = require('express');
const router = express.Router();
const wordpressService = require('../services/wordpressService');

router.get('/status', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    res.json({ success: true, status: wordpressService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/auth-url', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const url = wordpressService.getAuthUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/exchange-token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code fehlt' });
    await wordpressService.loadSettings();
    const result = await wordpressService.exchangeCodeForToken(code);
    res.json({ success: true, blogId: result.blog_id, blogUrl: result.blog_url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/sites', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const sites = await wordpressService.fetchSites();
    res.json({ success: true, sites });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const { topicIndex } = req.body;
    const result = await wordpressService.createAndPost(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const result = wordpressService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = wordpressService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: wordpressService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await wordpressService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
