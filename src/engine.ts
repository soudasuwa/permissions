import type { Actor, Context, Rule, MetaMatcher, Condition } from "./types";
import { matchCondition } from "./conditions";

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
