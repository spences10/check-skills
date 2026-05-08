import { explain_rule, RULES } from '../rules/explain.js';

export function explain_command(options: {
	code?: string;
	json?: boolean;
}): void {
	const rule = options.code ? explain_rule(options.code) : undefined;
	const output = options.code ? rule : RULES;

	if (!output) {
		console.error(`Unknown rule code: ${options.code}`);
		process.exit(2);
	}

	if (options.json) {
		console.log(JSON.stringify(output, null, 2));
		return;
	}

	if (Array.isArray(output)) {
		console.log(output.map((item) => item.code).join('\n'));
		return;
	}

	console.log(
		`${output.code} (${output.severity})\n${output.description}\nfix: ${output.suggestion}`,
	);
}
