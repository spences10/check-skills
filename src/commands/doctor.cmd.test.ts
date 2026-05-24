import { describe, expect, it } from 'vitest';
import command from './doctor.cmd.js';

describe('doctor command definition', () => {
	it('defines doctor metadata and options', () => {
		expect((command.meta as { name?: string }).name).toBe('doctor');
		expect(command.args).toHaveProperty('path');
		expect(command.args).toHaveProperty('write');
		expect(command.args).toHaveProperty('json');
	});
});
