# 🧠 MeetNotes AI

**AI-powered meeting notes tool that converts transcripts into summaries, action items, and searchable meeting history using Google Gemini.**

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-v4-blue)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-purple)](https://prisma.io)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-orange)](https://ai.google.dev)

---

## 📋 Overview

MeetNotes AI is a full-stack application built for the **Generative AI Assessment**. It uses Google Gemini AI to analyze meeting transcripts and automatically extract:

- ✅ **Meeting summaries** – concise overview of the discussion
- 💬 **Key discussion points** – important topics and decisions
- ✅ **Action items** – tasks with assigned owners and deadlines
- 💾 **Persistent storage** – all meetings saved to PostgreSQL
- 🔍 **Searchable history** – find past meetings by keyword

---

## 🎯 Assessment Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Feature 1** | Paste transcript & validate input | ✅ Implemented |
| **Feature 2** | AI extracts summary, action items & owners | ✅ Implemented |
| **Feature 3** | Save and search past meetings | ✅ Implemented |

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| AI | Google Gemini 1.5 Flash (via `@google/generative-ai`) |
| Database | PostgreSQL + Prisma ORM |
| Security | Helmet, CORS, Rate Limiting, dotenv |

---

## 📁 Project Structure

```
MeetNotesAI/
├── frontend/
│   ├── index.html          # Main SPA HTML
│   ├── css/
│   │   └── style.css       # Complete stylesheet
│   └── js/
│       ├── api.js          # API client (fetch wrapper)
│       ├── history.js      # Meeting history page logic
│       └── app.js          # Main app logic, navigation, forms
│
├── server/
│   ├── server.js           # Express server entry point
│   ├── routes/
│   │   ├── analyze.js      # POST /api/analyze
│   │   └── meetings.js     # CRUD + search routes
│   ├── controllers/
│   │   ├── analyzeController.js
│   │   └── meetingsController.js
│   ├── services/
│   │   ├── gemini.js       # Gemini AI integration
│   │   └── database.js     # Prisma client
│   ├── middleware/
│   │   └── rateLimiter.js  # Rate limiting + error handler
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── .env                # (gitignored) Real secrets
│   ├── .env.example        # Safe template to commit
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js v18 or higher
- PostgreSQL (local or hosted)
- Google Gemini API key ([Get one here](https://aistudio.google.com/))

### Step 1: Clone the repository

```bash
git clone https://github.com/yourusername/meetnotes-ai.git
cd meetnotes-ai
```

### Step 2: Install backend dependencies

```bash
cd server
npm install
```

### Step 3: Configure environment variables

```bash
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
DATABASE_URL="postgresql://username:password@localhost:5432/meetnotes_db?schema=public"
FRONTEND_URL=http://127.0.0.1:5500
```

### Step 4: Set up PostgreSQL database

Create the database:

```sql
CREATE DATABASE meetnotes_db;
```

Apply Prisma schema:

```bash
# From server/ directory
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
```

### Step 5: Start the backend

```bash
npm run dev
```

Server will start at: `http://localhost:3001`

### Step 6: Open the frontend

Simply open `frontend/index.html` in your browser, or use Live Server (VS Code extension) at `http://127.0.0.1:5500`.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `GEMINI_API_KEY` | **Yes** | Your Google Gemini API key |
| `GEMINI_MODEL` | No | Model name (default: `gemini-1.5-flash`) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `FRONTEND_URL` | No | CORS allowed origin |

---

## 📡 API Documentation

### POST /api/analyze
Analyze a meeting transcript with Gemini AI.

**Request:**
```json
{
  "title": "Q3 Planning Meeting",
  "transcript": "Meeting transcript text here...",
  "participants": "Alice, Bob, Charlie",
  "date": "2026-11-02"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Q3 Planning Meeting",
    "analysis": {
      "summary": "Meeting summary text...",
      "discussion_points": ["Point 1", "Point 2"],
      "action_items": [
        {
          "task": "Complete documentation",
          "owner": "Alice",
          "deadline": "Friday",
          "status": "Pending"
        }
      ]
    }
  }
}
```

### POST /api/meetings
Save an analyzed meeting to the database.

### GET /api/meetings
Get all saved meetings (newest first).

### GET /api/meetings/:id
Get a specific meeting with full details.

### GET /api/meetings/search?q=keyword
Search meetings by title, summary, or transcript content.

### DELETE /api/meetings/:id
Delete a meeting and its associated action items.

### GET /api/health
Check server and database connectivity status.

---

## 🗄️ Database Schema

### Meeting
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Meeting title |
| date | DateTime | Meeting date |
| participants | String? | Participant names |
| transcript | Text | Full transcript |
| summary | Text | AI-generated summary |
| discussionPoints | Json | Array of discussion points |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### ActionItem
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| meetingId | String | Foreign key → Meeting |
| task | Text | Task description |
| owner | String | Assigned person |
| deadline | String | Deadline (or "Not specified") |
| status | String | "Pending", etc. |

---

## 🌐 Deployment

### Frontend → Vercel

1. Push `frontend/` to a GitHub repository
2. Connect to [Vercel](https://vercel.com)
3. Deploy (no build step needed for static HTML)

### Backend → Render or Railway

**Render:**
1. Create a new Web Service
2. Set Root Directory to `server/`
3. Build Command: `npm install && npm run db:generate && npm run db:push`
4. Start Command: `npm start`
5. Add environment variables in Render dashboard

**Database → Supabase or Render PostgreSQL:**
1. Create a hosted PostgreSQL database
2. Copy the connection string to `DATABASE_URL`

---

## 🧪 Testing

A sample transcript is available in the UI via the **"Load Sample Transcript"** button on the New Meeting page.

You can verify all features work:
1. ✅ Frontend loads at `http://127.0.0.1:5500`
2. ✅ Backend health: `http://localhost:3001/api/health`
3. ✅ Analyze a transcript → AI returns structured results
4. ✅ Save the meeting → appears in Meeting History
5. ✅ Search for a keyword → returns matching meetings
6. ✅ Delete a meeting → removed from database

---

## 🔒 Security

- **API key protection**: `GEMINI_API_KEY` is never sent to the browser
- **Rate limiting**: 100 req/15min general; 10 req/min for AI analysis
- **Input validation**: Transcript length limits, required field checks
- **Helmet.js**: Security headers on all responses
- **CORS**: Configured to allow only trusted origins
- **.env gitignored**: Secrets never committed to version control

---

## 👨‍💻 Author

Built for **Generative AI Assessment** | MeetNotes AI © 2026
