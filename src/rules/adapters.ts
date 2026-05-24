import type { AgentName, Problem, SkillDocument } from '../types.js';
import {
	frontmatter_line,
	is_multiline_description,
} from './spec.js';

const AGENT_LABELS: Record<AgentName, string> = {
	codex: 'Codex',
	'claude-code': 'Claude Code',
	opencode: 'OpenCode',
	cursor: 'Cursor',
	windsurf: 'Windsurf',
	pi: 'Pi',
};

export function run_adapter_rules(
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
			line: 1,
			column: 1,
			suggestion: `Add ${label} to compatibility if this skill is intended for that agent.`,
		});
	}

	if (
		agent === 'claude-code' &&
		is_multiline_description(document.frontmatter_raw ?? '')
	) {
		problems.push({
			severity: 'error',
			code: 'claude-code-multiline-description',
			message:
				'Claude Code may not reliably discover skills with folded or multiline YAML descriptions',
			file: 'SKILL.md',
			line: frontmatter_line(document, 'description'),
			column: 1,
			suggestion:
				'Rewrite description on one line for Claude Code compatibility, e.g. description: Use when...',
		});
	}

	if (agent === 'claude-code' && /\bpnpx\b/iu.test(document.body)) {
		problems.push({
			severity: 'warn',
			code: 'agent-command-wording',
			message:
				'Claude Code examples usually use npx or tool-agnostic wording instead of pnpx-only commands',
			file: 'SKILL.md',
			line: 1,
			column: 1,
			suggestion:
				'Use npx, or make the command example package-manager neutral.',
		});
	}

	return problems;
}

function normalized(value: string): string {
	return value.toLowerCase().replace(/[-\s]+/gu, ' ');
}
