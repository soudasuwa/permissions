import type { Actor, Condition } from "./types";
/**
 * Compare a context value against the provided condition.
 *
 * The function recursively evaluates nested objects and
 * supports negation, inclusion lists and references to
 * the actor performing the check.
 */
export declare const matchCondition: (value: unknown, condition: Condition, actor: Actor) => boolean;
