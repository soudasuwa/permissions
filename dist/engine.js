import { matchCondition } from "@/conditions";
export const matchesRule = (rule, actor, action, context, matchMeta) => {
    if (!matchMeta(rule.meta, actor, action, context))
        return false;
    return matchContextConditions(rule.match, context, actor);
};
const matchContextConditions = (match, context, actor) => {
    if (!match)
        return true;
    return Object.entries(match).every(([field, cond]) => matchCondition(context?.[field], cond, actor));
};
/**
 * Recursively evaluate a rules array, returning true as soon as a matching
 * rule chain is found.
 */
export const checkAccess = (rules, actor, action, context, matchMeta) => {
    for (const r of rules) {
        if (!matchesRule(r, actor, action, context, matchMeta))
            continue;
        if (!r.rules || checkAccess(r.rules, actor, action, context, matchMeta))
            return true;
    }
    return false;
};
