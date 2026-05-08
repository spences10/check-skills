import { resolve } from 'node:path';
import { doctor_path } from '../doctor.js';
import { positional_paths } from './util.js';

export interface DoctorCommandOptions {
	paths: string[];
	write?: boolean;
	dry_run?: boolean;
	json?: boolean;
}

export function doctor_command(options: DoctorCommandOptions): void {
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

	if (options.json) console.log(JSON.stringify(output, null, 2));
	else if (fixes.length === 0)
		console.log('No safe automatic fixes available.');
	else {
		for (const report of reports) {
			for (const fix of report.fixes) {
				console.log(
					`${fix.applied ? 'fixed' : 'would fix'} ${fix.path}: ${fix.message}`,
				);
			}
		}
	}

	process.exit(output.ok ? 0 : 1);
}
