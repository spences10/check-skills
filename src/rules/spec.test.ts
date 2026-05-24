import { describe, expect, it } from 'vitest';
import type { SkillDocument } from '../types.js';
import { run_spec_rules } from './spec.js';

function document(frontmatter_raw: string): SkillDocument {
	return {
		dir: '/tmp/example-skill',
		skill_file: '/tmp/example-skill/SKILL.md',
		frontmatter: {
			name: 'example-skill',
			description: 'Use when validating specs.',
		},
		frontmatter_raw,
		body: '## Steps\n- Validate specs.\n',
		line_count: 8,
		body_start_line: 6,
		content: `---\n${frontmatter_raw}\n---\n\n## Steps\n- Validate specs.\n`,
	};
}

describe('run_spec_rules', () => {
	it('keeps valid multiline YAML descriptions out of spec errors', () => {
		const problems = run_spec_rules(
			document(
				'name: example-skill\ndescription: >\n  Use when validating specs.',
			),
		);

		expect(problems.map((problem) => problem.code)).not.toContain(
			'multiline-description',
		);
	});

	it('reports spec errors for missing required fields', () => {
		const skill = document('description: Use when validating specs.');
		skill.frontmatter = { description: 'Use when validating specs.' };

		expect(run_spec_rules(skill)).toContainEqual(
			expect.objectContaining({ code: 'missing-name' }),
		);
	});
});
