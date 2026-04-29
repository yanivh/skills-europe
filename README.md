# Skills Europe

European-focused agent skills and supporting references.

## Current Scope

This repository currently contains two categories:

- `categories/government-public_sector_data_platform/`
- `categories/sport/`

Within these categories, the current skills are:

- `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/`
- `categories/sport/de/book_Acourse_fitnessfirst/`

## Repository Structure

Each skill lives in its own folder and can include:

- `SKILL.md` for the skill definition
- `README.md` for installation and usage guidance
- `agents/` for agent-facing presets
- `references/` for supporting rules and background material
- `scripts/` for executable helpers used by the skill

## Current Skill

`tenderpop-api-query-workflow` converts free-text procurement requests into TED expert queries, runs live TED notice searches, and applies post-search filtering rules such as include/exclude terms, country filters, value bounds, scope selection, and result formatting.

## Using With Codex

In Codex environments, skills from this repository can be installed with the `skill-installer` feature instead of copying folders manually.

Example:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo yanivh/skills-europe \
  --path categories/government-public_sector_data_platform/tenderpop-api-query-workflow
```

See:

- `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/README.md`
- `categories/government-public_sector_data_platform/tenderpop-api-query-workflow/SKILL.md`

## Adding More Skills

When new skills are added, place them under `categories/<category-name>/<skill-name>/` and include at minimum a `SKILL.md` file.
