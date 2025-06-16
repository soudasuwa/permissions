import { isInCondition, isNotCondition, isReferenceCondition, isConditionObject, } from "@/guards";
/**
 * Compare a context value against the provided condition.
 *
 * The function recursively evaluates nested objects and
 * supports negation, inclusion lists and references to
 * the actor performing the check.
 */
export const matchCondition = (value, condition, actor) => {
    if (isNotCondition(condition))
        return !matchCondition(value, condition.not, actor);
    if (isInCondition(condition))
        return condition.in.includes(value);
    if (isReferenceCondition(condition))
        return value === actor?.[condition.reference.actor];
    if (isConditionObject(condition))
        return matchNestedConditions(value, condition, actor);
    return value === condition;
};
const matchNestedConditions = (value, condition, actor) => Object.entries(condition).every(([k, c]) => matchCondition(value?.[k], c, actor));
