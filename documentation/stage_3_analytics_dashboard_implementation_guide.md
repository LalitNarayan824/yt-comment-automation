# 🚀 Stage 3: Analytics Dashboard (MVP Implementation Guide)

---

# 🎯 Objective

Build a **professional analytics dashboard** that transforms stored comment data into **actionable insights for YouTube creators**.

This stage converts your system from:

> Data Processing Tool → Insight-Driven Product

---

# 🧠 What You Already Have (Prerequisites)

From Stage 1 & Stage 2:

## Comments Table
- text
- like_count
- intent
- sentiment
- toxicity_score
- moderation_status
- priority_score
- replied
- created_at

## Replies Table
- generated_reply
- posted
- posted_at

---

# 🏗 Tech Stack (MANDATORY)

## UI & Layout
- shadcn/ui
- Tailwind CSS

## Charts
- Recharts

## Backend
- Next.js API Routes
- Prisma + PostgreSQL

---

# 📊 FINAL DASHBOARD STRUCTURE

## Sections

1. Overview KPIs
2. Audience Insights
3. Moderation & Risk
4. Activity Trends
5. Actionable Insights
6. (Optional) Video Performance

---

# 🟢 1. OVERVIEW KPIs

## Metrics to Implement

- Total Comments
- Total Replies Posted
- Reply Rate (%)
- Pending Replies
- Average Response Time

---

## Backend Logic

```ts
const totalComments = await prisma.comment.count({ where: { video_id } });

const totalRepliesPosted = await prisma.reply.count({
  where: { posted: true }
});

const pendingReplies = await prisma.comment.count({
  where: { video_id, replied: false }
});

const replyRate = (totalRepliesPosted / totalComments) * 100;
```

### Avg Response Time

```ts
const responses = await prisma.reply.findMany({
  where: { posted: true },
  include: { comment: true }
});

const avgResponseTime = responses.reduce((acc, r) => {
  return acc + (r.posted_at - r.comment.created_at);
}, 0) / responses.length;
```

---

## UI Implementation

Use **shadcn Card components**

- Horizontal grid (5 cards)
- Add icons + labels

---

# 🧠 2. AUDIENCE INSIGHTS

## Sentiment Distribution

### Query

```ts
const sentimentStats = await prisma.comment.groupBy({
  by: ["sentiment"],
  where: { video_id },
  _count: true
});
```

### UI

- Donut Chart (Recharts)

---

## Intent Breakdown

### Query

```ts
const intentStats = await prisma.comment.groupBy({
  by: ["intent"],
  where: { video_id },
  _count: true
});
```

### UI

- Bar Chart (Recharts)

---

# 🛡️ 3. MODERATION & RISK

## Metrics

- Approved
- Flagged
- Blocked

---

## Query

```ts
const moderationStats = await prisma.comment.groupBy({
  by: ["moderation_status"],
  where: { video_id },
  _count: true
});
```

---

## Derived Metrics

```ts
const spamRate = flagged / totalComments;
const toxicityRate = blocked / totalComments;
```

---

## UI

- Donut / Bar chart for moderation
- Small KPI cards for spam & toxicity rates

---

# 📈 4. ACTIVITY TRENDS

## Metrics

- Comments per day
- Replies per day

---

## Query

```ts
const commentsByDay = await prisma.comment.groupBy({
  by: ["created_at"],
  _count: true
});
```

---

## UI

- Line Chart (Recharts)

---

# ⚡ 5. ACTIONABLE INSIGHTS (MOST IMPORTANT)

## Metrics

### Unanswered Questions

```ts
where intent = "question" AND replied = false
```

### High Priority Pending

```ts
where priority_score > threshold AND replied = false
```

### Ignored Negative Comments

```ts
where sentiment = "negative" AND replied = false
```

---

## UI

Use alert cards:

- ⚠️ Unanswered Questions
- 🔥 High Priority Pending
- 😡 Negative Comments

---

# 🎬 6. VIDEO PERFORMANCE (OPTIONAL)

## Metrics

- Comments per video
- Reply rate per video

---

## Query

```ts
const videoStats = await prisma.video.findMany({
  include: {
    comments: true
  }
});
```

---

## UI

- Table (shadcn)

---

# 📁 API DESIGN ( just an idea for the design )

## Endpoint

```
GET /api/analytics?videoId=
```

---

## Response Structure

```json
{
  "overview": {},
  "sentiment": [],
  "intent": [],
  "moderation": [],
  "activity": {},
  "insights": {}
}
```

---

# 🎨 FRONTEND STRUCTURE

```
/analytics

components/
  KPISection
  SentimentChart
  IntentChart
  ModerationChart
  ActivityChart
  InsightsPanel
```

---

# 🎯 UI LAYOUT

```
[ KPI CARDS ]

[ Sentiment ] [ Intent ]

[ Moderation ] [ Risk KPIs ]

[ Activity Chart ]

[ Insights Panel ]

[ Video Table (Optional) ]
```

---

# 💡 DESIGN PRINCIPLES

- Keep UI clean and minimal
- Avoid too many metrics
- Highlight actionable insights
- Use consistent colors
- use loaders while the data is being fetched

---

# 🚀 Definition of Done

- KPI cards implemented
- Charts rendering correctly
- Insights panel working
- Data fetched from DB
- Clean UI with shadcn

---

# 🎯 Outcome

After this stage:

- Your system becomes a real SaaS-like dashboard
- You can demonstrate data-driven decision making
- Strong portfolio & resume impact

---

# ✅ Summary

You built:

✔ Data persistence
✔ AI intelligence
✔ Analytics dashboard

👉 This completes a full intelligent system pipeline.

