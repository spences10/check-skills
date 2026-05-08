import { defineCommand } from 'citty';
import { to_prompt_command } from './to-prompt.js';

export default defineCommand({
	meta: {
		name: 'to-prompt',
		description: 'Generate an <available_skills> prompt block',
	},
	args: {
		path: {
			type: 'positional',
			description: 'Skill path, or parent directory with --recursive',
			required: true,
		},
		recursive: {
			type: 'boolean',
			description: 'Discover skills recursively',
		},
	},
	run({ args }) {
		to_prompt_command({ paths: args._, recursive: args.recursive });
	},
});
