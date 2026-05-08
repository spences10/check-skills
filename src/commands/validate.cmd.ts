import { defineCommand } from 'citty';
import type { AgentName } from '../types.js';
import { validate_command } from './validate.js';

export default defineCommand({
	meta: {
		name: 'validate',
		description: 'Validate one or more skill directories',
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
		strict: {
			type: 'boolean',
			description: 'Treat warnings as failures',
		},
		json: { type: 'boolean', description: 'Output as JSON' },
		llm: {
			type: 'boolean',
			description: 'Output concise stable text for LLM agents',
		},
		quiet: {
			type: 'boolean',
			description: 'Only show skills with problems',
		},
		format: {
			type: 'enum',
			description: 'Output format',
			options: ['human', 'github'],
			default: 'human',
		},
		agent: {
			type: 'enum',
			description: 'Run adapter-specific checks',
			options: [
				'codex',
				'claude-code',
				'opencode',
				'cursor',
				'windsurf',
				'pi',
			],
		},
		quality: {
			type: 'boolean',
			description: 'Run authoring quality checks',
			default: true,
			negativeDescription: 'Only run spec compliance checks',
		},
	},
	run({ args }) {
		validate_command({
			paths: args._,
			recursive: args.recursive,
			strict: args.strict,
			json: args.json,
			llm: args.llm,
			quiet: args.quiet,
			format: args.format,
			agent: args.agent as AgentName | undefined,
			quality: args.quality,
		});
	},
});
