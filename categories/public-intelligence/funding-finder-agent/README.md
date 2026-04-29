# Funding Finder Agent

Find EU grants and innovation funding opportunities for startup profiles.

## What this skill does

- Discovers funding opportunities from official EU-level pages.
- Excludes procurement/tender style results.
- Scores eligibility fit (`high|medium|low`) based on startup profile.
- Highlights deadlines with urgency markers.
- Returns output in English, German, or bilingual mode.

## Install

For Codex-style environments:

```bash
mkdir -p ~/.codex/skills/funding-finder-agent
cp -R categories/public-intelligence/funding-finder-agent/. \
  ~/.codex/skills/funding-finder-agent/
```

## Use in chat

```text
Use $funding-finder-agent to find EU grants for my AI startup in Germany, seed stage, TRL 5.
```

```text
Use $funding-finder-agent to list innovation funding programs for a healthtech startup, bilingual output, include deadlines.
```

```text
Use $funding-finder-agent to check eligibility fit for EIC-related funding for a 10-person B2B AI company.
```

## Run helper script directly

```bash
python3 categories/public-intelligence/funding-finder-agent/scripts/find_eu_funding.py \
  --question "What EU funding can my AI startup apply for?" \
  --country "Germany" \
  --stage "seed" \
  --sector "ai" \
  --trl 5 \
  --language bilingual \
  --limit 12
```

## Example report format (human-readable)

Use this format when presenting results in chat for quick scanning.

### Top programs

| Program | Type | Fit | Deadline | Urgency | Why |
| --- | --- | --- | --- | --- | --- |
| Rothschild Collaborative Fellowships in Jewish Heritage | grant | low | unknown | unknown | sector-specific signal found |
| EUJS Embracing Jewish Diversity | funding-program | low | unknown | unknown | sector-specific signal found |
| Rothschild Foundation Hanadiv Europe Grants | grant | low | 2026-02-20 | high | explicit grant/funding wording |

### Source grant details

| Website | Focus areas | Grant lines | Timeline signals |
| --- | --- | --- | --- |
| Rothschild Foundation Grants Page | Academic Jewish Studies; European Jewish Heritage; Jewish Communal Life | Collaborative Fellowships; Collections Management; Exhibition Support; Digital Heritage Projects; Scoping Grant | Spring 2026 applications closed; decisions expected July 2026 |
| EUJS Grants | Jewish diversity; student/community initiatives; inclusion programming | Embracing Jewish Diversity 2025-2026; The Next Step initiatives | Published grant rounds in 2025-2026 cycle |

### Optional JSON block

Include the raw `sourceGrantDetails` block when users ask for auditability:

```json
{
  "sourceGrantDetails": [
    {
      "website": "Rothschild Foundation Grants Page",
      "focusAreas": ["Academic Jewish Studies", "European Jewish Heritage", "Jewish Communal Life"],
      "grantLines": ["Collaborative Fellowships in Jewish Heritage", "Collections Management", "Exhibition Support", "Digital Heritage Projects", "Scoping Grant"],
      "timelineSignals": ["Spring 2026 applications closed", "Final decisions expected in July 2026"],
      "audience": "European universities, heritage institutions, and Jewish communal organizations"
    }
  ]
}
```

## Files

- `SKILL.md` behavior definition
- `references/source-allowlist.md` approved source policy
- `references/response-schema.md` response contract
- `references/prompt-templates.md` ready prompt patterns
- `scripts/find_eu_funding.py` live discovery + basic fit scoring
