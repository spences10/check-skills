#!/usr/bin/env node

import type { ArgsDef, CommandDef } from 'citty';
import { defineCommand, renderUsage, runMain } from 'citty';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor_path } from './doctor.js';
import { skills_to_prompt } from './prompt.js';
import { explain_rule, RULES } from './rules/explain.js';
import { format_stats, get_stats } from './stats.js';
import type {
	AgentName,
	Problem,
	ValidationReport,
} from './types.js';
import { discover_skill_dirs, validate_paths } from './validate.js';

const current_dir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
	readFileSync(join(current_dir, '..', 'package.json'), 'utf-8'),
) as { version?: string };

const LLM_BLOCK = `IMPORTANT FOR LLMs:
  Always run \`check-skills validate <skill-path>\` after creating or editing a skill.
  For repositories containing many skills, run: \`check-skills validate . --recursive\`.
  For machine-readable output, run: \`check-skills validate <path> --json\`.
  Skills should follow the agentskills.io specification.
  Fix all errors before finishing. Treat warnings as quality issues.`;

const EXAMPLES_SECTION = `Examples:
  pnpx check-skills validate ./ecosystem-guide
  pnpx check-skills validate ./skills --recursive
  pnpx check-skills validate . --recursive --llm
  pnpx check-skills stats ./skills --json
  pnpx check-skills to-prompt ./skills --recursive
  pnpx check-skills explain missing-trigger-language`;

const validate = defineCommand({
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
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
		llm: {
			type: 'boolean',
			description: 'Output concise stable text for LLM agents',
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
		const paths = positional_paths(args._);
		const report = validate_paths(paths, {
			recursive: args.recursive,
			strict: args.strict,
			quality: args.quality,
			agent: args.agent as AgentName | undefined,
		});

		if (args.json) {
			console.log(JSON.stringify(report, null, 2));
		} else if (args.llm) {
			console.log(format_llm_validation(report));
		} else if (args.format === 'github') {
			console.log(format_github_validation(report));
		} else {
			console.log(format_validation(report));
		}

		process.exit(report.ok ? 0 : 1);
	},
});

