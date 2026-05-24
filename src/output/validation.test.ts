import { describe, expect, it } from 'vitest';
import type { ValidationReport } from '../types.js';
import {
	format_github_validation,
	format_llm_validation,
	format_problem,
	format_stats_summary,
	format_validation,
} from './validation.js';

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
				description_has_gerund: true,
				description_starts_action_verb: false,
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

describe('validation output formatting', () => {
	it('shows stats and fixes in human output', () => {
		const output = format_validation(REPORT);

		expect(output).toContain('120 words, ~300 tokens');
		expect(output).toContain('fix: Fix it.');
	});

	it('escapes GitHub annotation properties and messages', () => {
		const output = format_github_validation(REPORT);

		expect(output).toContain('file=bad%2Cskill/SKILL.md');
		expect(output).toContain('title=bad%3Afield');
		expect(output).toContain('bad value, needs %25 escaping');
	});

	it('formats LLM statuses and quiet empty output', () => {
		const clean_report: ValidationReport = {
			ok: true,
			summary: {
				checked: 1,
				passed: 1,
				failed: 0,
				errors: 0,
				warnings: 0,
			},
			skills: [{ ...REPORT.skills[0], ok: true, problems: [] }],
		};

		expect(format_llm_validation(REPORT)).toContain('FAIL bad,skill');
		expect(format_llm_validation(clean_report, false, true)).toBe(
			'No problems found.',
		);
	});

	it('formats stat summaries and problems directly', () => {
		expect(format_stats_summary(REPORT.skills[0].stats)).toContain(
			'120 words',
		);
		expect(
			format_problem({
				severity: 'warn',
				code: 'example-warning',
				message: 'check this',
			}),
		).toContain('example-warning');
	});
});
