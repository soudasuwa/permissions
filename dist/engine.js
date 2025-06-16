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
export const matchesRule = (rule, actor, action, context, matchMeta) => {
    if (!matchMeta(rule.meta, actor, action, context))
        return false;
    return (!rule.match ||
        Object.entries(rule.match).every(([field, cond]) => matchCondition(context?.[field], cond, actor)));
};
/**
 * Recursively evaluate a rules array, returning true as soon as a matching
 * rule chain is found.
 */
export const evaluateRules = (rules, actor, action, context, matchMeta) => rules.some((r) => matchesRule(r, actor, action, context, matchMeta) &&
    (r.rules
        ? evaluateRules(r.rules, actor, action, context, matchMeta)
        : true));
/**
 * Convenience function for one-off access checks. It evaluates the rule set
 * directly without the need for a `RuleEngine` instance.
 */
export const checkAccess = (rules, actor, action, context, matchMeta) => evaluateRules(rules, actor, action, context, matchMeta);
