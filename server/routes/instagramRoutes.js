const express = require('express');
const router = express.Router();
const instagramService = require('../services/instagramService');

router.get('/status', async (req, res) => {
  try {
    await instagramService.loadSettings();
    res.json({ success: true, status: instagramService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    const configured = await instagramService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/post', async (req, res) => {
  try {
    const result = await instagramService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await instagramService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await instagramService.loadSettings();
    const result = instagramService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = instagramService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
