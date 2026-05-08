import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLI_PATH = join(process.cwd(), 'dist/index.js');

function tmp_root(): string {
	return mkdtempSync(join(tmpdir(), 'check-skills-cli-'));
}

function skill(root: string, name: string, content: string): string {
	const dir = join(root, name);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'SKILL.md'), content);
	return dir;
}

const VALID_SKILL = `---
name: good-skill
description: Use when you need to validate, review, or improve portable Agent Skills.
---

# good-skill

## Steps

- Validate the skill.
`;

describe('CLI smoke', () => {
	it('validates a passing skill through the built CLI', () => {
		const root = tmp_root();
		skill(root, 'good-skill', VALID_SKILL);

		const output = execFileSync(
			process.execPath,
			[CLI_PATH, 'validate', 'good-skill'],
			{ cwd: root, encoding: 'utf-8' },
		);

		expect(output).toContain('✓ good-skill');
		expect(output).toContain('1 skill checked');
	});

	it('returns non-zero for validation errors and emits JSON', () => {
		const root = tmp_root();
		skill(
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

		const result = spawnSync(
			process.execPath,
			[CLI_PATH, 'validate', 'bad-skill', '--json'],
			{ cwd: root, encoding: 'utf-8' },
		);

		expect(result.status).toBe(1);
		const report = JSON.parse(result.stdout) as {
			ok: boolean;
			summary: { errors: number };
		};
		expect(report.ok).toBe(false);
		expect(report.summary.errors).toBeGreaterThan(0);
	});

	it('supports multiple positional paths', () => {
		const root = tmp_root();
		skill(root, 'good-skill', VALID_SKILL);
		skill(
			root,
			'other-skill',
			VALID_SKILL.replaceAll('good-skill', 'other-skill'),
		);

		const output = execFileSync(
			process.execPath,
			[CLI_PATH, 'validate', 'good-skill', 'other-skill'],
			{ cwd: root, encoding: 'utf-8' },
		);

		expect(output).toContain('2 skills checked');
		expect(output).toContain('✓ good-skill');
		expect(output).toContain('✓ other-skill');
	});

	it('returns non-zero for strict warning failures', () => {
		const root = tmp_root();
		skill(
			root,
			'warn-skill',
			`---
name: warn-skill
description: Helps with stuff.
---

## Steps
- Validate.
`,
		);

		const result = spawnSync(
			process.execPath,
			[CLI_PATH, 'validate', 'warn-skill', '--strict'],
			{ cwd: root, encoding: 'utf-8' },
		);

		expect(result.status).toBe(1);
		expect(result.stdout).toContain('strict-failed');
	});

	it('emits concise LLM output and honors quiet mode', () => {
		const root = tmp_root();
		skill(root, 'good-skill', VALID_SKILL);
		skill(
			root,
			'warn-skill',
			`---
name: warn-skill
description: Helps with stuff.
---

## Steps
- Validate.
`,
		);

		const result = spawnSync(
			process.execPath,
			[
				CLI_PATH,
				'validate',
				'good-skill',
				'warn-skill',
				'--llm',
				'--quiet',
			],
			{ cwd: root, encoding: 'utf-8' },
		);

		expect(result.status).toBe(0);
		expect(result.stdout).toContain('WARN warn-skill');
		expect(result.stdout).not.toContain('PASS good-skill');
	});

	it('emits escaped GitHub annotations', () => {
		const root = tmp_root();
		skill(
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

		const result = spawnSync(
			process.execPath,
			[CLI_PATH, 'validate', 'bad-skill', '--format', 'github'],
			{ cwd: root, encoding: 'utf-8' },
		);

		expect(result.status).toBe(1);
		expect(result.stdout).toContain(
			'::error file=bad-skill/SKILL.md',
		);
		expect(result.stdout).toContain('title=name-mismatch');
	});

	it('can run spec-only validation with --no-quality', () => {
		const root = tmp_root();
		skill(
			root,
			'warn-skill',
			`---
name: warn-skill
description: Helps with stuff.
---

## Steps
- Validate.
`,
		);

		const result = spawnSync(
			process.execPath,
			[CLI_PATH, 'validate', 'warn-skill', '--no-quality', '--json'],
			{ cwd: root, encoding: 'utf-8' },
		);
		const report = JSON.parse(result.stdout) as {
			ok: boolean;
			summary: { warnings: number };
		};

		expect(result.status).toBe(0);
		expect(report.ok).toBe(true);
		expect(report.summary.warnings).toBe(0);
	});
});
