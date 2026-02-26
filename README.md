# AI-Assisted YouTube Comment Reply System

A full-stack Next.js web application designed to help YouTube creators efficiently manage their engagement. This system connects to your YouTube account, fetches recent comments on your videos, and leverages powerful AI models to generate contextual, tone-adjustable replies that you can review, edit, and post directly back to YouTube.

## Features

- **OAuth 2.0 Authentication**: Secure login via Google, accessing YouTube Data API v3.
- **Channel Dashboard**: View your channel statistics and recently uploaded videos.
- **Comment Fetching**: Retrieve the latest top-level comments for any of your videos.
- **AI-Powered Replies**: Automatically generate context-aware replies using the **Groq API (Llama 3)**.
- **Tone Adjustment**: Choose between *Friendly*, *Professional*, or *Humorous* tones for the AI-generated responses.
- **Review & Post Interface**: Edit AI suggestions before approving and posting them directly to YouTube.
- **Rate-Limit Handling**: Built-in exponential backoff for external API calls to ensure reliability.

## Tech Stack

- **Frontend/Backend**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **APIs**:
  - [YouTube Data API v3](https://developers.google.com/youtube/v3)
  - [Groq Cloud SDK](https://console.groq.com/)

---

## Getting Started

### Prerequisites

1. **Google Cloud Console**
   - Create a Google Cloud Project.
   - Enable the **YouTube Data API v3**.
   - Set up the OAuth consent screen.
   - Create an **OAuth 2.0 Client ID** (Web application). Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
2. **Groq Account**
   - Create an account on Groq Cloud and generate an API key.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd yt-comment-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   NEXTAUTH_SECRET=your_generated_random_secret_string
   NEXTAUTH_URL=http://localhost:3000
   
   GROQ_API_KEY=your_groq_api_key
   ```
   *Note: You can generate a random string for `NEXTAUTH_SECRET` using `openssl rand -base64 32`.*

4. Run the Development Server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---

## Directory Structure

```plaintext
yt-comment-automation/
├── .env.local                   # Environment Variables
├── SRS_SDD.md                 # System Requirements and Design Documentation
├── src/
│   ├── app/
│   │   ├── api/                 # Next.js API Routes (Backend logic)
│   │   │   ├── auth/[...nextauth]/route.js       # NextAuth.js Configuration
│   │   │   ├── channel/route.js                  # YouTube Channel Data
│   │   │   ├── videos/route.js                   # YouTube Video Data
│   │   │   ├── comments/route.js                 # YouTube Comment Fetch
│   │   │   ├── generate-reply/route.js           # Groq AI Reply Generation
│   │   │   └── post-reply/route.js               # YouTube Reply Post Action
│   │   ├── dashboard/           # Authenticated Views
│   │   │   ├── page.js          # Main Dashboard (Channel info, Video Grid)
│   │   │   └── video/[videoId]/page.js           # Video Comments interface
│   │   ├── login/page.js        # Login Screen
│   │   ├── globals.css          # Tailwind & custom CSS themes
│   │   ├── layout.js            # Root Layout
│   │   └── providers.js         # NextAuth Providers wrap
```

## Security

- OAuth tokens (Access tokens) are stored securely in the server-side NextAuth session.
- AI logic and YouTube Data API logic happen securely within backend API Routes (`/api/...`), so sensitive API keys and tokens are never exposed to the client-side browser bundle.

## License

MIT
