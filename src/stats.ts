import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validatePaths } from './validate.js';
import type { ValidateOptions } from './types.js';

export interface StatsReport {
	skills: number;
	passing: number;
	failing: number;
	warnings: number;
	longestDescriptions: Array<{
		path: string;
		name?: string;
		length: number;
	}>;
	largestSkillFiles: Array<{ path: string; bytes: number }>;
	withScripts: number;
	withReferences: number;
	withAssets: number;
	duplicateNames: string[];
	vendorSpecificLanguage: number;
}

export function getStats(
	path: string,
	options: ValidateOptions = {},
): StatsReport {
	const report = validatePaths([path], {
		...options,
		recursive: true,
	});
	const duplicateNames = findDuplicates(
		report.skills
			.map((skill) => skill.name)
			.filter((name) => name !== undefined),
	);

	return {
		skills: report.summary.checked,
		passing: report.summary.passed,
		failing: report.summary.failed,
		warnings: report.summary.warnings,
		longestDescriptions: report.skills
			.map((skill) => {
				const description = String(
					readFrontmatterValue(
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
		largestSkillFiles: report.skills
			.map((skill) => ({
				path: skill.path,
				bytes: skillFileSize(skill.path, options.cwd),
			}))
			.sort((a, b) => b.bytes - a.bytes)
			.slice(0, 10),
		withScripts: countWithDir(
			report.skills.map((skill) => skill.path),
			'scripts',
			options.cwd,
		),
		withReferences: countWithDir(
			report.skills.map((skill) => skill.path),
			'references',
			options.cwd,
		),
		withAssets: countWithDir(
			report.skills.map((skill) => skill.path),
			'assets',
			options.cwd,
		),
		duplicateNames,
		vendorSpecificLanguage: report.skills.reduce(
			(count, skill) =>
				count +
				skill.problems.filter(
					(problem) => problem.code === 'vendor-specific-wording',
				).length,
			0,
		),
	};
}

function readFrontmatterValue(
	skillPath: string,
	key: string,
	cwd = process.cwd(),
): unknown {
	const fullPath = join(cwd, skillPath, 'SKILL.md');
	try {
		const raw = readFileSync(fullPath, 'utf-8');
		const match = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'mu'));
		return match?.[1]?.replace(/^['"]|['"]$/gu, '');
	} catch {
		return undefined;
	}
}

function skillFileSize(
	skillPath: string,
	cwd = process.cwd(),
): number {
	try {
		return statSync(join(cwd, skillPath, 'SKILL.md')).size;
	} catch {
		return 0;
	}
}

function countWithDir(
	paths: string[],
	dir: string,
	cwd = process.cwd(),
): number {
	return paths.filter((path) => existsSync(join(cwd, path, dir)))
		.length;
}

function findDuplicates(values: string[]): string[] {
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

export function formatStats(report: StatsReport): string {
	const lines = [
		`${report.skills} skills: ${report.passing} passing, ${report.failing} failing, ${report.warnings} warnings`,
		`with scripts: ${report.withScripts}`,
		`with references: ${report.withReferences}`,
		`with assets: ${report.withAssets}`,
	];

	if (report.duplicateNames.length > 0) {
		lines.push(
			`duplicate names: ${report.duplicateNames.join(', ')}`,
		);
	}

	return lines.join('\n');
}
