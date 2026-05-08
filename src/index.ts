#!/usr/bin/env node

import { defineCommand, runMain } from 'citty';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { show_usage_with_guidance } from './output/usage.js';

const current_dir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
	readFileSync(join(current_dir, '..', 'package.json'), 'utf-8'),
) as { version?: string };

const main = defineCommand({
	meta: {
		name: 'check-skills',
		version: pkg.version,
		description:
			'Vendor-neutral CLI for validating portable Agent Skills.',
	},
	subCommands: {
		validate: () =>
			import('./commands/validate.cmd.js').then((r) => r.default),
		doctor: () =>
			import('./commands/doctor.cmd.js').then((r) => r.default),
		stats: () =>
			import('./commands/stats.cmd.js').then((r) => r.default),
		'to-prompt': () =>
			import('./commands/to-prompt.cmd.js').then((r) => r.default),
		explain: () =>
			import('./commands/explain.cmd.js').then((r) => r.default),
		init: () =>
			import('./commands/init.cmd.js').then((r) => r.default),
	},
});

void runMain(main, { showUsage: show_usage_with_guidance });
