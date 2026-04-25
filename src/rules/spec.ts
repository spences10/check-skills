import { existsSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, normalize } from 'node:path';
import type { Problem, SkillDocument } from '../types.js';

const VALID_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface LocalReference {
	path: string;
	line: number;
	column: number;
}

export function run_spec_rules(document: SkillDocument): Problem[] {
	const problems: Problem[] = [];
	const skill_file = document.skill_file;

	if (document.frontmatter_error) {
		problems.push({
			severity: 'error',
			code: existsSync(skill_file)
				? 'invalid-frontmatter'
				: 'missing-skill-md',
			message: existsSync(skill_file)
				? document.frontmatter_error
				: 'No SKILL.md found in this directory',
			file: existsSync(skill_file) ? 'SKILL.md' : undefined,
			line: existsSync(skill_file) ? 1 : undefined,
			column: existsSync(skill_file) ? 1 : undefined,
			suggestion: existsSync(skill_file)
				? 'Fix the YAML frontmatter at the top of SKILL.md.'
				: 'If this is a repository or parent directory containing skills, run: check-skills validate <path> --recursive',
		});
	}

	const frontmatter = document.frontmatter;
	if (!frontmatter) {
		return problems;
	}

	if (
		typeof frontmatter.name !== 'string' ||
		frontmatter.name.trim() === ''
	) {
		problems.push({
			severity: 'error',
			code: 'missing-name',
			message: 'required frontmatter field "name" is missing',
			file: 'SKILL.md',
			line: 1,
			column: 1,
			suggestion: `Add name: ${basename(document.dir)} to SKILL.md frontmatter.`,
		});
	} else {
		const name = frontmatter.name;
		const expected_name = basename(document.dir);
		const line = frontmatter_line(document, 'name');

		if (name !== expected_name) {
			problems.push({
				severity: 'error',
				code: 'name-mismatch',
				message: `name must match parent directory: ${expected_name}`,
				file: 'SKILL.md',
				line,
				column: 1,
				suggestion: `Change the frontmatter name to: ${expected_name}`,
			});
		}

		if (name.length > 64) {
			problems.push({
				severity: 'error',
				code: 'name-too-long',
				message: 'name must be 64 characters or fewer',
				file: 'SKILL.md',
				line,
				column: 1,
				suggestion:
					'Shorten the skill directory and frontmatter name.',
			});
		}

		if (!VALID_NAME.test(name)) {
			problems.push({
				severity: 'error',
				code: 'invalid-name',
				message:
					'name must be lowercase kebab-case with no spaces, underscores, leading/trailing hyphens, or consecutive hyphens',
				file: 'SKILL.md',
				line,
				column: 1,
				suggestion: 'Use lowercase kebab-case, e.g. my-skill-name.',
			});
		}
	}

	if (
		typeof frontmatter.description !== 'string' ||
		frontmatter.description.trim() === ''
	) {
		problems.push({
			severity: 'error',
			code: 'missing-description',
			message: 'required frontmatter field "description" is missing',
			file: 'SKILL.md',
			line: 1,
			column: 1,
			suggestion:
				'Add a description with trigger language, e.g. "Use when...".',
		});
	} else if (frontmatter.description.length > 1024) {
		problems.push({
			severity: 'error',
			code: 'description-too-long',
			message: 'description must be 1024 characters or fewer',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'description'),
			column: 1,
			suggestion:
				'Shorten the description and move detail into the body.',
		});
	}

	if (
		frontmatter.license !== undefined &&
		typeof frontmatter.license !== 'string'
	) {
		problems.push({
			severity: 'error',
			code: 'invalid-license',
			message: 'license must be a string when provided',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'license'),
			column: 1,
			suggestion:
				'Use a short license name, such as MIT, or a bundled license filename.',
		});
	}

	if (
		frontmatter.compatibility !== undefined &&
		(typeof frontmatter.compatibility !== 'string' ||
			frontmatter.compatibility.length > 500 ||
			frontmatter.compatibility.trim() === '')
	) {
		problems.push({
			severity: 'error',
			code: 'invalid-compatibility',
			message:
				'compatibility must be a non-empty string of 500 characters or fewer',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'compatibility'),
			column: 1,
			suggestion:
				'Rewrite compatibility as a short string or remove the field.',
		});
	}

	if (
		frontmatter['allowed-tools'] !== undefined &&
		typeof frontmatter['allowed-tools'] !== 'string'
	) {
		problems.push({
			severity: 'error',
			code: 'invalid-allowed-tools',
			message: 'allowed-tools must be a space-separated string',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'allowed-tools'),
			column: 1,
			suggestion:
				'Rewrite allowed-tools as a string, e.g. allowed-tools: Bash Read.',
		});
	}

	if (
		frontmatter.metadata !== undefined &&
		!is_string_map(frontmatter.metadata)
	) {
		problems.push({
			severity: 'error',
			code: 'invalid-metadata',
			message: 'metadata must be a string-to-string map',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'metadata'),
			column: 1,
			suggestion:
				'Use only string values in metadata, or remove the metadata field.',
		});
	}

	problems.push(...check_referenced_files(document));
	return problems;
}

