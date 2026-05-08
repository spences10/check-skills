import { defineCommand } from 'citty';
import { explain_command } from './explain.js';

export default defineCommand({
	meta: {
		name: 'explain',
		description: 'Explain a validation rule ID',
	},
	args: {
		code: {
			type: 'positional',
			description: 'Rule code, or omit to list all codes',
			required: false,
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	run({ args }) {
		explain_command({ code: args.code, json: args.json });
	},
});
