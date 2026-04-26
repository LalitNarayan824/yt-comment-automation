# CommentAI — Features Documentation

> Complete reference of every feature implemented in the CommentAI platform.

---

## Table of Contents

1. [Authentication & Security](#1-authentication--security)
2. [YouTube Channel & Video Management](#2-youtube-channel--video-management)
3. [Comment Management & Analysis Pipeline](#3-comment-management--analysis-pipeline)
4. [AI-Powered Reply Generation](#4-ai-powered-reply-generation)
5. [Persona System](#5-persona-system)
6. [Analytics Dashboard](#6-analytics-dashboard)
7. [AI Insights Engine](#7-ai-insights-engine)
8. [Global Comment Search](#8-global-comment-search)
9. [State Management](#9-state-management)
10. [Data Model Summary](#10-data-model-summary)

---

## 1. Authentication & Security

### OAuth 2.0 Login

- **Provider**: Google OAuth 2.0, configured via NextAuth.js.
- **Scopes**: Grants access to the YouTube Data API v3, enabling channel/video/comment read and comment reply posting.
- **Flow**: Clicking "Sign in with Google" redirects to Google's consent screen. Upon approval, the callback at `/api/auth/callback/google` receives an authorization code, which is exchanged for access and refresh tokens.

### Token Management

- **Server-Side Encryption**: Access and refresh tokens are encrypted using a project-level encryption utility (`src/lib/encryption.ts`) before being persisted to the `users` table.
- **Session Enrichment**: The authenticated session contains the user's `googleId`, `accessToken`, `channelId`, `name`, and `email`. The access token is refreshed automatically using the stored refresh token when it expires.
- **Token Isolation**: Sensitive tokens never reach the client browser. All YouTube API calls are made server-side using the decrypted token from the session.

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth configuration with Google provider, JWT/session callbacks |
| `src/lib/encryption.ts` | AES encryption/decryption for tokens |
| `src/lib/services/user.service.ts` | `saveOrUpdateUser()` — upserts user with encrypted tokens |
| `src/types/next-auth.d.ts` | TypeScript augmentation for NextAuth session type |

---

## 2. YouTube Channel & Video Management

### Channel Info Fetching

- On first dashboard load, the app calls the YouTube Data API's `channels.list` endpoint (using the user's access token) to fetch channel metadata: **title, description, custom URL, thumbnails, subscriber count, view count, and video count**.
- Channel data is cached in the Zustand store (`useYouTubeStore`) to avoid redundant API calls on subsequent navigations.

### Video Sync & Storage

- The dashboard retrieves the user's uploaded videos via the YouTube Data API's `playlistItems.list` endpoint (using the channel's uploads playlist).
- Each video is upserted into the `videos` table via `saveOrUpdateVideo()`, persisting: `youtubeVideoId`, `title`, `description`, `thumbnailUrl`, `publishedAt`, and `userId`.
- Videos are displayed as a responsive grid on the main dashboard, each card showing the thumbnail, title, and publish date.

### Video Context & AI Summary

- **Creator Context**: Each video supports a free-text `creatorContext` and `creatorSummary` that the creator can enter to provide additional context about the video's content (e.g., "this is a tutorial on React hooks focusing on useEffect").
- **AI Summary Generation**: The `generateVideoSummary()` function sends the video title, YouTube description, and the creator's summary to Groq LLM (`llama-3.1-8b-instant`) to produce a 3–5 line AI summary. This summary is stored in the `aiSummary` field and is injected into the reply generation prompt to ensure replies are video-aware.
- **Context Update Tracking**: The `contextUpdatedAt` timestamp and `summaryGenerated` boolean flag track when context was last modified and whether an AI summary exists.

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/channel/route.ts` | Fetches channel info from YouTube API |
| `src/app/api/videos/route.ts` | Fetches and syncs videos from YouTube API |
| `src/app/api/videos/[videoId]/context/route.ts` | Updates video context and generates AI summary |
| `src/lib/services/video.service.ts` | `saveOrUpdateVideo()`, `getVideosByUserId()`, `getVideoByYoutubeId()` |
| `src/lib/services/context.service.ts` | `updateVideoContext()`, `getVideoContext()`, `generateVideoSummary()` |

---

## 3. Comment Management & Analysis Pipeline

### Comment Sync from YouTube

- **Full Sync (`syncComments`)**: Upserts all provided comments into the database using Prisma's `upsert`, preventing duplicates while updating mutable fields (like count, text edits).
- **Incremental Sync (`syncNewCommentsFromYouTube`)**: Fetches comments from the YouTube Data API in newest-first order. Uses **early-stop deduplication** — as soon as a fetched comment matches a known `youtubeCommentId` in the database, syncing stops. This minimizes API quota usage and processing time.
- **Trigger**: Comment sync is triggered via `POST /api/comments/sync?videoId=<youtubeVideoId>`. The endpoint first syncs new comments, then runs the analysis pipeline on all unprocessed comments.

### ML-Based Comment Analysis

- **Batch Processing**: Unanalyzed comments (`isAnalyzed = false`) are sent in **batches of 32** to the external ML service at the configured `ML_SERVICE_URL` endpoint (`/analyze-batch`).
- **Analysis Fields**: Each comment is classified for:
  - **Sentiment**: `positive`, `negative`, or `neutral`
  - **Intent**: `question`, `appreciation`, `criticism`, `spam`, or `other`
  - **Toxicity**: Boolean `isToxic` flag
  - **Spam**: Boolean `isSpam` flag
- **Moderation**: After ML analysis, each comment is passed through `moderateComment()` which sets:
  - `moderationStatus`: `"approved"` or `"blocked"` (blocked if toxic or spam)
  - `isModerated`: `true`
- **Priority Scoring**: A composite score (0–100) is computed by `getPriorityScore()` based on:
  - Intent weight: questions = 40, complaints = 35, appreciation = 10, spam = 5, other = 15
  - Sentiment boost: negative = +25, positive = +5, neutral = +10
  - Like multiplier: +2 per like, capped at 30
- **Auto-Reply**: When the `AUTO_REPLY` environment variable is enabled, the system automatically generates and posts replies to high-priority questions using the Groq LLM and YouTube Data API.

### Fallback AI Analysis (Legacy)

- The `ai-analysis.service.ts` contains a deprecated Groq-based fallback for single-comment analysis via LLM. This was used before the ML service integration and is no longer active (marked with "THIS IS OF NO USE NOW").
- Includes retry logic with exponential backoff for rate-limit handling.

### Comment Data Model

```
Comment {
  id               UUID (PK)
  youtubeCommentId  String (unique)
  videoId           FK → Video
  authorName        String
  authorChannelId   String?
  authorProfileImage String?
  text              String
  likeCount         Int
  totalReplyCount   Int
  publishedAt       DateTime
  intent            String?     — question | appreciation | criticism | spam | other
  sentiment         String?     — positive | negative | neutral
  isToxic           Boolean
  isAnalyzed        Boolean
  analyzedAt        DateTime?
  isSpam            Boolean
  moderationStatus  String      — pending | approved | blocked
  isModerated       Boolean
  priorityScore     Int (0–100)
  replied           Boolean
}
```

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/comments/route.ts` | `GET` — paginated comment retrieval |
| `src/app/api/comments/sync/route.ts` | `POST` — triggers incremental sync + analysis |
| `src/lib/services/comment.service.ts` | Core: `syncComments`, `syncNewCommentsFromYouTube`, `analyzeUnprocessedComments`, `AutoReply`, `getPriorityScore` |
| `src/lib/services/ai-analysis.service.ts` | Legacy Groq-based single-comment analysis (deprecated) |
| `src/lib/services/moderation.service.ts` | `moderateComment()` — sets moderation status |

---

## 4. AI-Powered Reply Generation

### Context-Aware Reply Prompt

Replies are generated by the Groq LLM (`llama-3.1-8b-instant`) using a rich prompt that includes:

1. **Persona rules** — tone, emoji style, vocabulary guidelines, catchphrases, forbidden words (from the user's default persona).
2. **Video context** — the AI-generated video summary (`aiSummary`), if available, so the reply is relevant to the video topic.
3. **Comment analysis** — the computed `intent` and `sentiment` of the comment.
4. **Behavioral instructions** — if question → answer; if praise → gratitude; if criticism → empathy. Replies are kept to 2–3 sentences, no hashtags, limited emojis.

### Fallback Tone System

If no persona is configured, the system falls back to three basic tone presets:
- **Friendly**: Warm, conversational, enthusiastic
- **Professional**: Polite, composed, well-articulated
- **Humorous**: Witty, lighthearted, fun

### Rate Limit Handling

- Uses exponential backoff retry (up to 3 attempts) for Groq API 429 rate-limit errors.
- Returns user-facing error message if all retries are exhausted.

### Reply Lifecycle

1. **Generate**: `POST /api/generate-reply` → AI generates reply → saved in `replies` table via `saveReply()`.
2. **Review & Edit**: The UI displays the generated reply for the creator to review and optionally edit. The edited version is stored in `editedReply`.
3. **Post**: `POST /api/post-reply` → Posts the final reply text to YouTube via the Data API's `comments.insert` endpoint → marks as `posted` via `markReplyPosted()` (atomic transaction that also sets the parent comment's `replied = true`).

### Reply Data Model

```
Reply {
  id              UUID (PK)
  commentId       FK → Comment
  generatedReply  String     — AI-generated text
  editedReply     String?    — Creator's edited version
  posted          Boolean
  postedAt        DateTime?
}
```

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/generate-reply/route.ts` | Builds prompt, calls Groq, saves reply |
| `src/app/api/post-reply/route.ts` | Posts reply to YouTube, marks as posted |
| `src/lib/services/reply.service.ts` | `saveReply()`, `markReplyPosted()`, `getLatestReplyForComment()` |

---

## 5. Persona System

### Overview

Personas allow creators to define reusable reply personalities. Each persona controls how the AI responds — its voice, style, and boundaries.

### Persona Attributes

| Field | Description |
|---|---|
| `name` | Display name (e.g., "Chill Creator", "Professional Educator") |
| `tone` | Overall tone instruction (e.g., "Friendly and supportive") |
| `emojiStyle` | Emoji usage guidelines (e.g., "Use sparingly, max 1 per reply") |
| `vocabularyRules` | Language preferences (e.g., "Use simple English, avoid jargon") |
| `catchphrases` | Signature phrases to include (e.g., "Stay curious!" ) |
| `forbiddenWords` | Words/phrases the AI must never use |
| `isDefault` | Whether this is the active persona used for reply generation |

### Default Persona

- Only **one** persona can be the default at any time. Setting a new default automatically unsets the previous one.
- The default persona is automatically loaded by the reply generation endpoint — the creator doesn't need to select it each time.

### CRUD Operations

- **Create**: `POST /api/personas` — Creates a new persona. If `isDefault = true`, unsets existing default.
- **Read**: `GET /api/personas` — Returns all personas for the user, ordered by creation date.
- **Update**: `PUT /api/personas/[id]` — Updates persona attributes. If `isDefault = true`, unsets existing default.
- **Delete**: `DELETE /api/personas/[id]` — Deletes the persona.

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/personas/route.ts` | `GET` (list), `POST` (create) |
| `src/app/api/personas/[id]/route.ts` | `PUT` (update), `DELETE` (delete) |
| `src/lib/services/persona.service.ts` | Full CRUD: `createPersona`, `getPersonas`, `getDefaultPersona`, `setDefaultPersona`, `updatePersona`, `deletePersona` |
| `src/app/dashboard/personas/page.tsx` | Persona management UI page |

---

## 6. Analytics Dashboard

### Per-Video Analytics (`/analytics?videoId=<id>`)

Provides detailed engagement analytics for a single video. Computed via `GET /api/analytics?videoId=<youtubeVideoId>`.

#### Overview KPIs
- **Total Comments** — Comment count for the video
- **Total Replies Posted** — Count of posted (not just generated) replies
- **Pending Replies** — Comments that haven't been replied to
- **Reply Rate** — `(replies posted / total comments) × 100`
- **Avg Response Time** — Average time (in hours) between a comment being posted and the creator's reply being posted

#### Audience Insights Charts (Recharts)
- **Sentiment Distribution** — Pie chart showing positive / negative / neutral split
- **Intent Breakdown** — Pie chart showing question / appreciation / criticism / spam / other
- **Moderation Status** — Pie chart showing approved / blocked / pending

#### Activity Timeline
- **Comment & Reply Activity** — Area chart showing daily comment and reply counts over time

#### Actionable Insights Panel
- **Unanswered Questions** — Count of comments with `intent = "question"` and `replied = false`
- **High-Priority Pending** — Count of comments with `priorityScore > 70` and `replied = false`
- **Ignored Negative** — Count of comments with `sentiment = "negative"` and `replied = false`

### Global Channel Analytics (Insights Page)

Aggregated KPIs across **all** videos, computed by `computeGlobalMetrics()`:

- **Total Comments** — Sum across all videos
- **Total Reply Rate** — Channel-wide reply percentage
- **Channel Health Score** — Weighted composite: `(sentiment × 0.4) + (replyRate × 0.3) + (moderationRate × 0.3)`
- **Avg Priority Score** — Mean priority across all comments
- **Sentiment Distribution** — Aggregate positive/negative/neutral counts and percentages
- **Intent Distribution** — Aggregate intent category counts
- **Moderation Stats** — Flagged, blocked, approved counts
- **Top Videos** — Ranked by comment count (top 5), showing comment count and reply rate
- **Engagement Metrics** — Total likes, comments with replies, average likes per comment

### Analytics Components

| Component | Purpose |
|---|---|
| `KPISection.tsx` | Renders overview KPI cards |
| `SentimentChart.tsx` | Pie chart for sentiment distribution |
| `IntentChart.tsx` | Pie chart for intent breakdown |
| `ModerationChart.tsx` | Pie chart for moderation status |
| `ActivityChart.tsx` | Area chart for daily comment/reply activity timeline |
| `InsightsPanel.tsx` | Renders actionable insights (unanswered questions, etc.) |

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/analytics/route.ts` | Per-video analytics API |
| `src/app/analytics/page.tsx` | Per-video analytics page |
| `src/lib/services/analytics.service.ts` | `computeGlobalMetrics()`, `getEmptyMetrics()` |
| `src/components/analytics/` | 6 chart/KPI components |

---

## 7. AI Insights Engine

### Checkpoint-Based Trend System

Rather than using rigid time windows (daily/weekly), the insights engine uses a **checkpoint comparison** model:

1. **Live Metrics**: `computeGlobalMetrics()` computes the current state of all channel metrics.
2. **Last Checkpoint**: The most recent `Insight` record in the database (containing the metrics at the time it was saved).
3. **Trend Calculation**: `computeTrend(current, previous, threshold)` compares live values against the checkpoint and classifies each metric as `"improving"`, `"declining"`, or `"stable"` (with a configurable threshold, default 5%).

### LLM-Generated Analysis

The `buildLLMInput()` function assembles a rich context payload for the Groq LLM (`llama-3.3-70b-versatile`), including:

- **Channel Profile**: Content category, content type, audience expectation, channel size, posting frequency.
- **Core Metrics + Trends**: Total comments, reply rate, health score, average priority — each with its trend direction.
- **Sentiment & Intent Breakdowns**: Counts and percentages.
- **Moderation Risk**: Flagged/blocked/approved counts.
- **Top 5 Videos**: With comment counts and reply rates.

### Structured Output

The LLM returns a structured JSON response with:

| Field | Description |
|---|---|
| `vibeCheck` | One of: 🔥 Excellent, 🟢 Good, ⚠️ Needs Attention, 🚨 Critical |
| `summary` | 2–3 line channel health overview |
| `keyInsights` | Array of notable observations |
| `risks` | Array of identified risks |
| `opportunities` | Array of growth opportunities |
| `recommendations` | Array of actionable recommendations |
| `actionLinks` | Array of `{ label, filter }` objects linking to pre-filtered search results |

### Action Links

Action links allow the creator to jump directly from an insight to the relevant comments. Example action filters:
- `"sentiment:negative"` — All negative comments
- `"intent:question&replied:false"` — Unanswered questions
- `"priority:high"` — High-priority comments
- `"moderation:flagged"` — Flagged comments

### Creator Context Settings

On the Insights page, creators can configure their channel context to improve AI analysis accuracy:

- **Content Category**: education, tech, gaming, entertainment, vlog, music, news
- **Content Type**: Programming Tutorials, Web Development, AI/ML, Tech Reviews, etc.
- **Audience Expectation**: high interaction, moderate interaction, low interaction

These are persisted on the `User` model and injected into the LLM prompt.

### Insight Data Model

```
Insight {
  id          UUID (PK)
  userId      FK → User
  inputData   JSON    — the metrics snapshot at the time of generation
  outputData  JSON    — the LLM-generated analysis
  createdAt   DateTime
}
```

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/insights/route.ts` | `GET` — returns metrics + last insight, or generates new one |
| `src/app/api/user/settings/route.ts` | Updates creator context settings |
| `src/lib/services/insights.service.ts` | `generateInsight()`, `buildLLMInput()`, `callGroqLLM()`, `computeTrend()`, `getLastCheckpoint()` |
| `src/lib/services/analytics.service.ts` | `computeGlobalMetrics()` — feeds into insights |
| `src/app/dashboard/insights/page.tsx` | Insights UI with charts, AI panel, settings |

---

## 8. Global Comment Search

### Multi-Filter Search

The search page at `/dashboard/search` provides a powerful channel-wide comment search interface.

#### Available Filters

| Filter | Type | Values |
|---|---|---|
| **Video** | Dropdown | All synced videos (populated from DB) |
| **Sentiment** | Dropdown | positive, negative, neutral |
| **Intent** | Dropdown | question, appreciation, criticism |
| **Spam** | Toggle | true / false |
| **Toxic** | Toggle | true / false |
| **Replied** | Toggle | true / false |
| **Free-text** | Text input | Case-insensitive partial match on comment text |

#### Deep-Linking from Insights

- Action buttons on the AI Insights panel pass filter presets via URL query parameters (e.g., `?sentiment=negative&replied=false`).
- The search page reads these params on load and applies them automatically, so clicking "View unanswered questions" from insights takes you directly to the filtered results.

#### Pagination

- Uses **cursor-based pagination** for efficient traversal.
- Page size is capped at 25 results per page (max 50).
- Includes `nextCursor` and `total` in the response for client-side infinite scroll or "load more" controls.

### Related Files

| File | Purpose |
|---|---|
| `src/app/api/comments/search/route.ts` | Multi-filter search API |
| `src/app/dashboard/search/page.tsx` | Search UI with filters, results list, badges |

---

## 9. State Management

### Zustand Store (`useYouTubeStore`)

A lightweight client-side store that caches frequently needed data to avoid redundant API calls:

| State | Type | Purpose |
|---|---|---|
| `channel` | `Channel \| null` | Cached channel metadata |
| `videos` | `Video[]` | Cached video list |
| `personas` | `Persona[]` | Cached personas |
| `isChannelFetched` | `boolean` | Guards against re-fetching channel info |
| `isVideosFetched` | `boolean` | Guards against re-fetching videos |
| `isPersonasFetched` | `boolean` | Guards against re-fetching personas |

This ensures that navigating between dashboard pages doesn't re-trigger YouTube API calls or database reads that were already completed in the current session.

---

## 10. Data Model Summary

```
User ──┬── Video ──── Comment ──── Reply
       ├── Persona
       └── Insight

6 models, 4 database indexes (userId, videoId, commentId, createdAt)
```

| Model | Records | Key Fields |
|---|---|---|
| **User** | 1 per Google account | googleId, channelId, encrypted tokens, creator context settings |
| **Video** | 1 per YouTube video | youtubeVideoId, aiSummary, creatorContext, creatorSummary |
| **Comment** | 1 per YouTube comment | sentiment, intent, isToxic, isSpam, priorityScore, moderationStatus |
| **Reply** | 1+ per comment | generatedReply, editedReply, posted, postedAt |
| **Persona** | 0+ per user | tone, emojiStyle, vocabularyRules, catchphrases, forbiddenWords |
| **Insight** | 0+ per user | inputData (JSON), outputData (JSON) |
