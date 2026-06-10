const express = require('express');
const router = express.Router();
const mediumService = require('../services/mediumService');

router.get('/status', async (req, res) => {
  try {
    await mediumService.loadSettings();
    res.json({ success: true, status: mediumService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    mediumService.userId = null;
    const configured = await mediumService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const result = await mediumService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: mediumService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await mediumService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await mediumService.loadSettings();
    const result = mediumService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = mediumService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
