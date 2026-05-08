import { defineCommand } from 'citty';
import { doctor_command } from './doctor.js';

export default defineCommand({
	meta: {
		name: 'doctor',
		description: 'Plan or apply safe automatic fixes',
	},
	args: {
		path: {
			type: 'positional',
			description: 'Skill path',
			required: true,
		},
		write: { type: 'boolean', description: 'Apply fixes' },
		'dry-run': {
			type: 'boolean',
			description: 'Show planned fixes only',
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	run({ args }) {
		doctor_command({
			paths: args._,
			write: args.write,
			dry_run: args['dry-run'],
			json: args.json,
		});
	},
});
