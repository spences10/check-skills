import { existsSync, statSync } from 'node:fs';
import {
	basename,
	dirname,
	isAbsolute,
	join,
	normalize,
} from 'node:path';
import type { Problem, SkillDocument } from '../types.js';

const VALID_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function runSpecRules(document: SkillDocument): Problem[] {
	const problems: Problem[] = [];
	const skillFile = document.skillFile;

	if (document.frontmatterError) {
		problems.push({
			severity: 'error',
			code: existsSync(skillFile)
				? 'invalid-frontmatter'
				: 'missing-skill-md',
			message: document.frontmatterError,
			file: existsSync(skillFile) ? 'SKILL.md' : undefined,
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
		});
	} else {
		const name = frontmatter.name;
		const expectedName = basename(document.dir);

		if (name !== expectedName) {
			problems.push({
				severity: 'error',
				code: 'name-mismatch',
				message: `name must match parent directory: ${expectedName}`,
				file: 'SKILL.md',
			});
		}

		if (name.length > 64) {
			problems.push({
				severity: 'error',
				code: 'name-too-long',
				message: 'name must be 64 characters or fewer',
				file: 'SKILL.md',
			});
		}

		if (!VALID_NAME.test(name)) {
			problems.push({
				severity: 'error',
				code: 'invalid-name',
				message:
					'name must be lowercase kebab-case with no spaces, underscores, leading/trailing hyphens, or consecutive hyphens',
				file: 'SKILL.md',
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
		});
	} else if (frontmatter.description.length > 1024) {
		problems.push({
			severity: 'error',
			code: 'description-too-long',
			message: 'description must be 1024 characters or fewer',
			file: 'SKILL.md',
		});
	}

	if (
		frontmatter.compatibility !== undefined &&
		(typeof frontmatter.compatibility !== 'string' ||
			frontmatter.compatibility.length > 500)
	) {
		problems.push({
			severity: 'error',
			code: 'invalid-compatibility',
			message:
				'compatibility must be a string of 500 characters or fewer',
			file: 'SKILL.md',
		});
	}

	if (
		frontmatter.metadata !== undefined &&
		!isStringMap(frontmatter.metadata)
	) {
		problems.push({
			severity: 'error',
			code: 'invalid-metadata',
			message: 'metadata must be a string-to-string map',
			file: 'SKILL.md',
		});
	}

	problems.push(...checkReferencedFiles(document));
	return problems;
}

function isStringMap(value: unknown): boolean {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.values(value).every((item) => typeof item === 'string')
	);
}

export function checkReferencedFiles(
	document: SkillDocument,
): Problem[] {
	const problems: Problem[] = [];
	const references = extractLocalReferences(document.body);

	for (const reference of references) {
		const target = normalize(join(document.dir, reference));
		if (!target.startsWith(normalize(document.dir))) {
			continue;
		}

		if (!existsSync(target)) {
			problems.push({
				severity: 'error',
				code: 'missing-reference',
				message: `referenced local file does not exist: ${reference}`,
				file: 'SKILL.md',
			});
		}
	}

	return problems;
}

export function extractLocalReferences(markdown: string): string[] {
	const references = new Set<string>();
	const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;
	for (const match of markdown.matchAll(markdownLink)) {
		addReference(references, match[1] ?? '');
	}

	const inlinePath =
		/(?:^|[\s("'`])((?:\.\.?\/|references\/|scripts\/|assets\/)[^\s)"'`<>]+)/gm;
	for (const match of markdown.matchAll(inlinePath)) {
		addReference(references, match[1] ?? '');
	}

	return [...references];
}

function addReference(
	references: Set<string>,
	rawValue: string,
): void {
	const value = rawValue.split('#')[0]?.split('?')[0]?.trim() ?? '';
	const cleaned = value.replace(/[.,;:]+$/u, '');

	if (!cleaned || isExternal(cleaned) || isAbsolute(cleaned)) {
		return;
	}

	if (
		cleaned.startsWith('./') ||
		cleaned.startsWith('../') ||
		cleaned.startsWith('references/') ||
		cleaned.startsWith('scripts/') ||
		cleaned.startsWith('assets/')
	) {
		references.add(cleaned);
	}
}

function isExternal(value: string): boolean {
	return /^[a-z][a-z0-9+.-]*:/iu.test(value) || value.startsWith('#');
}

export function isExecutable(path: string): boolean {
	try {
		return (statSync(path).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

export function skillDirForDocument(document: SkillDocument): string {
	return dirname(document.skillFile);
}