function is_string_map(value: unknown): boolean {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.values(value).every((item) => typeof item === 'string')
	);
}

export function check_referenced_files(
	document: SkillDocument,
): Problem[] {
	const problems: Problem[] = [];
	const references = extract_local_reference_locations(document);

	for (const reference of references) {
		const target = normalize(join(document.dir, reference.path));
		const root = normalize(document.dir);
		if (target !== root && !target.startsWith(`${root}/`)) {
			continue;
		}

		if (!existsSync(target)) {
			problems.push({
				severity: 'error',
				code: 'missing-reference',
				message: `referenced local file does not exist: ${reference.path}`,
				file: 'SKILL.md',
				line: reference.line,
				column: reference.column,
				suggestion:
					'Create the referenced file or update the Markdown link/resource path.',
			});
		}
	}

	return problems;
}

export function extract_local_references(markdown: string): string[] {
	return extract_local_references_from_body(markdown).map(
		(reference) => reference.path,
	);
}

export function extract_local_reference_locations(
	document: SkillDocument,
): LocalReference[] {
	return extract_local_references_from_body(document.body).map(
		(reference) => ({
			...reference,
			line: reference.line + document.body_start_line - 1,
		}),
	);
}

function extract_local_references_from_body(
	markdown: string,
): LocalReference[] {
	const references: LocalReference[] = [];
	const lines = markdown.split(/\r?\n/);
	let in_fence = false;

	lines.forEach((line, index) => {
		if (/^\s*```/.test(line)) {
			in_fence = !in_fence;
			return;
		}
		if (in_fence) {
			return;
		}

		const markdown_link = /!?\[[^\]]*\]\(([^)]+)\)/g;
		for (const match of line.matchAll(markdown_link)) {
			add_reference(
				references,
				match[1] ?? '',
				index + 1,
				match.index + 1,
			);
		}

		const resource_path =
			/(?:^|[\s("'`])((?:references|scripts|assets)\/[^\s)"'`<>]+)/g;
		for (const match of line.matchAll(resource_path)) {
			const raw = match[1] ?? '';
			add_reference(
				references,
				raw,
				index + 1,
				line.indexOf(raw) + 1,
			);
		}
	});

	return dedupe_references(references);
}

function add_reference(
	references: LocalReference[],
	raw_value: string,
	line: number,
	column: number,
): void {
	const value = raw_value.split('#')[0]?.split('?')[0]?.trim() ?? '';
	const cleaned = value.replace(/[.,;:]+$/u, '');

	if (!cleaned || is_external(cleaned) || isAbsolute(cleaned)) {
		return;
	}

	if (
		cleaned.startsWith('./') ||
		cleaned.startsWith('../') ||
		cleaned.startsWith('references/') ||
		cleaned.startsWith('scripts/') ||
		cleaned.startsWith('assets/')
	) {
		references.push({ path: cleaned, line, column });
	}
}

function dedupe_references(
	references: LocalReference[],
): LocalReference[] {
	const seen = new Set<string>();
	return references.filter((reference) => {
		const key = `${reference.path}:${reference.line}:${reference.column}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function is_external(value: string): boolean {
	return /^[a-z][a-z0-9+.-]*:/iu.test(value) || value.startsWith('#');
}

export function frontmatter_line(
	document: SkillDocument,
	field: string,
): number {
	const lines = document.content.split(/\r?\n/);
	const index = lines.findIndex((line) =>
		new RegExp(`^${field}:`, 'u').test(line.trim()),
	);
	return index === -1 ? 1 : index + 1;
}

export function is_executable(path: string): boolean {
	try {
		return (statSync(path).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}
