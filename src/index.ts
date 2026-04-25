#!/usr/bin/env node

import { defineCommand, renderUsage, runMain } from 'citty';
import type { ArgsDef, CommandDef } from 'citty';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctorPath } from './doctor.js';
import { skillsToPrompt } from './prompt.js';
import { formatStats, getStats } from './stats.js';
import type {
	AgentName,
	Problem,
	ValidationReport,
} from './types.js';
import { discoverSkillDirs, validatePaths } from './validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
	readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
) as { version?: string };

const LLM_BLOCK = `IMPORTANT FOR LLMs:
  Always run \`check-skills validate <skill-path>\` after creating or editing a skill.
  Skills should follow the agentskills.io specification.
  Fix all errors before finishing. Treat warnings as quality issues.`;

const EXAMPLES_SECTION = `Examples:
  pnpx check-skills validate ./ecosystem-guide
  pnpx check-skills validate ./skills --recursive
  pnpx check-skills stats ./skills --json
  pnpx check-skills to-prompt ./skills --recursive`;

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
		const paths = positionalPaths(args._);
		const report = validatePaths(paths, {
			recursive: args.recursive,
			strict: args.strict,
			quality: args.quality,
			agent: args.agent as AgentName | undefined,
		});

		if (args.json) {
			console.log(JSON.stringify(report, null, 2));
		} else {
			console.log(formatValidation(report));
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
		const write = Boolean(args.write) && !args.dryRun;
		const reports = positionalPaths(args._).map((path) =>
			doctorPath(resolve(path), write),
		);
		const output = {
			ok: reports.every((report) => report.ok),
			reports,
		};

		if (args.json) {
			console.log(JSON.stringify(output, null, 2));
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
		const report = getStats(args.path);
		console.log(
			args.json
				? JSON.stringify(report, null, 2)
				: formatStats(report),
		);
	},
});

const toPrompt = defineCommand({
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
			skillsToPrompt(positionalPaths(args._), {
				recursive: args.recursive,
			}),
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

		const skillFile = join(args.name, 'SKILL.md');
		writeFileSync(
			skillFile,
			`---\nname: ${args.name}\ndescription: Use when you need to create, write, or improve guidance for ${args.name}.\n---\n\n# ${args.name}\n\n## Instructions\n\n- Replace this scaffold with concrete steps.\n`,
			{ flag: 'wx' },
		);
		console.log(`created ${skillFile}`);
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
		'to-prompt': toPrompt,
		init,
	},
});

async function showUsageWithGuidance<T extends ArgsDef = ArgsDef>(
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

function positionalPaths(values: string[]): string[] {
	return values.length > 0 ? values : [];
}

function formatValidation(report: ValidationReport): string {
	const lines: string[] = [];
	for (const skill of report.skills) {
		const marker = skill.ok ? '✓' : '✖';
		lines.push(`${marker} ${skill.path}`);
		for (const problem of skill.problems) {
			lines.push(`  ${formatProblem(problem)}`);
		}
	}

	const skillWord = report.summary.checked === 1 ? 'skill' : 'skills';
	lines.push(
		'',
		`${report.summary.checked} ${skillWord} checked: ${report.summary.failed} failed, ${report.summary.passed} passed, ${report.summary.warnings} warnings`,
	);
	return lines.join('\n');
}

function formatProblem(problem: Problem): string {
	return `${problem.severity.padEnd(5)} ${problem.code.padEnd(28)} ${problem.message}`;
}

void runMain(main, { showUsage: showUsageWithGuidance });

export { LLM_BLOCK, discoverSkillDirs, validatePaths };
