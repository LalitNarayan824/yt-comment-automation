# Stage 1 -- Database Integration

## AI-Powered YouTube Comment Management System

------------------------------------------------------------------------

# 🎯 Objective of Stage 1

Transform the system from a stateless AI tool into a persistent,
data-driven SaaS-ready backend.

After completing this stage, the system must:

-   Store users
-   Store videos
-   Store comments
-   Store replies
-   Store persona settings
-   Serve dashboard data from the database (not directly from YouTube
    API)

------------------------------------------------------------------------

# 🏗 Recommended Tech Stack

-   **Database:** PostgreSQL
-   **ORM:** Prisma
-   **Hosting:** Supabase or Neon (Managed Postgres)
-   **Environment Management:** dotenv (.env.local)
-   **Encryption:** AES (for token storage)

------------------------------------------------------------------------

# 🗄 Database Schema Design

## 1️⃣ Users Table

Fields:

-   id (UUID, Primary Key)
-   google_id (Unique)
-   email
-   name
-   channel_id
-   access_token (encrypted)
-   refresh_token (encrypted)
-   created_at
-   updated_at

Purpose:

-   Identify creator
-   Support multi-user SaaS expansion
-   Store OAuth credentials securely

------------------------------------------------------------------------

## 2️⃣ Videos Table

Fields:

-   id (UUID)
-   youtube_video_id (Unique)
-   title
-   thumbnail_url
-   published_at
-   user_id (Foreign Key → Users)
-   created_at

Purpose:

-   Track multiple videos
-   Enable channel-wide analytics
-   Associate comments per video

------------------------------------------------------------------------

## 3️⃣ Comments Table

Fields:

-   id (UUID)
-   youtube_comment_id (Unique)
-   video_id (Foreign Key → Videos)
-   author_name
-   author_channel_id
-   text
-   like_count
-   intent (nullable)
-   sentiment (nullable)
-   toxicity_score (nullable)
-   is_spam (default false)
-   moderation_status (pending/approved/hidden)
-   priority_score (default 0)
-   replied (default false)
-   created_at

Important:

Even if intent classification and moderation are not implemented yet,
include these fields now for future-proofing.

------------------------------------------------------------------------

## 4️⃣ Replies Table

Fields:

-   id (UUID)
-   comment_id (Foreign Key → Comments)
-   generated_reply
-   edited_reply
-   posted (default false)
-   posted_at
-   created_at

Purpose:

-   Track response rate
-   Enable engagement analytics
-   Support performance tracking

------------------------------------------------------------------------

## 5️⃣ Persona Table

Fields:

-   id (UUID)
-   user_id (Foreign Key → Users)
-   tone
-   emoji_style
-   vocabulary_rules
-   catchphrases
-   forbidden_words
-   created_at

Purpose:

-   Support future persona customization
-   Enable brand-consistent reply generation

------------------------------------------------------------------------

# 🔐 Secure Token Storage

Do NOT store raw OAuth tokens.

Recommended:

-   Encrypt access and refresh tokens using AES
-   Store encryption key in .env.local
-   Never expose tokens to frontend

------------------------------------------------------------------------

# 🔄 Refactored System Flow

Previous Flow:

Fetch → Display → Generate → Post

New Flow:

Fetch → Save to DB → Display from DB → Generate → Save Reply → Post →
Update DB

This ensures persistence and analytics capability.

------------------------------------------------------------------------

# 🧩 Required Service Layer

Move business logic out of API routes.

Create:

/lib/services/

Services:

-   user.service.ts
-   video.service.ts
-   comment.service.ts
-   reply.service.ts

Each API route must call a service function only.

------------------------------------------------------------------------

# 📦 Required Core Functions

## saveOrUpdateVideo()

-   Check if video exists
-   Insert if new
-   Return existing if already stored

## syncComments(videoId)

For each fetched comment:

-   If not exists → Insert
-   If exists → Update like_count

