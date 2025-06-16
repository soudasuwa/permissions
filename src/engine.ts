export enum Role {
	Module = "module",
	Admin = "admin",
	User = "user",
}

export enum Operation {
	Create = "create",
	Edit = "edit",
	View = "view",
	Pay = "pay",
}

export enum InvoiceStatus {
	Generating = "Generating",
	Draft = "Draft",
	Pending = "Pending",
	Complete = "Complete",
}

export type Resource = "invoice";

export interface Actor {
	readonly role: Role;
	readonly id: string;
	readonly [key: string]: unknown;
}

export interface Context {
	readonly resource: Resource;
	readonly [key: string]: unknown;
}

export interface ReferenceCondition {
	readonly reference: { readonly actor: keyof Actor };
}

export interface NotCondition {
	readonly not: Condition;
}

export interface InCondition {
	readonly in: readonly string[];
}

export type ConditionObject = {
	readonly [key: string]: Condition;
};

export type Condition =
	| string
	| number
	| boolean
	| NotCondition
	| InCondition
	| ReferenceCondition
	| ConditionObject;

export interface RuleMeta {
	readonly role?: Role | readonly Role[];
	readonly resource?: Resource;
	readonly operation?: Operation;
}

export interface Rule {
	readonly meta?: RuleMeta;
	readonly match?: Readonly<Record<string, Condition>>;
	readonly rules?: readonly Rule[];
}

export const matchCondition = (
	value: unknown,
	condition: Condition,
	actor: Actor,
): boolean => {
	if (condition && typeof condition === "object" && !Array.isArray(condition)) {
		if ("not" in condition)
			return !matchCondition(value, (condition as NotCondition).not, actor);
		if ("in" in condition)
			return (condition as InCondition).in.includes(value as string);
		if ("reference" in condition) {
			return (
				value === actor?.[(condition as ReferenceCondition).reference.actor]
			);
		}
		return Object.entries(condition).every(([k, c]) =>
			matchCondition(
				(value as Record<string, unknown>)?.[k],
				c as Condition,
				actor,
			),
		);
	}
	return value === condition;
};

export const matchesMeta = (
	meta: RuleMeta | undefined,
	actor: Actor,
	action: Operation,
	context: Context,
): boolean => {
	if (!meta) return true;
	const { role, resource, operation } = meta;

	if (role) {
		const roles = Array.isArray(role) ? role : [role];
		if (!roles.includes(actor.role)) return false;
	}
	if (resource && resource !== context.resource) return false;
	if (operation && operation !== action) return false;
	return true;
};

export const matchesRule = (
	rule: Rule,
	actor: Actor,
	action: Operation,
	context: Context,
): boolean => {
	if (!matchesMeta(rule.meta, actor, action, context)) return false;
	return (
		!rule.match ||
		Object.entries(rule.match).every(([field, cond]) =>
			matchCondition(context?.[field], cond as Condition, actor),
		)
	);
};

/**
 * Evaluates rules in an object-oriented manner to keep logic
 * encapsulated and reusable.
 */
export class RuleEngine {
	constructor(private readonly rules: readonly Rule[]) {}

	/**
	 * Determine if the given actor can perform an action on the context.
	 */
	checkAccess(actor: Actor, action: Operation, context: Context): boolean {
		return this.evaluateRules(this.rules, actor, action, context);
	}

	private evaluateRules(
		rules: readonly Rule[],
		actor: Actor,
		action: Operation,
		context: Context,
	): boolean {
		return rules.some(
			(r) =>
				matchesRule(r, actor, action, context) &&
				(r.rules ? this.evaluateRules(r.rules, actor, action, context) : true),
		);
	}
}

export const checkAccess = (
	rules: readonly Rule[],
	actor: Actor,
	action: Operation,
	context: Context,
): boolean => new RuleEngine(rules).checkAccess(actor, action, context);
