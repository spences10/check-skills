import { describe, expect, it } from 'vitest';
import command from './init.cmd.js';

describe('init command definition', () => {
	it('defines init metadata and scaffold options', () => {
		expect((command.meta as { name?: string }).name).toBe('init');
		expect(command.args).toHaveProperty('name');
		expect(command.args).toHaveProperty('references');
		expect(command.args).toHaveProperty('scripts');
		expect(command.args).toHaveProperty('assets');
	});
});
