import type { ArgsDef, CommandDef } from 'citty';
import { renderUsage } from 'citty';

export const LLM_BLOCK = `IMPORTANT FOR LLMs:
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

export async function show_usage_with_guidance<
	T extends ArgsDef = ArgsDef,
>(cmd: CommandDef<T>, parent?: CommandDef<T>): Promise<void> {
	const usage = await renderUsage(cmd, parent);
	if (parent) {
		console.log(usage);
		return;
	}

	console.log(`${usage}\n${LLM_BLOCK}\n\n${EXAMPLES_SECTION}\n`);
}
