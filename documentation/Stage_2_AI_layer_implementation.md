# Stage 2: AI Intelligence Layer (Phased Implementation)

## Overview

Stage 2 transforms raw YouTube comments into intelligent, contextual, and personalized replies.

---

############################################################# Phase 1: Comment Analysis System

## 🎯 Objective

The goal of this phase is to transform raw YouTube comments into structured, meaningful data that can be used for intelligent decision-making.

For every comment, we extract:

- **Intent** → What the user is trying to do (question, appreciation, complaint, etc.)
- **Sentiment** → Emotional tone (positive, negative, neutral)
- **Toxicity** → Whether the comment is harmful or offensive

This forms the **foundation of the entire AI system**, as all later stages (moderation, prioritization, reply generation) depend on this data.

---

## 🧩 Database Changes

Extend the existing `Comment` model with the following fields:

```prisma
intent           String?
sentiment        String?
toxicityScore    Float?   @map("toxicity_score")
isAnalyzed       Boolean  @default(false) @map("is_analyzed")
analyzedAt       DateTime? @map("analyzed_at") // optional but recommended

## 🔍 Field Explanation

intent
Stores the classified intent of the comment
Example values:

"question"

"appreciation"

"complaint"

"spam"

sentiment
Represents the emotional tone
Example values:

"positive"

"negative"

"neutral"

toxicityScore
A float value between 0 and 1 indicating how toxic the comment is
Example:

0.1 → safe

0.8 → highly toxic

isAnalyzed
Boolean flag to ensure each comment is processed only once

analyzedAt (optional)
Timestamp for debugging, analytics, and future reprocessing

immediately save comments

await prisma.comment.create({
  data: {
    youtubeCommentId,
    text,
    authorName,
    videoId,
    publishedAt
  }
});

for each unprocessed comment

if (!comment.isAnalyzed) {
  const result = await analyzeComment(comment.text);

  await prisma.comment.update({
    where: { id: comment.id },
    data: {
      intent: result.intent,
      sentiment: result.sentiment,
      isToxic: result.isToxic,
      isAnalyzed: true,
      analyzedAt: new Date()
    }
  });
}

a resusable function

async function analyzeComment(text: string) {
  const prompt = `
  Analyze the following YouTube comment and return:
  - intent (question, appreciation, complaint, spam, other)
  - sentiment (positive, negative, neutral)
  - toxicity score (0 to 1)

  Comment: "${text}"
  `;

  const response = await llm.generate(prompt);

  return parseResponse(response);
}

flow :

1. Fetch comments from YouTube API
2. Store comments in database (raw)
3. Check if comment.isAnalyzed == false
4. Run AI analysis
5. Update comment with:
   - intent
   - sentiment
   - isToxic
   - isAnalyzed = true
6. Use this data in later stages


⚠️ Edge Cases
1. AI Failure

Do not set isAnalyzed = true

Retry later

2. Partial Data

Avoid saving incomplete results

Only update when all fields are available

3. Duplicate Comments

Prevent using youtubeCommentId as unique key

🧠 Output Example
Input:
"Why didn’t you explain this part clearly?"
Output:
{
  "intent": "question",
  "sentiment": "negative",
  "isToxic": false
}
🚀 Outcome of Phase 1

After completing this phase:

Every comment is structured and machine-readable

System can:

Understand user intent

Detect tone

Identify harmful content

This enables:

Moderation (Phase 2)

Smart replies (later phases)

Priority scoring

🔑 Key Principle

"Analyze once, reuse everywhere"

This ensures:

Low cost

High performance

Scalable architecture

---

############################################################################# Phase 2: Moderation Engine

📘 Stage 2 — Phase 2: Moderation Engine
🎯 Objective

Filter harmful, spam, or low-quality comments before reply generation to ensure:

Safe interactions

No engagement with spam/abuse

Better brand reputation

Efficient resource usage (avoid wasting LLM calls)

🧠 Core Logic
IF toxicity_score > threshold → BLOCK (hidden)
ELSE IF spam_detected → FLAG (no reply)
ELSE → APPROVE (send to reply system)
⚙️ Features to Implement
1️⃣ Toxicity Detection
What it does:

Detects abusive / harmful / offensive comments

Output:

toxicity_score → (0 to 1)

Example:
Comment	Score
"Nice video!"	0.02
"You're stupid"	0.85
Decision:

If score > 0.7 → BLOCK

2️⃣ Spam Detection
What it does:

Detects:

Repeated messages

Links (http, www)

Promo phrases ("subscribe", "check my channel")

Bot-like comments

Output:

is_spam → boolean

3️⃣ Moderation Status System

Each comment gets a status:

approved → safe for reply

flagged → spam (manual review)

blocked → toxic (hidden / ignored)

🗄 Database Changes

(You already partially added these in Stage 1 — now you will USE them)

Comments Table Fields
toxicity_score   Float
is_spam          Boolean
moderation_status String // pending | approved | flagged | blocked
is_moderated     Boolean // NEW
Default Values
is_spam = false
moderation_status = "pending"
is_moderated = false
🔧 What You Need to Implement
1️⃣ Moderation Service

Create:

/lib/services/moderation.service.ts
2️⃣ Main Function
async function moderateComment(comment) {
  const toxicity = await getToxicityScore(comment.text);
  const spam = detectSpam(comment.text);

  let status = "approved";

  if (toxicity > 0.7) {
    status = "blocked";
  } else if (spam) {
    status = "flagged";
  }

  return {
    toxicity_score: toxicity,
    is_spam: spam,
    moderation_status: status,
    is_moderated: true
  };
}
3️⃣ Toxicity Detection Implementation
Option A (Recommended)

Use LLM:

Prompt:
Classify toxicity from 0 to 1:

Comment: "{text}"

Return JSON:
{ "toxicity": number }
Option B (Faster / Cheap Hybrid)

Use keyword list + LLM fallback

badWords = ["idiot", "stupid", "hate", "kill"]

if (contains badWords) → high toxicity
else → LLM check
4️⃣ Spam Detection Implementation
Rule-Based (Must Have)
function detectSpam(text) {
  if (text.includes("http")) return true;
  if (text.includes("www")) return true;
  if (text.match(/subscribe|check my channel/i)) return true;
  if (text.length < 3) return true;
  return false;
}
Advanced (Optional Later)

Repeated comments by same author

Same text across videos

Frequency-based detection

5️⃣ Update Comment in DB

Inside your comment service:

await prisma.comment.update({
  where: { id: commentId },
  data: moderationResult
});
🔄 Full Flow (VERY IMPORTANT)
🧩 End-to-End Pipeline
1. Fetch Comments (YouTube API)
2. Save to DB
3. FOR EACH comment:
      ↓
   Run Moderation Engine
      ↓
   Update DB with:
      - toxicity_score
      - is_spam
      - moderation_status
      - is_moderated = true
      ↓
4. Filter comments:
      - approved → send to reply generator
      - flagged → show in dashboard (review)
      - blocked → ignore or hide
🔥 Optimized Flow (Production)

Use background jobs:

Fetch → Store → Queue Job

Worker:
   → Moderate
   → Update DB

This avoids blocking UI.

🖥 UI Changes
Dashboard Filters

Add tabs:

✅ Approved Comments

⚠️ Flagged (Spam)

❌ Blocked (Toxic)

Comment Card UI

Show:

Toxicity Score (0–1)

Spam Badge

Moderation Status

Example:

[Comment Text]

Toxicity: 0.82 ❌
Status: BLOCKED
🚫 What NOT to Do

❌ Don’t generate replies for spam/toxic comments

❌ Don’t call LLM unnecessarily (cost issue)

❌ Don’t block UI during moderation

⚡ Edge Cases to Handle

Empty comments

Emojis only

Mixed language comments

False positives (manual override later)

API failures (fallback to safe mode)



🚀 Definition of Done

Phase 2 is complete when:

 All comments are moderated automatically

 DB updated with moderation fields

 Toxic comments are blocked

 Spam comments are flagged

 Only approved comments go to reply system

 UI reflects moderation status

---

################################################################################ Phase 3: Persona System

Phase 3: Persona System
🎯 Objective

Allow users (creators) to define how AI replies should sound.

This ensures:

Brand consistency

Personalized communication

Non-generic AI replies

🧠 Core Idea

Instead of:

"Reply politely to this comment"

You move to:

"You are a YouTuber with a friendly, energetic tone, who uses emojis and casual language..."

👉 Persona = identity + tone + style rules

⚙️ Features to Implement
1️⃣ Create Persona

Users can define:

Tone (friendly / professional / humorous)

Emoji style (none / light / heavy)

Vocabulary rules

Catchphrases

Forbidden words

2️⃣ Select Default Persona

Each user can have multiple personas

One persona is marked as default

Used automatically during reply generation

3️⃣ Use Persona in Reply Generation

Persona is injected into the LLM prompt

Controls:

Tone

Word choice

Style

Personality

🗄 Database Design

(Already created in Stage 1 — now fully used)

Persona Table
id                String (UUID)
user_id           String
name              String
tone              String
emoji_style       String
vocabulary_rules  String
catchphrases      String
forbidden_words   String
is_default        Boolean  // NEW
created_at        DateTime
🆕 Required Change

Add:

is_default Boolean @default(false)

👉 Ensures only ONE default persona per user

🔧 What You Need to Implement
1️⃣ Persona Service

Create:

/lib/services/persona.service.ts
2️⃣ Core Functions
Create Persona
async function createPersona(userId, data) {
  return prisma.persona.create({
    data: {
      user_id: userId,
      ...data
    }
  });
}
Get Default Persona
async function getDefaultPersona(userId) {
  return prisma.persona.findFirst({
    where: {
      user_id: userId,
      is_default: true
    }
  });
}
Set Default Persona
async function setDefaultPersona(userId, personaId) {
  await prisma.persona.updateMany({
    where: { user_id: userId },
    data: { is_default: false }
  });

  return prisma.persona.update({
    where: { id: personaId },
    data: { is_default: true }
  });
}
Get All Personas
async function getPersonas(userId) {
  return prisma.persona.findMany({
    where: { user_id: userId }
  });
}
🤖 Persona → Prompt Injection
Prompt Builder Function
function buildPersonaPrompt(persona, comment) {
  return `
