import { describe, expect, it } from 'vitest';
import { LLM_BLOCK } from './usage.js';

describe('LLM_BLOCK', () => {
	it('documents agent validation workflows', () => {
		expect(LLM_BLOCK).toContain('validate <skill-path>');
		expect(LLM_BLOCK).toContain('--recursive');
		expect(LLM_BLOCK).toContain('--json');
	});
});
