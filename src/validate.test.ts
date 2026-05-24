import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validate_paths } from './validate.js';

function tmp_root(): string {
	return mkdtempSync(join(tmpdir(), 'check-skills-'));
}

function skill(root: string, name: string, content: string): string {
	const dir = join(root, name);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'SKILL.md'), content);
	return dir;
}

const VALID_SKILL = `---
name: good-skill
description: Use when you need to validate, review, or improve portable Agent Skills.
---

# good-skill

## Steps

- Validate the skill.
- Fix reported errors.
`;

describe('validate_paths', () => {
	it('passes a valid skill', () => {
		const root = tmp_root();
		skill(root, 'good-skill', VALID_SKILL);

		const report = validate_paths(['good-skill'], { cwd: root });

		expect(report.ok).toBe(true);
		expect(report.summary).toMatchObject({
			checked: 1,
			passed: 1,
			failed: 0,
			errors: 0,
		});
	});

	it('reports malformed frontmatter', () => {
		const root = tmp_root();
		skill(
			root,
			'bad-frontmatter',
			`---
name: bad-frontmatter
description: Use when you need to validate skills.
`,
		);

		const report = validate_paths(['bad-frontmatter'], { cwd: root });

		expect(report.ok).toBe(false);
		expect(report.skills[0].problems).toContainEqual(
			expect.objectContaining({
				severity: 'error',
				code: 'invalid-frontmatter',
			}),
		);
	});

	it('accepts lowercase skill.md like the reference implementation', () => {
		const root = tmp_root();
		const dir = join(root, 'lowercase-skill');
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			join(dir, 'skill.md'),
			VALID_SKILL.replaceAll('good-skill', 'lowercase-skill'),
		);

		const report = validate_paths(['lowercase-skill'], { cwd: root });

		expect(report.ok).toBe(true);
		expect(report.skills[0].path).toBe('lowercase-skill');
	});

	it('reports name mismatch', () => {
		const root = tmp_root();
		skill(
			root,
			'actual-name',
			`---
name: different-name
description: Use when you need to validate skills.
---

## Steps
- Check the skill.
`,
		);

		const report = validate_paths(['actual-name'], { cwd: root });

		expect(report.ok).toBe(false);
		expect(report.skills[0].problems).toContainEqual(
			expect.objectContaining({ code: 'name-mismatch' }),
		);
	});

	it('rejects unknown frontmatter fields outside metadata', () => {
		const root = tmp_root();
		skill(
			root,
			'unknown-field',
			`---
name: unknown-field
description: Use when you need to validate Agent Skills frontmatter.
owner: platform-team
---

## Steps
- Validate.
`,
		);

		const report = validate_paths(['unknown-field'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(report.ok).toBe(false);
		expect(codes).toContain('unexpected-frontmatter-field');
	});

	it('accepts unicode lowercase alphanumeric skill names', () => {
		const root = tmp_root();
		skill(
			root,
			'café-skill',
			`---
name: café-skill
description: Use when you need to validate unicode skill names.
---

## Steps
- Validate.
`,
		);

		const report = validate_paths(['café-skill'], { cwd: root });

		expect(report.ok).toBe(true);
		expect(report.summary.errors).toBe(0);
	});

	it('warns on bad descriptions', () => {
		const root = tmp_root();
		skill(
			root,
			'vague-skill',
			`---
name: vague-skill
description: Helps with stuff.
---

Some notes.
`,
		);

		const report = validate_paths(['vague-skill'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(report.ok).toBe(true);
		expect(codes).toContain('vague-description');
		expect(codes).toContain('missing-trigger-language');
	});

	it('warns when descriptions lack gerund or action phrasing', () => {
		const root = tmp_root();
		skill(
			root,
			'activation-skill',
			`---
name: activation-skill
description: Use when architecture decisions are unclear.
---

## Steps
- Review the decision.
`,
		);

		const report = validate_paths(['activation-skill'], {
			cwd: root,
		});
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(codes).toContain('description-lacks-gerund-or-action');
	});

	it('accepts gerund or action-verb description phrasing', () => {
		const root = tmp_root();
		skill(
			root,
			'gerund-skill',
			VALID_SKILL.replace(
				'name: good-skill',
				'name: gerund-skill',
			).replace(
				'description: Use when you need to validate, review, or improve portable Agent Skills.',
				'description: Use when debugging failed CI pipelines.',
			),
		);
		skill(
			root,
			'action-skill',
			VALID_SKILL.replace(
				'name: good-skill',
				'name: action-skill',
			).replace(
				'description: Use when you need to validate, review, or improve portable Agent Skills.',
				'description: Query session analytics for token usage.',
			),
		);
		skill(
			root,
			'expanded-action-skill',
			VALID_SKILL.replace(
				'name: good-skill',
				'name: expanded-action-skill',
			).replace(
				'description: Use when you need to validate, review, or improve portable Agent Skills.',
				'description: Coordinate parallel teammate work across branches.',
			),
		);

		const report = validate_paths(['.'], {
			cwd: root,
			recursive: true,
		});
		const codes = report.skills.flatMap((skill) =>
			skill.problems.map((problem) => problem.code),
		);

		expect(codes).not.toContain('description-lacks-gerund-or-action');
	});

	it('discovers skills recursively', () => {
		const root = tmp_root();
		mkdirSync(join(root, 'group'), { recursive: true });
		skill(join(root, 'group'), 'good-skill', VALID_SKILL);

		const report = validate_paths(['group'], {
			cwd: root,
			recursive: true,
		});

		expect(report.summary.checked).toBe(1);
		expect(report.skills[0].path).toBe('group/good-skill');
	});

	it('does not treat code-block example paths as missing references', () => {
		const root = tmp_root();
		skill(
			root,
			'example-skill',
			`---
name: example-skill
description: Use when you need to validate, review, or improve example references.
---

## Examples

\`\`\`bash
cp ./path/to/marketplace ./my-plugin
node ./posts.remote.ts
\`\`\`
`,
		);

		const report = validate_paths(['example-skill'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(codes).not.toContain('missing-reference');
	});

	it('reports missing Markdown references with line numbers and suggestions', () => {
		const root = tmp_root();
		skill(
			root,
			'reference-skill',
			`---
name: reference-skill
description: Use when you need to validate, review, or improve references.
---

## Steps

Read [missing](references/missing.md).
`,
		);

		const report = validate_paths(['reference-skill'], { cwd: root });
		const problem = report.skills[0].problems.find(
			(item) => item.code === 'missing-reference',
		);

		expect(problem).toMatchObject({
			severity: 'error',
			line: 8,
			column: 6,
		});
		expect(problem?.suggestion).toContain(
			'Create the referenced file',
		);
	});

	it('adds a recursive hint when validating a parent directory', () => {
		const root = tmp_root();
		skill(root, 'good-skill', VALID_SKILL);

		const report = validate_paths(['.'], { cwd: root });
		const problem = report.skills[0].problems[0];

		expect(problem).toMatchObject({
			code: 'missing-skill-md',
		});
		expect(problem.suggestion).toContain('--recursive');
	});

	it('accepts clear imperative descriptions as trigger language', () => {
		const root = tmp_root();
		skill(
			root,
			'analyze-skill',
			`---
name: analyze-skill
description: Analyze session history for reusable lessons and persist durable project guidance.
---

## Steps

- Review session notes.
`,
		);

		const report = validate_paths(['analyze-skill'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(codes).not.toContain('missing-trigger-language');
	});

	it('accepts spec optional fields with valid shapes', () => {
		const root = tmp_root();
		skill(
			root,
			'spec-skill',
			`---
name: spec-skill
description: Use when you need to validate optional Agent Skills spec fields.
license: MIT
compatibility: Requires network access.
allowed-tools: Bash Read
metadata:
  com.example.category: validation
---

## Steps

- Validate the skill.
`,
		);

		const report = validate_paths(['spec-skill'], {
			cwd: root,
			quality: false,
		});

		expect(report.ok).toBe(true);
		expect(report.summary.errors).toBe(0);
	});

	it('rejects spec optional fields with invalid shapes', () => {
		const root = tmp_root();
		skill(
			root,
			'invalid-spec-skill',
			`---
name: invalid-spec-skill
description: Use when you need to validate optional Agent Skills spec fields.
license:
  name: MIT
compatibility: ''
allowed-tools:
  - Bash
metadata:
  ok: 1
---

## Steps

- Validate the skill.
`,
		);

		const report = validate_paths(['invalid-spec-skill'], {
			cwd: root,
			quality: false,
		});
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(codes).toEqual(
			expect.arrayContaining([
				'invalid-license',
				'invalid-compatibility',
				'invalid-allowed-tools',
				'invalid-metadata',
			]),
		);
	});

	it('warns for folded YAML descriptions by default', () => {
		const root = tmp_root();
		skill(
			root,
			'folded-skill',
			`---
name: folded-skill
description: >
  Use when you need to validate folded descriptions.
---

## Steps
- Validate.
`,
		);

		const report = validate_paths(['folded-skill'], { cwd: root });
		const problems = report.skills[0].problems;
		const codes = problems.map((problem) => problem.code);

		expect(report.ok).toBe(true);
		expect(codes).toContain('nonportable-multiline-description');
		expect(
			problems.find(
				(problem) =>
					problem.code === 'nonportable-multiline-description',
			)?.severity,
		).toBe('warn');
	});

	it('fails Claude Code adapter checks for multiline YAML descriptions', () => {
		const root = tmp_root();
		skill(
			root,
			'multiline-skill',
			`---
name: multiline-skill
description: Use when you need
  to validate multiline descriptions.
---

## Steps
- Validate.
`,
		);

		const report = validate_paths(['multiline-skill'], {
			cwd: root,
			agent: 'claude-code',
		});
		const problems = report.skills[0].problems;
		const codes = problems.map((problem) => problem.code);

		expect(report.ok).toBe(false);
		expect(codes).not.toContain('nonportable-multiline-description');
		expect(codes).toContain('claude-code-multiline-description');
		expect(
			problems.find(
				(problem) =>
					problem.code === 'claude-code-multiline-description',
			)?.severity,
		).toBe('error');
	});

	it('reports unsafe paths, orphaned files, and empty skill directories', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'structure-skill',
			`---
name: structure-skill
description: Use when you need to validate skill file references and assets.
---

## Steps

Read [escape](../outside.md) and [missing](references/missing.md).
Use assets\\bad.png only as a bad example.
`,
		);
		mkdirSync(join(dir, 'references'), { recursive: true });
		writeFileSync(join(dir, 'references', 'unused.md'), '# unused');
		mkdirSync(join(dir, 'scripts'), { recursive: true });
		mkdirSync(join(dir, 'assets'), { recursive: true });
		writeFileSync(join(dir, 'extra.md'), '# extra');

		const report = validate_paths(['structure-skill'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(codes).toEqual(
			expect.arrayContaining([
				'unsafe-reference-path',
				'invalid-reference-path',
				'missing-reference',
				'orphaned-references-file',
				'empty-scripts-directory',
				'empty-assets-directory',
				'orphaned-root-markdown',
			]),
		);
	});

	it('reports richer quality feedback without turning warnings into errors', () => {
		const root = tmp_root();
		const long_paragraph = Array.from(
			{ length: 150 },
			(_, index) => `word${index}`,
		).join(' ');
		skill(
			root,
			'quality-skill',
			`---
name: quality-skill
description: Helps with stuff, alpha work, beta work, gamma work, delta work, epsilon work, zeta work, eta work, theta work, iota work, kappa work, lambda work, mu work, nu work, xi work, omicron work.
---

# quality-skill

TODO replace me.

${long_paragraph}
`,
		);

		const report = validate_paths(['quality-skill'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(report.ok).toBe(true);
		expect(codes).toEqual(
			expect.arrayContaining([
				'vague-description',
				'description-list-bloat',
				'template-placeholder',
				'long-paragraph',
				'low-description-body-overlap',
			]),
		);
	});

	it('serializes JSON output shape', () => {
		const root = tmp_root();
		skill(root, 'good-skill', VALID_SKILL);

		const json = JSON.parse(
			JSON.stringify(validate_paths(['good-skill'], { cwd: root })),
		) as { ok: boolean; summary: { checked: number } };

		expect(json.ok).toBe(true);
		expect(json.summary.checked).toBe(1);
	});
});
