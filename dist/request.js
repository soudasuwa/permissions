import { RuleEngine } from "@/engine";
import { matchCondition } from "@/conditions";
export class AccessRequestBuilder {
    rules;
    matchMeta;
    actor;
    action;
    buildPermit;
    context = {};
    engine;
    constructor(rules, matchMeta, actor, action, buildPermit) {
        this.rules = rules;
        this.matchMeta = matchMeta;
        this.actor = actor;
        this.action = action;
        this.buildPermit = buildPermit;
        this.engine = new RuleEngine(matchMeta, matchCondition, rules);
    }
    withContext(ctx) {
        this.context = { ...this.context, ...ctx };
        return this;
    }
    with(key, value) {
        return this.withContext({ [key]: value });
    }
    permit() {
        const allowed = this.engine.permit(this.actor, this.action, this.context);
        if (!allowed)
            return { allowed };
        const extras = this.buildPermit
            ? this.buildPermit(this.rules, this.matchMeta, this.actor, this.action, this.context)
            : {};
        return { allowed: true, ...extras };
    }
}
export function createAccessRequest(rules, matchMeta, actor, action, buildPermit) {
    return new AccessRequestBuilder(rules, matchMeta, actor, action, buildPermit);
}
