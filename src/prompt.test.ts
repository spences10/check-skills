import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { skills_to_prompt } from './prompt.js';

function make_skill(root: string): void {
	const dir = join(root, 'prompt-skill');
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, 'SKILL.md'),
		`---
name: prompt-skill
description: Use when you need to generate an available skills prompt block.
---

## Steps
- Emit XML.
`,
	);
}

describe('skills_to_prompt', () => {
	it('emits an available_skills block', () => {
		const root = mkdtempSync(join(tmpdir(), 'check-skills-prompt-'));
		make_skill(root);

		const prompt = skills_to_prompt(['prompt-skill'], { cwd: root });

		expect(prompt).toContain('<available_skills>');
		expect(prompt).toContain('<name>prompt-skill</name>');
		expect(prompt).toContain('<location>');
	});
});
