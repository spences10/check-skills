import type { Problem, ValidationReport } from '../types.js';

export function format_validation(
	report: ValidationReport,
	quiet = false,
	strict = false,
): string {
	const lines: string[] = [];
	for (const skill of report.skills) {
		if (quiet && skill.problems.length === 0) continue;

		const marker = skill.ok ? '✓' : '✖';
		lines.push(`${marker} ${skill.path}`);
		for (const problem of skill.problems) {
			lines.push(`  ${format_problem(problem)}`);
			if (problem.suggestion)
				lines.push(`    fix: ${problem.suggestion}`);
		}
	}

	if (quiet && lines.length === 0) return 'No problems found.';

	const skill_word =
		report.summary.checked === 1 ? 'skill' : 'skills';
	const failed_label = strict ? 'strict-failed' : 'failed';
	lines.push(
		'',
		`${report.summary.checked} ${skill_word} checked: ${report.summary.failed} ${failed_label}, ${report.summary.passed} passed, ${report.summary.warnings} warnings`,
	);
	return lines.join('\n');
}

export function format_llm_validation(
	report: ValidationReport,
	strict = false,
	quiet = false,
): string {
	const lines: string[] = [];
	for (const skill of report.skills) {
		if (quiet && skill.problems.length === 0) continue;

		const status = skill_status(skill.problems, strict);
		lines.push(`${status} ${skill.path}`);
		for (const problem of skill.problems) {
			lines.push(`- ${format_problem(problem)}`);
			if (problem.suggestion)
				lines.push(`  fix: ${problem.suggestion}`);
		}
	}
	return lines.length > 0 ? lines.join('\n') : 'No problems found.';
}

function skill_status(problems: Problem[], strict: boolean): string {
	if (problems.some((problem) => problem.severity === 'error'))
		return 'FAIL';
	if (problems.length > 0) return strict ? 'FAIL' : 'WARN';
	return 'PASS';
}

export function format_github_validation(
	report: ValidationReport,
): string {
	return report.skills
		.flatMap((skill) =>
			skill.problems.map((problem) => {
				const command =
					problem.severity === 'error' ? 'error' : 'warning';
				const file = problem.file
					? `${skill.path}/${problem.file}`
					: skill.path;
				const line = problem.line ? `,line=${problem.line}` : '';
				const column = problem.column ? `,col=${problem.column}` : '';
				return `::${command} file=${escape_github_property(file)}${line}${column},title=${escape_github_property(problem.code)}::${escape_github_annotation(problem.message)}`;
			}),
		)
		.join('\n');
}

export function format_problem(problem: Problem): string {
	const location = problem.line ? ` line ${problem.line}:` : '';
	return `${problem.severity.padEnd(5)} ${problem.code.padEnd(28)}${location} ${problem.message}`;
}

function escape_github_annotation(value: string): string {
	return value
		.replace(/%/gu, '%25')
		.replace(/\r/gu, '%0D')
		.replace(/\n/gu, '%0A');
}

function escape_github_property(value: string): string {
	return escape_github_annotation(value)
		.replace(/,/gu, '%2C')
		.replace(/:/gu, '%3A');
}
