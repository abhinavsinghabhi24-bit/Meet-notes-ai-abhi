/**
 * MeetNotes AI - API Client
 * All communication with the backend server
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = { 'Content-Type': 'application/json' };

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error || data.message || `HTTP ${response.status} error`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please make sure the backend is running on port 3001.\n\nRun: cd server && npm run dev');
    }
    throw error;
  }
}

// ── Health Check ─────────────────────────────────────────────────────────────
async function checkHealth() {
  return apiFetch('/health');
}

// ── Analyze ──────────────────────────────────────────────────────────────────
async function analyzeTranscript({ title, transcript, participants, date }) {
  return apiFetch('/analyze', {
    method: 'POST',
    body: JSON.stringify({ title, transcript, participants, date })
  });
}

// ── Meetings CRUD ─────────────────────────────────────────────────────────────
async function saveMeeting({ title, date, participants, transcript, summary, discussionPoints, actionItems }) {
  return apiFetch('/meetings', {
    method: 'POST',
    body: JSON.stringify({ title, date, participants, transcript, summary, discussionPoints, actionItems })
  });
}

async function getAllMeetings() {
  return apiFetch('/meetings');
}

async function getMeetingById(id) {
  return apiFetch(`/meetings/${id}`);
}

async function deleteMeeting(id) {
  return apiFetch(`/meetings/${id}`, { method: 'DELETE' });
}

async function searchMeetings(query) {
  return apiFetch(`/meetings/search?q=${encodeURIComponent(query)}`);
}

async function getStats() {
  return apiFetch('/meetings/stats');
}

// Export for use in other scripts
window.API = {
  checkHealth,
  analyzeTranscript,
  saveMeeting,
  getAllMeetings,
  getMeetingById,
  deleteMeeting,
  searchMeetings,
  getStats
};
