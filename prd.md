# check-skills — Product Requirements Document

## Overview

`check-skills` is a vendor-neutral CLI for validating, linting, and
improving portable Agent Skills that follow the
[`agentskills.io`](https://agentskills.io/specification)
specification.

It replaces the authoring-time use case of
`claude-skills-cli validate` with a broader, package-manager-friendly
command agents can run inline after creating or editing a skill:

```bash
pnpx check-skills validate ./my-skill
```

The CLI should be useful to humans, but especially optimized for LLM
coding agents: clear failures, actionable fixes, JSON output, and help
text that tells agents exactly when to run validation.

## Vision

Make Agent Skills easy to author, validate, and maintain across agent
harnesses without coupling the workflow to Claude Code, Codex, Cursor,
Windsurf, OpenCode, Pi, or any other specific vendor.

`agentskills.io` is the standard. `check-skills` is the practical CLI
that helps authors follow it.

## Target Users

### Primary

- Scott, maintaining `spences10/skills` as a canonical portable skills
  repo.
- LLM coding agents creating or editing skills during development
  sessions.

### Secondary

- Developers publishing reusable Agent Skills.
- Teams checking Agent Skills into `.agents/skills/`.
- Agent harness implementors needing validation fixtures and prompt
  catalog generation.

## Core Goals

1. Validate skills against the `agentskills.io` specification.
2. Provide useful authoring feedback beyond basic spec compliance.
3. Be safe and ergonomic to run from agent sessions via `pnpx`.
4. Support machine-readable output for automation and CI.
5. Stay vendor-neutral by default, with optional adapter-specific
   checks.

## Non-Goals

- Do not become a marketplace.
- Do not install skills into agent-specific directories in v1.
- Do not require Claude Code, Codex, Cursor, or any specific harness.
- Do not execute skill scripts during validation by default.
- Do not replace `gh skill` for GitHub-based distribution/publishing.

## Technical Stack

| Component         | Technology                 |
| ----------------- | -------------------------- |
| Runtime           | Node.js >= 22              |
| Package manager   | pnpm                       |
| Build/dev tooling | `vite-plus`                |
| Tests             | Vitest                     |
| Language          | TypeScript                 |
| Package           | npm package `check-skills` |
| Binary            | `check-skills`             |

## CLI Shape

### Main Commands

```bash
check-skills validate <path...>
check-skills doctor <path...>
check-skills stats <path>
check-skills to-prompt <path...>
check-skills init <name>
check-skills --help
```

### Desired `pnpx` Usage

```bash
pnpx check-skills validate ./ecosystem-guide
pnpx check-skills validate ./skills --recursive
pnpx check-skills doctor ./my-skill
pnpx check-skills stats ./skills --json
pnpx check-skills to-prompt ./skills/*
```

## LLM-Facing Help Requirement

The top-level `--help` output must include an explicit block for
coding agents:

```text
IMPORTANT FOR LLMs:
  Always run `check-skills validate <skill-path>` after creating or editing a skill.
  Skills should follow the agentskills.io specification.
  Fix all errors before finishing. Treat warnings as quality issues.
```

This is a key product feature, not decoration. The CLI should guide
agents toward the desired workflow.

## Validation Rules

### Spec Compliance — Errors

Fail validation when:

- `SKILL.md` is missing.
- YAML frontmatter is missing or invalid.
- Required `name` field is missing.
- Required `description` field is missing.
- `name` does not match the parent directory name.
- `name` is over 64 characters.
- `name` contains uppercase letters, underscores, spaces,
  leading/trailing hyphens, or consecutive hyphens.
- `description` is empty or over 1024 characters.
- `compatibility` is present and over 500 characters.
- `metadata` is present but not a string-to-string map.
- Referenced local files do not exist when they are clearly referenced
  as relative paths.

### Authoring Quality — Warnings

Warn when:

- `description` is too vague, e.g. “Helps with X”.
- `description` does not include “Use when…” or equivalent trigger
  language.
- `description` lacks likely task keywords.
- `SKILL.md` is over 500 lines.
- `SKILL.md` body is very long and should move detail to
  `references/`.
- `references/` files are very large or deeply chained.
- Vendor-specific wording appears in a supposedly portable skill, e.g.
  “Claude Code only”, unless `compatibility` explains it.
- Scripts are present but not referenced from `SKILL.md`.
- Scripts are referenced but not executable where applicable.
- Skill has no examples, decision steps, or concrete instructions.

### Optional Adapter Checks

Adapter checks should be opt-in:

```bash
check-skills validate ./my-skill --agent codex
check-skills validate ./my-skill --agent claude-code
check-skills validate ./my-skill --agent opencode
check-skills validate ./my-skill --agent cursor
check-skills validate ./my-skill --agent windsurf
check-skills validate ./my-skill --agent pi
```

These can warn about harness-specific metadata or directory
compatibility without changing the portable default.

## Output Requirements

### Human Output

Default output should be concise and actionable:

```text
✖ ecosystem-guide
  error  name-mismatch       name must match directory: ecosystem-guide
  warn   vague-description   description should include clear trigger language

1 skill checked: 1 failed, 0 passed, 1 warning
```

### JSON Output

All commands that inspect skills should support `--json`:

```json
{
	"ok": false,
	"summary": {
		"checked": 1,
		"passed": 0,
		"failed": 1,
		"errors": 1,
		"warnings": 1
	},
	"skills": [
		{
			"path": "ecosystem-guide",
			"name": "ecosystem-guide",
			"ok": false,
			"problems": [
				{
					"severity": "error",
					"code": "name-mismatch",
					"message": "name must match parent directory"
				}
			]
		}
	]
}
```

Exit codes:

| Code | Meaning                |
| ---- | ---------------------- |
| 0    | No errors              |
| 1    | Validation errors      |
| 2    | CLI usage/config error |

Warnings should not fail by default, but `--strict` should fail on
warnings.

## Commands

### `validate`

Validates one or more skill directories.

Options:

```bash
--recursive       Discover skills recursively
--strict          Treat warnings as failures
--json            Machine-readable output
--agent <name>    Run adapter-specific checks
--no-quality      Only run spec compliance checks
```

### `doctor`

Attempts safe automatic fixes.

Examples:

- Add missing closing frontmatter delimiter when obvious.
- Normalize simple invalid names if directory can be renamed or if
  user confirms.
- Add a placeholder description only with explicit confirmation.
- Move oversized sections? Not in v1 unless extremely safe.

Must never silently rewrite large skill bodies.

Options:

```bash
--write           Apply fixes
--dry-run         Show planned fixes only
--json            Machine-readable output
```

### `stats`

Summarizes a skills directory.

Metrics:

- Number of skills.
- Number passing/failing.
- Longest descriptions.
- Largest `SKILL.md` files.
- Skills with scripts/references/assets.
- Duplicate names.
- Vendor-specific language count.

### `to-prompt`

Generates an `<available_skills>` block for harnesses that disclose
skills through prompt context.

Input may be skill directories or a parent directory with
`--recursive`.

Output includes:

- `name`
- `description`
- `location` absolute path to `SKILL.md`

### `init`

Creates a minimal skill scaffold:

```text
my-skill/
  SKILL.md
  references/
  scripts/
  assets/
```

Default should create only `SKILL.md` unless flags request optional
folders.

## Skill Quality Heuristics

`check-skills` should encode the practical lessons from maintaining
skills:

- Descriptions are trigger prompts; they matter more than titles.
- Skills should be narrow, task-oriented, and reusable.
- Main `SKILL.md` should be concise.
- Use `references/` for detail.
- Avoid vendor names unless the skill is truly vendor-specific.
- Avoid instructions that assume tool names like `Read`, `Bash`, or
  `Edit` unless compatibility requires it.
- Prefer “Use when…” descriptions with concrete keywords.
- Prefer deterministic scripts only when they add value.

## Repository Requirements

Initial repo should include:

```text
package.json
src/
  cli.ts
  validate.ts
  doctor.ts
  stats.ts
  prompt.ts
  types.ts
  rules/
    spec.ts
    quality.ts
    adapters.ts
vite.config.ts
tsconfig.json
README.md
prd.md
tests/
  fixtures/
```

Follow the style of sibling `vite-plus` CLI repos such as
`/home/scott/repos/nopeek`.

## v1 Definition of Done

v1 is ready when:

1. `pnpx check-skills --help` works and includes the LLM-facing
   guidance block.
2. `pnpx check-skills validate <skill>` validates a single skill.
3. `pnpx check-skills validate <dir> --recursive` validates a
   directory of skills.
4. JSON output is supported for validation.
5. Exit codes are correct for CI/agent use.
6. Basic quality warnings exist for vague descriptions, missing
   trigger language, oversized files, and vendor-specific wording.
7. `to-prompt` emits a usable `<available_skills>` block.
8. Tests cover valid skills, malformed frontmatter, name mismatch, bad
   descriptions, recursive scanning, and JSON output.
9. README documents install, usage, and the relationship to
   `agentskills.io`.
10. Package is published to npm as `check-skills`.

## Future Ideas

- `check-skills eval-description` to test descriptions against example
  prompts.
- `check-skills suggest-description` to generate better trigger
  descriptions.
- `check-skills migrate` from Claude/Cursor/Windsurf rule formats into
  portable skills.
- `check-skills publish-check` for supply-chain/security readiness.
- `check-skills catalog` to generate a skills index for a repo.
- GitHub Action for CI validation.
- VS Code/Cursor extension integration.
- MCP server exposing validation and catalog generation.

## Positioning

`check-skills` is not a vendor CLI. It is the practical validation and
authoring companion for portable Agent Skills.

Reference points:

- Standard: `agentskills.io`
- Distribution: `gh skill`, existing `skills` CLI, or manual repo sync
- Authoring/validation: `check-skills`

## Open Questions

- Should `doctor` be included in v1 or follow immediately after
  validation?
- Should the binary also expose `skills-check` as an alias?
- Should `--strict` become default in CI detection?
- Should adapter-specific checks live in core or plugins?
- Should package include a bundled `skill-creator` prompt/template?
