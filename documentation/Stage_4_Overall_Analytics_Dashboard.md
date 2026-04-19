# Stage 4 — Overall Analytics Dashboard + AI Insights

## 🎯 Objective

Build a **channel-level analytics dashboard** that goes beyond simple charts. It must aggregate data across all videos, provide traditional performance metrics, and use an LLM to generate **actionable global summaries and recommendations**. This combines structured data, artificial intelligence, and a clean user experience into a unified Insights page (`/insights`).

---

## 🧠 Core Idea

Instead of just showing raw charts, the goal is to convert analytics into **decision-making insights**:
- **Backend**: Computes structured analytics and trends.
- **LLM**: Interprets the data, detects risks, and generates human-readable recommendations.
- **UI**: Displays both the hard data (KPIs, Charts) and the derived meaning (AI Insights).

The dashboard consists of two primary components:
1. **Analytics Dashboard** (Charts & KPIs)
2. **Global AI Insights System** (Intelligent overlay)

---

## 📊 1. Analytics Dashboard (Part 1)

This section displays aggregated data visually. It calculates metrics across all videos for the authenticated user.

### Key Sections to Implement:

#### A. Global KPIs
- Total Videos, Total Comments, Replies Generated, Replies Posted, Reply Rate, Pending Replies.
- *Insight Value*: Instantly detect low reply rates or large comment backlogs.

#### B. Engagement Trends
- Comments and Replies over time (line charts).
- *Insight Value*: Identify growth vs. decline patterns.

#### C. Sentiment Analysis
- Positive, Negative, and Neutral distributions (pie/donut chart).
- *Insight Value*: Detect shifting audience sentiment and rising negativity.

#### D. Intent Analysis
- Percentage breakdown of Questions, Praise, Criticism, etc.
- *Insight Value*: High question rate = engagement opportunity.

#### E. Moderation Overview
- Spam count, Toxic count, and statuses (Approved / Flagged / Blocked).
- *Insight Value*: Detect spikes in toxicity or spam attacks.

#### F. Performance Metrics
- Average response time, fastest/slowest response.
- *Insight Value*: Monitor community management efficiency.

#### G. Priority System Insights
- Average priority score, percentage of high-priority comments answered.
- *Insight Value*: Ensure VIP/highly important comments are handled promptly.

#### H. Top Videos (Leaderboard)
- Videos ranked by total comments and highest reply rate.
- *Insight Value*: Identify best performing content for future strategy.

#### I. Channel Health Score
- A composite score combining reply rate, sentiment, and moderation health.

---

## 🤖 2. Global AI Insights System (Part 2)

This transforms the platform from an "AI reply tool" into an "AI decision-making engine". 

### 📌 Input Design (LLM-Optimized)
Send signals and percentages, avoiding raw text dumps. The LLM needs context and trends.

```json
{
  "timeRange": "last_7_days",
  "context": {
    "channelSize": "medium", // ( will be calculated based on total subscribers and total comments )
    "contentCategory": "education", // ( will be selected from the dropdown in the dashboard )
    "contentType": "Web Development", // ( will be selected from the dropdown in the dashboard )
    "postingFrequency": "medium", // ( will be calculated based on the number of videos posted in the last 30 days )
    "audienceExpectation": "high interaction" // ( will be selected from the dropdown in the dashboard )
  },
  "engagement": {
    "totalComments": 1240,
    "replyRate": 62.9,
    "pendingReplies": 460,
    "avgLikesPerComment": 5.2,
    "daysSinceLastCheck": 4,
    "previousReplyRate": 60.1 // Pulled from the last Insight checkpoint
  },
  "questions": {
    "total": 400,
    "responseRate": 48.0
  },
  "sentiment": {
    "positivePercent": 58,
    "negativePercent": 18,
    "trend": "negative increasing"
  },
  "intent": {
    "questionsPercent": 32,
    "AppreciationPercent": 40,
    "criticismPercent": 14
    
  },
  "moderation": {
    "allowed": 200,
    "blocked": 140
  }
}
```

### 🧠 Dynamic Context & Checkpoint Trend System
1. **Content Type**: Creator defines their niche (e.g., Programming Tutorials), which maps to categories affecting audience expectation.
2. **Checkpoint Trend System**: Instead of comparing rigid date ranges (like 7 days vs previous 7 days), the system compares the **Live Current Data** against the `inputData` of the **last generated Insight** stored in the database.
   - If the creator checks the dashboard 3 days after their last insight, the trend shows growth over those 3 days.
   - We pass `daysSinceLastCheck` and previous baseline numbers directly to the LLM so it understands exactly what has changed since the creator last looked.

