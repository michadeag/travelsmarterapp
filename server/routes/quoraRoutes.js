const express = require('express');
const router = express.Router();
const quoraService = require('../services/quoraService');

router.get('/status', async (req, res) => {
  try {
    await quoraService.loadSettings();
    res.json({ success: true, status: quoraService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate a single answer (optionally for a specific question index)
router.post('/generate', async (req, res) => {
  try {
    const { questionIndex } = req.body;
    const result = await quoraService.generateAndLog(
      questionIndex !== undefined ? parseInt(questionIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate multiple answers at once
router.post('/generate-batch', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body.count || 5), 10);
    const results = await quoraService.generateBatch(count);
    res.json({ success: true, answers: results, count: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/questions', async (req, res) => {
  try {
    res.json({ success: true, questions: quoraService.getQuestions() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-answers', async (req, res) => {
  try {
    const answers = await quoraService.getRecentAnswers(30);
    res.json({ success: true, answers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
