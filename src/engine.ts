import type { Actor, Context, Rule, MetaMatcher, Condition } from "@/types";
import { matchCondition } from "@/conditions";

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

	return matchContextConditions(rule.match, context, actor);
};

const matchContextConditions = (
	match: Readonly<Record<string, Condition>> | undefined,
	context: Context,
	actor: Actor,
): boolean => {
	if (!match) return true;
	return Object.entries(match).every(([field, cond]) =>
		matchCondition((context as Record<string, unknown>)?.[field], cond, actor),
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
): boolean => {
	for (const r of rules) {
		if (!matchesRule(r, actor, action, context, matchMeta)) continue;

		if (!r.rules || checkAccess(r.rules, actor, action, context, matchMeta))
			return true;
	}

	return false;
};