const doctor = defineCommand({
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
		write: {
			type: 'boolean',
			description: 'Apply fixes',
		},
		'dry-run': {
			type: 'boolean',
			description: 'Show planned fixes only',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	run({ args }) {
		const write = Boolean(args.write) && !args['dry-run'];
		const reports = positional_paths(args._).map((path) =>
			doctor_path(resolve(path), write),
		);
		const fixes = reports.flatMap((report) => report.fixes);
		const output = {
			ok: reports.every((report) => report.ok),
			fixes,
			reports,
		};

		if (args.json) {
			console.log(JSON.stringify(output, null, 2));
		} else if (fixes.length === 0) {
			console.log('No safe automatic fixes available.');
		} else {
			for (const report of reports) {
				for (const fix of report.fixes) {
					console.log(
						`${fix.applied ? 'fixed' : 'would fix'} ${fix.path}: ${fix.message}`,
					);
				}
			}
		}

		process.exit(output.ok ? 0 : 1);
	},
});

const stats = defineCommand({
	meta: {
		name: 'stats',
		description: 'Summarize a skills directory',
	},
	args: {
		path: {
			type: 'positional',
			description: 'Skills directory',
			required: true,
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	run({ args }) {
		const report = get_stats(args.path);
		console.log(
			args.json
				? JSON.stringify(report, null, 2)
				: format_stats(report),
		);
	},
});

const to_prompt = defineCommand({
	meta: {
		name: 'to-prompt',
		description: 'Generate an <available_skills> prompt block',
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
	},
	run({ args }) {
		console.log(
			skills_to_prompt(positional_paths(args._), {
				recursive: args.recursive,
			}),
		);
	},
});

const explain = defineCommand({
	meta: {
		name: 'explain',
		description: 'Explain a validation rule ID',
	},
	args: {
		code: {
			type: 'positional',
			description: 'Rule code, or omit to list all codes',
			required: false,
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	run({ args }) {
		const rule = args.code ? explain_rule(args.code) : undefined;
		const output = args.code ? rule : RULES;

		if (!output) {
			console.error(`Unknown rule code: ${args.code}`);
			process.exit(2);
		}

		if (args.json) {
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
	},
});

const init = defineCommand({
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
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(args.name)) {
			throw new Error('skill name must be lowercase kebab-case');
		}

		mkdirSync(args.name, { recursive: true });
		if (args.references) {
			mkdirSync(join(args.name, 'references'), { recursive: true });
		}
		if (args.scripts) {
			mkdirSync(join(args.name, 'scripts'), { recursive: true });
		}
		if (args.assets) {
			mkdirSync(join(args.name, 'assets'), { recursive: true });
		}

		const skill_file = join(args.name, 'SKILL.md');
		writeFileSync(
			skill_file,
			`---\nname: ${args.name}\ndescription: Use when you need to create, write, or improve guidance for ${args.name}.\n---\n\n# ${args.name}\n\n## Instructions\n\n- Replace this scaffold with concrete steps.\n`,
			{ flag: 'wx' },
		);
		console.log(`created ${skill_file}`);
	},
});

const main = defineCommand({
	meta: {
		name: 'check-skills',
		version: pkg.version,
		description:
			'Vendor-neutral CLI for validating portable Agent Skills.',
	},
	subCommands: {
		validate,
		doctor,
		stats,
		'to-prompt': to_prompt,
		explain,
		init,
	},
});

async function show_usage_with_guidance<T extends ArgsDef = ArgsDef>(
	cmd: CommandDef<T>,
	parent?: CommandDef<T>,
): Promise<void> {
	const usage = await renderUsage(cmd, parent);
	if (parent) {
		console.log(usage);
		return;
	}

	console.log(`${usage}\n${LLM_BLOCK}\n\n${EXAMPLES_SECTION}\n`);
}

function positional_paths(values: string[]): string[] {
	return values.length > 0 ? values : [];
}

function format_validation(report: ValidationReport): string {
	const lines: string[] = [];
	for (const skill of report.skills) {
		const marker = skill.ok ? '✓' : '✖';
		lines.push(`${marker} ${skill.path}`);
		for (const problem of skill.problems) {
			lines.push(`  ${format_problem(problem)}`);
			if (problem.suggestion) {
				lines.push(`    fix: ${problem.suggestion}`);
			}
		}
	}

	const skill_word =
		report.summary.checked === 1 ? 'skill' : 'skills';
	lines.push(
		'',
		`${report.summary.checked} ${skill_word} checked: ${report.summary.failed} failed, ${report.summary.passed} passed, ${report.summary.warnings} warnings`,
	);
	return lines.join('\n');
}

function format_llm_validation(report: ValidationReport): string {
	const lines: string[] = [];
	for (const skill of report.skills) {
		if (skill.problems.length === 0) {
			lines.push(`PASS ${skill.path}`);
			continue;
		}

		lines.push(`FAIL ${skill.path}`);
		for (const problem of skill.problems) {
			lines.push(`- ${format_problem(problem)}`);
			if (problem.suggestion) {
				lines.push(`  fix: ${problem.suggestion}`);
			}
		}
	}
	return lines.join('\n');
}

function format_github_validation(report: ValidationReport): string {
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
				return `::${command} file=${file}${line}${column},title=${problem.code}::${escape_github_annotation(problem.message)}`;
			}),
		)
		.join('\n');
}

function format_problem(problem: Problem): string {
	const location = problem.line ? ` line ${problem.line}:` : '';
	return `${problem.severity.padEnd(5)} ${problem.code.padEnd(28)}${location} ${problem.message}`;
}

function escape_github_annotation(value: string): string {
	return value
		.replace(/%/gu, '%25')
		.replace(/\r/gu, '%0D')
		.replace(/\n/gu, '%0A');
}

void runMain(main, { showUsage: show_usage_with_guidance });

export { discover_skill_dirs, LLM_BLOCK, validate_paths };
