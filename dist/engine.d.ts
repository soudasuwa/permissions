import type { Actor, Context, Rule, MetaMatcher } from "@/types";
export declare const matchesRule: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rule: Rule<M>, actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
/**
 * Recursively evaluate a rules array, returning true as soon as a matching
 * rule chain is found.
 */
export declare const checkAccess: <M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(rules: readonly Rule<M>[], actor: A, action: Act, context: C, matchMeta: MetaMatcher<M, A, Act, C>) => boolean;
