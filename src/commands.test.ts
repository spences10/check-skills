import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doctor_command_result } from './commands/doctor.js';
import { positional_paths } from './commands/util.js';
import { validate_command_result } from './commands/validate.js';

function tmp_root(): string {
	return mkdtempSync(join(tmpdir(), 'check-skills-commands-'));
}

function skill(root: string, name: string, content: string): string {
	const dir = join(root, name);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'SKILL.md'), content);
	return dir;
}

describe('command helpers', () => {
	it('keeps positional path arrays intact', () => {
		expect(positional_paths(['one', 'two'])).toEqual(['one', 'two']);
		expect(positional_paths([])).toEqual([]);
	});

	it('returns validate output and exit code without exiting', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'bad-skill',
			`---
name: wrong-name
description: Use when you need to validate skills.
---

## Steps
- Validate.
`,
		);

		const result = validate_command_result({
			paths: [dir],
			json: true,
		});
		const report = JSON.parse(result.stdout) as { ok: boolean };

		expect(result.exit_code).toBe(1);
		expect(report.ok).toBe(false);
	});

	it('returns doctor output and exit code without exiting', () => {
		const root = tmp_root();
		const dir = skill(
			root,
			'docs-skill',
			`---
name: wrong-name
description: Documentation workflow for contributors.
---

## Steps
- Review.
`,
		);

		const result = doctor_command_result({ paths: [dir] });

		expect(result.exit_code).toBe(0);
		expect(result.stdout).toContain('would fix');
		expect(result.stdout).toContain(
			'replace name with parent directory',
		);
	});
});
