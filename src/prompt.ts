import type { PromptSkill, ValidateOptions } from './types.js';
import {
	discover_skill_dirs,
	read_skill_document,
} from './validate.js';

export function skills_to_prompt(
	paths: string[],
	options: ValidateOptions = {},
): string {
	const skills = collect_prompt_skills(paths, options);
	const lines = ['<available_skills>'];

	for (const skill of skills) {
		lines.push('  <skill>');
		lines.push(`    <name>${escape_xml(skill.name)}</name>`);
		lines.push(
			`    <description>${escape_xml(skill.description)}</description>`,
		);
		lines.push(
			`    <location>${escape_xml(skill.location)}</location>`,
		);
		lines.push('  </skill>');
	}

	lines.push('</available_skills>');
	return lines.join('\n');
}

export function collect_prompt_skills(
	paths: string[],
	options: ValidateOptions = {},
): PromptSkill[] {
	return discover_skill_dirs(paths, options)
		.map((dir) => read_skill_document(dir))
		.filter(
			(document) =>
				typeof document.frontmatter?.name === 'string' &&
				typeof document.frontmatter.description === 'string',
		)
		.map((document) => ({
			name: document.frontmatter?.name as string,
			description: document.frontmatter?.description as string,
			location: document.skill_file,
		}));
}

function escape_xml(value: string): string {
	return value
		.replace(/&/gu, '&amp;')
		.replace(/</gu, '&lt;')
		.replace(/>/gu, '&gt;')
		.replace(/"/gu, '&quot;')
		.replace(/'/gu, '&apos;');
}
