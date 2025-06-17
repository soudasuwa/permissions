import { matchCondition } from "@/conditions";
/**
 * Central evaluator for permission rules. It exposes both synchronous and
 * asynchronous APIs to allow future extensions such as remote checks.
 */
export class RuleEngine {
    matchMeta;
    constructor(matchMeta) {
        this.matchMeta = matchMeta;
    }
    /**
     * Determine whether a single rule matches the provided actor, action and context.
     */
    matchesRule(rule, actor, action, context) {
        if (!this.matchMeta(rule.meta, actor, action, context))
            return false;
        return this.matchContextConditions(rule.match, context, actor);
    }
    /**
     * Recursively evaluate a rules array, returning `true` as soon as a
     * matching rule chain is found.
     */
    checkAccess(rules, actor, action, context) {
        for (const r of rules) {
            if (!this.matchesRule(r, actor, action, context))
                continue;
            if (!r.rules || this.checkAccess(r.rules, actor, action, context))
                return true;
        }
        return false;
    }
    /**
     * Asynchronous variant of {@link checkAccess}. Useful when custom
     * matchers perform async operations.
     */
    async checkAccessAsync(rules, actor, action, context) {
        for (const r of rules) {
            if (!this.matchesRule(r, actor, action, context))
                continue;
            if (!r.rules ||
                (await this.checkAccessAsync(r.rules, actor, action, context)))
                return true;
        }
        return false;
    }
    matchContextConditions(match, context, actor) {
        if (!match)
            return true;
        return Object.entries(match).every(([field, cond]) => matchCondition(context[field], cond, actor));
    }
}
export const matchesRule = (rule, actor, action, context, matchMeta) => new RuleEngine(matchMeta).matchesRule(rule, actor, action, context);
export const checkAccess = (rules, actor, action, context, matchMeta) => new RuleEngine(matchMeta).checkAccess(rules, actor, action, context);
