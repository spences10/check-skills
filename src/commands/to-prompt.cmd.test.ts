import { describe, expect, it } from 'vitest';
import command from './to-prompt.cmd.js';

describe('to-prompt command definition', () => {
	it('defines to-prompt metadata and options', () => {
		expect((command.meta as { name?: string }).name).toBe(
			'to-prompt',
		);
		expect(command.args).toHaveProperty('path');
		expect(command.args).toHaveProperty('recursive');
	});
});
