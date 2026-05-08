import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

interface PackFile {
	path: string;
}

interface PackResult {
	files: PackFile[];
}

describe('package smoke', () => {
	it('packs the CLI and public API entrypoints', () => {
		const raw = execFileSync(
			'pnpm',
			['pack', '--dry-run', '--json'],
			{
				encoding: 'utf-8',
			},
		);
		const result = JSON.parse(raw) as PackResult;
		const files = new Set(result.files.map((file) => file.path));

		for (const expected of [
			'package.json',
			'README.md',
			'LICENSE',
			'dist/index.js',
			'dist/api.js',
			'dist/api.d.ts',
			'dist/index.d.ts',
		]) {
			expect(files.has(expected)).toBe(true);
		}
	});

	it('loads the built public API', async () => {
		const api = (await import('../dist/api.js')) as {
			validate_paths?: unknown;
			doctor_path?: unknown;
			skills_to_prompt?: unknown;
		};

		expect(typeof api.validate_paths).toBe('function');
		expect(typeof api.doctor_path).toBe('function');
		expect(typeof api.skills_to_prompt).toBe('function');
	});

	it('runs the packed CLI help', () => {
		const output = execFileSync(
			process.execPath,
			['dist/index.js', '--help'],
			{
				encoding: 'utf-8',
			},
		);

		expect(output).toContain('check-skills');
		expect(output).toContain('IMPORTANT FOR LLMs');
		expect(output).toContain('validate');
	});
});
