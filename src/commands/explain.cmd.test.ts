import { describe, expect, it } from 'vitest';
import command from './explain.cmd.js';

describe('explain command definition', () => {
	it('defines explain metadata and options', () => {
		expect((command.meta as { name?: string }).name).toBe('explain');
		expect(command.args).toHaveProperty('code');
		expect(command.args).toHaveProperty('json');
	});
});
