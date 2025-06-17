import type { Actor, Context, Rule, MetaMatcher, Condition } from "@/types";
import { matchCondition } from "@/conditions";

/**
 * Central evaluator for permission rules. It exposes both synchronous and
 * asynchronous APIs to allow future extensions such as remote checks.
 */
export class RuleEngine<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> {
	constructor(private readonly matchMeta: MetaMatcher<M, A, Act, C>) {}

	/**
	 * Determine whether a single rule matches the provided actor, action and context.
	 */
	public matchesRule(
		rule: Rule<M>,
		actor: A,
		action: Act,
		context: C,
	): boolean {
		if (!this.matchMeta(rule.meta, actor, action, context)) return false;
		return this.matchContextConditions(rule.match, context, actor);
	}

	/**
	 * Recursively evaluate a rules array, returning `true` as soon as a
	 * matching rule chain is found.
	 */
	public checkAccess(
		rules: readonly Rule<M>[],
		actor: A,
		action: Act,
		context: C,
	): boolean {
		for (const r of rules) {
			if (!this.matchesRule(r, actor, action, context)) continue;
			if (!r.rules || this.checkAccess(r.rules, actor, action, context))
				return true;
		}
		return false;
	}

	/**
	 * Asynchronous variant of {@link checkAccess}. Useful when custom
	 * matchers perform async operations.
	 */
	public async checkAccessAsync(
		rules: readonly Rule<M>[],
		actor: A,
		action: Act,
		context: C,
	): Promise<boolean> {
		for (const r of rules) {
			if (!this.matchesRule(r, actor, action, context)) continue;
			if (
				!r.rules ||
				(await this.checkAccessAsync(r.rules, actor, action, context))
			)
				return true;
		}
		return false;
	}

	private matchContextConditions(
		match: Readonly<Record<string, Condition>> | undefined,
		context: C,
		actor: A,
	): boolean {
		if (!match) return true;
		return Object.entries(match).every(([field, cond]) =>
			matchCondition((context as Record<string, unknown>)[field], cond, actor),
		);
	}
}

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
): boolean =>
	new RuleEngine(matchMeta).matchesRule(rule, actor, action, context);

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
	new RuleEngine(matchMeta).checkAccess(rules, actor, action, context);
