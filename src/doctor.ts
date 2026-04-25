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
	if (
		parsed.frontmatter &&
		typeof parsed.frontmatter.name !== 'string'
	) {
		next = next.replace(/^---\n/u, `---\nname: ${basename(path)}\n`);
		fixes.push({
			path: skill_file,
			code: 'add-name',
			message: 'add name matching parent directory',
			applied: write,
		});
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
