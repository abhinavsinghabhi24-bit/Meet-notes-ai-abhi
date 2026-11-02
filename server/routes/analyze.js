const express = require('express');
const router = express.Router();
const { analyzeMeeting } = require('../controllers/analyzeController');
const { analyzeLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/analyze
 * Analyze a meeting transcript using Gemini AI
 */
router.post('/', analyzeLimiter, analyzeMeeting);

module.exports = router;
