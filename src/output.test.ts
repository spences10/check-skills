import { describe, expect, it } from 'vitest';
import { LLM_BLOCK } from './output/usage.js';
import {
	format_github_validation,
	format_stats_summary,
	format_validation,
} from './output/validation.js';
import type { ValidationReport } from './types.js';

const REPORT: ValidationReport = {
	ok: false,
	summary: {
		checked: 1,
		passed: 0,
		failed: 1,
		errors: 1,
		warnings: 0,
	},
	skills: [
		{
			path: 'bad,skill',
			name: 'bad-skill',
			ok: false,
			stats: {
				line_count: 20,
				body_word_count: 120,
				estimated_tokens: 300,
				description_length: 80,
				description_estimated_tokens: 20,
				code_blocks: 2,
				sections: 3,
				long_paragraphs: 1,
			},
			problems: [
				{
					severity: 'error',
					code: 'bad:field',
					message: 'bad value, needs % escaping',
					file: 'SKILL.md',
					line: 2,
					column: 1,
					suggestion: 'Fix it.',
				},
			],
		},
	],
};

describe('output formatting', () => {
	it('shows progressive stats for problem skills in human output', () => {
		const output = format_validation(REPORT);

		expect(output).toContain(
			'stats: 120 words, ~300 tokens, 20 lines, 3 sections, 2 code blocks, 1 long paragraphs',
		);
		expect(output).toContain('fix: Fix it.');
	});

	it('escapes GitHub annotation properties and messages', () => {
		const output = format_github_validation(REPORT);

		expect(output).toContain('file=bad%2Cskill/SKILL.md');
		expect(output).toContain('title=bad%3Afield');
		expect(output).toContain('bad value, needs %25 escaping');
	});

	it('formats stat summaries directly', () => {
		expect(format_stats_summary(REPORT.skills[0].stats)).toContain(
			'120 words',
		);
	});

	it('documents common LLM workflows in the help appendix', () => {
		expect(LLM_BLOCK).toContain('validate <skill-path>');
		expect(LLM_BLOCK).toContain('--recursive');
		expect(LLM_BLOCK).toContain('--json');
	});
});
