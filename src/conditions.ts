import type { Actor, Condition, ConditionObject } from "@/types";
import {
	isInCondition,
	isNotCondition,
	isReferenceCondition,
	isConditionObject,
} from "@/guards";

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
	if (isNotCondition(condition))
		return !matchCondition(value, condition.not, actor);

	if (isInCondition(condition))
		return condition.in.includes(value as string | number | boolean);

	if (isReferenceCondition(condition))
		return value === actor?.[condition.reference.actor];

	if (isConditionObject(condition))
		return matchNestedConditions(value, condition, actor);

	return value === condition;
};

const matchNestedConditions = (
	value: unknown,
	condition: ConditionObject,
	actor: Actor,
): boolean =>
	Object.entries(condition).every(([k, c]) =>
		matchCondition((value as Record<string, unknown>)?.[k], c, actor),
	);
