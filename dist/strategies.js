import { RuleEngine } from "@/engine";
import { matchCondition } from "@/conditions";
import { matchMeta, matchAttributeMeta } from "@/meta";
/** Role based engine implementation. */
export class RoleEngine extends RuleEngine {
    constructor(rules) {
        super(matchMeta, matchCondition, rules);
    }
}
/** Role & operation based engine. */
export class RoleOperationEngine extends RuleEngine {
    constructor(rules) {
        super(matchMeta, matchCondition, rules);
    }
}
/** Resource, role & operation engine. */
export class ResourceRoleOperationEngine extends RuleEngine {
    constructor(rules) {
        super(matchMeta, matchCondition, rules);
    }
}
/** Resource, role, operation & attribute engine. */
export class ResourceRoleOperationAttributeEngine extends RuleEngine {
    constructor(rules) {
        super(matchAttributeMeta, matchCondition, rules);
    }
}
