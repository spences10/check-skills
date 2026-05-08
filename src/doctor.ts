import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { parse_frontmatter } from './validate.js';

export interface DoctorFix {
	path: string;
	code: string;
	message: string;
	applied: boolean;
	before?: string;
	after?: string;
}

export interface DoctorReport {
	ok: boolean;
	fixes: DoctorFix[];
}

export function doctor_path(
	path: string,
	write = false,
): DoctorReport {
	const skill_file = join(path, 'SKILL.md');
	const fixes: DoctorFix[] = [];

	if (!existsSync(skill_file)) {
		return { ok: false, fixes };
	}

	const original = readFileSync(skill_file, 'utf-8');
	let next = original;

	if (starts_with_open_frontmatter(original)) {
		next = `${original.trimEnd()}\n---\n`;
		fixes.push({
			path: skill_file,
			code: 'add-frontmatter-close',
			message: 'add missing closing frontmatter delimiter',
			applied: write,
			before: original.trimEnd().split(/\r?\n/u).at(-1),
			after: '---',
		});
	}

	const parsed = parse_frontmatter(next);
	if (parsed.frontmatter) {
		const expected_name = basename(path);
		if (typeof parsed.frontmatter.name !== 'string') {
			next = next.replace(/^---\n/u, `---\nname: ${expected_name}\n`);
			fixes.push({
				path: skill_file,
				code: 'add-name',
				message: 'add name matching parent directory',
				applied: write,
				after: `name: ${expected_name}`,
			});
		} else if (parsed.frontmatter.name !== expected_name) {
			const before = `name: ${parsed.frontmatter.name}`;
			next = replace_frontmatter_field(next, 'name', expected_name);
			fixes.push({
				path: skill_file,
				code: 'fix-name-mismatch',
				message: 'replace name with parent directory',
				applied: write,
				before,
				after: `name: ${expected_name}`,
			});
		}

		if (typeof parsed.frontmatter.description === 'string') {
			const description = parsed.frontmatter.description;
			if (is_multiline_frontmatter_field(next, 'description')) {
				fixes.push({
					path: skill_file,
					code: 'manual-multiline-description',
					message:
						'multiline descriptions need manual reflow before doctor can safely rewrite them',
					applied: false,
				});
			} else if (!has_trigger_language(description)) {
				const rewritten = safe_trigger_rewrite(description);
				if (rewritten) {
					next = replace_frontmatter_field(
						next,
						'description',
						rewritten,
					);
					fixes.push({
						path: skill_file,
						code: 'add-trigger-language',
						message: 'rewrite description with trigger language',
						applied: write,
						before: `description: ${description}`,
						after: `description: ${rewritten}`,
					});
				} else {
					fixes.push({
						path: skill_file,
						code: 'manual-trigger-language',
						message:
							'description needs trigger language but is too prose-heavy to rewrite safely',
						applied: false,
						before: `description: ${description}`,
					});
				}
			}
		}
	}

	fixes.push(...script_permission_suggestions(path));

	if (write && next !== original) {
		writeFileSync(skill_file, next);
	}

	return { ok: true, fixes };
}

function starts_with_open_frontmatter(content: string): boolean {
	if (!content.startsWith('---\n')) {
		return false;
	}
	return (
		content.split(/\r?\n/).filter((line) => line.trim() === '---')
			.length === 1
	);
}

function replace_frontmatter_field(
	content: string,
	field: string,
	value: string,
): string {
	const yaml_value = yaml_plain_scalar(value)
		? value
		: JSON.stringify(value);
	return content.replace(
		new RegExp(`^${field}:.*$`, 'mu'),
		`${field}: ${yaml_value}`,
	);
}

function yaml_plain_scalar(value: string): boolean {
	return (
		value.trim() === value &&
		value.length > 0 &&
		!/[\n\r:#{}[\],&*?|>'"%@`]/u.test(value)
	);
}

function has_trigger_language(description: string): boolean {
	return /\b(use when|use for|use to|when asked|when the user|run when|trigger)\b/iu.test(
		description,
	);
}

function safe_trigger_rewrite(
	description: string,
): string | undefined {
	const trimmed = description.trim();
	if (!trimmed || trimmed.length > 160 || /[;:]/u.test(trimmed)) {
		return undefined;
	}
	if ((trimmed.match(/[.!?]/gu)?.length ?? 0) > 1) {
		return undefined;
	}
	return `Use when you need ${lowercase_first(trimmed)}`;
}

function is_multiline_frontmatter_field(
	content: string,
	field: string,
): boolean {
	const lines = content.split(/\r?\n/u);
	const index = lines.findIndex((line) =>
		new RegExp(`^${field}:`, 'u').test(line),
	);
	if (index === -1) return false;
	const value = lines[index]
		?.replace(new RegExp(`^${field}:`, 'u'), '')
		.trim();
	if (value === '>' || value === '|') return true;
	return /^\s+\S/u.test(lines[index + 1] ?? '');
}

function script_permission_suggestions(path: string): DoctorFix[] {
	const scripts_dir = join(path, 'scripts');
	if (!existsSync(scripts_dir)) return [];
	return safe_read_dir(scripts_dir)
		.filter((script) => is_likely_executable(script))
		.map((script) => join(scripts_dir, script))
		.filter((script_path) => !is_executable(script_path))
		.map((script_path) => ({
			path: script_path,
			code: 'chmod-script',
			message:
				'script looks executable but lacks executable permission; run chmod +x if it should be invoked directly',
			applied: false,
			after: `chmod +x ${script_path}`,
		}));
}

function safe_read_dir(path: string): string[] {
	try {
		return statSync(path).isDirectory() ? readdirSync(path) : [];
	} catch {
		return [];
	}
}

function is_likely_executable(path: string): boolean {
	return /\.(sh|bash|js|mjs|cjs|ts|py|rb|pl)$/iu.test(path);
}

function is_executable(path: string): boolean {
	try {
		return (statSync(path).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

function lowercase_first(value: string): string {
	return value.charAt(0).toLowerCase() + value.slice(1);
}
