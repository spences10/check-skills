import { format_stats, get_stats } from '../stats.js';

export function stats_command(options: {
	path: string;
	json?: boolean;
}): void {
	const report = get_stats(options.path);
	console.log(
		options.json
			? JSON.stringify(report, null, 2)
			: format_stats(report),
	);
}
