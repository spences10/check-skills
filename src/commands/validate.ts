import {
	format_github_validation,
	format_llm_validation,
	format_validation,
} from '../output/validation.js';
import type { AgentName } from '../types.js';
import { validate_paths } from '../validate.js';
import { positional_paths } from './util.js';

export interface ValidateCommandOptions {
	paths: string[];
	recursive?: boolean;
	strict?: boolean;
	json?: boolean;
	llm?: boolean;
	quiet?: boolean;
	format?: string;
	agent?: AgentName;
	quality?: boolean;
}

export function validate_command(
	options: ValidateCommandOptions,
): void {
	const report = validate_paths(positional_paths(options.paths), {
		recursive: options.recursive,
		strict: options.strict,
		quality: options.quality,
		agent: options.agent,
	});

	if (options.json) console.log(JSON.stringify(report, null, 2));
	else if (options.llm)
		console.log(
			format_llm_validation(report, options.strict, options.quiet),
		);
	else if (options.format === 'github')
		console.log(format_github_validation(report));
	else
		console.log(
			format_validation(report, options.quiet, options.strict),
		);

	process.exit(report.ok ? 0 : 1);
}
