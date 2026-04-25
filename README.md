# check-skills

Vendor-neutral CLI for validating, linting, and improving portable
Agent Skills that follow the
[agentskills.io specification](https://agentskills.io/specification).

## Usage

Run directly with your package runner:

```bash
pnpx check-skills validate ./my-skill
pnpx check-skills validate ./skills --recursive
pnpx check-skills validate ./my-skill --json
pnpx check-skills validate ./my-skill --strict
pnpx check-skills to-prompt ./skills --recursive
pnpx check-skills stats ./skills --json
```

## Important for coding agents

Always run:

```bash
check-skills validate <skill-path>
```

after creating or editing a skill. Fix all errors before finishing.
Treat warnings as quality issues.

## Commands

### `validate <path...>`

Validates skill directories.

Options:

- `--recursive` — discover skills recursively
- `--strict` — treat warnings as failures
- `--json` — machine-readable output
- `--agent <name>` — run optional adapter checks (`codex`,
  `claude-code`, `opencode`, `cursor`, `windsurf`, `pi`)
- `--no-quality` — only run spec compliance checks

### `to-prompt <path...>`

Generates an `<available_skills>` prompt block with each skill's name,
description, and absolute `SKILL.md` location.

### `stats <path>`

Summarizes a skills directory, including pass/fail counts, warnings,
duplicate names, and asset/reference/script usage.

### `doctor <path...>`

Plans safe automatic fixes. Use `--write` to apply them.

### `init <name>`

Creates a minimal skill scaffold:

```bash
check-skills init my-skill
check-skills init my-skill --references --scripts --assets
```

## What it checks

Errors include missing `SKILL.md`, invalid YAML frontmatter, missing
required fields, invalid names, name/directory mismatch, overlong
descriptions, invalid metadata, and missing local file references.

Warnings include vague descriptions, missing trigger language,
oversized `SKILL.md` files, vendor-specific wording in portable
skills, unreferenced scripts, non-executable referenced scripts, and
missing concrete instructions.

## Relationship to agentskills.io

`agentskills.io` is the portable skill standard. `check-skills` is an
authoring-time CLI that helps people and agents validate skills
against that standard without depending on Claude Code, Codex, Cursor,
Windsurf, OpenCode, Pi, or any other harness.
