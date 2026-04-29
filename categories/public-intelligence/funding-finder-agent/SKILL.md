---
name: funding-finder-agent
description: Discover EU grants and innovation funding programs from official EU-level funding sources, score startup eligibility fit, and return deadline-aware recommendations in English and German. Use when users ask about grants, startup funding, innovation programs, application fit, or funding deadlines.
---

# Funding Finder Agent

Find EU grants and funding programs for startup profiles, then return fit scoring and deadline-focused next steps.

## Scope Guardrails

- Include only grants and funding programs.
- Exclude procurement and tender opportunities.
- Prefer official EU-level sources before secondary sources.

## Required Inputs

- `question`: user funding ask in natural language
- `country`: startup country (2-letter or full name)
- `stage`: `idea|pre-seed|seed|series-a|growth`
- `sector`: domain such as `ai`, `healthtech`, `climate`, `govtech`
- `teamSize`: integer (optional)
- `trl`: integer 1-9 (optional)
- `language`: `en|de|bilingual` (default: `bilingual`)

If user gives only `question`, infer missing inputs and mark inferred fields in output.

## Workflow

1. Normalize user intent into a startup profile.
2. Run the live discovery helper:
   - `python3 categories/public-intelligence/funding-finder-agent/scripts/find_eu_funding.py --question "..." --country "..." --stage "..." --sector "..." --trl 5 --language bilingual`
3. Keep only results with `kind=grant` or `kind=funding-program`.
4. Score eligibility fit:
   - `high`: strong stage/sector/TRL/country alignment
   - `medium`: partial alignment with manageable gaps
   - `low`: major eligibility mismatch
5. Apply reasoning and ranking:
   - classification: funding-opportunity or fallback-funding-opportunity
   - scoring: `relevance`, `risk`, `opportunity`, and weighted `total`
   - rank by highest `total` first
6. Return concise recommendations with deadline urgency and explicit explanation for each result.
7. Include `sourceUrl` and `retrievedAt` for every suggested program.

## Suggested Response Schema

Use this structure in responses:

```json
{
  "queryContext": {},
  "matches": [
    {
      "programName": "",
      "programType": "grant|funding-program",
      "fundingRange": "",
      "geography": "",
      "eligibilityFit": "high|medium|low",
      "fitReason": "",
      "scores": {
        "relevance": 0,
        "risk": 0,
        "opportunity": 0,
        "total": 0
      },
      "reasoningStep": {
        "classification": "",
        "rankingSignals": []
      },
      "explanation": "",
      "deadline": "",
      "deadlineUrgency": "high|medium|low|unknown",
      "sourceUrl": "",
      "retrievedAt": ""
    }
  ],
  "eligibilitySummary": {},
  "rankingMethod": {},
  "deadlines": [],
  "nextActions": [],
  "sources": [],
  "language": "en|de|bilingual"
}
```

## Output Rules

- Always explain why a program matches.
- If deadline is unknown, set urgency to `unknown` and tell the user what to verify next.
- If no strong matches exist, return a no-match response with profile adjustments (for example: consortium requirement, TRL gap, country restriction).
- Keep final answer bilingual when `language=bilingual`.

## Human-Readable Report Format

When returning results in chat, prefer this report layout before raw JSON:

1. `Top programs` table with columns:
   - `Program`
   - `Type`
   - `Fit`
   - `Deadline`
   - `Urgency`
   - `Why`
2. `Source grant details` table with columns:
   - `Website`
   - `Focus areas`
   - `Grant lines`
   - `Timeline signals`
3. Optional raw JSON block when the user asks for auditability or machine-readable output.

Keep values concise and sourced from computed fields (`matches`, `deadlines`, `sourceGrantDetails`).

## References

- Source allowlist: [references/source-allowlist.md](references/source-allowlist.md)
- Prompt patterns: [references/prompt-templates.md](references/prompt-templates.md)
- Schema details: [references/response-schema.md](references/response-schema.md)
