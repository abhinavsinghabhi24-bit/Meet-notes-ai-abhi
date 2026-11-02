/**
 * MeetNotes AI - Meeting History Page Logic
 * Handles rendering, searching, and viewing past meetings
 */

let allMeetings = [];
let filteredMeetings = [];

/**
 * Load and render meeting history
 */
async function loadHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  try {
    showHistorySkeleton(container);
    const response = await window.API.getAllMeetings();
    allMeetings = response.data || [];
    filteredMeetings = [...allMeetings];
    renderMeetingCards(filteredMeetings, container);
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Failed to Load Meetings</h3>
        <p class="empty-state-desc">${escapeHtml(error.message)}</p>
        <button class="btn btn-primary" onclick="loadHistory()">
          🔄 Retry
        </button>
      </div>`;
  }
}

/**
 * Show skeleton cards while loading
 */
function showHistorySkeleton(container) {
  const skeletons = Array.from({ length: 3 }, () => `
    <div class="history-card">
      <div class="history-card-header">
        <div class="skeleton" style="width:44px;height:44px;border-radius:12px;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton" style="width:60%;height:16px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:40%;height:12px"></div>
        </div>
      </div>
      <div class="history-card-body">
        <div class="skeleton" style="width:100%;height:12px;margin-bottom:6px"></div>
        <div class="skeleton" style="width:90%;height:12px;margin-bottom:6px"></div>
        <div class="skeleton" style="width:70%;height:12px"></div>
      </div>
      <div class="history-card-footer">
        <div class="skeleton" style="width:80px;height:30px;border-radius:8px"></div>
        <div class="skeleton" style="width:60px;height:30px;border-radius:8px"></div>
      </div>
    </div>`).join('');
  container.innerHTML = `<div class="history-grid">${skeletons}</div>`;
}

/**
 * Render meeting cards to the DOM
 */
function renderMeetingCards(meetings, container) {
  if (!meetings || meetings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">No Meetings Found</h3>
        <p class="empty-state-desc">
          ${allMeetings.length === 0
            ? 'No meetings saved yet. Analyze a meeting transcript to get started!'
            : 'No meetings match your search. Try different keywords.'}
        </p>
        ${allMeetings.length === 0 ? `
          <button class="btn btn-primary" onclick="window.MeetNotes.navigateTo('new-meeting')">
            ➕ Create First Meeting
          </button>` : ''}
      </div>`;
    return;
  }

  const cards = meetings.map(m => createMeetingCard(m)).join('');
  container.innerHTML = `<div class="history-grid">${cards}</div>`;
}

/**
 * Create HTML for a single meeting card
 */
