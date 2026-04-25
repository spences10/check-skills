import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import YAML from 'yaml';
import { runAdapterRules } from './rules/adapters.js';
import { runQualityRules } from './rules/quality.js';
import { runSpecRules } from './rules/spec.js';
import type {
	Problem,
	SkillDocument,
	SkillResult,
	ValidateOptions,
	ValidationReport,
} from './types.js';

export function discoverSkillDirs(
	paths: string[],
	options: ValidateOptions = {},
): string[] {
	const cwd = options.cwd ?? process.cwd();
	const found = new Set<string>();

	for (const input of paths) {
		const fullPath = resolve(cwd, input);
		if (!existsSync(fullPath)) {
			found.add(fullPath);
			continue;
		}

		const stats = statSync(fullPath);
		if (stats.isFile()) {
			found.add(
				basename(fullPath) === 'SKILL.md'
					? resolve(fullPath, '..')
					: fullPath,
			);
			continue;
		}

		if (!stats.isDirectory()) {
			found.add(fullPath);
			continue;
		}

		if (existsSync(join(fullPath, 'SKILL.md'))) {
			found.add(fullPath);
			continue;
		}

		if (options.recursive) {
			for (const dir of walkForSkillDirs(fullPath)) {
				found.add(dir);
			}
		} else {
			found.add(fullPath);
		}
	}

	return [...found].sort();
}

function walkForSkillDirs(root: string): string[] {
	const found: string[] = [];
	const entries = safeReadDir(root);

	if (existsSync(join(root, 'SKILL.md'))) {
		found.push(root);
		return found;
	}

	for (const entry of entries) {
		if (
			entry.startsWith('.') ||
			entry === 'node_modules' ||
			entry === 'dist'
		) {
			continue;
		}

		const fullPath = join(root, entry);
		if (safeIsDirectory(fullPath)) {
			found.push(...walkForSkillDirs(fullPath));
		}
	}

	return found;
}

function safeReadDir(path: string): string[] {
	try {
		return readdirSync(path);
	} catch {
		return [];
	}
}

function safeIsDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

export function readSkillDocument(dir: string): SkillDocument {
	const skillFile = join(dir, 'SKILL.md');

	if (!existsSync(skillFile)) {
		return {
			dir,
			skillFile,
			frontmatter: null,
			body: '',
			lineCount: 0,
			frontmatterError: 'SKILL.md is missing',
		};
	}

	const content = readFileSync(skillFile, 'utf-8');
	const lineCount = content.split(/\r?\n/).length;
	const parsed = parseFrontmatter(content);

	return {
		dir,
		skillFile,
		lineCount,
		...parsed,
	};
}

export function parseFrontmatter(
	content: string,
): Pick<SkillDocument, 'frontmatter' | 'body' | 'frontmatterError'> {
	const lines = content.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		return {
			frontmatter: null,
			body: content,
			frontmatterError: 'YAML frontmatter is missing',
		};
	}

	const endIndex = lines.findIndex(
		(line, index) => index > 0 && line.trim() === '---',
	);
	if (endIndex === -1) {
		return {
			frontmatter: null,
			body: lines.slice(1).join('\n'),
			frontmatterError:
				'YAML frontmatter closing delimiter is missing',
		};
	}

	const rawYaml = lines.slice(1, endIndex).join('\n');
	try {
		const parsed = YAML.parse(rawYaml) as unknown;
		if (
			parsed === null ||
			typeof parsed !== 'object' ||
			Array.isArray(parsed)
		) {
			return {
				frontmatter: null,
				body: lines.slice(endIndex + 1).join('\n'),
				frontmatterError: 'YAML frontmatter must be a mapping',
			};
		}

		return {
			frontmatter: parsed as SkillDocument['frontmatter'],
			body: lines.slice(endIndex + 1).join('\n'),
		};
	} catch (error) {
		return {
			frontmatter: null,
			body: lines.slice(endIndex + 1).join('\n'),
			frontmatterError:
				error instanceof Error
					? error.message
					: 'YAML frontmatter is invalid',
		};
	}
}

export function validateSkillDir(
	dir: string,
	options: ValidateOptions = {},
): SkillResult {
	const document = readSkillDocument(dir);
	const problems: Problem[] = [];
	problems.push(...runSpecRules(document));

	if (options.quality !== false) {
		problems.push(...runQualityRules(document));
	}

	if (options.agent) {
		problems.push(...runAdapterRules(document, options.agent));
	}

	const errors = problems.filter(
		(problem) => problem.severity === 'error',
	);
	const name =
		typeof document.frontmatter?.name === 'string'
			? document.frontmatter.name
			: undefined;

	return {
		path: relative(options.cwd ?? process.cwd(), dir) || '.',
		name,
		ok: errors.length === 0,
		problems,
	};
}

export function validatePaths(
	paths: string[],
	options: ValidateOptions = {},
): ValidationReport {
	const skillDirs = discoverSkillDirs(paths, options);
	const skills = skillDirs.map((dir) =>
		validateSkillDir(dir, options),
	);
	const errors = skills.reduce(
		(count, skill) =>
			count +
			skill.problems.filter((p) => p.severity === 'error').length,
		0,
	);
	const warnings = skills.reduce(
		(count, skill) =>
			count +
			skill.problems.filter((p) => p.severity === 'warn').length,
		0,
	);
	const failed = skills.filter((skill) =>
		options.strict ? skill.problems.length > 0 : !skill.ok,
	).length;
	const passed = skills.length - failed;

	return {
		ok: options.strict ? errors + warnings === 0 : errors === 0,
		summary: {
			checked: skills.length,
			passed,
			failed,
			errors,
			warnings,
		},
		skills,
	};
}
