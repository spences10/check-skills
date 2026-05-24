import { describe, expect, it } from 'vitest';
import { positional_paths } from './util.js';

describe('positional_paths', () => {
	it('keeps provided path arrays and preserves empty input', () => {
		expect(positional_paths(['one', 'two'])).toEqual(['one', 'two']);
		expect(positional_paths([])).toEqual([]);
	});
});
