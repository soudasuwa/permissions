import type { Actor, Context, Rule, MetaMatcher, Condition } from "@/types";
export type ConditionMatcher<A extends Actor = Actor> = (value: unknown, condition: Condition, actor: A) => boolean;
/**
 * Base implementation for rule evaluation. Subclasses can override the
 * behaviour of meta and condition matching to support custom strategies.
 */
export declare abstract class AbstractRuleEngine<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context> {
    private readonly metaMatcher;
    private readonly conditionMatcher;
    private readonly rules?;
    protected constructor(metaMatcher: MetaMatcher<M, A, Act, C>, conditionMatcher: ConditionMatcher<A>, rules?: readonly Rule<M>[] | undefined);
    /** Determine whether a rule matches the provided actor, action and context. */
    matchesRule(rule: Rule<M>, actor: A, action: Act, context: C): boolean;
    /** Recursively evaluate an array of rules. */
    permit(actor: A, action: Act, context: C, rules?: readonly Rule<M>[]): boolean;
    private matchContextConditions;
}
export declare class RuleEngine<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context> extends AbstractRuleEngine<M, A, Act, C> {
    constructor(matchMeta: MetaMatcher<M, A, Act, C>, conditionMatcher?: ConditionMatcher<A>, rules?: readonly Rule<M>[]);
}
export declare const matchesRule: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rule: Rule<M>, actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
export declare const permit: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rules: readonly Rule<M>[], actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