### 🤖 LLM Prompt Design
The LLM evaluates engagement health, identifies missed opportunities (e.g., unanswered questions), detects sentiment risks, and suggests improvements.

**Output Structure Requested:**
- **Vibe Check**: A single status flag (🔥 Excellent, 🟢 Good, ⚠️ Needs Attention, 🚨 Critical) for an instant visual health check.
- **Summary**: 2-3 line overview.
- **Key Insights**: 3-5 bullet points.
- **Risks**: 2-4 bullet points.
- **Opportunities**: 2-4 bullet points.
- **Recommendations**: 3-5 highly actionable bullet points.
- **Action Links**: Suggested UI filters/actions to apply (e.g., "intent:question" if there is a spike in questions) to close the loop between the insight and user action.

---

## 🏗 Architecture & Implementation Details

### Database (Prisma)
Create an `Insight` table for caching AI analyses (LLM calls are expensive/slow):

```prisma
model Insight {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  scope        String   // "global" or "video"
  scopeId      String?  @map("scope_id")
  timeRange    String   @map("time_range")
  inputData    Json     @map("input_data")
  outputData   Json     @map("output_data")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, scope, timeRange])
  @@map("insights")
}
```

### Backend Flow (`GET /api/insights/`)
1. **Fetch Last Checkpoint**: Query `Insight` table for the last entry by this user.
 * when creating insight table , we will seed a starting entry with 0 values for all metrics. *
2. **Compute Live Metrics**: Aggregate counts from `Video`, `Comment`, and `Reply` tables.
3. **Compute Trends**: Compare Live Metrics against the `inputData` from the Last Checkpoint.
4. **Build Context**: Assemble the JSON schema input.
5. **Call LLM**: Send structure to Groq/OpenAI.
6. **Store**: Save new `Insight` to DB.
7. **Respond**: Return AI output and raw metric aggregations to the frontend.

### Frontend UI Layout (`/insights`)
- **[Top]** AI Insights Panel (Vibe Check Emoji, Summary, Risks, Recommendations, Actionable Shortcut Buttons).
- **[Below]** Grid of global KPIs.
- **[Middle]** Charts: Engagement trends (line), Sentiment & Intent (pie/bar).
- **[Bottom]** Moderation overview, priority handling ratios, and Top Videos leaderboard.

---

## 🚀 Outcome
Completing this stage results in an **AI-powered YouTube Analytics & Decision Platform**, providing creators with structured data pipelines, context-aware reasoning, and persistent intelligence storage to actively grow their community.

## 🔮 Future Enhancements
- **Automated Weekly Digest**: Leverage the backend aggregation and LLM summarization to run via a CRON job every week, automatically emailing the generated AI Insights digest directly to the creator.

- **A global search page with all the filters to find specific comments** : users will be able to search comments based on the filters like video id , sentiment , intent , spam , toxic , isReplied . This will help in making action links from the insights we get from a analysis more easier and efficient.

## 🛠 Implementation Sequence

To build this feature, follow these steps in order:

1. **Database Update:** 
   - Add the `Insight` model to `prisma/schema.prisma`.
   - update this in user table -> 
    "contentCategory": "education",
    "contentType": "Web Development",
    "postingFrequency": "medium",
    "audienceExpectation": "high interaction"
    and show these values in dashboard and give a option in the dashboard to update these values
   - Run `npx prisma db push` (ensure a default 0-value baseline row is seeded for the user).
2. **Backend - Analytics Service:**
   - Create `analytics.service.ts` to compute live KPIs (total comments, reply rate, intent %, sentiment %) from existing tables.
3. **Backend - AI Insights Engine:**
   - Create `insights.service.ts`.
   - Implement the `buildContext` logic.
   - Implement the Checkpoint Trend calculation (comparing live data vs `inputData` from the last `Insight` row).
   - Write the LLM integration (Groq) using the defined prompt structure.
4. **Backend - API Route:**
   - Create the `GET /api/insights/` endpoint to orchestrate metrics computation, LLM calling, and DB saving.
5. **Frontend - UI Foundation:**
   - Create the new `/dashboard/insights/page.tsx` view.
   - Install/setup visualization libraries (e.g., `recharts`) and necessary UI components.
6. **Frontend - Component Integration:**
   - Build the KPI grid, trend charts, and moderation overviews based on the raw metrics.
   - Build the AI Insights Panel at the top (with Vibe Check, Summary, and Action Links).
7. **Testing & Polish:**
   - Verify empty states, loading skeletons, and mathematical edge cases (e.g., preventing division by zero).