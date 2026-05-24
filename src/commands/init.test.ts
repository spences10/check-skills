import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { init_command } from './init.js';

describe('init_command', () => {
	it('creates a skill scaffold and optional directories', () => {
		const root = mkdtempSync(join(tmpdir(), 'check-skills-init-'));
		const previous = process.cwd();
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		process.chdir(root);
		try {
			init_command({
				name: 'new-skill',
				references: true,
				scripts: true,
				assets: true,
			});
		} finally {
			process.chdir(previous);
			log.mockRestore();
		}

		expect(existsSync(join(root, 'new-skill', 'SKILL.md'))).toBe(
			true,
		);
		expect(existsSync(join(root, 'new-skill', 'references'))).toBe(
			true,
		);
		expect(existsSync(join(root, 'new-skill', 'scripts'))).toBe(true);
		expect(existsSync(join(root, 'new-skill', 'assets'))).toBe(true);
	});

	it('rejects non-kebab skill names', () => {
		expect(() => init_command({ name: 'Bad Skill' })).toThrow(
			/lowercase kebab-case/u,
		);
	});
});
