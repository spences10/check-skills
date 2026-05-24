import { describe, expect, it } from 'vitest';
import type { SkillDocument } from '../types.js';
import { run_quality_rules } from './quality.js';

function document(
	frontmatter_raw: string,
	description: string,
): SkillDocument {
	return {
		dir: '/tmp/example-skill',
		skill_file: '/tmp/example-skill/SKILL.md',
		frontmatter: { name: 'example-skill', description },
		frontmatter_raw,
		body: '## Steps\n- Validate descriptions.\n',
		line_count: 8,
		body_start_line: 6,
		content: `---\n${frontmatter_raw}\n---\n\n## Steps\n- Validate descriptions.\n`,
	};
}

describe('run_quality_rules', () => {
	it('warns for nonportable multiline descriptions by default', () => {
		const skill = document(
			'name: example-skill\ndescription: >\n  Use when validating descriptions.',
			'Use when validating descriptions.',
		);

		expect(run_quality_rules(skill)).toContainEqual(
			expect.objectContaining({
				severity: 'warn',
				code: 'nonportable-multiline-description',
			}),
		);
	});

	it('can suppress portability warnings for adapter-owned checks', () => {
		const skill = document(
			'name: example-skill\ndescription: >\n  Use when validating descriptions.',
			'Use when validating descriptions.',
		);

		expect(
			run_quality_rules(skill, { portability: false }).map(
				(problem) => problem.code,
			),
		).not.toContain('nonportable-multiline-description');
	});
});
