export type Severity = 'error' | 'warn';

export type AgentName =
	| 'codex'
	| 'claude-code'
	| 'opencode'
	| 'cursor'
	| 'windsurf'
	| 'pi';

export interface Problem {
	severity: Severity;
	code: string;
	message: string;
	file?: string;
	line?: number;
	column?: number;
	suggestion?: string;
}

export interface SkillFrontmatter {
	name?: unknown;
	description?: unknown;
	license?: unknown;
	compatibility?: unknown;
	metadata?: unknown;
	[key: string]: unknown;
}

export interface SkillDocument {
	dir: string;
	skill_file: string;
	frontmatter: SkillFrontmatter | null;
	body: string;
	line_count: number;
	body_start_line: number;
	content: string;
	frontmatter_error?: string;
}

export interface SkillResult {
	path: string;
	name?: string;
	ok: boolean;
	problems: Problem[];
}

export interface ValidationSummary {
	checked: number;
	passed: number;
	failed: number;
	errors: number;
	warnings: number;
}

export interface ValidationReport {
	ok: boolean;
	summary: ValidationSummary;
	skills: SkillResult[];
}

export interface ValidateOptions {
	recursive?: boolean;
	strict?: boolean;
	agent?: AgentName;
	quality?: boolean;
	cwd?: string;
}

export interface RuleExplanation {
	code: string;
	severity: Severity;
	description: string;
	suggestion: string;
}

export interface PromptSkill {
	name: string;
	description: string;
	location: string;
}
