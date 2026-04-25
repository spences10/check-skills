import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePaths } from './validate.js';

function tmpRoot(): string {
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

describe('validatePaths', () => {
	it('passes a valid skill', () => {
		const root = tmpRoot();
		skill(root, 'good-skill', VALID_SKILL);

		const report = validatePaths(['good-skill'], { cwd: root });

		expect(report.ok).toBe(true);
		expect(report.summary).toMatchObject({
			checked: 1,
			passed: 1,
			failed: 0,
			errors: 0,
		});
	});

	it('reports malformed frontmatter', () => {
		const root = tmpRoot();
		skill(
			root,
			'bad-frontmatter',
			`---
name: bad-frontmatter
description: Use when you need to validate skills.
`,
		);

		const report = validatePaths(['bad-frontmatter'], { cwd: root });

		expect(report.ok).toBe(false);
		expect(report.skills[0].problems).toContainEqual(
			expect.objectContaining({
				severity: 'error',
				code: 'invalid-frontmatter',
			}),
		);
	});

	it('reports name mismatch', () => {
		const root = tmpRoot();
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

		const report = validatePaths(['actual-name'], { cwd: root });

		expect(report.ok).toBe(false);
		expect(report.skills[0].problems).toContainEqual(
			expect.objectContaining({ code: 'name-mismatch' }),
		);
	});

	it('warns on bad descriptions', () => {
		const root = tmpRoot();
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

		const report = validatePaths(['vague-skill'], { cwd: root });
		const codes = report.skills[0].problems.map(
			(problem) => problem.code,
		);

		expect(report.ok).toBe(true);
		expect(codes).toContain('vague-description');
		expect(codes).toContain('missing-trigger-language');
	});

	it('discovers skills recursively', () => {
		const root = tmpRoot();
		mkdirSync(join(root, 'group'), { recursive: true });
		skill(join(root, 'group'), 'good-skill', VALID_SKILL);

		const report = validatePaths(['group'], {
			cwd: root,
			recursive: true,
		});

		expect(report.summary.checked).toBe(1);
		expect(report.skills[0].path).toBe('group/good-skill');
	});

	it('serializes JSON output shape', () => {
		const root = tmpRoot();
		skill(root, 'good-skill', VALID_SKILL);

		const json = JSON.parse(
			JSON.stringify(validatePaths(['good-skill'], { cwd: root })),
		) as { ok: boolean; summary: { checked: number } };

		expect(json.ok).toBe(true);
		expect(json.summary.checked).toBe(1);
	});
});
