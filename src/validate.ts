import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import YAML from 'yaml';
import { run_adapter_rules } from './rules/adapters.js';
import { run_quality_rules } from './rules/quality.js';
import { run_spec_rules } from './rules/spec.js';
import type {
	Problem,
	SkillDocument,
	SkillResult,
	ValidateOptions,
	ValidationReport,
} from './types.js';

export function discover_skill_dirs(
	paths: string[],
	options: ValidateOptions = {},
): string[] {
	const cwd = options.cwd ?? process.cwd();
	const found = new Set<string>();

	for (const input of paths) {
		const full_path = resolve(cwd, input);
		if (!existsSync(full_path)) {
			found.add(full_path);
			continue;
		}

		const stats = statSync(full_path);
		if (stats.isFile()) {
			found.add(
				basename(full_path) === 'SKILL.md'
					? resolve(full_path, '..')
					: full_path,
			);
			continue;
		}

		if (!stats.isDirectory()) {
			found.add(full_path);
			continue;
		}

		if (existsSync(join(full_path, 'SKILL.md'))) {
			found.add(full_path);
			continue;
		}

		if (options.recursive) {
			for (const dir of walk_for_skill_dirs(full_path)) {
				found.add(dir);
			}
		} else {
			found.add(full_path);
		}
	}

	return [...found].sort();
}

function walk_for_skill_dirs(root: string): string[] {
	const found: string[] = [];
	const entries = safe_read_dir(root);

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

		const full_path = join(root, entry);
		if (safe_is_directory(full_path)) {
			found.push(...walk_for_skill_dirs(full_path));
		}
	}

	return found;
}

function safe_read_dir(path: string): string[] {
	try {
		return readdirSync(path);
	} catch {
		return [];
	}
}

function safe_is_directory(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

export function read_skill_document(dir: string): SkillDocument {
	const skill_file = join(dir, 'SKILL.md');

	if (!existsSync(skill_file)) {
		return {
			dir,
			skill_file,
			frontmatter: null,
			body: '',
			line_count: 0,
			body_start_line: 1,
			content: '',
			frontmatter_error: 'SKILL.md is missing',
		};
	}

	const content = readFileSync(skill_file, 'utf-8');
	const line_count = content.split(/\r?\n/).length;
	const parsed = parse_frontmatter(content);

	return {
		dir,
		skill_file,
		line_count,
		content,
		...parsed,
	};
}

export function parse_frontmatter(
	content: string,
): Pick<
	SkillDocument,
	'frontmatter' | 'body' | 'body_start_line' | 'frontmatter_error'
> {
	const lines = content.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		return {
			frontmatter: null,
			body: content,
			body_start_line: 1,
			frontmatter_error: 'YAML frontmatter is missing',
		};
	}

	const end_index = lines.findIndex(
		(line, index) => index > 0 && line.trim() === '---',
	);
	if (end_index === -1) {
		return {
			frontmatter: null,
			body: lines.slice(1).join('\n'),
			body_start_line: 2,
			frontmatter_error:
				'YAML frontmatter closing delimiter is missing',
		};
	}

	const raw_yaml = lines.slice(1, end_index).join('\n');
	try {
		const parsed = YAML.parse(raw_yaml) as unknown;
		if (
			parsed === null ||
			typeof parsed !== 'object' ||
			Array.isArray(parsed)
		) {
			return {
				frontmatter: null,
				body: lines.slice(end_index + 1).join('\n'),
				body_start_line: end_index + 2,
				frontmatter_error: 'YAML frontmatter must be a mapping',
			};
		}

		return {
			frontmatter: parsed as SkillDocument['frontmatter'],
			body: lines.slice(end_index + 1).join('\n'),
			body_start_line: end_index + 2,
		};
	} catch (error) {
		return {
			frontmatter: null,
			body: lines.slice(end_index + 1).join('\n'),
			body_start_line: end_index + 2,
			frontmatter_error:
				error instanceof Error
					? error.message
					: 'YAML frontmatter is invalid',
		};
	}
}

export function validate_skill_dir(
	dir: string,
	options: ValidateOptions = {},
): SkillResult {
	const document = read_skill_document(dir);
	const problems: Problem[] = [];
	problems.push(...run_spec_rules(document));

	if (options.quality !== false) {
		problems.push(...run_quality_rules(document));
	}

	if (options.agent) {
		problems.push(...run_adapter_rules(document, options.agent));
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

export function validate_paths(
	paths: string[],
	options: ValidateOptions = {},
): ValidationReport {
	const skill_dirs = discover_skill_dirs(paths, options);
	const skills = skill_dirs.map((dir) =>
		validate_skill_dir(dir, options),
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
