# CommentAI — AI-Powered YouTube Comment Management Platform

<p align="center">
  <strong>Transform how you manage your YouTube community.</strong><br/>
  An intelligent, full-stack platform that automates comment analysis, generates contextual AI replies,
  and delivers actionable channel insights — all from a single dashboard.
</p>

---

##  Key Features

###  Smart Comment Management
- **Automated Analysis Pipeline** — Every comment is automatically classified by **sentiment** (positive / negative / neutral), **intent** (question / appreciation / criticism), **toxicity**, and **spam** using our dedicated ML service.
- **Priority Scoring** — A composite priority score surfaces the comments that matter most, so you never miss a critical question or a high-engagement opportunity.
- **Moderation Engine** — Toxic and spam comments are auto-flagged. Review and manage moderation status across all your videos.

###  AI-Powered Reply Generation
- **Context-Aware Replies** — Replies are generated using **Groq LLM (Llama 3)**, informed by the video's summary, creator context, comment sentiment, and intent.
- **Persona System** — Create and manage multiple reply personas (tone, emoji style, vocabulary rules, catchphrases, forbidden words). Switch personas per reply.
- **Review → Edit → Post** — Every AI-generated reply goes through a human-in-the-loop review before being posted directly to YouTube via the Data API.

###  Channel Analytics Dashboard
- **Per-Video Analytics** — Sentiment distribution, intent breakdown, comment activity timelines, and moderation stats per video.
- **Global Channel Analytics** — Aggregated KPIs across all videos: total comments, reply rate, health score, engagement trends, top videos leaderboard, and more.

###  AI Insights Engine
- **Checkpoint-Based Trend System** — Instead of rigid time windows, the system compares live metrics against the last saved insight to detect meaningful changes.
- **LLM-Generated Analysis** — Groq generates structured insights including a **Vibe Check**, summary, key insights, risks, opportunities, actionable recommendations, and quick-action links.
- **Creator Context** — Configure your content category, content type, and audience expectation so the AI tailors its analysis to your channel's niche.

###  Global Comment Search
- **Multi-Filter Search** — Find any comment across all your videos by combining filters: video, sentiment, intent, spam, toxic, reply status, and free-text search.
- **Deep-Linked from Insights** — Action buttons from the AI Insights panel link directly to pre-filtered search results, making it effortless to act on recommendations.

###  Security & Auth
- **OAuth 2.0** — Secure Google login with YouTube Data API v3 scopes.
- **Server-Side Tokens** — Access and refresh tokens are encrypted and stored server-side via NextAuth. Sensitive keys never reach the browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + [Prisma ORM](https://www.prisma.io/) |
| **Auth** | [NextAuth.js](https://next-auth.js.org/) (Google OAuth 2.0) |
| **AI / LLM** | [Groq Cloud](https://console.groq.com/) (Llama 3.3 70B) |
| **ML Service** | Custom sentiment, intent & toxicity analysis endpoint |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |

---

## Project Structure

```
yt-comment-automation/
├── prisma/
│   └── schema.prisma              # Data models: User, Video, Comment, Reply, Persona, Insight
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # NextAuth config (Google OAuth)
│   │   │   ├── channel/           # YouTube channel data
│   │   │   ├── videos/            # Video CRUD + context & AI summary
│   │   │   ├── comments/          # Comment sync + global search API
│   │   │   ├── generate-reply/    # Groq-powered reply generation
│   │   │   ├── post-reply/        # Post reply to YouTube
│   │   │   ├── analytics/         # Per-video analytics
│   │   │   ├── insights/          # Global AI insights engine
│   │   │   ├── personas/          # Persona CRUD
│   │   │   └── user/settings/     # Creator context settings
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Main dashboard (channel + video grid)
│   │   │   ├── video/[videoId]/   # Comment management per video
│   │   │   ├── insights/          # AI insights + channel analytics
│   │   │   ├── search/            # Global comment search with filters
│   │   │   └── personas/          # Persona management
│   │   ├── analytics/             # Per-video analytics page
│   │   └── login/                 # Login page
│   ├── lib/
│   │   ├── services/              # Business logic layer
│   │   │   ├── comment.service    # Comment sync, analysis, priority
│   │   │   ├── analytics.service  # Global KPI aggregation
│   │   │   ├── insights.service   # Checkpoint trends + LLM integration
│   │   │   ├── ai-analysis.service# ML batch analysis
│   │   │   ├── moderation.service # Auto-moderation rules
│   │   │   ├── context.service    # Video context + AI summary
│   │   │   ├── reply.service      # Reply persistence
│   │   │   ├── persona.service    # Persona CRUD
│   │   │   ├── user.service       # User management
│   │   │   └── video.service      # Video persistence
│   │   └── db.ts                  # Prisma client singleton
│   ├── store/                     # Zustand stores
│   └── types/                     # Shared TypeScript types
└── documentation/                 # Feature specs & stage docs
```

---

##  Data Model

```
User ──┬── Video ──── Comment ──── Reply
       ├── Persona
       └── Insight (checkpoint system)
```

| Model | Purpose |
|---|---|
| **User** | Google-authed creator with content context settings |
| **Video** | Synced YouTube videos with AI summary & creator notes |
| **Comment** | Comments with sentiment, intent, toxicity, spam, priority, and moderation |
| **Reply** | AI-generated replies with edit tracking and post status |
| **Persona** | Configurable reply personalities (tone, emoji, vocabulary) |
| **Insight** | Saved AI analysis checkpoints for trend comparison |

---

##  Getting Started

### Prerequisites

1. **Google Cloud Console**
   - Create a project and enable the **YouTube Data API v3**
   - Set up OAuth consent screen
   - Create an **OAuth 2.0 Client ID** (Web application)
   - Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
2. **Groq Account** — Generate an API key at [console.groq.com](https://console.groq.com/)
3. **PostgreSQL** — A running PostgreSQL instance (local or hosted)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd yt-comment-automation

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_random_secret    # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# AI
GROQ_API_KEY=your_groq_api_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yt_comment_automation

# ML Service
ML_SERVICE_KEY= your ml service key
ML_SERVICE_URL= your ml service url
```

### Database Setup

```bash
# Push schema to your database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your Google / YouTube account.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Frontend   │────▶│  Next.js API      │────▶│  PostgreSQL   │
│  (React 19)  │     │  Routes (Server)  │     │  (Prisma ORM) │
└──────────────┘     └────────┬─────────┘     └───────────────┘
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
              ┌──────────┐ ┌─────┐ ┌──────────┐
              │ YouTube  │ │Groq │ │ ML       │
              │ Data API │ │ LLM │ │ Service  │
              └──────────┘ └─────┘ └──────────┘
```

- **YouTube Data API** — Channel info, video list, comment sync, reply posting
- **Groq LLM** — Reply generation (context-aware) + channel insights analysis
- **ML Service** — Batch sentiment, intent, spam, and toxicity classification

---

## Upcoming Improvements and Features

- Better UI and UX 
- Making it more modular
- Upgrading to microservices architecture
- Improving the persona feature for better reply generation
- Adding more analytics and insights
- Adding more moderation features
- Making the ML service more efficient and accurate for spam and toxicity detection, and improving the accuracy of intent and sentiment detection
- Adding better channel context features 
- Adding more comment automation scope 
- Integrating Instagram comment automation
- Adding recommended posts from videos feature
- Integrating weekly insights and analytics via email using cron jobs


## Check out the Comment Processing Service at [Comment Processing Service](https://github.com/LalitNarayan824/comment_processing_ml_service)

## Please star the repository if you find it useful