import { readSkillDocument, discoverSkillDirs } from './validate.js';
import type { PromptSkill, ValidateOptions } from './types.js';

export function skillsToPrompt(
	paths: string[],
	options: ValidateOptions = {},
): string {
	const skills = collectPromptSkills(paths, options);
	const lines = ['<available_skills>'];

	for (const skill of skills) {
		lines.push('  <skill>');
		lines.push(`    <name>${escapeXml(skill.name)}</name>`);
		lines.push(
			`    <description>${escapeXml(skill.description)}</description>`,
		);
		lines.push(
			`    <location>${escapeXml(skill.location)}</location>`,
		);
		lines.push('  </skill>');
	}

	lines.push('</available_skills>');
	return lines.join('\n');
}

export function collectPromptSkills(
	paths: string[],
	options: ValidateOptions = {},
): PromptSkill[] {
	return discoverSkillDirs(paths, options)
		.map((dir) => readSkillDocument(dir))
		.filter(
			(document) =>
				typeof document.frontmatter?.name === 'string' &&
				typeof document.frontmatter.description === 'string',
		)
		.map((document) => ({
			name: document.frontmatter?.name as string,
			description: document.frontmatter?.description as string,
			location: document.skillFile,
		}));
}

function escapeXml(value: string): string {
	return value
		.replace(/&/gu, '&amp;')
		.replace(/</gu, '&lt;')
		.replace(/>/gu, '&gt;')
		.replace(/"/gu, '&quot;')
		.replace(/'/gu, '&apos;');
}
