import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface InitCommandOptions {
	name: string;
	references?: boolean;
	scripts?: boolean;
	assets?: boolean;
}

export function init_command(options: InitCommandOptions): void {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(options.name)) {
		throw new Error('skill name must be lowercase kebab-case');
	}

	mkdirSync(options.name, { recursive: true });
	if (options.references)
		mkdirSync(join(options.name, 'references'), { recursive: true });
	if (options.scripts)
		mkdirSync(join(options.name, 'scripts'), { recursive: true });
	if (options.assets)
		mkdirSync(join(options.name, 'assets'), { recursive: true });

	const skill_file = join(options.name, 'SKILL.md');
	writeFileSync(
		skill_file,
		`---\nname: ${options.name}\ndescription: Use when you need to create, write, or improve guidance for ${options.name}.\n---\n\n# ${options.name}\n\n## Instructions\n\n- Replace this scaffold with concrete steps.\n`,
		{ flag: 'wx' },
	);
	console.log(`created ${skill_file}`);
}
