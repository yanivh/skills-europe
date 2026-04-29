# Skills Europe

European-focused agent skills and supporting references.

## Current Scope

This repository currently contains two categories:

- `categories/public-intelligence/`
- `categories/sport/`

Within these categories, the current skills are:

- `categories/public-intelligence/procurement-intelligence-agent/`
- `categories/public-intelligence/funding-finder-agent/`
- `categories/sport/de/book_Acourse_fitnessfirst/`

## Repository Structure

Each skill lives in its own folder and can include:

- `SKILL.md` for the skill definition
- `README.md` for installation and usage guidance
- `agents/` for agent-facing presets
- `references/` for supporting rules and background material
- `scripts/` for executable helpers used by the skill

## Current Skills

`procurement-intelligence-agent` converts free-text procurement requests into TED expert queries, runs live TED notice searches, and applies post-search filtering rules such as include/exclude terms, country filters, value bounds, scope selection, and result formatting.

`funding-finder-agent` finds EU grants and innovation funding opportunities, scores startup eligibility fit, and highlights deadlines with source-backed links.

## Using With Codex

In Codex environments, skills from this repository can be installed with the `skill-installer` feature instead of copying folders manually.

Example:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo yanivh/skills-europe \
  --path categories/public-intelligence/procurement-intelligence-agent
```

See:

- `categories/public-intelligence/procurement-intelligence-agent/README.md`
- `categories/public-intelligence/procurement-intelligence-agent/SKILL.md`
- `categories/public-intelligence/funding-finder-agent/README.md`
- `categories/public-intelligence/funding-finder-agent/SKILL.md`

## Adding More Skills

When new skills are added, place them under `categories/<category-name>/<skill-name>/` and include at minimum a `SKILL.md` file.
