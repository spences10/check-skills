import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Problem, SkillDocument } from '../types.js';
import {
	extract_local_reference_locations,
	frontmatter_line,
	is_executable,
} from './spec.js';

const VENDOR_WORDS = [
	'Claude Code',
	'Codex',
	'Cursor',
	'Windsurf',
	'OpenCode',
	'Open Code',
	'Pi',
];

export function run_quality_rules(
	document: SkillDocument,
): Problem[] {
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
		if (is_vague_description(description)) {
			problems.push({
				severity: 'warn',
				code: 'vague-description',
				message:
					'description is too vague for reliable agent triggering',
				file: 'SKILL.md',
				line: frontmatter_line(document, 'description'),
				column: 1,
				suggestion:
					'Rewrite the description with concrete trigger language and task terms.',
			});
		}

		if (!has_trigger_language(description)) {
			problems.push({
				severity: 'warn',
				code: 'missing-trigger-language',
				message:
					'description should include trigger language such as "Use when..."',
				file: 'SKILL.md',
				line: frontmatter_line(document, 'description'),
				column: 1,
				suggestion:
					'Rewrite the description to start with or include: "Use when..."',
			});
		}
	}

	if (document.line_count > 500) {
		problems.push({
			severity: 'warn',
			code: 'skill-md-too-long',
			message:
				'SKILL.md is over 500 lines; move detail into references/',
			file: 'SKILL.md',
			line: 1,
			column: 1,
			suggestion:
				'Keep SKILL.md concise and move long detail to references/ files.',
		});
	}

	if (document.body.split(/\s+/).filter(Boolean).length > 2500) {
		problems.push({
			severity: 'warn',
			code: 'body-too-long',
			message:
				'SKILL.md body is very long; move detail into references/',
			file: 'SKILL.md',
			line: document.body_start_line,
			column: 1,
			suggestion:
				'Extract detailed examples or background material into references/.',
		});
	}

	const vendor_terms = vendor_specific_terms(document, compatibility);
	if (vendor_terms.length > 0) {
		problems.push({
			severity: 'warn',
			code: 'vendor-specific-wording',
			message: `description contains vendor-specific wording without compatibility: ${vendor_terms.join(', ')}`,
			file: 'SKILL.md',
			line: frontmatter_line(document, 'description'),
			column: 1,
			suggestion:
				'Add compatibility explaining the vendor dependency, or make the description vendor-neutral.',
		});
	}

	problems.push(...check_scripts(document));

	if (
		document.body.trim() &&
		!has_concrete_instructions(document.body)
	) {
		problems.push({
			severity: 'warn',
			code: 'no-concrete-instructions',
			message:
				'skill should include examples, decision steps, workflow, or concrete instructions',
			file: 'SKILL.md',
			line: document.body_start_line,
			column: 1,
			suggestion:
				'Add a short workflow, checklist, examples, or explicit instructions.',
		});
	}

	return problems;
}

function is_vague_description(description: string): boolean {
	const normalized = description.toLowerCase();
	return (
		normalized.length < 28 ||
		/^(helps?|assists?|supports?)\s+(with|to|you)\b/u.test(
			normalized,
		) ||
		/^(useful|helpful)\s+for\b/u.test(normalized)
	);
}

function has_trigger_language(description: string): boolean {
	return /\b(use when|use for|use to|when asked|when the user|run when|trigger)\b/iu.test(
		description,
	);
}

function vendor_specific_terms(
	document: SkillDocument,
	compatibility: string,
): string[] {
	if (compatibility.trim()) {
		return [];
	}

	const description =
		typeof document.frontmatter?.description === 'string'
			? document.frontmatter.description
			: '';
	return VENDOR_WORDS.filter((word) =>
		new RegExp(`\\b${escape_reg_exp(word)}\\b`, 'u').test(
			description,
		),
	);
}

function escape_reg_exp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function check_scripts(document: SkillDocument): Problem[] {
	const problems: Problem[] = [];
	const scripts_dir = join(document.dir, 'scripts');
	const references = extract_local_reference_locations(document);
	const script_references = references.filter((reference) =>
		reference.path.startsWith('scripts/'),
	);

	if (existsSync(scripts_dir)) {
		for (const script of safe_list_files(scripts_dir)) {
			const relative_script = `scripts/${script}`;
			if (
				!document.body.includes(relative_script) &&
				!document.body.includes(script)
			) {
				problems.push({
					severity: 'warn',
					code: 'unreferenced-script',
					message: `script is present but not referenced from SKILL.md: ${relative_script}`,
					file: 'SKILL.md',
					suggestion:
						'Reference the script from SKILL.md or remove it if unused.',
				});
			}
		}
	}

	for (const reference of script_references) {
		const full_path = join(document.dir, reference.path);
		if (
			existsSync(full_path) &&
			is_likely_executable(reference.path) &&
			!is_executable(full_path)
		) {
			problems.push({
				severity: 'warn',
				code: 'script-not-executable',
				message: `referenced script should be executable: ${reference.path}`,
				file: 'SKILL.md',
				line: reference.line,
				column: reference.column,
				suggestion: `Run chmod +x ${reference.path}, or document that it is not directly executable.`,
			});
		}
	}

	return problems;
}

function safe_list_files(dir: string): string[] {
	try {
		return readdirSync(dir).filter((entry) =>
			statSync(join(dir, entry)).isFile(),
		);
	} catch {
		return [];
	}
}

function is_likely_executable(path: string): boolean {
	return /\.(sh|bash|js|mjs|cjs|ts|py|rb|pl)$/iu.test(path);
}

function has_concrete_instructions(body: string): boolean {
	return /\b(examples?|steps?|workflow|instructions?|checklist|process|run|do not|always|never)\b|```/iu.test(
		body,
	);
}
