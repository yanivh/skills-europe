# Tenderpop API Query Workflow

Convert natural-language procurement requests into TED expert queries, run live TED notice searches, and apply post-search filtering rules.

## What this skill does

- Builds or preserves TED expert query syntax.
- Calls `POST https://api.ted.europa.eu/v3/notices/search`.
- Applies local logic filters (`--logic`) on returned notices.
- Enriches notices with buyer/winner details (`--with-parties` by default).
- Supports output as `json`, `table`, or `both`.
- Supports output ordering with `--sort asc|desc` (default: `desc`).

## Install

### Option 1: Local install (recommended during development)

Copy this folder into your skills directory.

For Cursor environments that use `~/.cursor/skills-cursor`:

```bash
mkdir -p ~/.cursor/skills-cursor/tenderpop-api-query-workflow
cp -R categories/government-public_sector_data_platform/tenderpop-api-query-workflow/. \
  ~/.cursor/skills-cursor/tenderpop-api-query-workflow/
```

For Codex-style environments that use `~/.codex/skills`:

```bash
mkdir -p ~/.codex/skills/tenderpop-api-query-workflow
cp -R categories/government-public_sector_data_platform/tenderpop-api-query-workflow/. \
  ~/.codex/skills/tenderpop-api-query-workflow/
```

Then restart your assistant session so the new skill is discovered.

### Option 2: Install from GitHub (when path exists on remote)

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo yanivh/skills-europe \
  --path categories/government-public_sector_data_platform/tenderpop-api-query-workflow
```

## Use in chat

Invoke the skill by name:

```text
Use $tenderpop-api-query-workflow to ...
```

Example:

```text
Use $tenderpop-api-query-workflow to find water network asset management software tenders in Germany and France, scope all, limit 25, format table, logic: must include software, asset; exclude wastewater treatment plant.
```

```text
Use $tenderpop-api-query-workflow to find water research tenders, scope open, limit 25, format table, logic: must include water and research; country: DEU; exclude construction.
```

More free-text chat examples:

Country-only filter:

```text
Use $tenderpop-api-query-workflow to find stormwater drainage tenders, scope all, format table, logic: country: DEU, NLD.
```

## Use via CLI script

From repository root:

```bash
node categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs \
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
- `--format` `json|table|both`
- `--sort` `asc|desc` (applies to returned notice order)
- `--output` write JSON payload to file
- `--with-parties` / `--without-parties`

## More examples

Prebuilt TED syntax with ascending output order:

```bash
node categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs \
  --question 'FT~("drainage" OR "stormwater") AND CY IN (DEU NLD) SORT BY publication-date DESC' \
  --scope active \
  --limit 15 \
  --sort asc \
  --format both \
  --output tmp/ted-results.json
```

Logic-only filtering example:

```bash
node categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs \
  --question "asset management tenders in Germany" \
  --logic "country: DEU; min value 1m; must include: software; must not include: treatment plant" \
  --format table
```

Open-scope research example with country and exclusion filters:

```bash
node categories/government-public_sector_data_platform/tenderpop-api-query-workflow/scripts/free_text_ted_query.mjs \
  --question "water Research tenders" \
  --scope open \
  --limit 25 \
  --format table \
  --logic "must include water and research; country: DEU; exclude construction"
```



## References

- `SKILL.md` for workflow and behavior
- `references/prompt-rules.md` for supported `--logic` rule phrases
- `references/subject-winner-repair.md` for subject/winner/repair extraction rules
