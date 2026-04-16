# Skills Europe

European-focused agent skills and supporting references.

## Current Scope

This repository currently contains a single category:

- `categories/government-public_sector_data_platform/`

Within that category, the current skill is:

- `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/`

## Repository Structure

Each skill lives in its own folder and can include:

- `SKILL.md` for the skill definition
- `README.md` for installation and usage guidance
- `agents/` for agent-facing presets
- `references/` for supporting rules and background material
- `scripts/` for executable helpers used by the skill

## Current Skill

`tenderpop-api-query-workflow` converts free-text procurement requests into TED expert queries, runs live TED notice searches, and applies post-search filtering rules such as include/exclude terms, country filters, value bounds, scope selection, and result formatting.

See:

- `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/README.md`
- `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/SKILL.md`

## Adding More Skills

When new skills are added, place them under `categories/<category-name>/<skill-name>/` and include at minimum a `SKILL.md` file.
