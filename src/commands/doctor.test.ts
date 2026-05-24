import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doctor_command_result } from './doctor.js';

function skill(): string {
	const root = mkdtempSync(
		join(tmpdir(), 'check-skills-doctor-command-'),
	);
	const dir = join(root, 'docs-skill');
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, 'SKILL.md'),
		`---
name: wrong-name
description: Documentation workflow for contributors.
---

## Steps
- Review.
`,
	);
	return dir;
}

describe('doctor_command_result', () => {
	it('returns planned fixes without exiting', () => {
		const result = doctor_command_result({ paths: [skill()] });

		expect(result.exit_code).toBe(0);
		expect(result.stdout).toContain('would fix');
		expect(result.stdout).toContain(
			'replace name with parent directory',
		);
	});

	it('returns JSON output when requested', () => {
		const result = doctor_command_result({
			paths: [skill()],
			json: true,
		});
		const output = JSON.parse(result.stdout) as { fixes: unknown[] };

		expect(output.fixes.length).toBeGreaterThan(0);
	});
});
