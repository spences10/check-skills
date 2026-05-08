import { skills_to_prompt } from '../prompt.js';
import { positional_paths } from './util.js';

export function to_prompt_command(options: {
	paths: string[];
	recursive?: boolean;
}): void {
	console.log(
		skills_to_prompt(positional_paths(options.paths), {
			recursive: options.recursive,
		}),
	);
}
