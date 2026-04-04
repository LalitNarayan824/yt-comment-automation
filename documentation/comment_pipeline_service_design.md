# Comment Processing ML Service Design

## Overview

This document defines the ML service responsibilities and how it integrates into the overall comment processing pipeline.

---

## System Architecture

Comment → ML Service → Backend Decision Layer → Database

- ML Service: Generates signals
- Backend: Applies moderation & priority logic
- DB: Stores results

---

## ML Service Responsibilities

### 1. Input Handling

Input:
{
"text": "comment text"
}

- Validate input
- Trim whitespace

---

### 2. Preprocessing (Internal Only)

- Lowercase text
- Remove extra spaces
- Normalize repeated characters

Note: cleaned_text is NOT returned

---

### 3. Model Inference

#### Intent Classification

- Model: facebook/bart-large-mnli , updated to ->MoritzLaurer/mDeBERTa-v3-base-mnli-xnli
  for better linguistic performance with hindi or english
- Output:
  - intent
  - intent_confidence
  - labels (multi-label scores)

#### Sentiment Analysis

- Model: distilbert-sst2
- Output:
  - sentiment (positive, negative, neutral)
  - sentiment_confidence

#### Toxicity Detection

- Model: toxic-bert
- Output:
  - toxicity (0–1)

this is the updated stack of models we will use , which is shown below

# Intent: Handles Hindi/English/Hinglish intents

intent_pipe = pipeline(
"zero-shot-classification",
model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
device=device
)

# Toxicity: Specifically for multilingual social media abuse

tox_pipe = pipeline(
"text-classification",
model="unitary/multilingual-toxic-xlm-roberta",
device=device
)

# Sentiment: Trained on 200M+ social media posts (XLM-T)

sent_pipe = pipeline(
"sentiment-analysis",
model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
device=device
)

---

### 4. Post-processing

- Normalize outputs (lowercase labels)
- Round scores
- Ensure consistent schema

---

plus we can also add batch processng and cache

## Final API Response

{
"intent": "complaint",
"intent_confidence": 0.91,
"labels": [
{ "label": "complaint", "score": 0.91 },
{ "label": "question", "score": 0.22 }
],
"sentiment": "negative",
"sentiment_confidence": 0.87,
"toxicity": 0.78
}

---

## What ML Service DOES NOT DO

- No moderation decisions
- No spam filtering decisions
- No priority scoring
- No database operations
- No reply generation

---

## Backend Responsibilities (Next.js)

- Call ML service
- Apply moderation logic
- Compute priority score
- Store results

---

## Moderation Logic (Backend)

if intent == "spam" OR rule-based spam:
→ DELETE

if toxicity > 0.9:
→ DELETE

if toxicity > 0.7:
→ HIDE

if toxicity > 0.4:
→ FLAG

else:
→ APPROVE

---

## Priority Logic (Backend)

- question → +5
- complaint → +4
- high likes → +3
- no replies → +2
- toxic → -5

---

## Key Principle

ML predicts → Backend decides

---

## Future Improvements

- Batch processing
- LLM fallback (hybrid system)
- Language detection
- Improved sentiment model
