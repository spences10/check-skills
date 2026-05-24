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
duplicate names, asset/reference/script usage, and description quality
signals such as gerund phrasing or leading action verbs.

### `doctor <path...>`

Plans safe automatic fixes. Dry-run planning is the default; use
`--write` to apply deterministic low-risk edits. Doctor reports
include stable fix codes and before/after snippets in `--json` output.
Unsafe or prose-heavy cases are reported as manual suggestions instead
of being rewritten.

### `init <name>`

Creates a minimal skill scaffold:

```bash
check-skills init my-skill
check-skills init my-skill --references --scripts --assets
```

## Programmatic API

`check-skills` also exposes a typed ESM API:

```ts
import { validate_paths } from 'check-skills';

const report = validate_paths(['.'], { recursive: true });
```

The CLI entrypoint is available as `check-skills/cli` for tooling that
needs to resolve it explicitly.

Public exports include:

- `validate_paths`, `validate_skill_dir`, `discover_skill_dirs`
- `read_skill_document`, `parse_frontmatter`
- `doctor_path`
- `collect_prompt_skills`, `skills_to_prompt`
- `get_stats`, `format_stats`
- public result, problem, validation, stats, and prompt types

## What it checks

Errors include missing `SKILL.md`, invalid YAML frontmatter, missing
required fields, invalid names, name/directory mismatch, overlong
descriptions, invalid `license`, invalid `compatibility`, invalid
`allowed-tools`, invalid metadata, and missing local file references.

Validation results include per-skill stats for line count, body word
count, estimated tokens, description length/tokens, code blocks,
sections, and long paragraphs. Human output shows those stats when a
skill has findings; JSON output always includes them.

Warnings include valid but nonportable multiline descriptions, vague
descriptions, list-heavy descriptions, first/second-person wording,
missing trigger language, missing gerund/action phrasing, oversized
`SKILL.md` files, too many sections or code blocks, long paragraphs,
TODO/template placeholders, low description/body keyword overlap,
vendor-specific wording in portable skills, empty resource
directories, orphaned reference/script/asset files, unreferenced
scripts, non-executable referenced scripts, and missing concrete
instructions.

Description quality examples:

```yaml
description: Analyze Excel spreadsheets and generate charts. Use when analyzing tabular data or .xlsx files.
description: Coordinate teammate work across branches. Use when delegating parallel implementation or review tasks.
description: Use when debugging failed CI pipelines, reproducing container issues, or verifying fixes locally.
```

Avoid vague or passive descriptions:

```yaml
description: Helps with data.
description: Architecture decisions are unclear.
```

## Relationship to agentskills.io

`agentskills.io` is the portable skill standard. `check-skills` is an
authoring-time CLI that helps people and agents validate skills
against that standard without depending on Claude Code, Codex, Cursor,
Windsurf, OpenCode, Pi, or any other harness.