You are a YouTube creator.

Tone: ${persona.tone}
Emoji Style: ${persona.emoji_style}

Rules:
${persona.vocabulary_rules}

Catchphrases:
${persona.catchphrases}

Avoid:
${persona.forbidden_words}

Reply to this comment:
"${comment}"
`;
}
🔥 Example
Persona:

Tone: Friendly

Emoji: Light

Catchphrase: "Appreciate it!"

Output:
"Thanks a lot! Really appreciate it 😊"
🔄 Full Flow
🧩 End-to-End Persona Flow
1. User creates persona
2. User selects default persona
3. Comment is approved (from moderation phase)
4. Before reply generation:
      ↓
   Fetch default persona
      ↓
   Build prompt using persona
      ↓
   Send to LLM
      ↓
   Generate reply
      ↓
   Save reply in DB
🔗 Integration with Existing System
Updated Reply Flow
Fetch Comment
   ↓
Moderation Check
   ↓
IF approved:
   ↓
Get Persona
   ↓
Generate Reply (persona-based)
   ↓
Save Reply
🖥 UI Changes
Persona Dashboard
Features:

➕ Create Persona

📋 List Personas

⭐ Set Default

✏️ Edit Persona

🗑 Delete Persona

Persona Form Fields

name (text)
Tone (dropdown)

Emoji Style (dropdown)

Vocabulary Rules (textarea)

Catchphrases (textarea)

Forbidden Words (textarea)

Example UI
Persona: Friendly Creator

Tone: Friendly
Emoji: Light 😊
Catchphrase: "Appreciate it!"
Forbidden: "bro", "dude"

[Set as Default]
[Edit]
🚫 What NOT to Do

❌ Don’t hardcode tone in prompts anymore

❌ Don’t skip persona fetching

❌ Don’t allow multiple default personas

⚡ Edge Cases

No persona exists → use fallback default

Multiple personas marked default → fix via updateMany

Empty fields → handle gracefully

Very long persona → truncate before sending to LLM

🧪 Testing Strategy
Test Personas
Friendly

Output should be casual + warm

Professional

Output should be formal

Humorous

Output should include light humor

🚀 Definition of Done

Phase 3 is complete when:

 Users can create personas

 Users can set a default persona

 Persona is stored in DB

 Persona is injected into LLM prompt

 Replies reflect persona style

 UI supports persona management

---

################################################################################# Phase 4: Context Engine

Phase 4: Context Engine
🎯 Objective

Improve AI reply quality by providing relevant context about the video and creator.

This ensures:

More accurate replies

Less generic responses

Better audience engagement

Context-aware conversations

🧠 Core Idea

Instead of replying like this:

"Thanks for your comment!"

You move to:

"Glad you found the React optimization tips helpful! 🚀"

👉 Difference = Context Awareness

📚 Context Sources
1️⃣ Video Title

Helps understand topic

Example:

"React Performance Optimization Guide"

2️⃣ Video Description

Contains detailed explanation of content

May include links, topics, chapters

3️⃣ AI-Generated Summary

Condensed version of video content

Most important for LLM understanding

4️⃣ Creator Input (Manual Context)

Custom notes from creator

Example:

"This video targets beginners"

"Focus on performance tips"

🗄 Database Changes
🆕 Add Fields to Videos Table
description        String
ai_summary         String
creator_context    String
context_updated_at DateTime
Optional Optimization
summary_generated Boolean @default(false)
🔧 What You Need to Implement
1️⃣ Context Service

Create:

/lib/services/context.service.ts
2️⃣ Core Functions
Save Video Context
async function updateVideoContext(videoId, data) {
  return prisma.video.update({
    where: { id: videoId },
    data
  });
}
Get Video Context
async function getVideoContext(videoId) {
  return prisma.video.findUnique({
    where: { id: videoId }
  });
}
3️⃣ AI Summary Generator
When to Generate:

After video is fetched

OR on-demand

Implementation
async function generateSummary(title, description) {
  const prompt = `
