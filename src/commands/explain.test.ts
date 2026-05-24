import { describe, expect, it, vi } from 'vitest';
import { explain_command } from './explain.js';

describe('explain_command', () => {
	it('prints a single rule explanation', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		try {
			explain_command({ code: 'missing-name' });
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('missing-name (error)'),
			);
		} finally {
			log.mockRestore();
		}
	});

	it('prints all rule codes as JSON', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		try {
			explain_command({ json: true });
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('missing-skill-md'),
			);
		} finally {
			log.mockRestore();
		}
	});
});