Use upsert operations to prevent duplicates.

## saveReply()

-   Save generated reply
-   Mark comment.replied = false

When posting:

-   Update posted = true
-   Set posted_at
-   Mark comment.replied = true

------------------------------------------------------------------------

# 📊 Dashboard Data Source Change

Frontend must now call:

GET /api/comments?video_id=DATABASE_VIDEO_ID

API must return data from PostgreSQL.

Never send raw YouTube API data directly to frontend.

------------------------------------------------------------------------

# ⚙ Required Indexes

Add indexes on:

-   youtube_comment_id
-   video_id
-   user_id
-   created_at

This improves analytics and sorting performance.

------------------------------------------------------------------------

# 🧪 Edge Cases to Handle

-   Duplicate comment fetch
-   Deleted YouTube comments
-   API partial failures
-   Re-fetching the same video
-   Reply posting failure

Use safe upsert and transaction logic.

------------------------------------------------------------------------

# 📁 Recommended Folder Structure

/lib db.ts /services user.service.ts video.service.ts comment.service.ts
reply.service.ts

/app/api /videos /comments /generate /post

Keep API routes thin and clean.

------------------------------------------------------------------------

# ✅ Definition of Done (Stage 1 Complete When)

-   PostgreSQL database is running
-   All tables are created
-   Comments persist between refreshes
-   Replies are saved and tracked
-   Dashboard reads from database
-   No direct dependency on YouTube API for UI rendering
-   Tokens stored securely

------------------------------------------------------------------------

# 🚀 What Stage 1 Unlocks

After completion:

-   Intent classification becomes easy to add
-   Moderation engine becomes possible
-   Engagement analytics becomes possible
-   Top fan recognition becomes trivial
-   Scaling architecture becomes feasible

------------------------------------------------------------------------

# 🎯 Stage 1 Summary

This stage converts your application from:

API-integrated tool

Into:

Data-driven backend system ready for intelligent processing and SaaS
expansion.

------------------------------------------------------------------------
End of Stage 1 Document

# Stage 1 – Complete System Flow Documentation


---

# 🎯 Purpose of Stage 1

Stage 1 introduces **database persistence** into the system.

The application transitions from:

Stateless AI Tool  
→  
Persistent, Data-Driven Backend System

All data now flows through PostgreSQL instead of directly from YouTube to the UI.

---

# 🔁 Architecture Change

## Before Stage 1

User → API → YouTube API → UI

## After Stage 1

User → API → YouTube API → Database → UI  
                                 ↑  
                              Replies

All reads come from the database.  
All writes update the database.

---

# 🧭 Complete Stage 1 Flows

---

# 1️⃣ Authentication & User Persistence Flow

### Flow Steps

1. User logs in via Google OAuth.
2. NextAuth receives access_token.
3. Backend extracts user information.
4. Backend calls saveOrUpdateUser().
5. Store user in Users table:
   - google_id
   - email
   - name
   - channel_id
   - encrypted tokens
6. Session continues normally.

### Result

User now exists permanently in the database.

Enables:
- Multi-user system
- Token refresh handling
- Analytics ownership
- SaaS expansion

---

# 2️⃣ Video Sync Flow

### Trigger
User opens dashboard.

### Flow Steps

1. Frontend calls: GET /api/videos
2. Backend calls YouTube API (search or channels endpoint).
3. For each video:
   - Call saveOrUpdateVideo()
   - Upsert into Videos table.
4. Return videos to frontend.

### Result

Your system now maintains its own internal video registry.

Enables:
- Channel-wide dashboards
- Historical comment tracking
- Multi-video analytics

---

# 3️⃣ Comment Sync Flow (Core Transformation)

## Step A – User Selects Video

1. Frontend sends YouTube video ID.
2. Backend finds corresponding DB video record.

---

## Step B – Fetch Comments from YouTube

1. Backend calls:
   commentThreads.list
