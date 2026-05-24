import { describe, expect, it } from 'vitest';
import type { SkillDocument } from '../types.js';
import { run_adapter_rules } from './adapters.js';

function document(frontmatter_raw: string): SkillDocument {
	return {
		dir: '/tmp/example-skill',
		skill_file: '/tmp/example-skill/SKILL.md',
		frontmatter: {
			name: 'example-skill',
			description: 'Use when validating adapters.',
		},
		frontmatter_raw,
		body: '## Steps\n- Run pnpx check-skills.\n',
		line_count: 8,
		body_start_line: 6,
		content: `---\n${frontmatter_raw}\n---\n\n## Steps\n- Run pnpx check-skills.\n`,
	};
}

describe('run_adapter_rules', () => {
	it('promotes multiline YAML descriptions to a Claude Code adapter error', () => {
		const problems = run_adapter_rules(
			document(
				'name: example-skill\ndescription: Use when validating\n  adapter descriptions.',
			),
			'claude-code',
		);

		expect(problems).toContainEqual(
			expect.objectContaining({
				severity: 'error',
				code: 'claude-code-multiline-description',
			}),
		);
	});

	it('warns about Claude Code command wording', () => {
		expect(
			run_adapter_rules(
				document(
					'name: example-skill\ndescription: Use when validating adapters.',
				),
				'claude-code',
			),
		).toContainEqual(
			expect.objectContaining({ code: 'agent-command-wording' }),
		);
	});
});
