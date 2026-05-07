import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doctor_path } from './doctor.js';

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
});
