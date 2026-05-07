import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse_frontmatter } from './validate.js';

export interface DoctorFix {
	path: string;
	code: string;
	message: string;
	applied: boolean;
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
			});
		} else if (parsed.frontmatter.name !== expected_name) {
			next = replace_frontmatter_field(next, 'name', expected_name);
			fixes.push({
				path: skill_file,
				code: 'fix-name-mismatch',
				message: 'replace name with parent directory',
				applied: write,
			});
		}

		if (
			typeof parsed.frontmatter.description === 'string' &&
			!has_trigger_language(parsed.frontmatter.description)
		) {
			const description = add_trigger_language(
				parsed.frontmatter.description,
			);
			next = replace_frontmatter_field(
				next,
				'description',
				description,
			);
			fixes.push({
				path: skill_file,
				code: 'add-trigger-language',
				message: 'rewrite description with trigger language',
				applied: write,
			});
		}
	}

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

function add_trigger_language(description: string): string {
	const trimmed = description.trim();
	return `Use when you need ${lowercase_first(trimmed)}`;
}

function lowercase_first(value: string): string {
	return value.charAt(0).toLowerCase() + value.slice(1);
}
