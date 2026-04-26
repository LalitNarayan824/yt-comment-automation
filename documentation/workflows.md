# CommentAI — Workflows Documentation

> Detailed end-to-end workflows describing how data flows through the system from the user's action to the final result.

---

## Table of Contents

1. [First-Time Setup & Login](#1-first-time-setup--login)
2. [Dashboard Initialization](#2-dashboard-initialization)
3. [Comment Sync & Analysis Pipeline](#3-comment-sync--analysis-pipeline)
4. [Reply Generation & Posting](#4-reply-generation--posting)
5. [Auto-Reply Pipeline](#5-auto-reply-pipeline)
6. [Video Context & AI Summary](#6-video-context--ai-summary)
7. [Per-Video Analytics Workflow](#7-per-video-analytics-workflow)
8. [AI Insights Generation](#8-ai-insights-generation)
9. [Global Comment Search](#9-global-comment-search)
10. [Persona Management](#10-persona-management)
11. [Creator Context Configuration](#11-creator-context-configuration)

---

## 1. First-Time Setup & Login

### Workflow

```
User clicks "Sign in with Google"
        │
        ▼
Browser redirects to Google OAuth consent screen
        │
        ▼
User grants YouTube Data API permissions
        │
        ▼
Google redirects to /api/auth/callback/google with auth code
        │
        ▼
NextAuth exchanges code for access + refresh tokens
        │
        ▼
JWT callback fires:
  ├── Fetches user's YouTube channel ID via YouTube API
  ├── Encrypts access & refresh tokens
  └── Upserts user in PostgreSQL (saveOrUpdateUser)
        │
        ▼
Session callback enriches session with:
  { googleId, accessToken, channelId, name, email }
        │
        ▼
User is redirected to /dashboard
```

### Key Implementation Details

- **Token Refresh**: If the access token has expired, the JWT callback automatically uses the stored refresh token to obtain a new one from Google.
- **Channel ID Resolution**: On first login, the system calls `youtube.channels.list(mine=true)` to resolve the user's channel ID and stores it in the database.
- **Encryption**: Tokens are encrypted via AES before database storage and decrypted only when needed for API calls.

### Technical Flow

1. `NextAuth` → Google Provider → OAuth callback
2. `jwt` callback → `youtube.channels.list` → `saveOrUpdateUser()`
3. `session` callback → enriches client session
4. Client redirect → `/dashboard`

---

## 2. Dashboard Initialization

### Workflow

```
User navigates to /dashboard
        │
        ▼
React component mounts
        │
        ▼
Check Zustand store: isChannelFetched?
  ├── YES → Use cached channel data
  └── NO ─┐
           ▼
     GET /api/channel
           │
           ▼
     YouTube API: channels.list(mine=true)
           │
           ▼
     Store in Zustand: setChannel(channelData)
        │
        ▼
Check Zustand store: isVideosFetched?
  ├── YES → Use cached videos
  └── NO ─┐
           ▼
     GET /api/videos
           │
           ▼
     YouTube API: playlistItems.list(uploadsPlaylistId)
           │
           ▼
     For each video: saveOrUpdateVideo() [upsert to DB]
           │
           ▼
     Store in Zustand: setVideos(videoList)
        │
        ▼
Render dashboard:
  ├── Channel header (name, avatar, stats)
  └── Video grid (thumbnails, titles, links)
```

### Key Implementation Details

- **Fetch Guards**: The `isChannelFetched` and `isVideosFetched` boolean flags in the Zustand store prevent redundant API calls when the user navigates between pages and returns to the dashboard.
- **Video Persistence**: Every video returned by the YouTube API is upserted into PostgreSQL. This ensures comments can be associated with videos even across sessions.
- **Session Validation**: If the session is missing or the access token is absent, the user is redirected to the login page.

---

## 3. Comment Sync & Analysis Pipeline

### Workflow

```
User opens a video's comment page (/dashboard/video/[videoId])
        │
        ▼
Frontend calls POST /api/comments/sync?videoId=<youtubeVideoId>
        │
        ▼
═══ PHASE 1: INCREMENTAL SYNC ═══
        │
        ▼
syncNewCommentsFromYouTube():
  ├── YouTube API: commentThreads.list (newest first, 100 per page)
  ├── For each page of comments:
  │     ├── Check each comment against DB
  │     ├── If youtubeCommentId already exists → STOP (early exit)
  │     └── If new → add to batch
  ├── Upsert new comments to DB (syncComments)
  └── Return newCount
        │
        ▼
═══ PHASE 2: ML ANALYSIS ═══
        │
        ▼
analyzeUnprocessedComments():
  ├── Query: SELECT * FROM comments WHERE isAnalyzed = false AND videoId = ?
  ├── Split into batches of 32
  ├── For each batch:
  │     ├── POST to ML_SERVICE_URL/analyze-batch
  │     │     Body: { comments: [{ id, text }], api_key }
  │     ├── Receive: { results: [{ id, sentiment, intent, is_toxic, is_spam }] }
  │     ├── For each result:
  │     │     ├── moderateComment(is_toxic, is_spam) → moderationStatus
  │     │     ├── getPriorityScore(intent, sentiment, likeCount) → score
  │     │     └── UPDATE comment SET sentiment, intent, isToxic, isSpam,
  │     │           moderationStatus, isModerated, priorityScore, isAnalyzed=true
  │     └── If AUTO_REPLY enabled:
  │           └── AutoReply(comment) for high-priority questions
  └── Return
        │
        ▼
═══ PHASE 3: DISPLAY ═══
        │
        ▼
Frontend calls GET /api/comments?videoId=<id>&sort=recent&limit=20
        │
        ▼
getCommentsByVideoId():
  ├── Prisma query with cursor-based pagination
  ├── Includes latest reply for each comment
  ├── Orders by priorityScore DESC or createdAt DESC
  └── Returns comments + nextCursor
        │
        ▼
Render comment list with:
  ├── Author avatar, name, text
  ├── Sentiment / Intent / Toxicity badges
  ├── Priority score indicator
  ├── Moderation status
  ├── Reply button → Generate Reply workflow
  └── IntersectionObserver triggers next page load
```

### Priority Scoring Formula

```
score = intentWeight + sentimentBoost + likeBonus

intentWeight:
  question    = 40
  complaint   = 35
  other       = 15
  appreciation = 10
  spam        = 5

sentimentBoost:
  negative = +25
  neutral  = +10
  positive = +5

likeBonus = min(likeCount × 2, 30)

Final score: clamped to 0–100
```

---

## 4. Reply Generation & Posting

### Workflow

```
User clicks "Generate Reply" on a comment
        │
        ▼
POST /api/generate-reply
  Body: { commentId, commentText, tone }
        │
        ▼
═══ BUILD PROMPT ═══
        │
        ▼
1. Load user's default persona (getDefaultPersona)
   ├── If persona exists → extract tone, emoji, vocabulary, catchphrases, forbidden words
   └── If no persona → use fallback tone (friendly/professional/humorous)
        │
        ▼
2. Load comment's video context
   └── If video has aiSummary → include in prompt
        │
        ▼
3. Load comment analysis
   └── Include intent + sentiment in prompt
        │
        ▼
4. Assemble prompt:
   ┌────────────────────────────────────────┐
   │ === PERSONA ===                        │
   │ Tone: {persona.tone}                   │
   │ Emoji Style: {persona.emojiStyle}      │
   │ Rules: {persona.vocabularyRules}       │
   │ Catchphrases: {persona.catchphrases}   │
   │ Avoid: {persona.forbiddenWords}        │
   │                                        │
   │ === VIDEO CONTEXT ===                  │
   │ Summary: {video.aiSummary}             │
   │                                        │
   │ === COMMENT ANALYSIS ===               │
   │ Intent: {comment.intent}               │
   │ Sentiment: {comment.sentiment}         │
   │                                        │
   │ === INSTRUCTIONS ===                   │
   │ - question → answer clearly            │
   │ - praise → show gratitude              │
   │ - criticism → politely & empathetically│
   │ - 2-3 sentences, no hashtags           │
   │                                        │
   │ === COMMENT ===                        │
   │ "{commentText}"                        │
   └────────────────────────────────────────┘
        │
        ▼
═══ CALL LLM ═══
        │
        ▼
generateWithRetry():
  ├── Send to Groq (llama-3.1-8b-instant)
  ├── Retry up to 3× with exponential backoff on 429
  └── Return generated reply text
        │
        ▼
═══ PERSIST ═══
        │
        ▼
saveReply(commentId, generatedReply) → creates Reply record
        │
        ▼
Return { reply, replyId } to frontend
        │
        ▼
═══ USER REVIEW ═══
        │
        ▼
Creator reviews generated reply in UI
  ├── Option to edit the text
  └── Click "Post Reply"
        │
        ▼
POST /api/post-reply
  Body: { replyId, parentId (youtubeCommentId), replyText }
        │
        ▼
YouTube API: POST comments?part=snippet
  Body: { snippet: { parentId, textOriginal: replyText } }
        │
        ▼
If success:
  markReplyPosted(replyId):
    ├── UPDATE reply SET posted=true, postedAt=now()
    └── UPDATE comment SET replied=true
    (Wrapped in Prisma $transaction for atomicity)
        │
        ▼
Return { success, youtubeCommentId, text }
```

---

## 5. Auto-Reply Pipeline

### Workflow

```
Triggered by: analyzeUnprocessedComments() when AUTO_REPLY is enabled
        │
        ▼
For each newly analyzed comment:
        │
        ▼
AutoReply(comment, accessToken):
  ├── Check: Is this a high-priority question?
  │     └── Intent must be "question" (or high priorityScore)
  ├── Load video context (getVideoContext)
  ├── Load default persona
  │
  ├── Build prompt (same structure as manual reply)
  ├── Call Groq LLM (generateWithRetry)
  ├── Save reply to DB (saveReply)
  │
  ├── POST to YouTube API: comments?part=snippet
  │     Body: { snippet: { parentId, textOriginal } }
  │
  ├── If YouTube API succeeds:
  │     └── markReplyPosted(replyId)
  └── Return true/false
```

### Key Notes

- Auto-reply is an opt-in feature controlled by environment configuration.
- Only high-priority questions trigger auto-replies, not all comments.
- The full reply lifecycle (generate → save → post → mark) is automated end-to-end.

---

## 6. Video Context & AI Summary

### Workflow

```
User navigates to a video's comment page
        │
        ▼
User clicks "Edit Context" or "Generate Summary"
        │
        ▼
═══ UPDATE CONTEXT ═══ (optional)
        │
        ▼
User enters:
  ├── creatorContext — additional context about the video
  └── creatorSummary — creator's own summary/notes
        │
        ▼
PUT /api/videos/[videoId]/context
  Body: { creatorContext, creatorSummary }
        │
        ▼
updateVideoContext():
  └── UPDATE video SET creatorContext, creatorSummary, contextUpdatedAt=now()

═══ GENERATE AI SUMMARY ═══
        │
        ▼
POST /api/videos/[videoId]/context?action=generate-summary
        │
        ▼
generateVideoSummary():
  ├── Build prompt from: title + description + creatorSummary
  │     "Summarize this YouTube video in 3-5 lines..."
  ├── Send to Groq (llama-3.1-8b-instant)
  ├── Receive summary text
  └── UPDATE video SET aiSummary, summaryGenerated=true, contextUpdatedAt=now()
        │
        ▼
AI Summary is now available for:
  ├── Reply generation prompts (injected as VIDEO CONTEXT)
  └── Display on the video's comment page
```

---

## 7. Per-Video Analytics Workflow

### Workflow

```
User clicks "Analytics" on a video card
        │
        ▼
Navigate to /analytics?videoId=<youtubeVideoId>
        │
        ▼
GET /api/analytics?videoId=<youtubeVideoId>
        │
        ▼
═══ COMPUTE ANALYTICS ═══
        │
        ▼
1. Overview KPIs:
   ├── COUNT(comments) WHERE videoId
   ├── COUNT(replies) WHERE posted=true
   ├── COUNT(comments) WHERE replied=false
   ├── Reply Rate = (posted / total) × 100
   └── Avg Response Time = AVG(reply.postedAt - comment.publishedAt)

2. Audience Insights:
   ├── GROUP BY sentiment → pie chart data
   ├── GROUP BY intent → pie chart data
   └── GROUP BY moderationStatus → pie chart data

3. Activity Timeline:
   ├── All comments + their replies
   ├── Group by date (YYYY-MM-DD)
   └── Build { date, comments, replies } array

4. Actionable Insights:
   ├── COUNT(comments) WHERE intent='question' AND replied=false
   ├── COUNT(comments) WHERE priorityScore > 70 AND replied=false
   └── COUNT(comments) WHERE sentiment='negative' AND replied=false
        │
        ▼
Return JSON payload
        │
        ▼
═══ RENDER ═══
        │
        ▼
Frontend renders:
  ├── KPISection → 5 stat cards
  ├── SentimentChart → Recharts PieChart
  ├── IntentChart → Recharts PieChart
  ├── ModerationChart → Recharts PieChart
  ├── ActivityChart → Recharts AreaChart
  └── InsightsPanel → actionable insight cards
```

---

## 8. AI Insights Generation

### Workflow

```
User navigates to /dashboard/insights
        │
        ▼
═══ INITIAL LOAD ═══
        │
        ▼
GET /api/insights (no ?generate param)
  ├── computeGlobalMetrics(userId) → live metrics
  ├── Query: latest Insight record for user
  └── Return { metrics, aiInsights: lastInsight.outputData, lastUpdated }
        │
        ▼
Frontend renders:
  ├── Global KPI cards (total comments, reply rate, health score)
  ├── Channel analytics charts
  └── Last AI insight (if exists) or "Generate" button
        │
        ▼
═══ GENERATE NEW INSIGHT ═══
        │
        ▼
User clicks "Generate AI Insights"
        │
        ▼
GET /api/insights?generate=true
        │
        ▼
generateInsight(userId):
  │
  ├── 1. Compute live metrics
  │     └── computeGlobalMetrics(userId)
  │
  ├── 2. Load last checkpoint
  │     └── getLastCheckpoint(userId)
  │
  ├── 3. Build LLM input
  │     └── buildLLMInput(liveMetrics, lastCheckpoint, user):
  │           ├── Channel profile (category, type, audience, size, frequency)
  │           ├── Core metrics + trends (computeTrend for each)
  │           │     ├── totalComments: trend vs last checkpoint
  │           │     ├── replyRate: trend vs last checkpoint
  │           │     ├── healthScore: trend vs last checkpoint
  │           │     └── avgPriority: trend vs last checkpoint
  │           ├── Sentiment breakdown (counts + percentages + trends)
  │           ├── Intent breakdown (counts + percentages)
  │           ├── Moderation stats (flagged, blocked, approved)
  │           └── Top 5 videos (title, comments, replyRate)
  │
  ├── 4. Call Groq LLM
  │     └── callGroqLLM(input):
  │           ├── System prompt: "You are an AI analytics assistant..."
  │           ├── Model: llama-3.3-70b-versatile (larger model for analysis)
  │           ├── JSON response format enforced
  │           └── Parse → AIInsightOutput
  │
  ├── 5. Save checkpoint
  │     └── INSERT INTO insights (userId, inputData, outputData)
  │
  └── 6. Return { metrics, aiInsights, lastUpdated }
        │
        ▼
Frontend renders AI Insights panel:
  ├── Vibe Check badge (🔥 / 🟢 / ⚠️ / 🚨)
  ├── Summary paragraph
  ├── Key Insights list
  ├── Risks list
  ├── Opportunities list
  ├── Recommendations list
  └── Action Links → clickable buttons that deep-link to /dashboard/search?filter=...
```

### Trend Detection Logic

```
function computeTrend(current, previous, threshold = 5):
  if no previous → "new"
  percentChange = ((current - previous) / previous) × 100
  if percentChange > threshold → "improving"
  if percentChange < -threshold → "declining"
  else → "stable"
```

---

## 9. Global Comment Search

### Workflow

```
User navigates to /dashboard/search
  OR clicks an action link from AI Insights
        │
        ▼
═══ LOAD FILTERS ═══
        │
        ▼
Read URL search params:
  ├── ?sentiment=negative
  ├── ?intent=question
  ├── ?replied=false
  ├── ?isSpam=true
  ├── ?isToxic=true
  ├── ?videoId=<dbVideoId>
  └── ?q=search+text
        │
        ▼
Pre-populate filter dropdowns/toggles from URL params
        │
        ▼
═══ FETCH RESULTS ═══
        │
        ▼
GET /api/comments/search?{filters}&limit=25
        │
        ▼
Server-side:
  1. Authenticate user (session)
  2. Get all video IDs for user
  3. Build Prisma WHERE clause:
     ├── videoId = specific OR IN(all user videos)
     ├── sentiment, intent = exact match
     ├── isSpam, isToxic, replied = boolean match
     └── text CONTAINS query (case-insensitive)
  4. Query with cursor pagination (limit + 1 trick)
  5. Include: video { title, youtubeVideoId }, replies (latest 1)
  6. Return { comments, nextCursor, total, videos }
        │
        ▼
═══ RENDER RESULTS ═══
        │
        ▼
For each comment:
  ├── Video title label
  ├── Author name + profile image
  ├── Comment text
  ├── Badges: sentiment, intent, spam, toxic, replied
  ├── Latest AI reply (if exists)
  └── Action buttons
        │
        ▼
"Load More" or infinite scroll:
  └── Fetch next page using nextCursor
        │
        ▼
"Clear Filters" button:
  └── Reset all filters and URL params
```

---

## 10. Persona Management

### Workflow

```
User navigates to /dashboard/personas
        │
        ▼
GET /api/personas
  └── Returns all personas for user, ordered by createdAt DESC
        │
        ▼
Render persona list with default indicator

═══ CREATE PERSONA ═══
        │
        ▼
User fills out form:
  ├── Name (required)
  ├── Tone
  ├── Emoji Style
  ├── Vocabulary Rules
  ├── Catchphrases
  ├── Forbidden Words
  └── Set as Default? (checkbox)
        │
        ▼
POST /api/personas
  Body: { name, tone, emojiStyle, vocabularyRules, catchphrases, forbiddenWords, isDefault }
        │
        ▼
createPersona():
  ├── If isDefault = true → unset all existing defaults first
  └── INSERT INTO personas
        │
        ▼
═══ SET DEFAULT ═══
        │
        ▼
User clicks "Set as Default" on a persona card
        │
        ▼
setDefaultPersona(userId, personaId):
  ├── UPDATE personas SET isDefault=false WHERE userId
  └── UPDATE persona SET isDefault=true WHERE id=personaId

═══ UPDATE PERSONA ═══
        │
        ▼
PUT /api/personas/[id]
  Body: { ...updatedFields }
        │
        ▼
updatePersona():
  ├── If isDefault = true → unset all existing defaults first
  └── UPDATE persona SET ...fields

═══ DELETE PERSONA ═══
        │
        ▼
DELETE /api/personas/[id]
  └── DELETE FROM personas WHERE id AND userId
```

---

## 11. Creator Context Configuration

### Workflow

```
User navigates to /dashboard/insights
        │
        ▼
Settings section displays current values:
  ├── Content Category (dropdown)
  ├── Content Type (dropdown)
  └── Audience Expectation (dropdown)
        │
        ▼
User changes a setting
        │
        ▼
PUT /api/user/settings
  Body: { key: "contentCategory", value: "tech" }
        │
        ▼
UPDATE users SET content_category = 'tech' WHERE id = userId
        │
        ▼
Settings are used in:
  ├── AI Insights Engine → injected into LLM prompt as channel profile
  └── Influences: vibe check, recommendations, risk assessment
```

### Available Settings

| Setting | Options | Default |
|---|---|---|
| Content Category | education, tech, gaming, entertainment, vlog, music, news | education |
| Content Type | Programming Tutorials, Web Development, AI/ML, Tech Reviews, Gaming Walkthroughs, Comedy, Travel Vlogs, Music Production, News & Politics, Lifestyle | Web Development |
| Audience Expectation | high interaction, moderate interaction, low interaction | high interaction |

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                                 │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Login   │  │Dashboard │  │ Comments │  │ Insights │  │  Search  │ │
│  │  Page    │  │  (Main)  │  │  (Video) │  │  Page    │  │  Page    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
└───────┼──────────────┼────────────┼─────────────┼────────────┼─────────┘
        │              │            │             │            │
┌───────┼──────────────┼────────────┼─────────────┼────────────┼─────────┐
│       ▼              ▼            ▼             ▼            ▼         │
│                        NEXT.JS API ROUTES                              │
│                                                                         │
│  /api/auth   /api/channel  /api/comments   /api/insights   /api/search │
│              /api/videos   /api/sync        /api/analytics             │
│                            /api/gen-reply   /api/user/settings         │
│                            /api/post-reply  /api/personas              │
└─────────┬────────────────────┬───────────────────────┬─────────────────┘
          │                    │                       │
    ┌─────▼─────┐      ┌──────▼──────┐         ┌─────▼─────┐
    │  YouTube  │      │    Groq     │         │    ML     │
    │  Data API │      │    LLM     │         │  Service  │
    └───────────┘      └─────────────┘         └───────────┘
          │                    │                       │
          └────────────────────┼───────────────────────┘
                               │
                        ┌──────▼──────┐
                        │ PostgreSQL  │
                        │  (Prisma)   │
                        │             │
                        │ Users       │
                        │ Videos      │
                        │ Comments    │
                        │ Replies     │
                        │ Personas    │
                        │ Insights    │
                        └─────────────┘
```
