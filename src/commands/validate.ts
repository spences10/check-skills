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

export interface CommandResult {
	exit_code: number;
	stdout: string;
}

export function validate_command_result(
	options: ValidateCommandOptions,
): CommandResult {
	const report = validate_paths(positional_paths(options.paths), {
		recursive: options.recursive,
		strict: options.strict,
		quality: options.quality,
		agent: options.agent,
	});

	let stdout: string;
	if (options.json) stdout = JSON.stringify(report, null, 2);
	else if (options.llm)
		stdout = format_llm_validation(
			report,
			options.strict,
			options.quiet,
		);
	else if (options.format === 'github')
		stdout = format_github_validation(report);
	else
		stdout = format_validation(report, options.quiet, options.strict);

	return { exit_code: report.ok ? 0 : 1, stdout };
}

export function validate_command(
	options: ValidateCommandOptions,
): void {
	const result = validate_command_result(options);
	console.log(result.stdout);
	process.exit(result.exit_code);
}