2. Receive structured comment data.

---

## Step C – Sync to Database (Upsert Logic)

For each comment:

IF comment does NOT exist:
→ Insert new record in Comments table.

IF comment exists:
→ Update:
   - like_count
   - text (if edited)
   - updated_at

This prevents duplicates and keeps data fresh.

---

## Step D – Return Data From Database

Instead of returning raw YouTube data:

Query:
SELECT * FROM Comments WHERE video_id = ?

Return structured DB result to frontend.

---

### Result

Comments persist across refreshes.
UI is now database-driven.

---

# 4️⃣ Reply Generation Flow (Updated)

## Step A – Generate Reply

1. User clicks "Generate Reply".
2. Backend sends comment text to LLM.
3. LLM returns generated reply.

---

## Step B – Save Reply to Database

Call saveReply():

Insert into Replies table:
- comment_id
- generated_reply
- posted = false

Update Comments table:
- replied = false

---

## Step C – Return to UI

Frontend displays:
- Editable reply textarea
- Approve button

Replies are now persistent before posting.

---

# 5️⃣ Reply Posting Flow

## Step A – Post to YouTube

1. User clicks "Approve & Post".
2. Backend calls:
   comments.insert

---

## Step B – Update Database

If successful:

Update Replies table:
- posted = true
- posted_at = current timestamp

Update Comments table:
- replied = true

---

### Result

Database tracks:
- Response rate
- Reply timestamps
- Posting history

Enables future analytics.

---

# 6️⃣ Dashboard Rendering Flow

## Before Stage 1

UI directly displayed raw YouTube API responses.

## After Stage 1

Frontend calls:
GET /api/comments?video_id=DB_VIDEO_ID

Backend:
SELECT * FROM Comments
LEFT JOIN Replies

Return structured JSON.

UI renders data strictly from the database.

---

# 7️⃣ Secure Token Storage Flow

1. OAuth token received during login.
2. Encrypt token using AES.
3. Store encrypted token in Users table.
4. Decrypt only inside backend service layer.
5. Never expose tokens to frontend.

Result:
Improved security and production readiness.

---

# 8️⃣ Comment Refresh Flow

When user clicks "Refresh Comments":

1. Fetch latest comments from YouTube.
2. Upsert into database.
3. Re-query updated comments.
4. Return refreshed data to UI.

No duplication.
No data loss.
No direct API rendering.

---

# 🧠 What Is NOT Implemented in Stage 1

Stage 1 does NOT include:

- Intent classification
- Sentiment detection
- Moderation engine
- Priority scoring
- Analytics computation
- Background job processing
- Rate limiting logic

However, database schema includes future-ready fields.

---

# 🗺 Complete Lifecycle Flow Diagram

User Login  
↓  
Save User in DB  
↓  
Fetch Videos  
↓  
Upsert Videos  
↓  
Select Video  
↓  
Fetch Comments from YouTube  
↓  
Upsert Comments into DB  
↓  
Query Comments from DB  
↓  
Generate Reply  
↓  
Save Reply in DB  
↓  
Approve Reply  
↓  
Post to YouTube  
↓  
Update Reply + Comment in DB  

---

# ✅ Definition of Stage 1 Completion

Stage 1 is complete when:

- PostgreSQL is integrated.
- Users persist in database.
- Videos persist in database.
- Comments persist between refreshes.
- Replies persist before posting.
- Posting updates reply status in DB.
- Dashboard renders from DB only.
- OAuth tokens are securely stored.
- No UI dependency on raw YouTube API responses.

---

# 🚀 What Stage 1 Enables

After completion, you can easily implement:

- Intent classification
- Moderation system
- Priority scoring
- Engagement analytics
- Background processing
- Rate limiting
- Top fan recognition

Stage 1 converts the application from:

API Integration Tool  
→  
Data-Driven Backend System

---

End of Stage 1 Flow Documentation
