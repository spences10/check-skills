import { resolve } from 'node:path';
import { doctor_path } from '../doctor.js';
import { positional_paths } from './util.js';
import type { CommandResult } from './validate.js';

export interface DoctorCommandOptions {
	paths: string[];
	write?: boolean;
	dry_run?: boolean;
	json?: boolean;
}

export function doctor_command_result(
	options: DoctorCommandOptions,
): CommandResult {
	const write = Boolean(options.write) && !options.dry_run;
	const reports = positional_paths(options.paths).map((path) =>
		doctor_path(resolve(path), write),
	);
	const fixes = reports.flatMap((report) => report.fixes);
	const output = {
		ok: reports.every((report) => report.ok),
		fixes,
		reports,
	};

	if (options.json) {
		return {
			exit_code: output.ok ? 0 : 1,
			stdout: JSON.stringify(output, null, 2),
		};
	}

	if (fixes.length === 0) {
		return {
			exit_code: output.ok ? 0 : 1,
			stdout: 'No safe automatic fixes available.',
		};
	}

	return {
		exit_code: output.ok ? 0 : 1,
		stdout: fixes
			.map(
				(fix) =>
					`${fix.applied ? 'fixed' : 'would fix'} ${fix.path}: ${fix.message}`,
			)
			.join('\n'),
	};
}

export function doctor_command(options: DoctorCommandOptions): void {
	const result = doctor_command_result(options);
	console.log(result.stdout);
	process.exit(result.exit_code);
}
