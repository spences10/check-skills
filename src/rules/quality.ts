import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Problem, SkillDocument } from '../types.js';
import { extractLocalReferences, isExecutable } from './spec.js';

const VENDOR_WORDS = [
	'Claude Code',
	'Codex',
	'Cursor',
	'Windsurf',
	'OpenCode',
	'Open Code',
	'Pi',
];

const TASK_KEYWORDS = [
	'add',
	'audit',
	'build',
	'check',
	'create',
	'debug',
	'design',
	'fix',
	'generate',
	'implement',
	'improve',
	'migrate',
	'plan',
	'refactor',
	'review',
	'test',
	'validate',
	'write',
];

export function runQualityRules(document: SkillDocument): Problem[] {
	const problems: Problem[] = [];
	const description =
		typeof document.frontmatter?.description === 'string'
			? document.frontmatter.description.trim()
			: '';
	const compatibility =
		typeof document.frontmatter?.compatibility === 'string'
			? document.frontmatter.compatibility
			: '';

	if (description) {
		if (isVagueDescription(description)) {
			problems.push({
				severity: 'warn',
				code: 'vague-description',
				message:
					'description should be specific enough for an agent to know when to use the skill',
				file: 'SKILL.md',
			});
		}

		if (!hasTriggerLanguage(description)) {
			problems.push({
				severity: 'warn',
				code: 'missing-trigger-language',
				message:
					'description should include trigger language such as "Use when..."',
				file: 'SKILL.md',
			});
		}

		if (!hasTaskKeyword(description)) {
			problems.push({
				severity: 'warn',
				code: 'missing-task-keywords',
				message:
					'description should include concrete task keywords agents can match',
				file: 'SKILL.md',
			});
		}
	}

	if (document.lineCount > 500) {
		problems.push({
			severity: 'warn',
			code: 'skill-md-too-long',
			message:
				'SKILL.md is over 500 lines; move detail into references/',
			file: 'SKILL.md',
		});
	}

	if (document.body.split(/\s+/).filter(Boolean).length > 2500) {
		problems.push({
			severity: 'warn',
			code: 'body-too-long',
			message:
				'SKILL.md body is very long; keep the main skill concise and move detail into references/',
			file: 'SKILL.md',
		});
	}

	if (hasVendorSpecificWording(document, compatibility)) {
		problems.push({
			severity: 'warn',
			code: 'vendor-specific-wording',
			message:
				'portable skills should avoid vendor-specific wording unless compatibility explains it',
			file: 'SKILL.md',
		});
	}

	problems.push(...checkScripts(document));

	if (
		document.body.trim() &&
		!hasConcreteInstructions(document.body)
	) {
		problems.push({
			severity: 'warn',
			code: 'no-concrete-instructions',
			message:
				'skill should include examples, decision steps, workflow, or concrete instructions',
			file: 'SKILL.md',
		});
	}

	return problems;
}

function isVagueDescription(description: string): boolean {
	const normalized = description.toLowerCase();
	return (
		normalized.length < 35 ||
		/^(helps?|assists?|supports?|guides?)\s+(with|to|you)/u.test(
			normalized,
		) ||
		/^(useful|helpful)\s+for\b/u.test(normalized)
	);
}

function hasTriggerLanguage(description: string): boolean {
	return /\b(use when|use for|use to|when asked|when the user|run when|trigger)\b/iu.test(
		description,
	);
}

function hasTaskKeyword(description: string): boolean {
	const lower = description.toLowerCase();
	return TASK_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function hasVendorSpecificWording(
	document: SkillDocument,
	compatibility: string,
): boolean {
	if (compatibility.trim()) {
		return false;
	}

	const description =
		typeof document.frontmatter?.description === 'string'
			? document.frontmatter.description
			: '';
	const text = `${document.body}\n${description}`;
	return VENDOR_WORDS.some((word) =>
		new RegExp(`\\b${escapeRegExp(word)}\\b`, 'u').test(text),
	);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkScripts(document: SkillDocument): Problem[] {
	const problems: Problem[] = [];
	const scriptsDir = join(document.dir, 'scripts');
	const references = extractLocalReferences(document.body);
	const scriptReferences = references.filter((reference) =>
		reference.startsWith('scripts/'),
	);

	if (existsSync(scriptsDir)) {
		for (const script of safeListFiles(scriptsDir)) {
			const relativeScript = `scripts/${script}`;
			if (
				!document.body.includes(relativeScript) &&
				!document.body.includes(script)
			) {
				problems.push({
					severity: 'warn',
					code: 'unreferenced-script',
					message: `script is present but not referenced from SKILL.md: ${relativeScript}`,
					file: 'SKILL.md',
				});
			}
		}
	}

	for (const reference of scriptReferences) {
		const fullPath = join(document.dir, reference);
		if (
			existsSync(fullPath) &&
			isLikelyExecutable(reference) &&
			!isExecutable(fullPath)
		) {
			problems.push({
				severity: 'warn',
				code: 'script-not-executable',
				message: `referenced script should be executable: ${reference}`,
				file: 'SKILL.md',
			});
		}
	}

	return problems;
}

function safeListFiles(dir: string): string[] {
	try {
		return readdirSync(dir).filter((entry) =>
			statSync(join(dir, entry)).isFile(),
		);
	} catch {
		return [];
	}
}

function isLikelyExecutable(path: string): boolean {
	return /\.(sh|bash|js|mjs|cjs|ts|py|rb|pl)$/iu.test(path);
}

function hasConcreteInstructions(body: string): boolean {
	return /\b(examples?|steps?|workflow|instructions?|checklist|process|run|do not|always|never)\b|```/iu.test(
		body,
	);
}
