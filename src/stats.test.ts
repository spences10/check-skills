import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { get_stats } from './stats.js';

function tmp_root(): string {
	return mkdtempSync(join(tmpdir(), 'check-skills-stats-'));
}

function skill(root: string, name: string, content: string): void {
	const dir = join(root, name);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'SKILL.md'), content);
}

describe('get_stats', () => {
	it('uses parsed YAML descriptions instead of regex frontmatter reads', () => {
		const root = tmp_root();
		skill(
			root,
			'quoted-skill',
			`---
name: quoted-skill
description: "Use when: you need to validate quoted description stats."
---

## Steps

- Validate stats.
`,
		);

		const report = get_stats('.', { cwd: root });

		expect(report.longest_descriptions[0]).toMatchObject({
			path: 'quoted-skill',
			length: 56,
		});
	});
});
