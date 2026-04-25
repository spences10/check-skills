# check-skills

[![built with vite+](https://img.shields.io/badge/built%20with-Vite+-646CFF?logo=vite&logoColor=white)](https://viteplus.dev)
[![tested with vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

Vendor-neutral CLI for validating, linting, and improving portable
Agent Skills that follow the
[agentskills.io specification](https://agentskills.io/specification).

## Usage

`check-skills` is designed to be used inline in LLM coding sessions.
After an agent creates or edits a skill, tell it to validate that
skill:

```text
Create a portable Agent Skill for <task>, then run:
pnpx check-skills validate <skill-path>
```

For repositories containing many skills, tell the agent to validate
the repo recursively:

```text
Validate all skills in this repo with:
pnpx check-skills validate . --recursive --llm
```

Recommended inline commands:

```bash
# After creating or editing one skill
pnpx check-skills validate ./my-skill --llm

# After editing a skills repository
pnpx check-skills validate . --recursive --llm

# Machine-readable output for automation or agent parsing
pnpx check-skills validate . --recursive --json

# CI/spec-only validation against agentskills.io requirements
pnpx check-skills validate . --recursive --no-quality
```

Fix all errors before finishing. Treat warnings as quality prompts
during authoring; use `--no-quality` when you only want spec
compliance.

## Commands

### `validate <path...>`

Validates skill directories.

Options:

- `--recursive` — discover skills recursively
- `--strict` — treat warnings as failures
- `--json` — machine-readable output
- `--llm` — concise stable output for coding agents
- `--quiet` — only show skills with problems
- `--format github` — emit GitHub workflow annotations
- `--agent <name>` — run optional adapter checks (`codex`,
  `claude-code`, `opencode`, `cursor`, `windsurf`, `pi`)
- `--no-quality` — only run spec compliance checks

### `explain <code>`

Explains a validation rule and suggested fix:

```bash
check-skills explain missing-trigger-language
check-skills explain invalid-allowed-tools --json
```

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
descriptions, invalid `license`, invalid `compatibility`, invalid
`allowed-tools`, invalid metadata, and missing local file references.

Warnings include vague descriptions, missing trigger language,
oversized `SKILL.md` files, vendor-specific wording in portable
skills, unreferenced scripts, non-executable referenced scripts, and
missing concrete instructions.

## Relationship to agentskills.io

`agentskills.io` is the portable skill standard. `check-skills` is an
authoring-time CLI that helps people and agents validate skills
against that standard without depending on Claude Code, Codex, Cursor,
Windsurf, OpenCode, Pi, or any other harness.
