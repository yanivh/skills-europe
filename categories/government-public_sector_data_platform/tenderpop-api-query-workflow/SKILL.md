---
name: tenderpop-api-query-workflow
description: Generate TED API expert queries from free-text procurement questions, run live notice searches, scan responses, and apply `--logic` filtering rules. Use when a user asks in natural language and needs query generation plus rule-based screening of TED notice results.
---

# Tenderpop API Query Workflow

Convert free text into TED query syntax, execute TED search, then apply post-search `--logic` filters.

For questions about `scope_summary` (subject), winner extraction, or missing-data repairs, follow the extraction/repair rules in [references/subject-winner-repair.md](references/subject-winner-repair.md) instead of inventing new heuristics.

## Workflow

1. Collect inputs:
- `question`: Free-text request, or an existing TED expert query.
- `logic` (optional): Rule text for post-search filtering (`--logic` in the CLI).
- `scope`: `active` or `all`.
- `limit`: 1-100 notices.
- `format`: `json`, `table`, or `both`.
- `withParties`: enabled by default; enrich each result with `buyer`, `winner`, and final `country`.

2. Build or normalize query:
- Preserve existing TED syntax when `question` already includes operators like `FT~`, `CY`, `classification-cpv`, `PD=`, or `total-value=`.
- Otherwise build a query with:
  - `FT~(...)` from phrases and key terms.
  - `CY IN (...)` from country mentions.
  - `classification-cpv IN (...)` from CPV mentions.
  - `PD=...` for detected date hints.
  - `total-value=(>=...)` or `total-value=(<=...)` for value hints.
- Append `SORT BY publication-number DESC` when absent.

3. Run TED search:
- From the repository root, use `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs`.
- Call `POST https://api.ted.europa.eu/v3/notices/search`.
- Use scope mapping aligned with project behavior:
  - `active -> 1`
  - `all -> 2`

4. Scan response and apply logic:
- Parse `logic` rules (include terms, exclude terms, country constraints, value bounds).
- Score and filter notices based on text and extracted structured fields.
- Return both the raw API counts and filtered result counts.

5. Return structured output:
- Always include generated query, scan rules, total API notices, filtered notices, and per-notice match reasons.
- For `format=table`, render a markdown table with clickable notice links:
  - `https://ted.europa.eu/en/notice/-/detail/{publicationNumber}`
- Table columns include: `Buyer`, `Country`, and `Winner`.

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
node categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs \
  --question "water network asset management software in germany and france over 1M EUR" \
  --scope all \
  --limit 25 \
  --logic "must include: software, asset; exclude: wastewater treatment plant" \
  --format table
```

```bash
node categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs \
  --question 'FT~("drainage" OR "stormwater") AND CY IN (DEU NLD) SORT BY publication-number DESC' \
  --scope active \
  --limit 15 \
  --format both \
  --output tmp/ted-results.json
```

## References

- Read [references/prompt-rules.md](references/prompt-rules.md) before writing complex `logic` strings.
- Read [references/subject-winner-repair.md](references/subject-winner-repair.md) for `scope_summary`, `winner_name`, and missing-data repair logic.
