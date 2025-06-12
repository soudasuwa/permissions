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

export interface Rule {
	readonly role?: Role | readonly Role[];
	readonly resource?: Resource;
	readonly operation?: Operation;
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

export const matchesRule = (
	rule: Rule,
	actor: Actor,
	action: Operation,
	context: Context,
): boolean => {
	if (rule.role) {
		const roles = Array.isArray(rule.role) ? rule.role : [rule.role];
		if (!roles.includes(actor.role)) return false;
	}
	if (rule.resource && rule.resource !== context.resource) return false;
	if (rule.operation && rule.operation !== action) return false;
	if (rule.match) {
		for (const [field, cond] of Object.entries(rule.match)) {
			if (!matchCondition(context?.[field], cond as Condition, actor))
				return false;
		}
	}
	return true;
};

export const evaluateRules = (
	rules: readonly Rule[],
	actor: Actor,
	action: Operation,
	context: Context,
): boolean => {
	return rules.some((r) => {
		if (!matchesRule(r, actor, action, context)) return false;
		return r.rules ? evaluateRules(r.rules, actor, action, context) : true;
	});
};

export const checkAccess = (
	rules: readonly Rule[],
	actor: Actor,
	action: Operation,
	context: Context,
): boolean => evaluateRules(rules, actor, action, context);
