import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseFrontmatter } from './validate.js';

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

export function doctorPath(
	path: string,
	write = false,
): DoctorReport {
	const skillFile = join(path, 'SKILL.md');
	const fixes: DoctorFix[] = [];

	if (!existsSync(skillFile)) {
		return { ok: false, fixes };
	}

	const original = readFileSync(skillFile, 'utf-8');
	let next = original;

	if (startsWithOpenFrontmatter(original)) {
		next = `${original.trimEnd()}\n---\n`;
		fixes.push({
			path: skillFile,
			code: 'add-frontmatter-close',
			message: 'add missing closing frontmatter delimiter',
			applied: write,
		});
	}

	const parsed = parseFrontmatter(next);
	if (
		parsed.frontmatter &&
		typeof parsed.frontmatter.name !== 'string'
	) {
		next = next.replace(/^---\n/u, `---\nname: ${basename(path)}\n`);
		fixes.push({
			path: skillFile,
			code: 'add-name',
			message: 'add name matching parent directory',
			applied: write,
		});
	}

	if (write && next !== original) {
		writeFileSync(skillFile, next);
	}

	return { ok: true, fixes };
}

function startsWithOpenFrontmatter(content: string): boolean {
	if (!content.startsWith('---\n')) {
		return false;
	}
	return (
		content.split(/\r?\n/).filter((line) => line.trim() === '---')
			.length === 1
	);
}
