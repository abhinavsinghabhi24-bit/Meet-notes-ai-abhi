const { analyzeTranscript } = require('../services/gemini');

/**
 * POST /api/analyze
 * Analyzes a meeting transcript using Gemini AI
 */
async function analyzeMeeting(req, res) {
  try {
    const { title, transcript, participants, date } = req.body;

    // Validate required fields
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required and must be a string'
      });
    }

    const trimmedTranscript = transcript.trim();
    if (trimmedTranscript.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is too short. Please provide a meaningful meeting transcript (at least 50 characters).'
      });
    }

    if (trimmedTranscript.length > 100000) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is too long. Maximum 100,000 characters allowed.'
      });
    }

    const trimmedTitle = (title || 'Untitled Meeting').trim();

    // Call Gemini AI service
    const analysis = await analyzeTranscript(trimmedTranscript, trimmedTitle);

    return res.status(200).json({
      success: true,
      data: {
        title: trimmedTitle,
        date: date || new Date().toISOString(),
        participants: participants || '',
        transcript: trimmedTranscript,
        analysis
      }
    });

  } catch (error) {
    console.error('Analyze error:', error.message);
    
    // Specific error messages for common issues
    if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        success: false,
        error: error.message,
        hint: 'Please configure your Gemini API key in server/.env'
      });
    }

    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      return res.status(429).json({
        success: false,
        error: 'AI service is temporarily overloaded. Please wait a moment and try again.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to analyze transcript. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = { analyzeMeeting };
