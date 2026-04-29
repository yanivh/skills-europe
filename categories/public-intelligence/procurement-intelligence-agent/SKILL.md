---
name: procurement-intelligence-agent
description: Generate TED API expert queries from free-text procurement questions, run live notice searches, scan responses, and apply `--logic` filtering rules. Use when a user asks in natural language and needs query generation plus rule-based screening of TED notice results.
---

# Procurement Intelligence Agent

Convert free text into TED query syntax, execute TED search, then apply post-search `--logic` filters.

For questions about `scope_summary` (subject), winner extraction, or missing-data repairs, follow the extraction/repair rules in [references/subject-winner-repair.md](references/subject-winner-repair.md) instead of inventing new heuristics.

## Tender Intelligence Agen Mode (Procurement Intelligence)

Use this mode when the user wants strategic guidance, not only retrieval. Typical asks:
- "Find me tenders I can realistically win in Germany."
- "Why did company X win this contract?"
- "Which tenders match a medium-sized supplier profile?"

In this mode, keep the core TED workflow unchanged, then add an intelligence layer:
1. Accept a company profile (industry, size, location, optional certifications).
2. Rank filtered tenders by profile fit and award-history alignment.
3. Estimate win probability as an explainable score (never black-box).
4. Extract required qualifications and surface likely capability gaps.
5. Return reasoning per tender: positive signals, risk signals, and confidence.

## Workflow

If the user asks for `help`, for example `$procurement-intelligence-agent help`, return a short usage summary instead of running a TED query. The help response should list:
- supported inputs: `question`, `logic`, `scope`, `limit`, `format`, `sort`, `requirementsAnalysis`
- defaults: `scope=all`, `limit=25`, `format=table`, `sort=desc`, `withParties=true`
- supported `logic` phrases
- one free-text example
- the note that multiple `logic` values should be separated with commas or `|`

Use this help mode when the user wants a quick reminder of available query-building options without executing a live search.

1. Collect inputs:
- `question`: Free-text request, or an existing TED expert query.
- `logic` (optional): Rule text for post-search filtering (`--logic` in the CLI).
- `scope`: `active`/`open` or `all` (`open` is treated as `active`).
- `limit`: 1-100 notices (default: `25`).
- `format`: `table` (default), `json`, or `both`.
- `sort`: `desc` (default) or `asc` (`--sort` in the CLI).
- `withParties`: enabled by default; enrich each result with `buyer`, `winner`, and final `country`.
- `requirementsAnalysis` (optional): force requirements analysis with `--requirements-analysis` even when no value filter is used.

2. Build or normalize query:
- Preserve existing TED syntax when `question` already includes operators like `FT~`, `CY`, `classification-cpv`, `PD=`, or `total-value=`.
- Otherwise build a query with:
  - `FT~(...)` from phrases and key terms.
  - `CY IN (...)` from country mentions.
  - `classification-cpv IN (...)` from CPV mentions.
  - `PD=...` for detected date hints.
  - `total-value=(>=...)` or `total-value=(<=...)` for value hints.
- Keep TED query sort syntax as `SORT BY publication-date DESC`; apply `--sort asc|desc` to the returned notices order (default `desc`).

3. Run TED search:
- From the repository root, use `categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs`.
- Call `POST https://api.ted.europa.eu/v3/notices/search`.
- Use scope mapping aligned with project behavior:
  - `active -> 1`
  - `all -> 2`

4. Scan response and apply logic:
- Parse `logic` rules (include terms, exclude terms, country constraints, value bounds).
- Score and filter notices based on text and extracted structured fields.
- Return both the raw API counts and filtered result counts.
- If `logic` includes value constraints (`min value`/`max value`), run requirements analysis per matched notice.
- Also run requirements analysis when `--requirements-analysis` is explicitly requested.

5. Return structured output:
- Always include generated query, scan rules, total API notices, filtered notices, and per-notice match reasons.
- For `format=table`, render a markdown table with clickable notice links:
  - `https://ted.europa.eu/en/notice/-/detail/{publicationNumber}`
- Table columns include: `Buyer`, `Country`, and `Winner`.
- For value-constrained requests, add `requirementsAnalysis` with:
  - `requiredDocuments`
  - `technicalRequirements`
  - `submissionAndDeadlines`
  - `legalAndCommercialConditions`
  - `assumptionsAndGaps`

6. If Tender Intelligence Agen mode is requested:
- Add `fit_score` per tender based on profile/requirement match.
- Add `win_probability_band` (`low|medium|high`) and `win_probability_reason`.
- Add `required_qualifications` from available notice content and inferred compliance cues.
- Add `recommended_actions` (for example: partner locally, add required certification, narrow lot targeting).
- Keep all conclusions grounded in observed TED notice and award patterns; if evidence is weak, state low confidence explicitly.

## Enrichment Mode

Use this mode when the user asks for:
- Subject/summary quality (`scope_summary`)
- Winner fields (`winner_name`, `winner_names`)
- Missing-field diagnostics or repair behavior

Steps:
1. Use [references/subject-winner-repair.md](references/subject-winner-repair.md) as the source of truth for extraction precedence and guardrails.
2. Distinguish ingestion-time extraction (`ted-search`) from enrichment (`extract-notices`) and repair (`repair-notices`).
3. Preserve existing guards:
- Exclude winner values that equal buyer name.
- Treat placeholders (`unknown`, `n/a`, `-`, token values <= 1) as missing.
4. If proposing code changes, mirror existing precedence order (JSON detail first, XML fallback second, AI summaries for missing subject).

## Commands

```bash
node categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs \
  --question "water network asset management software in germany and france over 1M EUR" \
  --scope all \
  --limit 25 \
  --sort desc \
  --logic "must include: software, asset; exclude: wastewater treatment plant" \
  --format table
```

```bash
node categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs \
  --question 'FT~("drainage" OR "stormwater") AND CY IN (DEU NLD) SORT BY publication-date DESC' \
  --scope active \
  --limit 15 \
  --sort asc \
  --format both \
  --output tmp/ted-results.json
```

## References

- Read [references/prompt-rules.md](references/prompt-rules.md) before writing complex `logic` strings.
- Read [references/subject-winner-repair.md](references/subject-winner-repair.md) for `scope_summary`, `winner_name`, and missing-data repair logic.
