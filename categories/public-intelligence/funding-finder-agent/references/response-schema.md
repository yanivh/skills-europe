# Response Schema

Use this response shape for all final outputs.

```json
{
  "queryContext": {
    "question": "string",
    "country": "string",
    "stage": "string",
    "sector": "string",
    "trl": 5,
    "language": "en|de|bilingual",
    "inferredFields": ["stage"]
  },
  "matches": [
    {
      "programName": "string",
      "programType": "grant|funding-program",
      "fundingRange": "string",
      "geography": "string",
      "eligibilityFit": "high|medium|low",
      "fitReason": "string",
      "scores": {
        "relevance": 0,
        "risk": 0,
        "opportunity": 0,
        "total": 0
      },
      "reasoningStep": {
        "classification": "funding-opportunity|fallback-funding-opportunity",
        "rankingSignals": ["string"]
      },
      "explanation": "string",
      "deadline": "YYYY-MM-DD|unknown",
      "deadlineUrgency": "high|medium|low|unknown",
      "sourceUrl": "string",
      "retrievedAt": "ISO-8601"
    }
  ],
  "eligibilitySummary": {
    "overallFit": "high|medium|low",
    "blockingRisks": ["string"]
  },
  "rankingMethod": {
    "reasoningStep": "string",
    "weights": {
      "relevance": 0.5,
      "opportunity": 0.35,
      "risk_inverse": 0.15
    }
  },
  "deadlines": [
    {
      "programName": "string",
      "deadline": "YYYY-MM-DD|unknown",
      "urgency": "high|medium|low|unknown"
    }
  ],
  "nextActions": ["string"],
  "sources": [
    {
      "name": "string",
      "url": "string",
      "retrievedAt": "ISO-8601"
    }
  ],
  "sourceGrantDetails": [
    {
      "website": "string",
      "focusAreas": ["string"],
      "grantLines": ["string"],
      "timelineSignals": ["string"],
      "audience": "string"
    }
  ],
  "language": "en|de|bilingual"
}
```
