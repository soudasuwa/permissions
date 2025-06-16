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
export const matchesRule = (rule, actor, action, context) => {
    if (!matchesMeta(rule.meta, actor, action, context))
        return false;
    return (!rule.match ||
        Object.entries(rule.match).every(([field, cond]) => matchCondition(context?.[field], cond, actor)));
};
/**
 * Evaluates rules in an object-oriented manner to keep logic
 * encapsulated and reusable.
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
    evaluateRules(rules, actor, action, context) {
        return rules.some((r) => matchesRule(r, actor, action, context) &&
            (r.rules ? this.evaluateRules(r.rules, actor, action, context) : true));
    }
}
export const checkAccess = (rules, actor, action, context) => new RuleEngine(rules).checkAccess(actor, action, context);
