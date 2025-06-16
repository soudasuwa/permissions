import { matchCondition } from "@/conditions";
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
export const checkAccess = (rules, actor, action, context, matchMeta) => rules.some((r) => matchesRule(r, actor, action, context, matchMeta) &&
    (r.rules
        ? checkAccess(r.rules, actor, action, context, matchMeta)
        : true));
