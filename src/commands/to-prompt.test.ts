import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { to_prompt_command } from './to-prompt.js';

function skill(): string {
	const root = mkdtempSync(
		join(tmpdir(), 'check-skills-to-prompt-command-'),
	);
	const dir = join(root, 'example-skill');
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, 'SKILL.md'),
		`---
name: example-skill
description: Analyze examples. Use when analyzing examples.
---

## Steps
- Analyze examples.
`,
	);
	return dir;
}

describe('to_prompt_command', () => {
	it('prints an available skills prompt block', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		try {
			to_prompt_command({ paths: [skill()] });
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('<available_skills>'),
			);
		} finally {
			log.mockRestore();
		}
	});
});
