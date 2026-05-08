import { defineCommand } from 'citty';
import { stats_command } from './stats.js';

export default defineCommand({
	meta: {
		name: 'stats',
		description: 'Summarize a skills directory',
	},
	args: {
		path: {
			type: 'positional',
			description: 'Skills directory',
			required: true,
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	run({ args }) {
		stats_command({ path: args.path, json: args.json });
	},
});