Summarize this YouTube video in 3-5 lines:

Title: ${title}
Description: ${description}
`;

  // call LLM
}
Save Summary
await prisma.video.update({
  where: { id: videoId },
  data: {
    ai_summary: summary,
    summary_generated: true
  }
});
🤖 Context → Prompt Injection
Prompt Builder Upgrade

Now combine:

Persona

Comment

Context

Final Prompt Structure
function buildPrompt({ persona, context, comment }) {
  return `
You are a YouTube creator.

=== PERSONA ===
Tone: ${persona.tone}
Emoji Style: ${persona.emoji_style}
Rules: ${persona.vocabulary_rules}
Catchphrases: ${persona.catchphrases}
Avoid: ${persona.forbidden_words}

=== VIDEO CONTEXT ===
Title: ${context.title}
Summary: ${context.ai_summary}
Creator Notes: ${context.creator_context}

=== TASK ===
Reply to this comment:
"${comment}"

Keep it relevant to the video.
`;
}
🔄 Full Flow
🧩 End-to-End Context Flow
1. Fetch Video (YouTube API)
2. Save Title + Description
3. Generate AI Summary
4. Store in DB
5. User optionally adds creator context
6. When replying:
      ↓
   Fetch Persona
      ↓
   Fetch Video Context
      ↓
   Build Prompt (Persona + Context)
      ↓
   Generate Reply
      ↓
   Save Reply
🔗 Integration with Previous Phases
Updated Smart Pipeline
Fetch Comments
   ↓
Analyze (intent + sentiment)
   ↓
Moderate
   ↓
IF approved:
   ↓
Get Persona
   ↓
Get Context
   ↓
Generate Context-Aware Reply
🖥 UI Changes
Video Context Section
Show:

Video Title

Description

AI Summary

Creator Notes (editable)

Add Feature
✍️ “Add Creator Context”

Input example:

"This video is for beginners learning React hooks"
Buttons

Generate Summary

Edit Context

Save Context

🚫 What NOT to Do

❌ Don’t send full description blindly (too long)

❌ Don’t skip summary generation

❌ Don’t overload prompt with unnecessary text

⚡ Optimization Strategies
1️⃣ Truncate Description
description.slice(0, 1000)
2️⃣ Prefer Summary over Raw Data

👉 Always prioritize:

Summary > Description

3️⃣ Cache Context

Store summary once

Avoid regenerating repeatedly

⚡ Edge Cases

No description → rely on title

Summary not generated → fallback

Very long videos → summarize only key parts

Missing creator input → optional

🧪 Testing Strategy
Without Context

Generic reply

With Context

Specific reply referencing topic

Example

Comment:

"This helped a lot!"

Without Context:
→ "Thanks!"

With Context:
→ "Glad the React optimization tips helped! 🚀"

🚀 Definition of Done

Phase 4 is complete when:

 Video context is stored in DB

 AI summary is generated and saved

 Creator can add custom context

 Context is injected into prompt

 Replies are context-aware

 System avoids generic replies
---

################################################################################### Phase 5: Reply Generation Upgrade

Phase 5: Reply Generation Upgrade
🎯 Objective

Generate high-quality, human-like, context-aware replies using all available intelligence.

This phase combines everything built so far:

Comment understanding

Intent

Sentiment

Persona

Context

👉 This is where your system becomes truly smart

🧠 Core Idea

Instead of basic replies:

"Thanks for your comment!"

You now generate:

"Really glad the React optimization tips helped you! Appreciate it 😊"

👉 Powered by:

Context (React optimization)

Sentiment (positive → gratitude)

Persona (friendly + emoji)

📥 Inputs to the System
Required Inputs
1️⃣ Comment

Raw user comment text

2️⃣ Intent

From Phase 1:

question

praise

criticism

spam

neutral

3️⃣ Sentiment

From Phase 1:

positive

negative

neutral

4️⃣ Persona

From Phase 3:

tone

emoji style

vocabulary rules

catchphrases

forbidden words

5️⃣ Context

From Phase 4:

video title

AI summary

creator notes

⚙️ Features to Implement
1️⃣ Smart Prompt Engineering

Dynamic prompt based on ALL inputs.

2️⃣ Intent-Aware Replies
Intent	Behavior
question	Answer clearly
praise	Express gratitude
criticism	Respond politely + empathetically
neutral	Keep conversational
3️⃣ Sentiment-Aware Tone Adjustment
Sentiment	Behavior
positive	Warm + appreciative
negative	Calm + empathetic
neutral	Balanced
4️⃣ Persona Enforcement

Maintain creator voice

Avoid forbidden words

Use catchphrases naturally

5️⃣ Context Awareness

Refer to video topic

Avoid generic replies

Stay relevant

🔧 What You Need to Implement
1️⃣ Reply Service (Upgrade)

Update:

/lib/services/reply.service.ts
2️⃣ Core Function
async function generateReply(data) {
  const { comment, intent, sentiment, persona, context } = data;

  const prompt = buildAdvancedPrompt({
    comment,
    intent,
    sentiment,
    persona,
    context
  });

  // Call LLM here

  return response;
}
3️⃣ Advanced Prompt Builder
function buildAdvancedPrompt({ comment, intent, sentiment, persona, context }) {
  return `
