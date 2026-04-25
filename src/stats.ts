import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateOptions } from './types.js';
import { validate_paths } from './validate.js';

export interface StatsReport {
	skills: number;
	passing: number;
	failing: number;
	warnings: number;
	longest_descriptions: Array<{
		path: string;
		name?: string;
		length: number;
	}>;
	largest_skill_files: Array<{ path: string; bytes: number }>;
	with_scripts: number;
	with_references: number;
	with_assets: number;
	duplicate_names: string[];
	vendor_specific_language: number;
}

export function get_stats(
	path: string,
	options: ValidateOptions = {},
): StatsReport {
	const report = validate_paths([path], {
		...options,
		recursive: true,
	});
	const duplicate_names = find_duplicates(
		report.skills
			.map((skill) => skill.name)
			.filter((name) => name !== undefined),
	);

	return {
		skills: report.summary.checked,
		passing: report.summary.passed,
		failing: report.summary.failed,
		warnings: report.summary.warnings,
		longest_descriptions: report.skills
			.map((skill) => {
				const description = String(
					read_frontmatter_value(
						skill.path,
						'description',
						options.cwd,
					),
				);
				return {
					path: skill.path,
					name: skill.name,
					length:
						description === 'undefined' ? 0 : description.length,
				};
			})
			.sort((a, b) => b.length - a.length)
			.slice(0, 10),
		largest_skill_files: report.skills
			.map((skill) => ({
				path: skill.path,
				bytes: skill_file_size(skill.path, options.cwd),
			}))
			.sort((a, b) => b.bytes - a.bytes)
			.slice(0, 10),
		with_scripts: count_with_dir(
			report.skills.map((skill) => skill.path),
			'scripts',
			options.cwd,
		),
		with_references: count_with_dir(
			report.skills.map((skill) => skill.path),
			'references',
			options.cwd,
		),
		with_assets: count_with_dir(
			report.skills.map((skill) => skill.path),
			'assets',
			options.cwd,
		),
		duplicate_names,
		vendor_specific_language: report.skills.reduce(
			(count, skill) =>
				count +
				skill.problems.filter(
					(problem) => problem.code === 'vendor-specific-wording',
				).length,
			0,
		),
	};
}

function read_frontmatter_value(
	skill_path: string,
	key: string,
	cwd = process.cwd(),
): unknown {
	const full_path = join(cwd, skill_path, 'SKILL.md');
	try {
		const raw = readFileSync(full_path, 'utf-8');
		const match = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'mu'));
		return match?.[1]?.replace(/^['"]|['"]$/gu, '');
	} catch {
		return undefined;
	}
}

function skill_file_size(
	skill_path: string,
	cwd = process.cwd(),
): number {
	try {
		return statSync(join(cwd, skill_path, 'SKILL.md')).size;
	} catch {
		return 0;
	}
}

function count_with_dir(
	paths: string[],
	dir: string,
	cwd = process.cwd(),
): number {
	return paths.filter((path) => existsSync(join(cwd, path, dir)))
		.length;
}

function find_duplicates(values: string[]): string[] {
	const seen = new Set<string>();
	const duplicate = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			duplicate.add(value);
		}
		seen.add(value);
	}
	return [...duplicate].sort();
}

export function format_stats(report: StatsReport): string {
	const lines = [
		`${report.skills} skills: ${report.passing} passing, ${report.failing} failing, ${report.warnings} warnings`,
		`with scripts: ${report.with_scripts}`,
		`with references: ${report.with_references}`,
		`with assets: ${report.with_assets}`,
	];

	if (report.duplicate_names.length > 0) {
		lines.push(
			`duplicate names: ${report.duplicate_names.join(', ')}`,
		);
	}

	return lines.join('\n');
}
