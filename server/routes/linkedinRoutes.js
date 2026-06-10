const express = require('express');
const router = express.Router();
const linkedinService = require('../services/linkedinService');

router.get('/status', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    res.json({ success: true, status: linkedinService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    const configured = await linkedinService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/post-article', async (req, res) => {
  try {
    const result = await linkedinService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await linkedinService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    const result = linkedinService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = linkedinService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
