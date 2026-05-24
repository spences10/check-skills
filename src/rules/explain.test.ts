import { describe, expect, it } from 'vitest';
import { explain_rule, RULES } from './explain.js';

describe('explain_rule', () => {
	it('finds rule explanations by code', () => {
		expect(explain_rule('missing-name')).toEqual(
			expect.objectContaining({ severity: 'error' }),
		);
	});

	it('documents multiline description portability and adapter rules', () => {
		expect(explain_rule('nonportable-multiline-description')).toEqual(
			expect.objectContaining({ severity: 'warn' }),
		);
		expect(explain_rule('claude-code-multiline-description')).toEqual(
			expect.objectContaining({ severity: 'error' }),
		);
		expect(RULES.map((rule) => rule.code)).toContain(
			'claude-code-multiline-description',
		);
	});
});
