import { matchCondition } from "@/conditions";
/**
 * Base implementation for rule evaluation. Subclasses can override the
 * behaviour of meta and condition matching to support custom strategies.
 */
export class AbstractRuleEngine {
    metaMatcher;
    conditionMatcher;
    rules;
    constructor(metaMatcher, conditionMatcher, rules) {
        this.metaMatcher = metaMatcher;
        this.conditionMatcher = conditionMatcher;
        this.rules = rules;
    }
    /** Determine whether a rule matches the provided actor, action and context. */
    matchesRule(rule, actor, action, context) {
        if (this.metaMatcher(rule.meta, actor, action, context) === false) {
            return false;
        }
        return this.matchContextConditions(rule.match, context, actor);
    }
    /** Recursively evaluate an array of rules. */
    permit(actor, action, context, rules = this.rules ?? []) {
        for (const current of rules) {
            if (this.matchesRule(current, actor, action, context) === false) {
                continue;
            }
            if (current.rules === undefined ||
                this.permit(actor, action, context, current.rules) === true) {
                return true;
            }
        }
        return false;
    }
    matchContextConditions(conditions, context, actor) {
        if (conditions === undefined) {
            return true;
        }
        return Object.entries(conditions).every(([field, cond]) => this.conditionMatcher(context[field], cond, actor));
    }
}
export class RuleEngine extends AbstractRuleEngine {
    constructor(matchMeta, conditionMatcher = matchCondition, rules) {
        super(matchMeta, conditionMatcher, rules);
    }
}
export const matchesRule = (rule, actor, action, context, matchMeta) => new RuleEngine(matchMeta).matchesRule(rule, actor, action, context);
export const permit = (rules, actor, action, context, matchMeta) => new RuleEngine(matchMeta, matchCondition, rules).permit(actor, action, context);
