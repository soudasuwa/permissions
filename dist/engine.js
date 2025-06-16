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
/**
 * Determine whether a rule's meta information matches the
 * provided actor, action and context. Role arrays are
 * supported for cases where multiple roles share a rule.
 */
export const matchesMeta = (meta, actor, action, context) => {
    if (!meta)
        return true;
    const { role, resource, operation } = meta;
    if (role) {
        const roles = Array.isArray(role) ? role : [role];
        if (!roles.includes(actor.role))
            return false;
    }
    if (resource && resource !== context.resource)
        return false;
    if (operation && operation !== action)
        return false;
    return true;
};
/**
 * Validate that a rule applies to the given actor and context.
 *
 * Both the meta information and the optional match block must
 * succeed in order for the rule to match.
 */
export const matchesRule = (rule, actor, action, context) => {
    if (!matchesMeta(rule.meta, actor, action, context))
        return false;
    return (!rule.match ||
        Object.entries(rule.match).every(([field, cond]) => matchCondition(context?.[field], cond, actor)));
};
/**
 * Evaluates rules in an object-oriented manner to keep logic
 * encapsulated and reusable. A single RuleEngine instance can
 * be reused for repeated checks without re-parsing the rule set.
 */
export class RuleEngine {
    rules;
    constructor(rules) {
        this.rules = rules;
    }
    /**
     * Determine if the given actor can perform an action on the context.
     */
    checkAccess(actor, action, context) {
        return this.evaluateRules(this.rules, actor, action, context);
    }
    /**
     * Evaluate a rules array recursively, returning true as soon
     * as a matching rule chain is found.
     */
    evaluateRules(rules, actor, action, context) {
        return rules.some((r) => matchesRule(r, actor, action, context) &&
            (r.rules ? this.evaluateRules(r.rules, actor, action, context) : true));
    }
}
/**
 * Convenience function for one-off access checks. It creates a
 * temporary RuleEngine instance under the hood.
 */
export const checkAccess = (rules, actor, action, context) => new RuleEngine(rules).checkAccess(actor, action, context);
