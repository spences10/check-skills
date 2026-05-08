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
		const vague_term = vague_description_term(description);
		if (vague_term) {
			problems.push({
				severity: 'warn',
				code: 'vague-description',
				message: `description is too vague for reliable agent triggering: ${vague_term}`,
				file: 'SKILL.md',
				line: frontmatter_line(document, 'description'),
				column: 1,
				suggestion:
					'Rewrite the description with concrete trigger language and task terms.',
			});
		}

		if (is_list_bloat(description)) {
			problems.push({
				severity: 'warn',
				code: 'description-list-bloat',
				message: 'description has a long comma-heavy trigger list',
				file: 'SKILL.md',
				line: frontmatter_line(document, 'description'),
				column: 1,
				suggestion:
					'Group related triggers into fewer concrete phrases and move detail into the body.',
			});
		}

		if (
			/\b(I|me|my|mine|we|our|ours|you|your|yours)\b/u.test(
				description,
			)
		) {
			problems.push({
				severity: 'warn',
				code: 'description-person-pronoun',
				message: 'description uses first- or second-person wording',
				file: 'SKILL.md',
				line: frontmatter_line(document, 'description'),
				column: 1,
				suggestion:
					'Prefer neutral task language such as "Use when the user asks...".',
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

	const body_words = document.body
		.split(/\s+/)
		.filter(Boolean).length;
	if (body_words > 2500) {
		problems.push({
			severity: 'warn',
			code: 'body-too-long',
			message: `SKILL.md body is very long (${body_words} words, about ${estimate_tokens(document.body)} tokens); move detail into references/`,
			file: 'SKILL.md',
			line: document.body_start_line,
			column: 1,
			suggestion:
				'Extract detailed examples or background material into references/.',
		});
	}

	const code_blocks = (document.body.match(/```/gu)?.length ?? 0) / 2;
	if (code_blocks > 8) {
		problems.push({
			severity: 'warn',
			code: 'too-many-code-blocks',
			message: `SKILL.md contains many code blocks: ${Math.floor(code_blocks)}`,
			file: 'SKILL.md',
			line: document.body_start_line,
			column: 1,
			suggestion:
				'Move extended examples into references/ and keep SKILL.md focused on when and how to use the skill.',
		});
	}

	const headings = document.body.match(/^#{1,6}\s+/gmu)?.length ?? 0;
	if (headings > 12) {
		problems.push({
			severity: 'warn',
			code: 'too-many-sections',
			message: `SKILL.md has many sections: ${headings}`,
			file: 'SKILL.md',
			line: document.body_start_line,
			column: 1,
			suggestion:
				'Collapse minor sections or move detailed material into references/.',
		});
	}

	for (const paragraph of long_paragraph_lines(
		document.body,
		document.body_start_line,
	)) {
		problems.push({
			severity: 'warn',
			code: 'long-paragraph',
			message: 'paragraph is long and hard to scan',
			file: 'SKILL.md',
			line: paragraph,
			column: 1,
			suggestion:
				'Break long prose into short paragraphs, bullets, or steps.',
		});
	}

	if (
		/\b(TODO|TBD|FIXME|replace me|lorem ipsum|your skill|placeholder)\b/iu.test(
			document.body,
		)
	) {
		problems.push({
			severity: 'warn',
			code: 'template-placeholder',
			message:
				'SKILL.md appears to contain a TODO or template placeholder',
			file: 'SKILL.md',
			line: document.body_start_line,
			column: 1,
			suggestion:
				'Replace template placeholders with finished skill instructions.',
		});
	}

	if (
		description &&
		document.body.trim() &&
		keyword_overlap(description, document.body) < 0.12
	) {
		problems.push({
			severity: 'warn',
			code: 'low-description-body-overlap',
			message:
				'description trigger terms have low overlap with the body',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'description'),
			column: 1,
			suggestion:
				'Use consistent task terms in both the description and body so agents can connect triggers to instructions.',
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
				'Add compatibility, e.g. compatibility: Requires Claude Code plugin support., or make the description vendor-neutral.',
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

function vague_description_term(
	description: string,
): string | undefined {
	const normalized = description.toLowerCase();
	if (normalized.length < 28) return 'too short';
	const match = normalized.match(
		/^(helps?|assists?|supports?)\s+(with|to|you)\b|^(useful|helpful)\s+for\b|\b(stuff|things|various|etc\.?|general)\b/u,
	);
	return match?.[0];
}

function is_list_bloat(description: string): boolean {
	return (
		description.length > 180 && description.split(',').length >= 6
	);
}

function estimate_tokens(text: string): number {
	return Math.ceil(text.length / 4);
}

function long_paragraph_lines(
	body: string,
	start_line: number,
): number[] {
	const lines = body.split(/\r?\n/);
	const result: number[] = [];
	let paragraph = '';
	let paragraph_start = 0;
	let in_fence = false;

	lines.forEach((line, index) => {
		if (/^\s*```/u.test(line)) in_fence = !in_fence;
		if (in_fence || /^\s*($|[#*-]|\d+\.)/u.test(line)) {
			if (paragraph.split(/\s+/u).filter(Boolean).length > 140) {
				result.push(start_line + paragraph_start);
			}
			paragraph = '';
			paragraph_start = index + 1;
			return;
		}
		if (!paragraph) paragraph_start = index;
		paragraph += ` ${line.trim()}`;
	});

	if (paragraph.split(/\s+/u).filter(Boolean).length > 140) {
		result.push(start_line + paragraph_start);
	}
	return result;
}

function keyword_overlap(description: string, body: string): number {
	const description_words = keywords(description);
	if (description_words.size === 0) return 1;
	const body_words = keywords(body);
	let matches = 0;
	for (const word of description_words) {
		if (body_words.has(word)) matches += 1;
	}
	return matches / description_words.size;
}

function keywords(text: string): Set<string> {
	const stop = new Set([
		'when',
		'with',
		'need',
		'user',
		'asks',
		'asked',
		'use',
		'using',
		'the',
		'and',
		'for',
		'that',
		'this',
		'into',
		'from',
		'your',
	]);
	return new Set(
		(text.toLowerCase().match(/[a-z][a-z-]{3,}/gu) ?? [])
			.map((word) => word.replace(/s$/u, ''))
			.filter((word) => !stop.has(word)),
	);
}

function has_trigger_language(description: string): boolean {
	return (
		/\b(use when|use for|use to|when asked|when the user|run when|trigger)\b/iu.test(
			description,
		) ||
		/^(when|for)\b/iu.test(description.trim()) ||
		/^(add|analyze|audit|build|check|compare|create|debug|design|diagnose|extract|find|fix|generate|implement|improve|inspect|migrate|plan|query|refactor|review|setup|summarize|test|validate|write)\b/iu.test(
			description.trim(),
		)
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
