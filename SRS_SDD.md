# AI-Assisted YouTube Comment Reply System

## Phase 1 -- Next.js Implementation

------------------------------------------------------------------------

# 📘 Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose

The purpose of this system is to build a web-based AI-assisted tool
that:

-   Fetches comments from a specified YouTube video\
-   Generates AI-powered replies\
-   Allows user review and editing\
-   Posts approved replies directly to YouTube

The system will be implemented using Next.js as a full-stack framework.

------------------------------------------------------------------------

### 1.2 Scope

The system will:

-   Authenticate users using Google OAuth 2.0\
-   Retrieve YouTube comments via YouTube Data API v3\
-   Generate contextual replies using GPT-4o\
-   Provide a review interface for editing replies\
-   Post approved replies to YouTube

This Phase 1 version will NOT include:

-   Intent classification\
-   Spam detection\
-   Batch background processing\
-   Persona customization\
-   Database persistence

------------------------------------------------------------------------

## 2. Overall Description

### 2.1 Product Perspective

The system acts as a middleware between:

-   YouTube platform\
-   AI language model\
-   Content creator

### System Architecture Overview

User → Next.js UI → API Routes → (YouTube API / OpenAI API) → Response →
UI

------------------------------------------------------------------------

### 2.2 User Characteristics

Target users:

-   YouTube content creators\
-   Social media managers\
-   Small content teams

Users are expected to:

-   Know their YouTube video ID\
-   Authenticate with Google\
-   Review replies before posting

------------------------------------------------------------------------

## 3. Functional Requirements

### FR-1: Authentication

-   The system shall authenticate users via Google OAuth 2.0.
-   The system shall request permission to manage YouTube comments.
-   The system shall securely store access tokens in session memory.

Required Scope: https://www.googleapis.com/auth/youtube.force-ssl

------------------------------------------------------------------------

### FR-2: Fetch Comments

-   The user shall input a YouTube video ID.
-   The system shall retrieve top-level comments for that video.
-   The system shall display:
    -   Comment author
    -   Comment text
    -   Comment ID

------------------------------------------------------------------------

### FR-3: Generate AI Reply

-   The user shall request AI-generated replies.
-   The system shall send comment text to GPT-4o.
-   The system shall receive and display generated replies.
-   Replies shall be editable before posting.

------------------------------------------------------------------------

### FR-4: Post Reply

-   The user shall approve a reply.
-   The system shall post the reply under the correct parent comment.
-   The system shall confirm successful posting.

------------------------------------------------------------------------

## 4. Non-Functional Requirements

### NFR-1: Performance

-   Comment fetching ≤ 3 seconds.
-   AI reply generation ≤ 5 seconds.
-   UI interactions should feel responsive.

------------------------------------------------------------------------

### NFR-2: Security

-   OAuth tokens shall not be exposed to frontend.
-   API keys shall be stored in environment variables.
-   Secure HTTPS communication shall be enforced.

------------------------------------------------------------------------

### NFR-3: Usability

-   The interface shall be minimal and intuitive.
-   Users must be able to edit AI replies before posting.

------------------------------------------------------------------------

### NFR-4: Reliability

The system shall handle:

-   Expired tokens
-   API quota limits
-   Network failures
-   Duplicate posting attempts

------------------------------------------------------------------------

# 📗 Software Design Document (SDD)

## 1. System Architecture

The application uses full-stack Next.js architecture.

### High-Level Architecture

Frontend UI → Next.js API Routes → External Services (YouTube API,
GPT-4o API)

------------------------------------------------------------------------

## 2. Module Design

### 2.1 Authentication Module

Endpoint: /api/auth

Responsibilities:

-   Redirect user to Google OAuth login
-   Handle OAuth callback
-   Store access token securely in session

------------------------------------------------------------------------

### 2.2 Comment Fetch Module

Endpoint: /api/comments

Flow:

1.  Receive video ID
2.  Call commentThreads.list
3.  Extract comment ID, author, text
4.  Return structured JSON

Response Structure:

\[ { "comment_id": "123", "author": "User123", "text": "Great video!"
}\]

------------------------------------------------------------------------

### 2.3 AI Reply Generation Module

Endpoint: /api/generate

Flow:

1.  Receive comment text
2.  Construct prompt
3.  Send to GPT-4o
4.  Return generated reply

Prompt Template:

Reply politely and professionally to this YouTube comment. Keep it under
2 sentences.

Comment: {comment_text}

------------------------------------------------------------------------

### 2.4 Reply Posting Module

Endpoint: /api/post

Flow:

1.  Receive parent comment ID
2.  Call comments.insert
3.  Return success status

