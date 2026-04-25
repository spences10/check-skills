import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { skillsToPrompt } from './prompt.js';

function makeSkill(root: string): void {
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

describe('skillsToPrompt', () => {
	it('emits an available_skills block', () => {
		const root = mkdtempSync(join(tmpdir(), 'check-skills-prompt-'));
		makeSkill(root);

		const prompt = skillsToPrompt(['prompt-skill'], { cwd: root });

		expect(prompt).toContain('<available_skills>');
		expect(prompt).toContain('<name>prompt-skill</name>');
		expect(prompt).toContain('<location>');
	});
});
