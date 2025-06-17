import type { Actor, Context, Rule, MetaMatcher } from "@/types";
/**
 * Central evaluator for permission rules. It exposes both synchronous and
 * asynchronous APIs to allow future extensions such as remote checks.
 */
export declare class RuleEngine<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context> {
    private readonly matchMeta;
    constructor(matchMeta: MetaMatcher<M, A, Act, C>);
    /**
     * Determine whether a single rule matches the provided actor, action and context.
     */
    matchesRule(rule: Rule<M>, actor: A, action: Act, context: C): boolean;
    /**
     * Recursively evaluate a rules array, returning `true` as soon as a
     * matching rule chain is found.
     */
    checkAccess(rules: readonly Rule<M>[], actor: A, action: Act, context: C): boolean;
    /**
     * Asynchronous variant of {@link checkAccess}. Useful when custom
     * matchers perform async operations.
     */
    checkAccessAsync(rules: readonly Rule<M>[], actor: A, action: Act, context: C): Promise<boolean>;
    private matchContextConditions;
}
export declare const matchesRule: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rule: Rule<M>, actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
export declare const checkAccess: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rules: readonly Rule<M>[], actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