Payload Example:

{ "snippet": { "parentId": "COMMENT_ID", "textOriginal": "Generated
reply here" } }

------------------------------------------------------------------------

## 3. Frontend Design

### Pages

-   /login
-   /dashboard

------------------------------------------------------------------------

### Dashboard Components

-   Video ID input field
-   Fetch Comments button
-   Comment cards

Each comment card contains:

-   Original comment text
-   "Generate Reply" button
-   Editable reply textarea
-   "Approve & Post" button

------------------------------------------------------------------------

## 4. Data Flow

User Login → Enter Video ID → Fetch Comments → Generate Reply → Edit →
Approve → Post Reply

------------------------------------------------------------------------

## 5. Environment Variables

GOOGLE_CLIENT_ID= GOOGLE_CLIENT_SECRET= OPENAI_API_KEY= NEXTAUTH_SECRET=

------------------------------------------------------------------------

## 6. Error Handling Strategy

The system shall handle:

-   401 Unauthorized (expired token)
-   403 Quota exceeded
-   500 Internal API errors
-   Network timeouts
-   Duplicate reply attempts

User-friendly error messages shall be displayed.

------------------------------------------------------------------------

# 🎯 Phase 1 Deliverable

Upon completion, the system shall:

-   Authenticate users via Google
-   Fetch real YouTube comments
-   Generate AI-powered replies
-   Allow manual editing
-   Post approved replies to YouTube

This represents a functional, real-world AI automation system suitable
for portfolio and resume inclusion.



## PHASE 1 IMPLEMENTATION

# STEP 1 — Set Up Google Cloud + YouTube API
1️⃣ Create Project

Go to:
👉 https://console.cloud.google.com/

Create new project

Enable YouTube Data API

Go to Credentials → Create OAuth 2.0 Client ID

2️⃣ OAuth Settings

App Type: Web Application

Add redirect URI:

http://localhost:3000/api/auth/callback/google

Download:

Client ID

Client Secret

# STEP 2 — Implement Authentication in Next.js

Use NextAuth.js

Install:

npm install next-auth

Create:

/app/api/auth/[...nextauth]/route.ts

Configure Google Provider with:

clientId

clientSecret

scopes:

https://www.googleapis.com/auth/youtube.force-ssl

This allows:

Reading comments

Posting replies

Now test:
Login → You should get Google OAuth popup.

If login works → Phase 1 backend has officially started 💪

# STEP 3 — Fetch Comments from YouTube

Create:

/app/api/comments/route.ts

Use Google access token from session.

Call:

GET https://www.googleapis.com/youtube/v3/commentThreads

Parameters:

part=snippet

videoId=YOUR_VIDEO_ID

maxResults=20

Return comments to frontend.

Now your UI should show:
✔ Comment text
✔ Author
✔ Comment ID

# STEP 4 — Integrate AI Reply Generation

Create:

/app/api/generate-reply/route.ts

Inside:

Take comment text

Send to GPT model

Return reply

You can use:

GPT-4o (OpenAI)

Or local LLM later

Basic flow:

User comment → API route → LLM → Generated reply → UI

Add tone parameter:

friendly

professional

humorous

Prompt example:

You are a YouTube creator.
Reply in a friendly tone to this comment:
"{comment}"

Now UI can show:
💬 Comment
🤖 Suggested Reply

# STEP 5 — Post Reply to YouTube

Create:

/app/api/post-reply/route.ts

Use:

POST https://www.googleapis.com/youtube/v3/comments

Body:

{
  snippet: {
    parentId: "COMMENT_ID",
    textOriginal: "Generated reply"
  }
}

Now:
Comment → AI Reply → Approve → Post

🔥 That completes Phase 1 core functionality.

# STEP 6 — Add Review Layer (Important)

Before posting:

Add “Approve” button

Add “Edit” option

Add “Reject”

This makes it:
✔ AI-assisted
✔ Human-in-the-loop
✔ Resume-worthy

# STEP 7 — Secure Everything

Very important:

Store API keys in .env

Never expose OpenAI key in frontend

Handle expired tokens

Add loading states

Add error handling

Recommended Backend Structure (Next.js App Router)
app/
 ├── api/
 │    ├── auth/
 │    ├── comments/
 │    ├── generate-reply/
 │    └── post-reply/
 ├── dashboard/
 └── page.tsx
What You’ll Have After This

A working system that:

✔ Logs into YouTube
✔ Fetches comments
✔ Generates AI replies
✔ Allows editing
✔ Posts replies

That is NOT a beginner project anymore.
That’s a real SaaS-style product architecture.
