import { RuleEngine } from "@/engine";
/** Utility to check if an actor possesses a role. */
const hasRole = (actor, role) => {
    if (role === undefined)
        return true;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(actor.role ?? "");
};
/**
 * Meta matcher utilities implementing progressively more advanced
 * strategies. Each matcher builds on the previous one in line with the
 * open-closed principle.
 */
/** Matcher for role based meta information. */
function matchRole(meta, actor, _action, _context) {
    if (!meta || meta.role === undefined)
        return true;
    const roles = Array.isArray(meta.role) ? meta.role : [meta.role];
    return roles.includes(actor.role ?? "");
}
/** Matcher for role & operation meta. */
function matchRoleOperation(meta, actor, action, context) {
    if (matchRole(meta, actor, action, context) === false)
        return false;
    return meta?.operation === undefined || meta.operation === action;
}
/** Matcher for resource, role & operation meta. */
function matchResourceRoleOperation(meta, actor, action, context) {
    if (matchRoleOperation(meta, actor, action, context) === false)
        return false;
    const resource = context.resource;
    return meta?.resource === undefined || meta.resource === resource;
}
/** Matcher for resource, role, operation & attribute meta. */
function matchResourceRoleOperationAttribute(meta, actor, action, context) {
    if (matchResourceRoleOperation(meta, actor, action, context) === false) {
        return false;
    }
    const attribute = meta?.attribute;
    if (!attribute)
        return true;
    const value = context[attribute.key];
    if (attribute.reference !== undefined) {
        return (value ===
            actor[attribute.reference]);
    }
    if (attribute.value !== undefined) {
        return value === attribute.value;
    }
    return true;
}
/** Role based engine implementation. */
export class RoleEngine extends RuleEngine {
    constructor() {
        super(matchRole);
    }
}
/** Role & operation based engine. */
export class RoleOperationEngine extends RuleEngine {
    constructor() {
        super(matchRoleOperation);
    }
}
/** Resource, role & operation engine. */
export class ResourceRoleOperationEngine extends RuleEngine {
    constructor() {
        super(matchResourceRoleOperation);
    }
}
/** Resource, role, operation & attribute engine. */
export class ResourceRoleOperationAttributeEngine extends RuleEngine {
    constructor() {
        super(matchResourceRoleOperationAttribute);
    }
}
