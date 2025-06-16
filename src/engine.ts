export type StringLiteral = string;

export interface Actor<R extends StringLiteral = StringLiteral> {
	readonly role: R;
	readonly id: string;
	readonly [key: string]: unknown;
}

export interface Context<Res extends StringLiteral = StringLiteral> {
	readonly resource: Res;
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

export interface RuleMeta<
	R extends StringLiteral = StringLiteral,
	O extends StringLiteral = StringLiteral,
	Res extends StringLiteral = StringLiteral,
> {
	readonly role?: R | readonly R[];
	readonly resource?: Res;
	readonly operation?: O;
}

export interface Rule<
	R extends StringLiteral = StringLiteral,
	O extends StringLiteral = StringLiteral,
	Res extends StringLiteral = StringLiteral,
> {
	readonly meta?: RuleMeta<R, O, Res>;
	readonly match?: Readonly<Record<string, Condition>>;
	readonly rules?: readonly Rule<R, O, Res>[];
}

/**
 * Compare a context value against the provided condition.
 *
 * The function recursively evaluates nested objects and
 * supports negation, inclusion lists and references to
 * the actor performing the check.
 */
export const matchCondition = <R extends StringLiteral>(
	value: unknown,
	condition: Condition,
	actor: Actor<R>,
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

/**
 * Determine whether a rule's meta information matches the
 * provided actor, action and context. Role arrays are
 * supported for cases where multiple roles share a rule.
 */
export const matchesMeta = <
	R extends StringLiteral = StringLiteral,
	O extends StringLiteral = StringLiteral,
	Res extends StringLiteral = StringLiteral,
>(
	meta: RuleMeta<R, O, Res> | undefined,
	actor: Actor<R>,
	action: O,
	context: Context<Res>,
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

/**
 * Validate that a rule applies to the given actor and context.
 *
 * Both the meta information and the optional match block must
 * succeed in order for the rule to match.
 */
export const matchesRule = <
	R extends StringLiteral = StringLiteral,
	O extends StringLiteral = StringLiteral,
	Res extends StringLiteral = StringLiteral,
>(
	rule: Rule<R, O, Res>,
	actor: Actor<R>,
	action: O,
	context: Context<Res>,
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
 * Recursively evaluate a rules array, returning true as soon as a matching
 * rule chain is found.
 */
export const evaluateRules = <
	R extends StringLiteral = StringLiteral,
	O extends StringLiteral = StringLiteral,
	Res extends StringLiteral = StringLiteral,
>(
	rules: readonly Rule<R, O, Res>[],
	actor: Actor<R>,
	action: O,
	context: Context<Res>,
): boolean =>
	rules.some(
		(r) =>
			matchesRule(r, actor, action, context) &&
			(r.rules ? evaluateRules(r.rules, actor, action, context) : true),
	);

/**
 * Convenience function for one-off access checks. It evaluates the rule set
 * directly without the need for a `RuleEngine` instance.
 */
export const checkAccess = <
	R extends StringLiteral = StringLiteral,
	O extends StringLiteral = StringLiteral,
	Res extends StringLiteral = StringLiteral,
>(
	rules: readonly Rule<R, O, Res>[],
	actor: Actor<R>,
	action: O,
	context: Context<Res>,
): boolean => evaluateRules(rules, actor, action, context);
