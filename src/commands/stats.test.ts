import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { stats_command } from './stats.js';

function root_with_skill(): string {
	const root = mkdtempSync(
		join(tmpdir(), 'check-skills-stats-command-'),
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
	return root;
}

describe('stats_command', () => {
	it('prints stats as JSON', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		try {
			stats_command({ path: root_with_skill(), json: true });
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('"skills"'),
			);
		} finally {
			log.mockRestore();
		}
	});
});
