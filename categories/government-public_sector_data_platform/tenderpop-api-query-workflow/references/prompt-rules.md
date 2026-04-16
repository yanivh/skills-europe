# Logic Rules (`--logic`)

Use `--logic` to apply post-search filtering rules on TED API results.
Use `--format table` for a clickable markdown table.
For `scope_summary`/winner/missing-field behavior, see `references/subject-winner-repair.md`.

## Supported Rule Phrases

- `must include: term1, term2`
- `include: term1; term2`
- `require: term1, term2`
- `exclude: term3, term4`
- `must exclude: term3`
- `must not include: term4`
- `country: germany, france` or `country: DEU, FRA`
- `min value 500k` or `over 1m`
- `max value 2m` or `under 750000`

## Behavior

- Include terms are all required (logical AND).
- Exclude terms reject a notice if any excluded term appears.
- Country filter requires notice buyer country to match one of the requested countries.
- Value filters compare against parsed numeric values when available.
- If no `--logic` rules are detected, all API results are returned.

## Examples

```bash
--logic "must include: software, asset management; exclude: construction"
```

```bash
--logic "country: DEU, NLD; min value 1m; max value 10m; include: wastewater"
```

```bash
--logic "must include: cctv inspection; must not include: treatment plant"
```
