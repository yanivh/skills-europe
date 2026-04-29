# Procurement Intelligence Agent

Convert natural-language procurement requests into TED expert queries, run live TED notice searches, and apply post-search filtering rules.

## What this skill does

- Builds or preserves TED expert query syntax.
- Calls `POST https://api.ted.europa.eu/v3/notices/search`.
- Applies local logic filters (`--logic`) on returned notices.
- Enriches notices with buyer/winner details (`--with-parties` by default).
- Supports a procurement intelligence mode ("Tender Intelligence Agen") for fit scoring and explainable win probability.
- Supports output as `json`, `table`, or `both`.
- Keeps TED API query sorting on latest notices with `SORT BY publication-date DESC`.
- Supports local output ordering with `--sort asc|desc` (default: `desc`).
- When `logic` includes a notice value bound (`min value` or `max value`), each matched notice includes a `requirementsAnalysis` block.

## Tender Intelligence Agen (Procurement Intelligence Agent)

This idea can be layered on top of the existing query + filtering workflow without replacing it.

### Inputs

- Company profile:
  - Industry and core offer
  - Company size (small/medium/large)
  - Geography (country/region)
  - Optional certifications/credentials
- Procurement intent:
  - Countries or authorities to target
  - Contract size preferences
  - Exclusions (for example, "no civil construction")

### Outputs

- Relevant tenders (ranked): best-fit opportunities first.
- Win probability per tender: a transparent score based on historical outcomes.
- Required qualifications: extracted obligations and likely compliance gaps.
- Explainability: "why this is a fit" and "what lowers the chance".

### Win probability approach (explainable)

- Historical buyer-winner patterns:
  - Similar contracts awarded by the same buyer
  - Typical winner profile (size, geography, specialization)
- Tender-profile fit:
  - Match between company capability and tender requirements
  - Country and language alignment
  - Budget band alignment with company footprint
- Competitive intensity proxy:
  - How broad or restrictive requirements are
  - Number of historically recurring winners in this segment

Return a confidence band and factors, not a black-box single number.

### Example prompts

- "Find me tenders I can realistically win in Germany."
- "Why did company X win this contract?"
- "Show me German software public tenders where a medium-sized vendor has historically won."

### Suggested response shape

- `recommended_tenders`: top ranked opportunities with links
- `win_probability`: `low|medium|high` plus score rationale
- `required_qualifications`: must-have criteria and missing items
- `explanation`: buyer behavior + requirement fit summary
- `next_actions`: practical steps to increase probability
- `requirementsAnalysis` (auto-added when notice value is specified):
  - `requiredDocuments`
  - `technicalRequirements`
  - `submissionAndDeadlines`
  - `legalAndCommercialConditions`
  - `assumptionsAndGaps`

## Install

### Option 1: Local install (recommended during development)

Copy this folder into your skills directory.

For Cursor environments that use `~/.cursor/skills-cursor`:

```bash
mkdir -p ~/.cursor/skills-cursor/procurement-intelligence-agent
cp -R categories/public-intelligence/procurement-intelligence-agent/. \
  ~/.cursor/skills-cursor/procurement-intelligence-agent/
```

For Codex-style environments that use `~/.codex/skills`:

```bash
mkdir -p ~/.codex/skills/procurement-intelligence-agent
cp -R categories/public-intelligence/procurement-intelligence-agent/. \
  ~/.codex/skills/procurement-intelligence-agent/
```

Then restart your assistant session so the new skill is discovered.

### Option 2: Install from GitHub (when path exists on remote)

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo yanivh/skills-europe \
  --path categories/public-intelligence/procurement-intelligence-agent
```

## Use in chat

Invoke the skill by name:

```text
Use $procurement-intelligence-agent to ...
```

Help feature:
- Use the help feature when you want a quick reminder of the supported inputs, defaults, `logic` phrases, and a ready-to-copy free-text example before running a real TED query.

Copy/paste help block:

```text
Use $procurement-intelligence-agent to find water research tenders, scope open, limit 25, format table, logic: must include water, research; country: DEU; exclude construction.
```

Expected help response:
- supported inputs: `question`, `logic`, `scope`, `limit`, `format`, `sort`
- defaults: `scope=all`, `limit=25`, `format=table`, `sort=desc`, `withParties=true`
- supported `logic` phrases
- one free-text example
- note: separate multiple include, exclude, or country values with commas or `|`

Example:

```text
Use $procurement-intelligence-agent to find water network asset management software tenders in Germany and France, scope all, limit 25, format table, logic: must include software, asset; exclude wastewater treatment plant.
```

```text
Use $procurement-intelligence-agent to find water research tenders, scope open, limit 25, format table, logic: must include water, research; country: DEU; exclude construction.
```

More free-text chat examples:

Country-only filter:

```text
Use $procurement-intelligence-agent to find stormwater drainage tenders, scope all, format table, logic: country: DEU, NLD.
```

Note:
- Use commas or `|` to separate multiple include, exclude, or country values inside `logic`.
- Example: `must include water, research; country: DEU, FRA`

## Use via CLI script

From repository root:

```bash
node categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs \
  --question "water network asset management software tenders in Germany and France" \
  --scope all \
  --limit 25 \
  --format table \
  --sort desc \
  --logic "must include software, asset; exclude wastewater treatment plant"
```

### CLI options

- `--question` free-text request or existing TED expert query
- `--logic` post-search filtering rules
- `--scope` `active|open|all` (`open` is treated as `active`)
- `--limit` `1..100` (default `25`)
- `--page` page number (default `1`)
- `--format` `table|json|both` (default `table`)
- `--sort` `asc|desc` (applies to returned notice order; TED query remains `SORT BY publication-date DESC`)
- `--output` write JSON payload to file
- `--with-parties` / `--without-parties`
- `--requirements-analysis` force requirements analysis even without value filters

## More examples

Prebuilt TED syntax with ascending output order:

```bash
node categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs \
  --question 'FT~("drainage" OR "stormwater") AND CY IN (DEU NLD) SORT BY publication-date DESC' \
  --scope active \
  --limit 15 \
  --sort asc \
  --format both \
  --output tmp/ted-results.json
```

Logic-only filtering example:

```bash
node categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs \
  --question "asset management tenders in Germany" \
  --logic "country: DEU; min value 1m; must include: software; must not include: treatment plant" \
  --format table
```

Open-scope research example with country and exclusion filters:

```bash
node categories/public-intelligence/procurement-intelligence-agent/scripts/free_text_ted_query.mjs \
  --question "water Research tenders" \
  --scope open \
  --limit 25 \
  --format table \
  --logic "must include water, research; country: DEU; exclude construction"
```



## References

- `SKILL.md` for workflow and behavior
- `references/prompt-rules.md` for supported `--logic` rule phrases
- `references/subject-winner-repair.md` for subject/winner/repair extraction rules
