/**
 * Compare a context value against the provided condition.
 *
 * The function recursively evaluates nested objects and
 * supports negation, inclusion lists and references to
 * the actor performing the check.
 */
export const matchCondition = (value, condition, actor) => {
    if (condition && typeof condition === "object" && !Array.isArray(condition)) {
        if ("not" in condition)
            return !matchCondition(value, condition.not, actor);
        if ("in" in condition)
            return condition.in.includes(value);
        if ("reference" in condition) {
            return (value === actor?.[condition.reference.actor]);
        }
        return Object.entries(condition).every(([k, c]) => matchCondition(value?.[k], c, actor));
    }
    return value === condition;
};
