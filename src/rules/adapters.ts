import type { AgentName, Problem, SkillDocument } from '../types.js';

const AGENT_LABELS: Record<AgentName, string> = {
	codex: 'Codex',
	'claude-code': 'Claude Code',
	opencode: 'OpenCode',
	cursor: 'Cursor',
	windsurf: 'Windsurf',
	pi: 'Pi',
};

export function runAdapterRules(
	document: SkillDocument,
	agent: AgentName,
): Problem[] {
	const problems: Problem[] = [];
	const compatibility =
		typeof document.frontmatter?.compatibility === 'string'
			? document.frontmatter.compatibility
			: '';
	const label = AGENT_LABELS[agent];

	if (
		compatibility &&
		!normalized(compatibility).includes(normalized(label))
	) {
		problems.push({
			severity: 'warn',
			code: 'agent-compatibility-not-mentioned',
			message: `--agent ${agent} was requested, but compatibility does not mention ${label}`,
			file: 'SKILL.md',
		});
	}

	if (agent === 'claude-code' && /\bpnpx\b/iu.test(document.body)) {
		problems.push({
			severity: 'warn',
			code: 'agent-command-wording',
			message:
				'Claude Code examples usually use npx or tool-agnostic wording instead of pnpx-only commands',
			file: 'SKILL.md',
		});
	}

	return problems;
}

function normalized(value: string): string {
	return value.toLowerCase().replace(/[-\s]+/gu, ' ');
}
