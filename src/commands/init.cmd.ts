import { defineCommand } from 'citty';
import { init_command } from './init.js';

export default defineCommand({
	meta: {
		name: 'init',
		description: 'Create a minimal skill scaffold',
	},
	args: {
		name: {
			type: 'positional',
			description: 'Skill name',
			required: true,
		},
		references: {
			type: 'boolean',
			description: 'Create references/ directory',
		},
		scripts: {
			type: 'boolean',
			description: 'Create scripts/ directory',
		},
		assets: {
			type: 'boolean',
			description: 'Create assets/ directory',
		},
	},
	run({ args }) {
		init_command({
			name: args.name,
			references: args.references,
			scripts: args.scripts,
			assets: args.assets,
		});
	},
});
