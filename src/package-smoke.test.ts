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
