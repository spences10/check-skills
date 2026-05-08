import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doctor_path } from './doctor.js';
import { validate_skill_dir } from './validate.js';

function tmp_root(): string {
	return mkdtempSync(join(tmpdir(), 'check-skills-doctor-'));
}

function skill(root: string, name: string, content: string): string {
	const dir = join(root, name);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'SKILL.md'), content);
	return dir;
}

describe('doctor_path', () => {
	it('repairs frontmatter name mismatches', () => {
		const root = tmp_root();
		const dir = skill(
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

		const report = doctor_path(dir, true);
		const content = readFileSync(join(dir, 'SKILL.md'), 'utf-8');

		expect(report.fixes).toContainEqual(
			expect.objectContaining({
				code: 'fix-name-mismatch',
				applied: true,
			}),
		);
		expect(content).toContain('name: actual-name');
		expect(content).not.toContain('name: different-name');
	});

	it('plans fixes with before/after snippets without writing by default', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'actual-name',
			`---
name: different-name
description: Documentation workflow for project contributors.
---

## Steps
- Review the docs.
`,
		);

		const report = doctor_path(dir);
		const content = readFileSync(join(dir, 'SKILL.md'), 'utf-8');

		expect(report.fixes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'fix-name-mismatch',
					applied: false,
					before: 'name: different-name',
					after: 'name: actual-name',
				}),
				expect.objectContaining({
					code: 'add-trigger-language',
					applied: false,
					before:
						'description: Documentation workflow for project contributors.',
					after:
						'description: Use when you need documentation workflow for project contributors.',
				}),
			]),
		);
		expect(content).toContain('name: different-name');
	});

	it('adds trigger language to plain descriptions', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'docs-workflow',
			`---
name: docs-workflow
description: Documentation workflow for project contributors.
---

## Steps
- Review the docs.
`,
		);

		const report = doctor_path(dir, true);
		const content = readFileSync(join(dir, 'SKILL.md'), 'utf-8');

		expect(report.fixes).toContainEqual(
			expect.objectContaining({
				code: 'add-trigger-language',
				applied: true,
			}),
		);
		expect(content).toContain(
			'description: Use when you need documentation workflow for project contributors.',
		);
	});

	it('reports unsafe prose rewrites as manual suggestions', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'prose-skill',
			`---
name: prose-skill
description: This skill has detailed context. It also has a second sentence that should not be rewritten automatically.
---

## Steps
- Review.
`,
		);

		const report = doctor_path(dir, true);
		const content = readFileSync(join(dir, 'SKILL.md'), 'utf-8');

		expect(report.fixes).toContainEqual(
			expect.objectContaining({
				code: 'manual-trigger-language',
				applied: false,
			}),
		);
		expect(content).toContain(
			'This skill has detailed context. It also has a second sentence',
		);
	});

	it('suggests chmod for likely executable scripts without applying it', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'script-skill',
			`---
name: script-skill
description: Use when you need to run local script checks.
---

## Steps
- Run scripts/check.sh.
`,
		);
		mkdirSync(join(dir, 'scripts'));
		const script = join(dir, 'scripts', 'check.sh');
		writeFileSync(script, '#!/usr/bin/env bash\necho ok\n');
		chmodSync(script, 0o644);

		const report = doctor_path(dir, true);

		expect(report.fixes).toContainEqual(
			expect.objectContaining({
				code: 'chmod-script',
				applied: false,
			}),
		);
	});

	it('applies covered fixes so validation can pass', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'covered-skill',
			`---
description: Documentation workflow for project contributors.
---

## Steps
- Review the documentation workflow.
`,
		);

		doctor_path(dir, true);
		const result = validate_skill_dir(dir);

		expect(result.ok).toBe(true);
		expect(
			result.problems.map((problem) => problem.code),
		).not.toContain('missing-trigger-language');
	});
});
