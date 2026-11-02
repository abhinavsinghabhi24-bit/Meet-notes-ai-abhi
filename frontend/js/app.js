/**
 * MeetNotes AI - Main Application Logic
 * Handles navigation, forms, AI results, toasts, checklist
 */

// ── State ─────────────────────────────────────────────────────────────────────
let currentAnalysis = null;

// ── DOM Ready ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initNewMeetingForm();
  initSearchBar();
  initChecklist();
  initMobileMenu();
  initModalClose();
  loadDashboard();
  checkServerHealth();
});

// ── Navigation ────────────────────────────────────────────────────────────────
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-page]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      navigateTo(page);
      // Close mobile sidebar
      document.querySelector('.sidebar')?.classList.remove('open');
      document.querySelector('.sidebar-overlay')?.classList.remove('open');
    });
  });
}

function navigateTo(pageId) {
  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');

  // Update nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    n.classList.toggle('active', n.getAttribute('data-page') === pageId);
  });

  // Update topbar title
  const titles = {
    'dashboard': { title: 'Dashboard', subtitle: 'Welcome to MeetNotes AI' },
    'new-meeting': { title: 'New Meeting', subtitle: 'Paste your transcript and analyze with AI' },
    'history': { title: 'Meeting History', subtitle: 'All your saved meetings' },
    'search': { title: 'Search Meetings', subtitle: 'Find meetings by keyword' },
    'about': { title: 'About Project', subtitle: 'MeetNotes AI — Powered by Gemini' }
  };

  const titleData = titles[pageId] || { title: 'MeetNotes AI', subtitle: '' };
  const titleEl = document.getElementById('topbar-title');
  const subtitleEl = document.getElementById('topbar-subtitle');
  if (titleEl) titleEl.textContent = titleData.title;
  if (subtitleEl) subtitleEl.textContent = titleData.subtitle;

  // Page-specific initialization
  if (pageId === 'history') {
    window.History.loadHistory();
  } else if (pageId === 'dashboard') {
    loadDashboard();
  } else if (pageId === 'search') {
    document.getElementById('search-page-input')?.focus();
  }

  // Scroll to top
  document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const response = await window.API.getStats();
    const { totalMeetings, totalActionItems, recentMeetings } = response.data;

    // Update stat counters with animation
    animateCounter('stat-meetings', totalMeetings);
    animateCounter('stat-actions', totalActionItems);

    // Render recent meetings
    renderRecentMeetings(recentMeetings || []);

  } catch (error) {
    console.warn('Dashboard stats failed:', error.message);
    // Non-blocking - just show zeros
    setElementText('stat-meetings', '0');
    setElementText('stat-actions', '0');
    renderRecentMeetings([]);
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 800;
  const start = Date.now();
  const from = parseInt(el.textContent) || 0;

  const update = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * ease);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function renderRecentMeetings(meetings) {
  const container = document.getElementById('recent-meetings-list');
  if (!container) return;

  if (!meetings || meetings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 24px">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">No meetings yet</h3>
        <p class="empty-state-desc">Analyze your first meeting transcript to get started</p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('new-meeting')">
          ✨ Create First Meeting
        </button>
      </div>`;
    return;
  }

  container.innerHTML = meetings.map(m => {
    const date = new Date(m.date || m.createdAt);
    const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const actionCount = m.actionItems?.length || 0;

    return `
      <div class="meeting-card" onclick="window.History.viewMeeting('${m.id}')">
        <div class="meeting-card-left">
          <div class="meeting-avatar">📋</div>
          <div class="meeting-info">
            <div class="meeting-title">${escapeHtml(m.title)}</div>
            <div class="meeting-meta">
              <span class="meeting-meta-item">📅 ${formattedDate}</span>
              <span class="meeting-meta-item">✅ ${actionCount} action${actionCount !== 1 ? 's' : ''}</span>
            </div>
            <p class="meeting-summary">${escapeHtml((m.summary || '').substring(0, 120))}...</p>
          </div>
        </div>
        <div class="meeting-card-right">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();window.History.viewMeeting('${m.id}')">
            View →
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── New Meeting Form ───────────────────────────────────────────────────────────
function initNewMeetingForm() {
  // Transcript character counter
  const transcriptArea = document.getElementById('transcript');
  const charCount = document.getElementById('char-count');
  if (transcriptArea && charCount) {
    transcriptArea.addEventListener('input', () => {
      const len = transcriptArea.value.length;
      charCount.textContent = `${len.toLocaleString()} / 100,000 characters`;
      charCount.style.color = len > 90000 ? 'var(--accent-red)' : 'var(--text-muted)';
    });
  }

  // Paste sample transcript button
  document.getElementById('paste-sample-btn')?.addEventListener('click', pasteSampleTranscript);

  // Clear transcript
  document.getElementById('clear-transcript-btn')?.addEventListener('click', () => {
    if (transcriptArea) {
      transcriptArea.value = '';
      if (charCount) charCount.textContent = '0 / 100,000 characters';
      transcriptArea.focus();
    }
  });

  // Date default
  const dateInput = document.getElementById('meeting-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Analyze button
  document.getElementById('analyze-btn')?.addEventListener('click', handleAnalyze);

  // Clear form button
  document.getElementById('clear-form-btn')?.addEventListener('click', clearForm);

  // Save meeting button
  document.getElementById('save-meeting-btn')?.addEventListener('click', handleSaveMeeting);

  // Copy summary button
  document.getElementById('copy-summary-btn')?.addEventListener('click', copySummary);

  // Analyze again button
  document.getElementById('analyze-again-btn')?.addEventListener('click', () => {
    document.getElementById('analysis-section')?.classList.remove('visible');
    document.getElementById('transcript')?.focus();
    currentAnalysis = null;
  });
}

function pasteSampleTranscript() {
  const sample = `[Q3 Product Roadmap Planning Meeting]
Date: November 2, 2026
Attendees: Priya (Product Manager), Rahul (Lead Developer), Sneha (Designer), Arjun (QA Lead)

Priya: Good morning everyone. Let's get started. Today we need to finalize our Q3 roadmap and assign responsibilities for the upcoming sprint.

Rahul: I've reviewed the backlog. The top priority should be the new user authentication system. We've had security concerns and it needs to be resolved before the release.

Sneha: Agreed. Also, the mobile responsive design is still incomplete. Several users have complained about the checkout flow on mobile.

Priya: Right. So let's make authentication and mobile UI our primary deliverables. Rahul, can you take ownership of the authentication module?

Rahul: Yes, I can do that. I'll need Sneha to finalize the UI designs for the login and registration screens by end of this week.

Sneha: I can have the designs ready by Friday. I'll also share the updated wireframes for the checkout flow in parallel.

Arjun: Once the authentication is built, I'll need at least 3 days for testing. Can we plan for deployment after that?

Priya: That sounds good. Let's target deploying the authentication feature by November 15th. Arjun, please prepare the test cases by November 10th so Rahul has time to address any bugs.

Rahul: Perfect. I'll also look into integrating the payment gateway as a secondary task. I estimate that will take about a week after the authentication is done.

Priya: Let's keep the payment gateway as a stretch goal for this sprint. If we complete authentication early, we'll pick it up.

Sneha: Should I also update the design system documentation? It's been outdated for a while.

Priya: Yes, please add that to your list. You can do it alongside the designs. There's no hard deadline on that but let's aim for end of month.

Arjun: One more thing — we need to set up the staging environment for proper testing. Currently we're testing in production which is risky.

Priya: That's a valid concern. Arjun, please coordinate with Rahul to set up the staging environment by November 8th.

Rahul: I'll create the staging server this week.

Priya: Great. Let's wrap up. Key decisions: authentication module is the top priority, mobile UI must be fixed before release, payment gateway is a stretch goal. Everyone clear on their tasks?

All: Yes.

Priya: Perfect. Next meeting is scheduled for November 9th. Have a great day, team!`;

  const textarea = document.getElementById('transcript');
  if (textarea) {
    textarea.value = sample;
    textarea.dispatchEvent(new Event('input'));
    showToast('Sample transcript loaded!', 'success');
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Auto-fill meeting title and participants
  const titleInput = document.getElementById('meeting-title');
  if (titleInput && !titleInput.value) {
    titleInput.value = 'Q3 Product Roadmap Planning';
  }
  const participantsInput = document.getElementById('participants');
  if (participantsInput && !participantsInput.value) {
    participantsInput.value = 'Priya, Rahul, Sneha, Arjun';
  }
}

async function handleAnalyze() {
  const title = document.getElementById('meeting-title')?.value?.trim();
  const transcript = document.getElementById('transcript')?.value?.trim();
  const participants = document.getElementById('participants')?.value?.trim();
  const date = document.getElementById('meeting-date')?.value;

  // Validate
  if (!transcript || transcript.length < 50) {
    showToast('Please paste a meeting transcript (at least 50 characters)', 'warning');
    document.getElementById('transcript')?.focus();
    return;
  }

  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '⏳ Analyzing...';
  }

  showLoading('🤖 Gemini AI is analyzing your transcript...', true);

  try {
    const response = await window.API.analyzeTranscript({
      title: title || 'Untitled Meeting',
      transcript,
      participants,
      date: date || new Date().toISOString().split('T')[0]
    });

    hideLoading();

    currentAnalysis = {
      ...response.data,
      title: title || 'Untitled Meeting',
      participants,
      date: date || new Date().toISOString().split('T')[0],
      transcript
    };

    renderAnalysisResults(currentAnalysis.analysis, currentAnalysis);
    showToast('✨ AI analysis complete!', 'success');

    // Auto-check Feature 2 in checklist
    checklistCheckFeature(1);

  } catch (error) {
    hideLoading();
    showToast('Analysis failed: ' + error.message, 'error', 8000);
    console.error('Analysis error:', error);
  } finally {
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '✨ Analyze Meeting';
    }
  }
}

function renderAnalysisResults(analysis, meta) {
  const section = document.getElementById('analysis-section');
  if (!section) return;

  // Render summary
  setElementHTML('result-summary', `<p class="summary-text">${escapeHtml(analysis.summary)}</p>`);

  // Render discussion points
  const points = analysis.discussion_points || [];
  if (points.length > 0) {
    setElementHTML('result-discussion', `
      <ul class="discussion-list">
        ${points.map(p => `
          <li class="discussion-item">
            <div class="discussion-bullet"></div>
            <span>${escapeHtml(p)}</span>
          </li>`).join('')}
      </ul>`);
  } else {
    setElementHTML('result-discussion', '<p class="text-muted">No specific discussion points extracted.</p>');
  }

  // Render action items table
  const items = analysis.action_items || [];
  if (items.length > 0) {
    setElementHTML('result-actions', `
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
            ${items.map((item, i) => `
              <tr>
                <td style="color:var(--text-muted);font-weight:600">${i + 1}</td>
                <td class="task-cell">${escapeHtml(item.task)}</td>
                <td><span class="owner-chip">👤 ${escapeHtml(item.owner)}</span></td>
                <td>${escapeHtml(item.deadline)}</td>
                <td><span class="status-chip status-pending">${escapeHtml(item.status || 'Pending')}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`);
  } else {
    setElementHTML('result-actions', '<p class="text-muted">No action items identified in this transcript.</p>');
  }

  // Show section with animation
  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSaveMeeting() {
  if (!currentAnalysis) {
    showToast('Please analyze a transcript first', 'warning');
    return;
  }

  const saveBtn = document.getElementById('save-meeting-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '💾 Saving...';
  }

  try {
    await window.API.saveMeeting({
      title: currentAnalysis.title || 'Untitled Meeting',
      date: currentAnalysis.date,
      participants: currentAnalysis.participants,
      transcript: currentAnalysis.transcript,
      summary: currentAnalysis.analysis.summary,
      discussionPoints: currentAnalysis.analysis.discussion_points || [],
      actionItems: currentAnalysis.analysis.action_items || []
    });

    showToast('✅ Meeting saved successfully!', 'success');

    // Auto-check Feature 3 in checklist
    checklistCheckFeature(2);

    // Refresh dashboard
    loadDashboard();

    if (saveBtn) {
      saveBtn.innerHTML = '✅ Saved!';
      saveBtn.disabled = true;
      setTimeout(() => {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '💾 Save Meeting';
        }
      }, 3000);
    }

  } catch (error) {
    showToast('Failed to save meeting: ' + error.message, 'error');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '💾 Save Meeting';
    }
  }
}

async function copySummary() {
  if (!currentAnalysis?.analysis?.summary) {
    showToast('No summary available to copy', 'warning');
    return;
  }
  try {
    await navigator.clipboard.writeText(currentAnalysis.analysis.summary);
    showToast('Summary copied to clipboard!', 'success');
  } catch {
    showToast('Failed to copy. Please select and copy manually.', 'warning');
  }
}

function clearForm() {
  document.getElementById('meeting-title').value = '';
  document.getElementById('transcript').value = '';
  document.getElementById('participants').value = '';
  document.getElementById('meeting-date').value = new Date().toISOString().split('T')[0];
  const charCount = document.getElementById('char-count');
  if (charCount) charCount.textContent = '0 / 100,000 characters';
  document.getElementById('analysis-section')?.classList.remove('visible');
  currentAnalysis = null;
  showToast('Form cleared', 'info');
}

// ── Search ────────────────────────────────────────────────────────────────────
function initSearchBar() {
  // Top search bar (navigates to search page)
  const topSearch = document.getElementById('top-search');
  topSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigateTo('search');
      const pageSearch = document.getElementById('search-page-input');
      if (pageSearch) {
        pageSearch.value = topSearch.value;
        handlePageSearch(topSearch.value);
      }
    }
  });

  // Search page input
  const pageSearch = document.getElementById('search-page-input');
  let searchTimer;
  pageSearch?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handlePageSearch(e.target.value), 400);
  });

  pageSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePageSearch(e.target.value);
  });
}

async function handlePageSearch(query) {
  const container = document.getElementById('search-results-container');
  const countEl = document.getElementById('search-count');
  if (!container) return;

  if (!query || query.trim() === '') {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">Search Your Meetings</h3>
        <p class="empty-state-desc">Enter keywords to search across meeting titles, summaries, transcripts, and participants</p>
      </div>`;
    if (countEl) countEl.textContent = '';
    return;
  }

  try {
    container.innerHTML = `<div class="empty-state"><div class="loading-spinner" style="width:40px;height:40px;margin:0 auto"></div></div>`;
    const response = await window.API.searchMeetings(query.trim());
    const meetings = response.data || [];

    if (countEl) countEl.textContent = `${meetings.length} result${meetings.length !== 1 ? 's' : ''} for "${query}"`;

    if (meetings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3 class="empty-state-title">No Results Found</h3>
          <p class="empty-state-desc">No meetings match "<strong>${escapeHtml(query)}</strong>". Try different keywords.</p>
        </div>`;
    } else {
      const cards = meetings.map(m => window.History.createMeetingCard(m)).join('');
      container.innerHTML = `<div class="history-grid">${cards}</div>`;
    }
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Search Failed</h3>
        <p class="empty-state-desc">${escapeHtml(error.message)}</p>
      </div>`;
  }
}

// ── Server Health Check ───────────────────────────────────────────────────────
async function checkServerHealth() {
  const dot = document.getElementById('server-status-dot');
  const text = document.getElementById('server-status-text');

  try {
    const health = await window.API.checkHealth();
    if (dot) { dot.style.background = health.success ? 'var(--accent)' : 'var(--accent-orange)'; }
    if (text) { text.textContent = health.success ? 'Server online' : 'Server degraded'; }

    if (!health.geminiConfigured) {
      showToast('⚠️ Gemini API key not configured. Please add GEMINI_API_KEY to server/.env', 'warning', 8000);
    }
    if (health.database?.status !== 'connected') {
      showToast('⚠️ Database not connected. Please configure PostgreSQL.', 'warning', 8000);
    }
  } catch {
    if (dot) { dot.style.background = 'var(--accent-red)'; dot.style.animation = 'none'; }
    if (text) { text.textContent = 'Server offline'; }
  }
}

// ── Checklist ─────────────────────────────────────────────────────────────────
const CHECKLIST_KEY = 'meetnotes_checklist';

const checklistFeatures = [
  {
    id: 'feature-1',
    name: 'Feature 1: Paste Transcript',
    desc: 'User can paste a meeting transcript and validate input before analysis',
    steps: ['Paste transcript in text area', 'Add meeting title', 'Click Analyze']
  },
  {
    id: 'feature-2',
    name: 'Feature 2: AI Extraction',
    desc: 'Gemini AI generates summary, key points, action items, and identifies task owners',
    steps: ['Summary generated', 'Discussion points extracted', 'Action items with owners']
  },
  {
    id: 'feature-3',
    name: 'Feature 3: Save & Search',
    desc: 'Save analyzed meetings to PostgreSQL and search using keywords',
    steps: ['Meeting saved to database', 'History page shows saved meetings', 'Search returns results']
  }
];

function initChecklist() {
  const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
  renderChecklist(saved);
}

function renderChecklist(state) {
  const container = document.getElementById('checklist-container');
  if (!container) return;

  const cards = checklistFeatures.map((f, i) => {
    const checked = state[f.id] || false;
    return `
      <div class="checklist-card ${checked ? 'checked' : ''}" id="checklist-card-${i}" onclick="window.MeetNotes.toggleChecklist('${f.id}')">
        <div class="checklist-header">
          <div class="checklist-checkbox">${checked ? '✓' : ''}</div>
          <div class="checklist-feature-name">${escapeHtml(f.name)}</div>
        </div>
        <p class="checklist-desc">${escapeHtml(f.desc)}</p>
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill" style="width:${checked ? '100' : '0'}%"></div>
        </div>
        <div class="progress-info">
          <span>${checked ? '✅ Completed' : '⏳ Pending'}</span>
          <span>${checked ? '100%' : '0%'}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = cards;

  // Update overall progress
  const completedCount = Object.values(state).filter(Boolean).length;
  const totalCount = checklistFeatures.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  setElementText('overall-completed', `${completedCount}/${totalCount}`);
  const overallBar = document.getElementById('overall-progress-bar');
  if (overallBar) overallBar.style.width = `${pct}%`;
  setElementText('overall-pct', `${pct}% Complete`);
}

function toggleChecklist(featureId) {
  const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
  saved[featureId] = !saved[featureId];
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(saved));
  renderChecklist(saved);
}

function checklistCheckFeature(index) {
  const featureId = checklistFeatures[index]?.id;
  if (!featureId) return;
  const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
  if (!saved[featureId]) {
    saved[featureId] = true;
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(saved));
    renderChecklist(saved);
    showToast(`✅ ${checklistFeatures[index].name} marked complete!`, 'success');
  }
}

// ── Mobile Menu ───────────────────────────────────────────────────────────────
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  menuBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  });
}

// ── Modal Close ───────────────────────────────────────────────────────────────
function initModalClose() {
  const overlay = document.getElementById('meeting-modal');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) window.History.closeMeetingModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.History.closeMeetingModal();
  });
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

// ── Loading Overlay ───────────────────────────────────────────────────────────
function showLoading(message = 'Processing...', showDots = false) {
  const overlay = document.getElementById('loading-overlay');
  const msgEl = document.getElementById('loading-message');
  const dotsEl = document.getElementById('loading-dots');
  if (overlay) overlay.classList.add('active');
  if (msgEl) msgEl.textContent = message;
  if (dotsEl) dotsEl.style.display = showDots ? 'flex' : 'none';
}

function hideLoading() {
  document.getElementById('loading-overlay')?.classList.remove('active');
}

// ── Utility Functions ─────────────────────────────────────────────────────────
function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setElementHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
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

// ── Auto-check Feature 1 when transcript is pasted ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('transcript');
  textarea?.addEventListener('input', () => {
    if (textarea.value.trim().length > 50) {
      checklistCheckFeature(0);
    }
  });
});

// ── Export ────────────────────────────────────────────────────────────────────
window.MeetNotes = {
  navigateTo,
  loadDashboard,
  showToast,
  showLoading,
  hideLoading,
  toggleChecklist,
  checklistCheckFeature,
  escapeHtml,
  handlePageSearch
};

// Make navigateTo global for inline onclick handlers
window.navigateTo = navigateTo;
