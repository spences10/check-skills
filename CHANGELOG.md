# check-skills

## 0.0.10

### Patch Changes

- 1689cff: Clarify invalid metadata diagnostics by reporting value
  types and suggesting flattened dotted string metadata keys.

## 0.0.9

### Patch Changes

- ab131ec: Expand description action verbs and document gerund/action
  phrasing examples for skill activation quality checks.
- 6f37907: Distinguish multiline description portability from Claude
  Code compatibility and add colocated command output rule tests.

## 0.0.8

### Patch Changes

- 822c919: Add advisory description quality check for gerund or
  action-verb phrasing to improve skill activation diagnostics.

## 0.0.7

### Patch Changes

- 856be17: Make doctor safer with fix snippets and manual suggestions,
  and expand CLI smoke coverage.
- 929723e: Expose pure command result helpers for focused
  command-module tests.
- b988218: Add validation stats to results and improve API, help, and
  output coverage.

## 0.0.6

### Patch Changes

- b4c9b4c: Align spec validation with skills-ref: lowercase skill.md,
  Unicode names, and unknown frontmatter rejection.
- daaa3d8: Refactor CLI structure, add public API exports, smoke
  tests, and harden stats frontmatter parsing.
- 356116c: Reject folded and multiline skill descriptions because
  loaders require single-line YAML description fields.
- f85e015: Deepen skill validation with richer quality feedback and
  expanded file/reference structure checks.

## 0.0.5

### Patch Changes

- 63773a9: Fix doctor to repair skill name mismatches and add missing
  trigger language to descriptions.

## 0.0.4

### Patch Changes

- efa2006: Add spec parity checks for optional fields and document
  recommended validation modes.

## 0.0.3

### Patch Changes

- a756139: Improve LLM validation output with warning labels, quiet
  mode, looser triggers, and better vendor guidance.

## 0.0.2

### Patch Changes

- 94b3fa6: Reduce validation noise and improve inline LLM output with
  line numbers, suggestions, llm mode, and explain.

## 0.0.1

### Patch Changes

- 9be9c53: Initial check-skills CLI with validation, prompt
  generation, stats, scaffolding, tests, and Changesets release setup.
