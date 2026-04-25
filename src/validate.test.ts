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