You are a YouTube creator.

=== PERSONA ===
Tone: ${persona.tone}
Emoji Style: ${persona.emoji_style}
Rules: ${persona.vocabulary_rules}
Catchphrases: ${persona.catchphrases}
Avoid: ${persona.forbidden_words}

=== VIDEO CONTEXT ===
Title: ${context.title}
Summary: ${context.ai_summary}
Creator Notes: ${context.creator_context}

=== COMMENT ANALYSIS ===
Intent: ${intent}
Sentiment: ${sentiment}

=== INSTRUCTIONS ===
- If question → answer clearly
- If praise → show gratitude
- If criticism → respond politely and empathetically
- Keep reply short (1–3 lines)
- Stay relevant to video
- Sound human, not robotic

=== COMMENT ===
"${comment}"

Generate reply:
`;
}
🔄 Full Flow
🧩 End-to-End Reply Flow
1. Fetch Comment
2. Analyze (intent + sentiment)
3. Moderate
4. IF approved:
      ↓
   Get Persona
      ↓
   Get Context
      ↓
   Build Advanced Prompt
      ↓
   Generate Reply (LLM)
      ↓
   Save Reply in DB
🔗 Integration with System
Final Smart Pipeline
Fetch → Store → Analyze → Moderate →
→ Persona → Context → Reply Generation → Save → Review → Post
🗄 Database Usage
Replies Table
generated_reply   String
edited_reply      String
posted            Boolean
Save Generated Reply
await prisma.reply.create({
  data: {
    comment_id: commentId,
    generated_reply: reply
  }
});
🖥 UI Changes
Enhanced Comment Card

Show:

Intent

Sentiment

Moderation Status

Generated Reply

Add Controls

✏️ Edit Reply

🔄 Regenerate

✅ Approve & Post

🚫 What NOT to Do

❌ Don’t generate replies for spam/toxic comments

❌ Don’t ignore persona/context

❌ Don’t generate long paragraphs

❌ Don’t sound robotic

⚡ Optimization Strategies
1️⃣ Reduce Token Usage

Use summary instead of full description

Limit persona text length

2️⃣ Caching

Avoid regenerating same reply multiple times

3️⃣ Retry Strategy

If LLM fails → retry once

⚡ Edge Cases

Empty comment

Sarcasm (LLM handles partially)

Multi-language comments

Very long comments → truncate

🧪 Testing Strategy
Case 1 — Praise

Comment:

"Amazing video!"

Expected:
→ Gratitude + friendly tone

Case 2 — Question

Comment:

"How did you optimize React rendering?"

Expected:
→ Clear answer

Case 3 — Criticism

Comment:

"This wasn't helpful"

Expected:
→ Calm + empathetic response

Case 4 — Neutral

Comment:

"Okay"

Expected:
→ Light conversational reply

🚀 Definition of Done

Phase 5 is complete when:

 Replies use intent + sentiment

 Persona is applied correctly

 Context is included in replies

 Replies are short and human-like

 Replies are saved in DB

 UI supports edit/regenerate

---

####################################################################################### Phase 6: Priority System
Phase 6: Priority System
🎯 Objective

Rank and prioritize comments so that important comments get replied to first.

This ensures:

Faster responses to valuable users

Better engagement rate

Smarter use of API + AI resources

🧠 Core Idea

Not all comments are equal.

Instead of:

Process comments in random order

You move to:

Process highest priority comments first
⚙️ Priority Logic (Basic)
priorityScore = (likeCount * 2) + questionBoost
🧠 Advanced Priority Logic

You should extend this:

priorityScore =
  (likeCount * 2) +
  (isQuestion ? 3 : 0) +
  (isNegative ? 2 : 0) +
  (isRepeatUser ? 2 : 0) +
  (isHighEngagement ? 1 : 0)
📊 Factors That Affect Priority
1️⃣ Like Count

More likes → higher importance

2️⃣ Intent (from Phase 1)
Intent	Boost
question	+3
criticism	+2
praise	+1
neutral	0
3️⃣ Sentiment
Sentiment	Boost
negative	+2
positive	+1
neutral	0

👉 Negative = needs faster response

4️⃣ Repeat Commenter

If user comments frequently → boost

5️⃣ Engagement Signals (Optional)

Replies already present

Thread depth

Creator mentions

🗄 Database Usage
Comments Table (Already Exists)
like_count       Int
intent           String
sentiment        String
priority_score   Float
🆕 Required
priority_score Float @default(0)
🔧 What You Need to Implement
1️⃣ Priority Service

Create:

/lib/services/priority.service.ts
2️⃣ Core Function
function calculatePriority(comment) {
  let score = 0;

  // Likes
  score += comment.like_count * 2;

  // Intent
  if (comment.intent === "question") score += 3;
  if (comment.intent === "criticism") score += 2;
  if (comment.intent === "praise") score += 1;

  // Sentiment
  if (comment.sentiment === "negative") score += 2;
  if (comment.sentiment === "positive") score += 1;

  return score;
}
3️⃣ Update Comment in DB
await prisma.comment.update({
  where: { id: commentId },
  data: { priority_score: score }
});
4️⃣ Batch Processing

After analysis + moderation:

for (const comment of comments) {
  const score = calculatePriority(comment);

  await prisma.comment.update({
    where: { id: comment.id },
    data: { priority_score: score }
  });
}
🔄 Full Flow
🧩 End-to-End Priority Flow
1. Fetch Comments
2. Analyze (intent + sentiment)
3. Moderate
4. IF approved:
      ↓
   Calculate Priority Score
      ↓
   Save in DB
🔥 Final Processing Order
const comments = await prisma.comment.findMany({
  where: { moderation_status: "approved" },
  orderBy: { priority_score: "desc" }
});

👉 Highest priority comes first

🔗 Integration with System
Updated Pipeline
Fetch → Analyze → Moderate → Priority →
→ Persona → Context → Reply Generation
🖥 UI Changes
Dashboard Sorting

Add:

🔼 Sort by Priority

🔽 Sort by Latest

Display Priority Score

Example:

Comment: "How does this work?"

Priority Score: 9 🔥
Highlight Important Comments

High priority → highlight card

Add badge: 🔥 High Priority

🚫 What NOT to Do

❌ Don’t prioritize spam/toxic comments

❌ Don’t ignore sentiment/intent

❌ Don’t hardcode static priority

⚡ Optimization Strategies
1️⃣ Recalculate Only When Needed

When new comment arrives

When like_count changes

2️⃣ Use Indexing

Add DB index:

CREATE INDEX idx_priority_score ON comments(priority_score DESC);
3️⃣ Combine with Queue

Process high priority first in workers

⚡ Edge Cases

No likes → still allow intent boost

Missing intent/sentiment → fallback score

Equal scores → sort by latest

🧪 Testing Strategy
Case 1 — Question + Likes

Should rank highest

Case 2 — Negative Comment

Should rank high (needs attention)

Case 3 — Praise

Medium priority

Case 4 — Neutral

Low priority

🚀 Definition of Done

Phase 6 is complete when:

 Priority score is calculated

 Stored in DB

 Comments sorted by priority

 High-priority comments processed first

 UI reflects priority

---

####################################################################
