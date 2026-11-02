const express = require('express');
const router = express.Router();
const {
  createMeeting,
  getAllMeetings,
  getMeetingById,
  deleteMeeting,
  searchMeetings,
  getStats
} = require('../controllers/meetingsController');

/**
 * GET /api/meetings/search?q=keyword
 * Search meetings - must be before /:id route
 */
router.get('/search', searchMeetings);

/**
 * GET /api/meetings/stats
 * Get dashboard statistics
 */
router.get('/stats', getStats);

/**
 * GET /api/meetings
 * Get all meetings
 */
router.get('/', getAllMeetings);

/**
 * POST /api/meetings
 * Create/save a new meeting
 */
router.post('/', createMeeting);

/**
 * GET /api/meetings/:id
 * Get a specific meeting
 */
router.get('/:id', getMeetingById);

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete('/:id', deleteMeeting);

module.exports = router;
