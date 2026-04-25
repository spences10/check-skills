import type { RuleExplanation } from '../types.js';

export const RULES: RuleExplanation[] = [
	{
		code: 'missing-skill-md',
		severity: 'error',
		description: 'The target directory does not contain SKILL.md.',
		suggestion:
			'Validate a skill directory directly, or use --recursive for a repository or parent directory.',
	},
	{
		code: 'invalid-frontmatter',
		severity: 'error',
		description: 'SKILL.md frontmatter is missing or invalid YAML.',
		suggestion:
			'Fix the YAML block between the opening and closing --- lines.',
	},
	{
		code: 'missing-name',
		severity: 'error',
		description: 'The required frontmatter name field is missing.',
		suggestion: 'Add name matching the parent directory.',
	},
	{
		code: 'name-mismatch',
		severity: 'error',
		description:
			'The frontmatter name does not match the parent directory name.',
		suggestion:
			'Rename the directory or update the frontmatter name.',
	},
	{
		code: 'invalid-name',
		severity: 'error',
		description: 'The skill name is not valid lowercase kebab-case.',
		suggestion:
			'Use lowercase letters, numbers, and single hyphens only.',
	},
	{
		code: 'name-too-long',
		severity: 'error',
		description: 'The skill name is longer than 64 characters.',
		suggestion: 'Shorten the skill name.',
	},
	{
		code: 'missing-description',
		severity: 'error',
		description:
			'The required frontmatter description field is missing.',
		suggestion:
			'Add a concise trigger description that includes "Use when...".',
	},
	{
		code: 'description-too-long',
		severity: 'error',
		description: 'The description is longer than 1024 characters.',
		suggestion:
			'Shorten the description and move detail into the body.',
	},
	{
		code: 'invalid-license',
		severity: 'error',
		description: 'The license field is not a string.',
		suggestion:
			'Use a short license name, such as MIT, or a bundled license filename.',
	},
	{
		code: 'invalid-compatibility',
		severity: 'error',
		description:
			'The compatibility field is not a non-empty short string.',
		suggestion:
			'Use a non-empty string of 500 characters or fewer, or remove the field.',
	},
	{
		code: 'invalid-allowed-tools',
		severity: 'error',
		description:
			'The allowed-tools field is not a space-separated string.',
		suggestion:
			'Rewrite allowed-tools as a string, e.g. allowed-tools: Bash Read.',
	},
	{
		code: 'invalid-metadata',
		severity: 'error',
		description: 'The metadata field is not a string-to-string map.',
		suggestion: 'Use only string values in metadata.',
	},
	{
		code: 'missing-reference',
		severity: 'error',
		description:
			'A Markdown link or explicit resource path points to a missing local file.',
		suggestion: 'Create the referenced file or update the path.',
	},
	{
		code: 'vague-description',
		severity: 'warn',
		description:
			'The description is too vague for reliable agent triggering.',
		suggestion: 'Make the description specific and task-oriented.',
	},
	{
		code: 'missing-trigger-language',
		severity: 'warn',
		description:
			'The description does not include clear trigger language.',
		suggestion:
			'Include "Use when...", "When...", "For...", or a clear imperative task phrase such as "Analyze...".',
	},
	{
		code: 'skill-md-too-long',
		severity: 'warn',
		description: 'SKILL.md is over 500 lines.',
		suggestion: 'Move detailed material into references/.',
	},
	{
		code: 'body-too-long',
		severity: 'warn',
		description: 'The main skill body is very long.',
		suggestion:
			'Extract long examples or background into references/.',
	},
	{
		code: 'vendor-specific-wording',
		severity: 'warn',
		description:
			'The description contains vendor-specific wording without compatibility context.',
		suggestion:
			'Add compatibility, e.g. compatibility: Requires Claude Code plugin support., or make the description vendor-neutral.',
	},
	{
		code: 'unreferenced-script',
		severity: 'warn',
		description:
			'A file exists in scripts/ but is not referenced from SKILL.md.',
		suggestion: 'Reference the script from SKILL.md or remove it.',
	},
	{
		code: 'script-not-executable',
		severity: 'warn',
		description:
			'A referenced script does not have executable permissions.',
		suggestion:
			'Run chmod +x or document that the script is not directly executable.',
	},
	{
		code: 'no-concrete-instructions',
		severity: 'warn',
		description:
			'The skill lacks examples, decision steps, workflow, or concrete instructions.',
		suggestion:
			'Add a short workflow, checklist, examples, or explicit instructions.',
	},
	{
		code: 'agent-compatibility-not-mentioned',
		severity: 'warn',
		description:
			'An adapter-specific check was requested, but compatibility does not mention that agent.',
		suggestion:
			'Add the agent to compatibility if intended, or omit --agent for portable validation.',
	},
	{
		code: 'agent-command-wording',
		severity: 'warn',
		description:
			'A command example may not match the requested agent adapter.',
		suggestion:
			'Use command wording that matches the adapter, or make it tool-neutral.',
	},
];

export function explain_rule(
	code: string,
): RuleExplanation | undefined {
	return RULES.find((rule) => rule.code === code);
}
