export type StringLiteral = string;

export interface Actor {
	readonly [key: string]: unknown;
}

export interface Context {
	readonly [key: string]: unknown;
}

export interface ReferenceCondition {
	readonly reference: { readonly actor: keyof Actor };
}

export interface NotCondition {
	readonly not: Condition;
}

export interface InCondition {
	readonly in: readonly (string | number | boolean)[];
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

export interface Rule<
	M extends Record<string, unknown> = Record<string, unknown>,
> {
	readonly meta?: M;
	readonly match?: Readonly<Record<string, Condition>>;
	readonly rules?: readonly Rule<M>[];
}

/**
 * Compare a context value against the provided condition.
 *
 * The function recursively evaluates nested objects and
 * supports negation, inclusion lists and references to
 * the actor performing the check.
 */
export const matchCondition = (
	value: unknown,
	condition: Condition,
	actor: Actor,
): boolean => {
	if (condition && typeof condition === "object" && !Array.isArray(condition)) {
		if ("not" in condition)
			return !matchCondition(value, (condition as NotCondition).not, actor);
		if ("in" in condition)
			return (condition as InCondition).in.includes(
				value as string | number | boolean,
			);
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
 * Validate that a rule applies to the given actor and context.
 *
 * Both the meta information and the optional match block must
 * succeed in order for the rule to match.
 */
export type MetaMatcher<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> = (meta: M | undefined, actor: A, action: Act, context: C) => boolean;

export const matchesRule = <
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	rule: Rule<M>,
	actor: A,
	action: Act,
	context: C,
	matchMeta: MetaMatcher<M, A, Act, C>,
): boolean => {
	if (!matchMeta(rule.meta, actor, action, context)) return false;
	return (
		!rule.match ||
		Object.entries(rule.match).every(([field, cond]) =>
			matchCondition(
				(context as Record<string, unknown>)?.[field],
				cond as Condition,
				actor,
			),
		)
	);
};

/**
 * Recursively evaluate a rules array, returning true as soon as a matching
 * rule chain is found.
 */
export const checkAccess = <
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	rules: readonly Rule<M>[],
	actor: A,
	action: Act,
	context: C,
	matchMeta: MetaMatcher<M, A, Act, C>,
): boolean =>
	rules.some(
		(r) =>
			matchesRule(r, actor, action, context, matchMeta) &&
			(r.rules
				? checkAccess(r.rules, actor, action, context, matchMeta)
				: true),
	);
