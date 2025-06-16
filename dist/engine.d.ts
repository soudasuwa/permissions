export type StringLiteral = string;
export interface Actor {
    readonly [key: string]: unknown;
}
export interface Context {
    readonly [key: string]: unknown;
}
export interface ReferenceCondition {
    readonly reference: {
        readonly actor: keyof Actor;
    };
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
export type Condition = string | number | boolean | NotCondition | InCondition | ReferenceCondition | ConditionObject;
export interface Rule<M extends Record<string, unknown> = Record<string, unknown>> {
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
export declare const matchCondition: (value: unknown, condition: Condition, actor: Actor) => boolean;
/**
 * Validate that a rule applies to the given actor and context.
 *
 * Both the meta information and the optional match block must
 * succeed in order for the rule to match.
 */
export type MetaMatcher<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context> = (meta: M | undefined, actor: A, action: Act, context: C) => boolean;
export declare const matchesRule: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rule: Rule<M>, actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
/**
 * Recursively evaluate a rules array, returning true as soon as a matching
 * rule chain is found.
 */
export declare const checkAccess: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rules: readonly Rule<M>[], actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
