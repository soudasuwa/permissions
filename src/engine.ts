import type { Actor, Context, Rule, MetaMatcher, Condition } from "@/types";
import { matchCondition } from "@/conditions";

export type ConditionMatcher<A extends Actor = Actor> = (
	value: unknown,
	condition: Condition,
	actor: A,
) => boolean;

/**
 * Base implementation for rule evaluation. Subclasses can override the
 * behaviour of meta and condition matching to support custom strategies.
 */
export abstract class AbstractRuleEngine<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> {
	protected constructor(
		private readonly metaMatcher: MetaMatcher<M, A, Act, C>,
		private readonly conditionMatcher: ConditionMatcher<A>,
		private readonly rules?: readonly Rule<M>[],
	) {}

	/** Determine whether a rule matches the provided actor, action and context. */
	public matchesRule(
		rule: Rule<M>,
		actor: A,
		action: Act,
		context: C,
	): boolean {
		if (this.metaMatcher(rule.meta, actor, action, context) === false) {
			return false;
		}
		return this.matchContextConditions(rule.match, context, actor);
	}

	/** Recursively evaluate an array of rules. */
	public permit(
		actor: A,
		action: Act,
		context: C,
		rules: readonly Rule<M>[] = this.rules ?? [],
	): boolean {
		for (const current of rules) {
			if (this.matchesRule(current, actor, action, context) === false) {
				continue;
			}
			if (
				current.rules === undefined ||
				this.permit(actor, action, context, current.rules) === true
			) {
				return true;
			}
		}
		return false;
	}

	private matchContextConditions(
		conditions: Readonly<Record<string, Condition>> | undefined,
		context: C,
		actor: A,
	): boolean {
		if (conditions === undefined) {
			return true;
		}
		return Object.entries(conditions).every(([field, cond]) =>
			this.conditionMatcher(
				(context as Record<string, unknown>)[field],
				cond,
				actor,
			),
		);
	}
}

export class RuleEngine<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends AbstractRuleEngine<M, A, Act, C> {
	constructor(
		matchMeta: MetaMatcher<M, A, Act, C>,
		conditionMatcher: ConditionMatcher<A> = matchCondition,
		rules?: readonly Rule<M>[],
	) {
		super(matchMeta, conditionMatcher, rules);
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

export const permit = <
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
	new RuleEngine(matchMeta, matchCondition, rules).permit(
		actor,
		action,
		context,
	);
