import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validate_command_result } from './validate.js';

function skill(content: string): string {
	const root = mkdtempSync(
		join(tmpdir(), 'check-skills-validate-command-'),
	);
	const dir = join(root, 'example-skill');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'SKILL.md'), content);
	return dir;
}

describe('validate_command_result', () => {
	it('returns JSON output and non-zero exit for invalid skills', () => {
		const dir = skill(`---
name: wrong-name
description: Use when validating command output.
---

## Steps
- Validate command output.
`);

		const result = validate_command_result({
			paths: [dir],
			json: true,
		});
		const report = JSON.parse(result.stdout) as { ok: boolean };

		expect(result.exit_code).toBe(1);
		expect(report.ok).toBe(false);
	});

	it('formats LLM, quiet, and GitHub output modes', () => {
		const dir = skill(`---
name: example-skill
description: Validate skill command output. Use when validating command output.
---

## Steps
- Validate command output.
`);

		expect(
			validate_command_result({
				paths: [dir],
				llm: true,
				quality: false,
			}).stdout,
		).toContain('PASS');
		expect(
			validate_command_result({
				paths: [dir],
				quiet: true,
				quality: false,
			}).stdout,
		).toBe('No problems found.');
		expect(
			validate_command_result({
				paths: [dir],
				format: 'github',
				quality: false,
			}).stdout,
		).toBe('');
	});
});
