import { describe, expect, it } from 'vitest';
import command from './stats.cmd.js';

describe('stats command definition', () => {
	it('defines stats metadata and options', () => {
		expect((command.meta as { name?: string }).name).toBe('stats');
		expect(command.args).toHaveProperty('path');
		expect(command.args).toHaveProperty('json');
	});
});