function createMeetingCard(meeting) {
  const date = new Date(meeting.date || meeting.createdAt);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const actionCount = meeting.actionItems?.length || 0;
  const summaryPreview = meeting.summary?.substring(0, 160) || 'No summary available';

  return `
    <div class="history-card" data-id="${meeting.id}">
      <div class="history-card-header">
        <div class="history-icon">📋</div>
        <div class="history-card-info">
          <div class="history-card-title">${escapeHtml(meeting.title)}</div>
          <div class="meeting-meta">
            <span class="meeting-meta-item">📅 ${formattedDate}</span>
            ${meeting.participants ? `<span class="meeting-meta-item">👥 ${escapeHtml(meeting.participants)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="history-card-body">
        <p class="history-summary">${escapeHtml(summaryPreview)}${meeting.summary?.length > 160 ? '...' : ''}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge badge-purple">✅ ${actionCount} Action Item${actionCount !== 1 ? 's' : ''}</span>
          ${meeting.discussionPoints?.length ? `<span class="badge badge-blue">💬 ${meeting.discussionPoints.length} Points</span>` : ''}
        </div>
      </div>
      <div class="history-card-footer">
        <button class="btn btn-secondary btn-sm" onclick="window.History.viewMeeting('${meeting.id}')">
          👁 View Details
        </button>
        <button class="btn btn-danger btn-sm" onclick="window.History.confirmDelete('${meeting.id}', '${escapeHtml(meeting.title).replace(/'/g, "\\'")}')">
          🗑 Delete
        </button>
      </div>
    </div>`;
}

/**
 * View a specific meeting in the modal
 */
async function viewMeeting(id) {
  try {
    const response = await window.API.getMeetingById(id);
    const meeting = response.data;
    openMeetingModal(meeting);
  } catch (error) {
    window.MeetNotes.showToast('Failed to load meeting details: ' + error.message, 'error');
  }
}

/**
 * Open the meeting detail modal
 */
function openMeetingModal(meeting) {
  const overlay = document.getElementById('meeting-modal');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;

  const date = new Date(meeting.date || meeting.createdAt);
  const formattedDate = date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const discussionPoints = Array.isArray(meeting.discussionPoints)
    ? meeting.discussionPoints
    : JSON.parse(meeting.discussionPoints || '[]');

  const actionItems = meeting.actionItems || [];

  content.innerHTML = `
    <div class="modal-header">
      <div>
        <div class="modal-title">${escapeHtml(meeting.title)}</div>
        <div class="meeting-meta" style="margin-top:6px">
          <span class="meeting-meta-item">📅 ${formattedDate}</span>
          ${meeting.participants ? `<span class="meeting-meta-item">👥 ${escapeHtml(meeting.participants)}</span>` : ''}
        </div>
      </div>
      <button class="modal-close" onclick="window.History.closeMeetingModal()" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-section">
        <div class="modal-section-title">📝 Meeting Summary</div>
        <p class="summary-text">${escapeHtml(meeting.summary)}</p>
      </div>

      ${discussionPoints.length > 0 ? `
      <div class="modal-section">
        <div class="modal-section-title">💬 Key Discussion Points</div>
        <ul class="discussion-list">
          ${discussionPoints.map(p => `
            <li class="discussion-item">
              <div class="discussion-bullet"></div>
              <span>${escapeHtml(p)}</span>
            </li>`).join('')}
        </ul>
      </div>` : ''}

      ${actionItems.length > 0 ? `
      <div class="modal-section">
        <div class="modal-section-title">✅ Action Items</div>
        <div class="table-wrapper">
          <table class="ai-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Task</th>
                <th>Owner</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${actionItems.map((item, i) => `
                <tr>
                  <td style="color:var(--text-muted);font-weight:600">${i + 1}</td>
                  <td class="task-cell">${escapeHtml(item.task)}</td>
                  <td><span class="owner-chip">👤 ${escapeHtml(item.owner)}</span></td>
                  <td>${escapeHtml(item.deadline)}</td>
                  <td><span class="status-chip status-${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <div class="modal-section">
        <div class="modal-section-title">📄 Original Transcript</div>
        <div style="background:var(--bg-primary);border-radius:var(--radius-sm);padding:16px;max-height:200px;overflow-y:auto">
          <pre style="font-size:13px;color:var(--text-secondary);white-space:pre-wrap;font-family:inherit;line-height:1.7">${escapeHtml(meeting.transcript)}</pre>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:8px">
        <button class="btn btn-secondary" onclick="window.History.copyMeetingSummary('${meeting.id}')">
          📋 Copy Summary
        </button>
        <button class="btn btn-danger" onclick="window.History.confirmDelete('${meeting.id}', '${escapeHtml(meeting.title).replace(/'/g, "\\'")}');window.History.closeMeetingModal()">
          🗑 Delete Meeting
        </button>
      </div>
    </div>`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Store current meeting for summary copy
  overlay._currentMeeting = meeting;
}

function closeMeetingModal() {
  const overlay = document.getElementById('meeting-modal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

async function copyMeetingSummary(id) {
  try {
    const response = await window.API.getMeetingById(id);
    await navigator.clipboard.writeText(response.data.summary);
    window.MeetNotes.showToast('Summary copied to clipboard!', 'success');
  } catch {
    window.MeetNotes.showToast('Failed to copy summary', 'error');
  }
}

/**
 * Confirm and delete a meeting
 */
function confirmDelete(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) return;
  deleteMeetingById(id);
}

async function deleteMeetingById(id) {
  try {
    await window.API.deleteMeeting(id);
    window.MeetNotes.showToast('Meeting deleted successfully', 'success');
    allMeetings = allMeetings.filter(m => m.id !== id);
    filteredMeetings = filteredMeetings.filter(m => m.id !== id);
    renderMeetingCards(filteredMeetings, document.getElementById('history-container'));
    // Refresh dashboard stats
    if (window.MeetNotes) window.MeetNotes.loadDashboard();
  } catch (error) {
    window.MeetNotes.showToast('Failed to delete meeting: ' + error.message, 'error');
  }
}

/**
 * Live search/filter meetings
 */
function filterMeetings(query) {
  if (!query || query.trim() === '') {
    filteredMeetings = [...allMeetings];
  } else {
    const q = query.toLowerCase();
    filteredMeetings = allMeetings.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      m.summary?.toLowerCase().includes(q) ||
      m.transcript?.toLowerCase().includes(q) ||
      m.participants?.toLowerCase().includes(q) ||
      (Array.isArray(m.discussionPoints) && m.discussionPoints.some(p => p.toLowerCase().includes(q)))
    );
  }
  renderMeetingCards(filteredMeetings, document.getElementById('history-container'));
}

/**
 * Server-side search
 */
async function searchMeetingsOnServer(query) {
  if (!query || query.trim() === '') {
    await loadHistory();
    return;
  }
  const container = document.getElementById('history-container');
  try {
    showHistorySkeleton(container);
    const response = await window.API.searchMeetings(query);
    filteredMeetings = response.data || [];
    renderMeetingCards(filteredMeetings, container);
  } catch (error) {
    // Fallback to client-side filter
    filterMeetings(query);
  }
}

// Helper functions
function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'complete' || s === 'done' || s === 'completed') return 'complete';
  if (s === 'in progress' || s === 'in-progress') return 'progress';
  return 'pending';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Export
window.History = {
  loadHistory,
  viewMeeting,
  closeMeetingModal,
  copyMeetingSummary,
  confirmDelete,
  filterMeetings,
  searchMeetingsOnServer,
  createMeetingCard
};
