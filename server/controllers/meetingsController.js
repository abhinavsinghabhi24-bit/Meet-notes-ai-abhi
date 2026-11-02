const { prisma } = require('../services/database');

/**
 * POST /api/meetings
 * Save a meeting and its AI analysis to the database
 */
async function createMeeting(req, res) {
  try {
    const { title, date, participants, transcript, summary, discussionPoints, actionItems } = req.body;

    // Validate required fields
    if (!title || !transcript || !summary) {
      return res.status(400).json({
        success: false,
        error: 'Title, transcript, and summary are required'
      });
    }

    // Create meeting with action items in a transaction
    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        date: date ? new Date(date) : new Date(),
        participants: participants || null,
        transcript: transcript.trim(),
        summary: summary.trim(),
        discussionPoints: Array.isArray(discussionPoints) ? discussionPoints : [],
        actionItems: {
          create: Array.isArray(actionItems)
            ? actionItems.map(item => ({
                task: item.task || 'Unspecified task',
                owner: item.owner || 'Not specified',
                deadline: item.deadline || 'Not specified',
                status: item.status || 'Pending'
              }))
            : []
        }
      },
      include: {
        actionItems: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Meeting saved successfully',
      data: meeting
    });

  } catch (error) {
    console.error('Create meeting error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to save meeting. Please check your database connection.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/meetings
 * Retrieve all meetings (most recent first)
 */
async function getAllMeetings(req, res) {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        actionItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });

  } catch (error) {
    console.error('Get meetings error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve meetings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/meetings/:id
 * Retrieve a specific meeting by ID
 */
async function getMeetingById(req, res) {
  try {
    const { id } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        actionItems: true
      }
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting
    });

  } catch (error) {
    console.error('Get meeting error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve meeting',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * DELETE /api/meetings/:id
 * Delete a meeting and all associated action items (cascade)
 */
async function deleteMeeting(req, res) {
  try {
    const { id } = req.params;

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Delete meeting (cascade deletes action items)
    await prisma.meeting.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Delete meeting error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete meeting',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/search?q=keyword
 * Search meetings by title, summary, transcript, or discussion points
 */
async function searchMeetings(req, res) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchTerm = q.trim();

    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            summary: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            transcript: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            participants: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        actionItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      query: searchTerm,
      count: meetings.length,
      data: meetings
    });

  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/stats
 * Get dashboard statistics
 */
async function getStats(req, res) {
  try {
    const totalMeetings = await prisma.meeting.count();
    const totalActionItems = await prisma.actionItem.count();
    const recentMeetings = await prisma.meeting.findMany({
      take: 5,
      include: { actionItems: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalMeetings,
        totalActionItems,
        recentMeetings
      }
    });
  } catch (error) {
    console.error('Stats error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats'
    });
  }
}

module.exports = { createMeeting, getAllMeetings, getMeetingById, deleteMeeting, searchMeetings, getStats };
