import { describe, expect, it } from 'vitest';
import command from './validate.cmd.js';

describe('validate command definition', () => {
	it('defines validate metadata and adapter options', () => {
		expect((command.meta as { name?: string }).name).toBe('validate');
		expect(command.args).toHaveProperty('path');
		expect(command.args).toHaveProperty('agent');
		expect(command.args).toHaveProperty('quality');
		expect(command.args).toHaveProperty('format');
	});
});
