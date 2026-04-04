# Comment Processing Pipeline

## Overview
This pipeline processes YouTube comments and extracts:
- Intent (question, appreciation, complaint, spam)
- Sentiment (positive, negative, neutral)
- Toxicity score (0–1)

---

## Pipeline Flow

```
Comment
   ↓
Intent Classification
   ↓
Sentiment Analysis
   ↓
Toxicity Detection
   ↓
Structured Output
```

---

## Models Used

### 1. Intent Classification
- Model: facebook/bart-large-mnli (Zero-shot)
- Labels:
  - question
  - appreciation
  - complaint
  - spam

### 2. Sentiment Analysis
- Model: distilbert-base-uncased-finetuned-sst-2-english
- Output:
  - positive
  - negative
  - neutral (derived)

### 3. Toxicity Detection
- Model: unitary/toxic-bert
- Output:
  - score between 0 and 1

---

## Implementation

```python
from transformers import pipeline

intent_classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)

sentiment_classifier = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

toxicity_classifier = pipeline(
    "text-classification",
    model="unitary/toxic-bert"
)

intent_labels = ["question", "appreciation", "complaint", "spam"]

def analyze_comment(text):
    intent_result = intent_classifier(text, candidate_labels=intent_labels)
    intent = intent_result["labels"][0]
    intent_conf = intent_result["scores"][0]

    sent_result = sentiment_classifier(text)[0]
    sentiment = sent_result["label"]
    sent_conf = sent_result["score"]

    if sent_conf < 0.6:
        sentiment = "NEUTRAL"

    tox_result = toxicity_classifier(text)[0]
    toxicity_score = tox_result["score"]

    return {
        "text": text,
        "intent": intent,
        "intent_confidence": round(intent_conf, 3),
        "sentiment": sentiment.lower(),
        "toxicity": round(toxicity_score, 3)
    }
```

---

## Example Output

```
{
  "text": "This video is terrible",
  "intent": "complaint",
  "intent_confidence": 0.91,
  "sentiment": "negative",
  "toxicity": 0.78
}
```

---

## Preprocessing (Recommended)

- Lowercase text
- Remove extra whitespace
- Detect spam patterns:
  - links
  - repeated characters
  - promotional keywords

Example:

```python
def preprocess(text):
    if "http" in text or "subscribe" in text:
        return "spam"
    return None
```

---

## Routing Logic

```
if intent == "spam" or toxicity > 0.7:
    → moderation
elif intent == "question":
    → detailed reply
elif intent == "complaint":
    → careful reply
elif intent == "appreciation":
    → gratitude reply
else:
    → generic reply
```

---

## API Design (Next Step)

Input:
```
{
  "text": "comment here"
}
```

Output:
```
{
  "intent": "...",
  "sentiment": "...",
  "toxicity": 0.0
}
```

---

## Future Improvements

- Fine-tune RoBERTa for intent classification
- Use better 3-class sentiment model
- Add caching and batching
- Improve spam detection with hybrid rules + ML

---

## Summary

This pipeline:
- Uses multiple models for accuracy
- Is modular and scalable
- Can be deployed as an API
- Forms the foundation for reply generation systems
